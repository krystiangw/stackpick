import type { Metadata } from 'next'
import Link from 'next/link'
import { buildIndustryReport, type CheckTally } from '@/lib/industry'
import { NOISE_FLOOR_PERCENT } from '@/lib/published'
import { recordVisit } from '@/lib/visits'
import { headers } from 'next/headers'
import { SITE_URL } from '@/lib/site'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  alternates: { canonical: `${SITE_URL}/report` },
  title: 'The agent readiness of developer tooling: Let Agents In',
  description:
    'Every domain we have scanned, aggregated. The market has solved being read by agents and has not solved being joined by them.',
}

const percent = (share: number) => `${Math.round(share * 100)}%`

function tallyFor(checks: CheckTally[], id: string): CheckTally | undefined {
  return checks.find((check) => check.id === id)
}

export default async function IndustryReportPage() {
  recordVisit('/report', (await headers()).get('user-agent'))
  const report = await buildIndustryReport()

  if (!report) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-20">
        <h1 className="text-3xl font-semibold tracking-tight">Not enough scans yet</h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          This page aggregates every domain scanned under one formula version. Come back once the corpus is
          large enough to say anything honest about it.
        </p>
      </main>
    )
  }

  const discovery = report.stages.find((stage) => stage.stage === 'discovery')
  const entry = report.stages.find((stage) => stage.stage === 'entry')
  const entryPoint = tallyFor(report.checks, 'agent_entry_point')
  const provisioning = tallyFor(report.checks, 'programmatic_provisioning')
  const mcp = tallyFor(report.checks, 'mcp_present')
  const oauth = tallyFor(report.checks, 'oauth_dcr')
  const window = [report.scannedFrom, report.scannedTo].map((at) => at.slice(0, 10))

  return (
    <main className="mx-auto max-w-5xl px-6">
      <section className="border-b border-rule py-12">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">
          {report.sampleSize} domains · formula v{report.formulaVersion}
        </p>
        <h1 className="mt-6 max-w-4xl text-balance text-3xl font-semibold leading-[1.15] tracking-tight sm:text-[2.75rem]">
          The market solved being read by agents. It has not solved being joined by one.
        </h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
          Every domain Let Agents In has scanned, aggregated. Documentation is reachable, parseable and mostly
          open to AI crawlers. Then the funnel stops: almost nothing on this list can take an agent from
          reading about the product to holding a working credential.
        </p>

        {discovery && entry && (
          <div className="mt-10 flex flex-wrap gap-x-16 gap-y-6">
            <div>
              <p className="font-mono text-5xl font-semibold tabular-nums text-pass">{percent(discovery.share)}</p>
              <p className="mt-2 max-w-xs text-sm text-ink-soft">
                of the measurable points for being found and read, on average
              </p>
            </div>
            <div>
              <p className="font-mono text-5xl font-semibold tabular-nums text-fail">{percent(entry.share)}</p>
              <p className="mt-2 max-w-xs text-sm text-ink-soft">
                of the measurable points for having a door an agent can walk through
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="border-b border-rule py-10">
        <h2 className="text-lg font-semibold tracking-tight">Where the funnel collapses</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Mean share of the points we could actually measure at each stage. Checks we could not evaluate are
          excluded from the denominator rather than counted as failures, and the count of domains behind each
          row is printed with it, because our coverage is not equal across stages.
        </p>
        <div className="mt-8 flex flex-col">
          {report.stages.map((stage) => (
            <div key={stage.stage} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-4 border-t border-rule py-3">
              <span className="font-mono text-sm text-brass">{stage.letter}</span>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-sm font-medium">{stage.title}</span>
                <span className="text-xs text-ink-faint">{stage.question}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden font-mono text-xs text-ink-faint sm:inline">
                  n={stage.measuredOn}
                </span>
                <div className="hidden h-1.5 w-40 bg-sunken sm:block">
                  <div
                    className={`h-full ${stage.share >= 0.67 ? 'bg-pass' : stage.share >= 0.34 ? 'bg-warn' : 'bg-fail'}`}
                    style={{ width: `${Math.max(stage.share * 100, 1)}%` }}
                  />
                </div>
                <span className="w-12 text-right font-mono text-sm tabular-nums">{percent(stage.share)}</span>
              </div>
            </div>
          ))}
        </div>

        <ul className="mt-8 flex flex-col gap-3 text-balance">
          {entryPoint && (
            <li className="border-l-2 border-fail pl-4 leading-relaxed">
              <span className="font-mono tabular-nums">
                {entryPoint.zero} of {report.sampleSize}
              </span>{' '}
              answer none of the nine known agent entry paths: no{' '}
              <span className="font-mono text-sm">/agent-signup.md</span>, no{' '}
              <span className="font-mono text-sm">/.well-known/agent-access.json</span>, nothing.
              {entryPoint.partial > 0 && (
                <>
                  {' '}
                  A further {entryPoint.partial} publish a service descriptor but no procedure written for a machine.
                </>
              )}
            </li>
          )}
          {provisioning && (
            <li className="border-l-2 border-fail pl-4 leading-relaxed">
              <span className="font-mono tabular-nums">
                {provisioning.zero} of {provisioning.zero + provisioning.partial + provisioning.pass}
              </span>{' '}
              describe no way to obtain a credential without a human opening a dashboard, across every
              documentation page we could read. The remaining {provisioning.unmeasurable} gave us too little
              documentation to judge.
            </li>
          )}
          {oauth && oauth.pass + oauth.zero > 0 && (
            <li className="border-l-2 border-fail pl-4 leading-relaxed">
              <span className="font-mono tabular-nums">
                {oauth.zero} of {oauth.pass + oauth.zero + oauth.partial}
              </span>{' '}
              publish no OAuth metadata with a registration endpoint on any host we could follow, so an agent
              cannot register itself as a client. RFC 7591 is the only standard by which it could. The other
              side of that number is worth as much: where a vendor does publish one, it almost always sits on
              the MCP host and arrived with the server, because the specification asks for it.
            </li>
          )}
          {report.mcpWithoutKeys > 0 && (
            <li className="border-l-2 border-fail pl-4 leading-relaxed">
              <span className="font-mono tabular-nums">{report.mcpWithoutKeys} of {report.sampleSize}</span>{' '}
              run an MCP server and document no way for an agent to obtain a credential for it. That pair is the
              whole finding: a door built for a machine, and nothing behind it the machine can unlock on its own.
            </li>
          )}
          {mcp && (
            <li className="border-l-2 border-warn pl-4 leading-relaxed">
              <span className="font-mono tabular-nums">
                {mcp.pass} of {report.sampleSize}
              </span>{' '}
              run an MCP server that answers a handshake. That is the one part of this funnel the market
              has moved on, and it stops there: a server an agent can call is not a credential an agent can
              get, and the two stages below this one say so.
            </li>
          )}
        </ul>
      </section>

      <section className="border-b border-rule py-10">
        <h2 className="text-lg font-semibold tracking-tight">Every check, across the corpus</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Unmeasurable is its own column on purpose. A check we could not evaluate is our blind spot, and
          folding it into failures would make the market look worse than we can prove it is.
        </p>
        {/* On a phone the Unmeasurable column sits off the right edge with nothing to say so. */}
        <p className="mt-6 font-mono text-xs text-ink-faint sm:hidden">Scroll the table sideways for the last column.</p>
        <div className="mt-2 overflow-x-auto sm:mt-6">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-rule text-left font-mono text-xs uppercase tracking-[0.12em] text-ink-faint">
                <th className="py-2 pr-4 font-normal">Check</th>
                <th className="py-2 pr-4 text-right font-normal">Pass</th>
                <th className="py-2 pr-4 text-right font-normal">Partial</th>
                <th className="py-2 pr-4 text-right font-normal">Zero</th>
                <th className="py-2 text-right font-normal">Unmeasurable</th>
              </tr>
            </thead>
            <tbody>
              {report.checks.map((check) => (
                <tr key={check.id} className="border-b border-rule">
                  <td className="py-2.5 pr-4">{check.label}</td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-pass">{check.pass}</td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-warn">{check.partial}</td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-fail">{check.zero}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-ink-faint">{check.unmeasurable}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-b border-rule py-10">
        <h2 className="text-lg font-semibold tracking-tight">Both ends of the corpus</h2>
        <div className="mt-6 grid gap-10 sm:grid-cols-2">
          {[
            { title: 'Highest', entries: report.best, tone: 'text-pass' },
            { title: 'Lowest', entries: report.worst, tone: 'text-fail' },
          ].map((column) => (
            <div key={column.title}>
              <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">{column.title}</h3>
              <ol className="mt-3 flex flex-col">
                {column.entries.map((item) => (
                  <li key={item.domain} className="flex items-baseline justify-between gap-4 border-t border-rule py-2">
                    <Link href={`/r/${item.reportId}`} className="min-w-0 break-all font-mono text-sm text-brass underline underline-offset-4">
                      {item.domain}
                    </Link>
                    <span className={`font-mono text-sm tabular-nums ${column.tone}`}>
                      {item.total}/{item.measurable}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Scores are out of the points we could measure on each domain, not out of {report.max}. A site that
          refuses our requests scores against a smaller denominator, not a worse number. Every one of these
          links is the full scorecard, with the HTTP observation behind each line.
        </p>
      </section>

      <section className="py-10">
        <h2 className="text-lg font-semibold tracking-tight">What this is not</h2>
        <ul className="mt-4 flex max-w-2xl list-disc flex-col gap-3 pl-5 leading-relaxed text-ink-soft">
          <li>
            Not a random sample. These are developer tools we chose, in categories where an agent picking a
            building block is a real purchase decision. A scan anyone runs on this site gets its own permanent
            link and is compared against this corpus, but never joins it.
          </li>
          {/* The per-category n is small enough that one vendor moves a category by more than the
              corpus moves on its own between reseeds. Printed rather than fixed by quietly adding
              vendors, because which vendors belong in the corpus is a scope decision. */}
          <li>
            Not thick enough for category rankings to be read as league tables. Most categories hold five or
            six vendors, so one of them moving is worth several points of the category share, which is more
            than the {NOISE_FLOOR_PERCENT.toFixed(2)} percent the whole corpus moves between two identical rescans. Compare a vendor with
            its own past scans and with the named peers on its scorecard, not with a category average built
            on six rows.
          </li>
          <li>
            Not equally measurable across stages. Coverage differs check by check, the n on each stage row is
            the number of domains behind it, and the table above prints what we could not evaluate rather than
            burying it in the failures.
          </li>
          <li>
            Not a measure of whether agents actually choose these products. That takes running agents against
            real tasks, which is a different instrument and a paid one.
          </li>
          <li>
            Not stable across formula versions. Everything here is scored under v{report.formulaVersion};
            earlier numbers were produced by a formula with known defects, and mixing them would be dishonest.
          </li>
          <li>
            Scanned between {window[0]} and {window[1]}. Sites change, and so does this page: it recomputes
            from the store on every request rather than quoting a frozen number.
          </li>
        </ul>
        <div className="mt-10 border border-rule p-6">
          <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Take the data</h3>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">
            Every row behind this page, one entry per domain and check, with the verdict, the points and the
            sentence we measured it from. Free to use and quote with attribution. Disagreeing with us is easier
            with the data than with the prose.
          </p>
          <p className="mt-4 flex flex-wrap gap-4 font-mono text-sm">
            <a href="/corpus.json" className="text-brass underline underline-offset-4">
              /corpus.json
            </a>
            <a href="/corpus.csv" className="text-brass underline underline-offset-4">
              /corpus.csv
            </a>
            <Link href="/methodology" className="text-brass underline underline-offset-4">
              How every check is defined and scored
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
