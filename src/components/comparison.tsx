import type { Comparison } from '@/lib/compare'

export function ComparisonSection({ comparison, domain }: { comparison: Comparison; domain: string }) {
  const { category, peers, rankInCategory, percentile, beatenOn } = comparison
  if (!rankInCategory && !percentile) return null

  return (
    <section className="border-b border-rule py-10">
      <h2 className="text-lg font-semibold tracking-tight">
        {category ? `Against ${category.label.toLowerCase()}` : 'Against everything we have scanned'}
      </h2>

      {rankInCategory && (
        <p className="mt-3 max-w-2xl text-balance text-xl leading-snug text-ink-soft">
          {rankInCategory.position === 1
            ? `You lead the ${rankInCategory.outOf} we have scanned in this category.`
            : `You are ${rankInCategory.position} of ${rankInCategory.outOf} in a category where a developer is trying to ${category?.jobToBeDone}.`}
        </p>
      )}

      {!rankInCategory && percentile && (
        <p className="mt-3 max-w-2xl text-balance text-xl leading-snug text-ink-soft">
          You score higher than {percentile.betterThan} of the {percentile.outOf} domains scanned here.
        </p>
      )}

      {peers.length > 0 && (
        <ol className="mt-8 flex flex-col">
          {peers.map((peer, index) => (
            <li
              key={peer.domain}
              className={`grid grid-cols-[1.6rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-rule py-2.5 sm:gap-x-4 ${
                peer.isSubject ? 'bg-brass-soft' : ''
              }`}
            >
              <span className="font-mono text-xs tabular-nums text-ink-faint">{index + 1}</span>
              <div className="flex min-w-0 items-center gap-2">
                <span className={`min-w-0 break-all font-mono text-sm ${peer.isSubject ? 'font-semibold' : 'text-ink-soft'}`}>
                  {peer.domain}
                </span>
                {peer.isSubject && (
                  <span className="font-mono text-[0.65rem] uppercase tracking-widest text-brass">you</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {/* Hidden on phones: the track cost the subject row its own score. */}
                <div className="hidden h-1.5 w-20 bg-sunken sm:block sm:w-36">
                  <div
                    className={`h-full ${peer.isSubject ? 'bg-brass' : 'bg-rule'}`}
                    style={{ width: `${(peer.total / peer.max) * 100}%` }}
                  />
                </div>
                <span className="w-12 text-right font-mono text-sm tabular-nums">
                  {peer.total}/{peer.max}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}

      {beatenOn.length > 0 && (
        <div className="mt-10">
          <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">
            Where competitors pass and {domain} does not
          </h3>
          <ul className="mt-4 flex flex-col">
            {beatenOn.map((entry) => (
              <li key={entry.checkLabel} className="grid gap-1 border-t border-rule py-3 sm:grid-cols-[16rem_1fr] sm:gap-6">
                <span className="text-sm font-medium">{entry.checkLabel}</span>
                <span className="font-mono text-xs leading-relaxed text-ink-soft">{entry.peers.join(' · ')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-6 font-mono text-xs leading-relaxed text-ink-faint">
        Only domains we have actually scanned appear here, so the ranking is a floor: a competitor missing
        from the list has not been measured, not beaten.
      </p>
    </section>
  )
}
