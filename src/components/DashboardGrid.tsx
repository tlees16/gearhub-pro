'use client'

import { useEffect } from 'react'
import { X, Search, SlidersHorizontal, RotateCcw } from 'lucide-react'
import FilterSidebar from './FilterSidebar'
import ProductList from './ProductList'
import useStore from '@/store/useStore'

export default function DashboardGrid() {
  const {
    searchDrawerOpen, closeSearchDrawer,
    searchQuery, setSearchQuery,
    clearAllFilters,
    activeCategory, activeSubcategory, selectedBrands, priceRange,
    specFilters, rangeFilters, booleanFilters,
  } = useStore()

  const filteredCount = useStore(s => s.getFilteredProducts().length)

  const activeFilterCount = [
    activeCategory ? 1 : 0,
    activeSubcategory ? 1 : 0,
    selectedBrands.length,
    priceRange ? 1 : 0,
    Object.values(specFilters as Record<string, string[]>).filter(v => Array.isArray(v) && v.length > 0).length,
    Object.keys(rangeFilters).length,
    Object.values(booleanFilters as Record<string, boolean | null>).filter(v => v != null).length,
  ].reduce((a, b) => a + b, 0)

  useEffect(() => {
    return () => closeSearchDrawer()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-full flex flex-col overflow-hidden bg-zinc-950">

      {searchDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#080c14' }}>

          {/* Header */}
          <div className="flex-shrink-0 flex items-center gap-3 px-4 pt-5 pb-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-zinc-500" />
              <span className="text-[15px] font-bold text-white tracking-tight">Search Criteria</span>
              {activeFilterCount > 0 && (
                <span className="text-[9px] font-bold text-zinc-400 bg-zinc-800 border border-zinc-700/50 px-1.5 py-0.5 rounded-full tabular-nums">
                  {activeFilterCount} active
                </span>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-all min-h-[36px] md:min-h-0"
                >
                  <RotateCcw size={10} />
                  Reset
                </button>
              )}
              <button
                onClick={closeSearchDrawer}
                aria-label="Close"
                className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800/60 hover:bg-zinc-700/80 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Search input */}
          <div className="flex-shrink-0 px-4 pb-4">
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/60 focus-within:border-zinc-600/80 transition-colors">
              <Search size={15} className="text-zinc-600 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cameras, lenses, lighting…"
                className="flex-1 bg-transparent text-[14px] text-zinc-100 placeholder-zinc-700 outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 h-px bg-zinc-800/60 mx-4" />

          {/* Filter content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <FilterSidebar />
          </div>

          {/* Show results CTA */}
          <div className="flex-shrink-0 px-4 py-4 border-t border-zinc-800/60" style={{ background: '#080c14' }}>
            <button
              onClick={closeSearchDrawer}
              className="w-full py-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 text-white text-[15px] font-bold tracking-tight transition-colors border border-zinc-700/60"
            >
              Show {filteredCount.toLocaleString()} result{filteredCount !== 1 ? 's' : ''}
            </button>
          </div>

        </div>
      )}

      <ProductList />
    </div>
  )
}
