import type { Metadata } from 'next'
import Link from 'next/link'
import { CHECKS, MAX_SCORE } from '@/lib/score'
import { recordVisit } from '@/lib/visits'
import { headers } from 'next/headers'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  alternates: { canonical: `${SITE_URL}/pricing` },
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
    name: 'One agent report',
    price: '$29',
    cadence: 'once, per domain',
    pitch: 'Whether an agent names you at all, asked ten times over.',
    includes: [
      'One question from your category, the one your buyers ask, put to an agent ten times in isolation',
      // Five runs is what monitoring sends monthly and what the section below admits cannot
      // separate two close providers. Selling five as a one-off product would be selling the
      // weakness: a single reading has no next month to correct it.
      'Two different tools, five runs each. A result that survives both is about you rather than about the machine we ran it on',
      'How many of the ten named you, which provider was picked instead, and the sentence that passed over you, quoted',
      'Every transcript handed over, so you read what the agent said rather than our summary of it',
      'Only the 25 categories we measure. If your product is not in one of them we say so before you pay, not after',
    ],
    note: 'Credited against your first month of monitoring. It is a sample of that, not a competitor to it.',
    cta: { label: 'Ask for a report', href: 'mailto:hello@letagentsin.com?subject=One%20agent%20report' },
  },
  {
    name: 'Monitoring',
    price: '$79',
    cadence: 'per domain, per month',
    pitch: 'Whether an agent can still use you, and whether it ever considers you at all.',
    includes: [
      'The same checks, rerun every week, so a verdict that moves is caught within days',
      'Real agents every month: one question about your category, put to an agent five times in isolation, and how many of the five named you',
      'The agent runs cover the 25 categories we measure. If your product is not in one of them we say so before you switch it on, rather than after',
      'Which provider got picked instead, and the sentence that passed over you, quoted from the transcript',
      'One email when something moves, nothing when nothing does, which is most weeks',
      'No account and no card. One link in every email stops it',
    ],
    note: 'Three domains $179 a month, ten $499. Free while we are building it, and we will ask before it ever costs anything.',
    featured: true,
    cta: { label: 'Watch a domain', href: '/#watch' },
  },
  {
    name: 'Audit and fixes',
    price: 'By conversation',
    cadence: 'one to three weeks',
    pitch: 'Agents given a real app and told to ship against you, a person reading what happened, and the work that follows.',
    includes: [
      'Build runs: an agent gets a working application and a brief for your category, and is told to ship with nobody available to answer questions',
      'Where the run stalls: registration, credentials, or the first integration',
      'Every transcript and every artefact handed over, with what shipped read from the files rather than from what the run says it did',
      'The argument about what it means, with the person who wrote the brief rather than an account manager',
      'The fixes, quoted from what the runs found: documentation an agent can read, an entry point built for a machine, a credential path with no human in it, or an MCP server for your API',
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
          Everything a machine can check is free. You pay for the part where real agents run.
        </h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
          The scan costs us bandwidth and nothing else, so it costs you nothing and the formula is published
          with it. What is worth charging for is what a checklist cannot see: the same checks rerun every week
          so you hear the day a verdict moves, and real agents asked the question your buyers ask, to find out
          whether you are named at all.
        </p>
      </section>

      <section className="border-b border-rule py-12">
        <div className="grid gap-px bg-rule sm:grid-cols-2 xl:grid-cols-4">
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

      {/* The distinction the two paid tiers turn on, and the one a buyer cannot be expected to
          guess from the word "agent" appearing in both columns. */}
      <section className="border-b border-rule py-12">
        <h2 className="text-lg font-semibold tracking-tight">Two kinds of agent run, and why only one of them is in monitoring</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          A discovery run is one question and no more: a developer&apos;s problem with a deadline attached, put to
          an agent in an empty directory that has never heard of you. It reads the answer and records who was
          named, in what order, and in what words. Nothing is signed up for and nothing is created, which is
          why it can run every month on any domain, including yours before you have spoken to us.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          A build run is the opposite. The agent gets a working application, a brief, and instructions to ship,
          and it walks straight into your registration form, your API key and your first integration. That
          needs your agreement and a person watching it, so it stays in the audit and it is most of what the
          audit costs.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          They catch different failures, which is the reason both exist. The first tells you whether you are in
          the room at all. The second tells you whether an agent that already wants you can actually get in.
          A vendor can fail either one while passing the other, and we have measured both.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Reading the answers is done by rule rather than by a second model: a published list of names and a
          published matcher decide who was named, and where a brand is also an ordinary English word the hit is
          quoted for a human instead of counted. A model grading another model is the measurement this whole
          site exists to be an alternative to.
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
          , a full-stack engineer in Kraków, wrote the scanner and the formula, ran all eighteen agent runs
          behind the published audits, and produced every number on{' '}
          <Link href="/findings" className="text-brass underline underline-offset-4">
            Findings
          </Link>{' '}
          and{' '}
          <Link href="/report" className="text-brass underline underline-offset-4">
            the industry report
          </Link>
          . He will also be the one reading your transcripts. There is no team behind this and no account
          manager between you and the work.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          What that costs you is capacity: two full audits a month, not ten, and no cover if one week goes
          badly. What it buys you is that the person who designed the brief is the person who argues with
          you about what the runs mean, which is the part of this that does not survive being handed over.
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
              'Monitoring says $79 and also says free. Which is it?',
              'Free today, for everyone, and the price is printed so you know what it will become rather than finding out later. Nobody is charged without being asked first, and there is no card on file to charge.',
            ],
            [
              'Do your monitoring agents sign up for our product?',
              'No. A discovery run answers a question in an empty directory and touches nothing of yours: no form, no account, no key. Anything that creates something on your side happens only inside a paid audit, with your agreement and with somebody watching it, which is also why that half costs what it costs.',
            ],
            [
              'Five runs a month is not much of a sample.',
              'It is not, and it decides what the number is allowed to say. Five runs catch a wall every run hits, and they cannot separate you from a competitor that finishes close. So monitoring does not sell you a position: it reports how many of the five named you, and the thing worth reacting to is the month that number moves.',
            ],
            [
              'Other tools audit a domain for about twenty dollars. Why is this more?',
              'Because it is a different unit. Those are one pass of an agent over your site, priced per pass, and a single pass cannot tell a wall from a bad day: we publish the noise floor precisely because we measured how much moves on its own. Monitoring is a standing measurement of one domain, rerun weekly against a published formula, with real agents asked your buyers\u2019 question every month and the transcripts handed over. If a one-off is what you want, take the twenty-nine dollar report, which is the same evidence without the standing part.',
            ],
            [
              'We look after a lot of client domains. Is there an agency price?',
              'Ask. There is a per-domain price above and packs under it, and beyond that it is a conversation rather than a table, because a report with your name on it is work we would rather quote than pretend is automatic.',
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
