import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, RotateCcw, Camera, Aperture, Zap, SlidersHorizontal } from 'lucide-react'
import useStore from '../store/useStore'
import { getSpecLabel, getSpecUnit, isBooleanSpec } from '../services/dataService'

const CATEGORIES = [
  { key: 'cameras', label: 'Cameras', icon: Camera },
  { key: 'lenses', label: 'Lenses', icon: Aperture },
  { key: 'lighting', label: 'Lighting', icon: Zap },
]

function FilterSection({ title, children, defaultOpen = true, count }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-slate-800/40 pb-3 mb-3 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left text-[10px] font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors duration-200"
      >
        <span className="flex items-center gap-1.5">
          {title}
          {count !== undefined && (
            <span className="text-[9px] font-normal text-slate-600 bg-slate-800/50 px-1 rounded">
              {count}
            </span>
          )}
        </span>
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? 'mt-2.5 max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="space-y-0.5">{children}</div>
      </div>
    </div>
  )
}

function CheckboxFilter({ label, checked, onChange, count }) {
  return (
    <label className="flex items-center gap-2 text-[12px] text-slate-400 hover:text-slate-200 cursor-pointer py-[3px] group transition-colors duration-200">
      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all duration-200 ${
        checked
          ? 'bg-indigo-500 border-indigo-500'
          : 'border-slate-700 group-hover:border-slate-500'
      }`}>
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className="flex-1 truncate font-light">{label}</span>
      {count !== undefined && (
        <span className="text-slate-700 text-[10px] tabular-nums">{count}</span>
      )}
    </label>
  )
}

function RangeFilter({ label, min, max, value, onChange, unit = '' }) {
  if (min === max) return null
  const [localMin, localMax] = value || [min, max]
  const pctMin = ((localMin - min) / (max - min)) * 100
  const pctMax = ((localMax - min) / (max - min)) * 100
  const step = max - min > 100 ? 10 : 1

  return (
    <div className="space-y-2.5 pt-1">
      <div className="flex justify-between items-baseline">
        <span className="text-[11px] text-indigo-400 font-mono tabular-nums">
          {localMin.toLocaleString()}{unit}
        </span>
        <span className="text-[9px] text-slate-600 font-light">to</span>
        <span className="text-[11px] text-indigo-400 font-mono tabular-nums">
          {localMax.toLocaleString()}{unit}
        </span>
      </div>
      {/* Unified dual-thumb slider */}
      <div className="range-slider relative h-5">
        {/* Track background */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[3px] bg-slate-800 rounded-full" />
        {/* Active range fill */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-[3px] bg-indigo-500/50 rounded-full transition-all duration-150"
          style={{ left: `${pctMin}%`, width: `${pctMax - pctMin}%` }}
        />
        {/* Min thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localMin}
          onChange={(e) => {
            const v = Number(e.target.value)
            onChange([Math.min(v, localMax), localMax])
          }}
          className="range-thumb absolute inset-0 w-full"
          style={{ zIndex: localMin > max - step ? 3 : 1 }}
        />
        {/* Max thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localMax}
          onChange={(e) => {
            const v = Number(e.target.value)
            onChange([localMin, Math.max(v, localMin)])
          }}
          className="range-thumb absolute inset-0 w-full"
          style={{ zIndex: 2 }}
        />
      </div>
    </div>
  )
}

export default function FilterSidebar() {
  const {
    activeCategory,
    selectedBrands,
    priceRange,
    specFilters,
    rangeFilters,
    booleanFilters,
    setActiveCategory,
    toggleBrand,
    setPriceRange,
    setSpecFilter,
    setRangeFilter,
    setBooleanFilter,
    clearAllFilters,
    getAvailableBrands,
    getPriceRange,
    getSpecMeta,
    getFilteredProducts,
    products,
  } = useStore()

  const brands = getAvailableBrands()
  const priceMinMax = getPriceRange()
  const { numeric, categorical, boolean: booleanSpecs } = getSpecMeta()
  const filteredCount = getFilteredProducts().length
  const totalCount = activeCategory
    ? products.filter(p => p.category === activeCategory).length
    : products.length

  const hasActiveFilters = selectedBrands.length > 0 ||
    priceRange !== null ||
    Object.values(specFilters).some(v => v && v.length > 0) ||
    Object.keys(rangeFilters).length > 0 ||
    Object.values(booleanFilters).some(v => v !== null && v !== undefined)

  const brandCounts = useMemo(() => {
    const pool = activeCategory
      ? products.filter(p => p.category === activeCategory)
      : products
    const counts = {}
    for (const p of pool) {
      counts[p.brand] = (counts[p.brand] || 0) + 1
    }
    return counts
  }, [products, activeCategory])

  const getCategoryCount = (key) =>
    products.filter(p => p.category === key).length

  return (
    <aside className="w-72 min-w-[288px] bg-slate-900/50 backdrop-blur-md border-r border-slate-800/40 overflow-y-auto flex flex-col">
      {/* Sidebar header */}
      <div className="p-4 border-b border-slate-800/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={13} className="text-indigo-400" />
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Filters</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors duration-200"
            >
              <RotateCcw size={9} />
              Reset
            </button>
          )}
        </div>
        <p className="text-[10px] text-slate-600 font-light mt-1 tabular-nums">
          {filteredCount} of {totalCount} products
        </p>
      </div>

      <div className="p-4 space-y-0 flex-1">
        {/* Category selection — always at top */}
        <FilterSection title="Category">
          <div className="space-y-0.5">
            {CATEGORIES.map(({ key, label, icon: Icon }) => {
              const active = activeCategory === key
              const count = getCategoryCount(key)
              return (
                <button
                  key={key}
                  onClick={() => setActiveCategory(active ? null : key)}
                  className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-300 ${
                    active
                      ? 'bg-indigo-500/10 text-indigo-300 ring-1 ring-inset ring-indigo-500/20'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <Icon size={14} className={active ? 'text-indigo-400' : 'text-slate-600'} />
                  <span className="flex-1 text-left">{label}</span>
                  <span className={`text-[10px] tabular-nums font-light ${active ? 'text-indigo-400/60' : 'text-slate-700'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </FilterSection>

        {/* Brand filter */}
        {brands.length > 0 && (
          <FilterSection title="Brand" count={brands.length}>
            {brands.map(brand => (
              <CheckboxFilter
                key={brand}
                label={brand}
                checked={selectedBrands.includes(brand)}
                onChange={() => toggleBrand(brand)}
                count={brandCounts[brand]}
              />
            ))}
          </FilterSection>
        )}

        {/* Price filter */}
        {priceMinMax && (
          <FilterSection title="Price">
            <RangeFilter
              label="Price"
              min={Math.floor(priceMinMax[0])}
              max={Math.ceil(priceMinMax[1])}
              value={priceRange}
              onChange={setPriceRange}
              unit=""
            />
          </FilterSection>
        )}

        {/* Dynamic tech spec filters */}
        {activeCategory && (
          <>
            {(Object.entries(numeric).length > 0 || Object.entries(categorical).length > 0) && (
              <div className="pt-1 mb-2">
                <div className="text-[9px] uppercase tracking-widest text-slate-600/80 font-semibold">
                  Technical Specs
                </div>
              </div>
            )}

            {/* Numeric spec sliders */}
            {Object.entries(numeric).map(([specName, [min, max]]) => (
              <FilterSection
                key={specName}
                title={getSpecLabel(specName)}
                defaultOpen={true}
              >
                <RangeFilter
                  label={specName}
                  min={Math.floor(min)}
                  max={Math.ceil(max)}
                  value={rangeFilters[specName] || null}
                  onChange={(range) => setRangeFilter(specName, range)}
                  unit={getSpecUnit(specName)}
                />
              </FilterSection>
            ))}

            {/* Categorical spec checkboxes */}
            {Object.entries(categorical).map(([specName, values]) => (
              <FilterSection
                key={specName}
                title={getSpecLabel(specName)}
                defaultOpen={specName === 'subcategory' || specName === 'form_factor'}
                count={values.length}
              >
                {values.map(val => (
                  <CheckboxFilter
                    key={val}
                    label={val}
                    checked={(specFilters[specName] || []).includes(val)}
                    onChange={() => {
                      const current = specFilters[specName] || []
                      const next = current.includes(val)
                        ? current.filter(v => v !== val)
                        : [...current, val]
                      setSpecFilter(specName, next)
                    }}
                  />
                ))}
              </FilterSection>
            ))}

            {/* Boolean toggle filters */}
            {Object.entries(booleanSpecs).length > 0 && (
              <div className="pt-1 mb-2">
                <div className="text-[9px] uppercase tracking-widest text-slate-600/80 font-semibold">
                  Features
                </div>
              </div>
            )}
            {Object.entries(booleanSpecs).map(([specName, { trueCount, falseCount }]) => (
              <div key={specName} className="flex items-center justify-between px-1 py-1.5">
                <span className="text-[12px] text-slate-400 font-light">{getSpecLabel(specName)}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setBooleanFilter(specName, booleanFilters[specName] === true ? null : true)}
                    className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                      booleanFilters[specName] === true
                        ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-inset ring-indigo-500/30'
                        : 'text-slate-600 hover:text-slate-400'
                    }`}
                  >
                    Yes ({trueCount})
                  </button>
                  <button
                    onClick={() => setBooleanFilter(specName, booleanFilters[specName] === false ? null : false)}
                    className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                      booleanFilters[specName] === false
                        ? 'bg-red-500/20 text-red-300 ring-1 ring-inset ring-red-500/30'
                        : 'text-slate-600 hover:text-slate-400'
                    }`}
                  >
                    No ({falseCount})
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {!activeCategory && (
          <div className="text-center py-8">
            <SlidersHorizontal size={18} className="text-slate-800 mx-auto mb-2" />
            <p className="text-[11px] text-slate-600 font-light leading-relaxed">
              Select a category to unlock<br />technical spec filters
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}
