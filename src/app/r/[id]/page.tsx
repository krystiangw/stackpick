import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { addressProtectsNothing } from '@/lib/store'
import { ComparisonSection } from '@/components/comparison'
import { buildComparison } from '@/lib/compare'
import { CONTROLLER_IS_NAMED } from '@/lib/seller'
import { EmailGate } from '@/components/email-gate'
import { FixFirst } from '@/components/fix-first'
import { FunnelMark } from '@/components/funnel-mark'
import { buildFixPlan } from '@/lib/fixfirst'
import { isHeldOnly } from '@/lib/store'
import { erratumFor } from '@/lib/errata'
import { pickHeadline } from '@/lib/headline'
import { ShareRow } from '@/components/share-row'
import { CHECKS, STAGES, type ScoredCheck } from '@/lib/score'
import { reportAsPublished } from '@/lib/publishable'
import { recordVisit } from '@/lib/visits'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  // Through the gate as well: the title and the share description are published surfaces too, and
  // a withdrawn point that survives in the search result is the correction missing its audience.
  const published = await reportAsPublished(id)
  if (published && addressProtectsNothing(id)) return { title: 'Not found · Let Agents In', robots: { index: false } }
  if (!published) return { title: 'Scorecard not found: Let Agents In' }
  const { report } = published

  const headline = pickHeadline(report.findings, report.scorecard)
  return {
    // Nie indeksujemy ZADNEGO z tych adresow, nie tylko tych ulotnych. Strony `/watch/confirm` i
    // `/watch/stop` maja `noindex` od poczatku, a ta - opisana w cenniku jako link prywatny i
    // potrafiaca mowic o CUDZEJ firmie, bo skanuje sie dowolna domene - nie miala go wcale.
    //
    // `robots.txt` ma `Disallow: /r/`, wiec crawler, ktory go slucha, tej dyrektywy nie zobaczy - i
    // tak zostaje, bo zdjecie Disallow zaprasza z powrotem pobrania, ktore raz polozyly ten dyno.
    // To jest wiec warstwa dla tych, ktorzy `robots.txt` nie czytaja, a nie zaklecie na Google.
    robots: { index: false, follow: false },
    title: `${report.domain}: agent readiness ${report.scorecard.total}/${report.scorecard.measurable ?? report.scorecard.max}`,
    description: headline.claim,
    openGraph: {
      title: `${report.domain} · ${report.scorecard.total}/${report.scorecard.measurable ?? report.scorecard.max}`,
      description: headline.claim,
    },
    twitter: { card: 'summary_large_image' },
  }
}

type Stage = { points: number; max: number; measurable?: number }

/** Null when nothing at this stage could be measured, which is not the same as zero. */
function stageShare(stage: Stage): number | null {
  const measurable = stage.measurable ?? stage.max
  return measurable === 0 ? null : stage.points / measurable
}

/**
 * Fractions, not bare totals. rankings.ts says it in one line - "a median of raw totals is not
 * comparable when every row has its own denominator" - and this function did exactly that, then
 * took the best peer by SHARE and printed its raw total beside it. A reader on 8 points was shown
 * "best a.com 6" and could reasonably conclude they were ahead of the category, while the table
 * further down put a.com first on 6 of 7.
 */
function scaleAnchor(comparison: Awaited<ReturnType<typeof buildComparison>>, total: number, measurable: number): string | null {
  const peers = comparison.peers
  const rankable = peers.filter((peer) => !peer.undermeasured)
  if (rankable.length >= 3) {
    const shares = rankable.map((peer) => (peer.max === 0 ? 0 : peer.total / peer.max)).sort((a, b) => a - b)
    const middle = Math.floor(shares.length / 2)
    const median = shares.length % 2 === 0 ? (shares[middle - 1] + shares[middle]) / 2 : shares[middle]
    const best = rankable[0]
    const pct = (value: number) => `${Math.round(value * 100)}%`
    return `You ${total}/${measurable} (${pct(measurable === 0 ? 0 : total / measurable)}) · category median ${pct(median)} · best ${best.domain} ${best.total}/${best.max}`
  }
  if (comparison.percentile) {
    // Named, because unnamed it reads as a rank in your market and is not one. A reader whose
    // product is a SaaS for equity analysts was told he was ahead of 1 of 168, where all 168 are
    // developer tools we picked. That sentence sells; it does not diagnose.
    return `Higher than ${comparison.percentile.betterThan} of ${comparison.percentile.outOf} scanned domains. These are developer tools I selected, not a sample of your market.`
  }
  return null
}

