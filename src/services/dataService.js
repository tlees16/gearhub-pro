import { supabase } from './supabase'

// ─── Camera variant grouping ──────────────────────────────────────
// Cinema cameras come as multiple SKUs per model.
//
// ARRI uses complex naming that defeats generic keyword matching:
//   "ARRI AMIRA GL Camera Set Eco with Genlock Option"   → base: "ARRI AMIRA"
//   "ARRI 5 x Signature Primes & ALEXA 35 Production Set" → base: "ARRI ALEXA 35"
//   "ARRI ALEXA 35 XTREME Base Entry Set (LPL, CCM)"     → base: "ARRI ALEXA 35"
// For ARRI we locate the known model name in the string and treat everything
// after it as the configLabel.
//
// Other brands use parentheticals or keyword suffixes:
//   "Blackmagic URSA Cine 12K LF Camera (Body Only, Canon EF)" → base: "…Camera", config: "Body Only, Canon EF"
//   "Kinefinity MAVO Edge 8K Camera with Agile Pack"            → base: "…Camera", config: "with Agile Pack"

// ARRI cinema camera models — checked longest-first so "ALEXA Mini LF" wins over "ALEXA Mini"
const ARRI_CINEMA_MODELS = ['ALEXA Mini LF', 'ALEXA LF', 'ALEXA Mini', 'ALEXA 35', 'AMIRA']

// Keywords that mark the start of a configuration suffix for non-ARRI cameras.
// "Kit" and "with" cover lens-bundle / accessory-pack naming (Kinefinity, Blackmagic, Canon).
const CONFIG_BREAK_RE = /\s+(XTREME\b|Lightweight\b|Premium\b|Basic\b|Live\b|Body\b|Production\b|Operator\b|Creator\b|Camera\s+Set\b|Base\b|(?:Entry|Standard|Pro)\s+(?:Set|System)\b|Kit\b|Set\b|System\b|with\b)/i

