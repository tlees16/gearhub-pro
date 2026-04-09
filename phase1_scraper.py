"""
GearHub Pro — Phase 1: Catalog Discovery (Skeleton)
Scrapes B&H category/search pages to build a master inventory.
Extracts: Name, Brand, Price, B&H URL, Image URL, SKU
Writes results to Google Sheets with one tab per major category.
Filters out kits/bundles. Filters to target brands only.
"""

import json
import html
import time
import re
import gspread
from google.oauth2.service_account import Credentials
from playwright.sync_api import sync_playwright

# ─── Config ───────────────────────────────────────────────────────
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
CREDS_PATH = '/Users/t/gearhub/credentials.json'
SHEET_ID = '1bWQXQGUwzr3N9AWI5RhP2hhW63O9wIxT6kssXdB8mCI'
BH_BASE = 'https://www.bhphotovideo.com'
ITEMS_PER_PAGE = 28
PAGE_DELAY = 3  # seconds between page loads (be nice)

# ─── Target brands per category ──────────────────────────────────

LIGHTING_BRANDS = {
    "ARRI", "Aputure", "amaran", "Nanlite", "Nanlux", "Astera", "Kino Flo",
    "Litegear", "Litepanels", "Lupo", "PHOTOOLEX", "Profoto", "Quasar Science",
    "ProLights", "Raya", "SUMOLIGHT", "VELVETlight", "Tilta", "Zhiyun",
    "Aladdin", "Atomos", "BB&S", "Broncolor", "Chimera", "CHROMA-Q",
    "Cineo", "Fiilex", "Creamsource", "FotodioX", "K5600",
    # Normalize variations
    "Kino", "BB&S Lighting", "Velvet", "VELVET", "K 5600",
}

LENS_BRANDS = {
    # Mirrorless
    "Sony", "Canon", "Nikon", "FUJIFILM", "Fujifilm", "Panasonic", "Sigma",
    "Tamron", "ZEISS", "Zeiss", "Leica", "Venus Optics", "Laowa", "Sirui",
    "Samyang", "Rokinon", "Viltrox", "7Artisans", "7artisans", "TTArtisan",
    "TTArtisans", "AstrHori", "Artra Lab", "Meyer-Optik Gorlitz", "Meyer-Optik",
    "Mitakon", "Mitakon Zhongyi", "KIPON", "OM SYSTEM", "Olympus",
    "SLR Magic", "Tokina", "Yasuhara", "Yongnuo", "Thypoch",
    # Cine
    "Angenieux", "Cooke", "ARRI", "Leitz", "Leitz Cine", "Atlas Lens Co.",
    "Atlas", "Blazar", "Blazar Lens", "DZOFilm", "Fujinon", "Meike",
    "IRIX", "Irix", "CHIOPT", "Dulens", "DJI", "IBE OPTICS",
    "P+S TECHNIK", "Schneider", "Simmod", "Tribe7", "Whitepoint Optic",
    "Whitepoint",
    # SLR
    "Pentax", "Voigtlander", "Lensbaby",
    # Medium Format
    "Hasselblad", "Phase One",
    # Specialty
    "Cambo", "Lomography", "PolarPro",
}

CAMERA_BRANDS = {
    # Cine
    "ARRI", "RED", "RED DIGITAL CINEMA", "Sony", "Canon", "Blackmagic",
    "Blackmagic Design", "Panasonic", "DJI", "Z CAM", "Kinefinity",
    "FREEFLY", "Freefly", "Kodak",
    # Mirrorless
    "Nikon", "FUJIFILM", "Fujifilm", "Leica", "Hasselblad", "Sigma",
    "Olympus", "OM SYSTEM", "OM", "Pixii",
    # DSLR
    "Pentax",
    # Point & Shoot
    "Minolta", "Snap",
}

