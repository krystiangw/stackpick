import type { ReportModel } from '@/lib/client-report-model'

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
    <article className="print:text-[11pt]">
      <header className="border-b border-rule pb-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">{model.category}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">{model.domain}</h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-soft">
          What an AI agent does with you: whether it names you at all, and whether it could use you once it does.
        </p>
      </header>

      {/* The two numbers a reader takes away, side by side, because they answer different questions
          and a report that leads with one of them gets quoted as if the other did not exist. */}
      <section className="mt-8 grid gap-6 sm:grid-cols-2">
        {/* No runs held is not zero mentions. A category we have not run yet would otherwise be
            published as a finding about the vendor, which is the opposite of what happened. */}
        <div className="rounded-lg border border-rule bg-surface p-6">
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">Named by an agent</p>
          {model.runs.length === 0 ? (
            <>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-ink-soft">Not yet answered</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                We hold no agent runs for this category yet, so this half is unanswered rather than negative.
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 text-5xl font-semibold tabular-nums tracking-tight">
                {named.named}
                <span className="text-2xl text-ink-faint"> / {named.of} runs</span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {named.named === 0
                  ? 'No run named you. That is an absence, not a bad review.'
                  : `Named first in ${named.first} of them.`}
              </p>
              <div className="mt-4">
                <Bar points={named.named} of={named.of} tone={named.named === 0 ? 'fail' : 'pass'} />
              </div>
            </>
          )}
        </div>
        <div className="rounded-lg border border-rule bg-surface p-6">
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">Usable once named</p>
          <p className="mt-3 text-5xl font-semibold tabular-nums tracking-tight">
            {score.total}
            <span className="text-2xl text-ink-faint"> / {score.measurable}</span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Measurable points under formula v{model.formulaVersion}. Scanned {model.scannedAt.slice(0, 10)}.
            {model.formulaNow ? ` The scanner now runs v${model.formulaNow}, so a rescan can move this.` : ''}
          </p>
          <div className="mt-4">
            <Bar points={score.total} of={score.measurable} tone={share(score.total, score.measurable) >= 60 ? 'pass' : 'fail'} />
          </div>
        </div>
      </section>

      {model.rivals.length > 0 && (
        <section className="mt-12 break-inside-avoid">
          <h2 className="text-xl font-semibold tracking-tight">Who the agent named instead</h2>
          <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
            The same {named.of} runs, the same question, read by the same rule.
          </p>
          <div className="mt-6 space-y-4">
            {[{ domain: model.domain, named: named.named, first: named.first, clear: true, you: true }, ...model.rivals.map((rival) => ({ ...rival, you: false }))]
              .sort((a, b) => b.named - a.named)
              .map((row) => (
                <div key={row.domain}>
                  <div className="flex items-baseline justify-between gap-4">
                    <p className={`font-mono text-sm ${row.you ? 'font-semibold text-brass' : 'text-ink-soft'}`}>
                      {row.domain}
                      {row.you ? ' (you)' : ''}
                    </p>
                    <p className="font-mono text-sm tabular-nums text-ink-faint">
                      {row.named}/{named.of} named · {row.first} first
                      {!row.you && !row.clear ? ' · inside the noise' : ''}
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
              {strongest.domain} was named in {strongest.named} of the runs you were named in {named.named}. A single
              mention apart is inside what {named.of} runs can separate, and the rows where that is the case are marked
              above rather than presented as a lead.
            </p>
          )}
        </section>
      )}

      {winnerQuotes.length > 0 && (
        <section className="mt-12 break-inside-avoid rounded-lg border border-brass bg-brass-soft p-6">
          <h2 className="text-xl font-semibold tracking-tight">What being chosen sounded like</h2>
          <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
            The runs&apos; own words about {winnerQuotes[0].who}. This is the wording your pages have to answer.
          </p>
          <ul className="mt-5 space-y-4">
            {winnerQuotes.map((quote) => (
              <li key={`${quote.tool}-${quote.run}`} className="border-l-2 border-brass pl-4">
                <p className="leading-relaxed text-ink">“{quote.said}”</p>
                <p className="mt-1 font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">
                  {quote.tool} · run {quote.run}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {yourQuotes.length > 0 && (
        <section className="mt-12 break-inside-avoid">
          <h2 className="text-xl font-semibold tracking-tight">What the runs said about you</h2>
          <ul className="mt-5 space-y-4">
            {yourQuotes.map((quote) => (
              <li key={`${quote.tool}-${quote.run}`} className="border-l-2 border-rule pl-4">
                <p className="leading-relaxed text-ink">“{quote.said}”</p>
                <p className="mt-1 font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">
                  {quote.tool} · run {quote.run}
                </p>
              </li>
            ))}
          </ul>
          {/* Fewer quotes than runs that named you is a difference a reader counts, and without the
              reason the page looks as if answers went missing. */}
          {named.named - yourQuotes.length > 0 && (
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-soft">
              {named.named - yourQuotes.length} of the runs that named you did so only in a table or a list of links,
              with no sentence about you to quote. The count reads the run&apos;s own list of providers, not the quotes.
            </p>
          )}
        </section>
      )}

      <section className="mt-12 break-inside-avoid">
        <h2 className="text-xl font-semibold tracking-tight">What we ran</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">
                <th className="border-b border-rule pb-2">Tool</th>
                <th className="border-b border-rule pb-2">Model</th>
                <th className="border-b border-rule pb-2 text-right">Runs</th>
                <th className="border-b border-rule pb-2 text-right">Named you</th>
                <th className="border-b border-rule pb-2 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {model.runs.map((run) => (
                <tr key={`${run.tool}-${run.ran}`}>
                  <td className="border-b border-rule py-2 font-mono">
                    {run.tool} {run.version}
                  </td>
                  <td className="border-b border-rule py-2 font-mono">{run.model}</td>
                  <td className="border-b border-rule py-2 text-right tabular-nums">{run.count}</td>
                  <td className="border-b border-rule py-2 text-right tabular-nums">{run.named}</td>
                  <td className="border-b border-rule py-2 text-right font-mono text-ink-faint">{run.ran}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {model.question && (
          <blockquote className="mt-5 max-w-2xl border-l-2 border-rule pl-4 leading-relaxed text-ink-soft">
            {model.question}
          </blockquote>
        )}
        {/* Both caveats travel with the numbers or they do not travel at all. The markdown carries
            them; a prettier rendering that quietly drops them is the worst version of this page. */}
        {model.guest && (
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-soft">
            You are not one of the providers these runs were collected for. Nothing was rerun: the question, the
            sessions and the answers are the ones already published, and only the reading resolves your name as well
            as theirs. Every count here was recomputed alongside you rather than copied.
          </p>
        )}
        {model.runsUrl && (
          <p className="mt-4 font-mono text-sm">
            <a href={model.runsUrl} className="text-brass underline underline-offset-4">
              Every answer above in full, unedited and marked where a vendor is named
            </a>
          </p>
        )}
        {model.runs.some((run) => !run.blind) && (
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Not a clean measurement, and we say so on the free pages too:{' '}
            {model.runs.filter((run) => !run.blind).map((run) => run.tool).join(', ')} ran on a machine whose local
            operator instructions they could read.
          </p>
        )}
      </section>

      <section className="mt-12 break-before-page break-inside-avoid">
        <h2 className="text-xl font-semibold tracking-tight">Where an agent stops</h2>
        <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
          The five stages an agent walks in order. A stage at zero is where it turns around.
        </p>
        <div className="mt-6 space-y-5">
          {model.stages.map((stage) => (
            <div key={stage.title}>
              <div className="flex items-baseline justify-between gap-4">
                <p className="font-medium">{stage.title}</p>
                <p className="font-mono text-sm tabular-nums text-ink-faint">
                  {stage.points}/{stage.measurable}
                </p>
              </div>
              <p className="mt-1 text-sm text-ink-soft">{stage.question}</p>
              <div className="mt-2">
                <Bar
                  points={stage.points}
                  of={stage.measurable}
                  tone={stage.measurable === 0 ? 'brass' : share(stage.points, stage.measurable) >= 60 ? 'pass' : 'fail'}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {model.failing.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">What failed, and the address it failed at</h2>
          <div className="mt-6 space-y-4">
            {model.failing.map((check) => (
              <div key={check.label} className="break-inside-avoid rounded-lg border border-rule bg-surface p-5">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-medium text-ink">{check.label}</p>
                  <p className="font-mono text-sm tabular-nums text-fail">
                    {check.points}/{check.max}
                  </p>
                </div>
                <p className="mt-2 break-words text-sm leading-relaxed text-ink-soft">{check.detail}</p>
                {check.unblock && (
                  <p className="mt-3 border-l-2 border-brass pl-3 text-sm leading-relaxed text-ink">
                    <span className="font-mono text-xs uppercase tracking-[0.15em] text-brass">Fix</span>{' '}
                    {check.unblock}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {model.fixes.length > 0 && (
        <section className="mt-12 break-inside-avoid">
          <h2 className="text-xl font-semibold tracking-tight">What to fix first</h2>
          {model.fixClaim && <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">{model.fixClaim}</p>}
          <ol className="mt-6 space-y-4">
            {model.fixes.map((fix, index) => (
              <li key={fix.label} className="flex gap-4 break-inside-avoid">
                <span className="mt-0.5 font-mono text-sm tabular-nums text-brass">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <p className="font-medium">
                    {fix.label}{' '}
                    <span className="font-mono text-xs uppercase tracking-[0.15em] text-brass">
                      +{fix.gain} · {fix.effort}
                    </span>
                  </p>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">{fix.how}</p>
                </div>
              </li>
            ))}
          </ol>
          {model.behindUnmeasured > 0 && (
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-soft">
              {model.behindUnmeasured} further points sit behind checks nothing could evaluate, so they are outside the
              arithmetic above.
            </p>
          )}
        </section>
      )}

      {model.notApplicable.length > 0 && (
        <section className="mt-12 break-inside-avoid">
          <h2 className="text-xl font-semibold tracking-tight">What does not apply to you</h2>
          <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
            Why the denominator above is smaller than the formula maximum. These are not failures and not gaps in our
            reading: there is nothing there to measure.
          </p>
          <ul className="mt-5 space-y-3">
            {model.notApplicable.map((check) => (
              <li key={check.label} className="border-l-2 border-rule pl-4">
                <p className="font-medium text-ink">{check.label}</p>
                <p className="mt-1 break-words text-sm leading-relaxed text-ink-soft">{check.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {model.unmeasured.length > 0 && (
        <section className="mt-12 break-inside-avoid">
          <h2 className="text-xl font-semibold tracking-tight">What we could not measure</h2>
          <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
            None of this counts against you. It is printed because a score out of everything would.
          </p>
          <ul className="mt-5 space-y-3">
            {model.unmeasured.map((check) => (
              <li key={check.label} className="border-l-2 border-rule pl-4">
                <p className="font-medium text-ink">{check.label}</p>
                <p className="mt-1 break-words text-sm leading-relaxed text-ink-soft">{check.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {/* The limits travel with the numbers. A rendering that drops them is a rendering that
          promises more than the method does. */}
      <section className="mt-12 break-inside-avoid border-t border-rule pt-8">
        <h2 className="text-xl font-semibold tracking-tight">What this report is not</h2>
        <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
          It is not a ranking, and it is not a promise that fixing a row moves an agent. Two checks are the only ones
          we can show a relationship with being named, and we publish which two rather than implying every check
          matters equally. Everything above is reproducible: the formula is published, the question is printed, and
          the runs are quoted.
        </p>
      </section>
    </article>
  )
}
