'use client'

import { useState, useMemo } from 'react'
import {
  ChevronDown, RotateCcw, Camera, Aperture, Zap,
  SlidersHorizontal, Search,
} from 'lucide-react'
import useStore from '../store/useStore'
import { getSpecLabelForCategory, getSpecUnit, SPEC_COLUMNS } from '../services/dataService'

// ─── Category config (3 launch categories only) ───────────────────────────────
const CATEGORIES = [
  { key: 'cameras',  label: 'Cameras',  icon: Camera   },
  { key: 'lenses',   label: 'Lenses',   icon: Aperture },
  { key: 'lighting', label: 'Lighting', icon: Zap      },
]

const CINEMA_LENS = /\bT[0-9]|cine\b|cinema|\bPL\b|anamorphic|master\s*prime|signature\s*prime|summilux/i

const STATIC_SUBS = {
  cameras: [
    { key: 'Cinema',        label: 'Cinema' },
    { key: 'Mirrorless',    label: 'Mirrorless' },
    { key: 'DSLR',          label: 'DSLR' },
    { key: 'Medium Format', label: 'Medium Format' },
  ],
  lenses: [
    { key: 'Cinema', label: 'Cinema Lenses' },
    { key: 'Photo',  label: 'Photo & Mirrorless' },
  ],
  lighting: [
    { key: 'LED Panel',     label: 'LED Panels' },
    { key: 'LED Monolight', label: 'LED Monolights' },
    { key: 'LED Tube',      label: 'LED Tubes' },
    { key: 'Fresnel',       label: 'Fresnels' },
    { key: 'HMI',           label: 'HMI' },
    { key: 'Ring Light',    label: 'Ring Lights' },
  ],
}

