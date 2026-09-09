import type { Metadata } from 'next'
import Link from 'next/link'
import { TrackedLink } from '@/components/tracked-link'
import { listAudits, tally } from '@/lib/audit'
import { recordVisit } from '@/lib/visits'
import { headers } from 'next/headers'
import { SITE_URL } from '@/lib/site'

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const spell = (n: number) => WORDS[n] ?? String(n)

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  alternates: { canonical: `${SITE_URL}/audit` },
  title: 'Coding agent integration studies: choices and blockers · Let Agents In',
  description:
    'Every category we have measured, in isolated copies of a real application. What agents chose, what they rejected, and where each of them stopped.',
}

export default async function AuditIndexPage() {
  recordVisit('/audit', (await headers()).get('user-agent'))
  const audits = await listAudits()
  const runs = audits.reduce((sum, audit) => sum + audit.runs.length, 0)
  const categories = new Set(audits.map((audit) => audit.category)).size
  const blocked = audits.reduce(
    (sum, audit) => sum + audit.runs.filter((run) => Boolean(run.blockedBy)).length,
    0,
  )

  return (
    <main className="mx-auto max-w-5xl px-6">
      <section className="border-b border-rule py-14">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">Full agent audits</p>
        <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight">
          Agent integration studies across {spell(categories)} categories
        </h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
          Agents received a brief in isolated copies of a working application. Each study records the sources they consulted.
          Across {runs} runs, {blocked} reported a step that needed a human.
        </p>
      </section>

      <section className="py-4">
        {audits.map((audit) => {
          const counts = tally(audit)
          const winner = counts.chosen[0]
          return (
            <article key={audit.slug} className="border-b border-rule py-10">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="font-mono text-xs uppercase tracking-[0.15em] text-brass">{audit.category}</p>
                <p className="font-mono text-xs text-ink-faint">
                  {audit.subject} · {audit.runDate}
                </p>
              </div>

              <h2 className="mt-4 max-w-3xl text-balance text-2xl font-semibold leading-snug tracking-tight">
                <Link href={`/audit/${audit.slug}`} className="hover:text-brass">
                  {audit.verdict.headline}
                </Link>
              </h2>

              <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3 font-mono text-xs">
                {[
                  ['Runs', String(counts.totalRuns)],
                  ['Chose the subject', `${counts.subjectChosen} / ${counts.totalRuns}`],
                  ['Never named it', `${counts.subjectUnmentioned} / ${counts.totalRuns}`],
                  ...(winner ? ([['Picked instead', `${winner.vendor}, ${winner.count} of ${counts.totalRuns}`]] as const) : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-1">
                    <dt className="text-ink-faint">{label}</dt>
                    <dd className="tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-soft">{audit.verdict.body[0]}</p>

              <p className="mt-4">
                <Link href={`/audit/${audit.slug}`} className="font-mono text-sm text-brass underline underline-offset-4">
                  Read the full audit
                </Link>
              </p>
            </article>
          )
        })}
      </section>

      <section className="py-12">
        <h2 className="text-lg font-semibold tracking-tight">Commission an integration audit</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          These public studies cover vendors I have no relationship with. Nothing from a paid audit is published without your written agreement.
        </p>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">
          If a finding about your product is wrong, write to me. I publish the correction beside the finding or take the page down.
          You do not need to buy an audit to request a correction.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <TrackedLink click="pricing" href="/pricing" className="bg-ink px-5 py-3 font-mono text-sm text-ground transition-opacity hover:opacity-85">
            What it costs
          </TrackedLink>
          <TrackedLink
            click="mail-audit"
            href="mailto:hello@letagentsin.com?subject=Full%20agent%20audit"
            className="border border-ink/40 px-5 py-3 font-mono text-sm transition-colors hover:border-brass hover:text-brass"
          >
            Ask what your brief would be
          </TrackedLink>
        </div>
      </section>
    </main>
  )
}