const SOURCE_LABEL: Record<string, string> = {
  site: 'linked from the site',
  'llms-txt': 'from your llms.txt',
  'fallback-path': 'guessed path',
  subdomain: 'found on a subdomain',
}

/** Every wrong verdict in the audits started with the wrong URL, so name where it came from. */
function withSource(url: string | null, source: string | null): string | null {
  if (!url) return null
  const label = source ? SOURCE_LABEL[source] : null
  return label ? `${url} · ${label}` : url
}

function verdictTone(check: ScoredCheck) {
  if (check.points === check.max) return { label: 'PASS', className: 'text-pass' }
  // Three states, not two: we could not measure it, or it does not apply to this product.
  if (check.notApplicable) return { label: 'N/A', className: 'text-ink-faint' }
  if (check.inconclusive) return { label: 'UNMEASURED', className: 'text-ink-faint' }
  if (check.points > 0) return { label: 'PART', className: 'text-warn' }
  return { label: 'FAIL', className: 'text-fail' }
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Loaded through the publication gate, so everything downstream - comparison, rank, headline,
  // metadata, share image - sees one and the same corrected scorecard. The stored row is never
  // touched; when a rule of ours turns out to have charged somebody without evidence, the finding
  // is withdrawn here and the page says so out loud.
  const published = await reportAsPublished(id)
  if (!published || addressProtectsNothing(id)) notFound()
  const { report, degraded } = published
  const { scorecard, findings } = report
  // Filed under the domain, never the report id: one row per vendor instead of one per scan, so the
  // counter answers "did anyone read what we published about this company" without growing a row
  // for every report we ever wrote. Counting this at all was missing until 20 August, and its
  // absence is why "how many people saw the accusation we withdrew" had no answer.
  recordVisit(`/r/${report.domain}`, (await headers()).get('user-agent'))
  // A check we could not measure is not a failure we can charge someone for.
  // Not applicable is not failing. It counted here and nowhere else, so linear.app was told "5 of
  // the checks does not pass" while the SARIF from the same scan listed four failures and one check
  // that does not apply to a product of that kind.
  const failing = scorecard.checks.filter((check) => check.points < check.max && !check.inconclusive && !check.notApplicable)
  const scanned = new Date(report.scannedAt)
  // The formula assumes a product a developer integrates. Saying so beats scoring a
  // newspaper against an SDK checklist and letting the number imply it failed.
  const looksLikeDeveloperProduct =
    Boolean(findings.discovered.docs) || Boolean(findings.npm.package) || findings.machine.openapi.length > 0
  const headline = pickHeadline(findings, scorecard)
  const comparison = await buildComparison(report)
  const fixPlan = buildFixPlan(findings, scorecard, comparison)
  // A number with no scale is not a finding. The anchor answers "is 8 bad?" above the fold,
  // from data this page already loaded, instead of 1,900px down the page.
  const anchor = scaleAnchor(comparison, scorecard.total, scorecard.measurable ?? scorecard.max)
  // Charging a vendor for our blind spots is the rule the industry report already refuses to
  // apply to the market, and this is the page the vendor actually reads.
  const measurable = scorecard.measurable ?? scorecard.max
  const unmeasured = scorecard.max - measurable
  const robotsUnreadable = Boolean(findings.robots.unreadable)
  // Built from the request when no base URL is configured, so a copied link is never relative.
  const host = (await headers()).get('host') ?? 'localhost:3000'
  const origin = process.env.STACKPICK_BASE_URL ?? `${host.startsWith('localhost') ? 'http' : 'https'}://${host}`

  return (
    <main className="mx-auto max-w-5xl px-6">
      {/* Everything below is a real measurement. Only its address is provisional, and saying which
          one is the difference between a caveat somebody can act on and a vague warning. */}
      {isHeldOnly(id) && (
        <div className="mt-8 border-l-2 border-warn bg-surface p-6">
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-warn">This link will not last</h2>
          <p className="mt-3 max-w-2xl leading-relaxed">
            Save this page; the database is full, so this scan is held in memory and its temporary link expires at the next deploy.
            Rerun the scan once storage is available, or request a permanent copy at{' '}
            <a href="mailto:hello@letagentsin.com" className="text-brass underline underline-offset-4">
              hello@letagentsin.com
            </a>
            .
          </p>
        </div>
      )}
      {/* A correction nobody can see is worse than none: anyone holding a screenshot of the old page
          deserves to find out here why it no longer says that. Named check, named reason, and the
          evidence we did keep, labelled as recovered rather than passed off as what we wrote. */}
      {degraded.length > 0 && (
        <div className="mt-8 border-l-2 border-brass bg-surface p-6">
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-brass">I withdrew a finding on this page</h2>
          {degraded.map((withdrawn) => (
            <div key={withdrawn.checkId} className="mt-3 max-w-2xl">
              <p className="leading-relaxed">
                <span className="font-mono text-sm">{withdrawn.checkId}</span>: {withdrawn.because} The stored scan and every other row are unchanged.
              </p>
              {withdrawn.evidence && withdrawn.evidence.length > 0 && (
                <p className="mt-3 text-sm leading-relaxed text-ink-faint">
                  Recovered evidence from the scan record: it requested OAuth metadata from{' '}
                  {withdrawn.evidence.length} {withdrawn.evidence.length === 1 ? 'origin' : 'origins'}, starting with{' '}
                  {withdrawn.evidence.slice(0, 3).join(', ')}.
                </p>
              )}
              <p className="mt-3 text-sm leading-relaxed text-ink-faint">
                This scan used formula v{scorecard.formulaVersion}. The current
                verdict for {report.domain} is at{' '}
                <a href={`/v/${report.domain}`} className="text-brass underline underline-offset-4">
                  /v/{report.domain}
                </a>
                .
              </p>
            </div>
          ))}
        </div>
      )}
      <section className="border-b border-rule py-12">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">Agent readiness · {report.domain}</p>
          <p className="font-mono text-xs text-ink-faint">
            {scanned.toISOString().slice(0, 16).replace('T', ' ')} UTC · formula v{scorecard.formulaVersion} ·{' '}
            {(findings.durationMs / 1000).toFixed(1)}s
          </p>
        </div>

        <h1 className="mt-6 max-w-4xl text-balance text-3xl font-semibold leading-[1.15] tracking-tight sm:text-[2.75rem]">
          {headline.claim}
        </h1>
        <p className="mt-4 max-w-2xl font-mono text-sm leading-relaxed text-ink-soft">{headline.evidence}</p>

        <div className="mt-10 flex flex-wrap items-end gap-x-10 gap-y-4">
          <div className="flex items-baseline gap-2 font-mono">
            <span
              className={`text-6xl font-semibold tracking-tighter tabular-nums ${
                scorecard.total <= measurable / 3 ? 'text-fail' : scorecard.total >= (measurable * 2) / 3 ? 'text-pass' : 'text-warn'
              }`}
            >
              {scorecard.total}
            </span>
            <span className="text-lg text-ink-faint">/ {measurable}</span>
          </div>
          <FunnelMark stages={scorecard.stages} showLegend />
          <dl className="flex flex-wrap gap-x-8 gap-y-2 font-mono text-xs">
            {scorecard.stages.map((stage) => (
              <div key={stage.stage} className="flex flex-col gap-0.5">
                <dt className="text-ink-faint">{stage.letter} · {stage.title}</dt>
                <dd
                  className={`tabular-nums ${
                    stageShare(stage) === null
                      ? 'text-ink-faint'
                      : stageShare(stage)! >= 0.67
                        ? 'text-pass'
                        : stageShare(stage)! >= 0.34
                          ? 'text-warn'
                          : 'text-fail'
                  }`}
                >
                  {stage.measurable === 0 ? 'n/m' : `${stage.points}/${stage.measurable ?? stage.max}`}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="mt-3 font-mono text-xs text-ink-faint">
          {unmeasured > 0
            ? `of ${measurable} applicable, measurable points · ${unmeasured} of ${scorecard.max} ${unmeasured === 1 ? 'was' : 'were'} not scored`
            : `all ${scorecard.max} points were measurable on this domain`}
        </p>

        {anchor && (
          <p className="mt-4 font-mono text-xs text-ink-soft">
            {anchor} ·{' '}
            <Link href="/methodology" className="text-brass underline underline-offset-4">
              {CHECKS.length} deterministic HTTP checks, published formula
            </Link>
          </p>
        )}

        <div className="mt-8">
          <ShareRow
            domain={report.domain}
            headline={headline.claim}
            url={`${origin}/r/${report.id}`}
          />
        </div>
      </section>

      {!looksLikeDeveloperProduct && !findings.blocksPlainRequests && !findings.rateLimitedUs && !findings.truncation && (
        <section className="border-b border-rule py-8">
          <div className="border-l-2 border-warn bg-surface p-6">
            <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-warn">The formula may not apply</h2>
            <p className="mt-3 max-w-2xl leading-relaxed">
              The scan found no documentation, SDK or API description, so this formula for products developers integrate may not apply.
            </p>
          </div>
        </section>
      )}

      {/* A scan the clock cut short must never read like a complete one, and the per-check
          sentences alone are too quiet: the number at the top is what people quote. */}
      {findings.truncation && (
        <section className="border-b border-rule py-8">
          <div className="border-l-2 border-warn bg-surface p-6">
            <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-warn">This scan ran out of time</h2>
            <p className="mt-3 max-w-2xl leading-relaxed">
              The scan exceeded its {Math.round(findings.truncation.budgetMs / 1000)} seconds, leaving{' '}
              {findings.truncation.unmeasuredChecks.length} of {scorecard.checks.length} checks unmeasured and excluded from the score.
              Try scanning again.
            </p>
          </div>
        </section>
      )}

      {findings.resolvedElsewhere && (
        <section className="border-b border-rule py-8">
          <div className="border-l-2 border-warn bg-surface p-6">
            <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-warn">This domain resolves elsewhere</h2>
            <p className="mt-3 max-w-2xl leading-relaxed">
              {findings.resolvedElsewhere.requestedDomain} redirects to{' '}
              <span className="font-mono text-sm">{findings.resolvedElsewhere.finalUrl}</span>, so these findings
              describe {findings.resolvedElsewhere.finalDomain}.
            </p>
          </div>
        </section>
      )}

      {findings.rateLimitedUs && (
        <section className="border-b border-rule py-8">
          <div className="border-l-2 border-warn bg-surface p-6">
            <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-warn">The scan was rate limited</h2>
            <p className="mt-3 max-w-2xl leading-relaxed">
              Every request returned 429, leaving dependent checks unmeasured because the test cannot distinguish a triggered limit from a network restriction.
            </p>
          </div>
        </section>
      )}

      {/* Not when one of the tries answered: the box would say no agent gets in while the check
          above it passes the vendor for having let us in. name.com answered (200, 429, 429). */}
      {findings.botChallenge && !findings.agentStatusesSeen?.some((status) => status >= 200 && status < 400) && (
        <section className="border-b border-rule py-8">
          <div className="border-l-2 border-fail bg-surface p-6">
            <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-fail">The HTTP test received a JavaScript challenge</h2>
            <p className="mt-3 max-w-2xl leading-relaxed">
              The HTTP test received <span className="font-mono">{findings.agentStatus}</span> and a JavaScript challenge,
              blocking clients without JavaScript.
            </p>
            <p className="mt-3 max-w-2xl leading-relaxed">
              The scan scores this challenge as a failure; the findings reflect what was measurable through it.
            </p>
          </div>
        </section>
      )}

      {/* Not when we were rate limited: that box accuses the vendor of refusing agents, and the
          box above it says the opposite about the same 429. One page cannot hold both. And not
          on a challenge, which has its own box saying something the generic one gets backwards:
          a Chrome user-agent is refused too, and that is the mechanism rather than a network rule. */}
      {findings.blocksPlainRequests && !findings.rateLimitedUs && !findings.botChallenge && (
        <section className="border-b border-rule py-8">
          <div className="border-l-2 border-fail bg-surface p-6">
            <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-fail">The HTTP test was refused</h2>
            <p className="mt-3 max-w-2xl leading-relaxed">
              The home page returned <span className="font-mono">{findings.agentStatus}</span> to the HTTP test&apos;s
              agent user-agent and <span className="font-mono">{findings.browserStatus}</span> to its Chrome user-agent.{' '}
              {findings.browserStatus >= 200 && findings.browserStatus < 400
                ? 'Only the user-agent differed.'
                : 'Both requests were refused; this test cannot establish whether the restriction targets agents.'}
            </p>
            <p className="mt-3 max-w-2xl leading-relaxed">
              The findings reflect what the scan could measure despite these refusals.
            </p>
          </div>
        </section>
      )}

      {fixPlan && <FixFirst plan={fixPlan} />}

      <ComparisonSection comparison={comparison} domain={report.domain} />

      <section className="border-b border-rule py-10">
        <h2 className="text-lg font-semibold tracking-tight">By stage</h2>
        <div className="mt-6 flex flex-col">
          {scorecard.stages.map((stage) => (
            <div key={stage.stage} className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-4 border-t border-rule py-3">
              <span className="font-mono text-sm text-brass">{stage.letter}</span>
              <div className="flex flex-col gap-1">
                <span className="font-mono text-sm font-medium">{stage.title}</span>
                <span className="text-xs text-ink-faint">{stage.question}</span>
              </div>
              <div className="flex items-center gap-3">
                {/* One track for every row. Zero gets a tick at the origin, because a filled
                    track for zero made 0/4 look fuller than 3/5. */}
                <div className="relative h-1.5 w-24 bg-sunken sm:w-40">
                  {stageShare(stage) === null ? null : stage.points === 0 ? (
                    <div className="absolute inset-y-0 left-0 w-0.5 bg-fail" />
                  ) : (
                    <div
                      className={`h-full ${stageShare(stage)! >= 0.67 ? 'bg-pass' : stageShare(stage)! >= 0.34 ? 'bg-warn' : 'bg-fail'}`}
                      style={{ width: `${stageShare(stage)! * 100}%` }}
                    />
                  )}
                </div>
                <span className="w-auto shrink-0 text-right font-mono text-sm tabular-nums sm:w-14">
                  {stage.measurable === 0 ? 'not measured' : `${stage.points}/${stage.measurable ?? stage.max}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-rule py-10">
        <h2 className="text-lg font-semibold tracking-tight">Every check</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Each row shows one HTTP observation under a published rule you can rerun.
          The front door and signup page can vary, so the scan requests those two three times and reports disagreements.
          Everything else is requested once.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          PASS and PART count toward the score. UNMEASURED means the scan could not evaluate the check; N/A means it does not apply.
          Both are excluded from the score and its denominator.{' '}
          <Link href="/methodology" className="text-brass underline underline-offset-4">
            See the formula
          </Link>
        </p>
        <div className="mt-6 flex flex-col">
          {STAGES.map((stage) => {
            const checks = scorecard.checks.filter((check) => check.stage === stage.id)
            return (
              <div key={stage.id} className="border-t border-rule py-4">
                <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">
                  {stage.letter} · {stage.title}
                </h3>
                <ul className="mt-3 flex flex-col gap-3">
                  {checks.map((check) => {
                    const tone = verdictTone(check)
                    // The correction renders on /v and in /corpus.json and did not render here,
                    // which is the address the email carries and the one `scorecardUrl` names. A
                    // row we already know is wrong went on saying it to the person most likely to
                    // be reading it about themselves.
                    const erratum = erratumFor(report.domain, check.id, scorecard.formulaVersion, check.detail)
                    return (
                      <li key={check.id} className="grid grid-cols-[3.2rem_minmax(0,1fr)] gap-4">
                        <span className={`font-mono text-xs font-semibold ${tone.className}`}>{tone.label}</span>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">{check.label}</span>
                          <span className="font-mono text-xs wrap-anywhere text-ink-soft">{check.detail}</span>
                          {check.points < check.max && !check.inconclusive && !check.notApplicable && (
                            <span className="text-xs italic text-ink-faint">{check.why}</span>
                          )}
                          {check.unblock && <span className="text-xs italic wrap-anywhere text-ink-faint">{check.unblock}</span>}
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
      </section>

      <section className="border-b border-rule py-10">
        <h2 className="text-lg font-semibold tracking-tight">What the scan found</h2>
        <dl className="mt-5 grid gap-x-8 gap-y-3 font-mono text-xs sm:grid-cols-2">
          {[
            ['Docs', withSource(findings.discovered.docs, findings.discovered.linkSources.docs)],
            ['Pricing', withSource(findings.discovered.pricing, findings.discovered.linkSources.pricing)],
            ['Signup', withSource(findings.discovered.signup, findings.discovered.linkSources.signup)],
            [
              'npm package',
              findings.discovered.npmPackage
                ? `${findings.discovered.npmPackage}${findings.discovered.npmSource === 'registry-search' ? ' (registry guess)' : ''}`
                : null,
            ],
            ['GitHub', findings.discovered.githubRepo],
            ['Package licence', findings.npm.license ?? null],
            // "none" is an answer, and we only have it when we read the file. With an unreadable
            // robots.txt these three rows printed "Blocked on-demand agents: none", which is a
            // clean bill of health produced from a file we never got.
            ['Crawl-delay', robotsUnreadable ? 'robots.txt unreadable' : findings.robots.crawlDelaySeconds ? `${findings.robots.crawlDelaySeconds}s` : 'none'],
            ['Content-Signal', robotsUnreadable ? 'robots.txt unreadable' : (findings.robots.contentSignal ?? 'none')],
            [
              'Blocked on-demand agents',
              robotsUnreadable
                ? 'robots.txt unreadable'
                : findings.robots.blockedByClass.user.length > 0
                  ? findings.robots.blockedByClass.user.join(', ')
                  : 'none',
            ],
          ].map(([label, value]) => (
            // Label over value, and the value wraps. A nowrap URL in a right-aligned cell
            // pushed "none" off the screen entirely, so rows read as missing data.
            <div key={label} className="flex min-w-0 flex-col gap-0.5 border-b border-rule py-2 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="text-ink-faint">{label}</dt>
              <dd className="min-w-0 break-all sm:text-right">
                {value ? (
                  typeof value === 'string' && value.startsWith('http') ? (
                    <>
                      <a href={value.split(' · ')[0]} className="text-brass underline underline-offset-4" rel="noreferrer">
                        {value.split(' · ')[0]}
                      </a>
                      {value.includes(' · ') && <span className="text-ink-faint"> · {value.split(' · ')[1]}</span>}
                    </>
                  ) : (
                    value
                  )
                ) : (
                  'not found'
                )}
              </dd>
            </div>
          ))}
        </dl>
        {findings.npm.license && !/^[A-Za-z0-9.+-]+$/.test(findings.npm.license) && (
          <div className="mt-6 border-l-2 border-warn bg-surface p-5">
            <p className="max-w-2xl leading-relaxed">
              Your package declares{' '}
              <span className="font-mono text-sm">{findings.npm.license}</span> instead of a plain licence identifier;
              the scan does not score this.
            </p>
            <p className="mt-3 max-w-2xl leading-relaxed">
              In six agent runs, every model encountering a licence key requirement dropped that vendor in one line, without opening the product.
              Those runs tested a comparable decision.{' '}
              <Link href="/findings" className="text-brass underline underline-offset-4">
                What the runs showed
              </Link>
            </p>
          </div>
        )}

        {!findings.funnel.signup.consistent && (
          <p className="mt-4 font-mono text-xs text-warn">
            The signup page answered inconsistently across three tries ({findings.funnel.signup.statusesSeen.join(', ')}).
          </p>
        )}
      </section>

      <section className="border-b border-rule py-12">
        <EmailGate
          domain={report.domain}
          reportId={report.id}
          failingCount={failing.length}
          hasUnmeasuredChecks={scorecard.checks.some((check) => check.inconclusive)}
          temporary={isHeldOnly(id)}
          privacyLinked={CONTROLLER_IS_NAMED}
        />
      </section>

      <section className="border-b border-rule py-10">
        <h2 className="text-lg font-semibold tracking-tight">Agent choices were not measured</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          The scan tests HTTP access and published files; it does not measure whether agents choose {report.domain}.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/audit"
            className="bg-ink px-5 py-3 font-mono text-sm text-ground transition-opacity hover:opacity-85"
          >
            Read the audits in full
          </Link>
          <Link
            href="/pricing"
            className="border border-ink/40 px-5 py-3 font-mono text-sm transition-colors hover:border-brass hover:text-brass"
          >
            Audit pricing for {report.domain}
          </Link>
        </div>
      </section>

    </main>
  )
}
