import type { Metadata } from 'next'
import Link from 'next/link'
import { buildIndustryReport } from '@/lib/industry'
import { NOISE_FLOOR_PERCENT, publishedCorpus } from '@/lib/published'
import { AGENT_ENTRY_PATHS, PROVISIONING_PATTERN_COUNT, PROVISIONING_PATTERN_LABELS } from '@/lib/scan/funnel'
import { AI_CRAWLERS } from '@/lib/scan/robots'
import { MAX_BYTES_PER_RESPONSE } from '@/lib/scan/http'
import { verdictOf } from '@/lib/corpus'
import { SITE_URL } from '@/lib/site'
import { getStore, type Report } from '@/lib/store'
import { CHECKS, FORMULA_VERSION, MAX_SCORE, STAGES } from '@/lib/score'
import { recordVisit } from '@/lib/visits'
import { headers } from 'next/headers'

/** Kiedy policzylismy liczby CUDZEGO skanera. Straznik oblewa build, gdy zrobi sie starsza niz 60 dni. */
const RIVALS_READ_ON = '19 August 2026'

export const metadata: Metadata = {
  alternates: { canonical: `${SITE_URL}/methodology` },
  title: 'Methodology: Let Agents In',
  description: 'The scoring formula, HTTP checks, measurement limits and recorded agent-run method.',
}

const CLASS_COST: Record<string, string> = {
  training: 'Controls crawling for model training; it does not remove existing training data.',
  search: 'Controls the named search crawler; citations can also come from other sources.',
  user: 'Controls a named on-demand fetcher when it requests your pages.',
}

/**
 * How many typed_package verdicts rest on the weakest of the four ways we identify a package.
 * Computed on every render rather than written down, because the ratio moves with every reseed and
 * a hand-typed share is a claim that quietly stops being true.
 */
function evidenceForPackages(reports: Report[]) {
  // Reads the published reports rather than building the corpus. buildCorpus runs erratumFor,
  // otherDomainsNamed and refusesAgentsAtSignup over 170 rows and 15 checks each, and this page
  // wants two fields; the outage on 2026-08-12 was a crawler opening seventy pages at once.
  const measured = reports.filter((report) => {
    const check = report.scorecard.checks.find((c) => c.id === 'typed_package')
    return check !== undefined && ['pass', 'partial', 'fail'].includes(verdictOf(check))
  })
  return {
    measured: measured.length,
    registrySearch: measured.filter((report) => report.findings?.discovered?.npmSource === 'registry-search').length,
  }
}

/**
 * Our own scorecard, from the most recent scan of this site. Computed rather than typed, and
 * published for the reason a reader should ask about first: a scanner that grades 170 companies
 * and never shows its own row is asking for trust it has not offered.
 */
function ourOwnRow(report: Report | null) {
  if (!report) return null
  const failing = report.scorecard.checks.filter(
    (check) => !check.inconclusive && !check.notApplicable && check.points < check.max,
  )
  return {
    total: report.scorecard.total,
    measurable: report.scorecard.measurable,
    scannedAt: report.scannedAt.slice(0, 10),
    failing: failing.map((check) => check.id),
    reportId: report.id,
  }
}

