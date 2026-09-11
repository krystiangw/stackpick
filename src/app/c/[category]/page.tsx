import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CATEGORIES } from '@/lib/categories'
import { loadRankings } from '@/lib/rankings'
import { recordVisit } from '@/lib/visits'
import { headers } from 'next/headers'
import { SITE_URL } from '@/lib/site'
import { CORPUS_LICENCE, CORPUS_LICENCE_IS_PUBLISHED } from '@/lib/seller'
import { lookupCategoryById } from '@/lib/lookup'
import cells from '@/data/cells.json'
import { AgentCoverageNotice } from '@/components/agent-coverage-notice'
import { coverageFor } from '@/lib/agent-coverage'
import { agentLabel, modelLabel, AGENT_SAMPLE_LIMIT } from '@/lib/agent-label'
import { TrackedLink } from '@/components/tracked-link'

/**
 * One page per category, and the only page on the site that answers the question a vendor
 * actually asks: when somebody puts our buyers' question to an agent, who does it name?
 *
 * The cell is frozen evidence with a date on it rather than a live number, because the runs
 * happen on a machine and not on this dyno. Saying so is the whole difference between research
 * and a dashboard that quietly recomputes itself.
 */
export const revalidate = 600

type Cell = (typeof cells)[number]

/** Every cell we hold for a category, cleanest first: a run that read none of our instructions
 * describes an agent at a customer, and a run that read them describes an agent on our machine. */
const cellsFor = (id: string): Cell[] =>
  cells
    .filter((cell) => cell.category === id)
    .sort((a, b) => a.operatorContext.length - b.operatorContext.length)

const cellFor = (id: string): Cell | undefined => cellsFor(id)[0]

/** The tool, in the words a reader can check, rather than the whole version string. */
const toolName = (cell: Cell) => agentLabel(cell.tool)

/** Never named by ANY tool we hold: the sentence is about a vendor, not about how many runs one
 * tool happened to get. Switching the primary cell from five claude runs to three codex ones moved
 * this number from 78 to 91 across the corpus without a single vendor changing anything. */