# ─── Search queries ───────────────────────────────────────────────
# Each entry: (sheet_tab_name, search_query, brand_set)
SEARCH_QUERIES = [
    # LIGHTING
    ("Lighting", "LED lights production", LIGHTING_BRANDS),
    ("Lighting", "LED panel light video", LIGHTING_BRANDS),
    ("Lighting", "LED fresnel light", LIGHTING_BRANDS),
    ("Lighting", "LED tube light video", LIGHTING_BRANDS),
    ("Lighting", "HMI light", LIGHTING_BRANDS),
    ("Lighting", "LED monolight", LIGHTING_BRANDS),

    # LENSES
    ("Lenses", "mirrorless camera lens", LENS_BRANDS),
    ("Lenses", "cinema lens", LENS_BRANDS),
    ("Lenses", "cine prime lens", LENS_BRANDS),
    ("Lenses", "cine zoom lens", LENS_BRANDS),
    ("Lenses", "SLR lens", LENS_BRANDS),
    ("Lenses", "medium format lens", LENS_BRANDS),
    ("Lenses", "large format lens", LENS_BRANDS),

    # CAMERAS
    ("Cameras", "mirrorless camera body", CAMERA_BRANDS),
    ("Cameras", "cinema camera", CAMERA_BRANDS),
    ("Cameras", "DSLR camera body", CAMERA_BRANDS),
    ("Cameras", "medium format camera", CAMERA_BRANDS),
    ("Cameras", "point and shoot camera", CAMERA_BRANDS),
]

# ─── Brand matching ──────────────────────────────────────────────

def normalize_brand(brand_str):
    """Normalize brand name for matching."""
    if not brand_str:
        return ""
    return brand_str.strip()

def brand_matches(product_brand, product_name, target_brands):
    """Check if a product belongs to one of our target brands."""
    pb = normalize_brand(product_brand)

    # Direct match
    if pb in target_brands:
        return True

    # Case-insensitive match
    pb_lower = pb.lower()
    for tb in target_brands:
        if tb.lower() == pb_lower:
            return True
        # Partial match: brand appears in the product's brand field
        if tb.lower() in pb_lower or pb_lower in tb.lower():
            return True

    # Check product name for brand
    name_lower = (product_name or "").lower()
    for tb in target_brands:
        if tb.lower() in name_lower:
            return True

    return False

def is_single_product(item):
    """Filter out kits, bundles, and accessory packages."""
    core = item.get("core", {})
    if core.get("isBHKit", False):
        return False
    if core.get("isMfrBundle", False):
        return False
    # Check name for common bundle indicators
    name = core.get("shortDescription", "").lower()
    bundle_words = [" kit ", " bundle ", " package ", " combo ", " set of "]
    for bw in bundle_words:
        if bw in f" {name} ":
            return False
    # "with" + lens pattern for cameras
    if re.search(r'camera\s+with\s+\d', name):
        return False
    return True

# ─── Extraction ───────────────────────────────────────────────────

def extract_product(item):
    """Extract Phase 1 skeleton data from a ListingStore item."""
    core = item.get("core", {})
    price_info = item.get("priceInfo", {})
    key = item.get("itemKey", {})
    img = item.get("mainImage", {}).get("default", {})

    sku = key.get("skuNo", "")
    name = core.get("shortDescription", "")
    brand_series = core.get("brandSeriesModel", "")
    brand = brand_series.split()[0] if brand_series else ""

    # Better brand extraction — use first word(s) before the model
    # e.g. "Canon EOS R6 " → "Canon", "OM SYSTEM OM-1 " → "OM SYSTEM"
    if brand_series:
        # Known multi-word brands
        multi_word = ["OM SYSTEM", "RED DIGITAL", "Blackmagic Design", "Z CAM",
                      "Kino Flo", "Venus Optics", "Phase One", "SLR Magic",
                      "Atlas Lens", "Blazar Lens", "Meyer-Optik", "Quasar Science",
                      "Artra Lab", "IBE OPTICS", "P+S TECHNIK", "Whitepoint Optic"]
        for mw in multi_word:
            if brand_series.lower().startswith(mw.lower()):
                brand = mw
                break

    detail_url = core.get("detailsUrl", "")
    full_url = f"{BH_BASE}{detail_url}" if detail_url else ""
    image_url = img.get("url", "")
    price = price_info.get("price", "")

    return {
        "sku": str(sku),
        "name": name,
        "brand": brand,
        "price": str(price),
        "url": full_url,
        "image": image_url,
    }

# ─── Scraping engine ─────────────────────────────────────────────

