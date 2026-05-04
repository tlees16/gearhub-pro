'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, ShoppingCart, Tag, RefreshCw, ChevronDown } from 'lucide-react'
import { fetchPriceEntries } from '../services/dataService'

const AMAZON_TAG = process.env.NEXT_PUBLIC_AMAZON_TAG || 'gearhubpro-20'

function amazonSearchUrl(productName) {
  const q = encodeURIComponent(productName.replace(/\(.*?\)/g, '').trim())
  return `https://www.amazon.com/s?k=${q}&tag=${AMAZON_TAG}`
}

// Condition badge colours
const CONDITION_STYLE = {
  'Like New': 'text-emerald-400 bg-emerald-500/10 ring-emerald-500/20',
  'Excellent': 'text-indigo-400 bg-indigo-500/10 ring-indigo-500/20',
  'Good':     'text-amber-400 bg-amber-500/10 ring-amber-500/20',
  'Fair':     'text-orange-400 bg-orange-500/10 ring-orange-500/20',
  'Poor':     'text-red-400 bg-red-500/10 ring-red-500/20',
  'New':      'text-emerald-400 bg-emerald-500/10 ring-emerald-500/20',
}

const RETAILER_LOGO = {
  'B&H Photo': 'B&H',
  'Adorama':   'ADO',
  'KEH':       'KEH',
  'MPB':       'MPB',
  'eBay':      'eBY',
}

export function PriceRow({ entry, highlight, nested = false }) {
  const condStyle = CONDITION_STYLE[entry.condition] || 'text-zinc-400 bg-zinc-500/10 ring-zinc-500/20'
  const hasUrl = !!entry.url

  // Nested rows (inside a RetailerGroup) strip the logo/name and use a lighter style
  if (nested) {
    const inner = (
      <div className="flex items-center justify-between px-4 py-2.5 group">
        <div className="flex items-center gap-2 pl-11">
          {entry.retailerConfig && (
            <span className="text-[11px] font-medium text-slate-300">{entry.retailerConfig}</span>
          )}
          {entry.condition && (
            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ring-1 ring-inset ${condStyle}`}>
              {entry.condition}
            </span>
          )}
          <span className={`text-[10px] font-light ${
            entry.availability === 'In Stock' ? 'text-emerald-500/70' :
            entry.availability === 'Backordered' ? 'text-amber-500/70' : 'text-zinc-600'
          }`}>
            {entry.availability || 'Check Site'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold tabular-nums text-slate-200">
            {entry.price
              ? `$${Number(entry.price).toLocaleString()}`
              : 'Quote'}
          </span>
          {hasUrl && <ExternalLink size={10} className="text-slate-700 group-hover:text-indigo-400 transition-colors shrink-0" />}
        </div>
      </div>
    )
    if (hasUrl) return <a href={entry.url} target="_blank" rel="noopener noreferrer">{inner}</a>
    return inner
  }

  // Standard (non-nested) row
  const sharedClass = `flex items-center justify-between rounded-xl px-4 py-3 border transition-all duration-200 group ${
    highlight
      ? 'bg-indigo-500/5 border-indigo-500/15 hover:border-indigo-500/30'
      : 'bg-slate-950/50 border-slate-800/30 hover:border-slate-700/50'
  }`
  const inner = (
    <>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center text-[9px] font-bold text-slate-400 shrink-0">
          {RETAILER_LOGO[entry.retailerBase ?? entry.retailer_name] || (entry.retailerBase ?? entry.retailer_name).slice(0, 3).toUpperCase()}
        </div>
        <div>
          <div className="text-[12px] font-medium text-slate-200 leading-tight">
            {entry.retailerBase ?? entry.retailer_name}
            {entry.retailerConfig && (
              <span className="ml-1.5 text-[10px] font-normal text-slate-500">({entry.retailerConfig})</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {entry.condition && entry.condition !== 'New' && (
              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ring-1 ring-inset ${condStyle}`}>
                {entry.condition}
              </span>
            )}
            <span className={`text-[10px] font-light ${
              entry.availability === 'In Stock' ? 'text-emerald-500/70' :
              entry.availability === 'Backordered' ? 'text-amber-500/70' : 'text-zinc-600'
            }`}>
              {entry.availability || 'Check Site'}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-[14px] font-bold tabular-nums ${
          entry.price ? 'text-slate-100' : 'text-amber-500/60'
        }`}>
          {entry.price
            ? `${entry.currency === 'USD' ? '$' : entry.currency}${Number(entry.price).toLocaleString()}`
            : 'Quote'
          }
        </span>
        {hasUrl && <ExternalLink size={10} className="text-slate-700 group-hover:text-indigo-400 transition-colors shrink-0" />}
      </div>
    </>
  )

  if (hasUrl) {
    return (
      <a href={entry.url} target="_blank" rel="noopener noreferrer" className={sharedClass}>
        {inner}
      </a>
    )
  }
  return <div className={sharedClass}>{inner}</div>
}

// Splits "B&H Photo (Canon EF)" → { base: "B&H Photo", config: "Canon EF" }
function parseRetailerName(name) {
  const m = name.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
  if (m) return { base: m[1].trim(), config: m[2].trim() }
  return { base: name, config: null }
}

// Groups a flat list of price entries by base retailer name.
// "B&H Photo (Canon EF)" and "B&H Photo (Leica L)" both group under "B&H Photo".
// Adds retailerBase / retailerConfig fields to each enriched entry.
// Returns sorted arrays: cheapest group first.
export function groupByRetailer(entries) {
  const map = new Map()
  for (const entry of entries) {
    const { base, config } = parseRetailerName(entry.retailer_name)
    const enriched = { ...entry, retailerBase: base, retailerConfig: config }
    if (!map.has(base)) map.set(base, [])
    map.get(base).push(enriched)
  }
  return Array.from(map.values()).sort((a, b) => {
    const minA = Math.min(...a.map(e => e.price || Infinity))
    const minB = Math.min(...b.map(e => e.price || Infinity))
    return minA - minB
  })
}

// Renders one retailer's entries. Single entries render as a flat PriceRow.
// Multiple entries collapse under an expandable header.
export function RetailerGroup({ entries, highlightCheapest = false }) {
  const [open, setOpen] = useState(true)
  const sorted = [...entries].sort((a, b) => (a.price || Infinity) - (b.price || Infinity))
  const baseName = sorted[0].retailerBase ?? sorted[0].retailer_name

  if (entries.length === 1) {
    return <PriceRow entry={sorted[0]} highlight={highlightCheapest} />
  }

  const fromPrice = sorted[0].price

  return (
    <div className="rounded-xl border border-slate-800/30 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-950/50 hover:bg-slate-950/70 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center text-[9px] font-bold text-slate-400 shrink-0">
            {RETAILER_LOGO[baseName] || baseName.slice(0, 3).toUpperCase()}
          </div>
          <div>
            <div className="text-[12px] font-medium text-slate-200 leading-tight">{baseName}</div>
            <div className="text-[10px] text-slate-500">{entries.length} configurations</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {fromPrice != null && (
            <span className="text-[12px] font-semibold text-slate-400 tabular-nums">
              from ${Number(fromPrice).toLocaleString()}
            </span>
          )}
          <ChevronDown
            size={12}
            className={`text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>
      {open && (
        <div className="border-t border-slate-800/20 divide-y divide-slate-800/10">
          {sorted.map((entry, i) => (
            <PriceRow key={i} entry={entry} highlight={false} nested />
          ))}
        </div>
      )}
    </div>
  )
}

