import type { Metadata } from 'next'
import { CORPUS_LICENCE_IS_PUBLISHED } from '@/lib/seller'
import Link from 'next/link'
import { PER_CALLER_PER_HOUR, PER_DOMAIN_PER_HOUR, REUSE_WINDOW_MS } from '@/lib/scan-gate'
import { CHECKS, FORMULA_VERSION, MAX_SCORE, STAGES } from '@/lib/score'
import { recordVisit } from '@/lib/visits'
import { headers } from 'next/headers'
import { SITE_URL } from '@/lib/site'

/** When the browser support below was last read at the source. A version number ages faster than prose. */
const WEBMCP_READ_ON = '30 August 2026'

export const metadata: Metadata = {
  alternates: { canonical: `${SITE_URL}/docs` },
  title: 'Docs: Let Agents In',
  description: 'How to scan a domain from code: endpoints, response shape, limits, and how to read a scorecard.',
}

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
          Everything here works without an account
        </h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
          There is no signup, no key and no OAuth flow, because the scan reads only public pages and there is
          nothing to protect. If you are building the same kind of thing, that decision is the one worth
          copying: a gate with nothing behind it costs you every agent that cannot pass it and buys nothing.
        </p>
      </section>

      <section className="border-b border-rule py-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Scan a domain</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          One endpoint, one field. It returns a scorecard and a permanent link to the readable version.
        </p>
        <div className="mt-5">
          <Code>{`curl -X POST ${BASE}/api/scan \\
  -H 'content-type: application/json' \\
  -d '{"domain": "example.com"}'`}</Code>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
          The response carries <code className="font-mono text-xs">id</code>,{' '}
          <code className="font-mono text-xs">domain</code> and{' '}
          <code className="font-mono text-xs">scorecard</code>. Every check reports{' '}
          <code className="font-mono text-xs">points</code>, <code className="font-mono text-xs">max</code>{' '}
          and a human-readable <code className="font-mono text-xs">detail</code>. A check may also carry{' '}
          <code className="font-mono text-xs">inconclusive: true</code>, which means it scored zero because we
          could not measure it rather than because the thing is absent, or{' '}
          <code className="font-mono text-xs">notApplicable: true</code>, which means the check does not apply to
          a product of this kind. Treat those differently: they are our blind spot, not a defect in the site.
          Both are excluded from <code className="font-mono text-xs">measurable</code>, which is the denominator
          to divide by. Dividing by <code className="font-mono text-xs">max</code> reports a domain we could not
          fully read as worse than one we could, which is the one mistake this format exists to prevent.
        </p>
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
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Progress events</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          A scan usually takes a few seconds and can reach a minute, mostly because signup probes run three times: bot gates answer
          inconsistently and a single try would be a coin flip. If you would rather not wait in silence, the
          streaming endpoint emits the real steps as they happen.
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
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Credentials and provisioning</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          There are none. You do not create an API key, there is no management API to call and no service
          account to provision, because every endpoint is open. The limits are {PER_DOMAIN_PER_HOUR} scans an hour
          per domain and {PER_CALLER_PER_HOUR} per caller, and a domain scanned again within{' '}
          {REUSE_WINDOW_MS / 60000} minutes returns the stored result rather than a fresh one. Exceeding a limit
          returns 429 with a <code className="font-mono text-xs">retry-after</code> header telling you exactly how
          long to wait.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          There is also an MCP server at <span className="font-mono text-xs">/mcp</span>, Streamable HTTP, no
          authentication, one tool called <span className="font-mono text-xs">scan_domain</span>. It runs the same
          scan as the REST endpoint through the same limits, and the card describing it is at{' '}
          <span className="font-mono text-xs">/.well-known/mcp.json</span>.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          The home page registers the same <span className="font-mono text-xs">scan_domain</span> tool through{' '}
          <a href="https://webmachinelearning.github.io/webmcp/" className="text-brass underline underline-offset-4">
            WebMCP
          </a>
          , so an agent running inside a visitor&rsquo;s browser can call it without driving the form. It is in
          origin trial in Chrome 149+ and Edge 150+, read on {WEBMCP_READ_ON}, so on most visits{' '}
          <span className="font-mono text-xs">document.modelContext</span> is absent and nothing is registered.
          Nothing here depends on it: the endpoints above do the same work with no JavaScript at all, which is the
          argument this whole site makes.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Both surfaces take a <code className="font-mono text-xs">format</code>.{' '}
          <code className="font-mono text-xs">sarif</code> returns SARIF 2.1.0, so a scan can run in your pipeline
          and fail a build when the score drops. Only the failing checks become results: a clean domain handing a
          code-scanning pipeline sixteen alerts, one of them saying there was nothing to check, is worse than
          useless. The passing, unmeasured and not-applicable ones are counted in the run properties, so a clean
          sheet is still distinguishable from a scan that could not look.{' '}
          <code className="font-mono text-xs">agent</code> returns markdown tasks instead of a report: one task per
          failing check, each carrying the measurement behind it and a link to the rule, with the unmeasured checks
          listed separately and marked as not failures.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Every scan we publish is downloadable as one dataset: <span className="font-mono text-xs">/corpus.json</span>{' '}
          and <span className="font-mono text-xs">/corpus.csv</span>, one row per domain and check, with the
          verdict and the sentence it was measured from. Free to use and quote{' '}
          {CORPUS_LICENCE_IS_PUBLISHED ? (
            <Link href="/corpus-licence" className="text-brass underline underline-offset-4">
              under these terms
            </Link>
          ) : (
            'with attribution'
          )}
          , which makes it
          the fastest way to disagree with us.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Machine-readable descriptions of all of this live at{' '}
          <Link href="/openapi.json" className="text-brass underline underline-offset-4">
            /openapi.json
          </Link>
          , <span className="font-mono text-xs">/.well-known/agent-access.json</span>,{' '}
          <span className="font-mono text-xs">/.well-known/mcp.json</span> and{' '}
          <span className="font-mono text-xs">/agent-signup.md</span>.
        </p>
      </section>

      <section className="border-b border-rule py-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Refusals</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          The scanner fetches whatever you send it, so it refuses anything that is not a public host: IP
          literals, private and loopback ranges, link-local addresses including the cloud metadata endpoint,
          and names that do not resolve. Redirects are followed by hand and re-checked at every hop against
          the resolved address, because a public hostname is free to redirect into a private one.
        </p>
      </section>

      <section className="py-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Reading a scorecard</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          {CHECKS.length} checks across {STAGES.length} stages, {MAX_SCORE} points. The stages follow the order
          an agent actually meets them in, so a low score in an early stage makes the later ones academic: a
          site that refuses plain HTTP requests cannot be evaluated on its documentation, and the scorecard
          says so rather than scoring the same wall five times.
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
          . If a result looks wrong, it is reproducible with curl, and we would rather be corrected than be
          confidently wrong in someone else&rsquo;s inbox.
        </p>
      </section>
    </main>
  )
}
