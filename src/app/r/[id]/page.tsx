import Link from 'next/link'
import { notFound } from 'next/navigation'
import { EmailGate } from '@/components/email-gate'
import { getStore } from '@/lib/store'
import { STAGES, type ScoredCheck } from '@/lib/score'

export const dynamic = 'force-dynamic'

function verdictTone(check: ScoredCheck) {
  if (check.points === check.max) return { label: 'PASS', className: 'text-pass' }
  if (check.points > 0) return { label: 'PART', className: 'text-warn' }
  return { label: 'FAIL', className: 'text-fail' }
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const report = await getStore().getReport(id)
  if (!report) notFound()

  const { scorecard, findings } = report
  const failing = scorecard.checks.filter((check) => check.points < check.max)
  const scanned = new Date(report.scannedAt)

  return (
    <main className="mx-auto max-w-5xl px-6">
      <section className="border-b border-rule py-12">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">Agent readiness scorecard</p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-mono text-3xl font-semibold tracking-tight sm:text-4xl">{report.domain}</h1>
            <p className="mt-2 font-mono text-xs text-ink-faint">
              Scanned {scanned.toISOString().slice(0, 16).replace('T', ' ')} UTC · formula v
              {scorecard.formulaVersion} · {(findings.durationMs / 1000).toFixed(1)}s
            </p>
          </div>
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
        </div>
      </section>

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
                {/* A zero-width bar reads as "no data". A full faint bar reads as "nothing passed". */}
                <div className={`h-1.5 w-24 sm:w-40 ${stage.points === 0 ? 'bg-fail/25' : 'bg-sunken'}`}>
                  <div
                    className={`h-full ${stage.points === stage.max ? 'bg-pass' : 'bg-warn'}`}
                    style={{ width: `${(stage.points / stage.max) * 100}%` }}
                  />
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
          it changed, you get the same answer.{' '}
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
                          {check.points < check.max && (
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
            ['npm package', findings.discovered.npmPackage],
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
