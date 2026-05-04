'use client'

import { useRef, useMemo, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import useStore from '../store/useStore'
import ProductCard, { isTrending, isNew } from './ProductCard'
import { SUBCATEGORIES } from '../services/dataService'
import {
  Package, Loader, Camera, Aperture, Zap, Wind,
  CircleDot, ChevronLeft, ChevronRight, Flame, GitCompareArrows,
  Search, ArrowUpDown, ChevronDown, Check,
} from 'lucide-react'

const CATEGORY_META = {
  cameras:              { label: 'Cameras',            icon: Camera,     color: 'text-blue-400',    accent: '#60a5fa' },
  lenses:               { label: 'Lenses',             icon: Aperture,   color: 'text-violet-400',  accent: '#a78bfa' },
  lighting:             { label: 'Lighting',           icon: Zap,        color: 'text-amber-400',   accent: '#fbbf24' },
  drones:               { label: 'Drones',             icon: Wind,       color: 'text-sky-400',     accent: '#38bdf8' },
  gimbals:              { label: 'Gimbals',            icon: CircleDot,  color: 'text-emerald-400', accent: '#34d399' },
  sd_cards:             { label: 'SD Cards',           icon: Package,    color: 'text-rose-400',    accent: '#fb7185' },
  tripods:              { label: 'Tripods',            icon: Package,    color: 'text-orange-400',  accent: '#fb923c' },
  lighting_accessories: { label: 'Light Accessories',  icon: Package,    color: 'text-yellow-400',  accent: '#facc15' },
}

// Pretty display names for subcategories
const SUBCATEGORY_LABELS = {
  'Photo & Mirrorless': 'Photo & Mirrorless Lenses',
  'LED Monolight':  'LED Monolights',
  'LED Panel':      'LED Panels',
  'LED Tube':       'LED Tubes',
  'Ring Light':     'Ring Lights',
  Cinema:     'Cinema Cameras',
  Mirrorless: 'Mirrorless',
  DSLR:       'DSLR',
  'Medium Format': 'Medium Format',
  Cine:       'Cinema Lenses',
  Prime:      'Prime Lenses',
  Zoom:       'Zoom Lenses',
  SLR:        'SLR Lenses',
  Specialty:  'Specialty',
  LED:        'LED Fixtures',
  'LED Panel':'LED Panels',
  'LED Tube': 'LED Tubes',
  HMI:        'HMI',
  Fresnel:    'Fresnels',
  Softbox:    'Softboxes',
  Strobe:     'Strobes',
  'Ring Light':'Ring Lights',
}

const ACCESSORIES_TABLES = ['sd_cards', 'tripods', 'lighting_accessories']
const ALL_CATEGORY_KEYS  = ['cameras', 'lenses', 'lighting', 'drones', 'gimbals', 'sd_cards', 'tripods', 'lighting_accessories']

// Preferred subcategory order per category (match actual DB values)
const SUBCATEGORY_ORDER = {
  cameras:  ['Cinema', 'Mirrorless', 'DSLR', 'Medium Format'],
  lenses:   ['Cine', 'Prime', 'Zoom', 'Mirrorless', 'SLR', 'Medium Format', 'Specialty'],
  lighting: ['LED Panel', 'LED Monolight', 'LED', 'LED Tube', 'Fresnel', 'HMI', 'Softbox', 'Ring Light'],
}

// Products without a real image are excluded from carousels
function hasValidImage(product) {
  return product.image && !product.image.includes('na500x500')
}

// ─── Horizontal scroll carousel ─────────────────────────────────────────────
function Carousel({ products: rawProducts, cardWidth = 200 }) {
  const products = rawProducts.filter(hasValidImage)
  const scrollRef = useRef(null)
  const touchStartX = useRef(0)
  const isDragging = useRef(false)

  const scroll = (dir) => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir * (cardWidth + 16) * 3, behavior: 'smooth' })
  }

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    isDragging.current = false
  }

  const onTouchMove = (e) => {
    if (Math.abs(e.touches[0].clientX - touchStartX.current) > 5) {
      isDragging.current = true
    }
  }

  const onClickCapture = (e) => {
    if (isDragging.current) {
      e.stopPropagation()
      e.preventDefault()
      isDragging.current = false
    }
  }

  if (products.length === 0) return null

  return (
    <div className="relative group/carousel">
      {/* Left arrow */}
      <button
        onClick={() => scroll(-1)}
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10
          w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700/60 shadow-lg
          items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600
          opacity-0 group-hover/carousel:opacity-100 transition-all duration-200"
      >
        <ChevronLeft size={14} />
      </button>

      {/* Scroll area */}
      <div
        ref={scrollRef}
        className="flex gap-3.5 overflow-x-auto scrollbar-none pb-1 snap-x snap-mandatory"
        style={{ scrollPaddingLeft: 4 }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onClickCapture={onClickCapture}
      >
        {products.map(product => (
          <div key={product.id} className="snap-start shrink-0 w-36 sm:w-44 md:w-[200px]">
            <ProductCard product={product} />
          </div>
        ))}
        {/* Spacer so last card isn't flush */}
        <div className="shrink-0 w-2" />
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll(1)}
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10
          w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700/60 shadow-lg
          items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600
          opacity-0 group-hover/carousel:opacity-100 transition-all duration-200"
      >
        <ChevronRight size={14} />
      </button>

      {/* Right fade hint */}
      <div className="absolute right-0 top-0 bottom-1 w-12 bg-gradient-to-l from-black to-transparent pointer-events-none" />
    </div>
  )
}

