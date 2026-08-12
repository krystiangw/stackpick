import type { Metadata } from 'next'
import Link from 'next/link'
import { CHECKS, MAX_SCORE } from '@/lib/score'
import { recordVisit } from '@/lib/visits'
import { headers } from 'next/headers'

export const metadata: Metadata = {
  title: 'Pricing: Let Agents In',
  description: 'What the free scan covers, what a real agent audit costs, and what happens after the findings.',
}

type Tier = {
  name: string
  price: string
  cadence: string
  pitch: string
  includes: readonly string[]
  note?: string
  featured?: boolean
  cta: { label: string; href: string }
}

const TIERS: readonly Tier[] = [
  {
    name: 'Free scan',
    price: '$0',
    cadence: 'instant, no account',
    pitch: 'What a machine can see from outside.',
    includes: [
      `${CHECKS.length} deterministic checks across five funnel stages, ${MAX_SCORE} points on paper`,
      'A score out of the points we could actually measure on your domain, with the rest named rather than counted against you',
      'A permanent link you can forward',
      'The published formula, so the number can be argued with',
    ],
    cta: { label: 'Scan your domain', href: '/' },
  },
  {
    name: 'Monitoring',
    price: '$99',
    cadence: 'per domain, per month',
    pitch: 'The failures here are the kind nobody notices until an integration stops working.',
    includes: [
      'The same checks, rerun every week, so a verdict that moves is caught within days',
      'One email when something changes, naming the check, what it says now and what it said before',
      'Nothing when nothing changed, which is most weeks',
      'No account and no card. One link in every email stops it',
    ],
    note: 'Free while we are building it, and we will ask before it ever costs anything.',
    featured: true,
    cta: { label: 'Watch a domain', href: '/#watch' },
  },
  {
    name: 'Agent audit',
    price: 'By conversation',
    cadence: 'one to three weeks',
    pitch: 'What real agents do on your product when nobody is watching, which no scanner can see.',
    includes: [
      'Real agent runs on a brief designed for your category, recorded and handed over',
      'Whether you are in the candidate set at all, and which provider gets picked instead',
      'The words used to reject you, quoted where a run left a quotable sentence',
      'Where a run stalls: registration, credentials, or the first integration',
    ],
    note: 'Four figures, scoped once we agree what to measure. It is a conversation, not a checkout, because the brief is most of the work.',
    cta: { label: 'Ask what it would cost', href: 'mailto:hello@letagentsin.com?subject=Agent%20audit' },
  },
]

