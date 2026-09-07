import { CATEGORIES, CURATED_DOMAINS } from './categories'
import cells from '@/data/cells.json'
import type { Report } from './store'
import type { DiscoveryCell } from './discovery-cell'

/**
 * The sixth study, computed rather than typed.
 *
 * Every figure it produces was written by hand into /findings, and the reseed of 2026-08-17 moved
 * four of them: two only drifted, and two reversed sign, so the page was publishing "minus three
 * among the rest" about a gap that had become +10. The guard beside this asserts direction, which
 * is the right thing for a guard and no protection at all for a number in a sentence. So the page
 * asks this, the guard asks this, and there is one definition of the measurement.
 */

/** Named is per tool, not pooled: pooling raises the base rate and compresses every gap. */
type Row = {
  domain: string
  named: Map<string, number>
  runs: Map<string, number>
  downloads: number | null
  passes: Map<string, boolean>
}

/**
 * Two honest measures of the same thing.
 *
 *   share   the average share of runs that named a vendor, which is how often an agent says it
 *   ever    the share of vendors a run named at least once, which is whether it says it at all
 */
export type Measure = 'share' | 'ever'

export type Gap = { overall: number; popular: number; quieter: number }

export type Study = {
  /** Tool keys in the order the cells carry them. */
  tools: string[]
  /** The tool whose runs read no operator instructions, which is the one the page calls clean. */
  cleanTool: string | null
  vendors: number
  namedAtLeastOnce: number
  popular: number
  quieter: number
  medianDownloads: number
  gap: (check: string, tool: string, measure: Measure) => Gap
}

const toolOf = (tool: string) => tool.split(' ')[0]

export function buildStudy(reports: Report[], recordedCells: DiscoveryCell[] = cells): Study {
  // This association study predates the seven-category expansion. Keep its two-tool cohort;
  // selected-category evidence is not a new full-corpus comparison or an unobserved zero.
  const studyCells = recordedCells.filter(cell => ['claude', 'codex'].includes(toolOf(cell.tool)))
  const rows: Row[] = []
  for (const domain of CURATED_DOMAINS) {
    const category = CATEGORIES.find((candidate) => candidate.domains.includes(domain))
    if (!category) continue
    const held = studyCells.filter((cell) => cell.category === category.id)
    if (held.length === 0) continue
    const report = reports.find((candidate) => candidate.domain === domain)
    if (!report) continue
    const passes = new Map<string, boolean>()
    for (const check of report.scorecard.checks) {
      if (check.inconclusive || check.notApplicable) continue
      // Any credit counts as passing, the way the scorecard reads a partial.
      passes.set(check.id, check.points > 0)
    }
    const findings = report.findings as unknown as { npm?: { weeklyDownloads?: number | null } }
    rows.push({
      domain,
      named: new Map(held.map((cell) => [toolOf(cell.tool), cell.rows.find((row) => row.domain === domain)?.named ?? 0])),
      runs: new Map(held.map((cell) => [toolOf(cell.tool), cell.runs])),
      downloads: findings.npm?.weeklyDownloads ?? null,
      passes,
    })
  }

  const tools = [...new Set(studyCells.map((cell) => toolOf(cell.tool)))]
  const cleanTool = tools.find((tool) => studyCells.some((cell) => toolOf(cell.tool) === tool && cell.operatorContext.length === 0)) ?? null

  const rate = (of: Row[], tool: string, measure: Measure) =>
    of.length === 0
      ? 0
      : of.reduce(
          (sum, row) =>
            sum +
            (measure === 'ever'
              ? (row.named.get(tool) ?? 0) > 0
                ? 1
                : 0
              : (row.named.get(tool) ?? 0) / (row.runs.get(tool) || 1)),
          0,
        ) / of.length

  const known = rows.filter((row) => row.downloads !== null)
  const cut = [...known].sort((a, b) => (a.downloads ?? 0) - (b.downloads ?? 0))[Math.floor(known.length / 2)]?.downloads ?? 0
  const popular = known.filter((row) => (row.downloads ?? 0) > cut)
  const quieter = known.filter((row) => (row.downloads ?? 0) <= cut)

  /** NaN where a half holds fewer than five vendors on either side: too little to read. */
  const points = (check: string, within: Row[], tool: string, measure: Measure) => {
    const measured = within.filter((row) => row.passes.has(check) && row.named.has(tool))
    const passing = measured.filter((row) => row.passes.get(check) === true)
    const failing = measured.filter((row) => row.passes.get(check) === false)
    if (passing.length < 5 || failing.length < 5) return Number.NaN
    return Math.round((rate(passing, tool, measure) - rate(failing, tool, measure)) * 100)
  }

  return {
    tools,
    cleanTool,
    vendors: rows.length,
    namedAtLeastOnce: rows.filter((row) => [...row.named.values()].some((count) => count > 0)).length,
    popular: popular.length,
    quieter: quieter.length,
    medianDownloads: cut,
    gap: (check, tool, measure) => ({
      overall: points(check, rows, tool, measure),
      popular: points(check, popular, tool, measure),
      quieter: points(check, quieter, tool, measure),
    }),
  }
}