export default function PriceWidget({ category, dbId, productName }) {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    if (!category || !dbId) return
    setLoading(true)
    fetchPriceEntries(category, dbId)
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [category, dbId])

  // ── Loading ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <Section icon={ShoppingCart} title="New Gear Prices">
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-14 rounded-xl bg-slate-800/20 animate-pulse" />
            ))}
          </div>
        </Section>
      </div>
    )
  }

  if (error || !data) {
    // Still show Amazon link even if price_entries fetch fails
    if (productName) return <AmazonOnlySection productName={productName} />
    return null
  }

  const { newPrices, usedPrices } = data
  if (newPrices.length === 0 && usedPrices.length === 0 && !productName) return null

  // Sort: cheapest first for new, best-condition first for used
  const sortedNew  = [...newPrices].sort((a, b) => (a.price || Infinity) - (b.price || Infinity))
  const sortedUsed = [...usedPrices].sort((a, b) => (a.price || Infinity) - (b.price || Infinity))

  // Cheapest new price (for savings badge)
  const cheapestNew  = sortedNew[0]?.price
  const cheapestUsed = sortedUsed[0]?.price
  const savings = cheapestNew && cheapestUsed ? Math.round(cheapestNew - cheapestUsed) : null

  return (
    <div className="space-y-4">
      {/* New gear prices + Amazon */}
      {(sortedNew.length > 0 || productName) && (
        <Section icon={ShoppingCart} title="Buy New">
          <div className="space-y-2">
            {groupByRetailer(sortedNew).map((group, gi) => (
              <RetailerGroup key={group[0].retailer_name} entries={group} highlightCheapest={gi === 0} />
            ))}
            {productName && <AmazonLink productName={productName} />}
          </div>
        </Section>
      )}

      {/* Used gear — only shown if listings exist */}
      {sortedUsed.length > 0 && (
        <Section
          icon={Tag}
          title="Used Market"
          badge={savings && savings > 0 ? `Save ~$${savings.toLocaleString()}` : null}
        >
          <div className="space-y-2">
            {sortedUsed.map((entry, i) => (
              <PriceRow key={`${entry.retailer_name}-${entry.condition}-${i}`} entry={entry} highlight={false} />
            ))}
          </div>
          <p className="text-[10px] text-slate-700 font-light mt-3 flex items-center gap-1">
            <RefreshCw size={9} />
            Prices refreshed every 6 hours
          </p>
        </Section>
      )}
    </div>
  )
}

export function AmazonLink({ productName }) {
  return (
    <a
      href={amazonSearchUrl(productName)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between rounded-xl px-4 py-3 border border-slate-800/30 bg-slate-950/50 hover:border-amber-500/20 transition-all duration-200 group"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-[9px] font-bold text-amber-400 shrink-0">
          AMZ
        </div>
        <div>
          <div className="text-[12px] font-medium text-slate-200">Amazon</div>
          <div className="text-[10px] text-slate-600 font-light">Search listings</div>
        </div>
      </div>
      <ExternalLink size={10} className="text-slate-700 group-hover:text-amber-400 transition-colors shrink-0" />
    </a>
  )
}

function AmazonOnlySection({ productName }) {
  return (
    <Section icon={ShoppingCart} title="Buy New">
      <AmazonLink productName={productName} />
    </Section>
  )
}

function Section({ icon: Icon, title, badge, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={13} className="text-indigo-400" />
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{title}</span>
        {badge && (
          <span className="text-[9px] font-medium text-emerald-400 bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/20 rounded-full px-1.5 py-0.5">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}
