import { CURATED_DOMAINS } from './categories'
import { getStore, type Report } from './store'

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
