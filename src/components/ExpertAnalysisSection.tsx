'use client'

import { useState, useEffect } from 'react'
import { Sparkles, ThumbsUp, ThumbsDown, Award, Star, ChevronDown } from 'lucide-react'
import { getExpertAnalysis } from '../services/expertAnalysis'
import type { StoredAnalysis } from '@/lib/supabase-server'

function VerdictRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 36
  const offset = circumference - (score / 100) * circumference
  const color =
    score >= 90 ? 'text-emerald-400' :
    score >= 80 ? 'text-indigo-400' :
    score >= 70 ? 'text-amber-400' : 'text-red-400'
  const strokeColor =
    score >= 90 ? '#34d399' :
    score >= 80 ? '#818cf8' :
    score >= 70 ? '#fbbf24' : '#f87171'

  return (
    <div className="relative w-24 h-24">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="36" fill="none" stroke="#1e293b" strokeWidth="3" />
        <circle
          cx="40" cy="40" r="36" fill="none"
          stroke={strokeColor} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-bold tabular-nums tracking-tight ${color}`}>{score}</span>
        <span className="text-[8px] text-slate-600 uppercase tracking-widest">Score</span>
      </div>
    </div>
  )
}

interface Analysis {
  description: string
  pros: string[]
  cons: string[]
  communityVoice: string | null
  verdict: number
  loading?: boolean
}

interface Props {
  productId: string
  productName: string
  brand: string
  category: string
  subcategory: string | null
  price: number
  allSpecs: Record<string, unknown>
  storedAnalysis?: StoredAnalysis | null
  className?: string
}

export default function ExpertAnalysisSection({
  productId, productName, brand, category, subcategory, price, allSpecs, storedAnalysis, className,
}: Props) {
  const [analysis, setAnalysis] = useState<Analysis | null>(
    storedAnalysis ? { ...storedAnalysis, loading: false } : null
  )

  useEffect(() => {
    if (storedAnalysis) return  // DB has it — no API call needed
    const product = { id: productId, name: productName, brand, category, subcategory, price, allSpecs }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const initial = getExpertAnalysis(product as any, setAnalysis)
    setAnalysis(initial)
  }, [productId]) // eslint-disable-line react-hooks/exhaustive-deps

  const a: Analysis = analysis ?? {
    description: 'Generating analysis…',
    pros: ['…'],
    cons: ['…'],
    communityVoice: null,
    verdict: 75,
    loading: true,
  }

  return (
    <details className={`group bg-slate-900/30 border border-slate-800/25 rounded-2xl overflow-hidden ${className ?? ''}`}>
      <summary className="flex items-center justify-between px-5 sm:px-6 py-4 cursor-pointer list-none select-none hover:bg-slate-800/20 transition-colors duration-200">
        <div className="flex items-center gap-2.5">
          <Sparkles size={15} className="text-indigo-400" />
          <span className="text-sm font-bold text-slate-100 tracking-tight">Expert Analysis</span>
          <span className="text-[9px] text-indigo-400/50 border border-indigo-500/10 rounded px-1.5 py-0.5 font-mono">
            AI-Generated
          </span>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" />
      </summary>

      <div className="border-t border-slate-800/25 p-5 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">

          {/* Expert text — spans 2 of 3 cols */}
          <div className="md:col-span-2">
            <p className={`text-[13px] leading-relaxed mb-5 sm:mb-6 ${a.loading ? 'text-slate-600 animate-pulse' : 'text-slate-400 font-light'}`}>
              {a.description}
            </p>

            <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-5 sm:mb-6">
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <ThumbsUp size={12} className="text-emerald-400" />
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest">Strengths</span>
                </div>
                <ul className="space-y-2">
                  {a.pros.map((pro, i) => (
                    <li key={i} className={`flex items-start gap-2 text-[12px] font-light ${a.loading ? 'text-slate-700' : 'text-slate-300'}`}>
                      <span className="text-emerald-500/60 mt-0.5 shrink-0">+</span>
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <ThumbsDown size={12} className="text-amber-400" />
                  <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-widest">Limitations</span>
                </div>
                <ul className="space-y-2">
                  {a.cons.map((con, i) => (
                    <li key={i} className={`flex items-start gap-2 text-[12px] font-light ${a.loading ? 'text-slate-700' : 'text-slate-300'}`}>
                      <span className="text-amber-500/60 mt-0.5 shrink-0">–</span>
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {a.communityVoice && (
              <div className="border-t border-slate-800/30 pt-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Star size={11} className="text-slate-500" />
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">On Set &amp; In The Field</span>
                </div>
                <p className="text-[12px] text-slate-500 font-light leading-relaxed italic">
                  &ldquo;{a.communityVoice}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Verdict card */}
          <div className="bg-slate-900/50 border border-slate-800/30 rounded-xl p-5 sm:p-6 flex flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-2">
              <Award size={14} className="text-indigo-400" />
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Final Verdict</span>
            </div>
            <VerdictRing score={a.verdict} />
            <p className="text-[11px] text-slate-500 font-light text-center leading-relaxed">
              {a.verdict >= 90 ? 'Exceptional — best in class' :
               a.verdict >= 80 ? 'Excellent — highly recommended' :
               a.verdict >= 70 ? 'Solid — good value proposition' :
               'Decent — consider alternatives'}
            </p>
          </div>

        </div>
      </div>
    </details>
  )
}
