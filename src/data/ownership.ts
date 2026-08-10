/**
 * Who owns a vendor, and whether the product is still going somewhere. Not a check and never
 * scanned: an acquisition is not visible over HTTP, so this is hand-recorded evidence with the
 * sentence it came from.
 *
 * It exists because of one measurement. Score does not correlate with company size, it correlates
 * with ownership and lifecycle: the worst rows in the corpus are acquisitions being wound down,
 * PE-held assets and unfunded open source, all of which are structurally unable to buy anything.
 * Sorting the corpus ascending by score and working down the list spends the first fortnight
 * emailing dead products.
 *
 * Two rules, both deliberate:
 *
 * 1. **Absence means unknown, never independent.** Only what somebody verified is in here, so an
 *    empty entry is a gap in our research rather than a claim about the vendor.
 * 2. **This never reaches the site.** Every number we publish is recomputed from a request anyone
 *    can repeat. A claim about who owns a company is not, so it stays a targeting note in the repo
 *    rather than becoming an assertion on a page about a named third party.
 */
export type Ownership = {
  status: 'acquired' | 'pe' | 'public' | 'oss' | 'gone' | 'independent'
  /** What was read, and where. A status with no evidence sentence does not belong here. */
  evidence: string
  /** Whether the product still looks like it is going somewhere, which is what decides a target. */
  shipping: boolean
  checkedAt: string
}

export const OWNERSHIP: Record<string, Ownership> = {
  'june.so': {
    status: 'acquired',
    evidence:
      'Their own home page: "After seeing how our friends at Command AI joined Amplitude ... As we move forward to a new chapter"',
    shipping: false,
    checkedAt: '2026-08-09',
  },
  'pusher.com': {
    status: 'acquired',
    evidence: 'Their own site: "Pusher is a member of the MessageBird team. As of November 2020, we have become part of MessageBird"',
    shipping: false,
    checkedAt: '2026-08-09',
  },
  'highlight.io': {
    status: 'acquired',
    evidence: 'Their own documentation: "Highlight has been acquired by LaunchDarkly!"',
    shipping: false,
    checkedAt: '2026-08-09',
  },
  'defer.run': {
    status: 'gone',
    evidence: 'The apex answers 301 to https://digger.tools/?ref=defer.run, so the product is not there any more',
    shipping: false,
    checkedAt: '2026-08-09',
  },
  'split.io': {
    status: 'acquired',
    evidence: 'Their own home page: "SPLIT IS NOW PART OF HARNESS". Still trading under its own name.',
    shipping: true,
    checkedAt: '2026-08-10',
  },
  'stytch.com': {
    status: 'acquired',
    evidence: 'Their own home page: "Stytch has joined Twilio to build the intelligent identity layer for the internet"',
    shipping: true,
    checkedAt: '2026-08-10',
  },
  'payloadcms.com': {
    status: 'acquired',
    evidence: 'Their own home page: "Payload is now part of Figma!"',
    shipping: true,
    checkedAt: '2026-08-10',
  },
  'lemonsqueezy.com': {
    status: 'acquired',
    evidence: 'Their own home page: "2026 Update: Lemon Squeezy + Stripe Managed Payments", and stripe.com is separately in the corpus',
    shipping: true,
    checkedAt: '2026-08-10',
  },
  'bugsnag.com': {
    status: 'acquired',
    evidence: 'Now a SmartBear brand, own site intact: "Debugging Smarter and Faster with BugSnag, SmartBear MCP"',
    shipping: true,
    checkedAt: '2026-08-10',
  },
  'searchkit.co': {
    status: 'oss',
    evidence:
      'github.com/searchkit/searchkit is a GitHub organisation project, not archived, last push 2026-04-04. ' +
      'Its own site: "Searchkit is an open source library which helps you build a great search experience with ' +
      'Elasticsearch", and the whole navigation is Docs, Demos, About: no pricing, no purchase path.',
    shipping: true,
    checkedAt: '2026-08-09',
  },
}

/** Whether there is plausibly somebody on the other side who can approve a purchase. */
export function couldBuy(domain: string): boolean {
  const owner = OWNERSHIP[domain]
  if (!owner) return true
  if (owner.status === 'gone' || owner.status === 'oss') return false
  return owner.shipping
}
