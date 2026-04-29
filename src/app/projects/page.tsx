import type { Metadata } from 'next'
import ProjectDashboard from '@/components/ProjectDashboard'

export const metadata: Metadata = {
  title: 'My Projects',
  description: 'Manage your gear lists and project budgets.',
}

export default function Page() {
  return <ProjectDashboard />
}
