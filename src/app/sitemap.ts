import type { MetadataRoute } from 'next'
import { CURATED_DOMAINS } from '@/lib/categories'

const BASE = process.env.STACKPICK_BASE_URL ?? 'http://localhost:3000'

const PAGES = ['', '/docs', '/methodology', '/report', '/findings', '/audit', '/audit/froala-editors', '/audit/uploadcare-storage', '/audit/workos-auth', '/audit/paddle-payments', '/pricing']

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = PAGES.map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.7,
  }))
  // One entry per vendor we hold a measurement for. The list comes from the curated set rather
  // than the store, so building a sitemap never waits on a database.
  const vendors = [...CURATED_DOMAINS].sort().map((domain) => ({
    url: `${BASE}/v/${domain}`,
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }))
  return [...pages, ...vendors]
}
