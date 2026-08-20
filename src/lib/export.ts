import { buildFixPlan } from './fixfirst'
import { AGENT_UA } from './scan/http'
import { CHECKS, checkHelpUri, type ScoredCheck, NPM_REGISTRY_PAGE } from './score'
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
  // Never x-forwarded-host: it is the caller's to set, and it lands in every SARIF helpUri and
  // every URL we hand an agent. Falling back to the request origin is only right in development.
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
  if (check.id === 'typed_package') return discovered.npmPackage ? `${NPM_REGISTRY_PAGE}${discovered.npmPackage}` : site
  return site
}

export function toSarif(report: Report, baseUrl: string, reused = false): unknown {
  const { scorecard, findings } = report
  const measurable = scorecard.measurable ?? scorecard.max

  // Rules from the scorecard we are reporting, not from the checks this dyno happens to run now.
  // A report served from the reuse window after a formula deploy produced `results[].ruleId` for a
  // check the new CHECKS no longer defines, which is the one structural rule SARIF consumers rely
  // on. `why` still comes from the live definition, and is allowed to be missing for a retired one.
  const rules = scorecard.checks.map((check) => ({
    id: check.id,
    name: check.label,
    shortDescription: { text: check.label },
    fullDescription: { text: CHECKS.find((live) => live.id === check.id)?.why ?? check.detail },
    helpUri: checkHelpUri(check.id, baseUrl),
    properties: { stage: check.stage, maxPoints: check.max },
  }))

  // Only what an agent actually hits. Every check used to be emitted, so a domain with a clean
  // sheet handed a code-scanning pipeline fifteen results, one of them saying there was nothing to
  // check. `kind` is what separated them, and a consumer that reads `level` alone - which is the
  // documented subset - saw fifteen alerts about a passing domain. The rest is published as counts
  // below, so nothing is hidden, it is just not filed as a problem.
  const failing = scorecard.checks.filter((check) => !check.notApplicable && !check.inconclusive && check.points < check.max)

  const results = failing.map((check) => {
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
            // Zero is our own word for "nothing answered", not an HTTP status, and SARIF has a
            // field for exactly that. Emitting `statusCode: 0` handed a parser a code that does
            // not exist, under a comment promising we only claim exchanges we recorded.
            webResponse:
              findings.agentStatus > 0
                ? { protocol: 'https', statusCode: findings.agentStatus }
                : { noResponseReceived: true },
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
        // The corpus vocabulary, beside the SARIF one. SARIF has no word for a partial credit, so
        // both halves of a two-point check land on `fail`, while /corpus.json publishes `partial`
        // and keeps it out of `tally.fail`. Two artefacts about one scan disagreed on the count
        // until this said which word each was using.
        verdict: check.points > 0 ? 'partial' : 'fail',
        // Named the way Lighthouse names it, so a caller that knows one knows the other.
        scoreDisplayMode: 'binary',
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
            name: 'Let Agents In',
            fullName: 'Let Agents In agent readiness scanner',
            // The version that produced these results, not the one this dyno runs. They differ for
            // fifteen minutes after every formula deploy, and the file claimed both at once.
            version: scorecard.formulaVersion,
            informationUri: `${baseUrl}/methodology`,
            rules,
          },
        },
        // The domain, not the scan. Keyed by report id, every nightly run was a new analysis
        // category: yesterday's alerts could never close as fixed, they only accumulated.
        automationDetails: { id: `letagentsin/${report.domain}` },
        invocations: [
          {
            startTimeUtc: report.scannedAt,
            // A rescan inside the reuse window returns the stored file byte for byte, and the only
            // trace was a start time fifteen minutes old. Somebody who fixes a page, rescans and
            // gets the same artefact concludes the fix did nothing. It cost an hour of our own on
            // 2026-08-17, on a build we had just deployed.
            ...(reused ? { properties: { reusedFromEarlierScan: true } } : {}),
            // A scan cut short by the time budget measured less than it meant to, and saying it
            // succeeded let a pipeline read "nothing is failing" off a scan that measured nothing.
            executionSuccessful: findings.truncation === null,
            ...(findings.truncation
              ? { toolExecutionNotifications: [{ level: 'warning', message: { text: findings.truncation.detail } }] }
              : {}),
          },
        ],
        results,
        properties: {
          domain: report.domain,
          // The domain we were asked about is not always the one we read. HTML carries a banner for
          // this and the machine formats carried nothing, so every location pointed at a host the
          // caller never named.
          ...(findings.resolvedElsewhere ? { measuredOn: findings.resolvedElsewhere.finalDomain } : {}),
          formulaVersion: scorecard.formulaVersion,
          total: scorecard.total,
          // The denominator, and the paper maximum kept beside it so neither can be mistaken
          // for the other by something reading this without our documentation.
          measurable,
          max: scorecard.max,
          // Everything that is not in `results`, so a caller can tell a clean sheet from a scan
          // that could not look. Counts rather than silence: silence reads as a pass.
          passed: scorecard.checks.filter((check) => !check.notApplicable && !check.inconclusive && check.points === check.max).length,
          unmeasured: scorecard.checks.filter((check) => check.inconclusive).map((check) => check.id),
          notApplicable: scorecard.checks.filter((check) => check.notApplicable).map((check) => check.id),
          ...(findings.truncation ? { truncated: findings.truncation.unmeasuredChecks } : {}),
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
export function toAgentInstructions(report: Report, baseUrl: string, reused = false): string {
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
      // A check with no published remedy is not a task. Without this the measurement was pasted
      // into the instruction slot and then again under "What we measured", so the same sentence
      // appeared twice with nothing to do between them.
      step?.how ?? 'We publish no step for this one. It is a measurement, not an instruction: read the rule and decide what your setup should be.',
      `Why it costs money: ${CHECKS.find((c) => c.id === check.id)?.why ?? ''}`,
      `Rule: ${checkHelpUri(check.id, baseUrl)}`,
      `What we measured: ${check.detail}`,
    ].join('\n\n')
  })

  return [
    `# Make ${report.domain} readable to an AI agent`,
    '',
    `Measured by Let Agents In on ${report.scannedAt.slice(0, 10)}, formula v${scorecard.formulaVersion}: ` +
      `${scorecard.total} of ${measurable} points we could measure. Full scorecard: ${baseUrl}/r/${report.id}`,
    '',
    ...(reused
      ? [
          `This domain was scanned at ${report.scannedAt} and that stored result was returned rather than a new one, so a change made since then is not in it. Ask again in a few minutes.`,
          '',
        ]
      : []),
    // The requested domain heads the page while every URL below points at another host, and the
    // HTML scorecard is the only surface that used to say why.
    ...(findings.resolvedElsewhere
      ? [
          `${report.domain} redirects to ${findings.resolvedElsewhere.finalDomain}, so everything below was measured there and every address in it belongs to that host.`,
          '',
        ]
      : []),
    // Saying nothing is failing after a scan that ran out of time is the worst sentence this file
    // can produce: it is indistinguishable from a clean sheet and it is not one.
    ...(findings.truncation
      ? [`The scan did not finish: ${findings.truncation.detail} Treat the checks it names as unasked rather than as passed.`, '']
      : []),
    'Each task below is one thing to change, with the measurement that produced it and a link to the rule. ' +
      'Do not take any of it on trust: every check is a single HTTP request with a published rule, so verify ' +
      'before you change anything, and tell the owner where we are wrong if we are. Anything that widens who ' +
      'can reach the product - relaxing a bot rule, opening client registration, changing when a CAPTCHA ' +
      'fires - is the owner\'s decision, not a defect to fix unattended.',
    '',
    steps.length > 0
      ? '## Tasks'
      : findings.truncation
        ? '## Tasks\n\nNothing to list: the scan ran out of time before it could measure enough to say.'
        : '## Tasks\n\nNothing measurable is failing.',
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
