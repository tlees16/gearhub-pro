'use client'

import { useState, useEffect } from 'react'
import { X, GitCompareArrows, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import useStore from '../store/useStore'

export default function ComparisonTray() {
  const router = useRouter()
  const { comparisonIds, products, clearComparison, toggleComparison } = useStore()
  const [dismissed, setDismissed] = useState(false)

  // Re-show tray whenever a new item is added
  useEffect(() => {
    if (comparisonIds.length > 0) setDismissed(false)
  }, [comparisonIds.length])

  if (comparisonIds.length === 0 || dismissed) return null

  const selectedProducts = products.filter(p => comparisonIds.includes(p.id))

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-3xl w-[calc(100%-3rem)]">
      <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/40 rounded-2xl px-5 py-3.5 shadow-[0_0_50px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-4">
          {/* Icon + count */}
          <div className="flex items-center gap-2 shrink-0">
            <GitCompareArrows size={15} className="text-indigo-400" />
            <span className="text-[12px] font-semibold text-zinc-200 tracking-tight">
              {comparisonIds.length} selected
            </span>
          </div>

          {/* Product pills */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto min-w-0 py-0.5 scrollbar-none">
            {selectedProducts.map(p => (
              <div
                key={p.id}
                className="flex items-center gap-1.5 bg-zinc-800/80 border border-zinc-700/40 rounded-lg px-2.5 py-1 shrink-0"
              >
                {p.image && (
                  <img src={p.image} alt="" className="w-5 h-5 object-contain rounded" />
                )}
                <span className="text-[11px] text-zinc-300 font-light truncate max-w-[130px]">
                  {p.name}
                </span>
                <button
                  onClick={() => toggleComparison(p.id)}
                  className="text-zinc-600 hover:text-zinc-300 transition-colors ml-0.5"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={clearComparison}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 font-light transition-colors px-2 py-1"
            >
              Clear
            </button>
            <button
              onClick={() => router.push('/compare')}
              disabled={comparisonIds.length < 2}
              className="text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl px-4 py-1.5 transition-all duration-200"
            >
              Compare {comparisonIds.length >= 2 ? `(${comparisonIds.length})` : ''}
            </button>
            {/* Dismiss — hides tray without clearing selection */}
            <button
              onClick={() => setDismissed(true)}
              title="Hide tray"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
