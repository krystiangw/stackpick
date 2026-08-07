import { ImageResponse } from 'next/og'
import { buildComparison } from '@/lib/compare'
import { pickHeadline } from '@/lib/headline'
import { getStore } from '@/lib/store'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Agent readiness scorecard'

const INK = '#16181c'
const GROUND = '#faf9f6'
const RULE = '#dedbd2'
const BRASS = '#9a7318'
const FAIL = '#a4382a'
const WARN = '#8a6a12'
const PASS = '#2c6a4c'

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
  const standing = rank
    ? `${rank.position} of ${rank.outOf} · ${comparison.category?.label ?? ''}`
    : report.domain
  const tone = scorecard.total <= scorecard.max / 3 ? FAIL : scorecard.total >= (scorecard.max * 2) / 3 ? PASS : WARN

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
          <div style={{ display: 'flex', fontSize: 22, letterSpacing: 3, color: BRASS, textTransform: 'uppercase' }}>
            Agent readiness
          </div>
          <div style={{ display: 'flex', fontSize: 22, color: '#8a8b8f' }}>{standing}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', fontSize: headline.claim.length > 90 ? 46 : 54, lineHeight: 1.15, fontWeight: 600, letterSpacing: -1.5 }}>
            {headline.claim}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderTop: `2px solid ${RULE}`, paddingTop: 28 }}>
          <div style={{ display: 'flex', gap: 34 }}>
            {scorecard.stages.map((stage) => (
              <div key={stage.stage} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', fontSize: 18, color: '#8a8b8f', letterSpacing: 2 }}>{stage.letter}</div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: 26,
                    fontWeight: 600,
                    color: stage.points === 0 ? FAIL : stage.points === stage.max ? PASS : WARN,
                  }}
                >
                  {stage.points}/{stage.max}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ display: 'flex', fontSize: 96, fontWeight: 700, color: tone, letterSpacing: -5 }}>
              {scorecard.total}
            </div>
            <div style={{ display: 'flex', fontSize: 30, color: '#8a8b8f' }}>/ {scorecard.max}</div>
          </div>
        </div>
      </div>
    ),
    size,
  )
}
