import { NextResponse } from 'next/server'
import { scanDomain, UnreachableDomainError } from '@/lib/scan'
import { scoreFindings } from '@/lib/score'
import { checkRateLimit, clientKey, recordUse } from '@/lib/rate-limit'
import { getStore, reportId, type Report } from '@/lib/store'

export const maxDuration = 60

export async function POST(request: Request) {
  const caller = clientKey(request)
  const limit = checkRateLimit(caller)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Rate limit reached. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.` },
      { status: 429, headers: { 'retry-after': String(limit.retryAfterSeconds) } },
    )
  }

  let domain: unknown
  try {
    domain = (await request.json()).domain
  } catch {
    return NextResponse.json({ error: 'Send a JSON body with a domain field.' }, { status: 400 })
  }
  if (typeof domain !== 'string' || domain.length === 0) {
    return NextResponse.json({ error: 'Send a JSON body with a domain field.' }, { status: 400 })
  }

  try {
    const findings = await scanDomain(domain)
    recordUse(caller)
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
