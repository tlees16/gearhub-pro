import type { Metadata } from 'next'
import { Space_Grotesk } from 'next/font/google'
import './globals.css'
import AppShell from '@/components/AppShell'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: {
    default: 'GearHub Pro — Cinema Gear Price Intelligence',
    template: '%s | GearHub Pro',
  },
  description:
    'Compare new, used and rental prices for professional cinema cameras, lenses, and lighting across B&H, Adorama, KEH, MPB, eBay and 20+ retailers. Built for DPs and production companies.',
  keywords: ['cinema camera', 'lens price comparison', 'gear rental', 'ARRI', 'RED', 'Blackmagic', 'B&H'],
  metadataBase: new URL('https://gearhubpro.com'),
  openGraph: {
    siteName: 'GearHub Pro',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark ${spaceGrotesk.variable}`}>
      <body className="bg-zinc-950 text-zinc-100 h-dvh flex flex-col overflow-x-hidden overflow-y-hidden">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
