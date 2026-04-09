"""
GearHub Pro — Spec Parser & Supabase Updater
Parses autoparse JSON-LD from B&H and maps specs to Supabase columns.
"""
import json
import re
import sys
from supabase import create_client

SUPABASE_URL = 'https://lzkdewuwrshiqjjndszx.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6a2Rld3V3cnNoaXFqam5kc3p4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTYxNDk1MywiZXhwIjoyMDkxMTkwOTUzfQ.ZKwzCTeJ66gyYZVifjy-wuxk8unk3BnSeQ4YcHcXRD0'
sb = create_client(SUPABASE_URL, SUPABASE_KEY)


def extract_specs(autoparse_json):
    """Extract specs dict from autoparse JSON-LD response."""
    if isinstance(autoparse_json, str):
        autoparse_json = json.loads(autoparse_json)

    product = None
    items = autoparse_json if isinstance(autoparse_json, list) else [autoparse_json]
    for item in items:
        if isinstance(item, dict) and item.get('@type') == 'Product':
            product = item
            break

    if not product:
        return None, None, None, None, {}

    name = product.get('name', '')
    price = None
    image_url = product.get('image', '')

    offers = product.get('offers', {})
    if isinstance(offers, dict):
        price = offers.get('price')
    elif isinstance(offers, list) and offers:
        price = offers[0].get('price')
    if price:
        price = float(price)

    # Extract specs from additionalProperty
    specs_raw = {}
    add_prop = product.get('additionalProperty', {})
    spec_values = []
    if isinstance(add_prop, dict) and add_prop.get('name') == 'Specs':
        spec_values = add_prop.get('value', [])
    elif isinstance(add_prop, list):
        spec_values = add_prop

    for sv in spec_values:
        if isinstance(sv, dict) and sv.get('@type') == 'PropertyValue':
            spec_name = sv.get('name', '')
            spec_val = sv.get('value', '')
            # Some specs appear twice (summary + detail). Keep the more detailed one.
            if spec_name in specs_raw:
                existing = specs_raw[spec_name]
                if isinstance(spec_val, list) or (isinstance(spec_val, str) and len(str(spec_val)) > len(str(existing))):
                    specs_raw[spec_name] = spec_val
            else:
                specs_raw[spec_name] = spec_val

    return name, price, image_url, product.get('sku', ''), specs_raw


def parse_weight_grams(val):
    """Parse weight string to grams integer."""
    if isinstance(val, list):
        # Take body-only weight if available
        for v in val:
            if 'body only' in str(v).lower():
                val = v
                break
        else:
            val = val[0]
    val = str(val)
    # Try kg first
    kg = re.search(r'([\d.]+)\s*kg', val, re.I)
    if kg:
        return int(float(kg.group(1)) * 1000)
    # Try lb
    lb = re.search(r'([\d.]+)\s*lb', val, re.I)
    if lb:
        return int(float(lb.group(1)) * 453.592)
    # Try grams
    g = re.search(r'([\d.]+)\s*g\b', val, re.I)
    if g:
        return int(float(g.group(1)))
    # Try oz
    oz = re.search(r'([\d.]+)\s*oz', val, re.I)
    if oz:
        return int(float(oz.group(1)) * 28.3495)
    return None


def parse_dimensions_mm(val):
    """Extract dimensions in mm from string."""
    if isinstance(val, list):
        for v in val:
            if 'mm' in str(v).lower():
                val = v
                break
        else:
            val = val[0]
    val = str(val)
    mm_match = re.search(r'([\d.]+\s*x\s*[\d.]+\s*x?\s*[\d.]*)\s*(?:mm|&nbsp;mm)', val, re.I)
    if mm_match:
        return mm_match.group(1).strip().rstrip('x').strip() + ' mm'
    return str(val).split('/')[0].strip() if '/' in str(val) else str(val)


