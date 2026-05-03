import { Film } from 'lucide-react'

interface Production {
  title: string
  year: number
  dop?: string | null
  type: 'Feature' | 'Series'
}

interface ProductionsJson {
  productions: Production[]
  industryNote?: string | null
}

interface Props {
  productionsJson: ProductionsJson | null | undefined
  className?: string
}

export default function AsSeenOn({ productionsJson, className = '' }: Props) {
  if (!productionsJson?.productions?.length) return null

  const { productions, industryNote } = productionsJson

  return (
    <div className={`bg-slate-900/30 border border-slate-800/25 rounded-2xl overflow-hidden ${className}`}>
      <div className="flex items-center gap-2.5 px-5 sm:px-6 py-4 border-b border-slate-800/25">
        <Film size={15} className="text-indigo-400" />
        <span className="text-sm font-bold text-slate-100 tracking-tight">As Seen On</span>
        <span className="text-[10px] text-slate-600 font-light ml-1">{productions.length} productions</span>
      </div>

      {industryNote && (
        <p className="px-5 sm:px-6 pt-4 pb-1 text-[12px] text-slate-400 font-light leading-relaxed">
          {industryNote}
        </p>
      )}

      <div className="px-5 sm:px-6 pb-5 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {productions.map((p, i) => (
          <div key={i} className="flex items-start gap-2.5 py-2 border-b border-slate-800/20 last:border-0">
            <div className="shrink-0 mt-0.5">
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide leading-none border ${
                p.type === 'Series'
                  ? 'bg-violet-950/60 text-violet-400 border-violet-800/40'
                  : 'bg-indigo-950/60 text-indigo-400 border-indigo-800/40'
              }`}>
                {p.type === 'Series' ? 'TV' : 'Film'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-slate-200 leading-snug truncate">{p.title}</p>
              <p className="text-[10px] text-slate-600 font-light mt-0.5">
                {p.year}{p.dop ? ` · DP: ${p.dop}` : ''}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
