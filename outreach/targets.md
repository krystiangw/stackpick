# Target list, generated from the corpus

Built 2026-08-08 from `/corpus.json` at formula 4.0, 103 domains in 15 categories.
Regenerate by rerunning the grouping described at the bottom; do not hand-edit the table.

**28 of 103 have a hook specific enough to open with.** The rest scored well enough or
uninterestingly enough that there is no honest first sentence, and those are not worth an email.

The four hook types, in the order they are worth sending:

## 1. The door is shut (3)

The strongest finding we have, because it ends the funnel before anything else matters and it is
one line for them to check.

| Domain | Score | Category |
|---|---|---|
| froala.com | 3/8 | Embeddable rich text editors |
| vonage.com | 4/10 | SMS, voice and messaging |
| bitmovin.com | 8/12 | Video hosting and streaming |

Say: your edge answered 403 to a plain request from a data centre. An agent integrating you runs
in a data centre. Everything else we measured is a floor, not a score.

## 2. The documentation needs JavaScript (11)

upstash.com · prosemirror.net · bugsnag.com · bunny.net · filestack.com · imagekit.io ·
chargebee.com · june.so · algolia.com · mailgun.com · resend.com

Two are worth leading with because the number is absurd: **chargebee.com serves 14 characters**
and **filestack.com serves 41** to a plain fetch of their documentation. resend.com is on this
list at 1,778 characters while scoring 14/16 overall, which makes it the friendliest possible
first email: one specific gap on an otherwise excellent result.

## 3. Below their category median while a named competitor is above (5)

| Domain | Score | Category median | Leader |
|---|---|---|---|
| defer.run | 1/4 | 57% | inngest.com 10/15 |
| highlight.io | 5/14 | 56% | honeybadger.io 10/13 |
| raygun.com | 6/15 | 56% | honeybadger.io 10/13 |
| directus.io | 6/14 | 58% | hygraph.com 12/16 |
| searchkit.co | 4/13 | 50% | typesense.org 7/13 |

Hardest to send well. Naming the competitor is the whole force of it and also the thing that can
read as a taunt, so it belongs in the second paragraph, never the subject line.

## 4. Cheap fix, real delta (9)

editorjs.io · lexical.dev · quilljs.com · betterstack.com · configcat.com · uploadthing.com ·
lemonsqueezy.com · plausible.io · api.video

No llms.txt and none of the nine agent entry paths answer. Both are afternoons of work, which
makes this the easiest yes and the weakest finding: it is also what every other scanner in the
category reports, so it is not a reason to choose us. Send these last, or fold them into a
category letter rather than one at a time.

## What the list deliberately leaves out

- Anyone whose only finding is "you score below average". Not specific enough to be worth reading.
- Rows flagged `rateLimited` in the corpus, which are thinner than the site deserves.
- The four vendors we have already published full agent audits about. Those get a different email.

## How it was built

Group the corpus by category, take the median share per category, then for each domain pick the
first hook that applies in this order: door refused, documentation needs JavaScript, more than
twelve points of share below the category median while a named leader sits above, then llms.txt
and entry paths both absent. First match wins so nobody appears twice, and a vendor with no match
gets no email.
