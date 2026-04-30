import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ChevronRight,
  ChevronLeft,
  Package,
  Clock,
  Camera,
  Aperture,
  Zap,
} from 'lucide-react'

import { fetchProductById, fetchPrices, fetchVariantGroup, fetchAnalysis } from '@/lib/supabase-server'
import type { RetailPrice } from '@/types/gear'
import { stripProductVariant } from '@/lib/variant'
import PriceTable from './PriceTable'
import CategoryLink from './CategoryLink'
import ExpertAnalysisSection from './ExpertAnalysisSection'
import ProductActions from './ProductActions'
import CommunityHub from './CommunityHub'
import PhotometricTable from './PhotometricTable'

// ─── hero spec whitelist ──────────────────────────────────────────────────────

const HERO_SPEC_KEYS: Record<string, string[]> = {
  cameras: [
    'sensor_size', 'sensor_type', 'max_video_resolution', 'dynamic_range_stops',
    'lens_mount', 'megapixels', 'continuous_fps', 'bit_depth', 'weight_g',
    'ibis', 'weather_sealed', 'recording_media',
  ],
  lenses: [
    'focal_length', 'max_aperture', 'lens_mount', 'filter_size',
    'weight_g', 'focus_type', 'image_stabilization',
  ],
  lighting: [
    'item_type', 'power_draw_w', 'color_type', 'cri', 'output_lux',
    'beam_angle', 'color_temp_range', 'weight_g', 'cooling', 'battery_option',
  ],
}

const SPEC_LABEL_OVERRIDES: Record<string, string> = {
  cri:             'CRI',
  tlci:            'TLCI',
  output_lux:      'Output (Lux)',
  beam_angle:      'Beam Angle',
  power_draw_w:    'Power Draw',
  color_temp_range:'Color Temp',
  color_accuracy_standard: 'CRI / TLCI',
  max_video_resolution:    'Max Resolution',
  dynamic_range_stops:     'Dynamic Range',
  lens_mount:      'Lens Mount',
  sensor_size:     'Sensor Size',
  sensor_type:     'Sensor Type',
  lumens:          'Lumens',
  lumen_output:    'Lumen Output',
  photometrics:    'Photometrics',
  photometrics_at_3_3_1_m: 'Photometrics (3.3m / 1m)',
}


// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtPrice(price: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

function categoryLabel(cat: string) {
  const map: Record<string, string> = {
    cameras: 'Cameras',
    lenses: 'Lenses',
    lighting: 'Lighting',
    drones: 'Drones',
    gimbals: 'Gimbals',
    sd_cards: 'SD Cards',
    lighting_accessories: 'Lighting Accessories',
    tripods: 'Tripods',
  }
  return map[cat] ?? cat
}

const CATEGORY_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  cameras: Camera,
  lenses: Aperture,
  lighting: Zap,
}

// ─── metadata ────────────────────────────────────────────────────────────────

export async function generateProductMetadata(productId: string) {
  const raw = await fetchProductById(productId)
  if (!raw) return {}
  return {
    title: `${raw.name} — Prices, Specs & Rentals | GearHub`,
    description: `Compare new, used & rental prices for the ${raw.name}. Live data from B&H, Adorama, KEH, MPB, eBay and more.`,
    openGraph: {
      title: `${raw.name} | GearHub`,
      images: raw.image_url ? [raw.image_url] : [],
    },
  }
}

// ─── component ───────────────────────────────────────────────────────────────

