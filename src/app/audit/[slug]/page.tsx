import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAudit, listAudits, tally } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const audit = await getAudit(slug)
  if (!audit) return { title: 'Audit not found — StackPick' }
  return {
    title: `${audit.subject}: what agents actually did`,
    description: audit.verdict.headline,
    openGraph: { title: `${audit.subject} · agent audit`, description: audit.verdict.headline },
  }
}

export async function generateStaticParams() {
  return (await listAudits()).map((audit) => ({ slug: audit.slug }))
}

export default async function AuditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const audit = await getAudit(slug)
  if (!audit) notFound()

  const counts = tally(audit)
  const subjectRejections = audit.runs.flatMap((run) =>
    run.rejected
      .filter((rejection) => rejection.vendor === audit.subject)
      .map((rejection) => ({ ...rejection, run: run.id, model: run.model })),
  )

  return (
    <main className="mx-auto max-w-5xl px-6">
      <section className="border-b border-rule py-14">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">
          Full agent audit · {audit.subject} · {audit.runDate}
        </p>
        <h1 className="mt-5 max-w-3xl text-balance text-3xl font-semibold leading-[1.15] tracking-tight sm:text-[2.75rem]">
          {audit.verdict.headline}
        </h1>

        <div className="mt-10 grid gap-px bg-rule sm:grid-cols-3">
          {[
            ['Runs', String(counts.totalRuns), 'agents, one brief, decisions made alone'],
            [
              `Chose ${audit.subject}`,
              `${counts.subjectChosen} / ${counts.totalRuns}`,
              counts.subjectChosen === 0 ? 'not once' : 'times',
            ],
            [
              'Never mentioned you',
              `${counts.subjectUnmentioned} / ${counts.totalRuns}`,
              'not even to reject you',
            ],
          ].map(([label, value, caption]) => (
            <div key={label} className="flex flex-col gap-1 bg-ground p-5">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ink-faint">{label}</span>
              <span className="font-mono text-3xl font-semibold tabular-nums tracking-tight">{value}</span>
              <span className="font-mono text-xs text-ink-faint">{caption}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-rule py-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">What the agents were asked</h2>
        <blockquote className="mt-5 max-w-2xl border-l-2 border-brass pl-5 text-lg italic leading-relaxed">
          {audit.task}
        </blockquote>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-soft">
          No vendor names, no mention of an audit, no hint that anyone was watching. {audit.scaffold}
        </p>
      </section>

      <section className="border-b border-rule py-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Who they picked</h2>
        <ol className="mt-6 flex flex-col">
          {counts.chosen.map((entry) => (
            <li
              key={entry.vendor}
              className={`grid grid-cols-[1fr_auto] items-center gap-4 border-t border-rule py-3 ${
                entry.vendor === audit.subject ? 'bg-brass-soft px-3' : ''
              }`}
            >
              <span className={`font-mono text-sm ${entry.vendor === audit.subject ? 'font-semibold' : 'text-ink-soft'}`}>
                {entry.vendor}
              </span>
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-24 bg-sunken sm:w-40">
                  <div className="h-full bg-ink-faint" style={{ width: `${(entry.count / counts.totalRuns) * 100}%` }} />
                </div>
                <span className="w-16 text-right font-mono text-sm tabular-nums">
                  {entry.count} / {counts.totalRuns}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {subjectRejections.length > 0 && (
        <section className="border-b border-rule py-12">
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">
            Why they rejected {audit.subject}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Every run that named {audit.subject} appears here. Where the run left a sentence we hold verbatim, it is
            quoted; where it did not, the entry is our summary of that run&rsquo;s own report and says so.
          </p>
          <div className="mt-6 flex flex-col gap-6">
            {subjectRejections.map((rejection) => (
              <figure key={`${rejection.run}-${rejection.vendor}`} className="border-l-2 border-fail pl-5">
                <figcaption className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">
                  Run {rejection.run}, {rejection.model} · {rejection.verbatim ? 'verbatim' : 'our summary, no quotation archived'}
                </figcaption>
                {rejection.verbatim ? (
                  <>
                    <blockquote className="mt-2 text-lg italic leading-relaxed">{rejection.verbatim}</blockquote>
                    <p className="mt-2 font-mono text-xs text-ink-faint">{rejection.reason}</p>
                  </>
                ) : (
                  <p className="mt-2 text-lg leading-relaxed">{rejection.reason}</p>
                )}
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="border-b border-rule py-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Did they read anything live</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          An agent that never fetches a page cannot see your documentation, however good it is. It recommends
          from memory, and memory is a year out of date.
        </p>
        <div className="mt-6 flex flex-col">
          {counts.liveSourcesByModel.map((entry) => (
            <div key={entry.model} className="grid grid-cols-[1fr_auto] items-center gap-4 border-t border-rule py-3">
              <span className="font-mono text-sm">{entry.model}</span>
              <span className={`font-mono text-sm tabular-nums ${entry.used === 0 ? 'text-fail' : entry.used === entry.of ? 'text-pass' : 'text-warn'}`}>
                {entry.used} / {entry.of} runs fetched live sources
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-rule py-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">What we make of it</h2>
        <div className="mt-5 flex max-w-2xl flex-col gap-4">
          {audit.verdict.body.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="leading-relaxed text-ink-soft">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      <section className="border-b border-rule py-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">What to change</h2>
        <ol className="mt-6 flex flex-col">
          {audit.recommendations.map((recommendation, index) => (
            <li key={recommendation.title} className="grid gap-2 border-t border-rule py-5 sm:grid-cols-[2rem_1fr_5rem] sm:gap-6">
              <span className="font-mono text-xs text-ink-faint">{String(index + 1).padStart(2, '0')}</span>
              <div className="flex flex-col gap-1">
                <h3 className="font-medium">{recommendation.title}</h3>
                <p className="max-w-2xl text-sm leading-relaxed text-ink-soft">{recommendation.body}</p>
              </div>
              <span className="font-mono text-xs uppercase tracking-widest text-brass sm:text-right">
                {recommendation.effort}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="py-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Limits of this audit</h2>
        <ol className="mt-5 flex max-w-2xl flex-col gap-3">
          {audit.limits.map((limit) => (
            <li key={limit} className="grid grid-cols-[0.9rem_1fr] gap-3 text-sm leading-relaxed text-ink-soft">
              <span aria-hidden className="font-mono text-ink-faint">
                ·
              </span>
              <span>{limit}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-rule py-12">
        <h2 className="text-lg font-semibold tracking-tight">This is what a full audit produces</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          Agents on one brief, in isolated copies of a real codebase, nobody watching, every source they
          consulted recorded. The same instrument pointed at your product and your category takes two to three
          weeks.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/pricing" className="bg-ink px-5 py-3 font-mono text-sm text-ground transition-opacity hover:opacity-85">
            What it costs
          </Link>
          <a
            href="mailto:gwizdala.kr@gmail.com?subject=Full%20agent%20audit"
            className="border border-ink/40 px-5 py-3 font-mono text-sm transition-colors hover:border-brass hover:text-brass"
          >
            Ask what your brief would be
          </a>
        </div>
      </section>
    </main>
  )
}