export function stripCameraConfig(name) {
  if (!name) return { baseModel: name || '', configLabel: '' }

  // ── ARRI products: known model name lookup ────────────────────────
  // ARRI naming is too varied for regex keywords — locate the model directly.
  if (/^ARRI\s/.test(name)) {
    // "ARRI N x [lenses] & [Model] [config]" production bundle
    const bundleMatch = name.match(
      /^ARRI\s+(\d+\s*x\s+.+?)\s*&\s*(ALEXA(?:\s+(?:35|Mini\s+LF|Mini|LF))?|AMIRA)\s*(.*?)\s*$/i
    )
    if (bundleMatch) {
      const [, lensDesc, model, rest] = bundleMatch
      return {
        baseModel:   `ARRI ${model.trim()}`,
        configLabel: [lensDesc.trim(), rest.trim()].filter(Boolean).join(' '),
      }
    }
    // Standard ARRI: everything after the known model name is the config
    for (const model of ARRI_CINEMA_MODELS) {
      const idx = name.indexOf(model)
      if (idx >= 0) {
        const configLabel = name.slice(idx + model.length).trim()
        return { baseModel: `ARRI ${model}`, configLabel }
      }
    }
    // Unrecognised ARRI product — fall through to generic two-pass
  }

  // ── Generic two-pass: paren strip → keyword strip ─────────────────
  let working = name
  let parenSuffix = ''

  // Pass 1: strip trailing parenthetical
  const parenMatch = working.match(/^(.*?)\s*\(([^)]*)\)\s*$/)
  if (parenMatch) {
    working     = parenMatch[1].trim()
    parenSuffix = parenMatch[2].trim()
  }

  // Pass 2: strip config keyword prefix from what remains
  const kwMatch = working.match(CONFIG_BREAK_RE)
  if (kwMatch && kwMatch.index > 0) {
    const configPart = working.slice(kwMatch.index).trim()
    working = working.slice(0, kwMatch.index).trim()
    const configLabel = parenSuffix ? `${configPart} (${parenSuffix})` : configPart
    if (working.split(/\s+/).length >= 2) {
      return { baseModel: working, configLabel }
    }
  }

  // No config keyword found — paren suffix alone (or nothing) is the config
  if (parenSuffix && working.split(/\s+/).length >= 2) {
    return { baseModel: working, configLabel: parenSuffix }
  }

  return { baseModel: name, configLabel: '' }
}

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
    ['subcategory',          'Type',             'categorical'],
    ['sensor_size',          'Sensor Size',       'categorical'],
    ['sensor_type',          'Sensor Type',       'categorical'],
    ['lens_mount',           'Lens Mount',        'categorical'],
    ['max_video_resolution', 'Max Video Res',     'categorical'],
    ['dynamic_range_stops',  'Dynamic Range',     'numeric'],
    ['weight_g',             'Weight (g)',        'numeric'],
    ['megapixels',           'Megapixels',        'numeric'],
    ['continuous_fps',       'Burst FPS',         'numeric'],
    ['bit_depth',            'Bit Depth',         'categorical'],
    ['ibis',                 'IBIS',              'boolean'],
    ['weather_sealed',       'Weather Sealed',    'boolean'],
    ['recording_media',      'Recording Media',   'categorical'],
  ],
  lenses: [
    ['subcategory',         'Type',                'categorical'],
    ['focal_length',        'Focal Length',        'numeric'],
    ['max_aperture',        'Aperture',            'numeric'],
    ['lens_mount',          'Lens Mount',          'categorical'],
    ['filter_size',         'Filter Size',         'numeric'],
    ['weight_g',            'Weight (g)',          'numeric'],
    ['image_stabilization', 'Image Stabilization', 'boolean'],
    ['focus_type',          'Focus Type',          'categorical'],
  ],
  lighting: [
    ['item_type',               'Form Factor',     'categorical'],
    ['subcategory',             'Source',          'categorical'],
    ['power_draw_w',            'Power (W)',       'numeric'],
    ['color_type',              'Color Type',      'categorical'],
    ['color_modes',             'Color Modes',     'categorical'],  // fallback when color_type null
    ['color_accuracy_standard', 'CRI/TLCI',        'categorical'],
    ['weight_g',                'Weight (g)',      'numeric'],
    ['environmental_resistance','Weather',         'categorical'],
    ['battery_option',          'Battery Option',  'boolean'],
    ['front_accessory_mount',   'Accessory Mount', 'categorical'],
    ['cooling',                 'Cooling',         'categorical'],
  ],
  lighting_accessories: [
    ['subcategory',        'Type',          'categorical'],
    ['light_compatibility','Compatible With','categorical'],
    ['accessory_mount',    'Mount',         'categorical'],
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
    if (col === 'focal_length') SPEC_UNITS[col] = 'mm'
    if (col === 'filter_size') SPEC_UNITS[col] = 'mm'
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

  // Strip B&H quantity prefix from item_type: "1x LED Fresnel" → "LED Fresnel"
  if (specs.item_type?.value) {
    const cleaned = specs.item_type.raw.replace(/^\d+x\s+/i, '').trim()
    specs.item_type = { ...specs.item_type, raw: cleaned, value: cleaned }
  }

  // Normalise lens subcategory to Prime / Zoom
  if (category === 'lenses' && specs.subcategory) {
    const raw = (specs.subcategory.raw || '').toLowerCase()
    const name = (row.name || '').toLowerCase()
    let lensType = null
    if (raw.includes('zoom') || name.includes('zoom')) lensType = 'Zoom'
    else if (raw.includes('prime') || name.includes('prime')) lensType = 'Prime'
    else if (row.focal_length && /\d+\s*to\s*\d+|\d+-\d+/i.test(String(row.focal_length))) lensType = 'Zoom'
    else if (row.focal_length) lensType = 'Prime'
    specs.subcategory = { ...specs.subcategory, raw: lensType || 'N/A', value: lensType }
  }

  // Parse focal_length string to number: "24mm" → 24, "17 to 28mm" → 17 (wide end)
  if (category === 'lenses' && specs.focal_length) {
    const str = row.focal_length || ''
    const m = String(str).match(/(\d+\.?\d*)/)
    const num = m ? Number(m[1]) : null
    specs.focal_length = { ...specs.focal_length, raw: str || 'N/A', value: num }
  }

  // Parse filter_size string to number: "49 mm (Front)" → 49
  if (category === 'lenses' && specs.filter_size) {
    const str = row.filter_size || ''
    const m = String(str).match(/(\d+\.?\d*)/)
    const num = m ? Number(m[1]) : null
    specs.filter_size = { ...specs.filter_size, raw: num ? `${Math.round(num)}mm` : (str || 'N/A'), value: num }
  }

  // Parse max_aperture: "f/1.4" → 1.4, "T2.9" → 2.9
  if (category === 'lenses' && specs.max_aperture) {
    const str = row.max_aperture || ''
    const m = String(str).match(/(\d+(?:\.\d+)?)/)
    const num = m ? Number(m[1]) : null
    specs.max_aperture = { ...specs.max_aperture, raw: str || 'N/A', value: num }
  }

  const base = category === 'cameras' ? stripCameraConfig(row.name || '') : null

  return {
    id: `${category}-${row.id}`,
    dbId: row.id,
    category,
    name: row.clean_name || row.name || '',
    brand: row.brand || '',
    subcategory: row.subcategory || '',
    variantLabel: row.variant_label || null,
    variantGroup: row.variant_group || null,
    priceRaw: row.price ? `$${Number(row.price).toLocaleString()}` : '',
    price: row.price ? Number(row.price) : null,
    url: row.bhphoto_url || '',
    image: row.image_url || '',
    specs,
    allSpecs: row.specs_json || {},
    // Camera-only: base model name (without config suffix) + the config label
    baseModel:   base?.baseModel   ?? null,
    configLabel: base?.configLabel ?? null,
  }
}

