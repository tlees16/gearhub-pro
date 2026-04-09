import { Camera, Aperture, Sun } from 'lucide-react'
import useStore from '../store/useStore'

const CATEGORIES = [
  { key: 'cameras', label: 'Cameras', icon: Camera },
  { key: 'lenses', label: 'Lenses', icon: Aperture },
  { key: 'lighting', label: 'Lighting', icon: Sun },
]

export default function CategoryTabs() {
  const { activeCategory, setActiveCategory, products } = useStore()

  const getCategoryCount = (key) =>
    products.filter(p => p.category === key).length

  return (
    <div className="flex gap-1">
      {CATEGORIES.map(({ key, label, icon: Icon }) => {
        const active = activeCategory === key
        const count = getCategoryCount(key)
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
