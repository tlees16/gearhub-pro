import type { Metadata } from 'next'
import ManifestPage from '@/components/ManifestPage'

export const metadata: Metadata = {
  title: 'Gear List',
}

export default function Page() {
  // ManifestPage reads projectId via useParams() from next/navigation
  return <ManifestPage />
}
