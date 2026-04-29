'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Plus, ChevronRight } from 'lucide-react'
import useStore from '../store/useStore'

export default function ListPicker({ productId, onClose, align = 'right' }) {
  const navigate  = useRouter()
  const { projects, addItemToProject, removeItemFromProject, createProject, user, openAuthModal } = useStore()
  const [newListName, setNewListName] = useState('')
  const [showNew, setShowNew]         = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const isInProject = (proj) => proj.items.some(i => i.productId === productId)

  const toggle = (proj) => {
    if (!user) { onClose(); openAuthModal(); return }
    isInProject(proj)
      ? removeItemFromProject(proj.id, productId)
      : addItemToProject(proj.id, productId)
  }

  const handleCreate = () => {
    if (!user) { onClose(); openAuthModal(); return }
    const name = newListName.trim() || 'New List'
    const id = createProject(name)
    addItemToProject(id, productId)
    setNewListName('')
    setShowNew(false)
  }

  const needsAuth = (action) => {
    if (!user) { onClose(); openAuthModal(); return true }
    action()
    return false
  }

  return (
    <div
      ref={ref}
      className={`absolute z-50 top-full mt-1.5 ${align === 'right' ? 'right-0' : 'left-0'} w-56 bg-slate-900 border border-slate-700/40 rounded-xl shadow-2xl overflow-hidden`}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-800/40">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Add to list</span>
      </div>

      {/* Existing lists */}
      {projects.length === 0 ? (
        <div className="px-3 py-3 text-[11px] text-slate-600 font-light italic">No lists yet — create one below</div>
      ) : (
        <div className="max-h-52 overflow-y-auto">
          {projects.map(proj => {
            const inList = isInProject(proj)
            return (
              <button
                key={proj.id}
                onClick={() => toggle(proj)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-800/50 transition-colors group"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                  inList ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600 group-hover:border-slate-400'
                }`}>
                  {inList && <Check size={10} className="text-white" />}
                </div>
                <span className="text-[12px] text-slate-300 font-light truncate flex-1">{proj.name}</span>
                <span className="text-[10px] text-slate-600 tabular-nums shrink-0">{proj.items.length}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* New list row */}
      <div className="border-t border-slate-800/40">
        {showNew ? (
          <div className="flex items-center gap-1.5 px-3 py-2">
            <input
              autoFocus
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') setShowNew(false)
              }}
              placeholder="List name..."
              className="flex-1 bg-slate-800/60 border border-slate-700/40 rounded-lg px-2 py-1 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/40"
            />
            <button
              onClick={handleCreate}
              className="text-indigo-400 hover:text-indigo-300 transition-colors p-0.5"
            >
              <Check size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => needsAuth(() => setShowNew(true))}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-indigo-400/80 hover:text-indigo-300 hover:bg-slate-800/40 transition-colors"
          >
            <Plus size={12} />
            New list
          </button>
        )}
      </div>

      {/* My Lists link */}
      <div className="border-t border-slate-800/40">
        <button
          onClick={() => { router.push('/projects'); onClose() }}
          className="w-full flex items-center justify-between px-3 py-2 text-[11px] text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 transition-colors"
        >
          <span>View all my lists</span>
          <ChevronRight size={11} />
        </button>
      </div>
    </div>
  )
}
