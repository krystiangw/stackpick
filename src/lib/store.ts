import { randomBytes } from 'node:crypto'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { MongoStore } from './store-mongo'
import type { ScanFindings } from './scan'
import type { Scorecard } from './score'
import type { Watch } from './watch'
import type { Delivery } from './delivery'
import { stayOutAfter, type StayOut } from './stayout'

export type Report = {
  id: string
  domain: string
  scannedAt: string
  findings: ScanFindings
  scorecard: Scorecard
  /** Run by us to build the published corpus, as opposed to run by a visitor on their own site. */
  seeded?: boolean
}

/** The payment reference a stored line carries, or null when the line is not a payment or not JSON. */
function paymentRefIn(line: string): string | null {
  try {
    return (JSON.parse(line) as { paymentRef?: string }).paymentRef ?? null
  } catch {
    return null
  }
}

export type Lead = {
  email: string
  /**
   * Set only on leads created by a payment event. Unique in Mongo, which is what makes a retried
   * webhook a no-op rather than a second copy of the same order: two deliveries can both find
   * nothing and both insert, so the check that matters is the one the database performs.
   */
  paymentRef?: string
  domain: string
  reportId: string
  createdAt: string
  source: string
}

export interface Store {
  saveReport(report: Report): Promise<void>
  getReport(id: string): Promise<Report | null>
  /**
   * `seededOnly` is what a public vendor page asks for. A stranger's scan lands in the same
   * collection, and /v/<domain> showed whichever scan was newest: an anonymous request at a bad
   * moment rewrote the page we publish about a company, while the rankings and the corpus kept
   * the seeded row. The two then disagreed in public about the same vendor.
   */
  latestForDomain(domain: string, seededOnly?: boolean): Promise<Report | null>
  listReports(limit: number): Promise<Report[]>
  /**
   * Newest report per domain. Taking the newest N reports and deduplicating afterwards
   * silently drops a domain from its own ranking once the corpus outgrows the window.
   */
  latestPerDomain(limit: number, seededOnly?: boolean): Promise<Report[]>
  /**
   * Idempotent whenever `paymentRef` is set: a payment provider retries a webhook whose response it
   * did not receive, so one purchase can arrive three times, and a work record that appears three
   * times is three people producing the same report.
   */
  saveLead(lead: Lead): Promise<void>
  /**
   * Whether a payment fact with this reference was already written. Used to make a cancellation
   * durable: webhook delivery is not ordered, so a transaction that was in flight when somebody
   * cancelled can arrive afterwards and would otherwise turn the plan paid again.
   */
  hasPaymentRef(paymentRef: string): Promise<boolean>
  listLeads(limit: number): Promise<Lead[]>
  /**
   * A produced report, kept so a buyer gets a link rather than an attachment. Written once by the
   * generator and never edited: a delivered document that changes under the person who paid for it
   * is worse than no link at all.
   */
  saveDelivery(delivery: Delivery): Promise<void>
  getDelivery(id: string): Promise<Delivery | null>
  /**
   * A vendor that asked us to stay out. Written by the automated passes and cleared by the first
   * pass that finds the request gone, so the published annotation is a fact about the last time we
   * looked rather than about the day somebody typed it.
   */
  recordStayOut(domain: string): Promise<void>
  clearStayOut(domain: string): Promise<void>
  stayOutFor(domain: string): Promise<StayOut | null>
  stayOuts(): Promise<StayOut[]>
  saveWatch(watch: Watch): Promise<void>
  getWatch(id: string): Promise<Watch | null>
  /** Every watch that is confirmed and not stopped, oldest check first. */
  listWatchesDue(limit: number): Promise<Watch[]>
  listWatchesForEmail(email: string): Promise<Watch[]>
  /**
   * Who holds a brand, across every watch and not only the ones due to be served. A stopped watch
   * comes back the moment somebody pays, so a brand free only while they are away is not free.
   */
  watchWithBrand(brand: string): Promise<Watch | null>
  /** Every watch on one domain, so the report can be told what the mail already knows about them. */
  watchesForDomain(domain: string): Promise<Watch[]>
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

