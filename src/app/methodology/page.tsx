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
                    <li key={check.id} className="grid grid-cols-[2.5rem_1fr] gap-4">
                      <span className="font-mono text-xs tabular-nums text-ink-faint">{check.max} pt</span>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">{check.label}</span>
                        <span className="text-sm leading-relaxed text-ink-soft">{check.why}</span>
                        <code className="font-mono text-xs text-ink-faint">{check.id}</code>
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

      <section className="py-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Known limits</h2>
        <ol className="mt-5 flex flex-col gap-4">
          {[
            'Bot gates are not deterministic. The same signup endpoint answered 200 once and 403 four times during research, so gated checks run three times and the scorecard says when the tries disagreed.',
            'A passing file is not a passing experience. Publishing llms.txt scores a point here and still tells you nothing about whether an agent chose you. That is what the paid audit measures.',
            'Discovery can be wrong. Docs, pricing, signup and the npm package are inferred from your own links. The scorecard shows exactly what it found so you can see when it guessed badly.',
            'A soft 404 is treated as absence. Sites that answer 200 with an app shell for unknown paths are read as not having the file, which is also how an agent reads them.',
            'A control probe runs before the agent-entry checks: we ask for a nonsense path first, and if the site answers it with a real document, every hit in that namespace is suppressed and the check is marked unmeasurable. Sentry answers any .md path with the same 976-byte page, which would otherwise have scored full marks on nine files that do not exist.',
            'Scanning with a browser user agent is a deliberate choice and a known bias. A site that refuses ChatGPT-User while allowing Chrome scores better here than it deserves. Measured on five domains, the status was identical for all four agents tried, but that is a sample, not a guarantee.',
            'The npm package match on a registry search is ranked by weekly downloads, so a change in what the registry returns can change that one check without anything changing on the scanned domain. Every guess is labelled as one in the report.',
            'The score depends on where the request comes from. Sites behind an aggressive WAF answer a data-centre address differently from a home connection: one domain scored 9 from a laptop and 2 from our server on the same day. We scan from a data centre on purpose, because that is where ChatGPT and Claude reach you from, so the harsher number is the one your customers actually meet.',
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
