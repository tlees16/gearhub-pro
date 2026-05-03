#!/usr/bin/env python3
"""
GearHub QA program — automated checks for data quality and common bugs.

Checks:
  1. Price sanity: detect VND inflation, outlier prices, zero prices
  2. Market data integrity: orphaned rows, wrong condition values
  3. Retailer duplicates: same product × retailer × condition more than once
  4. Image URLs: products missing images
  5. AI analysis coverage: products without expert analysis
  6. Productions coverage: cameras/lenses without productions_json
  7. Spec completeness: key spec columns missing across many products
  8. Fuzzy match review: market_data price vs catalogue MSRP ratio outliers

Usage:
  python3 scrapers/qa_check.py                # all checks
  python3 scrapers/qa_check.py --check prices # specific check
  python3 scrapers/qa_check.py --fix          # auto-fix safe issues (orphaned rows)
"""

from __future__ import annotations

import argparse
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

load_dotenv(Path(__file__).parent.parent / ".env")

sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

PASS  = "✅"
WARN  = "⚠️ "
FAIL  = "❌"
INFO  = "ℹ️ "

TABLES = ["cameras", "lenses", "lighting"]

# VND/USD exchange rate used in price guard (if ratio > this, suspect VND)
VND_RATIO_MIN = 10_000   # anything > 10k × MSRP is almost certainly VND


class QAResult:
    def __init__(self, check: str):
        self.check  = check
        self.issues: list[str] = []
        self.passed = True

    def fail(self, msg: str):
        self.issues.append(f"{FAIL} {msg}")
        self.passed = False

    def warn(self, msg: str):
        self.issues.append(f"{WARN} {msg}")
        # warnings don't flip passed flag

    def info(self, msg: str):
        self.issues.append(f"{INFO} {msg}")

    def ok(self, msg: str):
        self.issues.append(f"{PASS} {msg}")

    def print(self):
        status = PASS if self.passed else FAIL
        print(f"\n{status} {self.check}")
        for issue in self.issues:
            print(f"   {issue}")


# ─── Check 1: Price sanity ────────────────────────────────────────────────────

def _fetch_all(table: str, columns: str, **filters) -> list[dict]:
    """Paginate through all rows of a table."""
    rows: list[dict] = []
    page_size = 1000
    offset = 0
    query = sb.table(table).select(columns)
    for k, v in filters.items():
        query = query.eq(k, v)
    while True:
        batch = query.range(offset, offset + page_size - 1).execute().data or []
        rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return rows


def check_prices() -> QAResult:
    r = QAResult("Price sanity (market_data)")

    rows = _fetch_all("market_data", "id, product_table, product_id, price_usd, currency, condition")

    r.info(f"{len(rows)} market_data rows")

    # Build catalogue price lookup
    cat_prices: dict[tuple[str, int], float] = {}
    for table in TABLES:
        prods = sb.table(table).select("id, price").execute().data or []
        for p in prods:
            if p.get("price"):
                cat_prices[(table, p["id"])] = float(p["price"])

    zero_ct    = 0
    vnd_ct     = 0
    outlier_ct = 0
    vnd_examples: list[str] = []

    for row in rows:
        price = row.get("price_usd") or 0
        key   = (row["product_table"], row["product_id"])
        msrp  = cat_prices.get(key)

        if price <= 0:
            zero_ct += 1
        elif msrp and msrp > 0:
            ratio = price / msrp
            if ratio > VND_RATIO_MIN:
                vnd_ct += 1
                if len(vnd_examples) < 3:
                    vnd_examples.append(f"id={row['id']} ratio={ratio:.0f}x")
            elif ratio > 5:
                outlier_ct += 1

    if zero_ct:
        r.fail(f"{zero_ct} rows with price ≤ 0")
    else:
        r.ok("No zero-price rows")

    if vnd_ct:
        r.fail(f"{vnd_ct} rows with VND-inflated prices (>{VND_RATIO_MIN}× MSRP): {vnd_examples}")
    else:
        r.ok("No VND-inflated prices detected")

    if outlier_ct:
        r.warn(f"{outlier_ct} rows with price >5× MSRP (may be legit accessories)")
    else:
        r.ok("No price outliers >5× MSRP")

    return r


