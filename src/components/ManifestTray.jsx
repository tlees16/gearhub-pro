import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardList, X, ChevronRight } from 'lucide-react'
import useStore from '../store/useStore'

const DISMISS_AFTER_MS = 5000

export default function ManifestTray() {
  const navigate = useNavigate()
  const { projects, activeProjectId, products, removeItemFromProject, getProjectStats } = useStore()

  const project   = projects.find(p => p.id === activeProjectId)
  const items     = project ? project.items : []
  const totalQty  = items.reduce((s, i) => s + i.quantity, 0)
  const stats     = project ? getProjectStats(project.id) : null

  const [visible, setVisible] = useState(false)
  const timerRef  = useRef(null)
  const prevQty   = useRef(0)

  // Show tray whenever qty increases, then auto-dismiss
  useEffect(() => {
    if (totalQty > prevQty.current) {
      setVisible(true)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setVisible(false), DISMISS_AFTER_MS)
    }
    prevQty.current = totalQty
    return () => clearTimeout(timerRef.current)
  }, [totalQty])

  const dismiss = () => {
    clearTimeout(timerRef.current)
    setVisible(false)
  }

  const thumbProducts = items.slice(0, 8).map(item => {
    const product = products.find(p => p.id === item.productId)
    return product ? { ...item, product } : null
  }).filter(Boolean)

  return (
    <AnimatePresence>
      {visible && project && items.length > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-4xl w-[calc(100%-3rem)]"
        >
          <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-700/30 rounded-2xl px-5 py-3.5 shadow-[0_0_60px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-4">
              {/* Icon + project name */}
              <div className="flex items-center gap-2.5 shrink-0">
                <ClipboardList size={16} className="text-indigo-400" />
                <div>
                  <span className="text-[12px] font-semibold text-slate-200 tracking-tight">
                    {project.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-light ml-1.5 tabular-nums">
                    {totalQty} item{totalQty !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Thumbnails */}
              <div className="flex-1 flex items-center gap-1.5 overflow-x-auto min-w-0 py-0.5 scrollbar-none">
                {thumbProducts.map(({ product, quantity }) => (
                  <div key={product.id} className="relative shrink-0 group/thumb">
                    <div className="w-9 h-9 rounded-lg bg-slate-950/60 border border-slate-800/30 overflow-hidden flex items-center justify-center">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-contain p-0.5" loading="lazy" />
                      ) : (
                        <div className="text-[7px] text-slate-700">N/A</div>
                      )}
                    </div>
                    {quantity > 1 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-indigo-500 text-[8px] font-bold text-white flex items-center justify-center">
                        {quantity}
                      </span>
                    )}
                    <button
                      onClick={() => removeItemFromProject(project.id, product.id)}
                      className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-slate-800 text-slate-500 hover:text-white hover:bg-red-500/80 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-all duration-150"
                    >
                      <X size={8} />
                    </button>
                  </div>
                ))}
                {items.length > 8 && (
                  <span className="text-[10px] text-slate-600 font-light shrink-0 pl-1">
                    +{items.length - 8} more
                  </span>
                )}
              </div>

              {/* Price */}
              {stats && stats.totalPrice > 0 && (
                <div className="shrink-0 text-right">
                  <div className="text-[10px] text-slate-600 font-light">Total</div>
                  <div className="text-[13px] font-bold text-emerald-400 tabular-nums tracking-tight">
                    ${stats.totalPrice.toLocaleString()}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0 pl-2 border-l border-slate-800/30">
                <button
                  onClick={() => { navigate(`/manifest/${project.id}`); dismiss() }}
                  className="flex items-center gap-1 text-[11px] font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg px-3.5 py-1.5 transition-all duration-300"
                >
                  View List
                  <ChevronRight size={12} />
                </button>
                <button
                  onClick={dismiss}
                  className="text-slate-600 hover:text-slate-400 transition-colors p-1"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
