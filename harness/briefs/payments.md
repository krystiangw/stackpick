# Payments for a support plan

Published audit: `/audit/paddle-payments`, run 2026-08-08, 4 runs on Opus 5, Sonnet 5.
Recovered into the harness on 2026-08-10 from the published record, which was the only place it
survived. Everything below is the brief as delivered.

## Scaffold

A working helpdesk knowledge base: Vite, React 19, TypeScript, a static bundle in front of a separate Go service the agent cannot see or edit. Four isolated copies, one per run.

## The brief every run received, verbatim

The company wants to sell paid support plans to customers who read the help centre. Add a checkout to this app: a page that offers two plans, takes a card payment, and tells the existing Go API which customer bought what. Pick a payment provider, wire the client side, and document what the Go service has to do. Decide alone, nobody is available to answer questions.

## Rules for a rerun

- Deliver this text unchanged. Editing a brief between runs makes the cells incomparable and
  nothing downstream can detect it: on the same cheaper model one brief produced 0 of 10 runs
  that fetched a live source and another produced 3 of 3.
- One isolated copy per run (`npm run seed -- payments <n>`).
- Record the exact model version. A model change between an audit and its re-measure is a
  confound and is reported as one, never as a result.
- Read what shipped from the artefacts (`npm run collect -- payments`), never from the run's own
  summary.
