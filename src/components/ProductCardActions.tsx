'use client'

import { useState } from 'react'
import { GitCompare, BookmarkPlus, Check } from 'lucide-react'
import useStore from '@/store/useStore'

interface ProductCardActionsProps {
  productId: string
  productName: string
}

export default function ProductCardActions({ productId, productName }: ProductCardActionsProps) {
  const [saved, setSaved] = useState(false)
  const { comparisonIds, toggleComparison } = useStore()
  const comparing = comparisonIds.includes(productId)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="flex items-center gap-1" aria-label={`Actions for ${productName}`}>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleComparison(productId) }}
        aria-pressed={comparing}
        aria-label={comparing ? 'Remove from compare' : 'Add to compare'}
        className={`inline-flex items-center justify-center w-10 h-10 md:w-6 md:h-6 rounded-sm transition-colors ${
          comparing
            ? 'bg-indigo-600/90 text-white'
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700'
        }`}
      >
        <GitCompare className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={handleSave}
        aria-label="Add to list"
        className="inline-flex items-center justify-center w-10 h-10 md:w-6 md:h-6 rounded-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
      >
        {saved ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <BookmarkPlus className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  )
}
