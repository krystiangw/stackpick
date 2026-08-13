'use client'

import Link from 'next/link'
import { useState } from 'react'

type Example = { id: string; domain: string; total: number; max: number }

/**
 * What a visitor sees instead of a refusal. The limit exists to stop loops, not to end the
 * conversation, so this keeps both things a stranger came for: a scorecard to look at, and
 * a way to get their own.
 */
export function LimitReached({ error, example, domain }: { error: string; example: Example | null; domain: string }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [failed, setFailed] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (state === 'sending') return
    setState('sending')
    setFailed(null)

    const response = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, domain, source: 'rate-limited' }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      setFailed(payload.error ?? 'Could not save that. Try again in a moment.')
      setState('idle')
      return
    }
    setState('sent')
  }

  return (
    <div className="border border-rule bg-sunken p-6">
      <h2 className="text-lg font-semibold tracking-tight">Not now, but not never</h2>
      <p className="mt-3 max-w-2xl leading-relaxed">{error}</p>

      {example && (
        <p className="mt-4 max-w-2xl leading-relaxed">
          While you wait, this is what a good one looks like:{' '}
          <Link href={`/r/${example.id}`} className="font-mono text-brass underline underline-offset-4">
            {example.domain} · {example.total}/{example.max}
          </Link>
          . Same fourteen checks, same formula.
        </p>
      )}

      {state === 'sent' ? (
        <p className="mt-5 max-w-2xl leading-relaxed">
          Noted. We will scan {domain} and send the scorecard to {email}, once, with a permanent link.
        </p>
      ) : (
        <>
          <form onSubmit={submit} className="mt-5 flex max-w-xl flex-col gap-2 sm:flex-row">
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
              {state === 'sending' ? 'Saving…' : 'Send it to me'}
            </button>
          </form>
          {failed && (
            <p role="alert" className="mt-2 font-mono text-xs text-fail">
              {failed}
            </p>
          )}
        </>
      )}
    </div>
  )
}
