# Outreach drafts: absent in both months (2026-09-03)

**Status: DRAFTS. Nothing here has been sent.** Krystian sends, or nobody does.

Replaces `never-named-2026-08-30.md`, which should not be used. Those drafts rested on one day of
measurement and **three of the ten turned out to be wrong within two weeks**: bird.com,
fireworks.ai and together.ai were all named in the September runs after being absent in August. Had
they gone out, three companies would have received a claim that had already expired. That is the
whole argument for measuring twice before writing to anybody.

## What the claim rests on now

- **Two measurements, sixteen days apart**: 2026-08-17 and 2026-09-02, five usable runs per cell
  per date, so ten per category. One exception recorded in the evidence: `app-hosting` has six
  August runs, making 261 usable runs in total rather than 260.
- **The instrument held**: same question files, same model (`gpt-5.6-sol`), reasoning effort pinned
  to `low` on both sides, `operatorContext: []` in every run on both dates. **One thing did move: the codex CLI
  went from 0.147.0 to 0.152.1.** Every draft says so, because a reader who finds that out for
  themselves stops believing the rest.
- **What it showed**: the same winner in **25 of 26** categories and one real change. The first
  reading of this said 22, with two cells changed and two unreadable, and it was our list that was
  wrong rather than the answers: three categories were being scored against a corpus that did not
  contain the vendor the runs kept picking. Yousign (now Youtrust), OpenSRS, Openprovider and
  Fourthwall were added on 2026-09-03 and all four cells then read cleanly on both dates.
  **69 vendors were named in neither month**, the same 69 as before the fix, because every vendor
  added was one the runs had already named. Fifteen came back after an absent August, three went
  the other way.
- Four runs failed on the OpenAI side with `Selected model is at capacity`, were re-run, and the
  failed attempts are still on disk. No cell was compared at fewer than five usable runs.

## Rules, unchanged from the August drafts

Method in the mail, not in a footnote. Raw runs linked so they can check before replying. No
ranking, no position, no price, no pitch. Never "AI ignores you": they were not named in these
cells, on these two dates, and that is all we know.

---

## 1. zenrows.com - browser and scraping infrastructure

**Subject:** A perfect scan and still not named, twice

Hi,

I measure two things about developer tools: whether an AI coding agent can read and use you, and
whether it names you at all when someone asks it to solve the problem you exist for.

ZenRows is the sharpest split I have on record. **You pass 13 of 13 measurable checks on our scan,
the only perfect score in our corpus.** And across ten runs on two dates, sixteen days apart, you
were not named once. Browserbase was picked every time.

So this is not "an agent could not use you". An agent could use you perfectly and never got to you.

- the runs, both dates: https://letagentsin.com/c/browser-infrastructure/runs
- your scan: https://letagentsin.com/r/zenrows-com-20260824145544-0d82b7fee3aba871

Ten runs of one agent (codex, gpt-5.6-sol) on two dates. The CLI version changed between them,
0.147.0 to 0.152.1, and the answer did not. Does this match what you see in your own signups?

Krystian

---

## 2. firecrawl.dev - browser and scraping infrastructure

**Subject:** Not named in ten runs, and your scan is near the top

Hi,

I ask a coding agent the same buying question several times and keep every answer. This one is about
getting page content out of sites reliably from a Node backend.

Firecrawl was not named in any of ten runs across two dates, sixteen days apart. Browserbase was
picked every time. Your scan is 15 of 17 measurable checks, which is near the top of our corpus, so
the gap is not about being hard to read or integrate.

- the runs, both dates: https://letagentsin.com/c/browser-infrastructure/runs
- your scan: https://letagentsin.com/r/firecrawl-dev-20260824145519-37c973bbc48aeb00

One agent, two dates, ten runs, codex CLI 0.147.0 then 0.152.1. Worth a look?

Krystian

---

## 3. deepl.com - translation and localization

**Subject:** Not named in ten localization runs

Hi,

I asked a coding agent, ten times across two dates, which service it would use to translate a
product's interface and keep the strings in order. Phrase was picked both months.

DeepL was not named once. Your scan is 14 of 15 measurable checks, so an agent can read and use you.

I would guess the question shapes this: it asks for translation *management*, and you may simply sit
in a different box in the model's head. That is a positioning fact rather than a technical one, and
it is the sort of thing worth knowing.

- the runs, both dates: https://letagentsin.com/c/localization/runs
- your scan: https://letagentsin.com/r/deepl-com-20260824150133-4245e4866475aaeb

Ten runs of one agent on two dates. Does it match what you see?

Both dates ran codex with the effort pinned, and the CLI moved between them, 0.147.0 to 0.152.1.

Krystian

---

## 4. loops.so - transactional email

**Subject:** Not named in ten runs, and your scan is fine

Hi,

I asked a coding agent the same question ten times across two dates - a small product sending
receipts and password resets, Node backend, needs good deliverability and logs - and kept every
answer.

Loops was not named once, in either month. Postmark was picked every time.

Your scan is 14 of 17 measurable checks, so an agent can read and use you. It just did not reach you
in this question, twice.

- the runs, both dates: https://letagentsin.com/c/transactional-email/runs
- your scan: https://letagentsin.com/r/loops-so-20260824144446-1e4006e4c39c3798

Two dates sixteen days apart, five runs each, codex CLI 0.147.0 then 0.152.1. I would rather show
you the raw answers than a number I cannot back. Does this match your own signups?

Krystian

---

## 5. hygraph.com - headless CMS

