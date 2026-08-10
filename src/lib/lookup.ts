import { CATEGORIES, type Category } from './categories'
import { publishedCorpus } from './published'
import type { Report } from './store'

/**
 * The question an agent actually has, answered from the corpus: it needs to solve something, and
 * it does not want to spend four sessions discovering that three providers stop at a signup form.
 *
 * Deliberately an elimination service and not a recommendation. We do not know that a vendor is
 * the right choice for a job, and saying so would be selling a judgement we never measured while
 * we also sell those vendors the fix. What we do know, per vendor and per date, is which stage an
 * unattended agent gets to, and that is the expensive thing to find out by trying.
 */
export type Reachability = {
  domain: string
  /** Where an unattended run stops, or null when nothing we measure stops it. */
  stopsAt: string | null
  /** Every barrier we measured, so the caller can weigh them rather than trust our ordering. */
  barriers: string[]
  measuredAt: string
  evidence: string
}

export type Lookup = {
  category: { id: string; label: string; jobToBeDone: string }
  /** How much of the category we hold. Never presented as the whole market. */
  measured: number
  clear: Reachability[]
  blocked: Reachability[]
  unknown: Reachability[]
}

/**
 * The three barriers, in the order an agent hits them. Each one is a check that already exists,
 * and the sentence is the one we would defend to the vendor.
 */
const BARRIERS = [
  { id: 'agent_entry_point', when: 'no door built for a machine', alternatives: ['oauth_dcr', 'mcp_present'] },
  { id: 'signup_reachable', when: 'the signup form is not in the served HTML' },
  { id: 'signup_no_captcha', when: 'a CAPTCHA sits in the signup HTML' },
  { id: 'programmatic_provisioning', when: 'no documented way to get a credential', partialCounts: true },
] as const

function reachabilityOf(report: Report): Reachability {
  const at = (id: string) => report.scorecard.checks.find((check) => check.id === id)
  const met = (id: string) => {
    const check = at(id)
    return check !== undefined && check.points === check.max
  }
  const known = (id: string) => {
    const check = at(id)
    return check !== undefined && !check.inconclusive && !check.notApplicable
  }

  const barriers: string[] = []
  let anyUnknown = false
  for (const barrier of BARRIERS) {
    const ids = [barrier.id, ...('alternatives' in barrier ? barrier.alternatives : [])]
    const passed =
      ids.some(met) || ('partialCounts' in barrier && (at(barrier.id)?.points ?? 0) >= 1)
    if (passed) continue
    if (!ids.some(known)) {
      anyUnknown = true
      continue
    }
    barriers.push(barrier.when)
  }

  return {
    domain: report.domain,
    stopsAt: barriers[0] ?? null,
    barriers,
    measuredAt: report.scannedAt.slice(0, 10),
    evidence: `/r/${report.id}`,
    // An unknown barrier is neither cleared nor failed, and a lookup that hid the difference
    // would be telling an agent to try a vendor we never got through to.
    ...(anyUnknown ? { unknown: true } : {}),
  } as Reachability & { unknown?: boolean }
}

/** Matches on the words a caller would use for the problem, not on our own category ids. */
export function categoryForJob(job: string): Category | null {
  const words = job.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2)
  if (words.length === 0) return null
  const scored = CATEGORIES.map((category) => {
    const haystack = `${category.id} ${category.label} ${category.jobToBeDone}`.toLowerCase()
    return { category, hits: words.filter((word) => haystack.includes(word)).length }
  }).sort((a, b) => b.hits - a.hits)
  return scored[0].hits > 0 ? scored[0].category : null
}

export async function lookup(job: string): Promise<Lookup | null> {
  const category = categoryForJob(job)
  if (!category) return null

  const reports = new Map((await publishedCorpus()).reports.map((report) => [report.domain, report]))
  const held = category.domains
    .map((domain) => reports.get(domain))
    .filter((report): report is Report => report !== undefined)
    .map(reachabilityOf) as (Reachability & { unknown?: boolean })[]

  return {
    category: { id: category.id, label: category.label, jobToBeDone: category.jobToBeDone },
    measured: held.length,
    clear: held.filter((entry) => entry.barriers.length === 0 && !entry.unknown),
    blocked: held.filter((entry) => entry.barriers.length > 0),
    unknown: held.filter((entry) => entry.barriers.length === 0 && entry.unknown),
  }
}
