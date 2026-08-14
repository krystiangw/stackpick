import { NextResponse } from 'next/server'
import { SITE_URL } from '@/lib/site'

/**
 * RFC 9727, as a linkset of RFC 9264. We probe this path on every domain we score and had never
 * published one ourselves, which is the same gap we charge other vendors a point for.
 *
 * The anchor is the API itself rather than the site: a catalogue that points at the home page
 * tells an agent nothing it did not already have.
 */
export const dynamic = 'force-static'

export function GET() {
  return new NextResponse(
    JSON.stringify({
      linkset: [
        {
          anchor: `${SITE_URL}/api`,
          'service-desc': [{ href: `${SITE_URL}/openapi.json`, type: 'application/openapi+json' }],
          'service-doc': [{ href: `${SITE_URL}/docs`, type: 'text/html' }],
          'service-meta': [{ href: `${SITE_URL}/.well-known/agent-access.json`, type: 'application/json' }],
          author: [{ href: `${SITE_URL}/methodology` }],
        },
        {
          anchor: `${SITE_URL}/mcp`,
          'service-desc': [{ href: `${SITE_URL}/.well-known/mcp.json`, type: 'application/json' }],
          'service-doc': [{ href: `${SITE_URL}/docs`, type: 'text/html' }],
        },
      ],
    }),
    { headers: { 'content-type': 'application/linkset+json', 'cache-control': 'public, max-age=3600' } },
  )
}
