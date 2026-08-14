import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { measureQuota, quotaEmail } from '@/lib/quota'

export const dynamic = 'force-dynamic'

/**
 * The warning the 13 August outage did not have.
 *
 * `/api/health` answers whether a write succeeds, which is true right up to the moment it is
 * false, so it can only report an outage that has already started. This measures the number that
 * moves first, and it is scheduled daily rather than polled because the quota moves over days.
 *
 * It mails only when there is something to do. A daily "still fine" is the message that teaches
 * somebody to filter the sender, and then the one that matters is filtered too.
 */
function authorised(request: Request): boolean {
  const secret = process.env.STACKPICK_CRON_TOKEN
  if (!secret) return false
  return (request.headers.get('authorization') ?? '') === `Bearer ${secret}`
}

export async function POST(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: 'Not for you.' }, { status: 401 })

  const reading = await measureQuota()
  const to = process.env.STACKPICK_ALERT_EMAIL
  if (reading.verdict === 'ok') return NextResponse.json({ ...reading, mailed: false })

  if (!to) {
    return NextResponse.json({ ...reading, mailed: false, error: 'STACKPICK_ALERT_EMAIL is not set' })
  }
  const { subject, text } = quotaEmail(reading)
  const sent = await sendEmail(to, subject, text)
  return NextResponse.json({ ...reading, mailed: sent.delivered, detail: sent.detail })
}
