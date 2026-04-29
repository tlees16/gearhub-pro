'use client'

import { useRouter } from 'next/navigation'
import { Database, ArrowLeft, Building2, Link2, DollarSign, TrendingUp, CheckCircle2, ChevronRight } from 'lucide-react'
import useStore from '../store/useStore'

const BENEFITS = [
  {
    icon: TrendingUp,
    title: 'Reach active filmmakers',
    body: 'GearHub is where directors, DPs, and producers research gear. Your inventory appears exactly when they\'re deciding what to rent.',
  },
  {
    icon: Link2,
    title: 'Direct product links',
    body: 'If you have a specific listing for a piece of gear, link straight to it. No middlemen — customers land on your booking page.',
  },
  {
    icon: DollarSign,
    title: 'Set your own rates',
    body: 'You control pricing, availability, and currency. Update anytime from your partner dashboard — changes go live instantly.',
  },
]

const STEPS = [
  { n: '01', title: 'Create your account', body: 'Sign in with Google, Apple, or email. Free to join.' },
  { n: '02', title: 'Set up your company', body: 'Add your company name, city, and website. Takes two minutes.' },
  { n: '03', title: 'Add your inventory', body: 'Search for products by name, set your daily rate, and optionally link to your listing page.' },
  { n: '04', title: 'Go live', body: 'Your rates appear on product pages immediately. Filmmakers can click straight through to you.' },
]

export default function RentYourGear() {
  const router = useRouter()
  const { user, openAuthModal } = useStore()

  const handleGetStarted = () => {
    if (user) {
      router.push('/partner/dashboard')
    } else {
      openAuthModal()
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-900 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2.5 text-zinc-400 hover:text-white transition-colors"
          >
            <Database size={15} className="text-indigo-400" />
            <span className="text-sm font-bold">
              GearHub<span className="text-indigo-400">Pro</span>
            </span>
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ArrowLeft size={12} />
              Back to search
            </button>
            {user ? (
              <button
                onClick={() => router.push('/partner/dashboard')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-semibold rounded-xl transition-colors"
              >
                Partner Dashboard
              </button>
            ) : (
              <button
                onClick={openAuthModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-semibold rounded-xl transition-colors"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-20">

        {/* Hero */}
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/25 rounded-full text-[11px] font-semibold text-indigo-400 uppercase tracking-wider mb-8">
            <Building2 size={11} />
            Rental Partners
          </div>
          <h1 className="text-5xl font-black tracking-tight mb-6 leading-none">
            Rent your gear
            <br />
            <span className="text-indigo-400">on GearHub</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed mb-10">
            List your rental inventory where professional filmmakers actually look.
            Free to join. You control the rates and links.
          </p>
          <button
            onClick={handleGetStarted}
            className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all duration-150 text-[15px] shadow-lg shadow-indigo-950/50 hover:shadow-indigo-900/60 hover:-translate-y-0.5"
          >
            Get started — it's free
            <ChevronRight size={16} />
          </button>
          <p className="text-[11px] text-zinc-600 mt-4">No fees. No commission. Just direct traffic.</p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-24">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-zinc-950 border border-zinc-800/60 rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                <Icon size={18} className="text-indigo-400" />
              </div>
              <h3 className="text-[14px] font-bold text-white mb-2">{title}</h3>
              <p className="text-[12px] text-zinc-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="mb-24">
          <h2 className="text-2xl font-black tracking-tight mb-10 text-center">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {STEPS.map(({ n, title, body }) => (
              <div key={n} className="flex gap-5 bg-zinc-950 border border-zinc-800/60 rounded-2xl p-6">
                <span className="text-[11px] font-black text-indigo-500/60 tracking-widest pt-0.5 shrink-0 w-6">{n}</span>
                <div>
                  <h4 className="text-[13px] font-bold text-white mb-1.5">{title}</h4>
                  <p className="text-[12px] text-zinc-500 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* What you get */}
        <div className="bg-zinc-950 border border-zinc-800/60 rounded-2xl p-8 mb-24">
          <h2 className="text-xl font-black mb-6">What you get</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              'Your rates shown directly on product pages',
              'Direct link to your booking page or website',
              'Instant updates — changes go live immediately',
              'Support for USD, GBP, AUD, CAD and more',
              'City-based display — users see local options first',
              'Verified partner badge (manual approval)',
            ].map(item => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <span className="text-[12px] text-zinc-300">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-black mb-4">Ready to get listed?</h2>
          <p className="text-[13px] text-zinc-500 mb-8">
            Takes about five minutes to set up. No contracts, no fees.
          </p>
          <button
            onClick={handleGetStarted}
            className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all duration-150 text-[15px] shadow-lg shadow-indigo-950/50 hover:-translate-y-0.5"
          >
            {user ? 'Go to Partner Dashboard' : 'Create your account'}
            <ChevronRight size={16} />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 mt-20 px-6 py-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-[11px] text-zinc-700">
          <span>GearHub Pro</span>
          <div className="flex items-center gap-6">
            <button onClick={() => router.push('/')} className="hover:text-zinc-500 transition-colors">Search gear</button>
          </div>
        </div>
      </footer>
    </div>
  )
}