# ─── Check 2: Market data integrity ──────────────────────────────────────────

def check_market_integrity() -> QAResult:
    r = QAResult("Market data integrity")

    rows = _fetch_all("market_data", "id, product_table, product_id, condition, retailer_id")

    valid_tables = set(TABLES)
    valid_conditions = {"New", "Used", "Like New", "Excellent", "Good", "Fair", "Poor"}

    bad_table  = [row for row in rows if row["product_table"] not in valid_tables]
    bad_cond   = [row for row in rows if row.get("condition") not in valid_conditions]

    # Check for orphaned rows (product no longer exists)
    orphaned_ids: dict[str, list[int]] = {t: [] for t in TABLES}
    for table in TABLES:
        existing_ids = {p["id"] for p in (sb.table(table).select("id").execute().data or [])}
        for row in rows:
            if row["product_table"] == table and row["product_id"] not in existing_ids:
                orphaned_ids[table].append(row["id"])

    total_orphaned = sum(len(v) for v in orphaned_ids.values())

    r.info(f"{len(rows)} total market_data rows")

    if bad_table:
        r.fail(f"{len(bad_table)} rows with invalid product_table")
    else:
        r.ok("All product_table values valid")

    if bad_cond:
        r.warn(f"{len(bad_cond)} rows with non-standard condition value: "
               f"{set(r['condition'] for r in bad_cond)}")
    else:
        r.ok("All condition values valid")

    if total_orphaned:
        r.warn(f"{total_orphaned} orphaned rows (product deleted from catalogue)")
    else:
        r.ok("No orphaned market_data rows")

    return r


# ─── Check 3: Retailer duplicates ────────────────────────────────────────────

def check_duplicates() -> QAResult:
    r = QAResult("Retailer duplicate prices")

    rows = _fetch_all("market_data", "id, product_table, product_id, retailer_id, condition")

    seen: dict[tuple, list[int]] = {}
    for row in rows:
        key = (row["product_table"], row["product_id"], row["retailer_id"], row["condition"])
        seen.setdefault(key, []).append(row["id"])

    dupes = {k: v for k, v in seen.items() if len(v) > 1}
    total_dupe_rows = sum(len(v) - 1 for v in dupes.values())

    if dupes:
        r.warn(f"{len(dupes)} duplicate product×retailer×condition combos ({total_dupe_rows} extra rows)")
        examples = list(dupes.items())[:3]
        for k, ids in examples:
            r.warn(f"  table={k[0]} product_id={k[1]} retailer_id={k[2]} condition={k[3]} → {ids}")
    else:
        r.ok("No duplicate market_data rows")

    return r


# ─── Check 4: Image coverage ──────────────────────────────────────────────────

def check_images() -> QAResult:
    r = QAResult("Image coverage")

    for table in TABLES:
        rows = sb.table(table).select("id, name, image_url").execute().data or []
        no_image = [p for p in rows if not p.get("image_url") or "na500x500" in str(p["image_url"])]
        total = len(rows)
        pct = len(no_image) / total * 100 if total else 0

        if pct > 20:
            r.warn(f"{table}: {len(no_image)}/{total} ({pct:.0f}%) missing images")
        elif no_image:
            r.info(f"{table}: {len(no_image)}/{total} ({pct:.0f}%) missing images")
        else:
            r.ok(f"{table}: all {total} products have images")

    return r


# ─── Check 5: AI analysis coverage ───────────────────────────────────────────

def check_analysis_coverage() -> QAResult:
    r = QAResult("AI expert analysis coverage")

    for table in TABLES:
        all_ids = {p["id"] for p in (sb.table(table).select("id").execute().data or [])}
        analysed_ids = {p["product_id"] for p in (
            sb.table("product_analysis").select("product_id").eq("product_table", table).execute().data or []
        )}
        missing = len(all_ids) - len(all_ids & analysed_ids)
        total   = len(all_ids)
        pct     = (total - missing) / total * 100 if total else 0

        msg = f"{table}: {total - missing}/{total} ({pct:.0f}%) analysed"
        if pct < 50:
            r.warn(msg + " — run generate_analysis.py")
        elif pct < 90:
            r.info(msg)
        else:
            r.ok(msg)

    return r


