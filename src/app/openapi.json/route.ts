import { CHECKS, MAX_SCORE, STAGES } from '@/lib/score'

const BASE = process.env.STACKPICK_BASE_URL ?? 'http://localhost:3000'

/** Generated from the same check definitions the scanner runs, so the spec cannot drift. */
export function GET() {
  return Response.json({
    openapi: '3.1.0',
    info: {
      title: 'StackPick',
      version: '1.0.0',
      description: `Scores a domain on agent readiness across ${STAGES.length} funnel stages, using ${CHECKS.length} deterministic HTTP checks. ${MAX_SCORE} points exist on paper; the score is out of \`measurable\`, the points that both applied and could be evaluated. No account, no key.`,
      contact: { email: 'gwizdala.kr@gmail.com', url: `${BASE}/methodology` },
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
                          max: { type: 'integer', description: 'The paper maximum, the same for every domain' },
                          measurable: {
                            type: 'integer',
                            description: 'The denominator: points that applied and could be evaluated on this domain',
                          },
                          checks: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                id: { type: 'string', enum: CHECKS.map((check) => check.id) },
                                points: { type: 'integer' },
                                max: { type: 'integer' },
                                detail: { type: 'string' },
                                notApplicable: {
                                  type: 'boolean',
                                  description: 'The check does not apply to a product of this kind, so it is out of the score and out of measurable',
                                },
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
            '429': { description: 'Rate limit reached, five per hour per registrable domain, thirty per hour per address' },
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
