import type { Metadata } from 'next'
import Link from 'next/link'
import { buildIndustryReport } from '@/lib/industry'
import { recordVisit } from '@/lib/visits'
import { headers } from 'next/headers'
import { SITE_URL } from '@/lib/site'
import { FORMULA_VERSION } from '@/lib/score'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  alternates: { canonical: `${SITE_URL}/findings` },
  title: 'Findings: Let Agents In',
  description: 'Six studies: what agents pick when nobody is watching, where every one of them stops, and which of our own checks has anything to do with being named.',
}

type Result = {
  id: string
  heading: string
  numbers: string[][]
  body: string[]
  quote?: { text: string; caption: string; translated?: boolean }
}

const RESULTS: Result[] = [
  {
    id: 'wall',
    heading: 'Four agent studies, eighteen runs, one wall in four disguises',
    numbers: [
      ['Runs verified running, with the integration exercised', '8 of 8'],
      ['Further runs whose shipped code we confirmed from their artefacts', '10'],
      ['Runs that obtained a credential of their own, where one was needed', '0 of 12'],
      ['Categories where the same barrier appeared', '4 of 4'],
    ],
    body: [
      'Four studies, four categories, eighteen runs in isolated copies of a real application: choose a rich text editor, add image upload and hosting, replace a proxy cookie with real authentication, sell two support plans. Every run shipped an integration: eight were exercised against a running app, the other ten confirmed from the dependencies and components each run left on disk. One of those ten shipped a green build whose payment interface the bundler had silently removed, which is a finding in itself and reported in that audit. In the three categories where the work needs a credential, not one of twelve runs obtained one, and each said the same thing in its own words: creating the account needs a human.',
      'One category needed no credential and the barrier appeared anyway, earlier: vendors whose libraries require a licence key were struck off during dependency research, in one line each, before any product was opened. That is the shape of it. Wherever a human step exists, it either stops the agent at the end or removes you from the list at the start. It does not slow adoption down. It decides it.',
      'Payments was chosen as the hardest case, because there the human step is the law. It turned out the law was never reached. Every run stopped at account creation, which is a vendor decision, and one measured the edge exactly: the vendor\u2019s own public sample key creates a real card token, the checkout form mounts, and the run stops on the single call that needs a secret key. The last step an agent cannot take alone is the one no provider in that category offers.',
      'Two things surfaced that no vendor can see from inside. One run refused to create an account it was technically able to create, because ownership is a decision it would not make for someone else, which means frictionless is not the same as acceptable. And in the authentication study a vendor was called the most attractive on price and rejected anyway, on a claim from a search result the run never opened and flagged, in its own report, as the weakest link in its reasoning.',
    ],
    quote: {
      text: 'I stopped at the signup form\u2026 somebody has to own it, and I am not going to create a company account on the team\u2019s behalf. What it would take: one person, ~3 minutes.',
      caption:
        'A run pricing the barrier for the vendor it had just chosen. Three minutes of a human is the distance between an agent shipping your product and an agent shipping someone else\u2019s.',
    },
  },
  {
    id: 'sources',
    heading: 'What makes your documentation get read is the kind of decision, not the model',
    numbers: [
      ['Storage brief, cheaper model, runs that fetched live sources', '0 / 10'],
      ['Editor brief, every model, runs that fetched live sources', '6 / 6'],
      ['Average tool calls per run, stronger against cheaper', '13 vs 7'],
    ],
    body: [
      'In the storage study the stronger model pulled provider documentation, MDN and the npm registry in every run, and the cheaper one declared it was working from its own knowledge, in all ten runs, and fetched nothing. That replicated across both conditions, so it was not an artefact of one prompt, and it looked like a fact about models.',
      'A later study broke that reading. Choosing a rich text editor turns on a licence, and a licence cannot be answered from memory: every run fetched sources, including all three on the cheaper model. The same model that read nothing about storage read vendor documentation, the registry and the compiled package on disk when the decision required it.',
      'So the commercial consequence is sharper than a note about models. Where the choice can be made from what a model already knows, your documentation may never be opened and you are judged on what was true at training time. Where the choice turns on something checkable, a licence, a price, an entry requirement, everything reads you. Both cases are worth knowing, and only one of them is fixable by writing better documentation.',
    ],
    quote: {
      text: 'Last published 2.0.2 on 2023-03-06, so over three years without a release despite 1.5 million weekly downloads. Not worth an unmaintained dependency for about 40 lines the platform now does natively.',
      translated: true,
      caption:
        'The stronger model rejecting browser-image-compression, which the cheaper model recommended in three runs. The numbers are not translated: we verified the registry independently on 7 August 2026 and found version 2.0.2, published 6 March 2023, with 1,527,048 downloads that week. Check it with npm view browser-image-compression time.modified version.',
    },
  },
  {
    id: 'codebase',
    heading: 'One line in the customer’s repository changed the winner',
    numbers: [
      ['Provider that won greenfield', '5 of 8'],
      ['Same provider against real code', '0 of 12'],
    ],
    body: [
      'The only difference between conditions was a working application instead of an empty folder. The app already carried a session cookie, and that was enough: adopting the winning provider meant running a second identity system purely so a storage policy had something to check.',
      'You do not control what your prospect already has in their repository. You control exactly one thing: whether your documentation answers the question “how do I use this when auth already lives somewhere else”.',
    ],
    quote: {
      text: 'Wrong tail wagging the dog.',
      caption: 'One of three independent runs rejecting the greenfield winner for the same reason.',
    },
  },
  {
    id: 'absent',
    heading: 'Four providers were never named once, in any run',
    numbers: [
      ['Never selected, but considered and rejected', '19 of 20'],
      ['Providers with zero mentions across all runs', '4'],
    ],
    body: [
      'A fifth provider was in the conversation and lost it: rejected in nineteen of twenty runs in almost identical words, because it assumes a framework the project did not use. That is a positioning problem fixable with one documentation chapter, and the company cannot fix it because nobody told them it happens.',
      'Four other providers were never mentioned once, not even on rejection lists. Meanwhile agents volunteered options we had not asked about. An agent does not start with an empty list, it starts with its own list, and being outside it is not losing a comparison, it is not being at the table.',
    ],
  },
  {
    id: 'licence',
    heading: 'A licence key eliminated two vendors before either product was opened',
    numbers: [
      ['Runs that picked the same MIT-licensed library', '6 of 6'],
      ['Runs that consulted the npm registry', '6 of 6'],
      ['Runs that never opened a single vendor page', '1 of 6'],
    ],
    body: [
      'A second study, six runs in isolated copies of one codebase, three on a stronger model and three on a cheaper one: choose a rich text editor and wire it up. Every run chose the same library, verified from the package files each run left behind rather than from what the run claimed. Two commercial vendors were dropped in a single line each, quoted from the vendors\u2019 own documentation about a required licence key. One of them states that without a valid key the editor disables itself, and an agent reads that as a dead end.',
      'The order matters more than the outcome. Elimination happened during dependency research, before any feature was compared, and the evidence used was package metadata and the licence field. If your licence lives only on a pricing page, part of the market decides without ever seeing it.',
      'One vendor from the same category did not appear on any rejection list. It was not outranked, it was absent, which is a harder problem than losing a comparison and an invisible one from the inside.',
    ],
    quote: {
      text: 'Fully commercial, licence key required.',
      caption:
        'The entire evaluation one vendor received, in an earlier round run before we isolated the copies. That round shared one working directory between agents, so it is not part of the six above and its counts are not reported. The product was never opened.',
    },
  },
  {
    id: 'named',
    heading: 'Two of our fifteen checks relate to being named by an agent. The file everybody publishes relates to nothing',
    numbers: [
      ['Categories, each with one buying question put to an agent', '26'],
      ['Vendors named at least once, of those we measure', '90 of 170'],
      ['Nameability gap between vendors that pass and fail oauth_dcr', '+25pp'],
      ['The same for llms.txt, after controlling for how well known a vendor is', 'nothing'],
    ],
    body: [
      'We publish fifteen checks and tell vendors to fix them. Nobody, ourselves included, had asked which of them has anything to do with the thing a vendor actually wants: being named when somebody asks an agent for a recommendation. So we asked. One question per category, the question a buyer would type, put to an agent five times in isolation, and for each vendor in the corpus a count of the runs that named them. Then, for every check, the share of vendors named at least once among those that pass it against those that fail it.',
      'Two checks separate the two groups and survive the obvious objection. Vendors whose product an agent can register itself with, which is what oauth_dcr measures, are named 25 points more often, and the gap holds among well known vendors and lesser known ones alike, at +26 and +17. A live MCP endpoint is worth +17 points overall and holds in both halves, at +21 and +9. A third, documented programmatic key creation, looks stronger than either at +24 until the corpus is split by popularity: among lesser known vendors it is worth three points, so most of what it measures is fame rather than the rule.',
      'And llms.txt, the file the whole market publishes, separates nobody: five points overall, negative in both halves of the popularity split. We score it, we say on the methodology page that it is not the thing to fix first, and this is the measurement behind that sentence rather than an opinion about it.',
      'It was repeated on a second tool the same day, and the second tool reads none of the instructions on the machine it ran on: different vendor, different model, different contamination, three runs a category instead of five. The two survivors survive there too, and by more: registration by an agent +28 points (+25 among well known vendors, +22 among lesser known ones) and a live MCP endpoint +22 (+20 and +20). Documented key creation repeats its own pattern as well, +41 among well known vendors and minus one among the rest, which is what fame looks like when you split for it. A finding that holds across two tools with two different contaminations is about the vendors rather than about our machine.',
      'The limits, because they are large. Five runs tell a wall from silence and nothing finer. This is correlation on 170 vendors, not an experiment: a well run company publishes more and gets named more, and no split of a corpus this size fully separates the two. Both tools ran on one laptop, so neither describes an agent sitting at your customer, and the answers from the first are in Polish because that machine asks for Polish. Every answer is published under the category pages, so the counting can be argued with rather than believed.',
    ],
  },
]

