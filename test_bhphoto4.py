"""Test 4: Deep dive into ListingStore item structure and category navigation."""
import json, html
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    ctx = browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        viewport={"width": 1280, "height": 800},
    )
    page = ctx.new_page()

    # Use the search approach since category URLs redirect
    url = "https://www.bhphotovideo.com/c/search?q=mirrorless+cameras&filters=fct_category%3AMirrorless+Cameras"
    print(f"Loading: {url}")
    page.goto(url, wait_until="networkidle", timeout=60000)
    print(f"Final URL: {page.url}")

    # Extract ListingStore
    raw = page.get_attribute("div.bh-preloaded-data", "data-data")
    data = json.loads(html.unescape(raw))
    ls = data.get("ListingStore", {})
    resp = ls.get("response", {}).get("data", {})
    items = resp.get("items", [])

    print(f"Items: {len(items)}")
    print(f"\nResponse data keys: {list(resp.keys())}")

    # Deep dive first item
    if items:
        item = items[0]
        print(f"\n=== FULL FIRST ITEM STRUCTURE ===")
        print(json.dumps(item, indent=2, default=str)[:3000])

        # Show all items summary
        print(f"\n=== ALL {len(items)} ITEMS SUMMARY ===")
        for it in items:
            core = it.get("core", {})
            price_info = it.get("priceInfo", {})
            img_info = it.get("imageInfo", {})
            links = it.get("links", {})
            key = it.get("itemKey", {})

            name = core.get("name", "?")
            brand = core.get("brandName", core.get("brand", "?"))
            price = price_info.get("price", "?")
            sku = key.get("skuNo", "?")

            # Find image
            images = img_info.get("images", [])
            thumb = images[0].get("url", "") if images else ""

            # Find product URL
            pdp_url = links.get("pdp", links.get("url", ""))

            print(f"  [{sku}] {brand} | {name} | ${price} | {pdp_url[:60] if pdp_url else 'no-url'}")

    # Check responseQuery for pagination info
    rq = ls.get("responseQuery", {})
    print(f"\nresponseQuery: {json.dumps(rq, indent=2)[:500]}")

    # Check if there's a total count somewhere
    print(f"\nLooking for total/count in response data:")
    for k, v in resp.items():
        if k != "items":
            if isinstance(v, (str, int, float, bool)):
                print(f"  {k}: {v}")
            elif isinstance(v, dict):
                print(f"  {k}: {json.dumps(v, default=str)[:200]}")
            elif isinstance(v, list):
                print(f"  {k}: list[{len(v)}]")

    browser.close()
    print("\nTest 4 complete")
