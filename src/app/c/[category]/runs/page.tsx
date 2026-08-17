import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CATEGORIES } from '@/lib/categories'
import { recordVisit } from '@/lib/visits'
import { headers } from 'next/headers'
import { SITE_URL } from '@/lib/site'
import cells from '@/data/cells.json'

/**
 * The answers themselves, whole, with the vendor names marked.
 *
 * The table one level up is our reading of these runs. This page is what they actually said, so a
 * vendor who disagrees with a count has something to disagree with. It is also the only honest way
 * to sell a report built on five runs: the buyer sees the material rather than a summary of it.
 */
export const revalidate = 600

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category: category.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category: id } = await params
  const category = CATEGORIES.find((candidate) => candidate.id === id)
  if (!category) return {}
  return {
    title: `What the agent actually answered: ${category.label} · Let Agents In`,
    description: `Every answer from our ${category.label.toLowerCase()} runs, in full, with the vendors it named marked.`,
    alternates: { canonical: `${SITE_URL}/c/${id}/runs` },
  }
}

/** Marks the vendor names in the answer without touching a character of what was said. */
function marked(text: string, domains: string[]) {
  const names = [...new Set(domains.flatMap((domain) => [domain, domain.split('.')[0]]))]
    .filter((name) => name.length > 2)
    .sort((a, b) => b.length - a.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (names.length === 0) return [text]
  const pattern = new RegExp(`(${names.join('|')})`, 'gi')
  return text.split(pattern).map((piece, index) =>
    pattern.test(piece) && index % 2 === 1 ? (
      <mark key={index} className="bg-brass-soft text-ink">
        {piece}
      </mark>
    ) : (
      <span key={index}>{piece}</span>
    ),
  )
}

export default async function RunsPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: id } = await params
  const category = CATEGORIES.find((candidate) => candidate.id === id)
  if (!category) notFound()
  recordVisit(`/c/${id}/runs`, (await headers()).get('user-agent'))

  const cell = cells.find((candidate) => candidate.category === id)
  if (!cell || cell.answers.length === 0) notFound()

  return (
    <main className="mx-auto max-w-4xl px-6">
      <section className="border-b border-rule py-12">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">
          <Link href={`/c/${id}`} className="underline underline-offset-4">
            {category.label}
          </Link>
        </p>
        <h1 className="mt-4 max-w-3xl text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          What the agent actually answered, all {cell.answers.length} times
        </h1>
        <blockquote className="mt-6 max-w-2xl border-l-2 border-brass pl-5 leading-relaxed">{cell.question}</blockquote>
        <p className="mt-4 font-mono text-xs leading-relaxed text-ink-faint">
          {cell.tool} ({cell.model}), {cell.ranAt}. Each run is a separate session with nothing carried between
          them. Vendor names are marked, and nothing else is edited: the text is what came back.
        </p>
        {cell.operatorContext.length > 0 && (
          <p className="mt-3 max-w-2xl font-mono text-xs leading-relaxed text-ink-faint">
            Not a clean measurement: these runs could read the operator instructions on the machine they ran on
            ({cell.operatorContext.join(', ')}).
          </p>
        )}
      </section>

      {cell.answers.map((answer) => (
        <section key={answer.run} className="border-b border-rule py-10">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Run {answer.run}</h2>
            <p className="font-mono text-xs text-ink-soft">
              {answer.first ? `named ${answer.first} first` : 'named no vendor we measure'}
              {answer.named.length > 1 ? ` · ${answer.named.length} of ours named in all` : ''}
            </p>
          </div>
          <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
            {marked(answer.text, category.domains)}
          </div>
        </section>
      ))}

      <section className="py-10">
        <p className="max-w-2xl text-sm leading-relaxed text-ink-soft">
          Counting who was named is done by a published list of names and a published regular expression, never by
          a second model reading the first one&apos;s answer. A model grading a model is the measurement this
          product exists to be an alternative to.{' '}
          <Link href={`/c/${id}`} className="text-brass underline underline-offset-4">
            Back to the tally
          </Link>
        </p>
      </section>
    </main>
  )
}
