/**
 * A small contact form for the paid offers. Formspree handles delivery while the report lead
 * endpoint remains dedicated to sending scorecards.
 */
export type ContactInterest = 'pilot' | 'report' | 'other'

export function ContactForm({
  defaultInterest = 'pilot',
  context,
  privacyLinked,
}: {
  defaultInterest?: ContactInterest
  context?: string
  privacyLinked: boolean
}) {
  return (
    <form action="https://formspree.io/f/mpzkgdjw" method="POST" className="mt-6 grid max-w-2xl gap-4">
      <input type="hidden" name="_subject" value="New Let Agents In inquiry" />
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
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="w-fit bg-ink px-5 py-3 font-mono text-sm text-ground transition-opacity hover:opacity-85">
          Send inquiry
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
