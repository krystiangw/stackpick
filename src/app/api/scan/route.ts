import { NextResponse } from 'next/server'
import { runScan } from '@/lib/scan-run'

export const maxDuration = 60

export async function POST(request: Request) {
  let domain: unknown
  try {
    domain = (await request.json()).domain
  } catch {
    return NextResponse.json({ error: 'Send a JSON body with a domain field.' }, { status: 400 })
  }
  if (typeof domain !== 'string' || domain.length === 0) {
    return NextResponse.json({ error: 'Send a JSON body with a domain field.' }, { status: 400 })
  }

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

  return NextResponse.json({
    id: scan.report.id,
    domain: scan.report.domain,
    scorecard: scan.report.scorecard,
    ...(scan.reused ? { reused: true } : {}),
  })
}
