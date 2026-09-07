import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { VisibilityForm } from '@/components/visibility-form'
import { recordVisit } from '@/lib/visits'
import { SITE_URL } from '@/lib/site'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Can AI agents find your product? · Let Agents In', description: 'Recorded brand mentions and citations from Codex, Claude and Gemini, with Perplexity Search shown separately.', alternates: { canonical: `${SITE_URL}/visibility` } }

export default async function VisibilityPage({ searchParams }: { searchParams: Promise<{ audit?: string }> }) {
  recordVisit('/visibility', (await headers()).get('user-agent'))
  const hasAudit = /^[a-f0-9]{32}$/.test((await searchParams).audit ?? '')
  return <main className="mx-auto max-w-4xl px-6">
    {!hasAudit && <section className="border-b border-rule py-14">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">AI visibility audit · beta</p>
      <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight">See which answers mention your product</h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">Enter your brand, domain and category. The report shows the exact questions, recorded mentions and links to your site. Answers can change between runs.</p>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">Results appear here when the queued run finishes. The status panel shows whether a worker is available; there is no fixed completion time.</p>
    </section>}
    <section className={hasAudit ? 'py-10' : 'py-12'}><VisibilityForm /></section>
    {!hasAudit && <section className="border-t border-rule py-12"><h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">What each report measures</h2><div className="mt-6 grid gap-px bg-rule sm:grid-cols-2"><div className="bg-ground p-6"><p className="font-semibold">Agent answers</p><p className="mt-2 text-sm leading-relaxed text-ink-soft">Dated answers and brand citations, with Perplexity Search results shown separately.</p></div><div className="bg-ground p-6"><p className="font-semibold">HTTP scan</p><p className="mt-2 text-sm leading-relaxed text-ink-soft">Public documentation and access signals. The scan does not attempt signup or complete an integration.</p></div></div></section>}
  </main>
}
