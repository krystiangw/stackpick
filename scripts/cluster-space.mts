/**
 * How much room is left on the cluster, and how much of it is ours.
 *
 *   MONGODB_URI=... npx tsx scripts/cluster-space.mts
 *
 * Read-only, and deliberately prints every database on the cluster rather than only ours: our data
 * lives on a Flex cluster created for another project (`equity-analyst-flex`), so "how much space do
 * we have" is a question about a neighbour we do not control. Nothing here writes anything, and
 * nothing here reads a document out of a database that is not ours - `listDatabases` returns sizes,
 * not contents.
 *
 * The number that matters is not the file size. `reports` keeps every scan as its own document
 * because `/r/<id>` are permanent links, so the file grows with rewrites and WiredTiger reuses the
 * blocks inside it. Data and file are printed apart for exactly that reason.
 */
import { MongoClient } from 'mongodb'
import { measureQuota } from '../src/lib/quota'

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('brak MONGODB_URI')
  process.exit(1)
}

const client = new MongoClient(uri)
await client.connect()
const admin = client.db().admin()
const list = await admin.listDatabases()
const ours = 'stackpick'

console.log(`klaster: ${new URL(uri.replace('mongodb+srv://', 'https://')).hostname}`)

// Sufit liczy sie z `dataSize` + indeksy, NIE z miejsca na dysku, i to jest jedyna liczba, o ktora
// chodzi. Pierwsza wersja tego skryptu porownala z sufitem `listDatabases().totalSize` i wyszlo
// 3098/5120 przy prawdziwych 2987 - a co gorsza z podzialem, ktory klamal, kto zjada klaster.
// `measureQuota` istnieje od awarii z 13 sierpnia i jest jedynym miejscem, gdzie ta liczba powstaje.
const quota = await measureQuota()
console.log(`ROZLICZANE (to jest sufit): ${quota.usedMb} MB z ${quota.quotaMb} MB (${quota.percent} %), werdykt: ${quota.verdict}`)
for (const db of quota.databases) {
  if (db.mb === 0) continue
  console.log(`  ${String(db.name).padEnd(20)} ${String(db.mb).padStart(5)} MB${db.name === ours ? '  <- nasza' : ''}`)
}

console.log('\nNA DYSKU (nie liczy sie do sufitu, ale pokazuje, ile pliku zostalo po nadpisaniach):')
for (const db of list.databases.sort((a, b) => (b.sizeOnDisk ?? 0) - (a.sizeOnDisk ?? 0))) {
  const mb = Math.round((db.sizeOnDisk ?? 0) / 1_048_576)
  if (mb === 0) continue
  console.log(`  ${String(db.name).padEnd(20)} ${String(mb).padStart(5)} MB${db.name === ours ? '  <- nasza' : ''}`)
}

const db = client.db(ours)
const stats = await db.stats()
console.log(
  `\n${ours}: dane ${Math.round(stats.dataSize / 1_048_576)} MB, indeksy ${Math.round(stats.indexSize / 1_048_576)} MB, plik ${Math.round(
    stats.storageSize / 1_048_576,
  )} MB, ${stats.objects} dokumentow w ${stats.collections} kolekcjach`,
)
for (const one of (await db.listCollections().toArray()).sort((a, b) => a.name.localeCompare(b.name))) {
  const collection = (await db.command({ collStats: one.name })) as {
    size?: number
    storageSize?: number
    count?: number
    freeStorageSize?: number
    wiredTiger?: { 'block-manager'?: Record<string, number> }
  }
  // `freeStorageSize` pierwsze, bo Flex NIE wystawia sekcji `wiredTiger` w `collStats` - czytanie
  // tylko jej dawalo rowne zero przy pliku 1457 MB i danych 108 MB, czyli liczbe, ktora sama sobie
  // przeczy. Sciezka przez block-managera zostaje dla klastra dedykowanego, gdzie ta sekcja jest.
  const reusable = collection.freeStorageSize ?? collection.wiredTiger?.['block-manager']?.['file bytes available for reuse'] ?? 0
  console.log(
    `  ${one.name.padEnd(18)} dane ${String(Math.round((collection.size ?? 0) / 1_048_576)).padStart(4)} MB, plik ${String(
      Math.round((collection.storageSize ?? 0) / 1_048_576),
    ).padStart(5)} MB, do ponownego uzycia ${String(Math.round(reusable / 1_048_576)).padStart(5)} MB, ${collection.count} dok`,
  )
}
console.log('\nPlik wiekszy od danych to nie wyciek: te bloki wracaja do uzytku przy kolejnych zapisach,')
console.log('i NIE licza sie do sufitu Flex. `compact` odzyskalby je dla dysku, nie dla limitu.')

await client.close()
process.exit(0)
