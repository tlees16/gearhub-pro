'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  X, Send, Sparkles, Camera, Aperture, Zap,
  ExternalLink, Bot, User, Loader, AlertCircle,
} from 'lucide-react'
import useStore from '../store/useStore'
import { buildSystemPrompt, sendChatMessage, parseProductMentions } from '../services/aiConcierge'

const CATEGORY_ICON = { cameras: Camera, lenses: Aperture, lighting: Zap }

const SUGGESTED_PROMPTS = [
  'Build a lighting kit under $5,000',
  'What lenses fit the Sony FX3?',
  'Best LED for night exteriors?',
  'Compare the ARRI ALEXA 35 vs Sony VENICE 2',
]

// ── Mini product card rendered inside chat bubbles ──

function MiniProductCard({ product }) {
  const router = useRouter()
  const CatIcon = CATEGORY_ICON[product.category]

  return (
    <button
      onClick={() => router.push(`/product/${product.id}`)}
      className="flex items-center gap-3 w-full bg-slate-950/60 border border-slate-800/30 rounded-xl px-3 py-2.5 hover:border-indigo-500/25 hover:bg-slate-950/80 transition-all duration-200 text-left group mt-1.5 mb-1"
    >
      {/* Thumbnail */}
      <div className="w-10 h-10 min-w-[40px] rounded-lg bg-slate-900/60 overflow-hidden flex items-center justify-center ring-1 ring-slate-800/30">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-contain p-1" loading="lazy" />
        ) : (
          <div className="text-slate-700 text-[8px]">N/A</div>
        )}
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {CatIcon && <CatIcon size={10} className="text-slate-600" />}
          <span className="text-[11px] font-semibold text-slate-200 truncate group-hover:text-indigo-300 transition-colors">
            {product.name}
          </span>
        </div>
        <span className="text-[10px] text-slate-600 font-light">{product.brand}</span>
      </div>
      {/* Price */}
      <div className="shrink-0 flex items-center gap-1.5">
        <span className={`text-[11px] font-bold tabular-nums ${product.price ? 'text-emerald-400' : 'text-amber-500/50'}`}>
          {product.price ? `$${product.price.toLocaleString()}` : '—'}
        </span>
        <ExternalLink size={9} className="text-slate-700 group-hover:text-indigo-400 transition-colors" />
      </div>
    </button>
  )
}

// ── Render message text with inline product cards ──

function MessageContent({ text, products }) {
  const mentions = useMemo(() => parseProductMentions(text, products), [text, products])

  if (mentions.length === 0) {
    return <FormattedText text={text} />
  }

  // Split text around product mentions and interleave with cards
  const parts = []
  let lastIndex = 0

  for (const mention of mentions) {
    if (mention.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, mention.index) })
    }
    parts.push({ type: 'product', product: mention.product, name: mention.name })
    lastIndex = mention.index + mention.marker.length
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) })
  }

  return (
    <div>
      {parts.map((part, i) =>
        part.type === 'text' ? (
          <FormattedText key={i} text={part.content} />
        ) : (
          <MiniProductCard key={i} product={part.product} />
        )
      )}
    </div>
  )
}

// ── Simple markdown-like formatting ──

function FormattedText({ text }) {
  // Split into paragraphs, handle **bold** and basic formatting
  const paragraphs = text.split('\n\n').filter(Boolean)

  return (
    <>
      {paragraphs.map((para, i) => {
        const lines = para.split('\n')
        return (
          <div key={i} className={i > 0 ? 'mt-2.5' : ''}>
            {lines.map((line, j) => (
              <p key={j} className={`text-[12.5px] leading-relaxed ${j > 0 ? 'mt-1' : ''}`}>
                {line.split(/(\*\*[^*]+\*\*)/).map((seg, k) =>
                  seg.startsWith('**') && seg.endsWith('**') ? (
                    <strong key={k} className="font-semibold text-slate-200">{seg.slice(2, -2)}</strong>
                  ) : (
                    <span key={k}>{seg}</span>
                  )
                )}
              </p>
            ))}
          </div>
        )
      })}
    </>
  )
}

// ── Main Concierge Component ──