export default async function PricingPage() {
  recordVisit('/pricing', (await headers()).get('user-agent'))
  return (
    <main className="mx-auto max-w-5xl px-6">
      <section className="border-b border-rule py-14">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">Pricing</p>
        <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight">
          Everything a machine can check is free. You pay to be told when it breaks.
        </h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
          The scan costs us bandwidth and nothing else, so it costs you nothing and the formula is published
          with it. The only thing worth charging for is the part that keeps working after you close the tab:
          rerunning it every week and telling you the day a verdict moves.
        </p>
      </section>

      <section className="border-b border-rule py-12">
        <div className="grid gap-px bg-rule md:grid-cols-3">
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
              <Link
                href={tier.cta.href}
                className="mt-auto w-fit border border-ink px-5 py-2.5 font-mono text-sm transition-colors hover:bg-ink hover:text-ground"
              >
                {tier.cta.label}
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* The objection a sceptical buyer arrives with, answered before they have to ask it. */}
      <section className="border-b border-rule py-12">
        <h2 className="text-lg font-semibold tracking-tight">Why one run of an agent proves nothing</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Ask a model the same question twice and it will not answer the same way. Our own runs say it plainly:
          one vendor was rejected in nineteen of twenty runs and chosen in the twentieth, and one signup endpoint
          answered 200 once and 403 four times inside an hour. Anyone selling you a position in an AI ranking
          from a single run is selling noise, and they should be treated that way.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          So we do not sell a position. Every cell is repeated, every run is recorded separately, and what you
          get is the spread rather than a number: how many runs chose you, how many named you at all, and the
          words each one used. Where runs disagree, the disagreement is the finding and it is printed as one.
          The four published audits are written that way, and you can check that before paying us anything:
          each one names the models, the number of runs, the scaffold, and what a different scaffold would
          have changed.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          The honest limit is the sample size. Four to six runs per cell is enough to see a wall every run hits
          and not enough to rank two vendors that finish close together. We report which of those two a finding
          is, every time.
        </p>
        <p className="mt-5">
          <Link href="/audit" className="font-mono text-sm text-brass underline underline-offset-4">
            Read the four published audits, which are the sample of the deliverable
          </Link>
        </p>
      </section>

      {/* The second question a buyer asks after "is the method sound", and the one this page used to
          leave them to work out from an email address. The answer is one person, and saying so is
          worth more than the impression of a company that the plural would create. */}
      <section className="border-b border-rule py-12">
        <h2 className="text-lg font-semibold tracking-tight">Who does the work</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          One person, and you should know that before you put an audit through procurement.{' '}
          <a
            href="https://krystiangw.github.io/krystiangw/"
            className="text-brass underline underline-offset-4"
          >
            Krystian Gwizdała
          </a>
          , a full-stack engineer in Kraków, wrote the scanner, ran all eighteen agent runs behind the
          published audits, and will be the one reading your transcripts. There is no team behind this and
          no account manager between you and the work.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          What that costs you is capacity: two full audits a month, not ten, and no cover if one week goes
          badly. What it buys you is that the person who designed the brief is the person who argues with
          you about what the runs mean, which is the part of this that does not survive being handed over.
        </p>
      </section>

      <section className="border-b border-rule py-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">After the findings</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          An audit that ends in a document changes nothing, so the implementation is available too: docs that
          answer the question agents actually ask, an entry point built for a machine, a credential path that
          does not need a human, or an MCP server for your API. Each is quoted from what the audit found rather
          than from a price list, because a fix sprint scoped before the measurement is guesswork with an
          invoice attached.
        </p>
      </section>

      <section className="border-b border-rule py-12">
        <h2 className="text-lg font-semibold tracking-tight">Who runs this</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Krystian Gwizdała. The research on this site is mine: the scanner, the formula, the agent runs and
          every number on{' '}
          <Link href="/findings" className="text-brass underline underline-offset-4">
            Findings
          </Link>{' '}
          and{' '}
          <Link href="/report" className="text-brass underline underline-offset-4">
            the industry report
          </Link>
          . An audit is run by me, not by a team you never meet, and the raw runs go to you with the report.
        </p>
        <p className="mt-4 font-mono text-sm">
          <a href="mailto:hello@letagentsin.com" className="text-brass underline underline-offset-4">
            hello@letagentsin.com
          </a>
        </p>
      </section>

      <section className="py-12">
        <h2 className="text-lg font-semibold tracking-tight">Questions people ask first</h2>
        <dl className="mt-6 flex flex-col">
          {[
            [
              'Monitoring says $99 and also says free. Which is it?',
              'Free today, for everyone, and the price is printed so you know what it will become rather than finding out later. Nobody is charged without being asked first, and there is no card on file to charge.',
            ],
            [
              'Do you bill hourly?',
              'For work outside a package, $250 an hour. It is rarely the right shape: the value here is a measurement and a decision, not time at a desk.',
            ],
            [
              'What if the audit finds nothing?',
              'Then you get that in writing, with the runs to back it up, and you stop worrying about it. A report that cannot come back empty is not a measurement, so that outcome has to stay on the table.',
            ],
            [
              'Why is the free scan actually free?',
              'It is HTTP requests. No language model runs, so it costs bandwidth and nothing else. Charging for it would be charging for a script whose every rule is published, which you can reproduce with curl.',
            ],
            [
              'Will you publish what you find about us?',
              'The scans in our own published corpus are published as we produce them, because every line is one HTTP request with a published rule and you can reproduce all of it. A scan you run yourself never joins that corpus: it gets a permanent link you can forward, and we do not post it anywhere. A paid audit is yours: nothing from it is published without your written agreement, and if we ever want to write about a pattern we saw, you get the draft and ten working days before anything goes out.',
            ],
            [
              'What do you need from us?',
              'For the audit, nothing but the product as a customer sees it. No repository access, no staging environment, no calls with your engineers. That is the point: the measurement has to happen from outside, the way an agent meets you.',
            ],
            [
              'Can we just buy the fixes?',
              'Yes, but a fix sprint without a measurement is guesswork with an invoice attached. If you already know what is wrong, say so and we will scope it directly.',
            ],
          ].map(([question, answer]) => (
            <div key={question} className="grid gap-2 border-t border-rule py-5 sm:grid-cols-[18rem_1fr] sm:gap-8">
              <dt className="font-medium leading-snug">{question}</dt>
              <dd className="max-w-2xl text-sm leading-relaxed text-ink-soft">{answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  )
}
