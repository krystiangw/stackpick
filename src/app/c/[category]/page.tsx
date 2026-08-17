import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CATEGORIES } from '@/lib/categories'
import { loadRankings } from '@/lib/rankings'
import { recordVisit } from '@/lib/visits'
import { headers } from 'next/headers'
import { SITE_URL } from '@/lib/site'
import cells from '@/data/cells.json'

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
const toolName = (cell: Cell) => cell.tool.split(' ')[0]

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category: category.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category: id } = await params
  const category = CATEGORIES.find((candidate) => candidate.id === id)
  if (!category) return {}
  const cell = cellFor(id)
  const invisible = cell ? cell.rows.filter((row) => row.named === 0).length : 0
  return {
    title: `${category.label}: which vendors an AI agent names · Let Agents In`,
    description: cell
      ? `We put one buying question to an agent ${cell.runs} times and counted who it named. ${invisible} of ${cell.rows.length} vendors in ${category.label.toLowerCase()} were never named once.`
      : `Agent readiness measured across ${category.label.toLowerCase()}, check by check.`,
    alternates: { canonical: `${SITE_URL}/c/${id}` },
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: id } = await params
  const category = CATEGORIES.find((candidate) => candidate.id === id)
  if (!category) notFound()
  recordVisit(`/c/${id}`, (await headers()).get('user-agent'))

  const held = cellsFor(id)
  const cell = held[0]
  const { categories } = await loadRankings()
  const ranked = categories.find((entry) => entry.category.id === id)
  const scoreOf = (domain: string) => ranked?.entries.find((entry) => entry.domain === domain)
  const invisible = cell ? cell.rows.filter((row) => row.named === 0).length : 0
  const rows = cell?.rows ?? category.domains.map((domain) => ({ domain, named: 0, first: 0 }))

  return (
    <main className="mx-auto max-w-5xl px-6">
      <section className="border-b border-rule py-14">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">Category</p>
        <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight">
          {category.label}: who an agent names, and who it never mentions
        </h1>
        {cell && (
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
            We put one question to an agent {held.map((one) => `${one.runs} times on ${toolName(one)}`).join(' and ')},
            every run a separate session with nothing carried between them, and counted the vendors it named.{' '}
            <span className="font-medium text-ink">
              {invisible} of {rows.length} vendors we measure in this category were never named once.
            </span>
          </p>
        )}
      </section>

      {cell && cell.question && (
        <section className="border-b border-rule py-12">
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">The question we asked</h2>
          {/* Verbatim, because a question a reader cannot see is a result they cannot argue with. */}
          <blockquote className="mt-4 max-w-2xl border-l-2 border-brass pl-5 text-lg leading-relaxed">
            {cell.question}
          </blockquote>
          <p className="mt-4 font-mono text-xs leading-relaxed text-ink-faint">
            {cell.tool} ({cell.model}), {cell.runs} runs, {cell.ranAt}. The question names no vendor and asks for
            a recommendation, which is the shape a developer types.
          </p>
          {cell.operatorContext.length > 0 && (
            // The warning goes above the table for the same reason it does in the terminal reader:
            // a reader who has seen the numbers has already believed them.
            <p className="mt-3 max-w-2xl font-mono text-xs leading-relaxed text-ink-faint">
              Not a clean measurement: these runs could read the operator instructions on the machine they ran on
              ({cell.operatorContext.join(', ')}), so they describe an agent there rather than an agent at your
              customer. We say so rather than publish the number alone.
            </p>
          )}
        </section>
      )}

      <section className="border-b border-rule py-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Named, and measured</h2>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-rule text-left font-mono text-xs uppercase tracking-[0.12em] text-ink-faint">
                <th className="py-2 pr-4 font-normal">Vendor</th>
                {held.map((one) => (
                  <th key={one.tool} className="py-2 pr-4 text-right font-normal">
                    Named ({toolName(one)})
                  </th>
                ))}
                <th className="py-2 pr-4 text-right font-normal">Named first</th>
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
                          {there ? `${there.named}/${one.runs}` : '—'}
                        </td>
                      )
                    })}
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums">{cell ? row.first : '—'}</td>
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
          The two columns answer different questions. <span className="font-medium">Named</span> is whether you were
          in the room at all. <span className="font-medium">Named first</span> is whether you were the answer. A
          vendor at zero is not losing on price or features in these runs: it is not being considered.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          {cell?.runs ?? 5} runs separate a wall from silence and nothing finer. Two vendors a run or two apart are
          not ranked by this, and we would rather say that than sell the gap.{' '}
          <Link href={`/c/${id}/runs`} className="text-brass underline underline-offset-4">
            Read what the agent actually answered
          </Link>{' '}
          or{' '}
          <Link href="/methodology" className="text-brass underline underline-offset-4">
            how every number here is measured
          </Link>
        </p>
      </section>

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
