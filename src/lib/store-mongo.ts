import { MongoClient, type Collection, type Db } from 'mongodb'
import { REGISTRY_TTL_MS, installSharedCache, type SharedCache } from './scan/http'
import { installMcpRegistryMirror, type McpRegistryMirror } from './scan/funnel'
import type { Fetched } from './scan/http'
import type { Watch } from './watch'
import type { Delivery } from './delivery'
import type { StayOut } from './stayout'
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

/**
 * The one place that decides which database is ours. It was written out by hand in three files,
 * and the quota alarm then classified our own data as a neighbouring project whenever `MONGODB_DB`
 * was set, telling the reader during an incident not to prune the only thing worth pruning.
 */
// `||`, not `??`: a config var set to an empty string is a real state on Heroku, and `??` would
// hand `client.db('')` down the line instead of falling back.
export const ourDatabaseName = (): string => process.env.MONGODB_DB || 'stackpick'

async function db(): Promise<Db> {
  const client = await connect()
  return client.db(ourDatabaseName())
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
  deliveries: Collection<Delivery>
  mcpRegistry: Collection<McpRegistryDoc>
  stayOuts: Collection<StayOut>
}> {
  const database = await db()
  const reports = database.collection<ReportDoc>('reports')
  const leads = database.collection<Lead>('leads')
  const answers = database.collection<CachedAnswer>('registryAnswers')
  const visits = database.collection<{ day: string; path: string; count: number }>('visits')
  const watches = database.collection<Watch>('watches')
  const deliveries = database.collection<Delivery>('deliveries')
  const mcpRegistry = database.collection<McpRegistryDoc>('mcpRegistry')
  const stayOuts = database.collection<StayOut>('stayOuts')

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
    // Sparse: only payment leads carry one, and free-scan leads share a report id by design.
    leads.createIndex({ paymentRef: 1 }, { unique: true, sparse: true }),
    visits.createIndex({ day: -1, path: 1 }, { unique: true }),
    watches.createIndex({ id: 1 }, { unique: true }),
    // One person watching one domain once. Two rows would mail them the same change twice.
    watches.createIndex({ email: 1, domain: 1 }, { unique: true }),
    watches.createIndex({ checkedAt: 1 }),
    mcpRegistry.createIndex({ under: 1 }),
    // One row per domain: the freeze is a fact about the domain, not a log of every pass.
    stayOuts.createIndex({ domain: 1 }, { unique: true }),
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

  return { reports, leads, answers, visits, watches, deliveries, mcpRegistry, stayOuts }
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
export const MIRROR_TTL_MS = 7 * 24 * 60 * 60 * 1000

const MIRROR_META = '_meta'

/** When the mirror was last filled, whatever kind of run filled it. */
async function mirrorSyncedAt(): Promise<string | null> {
  const { mcpRegistry } = await collections()
  const meta = (await mcpRegistry.findOne({ _id: MIRROR_META })) as unknown as { syncedAt?: string } | null
  return meta?.syncedAt ?? null
}

const mcpMirror: McpRegistryMirror = {
  async endpointsFor(domain) {
    const syncedAt = await mirrorSyncedAt()
    // A mirror nobody refilled says nothing about a vendor, which is the same fact as the registry
    // not answering and is scored as unmeasurable rather than as a vendor with no server.
    if (!syncedAt || Date.now() - Date.parse(syncedAt) > MIRROR_TTL_MS) return null
    const { mcpRegistry } = await collections()
    const hosts = await mcpRegistry.find({ under: domain }).limit(20).toArray()
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
  const { deletedCount } = await mcpRegistry.deleteMany({ _id: { $ne: MIRROR_META }, fetchedAt: { $ne: fetchedAt } } as never)
  await markMirrorSynced(fetchedAt)
  return { hosts: entries.length, removed: deletedCount ?? 0 }
}

/**
 * The daily half. A full pass over the registry is 600 pages and counting, so the job that keeps
 * the mirror current asks only for what changed since the last run and adds it. Addresses are
 * added rather than replaced, because a page of changes carries one server and not every server
 * its host runs; the weekly full pass is what removes anything that went away. A stale address
 * costs nothing: it still has to answer a JSON-RPC handshake before it credits anybody.
 */
export async function updateMcpRegistryMirror(
  entries: { host: string; urls: string[] }[],
  fetchedAt: string,
): Promise<{ hosts: number }> {
  const { mcpRegistry } = await collections()
  if (entries.length > 0) {
    await mcpRegistry.bulkWrite(
      entries.map((entry) => ({
        updateOne: {
          filter: { _id: entry.host },
          update: {
            $set: { under: domainsAbove(entry.host), fetchedAt },
            $addToSet: { urls: { $each: entry.urls } },
          },
          upsert: true,
        },
      })) as never,
      { ordered: false },
    )
  }
  await markMirrorSynced(fetchedAt)
  return { hosts: entries.length }
}

async function markMirrorSynced(syncedAt: string): Promise<void> {
  const { mcpRegistry } = await collections()
  await mcpRegistry.updateOne({ _id: MIRROR_META }, { $set: { syncedAt } } as never, { upsert: true })
}

/** What the daily job asks for before it starts: the moment it has to catch up from. */
export async function mcpRegistryMirrorState(): Promise<{ syncedAt: string | null; hosts: number }> {
  const { mcpRegistry } = await collections()
  const hosts = await mcpRegistry.countDocuments({ _id: { $ne: MIRROR_META } } as never)
  return { syncedAt: await mirrorSyncedAt(), hosts }
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

  async latestForDomain(domain: string, seededOnly = false) {
    const { reports } = await collections()
    const filter = seededOnly ? { domain, seeded: true } : { domain }
    return (await reports.findOne(filter, { ...withoutId, sort: { scannedAt: -1 } })) as Report | null
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
    try {
      await leads.insertOne(lead)
    } catch (error) {
      // 11000 is the unique index on paymentRef doing its job: the same payment arrived twice.
      if ((error as { code?: number }).code === 11000 && lead.paymentRef) return
      throw error
    }
  }

  async saveDelivery(delivery: Delivery) {
    const { deliveries } = await collections()
    await deliveries.replaceOne({ id: delivery.id }, delivery, { upsert: true })
  }

  async getDelivery(id: string) {
    const { deliveries } = await collections()
    return (await deliveries.findOne({ id }, withoutId)) as Delivery | null
  }

  async recordStayOut(domain: string) {
    const { stayOuts } = await collections()
    // The same rule `stayOutAfter` states for the file store, expressed as one atomic update
    // because two writers really do meet here: the reseed and the monitoring cron can observe the
    // same domain at once. Read-then-replace let the later read win with the older timestamp, and
    // on a first observation two upserts raced the unique index into a duplicate-key error.
    // One clock reading, not two: called twice, the first insert wrote a `since` a few
    // milliseconds after the `lastSeenAt` it is supposed to precede, and both dates are printed.
    const now = new Date().toISOString()
    await stayOuts.updateOne(
      { domain },
      { $set: { lastSeenAt: now }, $setOnInsert: { domain, since: now } },
      { upsert: true },
    )
  }

  async clearStayOut(domain: string) {
    const { stayOuts } = await collections()
    await stayOuts.deleteOne({ domain })
  }

  async stayOutFor(domain: string) {
    const { stayOuts } = await collections()
    return (await stayOuts.findOne({ domain }, withoutId)) as StayOut | null
  }

  async stayOuts() {
    const { stayOuts } = await collections()
    return (await stayOuts.find({}, withoutId).toArray()) as StayOut[]
  }

  async saveWatch(watch: Watch) {
    const { watches } = await collections()
    await watches.replaceOne({ id: watch.id }, watch, { upsert: true })
  }

  async getWatch(id: string) {
    const { watches } = await collections()
    return (await watches.findOne({ id }, withoutId)) as Watch | null
  }

  async watchesForDomain(domain: string) {
    const { watches } = await collections()
    return (await watches.find({ domain }, withoutId).toArray()) as unknown as Watch[]
  }

  async watchWithBrand(brand: string) {
    const { watches } = await collections()
    // Case-insensitive by regex rather than by reading every watch: two customers who both write
    // their name differently are still one name to the matcher.
    const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return (await watches.findOne({ brand: { $regex: `^${escaped}$`, $options: 'i' } }, withoutId)) as Watch | null
  }

  async listWatchesDue(limit: number) {
    const { watches } = await collections()
    const nowIso = new Date().toISOString()
    const active = { confirmedAt: { $ne: null }, stoppedAt: null }
    // Dwa zapytania, a nie jedno na calej kolekcji posortowane w pamieci: obserwacja czekajaca na
    // POTWIERDZENIE ruchu ma swiezy `checkedAt`, wiec w zwyklym sortowaniu wypadnie na sam koniec i
    // przy dosc dlugiej kolejce nie zmiescilaby sie w limicie. Baza sortuje i tnie, jak przedtem.
    const rechecks = (await watches
      .find({ ...active, recheckAt: { $ne: null, $lte: nowIso } }, withoutId)
      .sort({ recheckAt: 1 })
      .limit(limit)
      .toArray()) as Watch[]
    const ordinary = (await watches
      .find({ ...active }, withoutId)
      // Never checked first, then longest since. A new watch hearing from us the same day it is
      // made is the whole reason somebody believes the next email will arrive too.
      .sort({ checkedAt: 1 })
      .limit(limit)
      .toArray()) as Watch[]
    const seen = new Set(rechecks.map((one) => one.id))
    return [...rechecks, ...ordinary.filter((one) => !seen.has(one.id))].slice(0, limit)
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

  async hasPaymentRef(paymentRef: string) {
    const { leads } = await collections()
    return (await leads.countDocuments({ paymentRef }, { limit: 1 })) > 0
  }

  async listLeads(limit: number) {
    const { leads } = await collections()
    return (await leads.find({}, withoutId).sort({ createdAt: -1 }).limit(limit).toArray()) as Lead[]
  }
}
