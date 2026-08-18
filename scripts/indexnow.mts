/**
 * Tell the engines that pages changed, which is the half of IndexNow we never built.
 *
 *   npx tsx scripts/indexnow.mts                 # the pages that change on every reseed
 *   npx tsx scripts/indexnow.mts --all           # those plus one page per published vendor
 *   npx tsx scripts/indexnow.mts https://...     # exactly these
 *
 * The key file has been sitting in `public/` since the SEO work, and nothing ever submitted a URL,
 * so it advertised a capability we did not use. It matters more here than for an ordinary site:
 * ChatGPT Search retrieves from Bing, and our vendor pages change on every sweep, so a corpus the
 * index has not re-read is a corpus nobody is answering questions from.
 *
 * It submits our own public pages and nothing else. No account, no key exchange: ownership is
 * proved by the file already served at the address below.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { SITE_URL } from '../src/lib/site'

/** The key is the name of the file that serves it, which is how the engines verify ownership. */
function keyFromPublic(): string {
  const named = readdirSync('public').find((name) => /^[0-9a-f]{32}\.txt$/.test(name))
  if (!named) throw new Error('no IndexNow key file in public/, so there is nothing to submit with')
  const key = named.replace(/\.txt$/, '')
  const inside = readFileSync(`public/${named}`, 'utf8').trim()
  // The file has to contain its own name. An engine that reads a different value treats every
  // submission as unowned and says nothing about it, which is a silent failure by design.
  if (inside !== key) throw new Error(`public/${named} contains ${inside}, which is not its own name`)
  return key
}

/**
 * Our own sitemap, rather than a list typed here. The first version of this file carried `/audits`,
 * copied off the navigation label, and the real route is `/audit`: a hand-written list of a site's
 * own pages is wrong the day somebody renames one, and this is the file whose whole job is to be
 * the list.
 */
async function fromSitemap(): Promise<string[]> {
  const xml = await (await fetch(`${SITE_URL}/sitemap.xml`)).text()
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((found) => found[1])
}

const asked = process.argv.slice(2)
const key = keyFromPublic()
const urls = asked.filter((one) => one.startsWith('http'))

/**
 * Named addresses skip the sitemap entirely. Reading it first meant the one mode meant for a bad
 * moment - the site half broken, one page to resubmit by hand - failed on the site being half
 * broken. Vendor pages change on every sweep and the rest changes when we ship, so the default is
 * the smaller set and `--all` is what a reseed calls.
 */
async function chosen(): Promise<string[]> {
  if (urls.length > 0) return urls
  const all = await fromSitemap()
  return asked.includes('--all') ? all : all.filter((url) => !url.includes('/v/'))
}
const submitting = await chosen()

const answer = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: new URL(SITE_URL).host,
    key,
    keyLocation: `${SITE_URL}/${key}.txt`,
    urlList: submitting,
  }),
})

// 200 and 202 both mean accepted; the engines say nothing about what they do next, and anybody
// who reads more into the answer than that is reading tea leaves.
console.log(`${submitting.length} adresow zgloszonych, odpowiedz ${answer.status} ${answer.statusText}`)
if (answer.status >= 400) {
  console.error(await answer.text())
  process.exit(1)
}
process.exit(0)
