/**
 * The buttons we count, by name. A closed list on purpose: the route records whatever name it is
 * handed as a path in `visits`, and /app prints those paths, so an open list would let anybody
 * write a line onto that page.
 */
export const CLICKS = ['scan', 'watch', 'pricing', 'audit', 'mail-report', 'mail-audit', 'mail-hello'] as const
export type Click = (typeof CLICKS)[number]

export const isClick = (name: string): name is Click => (CLICKS as readonly string[]).includes(name)

/** Filed next to page renders, under a prefix no page has, so /app can tell the two apart. */
export const clickPath = (name: Click): string => `/click/${name}`
export const clickBeacon = (name: Click): string => `/api/click/${name}`