def parse_numeric(val, pattern=None):
    """Extract a numeric value from string."""
    val = str(val)
    if pattern:
        m = re.search(pattern, val, re.I)
        if m:
            return float(m.group(1))
    m = re.search(r'([\d.]+)', val)
    if m:
        return float(m.group(1))
    return None


def parse_bool(val):
    """Parse boolean from spec value."""
    val = str(val).lower()
    if any(x in val for x in ['yes', 'true', 'built-in', 'digital', 'optical']):
        return True
    if any(x in val for x in ['no', 'none', 'false', 'n/a']):
        return False
    return None


def flatten_list(val):
    """Convert list values to comma-separated string."""
    if isinstance(val, list):
        return ', '.join(str(v) for v in val)
    return str(val)


# ═══════════════════════════════════════════════════════════════
# CAMERA SPEC MAPPING
# ═══════════════════════════════════════════════════════════════
def map_camera_specs(specs_raw):
    """Map B&H spec names to cameras table columns."""
    update = {}

    for name, val in specs_raw.items():
        val_str = flatten_list(val)
        name_lower = name.lower()

        if name_lower == 'lens mount':
            update['lens_mount'] = val_str

        elif 'image sensor' in name_lower or 'sensor type' in name_lower:
            # Extract sensor size and type
            s = val_str
            sizes = ['Full-Frame', 'APS-C', 'Super 35', 'Medium Format', 'Micro Four Thirds', '1"', '1-inch', 'Four Thirds']
            for sz in sizes:
                if sz.lower() in s.lower():
                    update['sensor_size'] = sz.replace('1"', '1-inch')
                    break
            types = ['BSI Stacked CMOS', 'BSI CMOS', 'Stacked CMOS', 'CMOS', 'CCD', 'X-Trans']
            for t in types:
                if t.lower() in s.lower():
                    update['sensor_type'] = t
                    break

        elif 'sensor resolution' in name_lower or 'effective' in name_lower and 'megapixel' in val_str.lower():
            mp = parse_numeric(val_str, r'([\d.]+)\s*megapixel')
            if mp:
                update['megapixels'] = mp

        elif 'iso' in name_lower or 'gain sensitivity' in name_lower:
            update['iso_range'] = val_str.replace('Native: ', '')

        elif 'dynamic range' in name_lower:
            stops = parse_numeric(val_str, r'([\d.]+)\s*stop')
            if stops:
                update['dynamic_range_stops'] = stops

        elif 'image stabilization' in name_lower:
            update['ibis'] = parse_bool(val_str)
            stops = parse_numeric(val_str, r'([\d.]+)\s*stop')
            if stops:
                update['ibis_stops'] = stops

        elif 'max recording' in name_lower or 'internal recording' in name_lower:
            # Extract max resolution and codec info
            if '8K' in val_str or '8192' in val_str:
                update.setdefault('max_video_resolution', '8K')
            elif '6K' in val_str or '6000' in val_str or '5.9K' in val_str:
                update.setdefault('max_video_resolution', '6K')
            elif '4K' in val_str or '4096' in val_str or '3840' in val_str:
                update.setdefault('max_video_resolution', '4K')
            elif '1080' in val_str:
                update.setdefault('max_video_resolution', '1080p')

            # Extract codecs
            codecs = set()
            codec_patterns = ['ProRes', 'ARRIRAW', 'RAW', 'H.265', 'H.264', 'HEVC', 'XAVC', 'AVC', 'Cinema RAW Light', 'BRAW', 'REDCODE']
            for cp in codec_patterns:
                if cp.lower() in val_str.lower():
                    codecs.add(cp)
            if codecs:
                update['video_codec'] = ', '.join(sorted(codecs))

            # Extract bit depth
            bits = re.findall(r'(\d+)-?[Bb]it', val_str)
            if bits:
                max_bit = max(int(b) for b in bits)
                update['bit_depth'] = f'{max_bit}-bit'

            # Color sampling
            samplings = re.findall(r'4:\d:\d', val_str)
            if samplings:
                update['color_sampling'] = ', '.join(sorted(set(samplings), reverse=True))

            # Max FPS at max resolution
            fps_matches = re.findall(r'at\s+.*?([\d.]+)\s*fps', val_str)
            if fps_matches:
                max_fps = max(float(f) for f in fps_matches)
                update['max_video_fps'] = f'{max_fps}fps'

        elif 'media' in name_lower or 'memory card' in name_lower:
            update['recording_media'] = val_str

        elif 'nd filter' in name_lower or 'built-in nd' in name_lower:
            update['nd_filter'] = val_str

        elif name_lower == 'battery':
            update['battery_type'] = val_str

        elif name_lower == 'weight':
            wg = parse_weight_grams(val)
            if wg:
                update['weight_g'] = wg

        elif 'dimension' in name_lower:
            update['dimensions'] = parse_dimensions_mm(val)

        elif 'display' in name_lower or 'monitor' in name_lower:
            s = val_str
            size_match = re.search(r'([\d.]+)["\u201d\u2033]', s)
            if size_match:
                update['monitor_size'] = f'{size_match.group(1)}-inch'
            if 'touch' in s.lower():
                update['monitor_type'] = 'Touchscreen'
            elif 'tilt' in s.lower():
                update['monitor_type'] = 'Tilting'
            elif 'vari' in s.lower():
                update['monitor_type'] = 'Vari-angle'
            elif 'lcd' in s.lower():
                update['monitor_type'] = 'LCD'

        elif name_lower == 'resolution' and 'evf' not in name_lower:
            # Skip display resolution
            pass

        elif 'viewfinder' in name_lower or 'evf' in name_lower:
            update['evf_resolution'] = val_str

        elif 'video i/o' in name_lower:
            if 'hdmi' in val_str.lower():
                hdmi = 'Full-size HDMI' if 'full' in val_str.lower() else ('Micro HDMI' if 'micro' in val_str.lower() else 'HDMI')
                update['hdmi_output'] = hdmi

        elif 'other i/o' in name_lower:
            if 'usb' in val_str.lower():
                usb_match = re.search(r'USB[- ]?C?\s*[\d.]*\s*(?:Gen\s*\d)?', val_str, re.I)
                if usb_match:
                    update['usb_type'] = usb_match.group(0).strip()

        elif 'wireless' in name_lower:
            update['wifi'] = 'wi-fi' in val_str.lower() or 'wifi' in val_str.lower() or '802.11' in val_str.lower()
            update['bluetooth'] = 'bluetooth' in val_str.lower()

        elif 'weather' in name_lower:
            update['weather_sealed'] = parse_bool(val_str)

        elif 'body' in name_lower and 'material' in name_lower:
            update['body_material'] = val_str

        elif 'focus' in name_lower and ('af' in name_lower or 'autofocus' in name_lower or 'point' in name_lower):
            af_points = parse_numeric(val_str, r'([\d]+)\s*(?:point|area)')
            if af_points:
                update['af_points'] = int(af_points)
            if any(x in val_str.lower() for x in ['phase', 'hybrid', 'dual pixel', 'pdaf']):
                update['af_type'] = val_str

        elif 'continuous' in name_lower and ('shoot' in name_lower or 'fps' in name_lower or 'burst' in name_lower):
            fps = parse_numeric(val_str, r'([\d.]+)\s*fps')
            if fps:
                update['continuous_fps'] = fps

    return update


