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
    # ── Shopify (confirmed working) ───────────────────────────────────────────
    {"name": "District Camera",    "domain": "www.districtcamera.com",        "platform": "shopify"},
    {"name": "Pixel Connection",   "domain": "www.thepixelconnection.com",    "platform": "shopify"},
    {"name": "Pro Photo Supply",   "domain": "www.prophotosupply.com",        "platform": "shopify"},
    {"name": "Glazer's Camera",    "domain": "www.glazerscamera.com",         "platform": "shopify"},
    {"name": "Pictureline",        "domain": "www.pictureline.com",           "platform": "shopify"},
    {"name": "ProCam",             "domain": "www.procam.com",                "platform": "shopify"},
    {"name": "K&M Camera",         "domain": "www.kmcamera.com",              "platform": "shopify"},
    # Milford Photo removed — Duda CMS, no product API (products.json returns 404)
    {"name": "Hot Rod Cameras",    "domain": "hotrodcameras.com",             "platform": "shopify"},
    {"name": "Helix Camera",       "domain": "www.helixcamera.com",           "platform": "shopify"},
    {"name": "Focus Camera",       "domain": "www.focuscamera.com",           "platform": "shopify"},
    {"name": "AVC Store",          "domain": "avcstore.com",                  "platform": "shopify"},

    # ── BigCommerce — HTML scraping (GraphQL requires merchant token) ─────────
    {
        "name":       "Kenmore Camera",
        "domain":     "www.kenmorecamera.com",
        "platform":   "bc_html",
        "categories": [
            "/cameras/",
            "/digital-cameras/mirrorless-digital-cameras-1/",
            "/lenses/prime-lenses/",
            "/lenses/zoom-lenses/",
            "/lenses/macro-lenses/",
            "/on-camera-flash-units/",
            "/lighting-accessories/",
        ],
    },
    {
        "name":       "Omega Broadcast",
        "domain":     "omegabroadcast.com",
        "platform":   "bc_html",
        "categories": [
            "/sales/sales-catalog/cameras/",
            "/sales/sales-catalog/cameras/camera-accessories/",
            "/sales/sales-catalog/lighting/",
            "/lenses-lens-accessories/",
            "/lenses/",
            "/sales/used-catalog/used-cameras-accessories/",
            "/used-lenses-lens-accessories/",
        ],
    },

    # ── Magento — HTML scraping (REST API 401, but category pages are public) ─
    # Filmtools blocked — WAF returns 405 on all category listing pages even with ASP
    # {"name": "Filmtools", "domain": "www.filmtools.com"},
    {"name": "Dodd Camera",  "domain": "doddcamera.com",      "platform": "html_sitemap", "sitemap_seed": True,
     "gear_hint": r"camera|lens|light|photo|video"},
    {"name": "Band Pro",     "domain": "www.bandpro.com",     "platform": "html_sitemap", "sitemap_seed": True,
     "gear_hint": r"camera|lens|light|cine|monitor|recorder"},
    {"name": "Studio Depot", "domain": "www.studiodepot.com", "platform": "html_sitemap", "sitemap_seed": True,
     "gear_hint": r"camera|lens|light|studio|grip"},
    {"name": "Roberts Camera","domain": "robertscamera.com",  "platform": "html_sitemap", "sitemap_seed": True,
     "gear_hint": r"camera|lens|light|photo|video"},

    # ── Custom platforms — sitemap discovery + generic HTML extraction ─────────
    {"name": "Samy's Camera",       "domain": "www.samys.com",              "platform": "html_sitemap", "sitemap_seed": True,
     "gear_hint": r"camera|lens|light|photo|video|cine"},
    {"name": "Texas Media Systems", "domain": "texasmediasystems.com",      "platform": "html_sitemap", "sitemap_seed": True,
     "gear_hint": r"camera|lens|light|cine|broadcast"},
    {"name": "Foto Care",           "domain": "fotocare.com",               "platform": "html_sitemap", "sitemap_seed": True,
     "gear_hint": r"camera|lens|light|cine|photo"},
    {"name": "AbelCine",            "domain": "www.abelcine.com",           "platform": "html_sitemap", "sitemap_seed": True,
     "gear_hint": r"camera|lens|light|cine|monitor|recorder"},
    {"name": "Hunt's Photo",        "domain": "www.huntsphotoandvideo.com", "platform": "html_sitemap", "sitemap_seed": True,
     "gear_hint": r"camera|lens|light|photo|video"},
    {"name": "Pitman Photo",        "domain": "pitmanphotosupply.com",      "platform": "html_sitemap", "sitemap_seed": True,
     "gear_hint": r"camera|lens|light|photo|video"},

    # ── BigCommerce JS-rendered — requires render_js (expensive, skip for now) ─
    # {"name": "Precision Camera", "domain": "www.precision-camera.com"},

    # ── Affiliate deals pending ────────────────────────────────────────────────
    # B&H Photo Video / KEH Camera / MPB / Adorama

    # ── Rental only — not for sale ────────────────────────────────────────────
    # LensRentals / ShareGrid
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
    r"|\bopen[- ]?box\b|\bgrade\s*[a-e]\b|\badorama\s*used\b",
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


