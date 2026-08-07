import type { Metadata } from 'next'
import Link from 'next/link'
import { CHECKS, MAX_SCORE } from '@/lib/score'

export const metadata: Metadata = {
  title: 'Pricing — StackPick',
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
      `${CHECKS.length} deterministic checks across five funnel stages, ${MAX_SCORE} points`,
      'A permanent link you can forward',
      'The published formula, so the number can be argued with',
    ],
    cta: { label: 'Scan your domain', href: '/' },
  },
  {
    name: 'Diagnostic',
    price: '$2,900',
    cadence: 'one week',
    pitch: 'The scan, verified by hand, against your competitors.',
    includes: [
      'Every automated finding checked manually, including the ones the scanner got wrong',
      'Side by side with three competitors in your category',
      'Fix list ordered by effect over effort',
      'Sixty minutes to walk through it with whoever owns the fix',
    ],
    note: 'Credited in full against a Full audit booked within 90 days.',
    cta: { label: 'Ask about a diagnostic', href: 'mailto:gwizdala.kr@gmail.com?subject=Diagnostic' },
  },
  {
    name: 'Full audit',
    price: '$11,000',
    cadence: 'two to three weeks',
    pitch: 'What agents actually do when nobody is watching.',
    includes: [
      'Twelve or more real agent runs against a real codebase, recorded',
      'Which provider gets picked over you, and the words used to reject you',
      'Where an agent stalls: registration, credentials, or the first integration',
      'A re-measure after 60 days, so the change is a number and not an opinion',
    ],
    featured: true,
    cta: { label: 'Ask about an audit', href: 'mailto:gwizdala.kr@gmail.com?subject=Full%20agent%20audit' },
  },
]

const AFTER = [
  {
    name: 'Fix sprint',
    price: '$7,500 – $16,000',
    body: 'Implementation, not advice: documentation that answers the question agents actually ask, llms.txt worth reading, an entry point built for a machine, a credential path that does not need a human.',
  },
  {
    name: 'MCP build',
    price: '$14,000 – $28,000',
    body: 'An MCP server for your API, scoped from the audit rather than from a wishlist. MVP or a standard build with OAuth and write access.',
  },
  {
    name: 'Retainer',
    price: '$3,000 / month',
    body: 'Quarterly re-measurement, alerts when your score moves, and priority access. Only worth buying after an audit, because before one there is nothing to compare against.',
  },
]

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6">
      <section className="border-b border-rule py-14">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">Pricing</p>
        <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight">
          The scan is free because it costs us nothing. The audit is not, because it cannot be automated.
        </h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
          Everything a scanner can check, you can have for nothing, including the formula. What you pay for is
          the part that requires running real agents against real code and reading what they did.
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

      <section className="border-b border-rule py-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">After the findings</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          An audit that ends in a document changes nothing. These are scoped from what the audit found, so the
          work is already argued for before it starts.
        </p>
        <div className="mt-8 flex flex-col">
          {AFTER.map((item) => (
            <div key={item.name} className="grid gap-2 border-t border-rule py-5 sm:grid-cols-[14rem_1fr] sm:gap-8">
              <div className="flex flex-col gap-1">
                <h3 className="font-mono text-sm font-medium">{item.name}</h3>
                <p className="font-mono text-sm tabular-nums text-brass">{item.price}</p>
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-ink-soft">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Questions people ask first</h2>
        <dl className="mt-6 flex flex-col">
          {[
            [
              'Do you bill hourly?',
              'For work outside a package, $250 an hour with an eight hour minimum. It is rarely the right shape: the value here is a measurement and a decision, not time at a desk.',
            ],
            [
              'What if the audit finds nothing?',
              'Then you get that in writing, with the runs to back it up, and you stop worrying about it. A report that cannot come back empty is not a measurement, so that outcome has to stay on the table.',
            ],
            [
              'Why is the free scan actually free?',
              'It is HTTP requests. No language model runs, so it costs bandwidth and nothing else. Charging for it would be charging for a script, and the script is published.',
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
