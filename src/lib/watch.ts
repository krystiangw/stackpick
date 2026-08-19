import { randomBytes } from 'node:crypto'
import type { Report } from './store'
import type { ScoredCheck } from './score'
import { verdictOf, type CorpusVerdict } from './corpus'
import { inReleaseOrder, isOlderThan } from './formula'
import { challengedUs } from './limits'

/**
 * Somebody asking to be told when their agent readiness changes. The scan already answers "how
 * are you doing today", and a vendor who fixes something and then breaks it six weeks later
 * finds out from us or from nobody: the failures we measure are the kind nobody notices, because
 * a WAF rule that starts refusing agents changes nothing a person sees in a browser.
 */
export type Watch = {
  id: string
  email: string
  domain: string
  createdAt: string
  /** Null until the address is confirmed by following the link we mail. */
  confirmedAt: string | null
  /** What the last alert was measured against, so a change is against what we told them. */
  lastReportId: string | null
  lastTotal: number | null
  lastMeasurable: number | null
  checkedAt: string | null
  /** Kept rather than deleted when someone stops, so an unsubscribe cannot be undone by us. */
  stoppedAt: string | null
  plan: 'trial' | 'paid'
  /** Set when a payment provider tells us a subscription exists. */
  subscriptionId: string | null
  /**
   * Which category to read this domain against, when it is not one of the ones we publish.
   *
   * Every paying customer is in this position: the corpus is a list we chose, and they are not on
   * it. The monthly agent run needs a category to have a question at all, and deciding which one is
   * a person's call, not a guess: "email" for email.com would count every sentence about email.
   * Absent on a watch created before 2026-08-18 and on every domain we already publish.
   */
  placedIn?: string | null
  /** The brand to search for beside the address, only when a person checked it belongs to nobody else. */
  brand?: string | null
}

/**
 * Every field a watch persists, in the words the privacy notice uses.
 *
 * Written here rather than in the page because a prose list of what a record holds drifts away from
 * the record on the first field somebody adds, and it did: the page said "the domain it belongs to
 * and nothing else" while the type had grown eleven more. The guard in `scripts/rules.mts` fails the
 * build when `Watch` gains a key that is not described here, so the disclosure cannot silently
 * become incomplete.
 */
export const WATCH_FIELDS_DISCLOSED: Record<keyof Watch, string> = {
  id: 'an identifier for the watch itself',
  email: 'the address you gave us',
  domain: 'the domain you asked us to watch',
  createdAt: 'when it was created',
  confirmedAt: 'when you confirmed it',
  lastReportId: 'which measurement the last alert was compared against',
  lastTotal: 'the score at that measurement',
  lastMeasurable: 'how many points were measurable then',
  checkedAt: 'when we last checked',
  stoppedAt: 'when you stopped it, kept so we cannot undo your unsubscribe',
  plan: 'whether it is a trial or paid',
  subscriptionId: 'the subscription identifier, when there is one',
  placedIn: 'which category to read the domain against, when it is not one we publish',
  brand: 'the brand name to search for beside the domain, when you gave one',
}

export type WatchChange = {
  checkId: string
  label: string
  from: CorpusVerdict
  to: CorpusVerdict
  detail: string
  /** True when the vendor lost ground, which is the half worth an email at all. */
  worse: boolean
}

const RANK: Record<CorpusVerdict, number> = { fail: 0, partial: 1, pass: 2, unmeasured: -1, notApplicable: -1 }

/**
 * What moved between two scans of one domain, in the vendor's language rather than ours.
 *
 * Verdicts that cannot be ranked against each other are still reported, because "we could not
 * measure your signup this week" is news to somebody who passed it last week, but they are not
 * called worse: a check going unmeasured usually says something about our reach, not their site.
 */
export function changesBetween(before: ScoredCheck[], after: ScoredCheck[]): WatchChange[] {
  const held = new Map(before.map((check) => [check.id, check]))
  const changes: WatchChange[] = []
  for (const check of after) {
    const previous = held.get(check.id)
    if (!previous) continue
    const from = verdictOf(previous)
    const to = verdictOf(check)
    if (from === to) continue
    const comparable = RANK[from] >= 0 && RANK[to] >= 0
    changes.push({ checkId: check.id, label: check.label, from, to, detail: check.detail, worse: comparable && RANK[to] < RANK[from] })
  }
  return changes
}

/**
 * A scan is worth an email when a verdict moved between two states we could both measure. A score
 * moving without a verdict is arithmetic, and a verdict moving in or out of "unmeasured" is
 * usually us: the note on changesBetween says so, and 2026-08-15 put a number on it. Between the
 * two passes of one reseed, 21 of the 22 verdicts that moved went unmeasured to pass, sixteen of
 * them because the first pass asked npm with a cold cache and the second found the answer. A
 * watcher active that hour would have been told their typed SDK now passes, about a change that
 * happened entirely inside our scanner.
 *
 * Such a change is still listed in the mail when something else earned it, which is what the
 * comment on changesBetween asks for: "we could not measure your signup this week" is news to
 * somebody who passed it last week. It is not, on its own, a reason to write.
 */
