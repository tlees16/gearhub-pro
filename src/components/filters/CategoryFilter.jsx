import { Camera, CircleDot, Lightbulb, Layers } from 'lucide-react'
import useStore from '../../store/useStore'

const CATEGORIES = [
  { key: null, label: 'All Gear', icon: Layers },
  { key: 'cameras', label: 'Cameras', icon: Camera },
  { key: 'lenses', label: 'Lenses', icon: CircleDot },
  { key: 'lighting', label: 'Lighting', icon: Lightbulb },
]

export default function CategoryFilter() {
  const activeCategory = useStore(s => s.activeCategory)
  const setActiveCategory = useStore(s => s.setActiveCategory)
  const products = useStore(s => s.products)

  const counts = {
    null: products.length,
    cameras: products.filter(p => p.category === 'cameras').length,
    lenses: products.filter(p => p.category === 'lenses').length,
    lighting: products.filter(p => p.category === 'lighting').length,
  }

  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-1 mb-2">
        Category
      </div>
      {CATEGORIES.map(({ key, label, icon: Icon }) => {
        const active = activeCategory === key
        return (
          <button
            key={label}
            onClick={() => setActiveCategory(key)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs transition-colors ${
              active
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">{label}</span>
            <span className={`text-[10px] font-mono ${active ? 'text-emerald-500/70' : 'text-zinc-600'}`}>
              {counts[key]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
