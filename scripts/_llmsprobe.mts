import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'
import { CREDENTIAL_PATH } from '../src/lib/scan'
import { SIGNUP_HINTS } from '../src/lib/scan/discover'

const store = getStore()
const targets: string[] = []
for (const domain of CURATED_DOMAINS) {
  const r = await store.latestForDomain(domain)
  if (r?.findings.machine.hasLlmsTxt) targets.push(domain)
}

const agent = { 'user-agent': 'LetAgentsIn/1.0 (+https://letagentsin.com/methodology)' }
const hits: { domain: string; kind: string; url: string }[] = []

await Promise.all(
  targets.map(async (domain) => {
    for (const base of [`https://${domain}/llms.txt`, `https://docs.${domain}/llms.txt`]) {
      let body = ''
      try {
        const response = await fetch(base, { headers: agent, signal: AbortSignal.timeout(15000) })
        if (!response.ok) continue
        body = await response.text()
      } catch { continue }
      for (const match of body.matchAll(/https?:\/\/[^\s)"'\]]+/g)) {
        const url = match[0].replace(/[.,`*]+$/, '')
        let path: string
        try { path = new URL(url).pathname } catch { continue }
        if (CREDENTIAL_PATH.test(path)) hits.push({ domain, kind: 'credential', url })
        else if (SIGNUP_HINTS.some((hint: RegExp | string) => (typeof hint === 'string' ? path.includes(hint) : hint.test(path)))) {
          hits.push({ domain, kind: 'signup', url })
        }
      }
      break
    }
  }),
)

const byDomain = new Map<string, { kind: string; url: string }[]>()
for (const hit of hits) byDomain.set(hit.domain, [...(byDomain.get(hit.domain) ?? []), hit])
console.log(`${targets.length} plikow probowanych, ${byDomain.size} zawiera link o kluczach albo rejestracji\n`)
for (const [domain, list] of [...byDomain].sort()) {
  console.log(`${domain}: ${[...new Set(list.map((h) => h.url))].slice(0, 3).join(' | ')}`)
}
process.exit(0)
