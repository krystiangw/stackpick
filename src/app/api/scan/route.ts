import { NextResponse } from 'next/server'
import { publicBaseUrl, toAgentInstructions, toSarif } from '@/lib/export'
import { runScan } from '@/lib/scan-run'

export const maxDuration = 60

const FORMATS = ['json', 'sarif', 'agent'] as const
type Format = (typeof FORMATS)[number]

export async function POST(request: Request) {
  let domain: unknown
  let requested: unknown
  try {
    const body = await request.json()
    domain = body.domain
    requested = body.format
  } catch {
    return NextResponse.json({ error: 'Send a JSON body with a domain field.' }, { status: 400 })
  }
  if (typeof domain !== 'string' || domain.length === 0) {
    return NextResponse.json({ error: 'Send a JSON body with a domain field.' }, { status: 400 })
  }

  // Also readable from the query string, because a CI step is easier to write as a URL.
  const fromQuery = new URL(request.url).searchParams.get('format')
  const asked = (requested ?? fromQuery ?? 'json') as string
  if (!FORMATS.includes(asked as Format)) {
    return NextResponse.json({ error: `format must be one of ${FORMATS.join(', ')}.` }, { status: 400 })
  }
  const format = asked as Format

  const scan = await runScan(request, domain)

  if (scan.kind === 'error') {
    const limited = scan.status === 429
    return NextResponse.json(
      limited
        ? {
            error: scan.error,
            limited: true,
            retryAfterSeconds: scan.retryAfterSeconds,
            example: scan.example,
            domain: scan.domain,
          }
        : { error: scan.error },
      { status: scan.status, ...(limited ? { headers: { 'retry-after': String(scan.retryAfterSeconds) } } : {}) },
    )
  }

  const base = publicBaseUrl(request)

  if (format === 'sarif') {
    return NextResponse.json(toSarif(scan.report, base), {
      headers: { 'content-type': 'application/sarif+json' },
    })
  }

  if (format === 'agent') {
    return new NextResponse(toAgentInstructions(scan.report, base), {
      headers: { 'content-type': 'text/markdown; charset=utf-8' },
    })
  }

  return NextResponse.json({
    id: scan.report.id,
    domain: scan.report.domain,
    scorecard: scan.report.scorecard,
    ...(scan.reused ? { reused: true } : {}),
  })
}
