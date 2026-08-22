# Where to list us, and what each one needs

Originally checked on 2026-08-14. Status refreshed on 2026-08-22 from the live directories and
our published registry entry; completed and blocked items below supersede the original checklist.

## 2026-08-22 status

- **Official MCP Registry: done.** `com.letagentsin/scanner` 1.0.1 is live. The mirror workflow is
  healthy again.
- **Smithery and Glama: discoverable.** Both search surfaces return Let Agents In without another
  manual submission.
- **PulseMCP: no action available.** Manual submissions are paused; its submit page says it plans
  to ingest from the Official MCP Registry.
- **mcp.so: decision required.** Submission is now a $39 one-time purchase. No purchase was made.
- **Hacker News: handoff.** The submit page requires a logged-in account. If used, submit the
  measured file-storage result rather than the home page.
- **BabyLoveGrowth: baseline only.** Its free audit returned 0/20 mentions, but categorized the
  product as an API-auditing competitor. Do not treat that as a product-equivalence audit.

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

**1. Official MCP registry — COMPLETED 2026-08-22.** Version 1.0.1 is live. Keep `server.json`,
`/.well-known/mcp.json` and the runtime `serverInfo.version` aligned for every future publication.

**2. Bing Webmaster Tools** — `bing.com/webmasters`. IndexNow already feeds Bing, so this is worth
it for the reporting rather than the indexing.

**3. MCP directories** — Smithery and Glama already find us. `mcp.so` is paid ($39); PulseMCP has
paused manual submissions and points publishers to the Official MCP Registry.

**4. llms.txt directories** — `directory.llmstxt.cloud` and `llmstxt.site`. Both live. Low effort,
low certainty of traffic; do them last.

## Description to paste

> Let Agents In measures whether an AI coding agent can find, register with and integrate a
> product. Fifteen deterministic HTTP checks with published rules across five funnel stages, no
> model involved, and a public vendor corpus published as JSON and CSV. Two MCP tools:
> `scan_domain` scores one domain, `find_providers` answers which vendors in a category an
> unattended run can finish with.

**Say the weak part out loud where there is room.** `find_providers` routes a sentence to a
category and gets 29 of 58 right on a held-out set. It is in the tool description already; a
listing that hides it sets up the first user to be disappointed by the thing we are worst at.