def scrape_search(page, query, target_brands, max_pages=200):
    """Scrape all pages of a B&H search query. Returns list of product dicts."""
    products = {}  # keyed by SKU to dedupe

    url = f"{BH_BASE}/c/search?q={query.replace(' ', '+')}"
    print(f"\n{'='*60}")
    print(f"Scraping: {query}")
    print(f"URL: {url}")

    page_num = 1
    while page_num <= max_pages:
        page_url = url if page_num == 1 else f"{url}&pn={page_num}"
        try:
            page.goto(page_url, wait_until="networkidle", timeout=45000)
        except Exception as e:
            print(f"  Page {page_num} load error: {e}")
            break

        # Extract ListingStore
        try:
            raw = page.get_attribute("div.bh-preloaded-data", "data-data")
            if not raw:
                print(f"  Page {page_num}: no preloaded data")
                break
            data = json.loads(html.unescape(raw))
            ls = data.get("ListingStore", {})
            resp = ls.get("response", {}).get("data", {})
            items = resp.get("items", [])
        except Exception as e:
            print(f"  Page {page_num} parse error: {e}")
            break

        if not items:
            break

        total = resp.get("count", "?")
        if page_num == 1:
            print(f"  Total results: {total}")

        new_count = 0
        for item in items:
            product = extract_product(item)
            if not product["sku"] or product["sku"] in products:
                continue
            if not is_single_product(item):
                continue
            if not brand_matches(product["brand"], product["name"], target_brands):
                continue
            products[product["sku"]] = product
            new_count += 1

        print(f"  Page {page_num}: {len(items)} items, {new_count} new matches (total: {len(products)})")

        # Check if we've reached the last page
        total_pages = (int(total) // ITEMS_PER_PAGE) + 1 if isinstance(total, int) else max_pages
        if page_num >= total_pages:
            break
        if len(items) < ITEMS_PER_PAGE:
            break

        page_num += 1
        time.sleep(PAGE_DELAY)

    print(f"  Done: {len(products)} products from '{query}'")
    return products

# ─── Google Sheets writer ─────────────────────────────────────────

def write_to_sheet(gc, sheet_id, tab_name, products):
    """Write products to a Google Sheet tab. Creates or replaces the tab."""
    sh = gc.open_by_key(sheet_id)

    # Delete existing tab if it exists
    try:
        ws = sh.worksheet(tab_name)
        sh.del_worksheet(ws)
        print(f"  Deleted existing '{tab_name}' tab")
    except gspread.WorksheetNotFound:
        pass

    # Create new tab
    ws = sh.add_worksheet(title=tab_name, rows=len(products) + 1, cols=6)

    # Header
    headers = ["Name", "Brand", "Price", "B&H URL", "Image URL", "SKU"]
    ws.update(values=[headers], range_name='A1:F1')

    # Data rows
    if products:
        rows = []
        for p in sorted(products.values(), key=lambda x: (x["brand"], x["name"])):
            rows.append([p["name"], p["brand"], p["price"], p["url"], p["image"], p["sku"]])
        ws.update(values=rows, range_name=f'A2:F{len(rows)+1}')

    print(f"  Wrote {len(products)} products to '{tab_name}'")
    return ws

# ─── Main ─────────────────────────────────────────────────────────

def main():
    print("GearHub Pro — Phase 1: Catalog Discovery")
    print("=" * 60)

    # Auth Google Sheets
    creds = Credentials.from_service_account_file(CREDS_PATH, scopes=SCOPES)
    gc = gspread.authorize(creds)
    print("Google Sheets: authenticated")

    # Accumulate products per category
    categories = {}  # tab_name → {sku: product}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        ctx = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
        )
        page = ctx.new_page()

        for tab_name, query, brands in SEARCH_QUERIES:
            if tab_name not in categories:
                categories[tab_name] = {}

            products = scrape_search(page, query, brands)
            # Merge (dedup by SKU)
            for sku, prod in products.items():
                if sku not in categories[tab_name]:
                    categories[tab_name][sku] = prod

            print(f"\n  Running total for {tab_name}: {len(categories[tab_name])} products")
            time.sleep(PAGE_DELAY)

        browser.close()

    # Write to Google Sheets
    print("\n" + "=" * 60)
    print("Writing to Google Sheets...")
    for tab_name, products in categories.items():
        write_to_sheet(gc, SHEET_ID, tab_name, products)

    # Summary
    print("\n" + "=" * 60)
    print("Phase 1 Complete!")
    for tab_name, products in categories.items():
        print(f"  {tab_name}: {len(products)} products")
    print(f"  Total: {sum(len(v) for v in categories.values())} products")

if __name__ == "__main__":
    main()
