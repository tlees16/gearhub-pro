'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Database, GitCompareArrows, List, LogIn, LogOut, User, Home, Sparkles,
} from 'lucide-react'
import useStore from '../store/useStore'
import ComparisonTray from './ComparisonTray'
import ManifestTray from './ManifestTray'
import ComparisonModal from './ComparisonModal'
import AIConcierge from './AIConcierge'
import AuthModal from './auth/AuthModal'

// ─── Header ───────────────────────────────────────────────────────────────────

function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const {
    products, comparisonIds, projects, user, signOut, openAuthModal,
    conciergeOpen, toggleConcierge,
  } = useStore()

  const totalItems = projects.reduce((s: number, p: { items: unknown[] }) => s + p.items.length, 0)
  const onHome = pathname === '/'

  return (
    <header className="h-12 flex-shrink-0 flex items-center justify-between px-4 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm z-40">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 shrink-0 group">
        <Database className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
        <span className="text-[13px] font-bold tracking-tight text-zinc-100">
          GearHub<span className="text-emerald-400">Pro</span>
        </span>
        {products.length > 0 && (
          <span className="hidden sm:inline text-[10px] text-zinc-600 font-mono tabular-nums bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded-[2px]">
            {products.length.toLocaleString()}
          </span>
        )}
      </Link>

      {/* Nav actions */}
      <nav className="flex items-center gap-2" aria-label="Main navigation">
        {/* AI Concierge — all sizes */}
        <button
          onClick={toggleConcierge}
          aria-label="AI Concierge"
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-xl transition-all duration-200 ${
            conciergeOpen
              ? 'bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]'
              : 'text-indigo-300/80 bg-indigo-500/10 border border-indigo-500/25 hover:bg-indigo-500/20 hover:text-indigo-200 hover:border-indigo-400/40'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">AI</span>
        </button>

        {/* Compare — desktop only, always visible */}
        <button
          onClick={() => router.push('/compare')}
          className={`relative hidden md:flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-xl transition-all duration-200 border ${
            comparisonIds.length > 0
              ? 'text-zinc-200 bg-zinc-800/80 border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-600 hover:text-white'
              : 'text-zinc-600 bg-zinc-900/40 border-zinc-800/40 cursor-default'
          }`}
        >
          <GitCompareArrows className="w-3.5 h-3.5" />
          Compare
          {comparisonIds.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-indigo-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 tabular-nums leading-none">
              {comparisonIds.length}
            </span>
          )}
        </button>

        {/* My Lists — desktop only */}
        <button
          onClick={() => router.push('/projects')}
          className="relative hidden md:flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-zinc-400 hover:text-white bg-zinc-900/40 hover:bg-zinc-800/80 border border-zinc-800/60 hover:border-zinc-700 rounded-xl transition-all duration-200"
        >
          <List className="w-3.5 h-3.5" />
          Lists
          {totalItems > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-emerald-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 tabular-nums leading-none">
              {totalItems}
            </span>
          )}
        </button>

        {/* List your gear — large desktop only */}
        {!onHome && (
          <Link
            href="/list-gear"
            className="hidden lg:flex items-center px-2.5 py-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            List your gear
          </Link>
        )}

        {/* Auth — desktop only */}
        {user ? (
          <div className="hidden md:block">
            <UserMenu user={user} onSignOut={signOut} />
          </div>
        ) : (
          <button
            onClick={openAuthModal}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign in
          </button>
        )}
      </nav>
    </header>
  )
}

function UserMenu({
  user,
  onSignOut,
}: {
  user: { email?: string; user_metadata?: { avatar_url?: string; full_name?: string } }
  onSignOut: () => void
}) {
  const avatar = user.user_metadata?.avatar_url
  const name = user.user_metadata?.full_name ?? user.email

  return (
    <div className="relative group">
      <button className="flex items-center gap-2 pl-1 pr-2 py-1 min-h-[44px] md:min-h-0 rounded-[2px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} className="w-6 h-6 rounded-sm object-cover" alt={name ?? ''} />
        ) : (
          <div className="w-6 h-6 rounded-sm bg-zinc-700 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-zinc-400" />
          </div>
        )}
        <span className="text-[11px] text-zinc-400 max-w-[90px] truncate hidden sm:block">
          {name}
        </span>
      </button>

      {/* Hover dropdown */}
      <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-zinc-900 border border-zinc-800 rounded-[2px] shadow-xl py-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
        <div className="px-3 py-2 border-b border-zinc-800 text-[10px] text-zinc-500 truncate">
          {user.email}
        </div>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 min-h-[44px] md:min-h-0 text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </div>
  )
}

// ─── Mobile bottom nav ────────────────────────────────────────────────────────

function BottomNav() {
  const pathname = usePathname()
  const { comparisonIds, projects, user, openAuthModal } = useStore()
  const totalItems = projects.reduce((s: number, p: { items: unknown[] }) => s + p.items.length, 0)

  const navItem = (
    href: string | null,
    icon: React.ReactNode,
    label: string,
    badge?: number,
    onClick?: () => void,
  ) => {
    const active = href ? pathname === href || (href !== '/' && pathname.startsWith(href)) : false
    const cls = `relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors ${
      active ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
    }`
    const content = (
      <>
        <div className="relative">
          {icon}
          {badge != null && badge > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 bg-indigo-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5 tabular-nums">
              {badge}
            </span>
          )}
        </div>
        <span className="text-[9px] font-medium tracking-wide leading-none">{label}</span>
      </>
    )
    if (onClick) return <button key={label} onClick={onClick} className={cls}>{content}</button>
    return <Link key={label} href={href!} className={cls}>{content}</Link>
  }

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden flex-shrink-0 flex items-stretch h-14 border-t border-slate-800/60 bg-slate-950/95 backdrop-blur-xl"
    >
      {navItem('/', <Home size={18} />, 'Home')}
      {navItem('/projects', <List size={18} />, 'Lists', totalItems)}
      {navItem('/compare', <GitCompareArrows size={18} />, 'Compare', comparisonIds.length)}
      {user
        ? navItem('/projects', <User size={18} />, 'Profile')
        : navItem(null, <User size={18} />, 'Sign In', undefined, openAuthModal)
      }
    </nav>
  )
}

// ─── AppShell ─────────────────────────────────────────────────────────────────

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { loadProducts, initAuth, projects, activeProjectId, comparisonModalOpen, authModalOpen, closeAuthModal } = useStore()

  useEffect(() => {
    const unsub = initAuth()
    loadProducts()
    return unsub
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const activeProject = projects.find((p) => p.id === activeProjectId)
  const hasActiveItems = activeProject && activeProject.items.length > 0

  return (
    <>
      <Header />

      <main className="flex-1 min-h-0 overflow-hidden">
        {children}
      </main>

      {hasActiveItems ? <ManifestTray /> : <ComparisonTray />}
      {comparisonModalOpen && <ComparisonModal />}

      {/* AuthModal at root — must NOT be inside any backdrop-filter ancestor */}
      {authModalOpen && (
        <AuthModal
          onClose={closeAuthModal}
          hint="Sign in to save products to your gear lists."
        />
      )}

      <AIConcierge />
      <BottomNav />
    </>
  )
}
