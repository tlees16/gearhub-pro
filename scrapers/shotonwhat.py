#!/usr/bin/env python3
"""
ShotOnWhat scraper — enriches productions_json for cameras and lenses
with real film/TV credits scraped from shotonwhat.com.

Usage:
  python3 scrapers/shotonwhat.py                    # dry-run (prints matches, no writes)
  python3 scrapers/shotonwhat.py --write            # write to DB
  python3 scrapers/shotonwhat.py --table cameras    # cameras only
  python3 scrapers/shotonwhat.py --table lenses     # lenses only
  python3 scrapers/shotonwhat.py --limit 20         # first N products
  python3 scrapers/shotonwhat.py --overwrite        # re-fetch even if already set

Strategy:
  1. Load camera/lens names from Supabase
  2. Fetch the full camera index from shotonwhat.com/browse-index/cameras
  3. Fuzzy-match each product to a ShotOnWhat slug
  4. For each match, call the AJAX endpoint to get structured film credits
  5. Upsert productions_json into the DB
"""

from __future__ import annotations

import argparse
import json
import os
import re
import time
from html.parser import HTMLParser
from pathlib import Path
from typing import Optional

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from rapidfuzz import fuzz, process as rfprocess
from supabase import create_client

load_dotenv(Path(__file__).parent.parent / ".env")

sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
})

AJAX_URL  = "https://shotonwhat.com/c/wp-admin/admin-ajax.php"
INDEX_URL = "https://shotonwhat.com/browse-index/cameras"
FUZZY_THRESHOLD = 82   # conservative — only high-confidence matches
REQUEST_DELAY   = 0.8  # seconds between AJAX calls


# ─── HTML stripping utility ───────────────────────────────────────────────────

class _TextStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self._parts: list[str] = []

    def handle_data(self, data: str):
        s = data.strip()
        if s:
            self._parts.append(s)

    def get_text(self) -> str:
        return ", ".join(self._parts)


def strip_html(html_str: str) -> str:
    if not html_str:
        return ""
    p = _TextStripper()
    p.feed(html_str)
    return p.get_text()


# ─── ShotOnWhat index ─────────────────────────────────────────────────────────

def fetch_sow_camera_index() -> list[tuple[str, str]]:
    """Return list of (display_name, slug) from shotonwhat browse-index."""
    print("Fetching ShotOnWhat camera index…")
    r = SESSION.get(INDEX_URL, timeout=20)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    entries: list[tuple[str, str]] = []
    for a in soup.select("a[href*='/cameras/']"):
        href = a.get("href", "")
        m = re.search(r"/cameras/([^/]+)$", href)
        if m:
            slug = m.group(1)
            # Remove trailing "-camera" for matching
            name = a.get_text(strip=True)
            entries.append((name, slug))
    print(f"  Found {len(entries)} cameras in index")
    return entries


def fetch_sow_lens_index() -> list[tuple[str, str]]:
    """Return list of (display_name, slug) from shotonwhat browse-index/lenses."""
    url = "https://shotonwhat.com/browse-index/lenses"
    print("Fetching ShotOnWhat lens index…")
    r = SESSION.get(url, timeout=20)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    entries: list[tuple[str, str]] = []
    for a in soup.select("a[href*='/lenses/']"):
        href = a.get("href", "")
        m = re.search(r"/lenses/([^/]+)$", href)
        if m:
            slug = m.group(1)
            name = a.get_text(strip=True)
            entries.append((name, slug))
    print(f"  Found {len(entries)} lenses in index")
    return entries


# ─── AJAX film fetch ──────────────────────────────────────────────────────────

def fetch_productions(slug: str, item_type: str = "cameras") -> list[dict]:
    """Fetch all productions for a slug via the undocumented AJAX endpoint."""
    payload = {
        "action":   "get_archive_content",
        item_type:  slug,
        "orderby":  "modified",
        "order":    "DESC",
    }
    try:
        r = SESSION.post(AJAX_URL, data=payload, timeout=20)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        print(f"  ⚠ AJAX error for {slug}: {e}")
        return []

    if not isinstance(data, list):
        return []

    productions = []
    for item in data:
        movie = item.get("movie") or {}
        title = item.get("post_title", "").strip()
        if not title:
            continue

        year_raw = movie.get("imdb_year", "")
        try:
            year = int(str(year_raw)[:4])
        except (ValueError, TypeError):
            year = None

        # Extract DP names from HTML string
        dop_html = movie.get("imdb_cinematographers", "")
        dop = strip_html(dop_html) or None

        # Type: Movie vs TV — imdb_type is "Movie", "TV Movie", "TV Series" etc.
        imdb_type = str(movie.get("imdb_type", "")).strip()
        prod_type: str
        if "series" in imdb_type.lower() or "episode" in imdb_type.lower():
            prod_type = "Series"
        else:
            prod_type = "Feature"

        productions.append({
            "title": title,
            "year":  year,
            "dop":   dop,
            "type":  prod_type,
        })

    return productions


# ─── Fuzzy match ──────────────────────────────────────────────────────────────

def _normalise_for_match(name: str) -> str:
    """Strip 'Camera'/'Lens' suffix and common noise for matching."""
    n = re.sub(r"\s+camera$", "", name, flags=re.I)
    n = re.sub(r"\s+lens(es)?$", "", n, flags=re.I)
    n = re.sub(r"\s+prime$", "", n, flags=re.I)
    return n.strip()


