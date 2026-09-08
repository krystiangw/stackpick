import type { Metadata } from 'next'
import Link from 'next/link'
import { TrackedLink } from '@/components/tracked-link'
import { Rankings } from '@/components/rankings'
import { ScanForm } from '@/components/scan-form'
import { WebMcpTools } from '@/components/webmcp-tools'
import { WatchForm } from '@/components/watch-form'
import { CONTROLLER_IS_NAMED } from '@/lib/seller'
import { loadRankings } from '@/lib/rankings'
import { CHECKS, MAX_SCORE } from '@/lib/score'
import { CATEGORIES } from '@/lib/categories'
import { recordVisit } from '@/lib/visits'
import { headers } from 'next/headers'
import { SITE_URL } from '@/lib/site'
import { INTEGRATION_PILOT, priceOf, skuById } from '@/lib/billing/catalog'

export const dynamic = 'force-dynamic'

// Set here rather than in the root layout on purpose: a canonical in the layout is inherited by
// every page that does not override it, so one line would tell a crawler that /docs and /pricing
// are both this page.
const title = 'Coding agent audits for APIs and developer tools · Let Agents In'
const description = 'See how coding agents choose and integrate your product. Free public-site scan, agent recommendation reports, and integration pilots with a fix and retest.'
export const metadata: Metadata = {
  alternates: { canonical: SITE_URL },
  title,
  description,
  openGraph: { title, description, url: SITE_URL, siteName: 'Let Agents In', type: 'website' },
}

const pilotPrice = `$${INTEGRATION_PILOT.usd.toLocaleString('en-US')}`

