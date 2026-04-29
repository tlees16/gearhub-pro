'use client'

import { Check } from 'lucide-react'
import useStore from '../../store/useStore'

export default function BrandFilter() {
  const getAvailableBrands = useStore(s => s.getAvailableBrands)
  const selectedBrands = useStore(s => s.selectedBrands)
  const toggleBrand = useStore(s => s.toggleBrand)
  const products = useStore(s => s.products)
  const activeCategory = useStore(s => s.activeCategory)

  const brands = getAvailableBrands()

  if (brands.length === 0) return null

  const pool = activeCategory
    ? products.filter(p => p.category === activeCategory)
    : products

  const brandCounts = {}
  for (const p of pool) {
    brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1
  }

  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-1 mb-2">
        Brand
      </div>
      {brands.map(brand => {
        const selected = selectedBrands.includes(brand)
        return (
          <button
            key={brand}
            onClick={() => toggleBrand(brand)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
              selected
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
            }`}
          >
            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
              selected
                ? 'bg-emerald-500 border-emerald-500'
                : 'border-zinc-600'
            }`}>
              {selected && <Check className="w-2.5 h-2.5 text-zinc-950" strokeWidth={3} />}
            </div>
            <span className="flex-1 text-left">{brand}</span>
            <span className="text-[10px] font-mono text-zinc-600">{brandCounts[brand] || 0}</span>
          </button>
        )
      })}
    </div>
  )
}
