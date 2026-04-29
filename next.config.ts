import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // TypeScript already catches type errors during builds.
  // Fix ESLint TypeScript parser config before re-enabling.
  eslint: { ignoreDuringBuilds: true },
  images: {
    unoptimized: true,
  },
  // The Anthropic API key must NEVER reach the browser bundle.
  // All usages are in src/app/api/chat/route.ts (server only).
  serverExternalPackages: ['pg', 'cheerio'],
}

export default nextConfig
