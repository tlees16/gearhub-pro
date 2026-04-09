import { useState, useRef, useCallback, useEffect } from 'react'

function formatValue(val, prefix = '') {
  if (val >= 1000) {
    return prefix + val.toLocaleString()
  }
  return prefix + val
}

export default function RangeSlider({ label, min, max, value, onChange, prefix = '', step }) {
  const [localMin, setLocalMin] = useState(value ? value[0] : min)
  const [localMax, setLocalMax] = useState(value ? value[1] : max)
  const [dragging, setDragging] = useState(null)
  const trackRef = useRef(null)

  const effectiveStep = step || Math.max(1, Math.floor((max - min) / 100))

  useEffect(() => {
    setLocalMin(value ? value[0] : min)
    setLocalMax(value ? value[1] : max)
  }, [value, min, max])

  const getPercent = useCallback((val) => {
    return ((val - min) / (max - min)) * 100
  }, [min, max])

  const handleMinChange = (e) => {
    const val = Math.min(Number(e.target.value), localMax - effectiveStep)
    setLocalMin(val)
    onChange([val, localMax])
  }

  const handleMaxChange = (e) => {
    const val = Math.max(Number(e.target.value), localMin + effectiveStep)
    setLocalMax(val)
    onChange([localMin, val])
  }

  const isFiltered = value && (value[0] > min || value[1] < max)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-zinc-400">{label}</span>
        {isFiltered && (
          <button
            onClick={() => onChange(null)}
            className="text-[10px] text-emerald-500/70 hover:text-emerald-400 transition-colors"
          >
            reset
          </button>
        )}
      </div>

      {/* Value display */}
      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
        <span className={isFiltered ? 'text-emerald-400' : ''}>
          {formatValue(localMin, prefix)}
        </span>
        <span className={isFiltered ? 'text-emerald-400' : ''}>
          {formatValue(localMax, prefix)}
        </span>
      </div>

      {/* Dual range slider */}
      <div className="relative h-5 flex items-center" ref={trackRef}>
        {/* Track background */}
        <div className="absolute w-full h-1 rounded-full bg-zinc-800" />

        {/* Active range */}
        <div
          className="absolute h-1 rounded-full bg-emerald-500/40"
          style={{
            left: `${getPercent(localMin)}%`,
            width: `${getPercent(localMax) - getPercent(localMin)}%`,
          }}
        />

        {/* Min thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={effectiveStep}
          value={localMin}
          onChange={handleMinChange}
          className="range-thumb absolute w-full pointer-events-none appearance-none bg-transparent"
          style={{ zIndex: localMin > max - effectiveStep * 2 ? 5 : 3 }}
        />

        {/* Max thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={effectiveStep}
          value={localMax}
          onChange={handleMaxChange}
          className="range-thumb absolute w-full pointer-events-none appearance-none bg-transparent"
          style={{ zIndex: 4 }}
        />
      </div>
    </div>
  )
}
