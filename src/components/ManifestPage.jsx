import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ClipboardList, Trash2, Minus, Plus,
  Zap, Weight, DollarSign, AlertTriangle, Copy, Check,
  Camera, Aperture, Sun, Package, Search, FolderOpen,
} from 'lucide-react'
import useStore from '../store/useStore'

const CATEGORY_ICON = { cameras: Camera, lenses: Aperture, lighting: Sun }

function StatCard({ icon: Icon, label, value, unit, color }) {
  return (
    <div className="bg-slate-900/40 border border-slate-800/25 rounded-xl px-5 py-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={color} />
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold tabular-nums tracking-tight ${color}`}>{value}</span>
        {unit && <span className="text-[11px] text-slate-600 font-light">{unit}</span>}
      </div>
    </div>
  )
}

export default function ManifestPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const {
    projects, getProjectById, getProjectProducts, getProjectStats, getProjectConflicts,
    updateItemQuantity, removeItemFromProject, clearProjectItems, setActiveProject, createProject,
  } = useStore()

  const project = getProjectById(projectId)
  const items = getProjectProducts(projectId)
  const stats = getProjectStats(projectId)
  const conflicts = getProjectConflicts(projectId)

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-3">
        <p className="text-slate-400 text-sm font-light">List not found</p>
        <button onClick={() => navigate('/projects')} className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors">
          View all lists
        </button>
      </div>
    )
  }

  const totalQty = items.reduce((s, i) => s + i.quantity, 0)

  const handleCopy = () => {
    const lines = items.map(({ product, quantity }) =>
      `${quantity}x ${product.name}`
    )
    const text = [
      `── GearHub Pro — ${project.name} ──`,
      '',
      ...lines,
      '',
      `── Total: ${items.length} items | $${stats.totalPrice.toLocaleString()} ──`,
      stats.totalWatts > 0 ? `Power Draw: ${stats.totalWatts.toLocaleString()}W` : null,
      stats.totalWeight > 0 ? `Weight: ${stats.totalWeight.toFixed(1)} lbs` : null,
    ].filter(Boolean).join('\n')

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Nav bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800/40 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-slate-200 transition-colors duration-200"
            >
              <ArrowLeft size={14} />
              <span className="font-light">Database</span>
            </button>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center gap-2">
              <ClipboardList size={14} className="text-indigo-400" />
              <span className="text-[13px] font-bold tracking-tight">{project.name}</span>
              <span className="text-[10px] text-slate-600 font-light tabular-nums">
                {totalQty} item{totalQty !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <>
                <button
                  onClick={() => clearProjectItems(projectId)}
                  className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-red-400 font-light transition-colors duration-200 px-2.5 py-1.5"
                >
                  <Trash2 size={11} />
                  Clear List
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg px-4 py-2 transition-all duration-300"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied!' : 'Copy for Rental House'}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* List switcher tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {projects.map(p => {
            const isActive = p.id === projectId
            const qty = p.items.reduce((s, i) => s + i.quantity, 0)
            return (
              <button
                key={p.id}
                onClick={() => {
                  setActiveProject(p.id)
                  navigate(`/manifest/${p.id}`)
                }}
                className={`flex items-center gap-1.5 shrink-0 text-[11px] font-medium px-3.5 py-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-300 ring-1 ring-inset ring-indigo-500/20'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
                }`}
              >
                <FolderOpen size={11} />
                <span className="max-w-[140px] truncate">{p.name}</span>
                <span className={`text-[9px] tabular-nums ${isActive ? 'text-indigo-400/60' : 'text-slate-700'}`}>{qty}</span>
              </button>
            )
          })}
          <button
            onClick={() => {
              const id = createProject('New List')
              setActiveProject(id)
              navigate(`/manifest/${id}`)
            }}
            className="flex items-center gap-1 shrink-0 text-[11px] text-slate-600 hover:text-indigo-300 px-3 py-2 rounded-lg hover:bg-slate-800/40 transition-all duration-200"
          >
            <Plus size={12} />
            <span className="font-light">New List</span>
          </button>
        </div>

        {/* Empty state */}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Package size={32} className="text-slate-800" />
            <p className="text-slate-500 text-sm font-light">This list has no gear yet</p>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-[12px] font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl px-5 py-2.5 transition-all duration-300 mt-2"
            >
              <Search size={14} />
              Go Find Gear
            </button>
          </div>
        )}

        {items.length > 0 && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-4">
              <StatCard icon={DollarSign} label="Kit Price" value={`$${stats.totalPrice.toLocaleString()}`} color="text-emerald-400" />
              <StatCard icon={Zap} label="Power Draw" value={stats.totalWatts > 0 ? stats.totalWatts.toLocaleString() : '—'} unit={stats.totalWatts > 0 ? 'W' : ''} color="text-amber-400" />
              <StatCard icon={Weight} label="Total Weight" value={stats.totalWeight > 0 ? stats.totalWeight.toFixed(1) : '—'} unit={stats.totalWeight > 0 ? 'lbs' : ''} color="text-indigo-400" />
            </div>

            {/* Conflict alerts */}
            {conflicts.length > 0 && (
              <div className="space-y-2">
                {conflicts.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/15 rounded-xl px-4 py-3">
                    <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                    <span className="text-[12px] text-amber-300/80 font-light">{c.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Table */}
            <div className="bg-slate-900/30 border border-slate-800/25 rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-800/30 text-[9px] uppercase tracking-widest text-slate-600 font-semibold">
                <div className="w-12" />
                <div className="w-12">Img</div>
                <div className="flex-1">Product</div>
                <div className="w-28 text-center">Qty</div>
                <div className="w-24 text-right">Unit Price</div>
                <div className="w-24 text-right">Subtotal</div>
                <div className="w-10" />
              </div>

              {/* Rows */}
              {items.map(({ product, quantity }) => {
                const CatIcon = CATEGORY_ICON[product.category]
                const subtotal = product.price ? product.price * quantity : null
                return (
                  <div
                    key={product.id}
                    className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-800/15 last:border-0 hover:bg-slate-900/40 transition-colors duration-150 group"
                  >
                    <div className="w-12 flex justify-center">
                      {CatIcon && <CatIcon size={13} className="text-slate-700" />}
                    </div>

                    <div className="w-12">
                      <div
                        className="w-10 h-10 rounded-lg bg-slate-950/60 border border-slate-800/30 overflow-hidden flex items-center justify-center cursor-pointer"
                        onClick={() => navigate(`/product/${product.id}`)}
                      >
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-contain p-1" loading="lazy" />
                        ) : (
                          <div className="text-[7px] text-slate-700">N/A</div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/product/${product.id}`)}>
                      <h3 className="text-[12.5px] font-semibold text-slate-100 truncate tracking-tight hover:text-indigo-300 transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-[10px] text-slate-600 font-light mt-0.5">
                        {product.brand}
                        {product.specs['Lens Mount']?.raw && product.specs['Lens Mount'].raw !== 'N/A' ? ` · ${product.specs['Lens Mount'].raw}` : ''}
                        {product.specs['Mount']?.raw && product.specs['Mount'].raw !== 'N/A' ? ` · ${product.specs['Mount'].raw}` : ''}
                        {product.specs['Max Power (W)']?.value ? ` · ${product.specs['Max Power (W)'].raw}W` : ''}
                      </p>
                    </div>

                    <div className="w-28 flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => updateItemQuantity(projectId, product.id, quantity - 1)}
                        className="w-6 h-6 rounded-md border border-slate-800/40 flex items-center justify-center text-slate-500 hover:text-slate-200 hover:border-slate-600 transition-all duration-150"
                      >
                        <Minus size={11} />
                      </button>
                      <span className="w-8 text-center text-[13px] font-semibold tabular-nums text-slate-200">{quantity}</span>
                      <button
                        onClick={() => updateItemQuantity(projectId, product.id, quantity + 1)}
                        className="w-6 h-6 rounded-md border border-slate-800/40 flex items-center justify-center text-slate-500 hover:text-slate-200 hover:border-slate-600 transition-all duration-150"
                      >
                        <Plus size={11} />
                      </button>
                    </div>

                    <div className="w-24 text-right">
                      <span className={`text-[12px] tabular-nums font-light ${product.price ? 'text-slate-400' : 'text-slate-700'}`}>
                        {product.price ? `$${product.price.toLocaleString()}` : '—'}
                      </span>
                    </div>

                    <div className="w-24 text-right">
                      <span className={`text-[13px] tabular-nums font-semibold ${subtotal ? 'text-emerald-400' : 'text-slate-700'}`}>
                        {subtotal ? `$${subtotal.toLocaleString()}` : '—'}
                      </span>
                    </div>

                    <div className="w-10 flex justify-center">
                      <button
                        onClick={() => removeItemFromProject(projectId, product.id)}
                        className="text-slate-700 hover:text-red-400 transition-colors duration-150 opacity-0 group-hover:opacity-100 p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* Footer */}
              <div className="flex items-center gap-4 px-5 py-4 bg-slate-900/30 border-t border-slate-800/30">
                <div className="w-12" />
                <div className="w-12" />
                <div className="flex-1 text-[11px] text-slate-500 font-light">
                  {items.length} unique · {totalQty} total
                </div>
                <div className="w-28" />
                <div className="w-24 text-right text-[10px] text-slate-600 uppercase tracking-widest font-semibold">Total</div>
                <div className="w-24 text-right">
                  <span className="text-[15px] font-bold tabular-nums text-emerald-400 tracking-tight">
                    ${stats.totalPrice.toLocaleString()}
                  </span>
                </div>
                <div className="w-10" />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="h-16" />
    </div>
  )
}
