/**
 * A produced report, kept so the buyer can be sent a link instead of an attachment.
 *
 * The document itself is markdown, because that is what the generator writes and what a buyer
 * forwards to somebody who does not have our site open. Storing the rendered HTML instead would
 * mean two versions of one report, and the one nobody looked at would be the one they read.
 */
import type { ReportModel } from './client-report-model'

export type Delivery = {
  id: string
  domain: string
  /** The markdown exactly as `scripts/client-report.mts` produced it. */
  markdown: string
  preparedAt: string
  formulaVersion: string
  /**
   * The same report as data, written in the same pass as the markdown. The page draws from this;
   * the markdown stays the thing a buyer forwards. Absent on anything delivered before 2026-08-19.
   */
  model?: ReportModel
  /** Set when the link is a sample rather than something somebody paid for, and the page says so. */
  sample?: boolean
}
