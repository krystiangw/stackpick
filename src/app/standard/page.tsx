import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { CHECKS } from '@/lib/score'
import { publishedCorpus } from '@/lib/published'
import { recordVisit } from '@/lib/visits'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  alternates: { canonical: `${SITE_URL}/standard` },
  title: 'AgentReady, and what we measure instead: Let Agents In',
  description:
    // The description is what an agent reads instead of opening the page, which is a check we
    // publish about other people. A stale number here is the failure we sell finding.
    'The AgentReady standard has 28 requirements and 7 of them are MUST. We measure six of those seven and go further on four. Half of what we check has no equivalent in the spec at all, and we publish which half.',
}

/**
 * Where we stand against somebody else's standard.
 *
 * A buyer who finds agentready.org asks one question about us: are you compliant. The honest answer
 * is a mapping rather than a badge, because most of their MUSTs are conditional on a surface the
 * vendor may not expose, and because half of what we measure the spec does not ask about at all.
 *
 * Every claim about the standard here was read from agentready.org on 2026-08-18 and the counts of
 * our own checks are computed, not typed.
 */

const READ_ON = '18 August 2026'

/** The seven MUSTs, verbatim identifiers, against the check that measures the same ground. */
const MUSTS: { id: string; asks: string; ours: string | null; further: string | null }[] = [
  {
    id: 'AR-DISC-01',
    asks: 'Declare AI crawler policies in robots.txt, telling named agents apart from training crawlers.',
    ours: 'Retrieval bots allowed, no crawl delay, and the paths robots.txt points at actually answer',
    further:
      'We follow the file rather than reading it: a robots.txt that names a path we then cannot fetch is a claim, and we check it.',
  },
  {
    id: 'AR-CAPA-01',
    asks: 'Expose tools over the Model Context Protocol. Conditional on having agent tools at all.',
    ours: 'Live MCP endpoint',
    further:
      'We complete a JSON-RPC handshake instead of looking for a file, and we send one request to a path nobody registered, because an edge that answers everything with an empty 202 would otherwise score as a server.',
  },
  {
    id: 'AR-CAPA-04',
    asks: 'Publish an A2A agent card at /.well-known/agent-card.json. Conditional on an agent-to-agent surface.',
    ours: 'Agent entry point',
    further: null,
  },
  {
    id: 'AR-CAPA-08',
    asks: 'Provide an OpenAPI 3.1 description of your HTTP API. Conditional on exposing one.',
    ours: 'Machine-readable API description',
    further:
      'Five paths, a declaration from your own documentation page, and content negotiation for markdown, because a spec we cannot find is a spec an agent cannot find.',
  },
  {
    id: 'AR-IDEN-02',
    asks: 'Implement OAuth 2.0 for delegated, scoped access. Conditional on user-owned resources.',
    ours: 'OAuth dynamic client registration',
    further:
      'We look for the metadata across every host an authorization server plausibly lives on, not only the one you would guess.',
  },
  {
    id: 'AR-IDEN-03',
    asks: 'Expose OAuth authorization server metadata at the well-known address. Conditional on running one.',
    ours: 'OAuth dynamic client registration',
    further: null,
  },
  {
    id: 'AR-IDEN-05',
    asks: 'Use PKCE with S256 for public OAuth clients. Conditional on accepting them.',
    ours: null,
    further: null,
  },
]

/** Our checks with nothing in the standard that asks the same question. */
const NO_EQUIVALENT = [
  'signup_reachable',
  'signup_no_captcha',
  'self_serve',
  'programmatic_provisioning',
  'typed_package',
  'price_in_snippet',
  'docs_without_js',
  'answers_plain_request',
]

