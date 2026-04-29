'use client'

import { Database, GitCompare } from 'lucide-react'
import useStore from '../../store/useStore'

export default function Header() {
  const comparisonIds = useStore(s => s.comparisonIds)
  const products = useStore(s => s.products)

  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2.5">
        <Database className="w-5 h-5 text-emerald-400" />
        <span className="text-sm font-semibold tracking-wide text-zinc-100">
          GearHub<span className="text-emerald-400">Pro</span>
        </span>
        <span className="text-[10px] text-zinc-500 font-mono ml-1">
          {products.length} items
        </span>
      </div>

      <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-800/60 border border-zinc-700/50 text-zinc-300 text-xs hover:bg-zinc-700/60 transition-colors">
        <GitCompare className="w-3.5 h-3.5" />
        Compare
        {comparisonIds.length > 0 && (
          <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
            {comparisonIds.length}
          </span>
        )}
      </button>
    </header>
  )
}
