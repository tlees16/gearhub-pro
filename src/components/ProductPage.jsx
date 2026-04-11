import { useMemo, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ExternalLink, Star, ThumbsUp, ThumbsDown,
  Award, ShoppingCart, Camera, Aperture, Zap, Sparkles,
  Plus, Check, ChevronDown, ChevronUp, List,
} from 'lucide-react'
import useStore from '../store/useStore'
import { SPEC_COLUMNS, getSpecLabel, getSpecUnit } from '../services/dataService'
import { getExpertAnalysis } from '../services/expertAnalysis'
import CompatibleGear from './CompatibleGear'
import CommunityHub from './CommunityHub'
import ListPicker from './ListPicker'

const CATEGORY_ICON = { cameras: Camera, lenses: Aperture, lighting: Zap }

// Price aggregator — only B&H has real URLs; others are hidden if no match
function getPriceSources(product) {
  const sources = []
  if (product.url) {
    sources.push({
      retailer: 'B&H Photo',
      price: product.price,
      url: product.url,
      logo: 'B&H',
      available: true,
    })
  }
  // We only show other retailers if we could hypothetically find them.
  // Since we don't have real Amazon/Adorama/CVP URLs, hide them per spec.
  return sources
}

function VerdictRing({ score }) {
  const circumference = 2 * Math.PI * 36
  const offset = circumference - (score / 100) * circumference
  const color =
    score >= 90 ? 'text-emerald-400' :
    score >= 80 ? 'text-indigo-400' :
    score >= 70 ? 'text-amber-400' :
    'text-red-400'
  const strokeColor =
    score >= 90 ? '#34d399' :
    score >= 80 ? '#818cf8' :
    score >= 70 ? '#fbbf24' :
    '#f87171'

  return (
    <div className="relative w-24 h-24">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="36" fill="none" stroke="#1e293b" strokeWidth="3" />
        <circle
          cx="40" cy="40" r="36" fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
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

export default function ProductPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { products, loading, projects, user, openAuthModal } = useStore()
  const [showPicker, setShowPicker] = useState(false)
  const [showAllSpecs, setShowAllSpecs] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const inAnyList = projects.some(p => p.items.some(i => i.productId === productId))

  const product = useMemo(
    () => products.find(p => p.id === productId),
    [products, productId]
  )

  // Must be before early returns — React rules of hooks
  useEffect(() => {
    if (!product) return
    const initial = getExpertAnalysis(product, (data) => setAnalysis(data))
    setAnalysis(initial)
  }, [product?.id])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 min-h-screen">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 min-h-screen gap-3">
        <p className="text-slate-400 text-sm font-light">Product not found</p>
        <button
          onClick={() => navigate('/')}
          className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Back to database
        </button>
      </div>
    )
  }

  const activeAnalysis = analysis || {
    description: 'Loading analysis…',
    pros: ['Loading analysis…'],
    cons: ['Loading analysis…'],
    communityVoice: null,
    verdict: 75,
    loading: true,
  }

  const priceSources = getPriceSources(product)
  const specCols = (SPEC_COLUMNS[product.category] || []).map(([col]) => col)
  const CatIcon = CATEGORY_ICON[product.category]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Nav bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800/40 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-slate-200 transition-colors duration-200"
          >
            <ArrowLeft size={14} />
            <span className="font-light">Back</span>
          </button>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2 text-[11px] text-slate-600 font-light">
            {CatIcon && <CatIcon size={12} />}
            <span className="capitalize">{product.category}</span>
            <span className="text-slate-800">/</span>
            <span className="text-slate-400">{product.brand}</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">

        {/* ═══ HERO SECTION ═══ */}
        <section className="flex gap-10 items-start">
          {/* Product photo */}
          <div className="w-[420px] shrink-0">
            <div className="aspect-square rounded-2xl bg-slate-900/40 border border-slate-800/30 overflow-hidden flex items-center justify-center ring-1 ring-slate-800/20">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-contain p-8"
                />
              ) : (
                <div className="text-slate-800 text-sm font-light">No Image Available</div>
              )}
            </div>
          </div>

          {/* Product info */}
          <div className="flex-1 pt-2">
            <div className="flex items-center gap-2.5 mb-3">
              {CatIcon && <CatIcon size={14} className="text-indigo-400" />}
              <span className="text-[10px] uppercase tracking-widest text-indigo-400/70 font-semibold">
                {product.category}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-50 leading-tight">
              {product.name}
            </h1>
            <p className="text-base text-slate-500 font-light mt-1">{product.brand}</p>

            {/* Price */}
            <div className="mt-6">
              <p className={`text-3xl font-bold tabular-nums tracking-tight ${
                product.price ? 'text-emerald-400' : 'text-amber-500/70'
              }`}>
                {product.price ? `$${product.price.toLocaleString()}` : product.priceRaw || 'Price on Request'}
              </p>
            </div>

            {/* Key specs grid */}
            <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-4">
              {specCols.map(col => {
                const spec = product.specs[col]
                if (!spec || (!spec.value && spec.raw === 'N/A')) return null
                const unit = getSpecUnit(col)
                return (
                  <div key={col} className="flex items-start justify-between gap-2 border-b border-slate-800/40 pb-3">
                    <span className="text-[11px] text-slate-500 font-light shrink-0">
                      {getSpecLabel(col)}
                    </span>
                    <span className="text-[12px] font-medium text-slate-200 text-right tabular-nums">
                      {`${spec.raw}${unit}`}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 mt-8">
              <div className="relative">
                <button
                  onClick={() => { if (!user) { openAuthModal(); return } setShowPicker(v => !v) }}
                  className={`inline-flex items-center gap-2 text-[12px] font-medium rounded-xl px-5 py-2.5 transition-all duration-300 ${
                    inAnyList
                      ? 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15'
                      : 'text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15'
                  }`}
                >
                  {inAnyList ? <Check size={14} /> : <Plus size={14} />}
                  {inAnyList ? 'In List' : 'Add to List'}
                </button>
                {showPicker && (
                  <ListPicker
                    productId={product.id}
                    onClose={() => setShowPicker(false)}
                    align="left"
                  />
                )}
              </div>
              {product.url && (
                <a
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[12px] font-medium text-slate-400 bg-slate-800/40 hover:bg-slate-800/60 border border-slate-800/40 rounded-xl px-5 py-2.5 transition-all duration-300"
                >
                  <ShoppingCart size={14} />
                  B&H Photo
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
        </section>

        {/* ═══ AI EXPERT ANALYSIS + LIVE DEALS ═══ */}
        <section className="grid grid-cols-3 gap-6">
          {/* Expert Analysis — spans 2 cols */}
          <div className="col-span-2 bg-slate-900/30 border border-slate-800/25 rounded-2xl p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <Sparkles size={15} className="text-indigo-400" />
              <h2 className="text-sm font-bold text-slate-100 tracking-tight">Expert Analysis</h2>
              <span className="text-[9px] text-indigo-400/50 bg-indigo-500/8 border border-indigo-500/10 rounded px-1.5 py-0.5 font-mono">
                AI-Generated
              </span>
            </div>

            {/* Description */}
            <p className={`text-[13px] leading-relaxed mb-6 ${activeAnalysis.loading ? 'text-slate-600 animate-pulse' : 'text-slate-400 font-light'}`}>
              {activeAnalysis.description}
            </p>

            {/* Pros & Cons */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <ThumbsUp size={12} className="text-emerald-400" />
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest">Strengths</span>
                </div>
                <ul className="space-y-2">
                  {activeAnalysis.pros.map((pro, i) => (
                    <li key={i} className={`flex items-start gap-2 text-[12px] font-light ${activeAnalysis.loading ? 'text-slate-700' : 'text-slate-300'}`}>
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
                  {activeAnalysis.cons.map((con, i) => (
                    <li key={i} className={`flex items-start gap-2 text-[12px] font-light ${activeAnalysis.loading ? 'text-slate-700' : 'text-slate-300'}`}>
                      <span className="text-amber-500/60 mt-0.5 shrink-0">&ndash;</span>
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Community Voice */}
            {activeAnalysis.communityVoice && (
              <div className="border-t border-slate-800/30 pt-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Star size={11} className="text-slate-500" />
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">On Set & In The Field</span>
                </div>
                <p className="text-[12px] text-slate-500 font-light leading-relaxed italic">
                  "{activeAnalysis.communityVoice}"
                </p>
              </div>
            )}
          </div>

          {/* Right column — Verdict + Live Deals */}
          <div className="space-y-6">
            {/* Verdict card */}
            <div className="bg-slate-900/30 border border-slate-800/25 rounded-2xl p-6 flex flex-col items-center">
              <div className="flex items-center gap-2 mb-4">
                <Award size={14} className="text-indigo-400" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Final Verdict</span>
              </div>
              <VerdictRing score={activeAnalysis.verdict} />
              <p className="text-[11px] text-slate-500 font-light mt-3 text-center leading-relaxed">
                {activeAnalysis.verdict >= 90 ? 'Exceptional — best in class' :
                 activeAnalysis.verdict >= 80 ? 'Excellent — highly recommended' :
                 activeAnalysis.verdict >= 70 ? 'Solid — good value proposition' :
                 'Decent — consider alternatives'}
              </p>
            </div>

            {/* Live Deals */}
            <div className="bg-slate-900/30 border border-slate-800/25 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart size={14} className="text-indigo-400" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Live Deals</span>
              </div>

              {priceSources.length > 0 ? (
                <div className="space-y-2.5">
                  {priceSources.map(source => (
                    <a
                      key={source.retailer}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between bg-slate-950/50 border border-slate-800/30 rounded-xl px-4 py-3 hover:border-indigo-500/20 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center text-[10px] font-bold text-slate-400">
                          {source.logo}
                        </div>
                        <div>
                          <div className="text-[12px] font-medium text-slate-200">{source.retailer}</div>
                          <div className="text-[10px] text-emerald-500 font-light">In Stock</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[14px] font-bold tabular-nums ${
                          source.price ? 'text-emerald-400' : 'text-amber-500/60'
                        }`}>
                          {source.price ? `$${source.price.toLocaleString()}` : 'Quote'}
                        </span>
                        <ExternalLink size={10} className="text-slate-700 group-hover:text-indigo-400 transition-colors" />
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-600 font-light text-center py-4">
                  No retailer links available
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ═══ FULL SPECIFICATIONS ACCORDION ═══ */}
        {Object.keys(product.allSpecs || {}).length > 0 && (
          <section className="bg-slate-900/30 border border-slate-800/25 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowAllSpecs(v => !v)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-800/20 transition-colors duration-200"
            >
              <div className="flex items-center gap-2.5">
                <List size={14} className="text-indigo-400" />
                <span className="text-sm font-bold text-slate-100 tracking-tight">Full Specifications</span>
                <span className="text-[10px] text-slate-600 font-light">
                  {Object.keys(product.allSpecs).length} specs
                </span>
              </div>
              {showAllSpecs
                ? <ChevronUp size={14} className="text-slate-500" />
                : <ChevronDown size={14} className="text-slate-500" />
              }
            </button>
            {showAllSpecs && (
              <div className="px-6 pb-6 grid grid-cols-2 gap-x-12 gap-y-0 border-t border-slate-800/25">
                {Object.entries(product.allSpecs).map(([key, val]) => {
                  if (val == null || val === '') return null
                  const label = key
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, c => c.toUpperCase())
                  return (
                    <div key={key} className="flex items-start justify-between gap-4 border-b border-slate-800/25 py-2.5">
                      <span className="text-[11px] text-slate-500 font-light shrink-0 max-w-[45%]">{label}</span>
                      <span className="text-[11px] text-slate-300 text-right">{String(val)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* ═══ COMPATIBLE GEAR CAROUSEL ═══ */}
        <CompatibleGear product={product} />

        {/* ═══ COMMUNITY HUB ═══ */}
        <CommunityHub productId={product.id} productName={product.name} />
      </div>

      {/* Footer padding */}
      <div className="h-16" />
    </div>
  )
}
