#!/usr/bin/env python3
"""
Batch-generate AI analysis for all products and store in product_analysis table.

Usage:
  python3 scrapers/generate_analysis.py                      # all tables
  python3 scrapers/generate_analysis.py --table cameras      # one table
  python3 scrapers/generate_analysis.py --limit 50           # first N products
  python3 scrapers/generate_analysis.py --skip-existing      # skip already-generated
  python3 scrapers/generate_analysis.py --dry-run            # print prompts, no writes
"""

from __future__ import annotations

import argparse
import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import anthropic
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(Path(__file__).parent.parent / ".env")

sb     = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

TABLES       = ["cameras", "lenses", "lighting"]
MODEL        = "claude-haiku-4-5-20251001"
MAX_TOKENS   = 1000
RATE_DELAY   = 0.4   # seconds between API calls (~150 req/min, well under limit)


# ── Audience detection (mirrors expertAnalysis.js) ────────────────────────────

def get_audience(product: dict) -> str:
    category   = product.get("category", "")
    subcategory = (product.get("subcategory") or "").lower()
    brand       = (product.get("brand") or "").lower()
    name        = (product.get("name") or "").lower()

    if category == "cameras":
        cinema_brands = re.compile(r"arri|red|blackmagic|panavision|venice|burano", re.I)
        cinema_names  = re.compile(r"alexa|ursa|komodo|raptor|cinema eos|c70|c300|c500|c700|fx[0-9]|fx30|venice|burano", re.I)
        if subcategory == "cinema" or cinema_brands.search(brand) or cinema_names.search(name):
            return "cinema"
        return "hybrid"

    if category == "lenses":
        cine_glass = re.compile(r"arri|zeiss supreme|cooke|leica summicron|sigma cine|angenieux|fujinon|schneider|dzofilm|tokina vista|atlas|laowa cine", re.I)
        if cine_glass.search(brand) or subcategory == "cine":
            return "cine_lens"
        return "photo_lens"

    if category == "lighting": return "lighting"
    return "general"


AUDIENCE_INSTRUCTIONS: dict[str, str] = {
    "cinema": (
        "You are writing for professional cinematographers (DPs), 1st ACs, and camera operators. "
        "Use technical, precise language. They care about dynamic range, codecs, ergonomics, rigging, "
        "focus pulling, media costs, and rental availability. Be honest about real-world quirks. "
        "Do NOT write marketing language. Be direct and opinionated."
    ),
    "hybrid": (
        "You are writing for independent filmmakers, content creators, and hybrid photographer/videographers. "
        "Use accessible but technically informed language. They care about image quality per dollar, "
        "autofocus, ease of use, lens ecosystem, and run-and-gun capability. "
        "Be honest about limitations and compare value against obvious alternatives."
    ),
    "cine_lens": (
        "You are writing for camera department professionals — 1st ACs, DPs, and lens techs. "
        "Use precise optical and mechanical language. They care about T-stops, image circles, "
        "focus breathing, parfocal, bokeh rendering, and housing quality. "
        "Be honest about rendering character and any known issues."
    ),
    "photo_lens": (
        "You are writing for photographers and hybrid shooters. "
        "They care about sharpness wide open, autofocus speed and accuracy, weight, IS, and value vs alternatives. "
        "Be direct about real-world optical performance."
    ),
    "lighting": (
        "You are writing for gaffers, best boys, and cinematographers. "
        "They care about CRI, TLCI, output accuracy, heat management, fan noise, power requirements, "
        "modifier compatibility, and build durability. Be honest about real-world issues."
    ),
    "general": (
        "You are writing for professional production crew and serious enthusiasts. "
        "Be technically accurate, honest, and direct. Avoid marketing language."
    ),
}


