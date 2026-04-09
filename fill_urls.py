"""
GearHub Pro — Batch fill B&H URLs using Google search.
For each product missing a URL, searches Google and finds the B&H product page.
"""

import re, time, random
from googlesearch import search
from supabase import create_client

SUPABASE_URL = "https://lzkdewuwrshiqjjndszx.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6a2Rld3V3cnNoaXFqam5kc3p4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTYxNDk1MywiZXhwIjoyMDkxMTkwOTUzfQ.ZKwzCTeJ66gyYZVifjy-wuxk8unk3BnSeQ4YcHcXRD0"

BH_PRODUCT_RE = re.compile(r'https://www\.bhphotovideo\.com/c/product/(\d+)-REG/')

def find_bh_url(product_name, brand):
    """Search Google for a B&H product page URL."""
    query = f'{brand} {product_name} site:bhphotovideo.com/c/product'
    try:
        for url in search(query, num_results=5, lang="en"):
            m = BH_PRODUCT_RE.search(url)
            if m:
                # Clean URL - remove tracking params
                clean = url.split('?')[0].split('/overview')[0].split('/specs')[0].split('/reviews')[0].split('/accessories')[0]
                return clean, m.group(1)
    except Exception as e:
        print(f'  Search error for {product_name}: {e}')
    return None, None


def main():
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    total_updated = 0
    total_failed = 0

    for table in ['cameras', 'lenses', 'lighting']:
        result = sb.table(table).select('id, name, brand').is_('bhphoto_url', 'null').execute()
        missing = result.data
        print(f'\n=== {table.upper()} — {len(missing)} products need URLs ===')

        for i, row in enumerate(missing):
            url, sku = find_bh_url(row['name'], row['brand'])

            if url and sku:
                img = f'https://static.bhphoto.com/images/images500x500/{sku}.jpg'
                sb.table(table).update({
                    'bhphoto_url': url,
                    'bhphoto_sku': sku,
                    'image_url': img,
                }).eq('id', row['id']).execute()
                total_updated += 1
                print(f'  [{i+1}/{len(missing)}] ✓ {row["name"][:50]}')
            else:
                total_failed += 1
                print(f'  [{i+1}/{len(missing)}] ✗ {row["name"][:50]}')

            # Rate limit — be respectful to Google
            delay = random.uniform(3, 6)
            time.sleep(delay)

    # Final stats
    print(f'\n=== DONE ===')
    print(f'Updated: {total_updated}')
    print(f'Failed: {total_failed}')

    for t in ['cameras', 'lenses', 'lighting']:
        total = sb.table(t).select('id', count='exact').execute()
        has_url = sb.table(t).select('id', count='exact').not_.is_('bhphoto_url', 'null').execute()
        pct = round(has_url.count / total.count * 100)
        print(f'{t:10}: {has_url.count}/{total.count} ({pct}%)')


if __name__ == '__main__':
    main()
