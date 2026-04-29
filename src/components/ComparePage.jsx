'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, X, GitCompareArrows, ExternalLink, Zap } from 'lucide-react'
import useStore from '../store/useStore'
import { SPEC_COLUMNS } from '../services/dataService'
import { parsePhotometrics } from '../services/photometrics'
import { buildSections, cctColor, PivotTable, CONFIG_COLORS } from './PhotometricTable'
import { fmtNum } from '../services/photometrics'

const CATEGORY_LABELS = {
  cameras: 'Cameras', lenses: 'Lenses', lighting: 'Lighting',
  drones: 'Drones', gimbals: 'Gimbals', sd_cards: 'SD Cards',
  tripods: 'Tripods', lighting_accessories: 'Lighting Accessories',
}

function getComparisonRows(products, category) {
  if (SPEC_COLUMNS[category]) {
    return SPEC_COLUMNS[category].map(([col, label]) => ({
      col, label,
      values: products.map(p => {
        const spec = p.specs[col]
        return (!spec || spec.raw === 'N/A') ? null : spec.raw
      }),
    }))
  }
  const keySet = new Set()
  for (const p of products) Object.keys(p.allSpecs || {}).forEach(k => keySet.add(k))
  return [...keySet].map(col => ({
    col,
    label: col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    values: products.map(p => {
      const v = p.allSpecs?.[col]
      return v && v !== 'N/A' ? String(v) : null
    }),
  }))
}

function isDiff(values) {
  const nonNull = values.filter(v => v !== null)
  return nonNull.length > 1 && new Set(nonNull).size > 1
}

