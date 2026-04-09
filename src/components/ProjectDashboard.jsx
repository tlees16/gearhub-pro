import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, FolderOpen, Plus, Trash2, Pencil, Check, X,
  ClipboardList, Camera, ChevronRight, Package,
} from 'lucide-react'
import useStore from '../store/useStore'

function ProjectCard({ project, onDelete }) {
  const navigate = useNavigate()
  const { setActiveProject, activeProjectId, renameProject, getProjectStats, products } = useStore()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(project.name)
  const isActive = activeProjectId === project.id
  const stats = getProjectStats(project.id)
  const itemCount = project.items.reduce((s, i) => s + i.quantity, 0)

  // Get first 4 product thumbnails
  const thumbs = project.items.slice(0, 4).map(item =>
    products.find(p => p.id === item.productId)
  ).filter(Boolean)

  const handleRename = () => {
    if (name.trim() && name.trim() !== project.name) {
      renameProject(project.id, name.trim())
    } else {
      setName(project.name)
    }
    setEditing(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={`group bg-slate-900/40 border rounded-2xl p-5 transition-all duration-300 ${
        isActive
          ? 'border-indigo-500/25 ring-1 ring-inset ring-indigo-500/10'
          : 'border-slate-800/30 hover:border-slate-700/40'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setName(project.name); setEditing(false) } }}
                className="bg-slate-950/50 border border-slate-700/50 rounded-lg px-2.5 py-1 text-[13px] text-slate-200 font-semibold tracking-tight focus:outline-none focus:border-indigo-500/40 w-full"
              />
              <button onClick={handleRename} className="text-emerald-400 hover:text-emerald-300 p-1"><Check size={14} /></button>
              <button onClick={() => { setName(project.name); setEditing(false) }} className="text-slate-600 hover:text-slate-400 p-1"><X size={14} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold text-slate-100 tracking-tight truncate">{project.name}</h3>
              <button
                onClick={() => setEditing(true)}
                className="text-slate-700 hover:text-slate-400 transition-colors opacity-0 group-hover:opacity-100 p-0.5"
              >
                <Pencil size={11} />
              </button>
            </div>
          )}
          {isActive && (
            <span className="text-[9px] text-indigo-400/70 font-semibold uppercase tracking-widest mt-1 block">Active List</span>
          )}
        </div>
        <button
          onClick={() => onDelete(project.id)}
          className="text-slate-800 hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100"
          title="Delete list"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Thumbnails row */}
      <div className="flex items-center gap-1.5 mb-4">
        {thumbs.map(p => (
          <div key={p.id} className="w-9 h-9 rounded-lg bg-slate-950/60 border border-slate-800/30 overflow-hidden flex items-center justify-center">
            {p.image ? (
              <img src={p.image} alt={p.name} className="w-full h-full object-contain p-0.5" loading="lazy" />
            ) : (
              <Camera size={10} className="text-slate-800" />
            )}
          </div>
        ))}
        {project.items.length > 4 && (
          <div className="w-9 h-9 rounded-lg bg-slate-800/30 border border-slate-800/30 flex items-center justify-center text-[9px] text-slate-600 font-semibold">
            +{project.items.length - 4}
          </div>
        )}
        {project.items.length === 0 && (
          <div className="text-[11px] text-slate-700 font-light">No items yet</div>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-[10px] text-slate-500 font-light mb-4">
        <span className="tabular-nums">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
        {stats.totalPrice > 0 && (
          <span className="text-emerald-400/70 font-medium tabular-nums">${stats.totalPrice.toLocaleString()}</span>
        )}
        {stats.totalWatts > 0 && (
          <span className="tabular-nums">{stats.totalWatts.toLocaleString()}W</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {!isActive && (
          <button
            onClick={() => setActiveProject(project.id)}
            className="text-[10px] font-medium text-slate-400 hover:text-slate-200 bg-slate-800/40 hover:bg-slate-800/60 border border-slate-800/40 rounded-lg px-3 py-1.5 transition-all duration-200"
          >
            Set Active
          </button>
        )}
        <button
          onClick={() => navigate(`/manifest/${project.id}`)}
          className="flex items-center gap-1 text-[10px] font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg px-3 py-1.5 transition-all duration-300"
        >
          View List <ChevronRight size={10} />
        </button>
      </div>
    </motion.div>
  )
}

export default function ProjectDashboard() {
  const navigate = useNavigate()
  const { projects, createProject, deleteProject } = useStore()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const handleCreate = () => {
    const name = newName.trim() || 'Untitled List'
    createProject(name)
    setNewName('')
    setCreating(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Nav bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800/40 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
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
              <FolderOpen size={14} className="text-indigo-400" />
              <span className="text-[13px] font-bold tracking-tight">My Lists</span>
              <span className="text-[10px] text-slate-600 font-light tabular-nums">{projects.length}</span>
            </div>
          </div>

          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg px-4 py-2 transition-all duration-300"
          >
            <Plus size={13} />
            New List
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Create project inline */}
        <AnimatePresence>
          {creating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="bg-slate-900/40 border border-slate-800/30 rounded-2xl p-5">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block mb-2">List Name</label>
                <div className="flex items-center gap-3">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
                    placeholder="e.g. Music Video, Commercial, Doc Shoot..."
                    className="flex-1 bg-slate-950/50 border border-slate-800/40 rounded-xl px-4 py-2.5 text-[13px] text-slate-200 font-light placeholder-slate-600 focus:outline-none focus:border-indigo-500/30 focus:ring-1 focus:ring-indigo-500/15 transition-all duration-200"
                  />
                  <button
                    onClick={handleCreate}
                    className="text-[11px] font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl px-5 py-2.5 transition-all duration-300"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setCreating(false)}
                    className="text-[11px] text-slate-500 hover:text-slate-300 px-3 py-2.5 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {projects.length === 0 && !creating && (
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <div className="w-20 h-20 rounded-2xl bg-slate-900/40 border border-slate-800/20 flex items-center justify-center">
              <ClipboardList size={32} className="text-slate-800" />
            </div>
            <div className="text-center">
              <p className="text-slate-400 text-sm font-light">Your locker is empty</p>
              <p className="text-slate-600 text-[11px] font-light mt-1">Create a list to start building kits</p>
            </div>
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 text-[12px] font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl px-6 py-3 transition-all duration-300 mt-2"
            >
              <Plus size={15} />
              Create Your First List
            </button>
          </div>
        )}

        {/* Project grid */}
        <div className="grid grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={deleteProject}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="h-16" />
    </div>
  )
}