// ─── Fetch from Supabase ─────────────────────────────────────────
async function fetchTable(table) {
  const PAGE = 1000
  let rows = []
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('brand')
      .order('name')
      .range(offset, offset + PAGE - 1)

    if (error) throw new Error(`Failed to fetch ${table}: ${error.message}`)
    rows = rows.concat(data || [])
    if (!data || data.length < PAGE) break
    offset += PAGE
  }
  return rows
}

const ALL_TABLES = ['cameras', 'lenses', 'lighting', 'lighting_accessories']

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

// Category-aware label lookup — avoids cross-category collisions (e.g. 'subcategory' means
// 'Type' for cameras/lenses but 'Source' for lighting).
export function getSpecLabelForCategory(specName, category) {
  const cols = SPEC_COLUMNS[category]
  if (cols) {
    const entry = cols.find(([col]) => col === specName)
    if (entry) return entry[1]
  }
  return SPEC_LABELS[specName] || specName
}

export function getSpecUnit(specName) {
  return SPEC_UNITS[specName] || ''
}

// ─── Price entries ────────────────────────────────────────────────
// Fetches retail_prices + used_prices for a product.
// Returns { newPrices: [...], usedPrices: [...] } shaped for PriceWidget.
export async function fetchPriceEntries(category, dbId) {
  const [retailResult, usedResult, urlResult, marketResult] = await Promise.all([
    supabase
      .from('retail_prices')
      .select('retailer, price, currency, in_stock')
      .eq('product_table', category)
      .eq('product_id', dbId),
    supabase
      .from('used_prices')
      .select('platform, condition, price_avg, currency, listing_count')
      .eq('product_table', category)
      .eq('product_id', dbId),
    supabase
      .from('retailer_urls')
      .select('retailer, url')
      .eq('product_table', category)
      .eq('product_id', dbId),
    supabase
      .from('market_data')
      .select('condition, url, price_usd, in_stock, retailers(Retailer_Name)')
      .eq('product_table', category)
      .eq('product_id', dbId),
  ])

  if (retailResult.error) throw new Error(`fetchPriceEntries retail: ${retailResult.error.message}`)
  // used_prices / market_data may not exist yet — degrade gracefully

  const urlMap = {}
  for (const row of (urlResult.data || [])) {
    urlMap[row.retailer] = row.url
  }

  const newPrices = (retailResult.data || []).map(r => ({
    retailer_name: r.retailer,
    price: r.price,
    currency: r.currency,
    condition: 'New',
    availability: r.in_stock ? 'In Stock' : 'Out of Stock',
    url: urlMap[r.retailer] || null,
  }))

  const usedPrices = (usedResult.data || [])
    .filter(r => r.listing_count > 0)
    .map(r => ({
      retailer_name: r.platform,
      price: r.price_avg,
      currency: r.currency,
      condition: r.condition,
      availability: 'In Stock',
      url: null,
    }))

  // Merge scraped market_data rows (from retailer_scraper.py) into the price arrays.
  // price_usd is already normalised to USD; condition is 'New' or 'Used'.
  for (const r of (marketResult.data || [])) {
    const name = r.retailers?.Retailer_Name
    if (!name) continue
    const entry = {
      retailer_name: name,
      price: r.price_usd,
      currency: 'USD',
      condition: r.condition,
      availability: r.in_stock ? 'In Stock' : 'Out of Stock',
      url: r.url || null,
    }
    if (r.condition === 'New') newPrices.push(entry)
    else usedPrices.push(entry)
  }

  return { newPrices, usedPrices }
}

