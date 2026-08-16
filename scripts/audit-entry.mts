/**
 * Twenty-first adversarial pass: `agent_entry_point`, the check that carries more published
 * accusations than any other. 139 rows say "none of the 9 known agent entry paths returns a file",
 * against 19 that we credit. A rule failing seven vendors out of eight is either the product's
 * central finding or its biggest systematic error, and nothing had tested which.
 *
 * Two hypotheses about how we could be wrong at scale, both from lessons this repo already
 * learned elsewhere:
 *   1. Casing. The convention people write in repositories is AGENTS.md, and we probe /agents.md.
 *      On a case-sensitive origin those are different files.
 *   2. Host. `llms_txt` probes documentation origins because deepl.com and mixpanel.com publish
 *      only there; this check probes the site root and nothing else.
 *
 * The control is what makes a hit mean anything, and it is per host rather than global: a nonsense
 * path with the same extension. docs.slatejs.org answers /AGENTS.md, /Agents.md and /agents.md with
 * the same 1889 bytes and an invented /llms-agents.md with 1970, so a probe without this would have
 * reported it as a file we missed. That is the failure mode of every naive version of this script.
 *
 *   npx tsx scripts/audit-entry.mts accused   # a hit means we published a false accusation
 *   npx tsx scripts/audit-entry.mts credited  # a miss means the probe is broken, not the row
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { AGENT_ENTRY_PATHS } from '../src/lib/scan/funnel'
import { getStore } from '../src/lib/store'

const UA = 'LetAgentsIn/1.0 (+https://letagentsin.com/methodology)'
const CASINGS = ['/AGENTS.md', '/Agents.md', '/AGENT.md', '/SKILL.md']
/** Same shape as a real one and deliberately not a convention anybody publishes. */
const NONSENSE = ['/qx7-not-a-convention.md', '/qx7-not-a-convention.json', '/qx7-not-a-convention.txt']

type Body = { bytes: number; head: string }

/**
 * The header the scanner would send for this path, and the reason is sentry.io: asked with
 * markdown in front it answers every path, including /.well-known/mcp.json, with the same
 * "you've hit the web UI" notice, and asked with application/json it answers the real 106 byte
 * descriptor. A probe auditing a measurement has to make the measurement's request.
 */
const acceptFor = (path: string) =>
  path.endsWith('.json') ? 'application/json' : path.endsWith('.txt') ? 'text/plain' : 'text/markdown, text/plain'

async function fileAt(url: string): Promise<Body | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 9000)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': UA, accept: acceptFor(new URL(url).pathname) },
    })
    if (!response.ok) return null
    const body = (await response.text()).slice(0, 4000)
    // A page shell is not a file, and it is what most sites answer for an unknown path.
    if (/^\s*<(!doctype|html)/i.test(body)) return null
    const text = body.trim()
    // A descriptor is allowed to be tiny, and the first version of this floor was 120 characters
    // for everything. sentry.io's /.well-known/mcp.json is 106 bytes of real JSON, so the control
    // reported the probe could not see a file we credit - which is the control doing its job.
    if (text.startsWith('{') || text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text)
        if (parsed && Object.keys(parsed).length > 0) return { bytes: text.length, head: text.slice(0, 60).replace(/\s+/g, ' ') }
      } catch {
        /* truncated at the read cap, or not JSON after all */
      }
    }
    if (text.length < 120) return null
    return { bytes: text.length, head: text.slice(0, 60).replace(/\s+/g, ' ') }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

const extensionOf = (path: string) => (path.endsWith('.json') ? '.json' : path.endsWith('.txt') ? '.txt' : '.md')

/** What this host answers for a path nobody publishes, per extension. Null when it answers nothing. */
async function catchAllFor(base: string): Promise<Map<string, Body | null>> {
  const seen = new Map<string, Body | null>()
  for (const path of NONSENSE) seen.set(extensionOf(path), await fileAt(`${base}${path}`))
  return seen
}

/** The first line, which is what a template repeats and a real file does not. */
const heading = (text: string) => text.split(/\s{2,}|\n/).map((line) => line.trim()).find(Boolean)?.toLowerCase() ?? ''

async function realFilesOn(base: string): Promise<string[]> {
  const control = await catchAllFor(base)
  const found: string[] = []
  for (const path of [...AGENT_ENTRY_PATHS, ...CASINGS]) {
    const got = await fileAt(`${base}${path}`)
    if (!got) continue
    const nonsense = control.get(extensionOf(path))
    // Same size as the invented path means the host answers everything in that namespace, so the
    // hit says nothing about what the vendor publishes.
    if (nonsense && Math.abs(nonsense.bytes - got.bytes) < 200) continue
    // And the same opening line means the same template even when the sizes differ, which is the
    // usual shape: a documentation platform's soft 404 lists suggested pages, so every response is
    // a different length. Six of the seven disagreements on 2026-08-16 were this, all of them the
    // probe being weaker than the scanner it audits rather than a finding about anybody.
    if (nonsense && heading(nonsense.head).length > 3 && heading(got.head) === heading(nonsense.head)) continue
    found.push(`${base}${path} (${got.bytes}B ${got.head})`)
  }
  return found
}

const mode = process.argv[2] === 'credited' ? 'credited' : 'accused'
const store = getStore()

const targets: { domain: string; bases: string[] }[] = []
for (const domain of CURATED_DOMAINS) {
  const report = await store.latestForDomain(domain)
  const check = report?.scorecard.checks.find((candidate) => candidate.id === 'agent_entry_point')
  if (!check || check.inconclusive || check.notApplicable) continue
  const wanted = mode === 'credited' ? check.points > 0 : check.points === 0
  if (!wanted) continue
  const findings = report!.findings as unknown as { site: string; discovered?: { docs?: string | null } }
  const docs = findings.discovered?.docs
  const bases = [findings.site.replace(/\/$/, '')]
  if (docs) {
    try {
      const origin = new URL(docs).origin
      if (origin !== bases[0]) bases.push(origin)
    } catch {
      /* the scan already validated this */
    }
  }
  targets.push({ domain, bases })
}

console.log(`${mode}: ${targets.length} domen\n`)

let disagree = 0
for (const { domain, bases } of targets) {
  const found = (await Promise.all(bases.map(realFilesOn))).flat()
  const hit = found.length > 0
  const expected = mode === 'credited' ? hit : !hit
  if (expected) continue
  disagree += 1
  console.log(`NIEZGODA ${domain.padEnd(20)} ${found.join(' | ') || 'nie znalazlem pliku, ktory nasz wiersz zalicza'}`)
}

console.log(`\n${targets.length} sprawdzonych, ${disagree} niezgodnych`)
console.log(
  mode === 'credited'
    ? 'kontrolka: niezgoda znaczy, ze sonda nie widzi pliku, za ktory dajemy punkt'
    : 'oskarzenia: niezgoda znaczy, ze plik jednak jest, a my opublikowalismy jego brak',
)
process.exit(0)
