/**
 * Seventeenth adversarial pass: 27 rows say there is no llms.txt at any location we probe.
 *
 * A file is either served at an address or it is not, so this is refutable by one request, and it
 * looks in more places than the scanner does. A hit would not make our sentence false, because the
 * sentence says "at any of the N locations probed" rather than "you publish none", but it would be
 * a coverage gap of the same shape as statsig.com's MCP server on 2026-08-14.
 *
 * Two-sided by design, like the CAPTCHA pass: the rows we credit have to come back with a file,
 * or a run of empty answers on the accused would only prove the probe is broken.
 *
 *   npx tsx scripts/audit-llms.mts --accused < fails.tsv
 */
import { refuseIfNothingMeasured } from './nothing-measured'
import { AGENT_UA, CONTACT } from '../src/lib/scan/http'
const PATHS = ['/llms.txt', '/llms-full.txt', '/.well-known/llms.txt']

// The documentation URL belongs here because the scanner knows it and looks there: imagekit.io
// publishes at imagekit.io/docs/llms.txt, and a probe that only tried host roots called our own
// correct row a miss. The control caught that before the accusation run could inherit it.
function hostsFor(site: string, domain: string, docs: string): string[] {
  const bare = domain.replace(/^www\./, '')
  // Only strip a trailing file, and only below the host: the first version's `/[^/]*\.[a-z]+$/`
  // matched the hostname itself, so https://docs.example.com became "https:/" and the probe asked
  // https://llms.txt. That is a false confirmation in a tool whose only job is to refute, and the
  // control could not catch it because the docs./developers. fallbacks rescued those hosts anyway.
  const docsRoot = docs
    ? (() => {
        try {
          const url = new URL(docs)
          const path = url.pathname.replace(/\/$/, '').replace(/\/[^/]*\.[a-z0-9]+$/i, '')
          return `${url.origin}${path}`
        } catch {
          return ''
        }
      })()
    : ''
  return [...new Set(
    [site.replace(/\/$/, ''), docsRoot, `https://${bare}`, `https://www.${bare}`, `https://docs.${bare}`, `https://developers.${bare}`].filter(Boolean),
  )]
}

async function llmsFileOn(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 9000)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': AGENT_UA, from: CONTACT, accept: 'text/plain,*/*' },
    })
    if (!response.ok) return null
    const body = (await response.text()).slice(0, 4000)
    // A soft 404 is usually the site shell, and a shell is not a file. Requiring a markdown heading
    // or a link keeps a stray "not found" text page from counting as publication.
    if (/^\s*<(!doctype|html)/i.test(body)) return null
    if (body.trim().length < 40) return null
    return /^#|\]\(|^- /m.test(body) ? `${body.trim().slice(0, 60).replace(/\s+/g, ' ')}` : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function findLlms(site: string, domain: string, docs: string): Promise<string | null> {
  for (const host of hostsFor(site, domain, docs)) {
    for (const path of PATHS) {
      const hit = await llmsFileOn(`${host}${path}`)
      if (hit) return `${host}${path}`
    }
  }
  return null
}

const control = process.argv[2] === '--control'
const lines = (await new Response(process.stdin as never).text()).trim().split('\n').filter(Boolean)

let agree = 0
let disagree = 0
for (const line of lines) {
  const [domain, site, docs] = line.split('\t')
  const at = await findLlms(site ?? `https://${domain}`, domain, docs ?? '')
  const expected = control ? at !== null : at === null
  if (expected) agree += 1
  else {
    disagree += 1
    console.log(`NIEZGODA ${domain.padEnd(20)} ${at ?? 'nie znalazlem pliku, ktory nasz wiersz zalicza'}`)
  }
}

// Ten audyt czyta liste z wejscia, wiec pusty potok jest CICHY: bez tej bramki drukuje zdanie
// uspokajajace, nie zapytawszy o nic.
refuseIfNothingMeasured(lines.length, 'wierszy z wejscia')

console.log(`\n${lines.length} sprawdzonych: ${agree} zgodnych z naszym wierszem, ${disagree} niezgodnych`)
console.log(control ? 'kontrolka: niezgoda znaczy, ze sonda nie widzi pliku, ktory zaliczamy' : 'oskarzenia: niezgoda znaczy, ze plik jednak jest')
process.exit(0)
