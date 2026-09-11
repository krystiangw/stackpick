import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CORPUS_LICENCE, CORPUS_LICENCE_IS_PUBLISHED } from '@/lib/seller'
import { pageMetadata } from '@/lib/site'

export const metadata: Metadata = pageMetadata({
  path: '/corpus-licence',
  title: 'Using the corpus: Let Agents In',
  description: 'What you may do with the published measurements, and what attribution means here.',
})

/**
 * The terms behind a sentence three published files already carry. It answers 404 until the grant
 * is agreed, the same way the seller pages do, because a licence on data already published is not
 * something to switch on by accident.
 */
export default function CorpusLicencePage() {
  if (!CORPUS_LICENCE_IS_PUBLISHED) notFound()

  return (
    <main className="mx-auto flex max-w-2xl flex-col px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">Using the corpus</h1>
      <p className="mt-6 leading-relaxed text-ink-soft">
        Every published measurement is available as data at{' '}
        <Link href="/corpus.json" className="text-brass underline underline-offset-4">
          /corpus.json
        </Link>{' '}
        and{' '}
        <Link href="/corpus.csv" className="text-brass underline underline-offset-4">
          /corpus.csv
        </Link>
        , one row per domain and check, scored under a single formula version. It is offered under{' '}
        <a href={CORPUS_LICENCE.url} className="text-brass underline underline-offset-4">
          {CORPUS_LICENCE.name}
        </a>
        , which lets you use it for anything, including commercially, as long as you say where it
        came from.
      </p>

      <h2 className="mt-12 text-lg font-semibold tracking-tight">What attribution means here</h2>
      <p className="mt-4 leading-relaxed text-ink-soft">
        The licence asks for three things wherever the figures appear, and they fit in a line:
      </p>
      <ul className="mt-4 flex flex-col gap-3 leading-relaxed text-ink-soft">
        <li>Credit us and link the source: {CORPUS_LICENCE.attribution}</li>
        <li>
          Name the licence and link it:{' '}
          <a href={CORPUS_LICENCE.url} className="text-brass underline underline-offset-4">
            {CORPUS_LICENCE.short}
          </a>
          .
        </li>
        <li>Say if you changed anything, including filtering, re-scoring or recombining rows.</li>
      </ul>

      <h2 className="mt-12 text-lg font-semibold tracking-tight">One thing we ask, which the licence does not require</h2>
      <p className="mt-4 leading-relaxed text-ink-soft">
        Keep the formula version with the figures. It is a request and not a condition, because CC BY
        does not let anybody add conditions to it, and nothing you do with the version affects your
        licence. We ask because a verdict is only meaningful against the rules it was measured under,
        those rules change every few days, and a figure quoted without its version is a figure nobody
        can check or argue with.
      </p>

      <h2 className="mt-12 text-lg font-semibold tracking-tight">What this is not</h2>
      <ul className="mt-4 flex flex-col gap-3 leading-relaxed text-ink-soft">
        <li>
          It is not a ranking and it is not advice about any vendor. Each row says what one HTTP
          request returned on one date, and the rule it was scored by is published beside it.
        </li>
        <li>
          It is not a warranty. A measurement can be wrong, and where we know one is, it is marked
          on the page rather than quietly deleted. Tell us and we rescan.
        </li>
        <li>
          It says nothing about a vendor we have not measured. Absence from the corpus is absence
          from our list, not a judgement.
        </li>
      </ul>
    </main>
  )
}
