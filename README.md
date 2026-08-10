# Let Agents In

Measures whether an AI coding agent can find, register with and integrate a product.

Live: https://stackpick-f12d13a227ea.herokuapp.com

## Run it

```bash
pnpm install
pnpm dev                      # writes reports to ./data, no accounts needed
pnpm scan supabase.com        # same scanner, straight to the terminal
VERBOSE=1 pnpm scan vercel.com
```

## Deploy

```bash
git push heroku main
heroku logs -a letagentsin --tail
```

Config lives in Heroku config vars, see `.env.example` for the list. The console at `/app`
needs `STACKPICK_CONSOLE_TOKEN`; visit `/app?key=<token>` once and the cookie carries it.

## Where things are

| Path | What |
|---|---|
| `src/lib/scan/` | The scanner: discovery, robots, machine context, funnel, npm |
| `src/lib/score.ts` | The formula. Data, not code, so `/methodology` renders from it |
| `src/lib/store.ts` | Filesystem or Mongo, chosen by env |
| `src/app/r/[id]` | The scorecard, which is the thing that gets emailed |

`ARCHITECTURE.md` covers why the score is deterministic and which traps are already paid for.
