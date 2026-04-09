import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Camera, Aperture, Zap, Plus, Check } from 'lucide-react'
import { getSpecLabel, getSpecUnit } from '../services/dataService'
import useStore from '../store/useStore'
import ListPicker from './ListPicker'

const CARD_SPECS = {
  cameras:  ['sensor_size', 'max_video_resolution', 'lens_mount'],
  lenses:   ['subcategory', 'lens_mount', 'max_aperture'],
  lighting: ['form_factor', 'power_draw_w', 'cri'],
}

const CATEGORY_ICON = {
  cameras: Camera,
  lenses: Aperture,
  lighting: Zap,
}

export default function ProductCard({ product }) {
  const navigate = useNavigate()
  const { comparisonIds, toggleComparison, projects, user, openAuthModal } = useStore()
  const specCols    = CARD_SPECS[product.category] || []
  const isComparing = comparisonIds.includes(product.id)
  const inAnyList   = projects.some(p => p.items.some(i => i.productId === product.id))
  const [showPicker, setShowPicker] = useState(false)

  const handleListClick = (e) => {
    e.stopPropagation()
    if (!user) { openAuthModal(); return }
    setShowPicker(v => !v)
  }
  const CatIcon = CATEGORY_ICON[product.category]

  const handleRowClick = (e) => {
    if (e.target.closest('button') || e.target.closest('a')) return
    navigate(`/product/${product.id}`)
  }

  return (
    <div
      onClick={handleRowClick}
      className={`group flex items-center gap-4 px-4 py-3 rounded-lg border cursor-pointer transition-all duration-300 ${
        isComparing
          ? 'bg-indigo-500/5 border-indigo-500/20'
          : 'bg-slate-900/40 border-slate-800/30 hover:bg-slate-900/60 hover:border-slate-700/40'
      }`}>
      {/* Category icon */}
      <div className="shrink-0 w-5 flex justify-center">
        {CatIcon && <CatIcon size={13} className="text-slate-700" />}
      </div>

      {/* Thumbnail */}
      <div className="w-16 h-16 min-w-[64px] rounded-md bg-slate-950/80 overflow-hidden flex items-center justify-center ring-1 ring-slate-800/50">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-contain p-1"
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none'
              e.target.nextSibling.style.display = 'flex'
            }}
          />
        ) : null}
        <div
          className={`w-full h-full items-center justify-center text-slate-800 text-[8px] ${product.image ? 'hidden' : 'flex'}`}
        >
          N/A
        </div>
      </div>

      {/* Name + Brand */}
      <div className="w-52 min-w-[208px] shrink-0">
        <h3 className="text-[12.5px] font-semibold text-slate-100 truncate leading-tight tracking-tight">
          {product.name}
        </h3>
        <p className="text-[10.5px] text-slate-500 font-light mt-0.5 truncate">{product.brand}</p>
      </div>

      {/* Spec cells */}
      <div className="flex-1 flex items-center gap-4 overflow-x-auto min-w-0">
        {specCols.map(col => {
          const spec = product.specs[col]
          if (!spec) return null
          const isNA = !spec.value && spec.raw === 'N/A'
          const unit = getSpecUnit(col)
          return (
            <div key={col} className="shrink-0 min-w-[70px]">
              <div className="text-[9px] text-slate-600 font-light uppercase tracking-wider leading-none mb-0.5">
                {getSpecLabel(col)}
              </div>
              <div className={`text-[11.5px] font-medium tabular-nums leading-tight ${
                isNA ? 'text-slate-700' : 'text-slate-300'
              }`}>
                {isNA ? '--' : `${spec.raw}${unit}`}
              </div>
            </div>
          )
        })}
      </div>

      {/* Price */}
      <div className="text-right shrink-0 w-24">
        <p className={`text-[13px] font-bold tabular-nums tracking-tight ${
          product.price ? 'text-emerald-400' : 'text-amber-500/60'
        }`}>
          {product.price ? `$${product.price.toLocaleString()}` : product.priceRaw || '--'}
        </p>
        {product.url && (
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[9px] text-slate-600 hover:text-indigo-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200"
          >
            B&H <ExternalLink size={8} />
          </a>
        )}
      </div>

      {/* Add to List */}
      <div className="shrink-0 pl-2 border-l border-slate-800/30 relative">
        <button
          onClick={handleListClick}
          className={`w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 ${
            inAnyList
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
              : 'text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/10 border border-slate-800/40 hover:border-indigo-500/25'
          }`}
          title="Add to list"
        >
          {inAnyList ? <Check size={12} /> : <Plus size={13} />}
        </button>
        {showPicker && (
          <ListPicker
            productId={product.id}
            onClose={() => setShowPicker(false)}
            align="right"
          />
        )}
      </div>

      {/* Compare checkbox */}
      <div className="shrink-0">
        <button
          onClick={() => toggleComparison(product.id)}
          className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 ${
            isComparing
              ? 'bg-indigo-500 border-indigo-500'
              : 'border-slate-700 hover:border-indigo-500/50'
          }`}
          title="Compare"
        >
          {isComparing && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
