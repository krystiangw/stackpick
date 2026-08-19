import { publishedCorpus } from './published'
import { CHECKS, refusesAgentsAtSignup, signupNeedsJavaScript, STAGES, type Stage } from './score'
import { getStore, type Report } from './store'

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
  /** Rows on another formula version, left out of every number on this page and said out loud. */
  heldBack: number
  max: number
  median: number
  mean: number
  /**
   * Rows we stopped refreshing because the vendor's robots.txt names our scanner, and what the
   * median is once they are taken out.
   *
   * We keep a frozen row rather than deleting it, on the argument that a median of whoever did not
   * object is not a median. That argument is only honest if the reader can check it, so the number
   * it depends on is published next to the one it defends: if the two medians ever separate, the
   * separation is the story and it is ours to print rather than somebody else's to discover.
   */
  frozen: { count: number; median: number | null }
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
  /** Of the vendors publishing a registration endpoint, those advertising a grant with no human in it. */
  registrationUnattended: number
  registrationTotal: number
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
  /**
   * llms.txt files whose own links we sampled, and how many of those led somewhere gone. The file
   * is the one thing this market did publish, so whether it is maintained is the sharper question.
   */
  llmsChecked: number
  llmsStale: number
  /** Sites serving an agent user-agent less than a browser at the same URL. A null result so far. */
  cloaked: number
}

export type UsableLeg = 'a door a machine can use' | 'a signup an agent can reach and submit' | 'a documented credential path'

const MINIMUM_SAMPLE = 20

/** One definition, because the report prints two medians and they have to be the same measurement. */
function medianOf(sorted: number[]): number {
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

export async function buildIndustryReport(): Promise<IndustryReport | null> {
  // Mixing formula versions would compare scores that were never comparable, so the report is
  // always about one formula: whichever version most of the corpus was scored under. That choice
  // is made once, in `publishedCorpus`, and repeating it here was a second copy of one rule that
  // could only ever drift from the first.
  const { reports, formulaVersion, heldBack } = await publishedCorpus()
  if (reports.length < MINIMUM_SAMPLE) return null

  const totals = reports.map((report) => report.scorecard.total).sort((a, b) => a - b)
  const measurableOf = (report: Report) => report.scorecard.measurable ?? report.scorecard.max
  const median = medianOf(totals)
  const mean = totals.reduce((sum, total) => sum + total, 0) / totals.length

  const frozenDomains = new Set((await getStore().stayOuts()).map((one) => one.domain))
  const stillRefreshed = reports
    .filter((report) => !frozenDomains.has(report.domain))
    .map((report) => report.scorecard.total)
    .sort((a, b) => a - b)
  // Null rather than a fallback when nothing is left: the median of an empty set is undefined, and
  // printing the original number as the median "without" every row would be a false comparison.
  const frozen = {
    count: reports.length - stillRefreshed.length,
    median: stillRefreshed.length > 0 ? medianOf(stillRefreshed) : null,
  }

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

  // A registration endpoint says an agent may introduce itself. Whether it can then get a token
  // is a different question, and the answer is in grant_types_supported, which we read but never
  // counted: namecheap.com and dynadot.com publish the same door and only one of them opens.
  const withRegistration = reports.filter((report) => {
    const oauth = verdict(report, 'oauth_dcr')
    return oauth !== undefined && oauth.points === oauth.max
  })
  const registrationUnattended = withRegistration.filter(
    (report) => report.findings.funnel.oauth.unattendedGrant === true,
  ).length

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
        // The CAPTCHA is unmeasured precisely because the form is not in the served HTML, so
        // requiring both to be measured made every failed signup unknown and cut the near-miss
        // group from 48 to 7. A form an agent cannot reach is a failed leg whether or not we
        // could then look for a gate inside it; only an unmeasured signup is genuinely unknown.
        known:
          measured('signup_reachable') &&
          (at('signup_reachable')?.points !== at('signup_reachable')?.max || measured('signup_no_captcha')),
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

  // Off the measurement, not off the sentence. Matching prose meant that rewording the sentence
  // silently zeroed the count and hid the whole section, which the audit caught and a reader
  // would not have: the numbers on this page have to survive an edit to the words.
  // Null, not undefined: Mongo stores an absent optional as null, so `!== undefined` passed and
  // the property read threw, which took /findings and /report to a 500 for four minutes.
  const sampled = (report: Report) => report.findings.machine.llmsLinks ?? null
  const llmsStale = reports.filter((report) => (sampled(report)?.dead ?? 0) > 0)
  const llmsLive = reports.filter((report) => sampled(report)?.dead === 0)

  return {
    llmsChecked: llmsStale.length + llmsLive.length,
    llmsStale: llmsStale.length,
    cloaked: reports.filter((report) => (report.findings.docsThinnerForAgents ?? null) !== null).length,
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
    registrationUnattended,
    registrationTotal: withRegistration.length,
    registrationWithoutMcp,
    withoutMcp: others.length,
    signupRefusesAgents,
    signupNeedsJavaScript: needsJavaScript,
    sampleSize: reports.length,
    formulaVersion,
    heldBack,
    // Every report in the slice shares a formula version, so they share a maximum.
    max: Math.max(...reports.map((report) => report.scorecard.max)),
    median,
    frozen,
    mean,
    scannedFrom: scanTimes[0],
    scannedTo: scanTimes[scanTimes.length - 1],
    stages,
    checks,
    best: ranked.slice(0, 5).map(asEntry),
    worst: ranked.slice(-5).reverse().map(asEntry),
  }
}
