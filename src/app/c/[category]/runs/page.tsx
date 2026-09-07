import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { certain, mentionsIn } from '@/lib/vendors'
import { CATEGORIES } from '@/lib/categories'
import { recordVisit } from '@/lib/visits'
import { headers } from 'next/headers'
import { SITE_URL } from '@/lib/site'
import cells from '@/data/cells.json'
import { RunBrowser } from '@/components/run-browser'
import { AnswerMarkdown } from '@/components/answer-markdown'

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
          The agent answers
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">
          {held.reduce((sum, one) => sum + one.answers.length, 0)} recorded answers. Browse by tool, date or vendor, then open a run to read it.
        </p>
        <details className="mt-6 rounded-lg border border-rule bg-surface p-5">
          <summary className="cursor-pointer text-sm font-medium">The exact question</summary>
          <blockquote className="mt-3 max-w-3xl border-l-2 border-brass pl-4 leading-relaxed text-ink-soft">{cell.question}</blockquote>
        </details>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-soft">
          Each run used a separate session. Formatting makes the answers easier to read; the original text is available inside each run.
          Vendor counts use our published matcher. A first mention records order, not a purchase.
        </p>
        {held.some((one) => one.operatorContext.length > 0) && (
          <p className="mt-4 rounded-md border-l-2 border-warn bg-surface p-4 text-sm leading-relaxed text-ink-soft">
            The {held.filter((one) => one.operatorContext.length > 0).map((one) => `${one.tool.split(' ')[0]} runs of ${one.ranAt}`).join(' and ')} could read operator instructions.
            Those instructions request Polish, so some answers are in Polish. Results describe this setup.
          </p>
        )}
      </section>

      <RunBrowser
        batches={held.map((one, index) => ({ id: `batch-${index}`, label: `${one.tool.split(' ')[0]} / ${one.ranAt} / ${one.answers.length} runs` }))}
        vendors={category.domains}
        runs={held.flatMap((one, batchIndex) => one.answers.map((answer) => {
          const runId = `run-${one.tool.split(' ')[0]}-${one.ranAt}-${answer.run}`
          return {
            id: runId, batch: `batch-${batchIndex}`, vendors: answer.named,
            content: (
              <details id={runId} className="run-card rounded-lg border border-rule bg-surface">
                <summary className="cursor-pointer list-none p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                        <span className="rounded bg-brass-soft px-2 py-1 font-mono text-brass">{one.tool.split(' ')[0]}</span>
                        <span>{one.ranAt}</span><span>Run {answer.run}</span>
                      </p>
                      <h2 className="mt-3 text-base font-medium sm:text-lg">
                        {answer.first ? `${answer.first} named first` : 'No measured vendor named'}
                      </h2>
                      <p className="mt-2 text-sm text-ink-soft">{answer.named.length} measured {answer.named.length === 1 ? 'vendor' : 'vendors'} mentioned</p>
                    </div>
                    <span className="run-toggle mt-1 shrink-0 text-sm font-medium text-brass"><span className="when-closed">Read</span><span className="when-open">Close</span> <span aria-hidden="true">+</span></span>
                  </div>
                </summary>
                <div className="border-t border-rule px-5 pb-6 pt-5 sm:px-7">
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-faint">
                    <p>{one.tool} ({one.model})</p>
                    <a href={`#${runId}`} className="inline-flex min-h-11 items-center text-brass underline underline-offset-4">Link to this run</a>
                  </div>
                  <AnswerMarkdown text={answer.text} />
                  <details className="mt-8 border-t border-rule pt-5">
                    <summary className="cursor-pointer text-sm font-medium">Original text</summary>
                    <pre data-original-answer={runId} className="mt-4 whitespace-pre-wrap break-words rounded-md bg-ground p-4 font-mono text-xs leading-relaxed text-ink-soft">{marked(answer.text, category.domains)}</pre>
                  </details>
                </div>
              </details>
            ),
          }
        }))}
      />

      <section className="py-10">
        <p className="max-w-2xl text-sm leading-relaxed text-ink-soft">
          Vendor mentions are counted with a published list of names and a regular expression.{' '}
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