// ─── Row: subcategory label + carousel ───────────────────────────────────────
function SubcategoryRow({ label, count, products, onViewAll }) {
  const isHot = label === 'New & Hot'
  return (
    <div className="mb-7">
      <div className="flex items-center justify-between mb-3 pr-2">
        <div className="flex items-center gap-2">
          {isHot && <Flame size={11} className="text-amber-400" />}
          <span className={`text-[12px] font-semibold tracking-tight ${isHot ? 'text-amber-300' : 'text-zinc-300'}`}>
            {SUBCATEGORY_LABELS[label] || label}
          </span>
          <span className="text-[10px] text-zinc-700 tabular-nums font-light">{count}</span>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            View all →
          </button>
        )}
      </div>
      <Carousel products={products} />
    </div>
  )
}

// ─── Category tile ───────────────────────────────────────────────────────────
function CategoryTile({ catKey, label, icon: Icon, count, subs, accentText, accentBg, setActiveCategory }) {
  if (!count) return null
  return (
    <button
      onClick={() => setActiveCategory(catKey)}
      className="group flex flex-col gap-3 p-4 sm:p-5 rounded-2xl bg-slate-900/50 border border-slate-800/40 hover:border-slate-700/60 hover:bg-slate-900/80 transition-all duration-200 text-left"
    >
      <div className={`w-10 h-10 rounded-xl ${accentBg} flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
        <Icon size={18} className={accentText} />
      </div>
      <div className="flex-1">
        <div className="text-[14px] sm:text-[16px] font-bold text-slate-100 tracking-tight">{label}</div>
        <div className="text-[10px] sm:text-[11px] text-slate-500 font-light mt-0.5 leading-snug">{subs}</div>
      </div>
      <div className="flex items-center justify-between w-full">
        <span className="text-[11px] text-slate-600 tabular-nums">{count.toLocaleString()} products</span>
        <span className={`text-[11px] font-semibold ${accentText} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
          Browse →
        </span>
      </div>
    </button>
  )
}

// ─── Home page ───────────────────────────────────────────────────────────────

function CategoryCarouselRow({ icon: Icon, iconColor, label, products, onViewAll }) {
  if (products.length === 0) return null
  return (
    <div className="mb-7 last:mb-0">
      <div className="flex items-center justify-between mb-2.5 pr-1">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon size={11} className={iconColor} />}
          <span className="text-[11px] font-semibold text-slate-400 tracking-tight">{label}</span>
          <span className="text-[10px] text-slate-700 tabular-nums">{products.length}</span>
        </div>
        <button
          onClick={onViewAll}
          className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors min-h-[44px] md:min-h-0 flex items-center px-1"
        >
          View all →
        </button>
      </div>
      <Carousel products={products} />
    </div>
  )
}

const MIN_BRAND_RETAILERS = 3
const MAX_BRANDS_SHOWN = 12

