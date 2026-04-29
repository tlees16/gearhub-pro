'use client'

import useStore from '../../store/useStore'
import RangeSlider from './RangeSlider'

export default function PriceFilter() {
  const getPriceRange = useStore(s => s.getPriceRange)
  const priceRange = useStore(s => s.priceRange)
  const setPriceRange = useStore(s => s.setPriceRange)

  const bounds = getPriceRange()
  if (!bounds) return null

  const [min, max] = bounds
  if (min === max) return null

  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-1 mb-3">
        Price
      </div>
      <div className="px-1">
        <RangeSlider
          label="USD"
          min={min}
          max={max}
          value={priceRange}
          onChange={setPriceRange}
          prefix="$"
        />
      </div>
    </div>
  )
}
