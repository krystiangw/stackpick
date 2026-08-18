import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { AGENT_UA, DEFAULT_SCAN_BUDGET_MS, MAX_BYTES_PER_RESPONSE, MAX_PER_SITE } from '@/lib/scan/http'
import { recordVisit } from '@/lib/visits'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  alternates: { canonical: `${SITE_URL}/bot` },
  title: 'Our scanner in your logs: Let Agents In',
  description: `What LetAgentsIn/1.0 is doing on your site, how much of it there is, and how to stop it. It reads text over HTTP, runs nothing, and asks at most ${MAX_PER_SITE} things at once.`,
}

/**
 * The page our user-agent points at.
 *
 * We publish rate limits for agents knocking on us and said nothing about what we send. An
 * administrator who finds this string in a log has one question, and it is not our methodology:
 * what is this, how much of it is there, and how do I make it stop.
 *
 * Every number here is imported from the code that enforces it. A promise about our own load,
 * typed in by hand, is a promise that drifts the first time somebody tunes a constant.
 */
export default async function BotPage() {
  recordVisit('/bot', (await headers()).get('user-agent'))
  return (
    <main className="mx-auto max-w-5xl px-6">
      <section className="border-b border-rule py-14">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">In your logs</p>
        <h1 className="mt-4 max-w-2xl text-balance text-4xl font-semibold leading-tight tracking-tight">
          What our scanner is doing on your site, and how to stop it.
        </h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
          If you found <span className="font-mono text-ink">{AGENT_UA}</span> in your access log, that is us. Somebody
          asked whether an AI agent could find, register with and use your product, and we answered it by fetching
          your public pages. Every request carries{' '}
          <span className="font-mono text-ink">From: hello@letagentsin.com</span>, which is where to write if you would
          rather we did not.
        </p>
      </section>

      <section className="border-b border-rule py-12">
        <h2 className="text-lg font-semibold tracking-tight">What it does, and what it never does</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          It reads text over HTTP and nothing else. It executes no JavaScript, downloads nothing, submits no forms,
          creates no accounts and follows no link that would change something on your side. It asks for the pages an
          agent would ask for: your home page, your documentation, your pricing page, and a fixed list of well-known
          addresses such as <span className="font-mono text-ink">/llms.txt</span>,{' '}
          <span className="font-mono text-ink">/openapi.json</span> and{' '}
          <span className="font-mono text-ink">/.well-known/mcp.json</span>.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          It also asks a few pages as <span className="font-mono text-ink">Claude-User</span>,{' '}
          <span className="font-mono text-ink">ChatGPT-User</span> and the other retrieval agents, because whether your
          edge treats those differently from a browser is the measurement. Those requests deliberately carry nothing of
          ours: if we identified ourselves there, you could wave us through while everybody else stays blocked, and the
          number we publish would describe our own allowlist rather than your site.
        </p>
      </section>

      <section className="border-b border-rule py-12">
        <h2 className="text-lg font-semibold tracking-tight">How much of it there is</h2>
        <dl className="mt-6 grid gap-6 sm:grid-cols-3">
          <div>
            <dt className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">At once</dt>
            <dd className="mt-2 text-2xl font-semibold tabular-nums">{MAX_PER_SITE}</dd>
            <dd className="mt-1 text-sm leading-relaxed text-ink-soft">requests to one site, never more</dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">Per scan</dt>
            <dd className="mt-2 text-2xl font-semibold tabular-nums">{Math.round(DEFAULT_SCAN_BUDGET_MS / 1000)}s</dd>
            <dd className="mt-1 text-sm leading-relaxed text-ink-soft">the whole scan, then it stops</dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">Per response</dt>
            <dd className="mt-2 text-2xl font-semibold tabular-nums">{Math.round(MAX_BYTES_PER_RESPONSE / 1000)} kB</dd>
            <dd className="mt-1 text-sm leading-relaxed text-ink-soft">read, then the connection closes</dd>
          </div>
        </dl>
        <p className="mt-6 max-w-2xl leading-relaxed text-ink-soft">
          A 429 is treated as our fault, not yours: we wait, ask once more, and if you refuse again the row says we
          could not measure it rather than reporting an absence on your site. The same goes for a page we could not
          read: it is published as unmeasured and counts against nothing.
        </p>
      </section>

      <section className="border-b border-rule py-12">
        <h2 className="text-lg font-semibold tracking-tight">Turning it off</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          We respect robots.txt. Add these two lines and our automated passes stop fetching your domain from the next
          run, which is within a day.
        </p>
        <pre className="mt-5 max-w-2xl overflow-x-auto rounded-lg border border-rule bg-sunken p-4 font-mono text-sm">
          {`User-agent: LetAgentsIn\nDisallow: /`}
        </pre>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Your existing entry is not deleted. It keeps its last measurement and the date it was taken, and we stop
          refreshing it. Deleting entries on request would quietly bias the corpus we publish: the vendors with the
          worst results have the strongest reason to ask, and a median of whoever did not object is not a median.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          While it is frozen, the page says so: it prints the date the request first appeared, the date of the
          measurement it is still showing, and the date we last confirmed the request is still there. Removing the two
          lines unfreezes it, because the next automated pass measures the domain again and takes the notice with it.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          A scan you run from our home page always runs, robots.txt or not, because you asked for it. It will not
          update the published entry: nothing a visitor scans joins the corpus we publish, and that rule is what stops
          an anonymous request rewriting what this site says about a company. If you have fixed something and want the
          entry refreshed sooner than the next pass, write to{' '}
          <a href="mailto:hello@letagentsin.com" className="text-brass underline underline-offset-4">
            hello@letagentsin.com
          </a>
          . The distinction between a crawler and a fetch a person triggered is the same one Google draws.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          A site-wide <span className="font-mono text-ink">User-agent: *</span> with{' '}
          <span className="font-mono text-ink">Disallow: /</span> is read as a measurement rather than as an opt-out. It
          is what an AI agent looking for you hits as well, so it is recorded as being closed to automated retrieval,
          which is a finding about your site and not a request about us.
        </p>
      </section>

      <section className="py-12">
        <h2 className="text-lg font-semibold tracking-tight">If you would rather argue with the numbers</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Every check is one HTTP request with a fixed rule, and both are published. Nothing here is a model&apos;s
          opinion of your site.
        </p>
        <p className="mt-5 font-mono text-sm">
          <Link href="/methodology" className="text-brass underline underline-offset-4">
            The whole formula
          </Link>
          {' · '}
          <a href="/corpus.json" className="text-brass underline underline-offset-4">
            every result we publish, as data
          </a>
        </p>
      </section>
    </main>
  )
}
