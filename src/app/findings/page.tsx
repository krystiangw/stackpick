import type { Metadata } from 'next'
import Link from 'next/link'
import { buildIndustryReport } from '@/lib/industry'
import { recordVisit } from '@/lib/visits'
import { headers } from 'next/headers'
import { SITE_URL } from '@/lib/site'
import { FORMULA_VERSION } from '@/lib/score'
import { buildStudy, inPoints, studyClaims, type Study } from '@/lib/study'
import { publishedCorpus } from '@/lib/published'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  alternates: { canonical: `${SITE_URL}/findings` },
  title: 'Findings: Let Agents In',
  // No count here: the sixth exhibit is measured from the corpus and takes itself down when the
  // data cannot carry it, so a number in the description would be a promise the page can break.
  description: 'Recorded agent choices, integration attempts and an observational comparison with HTTP scan results.',
}

type Result = {
  id: string
  heading: string
  numbers: string[][]
  body: string[]
  comparison?: { columns: string[]; rows: string[][] }
  quote?: { text: string; caption: string; translated?: boolean }
}

const RESULTS: Result[] = [
  {
    id: 'wall',
    heading: 'Four studies, eighteen runs and credential handoffs',
    numbers: [
      ['Runs verified running, with the integration exercised', '8 of 8'],
      ['Further runs whose shipped code we confirmed from their artefacts', '10'],
      ['Runs that obtained a credential of their own, where one was needed', '0 of 12'],
      ['Categories where the same barrier appeared', '4 of 4'],
    ],
    body: [
      "Eighteen runs worked in isolated copies of one application across four categories: editors, image uploads, authentication and payments. Eight integrations were exercised. Ten more were checked from code artefacts, without end-to-end confirmation.",
      "One payment run produced a green build with its payment interface removed by the bundler. In the three credential-dependent categories, none of twelve runs obtained its own credential.",
      "Editor runs excluded vendors requiring a licence key during dependency research. Account ownership required a human handoff in other studies. These observations do not measure adoption or lost sales.",
      "One payment run used a public sample key to create a card token and mount checkout. It stopped at a call requiring a secret key. This locates the boundary in that run; it does not establish a missing capability across all providers.",
      "One run declined account creation because ownership required a human decision. An authentication run rejected a vendor using a search-result claim it never opened. Its report identified that claim as its weakest evidence."
],
    quote: {
      text: 'I stopped at the signup form\u2026 somebody has to own it, and I am not going to create a company account on the team\u2019s behalf. What it would take: one person, ~3 minutes.',
      caption:
        'A run pricing the barrier for the vendor it had just chosen. The run estimated the handoff at three minutes; we did not measure a resulting vendor switch.',
    },
  },
  {
    id: 'sources',
    heading: 'Source use changed with the task, even on the same model',
    numbers: [
      ['Storage brief, cheaper model, runs that fetched live sources', '0 / 10'],
      ['Editor brief, every model, runs that fetched live sources', '6 / 6'],
      ['Average tool calls per run, stronger against cheaper', '13 vs 7'],
    ],
    body: [
      "The stronger model fetched documentation, MDN and npm sources in every storage run. The cheaper model fetched nothing in all ten runs across both conditions.",
      "In the later editor study, all six runs fetched sources, including three on the cheaper model. Licensing was part of that task.",
      "Source use changed with the task. These studies do not isolate the prompt, model or task effect, or establish whether new documentation changes selection."
],
    quote: {
      text: 'Last published 2.0.2 on 2023-03-06, so over three years without a release despite 1.5 million weekly downloads. Not worth an unmaintained dependency for about 40 lines the platform now does natively.',
      translated: true,
      caption:
        'The cheaper model recommended this package in three runs. Registry check on 7 August 2026: version 2.0.2, published 6 March 2023; 1,527,048 weekly downloads. Verify with npm view browser-image-compression time.modified version.',
    },
  },
  {
    id: 'codebase',
    heading: 'Provider choices differed with an existing codebase',
    numbers: [
      ['Provider that won greenfield', '5 of 8'],
      ['Same provider against real code', '0 of 12'],
    ],
    body: [
      "The conditions compared an empty folder with a working application. The existing app had a session cookie. Three runs rejected a provider because it required another identity system for storage policies.",
      "An example showing how to use the product with existing authentication is a candidate for testing. Its effect on selection was not measured."
],
    quote: {
      text: 'Wrong tail wagging the dog.',
      caption: 'One of three independent runs rejecting the greenfield winner for the same reason.',
    },
  },
  {
    id: 'absent',
    heading: 'Four providers received no mentions',
    numbers: [
      ['Never selected, but considered and rejected', '19 of 20'],
      ['Providers with zero mentions across all runs', '4'],
    ],
    body: [
      "One provider was considered and rejected in nineteen of twenty runs over a framework assumption. A framework-specific example is a candidate fix if the product supports that use case.",
      "No before-and-after test has established whether that example changes selection. Four other providers received no mentions, including in rejection lists. The runs also named providers outside our list."
],
  },
  {
    id: 'licence',
    heading: 'Two vendors were rejected over licence-key requirements',
    numbers: [
      ['Runs that picked the same MIT-licensed library', '6 of 6'],
      ['Runs that consulted the npm registry', '6 of 6'],
      ['Runs that never opened a single vendor page', '1 of 6'],
    ],
    body: [
      "Six runs used isolated copies of one codebase, three per model. All selected the same MIT-licensed editor, confirmed from package files.",
      "Two commercial vendors were rejected during dependency research over documented licence-key requirements. One vendor stated that its editor disables itself without a valid key. Another vendor in the category was never mentioned.",
      "All six runs consulted npm; one opened no vendor page. Package metadata and licence terms were part of the evidence used."
],
    quote: {
      text: 'Fully commercial, licence key required.',
      caption:
        'The entire evaluation one vendor received, in an earlier round run before we isolated the copies. That round shared one working directory between agents, so it is not part of the six above and its counts are not reported. The product was never opened.',
    },
  },
]

