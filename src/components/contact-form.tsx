'use client'

import { useRef, useState } from 'react'

/**
 * A small contact form for the paid offers. Formspree handles delivery while the report lead
 * endpoint remains dedicated to sending scorecards.
 *
 * Submitted with fetch rather than by navigating, because Formspree's own answer to a plain POST is
 * its thank-you page on formspree.io: the visitor is handed to a third party mid-sentence and the
 * back button is the only way home. The form element keeps its action and method, so a browser with
 * no JavaScript still submits; `_next` is what stops that path landing on formspree.io too.
 *
 * The confirmation replaces the form instead of appearing as a toast. A toast that fades is the one
 * thing a person cannot check afterwards, and "did that send?" is the question this page has to
 * answer for somebody who is about to spend money.
 */
export type ContactInterest = 'pilot' | 'report' | 'other'

const ENDPOINT = 'https://formspree.io/f/mpzkgdjw'

export function ContactForm({
  defaultInterest = 'pilot',
  context,
  privacyLinked,
  thanksUrl,
}: {
  defaultInterest?: ContactInterest
  context?: string
  privacyLinked: boolean
  /**
   * Where Formspree sends a browser that submitted without JavaScript. Passed in rather than read
   * from SITE_URL here: this is a client component, STACKPICK_BASE_URL is not NEXT_PUBLIC_, so the
   * bundler would inline it as undefined and every environment would redirect to production.
   */
  thanksUrl: string
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  // `state` is only read on the next render, so two submit events in one tick both see 'idle'. The
  // ref closes that window synchronously; a duplicate inquiry is cheap but it is somebody's mistake
  // to explain, not ours to create.
  const sending = useRef(false)

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending.current) return
    sending.current = true
    setState('sending')
    try {
      const answer = await fetch(ENDPOINT, {
        method: 'POST',
        body: new FormData(event.currentTarget),
        headers: { Accept: 'application/json' },
      })
      if (!answer.ok) throw new Error(`Formspree answered ${answer.status}`)
      setState('sent')
    } catch {
      // The address is spelled out rather than only linked: this branch exists for the case where
      // the form itself is what failed, so the way out must not depend on anything else working.
      setState('failed')
    } finally {
      sending.current = false
    }
  }

  if (state === 'sent') {
    return (
      <div
        role="status"
        tabIndex={-1}
        ref={(node) => node?.focus()}
        className="mt-6 max-w-2xl border-l-2 border-brass bg-surface p-6 outline-none"
      >
        <p className="font-medium">Sent. I have your message.</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          I read every one myself and reply from hello@letagentsin.com, usually within a working day.
        </p>
        <button
          type="button"
          onClick={() => setState('idle')}
          className="mt-4 w-fit border border-ink/40 px-4 py-2 font-mono text-sm transition-colors hover:border-brass hover:text-brass"
        >
          Send another
        </button>
      </div>
    )
  }

  return (
    <form
      action={ENDPOINT}
      method="POST"
      onSubmit={send}
      className="mt-6 grid max-w-2xl gap-4"
    >
      <input type="hidden" name="_subject" value="New Let Agents In inquiry" />
      <input type="hidden" name="_next" value={thanksUrl} />
      {context && <input type="hidden" name="context" value={context} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="font-medium">Your name</span>
          <input type="text" name="name" autoComplete="name" required className="border border-rule bg-surface px-4 py-3" />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium">Work email</span>
          <input type="email" name="email" autoComplete="email" required className="border border-rule bg-surface px-4 py-3" />
        </label>
      </div>
      <label className="grid gap-2 text-sm">
        <span className="font-medium">Company or product</span>
        <input type="text" name="company" autoComplete="organization" required className="border border-rule bg-surface px-4 py-3" />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium">What should we discuss?</span>
        <select name="interest" defaultValue={defaultInterest} className="border border-rule bg-surface px-4 py-3">
          <option value="pilot">Integration pilot</option>
          <option value="report">One agent report</option>
          <option value="other">Something else</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium">A short description of the product or task</span>
        <textarea name="message" required rows={5} className="border border-rule bg-surface px-4 py-3" />
      </label>
      {state === 'failed' && (
        <p role="alert" className="border-l-2 border-fail bg-surface p-4 text-sm leading-relaxed">
          That did not send. Write to hello@letagentsin.com and I will pick it up from there.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={state === 'sending'}
          className="w-fit bg-ink px-5 py-3 font-mono text-sm text-ground transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {state === 'sending' ? 'Sending...' : 'Send inquiry'}
        </button>
        <p className="text-xs leading-relaxed text-ink-faint">I&apos;ll reply from hello@letagentsin.com.</p>
      </div>
      <p className="text-xs leading-relaxed text-ink-faint">
        We use these details to answer your inquiry.{' '}
        {privacyLinked ? (
          <a href="/privacy" className="underline underline-offset-4 hover:text-ink">Read the privacy notice</a>
        ) : (
          <>Write to hello@letagentsin.com to ask about deletion.</>
        )}
      </p>
    </form>
  )
}
