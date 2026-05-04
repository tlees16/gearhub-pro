/**
 * Server-side Supabase helpers.
 * Only imported by Server Components and API routes — never bundled for the browser.
 * Using service-role key directly (matches src/services/supabase.js pattern).
 * Switch to env-var anon key + RLS once Row Level Security is configured.
 */
import { createClient } from '@supabase/supabase-js'
import type { RetailPrice, UsedPrice, RentalEntry, VariantGroup, CompatibleLens, CompatibleLight } from '@/types/gear'
import { stripProductVariant, countPhotometricMeasurements } from '@/lib/variant'

const SUPABASE_URL = 'https://lzkdewuwrshiqjjndszx.supabase.co'
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6a2Rld3V3cnNoaXFqam5kc3p4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTYxNDk1MywiZXhwIjoyMDkxMTkwOTUzfQ.ZKwzCTeJ66gyYZVifjy-wuxk8unk3BnSeQ4YcHcXRD0'

function getClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  })
}

export async function fetchProductById(productId: string) {
  const idx = productId.lastIndexOf('-')
  const category = productId.slice(0, idx)
  const dbId = Number(productId.slice(idx + 1))
  if (!category || isNaN(dbId)) return null

  const { data, error } = await getClient()
    .from(category)
    .select('*')
    .eq('id', dbId)
    .single()

  if (error || !data) return null
  return { ...data, category }
}

export async function fetchPrices(
  category: string,
  dbId: number,
): Promise<{ retail: RetailPrice[]; used: UsedPrice[] }> {
  const db = getClient()

  const [usedAggResult, marketResult] = await Promise.all([
    // Aggregate used-market stats (KEH, MPB, etc. — separate scraper)
    db
      .from('used_prices')
      .select(
        'platform, condition, price_avg, price_min, price_max, price_median, currency, listing_count, scraped_at',
      )
      .eq('product_table', category)
      .eq('product_id', dbId)
      .order('price_avg', { ascending: true }),
    // Per-retailer market data with live URLs
    db
      .from('market_data')
      .select('url, price_usd, currency, in_stock, condition, last_checked, retailers(Retailer_Name)')
      .eq('product_table', category)
      .eq('product_id', dbId)
      .order('price_usd', { ascending: true }),
  ])

  const retail: RetailPrice[] = []
  const used: UsedPrice[] = (usedAggResult.data ?? []).map((r: Record<string, unknown>) => ({
    platform: r.platform as string,
    condition: r.condition as UsedPrice['condition'],
    price_avg: r.price_avg as number,
    price_min: r.price_min as number | undefined,
    price_max: r.price_max as number | undefined,
    price_median: r.price_median as number | undefined,
    currency: (r.currency as string) ?? 'USD',
    listing_count: (r.listing_count as number) ?? 0,
    scraped_at: r.scraped_at as string | undefined,
  }))

  for (const row of (marketResult.data ?? []) as Record<string, unknown>[]) {
    const retailerName =
      (row.retailers as { Retailer_Name?: string } | null)?.Retailer_Name ?? 'Unknown'
    const isNew = (row.condition as string) === 'New'
    if (isNew) {
      retail.push({
        retailer: retailerName,
        price: row.price_usd as number,
        currency: (row.currency as string) ?? 'USD',
        inStock: (row.in_stock as boolean) ?? false,
        url: row.url as string | undefined,
        scraped_at: row.last_checked as string | undefined,
      })
    } else {
      used.push({
        platform: retailerName,
        condition: row.condition as UsedPrice['condition'],
        price_avg: row.price_usd as number,
        currency: (row.currency as string) ?? 'USD',
        listing_count: 1,
        url: row.url as string | undefined,
        scraped_at: row.last_checked as string | undefined,
      })
    }
  }

  // retail is already sorted by price_usd ASC from the DB; used aggregates come first then individual used listings
  used.sort((a, b) => a.price_avg - b.price_avg)

  return { retail, used }
}

