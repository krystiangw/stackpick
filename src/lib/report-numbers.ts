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
  const lines: string[] = [
    '| Scan | Result |',
    '|---|---|',
    `| Scan date | ${scan.scannedAt.slice(0, 10)} |`,
    `| Formula version | ${card.formulaVersion} |`,
    `| Score | ${card.total}/${measurable} weighted points |`,
    `| Checks measured | ${card.checks.filter((check) => !check.inconclusive && !check.notApplicable).length} of ${card.checks.length} |`,
    `| Unmeasured | ${unmeasured.length} |`,
    `| Inapplicable | ${notApplicable.length} |`,
    '',
  ]
  if (card.formulaVersion !== FORMULA_VERSION) {
    lines.push(`Current scanner formula: ${FORMULA_VERSION}.`, '')
  }
  if (unmeasured.length > 0) {
    const conditions = [
      turnedAwayAtTheEdge(findings) ? 'your edge refused ordinary requests' : null,
      findings.truncation ? 'the scan reached its time budget with work outstanding' : null,
    ].filter((one): one is string => one !== null)
    if (conditions.length > 0) lines.push(`During this scan ${conditions.join(', and ')}.`, '')
  }
  lines.push('| Stage | Points | Maximum (including unmeasured and inapplicable) |', '|---|---|---|',
    ...card.stages.map((stage) => `| ${stage.title} | ${stage.points} | ${stage.max} |`), '')
  if (unmeasured.length > 0 || notApplicable.length > 0) {
    lines.push('*Table note: unmeasured and inapplicable points are excluded from the score denominator.*', '')
  }
  if (notApplicable.length > 0) {
    lines.push('Inapplicable checks:', '', ...notApplicable.map((check) => `- **${check.label}**: ${check.detail}`), '')
  }
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
  return /\| (?:Unmeasured|Inapplicable) \| [1-9]\d* \|/.test(text) && text.includes('excluded from the score denominator')
}
