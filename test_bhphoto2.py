"""Test 2: Try multiple extraction strategies on a B&H product page."""
import json, html
from playwright.sync_api import sync_playwright

TEST_URL = "https://www.bhphotovideo.com/c/product/1819718-REG/sony_ilce_9m3_a9_iii_mirrorless_camera.html"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    ctx = browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        viewport={"width": 1280, "height": 800},
    )
    page = ctx.new_page()

    print("Loading page (waiting for networkidle)...")
    page.goto(TEST_URL, wait_until="networkidle", timeout=60000)
    print(f"Final URL: {page.url}")
    print(f"Title: {page.title()}")

    # Strategy 1: All bh-preloaded-data divs
    divs = page.query_selector_all("div.bh-preloaded-data")
    print(f"\n--- Strategy 1: bh-preloaded-data divs: {len(divs)} ---")
    for i, div in enumerate(divs):
        raw = div.get_attribute("data-data")
        if raw:
            data = json.loads(html.unescape(raw))
            ps = data.get("ProductStore", {})
            print(f"  div[{i}]: top keys={list(data.keys())[:5]}... ProductStore keys={list(ps.keys())[:5]}")
            if ps.get("preloadedProducts"):
                print(f"    ** HAS preloadedProducts: {list(ps['preloadedProducts'].keys())}")

    # Strategy 2: JSON-LD
    ld_scripts = page.query_selector_all('script[type="application/ld+json"]')
    print(f"\n--- Strategy 2: JSON-LD scripts: {len(ld_scripts)} ---")
    for i, s in enumerate(ld_scripts):
        content = s.inner_text()
        data = json.loads(content)
        t = data.get("@type", "unknown")
        print(f"  script[{i}]: @type={t}")
        if t == "Product":
            print(f"    name: {data.get('name', 'N/A')}")
            print(f"    price: {data.get('offers', {}).get('price', 'N/A')}")
            print(f"    sku: {data.get('sku', 'N/A')}")

    # Strategy 3: Extract from window JS state
    print("\n--- Strategy 3: JS window state ---")
    js_data = page.evaluate("""() => {
        // Check for common React/app state patterns
        const result = {};
        if (window.__INITIAL_STATE__) result.__INITIAL_STATE__ = Object.keys(window.__INITIAL_STATE__);
        if (window.__APP_STATE__) result.__APP_STATE__ = Object.keys(window.__APP_STATE__);
        if (window.BH) result.BH = Object.keys(window.BH);

        // Check the bh-preloaded-data after React has hydrated
        const el = document.querySelector('.bh-preloaded-data');
        if (el && el.__reactFiber$) result.hasReactFiber = true;

        // Try to get product data from React component tree
        const productTitle = document.querySelector('[data-selenium="productTitle"]');
        if (productTitle) result.productTitle = productTitle.textContent;

        const price = document.querySelector('[data-selenium="pricingPrice"]');
        if (price) result.price = price.textContent;

        // Check for specs section
        const specGroups = document.querySelectorAll('[data-selenium="specsItemGroupName"]');
        result.specGroupCount = specGroups.length;
        if (specGroups.length > 0) {
            result.specGroupNames = Array.from(specGroups).map(el => el.textContent);
        }

        // Check spec rows
        const specRows = document.querySelectorAll('[data-selenium="specsItemGroupTableRow"]');
        result.specRowCount = specRows.length;

        return result;
    }""")
    print(f"  JS state: {json.dumps(js_data, indent=2)}")

    # Strategy 4: Try the B&H internal API directly with browser cookies
    print("\n--- Strategy 4: Internal API test ---")
    api_resp = page.evaluate("""async () => {
        try {
            const resp = await fetch('/api/product/1819718');
            if (resp.ok) return { status: resp.status, data: await resp.json() };
            return { status: resp.status, statusText: resp.statusText };
        } catch(e) {
            return { error: e.message };
        }
    }""")
    print(f"  /api/product/1819718: {json.dumps(api_resp, indent=2)[:500]}")

    browser.close()
    print("\nTest 2 complete")
