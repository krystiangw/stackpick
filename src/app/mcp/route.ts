import { NextResponse } from 'next/server'
import { runScan } from '@/lib/scan-run'
import { reportUrl } from '@/lib/email'
import { publicBaseUrl, toAgentInstructions, toSarif } from '@/lib/export'
import { CATEGORIES } from '@/lib/categories'
import { lookup } from '@/lib/lookup'
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

/**
 * The other half of the same data, asked the way an agent asks it. scan_domain answers "is this
 * vendor ready", which is the vendor's question. This answers "who can I actually finish with",
 * which is the caller's, and it is the expensive one to answer by trying: four sessions to learn
 * that three providers stop at a signup form.
 *
 * It eliminates rather than recommends. Whether a vendor suits the job is not something we
 * measure, and we sell those same vendors the fix, so a ranking from us would be a judgement we
 * never made sold by someone with an interest in it.
 */
const FIND_TOOL = {
  name: 'find_providers',
  title: 'Find providers an unattended agent can actually finish with',
  description:
    'Describe the problem in your own words, for example "let users upload images" or "send transactional email". ' +
    'Returns the vendors we have measured in that category, split by whether an unattended run clears every ' +
    'barrier we test, stops at one, or was never measurable, each with the date and a link to the evidence. ' +
    'This is not a recommendation: it does not know whether a vendor suits your job, only where an agent stops. ' +
    'Routing a sentence to a category is the weakest thing here: measured on 20 questions written after the rules were and never tuned against, it answered 16 correctly, stayed silent on 3 it should have answered and answered 1 it should have refused. It returns nothing rather than guess when two categories tie, so no result means we could not read the question, not that the category is empty.',
  inputSchema: {
    type: 'object',
    properties: {
      job: { type: 'string', description: 'The problem to solve, in your own words.' },
    },
    required: ['job'],
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
      serverInfo: { name: 'letagentsin', title: 'Let Agents In', version: '1.0.0' },
      instructions:
        'Two tools. scan_domain takes a bare domain and scores it. find_providers takes a problem in ' +
        'plain words and returns the vendors we have measured in that category, split by where an ' +
        'unattended run stops. Every check is one HTTP request with a published rule, documented at ' +
        '/methodology, so anything this returns can be reproduced and argued with.',
    })
  }

  if (method === 'ping') return result(id, {})

  if (method === 'tools/list') return result(id, { tools: [TOOL, FIND_TOOL] })

  if (method === 'tools/call') {
    const params = message.params ?? {}

    if (params.name === FIND_TOOL.name) {
      const job = (params.arguments as { job?: unknown } | undefined)?.job
      if (typeof job !== 'string' || job.length === 0) {
        return toolFailure(id, 'Describe the problem, for example "let users upload images".')
      }
      const found = await lookup(job)
      if (!found) {
        // Routing a job description is the part of this tool that is worst: measured on twenty
        // questions it had never seen, it placed twelve and declined eight. Declining is the safe
        // half, but sending the caller to a web page to read a list costs it another turn, so the
        // list goes here and it can pick a category itself.
        return toolFailure(
          id,
          [
            `No category we hold matches "${job}" confidently enough to answer, and guessing would hand you the wrong vendors.`,
            'Ask again with one of these, or with the product noun for it:',
            ...CATEGORIES.map((category) => `  ${category.label}: ${category.jobToBeDone}`),
            'Silence here means we have not measured it, not that nobody does it.',
          ].join('\n'),
        )
      }
      const line = (entry: { domain: string; barriers: string[]; measuredAt: string; evidence: string }) =>
        `  ${entry.domain}${entry.barriers.length > 0 ? `: stops at ${entry.barriers.join('; ')}` : ''} (measured ${entry.measuredAt}, evidence ${publicBaseUrl(request)}${entry.evidence})`
      const text = [
        `${found.category.label}: ${found.measured} vendors measured, which is what we hold and not the whole market.`,
        '',
        `Cleared every barrier we test (${found.clear.length}):`,
        ...(found.clear.length > 0 ? found.clear.map(line) : ['  none']),
        '',
        `Stops somewhere (${found.blocked.length}):`,
        ...found.blocked.map(line),
        ...(found.unknown.length > 0
          ? ['', `Not measurable from our vantage (${found.unknown.length}):`, ...found.unknown.map(line)]
          : []),
        '',
        'Each barrier is one HTTP request with a published rule at /methodology. Clearing them is not the',
        'same as being the right choice: we measure whether an unattended run can finish, not whether the',
        'product fits. Where this says none, that is the finding rather than a gap in the data.',
      ].join('\n')
      return result(id, { content: [{ type: 'text', text }], structuredContent: found })
    }

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
