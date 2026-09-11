import type { Metadata } from 'next'
import { CORPUS_LICENCE_IS_PUBLISHED } from '@/lib/seller'
import Link from 'next/link'
import { PER_CALLER_PER_HOUR, PER_DOMAIN_PER_HOUR, REUSE_WINDOW_MS } from '@/lib/scan-gate'
import { CHECKS, FORMULA_VERSION, MAX_SCORE, STAGES } from '@/lib/score'
import { recordVisit } from '@/lib/visits'
import { headers } from 'next/headers'
import { SITE_URL, pageMetadata } from '@/lib/site'

/** When the browser support below was last read at the source. A version number ages faster than prose. */
const WEBMCP_READ_ON = '30 August 2026'

export const metadata: Metadata = pageMetadata({
  path: '/docs',
  title: 'Docs: Let Agents In',
  description: 'How to scan a domain from code: endpoints, response shape, limits, and how to read a scorecard.',
})

const BASE = SITE_URL

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto border border-rule bg-sunken p-4 font-mono text-xs leading-relaxed">
      <code>{children}</code>
    </pre>
  )
}

export default async function DocsPage() {
  recordVisit('/docs', (await headers()).get('user-agent'))
  return (
    <main className="mx-auto max-w-5xl px-6">
      <section className="border-b border-rule py-14">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">Docs</p>
        <h1 className="mt-4 max-w-2xl text-balance text-4xl font-semibold leading-tight tracking-tight">
          Scan API and response formats
        </h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
          The scan reads public pages. You do not need an account, an API key or OAuth.
        </p>
        <nav aria-label="API sections" className="mt-6 flex flex-wrap gap-2 text-sm">
          {[['scan-api', 'Scan'], ['progress-api', 'Progress'], ['access-api', 'Limits & formats'], ['refusals', 'Errors']].map(([id, label]) => <a key={id} href={`#${id}`} className="nav-link border border-rule">{label}</a>)}
        </nav>
      </section>

      <section className="border-b border-rule py-12">
        <h2 id="scan-api" className="text-xl font-semibold tracking-tight">Scan a domain</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          POST /api/scan with a domain. The response contains its scorecard and an ID for the permanent <code>/r/&lt;id&gt;</code> page.
        </p>
        <div className="mt-5">
          <Code>{`curl -X POST ${BASE}/api/scan \\
  -H 'content-type: application/json' \\
  -d '{"domain": "example.com"}'`}</Code>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
          The response includes <code>id</code>, <code>domain</code> and <code>scorecard</code>.
          Each check has <code>points</code>, <code>max</code> and a readable <code>detail</code>.
          Divide the total by <code>measurable</code> for the score share.
        </p>
        <dl className="mt-5 divide-y divide-rule rounded-lg border border-rule bg-surface px-5">
          {[
            ['inconclusive: true', 'The check scored zero because it could not be measured. Excluded from the measurable denominator.'],
            ['notApplicable: true', 'The check does not apply to this product. Excluded from the measurable denominator.'],
            ['max', 'Full theoretical maximum. It can include checks that were not measurable or applicable.'],
          ].map(([field, description]) => <div key={field} className="grid gap-2 py-4 sm:grid-cols-[13rem_1fr]"><dt className="font-mono text-sm">{field}</dt><dd className="text-sm leading-relaxed text-ink-soft">{description}</dd></div>)}
        </dl>
        <div className="mt-5">
          <Code>{`{
  "id": "example-com-202608072143",
  "domain": "example.com",
  "scorecard": {
    "formulaVersion": "${FORMULA_VERSION}",
    "total": 9,
    "measurable": 14,
    "max": ${MAX_SCORE},
    "stages": [{ "letter": "A", "title": "Discovery", "points": 4, "measurable": 4, "max": 5 }],
    "checks": [
      { "id": "llms_txt", "stage": "discovery", "label": "llms.txt published",
        "points": 1, "max": 1, "detail": "llms.txt present" },
      { "id": "signup_reachable", "stage": "signup", "label": "Signup page reachable",
        "points": 0, "max": 1,
        "detail": "No signup page linked from the site we could follow",
        "inconclusive": true,
        "unblock": "Link your signup page from your home page and this becomes measurable." }
    ]
  }
}`}</Code>
        </div>
      </section>

      <section className="border-b border-rule py-12">
        <h2 id="progress-api" className="text-xl font-semibold tracking-tight">Progress events</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          POST /api/scan/stream for server-sent progress events. Scans usually take seconds and can run for a minute.
          Signup probes run up to three times. The final done event includes the result ID.
        </p>
        <div className="mt-5">
          <Code>{`curl -N -X POST ${BASE}/api/scan/stream \\
  -H 'content-type: application/json' \\
  -d '{"domain": "example.com"}'

event: step
data: {"label":"Checking robots.txt against 13 AI crawlers","done":2,"total":5}

event: done
data: {"id":"example-com-202608072143","total":9,"max":${MAX_SCORE}}`}</Code>
        </div>
      </section>

      <section className="border-b border-rule py-12">
        <h2 id="access-api" className="text-xl font-semibold tracking-tight">Access, limits and formats</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Scan endpoints require no credentials. Limits are {PER_DOMAIN_PER_HOUR} scans per domain and {PER_CALLER_PER_HOUR} per caller each hour.
          Repeat requests within {REUSE_WINDOW_MS / 60000} minutes return the stored result.
          A 429 response includes a <code className="font-mono text-xs">retry-after</code> header.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Connect to <code>/mcp</code> over Streamable HTTP. The <code>scan_domain</code> tool takes a domain and uses the REST scan limits.
          No authentication is required. Its descriptor is <code>/.well-known/mcp.json</code>.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          The home page also registers <code>scan_domain</code> through{' '}
          <a href="https://webmachinelearning.github.io/webmcp/" className="text-brass underline underline-offset-4">
            WebMCP
          </a>
          . Origin trial support: Chrome 149+ and Edge 150+, read on {WEBMCP_READ_ON}.
          Registration requires <code>document.modelContext</code>. The HTTP endpoints work without JavaScript.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          The scan API and MCP tool accept a <code>format</code> option.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-rule bg-surface p-5">
            <h3 className="font-mono text-sm font-medium">sarif</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">Returns SARIF 2.1.0. Only the failing checks become results.</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">Passing, unmeasured and inapplicable checks are counted in the run properties.</p>
          </div>
          <div className="rounded-lg border border-rule bg-surface p-5">
            <h3 className="font-mono text-sm font-medium">agent</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">Returns a Markdown task per failing check, with its measurement and rule link. Unmeasured checks are listed separately and marked as not failures.</p>
          </div>
        </div>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Download published scans from <code>/corpus.json</code> or <code>/corpus.csv</code>.
          Each row contains the domain, check, verdict and observed evidence. Free to use and quote{' '}
          {CORPUS_LICENCE_IS_PUBLISHED ? (
            <Link href="/corpus-licence" className="text-brass underline underline-offset-4">
              under these terms
            </Link>
          ) : (
            'with attribution'
          )}
          .
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Machine-readable descriptions:{' '}
          <Link href="/openapi.json" className="text-brass underline underline-offset-4">
            /openapi.json
          </Link>
          , <span className="font-mono text-xs">/.well-known/agent-access.json</span>,{' '}
          <span className="font-mono text-xs">/.well-known/mcp.json</span> and{' '}
          <span className="font-mono text-xs">/agent-signup.md</span>.
        </p>
      </section>

      <section className="border-b border-rule py-12">
        <h2 id="refusals" className="text-xl font-semibold tracking-tight">Rejected hosts</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Only public hosts are accepted. IP literals, private and loopback ranges, link-local addresses, cloud metadata endpoints and unresolved names are refused.
          Each redirect destination is resolved and checked again.
        </p>
      </section>

      <section className="py-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Reading a scorecard</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          {CHECKS.length} checks across {STAGES.length} stages, worth up to {MAX_SCORE} points.
          A refused page can leave dependent checks unmeasured. The scorecard records that limit.
        </p>
        <ol className="mt-6 flex flex-col">
          {STAGES.map((stage) => (
            <li key={stage.id} className="grid grid-cols-[2rem_1fr] gap-4 border-t border-rule py-3 sm:grid-cols-[3rem_10rem_1fr]">
              <span className="font-mono text-sm text-brass">{stage.letter}</span>
              <span className="font-mono text-sm font-medium">{stage.title}</span>
              <span className="col-span-2 text-sm text-ink-soft sm:col-span-1">{stage.question}</span>
            </li>
          ))}
        </ol>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Every rule, threshold and point value is on the{' '}
          <Link href="/methodology" className="text-brass underline underline-offset-4">
            methodology page
          </Link>
          . Use the recorded URLs and responses to investigate a disputed result.
        </p>
      </section>
    </main>
  )
}
