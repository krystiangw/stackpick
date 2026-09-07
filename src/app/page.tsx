import type { Metadata } from 'next'
import Link from 'next/link'
import { TrackedLink } from '@/components/tracked-link'
import { FunnelMark } from '@/components/funnel-mark'
import { Rankings } from '@/components/rankings'
import { ScanForm } from '@/components/scan-form'
import { WebMcpTools } from '@/components/webmcp-tools'
import { WatchForm } from '@/components/watch-form'
import { CONTROLLER_IS_NAMED } from '@/lib/seller'
import { loadRankings } from '@/lib/rankings'
import { CHECKS, MAX_SCORE, STAGES } from '@/lib/score'
import { CATEGORIES } from '@/lib/categories'
import { recordVisit } from '@/lib/visits'
import { headers } from 'next/headers'
import { SITE_URL } from '@/lib/site'

export const dynamic = 'force-dynamic'

// Set here rather than in the root layout on purpose: a canonical in the layout is inherited by
// every page that does not override it, so one line would tell a crawler that /docs and /pricing
// are both this page.
export const metadata: Metadata = { alternates: { canonical: SITE_URL } }

const EVIDENCE = [
  { figure: '18 / 18', against: '0 / 12', claim: 'All eighteen runs produced code. None obtained its own credential when needed.', detail: 'Eight integrations were exercised; ten were checked from artefacts, including one with a missing payment interface. Four categories were tested.', href: '/findings#wall' },
  { figure: '0 / 10', against: '6 / 6', claim: 'The same model skipped sources for storage and fetched them for editor licensing.', detail: 'Source use varied between the two studies. The task effect was not isolated from the model or prompt.', href: '/findings#sources' },
  { figure: '5 → 0', against: 'one line of code', claim: 'Five of eight greenfield runs chose a provider; none of twelve chose it for an existing app.', detail: 'The app already had a session cookie. Three runs rejected adding a second identity system for file uploads.', href: '/findings#codebase' },
  { figure: '0 / 20', against: 'considered in 19', claim: 'Nineteen runs rejected one provider over the same framework assumption.', detail: 'A framework-specific example is a candidate fix. Its effect on selection has not been tested.', href: '/findings#absent' },
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
      <section className="home-hero border-b border-rule py-12 sm:py-20">
        <div className="grid items-start gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-14">
          <div>
            <p className="eyebrow">Agent readiness</p>
            <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
              From your docs to a working integration.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              Start with {CHECKS.length} free checks of your public site. Get a scorecard of documentation,
              access paths and API signals, with the evidence behind each result.
            </p>
            <div className="mt-7 max-w-xl">
              <ScanForm autoFocus initialDomain={asked} />
            </div>
            <WebMcpTools />
            <p className="mt-3 text-sm text-ink-faint">Free. No account. Reads only what you publish.</p>
            <p className="mt-6 text-sm text-ink-soft">I&apos;m Krystian Gwizdała. I built the scanner and run the audits.</p>
          </div>
          <aside className="sample-panel rounded-lg border border-rule bg-surface p-6 sm:p-7" aria-label="An example scorecard">
            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow">Inside a scorecard</p>
              <span className="rounded-full bg-brass-soft px-2.5 py-1 text-xs font-medium text-brass">Public example</span>
            </div>
            {example && (
              <>
                <div className="mt-6 flex items-baseline justify-between gap-4">
                  <Link href={`/r/${example.reportId}`} className="font-mono text-lg text-brass underline underline-offset-4">{example.domain}</Link>
                  <p className="font-mono text-3xl tracking-tight tabular-nums">{example.total}<span className="text-base text-ink-faint"> / {example.max}</span></p>
                </div>
                <p className="mt-2 text-xs text-ink-faint">Highest measured share in {categories[0].category.label.toLowerCase()}.</p>
                <div className="mt-7"><FunnelMark stages={example.stages} height={72} showLegend /></div>
              </>
            )}
            <p className="mt-6 border-t border-rule pt-5 text-sm leading-relaxed text-ink-soft">
              The scan alone does not test signup or complete an API call. An integration audit tests agreed tasks and records human handoffs.
            </p>
            <Link href="/d/sample" className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-brass underline underline-offset-4">Read a full agent report <span aria-hidden="true" className="ml-2">↗</span></Link>
          </aside>
        </div>
        {coverage.signupNeedsJavaScript > 0 && (
          <details className="mt-8 rounded-md border border-rule px-4 py-3 text-sm text-ink-soft">
            <summary className="cursor-pointer font-medium">What the current scans can tell us</summary>
            <p className="mt-3 max-w-3xl leading-relaxed">
              {`Of ${coverage.domains} vendors we can compare today` +
                (coverage.curated > coverage.domains ? ` (we hold ${coverage.curated}; the rest are waiting for a rescan)` : '') +
                (coverage.publishedFormula !== coverage.currentFormula
                  ? `, measured under formula ${coverage.publishedFormula} while the scanner runs ${coverage.currentFormula}. A new scan can disagree with the published row`
                  : '') +
                `, ${coverage.signupNeedsJavaScript} serve a signup form that renders nothing without JavaScript. `}
              {coverage.signupRefusesAgents > 0
                ? `${coverage.signupRefusesAgents} refuse an agent request where a browser request gets through.`
                : 'Our HTTP-only scanner cannot render those forms. A browser-capable agent may still use them.'}
              {' '}A blank response alone does not establish a blocked signup.
            </p>
          </details>
        )}
      </section>

      <section className="border-b border-rule py-14">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">What we found</h2>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          {EVIDENCE.map((item) => (
            <article key={item.figure} className="flex flex-col gap-3 rounded-lg border border-rule bg-surface p-6">
              <div className="flex items-baseline gap-2 font-mono">
                <span className="text-3xl font-semibold tracking-tight tabular-nums">{item.figure}</span>
                <span className="text-xs text-ink-faint">{item.against}</span>
              </div>
              <h3 className="text-balance font-medium leading-snug">{item.claim}</h3>
              <p className="text-sm leading-relaxed text-ink-soft">{item.detail}</p>
              <Link href={item.href} className="mt-auto inline-flex min-h-11 items-center text-sm text-brass underline underline-offset-4">Read the study</Link>
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
          The score groups public HTTP signals into five stages. Completing those stages is a separate
          question: an integration audit tests the actual task, including credentials and human handoffs.
        </p>


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
            <p className="text-2xl font-semibold tracking-tight">Know when a scan result changes</p>
            <p className="text-sm leading-relaxed text-ink-soft">
              Checks run weekly. When a verdict changes, the email shows the previous result and the new one.
            </p>
            <p className="text-sm leading-relaxed text-ink-soft">
              I start five agent runs manually, aiming for monthly checks. I may skip a batch; unchanged results produce no email.
              </p>
            <p className="text-sm leading-relaxed text-ink-soft">
              Each run answers one buying question, without signup or integration. Coverage is limited to the {CATEGORIES.length} categories we measure.
            </p>
            <p className="text-sm leading-relaxed text-ink-soft">
              Free while we are building it, and we will ask before it ever costs anything. No account, no card,
              and one link in every email stops it.
            </p>
            {/* The visitor who wants the agent half without the standing part had no way to say so,
                and the page that sells it is two clicks away behind a price list. */}
            <p className="text-sm leading-relaxed text-ink-soft">
              Want the agent runs once rather than every month?{' '}
              <TrackedLink click="pricing" href="/pricing" className="text-brass underline underline-offset-4">
                One report, ten runs, two tools
              </TrackedLink>
              , and you keep the transcripts.
            </p>
            <div className="mt-2">
              <WatchForm privacyLinked={CONTROLLER_IS_NAMED} />
            </div>
          </div>
        </div>
      </section>

      {/* A price and a name were both two clicks down a page of rankings, and somebody deciding
          whether to pay for an audit should not have to hunt for who would be doing it. */}
      <section className="border-t border-rule py-10">
        <p className="max-w-2xl leading-relaxed text-ink-soft">
          I run the scans, write the briefs and discuss the audit results with you.{' '}
          <TrackedLink click="audit" href="/audit" className="text-brass underline underline-offset-4">
            Read the four published audits
          </TrackedLink>{' '}
          to see the work.
        </p>
      </section>
    </main>
  )
}
