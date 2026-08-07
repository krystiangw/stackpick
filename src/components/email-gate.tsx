'use client'

import { useState } from 'react'

export function EmailGate({
  domain,
  reportId,
  failingCount,
}: {
  domain: string
  reportId: string
  failingCount: number
}) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

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
    setState('sent')
  }

  if (state === 'sent') {
    return (
      <div className="border border-brass bg-brass-soft p-8">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-brass">On its way</h2>
        <p className="mt-3 max-w-xl leading-relaxed">
          The scorecard for {domain} is in your inbox, with a permanent link you can forward.
        </p>
      </div>
    )
  }

  return (
    <div className="border border-rule bg-surface p-8">
      <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Take it with you</h2>
      <p className="mt-3 max-w-xl text-2xl font-semibold leading-snug tracking-tight text-balance">
        {failingCount > 0
          ? `${failingCount} checks are costing ${domain} integrations right now.`
          : `${domain} passes every deterministic check. The interesting question is what agents do anyway.`}
      </p>
      <p className="mt-3 max-w-xl leading-relaxed text-ink-soft">
        Send yourself the scorecard and we will include how {domain} compares to three competitors in the
        same category, plus the fix list ordered by effect over effort.
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
          className="min-w-0 flex-1 border border-rule bg-ground px-4 py-3 font-mono text-sm placeholder:text-ink-faint disabled:opacity-60"
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
        One email with the report. No sequence, no newsletter.
      </p>
    </div>
  )
}
