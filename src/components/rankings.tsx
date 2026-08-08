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
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Scanned so far</h2>
        <p className="font-mono text-xs text-ink-faint">
          {rankings.reduce((sum, ranked) => sum + ranked.entries.length, 0)} domains · every result is a live link
        </p>
      </div>

      <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
        Ordered by the share of measurable points each domain earned, which is why a smaller number can sit
        above a larger one. These are real scans, not examples. Each vendor can open its own scorecard, reproduce every check and
        tell us where we are wrong. That offer is the whole point of publishing the formula. Scores are out of
        the points we could measure on each domain, not out of sixteen: a site that refuses our requests
        scores against a smaller denominator, not a worse number.
      </p>

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        {rankings.map(({ category, entries, median }) => (
          <div key={category.id}>
            <div className="flex items-baseline justify-between gap-3 border-b border-rule pb-2">
              <h3 className="font-mono text-sm font-medium">{category.label}</h3>
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
                    <span className="w-10 text-right font-mono text-xs tabular-nums">
                      {entry.total}/{entry.max}
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
    </section>
  )
}
