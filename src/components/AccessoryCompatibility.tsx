'use client'

import { useRef } from 'react'
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import type { CompatibleLight } from '@/types/gear'

function fmtPrice(p: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(p)
}

function LightCard({ light }: { light: CompatibleLight }) {
  return (
    <Link
      href={`/product/${light.id}`}
      className="group shrink-0 w-48 bg-slate-950/60 border border-slate-800/30 rounded-xl p-3 hover:bg-slate-900/70 hover:border-amber-500/20 transition-all duration-200"
    >
      <div className="w-full h-28 rounded-lg bg-slate-900/60 ring-1 ring-slate-800/30 overflow-hidden flex items-center justify-center mb-3">
        {light.imageUrl ? (
          <Image
            src={light.imageUrl}
            alt={light.name}
            width={160}
            height={112}
            className="w-full h-full object-contain p-2"
            loading="lazy"
          />
        ) : (
          <span className="text-slate-800 text-[10px]">No Image</span>
        )}
      </div>

      <h4 className="text-[11.5px] font-semibold text-slate-200 leading-snug tracking-tight line-clamp-2 group-hover:text-amber-300 transition-colors duration-200 min-h-[2.5em]">
        {light.name}
      </h4>
      <p className="text-[10px] text-slate-600 font-light mt-0.5 mb-2">{light.brand}</p>

      {light.formFactor && (
        <div className="mb-2">
          <span className="text-[9px] text-amber-400/80 bg-amber-500/8 border border-amber-500/15 rounded px-1.5 py-0.5 font-mono truncate max-w-[9rem] block">
            {light.formFactor.replace(/^\d+x\s+/i, '')}
          </span>
        </div>
      )}

      {light.lowestPrice != null ? (
        <div className="flex items-baseline gap-1.5">
          <span className="text-[12px] font-bold text-emerald-400 tabular-nums">
            {fmtPrice(light.lowestPrice)}
          </span>
          {light.msrp != null && light.lowestPrice < light.msrp && (
            <span className="text-[10px] text-slate-600 line-through tabular-nums">
              {fmtPrice(light.msrp)}
            </span>
          )}
        </div>
      ) : (
        <span className="text-[10px] text-amber-500/50">POA</span>
      )}
    </Link>
  )
}

export default function AccessoryCompatibility({
  lights,
  totalCount,
  className = '',
}: {
  lights: CompatibleLight[]
  totalCount: number
  className?: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  if (!lights.length) return null

  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' })
  }

  return (
    <div className={`bg-slate-900/30 border border-slate-800/25 rounded-2xl overflow-hidden ${className}`}>
      <div className="px-5 sm:px-6 pt-4 pb-3 border-b border-slate-800/25 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Zap size={15} className="text-amber-400" />
          <h2 className="text-sm font-bold text-slate-100 tracking-tight">Compatible Lights</h2>
          <span className="text-[10px] text-slate-600 font-light hidden sm:inline">
            {totalCount} light{totalCount !== 1 ? 's' : ''} matched
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => scroll(-1)}
            aria-label="Scroll left"
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-800/50 transition-all duration-200"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll(1)}
            aria-label="Scroll right"
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-800/50 transition-all duration-200"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="px-5 sm:px-6 py-4">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-1 scrollbar-none"
          style={{ scrollbarWidth: 'none' }}
        >
          {lights.map((light) => (
            <LightCard key={light.id} light={light} />
          ))}
        </div>
      </div>
    </div>
  )
}
