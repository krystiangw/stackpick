import { CHECKS, MAX_SCORE, STAGES } from '@/lib/score'

const BASE = process.env.STACKPICK_BASE_URL ?? 'http://localhost:3000'

/** Generated from the same check definitions the scanner runs, so the spec cannot drift. */
export function GET() {
  return Response.json({
    openapi: '3.1.0',
    info: {
      title: 'StackPick',
      version: '1.0.0',
      description: `Scores a domain out of ${MAX_SCORE} on agent readiness across ${STAGES.length} funnel stages, using ${CHECKS.length} deterministic HTTP checks. No account, no key.`,
      contact: { email: 'hello@stackpick.ai', url: `${BASE}/methodology` },
    },
    servers: [{ url: BASE }],
    paths: {
      '/api/scan': {
        post: {
          summary: 'Scan a domain',
          operationId: 'scanDomain',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', required: ['domain'], properties: { domain: { type: 'string', example: 'example.com' } } },
              },
            },
          },
          responses: {
            '200': {
              description: 'Scorecard',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      domain: { type: 'string' },
                      scorecard: {
                        type: 'object',
                        properties: {
                          formulaVersion: { type: 'string' },
                          total: { type: 'integer' },
                          max: { type: 'integer' },
                          checks: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                id: { type: 'string', enum: CHECKS.map((check) => check.id) },
                                points: { type: 'integer' },
                                max: { type: 'integer' },
                                detail: { type: 'string' },
                                inconclusive: {
                                  type: 'boolean',
                                  description: 'Zero because we could not measure it, not because it is absent',
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': { description: 'Not a domain' },
            '422': { description: 'Domain refused or unreachable' },
            '429': { description: 'Rate limit reached, ten per hour per address' },
          },
        },
      },
      '/api/scan/stream': {
        post: {
          summary: 'Scan a domain with progress events',
          operationId: 'scanDomainStreaming',
          responses: { '200': { description: 'text/event-stream carrying step, done and failed events' } },
        },
      },
    },
  })
}
