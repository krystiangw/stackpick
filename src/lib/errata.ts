/**
 * Verdicts we know are wrong and cannot yet withdraw.
 *
 * A published row is normally corrected by rescanning the domain, which is why nothing like this
 * existed until now: the fix and the correction were the same act. On 12 August the cluster stopped
 * accepting writes, so the corpus froze on formula 9.8 while the scanner kept being fixed, and
 * three rows are now standing on the site saying something I have checked by hand and know to be
 * false. Leaving them unmarked until storage is sorted out would be publishing a claim about
 * somebody else's product that we no longer believe.
 *
 * An entry earns its place only when the row is wrong, not merely old. Every other row measured
 * under a superseded formula is already labelled as such wherever it appears.
 *
 * Entries retire themselves: the note disappears as soon as the row is measured under `fixedIn` or
 * later, so a finished reseed empties this list without anybody remembering to.
 */
export type Erratum = {
  domain: string
  checkId: string
  /** The formula that corrected it. The row is wrong only while it was measured before this. */
  fixedIn: string
  /**
   * What the wrong row actually says. A version test alone is not enough and published a false
   * correction: openrouter.ai's stored row was measured under 9.9, before the fix, and already
   * named mcp.openrouter.ai/mcp, so the page carried "Live MCP endpoint at mcp.openrouter.ai/mcp"
   * with a note underneath saying the row names a documentation page. A correction has to be
   * checked against the sentence it corrects, which is the whole point of the mechanism.
   */
  wrongWhen: RegExp
  /** What the row says, and what a scan says now, in the vendor's favour where they differ. */
  says: string
}

export const ERRATA: Erratum[] = [
  {
    domain: 'posthog.com',
    checkId: 'mcp_present',
    fixedIn: '9.12',
    wrongWhen: /posthog\.com\/mcp/,
    says:
      'This row names a documentation page as their MCP server. It is not one: that address answers 405 to any POST, exactly as their /docs and /pricing do, because that is what their framework does with a POST to a static route. They do run a server, at mcp.posthog.com/mcp, and the corrected scan names it.',
  },
  {
    domain: 'openrouter.ai',
    checkId: 'mcp_present',
    fixedIn: '9.12',
    wrongWhen: /openrouter\.ai\/docs/,
    says:
      'This row names a documentation page as their MCP server, on the same framework artefact as posthog.com. Their real server is at mcp.openrouter.ai/mcp and the corrected scan names it.',
  },
  {
    domain: 'medusajs.com',
    checkId: 'mcp_present',
    fixedIn: '9.12',
    wrongWhen: /medusajs\.com\/mcp/,
    says:
      'This row credits a live MCP server on a 405 that their framework returns for every static route. A corrected scan finds none, so this point is one they have not earned and the row overstates them.',
  },
]

/** 9.8 is older than 9.12, which string comparison gets backwards. */
function isOlderThan(version: string, than: string): boolean {
  const parts = (value: string) => value.split('.').map((piece) => Number(piece) || 0)
  const [a, b] = [parts(version), parts(than)]
  for (let at = 0; at < Math.max(a.length, b.length); at += 1) {
    const [left, right] = [a[at] ?? 0, b[at] ?? 0]
    if (left !== right) return left < right
  }
  return false
}

export function erratumFor(
  domain: string,
  checkId: string,
  formulaVersion: string,
  detail = '',
): Erratum | null {
  return (
    ERRATA.find(
      (entry) =>
        entry.domain === domain &&
        entry.checkId === checkId &&
        isOlderThan(formulaVersion, entry.fixedIn) &&
        entry.wrongWhen.test(detail),
    ) ?? null
  )
}
