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
  /** Which pages were asked, so a vendor can rerun the exact request behind the verdict. */
  markdownNegotiation: {
    acceptHeader: boolean
    dotMdSuffix: boolean
    probed: string[]
    /** The page that actually answered. The front page usually is not it, and a verdict that
     * cannot name a URL sends a vendor to test the one page that disproves us. */
    answeredAt: string | null
  }
  mcp: {
    /** Exact, over the files we read in full. A number off a truncated body is not a fact. */
    mentions: number
    /** True when a file was cut off at the read cap, so `mentions` is a floor and not a count. */
    mentionsTruncated: boolean
    documentedUrls: string[]
    exposesOwnServer: boolean
  }
}

/**
 * The findings, and the text they were read out of. The corpus is deliberately not part of the
 * findings - it runs to hundreds of kilobytes and everything downstream stores them - but the
 * provisioning grep has to see it: trigger.dev documents its Management API in the llms.txt this
 * scan had already read, and scored zero for not documenting it.
 */
export type MachineScan = { findings: MachineFindings; llmsCorpus: string; llmsUrls: string[] }

/** Enough to tell a shell from a site, and few enough that a negotiating site pays nothing. */
const MOST_NEGOTIATION_RETRIES = 2

/**
 * The two ways a page can hand a machine markdown. Asked of the documentation front page, which is
 * the page least likely to answer: it is a navigation shell, and on a docs host its ".md" twin is
 * not even a URL - docs.strapi.io/.md is nothing. The pages under it do answer, and the same scan
 * has already fetched them: supabase.com/docs/guides/auth returns text/markdown, and
 * docs.strapi.io/cms/features/api-tokens.md is a real file.
 */
async function negotiatesMarkdown(
  url: string,
): Promise<{ acceptHeader: boolean; dotMdSuffix: boolean; answeredAt: string | null }> {
  const suffixUrl = `${url.replace(/\/$/, '')}.md`
  const [viaAccept, viaSuffix] = await Promise.all([
    fetchUrl(url, { accept: 'text/markdown' }),
    fetchUrl(suffixUrl, { accept: 'text/markdown' }),
  ])
  const acceptHeader = (viaAccept.headers['content-type'] ?? '').includes('markdown')
  const dotMdSuffix = isRealTextFile(viaSuffix, 200)
  return { acceptHeader, dotMdSuffix, answeredAt: acceptHeader ? url : dotMdSuffix ? suffixUrl : null }
}

export async function scanMachineContext(
  site: string,
  docs: string | null,
  deeperDocsPages: Promise<string[]> = Promise.resolve([]),
): Promise<MachineScan> {
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
  const [llmsEntries, wellKnownEntries, openapiHits, frontPage] = await Promise.all([
    inParallel(Object.entries(locations), async ([label, url]) => {
      const got = await fetchUrl(url, { accept: 'text/plain' })
      const present = isRealTextFile(got)
      const file: LlmsFile = {
        present,
        bytes: present ? got.body.length : 0,
        links: present ? (got.body.match(/\]\(http/g) ?? []).length : 0,
        truncated: present && got.truncated,
      }
      return [label, file, present ? got.body : '', url] as const
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
    negotiatesMarkdown(docsUrl),
  ])

  const llms: Record<string, LlmsFile> = {}
  let corpus = ''
  /** The count of a word is only a fact about a file we hold all of. */
  let countable = ''
  let anyTruncated = false
  const llmsUrls: string[] = []
  // The same file answers at more than one of these locations - chargebee.com serves its llms.txt
  // on the apex and on www - and counting one document twice would be counting evidence twice.
  const seenBodies = new Set<string>()
  for (const [label, file, body, url] of llmsEntries) {
    llms[label] = file
    if (!file.present || seenBodies.has(body)) continue
    seenBodies.add(body)
    llmsUrls.push(url)
    corpus += body
    if (file.truncated) anyTruncated = true
    else countable += body
  }

  const mcpUrls = [...corpus.matchAll(/https?:\/\/[^\s)"']*mcp[^\s)"']*/gi)].map((m) => m[0])
  const uniqueMcpUrls = [...new Set(mcpUrls)].slice(0, 5)

  const negotiation = { ...frontPage, probed: [docsUrl] }
  if (!negotiation.acceptHeader && !negotiation.dotMdSuffix) {
    const deeper = (await deeperDocsPages).slice(0, MOST_NEGOTIATION_RETRIES)
    const retries = await inParallel(deeper, (url) => negotiatesMarkdown(url))
    for (const [index, retry] of retries.entries()) {
      negotiation.acceptHeader ||= retry.acceptHeader
      negotiation.dotMdSuffix ||= retry.dotMdSuffix
      negotiation.answeredAt ??= retry.answeredAt
      negotiation.probed.push(deeper[index])
    }
  }

  return {
    findings: {
      llms,
      hasLlmsTxt: Object.values(llms).some((f) => f.present),
      hasLlmsFullTxt: Object.entries(llms).some(([label, f]) => label.includes('full') && f.present),
      wellKnown: Object.fromEntries(wellKnownEntries),
      openapi: openapiHits.filter((path): path is string => path !== null),
      markdownNegotiation: negotiation,
      mcp: {
        // ckeditor.com's llms-full.txt is 7.08 MB and we read the first 400 kB of it, counted 108
        // mentions in what we held and published that as the number in their files. It is 540.
        // A URL we found in the part we read is still a thing we found; a count is not.
        mentions: (countable.match(/\bmcp\b/gi) ?? []).length,
        mentionsTruncated: anyTruncated,
        documentedUrls: uniqueMcpUrls,
        exposesOwnServer: uniqueMcpUrls.some((url) => /\/(docs|tools)\/.*mcp|mcp-server/i.test(url)),
      },
    },
    llmsCorpus: corpus,
    llmsUrls,
  }
}
