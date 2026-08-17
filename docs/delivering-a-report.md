# Delivering a paid report

Written 2026-08-17, the day the price went on the page. It exists because a product with a price
and no written delivery path is a refund waiting to happen, and because the person delivering it
in three months will not remember what the pricing page promised today.

## What the pricing page promises

| Product | Price | What we owe |
|---|---|---|
| One agent report | $49, once | One buying question put to an agent **ten times across two tools**, how many named them, who was picked instead, every transcript |
| Monitoring | $79 a month a domain | The 15 checks rerun weekly with an email only when a verdict moves, plus one cell a month. Packs: three $179, Agency ten $499. Year for the price of ten months. Extra buying question $29 a month |
| Audit and fixes | Four figures | Build runs against a real application, transcripts and artefacts, the argument about what it means |

## Before taking money

1. **Is the domain in a category we measure?** `npx tsx -e "import('./src/lib/categories').then(m => console.log(m.categoryFor('their.com')?.label ?? 'BRAK'))"`
   or just run the report generator, which refuses and says so. The page promises we say this
   **before** payment, not after.
2. **Is there a question for that category?** `ls harness/asks/<category>.md`. Every category has
   one today; a new category needs one written before it can be sold.
3. **Is our scan of them current?** `npm run scan their.com` and check the formula version matches
   the one the corpus publishes.

## Producing it

```bash
# the cell, if it is older than a month or the category has none
npm run ask -- <category> claude sonnet 5
LETAGENTSIN_RUNS=$HOME/.letagentsin-runs-codex npm run ask -- <category> codex 5

# freeze both tools into the file the site and the report read
LETAGENTSIN_RUNS_ALL=$HOME/.letagentsin-runs-codex npx tsx scripts/export-cells.mts

# the report itself
MONGODB_URI=$(heroku config:get MONGODB_URI -a stackpick) npx tsx scripts/client-report.mts their.com --out their.md
```

Read it before sending. The generator is deliberately blunt: if no run mentioned them it says so in
one sentence, and that sentence is the product. What it must never do is soften a zero.

## What to send

The markdown file, and a link to the category page (`/c/<category>`) and the run viewer
(`/c/<category>/runs`) so they can read every answer themselves rather than take our count on
trust. Say which half of the evidence is contaminated: cells run through `claude` on a machine with
operator instructions describe an agent there, `codex` reads none of them.

## What we cannot do yet

**There is no payment path other than emailing an invoice by hand.** Stripe against Paddle is
undecided and it is the single blocker between the pricing page and revenue. At $49 it decides
whether the tier exists at all: nobody fills in an invoice request for a fifty dollar report.
