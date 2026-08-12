import type { Metadata } from 'next'
import Link from 'next/link'
import { CATEGORIES } from '@/lib/categories'
import { publishedCorpus } from '@/lib/published'
import { SITE_URL } from '@/lib/site'

/**
 * Every vendor we hold, linked. A sitemap tells a crawler the pages exist; a page linking them
 * is what makes them worth crawling, and it is also the only place a person can see the whole
 * corpus without downloading a file.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Every vendor we have measured · Let Agents In',
  description:
    'Agent readiness scores for the vendors in our corpus, by category. Each is measured with the same deterministic HTTP checks and republished whenever we rescan.',
  alternates: { canonical: `${SITE_URL}/v` },
}

export default async function VendorIndex() {
  const { reports, formulaVersion } = await publishedCorpus()
  const scores = new Map(reports.map((report) => [report.domain, report.scorecard]))

  return (
    <main className="mx-auto flex max-w-3xl flex-col px-6 py-16">
      <h1 className="text-3xl font-semibold">Every vendor we have measured</h1>
      <p className="mt-4 max-w-2xl leading-relaxed">
        {scores.size} companies under formula {formulaVersion}, grouped by the job they do. The number is points
        won out of points we could measure, so a small denominator means a site we could not fully read rather
        than a vendor doing badly.
      </p>

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
                    <Link href={`/v/${domain}`} className="text-sm text-brass underline underline-offset-4">
                      {domain}
                    </Link>
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
