/**
 * A produced report, kept so the buyer can be sent a link instead of an attachment.
 *
 * The document itself is markdown, because that is what the generator writes and what a buyer
 * forwards to somebody who does not have our site open. Storing the rendered HTML instead would
 * mean two versions of one report, and the one nobody looked at would be the one they read.
 */
export type Delivery = {
  id: string
  domain: string
  /** The markdown exactly as `scripts/client-report.mts` produced it. */
  markdown: string
  preparedAt: string
  formulaVersion: string
  /** Set when the link is a sample rather than something somebody paid for, and the page says so. */
  sample?: boolean
}
