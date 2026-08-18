import type { Metadata } from 'next'
import { CONTROLLER_IS_NAMED, CORPUS_LICENCE, CORPUS_LICENCE_IS_PUBLISHED, SELLER_IS_COMPLETE } from '@/lib/seller'
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google'
import Link from 'next/link'
import { SITE_URL } from '@/lib/site'
import './globals.css'

const plexSans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

/**
 * The entry requirement belongs in the snippet, not three scrolls down the page. Our own runs
 * measured agents rejecting a vendor on a search result they never opened: Auth0 lost one to an
 * aggregator's claim that it wanted a card, and the single run that opened the pricing page found
 * no card was wanted. "Free, no account" is the sentence we would have wanted Auth0 to have.
 */
const DESCRIPTION =
  'Measures whether an AI coding agent can find, register with and integrate your product. Free, no account: deterministic checks, published formula, reproducible score.'

export const metadata: Metadata = {
  // Without this Next resolves the file-based OG image against localhost, so every
  // scorecard forwarded to Slack or LinkedIn arrived as a bare link with no card.
  metadataBase: new URL(process.env.STACKPICK_BASE_URL ?? 'http://localhost:3000'),
  title: 'Let Agents In: can an AI agent get through your product?',
  description: DESCRIPTION,
  // Only the vendor pages carried these, so the two pages somebody would actually forward - the
  // front page and /findings - arrived in Slack and on LinkedIn as a bare link with no card.
  // Nothing links to this site yet, and a shared link that renders as nothing is the mechanism
  // that would earn the first ones failing quietly.
  openGraph: {
    type: 'website',
    siteName: 'Let Agents In',
    url: SITE_URL,
    title: 'Let Agents In: can an AI agent get through your product?',
    description: DESCRIPTION,
  },
  twitter: { card: 'summary_large_image' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${plexSans.variable} ${plexMono.variable} font-sans antialiased`}>
        {/* Organization and the dataset, and deliberately nothing else. Review or AggregateRating
            markup would tell a search engine we rate these products; we measure whether an agent
            gets through, which the pages say in words and a schema must not contradict. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': `${SITE_URL}#org`,
                  name: 'Let Agents In',
                  url: SITE_URL,
                  email: 'hello@letagentsin.com',
                  founder: { '@type': 'Person', name: 'Krystian Gwizdała' },
                  description:
                    'Measures whether an AI coding agent can find, register with and integrate a product, using deterministic HTTP checks with published rules.',
                },
                {
                  '@type': 'Dataset',
                  '@id': `${SITE_URL}#corpus`,
                  name: 'Agent readiness corpus',
                  description:
                    'Every published scan as data: one row per vendor and check, scored under a single formula version, with the sentence behind each verdict.',
                  url: `${SITE_URL}/report`,
                  creator: { '@id': `${SITE_URL}#org` },
                  isAccessibleForFree: true,
                  // The terms live in prose beside the data, and /terms is not a page we have.
                  // A licence field pointing at a 404 is a claim about our own terms that fails.
                  // The licence when there is one, the methodology when there is not: a dataset that
                  // names a page of rules as its licence tells a crawler nothing about reuse.
                  license: CORPUS_LICENCE_IS_PUBLISHED ? CORPUS_LICENCE.url : `${SITE_URL}/methodology`,
                  conditionsOfAccess:
                    CORPUS_LICENCE_IS_PUBLISHED
                      ? `Free to use, quote and republish under ${CORPUS_LICENCE.short}. Terms at ${SITE_URL}/corpus-licence.`
                      : 'Free to use, quote and republish with attribution to Let Agents In and a link to the methodology.',
                  distribution: [
                    { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${SITE_URL}/corpus.json` },
                    { '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: `${SITE_URL}/corpus.csv` },
                  ],
                },
              ],
            }),
          }}
        />
        <header className="border-b border-rule">
          <div className="mx-auto flex max-w-5xl flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-6 py-4">
            <Link href="/" className="font-mono text-base font-semibold tracking-tight">
              Let Agents <span className="text-brass">In</span>
            </Link>
            <nav className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs [&>a]:py-1.5 uppercase tracking-widest text-ink-faint">
              <Link href="/docs" className="hover:text-ink">
                Docs
              </Link>
              <Link href="/methodology" className="hover:text-ink">
                Methodology
              </Link>
              <Link href="/c" className="hover:text-ink">
                Categories
              </Link>
              <Link href="/report" className="hover:text-ink">
                Report
              </Link>
              <Link href="/findings" className="hover:text-ink">
                Findings
              </Link>
              <Link href="/audit" className="hover:text-ink">
                Audits
              </Link>
              <Link href="/pricing" className="hover:text-ink">
                Pricing
              </Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="mt-24 border-t border-rule">
          <div className="mx-auto flex max-w-5xl flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-6 py-8 font-mono text-xs text-ink-faint">
            <p className="max-w-2xl">
              Let Agents In measures agent behaviour, not marketing. Every check on the free scan is an HTTP
              request with a published rule.
            </p>
            {/* One person does the work, and a buyer weighing a five-figure engagement with a stranger
                asks who that is before anything else. Naming him costs nothing and hiding him is what
                reads as evasive. */}
            {/* Linked only once the imprint behind them is real: the pages answer 404 while the
                seller details are unset, and a footer link into a 404 is worse than no link. */}
            {/* Privacy is linked on its own flag: it answers a duty that starts when the email form
                starts collecting addresses, and that is already true. Terms and refunds describe a
                sale and stay behind the seller details. */}
            <p className="flex gap-4">
              {SELLER_IS_COMPLETE && (
                <Link href="/terms" className="hover:text-ink">
                  Terms
                </Link>
              )}
              {CONTROLLER_IS_NAMED && (
                <Link href="/privacy" className="hover:text-ink">
                  Privacy
                </Link>
              )}
              {SELLER_IS_COMPLETE && (
                <Link href="/refunds" className="hover:text-ink">
                  Refunds
                </Link>
              )}
            </p>
            <p>
              Built by{' '}
              <a
                href="https://krystiangw.github.io/krystiangw/"
                className="text-brass underline underline-offset-4 hover:text-ink"
              >
                Krystian Gwizdała
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}
