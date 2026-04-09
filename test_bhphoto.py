"""Quick test: Can Playwright bypass Cloudflare and extract bh-preloaded-data?"""
import json
from playwright.sync_api import sync_playwright

TEST_URL = "https://www.bhphotovideo.com/c/product/1819718-REG/sony_ilce_9m3_a9_iii_mirrorless_camera.html"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    ctx = browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        viewport={"width": 1280, "height": 800},
    )
    page = ctx.new_page()

    print("Loading page...")
    page.goto(TEST_URL, wait_until="domcontentloaded", timeout=30000)

    # Wait for Cloudflare challenge to resolve
    page.wait_for_selector("div.bh-preloaded-data", state="attached", timeout=30000)

    raw = page.get_attribute("div.bh-preloaded-data", "data-data")
    if not raw:
        print("ERROR: bh-preloaded-data div found but data-data attribute is empty")
        browser.close()
        exit(1)

    import html
    data = json.loads(html.unescape(raw))

    # Explore the top-level keys
    print(f"\nTop-level keys: {list(data.keys())}")
    for k, v in data.items():
        if isinstance(v, dict):
            print(f"  {k}: dict with keys {list(v.keys())[:10]}")
        elif isinstance(v, list):
            print(f"  {k}: list of {len(v)}")
        else:
            print(f"  {k}: {type(v).__name__} = {str(v)[:100]}")

    # Look for product data
    for store_name in ["ProductStore", "productStore"]:
        if store_name in data:
            ps = data[store_name]
            print(f"\n{store_name} keys: {list(ps.keys())[:20]}")

    # Check if data has a different nesting
    # Try to find anything with "specifications" or "specs"
    def find_specs(obj, path=""):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if "spec" in k.lower() or "product" in k.lower():
                    if isinstance(v, dict):
                        print(f"  Found '{k}' at {path}.{k} -> dict keys: {list(v.keys())[:10]}")
                    elif isinstance(v, list):
                        print(f"  Found '{k}' at {path}.{k} -> list of {len(v)}")
                    else:
                        print(f"  Found '{k}' at {path}.{k} -> {str(v)[:100]}")
                if isinstance(v, (dict, list)) and len(path) < 60:
                    find_specs(v, f"{path}.{k}")
        elif isinstance(obj, list):
            for i, item in enumerate(obj[:3]):
                if isinstance(item, (dict, list)):
                    find_specs(item, f"{path}[{i}]")

    print("\nSearching for product/spec data:")
    find_specs(data)

    browser.close()
    print("\n✓ Test complete")
