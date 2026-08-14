/**
 * Fifteenth adversarial pass: 48 rows say a vendor publishes no machine-readable API description.
 *
 * That check is the least verified of the big accusers and the cheapest to refute, because a
 * specification either answers at an address or it does not. The scanner guesses five paths on the
 * site host only, so the question this asks is narrower than the verdict: does a spec sit
 * somewhere obvious that we never looked, the way statsig.com's MCP server sat one path off the
 * list on 2026-08-14.
 *
 * Reads domains on argv. --control expects hits and reports misses, which is the only way a zero
 * from the accusation run means anything.
 *
 *   npx tsx scripts/audit-openapi.mts --control stripe.com twilio.com
 */
const PATHS = [
  '/openapi.json', '/openapi.yaml', '/swagger.json', '/api/openapi.json', '/v1/openapi.json',
  '/openapi', '/.well-known/openapi', '/swagger/v1/swagger.json', '/api-docs/openapi.json',
  '/spec.json', '/api/swagger.json', '/docs/openapi.json',
]

async function fetchHead(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'follow', headers: { accept: '*/*' } })
    if (!response.ok) return null
    // A spec declares itself in the first few hundred bytes. Reading the whole of Stripe's would
    // download several megabytes per candidate and prove nothing extra.
    const head = (await response.text()).slice(0, 600).toLowerCase()
    if (/^\s*<(!doctype|html)/.test(head)) return null
    return /"?openapi"?\s*:|"?swagger"?\s*:|^openapi:/m.test(head) ? head.slice(0, 60).replace(/\s+/g, ' ') : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function findSpec(domain: string): Promise<string | null> {
  for (const host of [`https://${domain}`, `https://www.${domain}`, `https://api.${domain}`, `https://docs.${domain}`]) {
    for (const path of PATHS) {
      const hit = await fetchHead(`${host}${path}`)
      if (hit) return `${host}${path}`
    }
  }
  return null
}

const control = process.argv[2] === '--control'
const domains = process.argv.slice(3)
let found = 0
for (const domain of domains) {
  const at = await findSpec(domain)
  if (control) {
    console.log(`KONTROLKA ${domain}: ${at ?? 'NIC - sonda nie umie powiedziec tak'}`)
    if (at) found += 1
  } else if (at) {
    found += 1
    console.log(`NIEZGODA ${domain}: ${at}`)
  }
}
console.log(`\n${domains.length} sprawdzonych, ${found} ze specyfikacja`)
process.exit(0)
