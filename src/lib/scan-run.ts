import { scanDomain, UnreachableDomainError } from './scan'
import { stanceTowardsUs } from './scan/robots'
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

/**
 * Our hourly health check runs a real scan through the public endpoint, which is the point of it,
 * and lands in the same collection as a stranger's. Marked here so counting strangers stays honest.
 *
 * The proof is the cron secret, not a name. A user agent is whatever the caller types, so marking on
 * one would let anybody drop their own scan out of our numbers by copying a string - self
 * identification wearing the clothes of a measurement, which is the mistake this file exists to
 * avoid. The same secret already guards the three cron endpoints.
 */
function isOurHealthCheck(request: Request): boolean {
  const secret = process.env.STACKPICK_CRON_TOKEN
  if (!secret) return false
  return request.headers.get('authorization') === `Bearer ${secret}`
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
  const stance = seeded ? await stanceTowardsUs(`https://${gate.domain}`) : 'in'
  // A row we already froze stays frozen while robots.txt is unreadable. Reading a 500 as consent to
  // resume would hand the domain back to the crawler on one bad minute at their edge.
  //
  // Three states here too, for the same reason: a failed lookup is not "no request on file". Folded
  // into `clear` it would resume fetching a frozen domain on a database blip, which is the exact
  // behaviour the unreadable-robots case above exists to prevent, one layer down.
  const freeze = seeded
    ? await getStore()
        .stayOutFor(gate.domain)
        .then((found) => (found ? 'frozen' : 'clear'))
        .catch(() => 'unknown')
    : 'clear'
  // `stance === 'in'` runs even when the freeze lookup failed, and that is deliberate rather than an
  // oversight: it means we just read their robots.txt and it does not ask us to stay out. Their own
  // current file is the authority on what they are asking, and a record of what they asked in the
  // past cannot outrank it. The unknown freeze state matters only when robots.txt is unreadable too,
  // which is the case below and the only one where we are guessing about both halves.
  if (stance === 'out' || (stance === 'unknown' && freeze !== 'clear')) {
    // Recorded, not only obeyed. The skip used to leave no trace, so the row we publish went on
    // looking like a current measurement of a company that had asked us to stop measuring it.
    // Only on `out`: `lastSeenAt` means we saw the request, and on `unknown` we saw nothing.
    if (stance === 'out') {
      await getStore()
        .recordStayOut(gate.domain)
        .catch((error) => console.error('stay-out request not recorded, pass still skipped', error))
    }
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
      ...(isOurHealthCheck(request) ? { probe: true, probeBy: 'cron-token' as const } : {}),
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
    // And only on a robots.txt we actually read: `stance` is `in` when the file was absent or read
    // and found not to name us, never when it could not be fetched.
    if (seeded && kept && stance === 'in' && freeze !== 'clear') {
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
