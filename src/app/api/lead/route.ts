import { NextResponse } from 'next/server'
import { scorecardEmail, sendEmail } from '@/lib/email'
import { checkRateLimit, clientKey, recordUse } from '@/lib/rate-limit'
import { getStore } from '@/lib/store'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const caller = `lead:${clientKey(request)}`
  if (!checkRateLimit(caller).allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    email?: string
    reportId?: string
    domain?: string
    source?: string
  }
  if (!body.email || !EMAIL_PATTERN.test(body.email)) {
    return NextResponse.json({ error: 'That email address does not look right.' }, { status: 400 })
  }

  const store = getStore()

  // A visitor who hit the rate limit has no report yet. Losing the lead over that would be
  // the expensive way to enforce a bandwidth cap.
  if (!body.reportId) {
    if (!body.domain) return NextResponse.json({ error: 'Missing report id.' }, { status: 400 })
    recordUse(caller)
    await store.saveLead({
      email: body.email,
      domain: body.domain,
      reportId: '',
      createdAt: new Date().toISOString(),
      source: body.source ?? 'unknown',
    })
    return NextResponse.json({ ok: true, delivered: false, queued: true })
  }

  const report = await store.getReport(body.reportId)
  if (!report) {
    return NextResponse.json({ error: 'That report no longer exists. Run the scan again.' }, { status: 404 })
  }

  recordUse(caller)
  await store.saveLead({
    email: body.email,
    domain: report.domain,
    reportId: report.id,
    createdAt: new Date().toISOString(),
    source: body.source ?? 'unknown',
  })

  const { subject, text, html } = scorecardEmail(report)
  const result = await sendEmail(body.email, subject, text, html)
  // A silent delivered:false hides provider errors behind a success response.
  if (!result.delivered) console.error(`lead email not delivered to ${body.email}: ${result.detail}`)

  // A configuration gap is ours, not the visitor's: the lead is captured either way.
  return NextResponse.json({ ok: true, delivered: result.delivered })
}
