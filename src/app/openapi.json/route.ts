import { CHECKS, MAX_SCORE, STAGES } from '@/lib/score'

const BASE = process.env.STACKPICK_BASE_URL ?? 'http://localhost:3000'

/** Generated from the same check definitions the scanner runs, so the spec cannot drift. */
export function GET() {
  return Response.json({
    openapi: '3.1.0',
    info: {
      title: 'Let Agents In',
      version: '1.0.0',
      description: `Scores a domain on agent readiness across ${STAGES.length} funnel stages, using ${CHECKS.length} deterministic HTTP checks. ${MAX_SCORE} points exist on paper; the score is out of \`measurable\`, the points that both applied and could be evaluated. No account, no key.`,
      contact: { email: 'hello@letagentsin.com', url: `${BASE}/methodology` },
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
                // `format` was missing, and it is the field that turns this endpoint into the two
                // machine surfaces worth having: SARIF for a code scanner and markdown written for
                // an agent to act on. An agent reading this document could not discover either,
                // which is the omission we score other people for one check below.
                schema: {
                  type: 'object',
                  required: ['domain'],
                  properties: {
                    domain: { type: 'string', example: 'example.com' },
                    format: {
                      type: 'string',
                      enum: ['json', 'sarif', 'agent'],
                      default: 'json',
                      description:
                        'json is the scorecard. sarif is SARIF 2.1.0 with one rule per check. agent is markdown written to be acted on, with one task per failing check. Also accepted as ?format= on the query string.',
                    },
                  },
                },
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
            '503': {
              description:
                'The scan did not finish inside the gateway timeout, or the store is not accepting writes. /api/scan/stream reports progress and does not go silent.',
            },
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
      // The three surfaces this document used to omit, which is the defect we score other people
      // for: an agent reading our own API description could not learn that the corpus exists.
      // Documented because it is public, needs no account and an agent can complete it: an email
      // and a domain, confirmed by a link. Leaving the recurring half of the product out of the
      // machine-readable description of the product is the same omission as leaving out `format`.
      '/api/watch': {
        post: {
          summary: 'Ask to be told when a domain\'s verdicts change',
          operationId: 'watchDomain',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'domain'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    domain: { type: 'string', example: 'example.com' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description:
                'Recorded. Nothing is watched until the link in the confirmation email is followed, and every email carries the link that stops it.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ok: { type: 'boolean' },
                      delivered: { type: 'boolean', description: 'False when the confirmation email could not be sent, in which case nothing is watched.' },
                      alreadyWatching: { type: 'boolean' },
                    },
                  },
                },
              },
            },
            '400': { description: 'The address or the domain does not look right' },
            '429': { description: 'Too many requests from this caller, or for this address' },
            '503': { description: 'Could not be recorded, so nothing was signed up and no email was sent' },
          },
        },
      },
      '/corpus.json': {
        get: {
          summary: 'Every curated domain we have scanned, one formula version throughout',
          operationId: 'getCorpus',
          responses: {
            '200': {
              description: 'The published corpus, recomputed per request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      formulaVersion: { type: 'string' },
                      domains: { type: 'integer' },
                      max: { type: 'integer' },
                      rows: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            domain: { type: 'string' },
                            category: { type: ['string', 'null'] },
                            total: { type: 'integer' },
                            measurable: { type: 'integer' },
                            unattendedGrant: { type: ['boolean', 'null'] },
                            scorecardUrl: { type: 'string' },
                            checks: { type: 'array', items: { type: 'object' } },
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
      '/corpus.csv': {
        get: {
          summary: 'The same corpus, one row per domain and check',
          operationId: 'getCorpusCsv',
          responses: { '200': { description: 'text/csv, long format' } },
        },
      },
      '/mcp': {
        post: {
          summary: 'MCP over Streamable HTTP: scan_domain and find_providers',
          operationId: 'mcpJsonRpc',
          description: 'JSON-RPC 2.0. GET answers 405 by design, because there is no server-initiated stream.',
          responses: { '200': { description: 'JSON-RPC result' } },
        },
      },
    },
  })
}
