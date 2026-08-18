import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ReportMarkdown } from '@/components/report-markdown'
import { getStore } from '@/lib/store'

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

  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule pb-4">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">
          {delivery.sample ? 'Sample report' : 'Your report'} · formula v{delivery.formulaVersion}
        </p>
        <p className="font-mono text-xs text-ink-faint">Prepared {delivery.preparedAt.slice(0, 10)}</p>
      </div>

      <ReportMarkdown markdown={delivery.markdown} />

      <section className="mt-14 border-t border-rule pt-8">
        <p className="max-w-2xl leading-relaxed text-ink-soft">
          Every number above is reproducible: the scan half is the published formula, and the runs half is
          quoted from answers you can read in full. If a sentence here is wrong about your product, tell us
          and we will recheck it by hand.
        </p>
        <p className="mt-4 font-mono text-sm">
          <a href="mailto:hello@letagentsin.com" className="text-brass underline underline-offset-4">
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
