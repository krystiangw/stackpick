import type { Metadata } from 'next'
import Link from 'next/link'
import { CATEGORIES } from '@/lib/categories'
import { recordVisit } from '@/lib/visits'
import { headers } from 'next/headers'
import { pageMetadata } from '@/lib/site'
import cells from '@/data/cells.json'

/**
 * The hub the category pages did not have. They were reachable only from a heading in the rankings
 * halfway down the home page, which is a page nobody arrives on when they are looking for who an
 * agent recommends for a job.
 */
export const revalidate = 600

export const metadata: Metadata = pageMetadata({
  path: '/c',
  title: 'Who an AI agent names, by category · Let Agents In',
  description:
    'One buying question per category, put to an agent in isolation, on two different tools. Who it names, who it names first, and how many vendors it never mentions.',
})

export default async function CategoriesPage() {
  recordVisit('/c', (await headers()).get('user-agent'))

  const rows = CATEGORIES.map((category) => {
    const held = cells
      .filter((cell) => cell.category === category.id)
      .sort((a, b) => a.operatorContext.length - b.operatorContext.length)
    const cell = held[0]
    // Named by EITHER tool. Counting only the cleanest cell made the published number depend on
    // how many runs that tool happened to get: switching the primary from five claude runs to
    // three codex ones moved "never named" from 78 to 91 without a single vendor changing.
    const named =
      cell?.rows.filter((row) => held.some((one) => (one.rows.find((r) => r.domain === row.domain)?.named ?? 0) > 0)).length ?? 0
    const winner = cell?.rows.reduce(
      (best, row) => (row.first > (best?.first ?? 0) ? row : best),
      undefined as (typeof cell.rows)[number] | undefined,
    )
    return { category, cell, named, winner, tools: held.length }
  })

  const measured = rows.filter((row) => row.cell)
  // Counted rather than written down: cells hold three, five or six runs depending on when a tool
  // was topped up, and "five times" stopped being true the day a second tool arrived.
  const runsTotal = cells.reduce((sum, cell) => sum + cell.runs, 0)
  const toolNames = [...new Set(cells.map((cell) => cell.tool.split(' ')[0]))]
  const silent = measured.reduce((sum, row) => sum + ((row.cell?.rows.length ?? 0) - row.named), 0)
  const vendors = measured.reduce((sum, row) => sum + (row.cell?.rows.length ?? 0), 0)

  return (
    <main className="mx-auto max-w-5xl px-6">
      <section className="border-b border-rule py-14">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">Categories</p>
        <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight">
          Who an agent names when somebody asks it to choose
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
          One buying question per category, the question a developer would type, put to an agent in isolation with
          nothing carried between the runs: {runsTotal} runs so far across {toolNames.join(' and ')}.{' '}
          <span className="font-medium text-ink">
            Across {measured.length} categories, {silent} of {vendors} vendors were never named once.
          </span>{' '}
          Not outranked. Not considered.
        </p>
      </section>

      <section className="border-b border-rule py-12">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-rule text-left font-mono text-xs uppercase tracking-[0.12em] text-ink-faint">
                <th className="py-2 pr-4 font-normal">Category</th>
                <th className="py-2 pr-4 text-right font-normal">Named at least once</th>
                <th className="py-2 pr-4 font-normal">Named first most often</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ category, cell, named, winner }) => (
                <tr key={category.id} className="border-b border-rule">
                  <td className="py-2.5 pr-4">
                    <Link href={`/c/${category.id}`} className="text-brass underline underline-offset-4">
                      {category.label}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular-nums">
                    {cell ? `${named}/${cell.rows.length}` : 'not run yet'}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-ink-soft">
                    {winner && winner.first > 0 ? `${winner.domain} (${winner.first}/${cell?.runs})` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-soft">
          A handful of runs separates a wall from silence and nothing finer, so nothing here ranks two vendors that
          finish close. The whole answer text is published under each category, marked where a vendor is named, because a
          tally is our reading and the words are the evidence.
        </p>
      </section>
    </main>
  )
}
