# Copy rewrite plan, from the audit of 2026-09-07

The audit is `docs/copy-audit-2026-09-07.md`. This file tracks the rewrite in its recommended
order, records what shipped, and carries the brief for each remaining phase so that whoever
picks it up (a person or an agent) can continue without the original session.

## Rules for every phase

- Edit the copy, not the facts: no invented number, check name, category name, price or date.
- English only. No em dashes, no en dashes. ASCII hyphen only.
- `scripts/rules.mts` greps exact literals in these pages. When a guarded sentence changes,
  update the guard in the same change so it still protects the same fact, with a real check and
  a mutation control (a deliberately broken input that must fail).
- Keep every link, form, `TrackedLink` and its `click` name, and every computed value.
- Gates before a commit: `npx tsc --noEmit`, `npm run lint`, `npx tsx scripts/rules.mts`,
  `npm run build`, then `codex review --uncommitted`. Warning: `codex review --uncommitted`
  temporarily reverts the working tree while it reads the diff. Save `git diff > /tmp/patch`
  first and make no edits until it returns. Never run it while another agent edits the tree.
- One phase, one commit, one deploy (`git push heroku main`, then `git push origin main`).
  Never deploy during a corpus rescan.
- Do not touch `outreach/drafts/` (private, campaign on hold) or `scripts/client-report.mts`
  beyond what a phase names.

## Progress

| Phase | Scope | State |
|---|---|---|
| 1, 2 | `scripts/client-report.mts`, `src/app/d/[id]/report-view.tsx`, shared wording, outreach drafts | shipped v784, commit c3ecc05; ten reports and `/d/sample` republished |
| 3 | `src/app/pricing/page.tsx` | shipped v785, commit 6a3a97a |
| 4 | `src/components/email-gate.tsx`, `src/app/r/[id]/page.tsx` | shipped v786, commit bd8fa5d |
| 5 | Landing, audit index, categories; UI and run reader added at owner request | shipped v790, commit 1bd0ae8; run-reader and responsive UI checks passed |
| 6 | `src/app/methodology/page.tsx`, `src/app/findings/page.tsx`, `src/app/report/page.tsx` | shipped v791, commit fba5a5f; responsive research-page checks passed |
| 7 | `src/app/docs/page.tsx`, `src/app/visibility/page.tsx`, `src/app/d/[id]/page.tsx` | implemented; final validation and deployment in progress |

Measured before: site copy scored 0 to 35 on the surface meter
(`python3 ~/.claude/skills/human-tone/slopscore.py <dir>`), reports 51 to 54. The meter reads
punctuation and layout only; the audit's verdict is about substance, which the meter cannot see.

## Phase 5 brief

Landing (src/app/page.tsx):
- Make three things obvious in the first screen: the scan action (the form stays exactly as it is), what the visitor gets, and who runs this (one line, first person, no purchasing philosophy).
- Evidence cards: keep every number and its source; delete the sentence after each number that explains its commercial significance. A number, a one-line reading, a link.
- Keep the WatchForm, ScanForm and every TrackedLink with its `click` name. Keep `CONTROLLER_IS_NAMED` logic and every computed value (counts from the corpus) as they are.
- The signature paragraph: what I do and where the four audits are, in two sentences.

Audit page (src/app/audit/page.tsx):
- Keep the publication policy as a policy (what is published, when, with whose consent) in plain sentences; delete the defence of interpretation around it.
- Keep the two TrackedLink buttons and the list of published audits untouched.

Category page (src/app/c/[category]/page.tsx):
- Replace the metaphors (rooms, walls, doors) with the literal definitions the methodology uses: named, named first, clears a measured barrier, hits one. "We say so" and similar sentences: delete or state the fact they hedge.
- Keep every computed count, table and link. Where the page distinguishes "named first" from "picked", use only the definition the methodology gives (order of mention); do not claim a purchasing decision.

Guards: `grep -n "src/app/page.tsx\|audit/page\|c/\\[category\\]" scripts/rules.mts` and read each guard that reads these files; keep each literal, or change the guard in the same edit so it still protects the same fact with a real check and a mutation control. Sentences under 25 words, paragraphs under 60 words.

After editing: `npx tsc --noEmit` and `node --import tsx scripts/rules.mts` must pass.

Final message: guards touched, sentences you could not shorten without losing a fact, prose word count before and after per file.

## Phase 6 brief

Apply phase 6 of the audit: `src/app/methodology/page.tsx`, then `src/app/findings/page.tsx`,
then `src/app/report/page.tsx` (the industry report). Read the audit's passage 5 (the 99-word
control-probe sentence), passage 9, the tic table (`rather than` 77 times, most of them here)
and "What not to change" first.