_DEFAULT_GEAR_RE = re.compile(
    r"\b(camera|lens|lenses|light|lighting|video|cinema|cine|photo|"
    r"photography|monitor|recorder|grip|flash|strobe|tripod|broadcast)\b",
    re.I,
)

_PRICE_AMOUNT_RE = re.compile(r'data-price-amount=["\']([0-9.]+)["\']')
_SCHEMA_PRICE_RE = re.compile(r'"price"\s*:\s*"?([0-9]+\.?[0-9]*)"?')

def _extract_products_from_html(html: str, base: str) -> list[dict]:
    """
    Multi-strategy product extractor. Tries in priority order:
      1. Schema.org JSON-LD (most reliable, universal)
      2. Magento Luma: product-item-link class
      3. Generic: any <a> element adjacent to a $ price
    """
    items: list[dict] = []

    # ── Strategy 1: Schema.org JSON-LD ──────────────────────────────────────
    for m in re.finditer(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html, re.S
    ):
        try:
            ld = json.loads(m.group(1))
        except (json.JSONDecodeError, ValueError):
            continue
        nodes = []
        if isinstance(ld, list):
            nodes = ld
        elif ld.get("@type") == "ItemList":
            nodes = [e.get("item", e) for e in ld.get("itemListElement", [])]
        elif ld.get("@type") in ("Product", "Offer"):
            nodes = [ld]
        for node in nodes:
            if node.get("@type") not in ("Product", "Offer", None):
                continue
            name = node.get("name") or node.get("title") or ""
            if not name:
                continue
            offer = node.get("offers") or {}
            if isinstance(offer, list):
                offer = offer[0] if offer else {}
            try:
                price = float(offer.get("price") or offer.get("lowPrice") or 0) or None
            except (TypeError, ValueError):
                price = None
            url_p = offer.get("url") or node.get("url") or ""
            if url_p and not url_p.startswith("http"):
                url_p = base + url_p
            items.append({"name": name.strip(), "price": price, "url": url_p or base})

    if items:
        return items

    # ── Strategy 2: Magento Luma product-item-link ───────────────────────────
    mag_re = re.compile(
        r'class=["\']product-item-link["\'][^>]*href=["\']([^"\']+)["\'][^>]*>\s*([^<]{3,120})',
        re.S,
    )
    for m in mag_re.finditer(html):
        url_p = m.group(1).strip()
        if not url_p.startswith("http"):
            url_p = base + url_p
        title = re.sub(r"\s+", " ", m.group(2)).strip()
        if title and url_p:
            items.append({"name": title, "price": None, "url": url_p})

    # Pair Magento prices ($data-price-amount) with items in order
    if items:
        amounts = [float(x) for x in _PRICE_AMOUNT_RE.findall(html) if x.replace(".", "").isdigit()]
        for i, item in enumerate(items):
            if i < len(amounts) and amounts[i] > 0:
                item["price"] = amounts[i]
        return items

    # ── Strategy 3: Generic heuristic — any <a> near a dollar price ──────────
    # Split HTML into ~500-char windows; if window has a URL and a price, emit it
    for chunk in re.finditer(
        r'href=["\']([^"\']{10,200})["\'][^>]*>([^<]{5,120})</a>'
        r'(?:[^$]{0,300})\$([\d,]{2,10}(?:\.\d{2})?)',
        html, re.S,
    ):
        url_p = chunk.group(1).strip()
        title = re.sub(r"\s+", " ", chunk.group(2)).strip()
        try:
            price = float(chunk.group(3).replace(",", ""))
        except ValueError:
            price = None
        if not url_p.startswith("http"):
            url_p = base + url_p
        # Skip nav/footer links
        if any(x in url_p for x in ("cart", "account", "login", "search", "wishlist", "compare")):
            continue
        if title and price and price > 9:
            items.append({"name": title, "price": price, "url": url_p})

    return items


