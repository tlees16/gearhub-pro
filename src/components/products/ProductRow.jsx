'use client'

import { ExternalLink, Plus, Check } from 'lucide-react'
import useStore from '../../store/useStore'

const CATEGORY_LABELS = {
  cameras: 'Camera',
  lenses: 'Lens',
  lighting: 'Light',
}

export default function ProductRow({ product }) {
  const toggleComparison = useStore(s => s.toggleComparison)
  const comparisonIds = useStore(s => s.comparisonIds)
  const inComparison = comparisonIds.includes(product.id)

  const specEntries = Object.entries(product.specs)

  return (
    <div className="group flex items-center gap-4 px-4 py-3 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-md bg-zinc-800/50 border border-zinc-700/30 overflow-hidden shrink-0 flex items-center justify-center">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-contain p-1"
            loading="lazy"
          />
        ) : (
          <div className="text-zinc-600 text-[10px] font-mono">No img</div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 uppercase">
            {CATEGORY_LABELS[product.category]}
          </span>
          <span className="text-[11px] text-zinc-500">{product.brand}</span>
        </div>
        <h3 className="text-sm text-zinc-200 font-medium truncate leading-tight">
          {product.name}
        </h3>
        <div className="flex items-center gap-3 mt-1.5">
          {specEntries.slice(0, 3).map(([key, spec]) => (
            <span key={key} className="text-[10px] text-zinc-500">
              <span className="text-zinc-600">{key}:</span>{' '}
              <span className={spec.raw === 'N/A' ? 'text-zinc-700' : 'text-zinc-400'}>
                {spec.raw}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Price */}
      <div className="text-right shrink-0 w-24">
        <div className="text-sm font-semibold text-zinc-200 font-mono">
          {product.priceRaw || '—'}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => toggleComparison(product.id)}
          className={`p-1.5 rounded-md border transition-colors ${
            inComparison
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : 'border-zinc-700/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
          }`}
          title={inComparison ? 'Remove from comparison' : 'Add to comparison'}
        >
          {inComparison
            ? <Check className="w-3.5 h-3.5" />
            : <Plus className="w-3.5 h-3.5" />
          }
        </button>
        {product.url && (
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md border border-zinc-700/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors"
            title="View on B&H"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  )
}
