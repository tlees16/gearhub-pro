import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Plus, FolderOpen, Check, ClipboardList } from 'lucide-react'
import useStore from '../store/useStore'

export default function ProjectSelector() {
  const navigate = useNavigate()
  const { projects, activeProjectId, setActiveProject, createProject } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const activeProject = projects.find(p => p.id === activeProjectId)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleQuickCreate = () => {
    const id = createProject('Untitled List')
    setActiveProject(id)
    setOpen(false)
  }

  if (projects.length === 0) {
    return (
      <button
        onClick={() => navigate('/projects')}
        className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-indigo-400 font-light transition-colors duration-200"
      >
        <FolderOpen size={12} />
        Lists
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {activeProject && (
        <button
          onClick={() => navigate(`/manifest/${activeProject.id}`)}
          className="flex items-center gap-1.5 text-[10.5px] text-indigo-400/80 hover:text-indigo-300 font-medium transition-colors duration-200"
        >
          <ClipboardList size={12} />
          <span>View List</span>
        </button>
      )}
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[10.5px] text-slate-400 hover:text-slate-200 font-medium bg-slate-900/60 border border-slate-800/50 rounded-lg px-2.5 py-1.5 transition-all duration-200"
      >
        <FolderOpen size={11} className="text-indigo-400" />
        <span className="max-w-[120px] truncate">{activeProject?.name || 'Select list'}</span>
        <ChevronDown size={10} className={`text-slate-600 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 right-0 w-56 bg-slate-900/90 backdrop-blur-xl border border-slate-700/30 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.4)] overflow-hidden z-50">
          <div className="py-1.5">
            {projects.map(proj => (
              <button
                key={proj.id}
                onClick={() => { setActiveProject(proj.id); setOpen(false) }}
                className={`flex items-center gap-2.5 w-full px-3.5 py-2 text-[11.5px] transition-colors duration-150 ${
                  proj.id === activeProjectId
                    ? 'text-indigo-300 bg-indigo-500/8'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {proj.id === activeProjectId ? (
                  <Check size={11} className="text-indigo-400 shrink-0" />
                ) : (
                  <div className="w-[11px] shrink-0" />
                )}
                <span className="flex-1 text-left truncate font-light">{proj.name}</span>
                <span className="text-[9px] text-slate-700 tabular-nums shrink-0">
                  {proj.items.reduce((s, i) => s + i.quantity, 0)}
                </span>
              </button>
            ))}
          </div>
          <div className="border-t border-slate-800/30 py-1.5">
            <button
              onClick={handleQuickCreate}
              className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[11px] text-slate-500 hover:text-indigo-300 transition-colors duration-150"
            >
              <Plus size={11} />
              <span className="font-light">New list</span>
            </button>
            <button
              onClick={() => { navigate('/projects'); setOpen(false) }}
              className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[11px] text-slate-500 hover:text-slate-300 transition-colors duration-150"
            >
              <FolderOpen size={11} />
              <span className="font-light">Manage lists</span>
            </button>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
