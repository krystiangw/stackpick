import type { Metadata } from 'next'
import { AGENT_ENTRY_PATHS, PROVISIONING_PATTERN_LABELS } from '@/lib/scan/funnel'
import { AI_CRAWLERS } from '@/lib/scan/robots'
import { CHECKS, FORMULA_VERSION, MAX_SCORE, STAGES } from '@/lib/score'

export const metadata: Metadata = {
  title: 'Methodology: Let Agents In',
  description: 'Every check, its rule and why it costs a vendor money. The formula is published so the score can be reproduced.',
}

const CLASS_COST: Record<string, string> = {
  training: 'Blocking it keeps you out of model weights.',
  search: 'Blocking it keeps you out of cited answers.',
  user: 'Blocking it stops your customer’s agent from reading your docs mid-integration.',
}

export default function MethodologyPage() {
  return (
    <main className="mx-auto max-w-5xl px-6">
      <section className="border-b border-rule py-14">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">Formula v{FORMULA_VERSION}</p>
        <h1 className="mt-4 max-w-2xl text-balance text-4xl font-semibold leading-tight tracking-tight">
          The whole formula, published, so the number can be argued with.
        </h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
          Scanners in this category derive a score from a single call to a language model. That number does
          not reproduce, and asking a vendor to act on it is asking them to trust a coin flip. Every check
          below is an HTTP request with a fixed rule. {CHECKS.length} checks, {MAX_SCORE} points. Every result
          we publish is downloadable at{' '}
          <a href="/corpus.json" className="text-brass underline underline-offset-4">
            /corpus.json
          </a>
          , because arguing with a formula is easier with the data than with the prose.
        </p>
      </section>

      <section className="border-b border-rule py-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Checks</h2>
        <div className="mt-6 flex flex-col gap-8">
          {STAGES.map((stage) => {
            const checks = CHECKS.filter((check) => check.stage === stage.id)
            const stageMax = checks.reduce((sum, check) => sum + check.max, 0)
            return (
              <div key={stage.id}>
                <h3 className="flex items-baseline gap-3 border-b border-rule pb-2">
                  <span className="font-mono text-sm text-brass">{stage.letter}</span>
                  <span className="font-mono text-sm font-medium">{stage.title}</span>
                  <span className="text-xs text-ink-faint">{stage.question}</span>
                  <span className="ml-auto font-mono text-xs tabular-nums text-ink-faint">{stageMax} pts</span>
                </h3>
                <ul className="mt-4 flex flex-col gap-4">
                  {checks.map((check) => (
                    <li key={check.id} id={check.id} className="grid scroll-mt-24 grid-cols-[2.5rem_1fr] gap-4">
                      <span className="font-mono text-xs tabular-nums text-ink-faint">{check.max} pt</span>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">{check.label}</span>
                        <span className="text-sm leading-relaxed text-ink-soft">{check.why}</span>
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
          robots.txt names bots, and the names fall into three classes that cost you completely different
          things. Pasting an “AI bots” list off the internet blocks all three at once, which is how companies
          cut off their own prospects without noticing.
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
          None of these is a ratified standard yet. They are the paths that reference implementations
          actually publish, and a hit on any of them means someone wrote a procedure for a machine.
        </p>
        <p className="mt-4 font-mono text-xs leading-relaxed text-ink-soft">{AGENT_ENTRY_PATHS.join('  ·  ')}</p>
      </section>

      <section className="border-b border-rule py-12">
        <h2 className="text-lg font-semibold tracking-tight">Three verdict states, and what the score is out of</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Sixteen points exist on paper. A domain is scored out of the points that both apply to it and we
          could evaluate, and the scorecard prints that denominator beside the number. Charging a vendor for
          our own blind spots would make a site we could not read look worse than one we could.
        </p>
        <dl className="mt-6 flex max-w-2xl flex-col">
          {[
            ['PASS and PART', 'Measured, and counted in both the score and the denominator.'],
            [
              'UNMEASURED',
              'We could not evaluate it: an edge that refused our requests, a form assembled by JavaScript, too few documentation pages to conclude anything. Out of the score and out of the denominator, and each of these lines says what would make it measurable.',
            ],
            [
              'N/A',
              'The check does not apply to a product of this kind. A library with no accounts cannot fail a check about signup gates. Out of the score and out of the denominator.',
            ],
          ].map(([state, meaning]) => (
            <div key={state} className="grid gap-1 border-t border-rule py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
              <dt className="font-mono text-sm">{state}</dt>
              <dd className="text-sm leading-relaxed text-ink-soft">{meaning}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Rankings and the industry report sort on the share of measurable points, which is why a smaller
          number can sit above a larger one: 6 of 9 is ahead of 8 of 14.
        </p>
      </section>

      {/* The number a reader needs before they compare two of our own scans and conclude something
          from a single row that moved. Measured rather than estimated, so it is printed. */}
      <section className="border-b border-rule py-12">
        <h2 className="text-lg font-semibold tracking-tight">How much the corpus moves on its own</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          On 10 August 2026 we rescanned all 167 domains twice, with no rule changed between the two runs,
          and compared every verdict: 15 of 2,338 moved, which is 0.64 percent. That is the floor. A
          difference smaller than it, in our numbers or in yours, is the internet being the internet rather
          than something that changed.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          It is not evenly spread. Nine of the fifteen sit in the three checks that depend on a host
          answering us at all, and the rest are single rows. We chased two of them rather than assume:
          name.com went from refusing us to answering, and answers a browser and both of our user-agent
          strings identically three times over, so the change was theirs and transient. froala.com answers
          403, 200, 403 in the same alternating pattern to a browser as to us, so its row moving is froala
          being froala.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          The uncomfortable consequence, printed because it is true: our own adversarial audits put the
          error rate in these verdicts at 0.39 percent, which is below this floor. Those are different
          measurements, a wrong rule against an unstable network, but it does mean no single row is
          evidence on its own. Rescan before you act on one, and treat the checks above the fold as the
          durable part.
        </p>
      </section>

      <section className="border-b border-rule py-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">We are scored by this too</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          This site is in the scanner like anybody else, and it fails a check we publish. There is no OAuth
          metadata on any host we run, so an agent cannot register itself as a client with us. The reason is
          that our MCP server needs no account at all, which makes the check inapplicable in spirit and
          failing in fact, and we would rather show the failing row than write ourselves an exemption nobody
          else gets. Scan the domain in the box on any page and you will get the same card a vendor gets.
        </p>
      </section>

      {/* A reader who has found the alternatives will trust us less for not naming them, and the
          comparison is favourable in the only place it matters, so hiding it would cost more than
          it buys. Their numbers, checked in their own published spec on 10 August 2026. */}
      <section className="border-b border-rule py-12">
        <h2 className="text-lg font-semibold tracking-tight">What the other scanners measure</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          <a href="https://agent-ready.dev" className="text-brass underline underline-offset-4">
            agent-ready.dev
          </a>{' '}
          runs 70 checks against the Vercel Agent Readability Spec, llmstxt.org and a dozen protocol
          manifests, plus 23 accessibility checks. On discovery and parsing it is more thorough than we are
          and we would send you there for that: if you want to know whether your markdown mirrors, canonical
          tags and structured data are right, they will tell you and we will not.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Their published specification contains the words signup, provisioning and CAPTCHA zero times. Their
          own summary is discovery, structure, context: can an agent find your pages, parse them, understand
          them. That is the stage this corpus measures as 95 percent solved. Ours starts at the next one,
          where the same corpus measures 26 percent, and the difference is not a disagreement about scoring:
          they answer whether an agent can read you, we answer whether one can join you.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Two of their checks were better than ours and are now in the scanner: whether the links inside
          llms.txt still answer, and whether a site serves an agent user-agent less than it serves a browser.
          We took neither of their per-page SEO checks, because a check nearly everybody passes moves a score
          without deciding anything.{' '}
          <a href="https://github.com/kodustech/agent-readiness" className="text-brass underline underline-offset-4">
            kodustech/agent-readiness
          </a>{' '}
          is a different axis again: it grades your own repository for whether a coding agent can work inside
          it, which is a question about your codebase rather than about your funnel.
        </p>
      </section>

      <section className="py-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Known limits</h2>
        <ol className="mt-5 flex flex-col gap-4">
          {[
            'llms.txt does two different jobs and the evidence on them points opposite ways, so here is both halves. As a thing crawlers pull, it is close to dead: Ahrefs looked at 137,210 domains in June 2026 and found 97 per cent of published files served no traffic at all, Otterly measured 84 requests to it against 62,100 AI-bot visits over ninety days, and John Mueller said in June 2025 that no AI system uses it. As a map an agent working on a task reads, it earns its point: Mintlify ran 2,400 agent tasks across twenty documentation sites in July 2026 and averaged 2.23 wrong URLs per task on HTML, 1.42 on plain markdown, and 0.11 when an llms.txt pointed the way. We score the second job, because that is the one that ends in somebody using your API. Our own eighteen runs never cited the file, which is weaker evidence than it sounds, since a run can read a file without naming it. One point, and if you are choosing what to do first, this is not it.',
            'We ask as ourselves and as two named crawlers, and only at the documentation page we picked. amplitude.com answers ClaudeBot 404 at one documentation URL and 200 at another, so a pass here means the page we read was served, not that every page is. A refusal we do find is reported; a refusal one path away is not something we looked for.',
            'A 429 is never a finding about you. If a host rate limits us, the checks that depended on reading it come back unmeasured and say so, because reporting our own traffic as your refusal would be an accusation. The door test also spaces its three tries, so we are not manufacturing the limit we would then have to explain.',
            'Pricing pages are read twice and the self-serve wording is the union of both reads. One vendor answered the same URL with and without its free-tier sentence forty minutes apart, which moved a scored point; the scorecard says when the two reads disagreed.',
            'The client registration check follows more than the apex: the signup origin, any MCP host, and the subdomains an authorization or resource server conventionally lives on. It also follows the pointer rather than stopping at the host: a protected-resource document names the authorization servers that guard it, and we read those too, in both of the well-known layouts deployments use, with the issuer path before or after the well-known segment. Finding nothing across all of them is a measurement, and the scorecard names the origins we probed so you can rerun exactly what we ran.',
            'Bot gates are not deterministic. The same signup endpoint answered 200 once and 403 four times during research, so gated checks run three times and the scorecard says when the tries disagreed.',
            'A passing file is not a passing experience. Publishing llms.txt scores a point here and still tells you nothing about whether an agent chose you. That is what the paid audit measures.',
            'Discovery can be wrong. Docs, pricing, signup and the npm package are inferred from your own links. The scorecard shows exactly what it found so you can see when it guessed badly.',
            'A soft 404 is treated as absence. Sites that answer 200 with an app shell for unknown paths are read as not having the file, which is also how an agent reads them.',
            `The provisioning check reads the documentation landing page, at most three more chosen by how directly a path promises credentials, and any llms.txt files you publish, which is why the scorecard often says more than four documents. It looks for these seven phrases and names the ones it found: ${PROVISIONING_PATTERN_LABELS.join('; ')}. A sample of a large documentation set is still a sample, so a vendor whose credential page was not among them can tell us and we will rescan.`,
            'A control probe runs before the agent-entry checks: we ask for a nonsense path first, and if the site answers it with a real document, every hit in that namespace is suppressed and the check is marked unmeasurable. Sentry answers any .md path with the same 976-byte page, which would otherwise have scored full marks on nine files that do not exist. The MCP check runs the same control, because almost every site answers 405 to a POST at a path it does not route: an address only counts when it answers the handshake differently from an unrouted one, or challenges for OAuth with a WWW-Authenticate header.',
            'The door test sends LetAgentsIn/1.0 three times and reports what came back next to what a Chrome user-agent got, so a site that serves browsers and refuses agents shows both numbers. Every other request in the scan is sent as a browser, because we are measuring the content, not the gate.',
          ].map((limit, index) => (
            <li key={limit} className="grid grid-cols-[2rem_1fr] gap-4">
              <span className="font-mono text-xs text-ink-faint">{String(index + 1).padStart(2, '0')}</span>
              <span className="text-sm leading-relaxed text-ink-soft">{limit}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}
