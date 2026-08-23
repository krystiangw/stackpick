# AI visibility audit beta

## Production shape

`POST /api/visibility` validates and queues either a `quick` audit (one frozen prompt, four
observations) or a `full` audit (three prompts, twelve observations). It returns HTTP 202 and a
128-bit random job id. `GET /api/visibility?id=<id>` returns queued, running, complete or failed.
The browser polls that endpoint and renders the stored result after completion.

The result page is an executive report, not a transcript dump: presence rate and four grounded KPIs,
channel breakdown, source-domain frequency, three next actions and collapsed prompt-level evidence.
Perplexity Search has its own metric and is excluded from the answer-agent presence denominator.
Raw outputs remain available under the relevant prompt and channel for verification.

Jobs live in MongoDB collection `visibilityJobs`. The Heroku dyno never tries to impersonate a
consumer subscription. A persistent worker on the signed-in operator machine claims one queued job
atomically and runs each prompt in a fresh private git root, so no model can discover the brand by
walking into this repository.

| Reported surface | Execution | Authentication |
| --- | --- | --- |
| OpenAI | Codex CLI | ChatGPT subscription |
| Anthropic | Claude CLI | Claude subscription |
| Gemini | Antigravity CLI, pinned `gemini-3.7-flash-low` | Google subscription |
| Perplexity | official `pplx search web` CLI | Search API key |

The Perplexity CLI is not a consumer-answer client. Its ranked sources are labelled `search-api`;
they are useful evidence of search discoverability but are not represented as a Perplexity chat
answer. A failed or empty run is stored and excluded from the denominator.

## Operations

Run a single queued job manually:

```bash
MONGODB_URI="$(heroku config:get MONGODB_URI -a stackpick)" pnpm visibility-worker -- --once
```

The installed macOS LaunchAgent runs `scripts/run-visibility-worker.zsh`, restarts it after failure,
and obtains the current Mongo URI from Heroku rather than storing the credential in its plist.
Logs are under `~/Library/Logs/letagentsin-visibility-worker.*.log`.

This is a beta production dependency on the operator machine. Sleep, loss of network, expired CLI
sessions or subscription limits can delay a job. Individual provider failures do not fail the
whole audit; a database or worker failure does.

The waiting page says which of those it is. The worker writes a heartbeat between agent calls and
`GET /api/visibility` reads it, so a visitor is told plainly when nobody is on shift instead of
watching an unbounded spinner. Three states are distinguished on purpose: a worker is online, no
worker has reported in recently, or we could not read the heartbeat at all. The last one claims
nothing, because a database we could not query is not evidence that nobody is working.

### The daily observation budget

Every observation is one agent asked one question, and it is spent from the operator's own
subscriptions, one of which is shared with his day's work. The per-caller rate limit is in a dyno's
memory and its own comment says that trade is right "while a scan costs bandwidth and nothing else",
which this beta stopped being true.

So there is a second ceiling, `DAILY_OBSERVATION_BUDGET`, counted per UTC day in Mongo. It is charged
where the spending happens, when a worker takes a job, not when a visitor asks: a queue filled
yesterday runs today, and an abandoned job is claimed again. The endpoint reads the same counter, but
only to refuse early with an honest sentence.

The gate asks whether any budget is left, not whether this job fits, so a day can overshoot by at
most one audit. The stricter version is worse: the queue is taken oldest first, so a full audit that
did not fit would sit at the head and block every quick one behind it until midnight. The day comes
from the database clock, never from the laptop.

**60 is a judgement, not a measurement.** Fifteen quick audits or five full ones a day. Change it if
the beta gets real traffic, and say so here when you do.

**Restart the worker before deploying a change to the heartbeat.** launchd keeps the running
process on the old module until it fails, so a deploy-first rollout would have the new page telling
every visitor that nothing is measuring their audit while the old worker is measuring it:

```bash
launchctl kickstart -k "gui/$(id -u)/com.letagentsin.visibility-worker"
```

## Product boundary

This measures **Can agents find you?** The deterministic scanner still measures **Can agents use
you?** A quick run is a smoke observation, not a ranking. A full run repeats three different buying
questions across the same four surfaces. Neither replaces the separate, bespoke build audit in
which agents receive an application scaffold and must ship an integration.
