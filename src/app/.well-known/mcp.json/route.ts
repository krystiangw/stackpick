import { NextResponse } from 'next/server'
import { FIND_TOOL, TOOL } from '@/app/mcp/route'
import { MAX_SCORE } from '@/lib/score'
import { SITE_URL } from '@/lib/site'

/**
 * The card, generated from the tool definitions the server actually registers.
 *
 * It used to be a hand-written file in public/, and it drifted the way hand-written files do: it
 * declared one tool while the server served two, so an agent reading the card to decide what we
 * can do never learned that find_providers exists. It also said sixteen points against a maximum
 * of seventeen. Both were invisible from inside the app, because nothing read the file.
 */
export const dynamic = 'force-static'

export function GET() {
  return NextResponse.json(
    {
      name: 'letagentsin',
      description: `Agent readiness scanning and provider lookup. Scores a domain out of ${MAX_SCORE} points on whether an agent can find, register with and integrate it, and answers which providers an unattended run can finish with.`,
      version: '1.0.0',
      documentation: `${SITE_URL}/docs`,
      transport: { type: 'http', url: `${SITE_URL}/mcp` },
      tools: [TOOL, FIND_TOOL].map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    },
    { headers: { 'cache-control': 'public, max-age=3600' } },
  )
}
