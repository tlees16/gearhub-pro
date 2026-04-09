import { X, GitCompareArrows } from 'lucide-react'
import useStore from '../store/useStore'

export default function ComparisonTray() {
  const { comparisonIds, products, clearComparison, toggleComparison } = useStore()

  if (comparisonIds.length === 0) return null

  const selectedProducts = products.filter(p => comparisonIds.includes(p.id))

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 max-w-3xl w-[calc(100%-3rem)]">
      <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-700/40 rounded-2xl px-5 py-3.5 shadow-[0_0_40px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-4">
          {/* Icon + count */}
          <div className="flex items-center gap-2.5 shrink-0">
            <GitCompareArrows size={16} className="text-indigo-400" />
            <span className="text-[12px] font-semibold text-slate-200 tracking-tight">
              {comparisonIds.length} selected
            </span>
          </div>

          {/* Product pills */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto min-w-0 py-0.5">
            {selectedProducts.map(p => (
              <div
                key={p.id}
                className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/30 rounded-lg px-2.5 py-1 shrink-0 group"
              >
                <span className="text-[11px] text-slate-300 font-light truncate max-w-[140px]">
                  {p.name}
                </span>
                <button
                  onClick={() => toggleComparison(p.id)}
                  className="text-slate-600 hover:text-slate-300 transition-colors duration-200"
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
              className="text-[10px] text-slate-500 hover:text-slate-300 font-light transition-colors duration-200 px-2 py-1"
            >
              Clear all
            </button>
            <button
              className="text-[11px] font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg px-3.5 py-1.5 transition-all duration-300"
            >
              Compare
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
