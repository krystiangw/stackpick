import { fetchUrl } from './http'

export type NpmFindings = {
  package: string | null
  found: boolean
  version?: string
  bundledTypes?: boolean
  /**
   * What the answer rests on. A manifest field is the vendor declaring types; a declaration file
   * beside the entry point is TypeScript finding them anyway, which is what a developer's editor
   * does and what our manifest-only reading called "ships without bundled types".
   */
  typesFrom?: 'manifest' | 'declaration-file'
  hasRepository?: boolean
  hasHomepage?: boolean
  weeklyDownloads?: number
  lastPublish?: string
  /** Verbatim license field. Agents eliminate on this before they look at the product. */
  license?: string
  /** Popular packages abandoned for years are what cheaper models recommend from memory. */
  staleMonths?: number
}

type Manifest = {
  version?: string
  license?: string | { type?: string }
  types?: string
  typings?: string
  main?: string
  exports?: unknown
  repository?: unknown
  homepage?: string
  description?: string
  keywords?: string[]
  maintainers?: { name?: string; email?: string }[]
  dependencies?: Record<string, string>
}

/** Who publishes a package and how it describes itself, from the manifest we already read. */
export type PackageFacts = {
  version: string
  description: string
  keywords: string[]
  maintainers: { name: string; email: string }[]
  repository: string
  homepage: string
  dependencies: string[]
}

const repositoryUrl = (repository: unknown): string => {
  if (typeof repository === 'string') return repository
  const url = (repository as { url?: unknown } | null)?.url
  return typeof url === 'string' ? url : ''
}

/**
 * The maintainer list is the registry's own answer to "whose package is this", and it costs
 * nothing extra: it arrives in the manifest we already fetch. Reading a name, a scope or a
 * homepage instead is reading what the publisher chose to call themselves.
 */
export async function fetchPackageFacts(packageName: string): Promise<PackageFacts | null> {
  const got = await fetchUrl(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`, {
    accept: 'application/json',
  })
  if (!got.ok) return null
  try {
    const meta = JSON.parse(got.body) as Manifest
    return {
      version: meta.version ?? '',
      description: meta.description ?? '',
      keywords: meta.keywords ?? [],
      maintainers: (meta.maintainers ?? []).map((one) => ({ name: one.name ?? '', email: one.email ?? '' })),
      repository: repositoryUrl(meta.repository),
      homepage: meta.homepage ?? '',
      dependencies: Object.keys(meta.dependencies ?? {}),
    }
  } catch {
    return null
  }
}

/** What the registry allows a package and a version to be called. Anything else we misread. */
const PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i
const VERSION = /^[a-z0-9][a-z0-9.+-]*$/i

/** The file a `require` of the package resolves to, which is where TypeScript looks for its types. */
function entryPoints(meta: Manifest): string[] {
  const named: string[] = []
  if (typeof meta.main === 'string') named.push(meta.main)
  const root = (meta.exports as Record<string, unknown> | null | undefined)?.['.'] ?? meta.exports
  if (typeof root === 'string') named.push(root)
  else if (root && typeof root === 'object') {
    for (const condition of ['types', 'import', 'require', 'default', 'node']) {
      const value = (root as Record<string, unknown>)[condition]
      if (typeof value === 'string') named.push(value)
    }
  }
  // No entry at all means index.js, which is the case the manifest is silent about and the one
  // @sendgrid/client is in: it ships index.d.ts and declares nothing.
  return named.length > 0 ? named : ['index.js']
}

/** The declaration files TypeScript would accept for an entry point, in its own resolution order. */
function declarationsFor(entry: string): string[] {
  const path = entry.replace(/^\.?\//, '')
  const withoutExtension = path.replace(/\.(?:m|c)?jsx?$/i, '')
  const names = [`${withoutExtension}.d.ts`, `${withoutExtension}.d.mts`, `${withoutExtension}.d.cts`]
  // A `main` pointing at a directory resolves through its index, and one pointing at a file does not.
  if (withoutExtension === path) names.push(`${path.replace(/\/$/, '')}/index.d.ts`)
  return names
}

/**
 * Whether the published tarball carries types even though the manifest never says so. TypeScript
 * resolves a declaration file sitting next to the entry point regardless of a `types` field, so
 * reading the manifest alone told @sendgrid/client, meilisearch and plivo that they ship without
 * types while every editor that installs them disagrees. One request, and only after the manifest
 * has already said no.
 */
async function shipsDeclarationFile(packageName: string, version: string, meta: Manifest): Promise<boolean> {
  // The scope separator is part of this path, so the name goes in as written - percent-encoding
  // the @ asks jsdelivr for a package that does not exist - and is checked against the charset
  // the registry allows first, because the name can have come off a page we scraped.
  if (!PACKAGE_NAME.test(packageName) || !VERSION.test(version)) return false
  const listing = await fetchUrl(
    `https://data.jsdelivr.com/v1/packages/npm/${packageName}@${version}?structure=flat`,
    { accept: 'application/json' },
  )
  if (!listing.ok) return false
  let files: string[]
  try {
    files = ((JSON.parse(listing.body) as { files?: { name?: string }[] }).files ?? [])
      .map((file) => file.name)
      .filter((name): name is string => typeof name === 'string')
  } catch {
    return false
  }
  const published = new Set(files.map((name) => name.replace(/^\//, '')))
  return entryPoints(meta)
    .flatMap(declarationsFor)
    .some((candidate) => published.has(candidate))
}

export async function checkNpm(packageName: string | null): Promise<NpmFindings> {
  if (!packageName) return { package: null, found: false }
  const encoded = encodeURIComponent(packageName)

  const [latest, downloads, packument] = await Promise.all([
    fetchUrl(`https://registry.npmjs.org/${encoded}/latest`, { accept: 'application/json' }),
    fetchUrl(`https://api.npmjs.org/downloads/point/last-week/${encoded}`, { accept: 'application/json' }),
    // The full packument carries publish times but runs to megabytes. Its Last-Modified is
    // the timestamp of the most recent publish, which is the only part we need.
    fetchUrl(`https://registry.npmjs.org/${encoded}`, { method: 'HEAD' }),
  ])

  const result: NpmFindings = { package: packageName, found: latest.ok }
  if (!latest.ok) return result

  let manifest: Manifest
  try {
    manifest = JSON.parse(latest.body) as Manifest
  } catch {
    return result
  }
  result.version = manifest.version
  // Modern packages declare types in the exports map, not at the top level.
  const declared =
    Boolean(manifest.types ?? manifest.typings) || JSON.stringify(manifest.exports ?? {}).includes('"types"')
  result.bundledTypes = declared
  if (declared) result.typesFrom = 'manifest'
  result.license = typeof manifest.license === 'string' ? manifest.license : manifest.license?.type
  result.hasRepository = Boolean(manifest.repository)
  result.hasHomepage = Boolean(manifest.homepage)

  if (!declared && manifest.version && (await shipsDeclarationFile(packageName, manifest.version, manifest))) {
    result.bundledTypes = true
    result.typesFrom = 'declaration-file'
  }

  if (downloads.ok) {
    try {
      result.weeklyDownloads = (JSON.parse(downloads.body) as { downloads?: number }).downloads
    } catch {
      /* registry occasionally answers 200 with an error body */
    }
  }

  const lastModified = packument.headers['last-modified']
  if (lastModified) {
    const published = Date.parse(lastModified)
    if (Number.isFinite(published)) {
      result.lastPublish = new Date(published).toISOString()
      result.staleMonths = Math.round((Date.now() - published) / (1000 * 60 * 60 * 24 * 30.44))
    }
  }

  return result
}
