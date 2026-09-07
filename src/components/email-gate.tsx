'use client'

import { useEffect, useState } from 'react'
import { TrackedLink } from './tracked-link'
import { WatchForm } from './watch-form'
import { captureAnalytics } from '@/lib/analytics'

export function EmailGate({
  domain,
  reportId,
  failingCount,
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
      setError(payload.error ?? 'Could not send it. Try again in a moment.')
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
            ? '. The link in it stops working at our next deploy, because our database refused this scan and we are holding it in memory. The mail itself keeps the findings.'
            : ', with a permanent link you can forward.'}
        </p>
        {/* The one thing this page could never give them: today's answer goes stale, and an edge
            rule that starts refusing agents next month looks identical in a browser. Offered
            after the scorecard rather than folded into the same submit, so nobody is signed up
            for a recurring email by a button that promised a one-off one. */}
        <p className="mt-6 max-w-xl leading-relaxed">
          This is one photograph. Should we rerun it every week and write only when a verdict moves?
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
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-warn">We could not send it</h2>
        <p className="mt-3 max-w-xl leading-relaxed">
          Our mail provider refused the message, which is our problem and not yours. We have your address
          and the scorecard for {domain} lives at this URL
          {temporary
            ? ' only until our next deploy, because our database refused this scan. Save the page rather than the link.'
            : ' permanently, so copy the link from your browser and it will keep working.'}
        </p>
        <p className="mt-3 max-w-xl leading-relaxed text-ink-soft">
          Telling you it was on its way would have been the easy thing to print here. This tool exists to
          say what actually happened.
        </p>
      </div>
    )
  }

  return (
    <div className="border border-rule bg-surface p-8">
      <h2 className="text-lg font-semibold tracking-tight">Take it with you</h2>
      <p className="mt-3 max-w-xl text-xl leading-snug text-balance text-ink-soft">
        {failingCount > 0
          ? `${failingCount} of the checks an agent depends on, ${domain} does not pass.`
          : `${domain} passes every deterministic check. The interesting question is what agents do anyway.`}
      </p>
      <p className="mt-3 max-w-xl leading-relaxed text-ink-soft">
        Send yourself the list above with the checks that cost the most, and a permanent link. Whoever
        owns the fix is usually not the person who ran the scan.
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
