import { MongoClient, type Collection, type Db } from 'mongodb'
import { REGISTRY_TTL_MS, installSharedCache, type SharedCache } from './scan/http'
import type { Fetched } from './scan/http'
import type { Watch } from './watch'
import { forStorage, type Lead, type Report, type Store } from './store'

type ReportDoc = Report & { _id: string }
/** One npm registry answer, kept so a deploy does not send us back to asking npm for all of it. */
type CachedAnswer = { _id: string; at: Date; answer: Fetched }

let clientPromise: Promise<MongoClient> | null = null
let indexesReady: Promise<void> | null = null

function connect(): Promise<MongoClient> {
  clientPromise ??= new MongoClient(process.env.MONGODB_URI as string, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 8000,
  }).connect()
  return clientPromise
}

async function db(): Promise<Db> {
  const client = await connect()
  return client.db(process.env.MONGODB_DB ?? 'stackpick')
}

async function collections(): Promise<{
  reports: Collection<ReportDoc>
  leads: Collection<Lead>
  answers: Collection<CachedAnswer>
  visits: Collection<{ day: string; path: string; count: number }>
  watches: Collection<Watch>
}> {
  const database = await db()
  const reports = database.collection<ReportDoc>('reports')
  const leads = database.collection<Lead>('leads')
  const answers = database.collection<CachedAnswer>('registryAnswers')
  const visits = database.collection<{ day: string; path: string; count: number }>('visits')
  const watches = database.collection<Watch>('watches')

  indexesReady ??= Promise.all([
    reports.createIndex({ domain: 1, scannedAt: -1 }),
    reports.createIndex({ scannedAt: -1 }),
    leads.createIndex({ createdAt: -1 }),
    visits.createIndex({ day: -1, path: 1 }, { unique: true }),
    watches.createIndex({ id: 1 }, { unique: true }),
    // One person watching one domain once. Two rows would mail them the same change twice.
    watches.createIndex({ email: 1, domain: 1 }, { unique: true }),
    watches.createIndex({ checkedAt: 1 }),
    // Mongo expires them, so nothing here has to remember to.
    answers.createIndex({ at: 1 }, { expireAfterSeconds: REGISTRY_TTL_MS / 1000 }),
  ]).then(() => undefined)
  await indexesReady

  return { reports, leads, answers, visits, watches }
}

const registryAnswers: SharedCache = {
  async get(key) {
    const { answers } = await collections()
    const held = await answers.findOne({ _id: key })
    return held ? held.answer : null
  },
  async set(key, answer) {
    const { answers } = await collections()
    await answers.updateOne({ _id: key }, { $set: { at: new Date(), answer } }, { upsert: true })
  },
}

const withoutId = { projection: { _id: 0 } } as const

export class MongoStore implements Store {
  constructor() {
    // The scanner cannot import the database, so the database hands itself over.
    installSharedCache(registryAnswers)
  }

  async saveReport(report: Report) {
    const { reports } = await collections()
    await reports.updateOne({ _id: report.id }, { $set: forStorage(report) }, { upsert: true })
  }

  async getReport(id: string) {
    const { reports } = await collections()
    return (await reports.findOne({ _id: id }, withoutId)) as Report | null
  }

  async latestForDomain(domain: string) {
    const { reports } = await collections()
    return (await reports.findOne({ domain }, { ...withoutId, sort: { scannedAt: -1 } })) as Report | null
  }

  async listReports(limit: number) {
    const { reports } = await collections()
    return (await reports.find({}, withoutId).sort({ scannedAt: -1 }).limit(limit).toArray()) as Report[]
  }

  /**
   * One indexed lookup per domain instead of a $group over the whole collection. The aggregation
   * took the site down on 2026-08-11: after ten reseeds in a day the reports outgrew the 100 MB
   * $group limit, every page answered 500, and `allowDiskUse: true` changed nothing because the
   * cluster does not permit spilling. A report carries the page bodies it read, so this collection
   * grows by tens of megabytes per reseed and the aggregation was always going to lose that race.
   *
   * `distinct` returns a few hundred short strings and each lookup rides the (domain, scannedAt)
   * sort, so nothing here holds more than one report in memory at a time.
   */
  async latestPerDomain(limit: number, seededOnly = false) {
    const { reports } = await collections()
    const filter = seededOnly ? { seeded: true } : {}
    const domains = (await reports.distinct('domain', filter)) as string[]
    const found: Report[] = []
    const queue = [...domains]
    await Promise.all(
      Array.from({ length: 8 }, async () => {
        while (queue.length > 0) {
          const domain = queue.shift() as string
          const latest = (await reports.findOne(
            { ...filter, domain },
            { ...withoutId, sort: { scannedAt: -1 } },
          )) as Report | null
          if (latest) found.push(latest)
        }
      }),
    )
    return found.sort((a, b) => b.scannedAt.localeCompare(a.scannedAt)).slice(0, limit)
  }

  async saveLead(lead: Lead) {
    const { leads } = await collections()
    await leads.insertOne(lead)
  }

  async saveWatch(watch: Watch) {
    const { watches } = await collections()
    await watches.replaceOne({ id: watch.id }, watch, { upsert: true })
  }

  async getWatch(id: string) {
    const { watches } = await collections()
    return (await watches.findOne({ id }, withoutId)) as Watch | null
  }

  async listWatchesDue(limit: number) {
    const { watches } = await collections()
    return (await watches
      .find({ confirmedAt: { $ne: null }, stoppedAt: null }, withoutId)
      // Never checked first, then longest since. A new watch hearing from us the same day it is
      // made is the whole reason somebody believes the next email will arrive too.
      .sort({ checkedAt: 1 })
      .limit(limit)
      .toArray()) as Watch[]
  }

  async listWatchesForEmail(email: string) {
    const { watches } = await collections()
    return (await watches.find({ email: email.toLowerCase() }, withoutId).toArray()) as Watch[]
  }

  async recordVisit(visit: { day: string; path: string }) {
    const { visits } = await collections()
    await visits
      .updateOne({ day: visit.day, path: visit.path }, { $inc: { count: 1 } }, { upsert: true })
  }

  async listVisits(days: number) {
    const { visits } = await collections()
    const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
    return (await visits
      .find({ day: { $gte: since } }, withoutId)
      .sort({ day: -1, count: -1 })
      .toArray()) as { day: string; path: string; count: number }[]
  }

  async listLeads(limit: number) {
    const { leads } = await collections()
    return (await leads.find({}, withoutId).sort({ createdAt: -1 }).limit(limit).toArray()) as Lead[]
  }
}
