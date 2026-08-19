import { CURATED_DOMAINS } from './categories'
import { getStore, type Report } from './store'

/**
 * How much the corpus moves between two identical rescans, as a percentage, measured rather than
 * estimated. Lives here because it is quoted on two pages that drifted apart: /methodology was
 * updated to 0.20 after we stopped counting our own truncated scans, and /report went on saying
 * 0.64 for a day. A number stated in two places is a number that will disagree with itself.
 *
 * Measured on 17 August 2026, and this is the first time it was measured the way it has to be:
 * 15 of 2,550 verdicts, 170 domains, formula 9.30 on both sides, and the two scans are the WARM
 * pass of two separate sweeps six hours apart rather than the cold and warm passes of one. The
 * direction is what makes it a floor rather than an artefact: 9 up and 6 down, which is symmetric.
 * Every earlier figure on this line, 0.64 down to 0.20, came from pairs one of whose halves asked
 * npm cold, and they were one-directional for that reason.
 *
 * It is higher than the 0.20 it replaces and that is not a regression: 0.20 was measured on formula
 * 9.8 twelve days and twenty-odd rule changes ago, and today's scanner sends far more requests per
 * domain, so there are more answers that can arrive differently on a second asking.
 *
 * Ten of the fifteen are a verdict that disagreed with the verdict before it (0.39 percent) and
 * five are a row that was unmeasurable on one of the two days. The larger figure is the one
 * published, because it is the one a reader can check against their own two scans.
 *
 * Rerun with `npm run noise-floor <formula>` after a day with no rule change, which is what it
 * costs: two sweeps of the same version, six hours apart.
 */
export const NOISE_FLOOR_PERCENT = 0.59

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
export type PublishedCorpus = {
  reports: Report[]
  formulaVersion: string
  /**
   * Rows the version filter left out. Published, because "175 domains" next to a corpus of 177 is
   * a number with a silent subtraction in it, and the window where that happens - between shipping
   * a formula and sweeping the corpus onto it - is exactly when somebody is reading the page to
   * see what changed.
   */
  heldBack: number
}

const EMPTY: PublishedCorpus = { reports: [], formulaVersion: '', heldBack: 0 }

/**
 * How long a loaded corpus is reused before the database is asked again. The corpus changes when
 * we reseed, which is a few times a week, so anything under an hour is generous; five minutes is
 * chosen so a reseed shows up while somebody is still watching it finish.
 *
 * This exists because of the outage on 2026-08-12. The landing page is force-dynamic and read the
 * whole corpus per request, so when Meta's crawler opened seventy pages at once, one dyno ran
 * seventy full collection scans and returned 503 to everybody, including the people who were not
 * crawling us. A cache is the fix; the deeper lesson is that being open to crawlers is a capacity
 * commitment and not only a policy.
 */
const CORPUS_TTL_MS = 5 * 60 * 1000

let cached: { at: number; value: PublishedCorpus } | null = null
/** One database read serves a burst: without this, the cache fills seventy times, not once. */
let inFlight: Promise<PublishedCorpus> | null = null

export async function publishedCorpus(): Promise<PublishedCorpus> {
  if (cached && Date.now() - cached.at < CORPUS_TTL_MS) return cached.value
  if (inFlight) return inFlight
  inFlight = loadCorpus()
    .then((value) => {
      cached = { at: Date.now(), value }
      return value
    })
    .catch((error) => {
      // A database blip should cost freshness, not the page. Callers already treat an empty
      // corpus as "no exhibit", and yesterday's exhibit is better than none.
      if (cached) return cached.value
      throw error
    })
    .finally(() => {
      inFlight = null
    })
  return inFlight
}

async function loadCorpus(): Promise<PublishedCorpus> {
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
  return { reports, formulaVersion, heldBack: seeded.length - reports.length }
}
