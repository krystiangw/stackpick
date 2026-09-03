import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ReportMarkdown } from '@/components/report-markdown'
import { ReportView } from './report-view'
import { getStore } from '@/lib/store'
import { recordVisit } from '@/lib/visits'
import { headers } from 'next/headers'
import { retractedScaleIn } from '@/lib/claims'

export const dynamic = 'force-dynamic'

/**
 * A delivered report, at a link only the buyer has.
 *
 * Never indexed and never listed: the document names a vendor's failures in more detail than
 * anything we publish for free, and it belongs to whoever paid for it. The id is the only key,
 * which is the same shape as every other private link on this site.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const delivery = await getStore().getDelivery(id)
  return {
    title: delivery ? `${delivery.domain}: agent report` : 'Report not found: Let Agents In',
    robots: { index: false, follow: false },
  }
}

export default async function DeliveredReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const delivery = await getStore().getDelivery(id)
  if (!delivery) notFound()
  // Counted as '/d', never by id: the id is the only key to a private report, and a path in
  // `visits` shows up in /app. Which recipient opened it is exactly what /privacy says we do not keep.
  recordVisit('/d', (await headers()).get('user-agent'))
  const retracted = retractedScaleIn(delivery)

  return (
    // The attribute the print stylesheet looks for. Only this page is a document somebody prints.
    <main data-deliverable className="mx-auto max-w-5xl px-6 py-14">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule pb-4 print:pb-2">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">
          {delivery.sample ? 'Sample report' : 'Your report'} · formula v{delivery.formulaVersion}
        </p>
        <p className="font-mono text-xs text-ink-faint">Prepared {delivery.preparedAt.slice(0, 10)}</p>
      </div>

      {/* A delivered document is not rewritten and not deleted, so the only honest place to say
          "we no longer stand behind this sentence" is above it. Three stored samples still carry
          a scale claim we withdrew from the generator, and whoever holds the link reads it today. */}
      {retracted !== '' && (
        <p className="mt-6 max-w-2xl border-l-2 border-brass pl-4 text-sm leading-relaxed text-ink-soft">
          One sentence below says how common something is across other companies (&ldquo;{retracted}&rdquo;), and we
          never measured that. It is out of the report we generate today. This copy is kept exactly as it was
          delivered rather than edited after the fact, so you can see what you were sent.
        </p>
      )}

      {/* The model when we have one, the markdown when the delivery predates it. Never both: two
          renderings of one report in one page is how a reader ends up quoting the wrong number. */}
      {delivery.model ? <ReportView model={delivery.model} /> : <ReportMarkdown markdown={delivery.markdown} />}

      <section className="mt-14 border-t border-rule pt-8">
        <p className="max-w-2xl leading-relaxed text-ink-soft">
          Every number above is reproducible: the scan half is the published formula, and the runs half is
          quoted from answers you can read in full. If a sentence here is wrong about your product, tell us
          and we will recheck it by hand.
        </p>
        <p className="mt-4 font-mono text-sm print:hidden">
          {/* The subject is prefilled, as it is on the public vendor page. The dispute runbook says
              every page carries one so a correction "arrives eventually" - and the one page a
              customer paid for was the page that did not, which makes their mail the hardest of
              all to triage. */}
          <a
            href={`mailto:hello@letagentsin.com?subject=${encodeURIComponent(`Wrong verdict on ${delivery.domain}`)}`}
            className="text-brass underline underline-offset-4"
          >
            hello@letagentsin.com
          </a>
          {' · '}
          <Link href="/methodology" className="text-brass underline underline-offset-4">
            how every check is measured
          </Link>
        </p>
      </section>
    </main>
  )
}
