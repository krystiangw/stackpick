import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { recordVisit } from '@/lib/visits'
import { REFUNDS, SELLER, SELLER_IS_COMPLETE } from '@/lib/seller'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  alternates: { canonical: `${SITE_URL}/refunds` },
  title: 'Refunds: Let Agents In',
  description: 'What we give back and when, for the one-off report and for monitoring.',
}

/**
 * A refund policy is a payment provider's hard requirement and a buyer's second question. Written
 * to be usable rather than defensive: the expensive case for us is a report somebody reads and
 * regrets, and that is exactly the one we refund without asking why.
 */
export default async function RefundsPage() {
  if (!SELLER_IS_COMPLETE) notFound()
  recordVisit('/refunds', (await headers()).get('user-agent'))
  return (
    <main className="mx-auto max-w-3xl px-6">
      <section className="border-b border-rule py-14">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight">Refunds</h1>
        <p className="mt-5 leading-relaxed text-ink-soft">
          One address for all of it:{' '}
          <a href={`mailto:${SELLER.email}`} className="text-brass underline underline-offset-4">
            {SELLER.email}
          </a>
          . No form, no reason required where the policy says none is required.
        </p>
      </section>

      <section className="flex flex-col gap-6 border-b border-rule py-12 leading-relaxed text-ink-soft">
        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">The one-off report</h2>
          <p className="mt-4">
            {REFUNDS.reportDays} days, money back, no reason needed. Ask within {REFUNDS.reportDays} days of delivery
            and you get the whole amount, whether or not you read it. We do not ask you to return the file, because you
            cannot un-read a document and pretending otherwise would make the promise theatre.
          </p>
          <p className="mt-3">
            Two things we would rather do than refund, and you can ask for either instead: rescan you, if the scan half
            of the report describes a state you have since fixed, or rerun the agent runs, if you think the question we
            put to the agent is not the question your buyers ask. Both are free.
          </p>
        </div>

        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Monitoring</h2>
          <p className="mt-4">
            Monitoring is a free beta, so there is no subscription payment to refund.
            You can stop it through the link in any monitoring email.
          </p>
        </div>

        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">The audit</h2>
          <p className="mt-4">
            Priced by conversation and invoiced by hand, so refunds are part of that conversation rather than a policy
            line. What we will not do is charge for a run that did not happen: if the work stops early, you pay for the
            part that was delivered and we say which part that is.
          </p>
        </div>

        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">If we cannot measure you</h2>
          <p className="mt-4">
            We say so before you pay, not after. A domain outside the categories we measure is refused at the point of
            purchase, and a scan that could not read your site produces a report that says which checks were
            unmeasurable rather than a score dressed up as a verdict. If one gets through anyway, that is a full refund
            without the {REFUNDS.reportDays}-day limit.
          </p>
        </div>
      </section>
    </main>
  )
}
