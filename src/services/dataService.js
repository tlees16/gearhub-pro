import { supabase } from './supabase'

// ─── Subcategories per category ──────────────────────────────────
const SUBCATEGORIES = {
  cameras: ['Cinema', 'Mirrorless', 'DSLR', 'Medium Format', 'Point & Shoot'],
  lenses: ['Mirrorless', 'Cine', 'SLR', 'Medium Format', 'Specialty'],
  lighting: ['LED', 'HMI'],
}

// ─── Filterable spec columns per category ────────────────────────
// Each entry: [dbColumn, label, type]
//   type: 'categorical' = checkbox filter, 'numeric' = range slider, 'boolean' = toggle
const SPEC_COLUMNS = {
  cameras: [
    ['subcategory', 'Type', 'categorical'],
    ['sensor_size', 'Sensor Size', 'categorical'],
    ['lens_mount', 'Lens Mount', 'categorical'],
    ['megapixels', 'Megapixels', 'numeric'],
    ['max_video_resolution', 'Max Video Res', 'categorical'],
    ['dynamic_range_stops', 'Dynamic Range', 'numeric'],
    ['continuous_fps', 'Burst FPS', 'numeric'],
    ['af_points', 'AF Points', 'numeric'],
    ['weight_g', 'Weight (g)', 'numeric'],
    ['ibis', 'IBIS', 'boolean'],
    ['weather_sealed', 'Weather Sealed', 'boolean'],
    ['recording_media', 'Recording Media', 'categorical'],
    ['bit_depth', 'Bit Depth', 'categorical'],
  ],
  lenses: [
    ['subcategory', 'Type', 'categorical'],
    ['lens_mount', 'Lens Mount', 'categorical'],
    ['format_coverage', 'Format Coverage', 'categorical'],
    ['max_aperture', 'Max Aperture', 'categorical'],
    ['filter_size_mm', 'Filter Size (mm)', 'numeric'],
    ['aperture_blades', 'Aperture Blades', 'numeric'],
    ['weight_g', 'Weight (g)', 'numeric'],
    ['autofocus', 'Autofocus', 'boolean'],
    ['image_stabilization', 'Image Stabilization', 'boolean'],
    ['weather_sealed', 'Weather Sealed', 'boolean'],
    ['anamorphic_ratio', 'Anamorphic', 'categorical'],
  ],
  lighting: [
    ['subcategory', 'Light Source', 'categorical'],
    ['form_factor', 'Form Factor', 'categorical'],
    ['color_type', 'Color Type', 'categorical'],
    ['cri', 'CRI', 'numeric'],
    ['tlci', 'TLCI', 'numeric'],
    ['power_draw_w', 'Power (W)', 'numeric'],
    ['weight_g', 'Weight (g)', 'numeric'],
    ['ip_rating', 'IP Rating', 'categorical'],
    ['battery_option', 'Battery Option', 'boolean'],
    ['accessory_mount', 'Accessory Mount', 'categorical'],
    ['cooling', 'Cooling', 'categorical'],
  ],
}

// ─── Spec display labels ─────────────────────────────────────────
const SPEC_LABELS = {}
const SPEC_UNITS = {}
for (const cols of Object.values(SPEC_COLUMNS)) {
  for (const [col, label] of cols) {
    SPEC_LABELS[col] = label
    if (col === 'megapixels') SPEC_UNITS[col] = ' MP'
    if (col === 'dynamic_range_stops') SPEC_UNITS[col] = ' stops'
    if (col === 'continuous_fps') SPEC_UNITS[col] = ' fps'
    if (col === 'weight_g') SPEC_UNITS[col] = 'g'
    if (col === 'filter_size_mm') SPEC_UNITS[col] = 'mm'
    if (col === 'power_draw_w') SPEC_UNITS[col] = 'W'
  }
}

// ─── Normalize a DB row into the app's product shape ─────────────
function normalizeProduct(row, category) {
  const specs = {}
  const specCols = SPEC_COLUMNS[category] || []
  for (const [col, label, type] of specCols) {
    const raw = row[col]
    if (type === 'numeric') {
      specs[col] = { raw: raw != null ? String(raw) : 'N/A', value: raw != null ? Number(raw) : null, label }
    } else if (type === 'boolean') {
      specs[col] = { raw: raw === true ? 'Yes' : raw === false ? 'No' : 'N/A', value: raw, label }
    } else {
      specs[col] = { raw: raw || 'N/A', value: raw || null, label }
    }
  }

  // Normalise lens subcategory to Prime / Zoom
  if (category === 'lenses' && specs.subcategory) {
    const raw = (specs.subcategory.raw || '').toLowerCase()
    const name = (row.name || '').toLowerCase()
    let lensType = null
    if (raw.includes('zoom') || name.includes('zoom')) lensType = 'Zoom'
    else if (raw.includes('prime') || name.includes('prime')) lensType = 'Prime'
    else if (row.focal_length_mm && String(row.focal_length_mm).includes('-')) lensType = 'Zoom'
    else if (row.focal_length_mm) lensType = 'Prime'
    if (lensType) specs.subcategory = { ...specs.subcategory, raw: lensType, value: lensType }
  }

  return {
    id: `${category}-${row.id}`,
    dbId: row.id,
    category,
    name: row.name || '',
    brand: row.brand || '',
    subcategory: row.subcategory || '',
    priceRaw: row.price ? `$${Number(row.price).toLocaleString()}` : '',
    price: row.price ? Number(row.price) : null,
    url: row.bhphoto_url || '',
    image: row.image_url || '',
    specs,
    allSpecs: row.specs_json || {},
  }
}

// ─── Fetch from Supabase ─────────────────────────────────────────
async function fetchTable(table) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('brand')
    .order('name')

  if (error) throw new Error(`Failed to fetch ${table}: ${error.message}`)
  return data || []
}

const ALL_TABLES = ['cameras', 'lenses', 'lighting', 'drones', 'gimbals', 'sd_cards', 'lighting_accessories', 'tripods', 'monitors']

export async function fetchAllProducts() {
  const results = await Promise.allSettled(ALL_TABLES.map(t => fetchTable(t)))

  return results.flatMap((result, i) => {
    if (result.status !== 'fulfilled') return []
    return result.value.map(row => normalizeProduct(row, ALL_TABLES[i]))
  }).filter(p => p.name)
}

// ─── Helpers ─────────────────────────────────────────────────────
export function isNumericSpec(specName) {
  for (const cols of Object.values(SPEC_COLUMNS)) {
    for (const [col, , type] of cols) {
      if (col === specName) return type === 'numeric'
    }
  }
  return false
}

export function isBooleanSpec(specName) {
  for (const cols of Object.values(SPEC_COLUMNS)) {
    for (const [col, , type] of cols) {
      if (col === specName) return type === 'boolean'
    }
  }
  return false
}

export function getSpecLabel(specName) {
  return SPEC_LABELS[specName] || specName
}

export function getSpecUnit(specName) {
  return SPEC_UNITS[specName] || ''
}

export function getSpecColumns(category) {
  return SPEC_COLUMNS[category] || []
}

export { SPEC_COLUMNS, SUBCATEGORIES, SPEC_LABELS, SPEC_UNITS }