/**
 * Signups we opened by hand and found gated by an hCaptcha the bundle mounts after load, which the
 * scanner cannot see because it reads served HTML. Named on the page only while they are still on
 * the list the sentence is about: contentful.com was named there for a week after a rate-limited
 * scan took it off the list, which is the drift the number guard cannot catch because it is prose.
 */
const LATE_CAPTCHA = ['supabase.com', 'contentful.com']

export default async function FindingsPage() {
  recordVisit('/findings', (await headers()).get('user-agent'))
  // The behavioural studies say a wall exists. The corpus says how much of the market is standing
  // behind it, and this page argued the first half without ever showing the second.
  const corpus = await buildIndustryReport()
  // Only while they are still on the list the sentence points at.
  const lateCaptchaOnList = LATE_CAPTCHA.filter((domain) => corpus?.usable.domains.includes(domain) ?? false)
  return (
    <main className="mx-auto max-w-5xl px-6">
      <section className="border-b border-rule py-14">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">Research</p>
        <h1 className="mt-4 max-w-2xl text-balance text-4xl font-semibold leading-tight tracking-tight">
          Six studies, nobody watching
        </h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
          Six studies so far. Five are build runs across four categories: image upload and storage twice, a rich text editor,
          authentication for a support tool, and payments. Every run received a brief and nothing else. No provider names,
          no mention of an audit, no hint that anyone was watching, and no way to ask a question. Two models,
          isolated copies of a real application, and a record of every source each run consulted, separating
          the pages it read from the summaries it only skimmed. The sixth is different in kind: it asks whether the
          checks we publish have anything to do with being named at all, and it is the one that criticises our own
          scorecard.
        </p>
        {/* Every other page carrying these numbers says which formula measured them. This one
            stated dozens of counts and never did, so a reader could run their own scan on a newer
            scanner and get a different number with nothing here to explain it. */}
        {corpus && (
          <p className="mt-4 max-w-2xl font-mono text-sm leading-relaxed text-ink-faint">
            {`Every corpus figure below is measured on ${corpus.sampleSize} domains under formula ${corpus.formulaVersion}, last scanned ${corpus.scannedTo.slice(0, 10)}`}
            {corpus.formulaVersion === FORMULA_VERSION
              ? '. A scan you run today uses the same one.'
              : `, while the scanner behind the box on every page now runs ${FORMULA_VERSION}. A scan you run today can therefore disagree with a number here until the corpus is measured again.`}
          </p>
        )}
      </section>

      {RESULTS.map((result) => (
        <section key={result.id} className="border-b border-rule py-12">
          <h2 className="max-w-2xl text-balance text-2xl font-semibold leading-snug tracking-tight">
            {result.heading}
          </h2>
          <dl className="mt-6 flex flex-col">
            {result.numbers.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-6 border-t border-rule py-2.5">
                <dt className="text-sm text-ink-soft">{label}</dt>
                <dd className="font-mono text-sm font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex max-w-2xl flex-col gap-4">
            {result.body.map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className="leading-relaxed text-ink-soft">
                {paragraph}
              </p>
            ))}
          </div>
          {result.quote && (
            <figure className="mt-6 max-w-2xl border-l-2 border-brass pl-5">
              {result.quote.translated && (
                <p className="mb-2 font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">
                  Our translation, not a quotation: this run reported in Polish
                </p>
              )}
              <blockquote className="text-lg italic leading-relaxed">{result.quote.text}</blockquote>
              <figcaption className="mt-2 font-mono text-xs text-ink-faint">{result.quote.caption}</figcaption>
            </figure>
          )}
        </section>
      ))}

      {/* The one thing this market did publish, checked for whether it still works. Two numbers,
          both computed per request, and one of them is a null we would have had no way to state
          without asking: nobody serves an agent a thinner page than a browser. */}
      {corpus && corpus.llmsChecked > 0 && (
        <section className="border-b border-rule py-12">
          <h2 className="max-w-2xl text-balance text-2xl font-semibold leading-snug tracking-tight">
            {corpus.llmsStale} of {corpus.llmsChecked} llms.txt files point at pages that are gone
          </h2>
          <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
            llms.txt is the one thing this market did adopt, so the sharper question is whether it is
            maintained. We follow up to twelve links, spread across the files a domain publishes. A file that lists pages which
            have moved is worse than no file at all: an agent reads it first, follows the links, gets
            nothing, and has spent that much of its budget before it learns anything about the product.
          </p>
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
            Only a 404 or a 410 counts, and only after a second request confirms it. A refusal says nothing
            about the page, and a framework that routes GET and not HEAD answers 404 to the cheap check while
            serving the page perfectly well, which is a mistake we published to ourselves before catching it.
          </p>
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
            The companion measurement is a null result and worth the same words:{' '}
            <span className="font-mono">{corpus.cloaked}</span> of {corpus.sampleSize} vendors serve an agent
            user-agent measurably less text than they serve a browser at the same URL. Cloaking against agents
            is a reasonable thing to fear and, in this sample, it is not happening.
          </p>
        </section>
      )}

      {/* Read as a conjunction rather than a score, deliberately. A threshold on the score rewards
          being unreadable, because an unmeasurable check leaves the denominator; three legs cannot
          be met by hiding anything, since hiding a leg removes one you need. */}
      {corpus && corpus.usable.oneAway.length > 0 && (
        <section className="border-b border-rule py-12">
          <h2 className="max-w-2xl text-balance text-2xl font-semibold leading-snug tracking-tight">
            {corpus.usable.domains.length} of {corpus.sampleSize} vendors clear all three barriers we can
            measure, and {corpus.usable.oneAway.reduce((sum, group) => sum + group.domains.length, 0)} are one
            requirement away
          </h2>
          <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
            Not a score and not a ranking. Three things have to be true at once for an agent working alone to
            get from your home page to a first call: a door built for a machine, a signup it can reach without a
            browser and with no CAPTCHA in the served HTML, and a documented way to get a credential. A total
            hides which one is missing, and the missing one is the whole finding.
          </p>
          <dl className="mt-8 flex flex-col">
            <div className="flex items-baseline justify-between gap-6 border-t border-rule py-2.5">
              <dt className="text-sm">All three</dt>
              <dd className="font-mono text-sm font-semibold tabular-nums">
                {corpus.usable.domains.length} / {corpus.sampleSize}
              </dd>
            </div>
            {corpus.usable.oneAway.map((group) => (
              <div
                key={group.leg}
                className="flex items-baseline justify-between gap-6 border-t border-rule py-2.5"
              >
                <dt className="text-sm text-ink-soft">Missing only {group.leg}</dt>
                <dd className="font-mono text-sm font-semibold tabular-nums">{group.domains.length}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 max-w-2xl leading-relaxed text-ink-soft">
            The vendors that meet all three today:{' '}
            <span className="font-mono text-sm text-ink">{corpus.usable.domains.join(', ')}</span>.
          </p>
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
            The largest near-miss group is worth stating on its own, because it is the same barrier the agent
            runs above kept dying at, and it is the most expensive one to fix:{' '}
            <span className="font-mono">{corpus.usable.oneAway[0].domains.length}</span> vendors meet every
            other requirement and fail on {corpus.usable.oneAway[0].leg}.{' '}
            <span className="font-mono text-sm text-ink">
              {corpus.usable.oneAway[0].domains.slice(0, 12).join(', ')}
            </span>
            {corpus.usable.oneAway[0].domains.length > 12 &&
              `, and ${corpus.usable.oneAway[0].domains.length - 12} more.`}
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-faint">
            Clearing all three is not the same as being usable, and the gap is one we can name precisely: we
            read served HTML, so a CAPTCHA that JavaScript mounts after the page loads is invisible to us.
            {lateCaptchaOnList.length > 0 && (
              <>
                {' '}
                <span className="font-mono text-sm text-ink">{lateCaptchaOnList.join(' and ')}</span>{' '}
                {lateCaptchaOnList.length === 1 ? 'is' : 'are'} on this list and{' '}
                {lateCaptchaOnList.length === 1 ? 'gates' : 'gate'} signup with an hCaptcha
                {' '}
                {lateCaptchaOnList.length === 1 ? 'its' : 'their'} bundle loads later.
              </>
            )}{' '}
            That is a limit of the instrument, not a hedge, and it is the reason the paid audit runs real
            agents instead of counting files.
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-faint">
            Every name here is recomputed from the published corpus on each request, so you can check it
            yourself rather than take it from us. We sell implementation work, and the cheapest of these fixes
            is an afternoon you should not pay anybody for.
          </p>
          <p className="mt-6">
            <Link href="/report" className="font-mono text-sm text-brass underline underline-offset-4">
              The full corpus, and the data behind it
            </Link>
          </p>
        </section>
      )}

      <section className="py-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Limits we will not hide</h2>
        <ol className="mt-5 flex max-w-2xl flex-col gap-4">
          {[
            'Five to six runs per cell in the first study, two per cell in the later ones. The direction of both main results is one-sided enough that we expect the proportions to sharpen rather than flip, but the sample is small and we say so.',
            'One prompt variant per condition. Sensitivity to how the task is worded is the next measurement, not a solved question.',
            'In the first study decisions were stated, not executed: nothing was installed, so it measured selection rather than integration. The three later studies did install and verify, and each choice there is confirmed from the files the run left behind.',
            'Two models from one family. Other coding tools may choose differently.',
            'One specific scaffold in the real-code condition. A different codebase gives a different answer, which is precisely the finding.',
            // Measured on 14 August 2026 from the runs already published here, at no extra cost:
            // every category is repeated runs of one brief, so the agreement was there to count.
            'Runs of the same brief do not always agree with each other, and the disagreement can sit inside a single model. Counted across these studies: the editor choice was the same in all six runs and the payments choice in all four, but in storage one model picked Cloudflare R2 once and Cloudinary once, and in auth the other picked Firebase once and Clerk once. Two runs per model is enough to show the instability exists and not enough to size it, so read a 6 of 6 as stronger evidence than a 2 of 4 rather than as the same kind of number.',
          ].map((limit, index) => (
            <li key={limit} className="grid grid-cols-[2rem_1fr] gap-4">
              <span className="font-mono text-xs text-ink-faint">{String(index + 1).padStart(2, '0')}</span>
              <span className="text-sm leading-relaxed text-ink-soft">{limit}</span>
            </li>
          ))}
        </ol>
        {corpus && (
          <div className="mt-10 border border-rule p-6">
            <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">
              And the same wall, counted across the market
            </h3>
            <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">
              Everything above comes from running agents, which is expensive and small. The free scanner is the
              cheap half of the same question, and it now covers {corpus.sampleSize} vendors:{' '}
              <span className="font-mono">{corpus.mcpWithoutKeys}</span> of them run an MCP server and document
              no way for an agent to obtain a credential for it. A door built for a machine, and nothing behind
              it the machine can unlock alone. That is the studies above, at scale, without a single agent run.
            </p>
            <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
              The number underneath it is stranger.{' '}
              <span className="font-mono">{corpus.mcpWithRegistration}</span> of the{' '}
              <span className="font-mono">{corpus.mcpServers}</span> vendors running a live MCP server also
              publish RFC 7591 client registration, the one standard way an agent registers itself without a
              human. Outside that group it is{' '}
              <span className="font-mono">{corpus.registrationWithoutMcp}</span> of{' '}
              <span className="font-mono">{corpus.withoutMcp}</span>. Dynamic registration did not arrive
              because anybody decided to let agents in: it arrived because the MCP specification asks for it,
              and it came in the same commit as the server. The key that would make it useful did not.
            </p>
            <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
              And the door is narrower than the count suggests. Of the{' '}
              <span className="font-mono">{corpus.registrationTotal}</span> vendors publishing a registration
              endpoint, only <span className="font-mono">{corpus.registrationUnattended}</span> advertise a
              grant an unattended agent can finish. The rest offer authorization_code, refresh_token, or a
              device code, and every one of those puts a person at a browser before a token exists. Two
              registrars make the point on their own: namecheap.com and dynadot.com publish the same shaped
              door, and only dynadot.com offers client_credentials behind it.
            </p>
            <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
              {/* The first number is currently zero, and "and N more" after a zero has nothing to be
                  more than. Written so the null result reads as the finding it is. */}
              One stage further down, where nobody else is looking. Refusing an agent outright at the signup
              form is rare: <span className="font-mono">{corpus.signupRefusesAgents}</span> vendors do it while
              serving a browser at the same URL. The wall is quieter than that, and it stops just as much:{' '}
              <span className="font-mono">{corpus.signupNeedsJavaScript}</span> serve a form that renders
              nothing without JavaScript, which an agent fetching HTML reads as a page with no way in. Google ships an agentic browsing category in Lighthouse and Cloudflare
              ships a readiness scanner, and both stop at documentation and protocol files. Neither asks whether
              an unattended client can get an account, which is the step every one of our agent runs died on.
            </p>
            <p className="mt-4 flex flex-wrap gap-4 font-mono text-sm">
              <Link href="/report" className="text-brass underline underline-offset-4">
                The whole market, aggregated
              </Link>
              <Link href="/v" className="text-brass underline underline-offset-4">
                Every vendor, one page each
              </Link>
              <a href="/corpus.json" className="text-brass underline underline-offset-4">
                or every row of it as data
              </a>
            </p>
          </div>
        )}

        <p className="mt-8 max-w-2xl leading-relaxed text-ink-soft">
          The scans in our own published corpus, the ones on the landing page and the industry report, are
          published as we produce them, because they read only what any browser can read and every vendor can
          reproduce or dispute them from the methodology page. A scan you run yourself is different: it gets a
          permanent link you can forward and it never joins that corpus, so nothing about your domain is
          published because you tried the tool. A third rule applies to anything we write up as research: a
          scored vendor gets the draft and ten working days before it goes out, because an interpretation
          deserves a right of reply in a way that a reproducible HTTP check does not.
        </p>
      </section>
    </main>
  )
}
