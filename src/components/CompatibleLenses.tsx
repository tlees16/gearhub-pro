'use client'

import { useRef } from 'react'
import { ChevronLeft, ChevronRight, Link2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { CompatibleLens } from '@/types/gear'
import useStore from '../store/useStore'

function fmtPrice(p: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(p)
}

function shortCoverage(raw: string | null): string | null {
  if (!raw) return null
  const s = raw.toLowerCase()
  if (s.startsWith('full')) return 'Full Frame'
  if (s.startsWith('super35') || s.startsWith('aps-c')) return 'Super 35'
  if (s.includes('large format') || s.includes('65 mm')) return 'LF'
  if (s.includes('medium format')) return 'MF'
  if (s.includes('four thirds') || s.includes('mft') || s.includes('micro four')) return 'MFT'
  return null
}

function LensCard({ lens }: { lens: CompatibleLens }) {
  const coverage = shortCoverage(lens.formatCoverage)
  const mountLabel = (lens.lensMount ?? '')
    .replace(/^Interchangeable Mount with Included\s*/i, '')

  return (
    <Link
      href={`/product/${lens.id}`}
      className="group shrink-0 w-48 bg-slate-950/60 border border-slate-800/30 rounded-xl p-3 hover:bg-slate-900/70 hover:border-indigo-500/20 transition-all duration-200"
    >
      <div className="w-full h-28 rounded-lg bg-slate-900/60 ring-1 ring-slate-800/30 overflow-hidden flex items-center justify-center mb-3">
        {lens.imageUrl ? (
          <Image
            src={lens.imageUrl}
            alt={lens.name}
            width={160}
            height={112}
            className="w-full h-full object-contain p-2"
            loading="lazy"
          />
        ) : (
          <span className="text-slate-800 text-[10px]">No Image</span>
        )}
      </div>

      <h4 className="text-[11.5px] font-semibold text-slate-200 leading-snug tracking-tight line-clamp-2 group-hover:text-indigo-300 transition-colors duration-200 min-h-[2.5em]">
        {lens.name}
      </h4>
      <p className="text-[10px] text-slate-600 font-light mt-0.5 mb-2">{lens.brand}</p>

      <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
        {mountLabel && (
          <span className="text-[9px] text-indigo-400/80 bg-indigo-500/8 border border-indigo-500/15 rounded px-1.5 py-0.5 font-mono truncate max-w-[9rem]">
            {mountLabel}
          </span>
        )}
        {coverage && (
          <span className="text-[9px] text-slate-500 bg-slate-800/50 border border-slate-700/30 rounded px-1.5 py-0.5 font-mono">
            {coverage}
          </span>
        )}
      </div>

      {lens.lowestPrice != null ? (
        <div className="flex items-baseline gap-1.5">
          <span className="text-[12px] font-bold text-emerald-400 tabular-nums">
            {fmtPrice(lens.lowestPrice)}
          </span>
          {lens.msrp != null && lens.lowestPrice < lens.msrp && (
            <span className="text-[10px] text-slate-600 line-through tabular-nums">
              {fmtPrice(lens.msrp)}
            </span>
          )}
        </div>
      ) : (
        <span className="text-[10px] text-amber-500/50">POA</span>
      )}
    </Link>
  )
}

// "View all" card — last item in the carousel when there are more lenses
function ViewAllCard({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group shrink-0 w-40 bg-slate-900/20 border border-slate-800/20 border-dashed rounded-xl p-3 hover:bg-slate-900/50 hover:border-indigo-500/30 transition-all duration-200 flex flex-col items-center justify-center gap-3 min-h-[220px]"
    >
      <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
        <ArrowRight size={16} className="text-indigo-400" />
      </div>
      <div className="text-center">
        <p className="text-[11px] font-semibold text-slate-300 group-hover:text-indigo-300 transition-colors leading-snug">
          View all {count}
        </p>
        <p className="text-[10px] text-slate-600 mt-0.5">compatible lenses</p>
      </div>
    </button>
  )
}

export default function CompatibleLenses({
  lenses,
  totalCount,
  nativeMounts,
  mount,
  className = '',
}: {
  lenses: CompatibleLens[]
  totalCount: number
  nativeMounts: string[]
  mount: string
  className?: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { setActiveCategory, setSpecFilter } = useStore()

  if (!lenses.length) return null

  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' })
  }

  const mountLabel = mount.replace(/^Interchangeable Mount with Included\s*/i, '')
  const hasMore = totalCount > lenses.length

  const handleViewAll = () => {
    // Set category to lenses and pre-apply the mount filter, then go to catalog
    setActiveCategory('lenses')
    setSpecFilter('lens_mount', nativeMounts)
    router.push('/')
  }

  return (
    <div className={`bg-slate-900/30 border border-slate-800/25 rounded-2xl overflow-hidden ${className}`}>
      <div className="px-5 sm:px-6 pt-4 pb-3 border-b border-slate-800/25 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link2 size={15} className="text-indigo-400" />
          <h2 className="text-sm font-bold text-slate-100 tracking-tight">Compatible Lenses</h2>
          <span className="text-[10px] text-slate-600 font-light hidden sm:inline">
            {mountLabel} · {totalCount} native match{totalCount !== 1 ? 'es' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasMore && (
            <button
              onClick={handleViewAll}
              className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              View all {totalCount}
              <ArrowRight size={11} />
            </button>
          )}
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
      </div>

      <div className="px-5 sm:px-6 py-4">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-1 scrollbar-none"
          style={{ scrollbarWidth: 'none' }}
        >
          {lenses.map((lens) => (
            <LensCard key={lens.id} lens={lens} />
          ))}
          {hasMore && (
            <ViewAllCard count={totalCount} onClick={handleViewAll} />
          )}
        </div>
      </div>
    </div>
  )
}
