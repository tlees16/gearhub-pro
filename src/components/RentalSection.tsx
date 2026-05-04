'use client'

import { ChevronDown, ExternalLink, MapPin, Building2, User } from 'lucide-react'
import type { RentalEntry } from '@/types/gear'

// ─── Config ───────────────────────────────────────────────────────────────────

const COUNTRY_CONFIG: Record<string, { label: string; flag: string }> = {
  USD: { label: 'United States', flag: '🇺🇸' },
  GBP: { label: 'United Kingdom', flag: '🇬🇧' },
  AUD: { label: 'Australia',      flag: '🇦🇺' },
  INR: { label: 'India',          flag: '🇮🇳' },
}

const PLATFORM_LABELS: Record<string, string> = {
  sharegrid:    'ShareGrid',
  hireacamera:  'Hireacamera',
  wex:          'Wex Rental',
  thefront:     'The Front',
  camorent:     'Camorent',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtRate(rate: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(rate)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ListingRow({ entry }: { entry: RentalEntry }) {
  const label = entry.is_rental_house
    ? (entry.owner_name ?? PLATFORM_LABELS[entry.platform] ?? entry.platform)
    : (entry.listing_title ?? entry.owner_name ?? 'P2P rental')

  const content = (
    <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg hover:bg-slate-800/30 transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        {entry.is_rental_house
          ? <Building2 size={11} className="text-indigo-400/60 shrink-0" />
          : <User size={11} className="text-slate-600 shrink-0" />
        }
        <span className="text-[11px] text-slate-400 truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[12px] font-semibold text-indigo-300 tabular-nums">
          {fmtRate(entry.daily_rate, entry.currency)}
          <span className="text-slate-600 font-normal text-[10px]">/day</span>
        </span>
        {entry.listing_url && (
          <ExternalLink size={10} className="text-slate-600" />
        )}
      </div>
    </div>
  )

  if (entry.listing_url) {
    return (
      <a href={entry.listing_url} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    )
  }
  return content
}

// US section: grouped by city, each city is an expandable <details>
function USSection({ entries }: { entries: RentalEntry[] }) {
  // Group by city/region
  const cityMap = new Map<string, { region: string; listings: RentalEntry[] }>()
  for (const e of entries) {
    const key = e.city ?? e.region ?? 'us'
    if (!cityMap.has(key)) cityMap.set(key, { region: e.region ?? key, listings: [] })
    cityMap.get(key)!.listings.push(e)
  }

  // Sort cities: most listings first
  const cities = [...cityMap.values()].sort((a, b) => b.listings.length - a.listings.length)

  return (
    <div className="space-y-1">
      {cities.map(({ region, listings }) => {
        const minRate = Math.min(...listings.map(l => l.daily_rate))
        // Rental houses first, then P2P sorted by price
        const sorted = [...listings].sort((a, b) => {
          if (a.is_rental_house !== b.is_rental_house) return a.is_rental_house ? -1 : 1
          return a.daily_rate - b.daily_rate
        })
        const shown = sorted.slice(0, 8)
        const extra = sorted.length - shown.length

        return (
          <details key={region} className="group/city">
            <summary className="flex items-center justify-between px-3 py-2 cursor-pointer list-none select-none rounded-lg hover:bg-slate-800/30 transition-colors">
              <div className="flex items-center gap-2">
                <MapPin size={11} className="text-slate-600 shrink-0" />
                <span className="text-[12px] text-slate-300 font-medium">{region}</span>
                <span className="text-[10px] text-slate-600">{listings.length} listing{listings.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold text-indigo-300 tabular-nums">
                  from {fmtRate(minRate, 'USD')}
                  <span className="text-slate-600 font-normal text-[10px]">/day</span>
                </span>
                <ChevronDown size={12} className="text-slate-600 transition-transform duration-150 group-open/city:rotate-180" />
              </div>
            </summary>
            <div className="ml-3 mt-0.5 border-l border-slate-800/40 pl-3 space-y-0.5">
              {shown.map((e, i) => <ListingRow key={e.listing_url ?? i} entry={e} />)}
              {extra > 0 && (
                <p className="text-[10px] text-slate-600 px-3 py-1.5">
                  +{extra} more listings on ShareGrid
                </p>
              )}
            </div>
          </details>
        )
      })}
    </div>
  )
}

// Non-US section: flat list of listings grouped by platform
function FlatSection({ entries }: { entries: RentalEntry[] }) {
  const sorted = [...entries].sort((a, b) => {
    if (a.platform !== b.platform) return a.platform.localeCompare(b.platform)
    return a.daily_rate - b.daily_rate
  })
  return (
    <div className="space-y-0.5">
      {sorted.map((e, i) => <ListingRow key={e.listing_url ?? i} entry={e} />)}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface RentalSectionProps {
  rentals: RentalEntry[]
  className?: string
}

export default function RentalSection({ rentals, className = '' }: RentalSectionProps) {
  if (!rentals.length) return null

  // Group by currency
  const byCurrency = new Map<string, RentalEntry[]>()
  for (const e of rentals) {
    if (!byCurrency.has(e.currency)) byCurrency.set(e.currency, [])
    byCurrency.get(e.currency)!.push(e)
  }

  // Currency display order
  const currencyOrder = ['USD', 'GBP', 'AUD', 'INR']
  const groups = currencyOrder
    .filter(c => byCurrency.has(c))
    .map(c => ({ currency: c, entries: byCurrency.get(c)! }))

  // Global lowest (USD preferred, else first available)
  const usdMin = byCurrency.has('USD')
    ? Math.min(...byCurrency.get('USD')!.map(e => e.daily_rate))
    : null

  return (
    <details className={`group bg-slate-900/30 border border-slate-800/25 rounded-2xl overflow-hidden ${className}`}>
      <summary className="flex items-center justify-between px-5 sm:px-6 py-4 cursor-pointer list-none select-none hover:bg-slate-800/20 transition-colors duration-200">
        <div className="flex items-center gap-2.5">
          {/* Tent/rent icon approximation */}
          <MapPin size={15} className="text-slate-500" />
          <span className="text-sm font-bold text-slate-100 tracking-tight">Rentals</span>
          {usdMin && (
            <span className="text-[10px] font-semibold text-indigo-400/80 bg-indigo-900/30 border border-indigo-800/30 rounded-full px-2 py-0.5">
              from {fmtRate(usdMin, 'USD')}/day
            </span>
          )}
        </div>
        <ChevronDown size={14} className="text-slate-500 transition-transform duration-200 group-open:rotate-180" />
      </summary>

      <div className="border-t border-slate-800/25 px-4 sm:px-5 pb-4 sm:pb-5 pt-3 space-y-4">
        {groups.map(({ currency, entries }) => {
          const config = COUNTRY_CONFIG[currency] ?? { label: currency, flag: '🌐' }
          const minRate = Math.min(...entries.map(e => e.daily_rate))
          const isUS = currency === 'USD'

          return (
            <div key={currency}>
              {/* Country header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[13px]">{config.flag}</span>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{config.label}</span>
                  <span className="text-[10px] text-slate-600">{entries.length} listing{entries.length !== 1 ? 's' : ''}</span>
                </div>
                <span className="text-[11px] text-slate-500 tabular-nums">
                  from {fmtRate(minRate, currency)}/day
                </span>
              </div>

              {isUS ? <USSection entries={entries} /> : <FlatSection entries={entries} />}

              {/* Platform attribution */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[...new Set(entries.map(e => e.platform))].map(p => (
                  <span key={p} className="text-[9px] text-slate-700 bg-slate-800/30 rounded px-1.5 py-0.5 uppercase tracking-wider">
                    {PLATFORM_LABELS[p] ?? p}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </details>
  )
}
