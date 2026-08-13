import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { checkRateLimit, clientKey, recordUse } from '@/lib/rate-limit'
import { normalizeDomain } from '@/lib/scan/discover'
import { getStore } from '@/lib/store'
import { newWatch } from '@/lib/watch'
import { confirmEmail } from '@/lib/watch-email'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Asking to be watched. Nothing here creates an account, sets a password or takes a card: the
 * address is the identity, the confirmation link is the proof, and the stop link is the exit.
 * That is deliberate. We charge vendors points for putting a wall in front of an unattended
 * signup, so ours has to be a shape an unattended client can complete.
 */
export async function POST(request: Request) {
  const caller = `watch:${clientKey(request)}`
  if (!checkRateLimit(caller).allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
  }

  const body = (await request.json().catch(() => ({}))) as { email?: string; domain?: string }
  if (!body.email || !EMAIL_PATTERN.test(body.email)) {
    return NextResponse.json({ error: 'That email address does not look right.' }, { status: 400 })
  }
  let domain: string
  try {
    domain = normalizeDomain(String(body.domain ?? ''))
  } catch {
    return NextResponse.json({ error: 'That does not look like a domain.' }, { status: 400 })
  }
  // Per address too, so one caller cannot mail confirmations at a hundred strangers.
  const perAddress = `watch-to:${body.email.toLowerCase()}`
  if (!checkRateLimit(perAddress, 3).allowed) {
    return NextResponse.json({ error: 'That address has had enough for now.' }, { status: 429 })
  }
  recordUse(caller)
  recordUse(perAddress)

  const store = getStore()
  const held = (await store.listWatchesForEmail(body.email)).find((watch) => watch.domain === domain)
  // Asking twice is not an error and must not mint a second row: the unique index would reject
  // it, and the person asking simply wants the link again.
  const watch = held ?? newWatch(body.email, domain, new Date().toISOString())
  if (held?.confirmedAt && !held.stoppedAt) {
    return NextResponse.json({ ok: true, alreadyWatching: true })
  }
  if (held) {
    watch.stoppedAt = null
    watch.confirmedAt = null
  }
  // Saved before the mail is sent, and the mail is not sent if it was not: a confirmation link
  // for a row that does not exist is worse than no email, because it fails at the moment someone
  // decided to trust us. The message says what happened rather than "try again in a moment",
  // which was a promise we could not keep while the cluster refused writes for hours.
  try {
    await store.saveWatch(watch)
  } catch (error) {
    console.error('watch could not be saved', error)
    return NextResponse.json(
      {
        error:
          'We could not record it, which is our problem and not yours. Nothing was signed up and no email was sent. Write to hello@letagentsin.com and we will set it up by hand.',
      },
      { status: 503 },
    )
  }

  const { subject, text } = confirmEmail(watch)
  const sent = await sendEmail(watch.email, subject, text)
  return NextResponse.json({ ok: true, delivered: sent.delivered, detail: sent.detail })
}
