import Link from 'next/link'
import type { RankedCategory } from '@/lib/rankings'

function tone(total: number, max: number): string {
  if (total <= max / 3) return 'bg-fail'
  if (total >= (max * 2) / 3) return 'bg-pass'
  return 'bg-warn'
}

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
        These are real scans, not examples. Each vendor can open its own scorecard, reproduce every check and
        tell us where we are wrong. That offer is the whole point of publishing the formula.
      </p>

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        {rankings.map(({ category, entries, median }) => (
          <div key={category.id}>
            <div className="flex items-baseline justify-between gap-3 border-b border-rule pb-2">
              <h3 className="font-mono text-sm font-medium">{category.label}</h3>
              <span className="font-mono text-xs tabular-nums text-ink-faint">median {median}</span>
            </div>
            <ol className="flex flex-col">
              {entries.map((entry, index) => (
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
          </div>
        ))}
      </div>
    </section>
  )
}
