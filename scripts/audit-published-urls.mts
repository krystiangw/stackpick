/**
 * Every address we publish as evidence, asked whether it answers.
 *
 * Formula 9.12 started reading links out of llms.txt and naming them in verdicts. That loosened a
 * rule, so unlike 9.11 it can only fail by crediting something: a page we say proves a vendor is
 * reachable, which is not there. A dead link in our own evidence is a claim about somebody else's
 * product that we cannot support, and this file finds them before a vendor does.
 *
 * Reads the addresses on stdin as `domain<TAB>check<TAB>url`, so the extraction stays visible in
 * the shell rather than buried here, and trims trailing punctuation itself. Leaving that to the
 * caller failed twice: a trailing colon off "the pricing page at <url>:" produced a page of false
 * 404s in an earlier pass, and reproducing it here after writing this comment is why the trim now
 * lives next to the request instead of in a pipeline.
 *
 * Dead means 404, 410 or no answer at all. A 401 or a 405 is a server refusing this particular
 * request, which is evidence the address is real: every MCP endpoint we credit answers 401 to an
 * unauthenticated GET, and counting those as dead marked 20 live servers as broken links.
 *
 *   npx tsx scripts/audit-published-urls.mts < urls.tsv
 */
const lines = (await new Response(process.stdin as never).text()).trim().split('\n').filter(Boolean)

async function status(url: string): Promise<number | string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    // GET, not HEAD: plenty of these hosts answer 405 to HEAD and 200 to the request a reader makes.
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'letagentsin-audit (+https://letagentsin.com/about-our-user-agent)' },
    })
    return response.status
  } catch (error) {
    return (error as Error).name === 'AbortError' ? 'timeout' : 'blad sieci'
  } finally {
    clearTimeout(timer)
  }
}

const BATCH = 12
let dead = 0
for (let at = 0; at < lines.length; at += BATCH) {
  const slice = lines.slice(at, at + BATCH)
  const results = await Promise.all(
    slice.map(async (line) => {
      const [domain, check, raw] = line.split('\t')
      const url = raw.replace(/[.,:;`*)\]]+$/, '')
      return { domain, check, url, code: await status(url) }
    }),
  )
  for (const r of results) {
    if (typeof r.code === 'number' && r.code !== 404 && r.code !== 410) continue
    dead += 1
    console.log(`MARTWY ${r.code}\t${r.domain}\t${r.check}\t${r.url}`)
  }
}
console.log(`\n${lines.length} adresow sprawdzonych, ${dead} nie odpowiada`)
process.exit(0)
