import { buildFixPlan } from './fixfirst'
import { AGENT_UA } from './scan/http'
import { CHECKS, checkHelpUri, FORMULA_VERSION, type ScoredCheck } from './score'
import type { Report } from './store'

/**
 * The two machine formats an agent-first validator is expected to speak, on top of our own JSON.
 *
 * SARIF because it is the OASIS format every code-scanning pipeline already ingests, so a scan
 * can run in somebody's CI and fail a build when the score drops. Its `kind` enum happens to be
 * exactly our four verdicts: pass, fail, review, notApplicable.
 *
 * The agent format because for a caller that is itself an agent the useful artefact is not a
 * report, it is the work: an instruction it can act on without asking us what we meant.
 */

const SARIF_SCHEMA = 'https://json.schemastore.org/sarif-2.1.0.json'

/**
 * Behind Heroku's proxy `new URL(request.url).origin` is the dyno's own localhost, which is how
 * every helpUri in the first SARIF we emitted pointed at localhost:14735. The configured base
 * URL is the only one that is true from outside.
 */
export function publicBaseUrl(request: Request): string {
  const configured = process.env.STACKPICK_BASE_URL
  if (configured) return configured.replace(/\/$/, '')
  const forwarded = request.headers.get('x-forwarded-host')
  if (forwarded) return `${request.headers.get('x-forwarded-proto') ?? 'https'}://${forwarded}`
  return new URL(request.url).origin
}

type SarifKind = 'pass' | 'fail' | 'review' | 'notApplicable'
type SarifLevel = 'none' | 'note' | 'warning'

function verdictOf(check: ScoredCheck): { kind: SarifKind; level: SarifLevel } {
  if (check.notApplicable) return { kind: 'notApplicable', level: 'none' }
  // Review is SARIF's own word for "a human has to look, we could not decide".
  if (check.inconclusive) return { kind: 'review', level: 'none' }
  if (check.points === check.max) return { kind: 'pass', level: 'none' }
  return { kind: 'fail', level: check.points > 0 ? 'note' : 'warning' }
}

/** The URL a check actually looked at, so a finding points somewhere rather than at the apex. */
function locationFor(check: ScoredCheck, report: Report): string {
  const { discovered } = report.findings
  const site = report.findings.site
  if (check.stage === 'signup') return discovered.signup ?? site
  if (check.id === 'programmatic_provisioning') return discovered.docs ?? site
  if (check.id === 'self_serve') return discovered.pricing ?? site
  if (check.id === 'docs_without_js') return discovered.docs ?? site
  if (check.id === 'typed_package') return discovered.npmPackage ? `https://www.npmjs.com/package/${discovered.npmPackage}` : site
  return site
}

export function toSarif(report: Report, baseUrl: string): unknown {
  const { scorecard, findings } = report
  const measurable = scorecard.measurable ?? scorecard.max

  const rules = CHECKS.map((check) => ({
    id: check.id,
    name: check.label,
    shortDescription: { text: check.label },
    fullDescription: { text: check.why },
    helpUri: checkHelpUri(check.id, baseUrl),
    properties: { stage: check.stage, maxPoints: check.max },
  }))

  const results = scorecard.checks.map((check) => {
    const { kind, level } = verdictOf(check)
    const text = check.unblock ? `${check.detail} Next step: ${check.unblock}` : check.detail
    // We only claim an HTTP exchange where we actually recorded one: the door test is the
    // one check whose evidence is a request pair rather than the content behind it.
    const exchange =
      check.id === 'answers_plain_request'
        ? {
            webRequest: {
              protocol: 'https',
              method: 'GET',
              target: findings.site,
              headers: { 'user-agent': AGENT_UA },
            },
            webResponse: { protocol: 'https', statusCode: findings.agentStatus },
          }
        : {}

    return {
      ruleId: check.id,
      kind,
      level,
      message: { text },
      locations: [{ physicalLocation: { artifactLocation: { uri: locationFor(check, report) } } }],
      ...exchange,
      properties: {
        points: check.points,
        maxPoints: check.max,
        // Named the way Lighthouse names it, so a caller that knows one knows the other.
        scoreDisplayMode: check.notApplicable ? 'notApplicable' : check.inconclusive ? 'informative' : 'binary',
      },
    }
  })

  return {
    $schema: SARIF_SCHEMA,
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'StackPick',
            fullName: 'StackPick agent readiness scanner',
            version: FORMULA_VERSION,
            informationUri: `${baseUrl}/methodology`,
            rules,
          },
        },
        automationDetails: { id: `stackpick/${report.domain}/${report.id}` },
        invocations: [{ startTimeUtc: report.scannedAt, executionSuccessful: true }],
        results,
        properties: {
          domain: report.domain,
          formulaVersion: scorecard.formulaVersion,
          total: scorecard.total,
          // The denominator, and the paper maximum kept beside it so neither can be mistaken
          // for the other by something reading this without our documentation.
          measurable,
          max: scorecard.max,
          scorecardUrl: `${baseUrl}/r/${report.id}`,
        },
      },
    ],
  }
}

