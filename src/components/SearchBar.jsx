'use client'

import { Search, X, Command } from 'lucide-react'
import useStore from '../store/useStore'

export default function SearchBar() {
  const { searchQuery, setSearchQuery } = useStore()

  return (
    <div className="relative group">
      <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors duration-300" />
      <input
        type="text"
        placeholder="Search gear..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full bg-slate-900/60 border border-slate-800/60 rounded-xl pl-10 pr-20 py-2.5 text-sm text-slate-200 font-light placeholder-slate-600 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 focus:shadow-[0_0_20px_rgba(99,102,241,0.08)] transition-all duration-300 backdrop-blur-md"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
        {searchQuery ? (
          <button
            onClick={() => setSearchQuery('')}
            className="text-slate-600 hover:text-slate-300 transition-colors duration-200 p-0.5"
          >
            <X size={14} />
          </button>
        ) : (
          <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-slate-600 bg-slate-800/60 border border-slate-700/40 px-1.5 py-0.5 rounded font-mono">
            <Command size={9} /> K
          </kbd>
        )}
      </div>
    </div>
  )
}