// Fetches all variants of the same base model (including the current product).
// Returns empty array if no variants exist (product is standalone).
//
// For lighting: uses the explicit variant_group DB column (populated by clean_lighting_names.cjs).
// For cameras and other categories: falls back to name-prefix matching + stripProductVariant.
export async function fetchVariantGroup(
  category: string,
  baseModel: string,
  brand: string,
  currentId: number,
): Promise<{ variants: VariantGroup[]; bestPhotometrics: string | null }> {
  const db = getClient()

  // ── Lighting: use the explicit variant_group column ──────────────────────
  if (category === 'lighting') {
    const { data: current } = await db
      .from('lighting')
      .select('id, variant_group, clean_name, name, price, bhphoto_url, photometrics, specs_json')
      .eq('id', currentId)
      .single()

    const variantGroup = current?.variant_group
    if (!variantGroup) return { variants: [], bestPhotometrics: null }

    const { data: siblings } = await db
      .from('lighting')
      .select('id, variant_label, clean_name, name, price, bhphoto_url, photometrics, specs_json')
      .eq('variant_group', variantGroup)
      .order('price', { ascending: true })

    if (!siblings || siblings.length <= 1) return { variants: [], bestPhotometrics: null }

    const variants: VariantGroup[] = await Promise.all(
      siblings.map(async (r) => {
        const { retail, used } = await fetchPrices(category, r.id)
        const cleanedRetail = retail.filter((rp) => !rp.retailer.startsWith('B&H'))
        if (r.price && r.bhphoto_url) {
          cleanedRetail.unshift({
            retailer: 'B&H Photo',
            price: r.price as number,
            currency: 'USD',
            inStock: true,
            url: r.bhphoto_url as string,
          })
        }
        return {
          id: r.id,
          name: r.clean_name || r.name,
          configLabel: (r.variant_label as string | null) || r.clean_name || r.name,
          isCurrent: r.id === currentId,
          retail: cleanedRetail,
          used,
        }
      }),
    )

    // Sort: cheapest first, current variant highlighted
    variants.sort((a, b) => {
      const ap = Math.min(...(a.retail.map(r => r.price).filter(Boolean)), Infinity)
      const bp = Math.min(...(b.retail.map(r => r.price).filter(Boolean)), Infinity)
      return ap - bp
    })

    const bestPhotometrics = _pickBestPhotometrics(siblings)
    return { variants, bestPhotometrics }
  }

  // ── Cameras / other categories: name-prefix matching ─────────────────────
  const { data: rows } = await db
    .from(category)
    .select('id, name, price, bhphoto_url, photometrics, specs_json')
    .eq('brand', brand)
    .ilike('name', `${baseModel}%`)

  if (!rows) return { variants: [], bestPhotometrics: null }

  // Only keep rows whose stripped baseModel matches — prevents kits/bundles like
  // "X with Case" from being grouped with the standalone "X"
  const filtered = rows.filter((r) => {
    if (r.name !== baseModel && !r.name.startsWith(baseModel + ' ')) return false
    const { baseModel: rBase } = stripProductVariant(r.name, category)
    return rBase === baseModel
  })

  // A single match means no real variants — the current product is the only one
  if (filtered.length <= 1) return { variants: [], bestPhotometrics: null }

  // Fetch prices for all variants in parallel
  const variants: VariantGroup[] = await Promise.all(
    filtered.map(async (r) => {
      const { retail, used } = await fetchPrices(category, r.id)
      const { configLabel } = stripProductVariant(r.name, category)
      // Inject B&H from product row (retail_prices table doesn't store B&H)
      const cleanedRetail = retail.filter((rp) => !rp.retailer.startsWith('B&H'))
      if (r.price && r.bhphoto_url) {
        cleanedRetail.unshift({
          retailer: 'B&H Photo',
          price: r.price as number,
          currency: 'USD',
          inStock: true,
          url: r.bhphoto_url as string,
        })
      }
      return {
        id: r.id,
        name: r.name,
        configLabel: configLabel || r.name,
        isCurrent: r.id === currentId,
        retail: cleanedRetail,
        used,
      }
    }),
  )

  const bestPhotometrics = _pickBestPhotometrics(filtered)

  // Sort: current variant first, then by cheapest retail price
  variants.sort((a, b) => {
    if (a.isCurrent && !b.isCurrent) return -1
    if (!a.isCurrent && b.isCurrent) return 1
    const ap = a.retail[0]?.price ?? Infinity
    const bp = b.retail[0]?.price ?? Infinity
    return ap - bp
  })

  return { variants, bestPhotometrics }
}

