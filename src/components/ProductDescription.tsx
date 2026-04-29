'use client'

import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'

const CACHE_KEY_PREFIX = 'gh_desc_v1_'
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

interface Props {
  productId: string
  productName: string
  brand: string
  category: string
  specsSnippet: string // top 5 specs pre-formatted, passed from server
}

export default function ProductDescription({ productId, productName, brand, category, specsSnippet }: Props) {
  const [text, setText] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cacheKey = CACHE_KEY_PREFIX + productId

    // Try cache first
    try {
      const raw = localStorage.getItem(cacheKey)
      if (raw) {
        const { desc, ts } = JSON.parse(raw)
        if (Date.now() - ts < CACHE_TTL_MS && desc) {
          setText(desc)
          setLoading(false)
          return
        }
      }
    } catch {}

    // Fetch from Anthropic via proxy
    const prompt = `Write 2 concise sentences describing the ${brand} ${productName} for professional ${category}. Focus on what it's best for and who should buy it. Key specs: ${specsSnippet}. Be direct and factual.`

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        system: 'You write short, accurate product descriptions for a professional cinema gear database. No marketing fluff. Two sentences maximum.',
        max_tokens: 120,
      }),
    })
      .then(r => r.json())
      .then(data => {
        const desc: string = data?.content?.[0]?.text?.trim() ?? ''
        if (desc) {
          setText(desc)
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ desc, ts: Date.now() }))
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [productId, productName, brand, category, specsSnippet])

  if (loading) {
    return (
      <div className="mt-3 pt-3 border-t border-zinc-800/60">
        <div className="h-3 bg-zinc-800 rounded animate-pulse w-full mb-1.5" />
        <div className="h-3 bg-zinc-800 rounded animate-pulse w-4/5" />
      </div>
    )
  }

  if (!text) return null

  return (
    <div className="mt-3 pt-3 border-t border-zinc-800/60">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Sparkles className="w-3 h-3 text-indigo-400" />
        <span className="text-[9px] font-semibold tracking-widest text-indigo-400/70 uppercase">AI Summary</span>
      </div>
      <p className="text-[12px] text-zinc-400 font-light leading-relaxed">{text}</p>
    </div>
  )
}
