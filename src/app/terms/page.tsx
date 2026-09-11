import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { recordVisit } from '@/lib/visits'
import { REFUNDS, SELLER, SELLER_IS_COMPLETE } from '@/lib/seller'
import { pageMetadata } from '@/lib/site'

export const metadata: Metadata = pageMetadata({
  path: '/terms',
  title: 'Terms: Let Agents In',
  description: 'What you are buying, what it does not promise, and what happens when either side wants to stop.',
})

/**
 * Written to be read, and only about things this product actually does. Every clause here answers
 * a question a buyer or a payment provider asks; nothing is here because contracts usually have it.
 */
export default async function TermsPage() {
  if (!SELLER_IS_COMPLETE) notFound()
  recordVisit('/terms', (await headers()).get('user-agent'))
  return (
    <main className="mx-auto max-w-3xl px-6">
      <section className="border-b border-rule py-14">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight">Terms</h1>
        <p className="mt-5 leading-relaxed text-ink-soft">
          Between you and {SELLER.legalName}, {SELLER.address}
          {SELLER.taxId ? `, ${SELLER.taxId}` : ''}, who runs letagentsin.com. Questions and notices:{' '}
          <a href={`mailto:${SELLER.email}`} className="text-brass underline underline-offset-4">
            {SELLER.email}
          </a>
          .
        </p>
      </section>

      <section className="flex flex-col gap-6 border-b border-rule py-12 leading-relaxed text-ink-soft">
        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">What the service is</h2>
          <p className="mt-4">
            A scanner that makes HTTP requests to the public pages of a domain and scores what they answer against a{' '}
            <Link href="/methodology" className="text-brass underline underline-offset-4">
              published formula
            </Link>
            , and a set of agent runs that record which providers an agent names when asked a buying question. The free
            scan needs no account and no card. Monitoring is a free beta, available independently. The paid products are
            a one-off report and an integration pilot with an agreed scope, described on{' '}
            <Link href="/pricing" className="text-brass underline underline-offset-4">
              /pricing
            </Link>
            .
          </p>
        </div>

        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">What it does not promise</h2>
          <p className="mt-4">
            A score is a measurement of what your pages answered at a moment, not a prediction that fixing a row will
            make an agent choose you. We publish which of our checks we can show any relationship with being named, and
            which we cannot, on{' '}
            <Link href="/findings" className="text-brass underline underline-offset-4">
              /findings
            </Link>
            . Agent runs are samples: a handful of runs separates a wall from silence and nothing finer, and the same
            question asked tomorrow can produce a different order. Anything we could not measure is reported as
            unmeasurable rather than as a failure.
          </p>
        </div>

        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Scanning and publishing</h2>
          <p className="mt-4">
            Scans read pages a vendor publishes to anyone, at ordinary volumes, identifying themselves in the
            user-agent with a link to the methodology. Results carry a permanent link and the curated corpus is
            published. If a verdict about your domain is wrong, write to us: we rescan, and where we published
            something false we correct it beside the row rather than deleting it quietly.
          </p>
        </div>

        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Using it fairly</h2>
          <p className="mt-4">
            Do not use the scanner to load somebody else&apos;s site beyond what it is for, to work around the rate
            limits, or to present our measurements as yours. Reuse the numbers freely with a link back: the whole point
            of publishing the formula and the corpus is that the results can be argued with.
          </p>
        </div>

        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Money</h2>
          <p className="mt-4">
            Prices are on{' '}
            <Link href="/pricing" className="text-brass underline underline-offset-4">
              /pricing
            </Link>{' '}
            and are stated in US dollars. Monitoring is free, with no announced paid price or end date.
            We will ask before charging you. Every monitoring email carries a stop link. Refunds are on{' '}
            <Link href="/refunds" className="text-brass underline underline-offset-4">
              /refunds
            </Link>
            : {REFUNDS.reportDays} days on the one-off report, no reason required. Where a payment provider acts as
            merchant of record, they are the seller on your invoice and their terms apply to the payment itself.
          </p>
        </div>

        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Liability</h2>
          <p className="mt-4">
            The service is provided as it is. We are liable for what the law does not let us exclude, and beyond that
            up to the amount you paid us in the twelve months before the claim. We are not liable for decisions taken
            on the basis of a measurement, which is why every number here is published with its rule and its limits.
          </p>
        </div>

        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Stopping</h2>
          <p className="mt-4">
            You can stop monitoring at any time from the link in any mail. We can stop serving an account that uses the
            scanner against the rules above, and we will say why. On stopping we keep what we are required to keep for
            invoicing and delete the rest on request.
          </p>
        </div>

        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Law</h2>
          <p className="mt-4">
            The law of {SELLER.jurisdiction} governs these terms, and its courts hear a dispute we cannot settle by
            email. If you are a consumer rather than a business, the rights your own country gives you are unaffected
            by this.
          </p>
        </div>
      </section>
    </main>
  )
}
