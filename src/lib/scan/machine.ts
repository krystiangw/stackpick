import { fetchUrl, inParallel, isRealTextFile } from './http'

export const WELL_KNOWN_PATHS = {
  api_catalog_rfc9727: '/.well-known/api-catalog',
  oauth_as_metadata: '/.well-known/oauth-authorization-server',
  oauth_protected_resource_rfc9728: '/.well-known/oauth-protected-resource',
  mcp_server_card: '/.well-known/mcp.json',
  a2a_agent_card: '/.well-known/agent.json',
  ai_plugin_legacy: '/.well-known/ai-plugin.json',
  security_txt: '/.well-known/security.txt',
} as const

const OPENAPI_PATHS = ['/openapi.json', '/openapi.yaml', '/swagger.json', '/api/openapi.json', '/v1/openapi.json']

export type LlmsFile = { present: boolean; bytes: number; links: number; truncated: boolean }

export type MachineFindings = {
  llms: Record<string, LlmsFile>
  hasLlmsTxt: boolean
  hasLlmsFullTxt: boolean
  wellKnown: Record<string, boolean>
  openapi: string[]
  markdownNegotiation: { acceptHeader: boolean; dotMdSuffix: boolean }
  mcp: { mentions: number; documentedUrls: string[]; exposesOwnServer: boolean }
}

export async function scanMachineContext(site: string, docs: string | null): Promise<MachineFindings> {
  const locations: Record<string, string> = {
    root_llms_txt: `${site}/llms.txt`,
    root_llms_full_txt: `${site}/llms-full.txt`,
  }
  if (docs) {
    // The standard location is the origin root. Appending to the docs page path missed
    // docs.stripe.com/llms.txt (93 KB) while probing a 404 one level deeper.
    try {
      const origin = new URL(docs).origin
      if (origin !== site) {
        locations.docs_origin_llms_txt = `${origin}/llms.txt`
        locations.docs_origin_llms_full_txt = `${origin}/llms-full.txt`
      }
    } catch {
      /* docs URL already validated upstream */
    }
    const docsBase = docs.replace(/\/$/, '')
    locations.docs_path_llms_txt = `${docsBase}/llms.txt`
  }

  const docsUrl = docs ?? site

  // Four independent probe sets. Run one after another they cost four waves, each ending at
  // its own slowest request; the per-host cap in fetchUrl keeps the load the same either way.
  const [llmsEntries, wellKnownEntries, openapiHits, viaAccept, viaSuffix] = await Promise.all([
    inParallel(Object.entries(locations), async ([label, url]) => {
      const got = await fetchUrl(url, { accept: 'text/plain' })
      const present = isRealTextFile(got)
      const file: LlmsFile = {
        present,
        bytes: present ? got.body.length : 0,
        links: present ? (got.body.match(/\]\(http/g) ?? []).length : 0,
        truncated: present && got.truncated,
      }
      return [label, file, present ? got.body : ''] as const
    }),
    inParallel(Object.entries(WELL_KNOWN_PATHS), async ([label, path]) => {
      const got = await fetchUrl(`${site}${path}`, { accept: 'application/json, text/plain' })
      return [label, isRealTextFile(got, 10)] as const
    }),
    inParallel(OPENAPI_PATHS, async (path) => {
      const got = await fetchUrl(`${site}${path}`, { accept: 'application/json' })
      const head = got.body.slice(0, 2000).toLowerCase()
      const isSpec = isRealTextFile(got, 20) && (head.includes('openapi') || head.includes('swagger'))
      return isSpec ? path : null
    }),
    fetchUrl(docsUrl, { accept: 'text/markdown' }),
    fetchUrl(`${docsUrl.replace(/\/$/, '')}.md`, { accept: 'text/markdown' }),
  ])

  const llms: Record<string, LlmsFile> = {}
  let corpus = ''
  for (const [label, file, body] of llmsEntries) {
    llms[label] = file
    corpus += body
  }

  const mcpUrls = [...corpus.matchAll(/https?:\/\/[^\s)"']*mcp[^\s)"']*/gi)].map((m) => m[0])
  const uniqueMcpUrls = [...new Set(mcpUrls)].slice(0, 5)

  return {
    llms,
    hasLlmsTxt: Object.values(llms).some((f) => f.present),
    hasLlmsFullTxt: Object.entries(llms).some(([label, f]) => label.includes('full') && f.present),
    wellKnown: Object.fromEntries(wellKnownEntries),
    openapi: openapiHits.filter((path): path is string => path !== null),
    markdownNegotiation: {
      acceptHeader: (viaAccept.headers['content-type'] ?? '').includes('markdown'),
      dotMdSuffix: isRealTextFile(viaSuffix, 200),
    },
    mcp: {
      mentions: (corpus.match(/\bmcp\b/gi) ?? []).length,
      documentedUrls: uniqueMcpUrls,
      exposesOwnServer: uniqueMcpUrls.some((url) => /\/(docs|tools)\/.*mcp|mcp-server/i.test(url)),
    },
  }
}
