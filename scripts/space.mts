import { MongoClient } from 'mongodb'

/**
 * How much of the Atlas quota we are actually using.
 *
 * Atlas Flex bills `dataSize`, the logical size of the documents. `storageSize` is what WiredTiger
 * has allocated on disk, and the two diverge by more than an order of magnitude around a large
 * delete, because the space freed by dropping 20 000 documents is not returned until a compaction
 * that Flex never runs.
 *
 * Reading the wrong column has now cost us twice, once in each direction: `storageSize` was read as
 * the quota and under-diagnosed a full cluster, then a `storageSize` column left over after a prune
 * was read as a 1457 MB regrowth that did not happen. So the billed number comes first, alone, and
 * the disk figure is labelled as what it is.
 *
 *   MONGODB_URI=$(heroku config:get MONGODB_URI -a stackpick) npx tsx scripts/space.mts
 */
const FLEX_QUOTA_MB = 5120

const client = new MongoClient(process.env.MONGODB_URI!)
await client.connect()
const admin = client.db().admin()
const { databases } = await admin.listDatabases()
const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1).padStart(9) + ' MB'

let billed = 0
for (const { name } of databases) {
  const db = client.db(name)
  let stats: { dataSize: number; storageSize: number; indexSize: number }
  try {
    stats = (await db.stats()) as never
  } catch (error) {
    console.log(name, String(error).slice(0, 80))
    continue
  }
  billed += stats.dataSize + stats.indexSize
  console.log(`\n${name}: ${mb(stats.dataSize)} LICZONE DO KWOTY (+ ${mb(stats.indexSize)} indeksy)`)
  console.log(`${' '.repeat(name.length + 1)} ${mb(stats.storageSize)} zajete na dysku, nie liczone`)
  for (const { name: coll } of await db.listCollections().toArray()) {
    try {
      const c = (await db.command({ collStats: coll })) as { count: number; size: number; storageSize: number }
      console.log(`   ${coll.padEnd(28)} ${String(c.count).padStart(8)} dok ${mb(c.size)} danych (${mb(c.storageSize)} na dysku)`)
    } catch {
      /* views have no collStats */
    }
  }
}

const percent = ((billed / 1024 / 1024 / FLEX_QUOTA_MB) * 100).toFixed(1)
console.log(`\nRAZEM LICZONE DO KWOTY: ${mb(billed)} z ${FLEX_QUOTA_MB} MB (${percent} procent)`)
await client.close()