def build_prompt(product: dict) -> str:
    audience = get_audience(product)
    name      = product.get("name", "")
    brand     = product.get("brand", "")
    category  = product.get("category", "")
    subcategory = product.get("subcategory") or ""
    price     = product.get("price")
    price_str = f"${price:,.0f}" if price else "price on request"

    specs = product.get("specs_json") or {}
    specs_lines = "\n".join(
        f"{k.replace('_', ' ')}: {v}"
        for k, v in specs.items()
        if v is not None and v != "" and v != "N/A"
    ) or "Not available"

    return f"""{AUDIENCE_INSTRUCTIONS.get(audience, AUDIENCE_INSTRUCTIONS['general'])}

Product: {name}
Brand: {brand}
Category: {category}{f' / {subcategory}' if subcategory else ''}
Price: {price_str}

Technical specifications:
{specs_lines}

Write a product analysis in this exact JSON format. No markdown, no explanation, just valid JSON:

{{
  "description": "2-3 sentence honest technical description. Lead with what this product IS and WHO it is for. Include one genuine insight about its real-world use or reputation.",
  "pros": [
    "Specific technical strength with brief explanation",
    "Another genuine advantage",
    "A third real strength"
  ],
  "cons": [
    "Honest limitation with real-world implications",
    "Another genuine limitation",
    "A third honest con"
  ],
  "communityVoice": "1-2 sentences synthesizing what working professionals and users say about this in forums and on set. Be specific — mention known quirks or where it shines.",
  "verdict": <integer 60-98, honest score reflecting value and performance for the target audience>
}}"""


# ── API call ──────────────────────────────────────────────────────────────────

def generate(product: dict) -> Optional[dict]:
    prompt = build_prompt(product)
    try:
        msg = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=(
                "You are an expert in professional film and photography equipment with deep knowledge "
                "of production workflows, gear reputation, and real-world use. "
                "Write honest, technically accurate analysis — not marketing copy. "
                "Always respond with valid JSON only."
            ),
            messages=[{"role": "user", "content": prompt}],
        )
        text = msg.content[0].text.strip()
        cleaned = re.sub(r"^```json\s*", "", text, flags=re.I)
        cleaned = re.sub(r"```\s*$", "", cleaned).strip()
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        print(f"    JSON parse error: {e} — raw: {text[:200]}")
        return None
    except Exception as e:
        print(f"    API error: {e}")
        return None


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--table",         help="Only process one table (cameras/lenses/lighting)")
    parser.add_argument("--limit",         type=int, help="Stop after N products")
    parser.add_argument("--skip-existing", action="store_true", help="Skip products already in product_analysis")
    parser.add_argument("--dry-run",       action="store_true", help="Print prompts, don't write to DB")
    args = parser.parse_args()

    tables = [args.table] if args.table else TABLES

    # Load existing IDs to skip
    existing: set[tuple] = set()
    if args.skip_existing:
        rows = sb.table("product_analysis").select("product_table,product_id").execute().data or []
        existing = {(r["product_table"], r["product_id"]) for r in rows}
        print(f"Skipping {len(existing)} already-generated products")

    now      = datetime.now(timezone.utc).isoformat()
    total    = 0
    skipped  = 0
    errors   = 0

    for table in tables:
        print(f"\n── {table} ──")
        rows = sb.table(table).select("id, name, brand, price, subcategory, specs_json").execute().data or []

        for row in rows:
            if args.limit and total >= args.limit:
                break

            pid = row["id"]
            if (table, pid) in existing:
                skipped += 1
                continue

            product = {**row, "category": table}
            name    = row.get("name", "?")

            if args.dry_run:
                print(f"  [DRY] {name[:60]}")
                total += 1
                continue

            print(f"  [{total+1}] {name[:60]}", end="", flush=True)
            analysis = generate(product)

            if not analysis:
                print(" ERROR")
                errors += 1
                time.sleep(1.0)
                continue

            record = {
                "product_table":        table,
                "product_id":           pid,
                "geo_optimized_verdict": analysis.get("description", ""),
                "seo_description":      analysis.get("description", ""),
                "community_insights":   analysis.get("communityVoice") or "",
                "pros":                 analysis.get("pros", []),
                "cons":                 analysis.get("cons", []),
                "gearhub_score":        analysis.get("verdict", 75),
                "generated_at":         now,
            }

            try:
                sb.table("product_analysis").upsert(
                    record,
                    on_conflict="product_table,product_id",
                ).execute()
                print(f"  ✓ score={analysis.get('verdict')}")
            except Exception as e:
                print(f"  DB error: {e}")
                errors += 1
                continue

            total  += 1
            time.sleep(RATE_DELAY)

        if args.limit and total >= args.limit:
            break

    print(f"\n{'═'*50}")
    print(f"  Generated : {total}")
    print(f"  Skipped   : {skipped}")
    print(f"  Errors    : {errors}")
    print(f"{'═'*50}\n")


if __name__ == "__main__":
    main()
