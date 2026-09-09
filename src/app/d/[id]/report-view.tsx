import type { ReactNode } from 'react'
import { AgentCoverageNotice } from '@/components/agent-coverage-notice'
import { agentLabel, modelLabel, AGENT_SAMPLE_LIMIT } from '@/lib/agent-label'
import type { ReportModel } from '@/lib/client-report-model'
import { readsAsPolish } from '@/lib/vendors'
import { RECOMMENDATION_LABELS, RECOMMENDATION_LIMIT, UNREVIEWED_RECOMMENDATIONS } from '@/lib/recommendation-review'
import { BRIEF_LABELS, BRIEF_LIMIT, UNREVIEWED_BRIEF } from '@/lib/report-brief'

/**
 * The delivered report as a page somebody can take into a meeting.
 *
 * The markdown is what a buyer forwards; this is what they show. Same numbers, from the same
 * object, because the document and the page disagreeing about a count is the one failure this
 * whole product cannot survive.
 *
 * Bars are divs and the type is the site's own. Nothing is imported to draw a chart: a report that
 * needs a charting library to say "0 of 10" is decoration standing where evidence should be.
 */

const share = (points: number, of: number) => (of === 0 ? 0 : Math.round((points / of) * 100))

/**
 * An agent writes markdown, so its sentences arrive carrying `**` and backticks. Printed raw inside
 * a designed page they read as a document somebody forgot to finish, and stripping them would
 * silently edit a quotation. Rendered, the emphasis is the agent's own.
 */
