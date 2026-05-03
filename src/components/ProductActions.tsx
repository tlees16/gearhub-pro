'use client'

import { useState } from 'react'
import { Plus, Check, GitCompareArrows } from 'lucide-react'
import useStore from '../store/useStore'
import ListPicker from './ListPicker'

interface Props {
  productId: string
}

export default function ProductActions({ productId }: Props) {
  const [showPicker, setShowPicker] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { projects, user, openAuthModal, comparisonIds, toggleComparison } = useStore() as any
  const inAnyList = projects?.some((p: any) => p.items?.some((i: any) => i.productId === productId))
  const inComparison = comparisonIds?.includes(productId)

  return (
    <div className="flex items-center gap-2.5 mt-6 sm:mt-8 flex-wrap">
      <div className="relative">
        <button
          onClick={() => { if (!user) { openAuthModal?.(); return } setShowPicker(v => !v) }}
          className={`inline-flex items-center gap-2 min-h-[44px] md:min-h-0 text-[12px] font-semibold rounded-xl px-4 py-2 transition-all duration-200 ${
            inAnyList
              ? 'text-emerald-300 bg-emerald-500/12 border border-emerald-500/25 shadow-[0_0_10px_rgba(52,211,153,0.12)] hover:bg-emerald-500/18'
              : 'text-slate-200 bg-slate-800/80 border border-slate-700/60 hover:bg-slate-800 hover:border-slate-600 hover:text-white'
          }`}
        >
          {inAnyList ? <Check size={13} /> : <Plus size={13} />}
          {inAnyList ? 'In List' : 'Save to List'}
        </button>
        {showPicker && (
          <ListPicker productId={productId} onClose={() => setShowPicker(false)} align="left" />
        )}
      </div>

      <button
        onClick={() => toggleComparison?.(productId)}
        className={`inline-flex items-center gap-2 min-h-[44px] md:min-h-0 text-[12px] font-semibold rounded-xl px-4 py-2 transition-all duration-200 ${
          inComparison
            ? 'text-indigo-300 bg-indigo-500/12 border border-indigo-500/25 shadow-[0_0_10px_rgba(99,102,241,0.15)] hover:bg-indigo-500/18'
            : 'text-slate-400 bg-slate-900/60 border border-slate-800/60 hover:bg-slate-800/80 hover:text-slate-200 hover:border-slate-700'
        }`}
      >
        <GitCompareArrows size={13} />
        {inComparison ? 'In Compare' : 'Compare'}
      </button>
    </div>
  )
}
