import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Findings — StackPick',
  description: 'Thirty-eight runs, five studies, two models. What agents pick when nobody is watching, and where every one of them stops.',
}

const RESULTS = [
  {
    id: 'wall',
    heading: 'Four categories, eighteen runs, one wall in four disguises',
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
      text: 'I stopped at the signup form. What it would take: one person, about three minutes.',
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
      caption:
        'The stronger model rejecting a package the cheaper model recommended in three runs. We verified the registry independently on 7 August 2026: version 2.0.2, published 6 March 2023, 1,527,048 downloads that week.',
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
]

export default function FindingsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6">
      <section className="border-b border-rule py-14">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">Research</p>
        <h1 className="mt-4 max-w-2xl text-balance text-4xl font-semibold leading-tight tracking-tight">
          Thirty-eight runs, five studies, nobody watching
        </h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
          Five studies so far, across four categories: image upload and storage twice, a rich text editor,
          authentication for a support tool, and payments. Every run received a brief and nothing else. No provider names,
          no mention of an audit, no hint that anyone was watching, and no way to ask a question. Two models,
          isolated copies of a real application, and a record of every source each run consulted, separating
          the pages it read from the summaries it only skimmed.
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
            'Five to six runs per cell in the first study, two per cell in the later ones. The direction of both main results is one-sided enough that we expect the proportions to sharpen rather than flip, but the sample is small and we say so.',
            'One prompt variant per condition. Sensitivity to how the task is worded is the next measurement, not a solved question.',
            'In the first study decisions were stated, not executed: nothing was installed, so it measured selection rather than integration. The three later studies did install and verify, and each choice there is confirmed from the files the run left behind.',
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