/**
 * Signups we opened by hand and found gated by an hCaptcha the bundle mounts after load, which the
 * scanner cannot see because it reads served HTML. Named on the page only while they are still on
 * the list the sentence is about: contentful.com was named there for a week after a rate-limited
 * scan took it off the list, which is the drift the number guard cannot catch because it is prose.
 */
const LATE_CAPTCHA = ['supabase.com', 'contentful.com']

// Twierdzenie o cudzych narzedziach ma date, bo inaczej starzeje sie w ciszy - tak samo jak liczby o
// konkurencie na /methodology i o cudzym standardzie na /standard. Sprawdzone tego dnia u zrodla:
// kategoria Lighthouse'a odpalona na naszej wlasnej domenie (13.4.1, szesc audytow wypisanych nizej),
// lista Cloudflare'a z ich wlasnego ogloszenia. Straznik w rules.mts oblewa build po 60 dniach.
const RIVALS_CHECKED_ON = '19 August 2026'

/** Small numbers as words, because the heading is prose and "5 studies" reads like a dashboard. */
function counted(value: number, capital = false): string {
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight']
  const word = words[value] ?? String(value)
  return capital ? word.charAt(0).toUpperCase() + word.slice(1) : word
}

/**
 * The sixth study, written from the measurement rather than from memory.
 *
 * Every figure below used to be typed into the prose. The reseed of 2026-08-17 moved four of them
 * and reversed two: the page was publishing "minus three among the rest" about a gap the data had
 * turned into plus ten, and the guard beside it passed the whole time, because a guard asserts a
 * direction and cannot read a sentence. Interpolated, they cannot drift again.
 */
