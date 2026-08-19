/**
 * Twenty-eighth adversarial pass: `machine_readable_api`, the check whose last pass came back
 * empty for the wrong reason.
 *
 * The twenty-fifth pass asked apis.guru and found nothing, and the honest reading of that was not
 * "the vendors are clean" but "the source held 2 of our 47 targets, so it could not have
 * disagreed with us". This one asks the source that just worked for `mcp_present`: **the vendor's
 * own documentation page**, read rather than guessed.
 *
 * We already read one thing off that page, `<link rel="service-desc">`, and almost nobody
 * publishes it. What everybody does publish is a rendering widget with the spec address in an
 * attribute: Scalar takes `data-url`, Redoc takes `spec-url`, and both leave it in the server
 * HTML. A spec we can read out of their page is a spec an agent can read out of their page.
 *
 *   npx tsx scripts/audit-openapi-docs.mts credited   # the control: can this probe find specs at all
 *   npx tsx scripts/audit-openapi-docs.mts accused    # the rows we tell there is no machine-readable API
 *
 * The control runs first and it is the whole point: a probe that cannot find the spec of a vendor
 * we already credit knows nothing about the vendors we accuse.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'
import { AGENT_UA, CONTACT } from '../src/lib/scan/http'

const UA = AGENT_UA

async function text(url: string, accept: string): Promise<{ body: string; status: number }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'follow', headers: { 'user-agent': UA, from: CONTACT, accept } })
    return { body: (await response.text()).slice(0, 300_000), status: response.status }
  } catch {
    return { body: '', status: 0 }
  } finally {
    clearTimeout(timer)
  }
}

/** The attributes and links a documentation page leaves the spec address in. */
function specAddressesIn(html: string, base: string): string[] {
  const found: string[] = []
  const patterns = [
    /(?:data-url|spec-url|data-spec-url|swagger-url)\s*=\s*["']([^"']+)["']/gi,
    /["'](?:url|specUrl|schemaUrl)["']\s*:\s*["']([^"']+)["']/gi,
    /rel=["']service-desc["'][^>]*href=["']([^"']+)["']/gi,
    /href=["']([^"']*(?:openapi|swagger)[^"']*\.(?:json|ya?ml))["']/gi,
  ]
  for (const pattern of patterns) {
    for (const hit of html.matchAll(pattern)) {
      try {
        found.push(new URL(hit[1], base).toString())
      } catch {
        /* a template placeholder rather than an address */
      }
    }
  }
  return [...new Set(found)].filter((url) => /\.(json|ya?ml)$|openapi|swagger|spec/i.test(url)).slice(0, 6)
}

/** A spec is a document that says which spec it is. Anything else is a page that mentions one. */
function readsAsASpec(body: string): string | null {
  const head = body.slice(0, 4000)
  if (/^\s*[{[]/.test(body)) {
    try {
      const parsed = JSON.parse(body) as Record<string, unknown>
      if (typeof parsed.openapi === 'string') return `openapi ${parsed.openapi}`
      if (typeof parsed.swagger === 'string') return `swagger ${parsed.swagger}`
    } catch {
      /* truncated at the read cap, so fall through to the text test */
    }
  }
  const declared = head.match(/^\s*(openapi|swagger)\s*:\s*["']?(\d[\d.]*)/im)
  return declared ? `${declared[1].toLowerCase()} ${declared[2]}` : null
}

const theirs = (url: string, domain: string) => {
  try {
    const host = new URL(url).hostname
    return host === domain || host.endsWith(`.${domain}`)
  } catch {
    return false
  }
}

const mode = process.argv[2] === 'credited' ? 'credited' : 'accused'
const store = getStore()

type Target = { domain: string; docs: string }
const targets: Target[] = []
for (const domain of CURATED_DOMAINS) {
  const report = await store.latestForDomain(domain)
  const check = report?.scorecard.checks.find((candidate) => candidate.id === 'machine_readable_api')
  if (!check || check.inconclusive || check.notApplicable) continue
  if (mode === 'credited' ? check.points === 0 : check.points > 0) continue
  const findings = report!.findings as unknown as { site: string; discovered: { docs?: string | null } }
  targets.push({ domain, docs: findings.discovered.docs ?? findings.site })
}

console.log(`${mode}: ${targets.length} domen\n`)

/**
 * The second source, and the one the scanner never asks: the usual spec paths on the
 * DOCUMENTATION origin. We probe them on the site and nowhere else, which is the same miss
 * `agent_entry_point` was carrying until 9.19 and `llms_txt` before that. A vendor whose docs
 * live on docs.<domain> serves their spec there too.
 */
const USUAL = ['/openapi.json', '/openapi.yaml', '/swagger.json', '/api/openapi.json', '/v1/openapi.json']

let fromPage = 0
let fromDocsOrigin = 0
let elsewhere = 0
for (const { domain, docs } of targets) {
  let origin: string
  try {
    origin = new URL(docs).origin
  } catch {
    continue
  }
  const page = await text(docs, 'text/html,application/xhtml+xml')
  const addresses = specAddressesIn(page.body, docs)
  let hit: string | null = null
  let source = ''
  for (const address of addresses.slice(0, 4)) {
    const candidate = await text(address, 'application/json, application/yaml, text/yaml, text/plain')
    const version = readsAsASpec(candidate.body)
    if (!version) continue
    hit = `${address} (${version})`
    source = 'strona'
    if (!theirs(address, domain)) elsewhere += 1
    break
  }
  if (!hit && !origin.includes(`//${domain}`)) {
    for (const path of USUAL) {
      const candidate = await text(`${origin}${path}`, 'application/json, application/yaml, text/yaml, text/plain')
      const version = readsAsASpec(candidate.body)
      if (!version) continue
      hit = `${origin}${path} (${version})`
      source = 'host dokumentacji'
      break
    }
  }
  if (!hit) continue
  if (source === 'strona') fromPage += 1
  else fromDocsOrigin += 1
  console.log(`${mode === 'accused' ? 'NIEZGODA' : 'znalazlem'} ${domain.padEnd(20)} ${source.padEnd(18)} ${hit}`)
}

console.log(
  `\n${targets.length} sprawdzonych: ${fromPage} ze strony dokumentacji (${elsewhere} na cudzym hoscie), ${fromDocsOrigin} ze zwyklych sciezek na HOSCIE dokumentacji`,
)
console.log(
  mode === 'credited'
    ? 'kontrolka: to jest gorna granica tego, co ta sonda umie. Niskie pokrycie tutaj znaczy, ze jej milczenie o oskarzonych nic nie znaczy'
    : 'oskarzenia: niezgoda znaczy, ze specyfikacja jest wskazana na ich wlasnej stronie, a my mowimy, ze nie ma zadnej',
)
process.exit(0)
