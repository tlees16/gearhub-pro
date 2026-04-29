'use client'

import { Camera, Aperture, Sun } from 'lucide-react'
import useStore from '../store/useStore'

const CATEGORIES = [
  { key: 'cameras',  label: 'Cameras',  icon: Camera,   tables: ['cameras'] },
  { key: 'lenses',   label: 'Lenses',   icon: Aperture, tables: ['lenses'] },
  { key: 'lighting', label: 'Lighting', icon: Sun,      tables: ['lighting'] },
]

export default function CategoryTabs() {
  const { activeCategory, setActiveCategory, products } = useStore()

  const getCategoryCount = (tables) =>
    products.filter(p => tables.includes(p.category)).length

  return (
    <div className="flex gap-1 flex-wrap">
      {CATEGORIES.map(({ key, label, icon: Icon, tables }) => {
        const active = activeCategory === key
        const count = getCategoryCount(tables)
        if (count === 0) return null
        return (
          <button
            key={key}
            onClick={() => setActiveCategory(active ? null : key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              active
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-slate-800/60 text-slate-400 border border-transparent hover:bg-slate-800 hover:text-slate-300'
            }`}
          >
            <Icon size={13} />
            {label}
            <span className={`text-[10px] ${active ? 'text-blue-400/60' : 'text-slate-600'}`}>
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