export default async function MethodologyPage() {
  // Computed, because both numbers were written by hand in a sentence comparing us to another
  // tool, and one of them had drifted from 95 to 91 without anybody noticing. The guard only
  // watches /findings, so a hardcoded number here is a number nothing recomputes.
  const report = await buildIndustryReport()
  const packageEvidence = evidenceForPackages((await publishedCorpus()).reports)
  const ours = ourOwnRow(await getStore().latestForDomain(new URL(SITE_URL).hostname.replace(/^www\./, '')))
  const shareOf = (stage: string) =>
    Math.round((report?.stages.find((row) => row.stage === stage)?.share ?? 0) * 100)
  const discoveryShare = shareOf('discovery')
  const entryShare = shareOf('entry')
  recordVisit('/methodology', (await headers()).get('user-agent'))
  return (
    <main className="mx-auto max-w-5xl px-6">
      <section className="border-b border-rule py-14">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">Formula v{FORMULA_VERSION}</p>
        <h1 className="mt-4 max-w-2xl text-balance text-4xl font-semibold leading-tight tracking-tight">
          Scoring formula and method
        </h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
          {CHECKS.length} HTTP checks with fixed rules, worth up to {MAX_SCORE} points.
          Download the published measurements at{' '}
          <a href="/corpus.json" className="text-brass underline underline-offset-4">/corpus.json</a>.
          The score describes public signals; integration success requires a separate task test.
        </p>
        <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2 text-sm">
          {[['checks', 'Checks'], ['noise', 'Repeatability'], ['series', 'Monitoring'], ['named', 'Agent counts'], ['limits', 'Limits']].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="nav-link border border-rule">{label}</a>
          ))}
        </nav>
      </section>

      <section className="border-b border-rule py-12">
        <h2 id="checks" className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Checks</h2>
        <div className="mt-6 flex flex-col gap-8">
          {STAGES.map((stage) => {
            const checks = CHECKS.filter((check) => check.stage === stage.id)
            const stageMax = checks.reduce((sum, check) => sum + check.max, 0)
            return (
              <div key={stage.id}>
                <h3 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-rule pb-2">
                  <span className="font-mono text-sm text-brass">{stage.letter}</span>
                  <span className="font-mono text-sm font-medium">{stage.title}</span>
                  <span className="text-xs text-ink-faint">{stage.question}</span>
                  <span className="w-full sm:ml-auto sm:w-auto font-mono text-xs tabular-nums text-ink-faint">{stageMax} pts</span>
                </h3>
                <ul className="mt-4 flex flex-col gap-4">
                  {checks.map((check) => (
                    <li key={check.id} id={check.id} className="grid scroll-mt-24 grid-cols-[2.5rem_1fr] gap-4">
                      <span className="font-mono text-xs tabular-nums text-ink-faint">{check.max} pt</span>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">{check.label}</span>
                        <span className="text-sm leading-relaxed text-ink-soft">{check.why}</span>
                        {/* One check rests mostly on the weakest of its four ways of identifying a
                            package, and a reader weighing a point should be told which. The share
                            is computed rather than typed, because a number nobody recomputes is a
                            number that drifts. */}
                        {check.id === 'typed_package' && packageEvidence.registrySearch > 0 && (
                          <span className="text-sm leading-relaxed text-ink-faint">
                            {packageEvidence.registrySearch} of {packageEvidence.measured} measured rows rely on registry publisher matching.
                            This is weaker than a package link on the vendor site, in llms.txt or in documentation.
                            <code>corpus.json</code> records the source as <code>npmSource</code>.
                          </span>
                        )}
                        {/* The anchor is the helpUri every machine-readable result points at. */}
                        <a href={`#${check.id}`} className="font-mono text-xs text-ink-faint hover:text-brass">
                          <code>{check.id}</code>
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      <section className="border-b border-rule py-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">The three crawler classes</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          The named bots fall into three classes. A robots.txt rule can allow or refuse each class separately.
        </p>
        <div className="mt-6 flex flex-col">
          {(['training', 'search', 'user'] as const).map((crawlerClass) => (
            <div key={crawlerClass} className="border-t border-rule py-4">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-mono text-sm font-medium">{crawlerClass}</span>
                <span className="text-sm text-ink-soft">{CLASS_COST[crawlerClass]}</span>
              </div>
              <p className="mt-2 font-mono text-xs text-ink-faint">
                {AI_CRAWLERS.filter((crawler) => crawler.class === crawlerClass)
                  .map((crawler) => crawler.name)
                  .join(' · ')}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-rule py-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Agent entry paths probed</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          These candidate paths come from reference implementations. A matching file is a discovery signal, not proof that an integration works.
        </p>
        <p className="mt-4 font-mono text-xs leading-relaxed text-ink-soft">{AGENT_ENTRY_PATHS.join('  ·  ')}</p>
      </section>

      <section className="border-b border-rule py-12">
        <h2 className="text-lg font-semibold tracking-tight">Verdicts and the score denominator</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          The maximum is {MAX_SCORE} points. Each domain is scored out of the applicable points we could measure.
          The scorecard prints that denominator beside the score.
        </p>
        <dl className="mt-6 flex max-w-2xl flex-col">
          {[
            ['PASS, PART and FAIL', 'Measured. Earned points enter the score; the check maximum enters the denominator.'],
            [
              'UNMEASURED',
              'We could not evaluate the check. Examples include refused requests, JavaScript forms and insufficient documentation. Excluded from the score and denominator, with a reason.',
            ],
            [
              'N/A',
              'The check does not apply to this product type, such as signup for a library without accounts. Excluded from the score and denominator.',
            ],
          ].map(([state, meaning]) => (
            <div key={state} className="grid gap-1 border-t border-rule py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
              <dt className="font-mono text-sm">{state}</dt>
              <dd className="text-sm leading-relaxed text-ink-soft">{meaning}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Rankings use the share of measurable points. For example, 6 of 9 is ahead of 8 of 14.
        </p>
      </section>

      <section id="noise" className="border-b border-rule py-12">
        <h2 className="text-lg font-semibold tracking-tight">Repeatability</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          The recorded noise floor is {NOISE_FLOOR_PERCENT.toFixed(2)} percent of verdicts.
          It measures variation between rescans across the corpus. Recheck an individual result before acting on it.
        </p>
        <div className="mt-6 overflow-x-auto" tabIndex={0} role="region" aria-label="Noise measurements">
          <table className="w-full min-w-[36rem] text-sm">
            <thead><tr className="border-b border-rule text-left"><th className="p-3">Measurement</th><th className="p-3">Sample</th><th className="p-3">Observed movement</th></tr></thead>
            <tbody>
              <tr className="border-b border-rule"><td className="p-3">10 August 2026</td><td className="p-3">167 domains, 2,338 verdicts; unchanged rules</td><td className="p-3">15 verdicts, 0.64%</td></tr>
              <tr className="border-b border-rule"><td className="p-3">Earlier pairs, formula 9.8</td><td className="p-3">Two passes within one sweep</td><td className="p-3">0.39% before three repairs; 0.20% after</td></tr>
              <tr className="border-b border-rule"><td className="p-3">17 August 2026</td><td className="p-3">170 domains, 2,550 verdicts; warm passes six hours apart, same formula</td><td className="p-3">15 verdicts, {NOISE_FLOOR_PERCENT.toFixed(2)}%; 9 up, 6 down</td></tr>
              <tr className="border-b border-rule"><td className="p-3">17 August breakdown</td><td className="p-3">10 changed verdicts; 5 changed measurability</td><td className="p-3">0.39% excluding measurability changes</td></tr>
              <tr className="border-b border-rule"><td className="p-3">Adversarial rule audits</td><td className="p-3">Separate measurement of incorrect verdicts</td><td className="p-3">0.39% recorded error rate</td></tr>
              <tr className="border-b border-rule"><td className="p-3">13 August 2026 manual pass</td><td className="p-3">282 verdicts in the checked families</td><td className="p-3">No errors found; does not replace the earlier error rate</td></tr>
            </tbody>
          </table>
        </div>
        <details className="mt-6 rounded-lg border border-rule p-5">
          <summary className="cursor-pointer font-medium">What changed in the measurements</summary>
          <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-relaxed text-ink-soft">
            <li>Within-sweep pairs mixed a cold npm cache with a warm one. The last such pair moved 27 verdicts up and 3 down.</li>
            <li>The 17 August pair used warm passes from separate sweeps. It replaced a formula 9.8 measurement made twelve days and over twenty rule changes earlier.</li>
            <li>The scanner allows 27 seconds per domain. One run exhausted that budget on two domains, leaving eleven verdicts unmeasured. Repeating them reduced movement from 23 rows to 12. Truncated scans are now retried.</li>
            <li>Two other repairs treated catch-all empty 202 responses as unmeasured and stopped inferring absent accounts from a missing link when prices were published.</li>
            <li>The earlier 0.20% result contained five unstable rows: two MCP endpoints, two refused documentation pages, and one page varying by discovery path. A scan requests about nineteen documents within its 27-second budget.</li>
            <li>Nine of the fifteen rows in the newer pair depended on host responses. name.com answered browser and both agent user-agents identically in three repeated checks. froala.com alternated 403, 200, 403 for the browser too.</li>
            <li>The 13 August manual pass covered signup CAPTCHA markers, confirmed 404s, OAuth discovery on nine hosts and entry files on nine paths. Positive controls accompanied the probes. Its coverage was limited to those families.</li>
          </ul>
        </details>
      </section>

      {/* A monitored customer cannot check any of this themselves: they see one email or no email,
          and the only thing that makes the series worth paying for is knowing which movements we
          refuse to attribute to them. Written from watch.ts rather than about it. */}
      <section id="series" className="scroll-mt-8 border-b border-rule py-12">
        <h2 className="text-lg font-semibold tracking-tight">When monitoring sends an alert</h2>
        <dl className="mt-5 divide-y divide-rule">
          {[
            ['Same formula', 'The earlier measurement is rescored under the current formula before comparison. If it cannot be rescored, no email is sent.'],
            ['Comparable evidence', 'Checks whose scan-time interpretation changed are excluded when stored evidence cannot support the new rule. Release 9.32 changed provisioning evidence; nineteen vendors were protected from a misleading comparison.'],
            ['Measured on both sides', 'A change to or from unmeasured does not trigger an alert by itself. In one within-sweep pair, 21 of 22 changes were unmeasured to pass; sixteen came from the npm cache.'],
            ['Rate limits and challenges', 'A 429 is retried, then recorded as unmeasured if it persists. An unresolved browser challenge from the vendor edge can trigger an alert. A challenge the scanner passed does not.'],
          ].map(([title, body]) => <div key={title} className="grid gap-2 py-4 sm:grid-cols-[12rem_1fr]"><dt className="font-medium">{title}</dt><dd className="max-w-2xl text-sm leading-relaxed text-ink-soft">{body}</dd></div>)}
        </dl>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
          One changed, comparable verdict can trigger an email. The {NOISE_FLOOR_PERCENT.toFixed(2)} percent corpus noise floor is a reason to verify it before making a change.
        </p>
      </section>

      {/* The category pages link here under "how every number here is measured" and, until an
          audit on 2026-08-17 followed that link, this page described only the scanner. A link that
          does not answer the question it promises is worse than no link. */}
      <section id="named" className="scroll-mt-8 border-b border-rule py-12">
        <h2 className="text-lg font-semibold tracking-tight">How the agent runs are counted</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Each category has a buying question that names no vendor. A batch asks it five times in separate sessions and empty directories.
          The complete answers are published under the category.
        </p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-rule p-5"><dt className="font-medium">Named</dt><dd className="mt-2 text-sm text-ink-soft">Number of runs that mentioned a vendor.</dd></div>
          <div className="rounded-lg border border-rule p-5"><dt className="font-medium">Named first</dt><dd className="mt-2 text-sm text-ink-soft">Number of runs that mentioned it before any other vendor we measure. This records order, not a purchase.</dd></div>
        </dl>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
          A published name list and regular expression count mentions. Common-word brands need emphasis, code, a link, all capitals, or repeated capitalised use.
          “the bunny hops” does not count as bunny.net; “**Sanity**” counts as sanity.io.
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Five runs are a small sample. They do not rank close results or estimate real buyer choices.
          Some batches could read local instructions requesting Polish. Those answers describe that setup.
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
          A second tool repeated the set without reading those instructions and answered in English.
          The findings page reports the two check associations that appeared on Claude Code and Codex across all 26 categories.
          Additional tools on selected category pages are outside that comparison.
        </p>
      </section>

      {/* A reader who has found the alternatives will trust us less for not naming them, and the
          comparison is favourable in the only place it matters, so hiding it would cost more than
          it buys.

          The date is in the prose rather than here, because it is a claim about somebody else's
          product and it decays on their schedule: the neighbouring page said AgentReady had 28
          requirements and it had 30 a day later. A rule fails the build when this date goes stale,
          so the numbers get re-read rather than quietly ageing in a comment nobody opens. */}
      <section className="border-b border-rule py-12">
        <h2 className="text-lg font-semibold tracking-tight">What the other scanners measure</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          <a href="https://agent-ready.dev" className="text-brass underline underline-offset-4">
            agent-ready.dev
          </a>{' '}
          runs 70 checks against the Vercel Agent Readability Spec, llmstxt.org and a dozen protocol manifests,
          plus 23 accessibility checks, counted on their own pages on {RIVALS_READ_ON}.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Its specification focuses on discovery, structure and context. The words signup, provisioning and CAPTCHA appeared zero times in that reading.
          Our corpus earned {discoveryShare} percent of discovery points and {entryShare} percent of agent-entry points.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Two checks informed ours: llms.txt link health and differences between browser and agent responses. Per-page SEO checks remain outside this score.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          <a href="https://github.com/kodustech/agent-readiness" className="text-brass underline underline-offset-4">kodustech/agent-readiness</a>{' '}
          evaluates whether a coding agent can work in your repository.
        </p>
      </section>

      {ours && (
        <section className="border-b border-rule py-12">
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">What we score</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
            On {ours.scannedAt}, this site scored{' '}
            <span className="font-mono tabular-nums">
              {ours.total} of {ours.measurable}
            </span>{' '}
            points here, and{' '}
            <Link href={`/r/${ours.reportId}`} className="text-brass underline underline-offset-4">
              the scorecard is public
            </Link>{' '}
            .
            {ours.failing.length > 0 && (
              <>
                {' '}
                {/* One expression rather than a wrapped sentence, which is a readability choice
                    and nothing more: the two commits that split it were chasing a space that my
                    own tag-stripping extraction had added, not the page. */}
                We fail <code>{ours.failing.join(', ')}</code>{'. Our MCP tool requires no credential. The scan discovers no OAuth client-registration path.'}
              </>
            )}
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Lighthouse 13.4.1 scored this site 92 of 100 for SEO on 19 August 2026.
            Its deduction was <code>AI-Catalog:</code> in <a href="/robots.txt" className="text-brass underline underline-offset-4">robots.txt</a>.
            The same version accepted <code>Content-Signal:</code>. RFC 9309 allows parsers to ignore unknown lines. We retain the catalog directive.
          </p>
        </section>
      )}

      <section id="limits" className="py-12">
        <h2 className="text-lg font-semibold tracking-tight">Limits and probe rules</h2>
        <p className="mt-3 max-w-2xl text-sm text-ink-soft">Open a rule for its threshold, exception and recorded examples.</p>
        <div className="mt-5 space-y-3">
          {[
            { title: 'llms.txt: a navigation signal', body: 'The file earns one point as a map of documentation. It does not establish agent selection. Our eighteen build runs never cited it; a run may read a file without citing it.\n\nAhrefs reported 137,210 domains in June 2026, with 97 percent of published files serving no traffic. Otterly reported 84 requests against 62,100 AI-bot visits over ninety days. John Mueller said in June 2025 that no AI system used it.\n\nMintlify tested 2,400 tasks across twenty documentation sites in July 2026. Wrong URLs averaged 2.23 per task on HTML, 1.42 on markdown and 0.11 with an llms.txt map. These studies measure different uses; none establishes a priority fix for a specific vendor.' },
            { title: 'Agent user-agents: page-specific observations', body: 'The scanner requests the selected documentation page as itself, ChatGPT-User and Claude-User. A JavaScript challenge also triggers probes of the home page. Training crawlers are outside this check.\n\namplitude.com returned 404 for one documentation URL and 200 for another. bitmovin.com challenged our scanner but served Claude-User the page. A pass applies to the page tested.' },
            { title: 'Rate limits do not subtract points', body: 'A 429 is retried. If it persists, dependent checks are unmeasured. Signup probes are spaced apart.\n\nA challenge marker is reported separately, with the host and request count. It still costs no points. A browser-capable agent may behave differently from this HTTP client.' },
            { title: 'Pricing is read twice', body: 'Self-serve wording is the union of both reads. One vendor changed its free-tier sentence between reads forty minutes apart. The scorecard records disagreements.' },
            { title: 'OAuth discovery follows hosts and issuers', body: 'The check follows the apex, signup origin, MCP host and conventional authorization or resource-server subdomains. Protected-resource metadata can lead to authorization servers. Both well-known layouts are tried, with the issuer path before or after the well-known segment.\n\nThe scorecard lists attempted origins. Since 9.33, requests skipped after an earlier connection failure or timeout do not count as attempts. If no request was sent, the check is unmeasured.' },
            { title: 'Price snippets use the description or opening text', body: 'The check reads the pricing-page description tag, or opening text if the tag is absent. It does not use the rest of the page. An amount, rate or entry condition such as free, no card or no account passes. The check is worth one point.' },
            { title: 'Signup gates are retried', body: 'Gated checks run up to three times. The scorecard records the number of attempts and any disagreement. During research, one endpoint returned 200 once and 403 four times.' },
            { title: 'A passing file does not establish integration success', body: 'The scan measures HTTP signals. Agent recommendations and task-based integration audits are separate measurements.' },
            { title: 'Discovery can select the wrong page', body: 'Documentation, pricing, signup and npm-package paths are inferred from links. The scorecard names the selected pages so you can identify a bad match.' },
            { title: 'Response size and discovery limits', body: `Each response is capped at ${MAX_BYTES_PER_RESPONSE.toLocaleString('en-US')} bytes. Checks depending on a truncated document are unmeasured and name the cap. filestack.com returned 12,282 characters to a full quickstart read and 53 to ours.\n\nSince 9.50, the ceiling stopped deciding which of your pages we read without a control comparison. A truncated guessed path is compared with an unregistered address. Matching oversized responses indicate a shared shell; if the control does not answer, we skip the path.\n\nOn 2026-08-20, 885 requests produced 114 responses above the cap. The old rule had excluded 16 paths on nine domains.` },
            { title: 'Soft 404s count as absence', body: 'An application shell returned for an unknown path does not establish that the requested file exists.' },
            { title: 'Provisioning uses a limited documentation sample', body: `The check reads the documentation landing page, at most three additional credential-related pages, and discovered llms.txt files. It tests ${PROVISIONING_PATTERN_COUNT} phrases: ${PROVISIONING_PATTERN_LABELS.join('; ')}.\n\nA creation phrase requires programmatic context in the same sentence. Since 9.32, three bare phrases also require a credential or creation context. A menu label alone does not count.\n\nThe repair followed a review where twenty-eight of eighty credited rows depended on bare wording. Examples included "Media management API integration", "Content Delivery API Management API Image Service" and "Important Change to the Twilio Phone Number Provisioning API".\n\nThe scorecard quotes the matching sentence. A missing credential page can change the conclusion; send its URL for a rescan.` },
            { title: 'Control probes distinguish files from catch-all responses', body: 'An unregistered path is requested in the same namespace with the same Accept header. Each entry file is compared with that response. Per file, not per namespace.\n\nsentry.io returned a 976-byte page for unknown .md paths and a real 106-byte descriptor. If the control times out, is rate limited or is refused, the check says it could not tell.\n\nMCP uses the same control. A bare 405 can also be an unrouted POST response. An address can count through a handshake, WWW-Authenticate, an MCP-specific host, or a response differing from an unrouted path on the origin.\n\nWhen the answer is one only a control can read, a missing control makes it unmeasured. This applies to refusals, empty 202s and bare 405s. A handshake, a JSON body or an OAuth challenge needs no control and still counts.' },
            { title: 'Signup request identity and budget', body: 'LetAgentsIn/1.0 is sent up to three times, stopping early if the scan budget is nearly exhausted. Results appear beside a Chrome user-agent response. Other requests use a browser user-agent, except the named-agent probes described above.' },
            { title: 'WebMCP is outside this HTTP scan', body: `The W3C Web Machine Learning Community Group draft of 26 August 2026 registers tools through document.modelContext at runtime. Detecting them requires a browser and getTools(); this scanner executes no JavaScript.\n\nLighthouse included three WebMCP audits on ${RIVALS_READ_ON}. This site registers its own scan tool on the home page. No WebMCP result is inferred for other sites from their HTML.` },
          ].map((limit, index) => (
            <details key={limit.title} className="rounded-lg border border-rule bg-surface px-5 py-4">
              <summary className="cursor-pointer text-sm font-medium"><span className="mr-3 font-mono text-xs text-brass">{String(index + 1).padStart(2, '0')}</span>{limit.title}</summary>
              <div className="mt-4 max-w-3xl space-y-3">{limit.body.split('\n\n').map((paragraph) => <p key={paragraph} className="text-sm leading-relaxed text-ink-soft">{paragraph}</p>)}</div>
            </details>
          ))}
        </div>
      </section>
    </main>
  )
}
