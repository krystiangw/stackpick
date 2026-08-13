import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI!)
await client.connect()
const admin = client.db().admin()
const { databases } = await admin.listDatabases()
const mb = (n: number) => (n / 1024 / 1024).toFixed(1).padStart(9) + ' MB'

for (const { name } of databases) {
  const db = client.db(name)
  let stats: any
  try { stats = await db.stats() } catch (error) { console.log(name, String(error).slice(0, 80)); continue }
  console.log(`\n${name}: ${mb(stats.storageSize)} zajete, ${mb(stats.dataSize)} danych, ${mb(stats.indexSize)} indeksy`)
  for (const { name: coll } of await db.listCollections().toArray()) {
    try {
      const c: any = (await db.command({ collStats: coll }))
      console.log(`   ${coll.padEnd(28)} ${String(c.count).padStart(8)} dok ${mb(c.storageSize)} + ${mb(c.totalIndexSize)} idx`)
    } catch { /* views have no collStats */ }
  }
}
await client.close()
