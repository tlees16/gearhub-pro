import useStore from '../store/useStore'
import ProductCard from './ProductCard'
import { Package, Loader } from 'lucide-react'

export default function ProductList() {
  const { loading, error, getFilteredProducts } = useStore()
  const products = getFilteredProducts()

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <Loader size={20} className="text-indigo-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-light">Loading gear database</p>
          <p className="text-[10px] text-slate-700 font-light mt-1">Fetching from Google Sheets</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 p-8">
        <div className="text-center max-w-sm">
          <p className="text-red-400 text-sm font-medium">Failed to load data</p>
          <p className="text-slate-600 text-xs font-light mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 p-8">
        <div className="text-center">
          <Package size={24} className="text-slate-800 mx-auto mb-2" />
          <p className="text-slate-500 text-sm font-light">No products match your filters</p>
          <p className="text-slate-700 text-[11px] font-light mt-1">Try adjusting your criteria</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-slate-950 px-5 py-4">
      {/* List header */}
      <div className="flex items-center justify-between mb-3 px-4">
        <span className="text-[10px] text-slate-600 tabular-nums font-light uppercase tracking-widest">
          {products.length} result{products.length !== 1 ? 's' : ''}
        </span>
        <span className="text-[9px] text-slate-700 uppercase tracking-wider">
          Compare
        </span>
      </div>

      {/* Product rows */}
      <div className="space-y-1">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
