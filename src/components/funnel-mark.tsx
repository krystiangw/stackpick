import type { Scorecard } from '@/lib/score'

/**
 * The signature element. Five columns, one per funnel stage, each filled by the share of
 * points earned there. It is a mark, not decoration: the shape of a scorecard is different
 * for every domain, and the collapse between A and B is visible before any number is read.
 */
export function FunnelMark({
  stages,
  height = 64,
  showLetters = true,
}: {
  stages: Scorecard['stages']
  height?: number
  showLetters?: boolean
}) {
  return (
    <div className="flex items-end gap-1.5" role="img" aria-label="Points earned at each of the five funnel stages">
      {stages.map((stage) => {
        const share = stage.max > 0 ? stage.points / stage.max : 0
        const tone = share >= 0.67 ? 'bg-pass' : share >= 0.34 ? 'bg-warn' : 'bg-fail'
        return (
          <div key={stage.stage} className="flex flex-col items-center gap-1">
            <div className="relative w-4 bg-sunken sm:w-5" style={{ height }}>
              {/* A stage with nothing still gets a tick at the floor, so zero is visibly zero. */}
              <div
                className={`absolute bottom-0 left-0 right-0 ${share === 0 ? 'bg-fail' : tone}`}
                style={{ height: share === 0 ? 2 : `${Math.max(share * 100, 6)}%` }}
              />
            </div>
            {showLetters && <span className="font-mono text-[0.65rem] text-ink-faint">{stage.letter}</span>}
          </div>
        )
      })}
    </div>
  )
}
