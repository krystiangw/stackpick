import { fetchUrl, looksLikeHtml, visibleTextLength, withScanBudget } from '../src/lib/scan/http'

const LOOSE = /sign[-_ ]?up|sign[-_ ]?in|regist|create[-_ ]account|log[-_ ]?in|try[-_ ]|start|trial|console|dashboard|get-started/i

function links(html: string, base: string): string[] {
  const out: string[] = []
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)) {
    try {
      out.push(new URL(m[1].replace(/&amp;/g, '&'), base).toString())
    } catch {
      /* ignore */
    }
  }
  return [...new Set(out)]
}

async function main() {
  const [url] = process.argv.slice(2)
  await withScanBudget(60_000, async () => {
    const got = await fetchUrl(url)
    console.log(`${url} -> ${got.url} ${got.status} html=${looksLikeHtml(got)} text=${visibleTextLength(got.body)}`)
    const forms = (got.body.match(/<form/gi) ?? []).length
    const emails = (got.body.match(/type=["']email["']|type=["']password["']|name=["']email["']/gi) ?? []).length
    console.log(`forms=${forms} emailinputs=${emails}`)
    const signals: [string, RegExp][] = [
      ['code', /<code|<pre/gi],
      ['curl', /\bcurl\b/gi],
      ['apikey', /\bapi key\b/gi],
      ['authz', /\bauthorization:/gi],
      ['endpoint', /\bendpoint\b/gi],
      ['npm', /\bnpm install\b/gi],
      ['bearer', /\bbearer\b/gi],
    ]
    const low = got.body.toLowerCase()
    console.log(signals.map(([n, r]) => `${n}=${(low.match(r) ?? []).length}`).join(' '))
    for (const link of links(got.body, got.url)) {
      if (LOOSE.test(link)) console.log('  L', link)
    }
  })
}

void main()
