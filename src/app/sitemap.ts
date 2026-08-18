import type { MetadataRoute } from 'next'
import { CATEGORIES, CURATED_DOMAINS } from '@/lib/categories'

const BASE = process.env.STACKPICK_BASE_URL ?? 'http://localhost:3000'

const PAGES = ['', '/c', '/docs', '/methodology', '/report', '/findings', '/audit', '/audit/froala-editors', '/audit/uploadcare-storage', '/audit/workos-auth', '/audit/paddle-payments', '/pricing', '/bot']

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
  // One per category, ranked above a single vendor page: it answers the question somebody types
  // ("who do agents recommend for X") rather than the one they type only when they know us.
  const cells = CATEGORIES.flatMap((category) => [
    { url: `${BASE}/c/${category.id}`, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE}/c/${category.id}/runs`, changeFrequency: 'monthly' as const, priority: 0.4 },
  ])
  return [...pages, ...cells, ...vendors]
}
