import type { Metadata } from 'next'
import Link from 'next/link'

import { getStore } from '@/lib/store'
import { normalizeDomain } from '@/lib/scan/discover'
import { categoryFor } from '@/lib/categories'
import { SITE_URL } from '@/lib/site'
import { CHECKS, FORMULA_VERSION, STAGES, type ScoredCheck } from '@/lib/score'
import { WatchForm } from '@/components/watch-form'
import { erratumFor } from '@/lib/errata'

/**
 * The address for a vendor, as opposed to the address for one scan of it. /r/<id> names a
 * measurement and stops being true the moment we reseed, which is every few days; anybody who
 * cited us was citing a page about to be replaced. This one names the company and always shows
 * the newest scan we hold, so it can be linked, indexed and argued with.
 *
 * Cached rather than rendered per request. A crawler reading a hundred of these at once is the
 * normal case now that they are in the sitemap, and on 2026-08-12 that was enough to take one
 * dyno down: every page was a database read. Ten minutes is far shorter than the gap between
 * two scans of the same domain, so nothing here is ever meaningfully stale.
 */
export const revalidate = 600

const measurableOf = (card: { total: number; measurable?: number; max: number }) => card.measurable ?? card.max

/**
 * The row we publish about a vendor, which for a vendor in the corpus is the one our own console
 * measured. A stranger's scan lands in the same collection and used to win this page by being
 * newer, so an anonymous request at a bad moment rewrote what the site says about a company while
 * the rankings kept the seeded row, and the two disagreed in public. Outside the corpus there is
 * no seeded row and the visitor's own scan is the only thing to show, which is the point of that
 * page.
 */
async function publishedRowFor(domain: string) {
  const store = getStore()
  return (await store.latestForDomain(domain, true)) ?? (categoryFor(domain) ? null : store.latestForDomain(domain))
}

export async function generateMetadata({ params }: { params: Promise<{ domain: string }> }): Promise<Metadata> {
  const { domain } = await params
  const name = normalizeDomain(decodeURIComponent(domain))
  const report = await getStore().latestForDomain(name)
  // On every page, indexable or not. /v/www.stripe.com and /v/Stripe.com both answer 200 and are
  // the same page as /v/stripe.com, and without this they were three addresses with no canonical
  // between them: "Duplicate without user-selected canonical" in Search Console on 2026-08-17.
  const canonical = { alternates: { canonical: `${SITE_URL}/v/${name}` } }
  if (!report) return { title: `${name}: not measured yet · Let Agents In`, robots: { index: false }, ...canonical }

  const { scorecard } = report
  const measurable = measurableOf(scorecard)
  // Only the corpus is published, so only the corpus is offered to an index. A page built from a
  // visitor's own scan of a company that never asked is a page about somebody else, and it stays
  // readable at its address without being put in front of searchers.
  //
  // The formula version deliberately does NOT decide this any more. It did until 2026-08-17, and
  // the cost was the whole vendor index: the corpus is reseeded hours after a formula ships, and
  // in that window all 170 sitemap URLs said noindex, which is what Search Console wrote about.
  // The page states the formula it was measured under and the date, twice, in its own body.
  if (!categoryFor(name)) return { title: `${name} · Let Agents In`, robots: { index: false }, ...canonical }
  return {
    title: `Is ${name} ready for AI agents? ${scorecard.total}/${measurable} · Let Agents In`,
    description:
      `${name} scores ${scorecard.total} of ${measurable} measurable points across ${CHECKS.length} ` +
      'deterministic HTTP checks: whether an agent can find it, register with it and integrate it.',
    alternates: { canonical: `${SITE_URL}/v/${name}` },
    openGraph: { title: `${name} · ${scorecard.total}/${measurable}`, type: 'article' },
  }
}

