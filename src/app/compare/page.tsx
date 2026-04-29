import type { Metadata } from 'next'
import ComparePage from '@/components/ComparePage'

export const metadata: Metadata = {
  title: 'Compare Gear',
  description: 'Side-by-side specification and price comparison for professional cinema equipment.',
}

export default function Page() {
  return <ComparePage />
}
