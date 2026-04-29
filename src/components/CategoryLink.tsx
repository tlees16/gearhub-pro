'use client'

import { useRouter } from 'next/navigation'
import useStore from '@/store/useStore'

interface CategoryLinkProps {
  category: string
  subcategory?: string
  className?: string
  children: React.ReactNode
}

export default function CategoryLink({ category, subcategory, className, children }: CategoryLinkProps) {
  const router = useRouter()
  const setActiveCategory    = useStore(s => s.setActiveCategory)
  const setActiveSubcategory = useStore(s => s.setActiveSubcategory)

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    setActiveCategory(category)
    if (subcategory) setActiveSubcategory(subcategory)
    router.push('/')
  }

  return (
    <a href="/" onClick={handleClick} className={className}>
      {children}
    </a>
  )
}
