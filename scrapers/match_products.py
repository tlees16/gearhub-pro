#!/usr/bin/env python3
"""
Phase 2: Fuzzy-match retailer_raw_products against the GearHub catalogue
and upsert matches into market_data.

Run after shopify_retailers.py (or any retailer scraper) has populated
retailer_raw_products.

Usage:
  python3 scrapers/match_products.py
  python3 scrapers/match_products.py --dry-run
  python3 scrapers/match_products.py --retailer "Glazer's Camera"
  python3 scrapers/match_products.py --since 2026-04-29
"""

import argparse
import os
import re
from typing import Optional
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client
from rapidfuzz import fuzz
from rapidfuzz import process as rfprocess

load_dotenv(Path(__file__).parent.parent / ".env")

sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

FUZZY_THRESHOLD = 82   # token_set_ratio cutoff — raised from 78 to reduce false positives

# Price-ratio guards: scraped price must be at least this fraction of catalogue MSRP.
# Catches accessories ($50 eyepiece matched to $4k camera) that slip past the name filter.
PRICE_RATIO_MIN_NEW  = 0.35   # new items: must be ≥35% of MSRP
PRICE_RATIO_MIN_USED = 0.15   # used items: legitimately cheaper, but not < 15%
PRICE_RATIO_MAX      = 5.0    # any item: reject if > 5× catalogue price (catches currency inflation bugs)

# ─── Model-ID guard ───────────────────────────────────────────────────────────
# Prevents "Canon EOS R5" from matching "Canon EOS R50", etc.

_SKIP = frozenset({
    "EOS", "SLR", "DSLR", "APS", "HDR", "USB", "GPS", "RAW", "EVF", "OVF",
    "GHz", "FPS", "ISO", "LED", "CCD", "CMOS", "ND", "CSC",
    "MARK", "PRO", "MAX", "MINI", "PLUS", "ULTRA", "LITE", "SE",
    "II", "III", "IV", "VI", "VII", "VIII",
})
_TOKEN_RE    = re.compile(r"[A-Z0-9][-A-Z0-9]*", re.I)
_FOCAL_RE    = re.compile(r"\b(\d{2,3}(?:-\d{2,3})?)\s*mm\b", re.I)
_FSTOP_RE    = re.compile(r"[ft]/(\d+(?:\.\d+)?)", re.I)
_ROMAN_RE    = re.compile(r"\b(II|III|IV|VI|VII|VIII|IX|XI|XII|V)\b")
# Camera mount designators — order matters: longer tokens before shorter prefixes
_MOUNT_RE    = re.compile(r"\b(EF-S|EF-M|EF|RF|PL|L-Mount|MFT|M43|Z|XF|GF|FE|E-Mount|F-Mount|SA)\b", re.I)

# Products that are accessories / accessories-for-cameras, not cameras themselves.
# Add keywords liberally — a false negative (missed accessory) pollutes market_data;
# the price-ratio guard is the backstop for anything that slips through.
_ACCESSORY_RE = re.compile(
    r"\bcage\b|\bring\b|\brig\b|\bhandle\b|\bbase\s*plate\b|\btop\s*plate\b"
    r"|\bhollow\b|\bbattery\s*grip\b|\bstrap\b|\bhood\b|\bfilter\b|\bprotector\b"
    r"|\bbag\b|\bcase\b|\bpouch\b|\bsleeve\b|\bstorage\b|\bcharger\b"
    r"|\badapter\b|\bconverter\b|\bextender\b|\bteleconverter\b"
    r"|\bflash\b|\btrigger\b|\btripod\b|\bmonopod\b|\bhead\b"
    r"|\bfocus\s*puller\b|\bfollow\s*focus\b|\brecorder\b|\bmonitor\b"
    r"|\bstabilizer\b|\bgimbal\b|\bmatte\s*box\b|\bsupport\b|\brail\b"
    r"|\bsmallrig\b|\batom\s*os\b|\bnitze\b|\bz\s*cam\b(?!\s+e2)"
    r"|\bviewfinder\b|\bhotshoe\b|\bhot\s*shoe\b|\bbracket\b|\bplate\b"
    r"|\bscreen\s*shield\b|\bscreen\s*protector\b|\btouch\s*screen\s*shield\b"
    r"|\bpromaster\b|\btiffen\b|\bhoya\b|\bsandisk\b|\blexar\b|\bcleaning\b"
    # Optics / eyepieces
    r"|\beyepiece\b|\beye\s*piece\b|\beye\s*cup\b|\bdiopter\b|\bmagnifier\b"
    # Rain / weather protection
    r"|\brain\s*cover\b|\brain\s*coat\b|\bhydrophobia\b|\brain\s*sleeve\b"
    # Cables, connectors, power
    r"|\bcable\b|\bcord\b|\btether\b|\bpower\s*supply\b|\bac\s*adapter\b"
    r"|\bd-tap\b|\bdtap\b|\bnp-f\b|\blp-e\b|\bpetrol\b"
    # Grips, clamps, mounts
    r"|\bpistol\s*grip\b|\bclamp\b|\bquick\s*release\b|\bshoe\s*mount\b"
    # Books / media
    r"|\bbook\b|\bguide\b|\bmanual\b|\bdvd\b|\bcourse\b"
    # Audio
    r"|\bmicrophone\b|\bmic\b|\baudio\b|\bwindscreen\b|\bdeadcat\b"
    # Lens caps, caps, covers
    r"|\blens\s*cap\b|\bbody\s*cap\b|\brear\s*cap\b|\bfront\s*cap\b|\bport\s*cover\b"
    # Accessory brands that never make cameras/lenses/lights
    r"|\bthink\s*tank\b|\bpeak\s*design\b|\bspiderpro\b|\bkondor\b|\bdeity\b"
    r"|\bsyrp\b|\bkessler\b|\bninja\b|\bvideo\s*assist\b"
    # Motorized accessories and yokes
    r"|\byoke\b|\bmotorized\s*yoke\b|\bmotor\s*drive\b",
    re.I,
)


