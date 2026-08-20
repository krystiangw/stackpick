import { MongoClient } from 'mongodb'
import { CURATED_DOMAINS } from '../src/lib/categories'
import { ourDatabaseName } from '../src/lib/store-mongo'

/**
 * How much of the cluster the superseded scans are holding, and optionally give it back.
 *
 * Atlas Flex bills the logical size of the documents, not the compressed storage. Both numbers are
 * printed side by side because reading the wrong one is how this was misdiagnosed for a day: the
 * collection is 752 MB on disk and 2310 MB to Atlas, and only the second one is the quota.
 *
 * Reads by default and says what it would remove:
 *   MONGODB_URI=$(heroku config:get MONGODB_URI -a stackpick) npx tsx scripts/prune-reports.mts
 *
 * Deletes only when told to, in batches, printing the freed size as it goes:
 *   ... npx tsx scripts/prune-reports.mts --delete
 */
const DELETE = process.argv.includes('--delete')
const BATCH = 500

const client = new MongoClient(process.env.MONGODB_URI!)
await client.connect()
// The same selection the app makes. client.db() takes the default out of the URI, which on this
// cluster is a different project's database entirely: the first dry run counted 0 reports there.
const database = client.db(ourDatabaseName())
console.log(`baza: ${database.databaseName}`)
const reports = database.collection<{ _id: string; domain: string }>('reports')

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(0)} MB`

/**
 * Three rows are never deleted: the newest scan of any domain, because that is what /v/<domain>
 * and the corpus serve; every scan of a domain nobody curated, because that is a visitor who ran
 * it themselves and holds a /r/<id> link to it; and any report an active watch is comparing
 * against.
 *
 * The third was added after the fact. The first real run of this script, on 2026-08-14, deleted
 * the baseline of a live watch on stripe.com. Nothing bad reached anybody: a missing baseline
 * means no email rather than a wrong one, and the next rescan sets a new one. But the watcher
 * silently lost the comparison that cycle, and this script exists to be run again.
 */
const keep = new Set<string>()
const watches = client.db(ourDatabaseName()).collection<{ lastReportId?: string | null }>('watches')
for await (const watch of watches.find({}, { projection: { lastReportId: 1 } })) {
  if (watch.lastReportId) keep.add(watch.lastReportId)
}
const watched = keep.size
const domains = await reports.distinct('domain')
let corpusRows = 0
for (const domain of domains) {
  const newest = await reports.findOne({ domain }, { sort: { scannedAt: -1 }, projection: { _id: 1 } })
  if (newest) keep.add(newest._id)
  // The newest row and the published row are not the same row. The corpus reads the newest
  // *seeded* scan (published.ts -> latestPerDomain(1000, true)), so one visitor scanning a curated
  // domain makes their own unseeded row the newest and leaves the corpus row superseded and
  // deletable. Deleting it drops that vendor out of corpus.json, the rankings and every counter
  // on /findings until the next reseed. Zero domains were exposed when this was found, because a
  // reseed had just finished; the exposure grows with every hour after one.
  const newestSeeded = await reports.findOne(
    { domain, seeded: true },
    { sort: { scannedAt: -1 }, projection: { _id: 1 } },
  )
  if (newestSeeded) {
    if (!keep.has(newestSeeded._id)) corpusRows += 1
    keep.add(newestSeeded._id)
  }
}

let superseded = 0
let logicalBytes = 0
const doomed: string[] = []
for await (const doc of reports.find({}, { projection: { _id: 1, domain: 1 } })) {
  if (keep.has(doc._id)) continue
  if (!CURATED_DOMAINS.has(doc.domain)) continue
  superseded += 1
  doomed.push(doc._id)
}

// bsonSize is the number Atlas charges for, and the only way to total it is to ask the server.
if (doomed.length > 0) {
  const [sized] = await reports
    .aggregate([
      { $match: { _id: { $in: doomed } } },
      { $group: { _id: null, bytes: { $sum: { $bsonSize: '$$ROOT' } } } },
    ])
    .toArray()
  logicalBytes = sized?.bytes ?? 0
}

const total = await reports.countDocuments()
console.log(
  `${total} raportow, ${keep.size} zachowanych (w tym ${watched} punktow odniesienia obserwacji ` +
    `i ${corpusRows} wierszy korpusu, ktore nie sa juz najnowsze), ${total - superseded} zostaje`,
)
console.log(`${superseded} przedawnionych skanow domen z korpusu = ${mb(logicalBytes)} logicznie`)

if (!DELETE) {
  console.log('\nnic nie skasowano; --delete zeby zwolnic')
  await client.close()
  process.exit(0)
}

let removed = 0
for (let at = 0; at < doomed.length; at += BATCH) {
  const slice = doomed.slice(at, at + BATCH)
  const { deletedCount } = await reports.deleteMany({ _id: { $in: slice } })
  removed += deletedCount
  console.log(`  skasowano ${removed} z ${doomed.length}`)
}
console.log(`\nzwolnione ${mb(logicalBytes)}; Atlas potrzebuje kilku minut zeby to zobaczyc`)
await client.close()
process.exit(0)
