import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ComparisonSection } from '@/components/comparison'
import { buildComparison } from '@/lib/compare'
import { EmailGate } from '@/components/email-gate'
import { getStore } from '@/lib/store'
import { pickHeadline } from '@/lib/headline'
import { STAGES, type ScoredCheck } from '@/lib/score'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const report = await getStore().getReport(id)
  if (!report) return { title: 'Scorecard not found — StackPick' }

  const headline = pickHeadline(report.findings, report.scorecard)
  return {
    title: `${report.domain}: agent readiness ${report.scorecard.total}/${report.scorecard.max}`,
    description: headline.claim,
    openGraph: {
      title: `${report.domain} · ${report.scorecard.total}/${report.scorecard.max}`,
      description: headline.claim,
    },
    twitter: { card: 'summary_large_image' },
  }
}

function verdictTone(check: ScoredCheck) {
  if (check.points === check.max) return { label: 'PASS', className: 'text-pass' }
  if (check.inconclusive) return { label: 'N/A', className: 'text-ink-faint' }
  if (check.points > 0) return { label: 'PART', className: 'text-warn' }
  return { label: 'FAIL', className: 'text-fail' }
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const report = await getStore().getReport(id)
  if (!report) notFound()

  const { scorecard, findings } = report
  // A check we could not measure is not a failure we can charge someone for.
  const failing = scorecard.checks.filter((check) => check.points < check.max && !check.inconclusive)
  const scanned = new Date(report.scannedAt)
  // The formula assumes a product a developer integrates. Saying so beats scoring a
  // newspaper against an SDK checklist and letting the number imply it failed.
  const looksLikeDeveloperProduct =
    Boolean(findings.discovered.docs) || Boolean(findings.npm.package) || findings.machine.openapi.length > 0
  const headline = pickHeadline(findings, scorecard)
  const comparison = await buildComparison(report)

  return (
    <main className="mx-auto max-w-5xl px-6">
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
                scorecard.total <= scorecard.max / 3 ? 'text-fail' : scorecard.total >= (scorecard.max * 2) / 3 ? 'text-pass' : 'text-warn'
              }`}
            >
              {scorecard.total}
            </span>
            <span className="text-lg text-ink-faint">/ {scorecard.max}</span>
          </div>
          <dl className="flex flex-wrap gap-x-8 gap-y-2 font-mono text-xs">
            {scorecard.stages.map((stage) => (
              <div key={stage.stage} className="flex flex-col gap-0.5">
                <dt className="text-ink-faint">{stage.letter} · {stage.title}</dt>
                <dd
                  className={`tabular-nums ${
                    stage.points / stage.max >= 0.67 ? 'text-pass' : stage.points / stage.max >= 0.34 ? 'text-warn' : 'text-fail'
                  }`}
                >
                  {stage.points}/{stage.max}
                </dd>
              </div>
            ))}
          </dl>
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

      {findings.blocksPlainRequests && (
        <section className="border-b border-rule py-8">
          <div className="border-l-2 border-fail bg-surface p-6">
            <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-fail">Blocked at the door</h2>
            <p className="mt-3 max-w-2xl leading-relaxed">
              The home page answered <span className="font-mono">{findings.homeStatus}</span> to an ordinary HTTP
              request. An agent sends exactly that request, so for a large share of them this site does not exist.
              Everything below was measured through that wall and is a floor, not a ceiling.
            </p>
          </div>
        </section>
      )}

      <ComparisonSection comparison={comparison} domain={report.domain} />

      <section className="border-b border-rule py-10">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">By stage</h2>
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
                  {stage.points === 0 ? (
                    <div className="absolute inset-y-0 left-0 w-0.5 bg-fail" />
                  ) : (
                    <div
                      className={`h-full ${stage.points / stage.max >= 0.67 ? 'bg-pass' : stage.points / stage.max >= 0.34 ? 'bg-warn' : 'bg-fail'}`}
                      style={{ width: `${(stage.points / stage.max) * 100}%` }}
                    />
                  )}
                </div>
                <span className="w-12 text-right font-mono text-sm tabular-nums">
                  {stage.points}/{stage.max}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-rule py-10">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Every check</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Each line is one HTTP observation with a published rule. Scan the same domain tomorrow and, unless
          it changed, you get the same answer. Anything marked N/A scored zero because we could not measure
          it, not because it is absent.{' '}
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
                      <li key={check.id} className="grid grid-cols-[3.2rem_1fr] gap-4">
                        <span className={`font-mono text-xs font-semibold ${tone.className}`}>{tone.label}</span>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">{check.label}</span>
                          <span className="font-mono text-xs text-ink-soft">{check.detail}</span>
                          {check.points < check.max && !check.inconclusive && (
                            <span className="text-xs italic text-ink-faint">{check.why}</span>
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
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">What we discovered on the way</h2>
        <dl className="mt-5 grid gap-x-8 gap-y-3 font-mono text-xs sm:grid-cols-2">
          {[
            ['Docs', findings.discovered.docs],
            ['Pricing', findings.discovered.pricing],
            ['Signup', findings.discovered.signup],
            [
              'npm package',
              findings.discovered.npmPackage
                ? `${findings.discovered.npmPackage}${findings.discovered.npmSource === 'registry-search' ? ' (registry guess)' : ''}`
                : null,
            ],
            ['GitHub', findings.discovered.githubRepo],
            ['Crawl-delay', findings.robots.crawlDelaySeconds ? `${findings.robots.crawlDelaySeconds}s` : 'none'],
            ['Content-Signal', findings.robots.contentSignal ?? 'none'],
            [
              'Blocked on-demand agents',
              findings.robots.blockedByClass.user.length > 0 ? findings.robots.blockedByClass.user.join(', ') : 'none',
            ],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-rule py-2">
              <dt className="text-ink-faint">{label}</dt>
              <dd className="truncate text-right">{value || 'not found'}</dd>
            </div>
          ))}
        </dl>
        {!findings.funnel.signup.consistent && (
          <p className="mt-4 font-mono text-xs text-warn">
            The signup page answered inconsistently across three tries ({findings.funnel.signup.statusesSeen.join(', ')}).
            Bot gates do that, and an agent hitting the wrong try simply leaves.
          </p>
        )}
      </section>

      <section className="py-12">
        <EmailGate domain={report.domain} reportId={report.id} failingCount={failing.length} />
      </section>
    </main>
  )
}
