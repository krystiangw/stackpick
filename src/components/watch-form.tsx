'use client'

import { useState } from 'react'

/**
 * Two fields and no account. We charge every vendor a point for putting a wall in front of an
 * unattended signup, so this form renders in the server HTML, takes no card and sets no
 * password: an agent can complete it as easily as a person.
 */
export function WatchForm({ domain, initialEmail }: { domain?: string; initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail ?? '')
  const [site, setSite] = useState(domain ?? '')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'already' | 'undelivered'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (state === 'sending') return
    setState('sending')
    setError(null)

    const response = await fetch('/api/watch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, domain: site }),
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      setError(payload.error ?? 'Could not start it. Try again in a moment.')
      setState('idle')
      return
    }
    const payload = (await response.json().catch(() => ({}))) as { delivered?: boolean; alreadyWatching?: boolean }
    if (payload.alreadyWatching) return setState('already')
    setState(payload.delivered === false ? 'undelivered' : 'sent')
  }

  if (state === 'sent') {
    return (
      <div className="border border-brass bg-brass-soft p-6">
        <p className="leading-relaxed">
          Check <span className="font-mono text-sm">{email}</span> and follow the link. Nothing is watched
          until you do, and the same email carries the link that stops it.
        </p>
      </div>
    )
  }
  if (state === 'already') {
    return (
      <div className="border border-rule p-6">
        <p className="leading-relaxed">
          Already watching <span className="font-mono text-sm">{site}</span> for that address. The last email
          we sent you carries the link that stops it.
        </p>
      </div>
    )
  }
  if (state === 'undelivered') {
    return (
      <div className="border border-warn p-6">
        <p className="leading-relaxed">
          We saved it but the confirmation email would not send, so nothing is watched yet. Write to{' '}
          <a href="mailto:hello@letagentsin.com" className="text-brass underline underline-offset-4">
            hello@letagentsin.com
          </a>{' '}
          and we will finish it by hand.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        {!domain && (
          <input
            type="text"
            required
            value={site}
            onChange={(event) => setSite(event.target.value)}
            placeholder="yourdomain.com"
            aria-label="Domain to watch"
            className="w-full border border-rule bg-surface px-4 py-3 font-mono text-sm sm:w-1/2"
          />
        )}
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          aria-label="Where to send the alerts"
          className="w-full border border-rule bg-surface px-4 py-3 font-mono text-sm"
        />
        <button
          type="submit"
          disabled={state === 'sending'}
          className="shrink-0 whitespace-nowrap border border-brass bg-brass px-6 py-3 font-mono text-sm text-ink-inverse disabled:opacity-60"
        >
          {state === 'sending' ? 'Starting' : 'Watch it'}
        </button>
      </div>
      {error && <p className="font-mono text-xs text-fail">{error}</p>}
    </form>
  )
}
