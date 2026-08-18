# Instructions for agents

You can use Let Agents In without a browser and without an account.

## Scan a domain

```
POST https://letagentsin.com/api/scan
Content-Type: application/json

{"domain": "example.com"}
```

Returns `{id, domain, scorecard}`. Read `scorecard.measurable`, not `scorecard.max`: the score is
out of the points that both applied to this domain and could be evaluated, and `max` is only the
paper maximum. Each check carries `points`, `max`, `detail`, and where relevant `inconclusive: true`
(we could not measure it, which is not the same as proving it absent) or `notApplicable: true`
(the check does not apply to a product of this kind). Neither counts in `measurable`.

Add `"format": "sarif"` for SARIF 2.1.0 that a code-scanning pipeline ingests, or
`"format": "agent"` for markdown tasks you can act on directly, each carrying the measurement
behind it and a link to the rule.

A scan takes about ten seconds for most domains and longer for slow ones. This endpoint answers
only when the whole scan is done, so for a slow domain it can hit a gateway timeout and return
503. If that matters to you, use `/api/scan/stream`, which sends progress events and does not go
silent.

## Or call it as a tool

There is an MCP server at `https://letagentsin.com/mcp`: Streamable HTTP,
JSON-RPC 2.0, no authentication, one tool called `scan_domain` that takes the same `format`
argument. The card describing it is at `/.well-known/mcp.json`.

## Or take all of it at once

`/corpus.json` and `/corpus.csv` carry every scan we publish, one row per domain and check, with
the verdict and the sentence it was measured from. Free to use and quote with attribution. If you
want to argue with the formula, that is the cheapest way to do it.

## Limits

5 scans per hour per registrable domain and 30 per hour per address. Scanning reads only what any browser can read. IP literals,
private ranges and non-resolving hosts are refused.

## Read the formula first

`/methodology` lists every check and its point value. If you are deciding whether a score is
worth acting on, read that page rather than trusting the number.
