'use client'

import { useState, useEffect } from 'react'
import { Bell, X, Check, Loader2 } from 'lucide-react'

interface PriceAlertBarProps {
  productId: string
  productName: string
  currentPrice: number
}

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function PriceAlertBar({
  productId,
  productName,
  currentPrice,
}: PriceAlertBarProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [dismissed, setDismissed] = useState(false)

  // Persist dismissal per product in sessionStorage
  useEffect(() => {
    const key = `alert-dismissed-${productId}`
    if (sessionStorage.getItem(key)) setDismissed(true)
  }, [productId])

  function dismiss() {
    sessionStorage.setItem(`alert-dismissed-${productId}`, '1')
    setDismissed(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return

    setStatus('loading')
    try {
      const res = await fetch('/api/price-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          productId,
          productName,
          targetPrice: Math.round(currentPrice * 0.95), // alert at 5% drop
        }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  if (dismissed) return null

  return (
    <div
      role="complementary"
      aria-label="Price alert signup"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-sm"
    >
      {/* accent bar */}
      <div className="h-px bg-gradient-to-r from-transparent via-red-600/60 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-4">
        {/* icon + label */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Bell className="w-4 h-4 text-red-500 flex-shrink-0" aria-hidden />
          <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider hidden sm:block">
            Price Alert
          </span>
          <span className="text-[11px] text-zinc-500 hidden md:block">
            Get notified when{' '}
            <span className="text-zinc-400">{productName}</span>{' '}
            drops below{' '}
            <span className="tabular-nums text-zinc-300 font-mono">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
              }).format(Math.round(currentPrice * 0.95))}
            </span>
          </span>
        </div>

        {/* form */}
        {status === 'success' ? (
          <div className="flex items-center gap-2 flex-1">
            <Check className="w-4 h-4 text-emerald-400" />
            <span className="text-[12px] text-emerald-400">
              Alert set — we&apos;ll email you when the price drops.
            </span>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 flex-1"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              aria-label="Email for price alert"
              className="flex-1 max-w-[240px] h-7 px-2 text-[12px] bg-zinc-900 border border-zinc-700 rounded-[2px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="h-7 px-3 inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-[11px] font-semibold rounded-[2px] transition-colors leading-none"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Setting…
                </>
              ) : (
                <>
                  <Bell className="w-3 h-3" />
                  Alert me
                </>
              )}
            </button>
            {status === 'error' && (
              <span className="text-[11px] text-red-400">Failed — try again.</span>
            )}
          </form>
        )}

        {/* dismiss */}
        <button
          onClick={dismiss}
          aria-label="Dismiss price alert banner"
          className="ml-auto flex-shrink-0 w-6 h-6 inline-flex items-center justify-center text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
