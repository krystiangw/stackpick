# Let Agents In

Measures whether an AI coding agent will find, register with and integrate a product.

## What this is

Two products in one codebase, split by cost:

| | Free scan | Paid audit |
|---|---|---|
| What | Deterministic HTTP probes, layers 1-3 + funnel | Real agent runs, layer 4 |
| Cost per unit | $0, no LLM involved | ~$32 in tokens |
| Latency | 15-30 s, synchronous | 2-3 weeks |
| Runs where | This app | Off-app, manually, by the consultant |

Only the free scan lives here. The paid audit is a service, not a feature, and it stays
off the critical path on purpose: no queue, no worker, no laptop dependency.

## Why the score is deterministic

Competing scanners derive a 0-100 number from a single LLM call. That number does not
reproduce, and the whole category has a credibility problem because of it. Every check
here is an HTTP request with a published rule, so the same domain scanned twice gives the
same answer. That is the differentiator, not a limitation.

One concession to reality: bot gates are non-deterministic (the same Cloudflare endpoint
returned 200 once and 403 four times in testing). Network checks that can be gated run
three times and report the median, flagging disagreement.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind 4
- Heroku (Basic dyno, eu) at `stackpick-f12d13a227ea.herokuapp.com`
- MongoDB Atlas, its own database on the existing cluster. A dyno loses its disk on every
  restart, and a scorecard link that dies overnight breaks the one thing the report is for
- `lib/store` picks its implementation from env: filesystem when `MONGODB_URI` is absent, so
  the app runs locally with no external accounts
- Resend for report sharing; without an API key the message is logged instead of sent

## Scan pipeline

A scan receives a bare domain. The research scanners were handed docs/pricing/signup URLs
by hand, so discovery is the one genuinely new piece:

```
domain
  -> discover      home page + sitemap -> docs, pricing, signup, npm package
  -> robots        13 AI crawlers in 3 classes, crawl-delay, content signals
  -> machine       llms.txt (4 locations), .well-known (7), OpenAPI (5), markdown negotiation
  -> funnel        9 agent entry paths, OAuth DCR, signup gate, provisioning language
  -> integration   npm registry: types, repo, downloads, staleness
  -> score         published formula, data not code
```

### The three crawler classes

robots.txt names bots, and the names fall into three classes with completely different
commercial meaning. Conflating them is the most common mistake in this category:

| Class | Examples | Blocking it costs you |
|---|---|---|
| `training` | GPTBot, ClaudeBot, Google-Extended | absence from model weights |
| `search` | OAI-SearchBot, PerplexityBot | absence from cited answers |
| `user` | ChatGPT-User, Claude-User | **your customer's agent cannot read your docs while integrating you** |

The `user` class is not a crawler. It is a prospect with a different User-Agent header.
Companies block it wholesale by pasting "AI bot" lists off the internet.

## Traps already paid for

These cost real debugging time in the research phase. Do not reintroduce them.

1. **Soft-404s.** Many sites answer 200 with their SPA shell for any unknown path. Check
   content type and body length before believing a file exists.
2. **HTML entities split sentences.** `&quot;` ends in a semicolon, so naive sentence
   splitting cuts clauses in half. Unescape before splitting.
3. **Minimum-length filters cut the sharpest clauses.** "You must be a human." is 21 chars.
4. **`types` in package.json is not enough.** Modern packages declare types in `exports`.
5. **Read limits masquerade as file sizes.** Flag truncation explicitly.
6. **Bot gates are non-deterministic.** Three tries, median.

## Deliberately not in v0

User accounts, a dashboard, in-app payments, job queues, background workers, continuous
monitoring. The first sale happens over email and on a call, not through a checkout.
