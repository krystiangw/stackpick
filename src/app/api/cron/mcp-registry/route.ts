import { NextResponse } from 'next/server'
import { replaceMcpRegistryMirror } from '@/lib/store-mongo'

export const dynamic = 'force-dynamic'

/**
 * Takes the MCP registry listing from a runner that can reach it.
 *
 * registry.modelcontextprotocol.io does not answer our dyno at all: measured on 2026-08-17, four
 * requests from Heroku EU timed out at 10 and 20 seconds while api.github.com answered the same
 * shell in 50 ms. Before the mirror, that silence reached vendors as "No MCP surface" - phrase.com,
 * tolgee.io and medusajs.com each publish a live endpoint there and each was told they run no
 * server, which is three of the six downward verdict moves in the 9.30 noise-floor pair.
 *
 * The listing stays a lead and never evidence: every address it hands us goes through the same
 * handshake and the same control as one we guessed.
 */
function authorised(request: Request): boolean {
  const secret = process.env.STACKPICK_CRON_TOKEN
  if (!secret) return false
  return (request.headers.get('authorization') ?? '') === `Bearer ${secret}`
}

type Payload = { fetchedAt?: string; hosts?: { host: string; urls: string[] }[] }

export async function POST(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: 'Not for you.' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Payload
  const hosts = body.hosts ?? []
  // A run that scraped nothing must not be allowed to empty the mirror, because an empty mirror
  // is indistinguishable from a stale one and every vendor's MCP check goes unmeasurable.
  if (hosts.length < 100) {
    return NextResponse.json({ error: `only ${hosts.length} hosts, which is too few to replace the mirror with` }, { status: 400 })
  }
  const fetchedAt = body.fetchedAt ?? new Date().toISOString()
  const written = await replaceMcpRegistryMirror(hosts, fetchedAt)
  return NextResponse.json({ ...written, fetchedAt })
}