export default async function Home({ searchParams }: { searchParams: Promise<{ domain?: string }> }) {
  recordVisit('/', (await headers()).get('user-agent'))
  const asked = (await searchParams).domain ?? ''
  const { categories, coverage } = await loadRankings()

  return (
    <main className="mx-auto max-w-5xl px-6">
      <section className="home-hero border-b border-rule py-10 sm:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-12">
          <div>
            <p className="eyebrow">For teams building APIs and developer tools</p>
            <h1 className="mt-4 text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
              See where coding agents get stuck with your product.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              I test how agents choose and integrate your product. You get the steps that failed,
              the evidence, and a specific change to try.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#scan" className="inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-5 py-3 text-sm font-medium text-ground hover:opacity-85">Scan your site — free <span aria-hidden="true" className="ml-3">↓</span></a>
              <TrackedLink click="pricing" href="/pricing" className="inline-flex min-h-11 items-center rounded-md border border-rule px-5 py-3 text-sm font-medium hover:border-brass">See audit &amp; pricing</TrackedLink>
            </div>
            <p className="mt-6 text-sm text-ink-soft">Krystian Gwizdała · I run the tests and discuss the results with you.</p>
          </div>
          <aside className="sample-panel overflow-hidden rounded-xl border border-rule bg-surface" aria-label="A finding from a published integration study">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule bg-brass-soft px-6 py-3">
              <p className="eyebrow">From an integration study</p>
              <time dateTime="2026-08-08" className="text-xs text-ink-soft">8 Aug 2026</time>
            </div>
            <div className="p-6 sm:p-7">
              <h2 className="text-2xl font-semibold leading-tight tracking-tight">The build passed.<br />The checkout was missing.</h2>
              <dl className="mt-6 space-y-5 text-sm">
                <div><dt className="font-medium text-ink-faint">Task</dt><dd className="mt-1">Add paid support plans to a React app.</dd></div>
                <div className="border-l-2 border-fail pl-4"><dt className="font-medium text-fail">What the run revealed</dt><dd className="mt-1 leading-relaxed">With the key unset, the generated app built successfully but removed the entire payment interface.</dd></div>
                <div className="border-l-2 border-brass pl-4"><dt className="font-medium text-brass">A fix to test</dt><dd className="mt-1 leading-relaxed">Make the missing key a visible setup error. Check that the checkout survives a production build.</dd></div>
              </dl>
              <p className="mt-5 text-xs leading-relaxed text-ink-faint">One recorded run, inspected from code and build artefacts. The proposed fix has not been retested.</p>
              <Link href="/audit/paddle-payments" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-brass underline underline-offset-4">Read the payment study <span aria-hidden="true" className="ml-2">↗</span></Link>
            </div>
          </aside>
        </div>
        <p className="mt-8 border-t border-rule pt-5 text-sm text-ink-soft">
          Recommendation studies include <span className="font-medium text-ink">Claude Code, Codex, Cursor Auto and Antigravity.</span>{' '}
          Tool coverage and dates are shown in each report.
        </p>
      </section>

      <section id="scan" className="border-b border-rule py-10 sm:py-14">
        <p className="eyebrow">Choose what you want to check</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">Tests and pricing</h2>
        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          <article className="flex flex-col rounded-xl border border-rule bg-surface p-5">
            <div className="flex items-baseline justify-between gap-3"><h3 className="font-semibold">Public-site scan</h3><span className="font-mono text-lg">Free</span></div>
            <p className="mt-4 text-xl font-medium leading-snug">Can an agent read how to get started?</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{CHECKS.length} checks of your public docs, signup pages and API access instructions. Each result links to what the scanner found.</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">HTTP checks only. No agent tries your signup or integration.</p>
            <div className="mt-6"><ScanForm initialDomain={asked} /></div>
            <WebMcpTools />
            <p className="mt-3 text-xs text-ink-faint">No account or card required.</p>
          </article>
          <article className="flex flex-col rounded-xl border border-rule bg-surface p-5">
            <div className="flex items-baseline justify-between gap-3"><h3 className="font-semibold">Agent report</h3><span className="font-mono text-lg">{priceOf(skuById('report-one')!)}</span></div>
            <p className="mt-4 text-xl font-medium leading-snug">Does your product make the shortlist?</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">One buying question, at least ten answers across two tools. See which providers get named and read every answer.</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">One report, paid once. I check that the question fits your product before you pay.</p>
            <Link href="/d/sample" className="mt-auto inline-flex min-h-11 items-center pt-6 text-sm font-medium text-brass underline underline-offset-4">Read a sample report <span aria-hidden="true" className="ml-2">↗</span></Link>
          </article>
          <article className="flex flex-col rounded-xl border border-brass bg-brass-soft p-5">
            <div className="flex items-baseline justify-between gap-3"><h3 className="font-semibold">Integration pilot</h3><span className="font-mono text-lg">{pilotPrice}</span></div>
            <p className="mt-4 text-xl font-medium leading-snug">Can an agent finish the job?</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">Two tasks, two tools. I test the integration, make one small docs or example fix, then run the tasks again.</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>24 planned attempts, before and after</li>
              <li>A runnable test project</li>
              <li>A report showing what changed</li>
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-ink-soft">{pilotPrice} each for the first {INTEGRATION_PILOT.places} pilots. Up to 12 hours of my work. A retest may show no improvement.</p>
            <TrackedLink click="pricing" href="/pricing" className="mt-auto inline-flex min-h-11 items-center pt-6 text-sm font-medium text-brass underline underline-offset-4">See the pilot scope <span aria-hidden="true" className="ml-2">↗</span></TrackedLink>
          </article>
        </div>
        <details className="mt-5 rounded-lg border border-rule px-5 py-3 text-sm text-ink-soft">
          <summary className="cursor-pointer font-medium">How the free scan is scored</summary>
          <p className="mt-3 max-w-3xl leading-relaxed">The score covers public HTTP signals across five stages. Unmeasured and inapplicable checks are excluded from your denominator.</p>
          {coverage.domains > 0 && <p className="mt-3 max-w-3xl leading-relaxed">Across {coverage.domains} published domains, an average of {coverage.averageMeasurable.toFixed(0)} of {MAX_SCORE} possible points could be measured. Only {coverage.fullyMeasurable} could be measured in full.</p>}
          {coverage.signupNeedsJavaScript > 0 && <p className="mt-3 max-w-3xl leading-relaxed">{coverage.signupNeedsJavaScript} signup pages returned no form without JavaScript. That alone does not establish a blocked signup: a browser-capable agent may still use them.</p>}
          {coverage.publishedFormula !== coverage.currentFormula && <p className="mt-3 leading-relaxed">Published scores use formula {coverage.publishedFormula}; new scans use {coverage.currentFormula} and may disagree.</p>}
          <Link href="/methodology" className="mt-3 inline-flex min-h-11 items-center text-brass underline underline-offset-4">Read all checks and scoring rules</Link>
        </details>
      </section>

      <section id="watch" className="border-b border-rule py-10 sm:py-14">
        <div className="grid gap-6 md:grid-cols-2 md:gap-12">
          <div>
            <p className="eyebrow">Free monitoring beta · available on its own</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">Get an email when a scan result changes.</h2>
            <p className="mt-4 leading-relaxed text-ink-soft">Weekly public-site checks. Confirmed changes arrive with the old result, the new one and a link to the evidence.</p>
            <p className="mt-3 text-sm text-ink-soft">No audit needed. I will ask before charging. Unsubscribe from any email.</p>
          </div>
          <div className="rounded-xl border border-rule bg-surface p-5 sm:p-6">
            <WatchForm privacyLinked={CONTROLLER_IS_NAMED} />
            <details className="mt-5 border-t border-rule pt-4 text-sm text-ink-soft">
              <summary className="cursor-pointer font-medium">Does this also track agent recommendations?</summary>
              <p className="mt-3 leading-relaxed">Agent mention checks are a separate manual experiment, with no fixed schedule or guaranteed run count. They cover one buying question in each of {CATEGORIES.length} categories, without signup or integration.</p>
            </details>
          </div>
        </div>
      </section>

      <section className="border-b border-rule py-10 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="eyebrow">Published research</p><h2 className="mt-3 text-2xl font-semibold tracking-tight">Look through the work.</h2></div>
          <TrackedLink click="audit" href="/audit" className="inline-flex min-h-11 items-center text-sm font-medium text-brass underline underline-offset-4">All four integration studies ↗</TrackedLink>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link href="/findings#wall" className="rounded-xl border border-rule bg-surface p-6 hover:border-brass">
            <p className="font-mono text-3xl font-semibold">0 of 12</p>
            <h3 className="mt-3 text-lg font-medium">No run obtained its own credentials.</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">Across the three categories that needed credentials, all twelve runs required human help to obtain them.</p>
            <span className="mt-4 inline-block text-sm text-brass underline underline-offset-4">See the integration findings ↗</span>
          </Link>
          <Link href="/findings#codebase" className="rounded-xl border border-rule bg-surface p-6 hover:border-brass">
            <p className="font-mono text-3xl font-semibold">5/8 → 0/12</p>
            <h3 className="mt-3 text-lg font-medium">An existing app changed the choice.</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">One provider was chosen in five of eight empty-project runs, and none of twelve runs with an existing app.</p>
            <span className="mt-4 inline-block text-sm text-brass underline underline-offset-4">Compare the two conditions ↗</span>
          </Link>
        </div>
        <p className="mt-4 text-sm text-ink-faint">These are independent studies, not paid client results. They do not measure lost sales or prove that a fix will change an agent&apos;s choice.</p>
      </section>
      <Rankings rankings={categories} />
    </main>
  )
}
