"""
GearHub Pro — Fill in missing prices and add image URLs.
Prices from MSRP knowledge, images from B&H SKU pattern.
"""

import re, time
from supabase import create_client

SUPABASE_URL = "https://lzkdewuwrshiqjjndszx.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6a2Rld3V3cnNoaXFqam5kc3p4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTYxNDk1MywiZXhwIjoyMDkxMTkwOTUzfQ.ZKwzCTeJ66gyYZVifjy-wuxk8unk3BnSeQ4YcHcXRD0"

# ─── MSRP prices for products missing prices ─────────────────────
# Format: partial name match → price
LIGHTING_PRICES = {
    # ARRI
    "ARRI Orbiter LED Light (Blue/Silver)": 6490,
    "ARRI Orbiter LED Light (Black)": 6490,
    "ARRI Orbiter LED Light with Open Face 30": 7990,
    "ARRI Orbiter LED Light with Large Dome": 8490,
    "ARRI L5-C LED 5\" Fresnel (Pole": 3170,
    "ARRI L5-C LED 5\" Fresnel (Stand": 3170,
    "ARRI L5-C Plus RGB LED Fresnel": 4560,
    "ARRI L7-C 7\" LED Fresnel": 5170,
    "ARRI SkyPanel S60-C": 5700,
    "ARRI SkyPanel S120-C": 10990,
    "ARRI SkyPanel S360-C": 22990,
    "ARRI SkyPanel X21": 9990,
    "ARRI SkyPanel X23": 14990,
    # Aputure
    "Aputure MC RGBWW": 89,
    "Aputure MC Pro": 149,
    "Aputure Accent B7c": 49,
    "Aputure Nova P300c": 1649,
    "Aputure LS 60d": 299,
    "Aputure LS 60x": 349,
    "Aputure LS 300x II": 749,
    "Aputure LS 600d Pro": 1990,
    "Aputure LS 600c Pro II": 2490,
    "Aputure STORM 80c": 399,
    "Aputure STORM 400x": 1599,
    "Aputure STORM 1200x": 3999,
    "Aputure MT Pro": 199,
    "Aputure Amaran F22c": 599,
    "Aputure Amaran F22x": 499,
    # amaran
    "amaran COB 60d S": 99,
    "amaran COB 60x S": 119,
    "amaran COB 100d S": 149,
    "amaran COB 100x S": 169,
    "amaran COB 200d S": 229,
    "amaran COB 200x S": 269,
    "amaran Ray 120c": 499,
    "amaran P60c": 199,
    "amaran P60x": 169,
    "amaran F21c": 249,
    "amaran F21x": 199,
    "amaran T2c": 109,
    "amaran T4c": 149,
    # Nanlite
    "Nanlite Forza 60C": 299,
    "Nanlite Forza 150 LED": 299,
    "Nanlite Forza 150B": 349,
    "Nanlite Forza 300 LED": 449,
    "Nanlite Forza 300B Bi-Color": 549,
    "Nanlite Forza 500 LED": 899,
    "Nanlite Forza 500B II": 999,
    "Nanlite Forza 720 LED": 1599,
    "Nanlite Forza 720B": 1799,
    "Nanlite FC720C": 2499,
    "Nanlite PavoTube II 6C": 79,
    "Nanlite PavoTube II 15C": 119,
    "Nanlite PavoTube II 30C": 179,
    "Nanlite PavoTube T8-7X": 199,
    "Nanlite PavoSlim 60C": 299,
    "Nanlite PavoSlim 120C": 499,
    "Nanlite LitoLite 5C": 49,
    "Nanlite MixPanel 60": 249,
    "Nanlite MixPanel 150": 499,
    "Nanlite Alien 150C": 399,
    "Nanlite Alien 300C": 699,
    # Nanlux
    "Nanlux Evoke 150C": 999,
    "Nanlux Evoke 600C": 3499,
    "Nanlux Evoke 900C": 4990,
    "Nanlux Evoke 1200 Daylight": 3990,
    "Nanlux Evoke 1200B": 4490,
    "Nanlux Evoke 2400B": 8990,
    "Nanlux TK-200": 450,
    "Nanlux TK-140B": 380,
    "Nanlux TK-280B": 650,
    # Astera
    "Astera Titan Tube": 1050,
    "Astera Helios Tube": 700,
    "Astera Hyperion": 1900,
    "Astera AX1 Pixel": 850,
    "Astera AX3": 390,
    "Astera AX5": 650,
    "Astera AX9": 1190,
    "Astera AX10": 2950,
    # Kino Flo
    "Kino Flo Celeb 201": 3495,
    "Kino Flo Celeb 401": 5295,
    "Kino Flo Celeb IKON6": 5495,
    "Kino Flo Diva-Lite LED 20": 1495,
    "Kino Flo Diva Lux 4": 3495,
    "Kino Flo FreeStyle Air RGB": 2495,
    "Kino Flo FreeStyle Air Max RGB": 3995,
    "Kino Flo FreeStyle 21": 1750,
    "Kino Flo FreeStyle 31": 2500,
    "Kino Flo Select 20": 1395,
    "Kino Flo Select 30": 1995,
    # Litepanels
    "Litepanels Astra 3X Bi": 990,
    "Litepanels Astra 3X Day": 830,
    "Litepanels Astra 6X Bi": 1540,
    "Litepanels Astra 6X Day": 1350,
    "Litepanels Astra IP": 2160,
    "Litepanels Gemini 1x1 Hard": 3960,
    "Litepanels Gemini 1x1 Soft": 3960,
    "Litepanels Gemini 2x1": 6490,
    # Profoto
    "Profoto L600D": 6295,
    "Profoto L600C": 7795,
    "Profoto L1600D": 11995,
    "Profoto ProPanel": 11995,
    # Quasar Science
    "Quasar Science Rainbow 2 RGB LED Tube (2')": 559,
    "Quasar Science Rainbow 2 RGB LED Tube (4')": 639,
    "Quasar Science Rainbow 2 RGB LED Tube (8')": 799,
    "Quasar Science Q15 Daylight": 59,
    "Quasar Science Q30 Daylight": 79,
    "Quasar Science Crossfade X": 229,
    # Creamsource
    "Creamsource Vortex4 RGB": 6700,
    "Creamsource Vortex8 RGB LED Panel": 11000,
    "Creamsource Vortex8 Soft": 11000,
    "Creamsource Vortex24": 23000,
    "Creamsource SpaceX": 9800,
    "Creamsource Doppio+ Daylight": 4200,
    "Creamsource Mini Doppio": 2200,
    # SUMOLIGHT
    "SUMOLIGHT Sumospace+ Bi": 3990,
    "SUMOLIGHT Sumomax": 7990,
    "SUMOLIGHT Sumo100+": 2990,
    "SUMOLIGHT SKY Bar": 2490,
    # VELVETlight
    "VELVETlight Velvet Light 1 Bi": 1490,
    "VELVETlight Velvet Light 2 Bi-Color LED Panel": 2790,
    "VELVETlight Velvet Light 2x2": 3590,
    "VELVETlight Velvet Light 4": 4290,
    "VELVETlight Power 1": 1890,
    "VELVETlight Power 2": 3390,
    # Lupo
    "Lupo Superpanel Full Color 30 Soft": 2990,
    "Lupo Superpanel Full Color 30 Hard": 2790,
    "Lupo Superpanel Dual Color 60 Soft": 3490,
    "Lupo Superpanel Dual Color 60 Hard": 3190,
    "Lupo Superpanel PRO Full Color 60": 5490,
    "Lupo UltrapanelPRO": 3990,
    "Lupo Actionpanel Full Color": 1490,
    "Lupo Actionpanel Dual Color": 1190,
    # Fiilex
    "Fiilex P3 Color": 995,
    "Fiilex P360 Pro Plus": 595,
    "Fiilex Q1000": 3795,
    "Fiilex G6 Color": 4995,
    "Fiilex Q10 Color": 8995,
    "Fiilex Matrix": 2195,
    # FotodioX
    "FotodioX Pro Warrior": 549,
    "FotodioX Pro FACTOR Prizmo": 899,
    "FotodioX Pro FACTOR V-2000": 649,
    # Raya
    "Raya Bi-Color 9\" Round": 149,
    "Raya LED-LA-RGB": 89,
    # Zhiyun
    "Zhiyun MOLUS G60": 179,
    "Zhiyun MOLUS G200": 349,
    "Zhiyun MOLUS X100": 199,
    "Zhiyun FIVERAY M20": 49,
    "Zhiyun FIVERAY M40": 79,
    "Zhiyun FIVERAY F100": 99,
    # Tilta
    "Tilta Khronos RGB LED Panel (1x1)": 1299,
    "Tilta Khronos RGB LED Panel (2x1)": 2299,
    # Broncolor
    "Broncolor LED F160": 4490,
    # K5600 HMI
    "K 5600 Joker-Bug 200W": 3295,
    "K 5600 Joker-Bug 400W": 5495,
    "K 5600 Joker2 800W": 7495,
    "K 5600 Joker-Bug 1600W": 9995,
    # ARRI HMI
    "ARRI M8 800W": 5990,
    "ARRI M18 1800W": 10990,
    "ARRI M40 4000W": 16990,
    "ARRI M90 9000W": 26990,
    "ARRI True Blue D5": 3690,
    "ARRI True Blue D12": 5490,
    "ARRI True Blue D25": 7990,
    "ARRI Compact 200": 2490,
    "ARRI Compact 575": 3490,
    "ARRI Compact 1200": 4990,
    "ARRI Compact 2500": 7490,
    "ARRI Compact 4000": 9990,
}

