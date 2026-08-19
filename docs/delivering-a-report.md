# Delivering a paid report

Written 2026-08-17, the day the price went on the page. It exists because a product with a price
and no written delivery path is a refund waiting to happen, and because the person delivering it
in three months will not remember what the pricing page promised today.

## What the pricing page promises

| Product | Price | What we owe |
|---|---|---|
| One agent report | $49, once | One buying question put to an agent **ten times across two tools**, how many named them, who was picked instead, every transcript |
| Monitoring | $79 a month a domain | The 16 checks rerun weekly with an email only when a verdict moves, plus one cell a month. Packs: three $179, Agency ten $499. Year for the price of ten months. Extra buying question $29 a month |
| Audit and fixes | Four figures | Build runs against a real application, transcripts and artefacts, the argument about what it means |

## Before taking money

0. **A buyer is almost never in the corpus.** The 177 domains we publish are the ones we chose to
   write about; a prospect who finds us is usually not one of them. That is not a refusal any more:
   place them into the category they belong to and the report is read out of the same answers.

   ```bash
   MONGODB_URI=... npx tsx scripts/client-report.mts their.com --category transactional-email
   ```

   Two rules, both enforced by the generator rather than by memory. **Their name is matched only if
   you give it**: without `--brand` we look for the address alone, because guessing "postmark" for
   postmark.com would hand them postmarkapp.com's mentions and "email" for email.com every sentence
   about email. And **a name already belonging to somebody we publish is refused**, not resolved.
   When the runs contain their brand and you did not pass it, the tool says how many answers you
   are leaving uncounted, so the decision is yours and visible. **Since 2026-08-19 the buyer sees it
   too**: the report carries a sentence saying how many answers used their name without naming their
   domain and why we did not count them. A zero that a known ambiguity could overturn has to carry
   the ambiguity with it, so do not be surprised to find that paragraph in what you send.

   The document says in its own words that they were placed into the category after the runs, and
   that every provider's count was recomputed alongside them rather than copied from the published
   table. Do not delete that paragraph: it is what makes the number defensible.

   **For a monitoring customer, store the decision instead of retyping it.** A watch carries its own
   placement since 2026-08-18, so the monthly mail and the paid report read one customer the same
   way and neither needs a flag:

   ```bash
   MONGODB_URI=... npx tsx scripts/assign-watch.mts their.com them@their.com --category transactional-email
   MONGODB_URI=... npx tsx scripts/cell-email.mts their.com   # read what they will receive
   ```

   The placement covers every watch on that domain, because which category a product belongs to is a
   fact about the product rather than about whoever subscribed. `npm run watch-coverage` lists the
   watches still waiting for one.

0b. **Does their address redirect into the corpus?** The generator refuses when it does, and names
   the domain to run instead. `railway.app` answers 301 to `railway.com`, which we publish: the
   agents' mentions are attached to the address they landed on, so a report for the old one would
   have said "named in 0 of 11 runs" about a company that was named in ten of them. Run it for the
   address we publish and tell the buyer why, rather than overriding it.

1. **Is the domain in a category we measure?** `npx tsx -e "import('./src/lib/categories').then(m => console.log(m.categoryFor('their.com')?.label ?? 'BRAK'))"`
   or just run the report generator, which refuses and says so. The page promises we say this
   **before** payment, not after.
2. **Is there a question for that category?** `ls harness/asks/<category>.md`. Every category has
   one today; a new category needs one written before it can be sold.
3. **Is our scan of them current?** `npm run scan their.com` and check the formula version matches
   the one the corpus publishes.

   **A scan run against production only joins the published corpus if it carries the console
   cookie.** `?key=<token>` is not enough: the middleware turns that into a cookie for `/app`, and
   `/api/scan` reads the cookie alone. The response looks identical either way, which is how a
   verification scan silently changes nothing:

   ```bash
   TOKEN=$(heroku config:get STACKPICK_CONSOLE_TOKEN -a stackpick)
   curl -s -X POST https://letagentsin.com/api/scan -H 'content-type: application/json' \
     -H "cookie: stackpick_console=$TOKEN" -d '{"domain":"their.com"}'
   ```

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

Read it before sending, the whole file, as the buyer. Every defect found in this document so far was
found by reading it and none by an audit: quotes cut mid-address, a vendor whose site we could not
read being handed advice about OAuth, "oAuth" in the fix plan. The generator is deliberately blunt:
if no run mentioned them it says so in one sentence, and that sentence is the product. What it must
never do is soften a zero.

Run the delivery guard first, because it replays every sentence both customer documents can print
against the data underneath them, including whether the category has the ten runs on two tools the
price promises:

```bash
MONGODB_URI=$(heroku config:get MONGODB_URI -a stackpick) npm run audit-delivery
```

## What to send

The markdown file, and a link to the category page (`/c/<category>`) and the run viewer
(`/c/<category>/runs`) so they can read every answer themselves rather than take our count on
trust. Say which half of the evidence is contaminated: cells run through `claude` on a machine with
operator instructions describe an agent there, `codex` reads none of them.

## What we cannot do yet

**There is still no payment path other than emailing an invoice by hand**, and at $49 that decides
whether the tier exists at all: nobody fills in an invoice request for a fifty dollar report.

What changed on 2026-08-18 is that the question is no longer open. **Paddle**, as a merchant of
record, and the whole switch-on is written down in `docs/turning-billing-on.md`: the products to
create with their prices, the webhook and the two events we act on, the one variable that turns it
on, and the checkout **that does not exist yet** and blocks everything after it. What is left is a
person's: the legal name and address of the seller, and a Paddle account.

**The monthly half of monitoring has no schedule behind it.** Three crons run on this app - the MCP
registry mirror, the quota check and the watch sweep - and none of them refreshes the agent runs or
sends the monthly mail. The weekly checks are automatic; the five runs a month that `/pricing`
promises a monitoring customer are `scripts/cell-email.mts` printing a draft for a person to read and
send. With four free watches that is a chore. **On the day somebody pays, it is the obligation**, and
whoever turns billing on should decide whether it becomes a cron or stays a calendar reminder with a
name against it. Written here rather than remembered, because a promise kept by memory is the one
that lapses in month three.

Since 2026-08-19 `/pricing` says this to the buyer as well, under *Is the monthly agent run
automatic?*, so the admission is not only in this file. A rule in `scripts/rules.mts` keeps the two
tied together: while this paragraph is here, that sentence has to be on the page, and when the
schedule finally exists the build fails until somebody rewrites both.
