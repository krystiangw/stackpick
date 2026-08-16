import type { Metadata } from 'next'
import Link from 'next/link'
import { FunnelMark } from '@/components/funnel-mark'
import { Rankings } from '@/components/rankings'
import { ScanForm } from '@/components/scan-form'
import { WatchForm } from '@/components/watch-form'
import { loadRankings } from '@/lib/rankings'
import { CHECKS, MAX_SCORE, STAGES } from '@/lib/score'
import { recordVisit } from '@/lib/visits'
import { headers } from 'next/headers'
import { SITE_URL } from '@/lib/site'

export const dynamic = 'force-dynamic'

// Set here rather than in the root layout on purpose: a canonical in the layout is inherited by
// every page that does not override it, so one line would tell a crawler that /docs and /pricing
// are both this page.
export const metadata: Metadata = { alternates: { canonical: SITE_URL } }

const EVIDENCE = [
  {
    figure: '18 / 18',
    against: '0 / 12',
    claim: 'Every run shipped an integration. Not one got a credential of its own where the work needed one.',
    detail:
      'Eighteen runs in isolated copies of a real application, across the four categories we have run agents in. In the three that need an account, every run stopped at the signup form and said so in its own words. In the fourth no account was needed and the barrier still appeared, earlier: a required licence key struck vendors off during dependency research, before their product was opened.',
  },
  {
    figure: '0 / 10',
    against: '6 / 6',
    claim: 'Whether your documentation gets read depends on the kind of decision, not on the model.',
    detail:
      'In one study the cheaper model fetched no external source in ten runs and said so: own knowledge only. In another, where the choice turned on a licence, every run fetched sources including all of the cheaper ones. A decision that cannot be answered from memory is what makes your documentation get read.',
  },
  {
    figure: '5 → 0',
    against: 'one line of code',
    claim: 'A provider that won five of eight greenfield runs won none of twelve against real code.',
    detail:
      'The app already had a session cookie. Adopting that provider meant running a second identity system just to upload a file, and three separate runs rejected it in almost the same words.',
  },
  {
    figure: '0 / 20',
    against: 'considered in 19',
    claim: 'Being rejected for the same reason nineteen times is a positioning problem, not a product one.',
    detail:
      'One provider was never selected, yet was considered and dismissed in nineteen of twenty runs, always because it assumes a framework the project did not use. One documentation chapter fixes it.',
  },
]

