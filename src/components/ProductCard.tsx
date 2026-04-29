'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Store, Flame } from 'lucide-react'
import type { Product } from '@/types/gear'
import useStore from '@/store/useStore'
import ProductCardActions from './ProductCardActions'

// ─── trend/new detection (also used by ProductList.jsx for carousels) ─────────
// Uses explicit substring matching (case-insensitive) so it's easy to audit.
// NEW = released 2024-2025. HOT = proven popular products, may be older.

const matchesAny = (name: string, list: string[]) => {
  const lower = name.toLowerCase()
  return list.some((s) => lower.includes(s.toLowerCase()))
}

// Products released in 2024 or 2025 only
const NEW_SUBSTRINGS = [
  // Cameras
  'PYXIS 12K', 'PYXIS 6K',
  'URSA Cine 12K', 'URSA Cine 17K', 'URSA Cine Immersive',
  'EOS C80', 'EOS C400 6K',
  'EOS R1', 'EOS R5 Mark II', 'EOS R6 Mark III', 'EOS R50 V', 'PowerShot V1',
  'Ember S5K', 'Ember S2.5K', 'FREEFLY Wave',
  'GFX 100S II', 'GFX100RF', 'X half', 'X-M5', 'X-T50', 'X100VI', 'X-E5',
  'X2D II 100C',
  'Leica M EV1', 'Leica Q3 43',
  'Nikon Z5 II', 'Nikon Z50 II', 'Z6 III',
  'OM-1 Mark II', 'OM-5 Mark II', 'OM-3',
  'LUMIX GH7',
  'MAVO Edge',
  // Lighting
  'amaran Ace', 'amaran Ray', 'amaran Verge',
  'Electro Storm',
  'Nanlux Evoke 2400',
]

// Popular industry workhorses (not necessarily new)
const TRENDING_SUBSTRINGS = [
  // Cinema cameras
  'ALEXA 35', 'ALEXA Mini LF',
  'Burano',
  'Komodo-X', 'KOMODO-X',
  'V-RAPTOR', 'V-Raptor',
  // Hybrid cameras
  'FX3', 'FX6', 'FX9',
  'A7S III', 'A7 IV',
  'C300 Mark III',
  // Lighting
  'Nanlux Evoke 1200', 'Nanlux Evoke 600', 'Nanlux Evoke 900',
  'INFINIBAR',
  'SkyPanel',
  'Orbiter',
  'LS 600d', 'LS600d',
  'Nanlite Forza',
  'Creamsource Vortex',
  // Lenses
  'Signature Prime',
]

export function isNew(product: { name: string }) {
  return matchesAny(product.name, NEW_SUBSTRINGS)
}

export function isTrending(product: { name: string }) {
  return !isNew(product) && matchesAny(product.name, TRENDING_SUBSTRINGS)
}

// ─── spec chip config — keys must match SPEC_COLUMNS in dataService.js ────────

const CARD_SPECS: Record<string, string[]> = {
  cameras:  ['lens_mount', 'sensor_size', 'max_video_resolution', 'dynamic_range_stops'],
  lenses:   ['subcategory', 'focal_length', 'max_aperture', 'filter_size'],
  lighting: ['item_type', 'power_draw_w', 'color_type', 'weight_g'],
}

const EMPTY_VALUES = new Set(['N/A', '-', '--', '?', 'n/a', 'na', 'TBD', 'tbd'])

function specChips(product: Product): Array<{ label: string; value: string }> {
  const keys = CARD_SPECS[product.category]
  if (!keys) return []
  return keys
    .map((k) => product.specs[k])
    .filter(Boolean)
    .filter((s) => s.raw && !EMPTY_VALUES.has(String(s.raw).trim()))
    .slice(0, 3)
    .map((s) => ({ label: s.label, value: String(s.raw) }))
}

function fmtPrice(price: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(price)
}

// ─── component ────────────────────────────────────────────────────────────────

export interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const lowestPrices     = useStore(s => s.lowestPrices)
  const lowestUsedPrices = useStore(s => s.lowestUsedPrices)

  const lowestNew  = lowestPrices[product.id]
  const lowestUsed = lowestUsedPrices[product.id]

  const chips      = specChips(product)
  const displayNew = lowestNew ?? product.price
  const msrp       = product.price

  return (
    <article className="group flex flex-col rounded-2xl bg-slate-900/50 border border-slate-800/30 hover:border-slate-700/50 transition-all duration-200 overflow-hidden">

      {/* ── Image ─────────────────────────────────────────────────── */}
      <Link
        href={`/product/${product.id}`}
        className="block relative aspect-square md:aspect-auto md:h-32 bg-slate-800/20 rounded-t-2xl flex items-center justify-center overflow-hidden"
        tabIndex={-1}
        aria-hidden
      >
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover md:object-contain md:p-3 rounded-t-2xl"
            loading="lazy"
          />
        ) : (
          <Store className="w-8 h-8 text-slate-700" />
        )}
        {/* NEW / HOT badge */}
        {isNew(product) ? (
          <span className="absolute top-1.5 left-1.5 text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-md bg-emerald-500 text-white leading-tight shadow-sm">
            NEW
          </span>
        ) : isTrending(product) ? (
          <span className="absolute top-1.5 left-1.5 flex items-center gap-0.5 text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-md bg-amber-400 text-black leading-tight shadow-sm">
            <Flame size={7} />HOT
          </span>
        ) : null}
      </Link>

      {/* ── Body ──────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-3">

        {/* Brand + actions row */}
        <div className="flex items-start justify-between gap-1 mb-1">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider leading-none">
            {product.brand}
          </p>
          <ProductCardActions productId={product.id} productName={product.name} />
        </div>

        {/* Product name */}
        <Link
          href={`/product/${product.id}`}
          className="text-[13px] font-semibold text-slate-100 leading-snug hover:text-white transition-colors line-clamp-2"
        >
          {product.name}
        </Link>

        {/* Spec chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {chips.map((c) => (
              <span
                key={c.label}
                title={c.label}
                className="text-[9px] font-medium px-1.5 py-0.5 rounded-full ring-1 ring-inset ring-slate-700/50 bg-slate-800/40 text-slate-400 leading-none"
              >
                {c.value}
              </span>
            ))}
          </div>
        )}

        {/* ── Price rows ─────────────────────────────────────────── */}
        <div className="mt-auto pt-3 space-y-1.5">

          {/* NEW */}
          {displayNew != null && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-medium">New</span>
              <span className="text-[13px] font-semibold tabular-nums text-slate-100">
                {fmtPrice(displayNew)}
              </span>
            </div>
          )}

          {/* USED */}
          {lowestUsed != null && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-medium">Used</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[13px] font-semibold tabular-nums text-amber-400">
                  {fmtPrice(lowestUsed)}
                </span>
                {msrp != null && msrp > 0 && (
                  <span className="text-[10px] text-emerald-500/80 font-medium">
                    {Math.round((1 - lowestUsed / msrp) * 100)}% off
                  </span>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </article>
  )
}