function Quoted({ said }: { said: string }) {
  const parts: ReactNode[] = []
  const pattern = /\*\*([^*]+)\*\*|`([^`]+)`/g
  let at = 0
  let match: RegExpExecArray | null
  let index = 0
  while ((match = pattern.exec(said))) {
    if (match.index > at) parts.push(said.slice(at, match.index))
    index += 1
    if (match[1]) parts.push(<strong key={index} className="font-semibold">{match[1]}</strong>)
    else parts.push(<code key={index} className="font-mono text-[0.95em]">{match[2]}</code>)
    at = match.index + match[0].length
  }
  if (at < said.length) parts.push(said.slice(at))
  return <>{parts}</>
}

function Bar({ points, of, tone }: { points: number; of: number; tone: 'pass' | 'fail' | 'brass' }) {
  const filled = share(points, of)
  const colour = tone === 'pass' ? 'bg-pass' : tone === 'fail' ? 'bg-fail' : 'bg-brass'
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-sunken print:border print:border-rule">
      <div className={`h-full ${colour}`} style={{ width: `${filled}%` }} />
    </div>
  )
}

export function ReportView({ model }: { model: ReportModel }) {
  const { score, named } = model
  const missed = named.of - named.named
  const strongest = [...model.rivals].sort((a, b) => b.named - a.named)[0] ?? null
  const winnerQuotes = model.quotes.filter((quote) => quote.about === 'winner')
  const yourQuotes = model.quotes.filter((quote) => quote.about === 'you')

  return (
    <article className="report-reading print:text-[11pt]">
      <header className="border-b border-rule pb-8 pt-6 sm:pt-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">{model.category}</p>
        <h1 className="mt-3 break-words text-3xl font-semibold tracking-tight sm:text-4xl">{model.domain}</h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-soft">
          Agent mentions for the tested question and scan results for public pages.
        </p>
      </header>

      <section className="mt-6 rounded-lg border border-rule bg-surface p-4 sm:p-6">
        <h2 className="text-xl font-semibold tracking-tight">The task tested</h2>
        {model.question ? (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium">Read the exact question</summary>
            <blockquote className="mt-3 max-w-3xl border-l-2 border-brass pl-4 leading-relaxed text-ink">
              {model.question}
            </blockquote>
          </details>
        ) : <p className="mt-4 text-ink-soft">No buying question is recorded for this report.</p>}
        {model.briefReview ? (
          <div className="mt-4 text-sm leading-relaxed text-ink-soft">
            <p className="font-semibold text-ink">{BRIEF_LABELS[model.briefReview.status]}</p>
            <p className="mt-2">{BRIEF_LIMIT}</p>
            <details className="mt-4 border-t border-rule pt-3">
              <summary className="cursor-pointer font-medium">Question review and sources</summary>
              <div className="mt-3 space-y-3">
                <p>{model.briefReview.rationale}</p>
                <ul className="space-y-2">{model.briefReview.sources.map((source, index) => <li key={`${source.url}-${index}`}><a href={source.url} className="text-brass underline underline-offset-4">{source.note}</a></li>)}</ul>
                <p><strong className="text-ink">Next step:</strong> {model.briefReview.nextStep}</p>
                <p>Reviewed {model.briefReview.reviewedAt}.</p>
              </div>
            </details>
          </div>
        ) : <p className="mt-5 text-sm leading-relaxed text-ink-soft">{UNREVIEWED_BRIEF}</p>}
      </section>

      {/* The two numbers a reader takes away, side by side, because they answer different questions
          and a report that leads with one of them gets quoted as if the other did not exist. */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:gap-6">
        {/* No runs held is not zero mentions. A category we have not run yet would otherwise be
            published as a finding about the vendor, which is the opposite of what happened. */}
        <div className="rounded-lg border border-rule bg-surface p-4 sm:p-6">
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">Named by an agent</p>
          {model.runs.length === 0 ? (
            <>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-ink-soft">Not yet answered</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                No agent runs are available for this category yet.
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 text-3xl font-semibold sm:text-5xl tabular-nums tracking-tight">
                {named.named}
                <span className="text-base text-ink-faint sm:text-2xl"> / {named.of} runs</span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {named.named === 0
                  ? 'These counts apply to this question and the recorded setup.'
                  : `Named first in ${named.first} of them.`}
              </p>
              <div className="mt-4">
                <Bar points={named.named} of={named.of} tone={named.named === 0 ? 'fail' : 'pass'} />
              </div>
            </>
          )}
        </div>
        <div className="rounded-lg border border-rule bg-surface p-4 sm:p-6">
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">Scan score</p>
          <p className="mt-3 text-3xl font-semibold sm:text-5xl tabular-nums tracking-tight">
            {score.total}
            <span className="text-base text-ink-faint sm:text-2xl"> / {score.measurable}</span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Measurable points under formula v{model.formulaVersion}. Scanned {model.scannedAt.slice(0, 10)}.
            {model.formulaNow ? ` The scanner now runs v${model.formulaNow}.` : ''}
          </p>
          <div className="mt-4">
            <Bar points={score.total} of={score.measurable} tone={share(score.total, score.measurable) >= 60 ? 'pass' : 'fail'} />
          </div>
        </div>
      </section>

      <AgentCoverageNotice batches={model.runAvailability ?? []} />
      <nav aria-label="Report sections" className="mt-5 flex flex-wrap gap-2 text-sm print:hidden">
        <a href="#report-next" className="nav-link border border-rule">Next steps</a>
        <a href="#report-runs" className="nav-link border border-rule">Agent evidence</a>
        <a href="#report-scan" className="nav-link border border-rule">Scan details</a>
      </nav>

      <section id="report-next" className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">Reviewed next steps</h2>
        {model.recommendationReview ? (
          <>
            <p className="mt-3 max-w-3xl leading-relaxed text-ink-soft">{model.recommendationReview.summary}</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-faint">Reviewed {model.recommendationReview.reviewedAt}. {RECOMMENDATION_LIMIT}</p>
            <div className="mt-6 space-y-5">
              {model.recommendationReview.items.map((item) => (
                <div key={item.title} className="break-inside-avoid rounded-lg border border-rule bg-surface p-5">
                  <p className="font-mono text-xs text-brass">{RECOMMENDATION_LABELS[item.disposition]}</p>
                  <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft"><strong className="text-ink">Next step:</strong> {item.nextStep}</p>
                  <details className="mt-4 border-t border-rule pt-3">
                    <summary className="cursor-pointer text-sm font-medium">Evidence and how to validate</summary>
                    <p className="mt-3 text-sm leading-relaxed text-ink-soft"><strong className="text-ink">Observation:</strong> {item.finding}</p>
                    <p className="mt-3 text-sm leading-relaxed text-ink-soft"><strong className="text-ink">Validation:</strong> {item.validation}</p>
                    <ul className="mt-3 space-y-2 text-sm">
                      {item.sources.map((source, index) => <li key={`${source.url}-${index}`}><a className="text-brass underline underline-offset-4" href={source.url}>{source.note}</a></li>)}
                    </ul>
                  </details>
                </div>
              ))}
            </div>
          </>
        ) : <p className="mt-3 max-w-3xl leading-relaxed text-ink-soft">{UNREVIEWED_RECOMMENDATIONS}</p>}
      </section>

      {model.rivals.length > 0 && (
        <section className="mt-12 break-inside-avoid">
          <h2 className="text-xl font-semibold tracking-tight">Other vendors named</h2>
          <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
            Mention counts for the tested question.
          </p>
          <div className="mt-6 space-y-4">
            {[{ domain: model.domain, named: named.named, first: named.first, clear: true, you: true }, ...model.rivals.map((rival) => ({ ...rival, you: false }))]
              .sort((a, b) => b.named - a.named)
              .map((row) => (
                <div key={row.domain}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className={`font-mono text-sm ${row.you ? 'font-semibold text-brass' : 'text-ink-soft'}`}>
                      {row.domain}
                      {row.you ? ' (you)' : ''}
                    </p>
                    <p className="font-mono text-sm tabular-nums text-ink-faint">
                      {row.named}/{named.of} named · {row.first} first
                      {!row.you && !row.clear ? ' · one-run gap' : ''}
                    </p>
                  </div>
                  <div className="mt-1">
                    <Bar points={row.named} of={named.of} tone={row.you ? 'brass' : 'pass'} />
                  </div>
                </div>
              ))}
          </div>
          {strongest && missed > 0 && (
            <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
              A one-run gap in this sample of {named.of} does not establish a rank.
            </p>
          )}
        </section>
      )}

      {winnerQuotes.length > 0 && (
        <section className="mt-12 break-inside-avoid rounded-lg border border-brass bg-brass-soft p-6">
          <h2 className="text-xl font-semibold tracking-tight">Quotes about the vendor named first</h2>
          <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
            Quotes about {winnerQuotes[0].who} from runs that named it first.
          </p>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium">Read {winnerQuotes.length} quoted excerpts</summary>
          <ul className="mt-5 space-y-4">
            {winnerQuotes.map((quote) => (
              <li key={`${agentLabel(quote.tool)}-${quote.run}`} className="border-l-2 border-brass pl-4">
                <p className="leading-relaxed text-ink">
                  “<Quoted said={quote.said} />”
                </p>
                <p className="mt-1 font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">
                  {agentLabel(quote.tool)} · run {quote.run}
                  {readsAsPolish(quote.said) ? ' · in Polish' : ''}
                </p>
              </li>
            ))}
          </ul>
          </details>
        </section>
      )}

      {yourQuotes.length > 0 && (
        <section className="mt-12 break-inside-avoid">
          <h2 className="text-xl font-semibold tracking-tight">What the runs said about you</h2>
          <ul className="mt-5 space-y-4">
            {yourQuotes.map((quote) => (
              <li key={`${agentLabel(quote.tool)}-${quote.run}`} className="border-l-2 border-rule pl-4">
                <p className="leading-relaxed text-ink">
                  “<Quoted said={quote.said} />”
                </p>
                <p className="mt-1 font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">
                  {agentLabel(quote.tool)} · run {quote.run}
                  {readsAsPolish(quote.said) ? ' · in Polish' : ''}
                </p>
              </li>
            ))}
          </ul>
          {/* The same sentence the markdown carries. Two renderings of one document, and only one of
              them saying the quote is in another language, is the drift this codebase keeps finding
              in its own scoring: one fact, two places, and the second one silently wrong. */}
          {yourQuotes.filter((quote) => readsAsPolish(quote.said)).length > 0 && (
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-soft">
              {yourQuotes.filter((quote) => readsAsPolish(quote.said)).length} of these quotes are in Polish, as requested
              by the operator instructions available to those runs. Quotes retain their original language; a translated quote is our
              sentence, not the agent&apos;s.
            </p>
          )}
          {/* Fewer quotes than runs that named you is a difference a reader counts, and without the
              reason the page looks as if answers went missing. */}
          {named.named - yourQuotes.length > 0 && (
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-soft">
              {named.named - yourQuotes.length} of the runs that named you did so only in a table or a list of links,
              with no sentence about you to quote.
            </p>
          )}
        </section>
      )}

      <section id="report-runs" className="mt-10 break-inside-avoid">
        <h2 className="text-xl font-semibold tracking-tight">What we ran</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <thead>
              <tr className="text-left font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">
                <th className="border-b border-rule pb-2">Tool</th>
                <th className="border-b border-rule pb-2">Recorded model</th>
                <th className="border-b border-rule pb-2 text-right">Runs</th>
                <th className="border-b border-rule pb-2 text-right">Named you</th>
                <th className="border-b border-rule pb-2 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {model.runs.map((run) => (
                <tr key={`${run.tool}-${run.ran}`}>
                  <td className="border-b border-rule py-2 font-mono">
                    {agentLabel(run.tool)} {run.version}
                  </td>
                  <td className="border-b border-rule py-2 font-mono">{modelLabel(run.model)}</td>
                  <td className="border-b border-rule py-2 text-right tabular-nums">{run.count}</td>
                  <td className="border-b border-rule py-2 text-right tabular-nums">{run.named}</td>
                  <td className="border-b border-rule py-2 text-right font-mono text-ink-faint">{run.ran}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-soft">{AGENT_SAMPLE_LIMIT}</p>
        {model.runs.some(run => run.model === 'auto') && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-soft">Cursor Auto selected the underlying model; the CLI did not disclose its identity.</p>}
        {model.runs.some(run => run.settings?.length) && <details className="mt-4 rounded-lg border border-rule p-4"><summary className="cursor-pointer text-sm font-medium">Recorded tool settings</summary><ul className="mt-3 space-y-3 text-sm text-ink-soft">{model.runs.filter(run => run.settings?.length).map(run => <li key={`${run.tool}-${run.model}-${run.ran}`}><strong>{agentLabel(run.tool)} · {run.ran}:</strong> {run.settings!.join('; ')}.</li>)}</ul></details>}
        {/* Both caveats travel with the numbers or they do not travel at all. The markdown carries
            them; a prettier rendering that quietly drops them is the worst version of this page. */}
        {model.guest && (
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-soft">
            You were outside the original provider list; the question, sessions and answers were not rerun, and every
            provider&apos;s count was recomputed with your domain and any supplied brand included in matching.
          </p>
        )}
        {model.missedByWord > 0 && (
          <p className="mt-5 max-w-2xl border-l-2 border-warn pl-4 text-sm leading-relaxed text-ink-soft">
            {model.missedByWord} of these answers use your name as a word without naming {model.domain}, and we did
            not count them.
          </p>
        )}
        {model.runsUrl && (
          <p className="mt-4 font-mono text-sm">
            <a href={model.runsUrl} className="text-brass underline underline-offset-4">
              Raw runs
            </a>
          </p>
        )}
        {model.runs.some((run) => !run.blind) && (
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
            The tools ran on one laptop;{' '}
            {[...new Set(model.runs.filter((run) => !run.blind).map((run) => run.tool))].join(', ')} could read local
            operator instructions.
          </p>
        )}
      </section>

      <section id="report-scan" className="mt-10 break-before-page break-inside-avoid">
        <h2 className="text-xl font-semibold tracking-tight">Scan stages</h2>
        <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
          The scan measures HTTP responses and public-page text; it does not test a completed integration.
        </p>
        <div className="mt-6 space-y-5">
          {model.stages.map((stage) => (
            <div key={stage.title}>
              {/* A stage where nothing could be measured is not a stage scoring zero, and drawing
                  an empty bar beside "0/0" is the version of this page that accuses by layout. */}
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-medium">{stage.title}</p>
                <p className="font-mono text-sm tabular-nums text-ink-faint">
                  {stage.measurable === 0 ? 'nothing measurable' : `${stage.points}/${stage.measurable}`}
                </p>
              </div>
              <p className="mt-1 text-sm text-ink-soft">{stage.question}</p>
              {stage.measurable > 0 && (
                <div className="mt-2">
                  <Bar
                    points={stage.points}
                    of={stage.measurable}
                    tone={share(stage.points, stage.measurable) >= 60 ? 'pass' : 'fail'}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {model.failing.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">Recorded scan observations</h2>
          <p className="mt-2 text-sm text-ink-soft">These are the original automated observations. The review above qualifies their interpretation.</p>
          <div className="mt-6 space-y-4">
            {model.failing.map((check) => (
              <details key={check.label} className="report-check break-inside-avoid rounded-lg border border-rule bg-surface p-4">
                <summary className="flex cursor-pointer items-baseline justify-between gap-4">
                  <p className="font-medium text-ink">{check.label}</p>
                  <p className="font-mono text-sm tabular-nums text-fail">
                    {check.points}/{check.max}
                  </p>
                </summary>
                <p className="mt-3 break-words text-sm leading-relaxed text-ink-soft">{check.detail}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {model.notApplicable.length > 0 && (
        <section className="mt-12 break-inside-avoid">
          <h2 className="text-xl font-semibold tracking-tight">Inapplicable checks</h2>
          <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
            Inapplicable points are excluded from the score denominator.
          </p>
          <details className="mt-4 rounded-lg border border-rule p-4">
            <summary className="cursor-pointer text-sm font-medium">Read {model.notApplicable.length} check details</summary>
          <ul className="mt-5 space-y-3">
            {model.notApplicable.map((check) => (
              <li key={check.label} className="border-l-2 border-rule pl-4">
                <p className="font-medium text-ink">{check.label}</p>
                <p className="mt-1 break-words text-sm leading-relaxed text-ink-soft">{check.detail}</p>
              </li>
            ))}
          </ul>
          </details>
        </section>
      )}

      {model.unmeasured.length > 0 && (
        <section className="mt-12 break-inside-avoid">
          <h2 className="text-xl font-semibold tracking-tight">What we could not measure</h2>
          <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
            Unmeasured points are excluded from the score denominator.
          </p>
          <details className="mt-4 rounded-lg border border-rule p-4">
            <summary className="cursor-pointer text-sm font-medium">Read {model.unmeasured.length} check details</summary>
          <ul className="mt-5 space-y-3">
            {model.unmeasured.map((check) => (
              <li key={check.label} className="border-l-2 border-rule pl-4">
                <p className="font-medium text-ink">{check.label}</p>
                <p className="mt-1 break-words text-sm leading-relaxed text-ink-soft">{check.detail}</p>
              </li>
            ))}
          </ul>
          </details>
        </section>
      )}
      {/* The limits travel with the numbers. A rendering that drops them is a rendering that
          promises more than the method does. */}
      <section className="mt-12 break-inside-avoid border-t border-rule pt-8">
        <h2 className="text-xl font-semibold tracking-tight">Limits</h2>
        <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
          This report does not rank vendors or show that a fix changes agent choices. Only two checks correlate with
          being named; see the <a href="/findings" className="text-brass underline underline-offset-4">findings</a>.
          You can reproduce the scan using the published formula and check the counts against the printed question
          and quoted answers.
        </p>
      </section>
    </article>
  )
}
