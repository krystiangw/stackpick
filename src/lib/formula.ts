/**
 * Ordering formula versions, which is not what a number or a string does with them.
 *
 * The part after the dot is a counter and not a fraction: 9.9 was followed by 9.10 and we are on
 * 9.35. Read as a float, 9.9 sorts after 9.35 and every comparison built on that silently inverts
 * across the widest gaps, which are exactly the oldest measurements. Read as text, 9.9 sorts after
 * 9.12 for the same reason.
 */
export function isOlderThan(version: string, than: string): boolean {
  const parts = (value: string) => value.split('.').map((piece) => Number(piece) || 0)
  const [a, b] = [parts(version), parts(than)]
  for (let at = 0; at < Math.max(a.length, b.length); at += 1) {
    const [left, right] = [a[at] ?? 0, b[at] ?? 0]
    if (left !== right) return left < right
  }
  return false
}

/** The pair in release order, whichever way round it was asked. */
export const inReleaseOrder = (one: string, other: string): [string, string] =>
  isOlderThan(one, other) ? [one, other] : [other, one]
