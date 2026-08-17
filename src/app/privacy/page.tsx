import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { recordVisit } from '@/lib/visits'
import { SELLER, SELLER_IS_COMPLETE } from '@/lib/seller'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  alternates: { canonical: `${SITE_URL}/privacy` },
  title: 'Privacy: Let Agents In',
  description: 'What we store, what we do not, and how to have it deleted. No cookies, no analytics, no third-party trackers.',
}

/**
 * Short because the product is short on data. The scanner reads public pages of companies, so the
 * only personal data here is an email somebody typed to receive something, and the visit counter
 * stores a date and a path with no identifier at all.
 */
export default async function PrivacyPage() {
  if (!SELLER_IS_COMPLETE) notFound()
  recordVisit('/privacy', (await headers()).get('user-agent'))
  return (
    <main className="mx-auto max-w-3xl px-6">
      <section className="border-b border-rule py-14">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight">Privacy</h1>
        <p className="mt-5 leading-relaxed text-ink-soft">
          {SELLER.legalName}, {SELLER.address}
          {SELLER.taxId ? `, ${SELLER.taxId}` : ''}, is the controller of the data described here. Write to{' '}
          <a href={`mailto:${SELLER.email}`} className="text-brass underline underline-offset-4">
            {SELLER.email}
          </a>{' '}
          about anything on this page, including deletion.
        </p>
      </section>

      <section className="flex flex-col gap-6 border-b border-rule py-12 leading-relaxed text-ink-soft">
        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">What we store</h2>
          <ul className="mt-4 flex list-disc flex-col gap-2 pl-5">
            <li>
              <strong className="text-ink">Scan results.</strong> Requests to public pages of a domain, and what they
              answered. These describe companies rather than people, and they are published: every scan has a permanent
              link and the curated set is downloadable at <code>/corpus.json</code>.
            </li>
            <li>
              <strong className="text-ink">An email address</strong>, when you give one: to send a scan result, to
              confirm a domain you asked us to watch, or to deliver something you bought. Stored with the domain it
              belongs to and nothing else.
            </li>
            <li>
              <strong className="text-ink">A page counter.</strong> A date, a path, and whether the request looked like
              a browser or an agent. No IP address, no user-agent string, no identifier that could be joined to a
              person.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">What we do not do</h2>
          <p className="mt-4">
            No cookies. No analytics script, no advertising pixel, no session recording, no third-party tag of any
            kind. We sell vendors the argument that a page should be readable without running a bundle, so a tracker
            that needs JavaScript would sit badly next to it and would miss the visitor we care about anyway. We do not
            sell or share personal data, and we do not use it to train anything.
          </p>
        </div>

        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Who processes it for us</h2>
          <p className="mt-4">
            Heroku (hosting, EU region), MongoDB Atlas (storage), and Resend (email delivery). Each of them sees only
            what is needed to do that job. A payment provider is added here the day payments go live, and it will be
            named before anybody is asked for a card.
          </p>
        </div>

        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">How long</h2>
          <p className="mt-4">
            Scan results are kept as long as they are published, because a permanent link that stops working is worse
            than one that ages. An address given for monitoring is kept until you stop it: every email we send carries
            a stop link, and using it ends the mail immediately. An address given for a one-off delivery is kept for as
            long as we owe you a receipt or a rescan.
          </p>
        </div>

        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Your rights</h2>
          <p className="mt-4">
            Access, correction, deletion, portability and objection, under the GDPR. One email to{' '}
            <a href={`mailto:${SELLER.email}`} className="text-brass underline underline-offset-4">
              {SELLER.email}
            </a>{' '}
            is enough, and there is no account to close first. You can also complain to your data protection authority.
          </p>
        </div>

        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Scanning somebody else</h2>
          <p className="mt-4">
            Anyone can scan any domain here, which is the point: a vendor is measured the way an agent would measure
            them, from the outside, using only what they publish. If your domain is in our corpus and you would rather
            it were not, write and it comes out. If a verdict about you is wrong, write and we rescan; corrections are
            published beside the row rather than quietly applied.
          </p>
        </div>
      </section>
    </main>
  )
}
