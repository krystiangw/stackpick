import type { Metadata } from 'next'
import Link from 'next/link'

import { getStore } from '@/lib/store'
import { normalizeDomain } from '@/lib/scan/discover'
import { categoryFor } from '@/lib/categories'
import { SITE_URL } from '@/lib/site'
import { CHECKS, FORMULA_VERSION, STAGES, type ScoredCheck } from '@/lib/score'
import { WatchForm } from '@/components/watch-form'
import { CONTROLLER_IS_NAMED } from '@/lib/seller'
import { erratumFor } from '@/lib/errata'
import { challengedUs } from '@/lib/limits'

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
  // Seeded only, for every domain and not just for the corpus. `/bot` promises that an anonymous
  // request cannot rewrite what this site says about a company, and `/pricing` promises that a scan
  // somebody runs themselves "gets a permanent link you can forward, and we do not post it
  // anywhere". Outside the corpus that second promise was not true: this page took the newest row of
  // any kind, so a stranger scanning tally.so published our verdicts about tally.so at an address
  // anyone can guess - noindex, but readable by their competitor. Measured 2026-08-20: tally.so and
  // svix.com had a guest row and no seeded one, and both rendered here.
  //
  // The reason it used to fall back was real and is kept: preferring a seeded row froze our own page
  // on formula 9.22 while the scanner had moved nine versions. That is now answered by the banner
  // this page carries when the row is older than the formula we run, rather than by publishing
  // whatever a visitor last ran. A guest keeps their scan at `/r/<id>`, which is the unguessable
  // link the copy promises them.
  return store.latestForDomain(domain, true)
}

