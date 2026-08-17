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
