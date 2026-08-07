import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

export type Rejection = { vendor: string; reason: string; verbatim?: string }

export type AgentRun = {
  id: string
  model: string
  /** What the agent decided to ship. Null when it refused to commit. */
  chose: string | null
  rejected: Rejection[]
  /** Did it read anything live, or answer from training data alone? */
  usedLiveSources: boolean
  sources: string[]
  /** Whether the agent hit a paywall, licence key or signup it could not get past alone. */
  blockedBy: string | null
  notes?: string
}

export type FullAudit = {
  slug: string
  subject: string
  category: string
  /** The brief every run received, verbatim, so the result can be argued with. */
  task: string
  scaffold: string
  runDate: string
  runs: AgentRun[]
  /** Written after reading the transcripts. This is the part nobody can automate. */
  verdict: { headline: string; body: string[] }
  recommendations: { title: string; body: string; effort: 'hours' | 'days' | 'weeks' }[]
  limits: string[]
}

const AUDITS_DIR = path.join(process.cwd(), 'src/data/audits')

export async function listAudits(): Promise<FullAudit[]> {
  let files: string[]
  try {
    files = await readdir(AUDITS_DIR)
  } catch {
    return []
  }
  const audits = await Promise.all(
    files
      .filter((file) => file.endsWith('.json'))
      .map(async (file) => JSON.parse(await readFile(path.join(AUDITS_DIR, file), 'utf8')) as FullAudit),
  )
  return audits.sort((a, b) => b.runDate.localeCompare(a.runDate))
}

export async function getAudit(slug: string): Promise<FullAudit | null> {
  const audits = await listAudits()
  return audits.find((audit) => audit.slug === slug) ?? null
}

export type Tally = {
  totalRuns: number
  chosen: { vendor: string; count: number }[]
  rejectedMost: { vendor: string; count: number; reasons: string[] }[]
  subjectChosen: number
  subjectRejected: number
  subjectUnmentioned: number
  liveSourcesByModel: { model: string; used: number; of: number }[]
}

export function tally(audit: FullAudit): Tally {
  const runs = audit.runs
  const counts = new Map<string, number>()
  for (const run of runs) {
    if (run.chose) counts.set(run.chose, (counts.get(run.chose) ?? 0) + 1)
  }

  const rejectionCounts = new Map<string, { count: number; reasons: Set<string> }>()
  for (const run of runs) {
    for (const rejection of run.rejected) {
      const held = rejectionCounts.get(rejection.vendor) ?? { count: 0, reasons: new Set<string>() }
      held.count += 1
      held.reasons.add(rejection.reason)
      rejectionCounts.set(rejection.vendor, held)
    }
  }

  const mentionsSubject = (run: AgentRun) =>
    run.chose === audit.subject || run.rejected.some((rejection) => rejection.vendor === audit.subject)

  const byModel = new Map<string, { used: number; of: number }>()
  for (const run of runs) {
    const held = byModel.get(run.model) ?? { used: 0, of: 0 }
    held.of += 1
    if (run.usedLiveSources) held.used += 1
    byModel.set(run.model, held)
  }

  return {
    totalRuns: runs.length,
    chosen: [...counts.entries()]
      .map(([vendor, count]) => ({ vendor, count }))
      .sort((a, b) => b.count - a.count),
    rejectedMost: [...rejectionCounts.entries()]
      .map(([vendor, held]) => ({ vendor, count: held.count, reasons: [...held.reasons] }))
      .sort((a, b) => b.count - a.count),
    subjectChosen: runs.filter((run) => run.chose === audit.subject).length,
    subjectRejected: runs.filter((run) => run.rejected.some((rejection) => rejection.vendor === audit.subject)).length,
    subjectUnmentioned: runs.filter((run) => !mentionsSubject(run)).length,
    liveSourcesByModel: [...byModel.entries()].map(([model, held]) => ({ model, used: held.used, of: held.of })),
  }
}
