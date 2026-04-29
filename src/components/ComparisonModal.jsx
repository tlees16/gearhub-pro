'use client'

import { useMemo } from 'react'
import { X, ExternalLink, GitCompareArrows } from 'lucide-react'
import useStore from '../store/useStore'
import { SPEC_COLUMNS } from '../services/dataService'

const CATEGORY_LABELS = {
  cameras: 'Cameras', lenses: 'Lenses', lighting: 'Lighting',
  drones: 'Drones', gimbals: 'Gimbals', sd_cards: 'SD Cards',
  tripods: 'Tripods', lighting_accessories: 'Lighting Accessories',
}

function getComparisonRows(products, category) {
  // For known categories, use SPEC_COLUMNS for a structured ordered list
  if (SPEC_COLUMNS[category]) {
    return SPEC_COLUMNS[category].map(([col, label]) => ({
      col,
      label,
      values: products.map(p => {
        const spec = p.specs[col]
        if (!spec) return null
        return spec.raw === 'N/A' ? null : spec.raw
      }),
    }))
  }

  // For new categories, union all allSpecs keys across products
  const keySet = new Set()
  for (const p of products) {
    Object.keys(p.allSpecs || {}).forEach(k => keySet.add(k))
  }
  return [...keySet].map(col => ({
    col,
    label: col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    values: products.map(p => {
      const v = p.allSpecs?.[col]
      return v && v !== 'N/A' ? String(v) : null
    }),
  }))
}

function ComparisonTable({ products, category }) {
  const rows = useMemo(() => {
    const all = getComparisonRows(products, category)
    // Only show rows where at least one product has a value
    return all.filter(row => row.values.some(v => v !== null))
  }, [products, category])

  const isDiff = (values) => {
    const nonNull = values.filter(v => v !== null)
    if (nonNull.length <= 1) return false
    return new Set(nonNull).size > 1
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-zinc-800">
            {/* Spec label column */}
            <th className="sticky left-0 bg-zinc-950 w-36 min-w-[144px] px-4 py-3 text-[9px] uppercase tracking-widest text-zinc-600 font-semibold z-10">
              Spec
            </th>
            {/* Product columns */}
            {products.map(p => (
              <th key={p.id} className="min-w-[200px] max-w-[240px] px-4 py-3 align-top">
                <div className="flex flex-col gap-2">
                  {p.image && (
                    <div className="w-16 h-16 bg-black rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center">
                      <img src={p.image} alt={p.name} className="w-full h-full object-contain p-1.5" />
                    </div>
                  )}
                  <div>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-medium">{p.brand}</p>
                    <p className="text-[12px] text-white font-semibold leading-snug mt-0.5 line-clamp-2">{p.name}</p>
                    <p className="text-[13px] font-bold text-white mt-1 tabular-nums">
                      {p.price ? `$${p.price.toLocaleString()}` : p.priceRaw || '--'}
                    </p>
                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-[9px] text-zinc-600 hover:text-indigo-400 transition-colors mt-0.5"
                      >
                        View on B&H <ExternalLink size={7} />
                      </a>
                    )}
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const diff = isDiff(row.values)
            return (
              <tr
                key={row.col}
                className={`border-b border-zinc-900 transition-colors ${
                  diff ? 'bg-zinc-900/40' : 'hover:bg-zinc-900/20'
                }`}
              >
                <td className="sticky left-0 bg-inherit px-4 py-2.5 z-10">
                  <span className={`text-[10px] font-medium ${diff ? 'text-zinc-300' : 'text-zinc-500'}`}>
                    {row.label}
                  </span>
                </td>
                {row.values.map((val, i) => (
                  <td key={i} className="px-4 py-2.5">
                    {val !== null ? (
                      <span className={`text-[12px] font-medium ${diff ? 'text-white' : 'text-zinc-400'}`}>
                        {val}
                      </span>
                    ) : (
                      <span className="text-[12px] text-zinc-700">—</span>
                    )}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function ComparisonModal() {
  const { comparisonIds, products, closeComparisonModal, toggleComparison, clearComparison } = useStore()

  const selectedProducts = products.filter(p => comparisonIds.includes(p.id))

  // Group by category
  const groups = useMemo(() => {
    const map = {}
    for (const p of selectedProducts) {
      if (!map[p.category]) map[p.category] = []
      map[p.category].push(p)
    }
    return Object.entries(map)
  }, [selectedProducts])

  if (comparisonIds.length === 0) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 bg-zinc-950/90">
        <div className="flex items-center gap-3">
          <GitCompareArrows size={18} className="text-indigo-400" />
          <div>
            <h2 className="text-[14px] font-bold text-white tracking-tight">Comparison</h2>
            <p className="text-[10px] text-zinc-500 font-light mt-0.5">
              {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
              {groups.length > 1 && ` across ${groups.length} categories`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { clearComparison(); closeComparisonModal() }}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 font-light transition-colors px-3 py-1.5"
          >
            Clear all
          </button>
          <button
            onClick={closeComparisonModal}
            className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-10">
        {groups.map(([category, groupProducts]) => (
          <div key={category}>
            {groups.length > 1 && (
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {CATEGORY_LABELS[category] || category}
                </span>
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-[10px] text-zinc-600">{groupProducts.length} items</span>
              </div>
            )}
            <ComparisonTable products={groupProducts} category={category} />
          </div>
        ))}
      </div>
    </div>
  )
}