function _pickBestPhotometrics(rows: Array<{ photometrics?: unknown; specs_json?: unknown }>): string | null {
  let best: string | null = null
  let bestCount = 0
  for (const r of rows) {
    for (const s of [(r.photometrics as string | null), ((r.specs_json as Record<string, string> | null)?.Photometrics ?? null)]) {
      const n = countPhotometricMeasurements(s)
      if (n > bestCount) { bestCount = n; best = s! }
    }
  }
  return best
}

export interface StoredAnalysis {
  description: string
  pros: string[]
  cons: string[]
  communityVoice: string | null
  verdict: number
}

export async function fetchAnalysis(
  category: string,
  dbId: number,
): Promise<StoredAnalysis | null> {
  const { data } = await getClient()
    .from('product_analysis')
    .select('geo_optimized_verdict, pros, cons, community_insights, gearhub_score')
    .eq('product_table', category)
    .eq('product_id', dbId)
    .maybeSingle()

  if (!data) return null
  return {
    description:    data.geo_optimized_verdict as string,
    pros:           (data.pros as string[]) ?? [],
    cons:           (data.cons as string[]) ?? [],
    communityVoice: (data.community_insights as string) || null,
    verdict:        (data.gearhub_score as number) ?? 75,
  }
}

export async function fetchRentals(
  category: string,
  dbId: number,
): Promise<RentalEntry[]> {
  const { data } = await getClient()
    .from('rental_entries')
    .select('*')
    .eq('category', category)
    .eq('db_id', dbId)
    .eq('available', true)
    .order('daily_rate', { ascending: true })

  return data ?? []
}

// ── Compatible Lenses ─────────────────────────────────────────────────────────

// Extract canonical native mount name(s) from raw B&H lens_mount strings.
// Rules (V1.0 — native-only, no adapter chasing):
//   "Interchangeable Mount with Included X[/Y]" → [X, Y]
//   "X with Included ..."                       → [X]  (included item is an adapter/accessory)
//   "X"                                         → [X]
function extractNativeMounts(raw: string): string[] {
  if (!raw) return []
  const trimmed = raw.trim()

  const interchangeMatch = trimmed.match(/^Interchangeable Mount(?:\s+with\s+Included\s+(.+))?$/i)
  if (interchangeMatch) {
    if (!interchangeMatch[1]) return []
    return interchangeMatch[1].split('/').map((s) => s.trim()).filter(Boolean)
  }

  const withIncludedMatch = trimmed.match(/^(.+?)\s+with\s+Included\s+.+/i)
  if (withIncludedMatch) return [withIncludedMatch[1].trim()]

  return [trimmed]
}

// Numeric rank: higher = larger sensor/coverage.
// Lens coverage rank must be >= camera sensor rank to avoid vignetting.
function normSensorRank(sensorSize: string | null): number {
  if (!sensorSize) return 0
  const s = sensorSize.toLowerCase()
  if (s.includes('medium format')) return 5
  if (s.includes('large format')) return 4
  if (s.includes('full') || s.includes('full-frame')) return 3
  if (s.includes('vistavision') || s.includes('vista vision')) return 3
  if (s.includes('super35') || s.includes('super 35') || s.includes('aps-c')) return 2
  if (s.includes('four thirds') || s.includes('mft') || s.includes('micro four')) return 1
  return 0
}

