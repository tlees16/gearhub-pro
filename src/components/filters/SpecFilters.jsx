import { ChevronDown, ChevronRight, X } from 'lucide-react'
import { useState } from 'react'
import useStore from '../../store/useStore'
import RangeSlider from './RangeSlider'

function ChipSelect({ specName, values }) {
  const [expanded, setExpanded] = useState(false)
  const specFilters = useStore(s => s.specFilters)
  const setSpecFilter = useStore(s => s.setSpecFilter)

  const selected = specFilters[specName] || []

  const toggle = (val) => {
    const next = selected.includes(val)
      ? selected.filter(v => v !== val)
      : [...selected, val]
    setSpecFilter(specName, next)
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-1 py-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        {expanded
          ? <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
          : <ChevronRight className="w-3 h-3 text-zinc-500 shrink-0" />
        }
        <span className="flex-1 text-left font-medium">{specName}</span>
        {selected.length > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
            {selected.length}
          </span>
        )}
      </button>

      {expanded && (
        <div className="ml-5 flex flex-wrap gap-1 pb-2 pt-0.5">
          {values.map(val => {
            const isSelected = selected.includes(val)
            return (
              <button
                key={val}
                onClick={() => toggle(val)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border transition-colors ${
                  isSelected
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'border-zinc-700/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
                }`}
              >
                {val}
                {isSelected && <X className="w-2.5 h-2.5" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function NumericSpecFilter({ specName, bounds }) {
  const rangeFilters = useStore(s => s.rangeFilters)
  const setRangeFilter = useStore(s => s.setRangeFilter)

  const [min, max] = bounds
  if (min === max) return null

  return (
    <div className="px-1 py-1">
      <RangeSlider
        label={specName}
        min={min}
        max={max}
        value={rangeFilters[specName] || null}
        onChange={(range) => setRangeFilter(specName, range)}
      />
    </div>
  )
}

export default function SpecFilters() {
  const getSpecMeta = useStore(s => s.getSpecMeta)
  const activeCategory = useStore(s => s.activeCategory)

  if (!activeCategory) return null

  const { numeric, categorical } = getSpecMeta()
  const hasNumeric = Object.keys(numeric).length > 0
  const hasCategorical = Object.keys(categorical).length > 0

  if (!hasNumeric && !hasCategorical) {
    return (
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-1 mb-2">
          Tech Specs
        </div>
        <p className="text-[11px] text-zinc-600 px-1">
          Specs not yet populated for this category.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-1 mb-2">
        Tech Specs
      </div>

      {/* Numeric range sliders */}
      {Object.entries(numeric).map(([specName, bounds]) => (
        <NumericSpecFilter key={specName} specName={specName} bounds={bounds} />
      ))}

      {hasNumeric && hasCategorical && (
        <div className="border-t border-zinc-800/30 my-1" />
      )}

      {/* Categorical chip selectors */}
      {Object.entries(categorical).map(([specName, values]) => (
        <ChipSelect key={specName} specName={specName} values={values} />
      ))}
    </div>
  )
}