export function worthTelling(changes: WatchChange[], theirEdgeTurnedUsAway = false): boolean {
  if (changes.some((change) => RANK[change.from] >= 0 && RANK[change.to] >= 0)) return true
  // The exception, and it is the whole product. A check falls to "unmeasured" for two unrelated
  // reasons: our own cache or clock, and their edge deciding to turn a non-browser away. The
  // second is exactly the failure the landing page promises to catch, because it changes nothing
  // a person sees in a browser. Requiring a measured change on both sides silenced it: a customer
  // switching on bot protection would have moved three checks from pass to unmeasured and heard
  // nothing from us.
  return theirEdgeTurnedUsAway && changes.some((change) => change.to === 'unmeasured')
}

/**
 * Their edge, not our reach: the signals that mean a scan was turned away rather than slow.
 *
 * A challenge counts, and it did not until 2026-08-18. An edge that answers a browser and hands an
 * HTTP client `cf-mitigated: challenge` is the exact failure the landing page promises to catch:
 * nothing a person sees changes, and every check that needed those pages falls to unmeasured. With
 * only `blocksPlainRequests` here, a customer switching that on moved three checks into silence and
 * heard nothing from us. A plain 429 is still not this: that is our own load, and it is filtered
 * where the limits are recorded rather than here.
 */
export function turnedAwayAtTheEdge(
  findings: {
    blocksPlainRequests?: boolean
    robots?: { unreadable?: boolean }
    limitsMet?: { url: string; challenge: boolean; recovered: boolean }[]
  },
  /**
   * The domain the row is about. Without it a challenge from a third party we touch during a scan,
   * `api.npmjs.org` above all, would read as this vendor turning us away and could mail a paying
   * customer that their edge closed. The registry refusing us is a fact about our traffic.
   */
  domain?: string | null,
): boolean {
  // Only a challenge we never got past. Today the scanner does not retry in front of a marker, so
  // `recovered` is always false here and this reads the same either way. It is written out because
  // the tryb audytowy proposed in #48 would retry exactly these, and then a wall we walked through
  // would start mailing customers that their door is shut.
  const challenged = domain
    ? (findings.limitsMet ?? []).some((limit) => limit.challenge && !limit.recovered) &&
      challengedUs(findings as never, domain) !== null
    : false
  return Boolean(findings.blocksPlainRequests || findings.robots?.unreadable || challenged)
}

/**
 * Whether two scorecards are a before and an after at all. They are not when the formula moved
 * between them: we reseed every few days and the rules move with the reseed, so comparing across
 * versions mails every watcher a list of verdicts that changed because we changed our mind, under
 * a subject line saying their site lost ground. On formula 9.3 that would have been the first
 * email several people ever got from us.
 */
export function comparableScorecards(
  before: { formulaVersion: string } | null | undefined,
  after: { formulaVersion: string },
): boolean {
  return before?.formulaVersion === after.formulaVersion
}

/**
 * Which checks had their scoring rule changed in each formula version.
 *
 * When the formula moves between two measurements the cron rescores the older findings, and that
 * is honest only where the current rule reads a stored measurement. Where the rule does its own
 * reading during the scan - matching phrases across documentation pages, probing addresses - the
 * report keeps what matched, not the pages it matched in, so a rescore reproduces the OLD reading
 * and the difference is our rule rather than the vendor. 9.32 tightened `programmatic_provisioning`
 * from a bare phrase to a phrase with its evidence beside it, which would have read as up to
 * nineteen vendors losing a point they never had taken from them.
 *
 * A version missing from here is a version that changed no scoring rule. Keeping the list by hand
 * is the price of not having to decide, per check and per release, whether the evidence we still
 * hold is the evidence the new rule wants.
 */
