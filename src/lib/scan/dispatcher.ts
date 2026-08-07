import { lookup as dnsLookup, type LookupOptions } from 'node:dns'
import { Agent, setGlobalDispatcher } from 'undici'
import { isPrivateAddress } from './guard'

/**
 * Closes the gap between validating a hostname and connecting to it.
 *
 * `assertPublicHost` resolves the name and checks the answer, then `fetch` resolves the same
 * name again on its own. A record with TTL 0 that alternates between a public address and
 * 127.0.0.1 passes the check and connects to the loopback interface: two lookups, two
 * different answers, which is the whole trick. Validating inside the lookup the connection
 * actually uses leaves nothing in between.
 */

type LookupCallback = (error: NodeJS.ErrnoException | null, address: never, family?: number) => void

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

function validatingLookup(hostname: string, options: LookupOptions, callback: LookupCallback): void {
  // Next and the dev server talk to themselves over loopback by name. A scan target can
  // never be one of these: assertPublicHost rejects them before a request is ever made.
  if (LOOPBACK_HOSTS.has(hostname.toLowerCase())) {
    dnsLookup(hostname, options, callback as never)
    return
  }

  dnsLookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) {
      callback(error, undefined as never)
      return
    }
    const resolved = (addresses as unknown as { address: string; family: number }[]) ?? []
    const blocked = resolved.find((entry) => isPrivateAddress(entry.address, entry.family))
    if (blocked) {
      const refusal: NodeJS.ErrnoException = new Error(`${hostname} resolves to a private address (${blocked.address})`)
      refusal.code = 'ECONNREFUSED'
      callback(refusal, undefined as never)
      return
    }
    if (resolved.length === 0) {
      const empty: NodeJS.ErrnoException = new Error(`${hostname} does not resolve`)
      empty.code = 'ENOTFOUND'
      callback(empty, undefined as never)
      return
    }
    // Hand back the same shape the caller asked for: one entry unless it wanted them all.
    if (options.all) callback(null, resolved as never)
    else callback(null, resolved[0].address as never, resolved[0].family)
  })
}

let installed = false

export function installGuardedDispatcher(): void {
  if (installed) return
  installed = true
  setGlobalDispatcher(new Agent({ connect: { lookup: validatingLookup } }))
}
