import { RotateCcw } from 'lucide-react'
import useStore from '../../store/useStore'
import SearchBar from './SearchBar'
import CategoryFilter from './CategoryFilter'
import BrandFilter from './BrandFilter'
import PriceFilter from './PriceFilter'
import SpecFilters from './SpecFilters'

export default function Sidebar() {
  const clearAllFilters = useStore(s => s.clearAllFilters)
  const selectedBrands = useStore(s => s.selectedBrands)
  const specFilters = useStore(s => s.specFilters)
  const rangeFilters = useStore(s => s.rangeFilters)
  const priceRange = useStore(s => s.priceRange)
  const searchQuery = useStore(s => s.searchQuery)

  const hasFilters = selectedBrands.length > 0 ||
    priceRange !== null ||
    Object.values(specFilters).some(v => v?.length > 0) ||
    Object.values(rangeFilters).some(v => v !== null) ||
    searchQuery.trim()

  return (
    <aside className="w-64 shrink-0 border-r border-zinc-800 bg-zinc-950/50 flex flex-col h-full overflow-hidden">
      <div className="p-4 space-y-5 overflow-y-auto flex-1 scrollbar-thin">
        <SearchBar />
        <CategoryFilter />

        <div className="border-t border-zinc-800/50" />
        <BrandFilter />

        <div className="border-t border-zinc-800/50" />
        <PriceFilter />

        <div className="border-t border-zinc-800/50" />
        <SpecFilters />
      </div>

      {hasFilters && (
        <div className="p-3 border-t border-zinc-800">
          <button
            onClick={clearAllFilters}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Clear all filters
          </button>
        </div>
      )}
    </aside>
  )
}
