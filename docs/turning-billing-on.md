# Turning billing on

**Decision, 2026-09-08:** monitoring is a free beta with no announced end date or future price.
The old monthly, annual, agency and extra-question prices are withdrawn. Do not create or
activate those products from this historical runbook. A paid monitoring launch requires a new
scope, cadence, price and subscriber-consent decision. Billing stays off. The first two
integration pilots are $1500 each, agreed and invoiced separately after seller/payment readiness.

Everything on our side is written and switched off. With `BILLING_PROVIDER` unset, `/api/billing/webhook`
answers 404 exactly as it did before the code existed, so nothing here is live until somebody does
the steps below in order.

Written 2026-08-18, when the only way to buy was `mailto:`.

## Before you start: what only a person can decide

- **Who sells.** The legal entity on the invoice, its address and tax status. Paddle is a merchant
  of record and asks for this before it will process anything, and `src/lib/seller.ts` refuses to
  render `/terms`, `/privacy` and `/refunds` until `SELLER_IS_COMPLETE` is true. Those three pages
  currently 404 on purpose, and a checkout without them is not something to open.
- **The refund policy.** `src/lib/seller.ts` proposes 14 days on the report and no refund of the
  current monitoring month. It is a proposal until you say so.
- **Whether the report credits against monitoring.** `/pricing` used to promise "Credited against
  your first month of monitoring" and nothing implemented it. It was removed on 20 August 2026,
  because it was a promise without a *value* rather than merely without a mechanism: monitoring is
  free while we build it (`FREE_MONITORING_ENDS_ON`), so the page offered 49 dollars off nothing
  while saying so two lines apart. `scripts/rules.mts` now refuses to build if that sentence
  returns while monitoring is free, or without a credit procedure written here.

  If you want the credit back, decide the shape first, because each of these changes what somebody
  has to do by hand: the full 49 or part of it; `watch-monthly` only, or also the annual 790 and the
  packs at 179 and 499; one domain or the whole pack; and whether it expires (90 days from the
  report is the obvious candidate). Then write the procedure in this file and restore the sentence
  in the same commit. Do it by hand for the first sales - a coupon issued manually costs less than
  a field in the subscription until there are more cases than one person can remember.

  When you have written it, start the procedure with the literal marker `CREDIT PROCEDURE:` on its
  own line. The build guard looks for that marker and nothing else, because this explanation uses
  the word "credit" throughout and a guard that matched the word would be satisfied by the very
  paragraph saying the policy is undecided.

  Open question that comes first: **when does free monitoring end**. Until that date exists the
  credit has no base, and the question of a mechanism is moot.

## 1. Historical billing mappings — not authorization to activate

The table records the disabled integration in `src/lib/billing/catalog.ts`. Only the one-off
report remains a public offer from this table. Monitoring rows are historical, never-sold
proposals retained for mapping tests, not current prices or instructions to create products.
Before any paid launch, reconcile the approved offer, catalogue and this runbook.

| Catalogue id | What it is | Amount | Interval | Env var |
|---|---|---|---|---|
| `report-one` | One agent report | $49 | one-off | `BILLING_PRICE_REPORT_ONE` |
| `watch-monthly` | Monitoring, one domain | $79 | month | `BILLING_PRICE_WATCH_MONTHLY` |
| `watch-annual` | Monitoring, one domain, a year | $790 | year | `BILLING_PRICE_WATCH_ANNUAL` |
| `watch-pack-3` | Monitoring, three domains | $179 | month | `BILLING_PRICE_WATCH_PACK_3` |
| `watch-agency` | Monitoring, ten domains | $499 | month | `BILLING_PRICE_WATCH_AGENCY` |
| `extra-question` | Another buying question | $29 | month | `BILLING_PRICE_EXTRA_QUESTION` |

A price with no id set is a price nothing can be bought at: `skusForPrices` ignores every catalogue
row whose `providerPriceId` is empty, so a half-configured environment refuses payments rather than
guessing what they bought. That is deliberate, and it means you can switch products on one at a time.

The audit is not in this table and must not be added to it. It is scoped in a conversation and
invoiced by hand, and both merchant-of-record providers we looked at exclude services with a person
in the middle.

## 2. Point Paddle at the webhook

- **URL:** `https://letagentsin.com/api/billing/webhook`
- **Events to send:** `transaction.completed` and `subscription.canceled`. Those are the only two
  the route acts on; anything else is acknowledged with a 200 and ignored, so subscribing to more
  costs nothing but tells you less about what we do.
- **Secret:** copy the signing secret into `PADDLE_WEBHOOK_SECRET`.

The signature is checked as HMAC-SHA256 over `ts:body` with a five minute window, and several `h1`
values in one header are accepted so a secret rotation does not drop live events.

## 3. Build the checkout, which does not exist yet