export default async function StandardPage() {
  const corpus = await publishedCorpus()
  // Counted from what the scan found at each address, not from the sentence it wrote. Reading the
  // published detail instead gave 2, because a domain serving several of these files is described
  // by whichever one the sentence names first: a number about our prose rather than about them.
  const labelOf = (id: string) => CHECKS.find((check) => check.id === id)?.label ?? id
  recordVisit('/standard', (await headers()).get('user-agent'))

  return (
    <main className="mx-auto max-w-5xl px-6">
      <section className="border-b border-rule py-14">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-brass">AgentReady v1.0.0</p>
        <h1 className="mt-4 max-w-2xl text-balance text-4xl font-semibold leading-tight tracking-tight">
          Somebody wrote a standard. Here is where we stand against it.
        </h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
          AgentReady has 28 requirements across five sections, and seven of them are MUST. Five of those seven are
          conditional: they apply only if you expose the surface they are about, so a product with no agent-to-agent
          interface is not failing the agent card requirement, it simply has nothing to publish. Read from
          agentready.org on {READ_ON}.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          We measure six of the seven. On four of those we ask a harder question than the spec does. One we do not
          measure at all, and the reason is below. There is no compliance score on this page, and there will not be
          one: the standard itself exists because every readiness score disagrees with every other.
        </p>
      </section>

      <section className="border-b border-rule py-12">
        <h2 className="text-lg font-semibold tracking-tight">The seven MUSTs against our card</h2>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">
                <th className="border-b border-rule pb-2">Requirement</th>
                <th className="border-b border-rule pb-2">What it asks</th>
                <th className="border-b border-rule pb-2">Our check</th>
              </tr>
            </thead>
            <tbody>
              {MUSTS.map((must) => (
                <tr key={`${must.id}-${must.ours ?? 'none'}`}>
                  <td className="border-b border-rule py-3 pr-4 align-top font-mono text-xs text-brass">{must.id}</td>
                  <td className="border-b border-rule py-3 pr-4 align-top leading-relaxed text-ink-soft">{must.asks}</td>
                  <td className="border-b border-rule py-3 align-top leading-relaxed">
                    {must.ours ? (
                      <>
                        <span className="font-medium">{must.ours}</span>
                        {must.further && <span className="mt-1 block text-ink-soft">{must.further}</span>}
                      </>
                    ) : (
                      <span className="text-ink-faint">not measured</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-b border-rule py-12">
        <h2 className="text-lg font-semibold tracking-tight">The one we refuse to add, and why</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          AR-IDEN-05 asks for PKCE with S256. We do not score it, and the reason is a number rather than an opinion:
          almost nobody in our corpus publishes the metadata that would let us check it without guessing, and a check
          measured on a handful of rows cannot tell a real absence from our own blind spot. Every check costs requests
          and a place on the card, and one that credits nothing certain while risking a wrong accusation is worse than
          the gap it closes. We already collect the evidence while checking OAuth, so the decision reverses itself the
          moment the number grows.
        </p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          For the same reason we watch AR-CAPA-04 rather than celebrate it. On {READ_ON} we asked 59 domains spread
          across this corpus for a card at the address the standard names. Fifty-two answered and none of them served
          one: most said 404 outright, and where a site answered 200 with something else we checked it against that
          site&apos;s own answer to a path nobody registered. The other seven
          refused us or answered with something we could not read either way, and they are counted in neither
          direction, because a host that will not answer is not a host without a card. We still probe that address, since a vendor who does publish one was
          reading as if they published nothing, and that was our error rather than theirs.
        </p>
      </section>

      <section className="border-b border-rule py-12">
        <h2 className="text-lg font-semibold tracking-tight">Half our card has no equivalent in the spec</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          {NO_EQUIVALENT.length} of our {CHECKS.length} checks ask something AgentReady does not ask at all. They are
          the half about whether an agent can actually get in rather than whether the right files exist, which is the
          difference between a specification and a measurement.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {NO_EQUIVALENT.map((id) => (
            <li key={id} className="border-l-2 border-brass pl-4 leading-relaxed">
              {labelOf(id)}
            </li>
          ))}
        </ul>
      </section>

      <section className="py-12">
        <h2 className="text-lg font-semibold tracking-tight">What we publish about ourselves</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
          We serve an agent catalogue at{' '}
          <a href="/.well-known/ai-catalog.json" className="text-brass underline underline-offset-4">
            /.well-known/ai-catalog.json
          </a>
          , point at it from robots.txt, publish an OpenAPI description of our own API and run an MCP server. We do not
          publish an A2A agent card, because that requirement is conditional on exposing an agent-to-agent surface and
          we expose MCP and HTTP. Shipping a well-known file with nothing behind it is a claim we would then have to
          keep true.
        </p>
        <p className="mt-5 font-mono text-sm">
          <Link href="/methodology" className="text-brass underline underline-offset-4">
            Every check, with the rule that decides it
          </Link>
          {' · '}
          <a href="/corpus.json" className="text-brass underline underline-offset-4">
            all {corpus.reports.length} rows as data
          </a>
        </p>
      </section>
    </main>
  )
}
