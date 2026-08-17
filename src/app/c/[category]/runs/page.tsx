import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { certain, mentionsIn } from '@/lib/vendors'
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

/**
 * Marks the vendor names in the answer without touching a character of what was said.
 *
 * By the published matcher, not by a substring search, because the page sits directly under a table
 * of counts produced by that matcher and a mark it disagrees with discredits both. A bare search for
 * the first label of each domain highlighted "name" inside nameservers, "cal" inside calculates and
 * "here" inside where: on domains-dns that put a mark on a vendor the table above says was never
 * named once. The same weaker reading was quoting competitors at vendors in the paid report until
 * this afternoon, which is how this one was found.
 *
 * Only the exact strings the matcher accepted, matched case-sensitively. That under-marks a lower
 * case "stripe" where the run wrote "Stripe", and under-marking is the safe direction: every mark
 * on this page is a mention the count behind it also counted.
 */
function marked(text: string, domains: string[]) {
  const forms = [...new Set(certain(mentionsIn(text, domains)).map((mention) => mention.matched))]
    .filter((form) => form.length > 2)
    .sort((a, b) => b.length - a.length)
    .map((form) => form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (forms.length === 0) return [text]
  // One capture group, so split puts the matches at the odd indices. The previous version also
  // called pattern.test on each piece, which with a global regular expression carries lastIndex
  // between calls and skips every other match on its own.
  return text.split(new RegExp(`(${forms.join('|')})`, 'g')).map((piece, index) =>
    index % 2 === 1 ? (
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

  // Cleanest first: a run that read none of this machine's instructions comes before one that did.
  const held = cells
    .filter((candidate) => candidate.category === id)
    .sort((a, b) => a.operatorContext.length - b.operatorContext.length)
  const cell = held[0]
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
          What the agent actually answered, all {held.reduce((sum, one) => sum + one.answers.length, 0)} times
        </h1>
        <blockquote className="mt-6 max-w-2xl border-l-2 border-brass pl-5 leading-relaxed">{cell.question}</blockquote>
        <p className="mt-4 font-mono text-xs leading-relaxed text-ink-faint">
          {cell.tool} ({cell.model}), {cell.ranAt}. Each run is a separate session with nothing carried between
          them. Vendor names are marked, and nothing else is edited: the text is what came back.
        </p>
        {cell.operatorContext.length > 0 && (
          <p className="mt-3 max-w-2xl font-mono text-xs leading-relaxed text-ink-faint">
            Not a clean measurement: these runs could read the operator instructions on the machine they ran on
            ({cell.operatorContext.join(', ')}), which is also why some answers below are in Polish rather than
            English: those instructions ask for it.
          </p>
        )}
      </section>

      {held.flatMap((one) =>
        one.answers.map((answer) => (
        <section key={`${one.tool}-${answer.run}`} className="border-b border-rule py-10">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">
              {one.tool.split(' ')[0]} · run {answer.run}
            </h2>
            <p className="font-mono text-xs text-ink-soft">
              {answer.first ? `named ${answer.first} first` : 'named no vendor we measure'}
              {answer.named.length > 1 ? ` · ${answer.named.length} of ours named in all` : ''}
            </p>
          </div>
          <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
            {marked(answer.text, category.domains)}
          </div>
        </section>
        )),
      )}

      <section className="py-10">
        <p className="max-w-2xl text-sm leading-relaxed text-ink-soft">
          Counting who was named is done by a published list of names and a published regular expression, never by
          a second model reading the first one&apos;s answer. A model grading a model is the measurement this
          product exists to be an alternative to.{' '}
          <Link href="/methodology#named" className="text-brass underline underline-offset-4">
            How the counting works
          </Link>{' '}
          or{' '}
          <Link href={`/c/${id}`} className="text-brass underline underline-offset-4">
            back to the tally
          </Link>
        </p>
      </section>
    </main>
  )
}
