#!/usr/bin/env python3
"""
GearHub unified retailer scraper — Phase 1 (scrape → staging table).

All retailers run concurrently. A single asyncio.Semaphore caps live Scrapfly
requests at CONCURRENCY, so you get full throughput without spawning processes.

  All 29 retailers launch at once.
  Each one waits its turn at the semaphore per page request.
  Fast retailers finish and yield their slot to slower ones.
  Total wall time ≈ (total_pages / CONCURRENCY) × per_page_latency.

Run:
    python3 scrapers/scrape_all.py
    python3 scrapers/scrape_all.py --retailer "Glazer's Camera"
    python3 scrapers/scrape_all.py --dry-run

Then run:
    python3 scrapers/match_products.py
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import aiohttp
from dotenv import load_dotenv
from scrapfly import ScrapflyClient, ScrapeConfig, ScrapflyError
from supabase import create_client

load_dotenv(Path(__file__).parent.parent / ".env")

# ── Config ────────────────────────────────────────────────────────────────────

SCRAPFLY_KEY = os.environ.get("SCRAPFLY_API_KEY", "scp-live-f3802e266f8c4c30827358850d5420a7")
sb           = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
scrapfly     = ScrapflyClient(key=SCRAPFLY_KEY)

CONCURRENCY   = 10    # max simultaneous Scrapfly requests (PRO plan)
BATCH_SIZE    = 100   # rows per Supabase upsert batch
SHOPIFY_LIMIT = 250   # Shopify products per page (max)
SHOPIFY_MAX_P = 20    # hard page cap per retailer (20×250 = 5,000 products)
BC_PAGE_SIZE  = 100   # BigCommerce items per GraphQL page
BC_MAX_PAGES  = 20    # 100×20 = 2,000 products

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(message)s",
    datefmt="%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("gearhub")

# ── Retailer list ─────────────────────────────────────────────────────────────
# platform values: "shopify" | "bigcommerce" | "woocommerce" | "magento" | None
# None = auto-fingerprint on first run (costs 1 Scrapfly credit).

RETAILERS: list[dict] = [
    # ── Shopify (confirmed) ───────────────────────────────────────────────────
    {"name": "District Camera",    "domain": "www.districtcamera.com",        "platform": "shopify"},
    {"name": "Pixel Connection",   "domain": "www.thepixelconnection.com",    "platform": "shopify"},
    {"name": "Pro Photo Supply",   "domain": "www.prophotosupply.com",        "platform": "shopify"},
    {"name": "Glazer's Camera",    "domain": "www.glazerscamera.com",         "platform": "shopify"},
    {"name": "Pictureline",        "domain": "www.pictureline.com",           "platform": "shopify"},
    {"name": "ProCam",             "domain": "www.procam.com",                "platform": "shopify"},
    {"name": "K&M Camera",         "domain": "www.kmcamera.com",              "platform": "shopify"},
    {"name": "Milford Photo",      "domain": "www.milfordphoto.com",          "platform": "shopify"},
    {"name": "Hot Rod Cameras",    "domain": "hotrodcameras.com",             "platform": "shopify"},
    {"name": "Helix Camera",       "domain": "www.helixcamera.com",           "platform": "shopify"},
    {"name": "Focus Camera",       "domain": "www.focuscamera.com",           "platform": "shopify"},
    {"name": "AVC Store",          "domain": "avcstore.com",                  "platform": "shopify"},

    # ── BigCommerce (confirmed) ───────────────────────────────────────────────
    {"name": "Kenmore Camera",     "domain": "www.kenmorecamera.com",         "platform": "bigcommerce"},
    {"name": "Omega Broadcast",    "domain": "omegabroadcast.com",            "platform": "bigcommerce"},
    {"name": "Precision Camera",   "domain": "www.precision-camera.com",      "platform": "bigcommerce"},

    # ── Magento — auth-gated REST (401 on all); no guest API access ──────────
    # {"name": "Dodd Camera",    "domain": "doddcamera.com",    "platform": "magento"},  # 401
    # {"name": "Roberts Camera", "domain": "robertscamera.com", "platform": "magento"},  # 401
    # {"name": "Band Pro",       "domain": "www.bandpro.com",   "platform": "magento"},  # 401
    # {"name": "Studio Depot",   "domain": "www.studiodepot.com","platform": "magento"}, # 401
    # {"name": "Filmtools",      "domain": "www.filmtools.com",  "platform": "magento"},  # 401

    # ── Custom / unknown platforms — no public product API found ─────────────
    # {"name": "AbelCine",           "domain": "www.abelcine.com"},           # custom
    # {"name": "Foto Care",          "domain": "fotocare.com"},               # custom, 403
    # {"name": "Samy's Camera",      "domain": "www.samys.com"},              # not Shopify, 403
    # {"name": "Hunt's Photo",       "domain": "www.huntsphotoandvideo.com"}, # custom, 403
    # {"name": "Texas Media Systems","domain": "texasmediasystems.com"},      # custom
    # {"name": "Pitman Photo",       "domain": "pitmanphotosupply.com"},      # custom
    # {"name": "Milford Photo",      "domain": "www.milfordphoto.com"},       # 404 on products.json

    # ── Used gear — pending affiliate deals (need render_js or auth) ─────────
    # KEH Camera    — Magento + Bloomreach, client-side rendered
    # MPB           — React SPA, client-side rendered
    # Adorama Used  — Next.js, pagination client-side (24 items per category without JS)
    # B&H Used      — handled per-product by used_price_scraper.cjs

    # skip: LensRentals / ShareGrid — rental pipelines, not for sale
]

# ── Platform fingerprint signatures ──────────────────────────────────────────

_SIGS: dict[str, list[re.Pattern]] = {
    "shopify":      [re.compile(r"cdn\.shopify\.com", re.I),
                     re.compile(r"Shopify\.shop\b", re.I),
                     re.compile(r"shopify-section", re.I)],
    "woocommerce":  [re.compile(r"\bwoocommerce\b", re.I),
                     re.compile(r"wc-cart-fragments", re.I)],
    "bigcommerce":  [re.compile(r"\bbigcommerce\b", re.I),
                     re.compile(r"cdn\.bcapp\.dev", re.I)],
    "magento":      [re.compile(r"Mage\.Cookies\b", re.I),
                     re.compile(r"\bmagento\b", re.I)],
    "squarespace":  [re.compile(r"\bsquarespace\b", re.I)],
}

# ── Condition detection ───────────────────────────────────────────────────────

_USED_RE = re.compile(
    r"\bused\b|\bpre[- ]?owned\b|\brefurbished\b|\bex[- ]?demo\b"
    r"|\bopen[- ]?box\b|\bgrade\s*[a-e]\b",
    re.I,
)

def detect_condition(title: str, url: str) -> str:
    return "Used" if _USED_RE.search(f"{title} {url}") else "New"


# ── HTTP helpers ──────────────────────────────────────────────────────────────

_BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
}


async def direct_get_json(session: aiohttp.ClientSession, url: str) -> Optional[dict | list]:
    """Try a direct HTTP GET and return parsed JSON, or None on any error."""
    try:
        async with session.get(url, headers=_BROWSER_HEADERS,
                               timeout=aiohttp.ClientTimeout(total=15)) as r:
            if r.status == 200:
                return await r.json(content_type=None)
    except Exception:
        pass
    return None


async def sf_get(sem: asyncio.Semaphore, url: str, asp: bool = False) -> Optional[str]:
    """Scrapfly GET — returns raw content string, or None on error."""
    async with sem:
        try:
            resp = await asyncio.to_thread(
                scrapfly.scrape, ScrapeConfig(url=url, render_js=False, asp=asp)
            )
            return resp.content
        except ScrapflyError as e:
            log.warning("Scrapfly error on %s: %s", url, e)
            return None
        except Exception as e:
            log.warning("Unexpected error on %s: %s", url, e)
            return None


async def sf_post(sem: asyncio.Semaphore, url: str, body: str,
                  headers: Optional[dict] = None) -> Optional[str]:
    """Scrapfly POST (for GraphQL, etc.)."""
    async with sem:
        try:
            resp = await asyncio.to_thread(
                scrapfly.scrape,
                ScrapeConfig(
                    url=url,
                    render_js=False,
                    asp=False,
                    method="POST",
                    body=body,
                    headers=headers or {"Content-Type": "application/json",
                                        "Accept": "application/json"},
                ),
            )
            return resp.content
        except ScrapflyError as e:
            log.warning("Scrapfly POST error on %s: %s", url, e)
            return None
        except Exception as e:
            log.warning("Unexpected POST error on %s: %s", url, e)
            return None


# ── Platform fingerprinter ────────────────────────────────────────────────────


async def fingerprint(name: str, domain: str,
                      session: aiohttp.ClientSession,
                      sem: asyncio.Semaphore) -> str:
    """
    Detect e-commerce platform with zero or 1 Scrapfly credits.
    1. Try Shopify products.json directly (free).
    2. Try WooCommerce store API directly (free).
    3. Fetch homepage via Scrapfly (1 credit) and check signatures.
    """
    base = f"https://{domain}"

    # Free check 1: Shopify JSON endpoint
    data = await direct_get_json(session, f"{base}/products.json?limit=1")
    if isinstance(data, dict) and "products" in data:
        log.info("[%s] Fingerprint → shopify (products.json responded)", name)
        return "shopify"

    # Free check 2: WooCommerce public store API
    data = await direct_get_json(session, f"{base}/wp-json/wc/store/v1/products?per_page=1")
    if isinstance(data, list) or (isinstance(data, dict) and "items" in data):
        log.info("[%s] Fingerprint → woocommerce (WC store API responded)", name)
        return "woocommerce"

    # Cost: 1 credit — fetch homepage and match signatures
    html = await sf_get(sem, base, asp=False)
    if html:
        for platform, patterns in _SIGS.items():
            if any(p.search(html) for p in patterns):
                log.info("[%s] Fingerprint → %s (homepage signature)", name, platform)
                return platform

    log.warning("[%s] Fingerprint failed — platform unknown, skipping", name)
    return "unknown"


# ── Platform handlers ─────────────────────────────────────────────────────────


async def handle_shopify(name: str, domain: str,
                         session: aiohttp.ClientSession,
                         sem: asyncio.Semaphore) -> list[dict]:
    base = f"https://{domain}"
    results: list[dict] = []
    page_num = 0
    use_asp = False

    while True:
        page_num += 1
        url = f"{base}/products.json?limit={SHOPIFY_LIMIT}&page={page_num}"

        # Try direct first (free), fall back to Scrapfly with asp on block
        raw: Optional[dict] = None
        direct = await direct_get_json(session, url)
        if isinstance(direct, dict) and "products" in direct:
            raw = direct
        else:
            content = await sf_get(sem, url, asp=use_asp)
            if content:
                try:
                    parsed = json.loads(content)
                    if "products" in parsed:
                        raw = parsed
                        use_asp = True
                    elif not use_asp:
                        content2 = await sf_get(sem, url, asp=True)
                        if content2:
                            try:
                                parsed2 = json.loads(content2)
                                if "products" in parsed2:
                                    raw = parsed2
                                    use_asp = True
                            except json.JSONDecodeError:
                                pass
                except json.JSONDecodeError:
                    pass

        if not raw:
            log.warning("[%s] Shopify page %d failed — stopping", name, page_num)
            break

        page_products = raw.get("products", [])
        if not page_products:
            break

        for item in page_products:
            variants = item.get("variants") or []
            first = variants[0] if variants else {}
            try:
                price = float(first.get("price") or 0) or None
            except (TypeError, ValueError):
                price = None
            handle = item.get("handle", "")
            url_p = f"{base}/products/{handle}" if handle else base
            results.append({
                "name":      (item.get("title") or "").strip(),
                "brand":     (item.get("vendor") or "").strip() or None,
                "sku":       first.get("sku") or None,
                "price":     price,
                "in_stock":  any(v.get("available", False) for v in variants),
                "condition": detect_condition(item.get("title", ""), url_p),
                "url":       url_p,
            })

        log.info("[%s] Shopify page %d: %d items (total %d)", name, page_num,
                 len(page_products), len(results))

        if len(page_products) < SHOPIFY_LIMIT or page_num >= SHOPIFY_MAX_P:
            break
        await asyncio.sleep(0.5)

    return results


_BC_GQL = """
query GetProducts($first: Int!, $after: String) {
  site {
    products(first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          name sku path
          prices {
            price     { value currencyCode }
            salePrice { value currencyCode }
          }
          availabilityV2 { status }
        }
      }
    }
  }
}
"""


async def handle_bigcommerce(name: str, domain: str,
                             sem: asyncio.Semaphore) -> list[dict]:
    base = f"https://{domain}"
    results: list[dict] = []
    after: Optional[str] = None
    page_num = 0

    while True:
        page_num += 1
        payload = json.dumps({"query": _BC_GQL,
                              "variables": {"first": BC_PAGE_SIZE, "after": after}})
        content = await sf_post(sem, f"{base}/graphql", payload)
        if not content:
            break

        try:
            gql = json.loads(content)
        except json.JSONDecodeError:
            log.warning("[%s] BigCommerce non-JSON on page %d", name, page_num)
            break

        if gql.get("errors"):
            log.warning("[%s] BigCommerce GQL errors: %s", name, gql["errors"])
            break

        try:
            conn = gql["data"]["site"]["products"]
            edges = conn["edges"]
            page_info = conn["pageInfo"]
        except (KeyError, TypeError):
            log.warning("[%s] BigCommerce unexpected GQL shape", name)
            break

        for edge in edges:
            node = edge.get("node", {})
            prices = node.get("prices") or {}
            sale    = (prices.get("salePrice") or {}).get("value")
            regular = (prices.get("price") or {}).get("value")
            try:
                price = float(sale if sale else regular) if (sale or regular) else None
            except (TypeError, ValueError):
                price = None
            avail = (node.get("availabilityV2") or {}).get("status", "")
            url_p = f"{base}{node.get('path', '/')}"
            title = node.get("name", "")
            results.append({
                "name":      title.strip(),
                "brand":     None,
                "sku":       node.get("sku") or None,
                "price":     price,
                "in_stock":  avail.upper() == "AVAILABLE",
                "condition": detect_condition(title, url_p),
                "url":       url_p,
            })

        log.info("[%s] BigCommerce page %d: %d items (total %d)", name, page_num,
                 len(edges), len(results))

        if not page_info.get("hasNextPage") or page_num >= BC_MAX_PAGES:
            break
        after = page_info.get("endCursor")
        await asyncio.sleep(0.5)

    return results


async def handle_woocommerce(name: str, domain: str,
                             session: aiohttp.ClientSession,
                             sem: asyncio.Semaphore) -> list[dict]:
    base = f"https://{domain}"
    results: list[dict] = []
    page = 1

    while True:
        url = f"{base}/wp-json/wc/store/v1/products?per_page=100&page={page}"
        raw = await direct_get_json(session, url)

        # If direct fails, try via Scrapfly
        if not isinstance(raw, list):
            content = await sf_get(sem, url)
            if content:
                try:
                    raw = json.loads(content)
                except json.JSONDecodeError:
                    pass

        if not isinstance(raw, list) or not raw:
            break

        for item in raw:
            try:
                price = float(item.get("prices", {}).get("price", 0)) / 100 or None
            except (TypeError, ValueError, AttributeError):
                try:
                    price = float(item.get("price") or 0) or None
                except (TypeError, ValueError):
                    price = None
            title = (item.get("name") or "").strip()
            url_p = item.get("permalink") or base
            results.append({
                "name":      title,
                "brand":     None,
                "sku":       item.get("sku") or None,
                "price":     price,
                "in_stock":  item.get("is_in_stock", False),
                "condition": detect_condition(title, url_p),
                "url":       url_p,
            })

        log.info("[%s] WooCommerce page %d: %d items (total %d)", name, page,
                 len(raw), len(results))
        if len(raw) < 100:
            break
        page += 1
        await asyncio.sleep(0.5)

    return results


async def handle_magento(name: str, domain: str,
                         sem: asyncio.Semaphore) -> list[dict]:
    base = f"https://{domain}"
    results: list[dict] = []
    page = 1

    while True:
        url = (
            f"{base}/rest/V1/products"
            f"?searchCriteria[filter_groups][0][filters][0][field]=status"
            f"&searchCriteria[filter_groups][0][filters][0][value]=1"
            f"&searchCriteria[filter_groups][0][filters][0][condition_type]=eq"
            f"&searchCriteria[pageSize]=100"
            f"&searchCriteria[currentPage]={page}"
        )
        content = await sf_get(sem, url)
        if not content:
            break

        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            log.warning("[%s] Magento non-JSON on page %d", name, page)
            break

        if not isinstance(data, dict):
            log.warning("[%s] Magento unexpected response (likely auth-gated)", name)
            break

        items = data.get("items", [])
        if not items:
            break

        for item in items:
            price: Optional[float] = None
            try:
                price = float(item.get("price") or 0) or None
            except (TypeError, ValueError):
                pass
            url_key = item.get("custom_attributes", [])
            url_key = next((a["value"] for a in url_key
                            if a.get("attribute_code") == "url_key"), None)
            url_p = f"{base}/{url_key}.html" if url_key else base
            title = (item.get("name") or "").strip()
            results.append({
                "name":      title,
                "brand":     None,
                "sku":       item.get("sku") or None,
                "price":     price,
                "in_stock":  item.get("status") == 1,
                "condition": detect_condition(title, url_p),
                "url":       url_p,
            })

        log.info("[%s] Magento page %d: %d items (total %d)", name, page,
                 len(items), len(results))
        if len(results) >= data.get("total_count", 0) or len(items) < 100:
            break
        page += 1
        await asyncio.sleep(1.0)

    return results


# ── Used catalog handler (KEH, MPB, Adorama Used) ────────────────────────────
# These sites are Next.js or traditional HTML. We browse known category pages,
# extract products via __NEXT_DATA__ JSON (Next.js) or Schema.org microdata
# (Adorama), and paginate with ?page=N. All products are condition="Used".

USED_CAT_MAX_PAGES = 30   # 30 pages × ~48 items = ~1,440 per category


def _extract_next_data(html: str) -> list[dict]:
    """Pull product list out of a Next.js __NEXT_DATA__ blob."""
    m = re.search(r'<script[^>]+id=["\']__NEXT_DATA__["\'][^>]*>(.*?)</script>',
                  html, re.S)
    if not m:
        return []
    try:
        nd = json.loads(m.group(1))
    except json.JSONDecodeError:
        return []

    pp = nd.get("props", {}).get("pageProps", {})
    # Try multiple known shapes across sites
    candidates = [
        pp.get("products"),
        pp.get("searchResults", {}).get("products"),
        pp.get("categoryPageData", {}).get("products"),
        pp.get("data", {}).get("products"),
        pp.get("listings"),
        pp.get("items"),
    ]
    for c in candidates:
        if isinstance(c, list) and c:
            return c
    return []


def _extract_schema_org(html: str, base: str) -> list[dict]:
    """Extract products from Schema.org JSON-LD blocks."""
    results = []
    for m in re.finditer(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html, re.S
    ):
        try:
            ld = json.loads(m.group(1))
        except json.JSONDecodeError:
            continue
        items = []
        if isinstance(ld, list):
            items = ld
        elif ld.get("@type") == "ItemList":
            items = [e.get("item", e) for e in ld.get("itemListElement", [])]
        elif ld.get("@type") == "Product":
            items = [ld]

        for item in items:
            if item.get("@type") != "Product":
                continue
            name  = item.get("name", "")
            offer = item.get("offers") or {}
            if isinstance(offer, list):
                offer = offer[0] if offer else {}
            try:
                price = float(offer.get("price") or offer.get("lowPrice") or 0) or None
            except (TypeError, ValueError):
                price = None
            url_p = offer.get("url") or item.get("url") or ""
            if url_p and not url_p.startswith("http"):
                url_p = base + url_p
            results.append({"name": name, "price": price, "url": url_p})
    return results


def _extract_microdata(html: str) -> list[dict]:
    """Schema.org microdata (used by Adorama)."""
    results = []
    for m in re.finditer(r'itemtype=["\']https?://schema\.org/Product["\'].*?(?=itemtype=|$)',
                         html, re.S):
        block = m.group(0)
        name_m  = re.search(r'itemprop=["\']name["\'][^>]*>([^<]+)', block)
        price_m = re.search(r'itemprop=["\']price["\'][^>]*content=["\']([^"\']+)', block)
        url_m   = re.search(r'itemprop=["\']url["\'][^>]*(?:content|href)=["\']([^"\']+)', block)
        if not name_m:
            continue
        try:
            price = float(price_m.group(1)) if price_m else None
        except (TypeError, ValueError):
            price = None
        results.append({
            "name":  name_m.group(1).strip(),
            "price": price,
            "url":   url_m.group(1).strip() if url_m else "",
        })
    return results


async def handle_used_catalog(name: str, domain: str, categories: list[str],
                              sem: asyncio.Semaphore) -> list[dict]:
    base = f"https://{domain}"
    results: list[dict] = []
    seen_urls: set[str] = set()

    for cat_path in categories:
        page = 1
        cat_total = 0
        while page <= USED_CAT_MAX_PAGES:
            # Page param differs per site; try the most common one
            sep = "&" if "?" in cat_path else "?"
            url = f"{base}{cat_path}{sep}page={page}"

            html = await sf_get(sem, url, asp=False)
            if not html:
                break

            # Extraction order: __NEXT_DATA__ → Schema.org JSON-LD → microdata
            raw_items = _extract_next_data(html)

            # Normalise __NEXT_DATA__ shapes across KEH / MPB
            page_items: list[dict] = []
            for item in raw_items:
                title = (
                    item.get("title") or item.get("name") or
                    item.get("displayName") or ""
                ).strip()
                try:
                    price = float(
                        item.get("priceCurrent") or item.get("price") or
                        item.get("currentPrice") or 0
                    ) or None
                except (TypeError, ValueError):
                    price = None
                cond = (
                    item.get("condition", {}).get("displayName", "")
                    if isinstance(item.get("condition"), dict)
                    else str(item.get("condition") or item.get("grade") or "Used")
                ).strip() or "Used"
                sku  = str(item.get("sku") or item.get("id") or "") or None
                slug = item.get("url") or item.get("slug") or item.get("path") or ""
                url_p = slug if slug.startswith("http") else f"{base}{slug}" if slug else url
                if title:
                    page_items.append({"name": title, "price": price,
                                       "condition": cond, "sku": sku, "url": url_p})

            # Fallback to Schema.org if __NEXT_DATA__ gave nothing
            if not page_items:
                for item in _extract_schema_org(html, base) or _extract_microdata(html):
                    if item.get("name"):
                        item.setdefault("condition", "Used")
                        page_items.append(item)

            if not page_items:
                break   # no more products on this page

            new_items = [i for i in page_items if i["url"] not in seen_urls]
            if not new_items:
                break   # pagination wrapped around
            for i in new_items:
                seen_urls.add(i["url"])

            results.extend(new_items)
            cat_total += len(new_items)
            log.info("[%s] %s page %d: %d items (cat total %d)",
                     name, cat_path, page, len(new_items), cat_total)

            if len(page_items) < 12:   # sparse page = last page
                break
            page += 1
            await asyncio.sleep(0.5)

    return results


# ── Supabase upsert ───────────────────────────────────────────────────────────


def store_products(name: str, domain: str, products: list[dict],
                   now: str, dry_run: bool) -> int:
    if not products or dry_run:
        return 0
    rows = [
        {**p, "retailer": name, "domain": domain,
         "currency": "USD", "scraped_at": now}
        for p in products if p.get("name")
    ]
    stored = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i: i + BATCH_SIZE]
        try:
            sb.table("retailer_raw_products").upsert(
                batch, on_conflict="domain,url"
            ).execute()
            stored += len(batch)
        except Exception as e:
            log.error("[%s] Upsert error: %s", name, e)
    return stored


# ── Per-retailer orchestrator ─────────────────────────────────────────────────


async def scrape_retailer(retailer: dict,
                          session: aiohttp.ClientSession,
                          sem: asyncio.Semaphore,
                          now: str,
                          dry_run: bool) -> tuple[str, int, int]:
    name     = retailer["name"]
    domain   = retailer["domain"]
    platform = retailer["platform"]

    log.info("[%s] Starting (%s)", name, platform or "unknown — will fingerprint")

    # Auto-fingerprint if platform unknown
    if platform is None:
        platform = await fingerprint(name, domain, session, sem)
        if platform not in ("shopify", "woocommerce", "bigcommerce", "magento"):
            log.warning("[%s] Unsupported platform '%s' — skipping", name, platform)
            return name, 0, 0

    # Dispatch to handler
    products: list[dict] = []
    if platform == "shopify":
        products = await handle_shopify(name, domain, session, sem)
    elif platform == "bigcommerce":
        products = await handle_bigcommerce(name, domain, sem)
    elif platform == "woocommerce":
        products = await handle_woocommerce(name, domain, session, sem)
    elif platform == "magento":
        products = await handle_magento(name, domain, sem)
    elif platform == "used_catalog":
        products = await handle_used_catalog(name, domain,
                                             retailer.get("categories", []), sem)
    else:
        log.warning("[%s] No handler for platform '%s'", name, platform)

    stored = store_products(name, domain, products, now, dry_run)
    log.info("[%s] Done — %d scraped, %d stored", name, len(products), stored)
    return name, len(products), stored


# ── Main ──────────────────────────────────────────────────────────────────────


async def run(args: argparse.Namespace) -> None:
    targets = RETAILERS
    if args.retailer:
        targets = [r for r in RETAILERS if r["name"].lower() == args.retailer.lower()]
        if not targets:
            log.error("Retailer '%s' not found in config", args.retailer)
            sys.exit(1)

    sem = asyncio.Semaphore(CONCURRENCY)
    now = datetime.now(timezone.utc).isoformat()

    connector = aiohttp.TCPConnector(limit=40)
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [
            scrape_retailer(r, session, sem, now, args.dry_run)
            for r in targets
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    print(f"\n{'═'*65}")
    print(f"  {'Retailer':<28} {'Scraped':>8}  {'Stored':>8}")
    print(f"  {'─'*28} {'─'*8}  {'─'*8}")
    total_scraped = total_stored = 0
    for res in results:
        if isinstance(res, Exception):
            print(f"  ERROR: {res}")
            continue
        name, scraped, stored = res
        print(f"  {name:<28} {scraped:>8}  {stored:>8}")
        total_scraped += scraped
        total_stored  += stored
    print(f"  {'─'*28} {'─'*8}  {'─'*8}")
    print(f"  {'TOTAL':<28} {total_scraped:>8}  {total_stored:>8}")
    if args.dry_run:
        print("  DRY RUN — nothing written to DB")
    print(f"{'═'*65}")
    print(f"\n  Next: python3 scrapers/match_products.py\n")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run",  action="store_true",
                        help="Scrape but don't write to DB")
    parser.add_argument("--retailer", help="Only run one retailer by name")
    asyncio.run(run(parser.parse_args()))


if __name__ == "__main__":
    main()
