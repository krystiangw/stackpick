import { publishedCorpus } from './published'
import { CHECKS, refusesAgentsAtSignup, signupNeedsJavaScript, STAGES, type Stage } from './score'
import type { Report } from './store'

/**
 * The industry picture, computed from the store at request time. Hardcoding the numbers
 * would make the page a claim; recomputing makes it the same measurement anyone can rerun
 * against the same domains.
 */

export type CheckTally = {
  id: string
  label: string
  stage: Stage
  pass: number
  /** Scored above zero but below the maximum. Counting these as failures made a vendor
   *  answering two of nine entry paths read as answering none. */
  partial: number
  zero: number
  unmeasurable: number
}

export type IndustryReport = {
  sampleSize: number
  formulaVersion: string
  max: number
  median: number
  mean: number
  scannedFrom: string
  scannedTo: string
  stages: {
    stage: Stage
    letter: string
    title: string
    question: string
    /** Share of the points we could actually measure, not of the points on paper. */
    share: number
    /** How many domains contributed a measurable check at this stage. */
    measuredOn: number
  }[]
  checks: CheckTally[]
  /**
   * Domains that run an MCP server and document no way for an agent to get a credential for it.
   * The whole funnel thesis in one number: a door built for a machine, and no key behind it.
   */
  mcpWithoutKeys: number
  /**
   * Live MCP servers, and how many of those also publish RFC 7591 client registration. The two
   * arrived together: dynamic registration is what the MCP specification asks for, so it is a
   * side effect of shipping a server rather than a decision to let agents in.
   */
  mcpServers: number
  mcpWithRegistration: number
  /** The same count for everyone else, so the comparison is stated rather than implied. */
  registrationWithoutMcp: number
  withoutMcp: number
  /**
   * The stage nobody else grades. Lighthouse ships an agentic browsing category and Cloudflare
   * ships a readiness scanner, and both stop at documentation and protocol files: neither asks
   * whether an unattended client can get an account. These two numbers are that question.
   */
  signupRefusesAgents: number
  signupNeedsJavaScript: number
  best: { domain: string; total: number; measurable: number; reportId: string }[]
  worst: { domain: string; total: number; measurable: number; reportId: string }[]
  /**
   * The funnel read as a conjunction rather than a score: a door a machine can use, a signup it
   * can reach, and a documented way to get a credential. Three legs, because a total hides which
   * one is missing, and the missing one is the whole finding. Everything a vendor needs is in the
   * corpus already; this only says how many are one requirement away and which one it is.
   */
  usable: { domains: string[]; oneAway: { leg: UsableLeg; domains: string[] }[] }
}

export type UsableLeg = 'a door a machine can use' | 'a signup an agent can reach and submit' | 'a documented credential path'

const MINIMUM_SAMPLE = 20