async def _fetch_text(
    url: str, session: aiohttp.ClientSession, sem: asyncio.Semaphore,
    asp: bool = False,
) -> Optional[str]:
    """Fetch a URL as plain text. Direct first (free), Scrapfly fallback."""
    try:
        async with session.get(
            url,
            headers={"User-Agent": _BROWSER_HEADERS["User-Agent"], "Accept": "*/*"},
            timeout=aiohttp.ClientTimeout(total=20),
        ) as r:
            if r.status == 200:
                return await r.text(errors="replace")
    except Exception:
        pass
    return await sf_get(sem, url, asp=asp)


async def _sitemap_category_urls(
    name: str, domain: str, gear_hint: str, sem: asyncio.Semaphore,
    session: aiohttp.ClientSession,
) -> list[str]:
    """
    Fetch sitemap.xml and return category-level URLs matching gear keywords.
    Falls back to homepage nav links if no sitemap found.
    Credit-efficient: direct HTTP first, Scrapfly ASP only as last resort.
    """
    base = f"https://{domain}"
    gear_re = re.compile(gear_hint or _DEFAULT_GEAR_RE.pattern, re.I)
    cats: list[str] = []

    for sitemap_path in ("/sitemap.xml", "/sitemap_index.xml", "/sitemap/sitemap.xml"):
        content = await _fetch_text(base + sitemap_path, session, sem, asp=False)
        if not content or "<loc>" not in content:
            continue

        all_locs = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", content)

        # Expand sitemap index (child sitemaps listed as .xml URLs)
        child_maps = [u for u in all_locs if re.search(r"sitemap.*\.xml", u, re.I)]
        for child_url in child_maps[:6]:
            child = await _fetch_text(child_url, session, sem, asp=False)
            if child and "<loc>" in child:
                all_locs += re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", child)

        for loc in all_locs:
            loc = loc.strip()
            if not gear_re.search(loc):
                continue
            path = loc.replace(base, "").split("?")[0]
            segments = [s for s in path.split("/") if s]
            # Only top-level and one-deep categories (e.g. /cameras/ or /cameras/mirrorless/)
            # Deeper paths are sub-subcategories with minimal new products
            if len(segments) > 2:
                continue
            # Skip promotional, brand-partnership, or portal pages
            if any(x in path.lower() for x in ("promo", "rebate", "portal", "sale", "deal", "event")):
                continue
            if re.search(r"\d{5,}", segments[-1] if segments else ""):
                continue
            cats.append(loc)

        if cats:
            log.info("[%s] Sitemap: %d gear-relevant categories", name, len(cats))
            return list(dict.fromkeys(cats))[:20]  # cap at 20 top-level categories

    # No sitemap — extract nav links from homepage
    log.info("[%s] No sitemap; falling back to nav links", name)
    html = await _fetch_text(base, session, sem, asp=True)
    if html:
        nav_links = re.findall(
            r'href=["\'](' + re.escape(base) + r'/[a-z0-9][a-z0-9/-]{2,60})["\']',
            html, re.I,
        )
        cats = [
            u for u in dict.fromkeys(nav_links)
            if gear_re.search(u) and not any(
                x in u for x in ("cart", "account", "blog", "login", "search", "checkout")
            )
        ][:30]
        log.info("[%s] Nav fallback: %d gear links", name, len(cats))
    return cats


async def handle_html_sitemap(
    name: str, domain: str, retailer: dict,
    session: aiohttp.ClientSession, sem: asyncio.Semaphore,
) -> list[dict]:
    """
    Universal HTML scraper:
      1. Discovers category URLs via sitemap.xml (or homepage nav as fallback)
      2. Paginates each category (tries ?page=N, ?p=N, ?pg=N)
      3. Extracts products via Schema.org JSON-LD → Magento selectors → generic heuristic
    Credit strategy: direct HTTP first → asp=False → asp=True.
    """
    base = f"https://{domain}"
    gear_hint = retailer.get("gear_hint", _DEFAULT_GEAR_RE.pattern)
    categories = retailer.get("categories") or await _sitemap_category_urls(
        name, domain, gear_hint, sem, session
    )

    if not categories:
        log.warning("[%s] No category URLs found — skipping", name)
        return []

    results: list[dict] = []
    seen_urls: set[str] = set()

    for cat in categories:
        cat_url = cat if cat.startswith("http") else f"{base}{cat}"
        page = 1

        while page <= 20:
            # Build paginated URL — try the three most common pagination params
            if page == 1:
                url = cat_url
            else:
                sep = "&" if "?" in cat_url else "?"
                # Try ?page= first; if that yields nothing we try ?p= below
                url = f"{cat_url}{sep}page={page}"

            # Credit-efficient fetch: direct HTTP → Scrapfly no-ASP → Scrapfly ASP
            html = await _fetch_text(url, session, sem, asp=False)
            if not html or len(html) < 2000:
                html = await sf_get(sem, url, asp=True)
            if not html or len(html) < 2000:
                # Try Magento-style ?p= pagination as fallback on page > 1
                if page > 1:
                    url2 = re.sub(r"[?&]page=\d+", "", url) + (
                        "&" if "?" in cat_url else "?"
                    ) + f"p={page}"
                    html = await sf_get(sem, url2, asp=True)
            if not html:
                break

            items = _extract_products_from_html(html, base)
            new_items = [
                i for i in items
                if i.get("name") and i.get("url") not in seen_urls
            ]
            if not new_items:
                break

            for item in new_items:
                seen_urls.add(item["url"])
                title = item["name"]
                results.append({
                    "name":      title,
                    "brand":     item.get("brand"),
                    "sku":       item.get("sku"),
                    "price":     item.get("price"),
                    "in_stock":  True,
                    "condition": detect_condition(title, item["url"]),
                    "url":       item["url"],
                })

            log.info(
                "[%s] html_sitemap %s page %d: %d new items (total %d)",
                name, cat.rstrip("/").rsplit("/", 1)[-1], page, len(new_items), len(results),
            )
            if len(new_items) < 5:
                break
            page += 1
            await asyncio.sleep(0.6)

    return results


