/**
 * Does anything answer at the agent entry paths we say we asked?
 *
 *   MONGODB_URI=... npx tsx scripts/audit-entry.mts [ile]
 *
 * `agent_entry_point` is the biggest accusation surface in the corpus, 129 rows, and its sentence
 * names the count rather than the paths: "None of the 21 agent entry paths we asked on your site
 * and your documentation host returns a file rather than your page shell". A vendor who has one of
 * those files reads that as us not looking, so it has to be true.
 *
 * The predicates come from the scanner itself (`isRealTextFile`, `answersWithTheSameTemplate`,
 * `looksLikeADocsPageTwin`), because a second opinion about what counts as a file would find
 * different things than the check does, and then neither number would mean anything. Only the
 * fetching is local. The control path is what separates a published file from a site that answers
 * every unknown address with its own shell.
 */
import { CURATED_DOMAINS } from '../src/lib/categories'
import { getStore } from '../src/lib/store'
import {
  AGENT_ENTRY_PATHS,
  UPPERCASE_ENTRY_PATHS,
  answersWithTheSameTemplate,
  entryAccept,
  looksLikeADocsPageTwin,
} from '../src/lib/scan/funnel'
import { registrableDomain } from '../src/lib/scan/http'
import { howManyRows } from './how-many'
import { refuseIfNothingMeasured } from './nothing-measured'

const PAUSE_MS = 250
const CONTROL = '/letagentsin-audit-probe-8f3a1c'
const store = getStore()
const most = howManyRows(40, CURATED_DOMAINS.size)

const get = async (url: string, accept: string) => {
  await new Promise((done) => setTimeout(done, PAUSE_MS))
  try {
    const answer = await fetch(url, { headers: { accept }, signal: AbortSignal.timeout(8000) })
    return { ok: answer.ok, status: answer.status, body: (await answer.text()).slice(0, 4000) }
  } catch {
    return null
  }
}

/** The scanner's own bar for "this is a published file", minus the parts that need a full scan. */
const readsAsAFile = (body: string) => !/^\s*<(!doctype|html)/i.test(body) && body.trim().length >= 30

type Found = { domain: string; url: string; head: string }
const found: Found[] = []
let checked = 0
let asked = 0

for (const domain of [...CURATED_DOMAINS].slice(0, most)) {
  const report = await store.latestForDomain(domain, true)
  const check = report?.scorecard.checks.find((one) => one.id === 'agent_entry_point')
  if (!check || check.inconclusive || check.notApplicable || check.points > 0) continue
  checked += 1
  // Both halves of the sentence. It says "on your site and your documentation host", and an audit
  // that asks only the first one verifies half a claim while reporting it as the whole.
  const docs = (report?.findings as unknown as { discovered?: { docs?: string | null } })?.discovered?.docs
  const hosts = [`https://${domain}`]
  if (docs) {
    try {
      const origin = new URL(docs).origin
      // Only the vendor's own documentation host. A shared platform or another company's site can
      // sit in that field, and a root-level agents.md there is somebody else's file: reporting it
      // would be a contradiction we invented.
      const theirs = registrableDomain(new URL(origin).hostname) === registrableDomain(domain)
      if (theirs && !hosts.includes(origin)) hosts.push(origin)
    } catch {
      // A stored value that is not a URL is not a host to ask.
    }
  }
  for (const host of hosts) {
    // One control per namespace, because a host can answer .json, .txt and .md unknown paths with
    // three different templates - which is why the scanner keeps three of them. A single markdown
    // control would read a JSON soft-404 as a published descriptor.
    const controls = new Map<string, string | undefined>()
    for (const suffix of ['.md', '.json', '.txt']) {
      const at = suffix === '.json' ? `${host}/.well-known${CONTROL}${suffix}` : `${host}${CONTROL}${suffix}`
      controls.set(suffix, (await get(at, entryAccept(suffix)))?.body)
    }
    for (const path of [...AGENT_ENTRY_PATHS, ...UPPERCASE_ENTRY_PATHS]) {
      asked += 1
      // The same header the probe sends. sentry.io answers its web UI to */* and the descriptor to
      // application/json, so asking the lazy way finds nothing and calls it a confirmed absence.
      const answer = await get(`${host}${path}`, entryAccept(path))
      if (!answer?.ok) continue
      if (!readsAsAFile(answer.body)) continue
      const suffix = path.endsWith('.json') ? '.json' : path.endsWith('.txt') ? '.txt' : '.md'
      // The two things that make a body look like a file without being one: the site's own shell
      // served for every unknown address, and a documentation page rendered as text.
      if (answersWithTheSameTemplate(answer.body, controls.get(suffix))) continue
      if (looksLikeADocsPageTwin(answer.body)) continue
      found.push({ domain, url: `${host}${path}`, head: answer.body.replace(/\s+/g, ' ').slice(0, 90) })
    }
  }
  console.log(`${checked} wierszy sprawdzonych, ${found.length} plikow znalezionych`)
}

refuseIfNothingMeasured(checked, 'oblanych wierszy')
console.log(`\n${checked} oblanych wierszy, ${asked} sciezek zapytanych`)
console.log(
  found.length === 0
    ? 'zdanie trzyma sie wszedzie: pod zadna z wymienionych sciezek nie ma dzis pliku'
    : `${found.length} PLIKOW, ktore jednak sa, mimo ze wiersz mowi, ze zadnej nie ma - kazdy do przeczytania:`,
)
for (const one of found) console.log(`  ${one.domain.padEnd(22)} ${one.url}\n     ${one.head}`)
process.exit(0)
