import Link from 'next/link'
import type { RankedCategory } from '@/lib/rankings'

function tone(total: number, max: number): string {
  if (total <= max / 3) return 'bg-fail'
  if (total >= (max * 2) / 3) return 'bg-pass'
  return 'bg-warn'
}

/**
 * Every entry of every category used to render. At 103 domains in 15 categories that was 5,339px
 * of a 10,002px page on a phone, six and a half screens of list before the reader reached what
 * the five stages are. The corpus is the proof, not the argument, so the page shows the shape of
 * each category and sends anyone who wants all of it to the data.
 */
const SHOWN_PER_CATEGORY = 5

export function Rankings({ rankings }: { rankings: RankedCategory[] }) {
  if (rankings.length === 0) return null

  return (
    <section className="border-b border-rule py-14">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        {/* Not "scanned so far": this list drops any category holding fewer than four rows, so the
            number under it was smaller than the corpus count printed higher up the same page, and
            the label made the smaller one read as the total. */}
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Ranked by category</h2>
        <p className="font-mono text-xs text-ink-faint">
          {rankings.reduce((sum, ranked) => sum + ranked.entries.length, 0)} domains in {rankings.length} categories
          large enough to rank · every result is a live link
        </p>
      </div>

      <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
        Ordered by the share of measurable points earned. Unmeasured and inapplicable checks do not count against a vendor.
      </p>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-faint">
        An asterisk (*) means too little was measurable for a fair comparison. These rows appear last, regardless of their percentage.
      </p>
      <details className="mt-6 rounded-lg border border-rule bg-surface p-5 sm:p-6">
        <summary className="cursor-pointer text-base font-medium">Browse all {rankings.length} categories and their scorecards</summary>

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        {rankings.map(({ category, entries, median }) => (
          <div key={category.id}>
            <div className="flex items-baseline justify-between gap-3 border-b border-rule pb-2">
              {/* The category page answers what a buyer types before they know us: who an agent
                  names for this job. Nothing linked to it, so nothing found it. */}
              <h3 className="font-mono text-sm font-medium">
                <Link href={`/c/${category.id}`} className="underline-offset-4 hover:underline">
                  {category.label}
                </Link>
              </h3>
              <span className="font-mono text-xs tabular-nums text-ink-faint">
                median {Math.round(median * 100)}%
              </span>
            </div>
            <ol className="flex flex-col">
              {entries.slice(0, SHOWN_PER_CATEGORY).map((entry, index) => (
                <li key={entry.domain} className="grid grid-cols-[1.4rem_1fr_auto] items-center gap-3 border-b border-rule py-2">
                  <span className="font-mono text-xs tabular-nums text-ink-faint">{index + 1}</span>
                  <Link
                    href={`/r/${entry.reportId}`}
                    className="truncate font-mono text-sm text-ink-soft underline-offset-4 hover:text-brass hover:underline"
                  >
                    {entry.domain}
                  </Link>
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-14 bg-sunken sm:w-24">
                      <div className={`h-full ${tone(entry.total, entry.max)}`} style={{ width: `${(entry.total / entry.max) * 100}%` }} />
                    </div>
                    <span
                      className={`w-10 text-right font-mono text-xs tabular-nums ${entry.undermeasured ? 'text-ink-faint' : ''}`}
                      title={
                        entry.undermeasured
                          ? 'Too much of the card was unreadable here to compare this share with the others'
                          : undefined
                      }
                    >
                      {entry.total}/{entry.max}
                      {entry.undermeasured && '*'}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
            {entries.length > SHOWN_PER_CATEGORY && (
              <p className="mt-2 font-mono text-xs text-ink-faint">
                {entries.length - SHOWN_PER_CATEGORY} more in this category, all of them in{' '}
                <a href="/corpus.json" className="text-brass underline underline-offset-4">
                  the data
                </a>
                .
              </p>
            )}
          </div>
        ))}
      </div>
      </details>
    </section>
  )
}
