import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { Database, LogIn, LogOut, User, List } from 'lucide-react'
import useStore from './store/useStore'
import SearchBar from './components/SearchBar'
import FilterSidebar from './components/FilterSidebar'
import ProductList from './components/ProductList'
import ComparisonTray from './components/ComparisonTray'
import ManifestTray from './components/ManifestTray'
import ProductPage from './components/ProductPage'
import ManifestPage from './components/ManifestPage'
import ProjectDashboard from './components/ProjectDashboard'
import ProjectSelector from './components/ProjectSelector'
import AIConcierge from './components/AIConcierge'
import AuthModal from './components/auth/AuthModal'

function MyListsButton() {
  const navigate = useNavigate()
  const { projects } = useStore()
  const totalItems = projects.reduce((s, p) => s + p.items.length, 0)

  return (
    <button
      onClick={() => navigate('/projects')}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-100 border border-slate-800 hover:border-slate-600 rounded-lg transition-colors"
    >
      <List size={13} />
      My Lists
      {totalItems > 0 && (
        <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-medium px-1.5 py-0.5 rounded-full tabular-nums">
          {totalItems}
        </span>
      )}
    </button>
  )
}

function UserButton() {
  const { user, signOut } = useStore()
  const [showMenu, setShowMenu] = useState(false)
  const [showAuth, setShowAuth] = useState(false)

  if (!user) return (
    <>
      <button
        onClick={() => setShowAuth(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-100 border border-slate-800 hover:border-slate-600 rounded-lg transition-colors"
      >
        <LogIn size={13} />
        Sign in
      </button>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )

  const avatar = user.user_metadata?.avatar_url
  const name = user.user_metadata?.full_name || user.email

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(v => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
      >
        {avatar
          ? <img src={avatar} className="w-6 h-6 rounded-full object-cover" alt={name} />
          : <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center"><User size={12} /></div>
        }
        <span className="text-xs text-slate-300 max-w-[120px] truncate">{name}</span>
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-20 w-44 bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-1 text-xs">
            <div className="px-3 py-2 border-b border-slate-800 text-slate-500 truncate">{user.email}</div>
            <button
              onClick={() => { signOut(); setShowMenu(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <LogOut size={12} />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function DashboardLayout() {
  const { products, projects, activeProjectId } = useStore()
  const activeProject = projects.find(p => p.id === activeProjectId)
  const hasActiveItems = activeProject && activeProject.items.length > 0

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top bar */}
      <header className="border-b border-slate-800/60 px-6 py-3 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5 shrink-0">
            <Database size={16} className="text-indigo-400" />
            <h1 className="text-sm font-bold tracking-tight">
              GearHub<span className="text-indigo-400">Pro</span>
            </h1>
            {products.length > 0 && (
              <span className="text-[10px] font-light text-slate-500 bg-slate-900/80 border border-slate-800/60 px-1.5 py-0.5 rounded tabular-nums">
                {products.length}
              </span>
            )}
          </div>
          <div className="flex-1 max-w-xl mx-auto">
            <SearchBar />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <MyListsButton />
            <UserButton />
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <FilterSidebar />
        <ProductList />
      </div>

      {hasActiveItems ? <ManifestTray /> : <ComparisonTray />}
    </div>
  )
}

export default function App() {
  const { loadProducts, initAuth, authModalOpen, closeAuthModal } = useStore()

  useEffect(() => {
    const unsub = initAuth()
    loadProducts()
    return unsub
  }, [])

  return (
    <>
      <Routes>
        <Route path="/" element={<DashboardLayout />} />
        <Route path="/product/:productId" element={<ProductPage />} />
        <Route path="/manifest/:projectId" element={<ManifestPage />} />
        <Route path="/projects" element={<ProjectDashboard />} />
      </Routes>
      <AIConcierge />
      {authModalOpen && (
        <AuthModal
          onClose={closeAuthModal}
          hint="Sign in to save products to your project lists."
        />
      )}
    </>
  )
}
