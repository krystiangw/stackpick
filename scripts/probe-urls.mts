import { fetchUrl, looksLikeHtml, visibleTextLength, withScanBudget } from '../src/lib/scan/http'

async function main() {
  const urls = process.argv.slice(2)
  await withScanBudget(120_000, async () => {
    for (const url of urls) {
      const got = await fetchUrl(url)
      const forms = (got.body.match(/<form/gi) ?? []).length
      const inputs = (got.body.match(/type=["'](email|password)["']|name=["'](email|password)["']/gi) ?? []).length
      const low = got.body.toLowerCase()
      const dev = ['<code|<pre', '\\bcurl\\b', '\\bapi key\\b', '\\bauthorization:', '\\bendpoint\\b', '\\bnpm install\\b', '\\bbearer\\b']
        .map((p) => (low.match(new RegExp(p, 'gi')) ?? []).length)
        .reduce((a, b) => a + b, 0)
      console.log(
        `${got.status} ${url}\n    -> ${got.url} html=${looksLikeHtml(got)} text=${visibleTextLength(got.body)} forms=${forms} inputs=${inputs} devhits=${dev} ${got.error ?? ''}`,
      )
    }
  })
}

void main()
