import { fetchUrl, inParallel, wasNeverAsked, isRealTextFile, type Fetched } from './http'

export const WELL_KNOWN_PATHS = {
  api_catalog_rfc9727: '/.well-known/api-catalog',
  oauth_as_metadata: '/.well-known/oauth-authorization-server',
  oauth_protected_resource_rfc9728: '/.well-known/oauth-protected-resource',
  mcp_server_card: '/.well-known/mcp.json',
  a2a_agent_card: '/.well-known/agent.json',
  ai_plugin_legacy: '/.well-known/ai-plugin.json',
  security_txt: '/.well-known/security.txt',
} as const

export const OPENAPI_PATHS = ['/openapi.json', '/openapi.yaml', '/swagger.json', '/api/openapi.json', '/v1/openapi.json']

export type LlmsFile = { present: boolean; bytes: number; links: number; truncated: boolean }

export type MachineFindings = {
  llms: Record<string, LlmsFile>
  /**
   * The addresses those probes went to. The verdict used to say "no llms.txt at any of the 4
   * locations probed" and name none of them, which is the one thing this project asks of every
   * other failing sentence: a vendor has to be able to rerun it. Four is not an address.
   */
  llmsProbed?: string[]
  hasLlmsTxt: boolean
  hasLlmsFullTxt: boolean
  /**
   * A sample of the links inside llms.txt, fetched. The file existing is what we measured, and
   * a curated map whose entries 404 is worse than none: an agent follows them, gets nothing, and
   * has spent its budget. agent-ready.dev checks this and we did not.
   */
  llmsLinks?: { sampled: number; dead: number; firstDead: string | null; deadUrls?: string[]; files: number }
  wellKnown: Record<string, boolean>
  openapi: string[]
  /**
   * A spec the docs page points at, rather than one we guessed the path of. Porkbun publishes
   * theirs at /api/json/v3/spec and declares it twice, in a Link header and in the head of the
   * page; we scored them "no OpenAPI spec" for six weeks because neither is a path we probe.
   */
  openapiDeclared?: { url: string; rel: string }
  /**
   * The same paths, asked on the documentation host. We probed them on the site only, and a spec
   * lives where the docs live often enough for an audit to find three in 113 credited rows
   * (docs.trychroma.com/openapi.json, docs.together.ai/openapi.yaml, docs.browserless.io/openapi.yaml).
   * The full address, not a path: it is a different origin from the one the verdict names.
   */
  openapiOnDocsHost?: string
  /** Which pages were asked, so a vendor can rerun the exact request behind the verdict. */
  /** Where the files actually answered, so a verdict names a URL instead of a filename. */
  llmsUrls?: string[]
  markdownNegotiation: {
    acceptHeader: boolean
    dotMdSuffix: boolean
    probed: string[]
    /** The page that actually answered. The front page usually is not it, and a verdict that
     * cannot name a URL sends a vendor to test the one page that disproves us. */
    answeredAt: string | null
    /**
     * What the documentation page said when we asked it for markdown. Absence of a declaration
     * is only a finding when the page that would carry it answered: postmarkapp.com publishes
     * `link: </swagger/server.yml>; rel="service-desc"` and answered us 429 after a night of
     * reseeding, and we published "none declared by postmarkapp.com/developer" about it.
     */
    docsStatus: number
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

/** Enough to catch a stale map, few enough that checking one costs nobody a phase. */
const MOST_LLMS_LINKS_SAMPLED = 12

/**
 * Whether the map leads anywhere. Only markdown links, only http, and only a handful: the point
 * is to catch a file listing pages that have moved, not to crawl the vendor's documentation.
 * A refusal is not a dead link, because a WAF that turns us away says nothing about the page.
 *
 * Relative links count from an index file, and until 9.17 none of them did. An agent reading
 * llms.txt holds the address it fetched, so `](/docs/start)` is an ordinary link and can rot like
 * any other, but the pattern only matched `https?://` and skipped them in silence. That is not a
 * rounding error: 54 of the 136 rows we credit publish some, knock.app writes 1347 relative
 * against 4 absolute, and their sample of twelve was drawn from those four. Our own file is
 * entirely relative, so we were the clearest beneficiary of a check we score other people on.
 *
 * Only from an index file, though. llms-full.txt is documentation pages concatenated, so the
 * `../queries/select` inside it was written relative to the page it came from and not to the file:
 * resolving it against the file invents an address nobody published. Measured on the corpus before
 * shipping, that alone would have taken the point from payloadcms.com, windmill.dev and agora.io
 * and printed a dead link by name for each, while every page it accused answers 200 at its real
 * address. An accusation we cannot stand behind is worse than a check that scores too easily.
 */
const RESOURCE_TARGET = /\.(png|jpe?g|gif|svg|webp|ico|mdx|css|js|zip|tar\.gz)$/i

async function sampleLlmsLinks(
  files: { body: string; base: string; index: boolean }[],
): Promise<MachineFindings['llmsLinks']> {
  // Which file each link came from, so the sentence can say how many files the sample was drawn
  // from rather than how many put something in the pool. Those differ twice over: a file whose
  // links are all duplicates of another's contributes nothing, and a file that contributed a
  // thousand links can still be missed by twelve evenly spaced picks.
  const seen = new Map<string, number>()
  for (const [fileIndex, { body, base, index }] of files.entries()) {
    for (const match of body.matchAll(/\]\(([^\s)]+)\)/g)) {
      const href = match[1]
      if (!index && !/^https?:\/\//i.test(href)) continue
      let resolved: URL
      try {
        resolved = new URL(href, base)
      } catch {
        continue
      }
      // mailto:, tel: and data: are not pages.
      if (resolved.protocol !== 'https:' && resolved.protocol !== 'http:') continue
      const url = resolved.href.split('#')[0]
      // A bare #anchor resolves to the file itself, and an image or a source file is not a page an
      // agent was sent to: maptiler.com lost the point to two .webp thumbnails that 404 on their
      // CDN, which says nothing about whether its map leads anywhere.
      if (url === base.split('#')[0] || RESOURCE_TARGET.test(resolved.pathname)) continue
      if (seen.has(url)) continue
      seen.set(url, fileIndex)
    }
  }
  const links = [...seen.keys()]
  if (links.length === 0) return undefined
  // Spread across the file rather than the first N, which is what "sampled" has to mean if we are
  // going to print the word. Taking the head found dead links in 7 files and missed them in 8 more,
  // because a maintained top and a rotten tail is what an unmaintained map actually looks like.
  // Evenly, ends included: a step of floor(n/12) took the first twelve whenever n was 13 to 23,
  // and never reached the last 8% of a file with a thousand entries, which is where rot collects.
  const wanted = Math.min(MOST_LLMS_LINKS_SAMPLED, links.length)
  const sample =
    wanted === 1 ? [links[0]] : Array.from({ length: wanted }, (_, i) => links[Math.round((i * (links.length - 1)) / (wanted - 1))])
  const gone = (answer: { status: number }) => answer.status === 404 || answer.status === 410
  const heads = await inParallel(sample, (url) => fetchUrl(url, { method: 'HEAD' }))
  // A link we never asked about is not a link that answers. The host may have refused a connection
  // or used up its allowance of timeouts earlier in this scan, and then every remaining probe
  // returns status 0 without leaving the process: read as "not a 404", that would publish "the 12
  // links we sampled all answer" about twelve requests nobody made. Since 9.17 the sample is
  // mostly the vendor's own domain, which is the same host whose timeout counter fills up, so this
  // stopped being theoretical. What we could not ask about is dropped from the sample rather than
  // counted either way, and a sample with nothing left in it makes no claim at all.
  const asked = sample.filter((_, index) => !wasNeverAsked(heads[index]))
  if (asked.length === 0) return undefined
  // A HEAD that 404s is not a dead page. play.honeycomb.io answers 404 to HEAD and 200 to GET,
  // and a framework that only routes GET is common enough that calling those links gone would
  // have published a false sentence about six vendors on the first reseed.
  const suspect = sample.filter((url, index) => !wasNeverAsked(heads[index]) && gone(heads[index]))
  const confirmed = await inParallel(suspect, (url) => fetchUrl(url))
  // Paired with the address as written in the file, not the one the redirect chain ended on. The
  // verdict names this link so the vendor can find it in their own llms.txt, and `Fetched.url` is
  // where we ended up: a `/docs/old-guide` that 301s to `/404` was published as "starting with
  // https://x.com/404", an address that appears nowhere in the file we were talking about.
  const dead = suspect.filter((_, index) => gone(confirmed[index]))
  // Files that put a link in the pool, not files that exist: agora.io serves three, one of which
  // holds no markdown link at all, and "sampled across the 3 files" sends a reader to check an
  // address the sample never touched.
  return {
    sampled: asked.length,
    dead: dead.length,
    firstDead: dead[0] ?? null,
    // All of them, not only the first. The remedy for this check is "fix these links", and naming
    // one of two while charging for the finding hands the vendor half the work back. `firstDead`
    // stays because rows scored before this hold nothing else.
    deadUrls: dead,
    files: new Set(asked.map((url) => seen.get(url))).size,
  }
}

/** Enough to tell a shell from a site, and few enough that a negotiating site pays nothing. */
const MOST_NEGOTIATION_RETRIES = 2

/**
 * Link relations that mean "the machine description of this thing", from RFC 8631 and RFC 8288.
 * Not "alternate": every localised page on the web uses it for hreflang, so on its own it says
 * nothing, and it only counts below when the type and the wording both point at a spec.
 */
const SPEC_RELATIONS = ['service-desc', 'describedby']

const SPEC_WORDING = /openapi|swagger|\bspec\b/i

/** Enough to reach a declared spec and its one plausible alternate; more would be guessing again. */
const MOST_SPEC_CANDIDATES = 2

/**
 * What the docs page says its own machine description is, from the Link header first and the
 * head of the document second. Both are declarations, not proof: nothing here scores until the
 * URL is fetched and the body turns out to be a spec.
 */
export function declaredSpecs(page: { url: string; body: string; headers: Record<string, string> }): { url: string; rel: string }[] {
  const found: { url: string; rel: string }[] = []
  const add = (href: string, rel: string) => {
    try {
      const target = new URL(href, page.url)
      // A "javascript:" href resolves happily and is not something to send a request at.
      if (target.protocol !== 'http:' && target.protocol !== 'https:') return
      const url = target.toString()
      if (!found.some((seen) => seen.url === url)) found.push({ url, rel })
    } catch {
      /* an href we cannot resolve is not a declaration we can follow */
    }
  }

  for (const entry of (page.headers.link ?? '').split(/,(?=\s*<)/)) {
    const target = entry.match(/<([^>]+)>/)?.[1]
    const rel = entry.match(/rel\s*=\s*"?([a-z-]+)"?/i)?.[1]?.toLowerCase()
    if (target && rel && SPEC_RELATIONS.includes(rel)) add(target, rel)
  }

  for (const tag of page.body.slice(0, 200_000).match(/<link\b[^>]*>/gi) ?? []) {
    const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1]
    const rel = tag.match(/rel\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase()
    if (!href || !rel) continue
    if (SPEC_RELATIONS.includes(rel)) add(href, rel)
    // The overloaded one, admitted only when the media type and the label agree it is a spec.
    else if (rel === 'alternate' && /json|yaml/i.test(tag) && SPEC_WORDING.test(`${href} ${tag.match(/title\s*=\s*["']([^"']+)["']/i)?.[1] ?? ''}`)) {
      add(href, 'alternate')
    }
  }

  return found.slice(0, MOST_SPEC_CANDIDATES)
}

/** The docs origin, when there is one and it is not the site we already probed. */
function docsHostApartFromSite(docs: string | null | undefined, site: string): string | null {
  if (!docs) return null
  try {
    const origin = new URL(docs).origin
    return origin === site ? null : origin
  } catch {
    return null
  }
}

/** The same test the guessed paths face: a URL is a spec when its body says it is. */
function readsAsSpec(got: Fetched): boolean {
  const head = got.body.slice(0, 2000).toLowerCase()
  return isRealTextFile(got, 20) && (head.includes('openapi') || head.includes('swagger'))
}

/**
 * The two ways a page can hand a machine markdown. Asked of the documentation front page, which is
 * the page least likely to answer: it is a navigation shell, and on a docs host its ".md" twin is
 * not even a URL - docs.strapi.io/.md is nothing. The pages under it do answer, and the same scan
 * has already fetched them: supabase.com/docs/guides/auth returns text/markdown, and
 * docs.strapi.io/cms/features/api-tokens.md is a real file.
 */
async function negotiatesMarkdown(
  url: string,
): Promise<{
  acceptHeader: boolean
  dotMdSuffix: boolean
  answeredAt: string | null
  docsStatus: number
  declared: { url: string; rel: string }[]
}> {
  const suffixUrl = `${url.replace(/\/$/, '')}.md`
  const [viaAccept, viaSuffix] = await Promise.all([
    fetchUrl(url, { accept: 'text/markdown' }),
    fetchUrl(suffixUrl, { accept: 'text/markdown' }),
  ])
  const acceptHeader = (viaAccept.headers['content-type'] ?? '').includes('markdown')
  const dotMdSuffix = isRealTextFile(viaSuffix, 200)
  return {
    acceptHeader,
    dotMdSuffix,
    answeredAt: acceptHeader ? url : dotMdSuffix ? suffixUrl : null,
    docsStatus: viaAccept.status,
    // Free: this is the page we just fetched, read for what it says about itself.
    declared: declaredSpecs(viaAccept),
  }
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
  // Where documentation conventionally lives, asked whether or not discovery went there.
  // launchdarkly.com/llms.txt is a 228 kB HTML shell and docs.launchdarkly.com/llms.txt is a
  // 200 kB text file, so on the runs where discovery settled on the apex we published "no
  // llms.txt at any of the locations probed" about a vendor who publishes one.
  try {
    const conventional = `https://docs.${new URL(site).hostname.replace(/^www\./, '')}`
    if (conventional !== site) locations.docs_subdomain_llms_txt = `${conventional}/llms.txt`
  } catch {
    /* site is always a URL we built ourselves */
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
      // Both addresses: `url` is where the vendor publishes and belongs in the verdict, `got.url`
      // is where the bytes came from and is the only correct base for a relative link. They differ
      // on 8 of the 136 files we credit - docs.twilio.com/llms.txt is served from
      // www.twilio.com/docs/ - and resolving against the asked-for one turned six live Twilio
      // pages into a published accusation.
      return [label, file, present ? got.body : '', url, got.url || url] as const
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
  // Deduplicated, because three labels can be the same address: with documentation on
  // docs.<domain>, the conventional guess, the docs origin and the docs path all resolve to
  // docs.<domain>/llms.txt. Counting one request three times would make the sentence claim a
  // thoroughness it does not have.
  const llmsProbed = [...new Set(Object.values(locations))]
  let corpus = ''
  /** The count of a word is only a fact about a file we hold all of. */
  let countable = ''
  let anyTruncated = false
  const llmsUrls: string[] = []
  /** Kept apart from the concatenated corpus because a relative link resolves against its own file. */
  const llmsFiles: { body: string; base: string; index: boolean }[] = []
  // The same file answers at more than one of these locations - chargebee.com serves its llms.txt
  // on the apex and on www - and counting one document twice would be counting evidence twice.
  const seenBodies = new Set<string>()
  for (const [label, file, body, url, servedFrom] of llmsEntries) {
    llms[label] = file
    if (!file.present || seenBodies.has(body)) continue
    seenBodies.add(body)
    llmsUrls.push(url)
    llmsFiles.push({ body, base: servedFrom, index: !label.includes('full') })
    corpus += body
    if (file.truncated) anyTruncated = true
    else countable += body
  }

  const llmsLinks = await sampleLlmsLinks(llmsFiles)

  const mcpUrls = [...corpus.matchAll(/https?:\/\/[^\s)"']*mcp[^\s)"']*/gi)].map((m) => m[0])
  const uniqueMcpUrls = [...new Set(mcpUrls)].slice(0, 5)

  const { declared: frontPageDeclared, ...frontPageNegotiation } = frontPage
  const negotiation = { ...frontPageNegotiation, probed: [docsUrl] }
  const declared = [...frontPageDeclared]
  if (!negotiation.acceptHeader && !negotiation.dotMdSuffix) {
    const deeper = (await deeperDocsPages).slice(0, MOST_NEGOTIATION_RETRIES)
    const retries = await inParallel(deeper, (url) => negotiatesMarkdown(url))
    for (const [index, retry] of retries.entries()) {
      negotiation.acceptHeader ||= retry.acceptHeader
      negotiation.dotMdSuffix ||= retry.dotMdSuffix
      negotiation.answeredAt ??= retry.answeredAt
      negotiation.probed.push(deeper[index])
      if (declared.length === 0) declared.push(...retry.declared)
    }
  }

  const openapi = openapiHits.filter((path): path is string => path !== null)
  // Only when guessing on the site found nothing, and only when the docs are somewhere else.
  let openapiOnDocsHost: string | undefined
  const docsOrigin = docsHostApartFromSite(docs, site)
  if (openapi.length === 0 && docsOrigin) {
    const onDocs = await inParallel(OPENAPI_PATHS, async (path) => {
      const got = await fetchUrl(`${docsOrigin}${path}`, { accept: 'application/json' })
      return readsAsSpec(got) ? `${docsOrigin}${path}` : null
    })
    openapiOnDocsHost = onDocs.find((url): url is string => url !== null)
  }
  // Only when guessing found nothing: a vendor who serves /openapi.json has already been counted,
  // and this costs a request per candidate on the domains that are hardest to read anyway.
  let openapiDeclared: MachineFindings['openapiDeclared']
  if (openapi.length === 0 && !openapiOnDocsHost) {
    const confirmations = await inParallel(declared, (candidate) =>
      fetchUrl(candidate.url, { accept: 'application/json' }),
    )
    const at = confirmations.findIndex(readsAsSpec)
    if (at !== -1) openapiDeclared = declared[at]
  }

  return {
    findings: {
      llms,
      llmsProbed,
      hasLlmsTxt: Object.values(llms).some((f) => f.present),
      llmsUrls,
      hasLlmsFullTxt: Object.entries(llms).some(([label, f]) => label.includes('full') && f.present),
      llmsLinks,
      wellKnown: Object.fromEntries(wellKnownEntries),
      openapi,
      openapiDeclared,
      openapiOnDocsHost,
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
