'use client'

import { useEffect } from 'react'

/**
 * Registers our scan as a WebMCP tool, so an agent working inside the visitor's browser can run it
 * without driving the form.
 *
 * WebMCP (W3C Web Machine Learning Community Group, draft of 26 August 2026) is MCP on the client:
 * the page registers tools imperatively and an in-browser agent calls them instead of guessing at
 * selectors. It is in origin trial in Chrome 149+ and Edge 150+, so on most visits `modelContext` is
 * simply absent and this component does nothing. That is the point of registering it at all: a site
 * whose product is agent readiness should be reachable by the agents that arrive the new way, and
 * this costs a visitor with no such agent nothing.
 *
 * It is an addition and never a replacement. Everything the tool does is already possible without
 * JavaScript through `POST /api/scan`, because the argument this site sells is that an agent should
 * not have to run a bundle to use you.
 */
type WebMcpTool = {
  name: string
  title?: string
  description: string
  inputSchema?: object
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean }
  execute: (input: Record<string, unknown>, options?: { signal?: AbortSignal }) => Promise<unknown>
}

type ModelContext = { registerTool: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => Promise<void> }

export function WebMcpTools() {
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext
    if (!context) return

    // Registration is undone by aborting the signal we passed, which is the only unregister the
    // specification gives us.
    const controller = new AbortController()

    void context
      .registerTool(
        {
          name: 'scan_domain',
          title: 'Scan a domain for agent readiness',
          description:
            'Run the Let Agents In scan on one domain and return its score and the address of the full scorecard. Deterministic HTTP checks only: whether an agent can read the site, find a machine-readable surface, register, get credentials and integrate. Takes a few seconds because it fetches the vendor pages while you wait.',
          inputSchema: {
            type: 'object',
            properties: {
              domain: {
                type: 'string',
                description: 'The domain to scan, for example "stripe.com". Not a URL and not a path.',
              },
            },
            required: ['domain'],
          },
          annotations: {
            // Not read-only, and saying otherwise would get it run unattended: the scan sends
            // requests to a third party's servers and stores a report we then publish.
            readOnlyHint: false,
            // Everything in the result is derived from pages the scanned vendor controls.
            untrustedContentHint: true,
          },
          execute: async (input, options) => {
            const domain = typeof input.domain === 'string' ? input.domain.trim() : ''
            if (!domain) return { error: 'Give a domain, for example "stripe.com".' }

            // Never with the operator's console cookie. Middleware sets `stackpick_console` on
            // `path: '/'`, so a same-origin fetch from this page carries it, and `runScan` reads it
            // as a seed: no public rate limit, and the report is marked `seeded`, which is what
            // decides whether a row can enter the published corpus. An agent calling a tool we
            // registered must not quietly run as an admin because the operator once opened `/app`.
            const response = await fetch('/api/scan', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ domain }),
              credentials: 'omit',
              signal: options?.signal,
            })
            const payload = await response.json().catch(() => null)

            if (!response.ok) {
              // A rate limit is a fact about our capacity, not about the vendor, and the tool has no
              // page to show that on.
              return {
                error: payload?.error ?? 'The scan failed.',
                ...(payload?.limited ? { rateLimited: true, retryAfterSeconds: payload.retryAfterSeconds } : {}),
              }
            }

            return {
              domain: payload.domain,
              score: payload.scorecard.total,
              outOfMeasurable: payload.scorecard.measurable,
              outOf: payload.scorecard.max,
              formulaVersion: payload.scorecard.formulaVersion,
              scorecard: new URL(`/r/${payload.id}`, location.origin).href,
              methodology: new URL('/methodology', location.origin).href,
              ...(payload.reused ? { reused: true } : {}),
              // When storage failed the endpoint says so and warns that the link above stops
              // resolving at our next deploy. Dropping that here would hand an agent a permanent
              // looking address we know is temporary, which is the class of thing we scan other
              // people for.
              ...(payload.saved === false ? { saved: false, warning: payload.warning } : {}),
            }
          },
        },
        { signal: controller.signal },
      )
      // A browser that has the API but refuses the registration must not break the page.
      .catch(() => {})

    return () => controller.abort()
  }, [])

  return null
}
