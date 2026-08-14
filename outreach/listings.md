# Where to list us, and what each one needs

Checked by request on 2026-08-14: every URL below returned a live page, and the MCP registry was
queried for `letagentsin` and returned nothing, so we are not in it yet. Nothing here is from
memory.

## Done, no account needed

- **IndexNow** — key hosted at the site root, all 181 URLs submitted, HTTP 202. Feeds Bing,
  Yandex, Seznam and Naver. Google does not use it.
- **`/.well-known/api-catalog`** (RFC 9727), **`/.well-known/mcp.json`** generated from the server,
  **`/llms.txt`**, **`/agent-signup.md`**, **`/agents.md`**, **`/openapi.json`**, sitemap in
  `robots.txt`, `Organization` and `Dataset` structured data.
- **Google Search Console** — verified as a Domain property on 12 August; Google began collecting
  impressions the same day. The sitemap is discovered through `robots.txt`, so there is nothing to
  submit by hand.

## Needs you, because an agent must not create accounts

**1. Official MCP registry** — `registry.modelcontextprotocol.io`. We are not listed; a search for
our name returns nothing. `server.json` is ready in the repo root and its shape was diffed against
a live entry rather than against the schema prose. Publishing authenticates by proving you own the
domain, which needs a DNS record only you can add.

**2. Bing Webmaster Tools** — `bing.com/webmasters`. IndexNow already feeds Bing, so this is worth
it for the reporting rather than the indexing.

**3. MCP directories** — `smithery.ai`, `glama.ai/mcp/servers`, `mcp.so`. All three are live.
Each wants a GitHub sign-in. `pulsemcp.com` refused our request with a 403, so treat it as
unverified rather than absent.

**4. llms.txt directories** — `directory.llmstxt.cloud` and `llmstxt.site`. Both live. Low effort,
low certainty of traffic; do them last.

## Description to paste

> Let Agents In measures whether an AI coding agent can find, register with and integrate a
> product. Fifteen deterministic HTTP checks with published rules across five funnel stages, no
> model involved, and a corpus of 170 vendors published as JSON and CSV. Two MCP tools:
> `scan_domain` scores one domain, `find_providers` answers which vendors in a category an
> unattended run can finish with.

**Say the weak part out loud where there is room.** `find_providers` routes a sentence to a
category and gets 29 of 58 right on a held-out set. It is in the tool description already; a
listing that hides it sets up the first user to be disappointed by the thing we are worst at.
