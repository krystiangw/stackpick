import Link from 'next/link'
import { pageMetadata } from '@/lib/site'

/**
 * Where the contact form lands a browser that did not run its JavaScript. With scripts on, the form
 * confirms in place and nobody arrives here; this page exists so the fallback path ends on our own
 * domain instead of on formspree.io. Noindex for the same reason a receipt is not a leaflet.
 */
export const metadata = pageMetadata({
  title: 'Message sent · Let Agents In',
  description: 'Your inquiry reached us. I reply from hello@letagentsin.com.',
  path: '/thanks',
  robots: { index: false, follow: true },
})

export default function ThanksPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">Message sent</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">I have your message.</h1>
      <p className="mt-5 leading-relaxed text-ink-soft">
        I read every one myself and reply from hello@letagentsin.com, usually within a working day.
      </p>
      <Link href="/" className="mt-8 inline-block text-brass underline underline-offset-4">
        Back to the front page
      </Link>
    </main>
  )
}