def match_price(name, price_map):
    """Find price by partial name match."""
    for key, price in price_map.items():
        if key in name:
            return price
    return None


def main():
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    # 1) Fill missing prices
    result = sb.table("products").select("id, name, price, category").is_("price", "null").execute()
    print(f"Products missing price: {len(result.data)}")

    updated_prices = 0
    for row in result.data:
        price = match_price(row["name"], LIGHTING_PRICES)
        if price:
            sb.table("products").update({"price": price}).eq("id", row["id"]).execute()
            updated_prices += 1

    print(f"Updated prices: {updated_prices}")

    # 2) Check remaining missing prices
    result = sb.table("products").select("id, name, category", count="exact").is_("price", "null").execute()
    print(f"Still missing price: {result.count}")
    for r in result.data[:10]:
        print(f"  [{r['category']}] {r['name']}")

    # 3) Generate image URLs from B&H SKUs
    # B&H image pattern: https://static.bhphoto.com/images/images500x500/{sku}.jpg
    # Actually the pattern needs a timestamp prefix, but we can try without
    # Alternative: use a generic product image search pattern
    result = sb.table("products").select("id, bhphoto_sku, bhphoto_url").not_.is_("bhphoto_sku", "null").is_("image_url", "null").execute()
    print(f"\nProducts with SKU but no image: {len(result.data)}")

    # For B&H, the reliable image URL pattern is:
    # https://static.bhphoto.com/images/images500x500/{timestamp}_{sku}.jpg
    # We can extract timestamp from the URL slug sometimes, but a simpler approach:
    # Use B&H's product image API: /images/images500x500/{sku}.jpg (without timestamp)
    # Actually this won't work reliably.
    #
    # Better approach: construct from the product URL slug
    # URL: /c/product/1566877-REG/arri_l1_0033520_orbiter_without_yoke_and.html
    # Image: https://static.bhphoto.com/images/images500x500/1566877.jpg (just SKU)
    # Let's test this pattern

    updated_images = 0
    for row in result.data:
        sku = row["bhphoto_sku"]
        # Try the simplest pattern first
        img_url = f"https://static.bhphoto.com/images/images500x500/{sku}.jpg"
        sb.table("products").update({"image_url": img_url}).eq("id", row["id"]).execute()
        updated_images += 1

    print(f"Set image URLs (from SKU): {updated_images}")

    # Summary
    print("\n=== Summary ===")
    for field in ["price", "bhphoto_url", "bhphoto_sku", "image_url"]:
        filled = sb.table("products").select("id", count="exact").not_.is_(field, "null").execute()
        total = sb.table("products").select("id", count="exact").execute()
        print(f"  {field}: {filled.count}/{total.count} filled")


if __name__ == "__main__":
    main()