const CHECK_RULE_CHANGED: Record<string, readonly string[]> = {
  '9.31': ['signup_reachable', 'mcp_present', 'oauth_dcr'],
  '9.32': ['programmatic_provisioning', 'oauth_dcr'],
  '9.33': ['oauth_dcr'],
  // 9.35 did not touch the rule, it changed which pages the rule reads: the sample no longer lets
  // one family of words take all three slots. A rescore reproduces the old reading either way, so
  // a vendor must not be told they lost ground because we looked somewhere else.
  '9.35': ['programmatic_provisioning'],
  // 9.36 reads the same description with a wider eye: an amount with the currency symbol after the
  // number, and "no card needed" beside "no credit card".
  '9.36': ['price_in_snippet'],
  // 9.37 stopped failing a vendor for an abandoned package we picked for them ourselves.
  '9.37': ['typed_package'],
  // 9.42 lets a package's own description decide which artefact is the vendor's library, so three
  // rows are now scored on a different package than before. Nothing about those vendors changed.
  '9.42': ['typed_package'],
  // 9.43 stops paying for an entry file when the control that would have discredited it never
  // answered. A row that loses the point here did not change; our willingness to guess did.
  '9.43': ['agent_entry_point'],
  // 9.44 stops reading an instruction to create somebody else's credential as the vendor's own
  // provisioning path. growthbook.io held the point on a sentence about Google Cloud service
  // accounts, and a row that loses it here documented no more and no less than it did before.
  '9.44': ['programmatic_provisioning'],
  // 9.49 stops reading a press release as a documentation page. Exactly one in the corpus, and it
  // was holding up a hard zero on datadoghq.com.
  '9.49': ['programmatic_provisioning'],
  // 9.48 stops calling a read we cut short a page shell. Two rows carried that accusation and both
  // were our own byte cap: filestack.com renders 12,282 characters to a complete read and we
  // published 53.
  '9.48': ['docs_without_js'],
  // 9.47 makes the service-account phrase carry the burden its sibling already carried: the
  // sentence has to say a program can do it. Eleven rows stood on that phrase; six lose it, and
  // none of the six drops to a zero, because a walkthrough of somebody's console is not silence
  // about provisioning, it is an answer to a question we never asked them.
  '9.47': ['programmatic_provisioning'],
  // 9.46 reads whose credential the sentence creates when it names one. onesignal.com held this
  // point on "Create a Firebase Service Account private key": a Google key, made in Google's
  // console, and nothing OneSignal hands an agent. Measured on the 55 credited quotes before it
  // shipped, it takes that row and no other.
  '9.46': ['programmatic_provisioning'],
  // 9.45 stops reading the words "service account" as a provisioning surface when nothing in the
  // sentence creates one. Ten rows lose the point on a navigation breadcrumb, a statistic in a
  // blog post or somebody else's cloud console, and not one of them documents any less than it
  // documented yesterday.
  '9.45': ['programmatic_provisioning'],
  // 9.40 asks what a searched identification rests on before it accuses, and the facts it asks for
  // are not in a report stored before it, so a rescore reads them as absent and says unmeasured.
  '9.40': ['typed_package'],
  // 9.41 stopped reading a page the vendor never called their pricing. Same rule, different page,
  // so a rescore reproduces the old reading and the movement is ours.
  '9.41': ['self_serve'],
}

/**
 * Checks whose rule moved between two formula versions, so a change in them is ours to explain
 * rather than the vendor's to answer for. Order does not matter: a rescan under an older formula
 * is as incomparable as one under a newer.
 *
 * Ordered by `isOlderThan` rather than by reading the version as a number, which was wrong in the
 * one direction nobody would notice. A baseline of 9.9 is older than every entry here, but as a
 * float it is larger than 9.35, so the window came out empty and the whole guard fell silent for
 * exactly the oldest measurements: the ones that crossed the most rule changes.
 */
export function rulesChangedBetween(before: string, after: string): Set<string> {
  const [low, high] = inReleaseOrder(before, after)
  const moved = new Set<string>()
  for (const [version, checks] of Object.entries(CHECK_RULE_CHANGED)) {
    // The version a measurement was taken under is the version it already contains, so only the
    // releases AFTER the older measurement can have moved anything under it.
    if (isOlderThan(low, version) && !isOlderThan(high, version)) for (const check of checks) moved.add(check)
  }
  return moved
}

export function newWatch(email: string, domain: string, now: string): Watch {
  return {
    id: randomBytes(16).toString('hex'),
    email: email.toLowerCase(),
    domain,
    createdAt: now,
    confirmedAt: null,
    lastReportId: null,
    lastTotal: null,
    lastMeasurable: null,
    checkedAt: null,
    stoppedAt: null,
    plan: 'trial',
    subscriptionId: null,
    placedIn: null,
    brand: null,
  }
}

/**
 * The category a watch is served from: ours when we publish the domain, the assigned one when a
 * person placed it, and nothing when neither. Kept here rather than in the mail script because the
 * report and the mail must not answer this differently about one customer.
 */
export function categoryOfWatch(
  watch: Pick<Watch, 'domain' | 'placedIn'>,
  published: (domain: string) => { id: string } | null,
  known: readonly { id: string }[],
): { id: string } | null {
  const ours = published(watch.domain)
  if (ours) return ours
  return watch.placedIn ? (known.find((one) => one.id === watch.placedIn) ?? null) : null
}

export const measurableOf = (report: Report) => report.scorecard.measurable ?? report.scorecard.max
