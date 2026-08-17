import { MongoClient, type Collection, type Db } from 'mongodb'
import { REGISTRY_TTL_MS, installSharedCache, type SharedCache } from './scan/http'
import { installMcpRegistryMirror, type McpRegistryMirror } from './scan/funnel'
import type { Fetched } from './scan/http'
import type { Watch } from './watch'
import { forStorage, type Lead, type Report, type Store } from './store'

type ReportDoc = Report & { _id: string }
/**
 * One host from the MCP registry, written by the daily mirror job. `under` holds the host and every
 * domain it sits below, so a scan of medusajs.com finds docs.medusajs.com with one indexed read.
 */
type McpRegistryDoc = { _id: string; urls: string[]; under: string[]; fetchedAt: string }
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

/**
 * Billed size of every database on the cluster, largest question first: how much room is left.
 *
 * `dataSize` plus `indexSize` is what Atlas Flex charges for. `storageSize` is disk WiredTiger has
 * not returned and is deliberately not counted, because reading it as the quota is the mistake
 * this function exists to stop repeating.
 */
export async function clusterUsage(): Promise<{ name: string; mb: number }[]> {
  const client = await connect()
  const { databases } = await client.db().admin().listDatabases()
  const sizes = await Promise.all(
    databases.map(async ({ name }) => {
      try {
        const stats = (await client.db(name).stats()) as { dataSize: number; indexSize: number }
        return { name, mb: (stats.dataSize + stats.indexSize) / 1024 / 1024 }
      } catch (error) {
        // `local` and `admin` refuse stats to an Atlas application user, and neither is ours.
        // Anything else has to surface: swallowing a timeout on our own database reports 0 MB,
        // which reads as headroom and silences the alarm in exactly the conditions that need it.
        if (name === 'local' || name === 'admin') return { name, mb: 0 }
        throw new Error(`db.stats() failed for ${name}: ${(error as Error).message}`)
      }
    }),
  )
  return sizes
}

/** Moves the TTL when the constant moves, because createIndex will not and collMod is denied. */
async function retuneRegistryExpiry(answers: Collection<CachedAnswer>): Promise<void> {
  const wanted = REGISTRY_TTL_MS / 1000
  // On a fresh database the collection does not exist and indexes() raises NamespaceNotFound.
  // There is nothing to retune then: the createIndex that follows creates it with the right value.
  const held = await answers.indexes().catch(() => [])
  const existing = held.find((index) => index.name === 'at_1') as { expireAfterSeconds?: number } | undefined
  if (!existing || existing.expireAfterSeconds === wanted) return
  await answers.dropIndex('at_1')
  await answers.createIndex({ at: 1 }, { expireAfterSeconds: wanted })
}

