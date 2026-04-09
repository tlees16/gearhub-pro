"""
GearHub Pro — Expand catalog with missing brands.
Adds products for brands not yet in the database.
"""
import time
from supabase import create_client

SUPABASE_URL = "https://lzkdewuwrshiqjjndszx.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6a2Rld3V3cnNoaXFqam5kc3p4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTYxNDk1MywiZXhwIjoyMDkxMTkwOTUzfQ.ZKwzCTeJ66gyYZVifjy-wuxk8unk3BnSeQ4YcHcXRD0"

# Each tuple: (name, brand, category, subcategory, price)
NEW_PRODUCTS = [
    # ═══════════════════════════════════════════════════════════════
    # MISSING LIGHTING BRANDS
    # ═══════════════════════════════════════════════════════════════

    # Litegear
    ("Litegear LiteMat Plus 1", "Litegear", "Lighting", "LED", 795),
    ("Litegear LiteMat Plus 2L", "Litegear", "Lighting", "LED", 1295),
    ("Litegear LiteMat Plus 4", "Litegear", "Lighting", "LED", 1995),
    ("Litegear LiteMat Spectrum 2L", "Litegear", "Lighting", "LED", 1995),
    ("Litegear LiteMat Spectrum 4", "Litegear", "Lighting", "LED", 2995),
    ("Litegear LiteTile Plus 2x4", "Litegear", "Lighting", "LED", 3995),

    # CHROMA-Q
    ("CHROMA-Q Space Force onebytwo LED Panel", "CHROMA-Q", "Lighting", "LED", 5990),
    ("CHROMA-Q Space Force twobyfour LED Panel", "CHROMA-Q", "Lighting", "LED", 11990),
    ("CHROMA-Q Studio Force D Daylight LED", "CHROMA-Q", "Lighting", "LED", 3490),

    # Cineo Lighting
    ("Cineo HS2 RP Full-Color LED Panel", "Cineo", "Lighting", "LED", 5995),
    ("Cineo Quantum C80 RGBW LED Panel", "Cineo", "Lighting", "LED", 3995),
    ("Cineo Matchstix 12\" LED Tube", "Cineo", "Lighting", "LED", 399),

    # BB&S Lighting
    ("BB&S Pipeline Reflect 2' RGBWW LED", "BB&S", "Lighting", "LED", 1690),
    ("BB&S Pipeline Reflect 4' RGBWW LED", "BB&S", "Lighting", "LED", 2390),
    ("BB&S Area 48 LED Soft Light", "BB&S", "Lighting", "LED", 2990),

    # Aladdin
    ("Aladdin BI-FLEX4 Bi-Color LED Panel", "Aladdin", "Lighting", "LED", 2990),
    ("Aladdin BI-FLEX2 Bi-Color LED Panel", "Aladdin", "Lighting", "LED", 1990),
    ("Aladdin ALL-IN 1 Bi-Color LED Panel", "Aladdin", "Lighting", "LED", 799),

    # ProLights (ETC)
    ("ProLights EclPanel TWC LED Panel", "ProLights", "Lighting", "LED", 2490),
    ("ProLights StudioLED 340 RGBW", "ProLights", "Lighting", "LED", 1890),

    # ═══════════════════════════════════════════════════════════════
    # MISSING LENS BRANDS
    # ═══════════════════════════════════════════════════════════════

    # FUJIFILM XF lenses
    ("FUJIFILM XF 16-55mm f/2.8 R LM WR", "FUJIFILM", "Lenses", "Mirrorless", 1199),
    ("FUJIFILM XF 50-140mm f/2.8 R LM OIS WR", "FUJIFILM", "Lenses", "Mirrorless", 1599),
    ("FUJIFILM XF 56mm f/1.2 R WR", "FUJIFILM", "Lenses", "Mirrorless", 999),
    ("FUJIFILM XF 23mm f/1.4 R LM WR", "FUJIFILM", "Lenses", "Mirrorless", 899),
    ("FUJIFILM XF 90mm f/2 R LM WR", "FUJIFILM", "Lenses", "Mirrorless", 949),
    ("FUJIFILM XF 8-16mm f/2.8 R LM WR", "FUJIFILM", "Lenses", "Mirrorless", 1999),
    ("FUJIFILM XF 200mm f/2 R LM OIS WR", "FUJIFILM", "Lenses", "Mirrorless", 5999),
    ("FUJIFILM GF 80mm f/1.7 R WR", "FUJIFILM", "Lenses", "Medium Format", 2299),
    ("FUJIFILM GF 110mm f/2 R LM WR", "FUJIFILM", "Lenses", "Medium Format", 2599),
    ("FUJIFILM GF 32-64mm f/4 R LM WR", "FUJIFILM", "Lenses", "Medium Format", 2299),
    ("FUJIFILM GF 45-100mm f/4 R LM OIS WR", "FUJIFILM", "Lenses", "Medium Format", 2599),
    ("FUJIFILM GF 500mm f/5.6 R LM OIS WR", "FUJIFILM", "Lenses", "Medium Format", 3499),

    # Panasonic Lumix S lenses
    ("Panasonic LUMIX S 24-70mm f/2.8", "Panasonic", "Lenses", "Mirrorless", 2199),
    ("Panasonic LUMIX S 70-200mm f/2.8 OIS", "Panasonic", "Lenses", "Mirrorless", 2597),
    ("Panasonic LUMIX S 50mm f/1.4", "Panasonic", "Lenses", "Mirrorless", 2297),
    ("Panasonic LUMIX S 85mm f/1.8", "Panasonic", "Lenses", "Mirrorless", 597),
    ("Panasonic LUMIX S 35mm f/1.8", "Panasonic", "Lenses", "Mirrorless", 597),

    # Leica
    ("Leica Summilux-M 35mm f/1.4 ASPH", "Leica", "Lenses", "Mirrorless", 5795),
    ("Leica Summilux-M 50mm f/1.4 ASPH", "Leica", "Lenses", "Mirrorless", 4695),
    ("Leica Noctilux-M 50mm f/0.95 ASPH", "Leica", "Lenses", "Mirrorless", 13295),
    ("Leica APO-Summicron-SL 35mm f/2 ASPH", "Leica", "Lenses", "Mirrorless", 4595),
    ("Leica Vario-Elmarit-SL 24-70mm f/2.8 ASPH", "Leica", "Lenses", "Mirrorless", 6295),

    # Samyang / Rokinon
    ("Samyang AF 24mm f/1.8 FE", "Samyang", "Lenses", "Mirrorless", 349),
    ("Samyang AF 35mm f/1.4 FE II", "Samyang", "Lenses", "Mirrorless", 599),
    ("Samyang AF 50mm f/1.4 FE II", "Samyang", "Lenses", "Mirrorless", 449),
    ("Samyang AF 85mm f/1.4 FE II", "Samyang", "Lenses", "Mirrorless", 549),
    ("Samyang AF 12mm f/2.0", "Samyang", "Lenses", "Mirrorless", 299),
    ("Samyang AF 75mm f/1.8 FE", "Samyang", "Lenses", "Mirrorless", 349),
    ("Rokinon AF 14mm f/2.8 FE", "Rokinon", "Lenses", "Mirrorless", 799),
    ("Rokinon AF 24mm f/2.8 FE", "Rokinon", "Lenses", "Mirrorless", 249),
    ("Rokinon AF 35mm f/2.8 FE", "Rokinon", "Lenses", "Mirrorless", 249),
    ("Rokinon AF 45mm f/1.8 FE", "Rokinon", "Lenses", "Mirrorless", 349),

    # TTArtisan
    ("TTArtisan 50mm f/0.95", "TTArtisan", "Lenses", "Mirrorless", 268),
    ("TTArtisan 35mm f/1.4", "TTArtisan", "Lenses", "Mirrorless", 79),
    ("TTArtisan 17mm f/1.4", "TTArtisan", "Lenses", "Mirrorless", 99),
    ("TTArtisan 27mm f/2.8", "TTArtisan", "Lenses", "Mirrorless", 79),
    ("TTArtisan 56mm f/1.8 AF", "TTArtisan", "Lenses", "Mirrorless", 119),
    ("TTArtisan 100mm f/2.8 Macro Tilt-Shift", "TTArtisan", "Lenses", "Mirrorless", 339),

    # 7Artisans
    ("7Artisans 50mm f/0.95", "7Artisans", "Lenses", "Mirrorless", 299),
    ("7Artisans 35mm f/0.95", "7Artisans", "Lenses", "Mirrorless", 259),
    ("7Artisans 55mm f/1.4", "7Artisans", "Lenses", "Mirrorless", 99),
    ("7Artisans 25mm f/1.8", "7Artisans", "Lenses", "Mirrorless", 75),
    ("7Artisans 12mm f/2.8", "7Artisans", "Lenses", "Mirrorless", 139),
    ("7Artisans 60mm f/2.8 Macro", "7Artisans", "Lenses", "Mirrorless", 119),

    # Meike
    ("Meike 25mm T2.2 Cine", "Meike", "Lenses", "Cine", 199),
    ("Meike 35mm T2.2 Cine", "Meike", "Lenses", "Cine", 199),
    ("Meike 50mm T2.2 Cine", "Meike", "Lenses", "Cine", 199),
    ("Meike 65mm T2.2 Cine", "Meike", "Lenses", "Cine", 199),
    ("Meike 85mm T2.2 Cine", "Meike", "Lenses", "Cine", 199),
    ("Meike 16mm T2.5 FF Cine", "Meike", "Lenses", "Cine", 399),
    ("Meike 35mm T2.1 FF Cine", "Meike", "Lenses", "Cine", 399),
    ("Meike 50mm T2.1 FF Cine", "Meike", "Lenses", "Cine", 399),
    ("Meike 85mm T2.1 FF Cine", "Meike", "Lenses", "Cine", 399),

    # Tokina
    ("Tokina ATX-M 11-18mm f/2.8 E", "Tokina", "Lenses", "Mirrorless", 499),
    ("Tokina ATX-M 23mm f/1.4 X", "Tokina", "Lenses", "Mirrorless", 399),
    ("Tokina ATX-M 33mm f/1.4 X", "Tokina", "Lenses", "Mirrorless", 399),
    ("Tokina ATX-M 56mm f/1.4 X", "Tokina", "Lenses", "Mirrorless", 399),
    ("Tokina Cinema Vista 25mm T1.5", "Tokina", "Lenses", "Cine", 4499),
    ("Tokina Cinema Vista 50mm T1.5", "Tokina", "Lenses", "Cine", 4499),
    ("Tokina Cinema Vista 85mm T1.5", "Tokina", "Lenses", "Cine", 4499),

    # Voigtlander
    ("Voigtlander Nokton 35mm f/1.2 SE", "Voigtlander", "Lenses", "Mirrorless", 999),
    ("Voigtlander Nokton 40mm f/1.2 SE", "Voigtlander", "Lenses", "Mirrorless", 999),
    ("Voigtlander Nokton 50mm f/1.0 Aspherical", "Voigtlander", "Lenses", "Mirrorless", 1599),
    ("Voigtlander APO-Lanthar 35mm f/2", "Voigtlander", "Lenses", "Mirrorless", 899),
    ("Voigtlander APO-Lanthar 50mm f/2", "Voigtlander", "Lenses", "Mirrorless", 749),
    ("Voigtlander APO-Lanthar 65mm f/2 Macro", "Voigtlander", "Lenses", "Mirrorless", 799),
    ("Voigtlander Color-Skopar 21mm f/3.5", "Voigtlander", "Lenses", "Mirrorless", 649),
    ("Voigtlander ULTRON 75mm f/1.9 VM", "Voigtlander", "Lenses", "Mirrorless", 999),

    # IRIX
    ("IRIX 15mm f/2.4 Firefly", "IRIX", "Lenses", "SLR", 399),
    ("IRIX 11mm f/4 Firefly", "IRIX", "Lenses", "SLR", 499),
    ("IRIX 45mm f/1.4 Dragonfly", "IRIX", "Lenses", "SLR", 595),
    ("IRIX 150mm f/2.8 Macro 1:1", "IRIX", "Lenses", "SLR", 495),
    ("IRIX Cine 15mm T2.6", "IRIX", "Lenses", "Cine", 1295),
    ("IRIX Cine 45mm T1.5", "IRIX", "Lenses", "Cine", 1295),

    # Lensbaby
    ("Lensbaby Velvet 56mm f/1.6", "Lensbaby", "Lenses", "Mirrorless", 399),
    ("Lensbaby Velvet 85mm f/1.8", "Lensbaby", "Lenses", "Mirrorless", 449),
    ("Lensbaby Composer Pro II with Sweet 50", "Lensbaby", "Lenses", "Mirrorless", 349),
    ("Lensbaby Sol 45mm f/3.5", "Lensbaby", "Lenses", "Mirrorless", 199),
    ("Lensbaby Obscura 50", "Lensbaby", "Lenses", "Mirrorless", 249),

    # Yongnuo
    ("Yongnuo YN 50mm f/1.8 II", "Yongnuo", "Lenses", "SLR", 59),
    ("Yongnuo YN 35mm f/2", "Yongnuo", "Lenses", "SLR", 49),
    ("Yongnuo YN 85mm f/1.8 DF DSM", "Yongnuo", "Lenses", "Mirrorless", 269),

    # AstrHori
    ("AstrHori 12mm f/2.8 Fisheye", "AstrHori", "Lenses", "Mirrorless", 169),
    ("AstrHori 18mm f/8 Shift", "AstrHori", "Lenses", "Mirrorless", 149),
    ("AstrHori 50mm f/1.4 Tilt", "AstrHori", "Lenses", "Mirrorless", 179),
    ("AstrHori 85mm f/1.8 AF", "AstrHori", "Lenses", "Mirrorless", 199),

    # Mitakon Zhongyi
    ("Mitakon Zhongyi Speedmaster 50mm f/0.95 III", "Mitakon Zhongyi", "Lenses", "Mirrorless", 799),
    ("Mitakon Zhongyi Speedmaster 35mm f/0.95 II", "Mitakon Zhongyi", "Lenses", "Mirrorless", 599),
    ("Mitakon Zhongyi Speedmaster 65mm f/1.4", "Mitakon Zhongyi", "Lenses", "Medium Format", 699),
    ("Mitakon Zhongyi Creator 85mm f/2.8 1-5x Macro", "Mitakon Zhongyi", "Lenses", "Mirrorless", 199),

    # Thypoch
    ("Thypoch Simera 35mm f/1.4", "Thypoch", "Lenses", "Mirrorless", 449),
    ("Thypoch Simera 28mm f/1.4", "Thypoch", "Lenses", "Mirrorless", 449),

    # Blazar
    ("Blazar Remus 1.5x Anamorphic 33mm T2.1", "Blazar", "Lenses", "Cine", 299),
    ("Blazar Remus 1.5x Anamorphic 50mm T2.1", "Blazar", "Lenses", "Cine", 299),
    ("Blazar Remus 1.5x Anamorphic 65mm T2.1", "Blazar", "Lenses", "Cine", 299),
    ("Blazar Cato 2x Anamorphic 42mm T4", "Blazar", "Lenses", "Cine", 749),

    # Fujinon (Cine)
    ("Fujinon Premista 28-100mm T2.9 Zoom", "Fujinon", "Lenses", "Cine", None),
    ("Fujinon Premista 80-250mm T2.9-3.5 Zoom", "Fujinon", "Lenses", "Cine", None),
    ("Fujinon Premista 19-45mm T2.9 Zoom", "Fujinon", "Lenses", "Cine", None),

    # Hasselblad XCD
    ("Hasselblad XCD 38mm f/2.5 V", "Hasselblad", "Lenses", "Medium Format", 2570),
    ("Hasselblad XCD 55mm f/2.5 V", "Hasselblad", "Lenses", "Medium Format", 2570),
    ("Hasselblad XCD 90mm f/2.5 V", "Hasselblad", "Lenses", "Medium Format", 2570),
    ("Hasselblad XCD 20-35mm f/3.2-4.5 E", "Hasselblad", "Lenses", "Medium Format", 5090),
    ("Hasselblad XCD 35-75mm f/3.5-4.5", "Hasselblad", "Lenses", "Medium Format", 5090),

    # Phase One
    ("Phase One Schneider Kreuznach 80mm f/2.8 LS", "Phase One", "Lenses", "Medium Format", 3990),
    ("Phase One Schneider Kreuznach 110mm f/2.8 LS", "Phase One", "Lenses", "Medium Format", 3990),
    ("Phase One Schneider Kreuznach 150mm f/2.8 LS", "Phase One", "Lenses", "Medium Format", 4490),

    # OM SYSTEM
    ("OM SYSTEM M.Zuiko 12-40mm f/2.8 PRO II", "OM SYSTEM", "Lenses", "Mirrorless", 1099),
    ("OM SYSTEM M.Zuiko 40-150mm f/2.8 PRO", "OM SYSTEM", "Lenses", "Mirrorless", 1499),
    ("OM SYSTEM M.Zuiko 150-400mm f/4.5 TC1.25x IS PRO", "OM SYSTEM", "Lenses", "Mirrorless", 7499),
    ("OM SYSTEM M.Zuiko 45mm f/1.2 PRO", "OM SYSTEM", "Lenses", "Mirrorless", 1199),
    ("OM SYSTEM M.Zuiko 17mm f/1.2 PRO", "OM SYSTEM", "Lenses", "Mirrorless", 1199),
    ("OM SYSTEM M.Zuiko 7-14mm f/2.8 PRO", "OM SYSTEM", "Lenses", "Mirrorless", 1199),

    # Lomography
    ("Lomography Petzval 55mm f/1.7 MKII", "Lomography", "Lenses", "Mirrorless", 399),
    ("Lomography Petzval 80.5mm f/1.9 MKII", "Lomography", "Lenses", "Mirrorless", 399),
    ("Lomography Daguerreotype Achromat 64mm f/2.9", "Lomography", "Lenses", "Mirrorless", 499),

    # PolarPro
    ("PolarPro BlueMorphic Anamorphic Lens Filter", "PolarPro", "Lenses", "Specialty", 199),

    # DJI (Cine lenses)
    ("DJI DL 24mm f/2.8 LS ASPH", "DJI", "Lenses", "Cine", 2699),
    ("DJI DL 35mm f/2.8 LS ASPH", "DJI", "Lenses", "Cine", 2699),
    ("DJI DL 50mm f/2.8 LS ASPH", "DJI", "Lenses", "Cine", 2699),

    # Schneider
    ("Schneider Xenon FF Prime 35mm T2.1", "Schneider", "Lenses", "Cine", 4990),
    ("Schneider Xenon FF Prime 50mm T2.1", "Schneider", "Lenses", "Cine", 4990),
    ("Schneider Xenon FF Prime 75mm T2.1", "Schneider", "Lenses", "Cine", 4990),

    # ═══════════════════════════════════════════════════════════════
    # MISSING CAMERA BRANDS
    # ═══════════════════════════════════════════════════════════════

    # Pixii
    ("Pixii A2572 Rangefinder Camera", "Pixii", "Cameras", "Mirrorless", 3590),

    # Additional Blackmagic
    ("Blackmagic Design URSA Cine 12K LF", "Blackmagic Design", "Cameras", "Cinema", 14995),
    ("Blackmagic Design Cinema Camera 6K", "Blackmagic Design", "Cameras", "Cinema", 2595),
]


