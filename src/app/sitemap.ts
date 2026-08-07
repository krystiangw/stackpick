import type { MetadataRoute } from 'next'

const BASE = process.env.STACKPICK_BASE_URL ?? 'http://localhost:3000'

export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/docs', '/methodology', '/report', '/findings', '/pricing'].map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: 'weekly',
    priority: path === '' ? 1 : 0.7,
  }))
}
