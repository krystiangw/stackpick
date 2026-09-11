import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { recordVisit } from '@/lib/visits'
import { CONTROLLER, CONTROLLER_IS_NAMED, SELLER, SELLER_IS_COMPLETE } from '@/lib/seller'
import { WATCH_FIELDS_DISCLOSED } from '@/lib/watch'
import { pageMetadata } from '@/lib/site'

export const metadata: Metadata = pageMetadata({
  path: '/privacy',
  title: 'Privacy: Let Agents In',
  description: 'What we store, what we do not, and how to have it deleted. No cookies, advertising or session recording.',
})

/**
 * Short because the product is short on data. The scanner reads public pages of companies, so the
 * only personal data here is an email somebody typed to receive something, and the visit counter
 * stores a date and a path with no identifier at all.
 */
export default async function PrivacyPage() {
  // Gated on the controller rather than on the seller, because the duty this page answers begins
  // when the email form starts collecting addresses, not when a checkout opens. The seller fields
  // still gate the terms and the refund policy, which really are about a sale.
  if (!CONTROLLER_IS_NAMED) notFound()
  recordVisit('/privacy', (await headers()).get('user-agent'))
  return (
    <main className="mx-auto max-w-3xl px-6">
      <section className="border-b border-rule py-14">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight">Privacy</h1>
        <p className="mt-5 leading-relaxed text-ink-soft">
          {CONTROLLER.isSeller && SELLER_IS_COMPLETE ? (
            <>
              {SELLER.legalName}, {SELLER.address}
              {SELLER.taxId ? `, ${SELLER.taxId}` : ''}, is the controller
            </>
          ) : (
            <>{CONTROLLER.name}, a private individual in {CONTROLLER.country}, is the controller</>
          )}{' '}
          of the data described here. Write to{' '}
          <a href={`mailto:${CONTROLLER.email}`} className="text-brass underline underline-offset-4">
            {CONTROLLER.email}
          </a>{' '}
          about anything on this page, including deletion.
          {/* Gated on whether a company exists, not on whether it is the controller: a registered
              seller that is not the controller is a supported setup, and denying the company there
              would publish a false sentence. */}
          {!SELLER_IS_COMPLETE && (
            <>
              {' '}
              There is no registered company behind this yet. If one is formed and becomes the controller, this page
              will say so and everyone whose address we hold will be told.
            </>
          )}
        </p>
      </section>

      <section className="flex flex-col gap-6 border-b border-rule py-12 leading-relaxed text-ink-soft">
        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">What we store</h2>
          <ul className="mt-4 flex list-disc flex-col gap-2 pl-5">
            <li>
              <strong className="text-ink">Scan results.</strong> Requests to public pages of a domain, and what they
              answered. These describe companies rather than people. A scan <em>we</em> run is published: it appears at{' '}
              <code>/v/&lt;domain&gt;</code> and in the downloadable set at <code>/corpus.json</code>. A scan{' '}
              <em>you</em> run stays at its own <code>/r/&lt;id&gt;</code> address: we do not link it from this site,
              do not show it at <code>/v/&lt;domain&gt;</code> and do not include it in <code>/corpus.json</code>. Three
              things are worth knowing about that address. If the domain was already scanned in the last fifteen
              minutes you are handed that scan instead of a new one, and when it is one of ours it is one of the
              published ones. The address is the only thing protecting a scan of your own, and it has not always been
              worth that job: from 20 August 2026 it carries 64 random bits, before that 16, and twenty-four reports
              made on 7 August 2026 - counted on 20 August 2026 - carry none at all, because the suffix did not exist
              yet and the address is the domain and the minute. Those twenty-four stopped being served on 20 August
              2026: the rows are still there, the pages are not. Treat any of the others as a link to keep rather
              than a secret.
              And if our database refuses the write, the report lives only in memory and its page says so.
            </li>
            <li>
              <strong className="text-ink">Contact details</strong>, when you give them: an email address to send a scan result, to
              confirm a domain you asked us to watch, or to deliver something you bought. An inquiry submission also includes
              your name, company or product, selected interest and message. A watch record holds{' '}
              {Object.values(WATCH_FIELDS_DISCLOSED).join(', ')}. That list is generated from the record itself rather
              than written here, so it cannot fall behind it. The inquiry form sends the fields you enter to Formspree
              for delivery to the owner&apos;s notification address; we do not buy data or join it to another service.
            </li>
            <li>
              <strong className="text-ink">A page counter.</strong> A date, a path or the name of a button that was pressed, and whether the request looked like
              a browser, an unnamed client, or one of a short list of search and AI crawlers we watch for by name so we
              can tell which indexes read us. Alongside that, one word from a fixed list naming the family of client
              that asked: <span className="font-mono text-xs">chrome</span>,{' '}
              <span className="font-mono text-xs">firefox</span>, <span className="font-mono text-xs">curl</span>,{' '}
              <span className="font-mono text-xs">python</span> and a dozen others, or{' '}
              <span className="font-mono text-xs">other</span> when it is none of them. It tells us how much of our
              traffic is a script rather than a person, which is the question this product exists to ask. The crawler
              name and that one word are the only things kept from the user-agent, and neither carries a version, a
              platform or a build. No IP address, no user-agent string stored, no identifier that could be joined to a
              person.
            </li>
            <li>
              <strong className="text-ink">Cookieless web analytics.</strong> For browsers that run JavaScript, PostHog
              counts page views, approximate unique visitors and the few actions that make up the product funnel: starting
              and completing a scan or visibility audit, opening a report, and successfully submitting an email form. We do not send the
              domain scanned, an email address, a report address, a watch token, or URL query strings. PostHog processes
              the request IP address and user-agent transiently to make a privacy-preserving identifier on its EU servers;
              neither raw value is stored and the identifier is not kept in the browser.
            </li>
            <li>
              <strong className="text-ink">AI visibility audit inputs.</strong> When you run the beta, the brand,
              domain, product category, selected depth, prompts, answers and cited sources are saved with a random audit
              identifier in MongoDB. A worker sends the prompts to signed-in Claude, Codex and Google Antigravity CLI
              sessions and to the Perplexity Search API. The result returns to this browser by that random identifier.
              Do not put confidential information in the category field.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">What we do not do</h2>
          <p className="mt-4">
            No cookies, advertising pixel or session recording. The PostHog script records only aggregate web analytics
            and the named funnel events above: automatic click capture, heatmaps, surveys, user profiles, exception
            capture and feature flags are disabled. A page remains fully readable without running that script, and our
            separate server counter measures the agents that do not run it. We do not sell personal data or use it to
            train anything.
          </p>
        </div>

        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Who processes it for us</h2>
          <p className="mt-4">
            Heroku (hosting, EU region), MongoDB Atlas (storage), Resend (scorecard and monitoring email delivery), Formspree (contact-form delivery), PostHog Cloud EU
            (cookieless aggregate web analytics), and, only when you run the visibility beta, the configured model
            providers Anthropic, OpenAI, Google and Perplexity. Each sees only what is needed to do that job. A payment provider
            is added here the day payments go live, and it will be named before anybody is asked for a card.
          </p>
        </div>

        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">How long</h2>
          <p className="mt-4">
            Scan results are kept as long as they are published, because a permanent link that stops working is worse
            than one that ages. An address given for monitoring is kept until you stop it: every email we send carries
            a stop link, and using it ends the mail immediately. An address given for a one-off delivery is kept for as
            long as we owe you a receipt or a rescan. Inquiry messages are kept in Formspree and the owner&apos;s mailbox
            as needed to answer and manage the conversation. Visibility audit jobs and their answers are kept while the beta
            is being evaluated; ask us to delete one by sending its identifier.
          </p>
        </div>

        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Your rights</h2>
          <p className="mt-4">
            Access, correction, deletion, portability and objection, under the GDPR. One email to{' '}
            <a href={`mailto:${CONTROLLER.email}`} className="text-brass underline underline-offset-4">
              {CONTROLLER.email}
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
