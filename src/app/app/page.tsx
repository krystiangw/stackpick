import { AdminConsole } from '@/components/admin-console'
import { getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

export default async function AppPage() {
  const store = getStore()
  const [reports, leads] = await Promise.all([store.listReports(50), store.listLeads(50)])

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-mono text-2xl font-semibold tracking-tight">Console</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        Run a scan, then send the scorecard to whoever owns the domain. Outbound goes out one address at a
        time and on purpose.
      </p>

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