function HomePage({ products, setActiveCategory, openSearchDrawer }) {
  const router = useRouter()
  const { comparisonIds, retailerCounts } = useStore()

  const cameraCount   = useMemo(() => products.filter(p => p.category === 'cameras').length,  [products])
  const lensCount     = useMemo(() => products.filter(p => p.category === 'lenses').length,   [products])
  const lightingCount = useMemo(() => products.filter(p => p.category === 'lighting').length, [products])

  // Group well-covered products by brand (≥3 retailers, valid image),
  // then interleave across cameras / lighting / lenses so lighting brands
  // appear throughout the page rather than bunched at the bottom.
  const hotBrands = useMemo(() => {
    const qualified = products.filter(p =>
      (retailerCounts[p.id] || 0) >= MIN_BRAND_RETAILERS && hasValidImage(p)
    )

    // Accumulate products per brand + category counts
    const byBrand = {}
    for (const p of qualified) {
      if (!byBrand[p.brand]) byBrand[p.brand] = { products: [], catCounts: {} }
      byBrand[p.brand].products.push(p)
      byBrand[p.brand].catCounts[p.category] = (byBrand[p.brand].catCounts[p.category] || 0) + 1
    }

    const sortProds = (prods) => [...prods].sort((a, b) => {
      if (isTrending(b) !== isTrending(a)) return isTrending(b) ? 1 : -1
      if (isNew(b) !== isNew(a)) return isNew(b) ? 1 : -1
      return (b.price || 0) - (a.price || 0)
    })

    // Assign each brand to its dominant category bucket
    const buckets = { cameras: [], lighting: [], lenses: [] }
    for (const [brand, { products: prods, catCounts }] of Object.entries(byBrand)) {
      const dominant = Object.entries(catCounts).sort(([, a], [, b]) => b - a)[0][0]
      const bucket = dominant === 'lighting' ? 'lighting'
        : dominant === 'lenses' ? 'lenses'
        : 'cameras'
      buckets[bucket].push({ brand, products: sortProds(prods) })
    }

    // Sort each bucket by product count desc
    for (const list of Object.values(buckets)) {
      list.sort((a, b) => b.products.length - a.products.length)
    }

    // Interleave: camera → lighting → lens → camera → lighting → lens …
    const order = ['cameras', 'lighting', 'lenses']
    const result = []
    const indices = { cameras: 0, lighting: 0, lenses: 0 }
    while (result.length < MAX_BRANDS_SHOWN) {
      let added = false
      for (const cat of order) {
        if (result.length >= MAX_BRANDS_SHOWN) break
        const list = buckets[cat]
        if (indices[cat] < list.length) {
          result.push({ ...list[indices[cat]], category: cat })
          indices[cat]++
          added = true
        }
      }
      if (!added) break
    }
    return result
  }, [products, retailerCounts])

  const viewBrand = (brand) => {
    useStore.setState({
      activeCategory: null,
      activeSubcategory: null,
      selectedBrands: [brand],
      searchQuery: '',
      specFilters: {},
      rangeFilters: {},
      booleanFilters: {},
      priceRange: null,
    })
  }

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="mb-8 pt-2">
        <p className="text-[10px] font-semibold tracking-widest text-indigo-400/60 uppercase mb-2">GearHub Pro</p>
        <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight leading-snug">
          The Professional Camera, Lens &amp; Lighting Database
        </h1>
        <p className="text-[13px] text-slate-500 font-light mt-2 leading-relaxed max-w-lg">
          Compare specs, prices and expert analysis across cameras, lenses and lighting — all in one place.
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/40 text-slate-400">
            <span className="text-white font-semibold tabular-nums">{products.length.toLocaleString()}</span> products
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/40 text-slate-400">
            Live pricing
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/40 text-slate-400">
            AI expert analysis
          </span>
        </div>
      </div>

      {/* ── Comparison banner ─────────────────────────────────────── */}
      {comparisonIds.length > 0 && (
        <button
          onClick={() => router.push('/compare')}
          className="w-full flex items-center justify-between mb-6 px-5 py-3.5 rounded-2xl bg-indigo-500/8 border border-indigo-500/20 hover:border-indigo-500/40 hover:bg-indigo-500/12 transition-all duration-200 group"
        >
          <div className="flex items-center gap-3">
            <GitCompareArrows size={15} className="text-indigo-400" />
            <span className="text-[13px] font-semibold text-indigo-300 tracking-tight">
              {comparisonIds.length} product{comparisonIds.length !== 1 ? 's' : ''} in comparison
            </span>
          </div>
          <span className="text-[11px] text-indigo-400 group-hover:text-indigo-300 font-medium transition-colors">
            View comparison →
          </span>
        </button>
      )}

      {/* ── Category tiles ────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
        <CategoryTile catKey="cameras" label="Cameras" icon={Camera} count={cameraCount}
          subs="Cinema · Mirrorless · DSLR" accentText="text-blue-400" accentBg="bg-blue-500/10"
          setActiveCategory={setActiveCategory} />
        <CategoryTile catKey="lenses" label="Lenses" icon={Aperture} count={lensCount}
          subs="Cinema · Photo · Mirrorless" accentText="text-violet-400" accentBg="bg-violet-500/10"
          setActiveCategory={setActiveCategory} />
        <CategoryTile catKey="lighting" label="Lighting" icon={Zap} count={lightingCount}
          subs="Panels · Monolights · Fresnels" accentText="text-amber-400" accentBg="bg-amber-500/10"
          setActiveCategory={setActiveCategory} />
      </div>

      {/* ── Refine button (below category tiles, hidden on desktop where sidebar is shown) ── */}
      {openSearchDrawer && (
        <div className="mb-8 md:hidden">
          <button
            onClick={openSearchDrawer}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl
              bg-slate-900/60 border border-slate-700/50 hover:bg-slate-900/80 hover:border-slate-600/60
              text-[13px] font-semibold text-slate-200 transition-all duration-200"
          >
            <Search size={14} className="text-slate-400 shrink-0" />
            Refine &amp; Filter
          </button>
        </div>
      )}

      {/* ── Hot Brands ────────────────────────────────────────────── */}
      {hotBrands.length > 0 && (
        <div className="mb-16">
          <div className="flex items-center gap-2.5 mb-5">
            <Flame size={13} className="text-amber-400" />
            <h2 className="text-[15px] font-bold tracking-tight text-white">Hot Brands</h2>
            <span className="text-[10px] text-slate-600 font-light">
              · prices from {MIN_BRAND_RETAILERS}+ retailers
            </span>
          </div>
          {hotBrands.map(({ brand, products: brandProds, category }) => {
            const meta = CATEGORY_META[category]
            return (
              <CategoryCarouselRow
                key={brand}
                label={brand}
                icon={meta?.icon}
                iconColor={meta?.color}
                products={brandProds}
                onViewAll={() => viewBrand(brand)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

const SORT_OPTIONS = [
  { key: 'default',   label: 'Relevance' },
  { key: 'price_asc', label: 'Price: Low → High' },
  { key: 'price_desc',label: 'Price: High → Low' },
  { key: 'name',      label: 'Name A–Z' },
]

function SortDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = SORT_OPTIONS.find(o => o.key === value) ?? SORT_OPTIONS[0]

  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all duration-150 text-[11px] font-medium ${
          open
            ? 'bg-slate-800/70 border-slate-700/60 text-slate-200'
            : 'bg-slate-900/50 border-slate-800/50 text-slate-400 hover:border-slate-700/50 hover:bg-slate-800/40 hover:text-slate-300'
        }`}
      >
        <ArrowUpDown size={11} className="text-slate-500 shrink-0" />
        {current.label}
        <ChevronDown size={10} className={`text-slate-500 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-30 bg-slate-900 border border-slate-800/60 rounded-xl overflow-hidden shadow-2xl shadow-black/60 min-w-[168px]">
          {SORT_OPTIONS.map(o => (
            <button
              key={o.key}
              onClick={() => { onChange(o.key); setOpen(false) }}
              className={`w-full text-left px-3.5 py-2.5 text-[11px] font-medium transition-colors duration-100 flex items-center justify-between gap-3 ${
                o.key === value
                  ? 'bg-indigo-600/15 text-indigo-300'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              {o.label}
              {o.key === value && <Check size={10} className="text-indigo-400 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function sortProducts(products, sortKey) {
  if (sortKey === 'price_asc')  return [...products].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
  if (sortKey === 'price_desc') return [...products].sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
  if (sortKey === 'name')       return [...products].sort((a, b) => a.name.localeCompare(b.name))
  return products
}

// ─── Main export ─────────────────────────────────────────────────────────────

const SCROLL_KEY = 'gearhub_list_scroll'

export default function ProductList() {
  const [sortKey, setSortKey] = useState('default')
  const scrollContainerRef = useRef(null)
  const {
    loading, error, getFilteredProducts, products,
    activeCategory, searchQuery, selectedBrands, priceRange,
    specFilters, rangeFilters, booleanFilters, setActiveCategory,
    clearAllFilters, openSearchDrawer,
  } = useStore()

  // Restore scroll position when returning from a product page
  useEffect(() => {
    const saved = sessionStorage.getItem(SCROLL_KEY)
    if (saved && scrollContainerRef.current) {
      const pos = parseInt(saved, 10)
      scrollContainerRef.current.scrollTop = pos
      sessionStorage.removeItem(SCROLL_KEY)
    }
  }, [])

  // Save scroll position continuously (throttled via requestAnimationFrame)
  const saveScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      sessionStorage.setItem(SCROLL_KEY, String(scrollContainerRef.current.scrollTop))
    }
  }, [])

  const filtered = sortProducts(getFilteredProducts(), sortKey)

  const hasActiveFilters = !!(
    activeCategory || searchQuery.trim() || selectedBrands.length > 0 ||
    priceRange || Object.values(specFilters).some(v => v?.length > 0) ||
    Object.keys(rangeFilters).length > 0 ||
    Object.values(booleanFilters).some(v => v !== null && v !== undefined)
  )

  const activeFilterCount = [
    activeCategory ? 1 : 0,
    selectedBrands.length,
    priceRange ? 1 : 0,
    Object.values(specFilters).filter(v => v?.length > 0).length,
    Object.keys(rangeFilters).length,
    Object.values(booleanFilters).filter(v => v !== null && v !== undefined).length,
  ].reduce((a, b) => a + b, 0)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <Loader size={18} className="text-indigo-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-zinc-500 font-light">Loading gear database…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950 p-4">
        <div className="text-center max-w-sm">
          <p className="text-red-400 text-sm font-medium">Failed to load data</p>
          <p className="text-zinc-600 text-xs font-light mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-zinc-950">

      {/* ── Floating "Clear filters" pill (mobile only, when filters active) ── */}
      {hasActiveFilters && (
        <div className="md:hidden fixed bottom-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <button
            onClick={clearAllFilters}
            className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-full
              bg-white text-zinc-900 text-[12px] font-semibold
              shadow-[0_4px_20px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.15)]
              hover:bg-zinc-100 active:scale-[0.97] transition-all duration-200"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div ref={scrollContainerRef} onScroll={saveScroll} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-6 pb-28 md:pb-20 bg-black">
        {!hasActiveFilters ? (
          <HomePage products={products} setActiveCategory={setActiveCategory} openSearchDrawer={openSearchDrawer} />
        ) : (
          <>
            {/* Refine button at top of results (mobile only, hidden on desktop where sidebar is visible) */}
            <div className="mb-4 md:hidden">
              <button
                onClick={openSearchDrawer}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl
                  bg-slate-900/60 border border-slate-700/50 hover:bg-slate-900/80 hover:border-slate-600/60
                  text-[13px] font-semibold text-slate-200 transition-all duration-200"
              >
                <Search size={14} className="text-slate-400 shrink-0" />
                Refine
                {activeFilterCount > 0 && (
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-indigo-600 text-white text-[9px] font-bold rounded-full tabular-nums">
                    {activeFilterCount > 9 ? '9+' : activeFilterCount}
                  </span>
                )}
              </button>
            </div>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Package size={22} className="text-zinc-800 mx-auto mb-2" />
                <p className="text-zinc-600 text-sm font-light">No products match your filters</p>
                <button onClick={clearAllFilters} className="mt-3 text-[12px] text-indigo-400 hover:text-indigo-300 transition-colors">
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                {/* Result count + sort */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] text-zinc-600 tabular-nums">
                    {filtered.length.toLocaleString()} result{filtered.length !== 1 ? 's' : ''}
                  </span>
                  <SortDropdown value={sortKey} onChange={setSortKey} />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                  {filtered.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