function normCoverageRank(coverage: string | null): number {
  if (!coverage) return 99 // unknown — do not filter out
  const s = coverage.toLowerCase()
  if (s.includes('medium format')) return 5
  if (s.includes('large format') || s.includes('65 mm format')) return 4
  if (s.startsWith('full') || s.includes('full-frame')) return 3
  if (s.startsWith('vistavision') || s.includes('vista vision')) return 3
  if (s.startsWith('super35') || s.startsWith('aps-c') || s.includes('super35')) return 2
  if (s.includes('four thirds') || s.includes('mft') || s.includes('micro four')) return 1
  return 99
}

export async function fetchCompatibleLenses(
  rawCameraMount: string,
  cameraSensorSize: string | null,
  limit = 12,
): Promise<{ lenses: CompatibleLens[]; totalCount: number; nativeMounts: string[] }> {
  const db = getClient()
  const nativeMounts = extractNativeMounts(rawCameraMount)
  if (nativeMounts.length === 0) return { lenses: [], totalCount: 0, nativeMounts: [] }

  const cameraRank = normSensorRank(cameraSensorSize)

  // Gather all matching lenses, deduplicated by DB id.
  // Two pass per mount: exact eq match + lenses with interchangeable mounts that include this mount.
  const lensMap = new Map<number, Record<string, unknown>>()
  await Promise.all(
    nativeMounts.map(async (mount) => {
      const [exactRes, interchangeRes] = await Promise.all([
        db
          .from('lenses')
          .select('id, name, brand, price, image_url, lens_mount, focal_length, max_aperture, specs_json')
          .eq('lens_mount', mount),
        db
          .from('lenses')
          .select('id, name, brand, price, image_url, lens_mount, focal_length, max_aperture, specs_json')
          .ilike('lens_mount', `Interchangeable%${mount}%`),
      ])
      for (const row of [...(exactRes.data ?? []), ...(interchangeRes.data ?? [])]) {
        const r = row as Record<string, unknown>
        lensMap.set(r.id as number, r)
      }
    }),
  )

  if (lensMap.size === 0) return { lenses: [], totalCount: 0, nativeMounts }

  // Filter by sensor format coverage: lens coverage rank must be >= camera sensor rank
  const eligible = [...lensMap.values()].filter((lens) => {
    const coverage =
      (lens.specs_json as Record<string, string> | null)?.['Lens Format Coverage'] ?? null
    const rank = normCoverageRank(coverage)
    return rank === 99 || rank >= cameraRank
  })

  if (!eligible.length) return { lenses: [], totalCount: 0, nativeMounts }

  // Fetch lowest new prices from market_data in a single batch query
  const dbIds = eligible.map((l) => l.id as number)
  const { data: priceRows } = await db
    .from('market_data')
    .select('product_id, price_usd')
    .eq('product_table', 'lenses')
    .eq('condition', 'New')
    .in('product_id', dbIds)

  const priceMap: Record<number, number> = {}
  for (const p of priceRows ?? []) {
    if (p.price_usd == null) continue
    const pid = p.product_id as number
    if (priceMap[pid] == null || (p.price_usd as number) < priceMap[pid]) {
      priceMap[pid] = p.price_usd as number
    }
  }

  // Sort: exact-coverage-tier lenses first (e.g. S35 lenses before FF on an S35 camera),
  // then cheapest within each tier.
  eligible.sort((a, b) => {
    const aCov = normCoverageRank(
      (a.specs_json as Record<string, string> | null)?.['Lens Format Coverage'] ?? null,
    )
    const bCov = normCoverageRank(
      (b.specs_json as Record<string, string> | null)?.['Lens Format Coverage'] ?? null,
    )
    const aExact = aCov === cameraRank || aCov === 99 ? 0 : 1
    const bExact = bCov === cameraRank || bCov === 99 ? 0 : 1
    if (aExact !== bExact) return aExact - bExact
    const ap = priceMap[a.id as number] ?? (a.price as number) ?? Infinity
    const bp = priceMap[b.id as number] ?? (b.price as number) ?? Infinity
    return ap - bp
  })

  const totalCount = eligible.length
  const lenses = eligible.slice(0, limit).map((lens) => {
    const specs = (lens.specs_json as Record<string, string> | null) ?? {}
    const msrp = (lens.price as number | null) ?? null
    return {
      id: `lenses-${lens.id as number}`,
      dbId: lens.id as number,
      name: lens.name as string,
      brand: lens.brand as string,
      msrp,
      lowestPrice: priceMap[lens.id as number] ?? msrp,
      imageUrl: (lens.image_url as string | null) ?? null,
      lensMount: (lens.lens_mount as string | null) ?? null,
      focalLength: (lens.focal_length as string | null) ?? null,
      maxAperture: (lens.max_aperture as string | null) ?? null,
      formatCoverage: specs['Lens Format Coverage'] ?? null,
    }
  })
  return { lenses, totalCount, nativeMounts }
}

