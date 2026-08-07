import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Findings — StackPick',
  description: 'Twenty agent runs, two models, two conditions. What agents pick when nobody is watching.',
}

const RESULTS = [
  {
    id: 'sources',
    heading: 'Whether your docs get read depends on the model, not on your docs',
    numbers: [
      ['Stronger model, runs that fetched live sources', '10 / 10'],
      ['Cheaper model, runs that fetched live sources', '0 / 10'],
      ['Average tool calls per run', '13 vs 7'],
    ],
    body: [
      'The result replicated across both conditions, so it is not an artefact of one prompt. The stronger model pulled provider documentation, MDN and the npm registry in every run. The cheaper one declared it was working from its own knowledge, in all ten runs, and fetched nothing.',
      'The commercial consequence is uncomfortable: your investment in llms.txt, MCP and fresh documentation reaches roughly half the market. The other half gets whatever the model memorised during training.',
    ],
    quote: {
      text: 'Last published 2.0.2 on 2023-03-06, so over three years without a release despite 1.5 million weekly downloads. Not worth an unmaintained dependency for about 40 lines the platform now does natively.',
      caption:
        'The stronger model rejecting a package the cheaper model recommended in three runs. We verified the registry independently: version 2.0.2, published 6 March 2023, 1,527,048 weekly downloads.',
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
    heading: 'Five providers were never in the conversation at all',
    numbers: [
      ['Never selected, but considered and rejected', '19 of 20'],
      ['Providers with zero mentions across all runs', '4'],
    ],
    body: [
      'One provider was rejected in nineteen of twenty runs in almost identical words, because it assumes a framework the project did not use. That is a positioning problem fixable with one documentation chapter, and the company cannot fix it because nobody told them it happens.',
      'Four other providers were never mentioned once, not even on rejection lists. Meanwhile agents volunteered options we had not asked about. An agent does not start with an empty list, it starts with its own list, and being outside it is not losing a comparison, it is not being at the table.',
    ],
  },
]

export default function FindingsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6">
      <section className="border-b border-rule py-14">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">Research</p>
        <h1 className="mt-4 max-w-2xl text-balance text-4xl font-semibold leading-tight tracking-tight">
          Twenty agents, one task, nobody watching
        </h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
          Each run received the same brief: add image upload and storage to this app, solidly enough to
          ship, and decide alone because nobody will answer questions. No provider names, no mention of an
          audit, clean context in every run. Two models, two conditions: an empty project, and a working
          application with a real API client.
        </p>
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
              <blockquote className="text-lg italic leading-relaxed">{result.quote.text}</blockquote>
              <figcaption className="mt-2 font-mono text-xs text-ink-faint">{result.quote.caption}</figcaption>
            </figure>
          )}
        </section>
      ))}

      <section className="py-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Limits we will not hide</h2>
        <ol className="mt-5 flex max-w-2xl flex-col gap-4">
          {[
            'Five to six runs per cell. The direction of both main results is one-sided enough that we expect the proportions to sharpen rather than flip, but the sample is small and we say so.',
            'One prompt variant per condition. Sensitivity to how the task is worded is the next measurement, not a solved question.',
            'Decisions were stated, not executed. Agents did not install packages, so this measures selection and not integration success.',
            'Two models from one family. Other coding tools may choose differently.',
            'One specific scaffold in the real-code condition. A different codebase gives a different answer, which is precisely the finding.',
          ].map((limit, index) => (
            <li key={limit} className="grid grid-cols-[2rem_1fr] gap-4">
              <span className="font-mono text-xs text-ink-faint">{String(index + 1).padStart(2, '0')}</span>
              <span className="text-sm leading-relaxed text-ink-soft">{limit}</span>
            </li>
          ))}
        </ol>
        <p className="mt-8 max-w-2xl leading-relaxed text-ink-soft">
          The free scans on this site are published as they are produced, because they read only what any
          browser can read and every vendor can reproduce or dispute them from the methodology page. A
          different rule applies to anything we write up as research: a scored vendor gets the draft and ten
          working days before it goes out, because an interpretation deserves a right of reply in a way that
          a reproducible HTTP check does not.
        </p>
      </section>
    </main>
  )
}