function buildSubcategories(catKey, pool, allProducts) {
  const catPool = pool.filter(p => p.category === catKey)

  if (catKey === 'lenses') {
    return [
      { key: 'Cinema', label: 'Cinema Lenses',      count: catPool.filter(p => CINEMA_LENS.test(p.name)).length },
      { key: 'Photo',  label: 'Photo & Mirrorless', count: catPool.filter(p => !CINEMA_LENS.test(p.name)).length },
    ].filter(s => s.count > 0 || allProducts.some(p => p.category === 'lenses'))
  }

  const staticDefs = STATIC_SUBS[catKey]
  if (staticDefs) {
    const counts = {}
    catPool.forEach(p => { if (p.subcategory) counts[p.subcategory] = (counts[p.subcategory] || 0) + 1 })
    return staticDefs
      .map(s => ({ ...s, count: counts[s.key] || 0 }))
      .filter(s => allProducts.some(p => p.category === catKey && p.subcategory === s.key))
  }

  const counts = {}
  catPool.forEach(p => { if (p.subcategory) counts[p.subcategory] = (counts[p.subcategory] || 0) + 1 })
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .map(([k, c]) => ({ key: k, label: k, count: c }))
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function FilterSection({ title, children, defaultOpen = true, count }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-slate-800/40 pb-3 mb-3 last:border-0 last:mb-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left py-1 min-h-[36px] text-[10px] font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors duration-150"
      >
        <span className="flex items-center gap-1.5">
          {title}
          {count !== undefined && (
            <span className="text-[9px] font-normal normal-case tracking-normal text-slate-600 bg-slate-800/60 px-1.5 rounded-full">
              {count}
            </span>
          )}
        </span>
        <ChevronDown size={11} className={`transition-transform duration-200 shrink-0 ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="mt-2 space-y-0.5">{children}</div>
      )}
    </div>
  )
}

function CheckboxFilter({ label, checked, onChange, count }) {
  return (
    <label className="flex items-center gap-2.5 text-[12px] text-slate-400 hover:text-slate-100 cursor-pointer min-h-[40px] md:min-h-[30px] group transition-colors duration-150 px-1">
      <div className={`w-[18px] h-[18px] md:w-4 md:h-4 rounded-[4px] border-[1.5px] flex items-center justify-center transition-all duration-150 shrink-0 ${
        checked
          ? 'bg-indigo-500 border-indigo-500'
          : 'border-slate-600 group-hover:border-slate-400 bg-transparent'
      }`}>
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className="flex-1 leading-snug">{label}</span>
      {count !== undefined && (
        <span className="text-slate-700 text-[10px] tabular-nums shrink-0">{count}</span>
      )}
    </label>
  )
}

function RangeFilter({ min, max, value, onChange, unit = '' }) {
  if (min === max) return null
  const [localMin, localMax] = value || [min, max]
  const pctMin = ((localMin - min) / (max - min)) * 100
  const pctMax = ((localMax - min) / (max - min)) * 100
  const step = max - min > 100 ? 10 : 1

  return (
    <div className="space-y-2.5 pt-1 px-1">
      <div className="flex justify-between items-baseline">
        <span className="text-[11px] text-indigo-400 font-mono tabular-nums">{localMin.toLocaleString()}{unit}</span>
        <span className="text-[9px] text-slate-600 font-light">to</span>
        <span className="text-[11px] text-indigo-400 font-mono tabular-nums">{localMax.toLocaleString()}{unit}</span>
      </div>
      <div className="range-slider relative h-6">
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[3px] bg-slate-800 rounded-full" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-[3px] bg-indigo-500/60 rounded-full"
          style={{ left: `${pctMin}%`, width: `${pctMax - pctMin}%` }}
        />
        <input type="range" min={min} max={max} step={step} value={localMin}
          onChange={e => onChange([Math.min(Number(e.target.value), localMax), localMax])}
          className="range-thumb absolute inset-0 w-full"
          style={{ zIndex: localMin > max - step ? 3 : 1 }}
        />
        <input type="range" min={min} max={max} step={step} value={localMax}
          onChange={e => onChange([localMin, Math.max(Number(e.target.value), localMin)])}
          className="range-thumb absolute inset-0 w-full"
          style={{ zIndex: 2 }}
        />
      </div>
    </div>
  )
}

function BooleanFilter({ label, value, onChange, trueCount, falseCount }) {
  return (
    <div className="flex items-center justify-between px-1 py-2 min-h-[44px] md:min-h-0 border-b border-slate-800/30 last:border-0 mb-1">
      <span className="text-[12px] text-slate-400">{label}</span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onChange(value === true ? null : true)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all min-h-[32px] md:min-h-0 ${
            value === true
              ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-inset ring-indigo-500/30'
              : 'text-slate-600 hover:text-slate-300 hover:bg-slate-800/50'
          }`}
        >
          Yes{trueCount !== undefined ? ` (${trueCount})` : ''}
        </button>
        <button
          onClick={() => onChange(value === false ? null : false)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all min-h-[32px] md:min-h-0 ${
            value === false
              ? 'bg-red-500/20 text-red-300 ring-1 ring-inset ring-red-500/30'
              : 'text-slate-600 hover:text-slate-300 hover:bg-slate-800/50'
          }`}
        >
          No{falseCount !== undefined ? ` (${falseCount})` : ''}
        </button>
      </div>
    </div>
  )
}

function BrandFilterSection({ brands, selectedBrands, toggleBrand, brandCounts }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const filtered = useMemo(
    () => brands.filter(b => b.toLowerCase().includes(search.toLowerCase())),
    [brands, search]
  )

  return (
    <div className="border-b border-slate-800/40 pb-3 mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left py-1 min-h-[36px] text-[10px] font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors duration-150"
      >
        <span className="flex items-center gap-1.5">
          Brand
          {selectedBrands.length > 0 && (
            <span className="text-[9px] font-medium normal-case tracking-normal text-indigo-400 bg-indigo-500/15 px-1.5 rounded-full">
              {selectedBrands.length} selected
            </span>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-[9px] font-normal normal-case tracking-normal text-slate-600 bg-slate-800/60 px-1.5 rounded-full">{brands.length}</span>
          <ChevronDown size={11} className={`transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
        </span>
      </button>
      {open && (
        <div className="mt-2">
          <div className="relative mb-2">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search brands…"
              className="w-full bg-slate-900 border border-slate-700/50 rounded-lg pl-7 pr-3 py-2 text-[12px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>
          <div className="space-y-0 max-h-60 overflow-y-auto scrollbar-none">
            {filtered.map(brand => (
              <CheckboxFilter
                key={brand} label={brand}
                checked={selectedBrands.includes(brand)}
                onChange={() => toggleBrand(brand)}
                count={brandCounts[brand]}
              />
            ))}
            {filtered.length === 0 && (
              <p className="text-[11px] text-slate-600 font-light py-3 text-center">No brands match</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function CategoryRow({ catKey, label, icon: Icon, products, subcategoryPool, activeCategory, activeSubcategory, setActiveCategory, setActiveSubcategory }) {
  const isActive = activeCategory === catKey

  const catCount = useMemo(
    () => products.filter(p => p.category === catKey).length,
    [catKey, products]
  )

  const subcats = useMemo(
    () => buildSubcategories(catKey, subcategoryPool, products),
    [catKey, subcategoryPool, products]
  )

  return (
    <div>
      <button
        onClick={() => setActiveCategory(isActive ? null : catKey)}
        className={`flex items-center gap-2.5 w-full px-3 rounded-xl text-[13px] font-medium transition-all duration-150 group min-h-[44px] md:min-h-[38px] ${
          isActive
            ? 'bg-indigo-500/10 text-indigo-200 ring-1 ring-inset ring-indigo-500/20'
            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
        }`}
      >
        <Icon size={14} className={`shrink-0 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
        <span className="flex-1 text-left tracking-tight">{label}</span>
        {subcats.length > 0 && (
          <ChevronDown
            size={11}
            className={`shrink-0 transition-transform duration-200 ${isActive ? '' : '-rotate-90'} ${isActive ? 'text-indigo-400/60' : 'text-slate-700'}`}
          />
        )}
        <span className={`text-[10px] tabular-nums font-light shrink-0 ${isActive ? 'text-indigo-400/50' : 'text-slate-700'}`}>
          {catCount}
        </span>
      </button>

      {isActive && subcats.length > 0 && (
        <div className="ml-3 mt-1 mb-1.5 pl-3 border-l border-slate-800/60 space-y-0.5">
          <button
            onClick={() => setActiveSubcategory(null)}
            className={`flex items-center justify-between w-full py-1.5 px-2 rounded-lg text-[12px] min-h-[36px] md:min-h-0 transition-colors duration-150 ${
              !activeSubcategory
                ? 'text-indigo-300 font-semibold bg-indigo-500/8'
                : 'text-slate-500 hover:text-slate-200 font-light'
            }`}
          >
            <span>All {label}</span>
            <span className={`text-[10px] tabular-nums ${!activeSubcategory ? 'text-indigo-400/50' : 'text-slate-700'}`}>
              {subcats.reduce((s, c) => s + c.count, 0) || catCount}
            </span>
          </button>

          {subcats.map(sub => {
            const isSub = activeSubcategory === sub.key
            return (
              <button
                key={sub.key}
                onClick={() => setActiveSubcategory(isSub ? null : sub.key)}
                className={`flex items-center justify-between w-full py-1.5 px-2 rounded-lg text-[12px] min-h-[36px] md:min-h-0 transition-colors duration-150 ${
                  isSub
                    ? 'text-indigo-300 font-semibold bg-indigo-500/8'
                    : 'text-slate-500 hover:text-slate-200 font-light'
                }`}
              >
                <span>{sub.label}</span>
                <span className={`text-[10px] tabular-nums ${isSub ? 'text-indigo-400/50' : 'text-slate-700'}`}>
                  {sub.count}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CategoryNav({ products, subcategoryPool, activeCategory, activeSubcategory, setActiveCategory, setActiveSubcategory }) {
  return (
    <div className="space-y-1">
      {CATEGORIES.map(({ key, label, icon }) => (
        <CategoryRow
          key={key} catKey={key} label={label} icon={icon}
          products={products} subcategoryPool={subcategoryPool}
          activeCategory={activeCategory} activeSubcategory={activeSubcategory}
          setActiveCategory={setActiveCategory} setActiveSubcategory={setActiveSubcategory}
        />
      ))}
    </div>
  )
}

// ─── Primary spec keys per category ──────────────────────────────────────────
const PRIMARY_SPECS = {
  cameras:  new Set(['sensor_size', 'sensor_type', 'lens_mount', 'max_video_resolution', 'dynamic_range_stops', 'weight_g']),
  lenses:   new Set(['focal_length', 'max_aperture', 'lens_mount', 'filter_size']),
  lighting: new Set(['item_type', 'subcategory', 'power_draw_w', 'color_type']),
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function FilterSidebar({ className = '' }) {
  const {
    activeCategory, activeSubcategory, selectedBrands, priceRange,
    specFilters, rangeFilters, booleanFilters,
    setActiveCategory, setActiveSubcategory, toggleBrand, setPriceRange,
    setSpecFilter, setRangeFilter, setBooleanFilter,
    clearAllFilters, getAvailableBrands, getBrandCounts, getPriceRange, getSpecMeta,
    getFilteredProducts, getSubcategoryPool, products,
  } = useStore()

  const brands          = getAvailableBrands()
  const brandCounts     = getBrandCounts()
  const subcategoryPool = getSubcategoryPool()
  const priceMinMax     = getPriceRange()
  const { numeric, categorical, boolean: booleanSpecs } = getSpecMeta()
  const filteredCount   = getFilteredProducts().length

  const totalCount = useMemo(() => {
    if (!activeCategory) return products.length
    return products.filter(p => p.category === activeCategory).length
  }, [products, activeCategory])

  const hasActiveFilters = !!(
    activeSubcategory || selectedBrands.length > 0 || priceRange !== null ||
    Object.values(specFilters).some(v => v && v.length > 0) ||
    Object.keys(rangeFilters).length > 0 ||
    Object.values(booleanFilters).some(v => v !== null && v !== undefined)
  )

  // Build spec filter elements — all visible, primary first and open, secondary below and closed
  const specElements = useMemo(() => {
    if (!activeCategory) return { primary: [], secondary: [] }

    const PRIMARY = PRIMARY_SPECS[activeCategory]
    const specOrder = (SPEC_COLUMNS[activeCategory] || []).map(([col]) => col)
    const primary = []
    const secondary = []

    for (const col of specOrder) {
      const isPrimary = PRIMARY ? PRIMARY.has(col) : true
      const bucket = isPrimary ? primary : secondary

      if (numeric[col] !== undefined) {
        bucket.push(
          <FilterSection key={col} title={getSpecLabelForCategory(col, activeCategory)} defaultOpen={false}>
            <RangeFilter
              min={Math.floor(numeric[col][0])} max={Math.ceil(numeric[col][1])}
              value={rangeFilters[col] || null}
              onChange={range => setRangeFilter(col, range)}
              unit={getSpecUnit(col)}
            />
          </FilterSection>
        )
      } else if (categorical[col] !== undefined) {
        bucket.push(
          <FilterSection key={col} title={getSpecLabelForCategory(col, activeCategory)} count={categorical[col].length} defaultOpen={false}>
            {categorical[col].map(val => (
              <CheckboxFilter
                key={val} label={val}
                checked={(specFilters[col] || []).includes(val)}
                onChange={() => {
                  const current = specFilters[col] || []
                  setSpecFilter(col, current.includes(val)
                    ? current.filter(v => v !== val)
                    : [...current, val])
                }}
              />
            ))}
          </FilterSection>
        )
      } else if (booleanSpecs[col] !== undefined) {
        const { trueCount, falseCount } = booleanSpecs[col]
        bucket.push(
          <BooleanFilter
            key={col}
            label={getSpecLabelForCategory(col, activeCategory)}
            value={booleanFilters[col] ?? null}
            onChange={v => setBooleanFilter(col, v)}
            trueCount={trueCount}
            falseCount={falseCount}
          />
        )
      }
    }

    return { primary, secondary }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, numeric, categorical, booleanSpecs, specFilters, rangeFilters, booleanFilters])

  return (
    <aside className={`w-full bg-slate-950 overflow-y-scroll overscroll-contain scrollbar-none flex flex-col ${className}`}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-800/40 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={13} className="text-indigo-400" />
            <span className="text-[12px] font-bold text-slate-200 tracking-wide">Search Criteria</span>
          </div>
          {(activeCategory || hasActiveFilters) && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-400 transition-colors min-h-[36px] md:min-h-0 px-1"
            >
              <RotateCcw size={10} />
              Reset
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-600 font-light mt-1 tabular-nums">
          {filteredCount.toLocaleString()} of {totalCount.toLocaleString()} products
        </p>
      </div>

      <div className="px-3 py-3 flex-1 space-y-0">
        {/* Category nav */}
        <div className="border-b border-slate-800/40 pb-3 mb-3">
          <CategoryNav
            products={products} subcategoryPool={subcategoryPool}
            activeCategory={activeCategory} activeSubcategory={activeSubcategory}
            setActiveCategory={setActiveCategory} setActiveSubcategory={setActiveSubcategory}
          />
        </div>

        {/* Brand */}
        {brands.length > 0 && (
          <BrandFilterSection
            brands={brands} selectedBrands={selectedBrands}
            toggleBrand={toggleBrand} brandCounts={brandCounts}
          />
        )}

        {/* Price */}
        {priceMinMax && (
          <FilterSection title="Price" defaultOpen={false}>
            <RangeFilter
              min={Math.floor(priceMinMax[0])} max={Math.ceil(priceMinMax[1])}
              value={priceRange} onChange={setPriceRange}
            />
          </FilterSection>
        )}

        {/* Primary spec filters (open by default) */}
        {specElements.primary}

        {/* Secondary spec filters (visible but closed by default) */}
        {specElements.secondary.length > 0 && (
          <>
            <div className="pt-1 pb-2">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-700">
                Additional Filters
              </span>
            </div>
            {specElements.secondary}
          </>
        )}

        {!activeCategory && (
          <div className="text-center py-10">
            <SlidersHorizontal size={18} className="text-slate-800 mx-auto mb-2.5" />
            <p className="text-[12px] text-slate-600 font-light leading-relaxed">
              Select a category<br />to unlock spec filters
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}
