'use client'

import { useState } from 'react'
import { Plus, Check } from 'lucide-react'
import useStore from '../store/useStore'
import ListPicker from './ListPicker'

interface Props {
  productId: string
}

export default function ProductActions({ productId }: Props) {
  const [showPicker, setShowPicker] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { projects, user, openAuthModal } = useStore() as any
  const inAnyList = projects?.some((p: any) => p.items?.some((i: any) => i.productId === productId))

  return (
    <div className="flex items-center gap-3 mt-6 sm:mt-8 flex-wrap">
      <div className="relative">
        <button
          onClick={() => { if (!user) { openAuthModal?.(); return } setShowPicker(v => !v) }}
          className={`inline-flex items-center gap-2 min-h-[44px] md:min-h-0 text-[12px] font-medium rounded-xl px-5 py-2.5 transition-all duration-300 ${
            inAnyList
              ? 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15'
              : 'text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15'
          }`}
        >
          {inAnyList ? <Check size={14} /> : <Plus size={14} />}
          {inAnyList ? 'In List' : 'Add to List'}
        </button>
        {showPicker && (
          <ListPicker productId={productId} onClose={() => setShowPicker(false)} align="left" />
        )}
      </div>
    </div>
  )
}
