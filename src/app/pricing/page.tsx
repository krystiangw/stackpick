import type { Metadata } from 'next'
import Link from 'next/link'
import { TrackedLink } from '@/components/tracked-link'
import type { Click } from '@/lib/clicks'
import { CHECKS, MAX_SCORE } from '@/lib/score'
import { CATEGORIES, CURATED_DOMAINS } from '@/lib/categories'
import { priceOf, skuById, INTEGRATION_PILOT } from '@/lib/billing/catalog'
import { recordVisit } from '@/lib/visits'
import { headers } from 'next/headers'
import { SITE_URL } from '@/lib/site'
import { getStore } from '@/lib/store'
import { NOISE_FLOOR_PERCENT } from '@/lib/published'
import { publishedCorpus } from '@/lib/published'
import { edgeRefusalsInCorpus, sweptOn } from '@/lib/limits'

const pilotPrice = `$${INTEGRATION_PILOT.usd.toLocaleString('en-US')}`

export const metadata: Metadata = {
  alternates: { canonical: `${SITE_URL}/pricing` },
  title: 'Pricing: Let Agents In',
  // The prices go in the snippet. A pricing description with no number in it reads as "contact
  // sales", and the runs we published measured agents passing over a vendor on exactly that
  // reading, without opening the page that would have corrected it.
  description: `Free scan: ${CHECKS.length} deterministic checks, no account or card. One agent report: ${priceOf(skuById('report-one')!)}. Free monitoring beta. Integration pilot: ${pilotPrice} each for the first ${INTEGRATION_PILOT.places} pilots.`,
}

type Tier = {
  name: string
  price: string
  cadence: string
  pitch: string
  includes: readonly string[]
  note?: string
  /** A finished example of the deliverable. Nobody buys a document they have never seen. */
  sample?: { label: string; href: string }
  featured?: boolean
  cta: { label: string; href: string; click: Click }
}

const TIERS: readonly Tier[] = [
  {
    name: 'Free scan',
    price: '$0',
    cadence: 'instant',
    pitch: 'I scan your public pages.',
    includes: [
      'Five funnel stages',
      `${MAX_SCORE} possible points`,
      'A published scoring formula',
    ],
    cta: { label: 'Scan your domain', href: '/', click: 'scan' },
  },
  {
    name: 'Monitoring beta',
    price: 'Free',
    cadence: 'no account or card',
    pitch: 'Know when a public scan result changes.',
    includes: [
      'Weekly checks run automatically',
      'Email alerts for confirmed changes',
      'Available on its own; no audit needed',
    ],
    note: 'Free while I am building it. I will ask before charging you.',
    cta: { label: 'Watch a domain', href: '/#watch', click: 'watch' },
  },
  {
    name: 'One agent report',
    price: priceOf(skuById('report-one')!),
    cadence: 'once, per domain',
    pitch: 'See which providers agents recommend for one buying question.',
    includes: [
      'A question chosen for your category',
      'At least ten answers across two tools',
      'Every transcript included',
    ],
    note: `Available for the ${CATEGORIES.length} categories I measure. I confirm category fit before you pay.`,
    sample: { label: 'Read a real one, start to finish', href: '/d/sample' },
    cta: { label: 'Ask for a report', href: 'mailto:hello@letagentsin.com?subject=One%20agent%20report', click: 'mail-report' },
  },
  {
    name: 'Integration pilot',
    price: pilotPrice,
    cadence: `once, per product · first ${INTEGRATION_PILOT.places} pilots`,
    pitch: 'I test an integration, improve one small part and test it again.',
    includes: [
      'Two agreed tasks, tested with two agent tools',
      '24 planned attempts across the initial test and retest',
      'One small documentation or example fix',
      'Runnable test project and a before/after report',
    ],
    note: 'Up to 12 hours of my work. Delivery within 10 business days of agreed scope and ready access. Larger changes are scoped separately.',
    featured: true,
    sample: { label: 'See earlier integration studies', href: '/audit' },
    cta: { label: 'Discuss your two tasks', href: 'mailto:hello@letagentsin.com?subject=Agent%20audit', click: 'mail-audit' },
  },
]

const asDay = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

