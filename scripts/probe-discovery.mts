import { discover } from '../src/lib/scan/discover'
import { SCAN_BUDGET_MS, withScanBudget } from '../src/lib/scan/http'

const DOMAINS = process.argv.slice(2)

async function main() {
  const out: Record<string, unknown> = {}
  for (const domain of DOMAINS) {
    const startedAt = Date.now()
    try {
      const found = await withScanBudget(SCAN_BUDGET_MS, () => discover(domain))
      out[domain] = {
        ms: Date.now() - startedAt,
        docs: found.docs,
        docsSource: found.linkSources.docs,
        pricing: found.pricing,
        pricingSource: found.linkSources.pricing,
        signup: found.signup,
        signupSource: found.linkSources.signup,
        npm: found.npmPackage,
      }
    } catch (error) {
      out[domain] = { ms: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error) }
    }
    console.error(`done ${domain}`)
  }
  console.log(JSON.stringify(out, null, 2))
}

void main()