def main():
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    products = []
    for item in NEW_PRODUCTS:
        name, brand, category, subcategory, price = item
        products.append({
            "name": name,
            "brand": brand,
            "category": category,
            "subcategory": subcategory,
            "price": price,
        })

    print(f"New products to add: {len(products)}")

    # Insert in batches
    inserted = 0
    skipped = 0
    for i in range(0, len(products), 50):
        batch = products[i:i+50]
        for p in batch:
            try:
                sb.table("products").insert(p).execute()
                inserted += 1
            except Exception as e:
                if "duplicate" in str(e).lower():
                    skipped += 1
                else:
                    print(f"  Error: {p['name']}: {e}")
        time.sleep(0.3)

    print(f"Inserted: {inserted}, Skipped (dups): {skipped}")

    # Final count
    total = sb.table("products").select("id", count="exact").execute()
    print(f"Total products in DB: {total.count}")

    # Breakdown
    for cat in ["Lighting", "Cameras", "Lenses"]:
        count = sb.table("products").select("id", count="exact").eq("category", cat).execute()
        brands = sb.table("products").select("brand").eq("category", cat).execute()
        unique_brands = len(set(r["brand"] for r in brands.data))
        print(f"  {cat}: {count.count} products, {unique_brands} brands")

if __name__ == "__main__":
    main()
