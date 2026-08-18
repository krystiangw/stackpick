/**
 * A row that stopped being measured has to say so, on the page that publishes it.
 *
 * We honour a robots.txt group that names us by freezing the vendor's row rather than deleting it,
 * and the audit that settled that policy named its own necessary condition: the freeze must be
 * visible and the way out of it must work. Neither half existed. The skip happened inside the
 * automated pass and left no trace anywhere a reader could see, so the published row went on
 * looking like a current measurement of a company that had asked us to stop measuring it.
 *
 * `since` is the first pass that saw the request and never moves afterwards, because it is the
 * date we print. `lastSeenAt` moves on every pass, which is what tells a reader the request is
 * still there rather than remembered from a month ago.
 */
export type StayOut = { domain: string; since: string; lastSeenAt: string }

/** Keeps the first date across repeated observations, which is the whole reason both fields exist. */
export function stayOutAfter(existing: StayOut | null, domain: string, now: string): StayOut {
  return { domain, since: existing?.since ?? now, lastSeenAt: now }
}
