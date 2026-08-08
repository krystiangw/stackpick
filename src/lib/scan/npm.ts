import { fetchUrl } from './http'

export type NpmFindings = {
  package: string | null
  found: boolean
  version?: string
  bundledTypes?: boolean
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
  name: string
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
      name: packageName,
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

  try {
    const meta = JSON.parse(latest.body) as Manifest
    result.version = meta.version
    // Modern packages declare types in the exports map, not at the top level.
    result.bundledTypes = Boolean(meta.types ?? meta.typings) || JSON.stringify(meta.exports ?? {}).includes('"types"')
    result.license = typeof meta.license === 'string' ? meta.license : meta.license?.type
    result.hasRepository = Boolean(meta.repository)
    result.hasHomepage = Boolean(meta.homepage)
  } catch {
    return result
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