export default async function PricingPage() {
  // Linked only when it is there AND marked as a sample. A fresh deployment has no deliveries and a
  // link to a 404 is worse than no link, but the flags are independent: publishing a customer's
  // report with `--id sample` and no `--sample` would otherwise put their document on the pricing
  // page. Existence is not permission.
  // And never at the cost of the page: on 2026-08-13 the cluster hit its quota and every read
  // failed, so an awaited lookup here would have turned the pricing page into a 500 over a link.
  // Liczone z korpusu, nie wpisane recznie. Do 2026-08-20 stalo tu „15 ... 11" przy korpusie, ktory
  // dawal 14 i 10: liczba wpisana recznie zmienia sie dokladnie wtedy, kiedy nikt na nia nie patrzy.
  //
  // Zlapane, a nie puszczone dalej: `publishedCorpus` rzuca, gdy baza nie odpowiada, a cennik to
  // ostatnia strona, ktora ma paść przez odczyt ozdobnika - obok stoi `getDelivery` z tym samym
  // zabezpieczeniem (codex). Gdy liczb nie mamy, zdanie ich NIE ZMYSLA: znika w calosci, bo „0 domen
  // w naszym korpusie" i „Invalid Date" to twierdzenia, ktorych nie zmierzylismy.
  const edge = await publishedCorpus()
    .then(({ reports }) =>
      reports.length === 0 ? null : { ...edgeRefusalsInCorpus(reports), swept: sweptOn(reports) },
    )
    .catch(() => null)
  const sampleReady = await getStore()
    .getDelivery('sample')
    .then((delivery) => delivery?.sample === true)
    .catch(() => false)
  recordVisit('/pricing', (await headers()).get('user-agent'))
  return (
    <main className="mx-auto max-w-5xl px-6">
      <section className="border-b border-rule py-14">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">Pricing</p>
        <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight">
          Start with a scan. Test an integration when you need to.
        </h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
          Scan and monitor public access for free. Buy a report to see agent recommendations, or agree a pilot to test and improve an integration.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <TrackedLink
            click="watch"
            href="/#watch"
            className="w-fit border border-ink bg-ink px-5 py-2.5 font-mono text-sm text-ground transition-colors hover:bg-ground hover:text-ink"
          >
            Watch your domain, free
          </TrackedLink>
          <TrackedLink
            click="scan"
            href="/"
            className="w-fit border border-ink px-5 py-2.5 font-mono text-sm transition-colors hover:bg-ink hover:text-ground"
          >
            Scan it first
          </TrackedLink>
        </div>
        <p className="mt-3 font-mono text-xs text-ink-faint">
          No account or card needed.
        </p>
      </section>

      <section className="border-b border-rule py-12">
        <div className="grid gap-px bg-rule sm:grid-cols-2">
          {TIERS.map((tier) => (
            <article
              key={tier.name}
              className={`flex flex-col gap-4 p-7 ${tier.featured ? 'bg-brass-soft' : 'bg-ground'}`}
            >
              <div className="flex flex-col gap-1">
                <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">{tier.name}</h2>
                <p className="font-mono text-3xl font-semibold tracking-tight tabular-nums">{tier.price}</p>
                <p className="font-mono text-xs text-ink-faint">{tier.cadence}</p>
              </div>
              <p className="text-balance font-medium leading-snug">{tier.pitch}</p>
              <ul className="flex flex-col gap-2">
                {tier.includes.map((item) => (
                  <li key={item} className="grid grid-cols-[0.9rem_1fr] gap-2 text-sm leading-relaxed text-ink-soft">
                    <span aria-hidden className="font-mono text-brass">
                      ·
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {tier.note && (
                <p className="font-mono text-xs leading-relaxed text-ink-faint">{tier.note}</p>
              )}
              {/* Delivery samples need a published flag; static samples are always safe to link. */}
              {tier.sample && !tier.sample.href.startsWith('/d/') && (
                <p className="font-mono text-xs">
                  <Link href={tier.sample.href} className="text-brass underline underline-offset-4">
                    {tier.sample.label}
                  </Link>
                </p>
              )}
              {tier.sample && sampleReady && tier.sample.href.startsWith('/d/') && (
                <p className="font-mono text-xs">
                  <Link href={tier.sample.href} className="text-brass underline underline-offset-4">
                    {tier.sample.label}
                  </Link>
                </p>
              )}
              <TrackedLink
                click={tier.cta.click}
                href={tier.cta.href}
                className="mt-auto w-fit border border-ink px-5 py-2.5 font-mono text-sm transition-colors hover:bg-ink hover:text-ground"
              >
                {tier.cta.label}
              </TrackedLink>
            </article>
          ))}
        </div>
      </section>

      <section className="border-b border-rule py-12">
        <h2 className="text-lg font-semibold tracking-tight">The long version</h2>
        <p className="mt-2 text-ink-soft">
          Run method, sample size and production checks.
        </p>

        {/* The objection a sceptical buyer arrives with, answered before they have to ask it. */}
        <details className="group border-b border-rule py-6">
          <summary className="cursor-pointer list-none text-lg font-semibold tracking-tight">
            <span className="mr-3 font-mono text-xs text-brass">
              <span className="group-open:hidden">+</span>
              <span className="hidden group-open:inline">-</span>
            </span>
            Run variation and sample size
          </summary>
          <div className="mt-4">
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          In my runs, one vendor was rejected nineteen times out of twenty and chosen once.
          One signup endpoint returned 200 once and 403 four times within an hour.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          I record each run separately. The published audits name the models, run counts and scaffold.
          They also describe what a different scaffold would have changed.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Four to six runs per cell can reveal a failure every run hits.
          That sample cannot reliably rank vendors with close results.
        </p>
        <p className="mt-5">
          <Link href="/audit" className="font-mono text-sm text-brass underline underline-offset-4">
            Read the four published build studies
          </Link>
        </p>
          </div>
        </details>

        {/* The distinction the two paid tiers turn on, and the one a buyer cannot be expected to
            guess from the word "agent" appearing in both columns. */}
        <details className="group border-b border-rule py-6">
          <summary className="cursor-pointer list-none text-lg font-semibold tracking-tight">
            <span className="mr-3 font-mono text-xs text-brass">
              <span className="group-open:hidden">+</span>
              <span className="hidden group-open:inline">-</span>
            </span>
            Discovery and build runs
          </summary>
          <div className="mt-4">
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          For discovery, I give an agent a developer&apos;s problem and deadline in an empty directory without prior context about your product.
          I record names, mention order and wording. Discovery runs create no accounts or credentials and submit no forms.
          I can run them on any domain before speaking with its owner.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Build runs require your agreement and someone watching the agent. I run them within a paid audit.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Discovery measures whether an agent names you. Build runs test whether it can use your product.
          I have observed vendors failing either test while passing the other.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          The matcher uses a published list of names. I quote ambiguous matches, such as brands that are ordinary English words, for human review.
          Those matches are excluded from the count.
        </p>
          </div>
        </details>

        {/* The buyer who is going to say no says it because a check already runs in their pipeline.
            Written about pipelines rather than about a competitor: what we have measured is what our
            own scans see, and we have not independently measured anyone else's product. */}
        <details className="group border-b border-rule py-6">
          <summary className="cursor-pointer list-none text-lg font-semibold tracking-tight">
            <span className="mr-3 font-mono text-xs text-brass">
              <span className="group-open:hidden">+</span>
              <span className="hidden group-open:inline">-</span>
            </span>
            Production checks
          </summary>
          <div className="mt-4">
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          I check production access, package and tool registries, search results and agent choices.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          <strong className="font-semibold text-ink">Edge access.</strong>{' '}
          {edge && (
            <>
              {edge.domains === CURATED_DOMAINS.size
                ? `I scanned all ${edge.domains} domains in the corpus`
                : `I scanned ${edge.domains} of the ${CURATED_DOMAINS.size} domains in the corpus`}{' '}
              {edge.swept?.oneDay
                ? `on ${asDay(edge.swept.to)}`
                : edge.swept
                  ? `between ${asDay(edge.swept.from)} and ${asDay(edge.swept.to)}`
                  : ''}
              . {edge.refused} refused requests at their edge from my scanner&apos;s address.
              Of those, {edge.challenged} returned a browser challenge rather than a rate limit.
            </>
          )}
        </p>
        {edge && (
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
            On 20 August 2026, I retried from an ordinary home connection. Three hosts answered normally; one challenged that address too.
            Access varied with the request&apos;s origin.
          </p>
        )}
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          One documentation host challenged all thirteen requests, leaving three checks unmeasured while its repository was unchanged.
          When I retried that host alone an hour later, it answered and all three checks returned.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          <strong className="font-semibold text-ink">Registries and search.</strong>{' '}
          I check package types under names an agent would guess and listings in tool registries.
          I also read the two lines about pricing that search results show before an agent opens your page.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          <strong className="font-semibold text-ink">Agent choices.</strong>{' '}
          I read the reasons agents give for choosing another provider.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          <strong className="font-semibold text-ink">Scan variation.</strong>{' '}
          I measured {NOISE_FLOOR_PERCENT.toFixed(2)} percent of verdicts changing between two clean scans with nothing changed.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Keep repository checks in CI. Use monitoring to follow production access and external services over time.
        </p>
          </div>
        </details>
      </section>

      {/* The second question a buyer asks after "is the method sound", and the one this page used to
          leave them to work out from an email address. The answer is one person, and saying so is
          worth more than the impression of a company that the plural would create. */}
      <section className="border-b border-rule py-12">
        <h2 className="text-lg font-semibold tracking-tight">Your auditor</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          I&apos;m{' '}
          <a
            href="https://one-good-engineer.github.io/"
            className="text-brass underline underline-offset-4"
          >
            Krystian Gwizdała
          </a>
          , a full-stack engineer in Kraków. I wrote the scanner and formula.
          I ran all eighteen agent runs behind the published audits and produced every number on{' '}
          <Link href="/findings" className="text-brass underline underline-offset-4">
            Findings
          </Link>{' '}
          and{' '}
          <Link href="/report" className="text-brass underline underline-offset-4">
            the industry report
          </Link>
          .
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          I handle two full audits a month. I have no cover if a week goes badly.
          I discuss the results with you directly.
        </p>
        <p className="mt-4 font-mono text-sm">
          <TrackedLink click="mail-hello" href="mailto:hello@letagentsin.com" className="text-brass underline underline-offset-4">
            hello@letagentsin.com
          </TrackedLink>
        </p>
      </section>

      <section className="py-12">
        <h2 className="text-lg font-semibold tracking-tight">FAQ</h2>
        <div className="mt-6 flex flex-col">
          {[
            [
              'What does the monitoring beta include?',
              'Weekly HTTP checks and email alerts for confirmed changes. You can use it without buying a report or pilot. Stop through the link in any email. There is no end date or announced paid price; I will ask before charging you.',
            ],
            [
              'Are agent mentions monitored every month?',
              'Agent mention checks are experimental and run manually in selected categories. They have no fixed schedule or guaranteed number of runs. I review any results before sharing them. They do not test signup or integration. For a defined set of answers, order a one-off report.',
            ],
            [
              'What is included in the pilot price?',
              'Two tasks, two agent tools and three attempts per task and tool, before and after: 24 planned attempts. The price covers up to 12 hours of my work, including one documentation or example fix of up to two hours, and up to $100 in tool costs. We agree access and success criteria before starting. Work beyond these limits needs a separate agreement.',
            ],
            [
              'What if the pilot finds nothing to fix?',
              'You receive the evidence and that conclusion. If there is no suitable fix, I repeat the baseline and label it as such. The pilot pays for the agreed investigation, not a promised improvement in agent choices or sales. Any incomplete work is identified and we agree how to finish or settle it.',
            ],
            [
              'Is the introductory pilot price still available?',
              `The first ${INTEGRATION_PILOT.places} agreed pilots are ${pilotPrice} each. I confirm availability, the scope and payment arrangements before you commit. Further projects are quoted separately.`,
            ],
            [
              'Hourly work',
              'I charge $250 an hour for work outside a package.',
            ],
            [
              'An audit with no findings',
              'I document that result and include the supporting runs.',
            ],
            [
              'Publication permissions',
              'I publish scans from my own corpus as I produce them. Visitor scans stay outside that corpus; I do not post them elsewhere.',
            ],
            [
              'Paid audit publication',
              'Your audit belongs to you. I publish material from it only with your written agreement. For any proposed article about a pattern, I send you the draft ten working days before publication.',
            ],
            [
              'Audit access',
              'We agree a test account, permitted operations and synthetic data before starting. Some tasks need a sandbox or credentials from an account owner. A required human authorization step is recorded separately from an integration failure.',
            ],
            [
              'Fixes without an audit',
              'If you already know the problem, I can scope a fix sprint directly. Fixes can cover documentation, machine entry points, automatic credentials or an MCP server for your API.',
            ],
          ].map(([question, answer]) => (
            <details key={question} className="group border-b border-rule py-4">
              <summary className="cursor-pointer list-none font-medium leading-snug">
                <span className="mr-3 font-mono text-xs text-brass">
                  <span className="group-open:hidden">+</span>
                  <span className="hidden group-open:inline">-</span>
                </span>
                {question}
              </summary>
              <div className="mt-4">
                <p className="max-w-2xl text-sm leading-relaxed text-ink-soft">{answer}</p>
              </div>
            </details>
          ))}
        </div>
      </section>
    </main>
  )
}
