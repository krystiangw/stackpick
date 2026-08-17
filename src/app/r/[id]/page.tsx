import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { ComparisonSection } from '@/components/comparison'
import { buildComparison } from '@/lib/compare'
import { EmailGate } from '@/components/email-gate'
import { FixFirst } from '@/components/fix-first'
import { FunnelMark } from '@/components/funnel-mark'
import { buildFixPlan } from '@/lib/fixfirst'
import { getStore , heldReport, isHeldOnly } from '@/lib/store'
import { pickHeadline } from '@/lib/headline'
import { ShareRow } from '@/components/share-row'
import { CHECKS, STAGES, type ScoredCheck } from '@/lib/score'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const report = (await getStore().getReport(id)) ?? heldReport(id)
  if (!report) return { title: 'Scorecard not found: Let Agents In' }

  const headline = pickHeadline(report.findings, report.scorecard)
  return {
    // A page that disappears on the next deploy has no business in an index.
    ...(isHeldOnly(id) ? { robots: { index: false } } : {}),
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

function scaleAnchor(comparison: Awaited<ReturnType<typeof buildComparison>>, total: number): string | null {
  const peers = comparison.peers
  if (peers.length >= 3) {
    const scores = peers.map((peer) => peer.total).sort((a, b) => a - b)
    const middle = Math.floor(scores.length / 2)
    const median = scores.length % 2 === 0 ? (scores[middle - 1] + scores[middle]) / 2 : scores[middle]
    const best = peers[0]
    return `You ${total} · category median ${median} · best ${best.domain} ${best.total}`
  }
  if (comparison.percentile) {
    // Named, because unnamed it reads as a rank in your market and is not one. A reader whose
    // product is a SaaS for equity analysts was told he was ahead of 1 of 168, where all 168 are
    // developer tools we picked. That sentence sells; it does not diagnose.
    return `Higher than ${comparison.percentile.betterThan} of the ${comparison.percentile.outOf} domains we have scanned, which are developer tools we curated rather than your market`
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
  const report = (await getStore().getReport(id)) ?? heldReport(id)
  if (!report) notFound()

  const { scorecard, findings } = report
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
  const anchor = scaleAnchor(comparison, scorecard.total)
  // Charging a vendor for our blind spots is the rule the industry report already refuses to
  // apply to the market, and this is the page the vendor actually reads.
  const measurable = scorecard.measurable ?? scorecard.max
  const unmeasured = scorecard.max - measurable
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
            Our database is full and refused to store this scan, so the report is being held in memory and the
            address stops working the next time we deploy. The measurement itself is exactly the one everybody
            else gets. Save the page or run it again once we have sorted the storage out, and write to{' '}
            <a href="mailto:hello@letagentsin.com" className="text-brass underline underline-offset-4">
              hello@letagentsin.com
            </a>{' '}
            if you need a permanent copy sooner.
          </p>
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
                  {stage.measurable === 0 ? 'n/m' : `${stage.points}/${stage.measurable}`}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="mt-3 font-mono text-xs text-ink-faint">
          {unmeasured > 0
            ? `of the ${measurable} points that apply to you and we could measure · ${unmeasured} of ${scorecard.max} were not scored`
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

      {!looksLikeDeveloperProduct && (
        <section className="border-b border-rule py-8">
          <div className="border-l-2 border-warn bg-surface p-6">
            <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-warn">Probably the wrong yardstick</h2>
            <p className="mt-3 max-w-2xl leading-relaxed">
              We found no documentation, no SDK and no API description, so this may not be a product
              developers integrate. The formula measures whether an agent can adopt you as a building block.
              Judged as anything else, the score below is not meaningful.
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
              Your site took longer to read than the {Math.round(findings.truncation.budgetMs / 1000)} seconds a
              scan is allowed, so {findings.truncation.unmeasuredChecks.length} of the{' '}
              {scorecard.checks.length} checks never got their evidence and are marked unmeasurable rather than
              scored. The number above is out of what we did measure, so it is not a worse result, it is a
              smaller one. Scanning again usually finishes.
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
              <span className="font-mono text-sm">{findings.resolvedElsewhere.finalUrl}</span>, so everything
              below was measured on {findings.resolvedElsewhere.finalDomain}. That is worth knowing on its own:
              an agent asking for {findings.resolvedElsewhere.requestedDomain} ends up reading a different
              company&rsquo;s pages, and every sentence here names the host its number came from.
            </p>
          </div>
        </section>
      )}

      {findings.rateLimitedUs && (
        <section className="border-b border-rule py-8">
          <div className="border-l-2 border-warn bg-surface p-6">
            <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-warn">We were rate limited</h2>
            <p className="mt-3 max-w-2xl leading-relaxed">
              Every request we made was answered with 429. That is either a limit we triggered or a gate on the
              network we scan from, and we cannot tell those apart from here. Either way it is not a measurement
              of how you treat agents, so the checks that depended on reading you are marked unmeasurable rather
              than failed.
            </p>
          </div>
        </section>
      )}

      {/* Not when one of the tries answered: the box would say no agent gets in while the check
          above it passes the vendor for having let us in. name.com answered (200, 429, 429). */}
      {findings.botChallenge && !findings.agentStatusesSeen?.some((status) => status >= 200 && status < 400) && (
        <section className="border-b border-rule py-8">
          <div className="border-l-2 border-fail bg-surface p-6">
            <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-fail">A challenge, not a limit</h2>
            <p className="mt-3 max-w-2xl leading-relaxed">
              Your edge answered <span className="font-mono">{findings.agentStatus}</span> and asked the caller to
              run JavaScript to prove it is a browser. A person never sees it. No agent can pass it, because an
              agent is an HTTP client, so this is the one wall on this page that stops the funnel before any of it
              starts. We score it rather than excusing it as our own traffic: everything below was measured
              through it and is a floor, not a ceiling.
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
            <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-fail">Blocked at the door</h2>
            <p className="mt-3 max-w-2xl leading-relaxed">
              The home page answered <span className="font-mono">{findings.agentStatus}</span> to a request
              identifying itself as an agent, and{' '}
              <span className="font-mono">{findings.browserStatus}</span> to the same request sent as Chrome.{' '}
              {findings.browserStatus >= 200 && findings.browserStatus < 400
                ? 'The user-agent was the only difference between them.'
                : 'Both were refused, so this reads as an edge rule about where the request came from rather than about agents.'}{' '}
              Everything below was measured through that wall and is a floor, not a ceiling.
            </p>
          </div>
        </section>
      )}

      {fixPlan && <FixFirst plan={fixPlan} />}

      {/* Directly under the fix list, which is the only moment on this page where the reader is
          holding something they would forward to somebody else. It used to sit last, after ten
          sections and the whole evidence table, which is a form placed where the intent it needs
          has already gone. The score and every piece of evidence stay ungated above and below it:
          the corpus is public and the formula is published, so gating the number would cost us
          the thing that makes it worth reading and buy nothing. */}
      <section className="border-b border-rule py-12">
        <EmailGate domain={report.domain} reportId={report.id} failingCount={failing.length} />
      </section>

      {/* The one sentence that separates a scan from an audit, at the only moment the reader
          is holding a list of things to do and wondering whether any of it changes behaviour. */}
      <section className="border-b border-rule py-10">
        <h2 className="text-lg font-semibold tracking-tight">None of this tells you whether an agent picked you</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Everything above is a file an agent could read. Whether one actually chose you is a different
          measurement, and we have not run it on {report.domain}. What we have run it on is a rich text editor
          vendor: six agents, one brief, six isolated copies of a real codebase. All six picked the same
          competitor, and the vendor being studied was never named, not even on a rejection list, while the runs
          named and dismissed ten alternatives between them. In an earlier round, run before we isolated the
          copies, it was named twice and struck off both times in four words:{' '}
          <span className="font-mono text-sm text-ink">Fully commercial, licence key required.</span> That study
          is about them, not about you. It is here because it is the difference between a file and a decision.
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
            What the same run on {report.domain} costs
          </Link>
        </div>
      </section>

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
                  {stage.measurable === 0 ? 'not measured' : `${stage.points}/${stage.measurable}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-rule py-10">
        <h2 className="text-lg font-semibold tracking-tight">Every check</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Each line is one HTTP observation with a published rule, so you can rerun any of them yourself.
          Most are the same tomorrow if you are: the two that are not are the bot gate and the pricing page,
          which answer inconsistently on their own, which is why those run more than once and say so when the
          tries disagreed. PASS and PART are counted. UNMEASURED means we could not
          evaluate it, N/A means it does not apply to a product like yours, and neither is in the score or
          its denominator.{' '}
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
        <h2 className="text-lg font-semibold tracking-tight">What we discovered on the way</h2>
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
            ['Crawl-delay', findings.robots.crawlDelaySeconds ? `${findings.robots.crawlDelaySeconds}s` : 'none'],
            ['Content-Signal', findings.robots.contentSignal ?? 'none'],
            [
              'Blocked on-demand agents',
              findings.robots.blockedByClass.user.length > 0 ? findings.robots.blockedByClass.user.join(', ') : 'none',
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
              <span className="font-mono text-sm">{findings.npm.license}</span> rather than a plain licence
              identifier. We do not score this, because a commercial licence is a business model, not a defect.
              We report it because in six agent runs on a comparable decision, every model that hit a licence
              key requirement dropped that vendor in one line, without opening the product.{' '}
              <Link href="/findings" className="text-brass underline underline-offset-4">
                What the runs showed
              </Link>
            </p>
          </div>
        )}

        {!findings.funnel.signup.consistent && (
          <p className="mt-4 font-mono text-xs text-warn">
            The signup page answered inconsistently across three tries ({findings.funnel.signup.statusesSeen.join(', ')}).
            Bot gates do that, and an agent hitting the wrong try simply leaves.
          </p>
        )}
      </section>

    </main>
  )
}
