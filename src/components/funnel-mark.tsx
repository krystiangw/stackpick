import { buildMark, fillHeight, hasUnmeasured, UNMEASURED_LEGEND } from '@/lib/mark'
import type { Scorecard } from '@/lib/score'

/**
 * The signature element. Geometry comes from lib/mark so the OG card and the email draw the
 * same shape from the same numbers.
 */
export function FunnelMark({
  stages,
  height = 64,
  showLetters = true,
  showLegend = false,
}: {
  stages: Scorecard['stages']
  height?: number
  showLetters?: boolean
  showLegend?: boolean
}) {
  const segments = buildMark(stages)

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex items-end gap-1.5"
        role="img"
        aria-label={segments
          .map((segment) =>
            segment.state === 'unmeasured'
              ? `${segment.title}: not measurable`
              : `${segment.title}: ${Math.round(segment.share * 100)}% of measurable points`,
          )
          .join(', ')}
      >
        {segments.map((segment) => (
          <div key={segment.letter} className="flex flex-col items-center gap-1">
            <div
              className={`relative w-4 sm:w-5 ${
                segment.state === 'unmeasured' ? 'border border-dashed border-rule' : 'bg-sunken'
              }`}
              style={{ height }}
            >
              {segment.state !== 'unmeasured' && (
                <div
                  className="absolute bottom-0 left-0 right-0"
                  style={{ height: fillHeight(segment, height), background: segment.color }}
                />
              )}
            </div>
            {showLetters && <span className="font-mono text-[0.65rem] text-ink-faint">{segment.letter}</span>}
          </div>
        ))}
      </div>
      {showLegend && hasUnmeasured(segments) && (
        <p className="font-mono text-[0.65rem] leading-relaxed text-ink-faint">{UNMEASURED_LEGEND}</p>
      )}
    </div>
  )
}