**Subject:** Not named in ten CMS runs

Hi,

I asked a coding agent, ten times across two dates, which headless CMS it would use for a Next.js
marketing site that marketers edit themselves.

Hygraph was not named once. Sanity was picked every time, both months.

Your scan is 11 of 16 measurable checks, so there is something to fix there too, but the absence is
the part I would look at first.

- the runs, both dates: https://letagentsin.com/c/headless-cms/runs
- your scan: https://letagentsin.com/r/hygraph-com-20260824145129-669caa5fa1956bd6

One agent, two dates, ten runs. Does it match what you see?

Both dates ran codex with the effort pinned, and the CLI moved between them, 0.147.0 to 0.152.1.

Krystian

---

## 6. uploadthing.com - file upload and storage

**Subject:** Five of nine upload vendors named in neither month, including you

Hi,

I asked a coding agent the same question ten times across two dates - a helpdesk needing to store
and serve screenshots, Node and React, small traffic - and kept every answer.

Cloudflare R2 was picked in all ten. **Five of the nine upload vendors we track, including
UploadThing, were not named in either month.** The runs reached for object storage and never got to
the upload-focused layer at all; one of them wrote "upload-focused services" as a category and
dismissed it without naming anybody in it.

Your scan is 5 of 10 measurable checks.

- the runs, both dates: https://letagentsin.com/c/file-storage/runs
- your scan: https://letagentsin.com/r/uploadthing-com-20260824144046-708202d5630fb4b6

I think the "dismissed as a category" part is the interesting bit, and it held across both dates.

Both dates ran codex with the effort pinned, and the CLI moved between them, 0.147.0 to 0.152.1.

Krystian

---

## 7. froala.com - rich text editors

**Subject:** Not named in ten editor runs

Hi,

I asked a coding agent, ten times across two dates, which editor it would put in a React app for
support agents writing help articles.

Froala was not named once, either month. Tiptap was picked every time. CKEditor was named but
rejected in every run that weighed it, always on the same point, the licence. That is the objection
your category gets, and it is worth knowing whether an agent would say it about you too, if it got
far enough to say anything.

Your scan is 5 of 8 measurable checks.

- the runs, both dates: https://letagentsin.com/c/rich-text-editors/runs
- your scan: https://letagentsin.com/r/froala-com-20260824151232-97c52d5a1599a802

Ten runs of one agent on two dates. Does this match what you see?

Both dates ran codex with the effort pinned, and the CLI moved between them, 0.147.0 to 0.152.1.

Krystian

---

## 8. june.so - product analytics

**Subject:** Not named in ten runs, and the scan says why it might stay that way

Hi,

I measure two things about developer tools: whether an AI coding agent can read and use you, and
whether it names you at all when someone asks it to solve the problem you exist for.

June came out badly on both, twice. Not named in any of ten runs across two dates - PostHog was
picked every time - and 3 of 15 measurable checks pass on our scan, the lowest in that category.

The scan is the part you can act on this week. It is all plain HTTP checks and each one says which
page it read:

- your scan: https://letagentsin.com/r/june-so-20260824144536-e9c898c7ab5f52be
- the runs, both dates: https://letagentsin.com/c/product-analytics/runs
- how the checks work: https://letagentsin.com/methodology

The naming half is ten runs of one agent on two dates. The scan is deterministic and you can
reproduce it.

Both dates ran codex with the effort pinned, and the CLI moved between them, 0.147.0 to 0.152.1.

Krystian

---

## 9. searchkit.co - search

**Subject:** Not named in ten search runs

Hi,

I asked a coding agent the same question ten times across two dates about adding search to a
product, and kept the answers.

Searchkit was not named in any of them. Algolia was picked every time, both months.

Your scan is 5 of 10 measurable checks, so there is a readable-to-agents problem as well as a
visibility one.

- the runs, both dates: https://letagentsin.com/c/search/runs
- your scan: https://letagentsin.com/r/searchkit-co-20260824144920-54de7e88d57632f7

Happy to send the next round when I repeat it.

Both dates ran codex with the effort pinned, and the CLI moved between them, 0.147.0 to 0.152.1.

Krystian

---

## 10. editorjs.io - rich text editors

**Subject:** Not named in ten editor runs

Hi,

I ask coding agents the same buying question repeatedly and keep the answers. This one is about
putting a real editor into a React app, extendable with custom blocks later.

Editor.js was not named in any of ten runs across two dates. Tiptap was picked every time.

Your scan is 4 of 9 measurable checks, near the bottom of that category though not the bottom, since
ProseMirror is thinner. For an open source project that is mostly about what the docs serve to a
client that does not run JavaScript.

- the runs, both dates: https://letagentsin.com/c/rich-text-editors/runs
- your scan: https://letagentsin.com/r/editorjs-io-20260824144226-f564dcff147ee4b0

Both dates ran codex with the effort pinned, and the CLI moved between them, 0.147.0 to 0.152.1.

Krystian

---

## Before sending any of these

1. **Recipient.** These need a person, not `hello@`. Devrel or product marketing.
2. **The claim about their category matches the linked run page.** Each draft names a winner and a
   count; open the page and confirm.
3. **The three pulled drafts stay pulled.** bird.com, fireworks.ai and together.ai were named in
   September. If we ever write to them it is a different mail, and the honest version of it says we
   watched them appear.
4. **Scan links are frozen scorecards from 2026-08-24 at formula 9.57.** The scan half is older than
   the naming half and the mails do not pretend otherwise.
