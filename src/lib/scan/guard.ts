import { lookup } from 'node:dns/promises'

export class BlockedTargetError extends Error {}

const BLOCKED_SUFFIXES = ['.local', '.internal', '.localhost', '.home.arpa']

function isPrivateIpv4(address: string): boolean {
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false
  const [a, b] = parts
  if (a === 10 || a === 127 || a === 0) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 169 && b === 254) return true // link-local, and the cloud metadata endpoint
  if (a === 100 && b >= 64 && b <= 127) return true // carrier-grade NAT
  if (a >= 224) return true // multicast and reserved
  return false
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, '')
  if (normalized === '::1' || normalized === '::') return true
  if (/^f[cd]/.test(normalized)) return true // unique local
  if (normalized.startsWith('fe80')) return true // link-local
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  return mapped ? isPrivateIpv4(mapped[1]) : false
}

/** One predicate for both the pre-flight check and the dispatcher that makes the connection. */
export function isPrivateAddress(address: string, family: number): boolean {
  return family === 6 ? isPrivateIpv6(address) : isPrivateIpv4(address)
}

export function isIpLiteral(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')
}

/**
 * The scanner fetches whatever a visitor types, so without this it is an open proxy into
 * anything the dyno can reach: cloud metadata, internal services, the loopback interface.
 * Checked on the resolved address, because a public hostname can point anywhere.
 */
export async function assertPublicHost(host: string): Promise<void> {
  const bare = host.toLowerCase().replace(/\.$/, '')

  if (isIpLiteral(bare)) {
    throw new BlockedTargetError('Scan a domain name, not an IP address.')
  }
  if (BLOCKED_SUFFIXES.some((suffix) => bare.endsWith(suffix)) || !bare.includes('.')) {
    throw new BlockedTargetError('That hostname is not reachable from the public internet.')
  }

  let addresses: { address: string; family: number }[]
  try {
    addresses = await lookup(bare, { all: true })
  } catch {
    throw new BlockedTargetError(`${bare} does not resolve.`)
  }
  if (addresses.length === 0) throw new BlockedTargetError(`${bare} does not resolve.`)

  for (const { address, family } of addresses) {
    if (isPrivateAddress(address, family)) throw new BlockedTargetError(`${bare} resolves to a private address.`)
  }
}
