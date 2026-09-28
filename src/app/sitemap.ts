import type { MetadataRoute } from 'next'
import { CATEGORIES, CURATED_DOMAINS } from '@/lib/categories'
import { CONTROLLER_IS_NAMED, SELLER_IS_COMPLETE } from '@/lib/seller'

const BASE = process.env.STACKPICK_BASE_URL ?? 'http://localhost:3000'

const PAGES = ['', '/c', '/docs', '/methodology', '/report', '/findings', '/audit', '/visibility', '/audit/froala-editors', '/audit/uploadcare-storage', '/audit/workos-auth', '/audit/paddle-payments', '/pricing', '/bot', '/standard']

/**
 * The noindex `/runs` pages are listed here on purpose and temporarily.
 *
 * v804 set their noindex and dropped them from the sitemap in one release, which was backwards: a
 * noindex is only obeyed once Google refetches the page, and the sitemap was what told it to come
 * back. Fourteen days later 25 of 26 were still indexed on crawls older than the fix, and the one
 * page Google did refetch dropped out the same day. So they go back in, with `lastmod` set to the
 * day the tag shipped, until the index has actually seen it. Measurements: STATE.md, board #63.
 *
 * GSC will file these under "Submitted URL marked noindex". That is the mechanism working: the
 * warning appears exactly when Google has finally read the tag we want it to read.
 *
 * Delete this list once URL Inspection reports every one of them as excluded by noindex. Removing
 * it earlier only restarts the wait.
 */
const RUNS_AWAITING_RECRAWL = CATEGORIES.map((category) => ({
  url: `${BASE}/c/${category.id}/runs`,
  // No changeFrequency: the date below is fixed history, so there is nothing weekly to promise.
  lastModified: new Date('2026-09-14'),
  priority: 0.1,
}))

export default function sitemap(): MetadataRoute.Sitemap {
  // The privacy notice belongs in the sitemap only while it is served: the pages behind the seller
  // and controller flags answer 404, and a sitemap listing a 404 tells an index we are broken.
  const pages = [...PAGES, ...(CONTROLLER_IS_NAMED ? ['/privacy'] : []), ...(SELLER_IS_COMPLETE ? ['/terms', '/refunds'] : [])].map((path) => ({
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
  const cells = CATEGORIES.map((category) => ({
    url: `${BASE}/c/${category.id}`,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))
  return [...pages, ...cells, ...RUNS_AWAITING_RECRAWL, ...vendors]
}