def _model_id(name: str) -> Optional[str]:
    """Extract the most-discriminating token from a product name (e.g. 'R5', 'FX3', 'fp')."""
    candidates = []
    for t in _TOKEN_RE.findall(name or ""):
        if t.upper() in _SKIP:
            continue
        if re.search(r"\d", t):
            candidates.append(t)
        elif 2 <= len(t) <= 5 and t.isupper():
            candidates.append(t)
        elif 2 <= len(t) <= 3 and t.islower():   # short lowercase model codes like "fp", "bm"
            candidates.append(t)
    return candidates[-1] if candidates else None


def _focal_lengths(text: str) -> set[str]:
    return {m.group(1) for m in _FOCAL_RE.finditer(text)}


def _apertures(text: str) -> set[str]:
    return {m.group(1) for m in _FSTOP_RE.finditer(text)}


def _roman_gen(text: str) -> Optional[str]:
    m = _ROMAN_RE.search(text or "")
    return m.group(1) if m else None


def _mount(text: str) -> Optional[str]:
    m = _MOUNT_RE.search(text or "")
    return m.group(1).upper() if m else None


# ─── Catalogue ────────────────────────────────────────────────────────────────


def load_catalogue() -> list[dict]:
    catalogue = []
    for table in ("cameras", "lenses", "lighting"):
        rows = sb.table(table).select("id, name, brand, price").execute().data or []
        for r in rows:
            r["product_table"] = table
            r["_key"] = f"{r.get('brand', '')} {r.get('name', '')}".strip()
        catalogue.extend(rows)
    print(f"Catalogue: {len(catalogue)} products")
    return catalogue


# ─── Fuzzy matching ───────────────────────────────────────────────────────────


def fuzzy_match(raw_name: str, raw_sku: Optional[str], raw_price: float, raw_condition: str, catalogue: list[dict]) -> Optional[dict]:
    # Reject accessories up front — a cage is not the camera it's made for
    if _ACCESSORY_RE.search(raw_name):
        return None

    # SKU exact match — highest confidence, no threshold needed
    if raw_sku:
        sku_up = raw_sku.strip().upper()
        for p in catalogue:
            if (p.get("sku") or "").strip().upper() == sku_up:
                return p

    keys = [p["_key"] for p in catalogue]
    best = rfprocess.extractOne(
        raw_name,
        keys,
        scorer=fuzz.token_set_ratio,
        score_cutoff=FUZZY_THRESHOLD,
    )
    if best is None:
        return None

    matched = catalogue[keys.index(best[0])]

    # Model-ID guard: key discriminator (e.g. "R5") must appear in raw_name
    # Uses word boundary so "A7" doesn't match inside "A7R IV".
    mid = _model_id(matched.get("name", ""))
    if mid and not re.search(r'\b' + re.escape(mid) + r'\b', raw_name, re.I):
        return None

    # Focal-length guard: if both sides name focal lengths they must share at least one
    raw_focals = _focal_lengths(raw_name)
    cat_focals = _focal_lengths(matched["_key"])
    if raw_focals and cat_focals and raw_focals.isdisjoint(cat_focals):
        return None

    # Aperture guard: if both sides name an f/T stop they must share at least one
    raw_stops = _apertures(raw_name)
    cat_stops = _apertures(matched["_key"])
    if raw_stops and cat_stops and raw_stops.isdisjoint(cat_stops):
        return None

    # Generation guard: "a7R III" must not match "a7R V"
    raw_gen = _roman_gen(raw_name)
    cat_gen = _roman_gen(matched["_key"])
    if raw_gen and cat_gen and raw_gen != cat_gen:
        return None

    # Mount guard: "Canon EF" must not match "Canon RF"
    raw_mount = _mount(raw_name)
    cat_mount = _mount(matched["_key"])
    if raw_mount and cat_mount and raw_mount != cat_mount:
        return None

    # Price-ratio guard: catches accessories (too cheap) and currency-inflated prices (too expensive).
    cat_price = matched.get("price")
    if cat_price and cat_price > 0 and raw_price and raw_price > 0:
        ratio = raw_price / cat_price
        min_ratio = PRICE_RATIO_MIN_USED if (raw_condition or "").lower() == "used" else PRICE_RATIO_MIN_NEW
        if ratio < min_ratio or ratio > PRICE_RATIO_MAX:
            return None

    return matched