- Methodology: separate current rules from repair history. A rule is stated once, in the present
  tense, with its threshold. History moves to one short "What changed" list with dates, or out.
  Delete every declaration of honesty ("we say so", "worth stating", "on purpose"). Keep every
  guarded literal (the audit lists them under "Exact-literal guards": bytes cap, control probe
  wording, "up to three times", namespace rules, "the check says it could not tell" and the rest).
- Findings: numbers already visible in a table do not need a sentence announcing their
  significance. Turn comparative prose into tables where three or more numbers sit in one
  paragraph. Keep every count, date and the guarded `Read on {RIVALS_CHECKED_ON}` line.
- Industry report: keep scope limits beside the claims they limit; delete the door metaphors;
  keep `left out of every number` and `entry files we look for by name` (guarded).
- Sentences under 25 words, paragraphs under 60. Word count before and after per file.

## Phase 7 brief

Apply phase 7 of the audit: `src/app/docs/page.tsx`, `src/app/visibility/page.tsx`,
`src/app/d/[id]/page.tsx` (the wrapper around a delivered report).

- Docs: instructions, not lessons. Each endpoint: what to call, what comes back, one example.
  Keep the guarded literals (`Only the failing checks become results`, `counted in the run
  properties`, `read on {WEBMCP_READ_ON}`; `result kinds are the same four` must stay absent).
- Visibility: replace measurement abstractions with what the visitor gets and when.
- Delivery wrapper: one line above the report (whose it is, when it was prepared), one line
  below (how to check the counts). Delete the extra reproducibility assurance.
- Leave the scan and watch forms alone unless a term changed elsewhere.

## After phase 7

Re-run `python3 ~/.claude/skills/agent-discoverability/scripts/check.py https://letagentsin.com
--pricing https://letagentsin.com/pricing` and the surface meter on the live pages, and record
both here.

## UI scope added by the owner, 2026-09-07

The owner also requested visual and UX improvements, specifically the text-heavy `/c/<category>/runs` pages.
Phase 5 includes shared navigation, a shorter home page, expandable category rankings, and a run browser.
The run browser filters by tool/date and vendor, opens individual answers, renders Markdown tables and links,
and retains the full original text with matcher-based highlighting. No prompts, answers or counts change.

Phase 5 approximate authored word counts (same TypeScript AST extraction before and after):
landing 761 to 545; audit index 211 to 145; category template 379 to 267.
No exact-literal guards changed. Review found missing study anchors and filtered hash navigation; both were corrected and added to browser checks. Long original prompts and quoted evidence are exempt from sentence limits.
The conditional corpus/formula disclosure keeps its computed fields together; its expanded branch can exceed 25 words.
Validation: build (typecheck and rules), lint, Markdown safety audit, browser interactions at 390/1440 px
in light/dark themes. All 15 original email-category answers matched character for character.
Evidence: `data/ui-rewrite-2026-09-07/` (local, ignored).

## Phase 6 implementation

Current probe rules are separated from repair history. Repeatability measurements and mention-frequency
comparisons are tables. Known limits have short titles and expandable detail. Research headings and
industry-report claims describe observations without inferring customer adoption or completed integrations.
All exact-literal guards remain intact; none changed. Dates, formula fields, denominators, source links,
original quotes and publication permissions remain. Word counts are recorded after final validation.

## Phase 7 implementation

API instructions now separate calls, response fields and examples. Visibility states what the report
contains and explains the queue without promising a completion time. Delivered reports show the question-fit status before the two
measured results and reviewed next steps. The exact question expands in place. Evidence, validation details,
quote collections and individual scan observations expand on demand. The question-fit status and scope
limits remain visible. Print report expands all evidence and restores the reader's choices afterward.
Stored report models, original questions, excerpts, recommendations and source links are unchanged.

Final approximate authored word counts, extracted with the same TypeScript AST method from
`43e4c8f` and the new files. Code examples and class attributes are excluded; shared components,
computed values and stored report prose are not counted. These are source estimates, not live word totals.

| Page source | Before | After |
|---|---:|---:|
| Landing | 761 | 545 |
| Audit index | 211 | 145 |
| Category template | 379 | 267 |
| Methodology | 4639 | 2078 |
| Findings | 3426 | 1791 |
| Industry report | 988 | 553 |
| API docs | 803 | 447 |
| Visibility | 106 | 115 |
| Delivery wrapper | 94 | 67 |

No exact-literal guards changed in phases 5-7. Original prompts and quotations remain verbatim,
including their punctuation and longer sentences. Conditional corpus disclosures retain their computed
fields. Existing stored recommendations and report evidence retain their wording; the reader controls
when to expand them. The additional visibility words explain when results become available.