# ─── Check 6: Productions coverage ───────────────────────────────────────────

def check_productions_coverage() -> QAResult:
    r = QAResult("Productions (As Seen On) coverage")

    for table in ["cameras", "lenses"]:
        all_rows = sb.table(table).select("id").execute().data or []
        with_data = sb.table(table).select("id").not_.is_("productions_json", "null").execute().data or []
        total  = len(all_rows)
        filled = len(with_data)
        pct    = filled / total * 100 if total else 0
        r.info(f"{table}: {filled}/{total} ({pct:.0f}%) have productions_json")

    return r


# ─── Check 7: Key spec completeness ──────────────────────────────────────────

def check_spec_completeness() -> QAResult:
    r = QAResult("Key spec completeness")

    KEY_SPECS = {
        "cameras":  ["sensor_size", "max_video_resolution", "dynamic_range_stops"],
        "lenses":   ["focal_length", "aperture"],
        "lighting": ["power_draw_w", "color_temperature"],
    }

    for table, specs in KEY_SPECS.items():
        rows = sb.table(table).select(f"id, {', '.join(specs)}").execute().data or []
        total = len(rows)
        for spec in specs:
            missing = sum(
                1 for p in rows
                if not p.get(spec) or str(p.get(spec, "")).strip() in ("", "N/A", "null")
            )
            pct = missing / total * 100 if total else 0
            msg = f"{table}.{spec}: {total - missing}/{total} filled ({pct:.0f}% missing)"
            if pct > 50:
                r.warn(msg)
            elif pct > 20:
                r.info(msg)
            else:
                r.ok(msg)

    return r


# ─── Check 8: Stale data ──────────────────────────────────────────────────────

def check_staleness() -> QAResult:
    r = QAResult("Data freshness")

    now = datetime.now(timezone.utc)
    cutoff_24h = (now - timedelta(hours=24)).isoformat()
    cutoff_7d  = (now - timedelta(days=7)).isoformat()

    recent_res  = sb.table("market_data").select("id", count="exact", head=True).gte("last_checked", cutoff_24h).execute()
    stale_res   = sb.table("market_data").select("id", count="exact", head=True).lt("last_checked", cutoff_7d).execute()
    total_res   = sb.table("market_data").select("id", count="exact", head=True).execute()
    recent  = recent_res.count or 0
    stale_7d = stale_res.count or 0
    total   = total_res.count or 0

    r.info(f"{total} total market_data rows")
    r.info(f"{recent} rows updated in last 24h")

    if stale_7d:
        r.warn(f"{stale_7d} rows not updated in 7+ days")
    else:
        r.ok("All rows updated within 7 days")

    return r


# ─── Main ─────────────────────────────────────────────────────────────────────

CHECKS = {
    "prices":       check_prices,
    "integrity":    check_market_integrity,
    "duplicates":   check_duplicates,
    "images":       check_images,
    "analysis":     check_analysis_coverage,
    "productions":  check_productions_coverage,
    "specs":        check_spec_completeness,
    "staleness":    check_staleness,
}


def main():
    parser = argparse.ArgumentParser(description="GearHub QA checker")
    parser.add_argument("--check", choices=list(CHECKS.keys()), help="Run only this check")
    args = parser.parse_args()

    print(f"\n{'═'*60}")
    print(f"  GearHub QA  —  {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"{'═'*60}")

    checks_to_run = {args.check: CHECKS[args.check]} if args.check else CHECKS
    results = []

    for name, fn in checks_to_run.items():
        try:
            result = fn()
        except Exception as e:
            result = QAResult(name)
            result.fail(f"Exception: {e}")
        results.append(result)
        result.print()

    failed = [r for r in results if not r.passed]
    warned = [r for r in results if r.passed and any(WARN in i for i in r.issues)]

    print(f"\n{'═'*60}")
    print(f"  {len(results)} checks   {len(failed)} failed   {len(warned)} with warnings")
    print(f"{'═'*60}\n")

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
