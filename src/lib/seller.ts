/**
 * Who is selling, and under what terms.
 *
 * Split out of the pages because three of them repeat it and because it is the one part of the
 * legal text a person has to supply: a merchant of record checks the name in the account against
 * the name in the terms, character for character, and rejects the domain when they differ.
 *
 * Nothing here is published until every field is filled. The pages that read it answer 404 while
 * `SELLER_IS_COMPLETE` is false, so an unfinished imprint cannot go live by accident, and the
 * footer does not link what does not exist.
 */
export const SELLER = {
  /** Full legal name as it appears on the invoice, not the brand. */
  legalName: process.env.SELLER_LEGAL_NAME ?? '',
  /** Registered address, one line. */
  address: process.env.SELLER_ADDRESS ?? '',
  /** Tax identifier, in the form printed on invoices. Empty when the seller is not registered. */
  taxId: process.env.SELLER_TAX_ID ?? '',
  /** Where a customer writes, and where legal notices land. */
  email: process.env.SELLER_EMAIL ?? 'hello@letagentsin.com',
  /** Country whose law governs the terms and whose courts hear a dispute. */
  jurisdiction: process.env.SELLER_JURISDICTION ?? 'Poland',
} as const

/**
 * The address, name and tax identity are the three a payment provider verifies. The contact
 * address has a default because it is already published elsewhere on the site.
 */
export const SELLER_IS_COMPLETE = Boolean(SELLER.legalName && SELLER.address)

/**
 * What we promise about money, written once and read by the refunds page and by the terms.
 *
 * The shape is deliberate rather than generous: a report is produced the moment it is bought and
 * cannot be handed back, so the refund window buys trust rather than optionality, and monitoring
 * is stopped rather than refunded because the month it covers has already been measured.
 */
export const REFUNDS = {
  /** Days a buyer has to ask for the one-off report back, no reason required. */
  reportDays: 14,
  /** Whether a monitoring month already begun is refundable. */
  refundsCurrentMonth: false,
} as const

/**
 * The terms the published corpus is offered under.
 *
 * `/docs`, `/llms.txt` and `agent-access.json` have all said "free to use and quote with
 * attribution" for weeks, and nothing said what that means: no licence text, no statement of what
 * attribution is, nothing a reuser can hand to their own legal. Reuse is the distribution strategy,
 * so the promise has to be real.
 *
 * CC BY 4.0 because it IS the sentence already published, in words a lawyer and a scraper both
 * already understand. Off until confirmed, for the one reason that matters here: a licence grant on
 * data already published cannot be taken back, so it is the rare thing worth a person saying yes to.
 */
export const CORPUS_LICENCE = {
  name: 'Creative Commons Attribution 4.0 International',
  short: 'CC BY 4.0',
  url: 'https://creativecommons.org/licenses/by/4.0/',
  /** What a reuser must say, so "attribution" is a sentence rather than a word. */
  attribution: 'Measured by Let Agents In (letagentsin.com), formula version stated in the data.',
} as const

/**
 * Set CORPUS_LICENCE_PUBLISHED=true once the grant is agreed. Until then /corpus-licence is 404.
 *
 * Two files cannot read this flag because they are served as they are written, and the build stops
 * until they are edited by hand: in `public/llms.txt` and `public/.well-known/agent-access.json`,
 * replace "Free to use with attribution" with "Free to use under CC BY 4.0, terms at
 * /corpus-licence". The guard that stops the build names both files.
 */
export const CORPUS_LICENCE_IS_PUBLISHED = process.env.CORPUS_LICENCE_PUBLISHED === 'true'