# ─── Retailer lookup / insert ─────────────────────────────────────────────────

_retailer_cache: dict[str, int] = {}


def get_or_create_retailer(name: str, domain: str) -> int:
    if name in _retailer_cache:
        return _retailer_cache[name]

    for root in (f"https://www.{domain.lstrip('www.')}", f"https://{domain}"):
        res = sb.table("retailers").select("id").eq('"Root_Domain"', root).execute()
        if res.data:
            _retailer_cache[name] = res.data[0]["id"]
            return _retailer_cache[name]

    ins = sb.table("retailers").insert({
        "Retailer_Name":       name,
        "Root_Domain":         f"https://{domain}",
        "Primary_Market":      "New",
        "Has_Used_Department": False,
        "Ships_Worldwide":     False,
        "Country_Code":        "US",
        "platform":            "shopify",
    }).execute()
    rid = ins.data[0]["id"]
    print(f"  Inserted new retailer '{name}' → id={rid}")
    _retailer_cache[name] = rid
    return rid


# ─── Main ─────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run",  action="store_true", help="Preview matches, no DB writes")
    parser.add_argument("--retailer", help="Only process rows from this retailer name")
    parser.add_argument("--since",    help="Only rows scraped on/after YYYY-MM-DD")
    args = parser.parse_args()

    print("\nLoading catalogue...")
    catalogue = load_catalogue()

    print("Loading raw retailer products...")
    query = sb.table("retailer_raw_products").select(
        "id, retailer, domain, name, brand, sku, price, currency, in_stock, condition, url"
    )
    if args.retailer:
        query = query.eq("retailer", args.retailer)
    if args.since:
        query = query.gte("scraped_at", args.since)

    # Paginate through all rows
    raw_rows: list[dict] = []
    page_size = 1000
    offset = 0
    while True:
        batch = query.range(offset, offset + page_size - 1).execute().data or []
        raw_rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size

    print(f"Raw rows to match: {len(raw_rows)}\n")

    now          = datetime.now(timezone.utc).isoformat()
    matched_ct   = 0
    unmatched_ct = 0
    skipped_ct   = 0

    for raw in raw_rows:
        if not raw.get("price") or raw["price"] <= 0:
            skipped_ct += 1
            continue

        product = fuzzy_match(raw["name"], raw.get("sku"), raw["price"], raw.get("condition", "New"), catalogue)
        if product is None:
            unmatched_ct += 1
            continue

        retailer_id = get_or_create_retailer(raw["retailer"], raw["domain"])

        record = {
            "product_table": product["product_table"],
            "product_id":    product["id"],
            "retailer_id":   retailer_id,
            "url":           raw.get("url"),
            "local_price":   raw["price"],
            "currency":      raw.get("currency", "USD"),
            "price_usd":     raw["price"],
            "in_stock":      raw.get("in_stock", True),
            "condition":     raw.get("condition", "New"),
            "last_checked":  now,
        }

        if args.dry_run:
            print(
                f"  {raw['retailer']:<22} {raw['name'][:48]:<48} "
                f"→ {product['product_table']:<10} "
                f"{(product.get('brand','') + ' ' + product.get('name',''))[:45]:<45} "
                f"${raw['price']:>8.2f}  {raw['condition']}"
            )
            matched_ct += 1
            continue

        try:
            sb.table("market_data").upsert(
                record,
                on_conflict="product_table,product_id,retailer_id,condition",
            ).execute()
            matched_ct += 1
        except Exception as e:
            print(f"  Upsert error for '{raw['name']}': {e}")

    print(f"\n{'═'*60}")
    print(f"  Matched + {'previewed' if args.dry_run else 'upserted'} : {matched_ct}")
    print(f"  No match found                : {unmatched_ct}")
    print(f"  Skipped (no price)            : {skipped_ct}")
    print(f"  Total raw rows                : {len(raw_rows)}")
    if args.dry_run:
        print("  DRY RUN — nothing written to DB")
    print(f"{'═'*60}\n")


if __name__ == "__main__":
    main()
