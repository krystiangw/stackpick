/**
 * Does our own OpenAPI describe our own API?
 *
 *   npx tsx scripts/audit-our-api.mts [domain] [--base https://letagentsin.com]
 *
 * `/llms.txt` tells agents the spec is "generated from the same check definitions the scanner
 * runs", which is true of the check ids and false of everything around them: the spec is written by
 * hand beside the route. On 2026-08-18 it was missing `scorecard.stages` and `check.why`, both
 * present in every response, and nothing would have said so. A generated client built from the spec
 * drops what the spec does not mention.
 *
 * It scans us by default, so the audit costs one request to a domain we own.
 */
const args = process.argv.slice(2)
const baseAt = args.indexOf('--base')
const base = baseAt === -1 ? 'https://letagentsin.com' : args[baseAt + 1]
const domain = args.find((one) => !one.startsWith('--') && one !== base) ?? 'letagentsin.com'

type Schema = { properties?: Record<string, Schema>; items?: Schema; type?: string }

const spec = (await (await fetch(`${base}/openapi.json`)).json()) as {
  paths: Record<string, Record<string, { responses: Record<string, { content?: Record<string, { schema: Schema }> }> }>>
}
const scanned = await fetch(`${base}/api/scan`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ domain }),
})
if (!scanned.ok) {
  console.error(`${domain} nie dal sie zeskanowac (${scanned.status}), wiec nie ma czego porownac`)
  process.exit(2)
}
const real = (await scanned.json()) as unknown

const described = spec.paths['/api/scan'].post.responses['200'].content?.['application/json'].schema
if (!described) {
  console.error('spec nie opisuje odpowiedzi 200 dla /api/scan')
  process.exit(1)
}

const missing: string[] = []

/**
 * Every field the API returned, against the field the spec declares in the same place. Absence in
 * the response is not reported: a spec may describe a field that only appears in some answers, and
 * `reused`, `truncation` and `unblock` are exactly that.
 */
function walk(value: unknown, schema: Schema | undefined, path: string): void {
  if (Array.isArray(value)) {
    for (const one of value) walk(one, schema?.items, `${path}[]`)
    return
  }
  if (value === null || typeof value !== 'object') return
  for (const [key, held] of Object.entries(value as Record<string, unknown>)) {
    const under = schema?.properties?.[key]
    if (!under) {
      missing.push(`${path}.${key}`)
      continue
    }
    walk(held, under, `${path}.${key}`)
  }
}

walk(real, described, 'response')

// One line per shape rather than per row: 16 checks carrying the same undocumented field are one
// thing to fix, and printing it 16 times hides whatever else is in the list.
const shapes = [...new Set(missing)]
console.log(`${domain}: porownano odpowiedz /api/scan ze specem na ${base}`)
if (shapes.length === 0) {
  console.log('spec opisuje kazde pole, ktore API zwrocilo')
  process.exit(0)
}
console.log(`${shapes.length} pol bez opisu w specu:`)
for (const shape of shapes) console.log(`  ${shape}`)
process.exit(1)
