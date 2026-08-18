import { scanDomain, UnreachableDomainError } from './scan'
import { asksUsToStayOutOf } from './scan/robots'
import { scoreFindings } from './score'
import { gateScan } from './scan-gate'
import { getStore, reportId, type Report , holdUnsaved } from './store'

/**
 * One scan path for every surface that offers a scan. The REST endpoint and the MCP tool were
 * the third place in this codebase where the same logic would have existed twice, and the last
 * two both drifted.
 */
export type ScanRun =
  | { kind: 'ok'; report: Report; reused: boolean; kept?: boolean }
  | { kind: 'error'; error: string; status: number; retryAfterSeconds?: number; example?: unknown; domain?: string }

/** The console seeds categories with our own traffic, so it is not throttled and never reuses. */
function fromConsole(request: Request): boolean {
  return (
    process.env.STACKPICK_CONSOLE_TOKEN !== undefined &&
    request.headers.get('cookie')?.includes(`stackpick_console=${process.env.STACKPICK_CONSOLE_TOKEN}`) === true
  )
}

export async function runScan(request: Request, domain: string): Promise<ScanRun> {
  const seeded = fromConsole(request)
  const gate = await gateScan(request, domain, seeded)
  if (gate.kind === 'invalid') return { kind: 'error', error: gate.error, status: 400 }
  if (gate.kind === 'cached') return { kind: 'ok', report: gate.report, reused: true }
  if (gate.kind === 'limited') {
    return {
      kind: 'error',
      error: gate.error,
      status: 429,
      retryAfterSeconds: gate.retryAfterSeconds,
      example: gate.example,
      domain: gate.domain,
    }
  }

  // An automated pass honours a robots.txt group that names us; a scan somebody asked for on our
  // own site always runs, because they asked. The corpus reseed comes through here with the
  // console token, which is what `seeded` means, so this is the line between the two.
  if (seeded && (await asksUsToStayOutOf(`https://${gate.domain}`))) {
    // Recorded, not only obeyed. The skip used to leave no trace, so the row we publish went on
    // looking like a current measurement of a company that had asked us to stop measuring it.
    await getStore()
      .recordStayOut(gate.domain)
      .catch((error) => console.error('stay-out request not recorded, pass still skipped', error))
    return {
      kind: 'error',
      error: `${gate.domain} asks us to stay out in robots.txt, so this pass skipped it. Their published row keeps its last measurement and its date.`,
      status: 403,
      domain: gate.domain,
    }
  }

  try {
    const findings = await scanDomain(gate.domain)
    const report: Report = {
      id: reportId(findings.domain, findings.scannedAt),
      domain: findings.domain,
      scannedAt: findings.scannedAt,
      findings,
      scorecard: scoreFindings(findings),
      seeded,
    }
    // The measurement is the product and it is already finished by here; saving it is what gives
    // it a permanent address. On 2026-08-13 the cluster hit its quota and every scan returned
    // "the scan failed" to whoever ran it, when what had actually failed was the last step. A
    // visitor now gets their scorecard and is told plainly that the link will not outlive the
    // tab, which is worth more than an error page and is the truth.
    const kept = await getStore()
      .saveReport(report)
      .then(() => true)
      .catch((error) => {
        console.error('scan ran but could not be saved', error)
        // Held on the dyno so the id above still resolves, for as long as this dyno lives.
        holdUnsaved(report)
        return false
      })
    // The way back in, and the only one that works: an automated pass that no longer finds the
    // request re-measures the domain and the annotation goes with it. A scan the vendor runs on our
    // site is not seeded, so it never touches their published row, whatever it says about their fix.
    //
    // After the report is stored, never before. Clearing it up front meant a rescan that then died
    // on DNS or a timeout removed the notice while leaving the old measurement on the page, which
    // is the one state this whole annotation exists to prevent.
    if (seeded && kept) {
      await getStore()
        .clearStayOut(gate.domain)
        .catch((error) => console.error('stay-out record not cleared, scan still saved', error))
    }
    return { kind: 'ok', report, reused: false, kept }
  } catch (error) {
    if (error instanceof UnreachableDomainError) return { kind: 'error', error: error.message, status: 422 }
    if (error instanceof Error && error.message === 'Not a valid domain') {
      return { kind: 'error', error: 'That does not look like a domain. Try example.com.', status: 400 }
    }
    console.error('scan failed', error)
    return { kind: 'error', error: 'The scan failed. Try again in a moment.', status: 500 }
  }
}
