import { randomBytes } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { MongoStore } from './store-mongo'
import type { ScanFindings } from './scan'
import type { Scorecard } from './score'
import type { Watch } from './watch'

export type Report = {
  id: string
  domain: string
  scannedAt: string
  findings: ScanFindings
  scorecard: Scorecard
  /** Run by us to build the published corpus, as opposed to run by a visitor on their own site. */
  seeded?: boolean
}

export type Lead = {
  email: string
  domain: string
  reportId: string
  createdAt: string
  source: string
}

export interface Store {
  saveReport(report: Report): Promise<void>
  getReport(id: string): Promise<Report | null>
  latestForDomain(domain: string): Promise<Report | null>
  listReports(limit: number): Promise<Report[]>
  /**
   * Newest report per domain. Taking the newest N reports and deduplicating afterwards
   * silently drops a domain from its own ranking once the corpus outgrows the window.
   */
  latestPerDomain(limit: number, seededOnly?: boolean): Promise<Report[]>
  saveLead(lead: Lead): Promise<void>
  listLeads(limit: number): Promise<Lead[]>
  saveWatch(watch: Watch): Promise<void>
  getWatch(id: string): Promise<Watch | null>
  /** Every watch that is confirmed and not stopped, oldest check first. */
  listWatchesDue(limit: number): Promise<Watch[]>
  listWatchesForEmail(email: string): Promise<Watch[]>
  /** One counter per day and path. Upserted, so a page render costs one small write. */
  recordVisit(visit: { day: string; path: string }): Promise<void>
  /**
   * Whether the store would accept a write, asked without leaving one behind that matters.
   *
   * "Readable" was the only thing the health check knew, and on 2026-08-13 the cluster hit its
   * quota and refused every write for hours while the check kept answering ok: the site served
   * its pages, and every scan, watch and lead a visitor submitted was thrown away. A product
   * that cannot write is down whatever its home page renders.
   */
  writable(): Promise<true | string>
  listVisits(days: number): Promise<{ day: string; path: string; count: number }[]>
}


/**
 * What a report looks like on disk, which is not what it looks like in memory.
 *
 * `funnel.catchAll.bodies` holds the raw pages the nonsense-path probe fetched, so that the
 * entry-file check can tell a real file from a template that echoes the path it refuses. That
 * comparison happens inside the scan and nothing reads the bodies afterwards, yet they were
 * persisted with every report: 180 kB of the 185 kB each one occupied. Twenty-one thousand
 * reports later the cluster hit its quota and every write in production was refused, including
 * the scans and signups of anybody who happened to be using the site.
 *
 * Stripped here rather than in the scanner so it holds for every writer, including the cron.
 */
export function forStorage(report: Report): Report {
  const catchAll = report.findings.funnel.catchAll
  if (!catchAll?.bodies) return report
  const { bodies: _bodies, ...rest } = catchAll
  return { ...report, findings: { ...report.findings, funnel: { ...report.findings.funnel, catchAll: rest } } }
}

const DATA_DIR = path.join(process.cwd(), 'data')

class FileStore implements Store {
  private async dir(name: string) {
    const target = path.join(DATA_DIR, name)
    await mkdir(target, { recursive: true })
    return target
  }

  async saveReport(report: Report) {
    const dir = await this.dir('reports')
    await writeFile(path.join(dir, `${report.id}.json`), JSON.stringify(forStorage(report), null, 2))
  }

  async getReport(id: string) {
    try {
      const dir = await this.dir('reports')
      return JSON.parse(await readFile(path.join(dir, `${id}.json`), 'utf8')) as Report
    } catch {
      return null
    }
  }

