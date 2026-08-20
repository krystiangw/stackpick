import type { Metadata } from 'next'
import Link from 'next/link'
import { CHECKS, MAX_SCORE } from '@/lib/score'
import { CATEGORIES } from '@/lib/categories'
import { priceOf, skuById } from '@/lib/billing/catalog'
import { recordVisit } from '@/lib/visits'
import { headers } from 'next/headers'
import { SITE_URL } from '@/lib/site'
import { getStore } from '@/lib/store'
import { NOISE_FLOOR_PERCENT } from '@/lib/published'
import { publishedCorpus } from '@/lib/published'
import { edgeRefusalsInCorpus, sweptOn } from '@/lib/limits'

export const metadata: Metadata = {
  alternates: { canonical: `${SITE_URL}/pricing` },
  title: 'Pricing: Let Agents In',
  // The prices go in the snippet. A pricing description with no number in it reads as "contact
  // sales", and the runs we published measured agents passing over a vendor on exactly that
  // reading, without opening the page that would have corrected it.
  description: `Free scan, no account and no card: ${CHECKS.length} deterministic checks. One agent report ${priceOf(skuById('report-one')!)}, monitoring ${priceOf(skuById('watch-monthly')!)} a month, the audit priced by conversation.`,
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
    price: priceOf(skuById('report-one')!),
    cadence: 'once, per domain',
    pitch: 'Whether an agent names you at all, asked ten times over on two tools.',
    includes: [
      // "Ten" was written when every cell held five runs. One category already holds six on one
      // tool, and a floor is the only version of this sentence a topped-up cell cannot falsify.
      'One question from your category, the one your buyers ask, put to an agent at least ten times in isolation',
      // Five runs is what monitoring sends monthly and what the section below admits cannot
      // separate two close providers. Selling five as a one-off product would be selling the
      // weakness: a single reading has no next month to correct it.
      'Two different tools, five runs each at least. A result that appears on only one of them is about the tool',
      'How many of the ten named you, which provider was picked instead, and the sentence that passed over you, quoted',
      'Every transcript handed over, so you read what the agent said rather than our summary of it',
      `Only the ${CATEGORIES.length} categories we measure. If your product is not in one of them we say so before you pay, not after`,
    ],
    // „Credited against your first month of monitoring" stalo tu do 2026-08-20 i bylo obietnica bez
    // WARTOSCI, nie tylko bez mechanizmu: monitoring jest dzis darmowy (`monitoringIsFree`), wiec
    // kupujacy czytal „49 USD zaliczone" i dwie linijki nizej „Free while we are building it".
    // Czterdziesci dziewiec od zera. Zdania, ktorego nie umiemy poprzec, nie publikujemy o cudzych
    // firmach - i nie ma powodu, zeby wolno bylo o wlasnej ofercie. Druga polowa zostaje, bo jest
    // prawdziwa bez zadnego mechanizmu i robi cala robote, o ktora chodzilo.
    note: 'It is a sample of monitoring, not a competitor to it.',
    sample: { label: 'Read a real one, start to finish', href: '/d/sample' },
    cta: { label: 'Ask for a report', href: 'mailto:hello@letagentsin.com?subject=One%20agent%20report' },
  },
  {
    name: 'Monitoring',
    price: priceOf(skuById('watch-monthly')!),
    cadence: 'per domain, per month',
    pitch: 'Whether an agent can still use you, and whether it ever considers you at all.',
    includes: [
      'The same checks, rerun every week, so a verdict that moves is caught within days',
      'Real agents every month: one buying question, put to an agent five times in isolation, and how many of the five named you. The question is the unit here, and you can add more of them',
      `The agent runs cover the ${CATEGORIES.length} categories we measure. If your product is not in one of them we say so before you switch it on, rather than after`,
      'Which provider got picked instead, and the sentence that passed over you, quoted from the transcript',
      'One email when something moves, nothing when nothing does, which is most weeks',
      'No account and no card. One link in every email stops it',
    ],
    note: `Pay for ten months, get twelve. Three domains ${priceOf(skuById('watch-pack-3')!)} a month; Agency, ten domains, ${priceOf(skuById('watch-agency')!)}. Another buying question, asked the same way, ${priceOf(skuById('extra-question')!)} a month. Free while we are building it, and we will ask before it ever costs anything.`,
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
          Everything a machine can check is free. You pay for the part where real agents run.
        </h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
          The scan costs us bandwidth and nothing else, so it costs you nothing, wants no account and no card,
          and the formula is published with it. What is worth charging for is what a checklist cannot see: the same checks rerun every week
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
              {tier.sample && sampleReady && (
                <p className="font-mono text-xs">
                  <Link href={tier.sample.href} className="text-brass underline underline-offset-4">
                    {tier.sample.label}
                  </Link>
                </p>
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

      {/* The buyer who is going to say no says it because a check already runs in their pipeline.
          Written about pipelines rather than about a competitor: what we have measured is what our
          own scans see, and we have not independently measured anyone else's product. */}
      <section className="border-b border-rule py-12">
        <h2 className="text-lg font-semibold tracking-tight">What a check in your own pipeline cannot see</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          A readiness check that runs in CI is a good idea and you should have one. It reads your repository
          before you ship it, which is the cheapest moment to fix a missing file. Four of the things that
          decide whether an agent gets in are not in your repository at all, and no check that runs there can
          see them.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          <strong className="font-semibold text-ink">Your edge is production configuration, not
          code.</strong>{' '}
          {edge && (
            <>
              Sweeping all {edge.domains} domains in our corpus{' '}
              {edge.swept?.oneDay
                ? `on ${asDay(edge.swept.to)}`
                : edge.swept
                  ? `between ${asDay(edge.swept.from)} and ${asDay(edge.swept.to)}`
                  : ''}
              ,{' '}
              {edge.refused} of them refused our requests at their own edge and {edge.challenged} of those
              answered with a browser challenge rather than a rate limit.{' '}
            </>
          )} One vendor&apos;s documentation host challenged thirteen of the thirteen requests we made to
          it, which read as three checks going silent while nothing in their repository had changed; asked
          again on its own an hour later, the same host answered and all three came back. A bot rule added in
          a dashboard by somebody who never opens the pipeline is the most common way this fails, and it is
          invisible to your build and to any single scan alike.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          <strong className="font-semibold text-ink">Half the card is on somebody else&apos;s
          domain.</strong> Whether the package registry has your types under the name an agent would guess,
          whether a tool registry lists you, and what a search engine says about your pricing in the two lines
          an agent reads before deciding not to open the page: all of that is measured against hosts you do
          not deploy to. Your build passing says nothing about any of it.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          <strong className="font-semibold text-ink">A threshold cannot tell you an agent chose somebody
          else.</strong> That takes running an agent on a developer&apos;s problem and reading the sentence it
          used to reject you, which is the one thing no static check produces, and the thing our own published
          audits exist to produce.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          <strong className="font-semibold text-ink">A gate on a score fails builds on noise.</strong> We
          measure {NOISE_FLOOR_PERCENT.toFixed(2)} percent of verdicts moving between two clean scans with
          nothing changed. Any threshold that a normal week can cross gets muted within a month, and a muted
          gate is worse than no gate, because it is evidence somebody already looked.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Both belong in the same stack. Keep the check in CI for the files you control, and treat the series
          here as the part that watches everything you cannot fail a build on.
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
              `Monitoring says ${priceOf(skuById('watch-monthly')!)} and also says free. Which is it?`,
              'Free today, for everyone, and the price is printed so you know what it will become rather than finding out later. Nobody is charged without being asked first, and there is no card on file to charge.',
            ],
            [
              'Do your monitoring agents sign up for our product?',
              'No. A discovery run answers a question in an empty directory and touches nothing of yours: no form, no account, no key. Anything that creates something on your side happens only inside a paid audit, with your agreement and with somebody watching it, which is also why that half costs what it costs.',
            ],
            [
              'Is the monthly agent run automatic?',
              'The weekly half is: the checks rerun on a schedule and an email goes out when a verdict moves. The monthly half is not. The five agent runs are started by a person and the email is read before it is sent, because a run costs real money on somebody else\u2019s tools and a month with nothing to say is better spent not running it. What that means for you is that the monthly mail arrives on a day we choose rather than on the same date each month.',
            ],
            [
              'Five runs a month is not much of a sample.',
              'It is not, and it decides what the number is allowed to say. Five runs catch a wall every run hits, and they cannot separate you from a competitor that finishes close. So monitoring does not sell you a position: it reports how many of the five named you, and the thing worth reacting to is the month that number moves.',
            ],
            [
              'There are cheaper scanners that do a weekly check. Why is this priced above them?',
              // Bez nazwy i bez cudzej liczby, swiadomie. Draft z cena konkurenta lezy w
              // `docs/draft-priced-against.md` i tam zostaje: audyt decyzji (subagent, opus,
              // 2026-08-20) wskazal, ze cudza cena zestarzeje sie na naszej stronie bez niczyjej
              // interwencji, a nasza wlasna zasada zada, zeby czytelnik mogl twierdzenie odtworzyc -
              // czego przy „skanerze za 29 dolarow" bez adresu zrobic nie moze. Argument kategorii
              // daje kupujacemu to samo i nie kosztuje nas ani odtwarzalnosci, ani liczby do pilnowania.
              'They should be, and the weekly half of what we do is comparable to one. We would not argue you should pay more for a file check. What is not on offer at that price is the other half: five times a month we put a buying question to an agent in an empty directory, count who it named instead of you, and quote the sentence it named them with. A check that verifies a file exists cannot tell you that a run picked somebody else, or why. Ask that question of anything you are comparing us to, including us.',
            ],
            [
              'Everyone else in AI visibility sells prompts by the hundred. Why does this sell one question?',
              `Because a hundred prompts asked daily answers how often your name appears, and this answers whether an agent can use you once it does. The two are worth having together and they are not the same purchase. Our unit is a buying question, asked five times in isolation each month so the spread is visible, and you can add more questions at ${priceOf(skuById('extra-question')!)} a month each. If what you want is broad share-of-voice tracking across many prompts, a tool built for that will serve you better and we will say so rather than sell you ours.`,
            ],
            [
              'We look after a lot of client domains. Is there an agency price?',
              `Ten domains for ${priceOf(skuById('watch-agency')!)} a month is the Agency pack, and past that it is a conversation rather than a table. A report carrying your name rather than ours is work we would rather quote than pretend is automatic.`,
            ],
            [
              'Is there an annual price?',
              'Pay for ten months and get twelve. There is no minimum term on the monthly one either: monitoring stops from a link in any email we send you.',
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