function neverNamed(id: string): number {
  const held = cellsFor(id)
  if (held.length === 0) return 0
  return held[0].rows.filter((row) =>
    held.every((one) => (one.rows.find((candidate) => candidate.domain === row.domain)?.named ?? 0) === 0),
  ).length
}

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category: category.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category: id } = await params
  const category = CATEGORIES.find((candidate) => candidate.id === id)
  if (!category) return {}
  const cell = cellFor(id)
  const title = id === 'transactional-email'
    ? 'Which email APIs do coding agents recommend? · Let Agents In'
    : `${category.label}: agent mentions and HTTP checks · Let Agents In`
  const description = id === 'transactional-email'
    ? 'Recorded coding-agent recommendations for transactional email APIs. Compare vendor mentions by tool, read the answers, and see what these tests can tell your team.'
    : cell
    ? `Agent answers and public HTTP checks for ${category.label.toLowerCase()}, with dated evidence.`
    : `Agent readiness measured across ${category.label.toLowerCase()}, check by check.`
  const url = `${SITE_URL}/c/${id}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'Let Agents In', type: 'website' },
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: id } = await params
  const category = CATEGORIES.find((candidate) => candidate.id === id)
  if (!category) notFound()
  recordVisit(`/c/${id}`, (await headers()).get('user-agent'))

  const held = cellsFor(id)
  const cell = held[0]
  const contaminated = held.filter((one) => one.operatorContext.length > 0)
  const [{ categories }, reachability] = await Promise.all([loadRankings(), lookupCategoryById(id)])
  const ranked = categories.find((entry) => entry.category.id === id)
  const scoreOf = (domain: string) => ranked?.entries.find((entry) => entry.domain === domain)
  const invisible = neverNamed(id)
  const rows = cell?.rows ?? category.domains.map((domain) => ({ domain, named: 0, first: 0 }))

  return (
    <main className="mx-auto max-w-5xl px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Dataset',
            name: `${category.label}: agent reachability dataset`,
            description: `Dated HTTP checks and agent mention counts across ${category.label.toLowerCase()}.`,
            url: `${SITE_URL}/c/${id}`,
            isAccessibleForFree: true,
            license: CORPUS_LICENCE_IS_PUBLISHED ? CORPUS_LICENCE.url : `${SITE_URL}/methodology`,
            creator: { '@type': 'Organization', name: 'Let Agents In', url: SITE_URL },
            distribution: {
              '@type': 'DataDownload',
              encodingFormat: 'application/json',
              contentUrl: `${SITE_URL}/c/${id}/corpus.json`,
            },
          }),
        }}
      />
      <section className="border-b border-rule py-14">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">Category</p>
        <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight">
          {id === 'transactional-email' ? 'Which email APIs do coding agents recommend?' : category.label}
        </h1>
        {cell && (
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
            One question, {held.reduce((sum, one) => sum + one.runs, 0)} recorded answers across {new Set(held.map(one => one.tool.split(' ')[0])).size} tools.
            Each run used a separate session. The table counts vendor mentions.{' '}
            <span className="font-medium text-ink">
              {invisible} of {rows.length} vendors we measure in this category were never named once.
            </span>
          </p>
        )}
        <AgentCoverageNotice batches={coverageFor(id)} />
        {held.length > 0 && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">{AGENT_SAMPLE_LIMIT}</p>}
        {id === 'transactional-email' && (
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <Link href="#mentions" className="text-brass underline underline-offset-4">Compare recorded mentions</Link>
            <Link href={`/c/${id}/runs`} className="text-brass underline underline-offset-4">Read the full answers</Link>
          </div>
        )}
      </section>

      {reachability && (
        <section className="border-b border-rule py-12">
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">
            Measured access checks
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
            We measured {reachability.measured} of the {reachability.inCategory} providers in this category.{' '}
            <span className="font-medium text-ink">
              {reachability.clear.length === 0
                ? 'None cleared every barrier we test.'
                : `${reachability.clear.length} cleared every barrier we test.`}
            </span>{' '}
            These HTTP checks do not establish integration success. Feature fit, price and support are outside their scope.
          </p>

          <div className="mt-7 grid gap-7 md:grid-cols-3">
            {[
              {
                title: `Clear (${reachability.clear.length})`,
                entries: reachability.clear,
                empty: 'Nobody cleared every measured barrier.',
              },
              {
                title: `Blocked (${reachability.blocked.length})`,
                entries: reachability.blocked,
                empty: 'No measured provider hit a known barrier.',
              },
              {
                title: `Unknown (${reachability.unknown.length})`,
                entries: reachability.unknown,
                empty: 'Every provider was measurable from our vantage.',
              },
            ].map((group) => (
              <div key={group.title}>
                <h3 className="font-mono text-xs uppercase tracking-[0.12em] text-ink-faint">{group.title}</h3>
                {group.entries.length === 0 ? (
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">{group.empty}</p>
                ) : (
                  <ul className="mt-3 space-y-3 text-sm">
                    {group.entries.map((entry) => (
                      <li key={entry.domain}>
                        <Link href={`/v/${entry.domain}`} className="font-mono text-brass underline underline-offset-4">
                          {entry.domain}
                        </Link>
                        <span className="text-ink-soft">
                          {entry.stopsAt ? ` - ${entry.stopsAt}` : ' - no measured barrier'}
                        </span>
                        <span className="block font-mono text-xs text-ink-faint">
                          measured {entry.measuredAt} ·{' '}
                          <Link href={entry.evidence} className="underline underline-offset-4">
                            evidence
                          </Link>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {cell && cell.question && (
        <section className="border-b border-rule py-12">
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">The question we asked</h2>
          {/* Verbatim, because a question a reader cannot see is a result they cannot argue with. */}
          <blockquote className="mt-4 max-w-2xl border-l-2 border-brass pl-5 text-lg leading-relaxed">
            {cell.question}
          </blockquote>
          <p className="mt-4 font-mono text-xs leading-relaxed text-ink-faint">
            {cell.tool} ({cell.model}), {cell.runs} runs, {cell.ranAt}. The question asks for a recommendation without naming a vendor.
          </p>
          {/* Across every cell on the page, not the one whose numbers happen to head it. `cell` is
              the cleanest by construction, so this asked the empty list every time and the warning
              never rendered for any category, while the table below it printed the contaminated
              tool's column beside the clean one with nothing to tell them apart. */}
          {contaminated.length > 0 && (
            // The warning goes above the table for the same reason it does in the terminal reader:
            // a reader who has seen the numbers has already believed them.
            <p className="mt-3 max-w-2xl font-mono text-xs leading-relaxed text-ink-faint">
              The {contaminated.map(toolName).join(' and ')} runs could read the operator
              instructions ({[...new Set(contaminated.flatMap((one) => one.operatorContext))].join(', ')}).
              Those instructions request Polish, so some answers are in Polish. Results describe this setup, not an agent at your customer.
            </p>
          )}
        </section>
      )}

      <section className="scroll-mt-24 border-b border-rule py-12" id="mentions">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Named, and measured</h2>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-rule text-left font-mono text-xs uppercase tracking-[0.12em] text-ink-faint">
                <th className="py-2 pr-4 font-normal">Vendor</th>
                {held.map((one) => (
                  <th key={one.tool} className="py-2 pr-4 text-right font-normal">
                    Named ({toolName(one)})
                    <span className="mt-1 block max-w-40 text-[10px] normal-case tracking-normal">{modelLabel(one.model)} · {one.ranAt}</span>
                  </th>
                ))}
                <th className="py-2 pr-4 text-right font-normal">
                  Named first{cell ? ` (${toolName(cell)})` : ''}
                </th>
                <th className="py-2 pr-4 text-right font-normal">Scan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const scored = scoreOf(row.domain)
                return (
                  <tr key={row.domain} className="border-b border-rule">
                    <td className="py-2.5 pr-4 font-mono">
                      <Link href={`/v/${row.domain}`} className="text-brass underline underline-offset-4">
                        {row.domain}
                      </Link>
                    </td>
                    {held.map((one) => {
                      const there = one.rows.find((candidate) => candidate.domain === row.domain)
                      return (
                        <td key={one.tool} className="py-2.5 pr-4 text-right font-mono tabular-nums">
                          {there ? `${there.named}/${one.runs}` : '-'}
                        </td>
                      )
                    })}
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums">{cell ? row.first : '-'}</td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-ink-soft">
                      {scored ? `${scored.total}/${scored.max}` : 'not measured'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-soft">
          <span className="font-medium">Named</span> counts runs that mentioned a vendor.
          <span className="font-medium"> Named first</span> counts runs that mentioned it before any other vendor we measure.
          Mention order does not establish a purchasing decision.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          A batch of {cell?.runs ?? 5} runs is a small sample. A one- or two-run difference does not establish a ranking.{' '}
          <Link href={`/c/${id}/runs`} className="text-brass underline underline-offset-4">
            Read what the agent actually answered
          </Link>{' '}
          or{' '}
          <Link href="/methodology#named" className="text-brass underline underline-offset-4">
            how every number here is measured
          </Link>
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Building an agent or comparing providers programmatically?{' '}
          <a href={`/c/${id}/corpus.json`} className="text-brass underline underline-offset-4">
            Download this category as JSON
          </a>{' '}
          with dated measurements and the recorded access barriers.
        </p>
      </section>

      {id === 'transactional-email' && (
        <section className="border-b border-rule py-10">
          <h2 className="text-xl font-semibold tracking-tight">Do you build an email API?</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
            A report brings together the mentions, omissions and HTTP checks for your product.
            To test whether an agent can actually send an email with it, we agree a separate integration pilot.
          </p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm">
            <Link href="/d/sample" className="text-brass underline underline-offset-4">See a sample report</Link>
            <TrackedLink click="pricing" href="/pricing" className="text-brass underline underline-offset-4">Report & pilot pricing</TrackedLink>
            <TrackedLink click="mail-report" href={`/pricing?interest=report&context=${encodeURIComponent(category.label)}#contact`} className="text-brass underline underline-offset-4">Ask about your email API</TrackedLink>
          </div>
        </section>
      )}

      <section className="py-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Every category</h2>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
          {CATEGORIES.map((other) => (
            <Link
              key={other.id}
              href={`/c/${other.id}`}
              className={`font-mono text-sm underline-offset-4 hover:underline ${
                other.id === id ? 'text-ink-faint' : 'text-brass'
              }`}
            >
              {other.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