/**
 * Every sentence the findings page asserts about this study, with the condition that makes it true.
 *
 * One list, two readers: the guard fails the build conversation when a claim stops holding, and the
 * page takes the exhibit down rather than printing prose that contradicts the numbers beside it.
 * Written here because they were written twice before, and the copy that could not read a sentence
 * was the one that kept passing.
 */
export function studyClaims(study: Study): { says: string; holds: boolean }[] {
  const separates = (check: string, tool: string, measure: Measure) => {
    const gap = study.gap(check, tool, measure)
    return gap.overall > 0 && gap.popular > 0 && gap.quieter > 0
  }
  const clean = study.cleanTool
  return [
    ...study.tools.flatMap((tool) => [
      {
        says: `oauth_dcr separates in both halves on ${tool}, both measures`,
        holds: separates('oauth_dcr', tool, 'share') && separates('oauth_dcr', tool, 'ever'),
      },
      { says: `mcp_present separates in both halves on ${tool}, how often measure`, holds: separates('mcp_present', tool, 'share') },
    ]),
    {
      says: 'mcp_present separates in both halves on the clean tool under the stricter measure',
      holds: clean !== null && separates('mcp_present', clean, 'ever'),
    },
    {
      // The page has two sentences here and picks between them by the sign in the quiet half, so
      // the guard mirrors the branch instead of testing one of them always. Only the positive
      // branch ("leans on the better known half") asserts an ordering; when the quiet half is at or
      // below zero the page says the check does not survive the split, and there is nothing left to
      // contradict. Testing `popular > quieter` unconditionally passed on two negative halves while
      // claiming a lean that the page was not claiming, and a threshold on top of it would make the
      // guard stricter than the sentence it guards, which is how the previous version produced a
      // false alarm after the 9.40 sweep.
      says: 'where the page says programmatic_provisioning leans on the popular half, it does',
      holds: study.tools.every((tool) => {
        const gap = study.gap('programmatic_provisioning', tool, 'share')
        return gap.quieter <= 0 || gap.popular > gap.quieter
      }),
    },
    {
      // The negative claim, in the same shape as the positive ones rather than a threshold picked
      // to pass: what the page says is that llms_txt is the one of the four that does NOT survive
      // the control, so that is what this asks, and it fails the day llms_txt starts separating.
      says: 'llms_txt does not separate in both halves on both tools, how often measure',
      holds: !study.tools.every((tool) => separates('llms_txt', tool, 'share')),
    },
  ]
}

/** How the page and the guard both write a gap, so the two never disagree about a sign. */
export const inPoints = (value: number) => (Number.isNaN(value) ? 'too few to read' : `${value > 0 ? '+' : ''}${value}`)
