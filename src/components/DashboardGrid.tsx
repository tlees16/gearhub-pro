'use client'

import { useEffect } from 'react'
import { X, Search } from 'lucide-react'
import FilterSidebar from './FilterSidebar'
import ProductList from './ProductList'
import useStore from '@/store/useStore'

export default function DashboardGrid() {
  const { searchDrawerOpen, closeSearchDrawer, searchQuery, setSearchQuery } = useStore()
  const filteredCount = useStore(s => s.getFilteredProducts().length)

  useEffect(() => {
    return () => closeSearchDrawer()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-full flex flex-col overflow-hidden bg-zinc-950">

      {/* ── Full-page search overlay ── */}
      {searchDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">

          {/* Header */}
          <div className="flex-shrink-0 flex items-center gap-3 px-4 pt-5 pb-3">
            <h2 className="text-[16px] font-bold text-white tracking-tight">Search Criteria</h2>
            <button
              onClick={closeSearchDrawer}
              aria-label="Close"
              className="ml-auto flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Search input */}
          <div className="flex-shrink-0 px-4 pb-4">
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 focus-within:border-zinc-600 transition-colors">
              <Search size={16} className="text-zinc-500 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cameras, lenses, lighting..."
                className="flex-1 bg-transparent text-[14px] text-zinc-200 placeholder-zinc-600 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="flex-shrink-0 h-px bg-zinc-800/60 mx-4" />

          {/* Filter content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <FilterSidebar />
          </div>

          {/* Show results CTA */}
          <div className="flex-shrink-0 px-4 py-4 border-t border-zinc-800/50 bg-zinc-950">
            <button
              onClick={closeSearchDrawer}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-[15px] font-semibold tracking-tight transition-colors"
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
