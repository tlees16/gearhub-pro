'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, RotateCcw, Camera, Aperture, Zap, Search } from 'lucide-react'
import useStore from '../store/useStore'
import { getSpecLabelForCategory, getSpecUnit, SPEC_COLUMNS } from '../services/dataService'

const CATEGORIES = [
  { key: 'cameras',  label: 'Cameras',  icon: Camera,   accent: 'text-blue-400',   accentBg: 'bg-blue-500/10'   },
  { key: 'lenses',   label: 'Lenses',   icon: Aperture, accent: 'text-violet-400', accentBg: 'bg-violet-500/10' },
  { key: 'lighting', label: 'Lighting', icon: Zap,      accent: 'text-amber-400',  accentBg: 'bg-amber-500/10'  },
]

const STATIC_SUBS = {
  cameras: [
    { key: 'Cinema',        label: 'Cinema'        },
    { key: 'Mirrorless',    label: 'Mirrorless'    },
    { key: 'DSLR',          label: 'DSLR'          },
    { key: 'Medium Format', label: 'Medium Format' },
  ],
  lenses: [
    { key: 'Cinema', label: 'Cinema'  },
    { key: 'Photo',  label: 'Photo'   },
  ],
  lighting: [
    { key: 'LED Panel',    label: 'LED Panels'  },
    { key: 'LED Monolight',label: 'Monolights'  },
    { key: 'Fresnel',      label: 'Fresnels'    },
    { key: 'LED Tube',     label: 'LED Tubes'   },
    { key: 'LED Mat',      label: 'LED Mats'    },
    { key: 'Ring Light',   label: 'Ring Lights' },
    { key: 'HMI',          label: 'HMI'         },
  ],
}

const CINEMA_LENS = /\bT[0-9]|cine\b|cinema|\bPL\b|anamorphic|master\s*prime|signature\s*prime|summilux/i

