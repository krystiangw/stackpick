/**
 * Thirtieth adversarial pass: `programmatic_provisioning`, the heaviest check on the card and the
 * only two-point one that had never been attacked.
 *
 * What it could get wrong is not the phrase list, it is the sample. The scanner reads the
 * documentation landing page, at most three more chosen by how directly a path promises
 * credentials, and any llms.txt files, and then publishes "2 of 7 phrases across the 4 pages we
 * read". A vendor whose key-creation page was not among those four is told, in effect, that they
 * document no programmatic path. Ninety-one rows carry a failing verdict on this check.
 *
 * So this probe looks for the same thing through a door the scanner never opens: **their
 * sitemap**. It reads sitemap.xml on the site and on the documentation host, follows sitemap
 * indexes one level, keeps the URLs whose path promises credentials, and reads up to six of them.
 * Nothing here is imported from the scanner, phrase rules included: a probe that shares the code
 * under test can only ever agree with it.
 *
 *   npx tsx scripts/audit-provisioning.mts credited   # the control: can it find what we credit?
 *   npx tsx scripts/audit-provisioning.mts accused    # a hit here is a candidate false accusation
 *
 * Read the control first and refuse to read the accused side without it. A pass that finds nothing
 * among the accused means nothing at all unless the same probe found something among the credited,
 * which is the mistake the twenty-fifth pass made with apis.guru at 2 of 47 coverage.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'

const UA = 'LetAgentsIn/1.0 (+https://letagentsin.com/methodology)'
const MOST_PAGES = 6

const CREDENTIAL = String.raw`(?:api[-_ ]?keys?|api[-_ ]?tokens?|access[-_ ]?tokens?|personal[-_ ]?access[-_ ]?tokens?|auth[-_ ]?tokens?|secret[-_ ]?keys?|service[-_ ]?tokens?)`
const PROMISING_PATH = /api[-_]?key|token|credential|auth|provision|service[-_]?account|admin[-_]?api|management/i

/** Written from the published labels rather than copied from the scanner's regexes. */
const RULES: [string, RegExp][] = [
  ['management api', /\bmanagement api\b/i],
  ['provisioning api', /\bprovisioning api\b/i],
  ['account api', /\baccount api\b/i],
  ['service account', /\bservice account\b/i],
  ['sciezka /v1/api_keys', new RegExp(String.raw`/v\d+/(?:api[-_]keys|access[-_]tokens)`, 'i')],
  [
    'tworzenie poswiadczenia przez maszyne',
    new RegExp(
      String.raw`(?:POST|curl|programmatically|via the api|through the api|management api|admin api)[^.]{0,90}creat\w*[^.]{0,40}${CREDENTIAL}` +
        String.raw`|creat\w*[^.]{0,40}${CREDENTIAL}[^.]{0,90}(?:POST|curl|programmatically|via the api|through the api)`,
      'i',
    ),
  ],
]

async function read(url: string, accept: string): Promise<{ body: string; ok: boolean }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': UA, accept },
    })
    if (!response.ok) return { body: '', ok: false }
    const body = (await response.text()).slice(0, 600_000)
    return { body, ok: true }
  } catch {
    return { body: '', ok: false }
  } finally {
    clearTimeout(timer)
  }
}

const locations = (xml: string, tag: 'sitemap' | 'url'): string[] => {
  const blocks = xml.match(new RegExp(`<${tag}>[\\s\\S]*?</${tag}>`, 'gi')) ?? []
  return blocks.flatMap((block) => block.match(/<loc>\s*([^<\s]+)\s*<\/loc>/i)?.slice(1) ?? [])
}

/** Their own map of their own site, which is the one place the scanner never looks for docs. */
async function pagesPromisingCredentials(site: string, docs: string | null): Promise<string[]> {
  const roots = [...new Set([site, docs].filter((base): base is string => Boolean(base)))].map(
    (base) => `${base.replace(/\/$/, '')}/sitemap.xml`,
  )
  const found: string[] = []
  for (const root of roots) {
    const { body } = await read(root, 'application/xml,text/xml')
    if (!body.includes('<loc')) continue
    const nested = locations(body, 'sitemap').filter((url) => PROMISING_PATH.test(url) || /doc|guide|api/i.test(url))
    found.push(...locations(body, 'url').filter((url) => PROMISING_PATH.test(url)))
    // One level of index, and only the parts of it that could hold what we are looking for.
    for (const child of nested.slice(0, 3)) {
      const inner = await read(child, 'application/xml,text/xml')
      found.push(...locations(inner.body, 'url').filter((url) => PROMISING_PATH.test(url)))
    }
  }
  return [...new Set(found)].slice(0, MOST_PAGES)
}

const asText = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')

async function provisioningIn(urls: string[]): Promise<{ url: string; rule: string; quote: string } | null> {
  for (const url of urls) {
    const { body } = await read(url, 'text/html')
    if (!body) continue
    const text = asText(body)
    for (const [label, rule] of RULES) {
      const hit = text.match(rule)
      if (!hit) continue
      const at = text.indexOf(hit[0])
      return { url, rule: label, quote: text.slice(Math.max(at - 60, 0), at + 120).trim() }
    }
  }
  return null
}

const mode = process.argv[2] === 'credited' ? 'credited' : 'accused'
const store = getStore()

type Target = { domain: string; site: string; docs: string | null }
const targets: Target[] = []
for (const domain of CURATED_DOMAINS) {
  const report = await store.latestForDomain(domain)
  const check = report?.scorecard.checks.find((candidate) => candidate.id === 'programmatic_provisioning')
  if (!check || check.inconclusive || check.notApplicable) continue
  const wanted = mode === 'credited' ? check.points > 0 : check.points === 0
  if (!wanted) continue
  const findings = report!.findings as unknown as { site: string; discovered?: { docs?: string | null } }
  targets.push({ domain, site: findings.site, docs: findings.discovered?.docs ?? null })
}

console.log(`${mode}: ${targets.length} domen\n`)

let withSitemap = 0
let hits = 0
for (const target of targets) {
  const pages = await pagesPromisingCredentials(target.site, target.docs)
  if (pages.length > 0) withSitemap += 1
  const found = await provisioningIn(pages)
  if (found) {
    hits += 1
    const label = mode === 'credited' ? 'ZGODA   ' : 'NIEZGODA'
    console.log(`${label} ${target.domain.padEnd(20)} ${found.rule.padEnd(34)} ${found.url}`)
    if (mode === 'accused') console.log(`         „${found.quote}"`)
  } else if (mode === 'credited') {
    console.log(`PUDLO    ${target.domain.padEnd(20)} ${pages.length} stron z mapy witryny`)
  }
}

console.log(`\n${targets.length} sprawdzonych, ${withSitemap} ma mape witryny z obiecujacymi sciezkami`)
console.log(
  mode === 'credited'
    ? `sonda znalazla fraze u ${hits} z ${targets.length}: to jest jej pokrycie i bez niego druga strona nic nie znaczy`
    : `${hits} kandydatow na falszywe oskarzenie, kazdy do obejrzenia recznie`,
)
process.exit(0)