export default function AIConcierge() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const { products, conciergeOpen, closeConcierge } = useStore()
  const open = conciergeOpen

  const systemPrompt = useMemo(
    () => products.length > 0 ? buildSystemPrompt(products) : null,
    [products]
  )

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  // Focus input when chat opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const handleSend = useCallback(async (text) => {
    const content = (text || input).trim()
    if (!content || loading || !systemPrompt) return

    setInput('')
    setError(null)

    const userMsg = { role: 'user', content }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    try {
      // Build API messages (only role + content)
      const apiMessages = newMessages.map(m => ({
        role: m.role,
        content: m.content,
      }))

      const response = await sendChatMessage(apiMessages, systemPrompt)
      setMessages(prev => [...prev, { role: 'assistant', content: response }])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, systemPrompt])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* ── Chat Window ── */}
      {open && (
        <div className="fixed bottom-[60px] md:bottom-4 right-3 left-3 sm:left-auto sm:right-6 sm:w-[420px] z-50 h-[70vh] sm:h-[600px] flex flex-col bg-slate-900/70 backdrop-blur-xl border border-slate-700/30 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.5)] overflow-hidden">

          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-800/40 bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                <Sparkles size={15} className="text-indigo-400" />
              </div>
              <div>
                <h3 className="text-[13px] font-bold text-slate-100 tracking-tight">AI Concierge</h3>
                <p className="text-[10px] text-slate-500 font-light">Expert cinematography advisor</p>
              </div>
              <div className="ml-auto flex items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] text-emerald-400/70 font-light">Online</span>
                </div>
                <button
                  onClick={closeConcierge}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

            {/* Welcome message if empty */}
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={13} className="text-indigo-400" />
                  </div>
                  <div className="bg-slate-800/30 border border-slate-800/20 rounded-2xl rounded-tl-md px-4 py-3 max-w-[320px]">
                    <p className="text-[12.5px] text-slate-300 font-light leading-relaxed">
                      Hey! I'm your GearHub AI Concierge. I have access to all <strong className="font-semibold text-slate-200">{products.length} products</strong> in the database. Ask me anything:
                    </p>
                    <ul className="mt-2 text-[11.5px] text-slate-400 font-light space-y-1">
                      <li>Kit recommendations within budget</li>
                      <li>Lens/mount compatibility checks</li>
                      <li>Head-to-head comparisons</li>
                      <li>Best picks for your scenario</li>
                    </ul>
                  </div>
                </div>

                {/* Suggested prompts */}
                <div className="flex flex-wrap gap-1.5 pl-10">
                  {SUGGESTED_PROMPTS.map(prompt => (
                    <button
                      key={prompt}
                      onClick={() => handleSend(prompt)}
                      className="text-[10.5px] text-indigo-300/80 bg-indigo-500/8 border border-indigo-500/15 rounded-lg px-2.5 py-1.5 hover:bg-indigo-500/15 hover:text-indigo-300 transition-all duration-200 font-light"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  msg.role === 'user'
                    ? 'bg-slate-800/60'
                    : 'bg-indigo-500/10'
                }`}>
                  {msg.role === 'user'
                    ? <User size={13} className="text-slate-400" />
                    : <Bot size={13} className="text-indigo-400" />
                  }
                </div>

                {/* Bubble */}
                <div className={`max-w-[320px] px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-indigo-500/12 border border-indigo-500/15 rounded-2xl rounded-tr-md text-slate-200'
                    : 'bg-slate-800/30 border border-slate-800/20 rounded-2xl rounded-tl-md text-slate-300'
                }`}>
                  {msg.role === 'assistant' ? (
                    <MessageContent text={msg.content} products={products} />
                  ) : (
                    <p className="text-[12.5px] font-light leading-relaxed">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                  <Bot size={13} className="text-indigo-400" />
                </div>
                <div className="bg-slate-800/30 border border-slate-800/20 rounded-2xl rounded-tl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader size={12} className="text-indigo-400 animate-spin" />
                    <span className="text-[11px] text-slate-500 font-light">Analyzing database...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                  <AlertCircle size={13} className="text-red-400" />
                </div>
                <div className="bg-red-500/5 border border-red-500/15 rounded-2xl rounded-tl-md px-4 py-3 max-w-[320px]">
                  <p className="text-[11.5px] text-red-400/80 font-light">{error}</p>
                  {error.includes('ANTHROPIC_API_KEY') && (
                    <p className="text-[10px] text-slate-600 font-light mt-1.5">
                      Add your key to <code className="text-slate-500">.env</code> and restart the dev server.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Input bar */}
          <div className="px-4 py-3 border-t border-slate-800/40 bg-slate-900/40">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about gear..."
                rows={1}
                className="flex-1 bg-slate-950/50 border border-slate-800/40 rounded-xl px-3.5 py-2.5 text-[12.5px] text-slate-200 font-light placeholder-slate-600 focus:outline-none focus:border-indigo-500/30 focus:ring-1 focus:ring-indigo-500/15 transition-all duration-200 resize-none max-h-24"
                style={{ minHeight: '40px' }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-400 hover:bg-indigo-500/25 transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed shrink-0"
              >
                <Send size={14} />
              </button>
            </div>
            <p className="text-[9px] text-slate-700 font-light mt-1.5 text-center">
              Powered by Claude &middot; Queries your {products.length}-product database
            </p>
          </div>
        </div>
      )}
    </>
  )
}
