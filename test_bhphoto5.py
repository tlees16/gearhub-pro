"""Test 5: Full extraction from ListingStore — products + pagination."""
import json, html
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    ctx = browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        viewport={"width": 1280, "height": 800},
    )
    page = ctx.new_page()

    url = "https://www.bhphotovideo.com/c/search?q=mirrorless+cameras&filters=fct_category%3AMirrorless+Cameras"
    page.goto(url, wait_until="networkidle", timeout=60000)

    raw = page.get_attribute("div.bh-preloaded-data", "data-data")
    data = json.loads(html.unescape(raw))
    ls = data["ListingStore"]
    resp = ls["response"]["data"]

    # Pagination info
    print(f"Page: {resp.get('pageNumber', '?')}")
    print(f"Count: {resp.get('count', '?')}")
    print(f"Items per page: {resp.get('itemsPerPage', '?')}")

    items = resp.get("items", [])
    print(f"Items on this page: {len(items)}")

    # Extract from all items
    print(f"\n{'SKU':<10} {'Bundle':<8} {'Brand':<12} {'Price':<8} {'Name'}")
    print("-" * 100)
    for it in items:
        core = it.get("core", {})
        price_info = it.get("priceInfo", {})
        key = it.get("itemKey", {})

        sku = key.get("skuNo", "?")
        name = core.get("shortDescription", "?")
        brand = core.get("brandSeriesModel", "?").split()[0] if core.get("brandSeriesModel") else "?"
        price = price_info.get("price", "?")
        is_kit = core.get("isBHKit", False)
        is_bundle = core.get("isMfrBundle", False)
        kit_label = "KIT" if is_kit else ("BDL" if is_bundle else "---")
        url_path = core.get("detailsUrl", "")
        img = it.get("mainImage", {}).get("default", {}).get("url", "")

        print(f"{sku:<10} {kit_label:<8} {brand:<12} ${str(price):<7} {name[:60]}")

    # Check available filters on this page
    filters = resp.get("filters", [])
    print(f"\n=== AVAILABLE FILTERS: {len(filters)} ===")
    for f in filters:
        name = f.get("filterDisplayName", f.get("name", "?"))
        options = f.get("options", [])
        print(f"  {name}: {len(options)} options")
        # Show first few
        for opt in options[:3]:
            print(f"    - {opt.get('displayText', opt.get('text', '?'))} ({opt.get('count', '?')})")

    # Check sort options
    sort_opts = resp.get("sortOptionList", [])
    print(f"\n=== SORT OPTIONS ===")
    for s in sort_opts:
        print(f"  {s.get('displayText', '?')}: {s.get('value', '?')}")

    browser.close()
    print("\nTest 5 complete")
