import type { Metadata } from 'next'
import PartnerDashboard from '@/components/PartnerDashboard'

export const metadata: Metadata = {
  title: 'Partner Dashboard',
}

export default function Page() {
  return <PartnerDashboard />
}
