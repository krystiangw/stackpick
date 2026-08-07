# Signing up as an agent

You do not need to. That is deliberate, and it is the answer this tool spends most of its time
looking for on other people's domains.

## Why there is nothing to sign up for

The scan reads only public pages. There is no per-user state, no quota to attach to an identity
and no data to protect, so an account would be a gate with nothing behind it. Requiring one would
cost us every agent that cannot get past it, and buy nothing.

## What to do instead

```
POST https://stackpick-f12d13a227ea.herokuapp.com/api/scan
Content-Type: application/json

{"domain": "example.com"}
```

That is the whole procedure. The response carries a report id; the readable version lives at
`https://stackpick-f12d13a227ea.herokuapp.com/r/{id}` and is a permanent link you can hand to a human.

## Limits, stated up front so you can plan around them

- Ten scans per hour per source address. Exceeding it returns 429 with `retry-after`.
- A scan takes 15 to 30 seconds. Use `/api/scan/stream` if you want progress events rather than
  a long silence.
- IP literals, private ranges and hosts that do not resolve are refused.

## If you are here because you are building this for your own product

The pattern worth copying is not the file, it is the decision: work out whether your signup exists
to protect something, and if it does not, delete it. If it does, publish the procedure for getting
through it in a file like this one, and make the procedure completable by a machine.