export default async function ProductPage({ productId }: { productId: string }) {
  const [category, rawDbId] = productId.split('-')
  const dbId = Number(rawDbId)

  if (!category || isNaN(dbId)) notFound()

  const rawProduct = await fetchProductById(productId)
  if (!rawProduct) notFound()

  const { baseModel, configLabel } = stripProductVariant(rawProduct.name, category)

  const [{ retail, used }, { variants, bestPhotometrics }, storedAnalysis] = await Promise.all([
    fetchPrices(category, dbId),
    fetchVariantGroup(category, baseModel, (rawProduct.brand as string) ?? '', dbId),
    fetchAnalysis(category, dbId),
  ])

  const specsJson: Record<string, unknown> =
    typeof rawProduct.specs_json === 'object' && rawProduct.specs_json !== null
      ? (rawProduct.specs_json as Record<string, unknown>)
      : {}
  // allSpecs (with specs_json) — used for hero chips and expert analysis prompt
  const allSpecs: Record<string, unknown> = { ...specsJson }
  for (const [k, v] of Object.entries(rawProduct)) {
    if (
      v !== null &&
      v !== undefined &&
      !['id', 'specs_json', 'scraped_at', 'bhphoto_url', 'image_url'].includes(k)
    ) {
      allSpecs[k] = v
    }
  }

  // displaySpecs — Full Specs table only: direct columns, no specs_json duplicates, no metadata
  const FULL_SPEC_EXCLUDE = new Set([
    'id', 'specs_json', 'scraped_at', 'bhphoto_url', 'image_url',
    'name', 'brand', 'price', 'category', 'subcategory', 'form_factor',
    'bhphoto_sku', 'created_at',
    // photometrics shown in dedicated Photometrics section
    'photometrics', 'photometrics_at_3_3_1_m', 'output_lux', 'beam_angle',
    'cri', 'tlci', 'lumens', 'lumen_output', 'color_accuracy_standard',
  ])
  const displaySpecs: Array<[string, string | number | boolean]> = []
  for (const [k, v] of Object.entries(rawProduct)) {
    if (FULL_SPEC_EXCLUDE.has(k)) continue
    if (v === null || v === undefined || v === '' || String(v).trim() === 'N/A') continue
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      displaySpecs.push([k, v])
    }
  }

  const msrp: number = rawProduct.price ?? 0

  // Always inject B&H as a retail source — its price is on the product row, not in retail_prices.
  // Also strip any junk B&H kit-variant rows that the scraper may have written (e.g. "B&H Photo (Starter Pack)").
  const cleanedRetail = retail.filter((r) => !r.retailer.startsWith('B&H'))
  const bhEntry: RetailPrice | null =
    rawProduct.price && rawProduct.bhphoto_url
      ? {
          retailer: 'B&H Photo',
          price: rawProduct.price as number,
          currency: 'USD',
          inStock: true,
          url: rawProduct.bhphoto_url as string,
        }
      : null
  const allRetail: RetailPrice[] = bhEntry ? [bhEntry, ...cleanedRetail] : cleanedRetail

  const lowestNew = allRetail.length > 0 ? Math.min(...allRetail.map((r) => r.price)) : msrp
  const lowestUsed = used.length > 0 ? Math.min(...used.map((u) => u.price_avg)) : undefined

  // Key specs for hero grid — whitelist-driven, max 6
  const heroSpecKeys = HERO_SPEC_KEYS[category] ?? []
  const heroSpecs: Array<[string, unknown]> = []
  for (const key of heroSpecKeys) {
    const val = allSpecs[key]
    if (val !== null && val !== undefined && val !== '' && val !== 'N/A') {
      heroSpecs.push([key, val])
    }
    if (heroSpecs.length >= 6) break
  }

  const CatIcon = CATEGORY_ICON[category]

  // Serialise allSpecs for the client ExpertAnalysisSection (strip non-serialisable values)
  const specsForClient: Record<string, string | number | boolean | null> = {}
  for (const [k, v] of Object.entries(allSpecs)) {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null) {
      specsForClient[k] = v
    } else if (v !== undefined) {
      specsForClient[k] = String(v)
    }
  }

  // If a variant has richer photometric data, use that for the PhotometricTable
  if (bestPhotometrics) {
    specsForClient['photometrics'] = bestPhotometrics
    specsForClient['Photometrics'] = bestPhotometrics
  }

  return (
    <>
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: rawProduct.name,
            brand: { '@type': 'Brand', name: rawProduct.brand },
            image: rawProduct.image_url,
            offers: {
              '@type': 'AggregateOffer',
              lowPrice: lowestNew,
              highPrice: msrp,
              priceCurrency: 'USD',
              offerCount: allRetail.length + used.length,
            },
          }),
        }}
      />

      <div className="h-full overflow-y-auto bg-slate-950 text-slate-100 pb-10">

        {/* ── breadcrumb nav ─────────────────────────────────────────────── */}
        <nav
          aria-label="Breadcrumb"
          className="sticky top-0 z-40 flex items-center gap-3 px-4 py-2 border-b border-slate-800/40 bg-slate-950/90 backdrop-blur-xl"
        >
          {/* Back to home — prominent on mobile */}
          <Link
            href="/"
            className="flex items-center gap-1.5 shrink-0 text-[12px] font-medium text-slate-400 hover:text-slate-100 transition-colors min-h-[40px] md:min-h-0 pr-2"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>

          <span className="text-slate-800 hidden sm:block">|</span>

          {/* Breadcrumb — desktop only */}
          <ol className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-600 min-w-0 overflow-hidden" role="list">
            <li>
              <CategoryLink category={category} className="hover:text-slate-300 transition-colors">
                {categoryLabel(category)}
              </CategoryLink>
            </li>
            <li aria-hidden><ChevronRight className="w-3 h-3" /></li>
            <li className="text-slate-400 truncate max-w-[240px]">{rawProduct.name}</li>
          </ol>

          {/* Product name — mobile only (truncated) */}
          <span className="sm:hidden text-[12px] text-slate-400 truncate flex-1">{rawProduct.name}</span>

          <div className="ml-auto hidden sm:flex items-center gap-3 text-[10px] text-slate-600 flex-shrink-0">
            {lowestNew < msrp && (
              <span className="text-emerald-400/70">From {fmtPrice(lowestNew)}</span>
            )}
          </div>
        </nav>

        {/* ── main content ───────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
          {/*
            Grid strategy:
            Mobile: hero → expert analysis → prices → specs
            Desktop: [hero | prices sidebar] then expert analysis / specs in left col
            Aside uses DOM order 3rd + lg:col-start-2 lg:row-start-1 to stay col-2 on desktop
          */}
          <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1fr_360px]">

            {/* ── HERO: image + product info ─────────────────────────────── */}
            <section className="lg:col-start-1">
              <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 lg:gap-10 items-start">

                {/* product image */}
                <div className="w-full sm:w-[280px] lg:w-[320px] xl:w-[360px] shrink-0 mx-auto sm:mx-0">
                  <div className="aspect-square rounded-2xl bg-slate-900/40 border border-slate-800/30 overflow-hidden flex items-center justify-center ring-1 ring-slate-800/20">
                    {rawProduct.image_url ? (
                      <Image
                        src={rawProduct.image_url}
                        alt={rawProduct.name}
                        width={360}
                        height={360}
                        priority
                        className="w-full h-full object-contain p-6 sm:p-8"
                      />
                    ) : (
                      <Package className="w-16 h-16 text-slate-800" />
                    )}
                  </div>
                </div>

                {/* product info */}
                <div className="flex-1 min-w-0 pt-0 sm:pt-2">

                  {/* Brand — prominent, above the title */}
                  <p className="text-base font-semibold text-slate-100 mb-1 tracking-tight">
                    {rawProduct.brand}
                  </p>

                  <div className="flex items-center gap-2 mb-2">
                    {CatIcon && <CatIcon size={12} className="text-indigo-400/70" />}
                    <span className="text-[10px] uppercase tracking-widest text-indigo-400/60 font-semibold">
                      {categoryLabel(category)}
                    </span>
                    {rawProduct.subcategory && (
                      <>
                        <span className="text-slate-700">·</span>
                        <CategoryLink
                          category={category}
                          subcategory={rawProduct.subcategory}
                          className="text-[10px] uppercase tracking-widest text-slate-600 hover:text-slate-400 transition-colors font-semibold"
                        >
                          {rawProduct.subcategory}
                        </CategoryLink>
                      </>
                    )}
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-50 leading-tight">
                    {baseModel || rawProduct.name}
                  </h1>
                  {configLabel && (
                    <p className="text-[13px] text-slate-500 font-mono mt-1 tracking-tight">{configLabel}</p>
                  )}

                  {/* MSRP */}
                  <div className="mt-5">
                    <p className={`text-3xl font-bold tabular-nums tracking-tight ${msrp ? 'text-emerald-400' : 'text-amber-400/70'}`}>
                      {msrp ? fmtPrice(msrp) : 'Price on Request'}
                    </p>
                    {lowestNew < msrp && (
                      <p className="text-[12px] text-slate-500 font-light mt-0.5">
                        From{' '}
                        <span className="text-emerald-400 font-medium">{fmtPrice(lowestNew)}</span>
                        {' '}at other retailers
                      </p>
                    )}
                    {lowestUsed !== undefined && (
                      <p className="text-[12px] text-slate-500 font-light">
                        Used from{' '}
                        <span className="text-amber-400 font-medium">{fmtPrice(lowestUsed)}</span>
                      </p>
                    )}
                  </div>

                  {/* Key specs */}
                  {heroSpecs.length > 0 && (
                    <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-3">
                      {heroSpecs.map(([key, val]) => (
                        <div key={key} className="flex items-start justify-between gap-2 border-b border-slate-800/40 pb-2.5">
                          <span className="text-[11px] text-slate-500 font-light shrink-0">
                            {SPEC_LABEL_OVERRIDES[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          </span>
                          <span className="text-[12px] font-medium text-slate-200 text-right tabular-nums">
                            {String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}


                  {/* Action buttons — client component */}
                  <ProductActions productId={productId} />
                </div>
              </div>
            </section>

            {/* ── EXPERT ANALYSIS (client component) ─────────────────────── */}
            <ExpertAnalysisSection
              productId={productId}
              productName={rawProduct.name}
              brand={rawProduct.brand ?? ''}
              category={category}
              subcategory={rawProduct.subcategory ?? null}
              price={msrp}
              allSpecs={specsForClient}
              storedAnalysis={storedAnalysis}
              className="lg:col-start-1"
            />

            {/* ── PRICES ASIDE — col-2 on desktop, inline after expert analysis on mobile ── */}
            <aside className="space-y-4 lg:col-start-2 lg:row-start-1 lg:row-span-3">
              <div className="lg:sticky lg:top-[49px] space-y-4">

                {/* Price summary */}
                <div className="bg-slate-900/30 border border-slate-800/25 rounded-2xl overflow-hidden">
                  <div className="px-5 py-3.5 flex items-baseline justify-between border-b border-slate-800/25">
                    <span className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">Lowest New</span>
                    <span className="text-xl font-bold tabular-nums text-emerald-400">{fmtPrice(lowestNew)}</span>
                  </div>
                  {lowestUsed !== undefined && (
                    <div className="px-5 py-3 flex items-baseline justify-between">
                      <span className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">Lowest Used</span>
                      <span className="text-xl font-bold tabular-nums text-amber-400">{fmtPrice(lowestUsed)}</span>
                    </div>
                  )}
                </div>

                {/* price comparison table */}
                <PriceTable
                  retail={allRetail}
                  used={used}
                  msrp={msrp}
                  variantGroups={variants.length > 1 ? variants : undefined}
                />

                {/* market context */}
                {(allRetail.length > 0 || used.length > 0) && (
                  <div className="border border-slate-800/25 rounded-2xl bg-slate-900/30 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-800/30">
                      <span className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
                        Market Context
                      </span>
                    </div>
                    <dl className="divide-y divide-slate-800/30">
                      {lowestNew < msrp && (
                        <ContextRow
                          label="Best New Price"
                          value={fmtPrice(lowestNew)}
                          delta={`-${Math.round(((msrp - lowestNew) / msrp) * 100)}% vs MSRP`}
                          positive
                        />
                      )}
                      {lowestUsed !== undefined && (
                        <ContextRow
                          label="Best Used Price"
                          value={fmtPrice(lowestUsed)}
                          delta={`-${Math.round(((msrp - lowestUsed) / msrp) * 100)}% vs MSRP`}
                          positive
                        />
                      )}
                      {used.length > 0 && (
                        <ContextRow label="Used Platforms" value={String(used.length)} />
                      )}
                    </dl>
                  </div>
                )}

                <div className="flex items-center gap-1.5 px-1">
                  <Clock className="w-3 h-3 text-slate-700" />
                  <span className="text-[10px] text-slate-700">
                    Prices refreshed every 6h from live scrapers
                  </span>
                </div>
              </div>
            </aside>

            {/* ── PHOTOMETRICS (lighting only) ────────────────────────────── */}
            <div className="lg:col-start-1">
              <PhotometricTable product={{ category, allSpecs: specsForClient }} />
            </div>

            {/* ── FULL SPECIFICATIONS ─────────────────────────────────────── */}
            {displaySpecs.length > 0 && (
              <div className="bg-slate-900/30 border border-slate-800/25 rounded-2xl overflow-hidden lg:col-start-1">
                <div className="px-5 sm:px-6 py-4 border-b border-slate-800/25">
                  <span className="text-sm font-bold text-slate-100 tracking-tight">Full Specifications</span>
                </div>
                <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 sm:gap-x-12">
                    {displaySpecs.map(([key, val]) => {
                      const label = SPEC_LABEL_OVERRIDES[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                      const strVal = String(val)
                      const isLong = strVal.length > 50
                      return (
                        <div key={key} className={`flex gap-4 border-b border-slate-800/25 py-2.5 ${isLong ? 'flex-col sm:col-span-2' : 'items-start justify-between'}`}>
                          <span className="text-[11px] text-slate-500 font-light shrink-0">{label}</span>
                          <span className={`text-[11px] text-slate-300 ${isLong ? 'leading-relaxed' : 'text-right'}`}>{strVal}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* ── COMMUNITY HUB — full width below grid ──────────────────── */}
          <div className="mt-5 sm:mt-6">
            <CommunityHub productId={productId} productName={rawProduct.name} />
          </div>
        </div>
      </div>

    </>
  )
}

// ─── sub-components ───────────────────────────────────────────────────────────

function ContextRow({
  label, value, delta, positive,
}: {
  label: string
  value: string
  delta?: string
  positive?: boolean
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className="flex items-center gap-2 tabular-nums">
        <span className="text-[12px] font-semibold text-slate-200">{value}</span>
        {delta && (
          <span className={`text-[10px] font-medium ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
            {delta}
          </span>
        )}
      </dd>
    </div>
  )
}