  async latestForDomain(domain: string, seededOnly = false) {
    const all = await this.listReports(2000)
    return all.find((report) => report.domain === domain && (!seededOnly || report.seeded === true)) ?? null
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
    // Mongo has a unique index for this; a file has to look. Only for payments, because free-scan
    // leads legitimately repeat and their reportId is shared by everyone who asked for that scan.
    if (lead.paymentRef && existing.split('\n').some((line) => paymentRefIn(line) === lead.paymentRef)) return
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

  async hasPaymentRef(paymentRef: string) {
    const dir = await this.dir('leads')
    const raw = await readFile(path.join(dir, 'leads.jsonl'), 'utf8').catch(() => '')
    return raw.split('\n').some((line) => paymentRefIn(line) === paymentRef)
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

  async saveDelivery(delivery: Delivery) {
    const dir = await this.dir('deliveries')
    await writeFile(path.join(dir, `${delivery.id}.json`), JSON.stringify(delivery, null, 2))
  }

  async getDelivery(id: string) {
    try {
      const dir = await this.dir('deliveries')
      return JSON.parse(await readFile(path.join(dir, `${id}.json`), 'utf8')) as Delivery
    } catch {
      return null
    }
  }

  async recordStayOut(domain: string) {
    const dir = await this.dir('stayouts')
    const file = path.join(dir, `${domain}.json`)
    const existing = await readFile(file, 'utf8')
      .then((raw) => JSON.parse(raw) as StayOut)
      .catch(() => null)
    await writeFile(file, JSON.stringify(stayOutAfter(existing, domain, new Date().toISOString()), null, 2))
  }

  async clearStayOut(domain: string) {
    const dir = await this.dir('stayouts')
    await rm(path.join(dir, `${domain}.json`), { force: true })
  }

  async stayOutFor(domain: string) {
    const dir = await this.dir('stayouts')
    return readFile(path.join(dir, `${domain}.json`), 'utf8')
      .then((raw) => JSON.parse(raw) as StayOut)
      .catch(() => null)
  }

  async stayOuts() {
    const dir = await this.dir('stayouts')
    const names = await readdir(dir).catch(() => [] as string[])
    const all = await Promise.all(
      names
        .filter((name) => name.endsWith('.json'))
        .map((name) => readFile(path.join(dir, name), 'utf8').then((raw) => JSON.parse(raw) as StayOut)),
    )
    return all
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

  async watchWithBrand(brand: string) {
    const wanted = brand.toLowerCase()
    return (await this.watches()).find((watch) => (watch.brand ?? '').toLowerCase() === wanted) ?? null
  }

  async watchesForDomain(domain: string) {
    return (await this.watches()).filter((watch) => watch.domain === domain)
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
/**
 * On globalThis, not in a module variable, and that difference is the whole thing working. Next
 * bundles route handlers and pages separately, so each gets its own instance of this module and
 * its own Map: the scan stored the report in one and /r/<id> looked in the other, which is a 404
 * that no amount of reading the code explains. Measured on production, then confirmed against a
 * dyno that had not just restarted, because a deploy landed in the same minute as the first test
 * and was the other candidate.
 */
const held: Map<string, Report> = ((globalThis as { __heldReports?: Map<string, Report> }).__heldReports ??= new Map())

export function holdUnsaved(report: Report): void {
  // The same shape the database would have taken, not the raw one. forStorage drops the probe
  // bodies, which are 180 kB of the 185 kB a report weighs and the reason the cluster filled up in
  // the first place. Holding fifty raw reports would have parked nine megabytes on a dyno to serve
  // pages that never read that field.
  held.set(report.id, forStorage(report))
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
/**
 * The address of a scan somebody ran themselves is the only thing protecting it, so it has to be
 * worth that job. Two random bytes were not: the id carries the domain and the second it ran, so
 * anyone who knew roughly when a domain was scanned had 65,536 addresses to walk. Eight bytes make
 * that 2^64 and the claim on `/privacy` true. Codex's, and old ids keep working because they are
 * stored rather than derived.
 */
/**
 * An address from before the random suffix existed, which is the domain and the minute and nothing
 * else. Twenty-four of them were made on 7 August 2026, all of them scans a visitor ran about
 * somebody else's domain, and every one can be found by walking the minutes of that day.
 *
 * `/privacy` says a scan you run is not posted anywhere and that its address is the only thing
 * protecting it. For these that was not true, so `/r` stops serving them: nothing is deleted, the
 * rows stay where they are, and one line brings them back if that turns out to be the wrong call.
 */
export const addressProtectsNothing = (id: string) => /-\d{12,14}$/.test(id)

export function reportId(domain: string, scannedAt: string): string {
  const stamp = scannedAt.replace(/[-:TZ.]/g, '').slice(0, 14)
  const suffix = randomBytes(8).toString('hex')
  return `${domain.replace(/\./g, '-')}-${stamp}-${suffix}`
}