**This is the step that blocks everything below it.** Nothing in the site opens a Paddle checkout
today: the pricing CTAs are `mailto:` links, `paddle().checkoutFor` returns `null`, and no code
calls it. Setting `BILLING_PROVIDER=paddle` without this makes the webhook process events and
changes nothing a customer can do, so the only thing it buys you is the ability to send test events.

What it needs, and none of it can be written before the account exists because every piece needs an
id or a token from it:

- Paddle's client-side token and its script on the pricing page.
- `paddle().checkoutFor` returning a checkout for the SKU, opened with the price id from the
  catalogue and with `customData` carrying the buyer's email and domain.
- The three `mailto:` CTAs on `/pricing` pointing at that checkout instead, for the report and the
  monitoring plans. The pilot CTA stays an email: the introductory price is public, but scope and availability must be agreed.
- Somewhere to land after payment that says what happens next, because a report is delivered by
  hand and a buyer who sees nothing assumes it failed.

Until then the honest state of the page is what it already says: ask by email, a person answers.

## 4. Carry the buyer's details in `custom_data`

The checkout from step 3 must set `custom_data.email` and `custom_data.domain`.

This is not a nicety. Paddle sends a `customer_id` rather than an address, so without
`custom_data.email` every real event is discarded as incomplete, and without `custom_data.domain`
the payment is recorded as unassignable and nobody is granted anything until a person fixes it.

What `custom_data` must **not** carry is what the payment buys. Entitlement is resolved from the
price ids Paddle says were charged, never from data a buyer can influence.

## 5. Switch it on

```
heroku config:set BILLING_PROVIDER=paddle PADDLE_WEBHOOK_SECRET=... -a stackpick
heroku config:set BILLING_PRICE_REPORT_ONE=pri_... -a stackpick
```

Setting `BILLING_PROVIDER` is the whole switch. Unset it and the webhook answers 404 again, which is
the rollback: no code change, no deploy.

## 5b. The people who subscribed before there was a price

The home page says, in these words, that we will ask before monitoring ever costs anything, and the
form that captured every current subscriber never showed a figure. So the day billing starts is the
day that promise is either kept or broken, and it cannot be kept by remembering it.

Two things belong in the same change as `BILLING_PROVIDER`:

1. **Set `FREE_MONITORING_ENDS_ON` in `src/lib/billing/catalog.ts`, and write the code that reads
   it.** The date is one line and `monitoringIsFree()` reads it live, but today it changes only what
   a cancellation does: the monitoring cron serves every confirmed, unstopped watch and looks at
   neither the date nor `plan`. Deciding what happens to a trial watch after the date - served,
   paused with a notice, or asked to pay - is a decision about people who subscribed from a page
   that never showed a price, so the code is deliberately not written ahead of it.
2. **Write to everyone already subscribed before that date passes**, and say what changes and when.
   `npx tsx -e "..."` over `listWatchesDue` prints them; there were four on 2026-08-19, all trial.
   Whatever they are offered - a frozen price, a free period, a plain notice - it is cheap: another
   watch in a category we already run costs one HTTP sweep a week and one email a month.

The cost of getting this wrong is not the four addresses. It is that the sentence on the home page
is one of the few promises on this site that a reader can check against their own inbox.

## 6. Check it actually works, in this order

1. `curl -s -o /dev/null -w '%{http_code}' -X POST https://letagentsin.com/api/billing/webhook` -
   expect **400** now that billing is on. It was 404 before, and 400 means the route is live and
   refused an unsigned body.
2. Send Paddle's test event for `transaction.completed`. Expect 200 with `{"ok":true,"acted":...}`.
3. Look for the work record rather than trusting the response: a `Lead` row with
   `paymentRef` of `<transaction id>:<catalogue id>`. Every payment we can attribute writes one,
   including the ones that grant nothing (`paid-unassigned-*`, `paid-unmatched-*`,
   `paid-after-cancel-*`, `paid-unknown-price`), because an acknowledged event the provider will not
   resend must not exist only in a dyno's log.
4. Send one deliberately broken event: `transaction.completed` with no `custom_data.email`. Expect
   **422**, not 200. There is nobody to write a record about, so the payment is refused and shows in
   your dashboard as a failing delivery, which is the only durable trace available for it. If you
   ever see that in production, the checkout has stopped sending `custom_data` and every purchase is
   bouncing.
5. Buy one report yourself, with a real card, and read what arrives. `docs/delivering-a-report.md`
   is the delivery side.

## What stays manual on purpose

- **Monitoring is free while it is being built** (`MONITORING_IS_FREE` in the catalogue), so a
  cancelled subscription stops the charge and not the service. The day that flag turns false, the
  sentence on `/pricing` has to change in the same commit.
- **A pack covers several domains and the checkout names one.** The rest are written down as
  `paid-<sku>-unassigned-<n>` and assigned by a person until there is a screen for it.
- **An address that paid before confirming the watch is still not mailed.** The payment stands and
  `paid-awaiting-confirmation-*` is recorded so somebody asks.
