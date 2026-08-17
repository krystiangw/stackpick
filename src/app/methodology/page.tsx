import type { Metadata } from 'next'
import Link from 'next/link'
import { buildIndustryReport } from '@/lib/industry'
import { NOISE_FLOOR_PERCENT, publishedCorpus } from '@/lib/published'
import { AGENT_ENTRY_PATHS, PROVISIONING_PATTERN_COUNT, PROVISIONING_PATTERN_LABELS } from '@/lib/scan/funnel'
import { AI_CRAWLERS } from '@/lib/scan/robots'
import { verdictOf } from '@/lib/corpus'
import { SITE_URL } from '@/lib/site'
import { getStore, type Report } from '@/lib/store'
import { CHECKS, FORMULA_VERSION, MAX_SCORE, STAGES } from '@/lib/score'
import { recordVisit } from '@/lib/visits'
import { headers } from 'next/headers'

export const metadata: Metadata = {
  title: 'Methodology: Let Agents In',
  description: 'Every check, its rule and why it costs a vendor money. The formula is published so the score can be reproduced.',
}

const CLASS_COST: Record<string, string> = {
  training: 'Blocking it keeps you out of model weights.',
  search: 'Blocking it keeps you out of cited answers.',
  user: 'Blocking it stops your customer’s agent from reading your docs mid-integration.',
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
                            Weakest evidence first: {packageEvidence.registrySearch} of the{' '}
                            {packageEvidence.measured} measured rows name a package we matched by who publishes
                            it, rather than by you naming it on your site, in llms.txt or in your docs. Every
                            row says which, and <code>corpus.json</code> carries it as <code>npmSource</code>.
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
        {/* Four percentages follow, each with its own date and pair, and a reader skimming reads
            that as us not knowing our own figure. The answer goes first; the history explains it. */}
        <p className="mt-4 max-w-2xl font-medium leading-relaxed">
          The figure today is {NOISE_FLOOR_PERCENT.toFixed(2)} percent. The paragraphs below are how it was
          measured and what it replaces, in order, because a number like this is only worth as much as the
          pair of scans behind it.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          On 10 August 2026 we rescanned all 167 domains twice, with no rule changed between the two runs,
          and compared every verdict: 15 of 2,338 moved, which is 0.64 percent. A difference smaller than
          that, in our numbers or in yours, is the internet being the internet rather than something that
          changed.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Measured again on 17 August 2026 and, for the first time, in the only way that answers the question:{' '}
          {NOISE_FLOOR_PERCENT.toFixed(2)} percent, 15 verdicts of 2,550 across 170 domains, the same formula on both
          sides. What is new is the pair. Every earlier figure compared two passes of one sweep, and a sweep&apos;s first
          pass asks the npm registry cold while its second finds the answers cached, so those pairs moved one way: the
          last of them 27 up and 3 down. This one compares the warm pass of two separate sweeps six hours apart, and it
          moves 9 up and 6 down. A symmetric spread is what measurement noise looks like; a one-sided one is a cache
          warming up with our name on it.
        </p>
        {/* Read one by one on 17 August, because a number this small is worth knowing the parts of. */}
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Ten of those fifteen are a verdict that disagreed with the verdict before it, which is 0.39 percent. The other
          five are a row we could not measure on one of the two days: a signup page that answered us on Monday and
          refused on Tuesday is not a changed verdict, it is a missing one, and we count it here rather than quietly
          leaving it out. The figure we quote is the larger one.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          It is higher than the 0.20 percent it replaces, and we would rather print that than keep a flattering number
          nobody measured properly. That figure came from formula 9.8, twelve days and twenty-odd rule changes ago, and
          today&apos;s scanner asks each domain far more questions, so there are more answers that can arrive
          differently on a second asking. The earlier repairs described below are real and still in place; the floor is
          measured on the scanner we run today, not the one we ran then.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          How much of it was ours we found out by measuring rather than by assuming. The scanner gives
          itself 27 seconds per domain, and a scan that runs out publishes several verdicts as unmeasured,
          which is a fact about our clock and not about the vendor. One run published eleven such verdicts
          across two domains, and repeating those two scans by hand cut that run&apos;s movement from 23
          rows to 12. Truncated scans are retried now. Two other repairs followed from reading what still
          moved: a vendor whose edge answers every one of our POSTs with an empty 202, ours included to a
          path nobody registered, is reported as unmeasured instead of as having no MCP server, and a
          product that publishes prices is no longer told it has no accounts merely because we could not
          find the link. The floor fell from 0.39 to 0.20 across those three.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          What is left is five rows, and none of them is a verdict changing its mind about a vendor. Two
          are MCP endpoints that answer one pass and not the next, two are documentation pages that refuse
          us once and answer the second time, and one is a docs page that renders differently depending on
          which of a vendor&apos;s pages we land on. We ask a host for about nineteen documents inside that
          27 second budget, which is itself a burst, so some of what remains is still ours.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          It is not evenly spread. Nine of the fifteen sit in the three checks that depend on a host
          answering us at all, and the rest are single rows. We chased two of them rather than assume:
          name.com went from refusing us to answering, and answers a browser and both agent user-agents we
          asked as that day identically three times over, so the change was theirs and transient. froala.com answers
          403, 200, 403 in the same alternating pattern to a browser as to us, so its row moving is froala
          being froala.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          The uncomfortable consequence, printed because it is true: our own adversarial audits put the
          error rate in these verdicts at 0.39 percent, which is now the smaller of the two. It was the
          larger of them for a week, until the floor was measured against a pair that does not confound
          it with a warming cache. They are different measurements, a wrong rule against an
          unstable network, and together they mean no single row is evidence on its own. Rescan before you
          act on one, and treat the checks above the fold as the durable part.
        </p>
        {/* Kept as a separate paragraph rather than folded into the figure above it. Averaging a
            newer pass into an older rate would hide which families have been attacked and which
            have not, and that is the part a reader needs to weigh a row. */}
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          The most recent pass, on 13 August 2026, checked 282 published verdicts against the live
          sites by hand and found no errors: every CAPTCHA we name is in the signup page we name it
          on, every link we call dead answers 404, every domain we say publishes no OAuth metadata
          publishes none on nine hosts, and every domain we say has no agent entry file has none on
          nine paths. Each of those probes carries a control that finds the positive case, because a
          check that can only return “nothing here” proves nothing. That pass does not replace the
          0.39 percent: it covers the families it covers, and the rate above still stands for the
          rules it was measured on.
        </p>
      </section>

      {/* The category pages link here under "how every number here is measured" and, until an
          audit on 2026-08-17 followed that link, this page described only the scanner. A link that
          does not answer the question it promises is worse than no link. */}
      <section id="named" className="scroll-mt-8 border-b border-rule py-12">
        <h2 className="text-lg font-semibold tracking-tight">How the agent runs are counted</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          One question per category, written to be the question a developer would type, naming no vendor and
          asking for a recommendation. It is put to an agent five times, each run in its own empty directory with
          nothing carried between them, and the answers are kept whole and published under each category.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Who was named is decided by a published list of names and a published regular expression, never by a
          second model reading the first one&apos;s answer: a model grading a model is the measurement this
          product exists to be an alternative to. A brand that is also an ordinary English word counts only when
          the writing says it is a brand, which means emphasis or code or a link around it, capitals throughout,
          or the capitalised form used more than once in the same answer. “the bunny hops” is not bunny.net and
          “**Sanity**” is sanity.io. <span className="font-medium">Named</span> is how many runs mentioned a
          vendor at all; <span className="font-medium">named first</span> is how many mentioned it before any
          other vendor we measure.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Five runs separate a wall from silence and nothing finer, so nothing here ranks two vendors that finish
          close. And these runs are not a clean measurement: they ran on a machine whose operator instructions
          they could read, and those instructions ask for answers in Polish, which is why some of the published
          answers are in Polish rather than English. It describes an agent on that machine rather than an agent
          at your customer. A replication on a second tool that reads none of those instructions is running.
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
          them. That is the stage this corpus measures as {discoveryShare} percent solved. Ours starts at
          the next one, where the same corpus measures {entryShare} percent, and the difference is not a
          disagreement about scoring:
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

      {ours && (
        <section className="border-b border-rule py-12">
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">What we score</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
            This scanner is pointed at this site too. On {ours.scannedAt} it measured{' '}
            <span className="font-mono tabular-nums">
              {ours.total} of {ours.measurable}
            </span>{' '}
            points here, and{' '}
            <Link href={`/r/${ours.reportId}`} className="text-brass underline underline-offset-4">
              the scorecard is public
            </Link>{' '}
            like everyone else&apos;s.
            {ours.failing.length > 0 && (
              <>
                {' '}
                {/* One expression rather than a wrapped sentence, which is a readability choice
                    and nothing more: the two commits that split it were chasing a space that my
                    own tag-stripping extraction had added, not the page. */}
                We fail <code>{ours.failing.join(', ')}</code>{', and we are not going to fix it: our tools take no credential, so there is no client for an agent to register, and rewriting the rule until we passed would be marking our own work.'}
              </>
            )}
          </p>
        </section>
      )}

      <section className="py-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Known limits</h2>
        <ol className="mt-5 flex flex-col gap-4">
          {[
            'llms.txt does two different jobs and the evidence on them points opposite ways, so here is both halves. As a thing crawlers pull, it is close to dead: Ahrefs looked at 137,210 domains in June 2026 and found 97 per cent of published files served no traffic at all, Otterly measured 84 requests to it against 62,100 AI-bot visits over ninety days, and John Mueller said in June 2025 that no AI system uses it. As a map an agent working on a task reads, it earns its point: Mintlify ran 2,400 agent tasks across twenty documentation sites in July 2026 and averaged 2.23 wrong URLs per task on HTML, 1.42 on plain markdown, and 0.11 when an llms.txt pointed the way. We score the second job, because that is the one that ends in somebody using your API. Our own eighteen runs never cited the file, which is weaker evidence than it sounds, since a run can read a file without naming it. One point, and if you are choosing what to do first, this is not it.',
            'We ask as ourselves and as the two on-demand fetchers an edge is most likely to have a rule for, ChatGPT-User and Claude-User, at the documentation page we picked, and at your home page as well when your edge answers us with a JavaScript challenge. amplitude.com answers a named agent 404 at one documentation URL and 200 at another, so a pass here means the page we read was served, not that every page is. The extra pair of requests exists because an edge on a verified-bot allowlist refuses every user-agent it has no rule for, which is ours, while serving the two agents this whole site is about: bitmovin.com challenges us and hands Claude-User the page in full. Training crawlers are deliberately not part of this: refusing the crawler that builds a training set is a different decision from refusing the agent a customer sent, and this check only measures the second.',
            'A 429 is never a finding about you. If a host rate limits us, the checks that depended on reading it come back unmeasured and say so, because reporting our own traffic as your refusal would be an accusation. The door test also spaces its three tries, so we are not manufacturing the limit we would then have to explain.',
            'Pricing pages are read twice and the self-serve wording is the union of both reads. One vendor answered the same URL with and without its free-tier sentence forty minutes apart, which moved a scored point; the scorecard says when the two reads disagreed.',
            'The client registration check follows more than the apex: the signup origin, any MCP host, and the subdomains an authorization or resource server conventionally lives on. It also follows the pointer rather than stopping at the host: a protected-resource document names the authorization servers that guard it, and we read those too, in both of the well-known layouts deployments use, with the issuer path before or after the well-known segment. Finding nothing across all of them is a measurement, and the scorecard names the origins we probed so you can rerun exactly what we ran.',
            'Bot gates are not deterministic. The same signup endpoint answered 200 once and 403 four times during research, so gated checks run three times and the scorecard says when the tries disagreed.',
            'A passing file is not a passing experience. Publishing llms.txt scores a point here and still tells you nothing about whether an agent chose you. That is what the paid audit measures.',
            'Discovery can be wrong. Docs, pricing, signup and the npm package are inferred from your own links. The scorecard shows exactly what it found so you can see when it guessed badly.',
            'A soft 404 is treated as absence. Sites that answer 200 with an app shell for unknown paths are read as not having the file, which is also how an agent reads them.',
            `The provisioning check reads the documentation landing page, at most three more chosen by how directly a path promises credentials, and any llms.txt files you publish, which is why the scorecard often says more than four documents. It looks for these ${PROVISIONING_PATTERN_COUNT} phrases and names the ones it found: ${PROVISIONING_PATTERN_LABELS.join('; ')}. The creation phrase counts only with something programmatic in the same sentence, because "click Generate key. This creates an API key" is documented key creation and is not a path an agent can take. A sample of a large documentation set is still a sample, so a vendor whose credential page was not among them can tell us and we will rescan.`,
            'A control probe runs before the agent-entry checks: we ask for a nonsense path first, and if the site answers it with a real document, every hit in that namespace is suppressed and the check is marked unmeasurable. Sentry answers any .md path with the same 976-byte page, which would otherwise have scored full marks on nine files that do not exist. The MCP check runs the same control, because almost every site answers 405 to a POST at a path it does not route: an address only counts when it answers the handshake differently from an unrouted one, or challenges for OAuth with a WWW-Authenticate header.',
            'The door test sends LetAgentsIn/1.0 three times and reports what came back next to what a Chrome user-agent got, so a site that serves browsers and refuses agents shows both numbers. Apart from the named-agent probes above, every other request in the scan is sent as a browser, because we are measuring the content, not the gate.',
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