// ── Compatible Lights ─────────────────────────────────────────────────────────

const KNOWN_MOUNTS = ['bowens', 'profoto', 'elinchrom', 'broncolor', 'arri', 'dedolight', 'kino', 'hensel', 'balcar', 'photogenic']

function extractMountBrands(s: string): string[] {
  const lower = s.toLowerCase()
  return KNOWN_MOUNTS.filter((m) => lower.includes(m))
}

function extractModelRefs(s: string): string[] {
  const matches = [...s.matchAll(/(?:^|[;:\n])\s*[Ff]or\s+([^\n;:]+)/g)]
  return matches.flatMap((m) =>
    m[1].split(/\s*\/\s*/).map((x) => x.trim()).filter((x) => x.length >= 5),
  )
}

export async function fetchCompatibleLights(
  lightCompatibility: string | null,
  limit = 12,
): Promise<{ lights: CompatibleLight[]; totalCount: number }> {
  if (!lightCompatibility) return { lights: [], totalCount: 0 }
  const db = getClient()

  const mounts = extractMountBrands(lightCompatibility)
  const models = extractModelRefs(lightCompatibility)

  const lightMap = new Map<number, Record<string, unknown>>()

  await Promise.all([
    ...mounts.map(async (mount) => {
      const { data } = await db
        .from('lighting')
        .select('id, name, brand, price, image_url, item_type')
        .ilike('front_accessory_mount', `%${mount}%`)
      for (const row of data ?? []) {
        const r = row as Record<string, unknown>
        lightMap.set(r.id as number, r)
      }
    }),
    ...models.map(async (model) => {
      const { data } = await db
        .from('lighting')
        .select('id, name, brand, price, image_url, item_type')
        .ilike('name', `%${model}%`)
      for (const row of data ?? []) {
        const r = row as Record<string, unknown>
        lightMap.set(r.id as number, r)
      }
    }),
  ])

  if (lightMap.size === 0) return { lights: [], totalCount: 0 }

  const dbIds = [...lightMap.keys()]
  const { data: priceRows } = await db
    .from('market_data')
    .select('product_id, price_usd')
    .eq('product_table', 'lighting')
    .eq('condition', 'New')
    .in('product_id', dbIds)

  const priceMap: Record<number, number> = {}
  for (const p of priceRows ?? []) {
    if (p.price_usd == null) continue
    const pid = p.product_id as number
    if (priceMap[pid] == null || (p.price_usd as number) < priceMap[pid]) {
      priceMap[pid] = p.price_usd as number
    }
  }

  const allLights = [...lightMap.values()]
  const totalCount = allLights.length

  allLights.sort((a, b) => {
    const ap = priceMap[a.id as number] ?? (a.price as number) ?? Infinity
    const bp = priceMap[b.id as number] ?? (b.price as number) ?? Infinity
    return ap - bp
  })

  const lights = allLights.slice(0, limit).map((light) => ({
    id: `lighting-${light.id as number}`,
    dbId: light.id as number,
    name: light.name as string,
    brand: light.brand as string,
    msrp: (light.price as number | null) ?? null,
    lowestPrice: priceMap[light.id as number] ?? (light.price as number | null) ?? null,
    imageUrl: (light.image_url as string | null) ?? null,
    formFactor: (light.item_type as string | null) ?? null,
  }))

  return { lights, totalCount }
}
