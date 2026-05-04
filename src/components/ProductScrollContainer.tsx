'use client'

import { useEffect, useRef } from 'react'

export default function ProductScrollContainer({
  children,
  productId,
}: {
  children: React.ReactNode
  productId: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const key = `scroll_pos_${productId}`

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Restore saved scroll position (e.g. returning from a lens page)
    const saved = sessionStorage.getItem(key)
    if (saved) {
      const pos = parseInt(saved, 10)
      requestAnimationFrame(() => { el.scrollTop = pos })
    }

    // Persist scroll position continuously so back-navigation restores cleanly
    let timer: ReturnType<typeof setTimeout>
    const onScroll = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        sessionStorage.setItem(key, String(el.scrollTop))
      }, 150)
    }
    el.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      el.removeEventListener('scroll', onScroll)
      clearTimeout(timer)
    }
  }, [key])

  return (
    <div ref={ref} className="h-full overflow-y-auto bg-slate-950 text-slate-100 pb-10">
      {children}
    </div>
  )
}
