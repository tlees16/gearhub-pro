import type { Metadata } from 'next'
import DashboardGrid from '@/components/DashboardGrid'

export const metadata: Metadata = {
  title: 'GearHub Pro — Cinema Gear Price Intelligence',
  description:
    'Parametric search and live price comparison for professional cinema cameras, lenses, and lighting. Compare prices across B&H, Adorama, KEH, eBay, MPB and rental platforms.',
}

export default function HomePage() {
  return <DashboardGrid />
}