/**
 * For a caller that is an agent with write access to the site. Everything here is either a
 * measurement we made or a step we already publish; nothing is invented to fill the template.
 */
export function toAgentInstructions(report: Report, baseUrl: string): string {
  const { scorecard, findings } = report
  const measurable = scorecard.measurable ?? scorecard.max
  const plan = buildFixPlan(findings, scorecard)

  const actionable = scorecard.checks.filter(
    (check) => check.points < check.max && !check.inconclusive && !check.notApplicable,
  )
  const unmeasured = scorecard.checks.filter((check) => check.inconclusive)

  // Ordered the way the fix plan orders them, cheapest real gain first, so an agent working
  // top to bottom does the same thing a person reading the scorecard would.
  const ranked = plan ? plan.steps.map((step) => step.checkId) : []
  const ordered = [...actionable].sort(
    (a, b) => (ranked.indexOf(a.id) + 1 || 99) - (ranked.indexOf(b.id) + 1 || 99),
  )

  const steps = ordered.map((check) => {
    const step = plan?.steps.find((candidate) => candidate.checkId === check.id)
    return [
      `### ${check.label} (+${step?.gain ?? check.max - check.points}, ${step?.effort ?? 'unscoped'})`,
      step?.how ?? check.detail,
      `Why it costs money: ${CHECKS.find((c) => c.id === check.id)?.why ?? ''}`,
      `Rule: ${checkHelpUri(check.id, baseUrl)}`,
      `What we measured: ${check.detail}`,
    ].join('\n')
  })

  return [
    `# Make ${report.domain} readable to an AI agent`,
    '',
    `Measured by StackPick on ${report.scannedAt.slice(0, 10)}, formula v${scorecard.formulaVersion}: ` +
      `${scorecard.total} of ${measurable} points we could measure. Full scorecard: ${baseUrl}/r/${report.id}`,
    '',
    'Each task below is one thing to change, with the measurement that produced it and a link to the rule. ' +
      'Do not take any of it on trust: every check is a single HTTP request with a published rule, so verify ' +
      'before you change anything, and tell the owner where we are wrong if we are.',
    '',
    steps.length > 0 ? '## Tasks' : '## Tasks\n\nNothing measurable is failing.',
    ...steps,
    '',
    ...(unmeasured.length > 0
      ? [
          '## Not tasks: things we could not measure',
          '',
          'These are not failures and must not be reported as such. Each one says what would make it measurable.',
              ...unmeasured.map((check) => {
            const detail = check.detail.replace(/[.\s]*$/, '')
            return `- ${check.label}: ${detail}.${check.unblock ? ` What would make it measurable: ${check.unblock}` : ''}`
          }),
        ]
      : []),
  ]
    .filter((line, index, all) => !(line === '' && all[index - 1] === ''))
    .join('\n')
}
