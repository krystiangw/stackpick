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
const FAIL = '#a4382a'
const WARN = '#9a4f0a'
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
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>{report.domain}</div>
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
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
            {scorecard.stages.map((stage) => {
              const share = stage.max > 0 ? stage.points / stage.max : 0
              const fill = share >= 0.67 ? PASS : share >= 0.34 ? WARN : FAIL
              return (
                <div key={stage.stage} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', width: 34, height: 96, background: '#e3dfd4', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', width: '100%', height: share === 0 ? 3 : Math.max(share * 96, 8), background: fill }} />
                  </div>
                  <div style={{ display: 'flex', fontSize: 20, color: '#8a8b8f', letterSpacing: 2 }}>{stage.letter}</div>
                </div>
              )
            })}
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