async function collections(): Promise<{
  reports: Collection<ReportDoc>
  leads: Collection<Lead>
  answers: Collection<CachedAnswer>
  visits: Collection<{ day: string; path: string; count: number }>
  watches: Collection<Watch>
  mcpRegistry: Collection<McpRegistryDoc>
}> {
  const database = await db()
  const reports = database.collection<ReportDoc>('reports')
  const leads = database.collection<Lead>('leads')
  const answers = database.collection<CachedAnswer>('registryAnswers')
  const visits = database.collection<{ day: string; path: string; count: number }>('visits')
  const watches = database.collection<Watch>('watches')
  const mcpRegistry = database.collection<McpRegistryDoc>('mcpRegistry')

  // Before the batch, not after it. createIndex does not change the expiry of an index that already
  // exists: it raises IndexOptionsConflict, which rejects the Promise.all below and skips every
  // .then hanging off it, straight into the catch that swallows index errors on purpose. Put after
  // the batch, this ran only when it had nothing to do, and the first version of it passed review
  // solely because the index had been rebuilt by hand before the deploy.
  indexesReady ??= retuneRegistryExpiry(answers)
    .then(() =>
      Promise.all([
    reports.createIndex({ domain: 1, scannedAt: -1 }),
    reports.createIndex({ scannedAt: -1 }),
    leads.createIndex({ createdAt: -1 }),
    visits.createIndex({ day: -1, path: 1 }, { unique: true }),
    watches.createIndex({ id: 1 }, { unique: true }),
    // One person watching one domain once. Two rows would mail them the same change twice.
    watches.createIndex({ email: 1, domain: 1 }, { unique: true }),
    watches.createIndex({ checkedAt: 1 }),
    mcpRegistry.createIndex({ under: 1 }),
    // Mongo expires them, so nothing here has to remember to.
        answers.createIndex({ at: 1 }, { expireAfterSeconds: REGISTRY_TTL_MS / 1000 }),
      ]),
    )
    .then(() => undefined)
    // Creating an index is a write, and awaiting it made every read depend on the cluster
    // accepting writes. On 2026-08-13 the cluster hit its quota and refused them, so reading one
    // report failed, the health check failed, prerendering /methodology failed, and the build
    // itself would not compile: a full outage caused by a startup nicety for indexes that have
    // existed for months. They are created once per process and are idempotent, so a failure
    // here is worth a line in the log and nothing more.
    .catch((error) => {
      console.error('indexes not created, continuing without them', (error as Error).message)
    })
  await indexesReady

  return { reports, leads, answers, visits, watches, mcpRegistry }
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

/**
 * How stale the mirror may be before its silence stops being evidence. Seven days, because the
 * job that fills it runs daily and a registry entry is a claim about a server that then has to
 * pass the same handshake as an address we guessed: a week-old listing cannot credit anybody with
 * a server that is not running, and a mirror nobody refilled must not accuse anybody either.
 */
const MIRROR_TTL_MS = 7 * 24 * 60 * 60 * 1000

const mcpMirror: McpRegistryMirror = {
  async endpointsFor(domain) {
    const { mcpRegistry } = await collections()
    const hosts = await mcpRegistry.find({ under: domain }).limit(20).toArray()
    if (hosts.length === 0) {
      // Nothing for this vendor is only an answer when the mirror itself is there and current.
      const any = await mcpRegistry.findOne({}, { sort: { fetchedAt: -1 } })
      if (!any || Date.now() - Date.parse(any.fetchedAt) > MIRROR_TTL_MS) return null
      return []
    }
    const newest = hosts.reduce((latest, host) => (host.fetchedAt > latest ? host.fetchedAt : latest), hosts[0].fetchedAt)
    if (Date.now() - Date.parse(newest) > MIRROR_TTL_MS) return null
    return [...new Set(hosts.flatMap((host) => host.urls))]
  },
}

/** Replaces the whole mirror in one pass: what the job did not send this time is gone. */
export async function replaceMcpRegistryMirror(
  entries: { host: string; urls: string[] }[],
  fetchedAt: string,
): Promise<{ hosts: number; removed: number }> {
  const { mcpRegistry } = await collections()
  if (entries.length > 0) {
    await mcpRegistry.bulkWrite(
      entries.map((entry) => ({
        replaceOne: {
          filter: { _id: entry.host },
          replacement: { _id: entry.host, urls: entry.urls, under: domainsAbove(entry.host), fetchedAt },
          upsert: true,
        },
      })),
      { ordered: false },
    )
  }
  const { deletedCount } = await mcpRegistry.deleteMany({ fetchedAt: { $ne: fetchedAt } })
  return { hosts: entries.length, removed: deletedCount ?? 0 }
}

/** mcp.eu.phrase.com -> itself, eu.phrase.com, phrase.com. The last one is what a scan asks for. */
function domainsAbove(host: string): string[] {
  const labels = host.split('.')
  const found: string[] = []
  for (let start = 0; start <= labels.length - 2; start += 1) found.push(labels.slice(start).join('.'))
  return found
}

const withoutId = { projection: { _id: 0 } } as const

export class MongoStore implements Store {
  constructor() {
    // The scanner cannot import the database, so the database hands itself over.
    installSharedCache(registryAnswers)
    installMcpRegistryMirror(mcpMirror)
  }

  async writable(): Promise<true | string> {
    const database = await db()
    try {
      // One document, replaced in place every time, so the probe never grows the collection it
      // is testing. An upsert is the cheapest thing that fails the same way a real write fails.
      await database
        .collection('health')
        .updateOne({ _id: 'writable' as never }, { $set: { at: new Date().toISOString() } }, { upsert: true })
      return true
    } catch (error) {
      return (error as Error).message
    }
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
