'use client'

import { useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight, Camera, Aperture, Zap, Link2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import useStore from '../store/useStore'

const CATEGORY_ICON = { cameras: Camera, lenses: Aperture, lighting: Zap }

// Normalize mount strings for matching (e.g., "Sony E" matches "E-Mount", "E Mount")
function normalizeMount(raw) {
  if (!raw || raw === 'N/A') return null
  return raw
    .toLowerCase()
    .replace(/[- ]/g, '')
    .replace(/mount$/, '')
    .trim()
}

function extractMounts(product) {
  const mountSpec =
    product.specs['Lens Mount']?.raw ||
    product.specs['Mount']?.raw ||
    null
  if (!mountSpec || mountSpec === 'N/A') return []
  // Handle multi-mount entries like "PL / EF" or "PL, LPL"
  return mountSpec
    .split(/[\/,&+]/)
    .map(s => s.trim())
    .filter(Boolean)
}

function mountsOverlap(mountsA, mountsB) {
  const normA = mountsA.map(normalizeMount).filter(Boolean)
  const normB = mountsB.map(normalizeMount).filter(Boolean)
  return normA.some(a => normB.some(b => a.includes(b) || b.includes(a)))
}

function getCompatibleProducts(product, allProducts) {
  const mounts = extractMounts(product)
  if (mounts.length === 0) return []

  return allProducts.filter(p => {
    if (p.id === product.id) return false
    if (p.category === product.category) return false // Different category only

    const pMounts = extractMounts(p)
    if (pMounts.length === 0) return false

    return mountsOverlap(mounts, pMounts)
  })
}

function GearCard({ product }) {
  const router = useRouter()
  const CatIcon = CATEGORY_ICON[product.category]

  return (
    <button
      onClick={() => router.push(`/product/${product.id}`)}
      className="group shrink-0 w-52 bg-slate-900/40 border border-slate-800/30 rounded-xl p-3.5 hover:bg-slate-900/60 hover:border-indigo-500/20 transition-all duration-300 text-left"
    >
      {/* Image */}
      <div className="w-full h-28 rounded-lg bg-slate-950/60 overflow-hidden flex items-center justify-center ring-1 ring-slate-800/30 mb-3">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-contain p-2"
            loading="lazy"
          />
        ) : (
          <div className="text-slate-800 text-[10px]">No Image</div>
        )}
      </div>

      {/* Info */}
      <div className="flex items-start gap-2">
        {CatIcon && <CatIcon size={12} className="text-slate-600 mt-0.5 shrink-0" />}
        <div className="min-w-0">
          <h4 className="text-[11.5px] font-semibold text-slate-200 truncate leading-tight tracking-tight group-hover:text-indigo-300 transition-colors duration-200">
            {product.name}
          </h4>
          <p className="text-[10px] text-slate-600 font-light mt-0.5">{product.brand}</p>
        </div>
      </div>

      {/* Mount badge + price */}
      <div className="flex items-center justify-between mt-2.5">
        <span className="text-[9px] text-indigo-400/70 bg-indigo-500/8 border border-indigo-500/10 rounded px-1.5 py-0.5 font-mono">
          {extractMounts(product).join(' / ') || '—'}
        </span>
        <span className={`text-[11px] font-bold tabular-nums ${
          product.price ? 'text-emerald-400' : 'text-amber-500/50'
        }`}>
          {product.price ? `$${product.price.toLocaleString()}` : '—'}
        </span>
      </div>
    </button>
  )
}

export default function CompatibleGear({ product }) {
  const { products } = useStore()
  const scrollRef = useRef(null)

  const compatible = useMemo(
    () => getCompatibleProducts(product, products),
    [product, products]
  )

  if (compatible.length === 0) return null

  const scroll = (dir) => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir * 240, behavior: 'smooth' })
  }

  const mounts = extractMounts(product)
  const compatLabel = product.category === 'cameras'
    ? 'Compatible Lenses'
    : product.category === 'lenses'
    ? 'Compatible Cameras'
    : 'Compatible Gear'

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Link2 size={15} className="text-indigo-400" />
          <h2 className="text-sm font-bold text-slate-100 tracking-tight">{compatLabel}</h2>
          <span className="text-[10px] text-slate-600 font-light">
            {mounts.join(' / ')} mount — {compatible.length} match{compatible.length !== 1 ? 'es' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll(-1)}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-800/50 transition-all duration-200"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll(1)}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-800/50 transition-all duration-200"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-none"
        style={{ scrollbarWidth: 'none' }}
      >
        {compatible.map(p => (
          <GearCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  )
}
