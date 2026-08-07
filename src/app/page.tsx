import Link from 'next/link'
import { Rankings } from '@/components/rankings'
import { ScanForm } from '@/components/scan-form'
import { loadRankings } from '@/lib/rankings'
import { CHECKS, MAX_SCORE, STAGES } from '@/lib/score'

export const dynamic = 'force-dynamic'

const EVIDENCE = [
  {
    figure: '10 / 10',
    against: '0 / 10',
    claim: 'Whether your documentation gets read at all depends on which model your customer uses.',
    detail:
      'Across twenty independent runs, the stronger model pulled live documentation in every single run. The cheaper one did not fetch a single external source, in any run, and said so: own knowledge only.',
  },
  {
    figure: '5 → 0',
    against: 'one line of code',
    claim: 'A provider that won every greenfield run lost every run against a real codebase.',
    detail:
      'The app already had a session cookie. Adopting that provider meant running a second identity system just to upload a file, and three separate runs rejected it in almost the same words.',
  },
  {
    figure: '0 / 20',
    against: 'considered in 19',
    claim: 'Being rejected for the same reason nineteen times is a positioning problem, not a product one.',
    detail:
      'One provider was never selected, yet was considered and dismissed in nineteen of twenty runs, always because it assumes a framework the project did not use. One documentation chapter fixes it.',
  },
]

export default async function Home() {
  const rankings = await loadRankings()

  return (
    <main className="mx-auto max-w-5xl px-6">
      <section className="border-b border-rule py-16 sm:py-24">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">Agent readiness, measured</p>
        <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
          Your next customer is an agent, and it already decided without asking you.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
          When a developer says “add file uploads”, an agent picks the provider, reads the docs, and writes
          the integration. StackPick measures whether it can pick you, register, get credentials and ship.
        </p>
        <div className="mt-8 max-w-xl">
          <ScanForm autoFocus />
        </div>
        <p className="mt-3 font-mono text-xs text-ink-faint">
          Free. No account. Reads only what any browser can read.
        </p>
      </section>

      <section className="border-b border-rule py-14">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">What we found</h2>
        <div className="mt-8 grid gap-px bg-rule sm:grid-cols-3">
          {EVIDENCE.map((item) => (
            <article key={item.figure} className="flex flex-col gap-3 bg-ground p-6">
              <div className="flex items-baseline gap-2 font-mono">
                <span className="text-3xl font-semibold tracking-tight tabular-nums">{item.figure}</span>
                <span className="text-xs text-ink-faint">{item.against}</span>
              </div>
              <h3 className="text-balance font-medium leading-snug">{item.claim}</h3>
              <p className="text-sm leading-relaxed text-ink-soft">{item.detail}</p>
            </article>
          ))}
        </div>
        <p className="mt-6 font-mono text-xs text-ink-faint">
          Twenty runs, two models, two conditions, clean context.{' '}
          <Link href="/findings" className="text-brass underline underline-offset-4">
            Read the method
          </Link>
        </p>
      </section>

      <Rankings rankings={rankings} />

      <section className="border-b border-rule py-14">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">The five stages</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Most scanners stop at whether you publish a file. The interesting failures happen further down the
          funnel, where an agent has already chosen you and still cannot finish.
        </p>
        <ol className="mt-8 flex flex-col">
          {STAGES.map((stage) => (
            <li key={stage.id} className="grid grid-cols-[2rem_1fr] gap-4 border-t border-rule py-4 sm:grid-cols-[3rem_12rem_1fr]">
              <span className="font-mono text-sm text-brass">{stage.letter}</span>
              <span className="font-mono text-sm font-medium">{stage.title}</span>
              <span className="col-span-2 text-sm text-ink-soft sm:col-span-1">{stage.question}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="py-14">
        <div className="grid gap-px bg-rule md:grid-cols-2">
          <div className="flex flex-col gap-3 bg-ground p-8">
            <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Free scan</h3>
            <p className="text-2xl font-semibold tracking-tight">What a machine can see</p>
            <p className="text-sm leading-relaxed text-ink-soft">
              {CHECKS.length} deterministic checks across the five stages, {MAX_SCORE} points. Published formula,
              reproducible result, no model involved. Runs in under a minute.
            </p>
            <div className="mt-2 max-w-sm">
              <ScanForm />
            </div>
          </div>
          <div className="flex flex-col gap-3 bg-ground p-8">
            <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Full audit</h3>
            <p className="text-2xl font-semibold tracking-tight">What an agent actually does</p>
            <p className="text-sm leading-relaxed text-ink-soft">
              Real agents, real runs, recorded. Which provider they pick over you and in which words they
              reject you. Then the fix list, and a re-measure to prove it moved.
            </p>
            <p className="text-sm leading-relaxed text-ink-soft">
              This is the part no scanner can give you, because it is a measurement of behaviour, not of files.
            </p>
            <Link
              href="/pricing"
              className="mt-2 w-fit border border-ink px-5 py-2.5 font-mono text-sm transition-colors hover:bg-ink hover:text-ground"
            >
              See what an audit costs
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
