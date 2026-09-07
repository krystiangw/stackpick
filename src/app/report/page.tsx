import type { Metadata } from 'next'
import { CORPUS_LICENCE_IS_PUBLISHED } from '@/lib/seller'
import Link from 'next/link'
import { buildIndustryReport, type CheckTally } from '@/lib/industry'
import { NOISE_FLOOR_PERCENT } from '@/lib/published'
import { recordVisit } from '@/lib/visits'
import { headers } from 'next/headers'
import { SITE_URL } from '@/lib/site'
import { AGENT_ENTRY_PATH_COUNT } from '@/lib/scan/funnel'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  alternates: { canonical: `${SITE_URL}/report` },
  title: 'The agent readiness of developer tooling: Let Agents In',
  description:
    'Aggregate HTTP check results across the published corpus, with dates, coverage and measurement limits.',
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
          No comparable corpus is available under one formula version. Please try again later.
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
          {/* The date belongs beside the sample, not only in the note at the bottom: a research
              page without a visible date reads as undated, whatever it says 200 lines lower. */}
          {report.sampleSize} domains · formula v{report.formulaVersion} · measured {window[1]}
        </p>
        <h1 className="mt-6 max-w-4xl text-balance text-3xl font-semibold leading-[1.15] tracking-tight sm:text-[2.75rem]">
          Agent-readiness signals across the corpus
        </h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
          Public HTTP checks across the curated vendor list, measured under one formula.
          These results describe documentation and access signals. They do not establish whether agents choose a product or complete an integration.
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
                of the measurable agent-entry points, on average
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="border-b border-rule py-10">
        <h2 className="text-lg font-semibold tracking-tight">Results by stage</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Mean share of measurable points at each stage. Unmeasured checks are excluded. Each row shows its domain count because coverage differs by stage.
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
                <span className="font-mono text-xs text-ink-faint">
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
              {/* Nazwy plikow, nie zapytania. To samo slowo w dwoch znaczeniach czytalo sie jak
                  sprzecznosc: naglowek na `/r` mowil o dziesieciu „paths", a wiersz checku o
                  dwudziestu trzech, bo kazda nazwa jest pytana takze na hoscie dokumentacji. */}
              had no confirmed match among the {AGENT_ENTRY_PATH_COUNT} entry files we look for by name, including{' '}
              <span className="font-mono text-sm">/agent-signup.md</span> and{' '}
              <span className="font-mono text-sm">/.well-known/agent-access.json</span>.
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
              had no programmatic credential-creation match in the sampled documentation.
              Another {provisioning.unmeasurable} were unmeasurable. A supported path may exist outside that sample.
            </li>
          )}
          {oauth && oauth.pass + oauth.zero > 0 && (
            <li className="border-l-2 border-fail pl-4 leading-relaxed">
              <span className="font-mono tabular-nums">
                {oauth.zero} of {oauth.pass + oauth.zero + oauth.partial}
              </span>{' '}
              had no OAuth registration endpoint in the metadata on the hosts checked.
              This does not establish that every supported authentication path requires client registration.
            </li>
          )}
          {report.mcpWithoutKeys > 0 && (
            <li className="border-l-2 border-fail pl-4 leading-relaxed">
              <span className="font-mono tabular-nums">{report.mcpWithoutKeys} of {report.sampleSize}</span>{' '}
              had an MCP server and no provisioning match in the sampled documentation. The scan did not attempt to obtain credentials.
            </li>
          )}
          {mcp && (
            <li className="border-l-2 border-warn pl-4 leading-relaxed">
              <span className="font-mono tabular-nums">
                {mcp.pass} of {report.sampleSize}
              </span>{' '}
              had an MCP server that answered a handshake. This does not establish access to a customer account.
            </li>
          )}
        </ul>
      </section>

      <section className="border-b border-rule py-10">
        <h2 className="text-lg font-semibold tracking-tight">Every check, across the corpus</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Unmeasurable checks have a separate column and do not count as failures.
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
          Each score uses its own measurable denominator; the full maximum is {report.max}.
          Refused requests can reduce coverage. Open a scorecard for the recorded HTTP observations.
        </p>
      </section>

      <section className="py-10">
        <h2 className="text-lg font-semibold tracking-tight">Scope and limits</h2>
        <ul className="mt-4 flex max-w-2xl list-disc flex-col gap-3 pl-5 leading-relaxed text-ink-soft">
          <li>
            The vendor list is curated, not random. Visitor scans receive a permanent link and a comparison with this corpus, but never join it.
          </li>
          {/* The per-category n is small enough that one vendor moves a category by more than the
              corpus moves on its own between reseeds. Printed rather than fixed by quietly adding
              vendors, because which vendors belong in the corpus is a scope decision. */}
          <li>
            Most categories contain five or six vendors. One changed row can move the category share by several points.
            The recorded corpus noise floor is {NOISE_FLOOR_PERCENT.toFixed(2)} percent. Compare dated vendor measurements before interpreting category averages.
          </li>
          <li>
            Coverage varies by check. The n beside each stage is its measured domain count. Unmeasurable checks are listed separately.
          </li>
          <li>
            Agent choices and integration outcomes require separate agent runs. This page aggregates HTTP scans.
          </li>
          <li>
            All rows here use formula v{report.formulaVersion}. Measurements under different versions are not mixed.
            {/* The subtraction, said out loud. Between shipping a formula and sweeping the corpus onto it,
                this page counts fewer domains than the corpus holds, and a reader comparing the two
                numbers deserves the reason rather than a discrepancy to work out. */}
            {report.heldBack > 0 && (
              <>
                {' '}
                {report.heldBack} further {report.heldBack === 1 ? 'domain is' : 'domains are'} left out of every number
                above because {report.heldBack === 1 ? 'it was' : 'they were'} measured under another version. They can rejoin after a rescan.
              </>
            )}
          </li>
          <li>
            Scanned between {window[0]} and {window[1]}. This page recomputes from stored measurements on each request.
          </li>
          <li>
            {report.frozen.count === 0 ? (
              <>
                No row is currently frozen. When robots.txt asks our scanner to stay out, we retain the last measurement and stop refreshing it.
              </>
            ) : report.frozen.median === null ? (
              <>
                All {report.sampleSize} rows are frozen at the vendors’ request. The median uses their last measurements. No unfrozen comparison is available.
              </>
            ) : (
              <>
                {report.frozen.count} of {report.sampleSize} rows are frozen at the vendors’ request.
                Without them, the median is {report.frozen.median}; with them, it is {report.median}.
              </>
            )}
          </li>
        </ul>
        <div className="mt-10 border border-rule p-6">
          <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Take the data</h3>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">
            Every row behind this page, one entry per domain and check, with the verdict, the points and the
            sentence we measured it from. Free to use and quote{' '}
            {CORPUS_LICENCE_IS_PUBLISHED ? (
              <Link href="/corpus-licence" className="text-brass underline underline-offset-4">
                under these terms
              </Link>
            ) : (
              'with attribution'
            )}
            .
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
