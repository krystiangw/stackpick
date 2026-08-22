# Weekly agent visibility measurement

Run `pnpm visibility` once a week from the same machine. It asks eight frozen discovery questions
once each of Claude, Codex and Gemini: 24 answers in isolated directories. Results live outside the
repository under `~/.letagentsin-runs/visibility/YYYY-MM-DD`, with the exact prompt, CLI version,
model setting, operator context, answer, cited URLs and whether Let Agents In was named.

This is not scheduled in GitHub Actions on purpose. The agents run on subscriptions held on this
machine; Actions has none of those accounts, and replacing them with API models would silently turn
the next point in the series into another experiment. Put the command in the operator's weekly
calendar, and do not compare a run from another machine without naming that change.

Use `pnpm visibility -- --limit 2` for a six-answer smoke test. Use `--agents claude,codex` when an
agent is unavailable, but record the missing agent rather than filling its denominator with zeroes.
Perplexity is not automated here because the project has neither an API credential nor a stable
subscription CLI for it. Its answers belong in a separate series when one exists.

A failed or empty invocation is recorded but excluded from the denominator. On the first smoke run
Claude had reached its weekly subscription limit and Gemini's former individual Code Assist client
was no longer eligible; calling both “not found” would have converted billing and authentication
failures into a visibility result. Codex runs inside a private git root because it refuses an
untrusted directory and because the root stops every agent walking up into this repository.

The eight prompts are in `harness/visibility-prompts.json`. Changing one starts a new series; do not
rewrite old results. The prompts never name us, ask for sources, and cover the exact jobs the
product claims: domain scanning, public benchmarks, signup and provisioning barriers, provider
lookup, MCP discovery, file upload comparisons and measured evidence about agent entry points.
