import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getStore } from '@/lib/store'
import { normalizeDomain } from '@/lib/scan/discover'
import { categoryFor } from '@/lib/categories'
import { SITE_URL } from '@/lib/site'
import { CHECKS, STAGES, type ScoredCheck } from '@/lib/score'
import { WatchForm } from '@/components/watch-form'

/**
 * The address for a vendor, as opposed to the address for one scan of it. /r/<id> names a
 * measurement and stops being true the moment we reseed, which is every few days; anybody who
 * cited us was citing a page about to be replaced. This one names the company and always shows
 * the newest scan we hold, so it can be linked, indexed and argued with.
 */
export const dynamic = 'force-dynamic'

const measurableOf = (card: { total: number; measurable?: number; max: number }) => card.measurable ?? card.max

export async function generateMetadata({ params }: { params: Promise<{ domain: string }> }): Promise<Metadata> {
  const { domain } = await params
  const name = normalizeDomain(decodeURIComponent(domain))
  const report = await getStore().latestForDomain(name)
  if (!report) return { title: `${name}: not measured yet · Let Agents In` }

  const { scorecard } = report
  const measurable = measurableOf(scorecard)
  return {
    title: `Is ${name} ready for AI agents? ${scorecard.total}/${measurable} · Let Agents In`,
    description:
      `${name} scores ${scorecard.total} of ${measurable} measurable points across ${CHECKS.length} ` +
      'deterministic HTTP checks: whether an agent can find it, register with it and integrate it.',
    alternates: { canonical: `${SITE_URL}/v/${name}` },
    openGraph: { title: `${name} · ${scorecard.total}/${measurable}`, type: 'article' },
  }
}

function verdictTone(check: ScoredCheck) {
  if (check.points === check.max) return { label: 'PASS', className: 'text-pass' }
  if (check.notApplicable) return { label: 'N/A', className: 'text-ink-faint' }
  if (check.inconclusive) return { label: 'UNMEASURED', className: 'text-ink-faint' }
  if (check.points > 0) return { label: 'PART', className: 'text-warn' }
  return { label: 'FAIL', className: 'text-fail' }
}

export default async function VendorPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params
  const name = normalizeDomain(decodeURIComponent(domain))
  const report = await getStore().latestForDomain(name)
  if (!report) notFound()

  const { scorecard } = report
  const measurable = measurableOf(scorecard)
  const category = categoryFor(name)
  const scannedOn = report.scannedAt.slice(0, 10)
  const unmeasured = scorecard.checks.filter((check) => check.inconclusive).length

  return (
    <main className="mx-auto flex max-w-3xl flex-col px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">
        Agent readiness{category ? ` · ${category.label}` : ''}
      </p>
      <h1 className="mt-3 text-3xl font-semibold">{name}</h1>
      <p className="mt-4 max-w-2xl leading-relaxed">
        <strong>
          {scorecard.total} of {measurable} measurable points
        </strong>{' '}
        under formula {scorecard.formulaVersion}, measured on {scannedOn}. {CHECKS.length} checks exist; each is
        one HTTP request with a{' '}
        <Link href="/methodology" className="text-brass underline underline-offset-4">
          published rule
        </Link>
        , so every sentence below can be rerun and argued with.
        {unmeasured > 0 && (
          <>
            {' '}
            {unmeasured} of them could not be measured from where we ask, and those are left out of the
            denominator rather than counted as failures.
          </>
        )}
      </p>

      <div className="mt-10">
        {STAGES.map((stage) => {
          const checks = scorecard.checks.filter((check) => check.stage === stage.id)
          if (checks.length === 0) return null
          return (
            <div key={stage.id} className="border-t border-rule py-4">
              <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">
                {stage.letter} · {stage.title}
              </h2>
              <ul className="mt-3 flex flex-col gap-3">
                {checks.map((check) => {
                  const tone = verdictTone(check)
                  return (
                    <li key={check.id} className="grid grid-cols-[5.5rem_1fr] gap-4">
                      <span className={`font-mono text-xs font-semibold ${tone.className}`}>{tone.label}</span>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">{check.label}</span>
                        <span className="font-mono text-xs text-ink-soft">{check.detail}</span>
                        {check.unblock && <span className="text-xs italic text-ink-faint">{check.unblock}</span>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>

      <section className="mt-10 border-t border-rule pt-6">
        <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">Tell me when this changes</h2>
        <p className="mt-3 max-w-2xl leading-relaxed">
          The failures here are the kind nobody notices. An edge rule that starts refusing agents changes
          nothing a person sees in a browser, so the first sign is usually an integration that quietly stopped
          working. We rescan weekly and write only when a verdict moves.
        </p>
        <div className="mt-4 max-w-2xl">
          <WatchForm domain={name} />
        </div>
      </section>

      <section className="mt-10 border-t border-rule pt-6 text-sm text-ink-soft">
        <p className="max-w-2xl leading-relaxed">
          This page is the newest scan we hold for {name} and changes when we rescan. It is not a judgement of
          the product: we measure whether an unattended run can get through, not whether the thing is any good.
          The whole corpus is published as{' '}
          <a href="/corpus.json" className="text-brass underline underline-offset-4">
            JSON
          </a>{' '}
          and{' '}
          <a href="/corpus.csv" className="text-brass underline underline-offset-4">
            CSV
          </a>
          .
        </p>
        <p className="mt-4">
          <Link href="/report" className="text-brass underline underline-offset-4">
            Scan a domain yourself
          </Link>
        </p>
      </section>
    </main>
  )
}