  async listReports(limit: number) {
    const dir = await this.dir('reports')
    const files = await readdir(dir)
    const reports = await Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map(async (file) => JSON.parse(await readFile(path.join(dir, file), 'utf8')) as Report),
    )
    return reports.sort((a, b) => b.scannedAt.localeCompare(a.scannedAt)).slice(0, limit)
  }

  async latestForDomain(domain: string) {
    const all = await this.listReports(2000)
    return all.find((report) => report.domain === domain) ?? null
  }

  async latestPerDomain(limit: number, seededOnly = false) {
    const all = (await this.listReports(2000)).filter((report) => !seededOnly || report.seeded === true)
    const latest = new Map<string, Report>()
    for (const report of all) {
      const held = latest.get(report.domain)
      if (!held || report.scannedAt > held.scannedAt) latest.set(report.domain, report)
    }
    return [...latest.values()].slice(0, limit)
  }

  async saveLead(lead: Lead) {
    const dir = await this.dir('leads')
    const file = path.join(dir, 'leads.jsonl')
    const existing = await readFile(file, 'utf8').catch(() => '')
    await writeFile(file, `${existing}${JSON.stringify(lead)}\n`)
  }

  /** The local store exists so a developer can run without Mongo; counting visits there is noise. */
  async recordVisit() {}

  async writable(): Promise<true | string> {
    try {
      await this.dir('reports')
      return true
    } catch (error) {
      return (error as Error).message
    }
  }

  async listVisits() {
    return []
  }

  async listLeads(limit: number) {
    const dir = await this.dir('leads')
    const raw = await readFile(path.join(dir, 'leads.jsonl'), 'utf8').catch(() => '')
    return raw
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Lead)
      .reverse()
      .slice(0, limit)
  }

  private async watches(): Promise<Watch[]> {
    const dir = await this.dir('watches')
    const raw = await readFile(path.join(dir, 'watches.jsonl'), 'utf8').catch(() => '')
    // Last line wins, so a rewritten watch replaces the one before it without a rewrite of the file.
    const held = new Map<string, Watch>()
    for (const line of raw.split('\n').filter(Boolean)) {
      const watch = JSON.parse(line) as Watch
      held.set(watch.id, watch)
    }
    return [...held.values()]
  }

  async saveWatch(watch: Watch) {
    const dir = await this.dir('watches')
    const file = path.join(dir, 'watches.jsonl')
    const existing = await readFile(file, 'utf8').catch(() => '')
    await writeFile(file, `${existing}${JSON.stringify(watch)}\n`)
  }

  async getWatch(id: string) {
    return (await this.watches()).find((watch) => watch.id === id) ?? null
  }

  async listWatchesDue(limit: number) {
    return (await this.watches())
      .filter((watch) => watch.confirmedAt !== null && watch.stoppedAt === null)
      .sort((a, b) => (a.checkedAt ?? '').localeCompare(b.checkedAt ?? ''))
      .slice(0, limit)
  }

  async listWatchesForEmail(email: string) {
    return (await this.watches()).filter((watch) => watch.email === email.toLowerCase())
  }
}

let cached: Store | null = null

/**
 * Filesystem locally so the app runs with no external accounts; Mongo wherever
 * MONGODB_URI exists, because Heroku dynos lose the disk on every restart.
 */

/**
 * Reports the database refused, kept on the dyno so the visitor still gets their page.
 *
 * The scan is finished by the time a write fails. Throwing it away and telling somebody who waited
 * half a minute to email us was the worst thing the site did while the cluster was full: we had
 * their scorecard in hand. This is deliberately not a cache and not a queue. It holds the last few
 * unsaved reports for as long as this dyno lives, the page says the link is temporary, and a
 * deploy clears it.
 */
const HELD_LIMIT = 50
const held = new Map<string, Report>()

export function holdUnsaved(report: Report): void {
  held.set(report.id, report)
  // Insertion order, so the oldest goes first and one busy afternoon cannot grow this without end.
  while (held.size > HELD_LIMIT) held.delete(held.keys().next().value as string)
}

export function heldReport(id: string): Report | null {
  return held.get(id) ?? null
}

/** Whether this id only exists in memory, which is what the page warns about. */
export function isHeldOnly(id: string): boolean {
  return held.has(id)
}

export function getStore(): Store {
  cached ??= process.env.MONGODB_URI ? new MongoStore() : new FileStore()
  return cached
}

/**
 * Minute precision plus an upsert meant two scans of one domain in the same minute
 * overwrote each other, which the console can do trivially since it skips the reuse cache.
 * Seconds and four random characters make the link a name, not a slot.
 */
export function reportId(domain: string, scannedAt: string): string {
  const stamp = scannedAt.replace(/[-:TZ.]/g, '').slice(0, 14)
  const suffix = randomBytes(2).toString('hex')
  return `${domain.replace(/\./g, '-')}-${stamp}-${suffix}`
}
