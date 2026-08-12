import { CURATED_DOMAINS } from './categories'
import { getStore, type Report } from './store'

/**
 * How much the corpus moves between two identical rescans, as a percentage, measured rather than
 * estimated. Lives here because it is quoted on two pages that drifted apart: /methodology was
 * updated to 0.20 after we stopped counting our own truncated scans, and /report went on saying
 * 0.64 for a day. A number stated in two places is a number that will disagree with itself.
 *
 * Measured on 12 August 2026: 5 of 2,550 verdicts, same formula on both sides, nothing changed
 * between the runs. Rerun `npm run diff-corpus <snapshot>` after any change to the scanner and
 * update this if it moves.
 */
export const NOISE_FLOOR_PERCENT = 0.2

/**
 * The one definition of "the corpus". There were five, and they disagreed in public: the landing
 * page counted every curated scan we held, the corpus file counted only the majority formula
 * version, and the two numbers sat one page apart at 103 and 101.
 *
 * Two conditions, both of which a published number depends on:
 *
 * Seeded, meaning the scan came from our console. A stranger scanning a curated domain used to
 * become the newest scan we held for it, which is how a single anonymous request took resend.com
 * out of the published data and out of the industry report. Our own promise is that a scan you
 * run never joins the corpus, and it has to be true of the data and not only of the sentence.
 *
 * One formula version, because scores from two versions were never comparable and mixing them
 * moves a vendor's position while nothing about the vendor changes.
 */
export type PublishedCorpus = { reports: Report[]; formulaVersion: string }

const EMPTY: PublishedCorpus = { reports: [], formulaVersion: '' }

export async function publishedCorpus(): Promise<PublishedCorpus> {
  const seeded = (await getStore().latestPerDomain(1000, true)).filter((report) =>
    CURATED_DOMAINS.has(report.domain),
  )
  if (seeded.length === 0) return EMPTY

  const byVersion = new Map<string, Report[]>()
  for (const report of seeded) {
    const version = report.scorecard.formulaVersion
    byVersion.set(version, [...(byVersion.get(version) ?? []), report])
  }
  const [formulaVersion, reports] = [...byVersion.entries()].sort((a, b) => b[1].length - a[1].length)[0]
  return { reports, formulaVersion }
}
