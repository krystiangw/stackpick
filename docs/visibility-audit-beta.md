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

## Product boundary

This measures **Can agents find you?** The deterministic scanner still measures **Can agents use
you?** A quick run is a smoke observation, not a ranking. A full run repeats three different buying
questions across the same four surfaces. Neither replaces the separate, bespoke build audit in
which agents receive an application scaffold and must ship an integration.