export default async function Home({ searchParams }: { searchParams: Promise<{ domain?: string }> }) {
  recordVisit('/', (await headers()).get('user-agent'))
  // Somebody arriving from a vendor page we have not measured, with their own domain in hand.
  const asked = (await searchParams).domain ?? ''
  const { categories, coverage } = await loadRankings()
  // The stage list is abstract until it has a shape next to it, and the shape has to come from
  // a domain anyone can open and check rather than from an invented example.
  const example = categories[0]?.entries[0] ?? null

  return (
    <main className="mx-auto max-w-5xl px-6">
      <section className="border-b border-rule py-16 sm:py-24">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">
          Agent readiness, measured from outside
        </p>
        <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
          Find out where an AI agent gets stuck on your product, before it quietly picks somebody else.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
          Type your domain and {CHECKS.length} checks run against it in half a minute, telling you which step
          an unattended agent dies on: finding you, reading your docs, creating an account, getting a key, or
          the first API call. When a developer says “add file uploads”, an agent picks the provider and writes
          the integration. It never files a support ticket to tell you it gave up.
        </p>
        {coverage.signupNeedsJavaScript > 0 && (
          <p className="mt-4 max-w-2xl font-mono text-sm leading-relaxed text-ink-soft">
            {/* One string, because a line break between two JSX expressions renders as a space and
                put one in front of every comma in this sentence. */}
            {`Of ${coverage.domains} vendors we can compare today` +
              (coverage.curated > coverage.domains ? ` (we hold ${coverage.curated}; the rest are waiting for a rescan)` : '') +
              (coverage.publishedFormula !== coverage.currentFormula
                ? `, measured under formula ${coverage.publishedFormula} while the scanner runs ${coverage.currentFormula}, so a scan you run today can disagree with the row below it`
                : '') +
              `, ${coverage.signupNeedsJavaScript} serve a signup form that renders nothing without JavaScript, `}
            {coverage.signupRefusesAgents > 0
              ? `and ${coverage.signupRefusesAgents} answer an agent with a refusal where a browser gets through.`
              : 'which an agent reads as a page with no way in. Outright refusals aimed at agents are rarer than the noise around them suggests, and we say so rather than counting every 403 our data centre collects.'}
          </p>
        )}
        <div className="mt-8 max-w-xl">
          <ScanForm autoFocus initialDomain={asked} />
        </div>
        <p className="mt-3 font-mono text-xs text-ink-faint">
          Free. No account. Reads only what you publish.
        </p>
      </section>

      <section className="border-b border-rule py-14">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">What we found</h2>
        <div className="mt-8 grid gap-px bg-rule sm:grid-cols-3">
          {EVIDENCE.map((item) => (
            <article key={item.figure} className="flex flex-col gap-3 bg-ground p-6">
              <div className="flex items-baseline gap-2 font-mono">
                <span className="text-3xl font-semibold tracking-tight tabular-nums">{item.figure}</span>
                <span className="text-xs text-ink-faint">{item.against}</span>
              </div>
              <h3 className="text-balance font-medium leading-snug">{item.claim}</h3>
              <p className="text-sm leading-relaxed text-ink-soft">{item.detail}</p>
            </article>
          ))}
        </div>
        <p className="mt-6 font-mono text-xs text-ink-faint">
          Thirty-eight runs across five studies, with the limits of each one stated.{' '}
          <Link href="/findings" className="text-brass underline underline-offset-4">
            Read the method
          </Link>
        </p>
      </section>

      <Rankings rankings={categories} />

      <section className="border-b border-rule py-14">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">The five stages</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Most scanners stop at whether you publish a file. The interesting failures happen further down the
          funnel, where an agent has already chosen you and still cannot finish.
        </p>
        {example && (
          <div className="mt-8 flex flex-wrap items-end gap-6 border border-rule p-6">
            <FunnelMark stages={example.stages} height={72} showLegend />
            <div className="flex flex-col gap-1">
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">
                What the five stages look like on one real domain
              </p>
              <p className="font-mono text-sm">
                <Link href={`/r/${example.reportId}`} className="text-brass underline underline-offset-4">
                  {example.domain}
                </Link>{' '}
                <span className="tabular-nums text-ink-soft">
                  {example.total} / {example.max}
                </span>{' '}
                <span className="text-ink-faint">· current leader in {categories[0].category.label.toLowerCase()}</span>
              </p>
            </div>
          </div>
        )}

        <ol className="mt-8 flex flex-col">
          {STAGES.map((stage) => (
            <li key={stage.id} className="grid grid-cols-[2rem_1fr] gap-4 border-t border-rule py-4 sm:grid-cols-[3rem_12rem_1fr]">
              <span className="font-mono text-sm text-brass">{stage.letter}</span>
              <span className="font-mono text-sm font-medium">{stage.title}</span>
              <span className="col-span-2 text-sm text-ink-soft sm:col-span-1">{stage.question}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="py-14">
        <div className="grid gap-px bg-rule md:grid-cols-2">
          <div className="flex flex-col gap-3 bg-ground p-8">
            <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Free scan</h3>
            <p className="text-2xl font-semibold tracking-tight">What a machine can see</p>
            <p className="text-sm leading-relaxed text-ink-soft">
              {CHECKS.length} deterministic checks across the five stages, {MAX_SCORE} points on paper. Published
              formula, reproducible result, no model involved. Runs in under a minute.
            </p>
            {/* The paper maximum on its own reads as a promise we do not keep: almost no domain
                can be measured in full from outside, and the page says so 300px higher up. */}
            {coverage.domains > 0 && (
              <p className="text-sm leading-relaxed text-ink-soft">
                You are scored out of what we could measure on your domain, not out of {MAX_SCORE}. Across the{' '}
                {coverage.domains} domains scanned here that averages {coverage.averageMeasurable.toFixed(0)} points,
                and only {coverage.fullyMeasurable} could be measured in full.
              </p>
            )}
            <div className="mt-2 max-w-sm">
              <ScanForm />
            </div>
          </div>
          <div id="watch" className="flex scroll-mt-8 flex-col gap-3 bg-ground p-8">
            <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Monitoring</h3>
            <p className="text-2xl font-semibold tracking-tight">When it breaks, you hear it from us</p>
            <p className="text-sm leading-relaxed text-ink-soft">
              An edge rule that starts refusing agents changes nothing a person sees in a browser, so the first
              sign is usually an integration that quietly stopped working. We rerun the checks weekly and write
              only when a verdict moves, naming what it says now and what it said before.
            </p>
            <p className="text-sm leading-relaxed text-ink-soft">
              Once a month a real agent is asked the question your buyers ask, five times over, and you are told
              how many of the five named you and which provider was picked instead. It answers a question and
              signs up for nothing, so nothing of yours is touched.
            </p>
            <p className="text-sm leading-relaxed text-ink-soft">
              Free while we are building it, and we will ask before it ever costs anything. No account, no card,
              and one link in every email stops it.
            </p>
            <div className="mt-2">
              <WatchForm />
            </div>
          </div>
        </div>
      </section>

      {/* A price and a name were both two clicks down a page of rankings, and somebody deciding
          whether to pay for an audit should not have to hunt for who would be doing it. */}
      <section className="border-t border-rule py-10">
        <p className="max-w-2xl leading-relaxed text-ink-soft">
          Run by Krystian Gwizdała. The scanner, the formula, the agent runs and every number on this site are
          mine, and an audit is run by me rather than by a team you never meet.{' '}
          <Link href="/audit" className="text-brass underline underline-offset-4">
            Four audits are published in full
          </Link>{' '}
          so you can see the work before deciding whether it is worth anything to you.
        </p>
      </section>
    </main>
  )
}
