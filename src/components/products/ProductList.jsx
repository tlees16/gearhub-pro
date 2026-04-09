import { PackageOpen, Loader2 } from 'lucide-react'
import useStore from '../../store/useStore'
import ProductRow from './ProductRow'

export default function ProductList() {
  const loading = useStore(s => s.loading)
  const error = useStore(s => s.error)
  const getFilteredProducts = useStore(s => s.getFilteredProducts)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading gear database...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm text-red-400 mb-1">Failed to load data</div>
          <div className="text-xs text-zinc-500 font-mono">{error}</div>
        </div>
      </div>
    )
  }

  const products = getFilteredProducts()

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      {/* Results bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-950/30">
        <span className="text-xs text-zinc-500">
          <span className="text-zinc-300 font-semibold">{products.length}</span> results
        </span>
        <span className="text-[10px] text-zinc-600 font-mono">
          sorted by popularity
        </span>
      </div>

      {/* Product rows */}
      <div className="flex-1 overflow-y-auto">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-600">
            <PackageOpen className="w-10 h-10 mb-3" />
            <span className="text-sm">No gear matches your filters</span>
          </div>
        ) : (
          products.map(product => (
            <ProductRow key={product.id} product={product} />
          ))
        )}
      </div>
    </main>
  )
}
