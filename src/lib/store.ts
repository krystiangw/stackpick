import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { ScanFindings } from './scan'
import type { Scorecard } from './score'

export type Report = {
  id: string
  domain: string
  scannedAt: string
  findings: ScanFindings
  scorecard: Scorecard
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
  saveLead(lead: Lead): Promise<void>
  listLeads(limit: number): Promise<Lead[]>
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
    const all = await this.listReports(500)
    return all.find((report) => report.domain === domain) ?? null
  }

  async saveLead(lead: Lead) {
    const dir = await this.dir('leads')
    const file = path.join(dir, 'leads.jsonl')
    const existing = await readFile(file, 'utf8').catch(() => '')
    await writeFile(file, `${existing}${JSON.stringify(lead)}\n`)
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

export function getStore(): Store {
  cached ??= new FileStore()
  return cached
}

export function reportId(domain: string, scannedAt: string): string {
  const stamp = scannedAt.replace(/[-:TZ.]/g, '').slice(0, 12)
  return `${domain.replace(/\./g, '-')}-${stamp}`
}