_MODEL_TOKEN_RE = re.compile(r"[A-Z0-9][-A-Z0-9]*", re.I)
_MODEL_SKIP = frozenset({"II", "III", "IV", "VI", "MK", "MARK", "PRO", "MAX", "PLUS",
                          "MINI", "ULTRA", "LITE", "SE", "K", "G", "EOS", "LUMIX",
                          "ALPHA", "CINEMA", "CINE"})


def _key_tokens(text: str) -> set[str]:
    """Extract discriminating model tokens (have a digit, or short uppercase)."""
    out = set()
    for t in _MODEL_TOKEN_RE.findall(text):
        up = t.upper()
        if up in _MODEL_SKIP:
            continue
        if re.search(r"\d", t) or (2 <= len(t) <= 4 and t.isupper()):
            out.add(up)
    return out


def match_product_to_sow(
    product_name: str,
    product_brand: str,
    sow_entries: list[tuple[str, str]],
) -> Optional[str]:
    """Return the best-matching ShotOnWhat slug or None.

    Guards applied:
    - Brand must appear in the matched SoW display name
    - Key model tokens must overlap (prevents EOS 6D matching EOS 5D etc.)
    - Score must exceed FUZZY_THRESHOLD
    """
    brand_lc = product_brand.lower().strip()
    query = _normalise_for_match(f"{product_brand} {product_name}")
    keys  = [_normalise_for_match(name) for name, _ in sow_entries]

    result = rfprocess.extractOne(
        query, keys,
        scorer=fuzz.token_set_ratio,
        score_cutoff=FUZZY_THRESHOLD,
    )
    if result is None:
        return None

    idx = keys.index(result[0])
    matched_display = sow_entries[idx][0]

    # Brand guard: matched SoW name must contain (part of) our brand
    brand_words = [w for w in brand_lc.split() if len(w) >= 4]
    if brand_words and not any(w in matched_display.lower() for w in brand_words):
        return None

    # Model-token guard: key tokens from product must appear in matched slug or name
    prod_tokens    = _key_tokens(f"{product_brand} {product_name}")
    matched_tokens = _key_tokens(matched_display)
    matched_slug_tokens = _key_tokens(sow_entries[idx][1])
    all_match_tokens = matched_tokens | matched_slug_tokens

    # All product model tokens must appear in the match (covers "RP", "FX3", "1D X" etc.)
    prod_model_tokens = prod_tokens - _key_tokens(product_brand)
    if prod_model_tokens and not prod_model_tokens.issubset(all_match_tokens):
        # Allow partial overlap only when >half of product tokens match
        overlap = prod_model_tokens & all_match_tokens
        if len(overlap) < len(prod_model_tokens) * 0.75:
            return None

    return sow_entries[idx][1]   # slug


# ─── Main ─────────────────────────────────────────────────────────────────────

def process_table(
    table: str,
    sow_entries: list[tuple[str, str]],
    sow_item_type: str,
    args: argparse.Namespace,
):
    print(f"\n{'─'*60}")
    print(f"Processing table: {table}")
    print(f"{'─'*60}")

    query = sb.table(table).select("id, name, brand, productions_json")
    if not args.overwrite:
        query = query.is_("productions_json", "null")
    if args.limit:
        query = query.limit(args.limit)

    rows = query.execute().data or []
    print(f"Products to process: {len(rows)}")

    matched_ct = 0
    unmatched_ct = 0

    for row in rows:
        slug = match_product_to_sow(row["name"], row.get("brand", ""), sow_entries)
        if slug is None:
            unmatched_ct += 1
            continue

        print(f"  ✓ {row['name'][:55]:<55} → {slug}")

        if args.dry_run:
            matched_ct += 1
            continue

        productions = fetch_productions(slug, sow_item_type)
        if not productions:
            print(f"    (no productions found on ShotOnWhat)")
            unmatched_ct += 1
            time.sleep(REQUEST_DELAY)
            continue

        # Deduplicate by title (keep first occurrence)
        seen: set[str] = set()
        unique = []
        for p in productions:
            if p["title"] not in seen:
                seen.add(p["title"])
                unique.append(p)

        productions_json = {
            "productions":   unique,
            "industryNote":  None,
            "source":        "shotonwhat",
            "sow_slug":      slug,
        }

        sb.table(table).update({"productions_json": productions_json}).eq("id", row["id"]).execute()
        print(f"    → wrote {len(unique)} productions")
        matched_ct += 1
        time.sleep(REQUEST_DELAY)

    print(f"\n  Matched: {matched_ct} | Unmatched: {unmatched_ct}")


def main():
    parser = argparse.ArgumentParser(description="Enrich productions_json from ShotOnWhat")
    parser.add_argument("--write",     action="store_true", help="Write to DB (default is dry-run)")
    parser.add_argument("--table",     choices=["cameras", "lenses"], help="Only process this table")
    parser.add_argument("--limit",     type=int, default=None, help="Limit products per table")
    parser.add_argument("--overwrite", action="store_true", help="Re-fetch even if productions_json already set")
    args = parser.parse_args()
    args.dry_run = not args.write

    if args.dry_run:
        print("DRY RUN — pass --write to commit to DB\n")

    camera_entries = fetch_sow_camera_index()
    lens_entries   = fetch_sow_lens_index()

    tables = []
    if args.table == "cameras":
        tables = [("cameras", camera_entries, "cameras")]
    elif args.table == "lenses":
        tables = [("lenses", lens_entries, "lenses")]
    else:
        tables = [
            ("cameras", camera_entries, "cameras"),
            ("lenses",  lens_entries,   "lenses"),
        ]

    for (table, sow_entries, sow_type) in tables:
        process_table(table, sow_entries, sow_type, args)

    print("\nDone.")


if __name__ == "__main__":
    main()
