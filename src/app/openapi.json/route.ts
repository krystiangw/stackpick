import { CHECKS, MAX_SCORE, STAGES } from '@/lib/score'
import { PER_CALLER_PER_HOUR, PER_DOMAIN_PER_HOUR } from '@/lib/scan-gate'

const BASE = process.env.STACKPICK_BASE_URL ?? 'http://localhost:3000'

// Without this Next may answer this route from the build, where the fallback above is the only
// value there is: a spec whose `servers[0].url` is localhost sends every generated client nowhere.
export const dynamic = 'force-dynamic'

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
                          stages: {
                            type: 'array',
                            description: 'The same score split by funnel stage, in the order an agent meets them',
                            items: {
                              type: 'object',
                              properties: {
                                stage: { type: 'string', enum: STAGES.map((one) => one.id) },
                                letter: { type: 'string', description: 'A to E, the order an agent meets the stages in' },
                                title: { type: 'string' },
                                question: { type: 'string', description: 'What the stage asks, in the words the site uses' },
                                points: { type: 'integer' },
                                max: { type: 'integer', description: 'The stage paper maximum, so the column can sum to more than the scorecard measurable' },
                                measurable: { type: 'integer', description: 'The stage denominator, after what did not apply and what we could not read' },
                              },
                            },
                          },
                          checks: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                id: { type: 'string', enum: CHECKS.map((check) => check.id) },
                                why: { type: 'string', description: 'What this costs a vendor, in the words the report uses' },
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
                                label: { type: 'string' },
                                stage: { type: 'string', enum: STAGES.map((stage) => stage.id) },
                                unblock: {
                                  type: 'string',
                                  description: 'What to change, or for an unmeasured check what would make it measurable',
                                },
                              },
                            },
                          },
                        },
                      },
                      reused: {
                        type: 'boolean',
                        description: 'The domain was scanned in the last few minutes and the stored result was returned rather than a new one',
                      },
                      saved: {
                        type: 'boolean',
                        description:
                          'False when the measurement finished but the store would not accept it. The scorecard is complete and /r/{id} will stop resolving at the next deploy',
                      },
                      warning: { type: 'string', description: 'Present with saved: false, in the words the page uses' },
                      challengedAt: {
                        type: 'object',
                        description:
                          "Present when the vendor's own edge answered a request with a browser challenge rather than a rate limit. It costs no points: the checks that could not be read are unmeasurable rather than failed. A rate limit anywhere else, ours or the registry's, never appears here",
                        properties: {
                          hosts: { type: 'array', items: { type: 'string' } },
                          challenged: { type: 'integer', description: 'How many of the refusals carried a challenge marker' },
                          refused: { type: 'integer', description: 'How many requests those hosts refused in total, challenged or not' },
                        },
                      },
                      truncation: {
                        type: 'object',
                        description:
                          'Present when the scan ran out of its time budget. The checks it names were never asked, so a partial scan must not be read as a full one',
                        properties: {
                          incompletePhases: { type: 'array', items: { type: 'string' } },
                          unmeasuredChecks: { type: 'array', items: { type: 'string', enum: CHECKS.map((check) => check.id) } },
                          detail: { type: 'string' },
                        },
                      },
                    },
                  },
                },
                'application/sarif+json': {
                  schema: {
                    type: 'object',
                    description:
                      'SARIF 2.1.0, returned for format: sarif. runs[0].results holds only the checks that failed; what passed, what was not measurable and what did not apply are counted in runs[0].properties',
                    externalDocs: { url: 'https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html' },
                  },
                },
                'text/markdown': {
                  schema: {
                    type: 'string',
                    description: 'Returned for format: agent. One task per failing check, each carrying the measurement behind it. Not JSON: do not parse it',
                  },
                },
              },
            },
            '400': { description: 'Not a domain, or a format outside the enum' },
            '422': { description: 'Domain refused or unreachable' },
            '500': {
              description:
                'The scan itself failed. Retrying does not help on its own; the address in the body is where to tell us.',
            },
            '503': {
              description:
                'The scan did not finish inside the gateway timeout. /api/scan/stream reports progress and does not go silent. A store that will not accept the write is NOT this: that answers 200 with saved: false, because the measurement is finished and it is yours either way.',
            },
            '429': {
              description: `Rate limit reached: ${PER_DOMAIN_PER_HOUR} per hour per registrable domain, ${PER_CALLER_PER_HOUR} per hour per address`,
            },
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
            '404': { description: 'No corpus yet' },
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
                      notes: {
                        type: 'array',
                        items: { type: 'string' },
                        description:
                          'Read these before counting anything. One of them says that filtering rows on points < max is the obvious way to count failures and is wrong, because it counts what we could not measure and what does not apply as the vendor failing. Use checks[].tally instead',
                      },
                      checks: {
                        type: 'array',
                        description: 'One entry per check with the corpus-wide tally, which is what a count of failures should be read from',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', enum: CHECKS.map((check) => check.id) },
                            stage: { type: 'string', enum: STAGES.map((stage) => stage.id) },
                            label: { type: 'string' },
                            max: { type: 'integer' },
                            helpUri: { type: 'string' },
                            tally: {
                              type: 'object',
                              properties: {
                                pass: { type: 'integer' },
                                partial: { type: 'integer' },
                                fail: { type: 'integer' },
                                unmeasured: { type: 'integer' },
                                notApplicable: { type: 'integer' },
                                measured: { type: 'integer', description: 'pass + partial + fail, the denominator for a rate' },
                              },
                            },
                          },
                        },
                      },
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
                            measuredOn: {
                              type: ['string', 'null'],
                              description: 'The domain we actually read, when the one we were asked about redirects elsewhere',
                            },
                            rateLimited: { type: ['boolean', 'null'] },
                            checks: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  id: { type: 'string', enum: CHECKS.map((check) => check.id) },
                                  verdict: { type: 'string', enum: ['pass', 'partial', 'fail', 'unmeasured', 'notApplicable'] },
                                  points: { type: 'integer' },
                                  max: { type: 'integer' },
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
