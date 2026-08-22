# AI visibility audit beta

## Product boundary

This is **Can agents find you?**, not the deterministic **Can agents use you?** score. It asks three
neutral category questions per configured search-enabled provider and reports a dated sample:
mentions over valid answers, direct links, exact prompts, answers, sources, model IDs and failures.
A provider failure is excluded from the denominator; it is never converted into "not found".

BabyLoveGrowth names ChatGPT, Claude, Gemini and Perplexity. The beta uses the corresponding APIs:

| Surface | API | default model |
| --- | --- | --- |
| ChatGPT/OpenAI | Responses API + web search | `gpt-5.6-luna` |
| Claude | Messages API + web search | `claude-sonnet-4-6` |
| Gemini | Generate Content + Google Search grounding | `gemini-3.6-flash` |
| Perplexity | Sonar API | `sonar` |

Defaults are overridable with `<PROVIDER>_VISIBILITY_MODEL`. The exact model travels with every
answer, so changing a default does not silently rewrite an old observation.

## Configuration

Set one or more of `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, and
`PERPLEXITY_API_KEY`. The page lists only configured providers. No key is exposed to the browser.
With no key, the page remains readable and the submit button stays disabled.

The public endpoint is `POST /api/visibility` with `brand`, bare `domain`, and a short `category`.
It is limited to one admitted audit per caller per hour while in beta. Twelve calls are made when
all four providers are configured. Calls run concurrently and each has a 22-second timeout.

## Why local subscriptions stay separate

`pnpm visibility` remains the research harness: it runs signed-in local CLIs in isolated git roots
and records operator context. It is useful for a weekly benchmark, but it is not a production
backend: subscriptions are tied to one person, have interactive limits, and can change tools or
context without an API contract. Public audits therefore use provider APIs and record model IDs.

## Deliberate beta limits

- Results currently return to the browser and are not stored or shareable.
- `position` means the first answer line containing the brand or domain, not a universal search rank.
- Correctness of a model's description is not auto-scored yet; that needs either human review or a
  separately versioned judge, never the same answer model grading itself.
- A repeated run can move. Report counts such as `3/12`, not a synthetic score out of 100.
