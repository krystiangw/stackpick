import { FORMULA_VERSION, type Scorecard } from './score'
import { turnedAwayAtTheEdge } from './watch'

/**
 * The score, what it is out of, and why the table beside it adds up to something else.
 *
 * It lives here rather than inside the report script for one reason: it is the arithmetic a buyer
 * checks first, and it was wrong. tiptap.dev was told "9 of 16 measurable points" over a column
 * summing to 17, with nothing to explain the missing point, because the paragraph covering that
 * case only knew about checks we could not measure and theirs was a check that did not apply. A
 * pure function can be asked the question the buyer asks: does everything you print agree.
 */
export function scoreSection(scan: {
  card: Scorecard
  scannedAt: string
  findings: { blocksPlainRequests?: boolean; robots?: { unreadable?: boolean }; truncation?: unknown }
}): string[] {
  const { card, findings } = scan
  const measurable = card.measurable ?? card.max
  const unmeasured = card.checks.filter((check) => check.inconclusive)
  const notApplicable = card.checks.filter((check) => check.notApplicable)
  const plural = (count: number, one: string, many: string) => (count === 1 ? one : many)

  const lines: string[] = [
    `Scanned ${scan.scannedAt.slice(0, 10)} under formula ${card.formulaVersion}${
      card.formulaVersion === FORMULA_VERSION ? '' : ` (the scanner now runs ${FORMULA_VERSION})`
    }: **${card.total} of ${measurable} measurable points**.`,
  ]

  // Before the table, not in a footnote. froala.com refuses every request we make, including one
  // from a Chrome user-agent, so eight of their fifteen checks are unmeasured; the report opened
  // with "4 of 6 measurable points" and went straight on to advise them about OAuth. A buyer whose
  // site we could not read has to be told that first, in the same breath as the number.
  if (unmeasured.length > 0) {
    // Counted, then the conditions named separately. A scan can be refused at the edge AND run out
    // of time AND hold a check that is inconclusive for its own unrelated reason, so attaching every
    // unmeasured check to one cause would be exactly the kind of claim this report exists not to
    // make. Each line below carries its own reason in its own words.
    lines.push(
      '',
      `${unmeasured.length} of the ${card.checks.length} checks could not be measured, so the number above is out of what we could see rather than out of everything. Every one of them is listed below with the reason, and none counts against you.`,
    )
    const conditions = [
      turnedAwayAtTheEdge(findings) ? 'your edge refused ordinary requests' : null,
      findings.truncation ? 'we reached our time budget with work still outstanding, which is ours rather than yours' : null,
    ].filter((one): one is string => one !== null)
    if (conditions.length > 0) {
      lines.push('', `During this scan ${conditions.join(', and ')}. Where that is why a check is unmeasured, the line below says so.`)
    }
  }

  // The other half of the same duty, and the half that was missing.
  if (notApplicable.length > 0) {
    lines.push(
      '',
      `${notApplicable.length} of the ${card.checks.length} checks ${plural(notApplicable.length, 'does', 'do')} not apply to you, which is why the table below counts ${card.max} points on paper and your score is out of ${measurable}:`,
      '',
      ...notApplicable.map((check) => `- **${check.label}**: ${check.detail}`),
    )
  }

  lines.push('', '| Stage | Points |', '|---|---|', ...card.stages.map((stage) => `| ${stage.title} | ${stage.points}/${stage.max} |`), '')
  return lines
}

/**
 * Whether the section explains its own arithmetic: a buyer who adds the column and lands somewhere
 * other than the denominator has to find the reason in the same section, not in our heads.
 */
export function arithmeticExplained(scan: Parameters<typeof scoreSection>[0]): boolean {
  const onPaper = scan.card.stages.reduce((sum, stage) => sum + stage.max, 0)
  const measurable = scan.card.measurable ?? scan.card.max
  if (onPaper === measurable) return true
  const text = scoreSection(scan).join('\n')
  return text.includes('could not be measured') || text.includes('do not apply to you') || text.includes('does not apply to you')
}
