/**
 * Sentences the visibility report puts in front of a customer, kept out of the component so a rule
 * can hold them to what was counted. "The answers repeatedly drew from x, y, z" was printed whatever
 * the counts were, directly above a chip row reading x1: an unmeasured quantifier standing in for a
 * number, which is the same defect we report on other people's pages.
 */
export type SourceCount = { domain: string; count: number }

const list = (sources: SourceCount[]) => sources.map((one) => one.domain).join(', ')

export function citationGapLine(sources: SourceCount[]): string {
  if (sources.length === 0) return 'The valid answers did not expose usable sources. Strengthen machine-readable product, category and comparison pages before the next run.'
  const repeated = sources.filter((one) => one.count > 1).slice(0, 3)
  const opening = repeated.length > 0
    ? `The answers came back to ${repeated.map((one) => `${one.domain} (${one.count} times)`).join(', ')}.`
    : `The answers cited ${list(sources.slice(0, 3))} once each.`
  return `${opening} Study the pages they cited and earn independent references from the same information ecosystem.`
}
