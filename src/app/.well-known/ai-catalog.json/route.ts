import { NextResponse } from 'next/server'
import { CURATED_DOMAINS } from '@/lib/categories'
import { CHECKS, FORMULA_VERSION } from '@/lib/score'
import { SITE_URL } from '@/lib/site'

/**
 * The agentic catalog, generated rather than written by hand.
 *
 * It was a static file and it drifted where static files do: it published `version: 9.40` against a
 * live formula of 9.49, nine releases behind, in the one descriptor we publish because we tell
 * vendors to publish theirs. The counts beside it happened to still be right, which is worse than
 * useless as reassurance - nobody had checked them either.
 *
 * `updatedAt` is deliberately gone rather than generated. It meant "when this entry last changed",
 * we never maintained it, and a date stamped on every deploy would answer a different question than
 * the field asks. A descriptor is a claim, and the honest move on a claim we cannot keep is to stop
 * making it.
 */
export const dynamic = 'force-static'

export function GET() {
  return NextResponse.json(
    {
      specVersion: '1.0',
      host: {
        displayName: 'Let Agents In',
        identifier: 'letagentsin.com',
        documentationUrl: `${SITE_URL}/methodology`,
      },
      entries: [
        {
          identifier: 'urn:air:letagentsin.com:api:scan',
          displayName: 'Agent readiness scan',
          description: `Scores any public domain on whether an AI agent can find it, get in and get a credential, from ${CHECKS.length} checks with published rules.`,
          type: 'application/openapi+json',
          url: `${SITE_URL}/openapi.json`,
          tags: ['agent-readiness', 'developer-tools', 'api-audit'],
          capabilities: ['analyze', 'search'],
          representativeQueries: [
            'can an AI agent sign up for this product without a human',
            'why did a coding agent pick a competitor over this vendor',
            'which of my API docs stop an agent from getting a key',
            'is my llms.txt or MCP endpoint doing anything measurable',
          ],
          version: FORMULA_VERSION,
        },
        {
          identifier: 'urn:air:letagentsin.com:tools:mcp',
          displayName: 'Let Agents In MCP server',
          description: 'Runs the same scan over MCP, so an agent can check a vendor before integrating with it.',
          type: 'application/mcp-server-card+json',
          url: `${SITE_URL}/.well-known/mcp.json`,
          tags: ['agent-readiness', 'mcp', 'developer-tools'],
          capabilities: ['analyze'],
          representativeQueries: ['score a domain for agent readiness from my coding agent'],
        },
        {
          identifier: 'urn:air:letagentsin.com:data:corpus',
          displayName: `Published corpus of ${CURATED_DOMAINS.size} measured vendors`,
          description: 'Every scored row, in full, with the sentence behind each verdict and the addresses it was measured on.',
          type: 'application/json',
          url: `${SITE_URL}/corpus.json`,
          tags: ['dataset', 'agent-readiness', 'benchmark'],
          capabilities: ['search'],
          representativeQueries: [
            'which developer tools are measurably usable by agents',
            'compare vendors in one category on agent readiness',
          ],
        },
      ],
    },
    { headers: { 'cache-control': 'public, max-age=3600' } },
  )
}
