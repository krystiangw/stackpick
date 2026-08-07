import { scanDomain, UnreachableDomainError } from '@/lib/scan'
import { scoreFindings } from '@/lib/score'
import { gateScan } from '@/lib/scan-gate'
import { getStore, reportId, type Report } from '@/lib/store'

export const maxDuration = 60

const encoder = new TextEncoder()
const event = (type: string, payload: unknown) =>
  encoder.encode(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`)

/**
 * Same scan as POST /api/scan, streamed. The steps are the real ones the scanner walks
 * through, not a timed animation: a fake progress bar on a tool that sells measurement
 * would be a strange place to start lying.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { domain?: unknown }
  if (typeof body.domain !== 'string' || body.domain.length === 0) {
    return Response.json({ error: 'Send a JSON body with a domain field.' }, { status: 400 })
  }

  const gate = await gateScan(request, body.domain)
  if (gate.kind === 'invalid') return Response.json({ error: gate.error }, { status: 400 })
  if (gate.kind === 'cached') {
    // A scan minutes old is the same answer, so we hand back the report instead of
    // spending someone else's bandwidth to reprint it.
    const { report } = gate
    return new Response(
      event('done', {
        id: report.id,
        domain: report.domain,
        total: report.scorecard.total,
        max: report.scorecard.max,
        reused: true,
      }),
      { headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform' } },
    )
  }
  if (gate.kind === 'limited') {
    return Response.json(
      { error: gate.error, limited: true, retryAfterSeconds: gate.retryAfterSeconds, example: gate.example, domain: gate.domain },
      { status: 429, headers: { 'retry-after': String(gate.retryAfterSeconds) } },
    )
  }
  const domain = gate.domain

  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, payload: unknown) => {
        try {
          controller.enqueue(event(type, payload))
        } catch {
          /* client hung up mid-scan */
        }
      }

      try {
        const findings = await scanDomain(domain, (step) => send('step', step))
        gate.charge()
        const scorecard = scoreFindings(findings)
        const report: Report = {
          id: reportId(findings.domain, findings.scannedAt),
          domain: findings.domain,
          scannedAt: findings.scannedAt,
          findings,
          scorecard,
        }
        await getStore().saveReport(report)
        send('done', { id: report.id, domain: report.domain, total: scorecard.total, max: scorecard.max })
      } catch (error) {
        const message =
          error instanceof UnreachableDomainError
            ? error.message
            : error instanceof Error && error.message === 'Not a valid domain'
              ? 'That does not look like a domain. Try example.com.'
              : 'The scan failed. Try again in a moment.'
        if (!(error instanceof UnreachableDomainError) && !(error instanceof Error && error.message === 'Not a valid domain')) {
          console.error('stream scan failed', error)
        }
        send('failed', { error: message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  })
}