/** Nobody has scanned it yet, which is a thing they can fix in twenty-seven seconds. */
function NotMeasured({ domain }: { domain: string }) {
  return (
    <main className="mx-auto flex max-w-2xl flex-col px-6 py-24">
      <h1 className="text-2xl font-semibold wrap-anywhere sm:text-3xl">We have not measured {domain}</h1>
      <p className="mt-4 leading-relaxed">
        Nobody has run it through the checks yet, so there is nothing here to show. The scan takes under
        half a minute, needs no account and publishes nothing about you: only the curated corpus is
        published, and a scan you run yourself does not join it.
      </p>
      <p className="mt-6 font-mono text-sm">
        <Link href={`/?domain=${encodeURIComponent(domain)}`} className="text-brass underline underline-offset-4">
          Scan {domain} now
        </Link>
      </p>
      <p className="mt-10 text-sm text-ink-soft">
        <Link href="/v" className="text-brass underline underline-offset-4">
          The companies we have measured
        </Link>
      </p>
    </main>
  )
}

function verdictTone(check: ScoredCheck) {
  if (check.points === check.max) return { label: 'PASS', className: 'text-pass' }
  if (check.notApplicable) return { label: 'N/A', className: 'text-ink-faint' }
  if (check.inconclusive) return { label: 'UNMEASURED', className: 'text-ink-faint' }
  if (check.points > 0) return { label: 'PART', className: 'text-warn' }
  return { label: 'FAIL', className: 'text-fail' }
}

