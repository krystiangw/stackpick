import { NextResponse } from 'next/server'
import { runScan } from '@/lib/scan-run'
import { reportUrl } from '@/lib/email'
import { publicBaseUrl, toAgentInstructions, toSarif } from '@/lib/export'
import { CHECKS, MAX_SCORE, STAGES, checkHelpUri } from '@/lib/score'

export const maxDuration = 60

/**
 * We publish /.well-known/mcp.json, and our own scanner refuses to award a point for a card
 * whose server does not answer: a card is a claim about a server, not a server. This is that
 * server. Streamable HTTP, one tool, no account, the same rate limits as the REST endpoint.
 */
const PROTOCOL_VERSION = '2025-06-18'

const TOOL = {
  name: 'scan_domain',
  title: 'Scan a domain for agent readiness',
  description:
    `Scores a domain across ${STAGES.length} funnel stages using ${CHECKS.length} deterministic HTTP checks. ` +
    `${MAX_SCORE} points exist on paper; the score is out of the points that both applied to the domain and ` +
    'could be evaluated. Returns a per-check breakdown with the reason for each result and a permanent link.',
  inputSchema: {
    type: 'object',
    properties: {
      domain: { type: 'string', description: 'Bare domain, for example example.com' },
      format: {
        type: 'string',
        enum: ['summary', 'agent', 'sarif'],
        description:
          'summary is the readable breakdown. agent returns markdown instructions you can act on directly, ' +
          'each task carrying the measurement behind it. sarif returns SARIF 2.1.0 for a code-scanning pipeline.',
        default: 'summary',
      },
    },
    required: ['domain'],
    additionalProperties: false,
  },
} as const

type RpcId = string | number | null

const result = (id: RpcId, payload: unknown) => NextResponse.json({ jsonrpc: '2.0', id, result: payload })

const failure = (id: RpcId, code: number, message: string) =>
  NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } })

/** A tool error is a result with isError, not a protocol error: the model has to see the text. */
const toolFailure = (id: RpcId, message: string) =>
  result(id, { content: [{ type: 'text', text: message }], isError: true })

export async function GET() {
  // No server-initiated stream, so the spec's SSE channel is honestly declined rather than hung.
  return new NextResponse('This MCP endpoint accepts POST only.', { status: 405, headers: { allow: 'POST' } })
}

export async function POST(request: Request) {
  let message: { jsonrpc?: string; id?: RpcId; method?: string; params?: Record<string, unknown> }
  try {
    message = await request.json()
  } catch {
    return failure(null, -32700, 'Parse error: the body is not JSON.')
  }

  const id = message.id ?? null
  const method = message.method

  // Notifications carry no id and expect no body.
  if (method?.startsWith('notifications/')) return new NextResponse(null, { status: 202 })

  if (method === 'initialize') {
    return result(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'stackpick', title: 'StackPick', version: '1.0.0' },
      instructions:
        'Call scan_domain with a bare domain. Every check is one HTTP request with a published rule, ' +
        'documented at /methodology, so anything this returns can be reproduced and argued with.',
    })
  }

  if (method === 'ping') return result(id, {})

  if (method === 'tools/list') return result(id, { tools: [TOOL] })

  if (method === 'tools/call') {
    const params = message.params ?? {}
    if (params.name !== TOOL.name) return failure(id, -32602, `Unknown tool: ${String(params.name)}`)

    const args = (params.arguments ?? {}) as { domain?: unknown; format?: unknown }
    if (typeof args.domain !== 'string' || args.domain.length === 0) {
      return toolFailure(id, 'Pass a domain, for example example.com.')
    }

    const scan = await runScan(request, args.domain)
    if (scan.kind === 'error') return toolFailure(id, scan.error)

    const { report, reused } = scan
    const { scorecard } = report
    const base = publicBaseUrl(request)
    const measurable = scorecard.measurable ?? scorecard.max

    if (args.format === 'agent') {
      return result(id, { content: [{ type: 'text', text: toAgentInstructions(report, base) }] })
    }
    if (args.format === 'sarif') {
      const sarif = toSarif(report, base)
      return result(id, { content: [{ type: 'text', text: JSON.stringify(sarif, null, 2) }], structuredContent: { sarif } })
    }

    const summary = [
      `${report.domain}: ${scorecard.total} of ${measurable} measurable points (${MAX_SCORE} exist on paper).`,
      ...scorecard.stages.map((stage) => {
        const stageMeasurable = stage.measurable ?? stage.max
        return `${stage.letter} ${stage.title}: ${stageMeasurable > 0 ? `${stage.points}/${stageMeasurable}` : 'not measurable'}`
      }),
      '',
      ...scorecard.checks.map((check) => {
        const verdict = check.notApplicable ? 'N/A' : check.inconclusive ? 'UNMEASURED' : `${check.points}/${check.max}`
        // The rule behind the verdict, so the caller can act without asking us what we meant.
        return `${verdict} ${check.id}: ${check.detail}${check.unblock ? ` Next step: ${check.unblock}` : ''} [${checkHelpUri(check.id, base)}]`
      }),
      '',
      `Scorecard: ${reportUrl(report)}`,
      `Formula v${scorecard.formulaVersion}, published at /methodology.`,
      ...(reused ? ['This domain was scanned in the last few minutes, so the stored result was returned.'] : []),
    ].join('\n')

    return result(id, {
      content: [{ type: 'text', text: summary }],
      structuredContent: {
        id: report.id,
        domain: report.domain,
        url: reportUrl(report),
        reused,
        scorecard: {
          ...scorecard,
          checks: scorecard.checks.map((check) => ({ ...check, helpUri: checkHelpUri(check.id, base) })),
        },
      },
    })
  }

  return failure(id, -32601, `Unknown method: ${String(method)}`)
}