export async function buildIndustryReport(): Promise<IndustryReport | null> {
  const all = (await publishedCorpus()).reports
  if (all.length === 0) return null

  // Mixing formula versions would compare scores that were never comparable, so the report
  // is always about one formula: whichever version most of the corpus was scored under.
  const byVersion = new Map<string, Report[]>()
  for (const report of all) {
    const version = report.scorecard.formulaVersion
    byVersion.set(version, [...(byVersion.get(version) ?? []), report])
  }
  const [formulaVersion, reports] = [...byVersion.entries()].sort((a, b) => b[1].length - a[1].length)[0]
  if (reports.length < MINIMUM_SAMPLE) return null

  const totals = reports.map((report) => report.scorecard.total).sort((a, b) => a - b)
  const measurableOf = (report: Report) => report.scorecard.measurable ?? report.scorecard.max
  const middle = Math.floor(totals.length / 2)
  const median = totals.length % 2 === 0 ? (totals[middle - 1] + totals[middle]) / 2 : totals[middle]
  const mean = totals.reduce((sum, total) => sum + total, 0) / totals.length

  // Denominator is the points we could measure. Folding our own blind spots into the
  // market's failures would make the funnel collapse look worse than we can prove it is,
  // which is exactly the sentence printed two sections below on the same page.
  const stages = STAGES.map((stage) => {
    const shares: number[] = []
    for (const report of reports) {
      const inStage = report.scorecard.checks.filter(
        (check) => check.stage === stage.id && !check.inconclusive && !check.notApplicable,
      )
      const available = inStage.reduce((sum, check) => sum + check.max, 0)
      if (available === 0) continue
      shares.push(inStage.reduce((sum, check) => sum + check.points, 0) / available)
    }
    return {
      stage: stage.id,
      letter: stage.letter,
      title: stage.title,
      question: stage.question,
      share: shares.length > 0 ? shares.reduce((sum, share) => sum + share, 0) / shares.length : 0,
      measuredOn: shares.length,
    }
  })

  const checks: CheckTally[] = CHECKS.map((check) => {
    const tally = { id: check.id, label: check.label, stage: check.stage, pass: 0, partial: 0, zero: 0, unmeasurable: 0 }
    for (const report of reports) {
      const scored = report.scorecard.checks.find((entry) => entry.id === check.id)
      if (!scored) continue
      if (scored.inconclusive || scored.notApplicable) tally.unmeasurable += 1
      else if (scored.points === scored.max) tally.pass += 1
      else if (scored.points > 0) tally.partial += 1
      else tally.zero += 1
    }
    return tally
  })

  const ranked = [...reports].sort(
    (a, b) => b.scorecard.total / measurableOf(b) - a.scorecard.total / measurableOf(a) || b.scorecard.total - a.scorecard.total,
  )
  const asEntry = (report: Report) => ({
    domain: report.domain,
    total: report.scorecard.total,
    measurable: measurableOf(report),
    reportId: report.id,
  })
  const scanTimes = reports.map((report) => report.scannedAt).sort()

  const verdict = (report: Report, id: string) => report.scorecard.checks.find((check) => check.id === id)
  const mcpWithoutKeys = reports.filter((report) => {
    const mcp = verdict(report, 'mcp_present')
    const provisioning = verdict(report, 'programmatic_provisioning')
    if (!mcp || !provisioning) return false
    const scored = !provisioning.inconclusive && !provisioning.notApplicable
    return mcp.points === mcp.max && scored && provisioning.points === 0
  }).length

  // Read off the findings rather than off the verdict sentence, so the two numbers stay true
  // when the wording changes.
  const withSignup = reports.filter((report) => report.findings.funnel.signup.url !== null)
  const signupRefusesAgents = withSignup.filter((report) => refusesAgentsAtSignup(report.findings)).length
  const needsJavaScript = withSignup.filter(signupNeedsJavaScript).length

  const live = reports.filter((report) => {
    const mcp = verdict(report, 'mcp_present')
    return mcp !== undefined && mcp.points === mcp.max
  })
  const mcpWithRegistration = live.filter((report) => {
    const oauth = verdict(report, 'oauth_dcr')
    return oauth !== undefined && oauth.points === oauth.max
  }).length

  const others = reports.filter((report) => !live.includes(report))
  const registrationWithoutMcp = others.filter((report) => {
    const oauth = verdict(report, 'oauth_dcr')
    return oauth !== undefined && oauth.points === oauth.max
  }).length

  // Deliberately not a threshold on the score. A threshold rewards being unreadable, because an
  // unmeasurable check leaves the denominator; a conjunction cannot be met by hiding anything,
  // since hiding a leg removes a leg you need.
  const legsOf = (report: Report) => {
    const at = (id: string) => verdict(report, id)
    const entry = at('agent_entry_point')
    const provisioning = at('programmatic_provisioning')
    // Tri-state, because "we did not measure it" is not "they fail it". Publishing a vendor by
    // name as failing on a signup we never reached is exactly the accusation the methodology page
    // forbids, and twelve of the forty-eight named in the near-miss group were unmeasured or had
    // no signup at all.
    const measured = (id: string) => {
      const check = at(id)
      return check !== undefined && !check.inconclusive && !check.notApplicable
    }
    return [
      {
        leg: 'a door a machine can use' as UsableLeg,
        met:
          (entry !== undefined && entry.points === entry.max) ||
          at('oauth_dcr')?.points === at('oauth_dcr')?.max ||
          at('mcp_present')?.points === at('mcp_present')?.max,
        // Any one of three ways in, so a single unmeasured arm does not make the leg unknown.
        known: measured('agent_entry_point') || measured('oauth_dcr') || measured('mcp_present'),
      },
      {
        // The CAPTCHA belongs in this leg, and leaving it out published a claim our own data
        // contradicted: five of the fourteen named vendors carry a CAPTCHA in the same row a
        // reader opens next. An unattended agent does not solve a Turnstile, so "reachable"
        // without it is a sentence about the page rather than about the agent.
        leg: 'a signup an agent can reach and submit' as UsableLeg,
        met:
          at('signup_reachable')?.points === at('signup_reachable')?.max &&
          at('signup_no_captcha')?.points === at('signup_no_captcha')?.max,
        known: measured('signup_reachable') && measured('signup_no_captcha'),
      },
      {
        leg: 'a documented credential path' as UsableLeg,
        met: provisioning !== undefined && provisioning.points >= 1,
        known: measured('programmatic_provisioning'),
      },
    ]
  }
  const withLegs = reports.map((report) => {
    const legs = legsOf(report)
    return {
      report,
      missing: legs.filter((leg) => leg.known && !leg.met),
      unknown: legs.filter((leg) => !leg.known).length,
    }
  })
  const oneAwayBy = new Map<UsableLeg, string[]>()
  for (const { report, missing, unknown } of withLegs) {
    // One measured failure and nothing unmeasured. A row with an unknown leg is neither one away
    // nor clear of anything, and saying which it is would be a guess printed next to a brand.
    if (missing.length !== 1 || unknown > 0) continue
    oneAwayBy.set(missing[0].leg, [...(oneAwayBy.get(missing[0].leg) ?? []), report.domain])
  }

  return {
    usable: {
      domains: withLegs
        .filter((entry) => entry.missing.length === 0 && entry.unknown === 0)
        .map((entry) => entry.report.domain)
        .sort(),
      oneAway: [...oneAwayBy.entries()]
        .map(([leg, domains]) => ({ leg, domains: [...domains].sort() }))
        .sort((a, b) => b.domains.length - a.domains.length),
    },
    mcpWithoutKeys,
    mcpServers: live.length,
    mcpWithRegistration,
    registrationWithoutMcp,
    withoutMcp: others.length,
    signupRefusesAgents,
    signupNeedsJavaScript: needsJavaScript,
    sampleSize: reports.length,
    formulaVersion,
    // Every report in the slice shares a formula version, so they share a maximum.
    max: Math.max(...reports.map((report) => report.scorecard.max)),
    median,
    mean,
    scannedFrom: scanTimes[0],
    scannedTo: scanTimes[scanTimes.length - 1],
    stages,
    checks,
    best: ranked.slice(0, 5).map(asEntry),
    worst: ranked.slice(-5).reverse().map(asEntry),
  }
}