# ═══════════════════════════════════════════════════════════════
# LENS SPEC MAPPING
# ═══════════════════════════════════════════════════════════════
def map_lens_specs(specs_raw):
    """Map B&H spec names to lenses table columns."""
    update = {}

    for name, val in specs_raw.items():
        val_str = flatten_list(val)
        name_lower = name.lower()

        if name_lower == 'lens mount' or name_lower == 'mount':
            update['lens_mount'] = val_str

        elif 'focal length' in name_lower:
            update['focal_length'] = val_str

        elif 'maximum aperture' in name_lower or name_lower == 'max aperture':
            update['max_aperture'] = val_str

        elif 'minimum aperture' in name_lower or name_lower == 'min aperture':
            update['min_aperture'] = val_str

        elif 'format' in name_lower or 'coverage' in name_lower or 'image circle' in name_lower and 'format' in name_lower:
            update['format_coverage'] = val_str

        elif 'image circle' in name_lower:
            mm = parse_numeric(val_str, r'([\d.]+)\s*mm')
            if mm:
                update['image_circle_mm'] = mm

        elif 'minimum focus' in name_lower or 'close focus' in name_lower:
            update['min_focus_distance'] = val_str

        elif 'magnification' in name_lower:
            update['max_magnification'] = val_str

        elif 'filter' in name_lower and 'size' in name_lower:
            mm = parse_numeric(val_str, r'([\d.]+)')
            if mm:
                update['filter_size_mm'] = int(mm)

        elif 'optical design' in name_lower or 'element' in name_lower and 'group' in name_lower:
            update['optical_design'] = val_str

        elif 'special element' in name_lower:
            update['special_elements'] = val_str

        elif 'aperture blade' in name_lower or 'diaphragm blade' in name_lower:
            blades = parse_numeric(val_str, r'(\d+)')
            if blades:
                update['aperture_blades'] = int(blades)

        elif 'image stabilization' in name_lower or name_lower == 'stabilization':
            update['image_stabilization'] = parse_bool(val_str)

        elif 'autofocus' in name_lower or name_lower == 'focus type':
            update['autofocus'] = 'auto' in val_str.lower() or 'af' in val_str.lower()
            motor_types = ['XD Linear', 'Nano USM', 'VXD', 'STM', 'SSM', 'USM', 'Linear', 'Stepping', 'SWM', 'Ring-Type']
            for mt in motor_types:
                if mt.lower() in val_str.lower():
                    update['af_motor'] = mt
                    break

        elif 'weather' in name_lower:
            update['weather_sealed'] = parse_bool(val_str)

        elif name_lower == 'weight':
            wg = parse_weight_grams(val)
            if wg:
                update['weight_g'] = wg

        elif 'dimension' in name_lower:
            update['dimensions'] = parse_dimensions_mm(val)

        elif 'focus rotation' in name_lower or 'focus throw' in name_lower:
            deg = parse_numeric(val_str, r'(\d+)\s*°|(\d+)\s*deg')
            if deg:
                update['focus_rotation_deg'] = int(deg)

        elif 'front diameter' in name_lower:
            mm = parse_numeric(val_str, r'([\d.]+)')
            if mm:
                update['front_diameter_mm'] = int(mm)

        elif 'lens data' in name_lower or 'metadata' in name_lower:
            update['lens_data_system'] = val_str

        elif 'anamorphic' in name_lower:
            update['anamorphic_ratio'] = val_str

        elif 'parfocal' in name_lower:
            update['parfocal'] = parse_bool(val_str)

    return update