// ─── Rental entries ───────────────────────────────────────────────
export async function fetchRentalEntries(category, dbId) {
  const { data, error } = await supabase
    .from('rental_entries')
    .select('platform, daily_rate, currency, city, region, listing_url, is_rental_house, available')
    .eq('category', category)
    .eq('db_id', dbId)
    .eq('available', true)
    .order('daily_rate', { ascending: true })

  if (error) throw new Error(`fetchRentalEntries: ${error.message}`)
  return data || []
}

// ─── Lowest retail prices (for ProductCard "New $X" badge) ───────
// Reads scraped new prices from market_data, with retail_prices as fallback.
export async function fetchLowestRetailPrices() {
  const map = {}
  const PAGE = 1000
  let offset = 0

  // Scraped new prices from market_data (primary source)
  while (true) {
    const { data, error } = await supabase
      .from('market_data')
      .select('product_table, product_id, price_usd')
      .eq('condition', 'New')
      .range(offset, offset + PAGE - 1)
    if (error) break
    for (const row of data || []) {
      if (row.price_usd == null) continue
      const key = `${row.product_table}-${row.product_id}`
      if (map[key] == null || row.price_usd < map[key]) map[key] = row.price_usd
    }
    if (!data || data.length < PAGE) break
    offset += PAGE
  }

  // Legacy retail_prices (B&H seeded data) — fill gaps not in market_data
  const { data: legacy } = await supabase
    .from('retail_prices')
    .select('product_table, product_id, price')
  for (const row of legacy || []) {
    if (row.price == null) continue
    const key = `${row.product_table}-${row.product_id}`
    if (map[key] == null || row.price < map[key]) map[key] = row.price
  }

  return map
}

// ─── Lowest used prices (for ProductCard "Used $X" badge) ────────
// Reads from market_data where condition = 'Used' (KEH, MPB, etc.)
export async function fetchLowestUsedPrices() {
  const map = {}
  const PAGE = 1000
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('market_data')
      .select('product_table, product_id, price_usd')
      .eq('condition', 'Used')
      .range(offset, offset + PAGE - 1)
    if (error) return map
    for (const row of data || []) {
      if (row.price_usd == null) continue
      const key = `${row.product_table}-${row.product_id}`
      if (map[key] == null || row.price_usd < map[key]) map[key] = row.price_usd
    }
    if (!data || data.length < PAGE) break
    offset += PAGE
  }
  return map
}

// ─── Retailer counts per product (for homepage ≥3-retailer filter) ──
// Returns { [productKey]: distinctRetailerCount } where productKey = `${table}-${id}`
export async function fetchRetailerCounts() {
  const PAGE = 1000
  let rows = []
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('market_data')
      .select('product_table, product_id, retailer_id')
      .range(offset, offset + PAGE - 1)
    if (error) return {}
    rows = rows.concat(data || [])
    if (!data || data.length < PAGE) break
    offset += PAGE
  }
  const sets = {}
  for (const row of rows) {
    const key = `${row.product_table}-${row.product_id}`
    if (!sets[key]) sets[key] = new Set()
    sets[key].add(row.retailer_id)
  }
  const result = {}
  for (const [key, s] of Object.entries(sets)) result[key] = s.size
  return result
}

// ─── Lowest rental rates by currency (for ProductCard "rent $X/day") ─
// currency param matches rental_entries.currency (USD / GBP / AUD / etc.)
export async function fetchLowestRentalRates(currency = 'USD') {
  const { data, error } = await supabase
    .from('rental_entries')
    .select('category, db_id, daily_rate')
    .eq('available', true)
    .eq('currency', currency)

  if (error) return {}
  const map = {}
  for (const row of data || []) {
    if (row.daily_rate == null) continue
    const key = `${row.category}-${row.db_id}`
    const rate = Number(row.daily_rate)
    if (map[key] == null || rate < map[key]) map[key] = rate
  }
  return map
}

export function getSpecColumns(category) {
  return SPEC_COLUMNS[category] || []
}

export { SPEC_COLUMNS, SUBCATEGORIES, SPEC_LABELS, SPEC_UNITS }