function namedResult(study: Study): Result | null {
  const first = study.tools.find((tool) => tool !== study.cleanTool) ?? study.tools[0]
  const clean = study.cleanTool ?? study.tools[1] ?? first
  if (!first || !clean) return null
  const oauth = study.gap('oauth_dcr', first, 'share')
  const mcp = study.gap('mcp_present', first, 'share')
  const provisioning = study.gap('programmatic_provisioning', first, 'share')
  const llmsFirst = study.gap('llms_txt', first, 'share')
  const llmsClean = study.gap('llms_txt', clean, 'share')
  const oauthClean = study.gap('oauth_dcr', clean, 'share')
  const mcpClean = study.gap('mcp_present', clean, 'share')
  const provisioningClean = study.gap('programmatic_provisioning', clean, 'share')
  // An empty or half-loaded corpus must take the exhibit down rather than print conclusions over
  // "0 of 0" and "too few to read". The store has refused reads twice this month, and a research
  // page that keeps asserting a result while it cannot see the data is the failure this whole
  // section is about.
  const readable = (gap: { overall: number; popular: number; quieter: number }) =>
    Number.isFinite(gap.overall) && Number.isFinite(gap.popular) && Number.isFinite(gap.quieter)
  const everyGap = [oauth, mcp, provisioning, llmsFirst, llmsClean, oauthClean, mcpClean, provisioningClean]
  if (study.vendors === 0 || !everyGap.every(readable)) return null
  // The prose asserts things, not only numbers: that two checks separate in both halves and that
  // llms.txt is the one that does not. When the data stops supporting one of those, the exhibit
  // comes down and the guard fails the same hour, which is the pair that gets it rewritten rather
  // than quietly kept. Interpolating fresh numbers under an old conclusion is the exact failure
  // this section was rebuilt to end.
  if (!studyClaims(study).every((claim) => claim.holds)) return null
  // The claim about the third check rests on the sign in the quiet half, and that sign has already
  // moved once. Written as a branch rather than as a sentence, so the page cannot go on asserting
  // "fame rather than the rule" on the day both tools turn that half positive.
  const carriedByFame = provisioning.quieter <= 0
  return {
    id: 'named',
    heading:
      'Check results and agent mentions: an observational comparison',
    numbers: [
      ['Categories, each with one buying question put to an agent', '26'],
      ['Vendors named at least once, of those we measure', `${study.namedAtLeastOnce} of ${study.vendors}`],
      ['Nameability gap between vendors that pass and fail oauth_dcr', `${inPoints(oauth.overall)}pp`],
      [
        'The same for llms.txt among lesser known vendors, one tool and the other',
        `${inPoints(llmsFirst.quieter)}pp and ${inPoints(llmsClean.quieter)}pp`,
      ],
    ],
    comparison: {
      columns: ['Check / tool', 'All vendors', 'Well known', 'Lesser known'],
      rows: [
        ['OAuth discovery / ' + first, inPoints(oauth.overall), inPoints(oauth.popular), inPoints(oauth.quieter)],
        ['OAuth discovery / ' + clean, inPoints(oauthClean.overall), inPoints(oauthClean.popular), inPoints(oauthClean.quieter)],
        ['MCP / ' + first, inPoints(mcp.overall), inPoints(mcp.popular), inPoints(mcp.quieter)],
        ['MCP / ' + clean, inPoints(mcpClean.overall), inPoints(mcpClean.popular), inPoints(mcpClean.quieter)],
        ['Provisioning / ' + first, inPoints(provisioning.overall), inPoints(provisioning.popular), inPoints(provisioning.quieter)],
        ['Provisioning / ' + clean, inPoints(provisioningClean.overall), inPoints(provisioningClean.popular), inPoints(provisioningClean.quieter)],
        ['llms.txt / ' + first, inPoints(llmsFirst.overall), inPoints(llmsFirst.popular), inPoints(llmsFirst.quieter)],
        ['llms.txt / ' + clean, inPoints(llmsClean.overall), inPoints(llmsClean.popular), inPoints(llmsClean.quieter)],
      ],
    },
    body: [
      'Each category question was asked five times in isolation. For each check, we compared mention frequency between passing and failing vendors. Unmeasured checks were excluded from both groups. Table values are percentage-point gaps.',
      'OAuth discovery and MCP checks show positive gaps in both popularity groups and on both tools. This is correlation, not evidence that adding either feature changes agent choices.',
      `Provisioning ${carriedByFame ? 'does not show a positive gap in the lesser-known group on the first tool' : 'has a larger gap among well-known vendors on the first tool'}. On the second tool, ${provisioningClean.quieter <= 0 ? 'the lesser-known group has no positive gap' : 'the gap is smaller among lesser-known vendors'}.`,
      'For llms.txt, the overall association is concentrated among well-known vendors. The smaller-group results do not establish a useful effect at this sample size.',
      'Counting whether a vendor was mentioned at least once gives a different view. OAuth discovery still separates both popularity groups on both tools. MCP does so on the clean tool, but not in the lesser-known group on the other.',
      'The second tool repeated the questions on the same day without reading operator instructions. Both tools ran on one laptop. Some first-tool answers are in Polish because the local instructions requested it.',
      'Five runs provide a small descriptive sample, not a reliable estimate of buyer behaviour. Popularity splits cannot remove all confounding. Complete answers are available under each category.',
    ],
  }
}

