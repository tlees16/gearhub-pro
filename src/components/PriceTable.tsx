import { ExternalLink, TrendingDown, RefreshCw } from 'lucide-react'
import type { RetailPrice, UsedPrice, VariantGroup } from '@/types/gear'

function fmtPrice(price: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(price)
}

function fmtDelta(price: number, ref: number) {
  const pct = ((price - ref) / ref) * 100
  return pct > 0 ? `+${pct.toFixed(0)}%` : `${pct.toFixed(0)}%`
}

function fmtAge(iso?: string) {
  if (!iso) return null
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000)
  if (h < 1) return '<1h ago'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const CONDITION_STYLES: Record<string, string> = {
  New:        'bg-slate-700/40 text-slate-300 border-slate-600/40',
  'Like New':  'bg-emerald-950/60 text-emerald-400 border-emerald-800/40',
  Excellent:  'bg-emerald-950/40 text-emerald-500 border-emerald-800/30',
  Good:       'bg-amber-950/60 text-amber-400 border-amber-800/40',
  Fair:       'bg-orange-950/60 text-orange-400 border-orange-800/40',
  Poor:       'bg-red-950/60 text-red-400 border-red-800/40',
}

interface PriceRowData {
  retailer: string
  condition: string
  inStock: boolean
  stockLabel: string
  price: number
  currency: string
  url?: string
  isBest?: boolean
  scraped_at?: string
  listing_count?: number
  configLabel?: string
}

export interface PriceTableProps {
  retail: RetailPrice[]
  used: UsedPrice[]
  msrp?: number
  className?: string
  variantGroups?: VariantGroup[]
}

