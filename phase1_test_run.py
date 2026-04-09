"""Quick test: scrape one query, write to a test tab."""
import json, html, time, re
import gspread
from google.oauth2.service_account import Credentials
from playwright.sync_api import sync_playwright

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
CREDS_PATH = '/Users/t/gearhub/credentials.json'
SHEET_ID = '1bWQXQGUwzr3N9AWI5RhP2hhW63O9wIxT6kssXdB8mCI'
BH_BASE = 'https://www.bhphotovideo.com'

TEST_BRANDS = {"Sony", "Canon", "Nikon", "FUJIFILM", "Fujifilm", "Panasonic", "Leica", "Hasselblad", "OM SYSTEM", "OM"}

def extract_product(item):
    core = item.get("core", {})
    price_info = item.get("priceInfo", {})
    key = item.get("itemKey", {})
    img = item.get("mainImage", {}).get("default", {})

    sku = str(key.get("skuNo", ""))
    name = core.get("shortDescription", "")
    brand_series = core.get("brandSeriesModel", "")
    brand = brand_series.split()[0] if brand_series else ""

    multi_word = ["OM SYSTEM", "Blackmagic Design", "Z CAM", "Kino Flo", "RED DIGITAL"]
    for mw in multi_word:
        if brand_series and brand_series.lower().startswith(mw.lower()):
            brand = mw
            break

    detail_url = core.get("detailsUrl", "")
    full_url = f"{BH_BASE}{detail_url}" if detail_url else ""
    image_url = img.get("url", "")
    price = str(price_info.get("price", ""))

    return {"sku": sku, "name": name, "brand": brand, "price": price, "url": full_url, "image": image_url}

def is_single_product(item):
    core = item.get("core", {})
    if core.get("isBHKit", False) or core.get("isMfrBundle", False):
        return False
    name = core.get("shortDescription", "").lower()
    if any(w in f" {name} " for w in [" kit ", " bundle ", " package ", " combo "]):
        return False
    if re.search(r'camera\s+with\s+\d', name):
        return False
    return True

def brand_matches(brand, name, targets):
    if not brand:
        return False
    bl = brand.lower()
    for t in targets:
        if t.lower() == bl or t.lower() in bl or bl in t.lower():
            return True
    nl = (name or "").lower()
    for t in targets:
        if t.lower() in nl:
            return True
    return False

print("Phase 1 Test Run — mirrorless camera body (page 1 only)")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    ctx = browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        viewport={"width": 1280, "height": 800},
    )
    page = ctx.new_page()

    url = f"{BH_BASE}/c/search?q=mirrorless+camera+body"
    page.goto(url, wait_until="networkidle", timeout=60000)

    raw = page.get_attribute("div.bh-preloaded-data", "data-data")
    data = json.loads(html.unescape(raw))
    resp = data["ListingStore"]["response"]["data"]
    items = resp.get("items", [])

    print(f"Total B&H results: {resp.get('count', '?')}")
    print(f"Items on page 1: {len(items)}")

    products = {}
    for item in items:
        prod = extract_product(item)
        if not prod["sku"]:
            continue
        single = is_single_product(item)
        matches = brand_matches(prod["brand"], prod["name"], TEST_BRANDS)
        status = "OK" if (single and matches) else f"{'SKIP-kit' if not single else ''} {'SKIP-brand' if not matches else ''}".strip()
        if single and matches:
            products[prod["sku"]] = prod
        print(f"  [{status:12}] {prod['brand']:<15} {prod['name'][:55]}")

    browser.close()

print(f"\nKept: {len(products)} products")

# Write to test tab
creds = Credentials.from_service_account_file(CREDS_PATH, scopes=SCOPES)
gc = gspread.authorize(creds)
sh = gc.open_by_key(SHEET_ID)

try:
    ws = sh.worksheet("_test")
    sh.del_worksheet(ws)
except:
    pass

ws = sh.add_worksheet(title="_test", rows=len(products)+1, cols=6)
headers = ["Name", "Brand", "Price", "B&H URL", "Image URL", "SKU"]
ws.update('A1:F1', [headers])

rows = []
for p in sorted(products.values(), key=lambda x: (x["brand"], x["name"])):
    rows.append([p["name"], p["brand"], p["price"], p["url"], p["image"], p["sku"]])
if rows:
    ws.update(f'A2:F{len(rows)+1}', rows)

print(f"Wrote {len(rows)} products to '_test' tab in Google Sheets")
print("Check: https://docs.google.com/spreadsheets/d/1bWQXQGUwzr3N9AWI5RhP2hhW63O9wIxT6kssXdB8mCI")