export default async function FindingsPage() {
  recordVisit('/findings', (await headers()).get('user-agent'))
  // The behavioural studies say a wall exists. The corpus says how much of the market is standing
  // behind it, and this page argued the first half without ever showing the second.
  const corpus = await buildIndustryReport()
  // Measured here rather than remembered in a paragraph: this page prints the study's numbers in
  // sentences, and a number in a sentence is the one thing no guard on this repo can watch.
  const sixth = namedResult(buildStudy((await publishedCorpus()).reports))
  const results = sixth ? [...RESULTS, sixth] : RESULTS
  // Only while they are still on the list the sentence points at.
  const lateCaptchaOnList = LATE_CAPTCHA.filter((domain) => corpus?.usable.domains.includes(domain) ?? false)
  return (
    <main className="mx-auto max-w-5xl px-6">
      <section className="border-b border-rule py-14">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">Research</p>
        <h1 className="mt-4 max-w-2xl text-balance text-4xl font-semibold leading-tight tracking-tight">
          {counted(results.length, true)} studies of agent behaviour
        </h1>
        {/* Counted from what is actually rendered. The sixth exhibit takes itself down when the
            corpus cannot carry it or one of its claims stops holding, and a page that kept saying
            "six studies" over five would be making the same kind of stale claim the sixth is
            about. */}
        <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
          Five build studies cover image upload and storage twice, editors, authentication and payments.
          Runs received a brief without provider names or an audit disclosure. They could not ask follow-up questions.
        </p>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">
          Two models worked in isolated copies of a real application. Source records distinguish opened pages from skimmed summaries.
          {sixth ? ' The sixth study compares scan checks with agent mentions.' : ' The sixth study is unavailable: its corpus is incomplete or a guarded claim no longer holds.'}
        </p>
        <nav aria-label="Studies on this page" className="mt-6 flex flex-wrap gap-2 text-sm">
          {results.map((result, index) => <a key={result.id} href={`#${result.id}`} className="nav-link border border-rule">{index + 1}. {result.id === 'wall' ? 'Integration' : result.id === 'named' ? 'Mentions' : result.id}</a>)}
        </nav>
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

      {results.map((result) => (
        <section key={result.id} id={result.id} className="border-b border-rule py-12">
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
          {result.comparison && (
            <div className="mt-6 overflow-x-auto" tabIndex={0} role="region" aria-label="Mention frequency gaps in percentage points">
              <table className="w-full min-w-[36rem] text-sm">
                <caption className="mb-3 text-left text-sm text-ink-faint">Mention frequency gap, in percentage points</caption>
                <thead><tr className="border-b border-rule text-left">{result.comparison.columns.map((column) => <th key={column} className="p-3 font-medium">{column}</th>)}</tr></thead>
                <tbody>{result.comparison.rows.map(([label, ...values]) => <tr key={label} className="border-b border-rule"><th scope="row" className="p-3 text-left font-normal">{label}</th>{values.map((value, index) => <td key={index} className="p-3 font-mono tabular-nums">{value}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )}
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
            The scanner follows up to twelve links across the llms.txt files a domain publishes.
          </p>
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
            Only a confirmed 404 or 410 counts as a dead link. Refused requests do not. The confirmation avoids mistaking a rejected HEAD request for a missing page.
          </p>
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
            At the tested URLs,{' '}
            <span className="font-mono">{corpus.cloaked}</span> of {corpus.sampleSize} vendors serve an agent
            user-agent measurably less text than a browser.
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
            This groups three HTTP signals: agent entry, reachable signup without a CAPTCHA marker, and documented credential provisioning.
            Meeting them does not establish that signup or an integration succeeds.
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
            The largest group missing one requirement contains{' '}
            <span className="font-mono">{corpus.usable.oneAway[0].domains.length}</span> vendors meet every
            other requirement and fail on {corpus.usable.oneAway[0].leg}.{' '}
            <span className="font-mono text-sm text-ink">
              {corpus.usable.oneAway[0].domains.slice(0, 12).join(', ')}
            </span>
            {corpus.usable.oneAway[0].domains.length > 12 &&
              `, and ${corpus.usable.oneAway[0].domains.length - 12} more.`}
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-faint">
            The scanner reads served HTML. A CAPTCHA loaded later by JavaScript is invisible to it.
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
            A task-based audit must check the actual signup path.
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-faint">
            These groups are recomputed from the published corpus on each request. A failed signal needs review before recommending a product change.
          </p>
          <p className="mt-6">
            <Link href="/report" className="font-mono text-sm text-brass underline underline-offset-4">
              The full corpus, and the data behind it
            </Link>
          </p>
        </section>
      )}

      <section className="py-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Study limits</h2>
        <ol className="mt-5 flex max-w-2xl flex-col gap-4">
          {[
            'The first study used five to six runs per cell; later studies used two. These samples do not establish stable selection rates.',
            'Each condition used one prompt variant. Sensitivity to wording has not been tested.',
            'The first study recorded stated choices without installation. Three later studies installed dependencies; their choices were checked against the resulting files.',
            'Two models from one family. Other coding tools may choose differently.',
            'The real-code condition used one scaffold. Results may differ with another codebase.',
            // Measured on 14 August 2026 from the runs already published here, at no extra cost:
            // every category is repeated runs of one brief, so the agreement was there to count.
            'Agreement differed by task. Editors: the same choice in six runs. Payments: the same choice in four. One storage model split between Cloudflare R2 and Cloudinary; one auth model split between Firebase and Clerk. Two runs per model show disagreement, but cannot estimate its frequency.',
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
              Related HTTP observations
            </h3>
            <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">
              The corpus contains {corpus.sampleSize} vendors. Of these, {corpus.mcpWithoutKeys} have an MCP server
              without a credential-provisioning match in the sampled documentation. This does not establish that a supported access path is absent.
            </p>
            <dl className="mt-5 divide-y divide-rule text-sm">
              {[
                ['MCP servers with RFC 7591 discovery', `${corpus.mcpWithRegistration} of ${corpus.mcpServers}`],
                ['Other vendors with RFC 7591 discovery', `${corpus.registrationWithoutMcp} of ${corpus.withoutMcp}`],
                ['Registration endpoints advertising an unattended grant', `${corpus.registrationUnattended} of ${corpus.registrationTotal}`],
                ['Agent requests refused while browser requests passed', String(corpus.signupRefusesAgents)],
                ['Signup forms requiring JavaScript to render', String(corpus.signupNeedsJavaScript)],
              ].map(([label, value]) => <div key={label} className="flex justify-between gap-5 py-3"><dt>{label}</dt><dd className="shrink-0 font-mono">{value}</dd></div>)}
            </dl>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
              OAuth client registration does not grant access to a customer account. Other advertised grants include authorization_code, refresh_token and device code.
              The scan does not obtain tokens. namecheap.com and dynadot.com publish registration metadata; only dynadot.com advertises client_credentials.
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
              A browser-capable agent may use a JavaScript form that this HTTP scanner cannot render.
            </p>
            <details className="mt-5 rounded-md border border-rule p-4">
              <summary className="cursor-pointer text-sm font-medium">Comparison with Lighthouse and Cloudflare</summary>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
                Read on {RIVALS_CHECKED_ON}: Lighthouse had six agentic-browsing audits: accessibility tree, three WebMCP checks, layout shift and llms.txt.
                Cloudflare listed files and protocols from robots.txt and content signals to API catalogs, OAuth discovery, MCP cards and WebMCP.
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">Neither listed account creation by an unattended client in that comparison.</p>
            </details>
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
          Corpus scans are published as they are produced. Visitor scans receive a permanent link and never join the public corpus.
        </p>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">
          For research write-ups, a scored vendor receives the draft and ten working days to reply before publication.
        </p>
      </section>
    </main>
  )
}