export default function PriceTable({ retail, used, msrp, className = '', variantGroups }: PriceTableProps) {
  const hasVariants = (variantGroups?.length ?? 0) > 1

  // Build used rows (always from current product's used market)
  const usedRows: PriceRowData[] = [...used]
    .sort((a, b) => a.price_avg - b.price_avg)
    .map((u) => ({
      retailer: u.platform,
      condition: u.condition,
      inStock: u.listing_count > 0,
      stockLabel: `${u.listing_count} listed`,
      price: u.price_avg,
      currency: u.currency,
      url: u.url,
      scraped_at: u.scraped_at,
      listing_count: u.listing_count,
    }))

  if (!hasVariants) {
    // ── Flat mode (no variants) ────────────────────────────────────────────────
    const newRows: PriceRowData[] = [...retail]
      .sort((a, b) => a.price - b.price)
      .map((r) => ({
        retailer: r.retailer,
        condition: 'New',
        inStock: r.inStock,
        stockLabel: r.inStock ? 'In Stock' : 'Out of Stock',
        price: r.price,
        currency: r.currency,
        url: r.url,
        scraped_at: r.scraped_at,
      }))

    if (newRows.length === 0 && usedRows.length === 0) return null

    const allRows = [...newRows, ...usedRows]
    const lowestPrice = Math.min(...allRows.map((r) => r.price))
    allRows.forEach((r) => { r.isBest = r.price === lowestPrice })
    const newRowsMarked = allRows.slice(0, newRows.length)
    const usedRowsMarked = allRows.slice(newRows.length)

    const freshestAt = allRows.map((r) => r.scraped_at).filter(Boolean).sort().at(-1)
    const showDelta = msrp !== undefined && allRows.some((r) => r.price !== msrp)

    return (
      <div className={`rounded-2xl border border-slate-800/25 overflow-hidden bg-slate-900/30 ${className}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/25">
          <span className="text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
            Price Comparison
          </span>
          <div className="flex items-center gap-2 text-[10px] text-slate-600">
            {freshestAt && (
              <span className="flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5" />
                {fmtAge(freshestAt)}
              </span>
            )}
            <span>{allRows.length} sources</span>
          </div>
        </div>

        {newRowsMarked.length > 0 && (
          <>
            <div className="px-4 py-1.5 bg-slate-800/20 border-b border-slate-800/20">
              <span className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
                New — {newRowsMarked.length} retailer{newRowsMarked.length !== 1 ? 's' : ''}
              </span>
            </div>
            {newRowsMarked.map((row, i) => (
              <PriceRow key={`new-${i}`} row={row} showDelta={showDelta} msrp={msrp} />
            ))}
          </>
        )}

        {usedRowsMarked.length > 0 && (
          <>
            <div className="px-4 py-1.5 bg-amber-950/20 border-y border-amber-900/20">
              <span className="text-[10px] font-semibold tracking-widest text-amber-600/80 uppercase">
                Used Market — {usedRowsMarked.length} platform{usedRowsMarked.length !== 1 ? 's' : ''}
              </span>
            </div>
            {usedRowsMarked.map((row, i) => (
              <PriceRow key={`used-${i}`} row={row} showDelta={showDelta} msrp={msrp} />
            ))}
          </>
        )}

        <div className="px-4 py-2 border-t border-slate-800/20 flex items-center gap-2">
          <span className="text-[10px] text-slate-600">Refreshed every 6h · Lowest price first</span>
        </div>
      </div>
    )
  }

  // ── Variant mode ─────────────────────────────────────────────────────────────
  const groups = variantGroups!

  // Find the global lowest price across all variants (for BEST badge)
  const allVariantPrices = groups.flatMap((v) => v.retail.map((r) => r.price))
  const lowestVariantPrice = allVariantPrices.length > 0 ? Math.min(...allVariantPrices) : Infinity

  const allUsedPrices = usedRows.map((r) => r.price)
  const lowestUsedPrice = allUsedPrices.length > 0 ? Math.min(...allUsedPrices) : Infinity
  const globalLowest = Math.min(lowestVariantPrice, lowestUsedPrice)

  const totalSources =
    groups.reduce((s, v) => s + v.retail.length, 0) + usedRows.length

  const allScrapedAts = groups
    .flatMap((v) => v.retail.map((r) => r.scraped_at))
    .concat(usedRows.map((r) => r.scraped_at))
    .filter(Boolean)
    .sort()
  const freshestAt = allScrapedAts.at(-1)
  const showDelta = msrp !== undefined

  return (
    <div className={`rounded-2xl border border-slate-800/25 overflow-hidden bg-slate-900/30 ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/25">
        <span className="text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
          Price Comparison
        </span>
        <div className="flex items-center gap-2 text-[10px] text-slate-600">
          {freshestAt && (
            <span className="flex items-center gap-1">
              <RefreshCw className="w-2.5 h-2.5" />
              {fmtAge(freshestAt)}
            </span>
          )}
          <span>{totalSources} sources</span>
        </div>
      </div>

      {/* New — grouped by retailer, variants nested underneath */}
      {groups.some((v) => v.retail.length > 0) && (() => {
        // Collect all retailers across all variants
        const retailerMap = new Map<string, Array<{ configLabel: string; price: number; currency: string; inStock: boolean; url?: string; scraped_at?: string; isCurrent: boolean }>>()
        for (const vg of groups) {
          for (const r of vg.retail) {
            if (!retailerMap.has(r.retailer)) retailerMap.set(r.retailer, [])
            retailerMap.get(r.retailer)!.push({
              configLabel: vg.configLabel,
              price: r.price,
              currency: r.currency,
              inStock: r.inStock,
              url: r.url,
              scraped_at: r.scraped_at,
              isCurrent: vg.isCurrent,
            })
          }
        }
        // Sort retailers by their cheapest variant price
        const retailerEntries = Array.from(retailerMap.entries()).sort((a, b) => {
          const minA = Math.min(...a[1].map(v => v.price))
          const minB = Math.min(...b[1].map(v => v.price))
          return minA - minB
        })
        const totalRetailers = retailerEntries.length

        return (
          <>
            <div className="px-4 py-1.5 bg-slate-800/20 border-b border-slate-800/20">
              <span className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
                New — {totalRetailers} retailer{totalRetailers !== 1 ? 's' : ''} · {groups.length} configurations
              </span>
            </div>
            {retailerEntries.map(([retailerName, variants]) => {
              const sortedVariants = [...variants].sort((a, b) => a.price - b.price)
              const cheapest = sortedVariants[0]?.price
              const singleVariant = sortedVariants.length === 1

              if (singleVariant) {
                // Only one config at this retailer — flat row with config label as subtitle
                const v = sortedVariants[0]
                const row: PriceRowData = {
                  retailer: retailerName,
                  condition: 'New',
                  inStock: v.inStock,
                  stockLabel: v.inStock ? 'In Stock' : 'Out of Stock',
                  price: v.price,
                  currency: v.currency,
                  url: v.url,
                  scraped_at: v.scraped_at,
                  isBest: v.price === globalLowest,
                  configLabel: v.configLabel,
                }
                return <PriceRow key={retailerName} row={row} showDelta={showDelta} msrp={msrp} />
              }

              // Multiple configs — show retailer header with nested variant rows
              return (
                <div key={retailerName}>
                  <div className="px-4 py-2 flex items-center justify-between bg-slate-900/50 border-b border-slate-800/15">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-slate-800/60 flex items-center justify-center text-[8px] font-bold text-slate-400 shrink-0">
                        {retailerName.slice(0, 3).toUpperCase()}
                      </div>
                      <span className="text-[12px] font-medium text-slate-200">{retailerName}</span>
                      <span className="text-[9px] text-slate-600">{sortedVariants.length} configs</span>
                    </div>
                    {cheapest !== undefined && (
                      <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                        from {fmtPrice(cheapest)}
                      </span>
                    )}
                  </div>
                  {sortedVariants.map((v, i) => (
                    <VariantRow
                      key={i}
                      configLabel={v.configLabel}
                      price={v.price}
                      currency={v.currency}
                      inStock={v.inStock}
                      url={v.url}
                      isBest={v.price === globalLowest}
                      isCurrent={v.isCurrent}
                      showDelta={showDelta}
                      msrp={msrp}
                    />
                  ))}
                </div>
              )
            })}
          </>
        )
      })()}

      {/* Used */}
      {usedRows.length > 0 && (
        <>
          <div className="px-4 py-1.5 bg-amber-950/20 border-y border-amber-900/20">
            <span className="text-[10px] font-semibold tracking-widest text-amber-600/80 uppercase">
              Used Market — {usedRows.length} platform{usedRows.length !== 1 ? 's' : ''}
            </span>
          </div>
          {usedRows.map((row, i) => (
            <PriceRow
              key={`used-${i}`}
              row={{ ...row, isBest: row.price === globalLowest }}
              showDelta={showDelta}
              msrp={msrp}
            />
          ))}
        </>
      )}

      <div className="px-4 py-2 border-t border-slate-800/20 flex items-center gap-2">
        <span className="text-[10px] text-slate-600">Refreshed every 6h · Lowest price first</span>
      </div>
    </div>
  )
}

function PriceRow({ row, showDelta, msrp }: { row: PriceRowData; showDelta: boolean; msrp?: number }) {
  const condStyle = CONDITION_STYLES[row.condition] ?? CONDITION_STYLES['New']

  const nameEl = (
    <div className="flex items-center gap-2 min-w-0">
      {row.isBest && (
        <span className="shrink-0 inline-flex items-center gap-0.5 px-1 py-px rounded bg-emerald-600 text-[9px] font-bold tracking-wider text-white uppercase leading-none">
          <TrendingDown className="w-2.5 h-2.5" />
          BEST
        </span>
      )}
      <span className={`text-[12px] font-medium truncate ${row.isBest ? 'text-slate-100' : 'text-slate-300'}`}>
        {row.retailer}
      </span>
      {row.url && <ExternalLink className="w-3 h-3 text-slate-600 shrink-0" />}
    </div>
  )

  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 border-b border-slate-800/15 last:border-0 ${row.isBest ? 'bg-emerald-950/20' : 'hover:bg-slate-800/20'} transition-colors`}>
      <div className="flex-1 min-w-0">
        {row.url ? (
          <a href={row.url} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
            {nameEl}
          </a>
        ) : nameEl}
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border leading-none ${condStyle}`}>
            {row.condition}
          </span>
          <span className={`text-[10px] ${row.inStock ? 'text-emerald-500' : 'text-slate-600'}`}>
            {row.stockLabel}
          </span>
          {row.configLabel && (
            <span className="text-[10px] text-slate-500 truncate">{row.configLabel}</span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className={`tabular-nums text-[14px] font-bold ${row.isBest ? 'text-emerald-400' : 'text-slate-100'}`}>
          {fmtPrice(row.price, row.currency)}
        </div>
        {showDelta && msrp !== undefined && row.price !== msrp && (
          <div className={`text-[10px] font-medium tabular-nums ${row.price < msrp ? 'text-emerald-500' : 'text-red-400'}`}>
            {fmtDelta(row.price, msrp)} vs MSRP
          </div>
        )}
      </div>
    </div>
  )
}

interface VariantRowProps {
  configLabel: string
  price: number
  currency: string
  inStock: boolean
  url?: string
  isBest: boolean
  isCurrent: boolean
  showDelta: boolean
  msrp?: number
}

function VariantRow({ configLabel, price, currency, inStock, url, isBest, showDelta, msrp }: VariantRowProps) {
  const inner = (
    <div className={`flex items-center gap-2 pl-10 pr-4 py-2 border-b border-slate-800/10 last:border-0 ${isBest ? 'bg-emerald-950/15' : 'hover:bg-slate-800/15'} transition-colors`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {isBest && (
            <span className="shrink-0 inline-flex items-center gap-0.5 px-1 py-px rounded bg-emerald-600 text-[9px] font-bold tracking-wider text-white uppercase leading-none">
              <TrendingDown className="w-2.5 h-2.5" />
              BEST
            </span>
          )}
          <span className={`text-[11px] truncate ${isBest ? 'text-slate-100' : 'text-slate-400'}`}>{configLabel}</span>
          {url && <ExternalLink className="w-2.5 h-2.5 text-slate-600 shrink-0" />}
        </div>
        <span className={`text-[10px] ${inStock ? 'text-emerald-500' : 'text-slate-600'}`}>
          {inStock ? 'In Stock' : 'Out of Stock'}
        </span>
      </div>
      <div className="text-right shrink-0">
        <div className={`tabular-nums text-[13px] font-semibold ${isBest ? 'text-emerald-400' : 'text-slate-200'}`}>
          {fmtPrice(price, currency)}
        </div>
        {showDelta && msrp !== undefined && price !== msrp && (
          <div className={`text-[10px] font-medium tabular-nums ${price < msrp ? 'text-emerald-500' : 'text-red-400'}`}>
            {fmtDelta(price, msrp)} vs MSRP
          </div>
        )}
      </div>
    </div>
  )

  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90 transition-opacity">
      {inner}
    </a>
  ) : inner
}
