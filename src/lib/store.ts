import { randomBytes } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { MongoStore } from './store-mongo'
import type { ScanFindings } from './scan'
import type { Scorecard } from './score'

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
  /** One counter per day and path. Upserted, so a page render costs one small write. */
  recordVisit(visit: { day: string; path: string }): Promise<void>
  listVisits(days: number): Promise<{ day: string; path: string; count: number }[]>
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
    await writeFile(path.join(dir, `${report.id}.json`), JSON.stringify(report, null, 2))
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
}

let cached: Store | null = null

/**
 * Filesystem locally so the app runs with no external accounts; Mongo wherever
 * MONGODB_URI exists, because Heroku dynos lose the disk on every restart.
 */
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
