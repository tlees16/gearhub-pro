/**
 * Server-side Supabase helpers.
 * Only imported by Server Components and API routes — never bundled for the browser.
 * Using service-role key directly (matches src/services/supabase.js pattern).
 * Switch to env-var anon key + RLS once Row Level Security is configured.
 */
import { createClient } from '@supabase/supabase-js'
import type { RetailPrice, UsedPrice, RentalEntry, VariantGroup } from '@/types/gear'
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
  const [category, rawId] = productId.split('-')
  const dbId = Number(rawId)
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
export async function fetchVariantGroup(
  category: string,
  baseModel: string,
  brand: string,
  currentId: number,
): Promise<{ variants: VariantGroup[]; bestPhotometrics: string | null }> {
  const db = getClient()

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

  // Find the variant with the richest photometric data
  let bestPhotometrics: string | null = null
  let bestCount = 0
  for (const r of filtered) {
    const candidates = [
      (r.photometrics as string | null),
      ((r.specs_json as Record<string, string> | null)?.Photometrics ?? null),
    ]
    for (const s of candidates) {
      const n = countPhotometricMeasurements(s)
      if (n > bestCount) {
        bestCount = n
        bestPhotometrics = s!
      }
    }
  }

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