// ─── Photometrics popup modal ─────────────────────────────────────────────────
function PhotometricModal({ product, onClose }) {
  const raw = product.allSpecs?.['Photometrics']
  const parsed = raw ? parsePhotometrics(raw) : null
  const sections = parsed ? buildSections(parsed.rows).sections : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-slate-900 border border-slate-700/40 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl shadow-black/60"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 flex items-center justify-between px-5 py-3.5 border-b border-slate-800/50 z-10">
          <div className="flex items-center gap-2.5">
            <Zap size={13} className="text-amber-400" />
            <span className="text-[13px] font-bold text-slate-100 tracking-tight">Photometrics</span>
            <span className="text-[10px] text-slate-600 font-light truncate max-w-[260px]">{product.name}</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-5">
          {!sections ? (
            <p className="text-slate-500 text-sm font-light text-center py-6">No photometric data available.</p>
          ) : (
            <>
              {sections.map((section, si) => {
                if (section.type === 'cct-compare') {
                  return (
                    <div key={si} className="rounded-xl overflow-hidden border border-slate-800/30">
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="bg-slate-800/25">
                            <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">CCT</th>
                            <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Distance</th>
                            <th className="px-4 py-2 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-widest">fc</th>
                            <th className="px-4 py-2 text-right text-[10px] font-semibold text-indigo-400/60 uppercase tracking-widest">Lux</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.rows.map((row, ri) => (
                            <tr key={ri} className={`border-t border-slate-800/20 ${ri % 2 !== 0 ? 'bg-slate-800/10' : ''}`}>
                              <td className={`px-4 py-2.5 font-semibold tabular-nums ${cctColor(row.cct)}`}>{row.cct || '—'}</td>
                              <td className="px-4 py-2.5 text-slate-400 font-mono tabular-nums text-[11px]">{row.distance}</td>
                              <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-200">{fmtNum(row.fc)}</td>
                              <td className="px-4 py-2.5 text-right font-mono tabular-nums text-indigo-300">{fmtNum(row.lux)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                }
                return (
                  <div key={si}>
                    {(section.cct || section.singleConfig) && (
                      <div className="flex items-center gap-2 mb-2.5">
                        {section.cct && (
                          <span className={`text-[13px] font-bold tabular-nums ${cctColor(section.cct)}`}>
                            {section.cct}
                          </span>
                        )}
                        {section.singleConfig && (
                          <span className="text-[11px] text-slate-500 font-mono tabular-nums">{section.singleConfig}</span>
                        )}
                        {section.configs && (
                          <span className="text-[10px] text-slate-600 font-light">{section.configs.length} configurations</span>
                        )}
                      </div>
                    )}
                    <PivotTable configs={section.configs} tableRows={section.tableRows} />
                  </div>
                )
              })}
              {parsed.footnotes?.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-slate-800/20">
                  {parsed.footnotes.map((note, i) => (
                    <p key={i} className="text-[10px] text-slate-600 font-light italic">* {note}</p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function CategoryCard({ category, products, onRemove }) {
  const router = useRouter()
  const [photoProduct, setPhotoProduct] = useState(null)

  const rows = useMemo(() => {
    const all = getComparisonRows(products, category)
    return all.filter(row => row.values.some(v => v !== null))
  }, [products, category])

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl overflow-hidden">
      {photoProduct && (
        <PhotometricModal product={photoProduct} onClose={() => setPhotoProduct(null)} />
      )}
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/50 bg-zinc-900/80">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-widest">
            {CATEGORY_LABELS[category] || category}
          </span>
          <span className="text-[10px] text-zinc-600">{products.length} products</span>
        </div>
      </div>

      {/* Spec table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800/60">
              <th className="sticky left-0 bg-zinc-900 w-36 min-w-[144px] px-4 py-3 text-[9px] uppercase tracking-widest text-zinc-600 font-semibold z-10">
                Spec
              </th>
              {products.map(p => (
                <th key={p.id} className="min-w-[200px] max-w-[260px] px-4 py-3 align-top">
                  <div className="flex flex-col gap-2">
                    {p.image && (
                      <div className="w-14 h-14 bg-black rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center">
                        <img src={p.image} alt={p.name} className="w-full h-full object-contain p-1" />
                      </div>
                    )}
                    <div>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-medium">{p.brand}</p>
                      <button
                        onClick={() => router.push(`/product/${p.id}`)}
                        className="text-[12px] text-white font-semibold leading-snug mt-0.5 line-clamp-2 text-left hover:text-indigo-300 transition-colors"
                      >
                        {p.name}
                      </button>
                      <p className="text-[13px] font-bold text-white mt-1 tabular-nums">
                        {p.price ? `$${p.price.toLocaleString()}` : p.priceRaw || '—'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {p.url && (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[9px] text-zinc-600 hover:text-indigo-400 transition-colors"
                          >
                            B&H <ExternalLink size={7} />
                          </a>
                        )}
                        <button
                          onClick={() => onRemove(p.id)}
                          className="inline-flex items-center gap-0.5 text-[9px] text-zinc-700 hover:text-red-400 transition-colors"
                        >
                          <X size={9} /> Remove
                        </button>
                      </div>
                      {category === 'lighting' && p.allSpecs?.['Photometrics'] && (
                        <button
                          onClick={() => setPhotoProduct(p)}
                          className="mt-2 inline-flex items-center gap-1 text-[9px] font-medium text-amber-400/70 hover:text-amber-400 bg-amber-400/8 hover:bg-amber-400/15 border border-amber-400/15 hover:border-amber-400/30 rounded-lg px-2 py-1 transition-all duration-150"
                        >
                          <Zap size={9} /> Photometrics
                        </button>
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const diff = isDiff(row.values)
              return (
                <tr
                  key={row.col}
                  className={`border-b border-zinc-900 ${diff ? 'bg-zinc-800/30' : 'hover:bg-zinc-900/30'}`}
                >
                  <td className="sticky left-0 bg-inherit px-4 py-2.5 z-10">
                    <span className={`text-[10px] font-medium ${diff ? 'text-zinc-300' : 'text-zinc-500'}`}>
                      {row.label}
                    </span>
                  </td>
                  {row.values.map((val, i) => (
                    <td key={i} className="px-4 py-2.5">
                      {val !== null
                        ? <span className={`text-[12px] font-medium ${diff ? 'text-white' : 'text-zinc-400'}`}>{val}</span>
                        : <span className="text-[12px] text-zinc-700">—</span>
                      }
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

    </div>
  )
}

export default function ComparePage() {
  const router = useRouter()
  const { comparisonIds, products, toggleComparison, clearComparison } = useStore()

  const selected = products.filter(p => comparisonIds.includes(p.id))

  const groups = useMemo(() => {
    const map = {}
    for (const p of selected) {
      if (!map[p.category]) map[p.category] = []
      map[p.category].push(p)
    }
    return Object.entries(map)
  }, [selected])

  if (comparisonIds.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center gap-4">
        <GitCompareArrows size={32} className="text-zinc-700" />
        <p className="text-zinc-500 text-sm font-light">No products in comparison</p>
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-[12px] text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <ArrowLeft size={13} /> Back to database
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-1.5 text-[12px] text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <ArrowLeft size={14} />
              <span className="font-light">Back</span>
            </button>
            <div className="h-4 w-px bg-zinc-800" />
            <div className="flex items-center gap-2">
              <GitCompareArrows size={14} className="text-indigo-400" />
              <span className="text-[13px] font-bold text-white tracking-tight">Compare</span>
              <span className="text-[10px] text-zinc-500 font-light">
                {selected.length} product{selected.length !== 1 ? 's' : ''}
                {groups.length > 1 && ` · ${groups.length} categories`}
              </span>
            </div>
          </div>
          <button
            onClick={() => { clearComparison(); router.push('/') }}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 font-light transition-colors px-3 py-1.5"
          >
            Clear all
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {groups.map(([category, groupProducts]) => (
          <CategoryCard
            key={category}
            category={category}
            products={groupProducts}
            onRemove={toggleComparison}
          />
        ))}
      </div>
    </div>
  )
}
