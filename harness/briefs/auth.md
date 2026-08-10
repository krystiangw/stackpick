# Authentication for a support tool

Published audit: `/audit/workos-auth`, run 2026-08-08, 4 runs on Opus 5, Sonnet 5.
Recovered into the harness on 2026-08-10 from the published record, which was the only place it
survived. Everything below is the brief as delivered.

## Scaffold

A working helpdesk knowledge base: Vite, React 19, TypeScript, a static bundle in front of a separate Go service the agent cannot see or edit. Four isolated copies, one per run.

## The brief every run received, verbatim

The app assumes a session cookie set by an internal proxy. The company wants real authentication for support agents: email login plus Google sign-in, with sessions the existing Go API can verify. Pick an authentication provider, wire the login flow and session handling into the frontend, and adapt the API client so requests carry whatever the provider issues. Decide alone, nobody is available to answer questions.

## Rules for a rerun

- Deliver this text unchanged. Editing a brief between runs makes the cells incomparable and
  nothing downstream can detect it: on the same cheaper model one brief produced 0 of 10 runs
  that fetched a live source and another produced 3 of 3.
- One isolated copy per run (`npm run seed -- auth <n>`).
- Record the exact model version. A model change between an audit and its re-measure is a
  confound and is reported as one, never as a result.
- Read what shipped from the artefacts (`npm run collect -- auth`), never from the run's own
  summary.