export async function generateMetadata({ params }: { params: Promise<{ domain: string }> }): Promise<Metadata> {
  const { domain } = await params
  const name = normalizeDomain(decodeURIComponent(domain))
  // The same row the body renders. Metadata used to take the newest scan of any kind, so a visitor
  // scanning stripe.com from the form put 11/17 in the title and the share card while the page
  // under it showed the corpus row at 9/16, and a sentence further down called itself the newest
  // scan we hold. One page, two numbers, and the one search engines cache was the wrong one.
  const report = await publishedRowFor(name)
  // On every page, indexable or not. /v/www.stripe.com and /v/Stripe.com both answer 200 and are
  // the same page as /v/stripe.com, and without this they were three addresses with no canonical
  // between them: "Duplicate without user-selected canonical" in Search Console on 2026-08-17.
  const canonical = { alternates: { canonical: `${SITE_URL}/v/${name}` } }
  if (!report) return { title: `${name}: not measured yet · Let Agents In`, robots: { index: false }, ...canonical }

  const { scorecard, findings } = report
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

  const { scorecard, findings } = report
  const measurable = measurableOf(scorecard)
  const category = categoryFor(name)
  const scannedOn = report.scannedAt.slice(0, 10)
  const unmeasured = scorecard.checks.filter((check) => check.inconclusive).length
  // Only when something went unmeasured. A wall we met while everything still got read is a fact
  // about their edge that cost this row nothing, and printing a warning over a complete row would
  // be us dramatising our own traffic.
  // Against the domain the scan actually read, not the one in the address: sendgrid.com lands on
  // twilio.com, and asking about sendgrid.com would drop every limit twilio.com's edge answered
  // with, on a row whose own sentences say they were measured there.
  const challenged = unmeasured > 0 ? challengedUs(findings, findings.resolvedElsewhere?.finalDomain ?? name) : null
  // Asked only for a domain we publish. Outside the corpus the page shows a visitor's own scan and
  // there is no frozen row to annotate, so the question would be about nothing.
  // A database blip must cost the annotation, not the page: this row renders from a report we
  // already hold, and 500ing it because one extra read failed would be a worse answer than a
  // missing notice. It must not cost the reader the truth either, so a failed read says so rather
  // than rendering as "not frozen".
  const frozen = category
    ? await getStore()
        .stayOutFor(name)
        .catch(() => 'unknown' as const)
    : null

  return (
    <main className="mx-auto flex max-w-3xl flex-col px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">
        Agent readiness{category ? ` · ${category.label}` : ''}
      </p>
      <h1 className="mt-3 text-2xl font-semibold wrap-anywhere sm:text-3xl">{name}</h1>

      {frozen === 'unknown' && (
        <p className="mt-6 max-w-2xl text-sm text-ink-soft">
          We could not check whether this row is frozen at its owner&rsquo;s request just now. If it is, the
          measurement below is the last one we took rather than a current one.
        </p>
      )}

      {frozen && frozen !== 'unknown' && (
        <div className="mt-6 border-l-2 border-warn bg-surface p-6">
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-warn">Frozen at their request</h2>
          <p className="mt-3 max-w-2xl leading-relaxed">
            Since {frozen.since.slice(0, 10)} the robots.txt at {name} has carried a group naming our scanner, so our
            automated passes stopped fetching it. Everything below is the measurement of {scannedOn} and it has not
            been refreshed since. We last confirmed the request on {frozen.lastSeenAt.slice(0, 10)}.
          </p>
          <p className="mt-3 max-w-2xl leading-relaxed">
            The row stays rather than being deleted, because deleting on request would leave a median of whoever did
            not object. Removing the two lines is enough to unfreeze it: the next automated pass measures the domain
            again and this notice goes with it. A scan run from our own home page will not do it, because a scan a
            visitor runs never joins the published corpus.{' '}
            <Link href="/bot" className="text-brass underline underline-offset-4">
              What our scanner does
            </Link>
            .
          </p>
        </div>
      )}

      {scorecard.formulaVersion !== FORMULA_VERSION && (
        <div className="mt-6 border-l-2 border-warn bg-surface p-6">
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-warn">Measured under an older formula</h2>
          <p className="mt-3 max-w-2xl leading-relaxed">
            This scan ran under formula {scorecard.formulaVersion} and we are on {FORMULA_VERSION} now, so the
            number below is not comparable with the corpus and the sentences may quote addresses we have since
            moved. The page stays up and says so rather than disappearing: hiding a measurement because it aged
            is how a number outlives the reason to believe it.{' '}
            <Link href={`/?domain=${encodeURIComponent(name)}`} className="text-brass underline underline-offset-4">
              Rescan it
            </Link>{' '}
            and this page catches up.
          </p>
        </div>
      )}

      {/* The three things /r has said for weeks and this page never did, while being the indexed one
          and the one about somebody else's company. A number published about a vendor without the
          sentence that qualifies it is the number they will be asked about in a meeting. */}
      {findings.resolvedElsewhere && (
        <div className="mt-6 border-l-2 border-warn bg-surface p-6">
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-warn">This domain resolves elsewhere</h2>
          <p className="mt-3 max-w-2xl leading-relaxed">
            {findings.resolvedElsewhere.requestedDomain} redirects to{' '}
            <span className="font-mono text-sm">{findings.resolvedElsewhere.finalUrl}</span>, so every number and
            every address on this page was measured on {findings.resolvedElsewhere.finalDomain} rather than on the
            name at the top.
          </p>
        </div>
      )}

      {findings.truncation && (
        <div className="mt-6 border-l-2 border-warn bg-surface p-6">
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-warn">This scan ran out of time</h2>
          <p className="mt-3 max-w-2xl leading-relaxed">
            The site took longer to read than the {Math.round(findings.truncation.budgetMs / 1000)} seconds a scan
            is allowed, so {findings.truncation.unmeasuredChecks.length} of the {scorecard.checks.length} checks
            never got evidence and {findings.truncation.unmeasuredChecks.length === 1 ? 'is' : 'are'} marked
            unmeasurable rather than scored. The number below is out of what we did measure: not a worse result, a
            smaller one.
          </p>
        </div>
      )}

      {/*
        Said once, above the checks, because one wall thins several of them at once and the fix plan
        below cannot carry it: the plan only offers points, and these checks are unmeasured rather
        than failed, so the one action that would unlock the most had nowhere to be printed.
      */}
      {challenged && (
        <div className="mt-6 border-l-2 border-warn bg-surface p-6">
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-warn">Your edge challenged us</h2>
          <p className="mt-3 max-w-2xl leading-relaxed">
            {challenged.hosts.join(', ')} answered {challenged.challenges} of the {challenged.refusedWhereChallenged}{' '}
            requests it refused with a browser challenge rather than a rate limit. A browser passes one of those invisibly and
            an HTTP client cannot pass it at all, which is the difference this scorecard is about. It costs no
            points: wherever that stopped us, the check says so and is marked unmeasurable rather than failed. What
            it costs is a row thinner than your product deserves, and an agent that stops where we stopped.
          </p>
        </div>
      )}

      {findings.rateLimitedUs && (
        <div className="mt-6 border-l-2 border-warn bg-surface p-6">
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-warn">We were rate limited</h2>
          <p className="mt-3 max-w-2xl leading-relaxed">
            Every request we made was answered with 429. That is either a limit we triggered or a gate on the
            network we scan from, and we cannot tell those apart from here, so it is not a measurement of how this
            vendor treats agents. The checks that depended on reading them are marked unmeasurable, not failed.
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
            {unmeasured} of them could not be measured from where we ask, and those are{' '}
            {scorecard.measurable === undefined ? (
              <>
                counted in the {scorecard.max} above rather than left out of it: this row predates the denominator
                that excludes them, so it reads worse than the same evidence would today. A rescan fixes it.
              </>
            ) : (
              <>left out of the denominator rather than counted as failures.</>
            )}
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
          <WatchForm domain={name} privacyLinked={CONTROLLER_IS_NAMED} />
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
