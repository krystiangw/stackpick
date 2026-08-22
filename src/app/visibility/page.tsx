import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { VisibilityForm } from '@/components/visibility-form'
import { recordVisit } from '@/lib/visits'
import { SITE_URL } from '@/lib/site'
import { configuredVisibilityProviders } from '@/lib/visibility-audit'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Can AI agents find your product? · Let Agents In', description: 'Measure whether ChatGPT, Claude, Gemini and Perplexity name and cite your product in neutral discovery questions.', alternates: { canonical: `${SITE_URL}/visibility` } }

export default async function VisibilityPage() {
  recordVisit('/visibility', (await headers()).get('user-agent'))
  const providers = configuredVisibilityProviders()
  return <main className="mx-auto max-w-4xl px-6">
    <section className="border-b border-rule py-14">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">AI visibility audit · beta</p>
      <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight">Can agents find you before they try to use you?</h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">We ask neutral category questions without naming your company, then report whether each answer mentions you, links to you, and which exact prompt produced the result. This is a variable model observation, not the deterministic readiness score.</p>
    </section>
    <section className="py-12"><VisibilityForm providers={providers} /></section>
    <section className="border-t border-rule py-12"><h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Two different questions</h2><div className="mt-6 grid gap-px bg-rule sm:grid-cols-2"><div className="bg-ground p-6"><p className="font-semibold">Can agents find you?</p><p className="mt-2 text-sm leading-relaxed text-ink-soft">A dated sample of model answers. Repeated prompts can move.</p></div><div className="bg-ground p-6"><p className="font-semibold">Can agents use you?</p><p className="mt-2 text-sm leading-relaxed text-ink-soft">Deterministic HTTP checks of discovery, signup, credentials and integration.</p></div></div></section>
  </main>
}
