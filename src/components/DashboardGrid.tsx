'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import FilterSidebar from './FilterSidebar'
import ProductList from './ProductList'
import useStore from '@/store/useStore'

export default function DashboardGrid() {
  const { searchDrawerOpen, closeSearchDrawer } = useStore()
  const filteredCount = useStore(s => s.getFilteredProducts().length)

  // Clean up drawer state when this component unmounts (user navigated away)
  useEffect(() => {
    return () => closeSearchDrawer()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-full flex flex-col overflow-hidden bg-zinc-950">

      {/* Search drawer */}
      {searchDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeSearchDrawer}
          />

          {/* Panel */}
          <div className="relative flex flex-col w-80 max-w-[90vw] h-full bg-zinc-950 border-r border-zinc-800 shadow-2xl overflow-hidden">

            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 flex-shrink-0">
              <span className="text-[12px] font-bold text-zinc-200 tracking-wide">Search Criteria</span>
              <button
                onClick={closeSearchDrawer}
                aria-label="Close"
                className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Filter content — scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <FilterSidebar />
            </div>

            {/* Sticky "Show results" button */}
            <div className="flex-shrink-0 p-3 border-t border-zinc-800 bg-zinc-950">
              <button
                onClick={closeSearchDrawer}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-semibold transition-colors"
              >
                Show {filteredCount.toLocaleString()} result{filteredCount !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      <ProductList />
    </div>
  )
}
