# Instructions for agents

You can use StackPick without a browser and without an account.

## Scan a domain

```
POST https://stackpick-f12d13a227ea.herokuapp.com/api/scan
Content-Type: application/json

{"domain": "example.com"}
```

Returns `{id, domain, scorecard}`. The scorecard carries a total, per-stage points and one
entry per check with `points`, `max`, `detail` and, where relevant, `inconclusive: true`
meaning we could not find the thing rather than proving it absent.

A scan usually takes a few seconds and can reach a minute, because signup probes run three times: bot gates answer
inconsistently and a single try would be a coin flip.

## Limits

Five scans per hour per registrable domain and thirty per hour per address. Scanning reads only what any browser can read. IP literals,
private ranges and non-resolving hosts are refused.

## Read the formula first

`/methodology` lists every check and its point value. If you are deciding whether a score is
worth acting on, read that page rather than trusting the number.