async def handle_bc_html(name: str, domain: str, categories: list[str],
                        sem: asyncio.Semaphore) -> list[dict]:
    """
    BigCommerce HTML scraper for stores where the GraphQL API requires a
    merchant-issued token. Parses the standard Stencil theme card markup:
      <article class="card…"> with card-title, brand, sku-value, price--withoutTax
    Paginates with ?page=N until no new cards are found.
    """
    base = f"https://{domain}"
    results: list[dict] = []
    seen_urls: set[str] = set()

    _title_re = re.compile(r'class="card-title"[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<', re.S)
    _brand_re  = re.compile(r'data-test-info-type="brandName"[^>]*>\s*<a[^>]*>([^<]+)<')
    _sku_re    = re.compile(r'data-product-sku[^>]*>\s*([^<\s]+)\s*<')
    _price_re  = re.compile(r'data-product-price-without-tax[^>]*class="price price--withoutTax">\s*\$([\d,]+\.?\d*)')

    for cat_path in categories:
        page = 1
        cat_seen: set[str] = set()
        while page <= 20:
            url = f"{base}{cat_path}?page={page}"
            html = await sf_get(sem, url, asp=True)
            if not html:
                break

            raw_cards = re.findall(r'<article[^>]*card[^>]*>(.*?)</article>', html, re.S)
            if not raw_cards:
                break

            new_on_page = 0
            for card in raw_cards:
                title_m = _title_re.search(card)
                if not title_m:
                    continue
                product_url = title_m.group(1).strip()
                if not product_url.startswith("http"):
                    product_url = base + product_url
                if product_url in seen_urls or product_url in cat_seen:
                    continue
                cat_seen.add(product_url)

                title  = title_m.group(2).strip()
                brand  = (_brand_re.search(card) or [None, None])[1]
                brand  = brand.strip() if brand else None
                sku    = (_sku_re.search(card) or [None, None])[1]
                sku    = sku.strip() if sku else None
                price_m = _price_re.search(card)
                price: Optional[float] = None
                if price_m:
                    try:
                        price = float(price_m.group(1).replace(",", ""))
                    except (TypeError, ValueError):
                        pass

                seen_urls.add(product_url)
                results.append({
                    "name":      title,
                    "brand":     brand,
                    "sku":       sku,
                    "price":     price,
                    "in_stock":  True,
                    "condition": detect_condition(title, product_url),
                    "url":       product_url,
                })
                new_on_page += 1

            log.info("[%s] bc_html %s page %d: %d new items (total %d)",
                     name, cat_path, page, new_on_page, len(results))

            if new_on_page == 0 or len(raw_cards) < 12:
                break
            page += 1
            await asyncio.sleep(0.5)

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
        if platform not in ("shopify", "woocommerce", "bigcommerce", "magento", "bc_html", "html_sitemap"):
            log.warning("[%s] Unsupported platform '%s' — skipping", name, platform)
            return name, 0, 0

    # Dispatch to handler
    products: list[dict] = []
    if platform == "shopify":
        products = await handle_shopify(name, domain, session, sem)
    elif platform == "bigcommerce":
        products = await handle_bigcommerce(name, domain, sem)
    elif platform == "bc_html":
        products = await handle_bc_html(name, domain,
                                        retailer.get("categories", []), sem)
    elif platform == "html_sitemap":
        products = await handle_html_sitemap(name, domain, retailer, session, sem)
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
