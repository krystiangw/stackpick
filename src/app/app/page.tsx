import { AdminConsole } from '@/components/admin-console'
import { getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

export default async function AppPage() {
  const store = getStore()
  const [reports, leads, visits] = await Promise.all([
    store.listReports(50),
    store.listLeads(50),
    store.listVisits(30),
  ])
  // Split the way the product's whole argument splits: what a browser did and what a client
  // someone wrote did. Nothing here identifies anybody, and none of it is published.
  // The kind is the last token of the stored path, so a named crawler counts as itself rather than
  // falling into 'browser' the way an endsWith(' agent') test would put it there.
  const byKind = visits.reduce<Record<string, number>>((totals, visit) => {
    const kind = visit.path.slice(visit.path.lastIndexOf(' ') + 1)
    totals[kind] = (totals[kind] ?? 0) + visit.count
    return totals
  }, {})
  const crawlers = Object.entries(byKind)
    .filter(([kind]) => kind !== 'browser' && kind !== 'agent')
    .sort((a, b) => b[1] - a[1])

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-mono text-2xl font-semibold tracking-tight">Console</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        Run a scan, then send the scorecard to whoever owns the domain. Outbound goes out one address at a
        time and on purpose.
      </p>

      <section className="mt-8 border-t border-rule pt-6">
        <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-ink-faint">Last 30 days</h2>
        <p className="mt-2 font-mono text-sm">
          {byKind.browser ?? 0} browser renders · {byKind.agent ?? 0} from unnamed clients that are not a browser
        </p>
        <p className="mt-2 max-w-2xl font-mono text-xs text-ink-soft">
          {crawlers.length > 0
            ? `named crawlers: ${crawlers.map(([name, count]) => `${name} ${count}`).join(' · ')}`
            : 'no named crawler has fetched a counted page yet'}
        </p>
        <ul className="mt-3 flex flex-col gap-1 font-mono text-xs text-ink-soft">
          {visits.slice(0, 12).map((visit) => (
            <li key={`${visit.day}${visit.path}`}>
              {visit.day} · {visit.path} · {visit.count}
            </li>
          ))}
          {visits.length === 0 && <li>nothing counted yet</li>}
        </ul>
      </section>

      <AdminConsole
        reports={reports.map((report) => ({
          id: report.id,
          domain: report.domain,
          scannedAt: report.scannedAt,
          total: report.scorecard.total,
          max: report.scorecard.max,
        }))}
        leads={leads}
      />
    </main>
  )
}
