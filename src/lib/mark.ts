import type { Scorecard } from './score'

/**
 * The scorecard mark: five columns, one per funnel stage, filled by the share of measurable
 * points earned there. It is the one shape that carries the brand, so its geometry lives here
 * and the three surfaces that draw it (page, OG card, email) share this definition instead of
 * each keeping their own copy. They had already drifted: the page and the card scored out of
 * measurable points while the email still scored out of the paper maximum, so a vendor read one
 * number in their inbox and a different one on the page it linked to.
 */

/** Literals, not CSS variables: the OG renderer and the email have no stylesheet. */
export const MARK_PALETTE = {
  ground: '#faf9f6',
  sunken: '#e3dfd4',
  rule: '#c9c5b8',
  ink: '#16181c',
  faint: '#63656a',
  pass: '#2c6a4c',
  warn: '#9a4f0a',
  fail: '#a4382a',
} as const

export type MarkState = 'high' | 'mid' | 'low' | 'zero' | 'unmeasured'

export type MarkSegment = {
  letter: string
  title: string
  /** Share of this stage's measurable points, 0 to 1. Zero when nothing was measurable. */
  share: number
  state: MarkState
  color: string
}

const toneOf = (share: number): MarkState => (share >= 0.67 ? 'high' : share >= 0.34 ? 'mid' : 'low')

const colorOf = (state: MarkState) =>
  state === 'high' ? MARK_PALETTE.pass : state === 'mid' ? MARK_PALETTE.warn : MARK_PALETTE.fail

export function buildMark(stages: Scorecard['stages']): MarkSegment[] {
  return stages.map((stage) => {
    // Reports stored before the measurable denominator existed have no per-stage value.
    const measurable = stage.measurable ?? stage.max
    if (measurable <= 0) {
      return { letter: stage.letter, title: stage.title, share: 0, state: 'unmeasured', color: MARK_PALETTE.rule }
    }
    const share = stage.points / measurable
    const state = share === 0 ? 'zero' : toneOf(share)
    return { letter: stage.letter, title: stage.title, share, state, color: colorOf(state) }
  })
}

/**
 * Height of the fill in the same units as the track. A stage that earned nothing still gets a
 * floor tick, so zero reads as measured-and-zero rather than as an empty column.
 */
export function fillHeight(segment: MarkSegment, track: number): number {
  if (segment.state === 'unmeasured') return 0
  // Three percent of the track is two pixels, and a stage you failed then looks exactly like one
  // we could not measure. Zero has to be visible as zero, which is the whole point of the mark.
  if (segment.state === 'zero') return Math.max(Math.round(track * 0.1), 5)
  // The floor for anything above zero has to clear the zero mark, or a stage that earned a point
  // draws shorter than one that earned none.
  return Math.max(Math.round(segment.share * track), Math.round(track * 0.2))
}

export function scoreTone(total: number, measurable: number): string {
  if (measurable <= 0) return MARK_PALETTE.faint
  if (total <= measurable / 3) return MARK_PALETTE.fail
  if (total >= (measurable * 2) / 3) return MARK_PALETTE.pass
  return MARK_PALETTE.warn
}

/** Both the page and the email need the same one-line explanation of the dashed columns. */
export const UNMEASURED_LEGEND = 'A dashed column is a stage we could not measure, not a stage you failed.'

export const hasUnmeasured = (segments: MarkSegment[]) => segments.some((s) => s.state === 'unmeasured')
