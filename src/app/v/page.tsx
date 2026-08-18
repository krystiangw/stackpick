import type { Metadata } from 'next'
import Link from 'next/link'
import { CATEGORIES, CURATED_DOMAINS } from '@/lib/categories'
import { publishedCorpus } from '@/lib/published'
import { getStore } from '@/lib/store'
import { SITE_URL } from '@/lib/site'

/**
 * Every vendor we hold, linked. A sitemap tells a crawler the pages exist; a page linking them
 * is what makes them worth crawling, and it is also the only place a person can see the whole
 * corpus without downloading a file.
 */
/** Cached for the same reason as the pages it links: it is a crawler's first stop. */
export const revalidate = 600

export const metadata: Metadata = {
  title: 'Every vendor we have measured · Let Agents In',
  description:
    'Agent readiness scores for the vendors in our corpus, by category. Each is measured with the same deterministic HTTP checks and republished whenever we rescan.',
  alternates: { canonical: `${SITE_URL}/v` },
}

export default async function VendorIndex() {
  const { reports, formulaVersion } = await publishedCorpus()
  const scores = new Map(reports.map((report) => [report.domain, report.scorecard]))
  // One read for the whole list, not one per row. A frozen score sitting unmarked in a ranked list
  // is the same stale claim the vendor page now refuses to make, printed 177 times.
  //
  // A failed read is not "nothing is frozen". Swallowed into an empty set it would print every
  // frozen row as an ordinary ranked result, so the page says it could not check instead: the
  // ranking is still worth reading, the claim that all of it is current is not ours to make.
  const stayOuts = await getStore()
    .stayOuts()
    .then((all) => all.map((one) => one.domain))
    .catch(() => null)
  const frozen = new Set(stayOuts ?? [])

  return (
    <main className="mx-auto flex max-w-3xl flex-col px-6 py-16">
      <h1 className="text-3xl font-semibold">Every vendor we have measured</h1>
      <p className="mt-4 max-w-2xl leading-relaxed">
        {scores.size} companies under formula {formulaVersion}, grouped by the job they do. The number is points
        won out of points we could measure, so a small denominator means a site we could not fully read rather
        than a vendor doing badly.
      </p>
      <p className="mt-4 max-w-2xl leading-relaxed">
        {stayOuts === null
          ? 'We could not check which of these rows are frozen at their owner\u2019s request just now, so none is marked. A row can be frozen and look current on this page until the check comes back.'
          : stayOuts.length === 0
            ? 'None of these rows is frozen: every one is still being refreshed.'
            : `${stayOuts.length} of these rows are frozen at their owner\u2019s request and marked as such: they keep their last measurement and are no longer refreshed.`}
      </p>
      {/* Two formula versions are never comparable, so we publish whichever covers the most domains
          and the rest wait for their next scan. A reseed converts them one at a time, and one that
          stops half way leaves this number looking like our whole corpus when it is not. Saying so
          costs a sentence; leaving it unsaid understates the work and invites the reader to think
          we have measured far less than we have. */}
      {scores.size < CURATED_DOMAINS.size && (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-faint">
          We hold {CURATED_DOMAINS.size} vendors in total. The {CURATED_DOMAINS.size - scores.size} not listed
          here were last measured under an older formula, and scores from two formulas are not comparable, so
          they wait for their next scan rather than sit in a ranking they cannot be ranked in.
        </p>
      )}

      {CATEGORIES.map((category) => {
        const measured = category.domains.filter((domain) => scores.has(domain))
        if (measured.length === 0) return null
        return (
          <section key={category.id} className="mt-10 border-t border-rule pt-4">
            <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">{category.label}</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {measured.map((domain) => {
                const card = scores.get(domain)!
                const measurable = card.measurable ?? card.max
                return (
                  <li key={domain} className="grid grid-cols-[4rem_1fr] gap-4">
                    <span className="font-mono text-xs text-ink-soft">
                      {card.total}/{measurable}
                    </span>
                    <span className="text-sm">
                      <Link href={`/v/${domain}`} className="text-brass underline underline-offset-4">
                        {domain}
                      </Link>
                      {frozen.has(domain) && (
                        <span className="ml-2 font-mono text-xs text-warn">frozen at their request</span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </main>
  )
}
