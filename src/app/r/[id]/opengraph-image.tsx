import { ImageResponse } from 'next/og'
import { buildComparison } from '@/lib/compare'
import { pickHeadline } from '@/lib/headline'
import { buildMark, fillHeight, hasUnmeasured, MARK_PALETTE, scoreTone } from '@/lib/mark'
import { getStore } from '@/lib/store'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Agent readiness scorecard'

const INK = MARK_PALETTE.ink
const GROUND = MARK_PALETTE.ground
const RULE = MARK_PALETTE.rule
const TRACK = 96
const BRASS = '#7d5c10'

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const report = await getStore().getReport(id)

  if (!report) {
    return new ImageResponse(
      (
        <div style={{ display: 'flex', width: '100%', height: '100%', background: GROUND, alignItems: 'center', justifyContent: 'center', color: INK, fontSize: 44 }}>
          StackPick
        </div>
      ),
      size,
    )
  }

  const { scorecard, findings } = report
  const headline = pickHeadline(findings, scorecard)
  const comparison = await buildComparison(report)
  const rank = comparison.rankInCategory
  // Without a category rank this printed the domain a second time, once in each corner.
  const standing = rank
    ? `${rank.position} of ${rank.outOf} · ${comparison.category?.label ?? ''}`
    : `Agent readiness · formula v${scorecard.formulaVersion}`
  const measurable = scorecard.measurable ?? scorecard.max
  const tone = scoreTone(scorecard.total, measurable)
  const segments = buildMark(scorecard.stages)

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: GROUND,
          color: INK,
          padding: '56px 64px',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', fontSize: 17, color: BRASS, letterSpacing: 4, textTransform: 'uppercase' }}>
              StackPick
            </div>
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>{report.domain}</div>
          </div>
          <div style={{ display: 'flex', fontSize: 20, color: '#6b6d72', letterSpacing: 2, textTransform: 'uppercase' }}>
            {standing}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', fontSize: headline.claim.length > 90 ? 46 : 54, lineHeight: 1.15, fontWeight: 600, letterSpacing: -1.5 }}>
            {headline.claim}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderTop: `2px solid ${RULE}`, paddingTop: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
            {segments.map((segment) => (
              <div key={segment.letter} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    width: 34,
                    height: TRACK,
                    alignItems: 'flex-end',
                    background: segment.state === 'unmeasured' ? 'transparent' : MARK_PALETTE.sunken,
                    border: segment.state === 'unmeasured' ? `2px dashed ${RULE}` : 'none',
                  }}
                >
                  <div style={{ display: 'flex', width: '100%', height: fillHeight(segment, TRACK), background: segment.color }} />
                </div>
                <div style={{ display: 'flex', fontSize: 20, color: '#8a8b8f', letterSpacing: 2 }}>{segment.letter}</div>
              </div>
            ))}
          </div>
          {hasUnmeasured(segments) && (
            <div style={{ display: 'flex', fontSize: 17, color: '#8a8b8f' }}>
              Dashed: nothing here could be measured
            </div>
          )}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ display: 'flex', fontSize: 96, fontWeight: 700, color: tone, letterSpacing: -5 }}>
              {scorecard.total}
            </div>
            <div style={{ display: 'flex', fontSize: 30, color: '#8a8b8f' }}>/ {measurable}</div>
          </div>
        </div>
      </div>
    ),
    size,
  )
}