function buildSubcategories(catKey, pool, allProducts) {
  const catPool = pool.filter(p => p.category === catKey)

  if (catKey === 'lenses') {
    return [
      { key: 'Cinema', label: 'Cinema',  count: catPool.filter(p => CINEMA_LENS.test(p.name)).length },
      { key: 'Photo',  label: 'Photo',   count: catPool.filter(p => !CINEMA_LENS.test(p.name)).length },
    ].filter(s => allProducts.some(p => p.category === 'lenses'))
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
  return Object.entries(counts).sort(([, a], [, b]) => b - a).map(([k, c]) => ({ key: k, label: k, count: c }))
}

// ─── PRIMARY specs shown per category (shown expanded by default) ─────────────
const PRIMARY_SPECS = {
  cameras:  new Set(['sensor_size', 'max_video_resolution', 'lens_mount', 'dynamic_range_stops', 'ibis', 'weather_sealed']),
  lenses:   new Set(['focal_length', 'max_aperture', 'lens_mount', 'image_stabilization']),
  lighting: new Set(['power_draw_w', 'color_type', 'battery_option']),
}

// ─── Checkbox filter ───────────────────────────────────────────────────────────
function CheckRow({ label, checked, onChange, count }) {
  return (
    <label className="flex items-center gap-3 py-2.5 md:py-2 px-0.5 cursor-pointer group min-h-[44px] md:min-h-[34px]">
      <div className={`w-5 h-5 md:w-4 md:h-4 rounded-[5px] border-[1.5px] flex items-center justify-center shrink-0 transition-all duration-150 ${
        checked
          ? 'bg-zinc-100 border-zinc-100'
          : 'border-zinc-700 group-hover:border-zinc-500 bg-transparent'
      }`}>
        {checked && (
          <svg className="w-2.5 h-2.5 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className={`flex-1 text-[13px] leading-snug transition-colors ${checked ? 'text-zinc-100' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
        {label}
      </span>
      {count !== undefined && (
        <span className="text-[10px] text-zinc-700 tabular-nums">{count}</span>
      )}
    </label>
  )
}

// ─── Range slider ─────────────────────────────────────────────────────────────
function RangeSlider({ min, max, value, onChange, unit = '', fmt }) {
  if (min === max || min == null || max == null) return null
  const [lo, hi] = value || [min, max]
  const pctMin = ((lo - min) / (max - min)) * 100
  const pctMax = ((hi - min) / (max - min)) * 100
  const step = max - min > 500 ? 10 : max - min > 100 ? 5 : 1
  const display = fmt ? fmt : (v) => `${v.toLocaleString()}${unit}`
  const isActive = value !== null

  return (
    <div className="space-y-3 pt-1">
      {/* Value readout */}
      <div className="flex items-center justify-between">
        <span className={`text-[13px] font-semibold tabular-nums ${isActive ? 'text-zinc-100' : 'text-zinc-400'}`}>
          {display(lo)}
        </span>
        <span className="text-[10px] text-zinc-700 px-2">—</span>
        <span className={`text-[13px] font-semibold tabular-nums ${isActive ? 'text-zinc-100' : 'text-zinc-400'}`}>
          {display(hi)}
        </span>
      </div>

      {/* Track */}
      <div className="relative h-12 md:h-10 flex items-center px-2">
        <div className="absolute left-2 right-2 h-[3px] bg-zinc-800 rounded-full" />
        <div
          className={`absolute h-[3px] rounded-full transition-all ${isActive ? 'bg-zinc-300' : 'bg-zinc-600'}`}
          style={{ left: `calc(${pctMin}% + ${(1 - pctMin / 100) * 4}px)`, right: `calc(${100 - pctMax}% + ${(pctMax / 100) * 4}px)` }}
        />
        <input
          type="range" min={min} max={max} step={step} value={lo}
          onChange={e => onChange([Math.min(Number(e.target.value), hi - step), hi])}
          className="range-thumb absolute left-2 right-2 w-[calc(100%-16px)]"
          style={{ zIndex: lo > max - step ? 3 : 1 }}
        />
        <input
          type="range" min={min} max={max} step={step} value={hi}
          onChange={e => onChange([lo, Math.max(Number(e.target.value), lo + step)])}
          className="range-thumb absolute left-2 right-2 w-[calc(100%-16px)]"
          style={{ zIndex: 2 }}
        />
      </div>

      {/* Range hints */}
      <div className="flex justify-between px-2">
        <span className="text-[9px] text-zinc-700 tabular-nums">{display(min)}</span>
        <span className="text-[9px] text-zinc-700 tabular-nums">{display(max)}</span>
      </div>
    </div>
  )
}

// ─── Boolean toggle ───────────────────────────────────────────────────────────
function BoolToggle({ label, value, onChange, trueLabel = 'Yes', falseLabel = 'No' }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className={`text-[13px] transition-colors ${value != null ? 'text-zinc-200' : 'text-zinc-400'}`}>{label}</span>
      <div className="flex gap-0.5 bg-zinc-900/80 border border-zinc-800/60 rounded-xl p-0.5">
        {[
          { v: true,  lbl: trueLabel  },
          { v: null,  lbl: 'Any'      },
          { v: false, lbl: falseLabel },
        ].map(({ v, lbl }) => (
          <button
            key={String(v)}
            onClick={() => onChange(value === v ? null : v)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all min-h-[36px] md:min-h-0 ${
              value === v
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-600 hover:text-zinc-300'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Collapsible section ──────────────────────────────────────────────────────
function Section({ title, defaultOpen = false, active = false, children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-zinc-800/50 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-3 text-left group min-h-[44px] md:min-h-0"
      >
        <span className={`text-[11px] font-semibold uppercase tracking-widest transition-colors ${
          active ? 'text-zinc-200' : 'text-zinc-500 group-hover:text-zinc-300'
        }`}>
          {title}
          {active && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 align-middle" />}
        </span>
        <ChevronDown size={12} className={`text-zinc-600 transition-transform duration-200 shrink-0 ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  )
}

// ─── Brand section ────────────────────────────────────────────────────────────
function BrandSection({ brands, selected, onToggle, counts }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => brands.filter(b => b.toLowerCase().includes(search.toLowerCase())), [brands, search])

  return (
    <div className="border-b border-zinc-800/50 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-3 text-left group min-h-[44px] md:min-h-0"
      >
        <span className={`text-[11px] font-semibold uppercase tracking-widest transition-colors ${
          selected.length > 0 ? 'text-zinc-200' : 'text-zinc-500 group-hover:text-zinc-300'
        }`}>
          Brand
          {selected.length > 0 && (
            <span className="ml-2 text-[9px] font-medium normal-case tracking-normal text-indigo-400 bg-indigo-500/15 px-1.5 py-0.5 rounded-full">
              {selected.length}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          <span className="text-[9px] text-zinc-700 bg-zinc-800/60 px-1.5 py-0.5 rounded-full">{brands.length}</span>
          <ChevronDown size={12} className={`text-zinc-600 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
        </span>
      </button>
      {open && (
        <div className="pb-4">
          <div className="relative mb-3">
            <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search brands…"
              className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl pl-8 pr-3 py-2.5 text-[12px] text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>
          <div className="space-y-0 max-h-56 overflow-y-auto scrollbar-none">
            {filtered.map(brand => (
              <CheckRow
                key={brand} label={brand}
                checked={selected.includes(brand)}
                onChange={() => onToggle(brand)}
                count={counts[brand]}
              />
            ))}
            {filtered.length === 0 && (
              <p className="text-[11px] text-zinc-700 py-4 text-center">No brands match</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function FilterSidebar() {
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
  const { numeric, categorical, boolean: boolSpec } = getSpecMeta()

  const totalCount = useMemo(() => {
    if (!activeCategory) return products.length
    return products.filter(p => p.category === activeCategory).length
  }, [products, activeCategory])

  const subcats = useMemo(() => {
    if (!activeCategory) return []
    return buildSubcategories(activeCategory, subcategoryPool, products)
  }, [activeCategory, subcategoryPool, products])

  const hasActive = !!(
    activeSubcategory || selectedBrands.length > 0 || priceRange !== null ||
    Object.values(specFilters).some(v => v?.length > 0) ||
    Object.keys(rangeFilters).length > 0 ||
    Object.values(booleanFilters).some(v => v != null)
  )

  // Spec filter elements
  const { primaryFilters, secondaryFilters } = useMemo(() => {
    if (!activeCategory) return { primaryFilters: [], secondaryFilters: [] }

    const PRIMARY = PRIMARY_SPECS[activeCategory]
    const specOrder = (SPEC_COLUMNS[activeCategory] || []).map(([col]) => col)
    const primary = []
    const secondary = []

    for (const col of specOrder) {
      const isPrimary = PRIMARY?.has(col) ?? true
      const bucket = isPrimary ? primary : secondary

      if (numeric[col] !== undefined) {
        const [smin, smax] = numeric[col]
        bucket.push(
          <Section key={col} title={getSpecLabelForCategory(col, activeCategory)} defaultOpen={isPrimary} active={!!rangeFilters[col]}>
            <RangeSlider
              min={Math.floor(smin)} max={Math.ceil(smax)}
              value={rangeFilters[col] || null}
              onChange={r => setRangeFilter(col, r)}
              unit={getSpecUnit(col)}
            />
          </Section>
        )
      } else if (categorical[col] !== undefined) {
        const vals = categorical[col]
        const sel = specFilters[col] || []
        bucket.push(
          <Section key={col} title={getSpecLabelForCategory(col, activeCategory)} defaultOpen={isPrimary && vals.length <= 8} active={sel.length > 0}>
            <div className="space-y-0">
              {vals.map(val => (
                <CheckRow
                  key={val} label={val}
                  checked={sel.includes(val)}
                  onChange={() => {
                    setSpecFilter(col, sel.includes(val) ? sel.filter(v => v !== val) : [...sel, val])
                  }}
                />
              ))}
            </div>
          </Section>
        )
      } else if (boolSpec[col] !== undefined) {
        bucket.push(
          <div key={col} className="border-b border-zinc-800/50 py-1 last:border-0">
            <BoolToggle
              label={getSpecLabelForCategory(col, activeCategory)}
              value={booleanFilters[col] ?? null}
              onChange={v => setBooleanFilter(col, v)}
            />
          </div>
        )
      }
    }

    return { primaryFilters: primary, secondaryFilters: secondary }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, numeric, categorical, boolSpec, specFilters, rangeFilters, booleanFilters])

  return (
    <div className="px-4 py-4 space-y-1">

      {/* ── Category tiles ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 pb-4">
        {CATEGORIES.map(({ key, label, icon: Icon, accent, accentBg }) => {
          const count = products.filter(p => p.category === key).length
          const isActive = activeCategory === key
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(isActive ? null : key)}
              className={`flex flex-col items-start gap-2.5 p-3.5 rounded-2xl border transition-all duration-200 ${
                isActive
                  ? `bg-zinc-800/70 border-zinc-600/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]`
                  : 'bg-zinc-900/40 border-zinc-800/40 hover:bg-zinc-900/70 hover:border-zinc-700/50'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl ${isActive ? accentBg : 'bg-zinc-800/60'} flex items-center justify-center transition-colors`}>
                <Icon size={15} className={isActive ? accent : 'text-zinc-600'} />
              </div>
              <div>
                <p className={`text-[12px] font-semibold leading-tight tracking-tight ${isActive ? 'text-zinc-100' : 'text-zinc-400'}`}>
                  {label}
                </p>
                <p className="text-[9px] text-zinc-700 tabular-nums mt-0.5">{count.toLocaleString()}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Subcategory chips ─────────────────────────────────────────────── */}
      {activeCategory && subcats.length > 0 && (
        <div className="pb-4 border-b border-zinc-800/50">
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            <button
              onClick={() => setActiveSubcategory(null)}
              className={`shrink-0 px-3.5 py-2 rounded-full text-[11px] font-medium border transition-all min-h-[36px] ${
                !activeSubcategory
                  ? 'bg-zinc-700 text-white border-zinc-600'
                  : 'bg-transparent text-zinc-500 border-zinc-800/60 hover:text-zinc-200 hover:border-zinc-600'
              }`}
            >
              All
            </button>
            {subcats.map(sub => (
              <button
                key={sub.key}
                onClick={() => setActiveSubcategory(activeSubcategory === sub.key ? null : sub.key)}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-medium border transition-all min-h-[36px] ${
                  activeSubcategory === sub.key
                    ? 'bg-zinc-700 text-white border-zinc-600'
                    : 'bg-transparent text-zinc-500 border-zinc-800/60 hover:text-zinc-200 hover:border-zinc-600'
                }`}
              >
                {sub.label}
                <span className="text-[9px] text-zinc-600 tabular-nums">{sub.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Spec filters ─────────────────────────────────────────────────── */}
      {activeCategory ? (
        <div className="space-y-0">
          {primaryFilters}
          {secondaryFilters}

          {/* Brand */}
          {brands.length > 0 && (
            <BrandSection
              brands={brands} selected={selectedBrands}
              onToggle={toggleBrand} counts={brandCounts}
            />
          )}

          {/* Price */}
          {priceMinMax && (
            <Section title="Price" defaultOpen={false} active={!!priceRange}>
              <RangeSlider
                min={Math.floor(priceMinMax[0])} max={Math.ceil(priceMinMax[1])}
                value={priceRange} onChange={setPriceRange}
                fmt={v => `$${v.toLocaleString()}`}
              />
            </Section>
          )}
        </div>
      ) : (
        /* No category selected — show brand + price for all products */
        <div className="space-y-0">
          {brands.length > 0 && (
            <BrandSection
              brands={brands} selected={selectedBrands}
              onToggle={toggleBrand} counts={brandCounts}
            />
          )}
          {priceMinMax && (
            <Section title="Price" defaultOpen={false} active={!!priceRange}>
              <RangeSlider
                min={Math.floor(priceMinMax[0])} max={Math.ceil(priceMinMax[1])}
                value={priceRange} onChange={setPriceRange}
                fmt={v => `$${v.toLocaleString()}`}
              />
            </Section>
          )}
        </div>
      )}
    </div>
  )
}
