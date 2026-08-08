import type { Metadata } from 'next'
import { AGENT_ENTRY_PATHS } from '@/lib/scan/funnel'
import { AI_CRAWLERS } from '@/lib/scan/robots'
import { CHECKS, FORMULA_VERSION, MAX_SCORE, STAGES } from '@/lib/score'

export const metadata: Metadata = {
  title: 'Methodology — StackPick',
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
          below is an HTTP request with a fixed rule. {CHECKS.length} checks, {MAX_SCORE} points.
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

      <section className="py-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Known limits</h2>
        <ol className="mt-5 flex flex-col gap-4">
          {[
            'llms.txt is scored, and we are not sure it is used. Across eighteen isolated agent runs in four categories, not one run cited it among its sources, and a ninety-day measurement published by another vendor found 84 requests to it against 62,100 AI-bot visits. Our own evidence is weaker than it sounds, because a run can fetch a file without naming it in its report, so we have not removed the point. We have stopped pretending the point is worth more than one, and if you are choosing what to do first, this is not it.',
            'A 429 is never a finding about you. If a host rate limits us, the checks that depended on reading it come back unmeasured and say so, because reporting our own traffic as your refusal would be an accusation. The door test also spaces its three tries, so we are not manufacturing the limit we would then have to explain.',
            'Pricing pages are read twice and the self-serve wording is the union of both reads. One vendor answered the same URL with and without its free-tier sentence forty minutes apart, which moved a scored point; the scorecard says when the two reads disagreed.',
            'The client registration check follows more than the apex: the signup origin, any MCP host, and the subdomains an authorization or resource server conventionally lives on. Finding nothing across all of them is a measurement, and the scorecard names the origins we probed so you can rerun exactly what we ran.',
            'Bot gates are not deterministic. The same signup endpoint answered 200 once and 403 four times during research, so gated checks run three times and the scorecard says when the tries disagreed.',
            'A passing file is not a passing experience. Publishing llms.txt scores a point here and still tells you nothing about whether an agent chose you. That is what the paid audit measures.',
            'Discovery can be wrong. Docs, pricing, signup and the npm package are inferred from your own links. The scorecard shows exactly what it found so you can see when it guessed badly.',
            'A soft 404 is treated as absence. Sites that answer 200 with an app shell for unknown paths are read as not having the file, which is also how an agent reads them.',
            'The provisioning checks read the documentation landing page plus at most three more, chosen by how directly a path promises credentials and taken from the sitemap when the navigation is assembled by JavaScript. Three pages out of a large documentation set is a sample, and the scorecard says how many pages it read, so a vendor whose credential page was not among them can tell us and we will rescan.',
            'A control probe runs before the agent-entry checks: we ask for a nonsense path first, and if the site answers it with a real document, every hit in that namespace is suppressed and the check is marked unmeasurable. Sentry answers any .md path with the same 976-byte page, which would otherwise have scored full marks on nine files that do not exist.',
            'The door test sends StackPick/1.0 three times and reports what came back next to what a Chrome user-agent got, so a site that serves browsers and refuses agents shows both numbers. Every other request in the scan is sent as a browser, because we are measuring the content, not the gate.',
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
