import type { ScanFindings } from './scan'
import type { Scorecard } from './score'

export type Headline = {
  /** One sentence a stranger would forward to a colleague. Specific, checkable, unflattering. */
  claim: string
  /** The raw observation behind it, so nobody has to take our word for it. */
  evidence: string
  severity: 'critical' | 'serious' | 'notable' | 'clean'
}

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many)

/**
 * Ordered by how much the finding costs, not by how easy it is to detect. The first match
 * wins, because a scorecard that opens with the fifth most important thing reads as a form
 * letter, and a form letter is indistinguishable from spam.
 */
export function pickHeadline(findings: ScanFindings, scorecard: Scorecard): Headline {
  const { robots, funnel, machine, npm, discovered } = findings

  if (findings.blocksPlainRequests) {
    // Both refused means the WAF is refusing the data centre, not singling out agents.
    // Claiming "the only difference was the user-agent" when both got 403 was false on the
    // one check the product is named after, in the largest type on the page.
    const browserGotThrough = findings.browserStatus >= 200 && findings.browserStatus < 400
    return browserGotThrough
      ? {
          claim: `An agent asking for your home page gets ${findings.agentStatus}. A browser gets ${findings.browserStatus}.`,
          evidence: `GET https://${findings.domain}/ answered ${findings.agentStatus} to LetAgentsIn/1.0 and ${findings.browserStatus} to a Chrome user-agent. The user-agent was the only difference between the two requests.`,
          severity: 'critical',
        }
      : {
          claim: `Your edge refuses ordinary HTTP from a data centre, agent or not.`,
          evidence: `GET https://${findings.domain}/ answered ${findings.agentStatus} to LetAgentsIn/1.0 and ${findings.browserStatus} to a Chrome user-agent. Both were refused, so this is your WAF rejecting the network we scan from rather than a rule about agents. Everything below was measured through that wall.`,
          severity: 'critical',
        }
  }

  if (robots.blanketDisallowAll) {
    return {
      claim: 'Your robots.txt tells every agent to go away, including the ones your customers are running.',
      evidence: `robots.txt has Disallow: / for User-agent: *`,
      severity: 'critical',
    }
  }

  if (robots.blockedByClass.user.length > 0) {
    const blocked = robots.blockedByClass.user
    return {
      claim: `You block ${blocked.join(' and ')}, which is your own prospect reading your docs mid-integration.`,
      evidence: `robots.txt disallows ${blocked.join(', ')}. These are not crawlers: they fetch on behalf of a person who asked a question about you.`,
      severity: 'critical',
    }
  }

  if (funnel.signup.url && !funnel.signup.reachable) {
    const seen = funnel.signup.consistent ? `${funnel.signup.status}` : funnel.signup.statusesSeen.join(', ')
    return {
      claim: `Your signup page answers ${seen} to anything that is not a browser.`,
      evidence: `${funnel.signup.url} returned ${seen} across three tries. An agent that got this far still cannot open an account.`,
      severity: 'critical',
    }
  }

  const delay = robots.crawlDelaySeconds
  if (delay !== null && delay > 1) {
    return {
      claim: `Reading twenty pages of your documentation takes a well-behaved agent ${delay * 20} seconds.`,
      evidence: `robots.txt sets Crawl-delay: ${delay} for agents. Agents that honour it wait ${delay}s between pages; most give up long before page twenty.`,
      severity: 'serious',
    }
  }

  // Zero characters can mean thin docs or a page we never got. Only the first is a finding.
  if (findings.docsTextChars > 0 && findings.docsTextChars < 2000 && discovered.docs) {
    return {
      // Stating the number without stating that it is too little read as a compliment: the same
      // 1,778 characters headlined resend.com's scorecard while the check below it scored zero.
      claim: `Only ${findings.docsTextChars.toLocaleString('en-US')} characters of your documentation survive without JavaScript, and that is the version an agent reads.`,
      // The page the number came off, which is the richest documentation page this scan read and
      // not always the one we call the entry point. Naming the entry point instead attributed a
      // measurement to a page that never produced it.
      evidence: `${findings.docsTextCharsFrom ?? discovered.docs} served ${findings.docsTextChars.toLocaleString('en-US')} characters of text to a plain fetch. The check passes at 2,000, which is about one screen of prose.`,
      severity: 'serious',
    }
  }

  if (npm.package && npm.staleMonths !== undefined && npm.staleMonths >= 18) {
    return {
      claim: `The SDK agents will install for you was last published ${npm.staleMonths} months ago.`,
      evidence: `${npm.package}@${npm.version} last published ${npm.lastPublish?.slice(0, 10)}${
        npm.weeklyDownloads ? `, still ${npm.weeklyDownloads.toLocaleString('en-US')} downloads a week` : ''
      }.`,
      severity: 'serious',
    }
  }

  if (funnel.signup.captcha.length > 0) {
    return {
      claim: `A ${funnel.signup.captcha[0]} challenge sits between an agent and an account it was ready to create.`,
      evidence: `${funnel.signup.url} loads ${funnel.signup.captcha.join(' and ')}. There is no version of that an agent solves.`,
      severity: 'serious',
    }
  }

  if (funnel.entryPointsFound.length === 0 && !funnel.servesCatchAll) {
    const machineReadable = machine.hasLlmsTxt || machine.openapi.length > 0
    return {
      claim: machineReadable
        ? 'You publish files for machines to read, but nothing that tells one how to become a customer.'
        : 'There is no door built for a machine anywhere on your domain.',
      evidence: `None of the nine known agent entry paths answered, including /agent-signup.md and /.well-known/agent-access.json.${
        machineReadable ? ' Reading is solved on your site; joining is not.' : ''
      }`,
      severity: 'notable',
    }
  }

  if (!funnel.provisioning.programmatic.length && (findings.docsPagesRead ?? 0) >= 2) {
    return {
      claim: 'Nowhere in your documentation does an agent learn how to get a key without a human.',
      evidence: 'No management API, service account or programmatic key creation is described in the pages we read.',
      severity: 'notable',
    }
  }

  const failing = scorecard.checks.filter((check) => check.points < check.max && !check.inconclusive)
  if (failing.length > 0) {
    return {
      claim: `${failing.length} ${plural(failing.length, 'check is', 'checks are')} costing you agent-driven integrations.`,
      evidence: failing.map((check) => `${check.label}: ${check.detail}`).join(' · '),
      severity: 'notable',
    }
  }

  return {
    claim: 'You pass every check a machine can measure from the outside.',
    evidence: `${scorecard.total} of ${scorecard.max}. What no scanner can tell you is whether agents actually pick you, which is a different measurement.`,
    severity: 'clean',
  }
}