export default async function VendorPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params
  const name = normalizeDomain(decodeURIComponent(domain))
  const report = await publishedRowFor(name)
  // A bare 404 here is the wrong answer to the only visitor who matters: somebody typing their
  // own domain, which is exactly the company we want measuring itself. They get the scan instead.
  if (!report) return <NotMeasured domain={name} />

  const { scorecard } = report
  const measurable = measurableOf(scorecard)
  const category = categoryFor(name)
  const scannedOn = report.scannedAt.slice(0, 10)
  const unmeasured = scorecard.checks.filter((check) => check.inconclusive).length

  return (
    <main className="mx-auto flex max-w-3xl flex-col px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">
        Agent readiness{category ? ` · ${category.label}` : ''}
      </p>
      <h1 className="mt-3 text-2xl font-semibold wrap-anywhere sm:text-3xl">{name}</h1>

      {scorecard.formulaVersion !== FORMULA_VERSION && (
        <div className="mt-6 border-l-2 border-warn bg-surface p-6">
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-warn">Measured under an older formula</h2>
          <p className="mt-3 max-w-2xl leading-relaxed">
            This scan ran under formula {scorecard.formulaVersion} and we are on {FORMULA_VERSION} now, so the
            number below is not comparable with the corpus and the sentences may quote addresses we have since
            moved. We keep the page rather than delete it, and keep it out of search rather than publish it.{' '}
            <Link href={`/?domain=${encodeURIComponent(name)}`} className="text-brass underline underline-offset-4">
              Rescan it
            </Link>{' '}
            and this page catches up.
          </p>
        </div>
      )}

      <p className="mt-4 max-w-2xl leading-relaxed">
        <strong>
          {scorecard.total} of {measurable} measurable points
        </strong>{' '}
        under formula {scorecard.formulaVersion}, measured on {scannedOn}. {CHECKS.length} checks exist; each is
        one HTTP request with a{' '}
        <Link href="/methodology" className="text-brass underline underline-offset-4">
          published rule
        </Link>
        , so every sentence below can be rerun and argued with.
        {unmeasured > 0 && (
          <>
            {' '}
            {unmeasured} of them could not be measured from where we ask, and those are left out of the
            denominator rather than counted as failures.
          </>
        )}
      </p>

      <div className="mt-10">
        {STAGES.map((stage) => {
          const checks = scorecard.checks.filter((check) => check.stage === stage.id)
          if (checks.length === 0) return null
          return (
            <div key={stage.id} className="border-t border-rule py-4">
              <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">
                {stage.letter} · {stage.title}
              </h2>
              <ul className="mt-3 flex flex-col gap-3">
                {checks.map((check) => {
                  const tone = verdictTone(check)
                  // Marked rather than quietly left standing. A row we know is wrong and cannot
                  // rescan is still a published claim about somebody else's product.
                  const erratum = erratumFor(name, check.id, scorecard.formulaVersion, check.detail)
                  return (
                    // minmax(0,1fr) rather than 1fr, because a bare 1fr is minmax(auto,1fr) and inflates to
                    // the longest unbreakable token in it. That token is ours: every scorecard opens with
                    // "Answered 200 to LetAgentsIn/1.0 (+https://letagentsin.com/methodology)", 274px of
                    // monospace in a 223px column, so every vendor page scrolled sideways on a phone.
                    <li key={check.id} className="grid grid-cols-[4rem_minmax(0,1fr)] gap-4 sm:grid-cols-[5.5rem_minmax(0,1fr)]">
                      <span className={`font-mono text-xs font-semibold ${tone.className}`}>{tone.label}</span>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">{check.label}</span>
                        <span className="font-mono text-xs wrap-anywhere text-ink-soft">{check.detail}</span>
                        {check.unblock && <span className="text-xs italic text-ink-faint">{check.unblock}</span>}
                        {erratum && (
                          <span className="border-l-2 border-warn pl-3 text-xs leading-relaxed text-ink-soft">
                            <strong className="font-mono uppercase tracking-[0.1em] text-warn">Correction. </strong>
                            {erratum.says}
                          </span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>

      <section className="mt-10 border-t border-rule pt-6">
        <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">Tell me when this changes</h2>
        <p className="mt-3 max-w-2xl leading-relaxed">
          The failures here are the kind nobody notices. An edge rule that starts refusing agents changes
          nothing a person sees in a browser, so the first sign is usually an integration that quietly stopped
          working. We rescan weekly and write only when a verdict moves.
        </p>
        <p className="mt-3 max-w-2xl text-sm text-ink-soft">
          Free while we are building this, and we will ask before it ever costs anything. No card, no account,
          and one link in every email that stops it.
        </p>
        <div className="mt-4 max-w-2xl">
          <WatchForm domain={name} />
        </div>
      </section>

      <section className="mt-10 border-t border-rule pt-6 text-sm text-ink-soft">
        <p className="max-w-2xl leading-relaxed">
          This page is the newest scan we hold for {name} and changes when we rescan. It is not a judgement of
          the product: we measure whether an unattended run can get through, not whether the thing is any good.
          The whole corpus is published as{' '}
          <a href="/corpus.json" className="text-brass underline underline-offset-4">
            JSON
          </a>{' '}
          and{' '}
          <a href="/corpus.csv" className="text-brass underline underline-offset-4">
            CSV
          </a>
          .
        </p>
        {/* We publish a graded verdict about a company that never asked us to. The least we owe
            them is a stated way to argue with it, and the corrections we get are the cheapest
            source of rule bugs we have. */}
        <p className="mt-4 max-w-2xl leading-relaxed">
          If a line here is wrong,{' '}
          <Link href={`/?domain=${encodeURIComponent(name)}`} className="text-brass underline underline-offset-4">
            rescan it
          </Link>{' '}
          first, because most of what we get told is already fixed and the page is only as new as the last
          scan. If it is still wrong after that, write to{' '}
          <a
            href={`mailto:hello@letagentsin.com?subject=${encodeURIComponent(`Wrong verdict on ${name}`)}`}
            className="text-brass underline underline-offset-4"
          >
            hello@letagentsin.com
          </a>{' '}
          with the check and what you see instead. A verdict we cannot reproduce comes down, and the rule
          that produced it gets fixed for everybody rather than only for you.
        </p>
        <p className="mt-4">
          <Link href="/" className="text-brass underline underline-offset-4">
            Scan a domain yourself
          </Link>
        </p>
      </section>
    </main>
  )
}
