import { NextResponse } from 'next/server'
import { scanDomain, UnreachableDomainError } from '@/lib/scan'
import { scoreFindings } from '@/lib/score'
import { gateScan } from '@/lib/scan-gate'
import { getStore, reportId, type Report } from '@/lib/store'

export const maxDuration = 60

export async function POST(request: Request) {
  // The console sits behind a shared token, so seeding a category from it is our own work,
  // not traffic to be throttled, and it always wants a fresh scan.
  const fromConsole =
    process.env.STACKPICK_CONSOLE_TOKEN !== undefined &&
    request.headers.get('cookie')?.includes(`stackpick_console=${process.env.STACKPICK_CONSOLE_TOKEN}`) === true

  let domain: unknown
  try {
    domain = (await request.json()).domain
  } catch {
    return NextResponse.json({ error: 'Send a JSON body with a domain field.' }, { status: 400 })
  }
  if (typeof domain !== 'string' || domain.length === 0) {
    return NextResponse.json({ error: 'Send a JSON body with a domain field.' }, { status: 400 })
  }

  const gate = await gateScan(request, domain, fromConsole)
  if (gate.kind === 'invalid') return NextResponse.json({ error: gate.error }, { status: 400 })
  if (gate.kind === 'cached') {
    return NextResponse.json({ id: gate.report.id, domain: gate.report.domain, scorecard: gate.report.scorecard, reused: true })
  }
  if (gate.kind === 'limited') {
    return NextResponse.json(
      { error: gate.error, limited: true, retryAfterSeconds: gate.retryAfterSeconds, example: gate.example, domain: gate.domain },
      { status: 429, headers: { 'retry-after': String(gate.retryAfterSeconds) } },
    )
  }

  try {
    const findings = await scanDomain(gate.domain)
    const scorecard = scoreFindings(findings)
    const report: Report = {
      id: reportId(findings.domain, findings.scannedAt),
      domain: findings.domain,
      scannedAt: findings.scannedAt,
      findings,
      scorecard,
    }
    await getStore().saveReport(report)
    return NextResponse.json({ id: report.id, domain: report.domain, scorecard })
  } catch (error) {
    if (error instanceof UnreachableDomainError) {
      return NextResponse.json({ error: error.message }, { status: 422 })
    }
    if (error instanceof Error && error.message === 'Not a valid domain') {
      return NextResponse.json({ error: 'That does not look like a domain. Try example.com.' }, { status: 400 })
    }
    console.error('scan failed', error)
    return NextResponse.json({ error: 'The scan failed. Try again in a moment.' }, { status: 500 })
  }
}
