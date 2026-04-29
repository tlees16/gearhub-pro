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
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#080c14' }}>

          {/* Header */}
          <div className="flex-shrink-0 flex items-center gap-3 px-5 pt-6 pb-4">
            <h2 className="text-[17px] font-bold text-white tracking-tight">Search Criteria</h2>
            <button
              onClick={closeSearchDrawer}
              aria-label="Close"
              className="ml-auto flex items-center justify-center w-8 h-8 rounded-full bg-slate-800/60 hover:bg-slate-700/80 text-slate-400 hover:text-white transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Search input */}
          <div className="flex-shrink-0 px-5 pb-5">
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-slate-900 border border-slate-700/50 focus-within:border-slate-500/70 transition-colors">
              <Search size={16} className="text-slate-500 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cameras, lenses, lighting..."
                className="flex-1 bg-transparent text-[14px] text-slate-100 placeholder-slate-600 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-600 hover:text-slate-400 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="flex-shrink-0 h-px bg-slate-800/50 mx-5" />

          {/* Filter content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <FilterSidebar />
          </div>

          {/* Show results CTA */}
          <div className="flex-shrink-0 px-5 py-5 border-t border-slate-800/50" style={{ background: '#080c14' }}>
            <button
              onClick={closeSearchDrawer}
              className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-[15px] font-bold tracking-tight transition-colors shadow-[0_4px_24px_rgba(99,102,241,0.3)]"
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
