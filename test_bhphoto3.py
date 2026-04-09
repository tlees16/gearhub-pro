"""Test 3: Category page listing extraction + product spec DOM scraping."""
import json, html
from playwright.sync_api import sync_playwright

# B&H category for mirrorless cameras
CATEGORY_URL = "https://www.bhphotovideo.com/c/buy/Mirrorless-Cameras/ci/24888/N/4288586058"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    ctx = browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        viewport={"width": 1280, "height": 800},
    )
    page = ctx.new_page()

    # ====== TEST A: Category listing page ======
    print("=== TEST A: Category page ===")
    page.goto(CATEGORY_URL, wait_until="networkidle", timeout=60000)
    print(f"URL: {page.url}")
    print(f"Title: {page.title()}")

    # Check bh-preloaded-data for ListingStore
    divs = page.query_selector_all("div.bh-preloaded-data")
    print(f"bh-preloaded-data divs: {len(divs)}")
    for i, div in enumerate(divs):
        raw = div.get_attribute("data-data")
        if raw:
            data = json.loads(html.unescape(raw))
            keys = list(data.keys())
            print(f"  div[{i}] keys: {keys[:10]}")
            if "ListingStore" in data:
                ls = data["ListingStore"]
                print(f"  ListingStore keys: {list(ls.keys())[:10]}")
                resp = ls.get("response", {})
                if resp:
                    print(f"  response keys: {list(resp.keys())[:10]}")
                    d = resp.get("data", {})
                    if d:
                        items = d.get("items", [])
                        print(f"  Items: {len(items)}")
                        total = d.get("totalItems", "?")
                        print(f"  Total items: {total}")
                        if items:
                            item = items[0]
                            print(f"  First item keys: {list(item.keys())[:15]}")
                            print(f"    name: {item.get('name', 'N/A')}")
                            print(f"    price: {item.get('price', item.get('priceInfo', {}).get('price', 'N/A'))}")
                            # Try to find URL
                            for k in ['url', 'productUrl', 'pdpUrl', 'link', 'href']:
                                if k in item:
                                    print(f"    {k}: {item[k]}")

    # Also try DOM scraping approach for listings
    print("\n--- DOM listing items ---")
    listing_data = page.evaluate("""() => {
        const items = document.querySelectorAll('[data-selenium="miniProductPage"]');
        const results = [];
        for (const item of Array.from(items).slice(0, 5)) {
            const name = item.querySelector('[data-selenium="miniProductPageProductNameLink"]');
            const price = item.querySelector('[data-selenium="miniProductPagePricingPrice"]');
            const img = item.querySelector('[data-selenium="miniProductPageImg"]');
            const link = item.querySelector('[data-selenium="miniProductPageProductNameLink"]');
            results.push({
                name: name ? name.textContent.trim() : null,
                price: price ? price.textContent.trim() : null,
                img: img ? img.src : null,
                url: link ? link.href : null,
            });
        }
        return { total: items.length, items: results };
    }""")
    print(f"  DOM items found: {listing_data['total']}")
    for item in listing_data['items'][:3]:
        print(f"    {item['name']}: {item['price']} -> {item['url']}")

    # Check pagination
    print("\n--- Pagination ---")
    paging = page.evaluate("""() => {
        const links = document.querySelectorAll('[data-selenium="listingPagingLink"]');
        return Array.from(links).map(l => ({ text: l.textContent.trim(), href: l.href }));
    }""")
    print(f"  Paging links: {len(paging)}")
    for pl in paging[:5]:
        print(f"    {pl['text']}: {pl['href']}")

    # Check total items from pagination text
    total_text = page.evaluate("""() => {
        const el = document.querySelector('[data-selenium="listingPagingShowingText"]');
        return el ? el.textContent.trim() : null;
    }""")
    print(f"  Paging text: {total_text}")

    browser.close()
    print("\nTest 3 complete")