# ═══════════════════════════════════════════════════════════════
# LIGHTING SPEC MAPPING
# ═══════════════════════════════════════════════════════════════
def map_lighting_specs(specs_raw):
    """Map B&H spec names to lighting table columns."""
    update = {}

    for name, val in specs_raw.items():
        val_str = flatten_list(val)
        name_lower = name.lower()

        if 'form factor' in name_lower or 'light type' in name_lower:
            update['form_factor'] = val_str

        elif 'color temp' in name_lower or 'cct' in name_lower:
            update['color_temp_range'] = val_str

        elif 'color type' in name_lower or 'color mode' in name_lower:
            if any(x in val_str.lower() for x in ['rgb', 'hsi', 'gel', 'effect']):
                update['color_modes'] = val_str
            # Determine color type
            if 'rgbww' in val_str.lower() or 'full color' in val_str.lower():
                update.setdefault('color_type', 'RGBWW')
            elif 'rgb' in val_str.lower():
                update.setdefault('color_type', 'RGB')
            elif 'bi-color' in val_str.lower() or 'bicolor' in val_str.lower():
                update.setdefault('color_type', 'Bi-Color')
            elif 'daylight' in val_str.lower():
                update.setdefault('color_type', 'Daylight')
            elif 'tungsten' in val_str.lower():
                update.setdefault('color_type', 'Tungsten')

        elif name_lower == 'cri':
            cri = parse_numeric(val_str, r'([\d.]+)')
            if cri:
                update['cri'] = cri

        elif name_lower == 'tlci':
            tlci = parse_numeric(val_str, r'([\d.]+)')
            if tlci:
                update['tlci'] = tlci

        elif 'power' in name_lower and ('draw' in name_lower or 'consumption' in name_lower or 'watt' in name_lower):
            w = parse_numeric(val_str, r'([\d.]+)\s*w')
            if w:
                update['power_draw_w'] = int(w)

        elif 'output' in name_lower and ('lux' in val_str.lower() or 'lumen' in val_str.lower() or 'fc' in val_str.lower()):
            update['output_lux'] = val_str

        elif 'beam angle' in name_lower:
            update['beam_angle'] = val_str

        elif 'dimming' in name_lower:
            update['dimming_range'] = val_str

        elif name_lower == 'ip rating' or 'ingress' in name_lower:
            ip_match = re.search(r'IP\d+', val_str, re.I)
            if ip_match:
                update['ip_rating'] = ip_match.group(0).upper()

        elif name_lower == 'weight':
            wg = parse_weight_grams(val)
            if wg:
                update['weight_g'] = wg

        elif 'dimension' in name_lower:
            update['dimensions'] = parse_dimensions_mm(val)

        elif 'power input' in name_lower or 'power source' in name_lower:
            update['power_input'] = val_str

        elif 'control' in name_lower:
            update['control_options'] = val_str

        elif 'battery' in name_lower:
            update['battery_option'] = True
            update['battery_type'] = val_str

        elif 'cooling' in name_lower:
            update['cooling'] = val_str

        elif 'mount' in name_lower and 'accessor' in name_lower:
            update['accessory_mount'] = val_str

        elif 'tungsten equivalent' in name_lower:
            update['tungsten_equivalent'] = val_str

        elif 'lamp type' in name_lower or 'led type' in name_lower:
            update['lamp_type'] = val_str

    return update


