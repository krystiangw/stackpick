'use client'

import { useEffect, useState } from 'react'
import { TrackedLink } from './tracked-link'
import { WatchForm } from './watch-form'
import { captureAnalytics } from '@/lib/analytics'

export function EmailGate({
  domain,
  reportId,
  failingCount,
  hasUnmeasuredChecks,
  temporary = false,
  privacyLinked,
}: {
  domain: string
  reportId: string
  /**
   * The store refused this scan and it is being held in memory, so the address dies at the next
   * deploy. The banner at the top of the page says so and this component went on promising a
   * permanent link in the same column, which is the one contradiction a reader cannot miss.
   */
  temporary?: boolean
  failingCount: number
  hasUnmeasuredChecks: boolean
  /** Whether /privacy is served. Threaded from the server page for the same reason as in WatchForm. */
  privacyLinked: boolean
}) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'undelivered'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => captureAnalytics('report_viewed'), [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (state === 'sending') return
    setState('sending')
    setError(null)

    const response = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, reportId, source: 'report-page' }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      setError(
        payload.error ??
        (response.status === 400
          ? 'Check your email address and try again; the request was invalid.'
          : response.status === 403
            ? 'Reload this scorecard and try again; the request was refused.'
            : response.status === 404
              ? 'Run the scan again; this report no longer exists.'
              : response.status === 429
                ? 'Try again later; the email request limit was reached.'
                : 'Try again in a moment; the email request failed.'),
      )
      setState('idle')
      return
    }
    // The route answers 200 with delivered:false when the mail provider refused it, and we
    // used to call that success: a visitor at the deepest point of intent was told the
    // scorecard was in their inbox when nothing had been sent.
    const payload = (await response.json().catch(() => ({}))) as { delivered?: boolean; queued?: boolean }
    captureAnalytics('email_submitted', { purpose: 'scorecard' })
    setState(payload.delivered === false && !payload.queued ? 'undelivered' : 'sent')
  }

  if (state === 'sent') {
    return (
      <div className="border border-brass bg-brass-soft p-8">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-brass">On its way</h2>
        <p className="mt-3 max-w-xl leading-relaxed">
          The scorecard for {domain} is in your inbox
          {temporary
            ? '. Its temporary link expires at the next deploy because the database refused this scan, which is held in memory. The email keeps the findings.'
            : ', with a permanent link you can forward.'}
        </p>
        {/* The one thing this page could never give them: today's answer goes stale, and an edge
            rule that starts refusing agents next month looks identical in a browser. Offered
            after the scorecard rather than folded into the same submit, so nobody is signed up
            for a recurring email by a button that promised a one-off one. */}
        <p className="mt-6 max-w-xl leading-relaxed">
          Get weekly scans with an email only when a verdict changes.
        </p>
        <div className="mt-4 max-w-xl">
          <WatchForm domain={domain} initialEmail={email} privacyLinked={privacyLinked} />
        </div>
      </div>
    )
  }

  if (state === 'undelivered') {
    return (
      <div className="border border-warn p-8">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-warn">Address received, email not sent</h2>
        <p className="mt-3 max-w-xl leading-relaxed">
          {temporary
            ? `Save this page for ${domain}; its temporary link expires at the next deploy, and the mail provider refused the email.`
            : `Copy this permanent link for ${domain}; I have your address, but the mail provider refused the email.`}
        </p>
      </div>
    )
  }

  return (
    <div className="border border-rule bg-surface p-8">
      <h2 className="text-lg font-semibold tracking-tight">Take it with you</h2>
      <p className="mt-3 max-w-xl text-xl leading-snug text-balance text-ink-soft">
        {failingCount > 0
          ? `${domain} does not fully pass ${failingCount} checks.`
          : `No measured, applicable check failed for ${domain}.`}
        {hasUnmeasuredChecks && ' Some checks remain unmeasured.'}
      </p>
      <p className="mt-3 max-w-xl leading-relaxed text-ink-soft">
        Send yourself the findings and priority fixes
        {temporary
          ? '; the email keeps them after this temporary link expires at the next deploy.'
          : ', with a permanent link you can forward.'}
      </p>

      <form onSubmit={submit} className="mt-6 flex max-w-xl flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          disabled={state === 'sending'}
          aria-label="Your email"
          className="min-w-0 flex-1 border border-rule bg-ground px-4 py-3 font-mono text-base sm:text-sm placeholder:text-ink-faint disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={state === 'sending'}
          className="bg-ink px-6 py-3 font-mono text-sm text-ground transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          {state === 'sending' ? 'Sending…' : 'Send it'}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 font-mono text-xs text-fail">
          {error}
        </p>
      )}
      <p className="mt-3 font-mono text-xs text-ink-faint">
        One email with the report, and one follow-up asking what you did with it. No newsletter, no sequence.
        Delete on request at{' '}
        <TrackedLink click="mail-hello" href="mailto:hello@letagentsin.com" className="text-brass underline underline-offset-4">
          hello@letagentsin.com
        </TrackedLink>
        .
      </p>
    </div>
  )
}
