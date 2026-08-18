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
import { isOlderThan } from './formula'

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
  /**
   * A real sentence of the shape this entry corrects. The rule test used to build one for itself
   * and assumed every erratum was about an MCP address, so the first entry about a signup form
   * failed a test that was really testing the fixture.
   */
  example: string
}

export const ERRATA: Erratum[] = [
  {
    domain: 'cloudinary.com',
    checkId: 'signup_reachable',
    fixedIn: '9.31',
    wrongWhen: /form needs JavaScript/,
    says:
      'This row says their signup form needs JavaScript. Their page carries no form at all: no field anywhere in the HTML the server sent, and the only way in is an identity provider. The verdict is the same either way, because an unattended agent gets through neither, but the sentence describes a form they never wrote. A corrected scan says what we actually saw.',
    example: 'https://signup.example/signup is reachable, but its form needs JavaScript',
  },
  {
    domain: 'transloadit.com',
    checkId: 'signup_reachable',
    fixedIn: '9.31',
    wrongWhen: /form needs JavaScript/,
    says:
      'This row says their signup form needs JavaScript. Their page carries no form at all: no field anywhere in the HTML the server sent, and the only way in is an identity provider. The verdict is the same either way, because an unattended agent gets through neither, but the sentence describes a form they never wrote. A corrected scan says what we actually saw.',
    example: 'https://signup.example/signup is reachable, but its form needs JavaScript',
  },
  {
    domain: 'trychroma.com',
    checkId: 'signup_reachable',
    fixedIn: '9.31',
    wrongWhen: /form needs JavaScript/,
    says:
      'This row says their signup form needs JavaScript. Their page carries no form at all: no field anywhere in the HTML the server sent, and the only way in is an identity provider. The verdict is the same either way, because an unattended agent gets through neither, but the sentence describes a form they never wrote. A corrected scan says what we actually saw.',
    example: 'https://signup.example/signup is reachable, but its form needs JavaScript',
  },
  {
    domain: 'rollbar.com',
    checkId: 'signup_reachable',
    fixedIn: '9.31',
    wrongWhen: /form needs JavaScript/,
    says:
      'This row says their signup form needs JavaScript. Their page carries no form at all: no field anywhere in the HTML the server sent, and the only way in is an identity provider. The verdict is the same either way, because an unattended agent gets through neither, but the sentence describes a form they never wrote. A corrected scan says what we actually saw.',
    example: 'https://signup.example/signup is reachable, but its form needs JavaScript',
  },
  {
    domain: 'modal.com',
    checkId: 'signup_reachable',
    fixedIn: '9.31',
    wrongWhen: /form needs JavaScript/,
    says:
      'This row says their signup form needs JavaScript. Their page carries no form at all: no field anywhere in the HTML the server sent, and the only way in is an identity provider. The verdict is the same either way, because an unattended agent gets through neither, but the sentence describes a form they never wrote. A corrected scan says what we actually saw.',
    example: 'https://signup.example/signup is reachable, but its form needs JavaScript',
  },
  {
    domain: 'cal.com',
    checkId: 'signup_reachable',
    fixedIn: '9.31',
    wrongWhen: /form needs JavaScript/,
    says:
      'This row says their signup form needs JavaScript. Their page carries no form at all: no field anywhere in the HTML the server sent, and the only way in is an identity provider. The verdict is the same either way, because an unattended agent gets through neither, but the sentence describes a form they never wrote. A corrected scan says what we actually saw.',
    example: 'https://signup.example/signup is reachable, but its form needs JavaScript',
  },
  {
    domain: 'redis.io',
    checkId: 'signup_reachable',
    fixedIn: '9.31',
    wrongWhen: /form needs JavaScript/,
    says:
      'This row says their signup form needs JavaScript. Their page carries no form at all: no field anywhere in the HTML the server sent, and the only way in is an identity provider. The verdict is the same either way, because an unattended agent gets through neither, but the sentence describes a form they never wrote. A corrected scan says what we actually saw.',
    example: 'https://signup.example/signup is reachable, but its form needs JavaScript',
  },
  // Piec wierszy `typed_package` ocenionych na paczce, ktorej nikt nie instaluje, zeby korzystac z
  // tego produktu. Zweryfikowane recznie 2026-08-18 wobec rejestru npm: dla kazdej istnieje paczka
  // tego samego wydawcy, ktora jest SDK, a w trzech przypadkach ma typy. Wiersz nadal sie publikuje,
  // bo reguly nie da sie poprawic bez przebudowy dopasowania (plan w STATE.md), ale nie moze stac
  // bez sprostowania: to zdanie o cudzym produkcie.
  // Ten jeden NIE wygasa na 9.40: bramka go nie lapie, bo problem jest wyzej, w rankingu ksztaltu
  // nazwy (`directus` wygrywa z `@directus/sdk`, ktore ma siedem razy wiecej pobran i nazywa sie
  // wprost SDK). Zadanie #47. Sprostowanie ma stac, dopoki wiersz jest bledny.
  {
    domain: 'directus.com',
    checkId: 'typed_package',
    // Fixed in 9.42, and not by the name-ranking rewrite this entry once waited for: the package's
    // own description now settles it, `@directus/sdk` says "Directus JavaScript SDK" and wins on
    // installs. Measured on the whole corpus before it shipped.
    fixedIn: '9.42',
    wrongWhen: /^directus ships without bundled types/,
    says: 'This row is scored on `directus`, the server, matched by publisher. The package a developer installs to use them is `@directus/sdk`, described on the registry as the Directus JavaScript SDK, and it ships types. The row is about the wrong artefact.',
    example: 'directus ships without bundled types, matched from the registry by who publishes it rather than by a link on your site',
  },
  {
    domain: 'xata.io',
    checkId: 'typed_package',
    fixedIn: '9.40',
    wrongWhen: /^@xata\.io\/api ships without bundled types/,
    says: 'This row is scored on `@xata.io/api`, matched by publisher. Xata publishes several typed packages under the same scope, and the client a developer installs is not this one. The row is about the wrong artefact.',
    example: '@xata.io/api ships without bundled types, matched from the registry by who publishes it rather than by a link on your site',
  },
  {
    domain: 'honeycomb.io',
    checkId: 'typed_package',
    fixedIn: '9.40',
    wrongWhen: /^libhoney ships without bundled types/,
    says: 'This row is scored on `libhoney`, their low-level legacy library. What their documentation sends a developer to today is `@honeycombio/opentelemetry-node`, which ships types. The row is about the wrong artefact.',
    example: 'libhoney ships without bundled types, matched from the registry by who publishes it rather than by a link on your site',
  },
  {
    domain: 'namecheap.com',
    checkId: 'typed_package',
    fixedIn: '9.40',
    wrongWhen: /^node-vault-client ships without bundled types/,
    says: 'This row is scored on `node-vault-client`, a HashiCorp Vault client that says nothing about Namecheap. They publish no Node SDK for their API, so this check has nothing to measure on them and the row should be unmeasured rather than failed.',
    example: 'node-vault-client ships without bundled types, matched from the registry by who publishes it rather than by a link on your site',
  },
  {
    domain: 'godaddy.com',
    checkId: 'typed_package',
    fixedIn: '9.40',
    wrongWhen: /^warehouse\.ai-api-client ships without bundled types/,
    says: 'This row is scored on `warehouse.ai-api-client`, their internal deployment tooling. They publish no Node SDK for their API, so this check has nothing to measure on them and the row should be unmeasured rather than failed.',
    example: 'warehouse.ai-api-client ships without bundled types, matched from the registry by who publishes it rather than by a link on your site',
  },
  {
    domain: 'medusajs.com',
    checkId: 'mcp_present',
    fixedIn: '9.31',
    wrongWhen: /nothing answered at mcp\./,
    says:
      'This row says nothing answered at the addresses we probed. They publish a live endpoint in the MCP registry, and the registry is not reachable from the machine this scan ran on: four requests from it timed out while other hosts answered in milliseconds. The silence was ours. We now mirror the registry, and a corrected scan finds their server.',
    example: 'No MCP surface: nothing answered at mcp.example.com, mcp.example.com/mcp, and no file mentions MCP',
  },
  {
    domain: 'phrase.com',
    checkId: 'mcp_present',
    fixedIn: '9.31',
    wrongWhen: /nothing answered at mcp\./,
    says:
      'This row says nothing answered at the addresses we probed. They publish a live endpoint in the MCP registry, and the registry is not reachable from the machine this scan ran on: four requests from it timed out while other hosts answered in milliseconds. The silence was ours. We now mirror the registry, and a corrected scan finds their server.',
    example: 'No MCP surface: nothing answered at mcp.example.com, mcp.example.com/mcp, and no file mentions MCP',
  },
  {
    domain: 'tolgee.io',
    checkId: 'mcp_present',
    fixedIn: '9.31',
    wrongWhen: /nothing answered at mcp\./,
    says:
      'This row says nothing answered at the addresses we probed. They publish a live endpoint in the MCP registry, and the registry is not reachable from the machine this scan ran on: four requests from it timed out while other hosts answered in milliseconds. The silence was ours. We now mirror the registry, and a corrected scan finds their server.',
    example: 'No MCP surface: nothing answered at mcp.example.com, mcp.example.com/mcp, and no file mentions MCP',
  },
  {
    domain: 'posthog.com',
    checkId: 'mcp_present',
    fixedIn: '9.12',
    wrongWhen: /(?<!mcp\.)posthog\.com\/mcp/,
    says:
      'This row names a documentation page as their MCP server. It is not one: that address answers 405 to any POST, exactly as their /docs and /pricing do, because that is what their framework does with a POST to a static route. They do run a server, at mcp.posthog.com/mcp, and the corrected scan names it.',
    example: 'Live MCP endpoint at https://posthog.com/mcp, answers JSON',
  },
  {
    domain: 'openrouter.ai',
    checkId: 'mcp_present',
    fixedIn: '9.12',
    wrongWhen: /openrouter\.ai\/docs/,
    says:
      'This row names a documentation page as their MCP server, on the same framework artefact as posthog.com. Their real server is at mcp.openrouter.ai/mcp and the corrected scan names it.',
    example: 'Live MCP endpoint at https://openrouter.ai/docs/guides/overview/mcp-server',
  },
  {
    domain: 'medusajs.com',
    checkId: 'mcp_present',
    fixedIn: '9.12',
    wrongWhen: /(?<!mcp\.)medusajs\.com\/mcp/,
    says:
      'This row credits a live MCP server on a 405 that their framework returns for every static route. A corrected scan finds none, so this point is one they have not earned and the row overstates them.',
    example: 'Live MCP endpoint at https://medusajs.com/mcp, answers JSON',
  },
]

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