CATEGORY_MAPPERS = {
    'cameras': map_camera_specs,
    'lenses': map_lens_specs,
    'lighting': map_lighting_specs,
}


def update_product(table, product_id, autoparse_data):
    """Parse autoparse data and update Supabase row."""
    name, price, image_url, sku, specs_raw = extract_specs(autoparse_data)

    if not specs_raw:
        return False, "No specs found in autoparse data"

    mapper = CATEGORY_MAPPERS.get(table)
    if not mapper:
        return False, f"Unknown table: {table}"

    update = mapper(specs_raw)

    # Always update price and image if available
    if price:
        update['price'] = price
    if image_url:
        update['image_url'] = image_url

    if not update:
        return False, "No mappable specs found"

    # Remove None values
    update = {k: v for k, v in update.items() if v is not None}

    res = sb.table(table).update(update).eq('id', product_id).execute()
    return True, f"Updated {len(update)} fields: {list(update.keys())}"


if __name__ == '__main__':
    # Test: pass table, id, and JSON file path
    if len(sys.argv) >= 4:
        table = sys.argv[1]
        pid = int(sys.argv[2])
        json_path = sys.argv[3]
        with open(json_path) as f:
            data = json.load(f)
        ok, msg = update_product(table, pid, data)
        print(f"{'OK' if ok else 'FAIL'}: {msg}")
