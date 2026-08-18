/**
 * What is for sale, with the price stated once.
 *
 * The pricing page carried every figure as a literal in its own JSX and in its meta description,
 * and the same numbers appear in the delivery runbook, in the report and in the terms. A price
 * written in five places is four places to forget, and the first thing a payment provider does is
 * compare the amount on the page with the amount it is asked to charge.
 */
export type Interval = 'once' | 'month' | 'year'

export type Sku = {
  id: string
  label: string
  /** Cents, because that is what every provider takes and what avoids a float in a total. */
  cents: number
  currency: 'USD'
  interval: Interval
  /** How many domains the price covers, so a pack does not need its own arithmetic elsewhere. */
  domains: number
  /**
   * The provider's own identifier, set per environment. Empty until somebody creates the product
   * in the provider dashboard, which is the one step no code here can do.
   */
  providerPriceId: string
}

const priceId = (name: string) => process.env[`BILLING_PRICE_${name}`] ?? ''

export const CATALOG: readonly Sku[] = [
  { id: 'report-one', label: 'One agent report', cents: 4_900, currency: 'USD', interval: 'once', domains: 1, providerPriceId: priceId('REPORT_ONE') },
  { id: 'watch-monthly', label: 'Monitoring, one domain', cents: 7_900, currency: 'USD', interval: 'month', domains: 1, providerPriceId: priceId('WATCH_MONTHLY') },
  // Ten months for twelve, which is the sentence on the pricing page rather than a discount
  // invented here: 79 * 10 = 790.
  { id: 'watch-annual', label: 'Monitoring, one domain, a year', cents: 79_000, currency: 'USD', interval: 'year', domains: 1, providerPriceId: priceId('WATCH_ANNUAL') },
  { id: 'watch-pack-3', label: 'Monitoring, three domains', cents: 17_900, currency: 'USD', interval: 'month', domains: 3, providerPriceId: priceId('WATCH_PACK_3') },
  { id: 'watch-agency', label: 'Monitoring, ten domains', cents: 49_900, currency: 'USD', interval: 'month', domains: 10, providerPriceId: priceId('WATCH_AGENCY') },
  { id: 'extra-question', label: 'Another buying question', cents: 2_900, currency: 'USD', interval: 'month', domains: 1, providerPriceId: priceId('EXTRA_QUESTION') },
]

export const skuById = (id: string): Sku | null => CATALOG.find((sku) => sku.id === id) ?? null

/**
 * What was bought, decided by the price the provider says was charged. The buyer's own checkout
 * data is not evidence of what they paid for, so entitlement is resolved here or not at all.
 */
export const skusForPrices = (priceIds: readonly string[]): Sku[] =>
  CATALOG.filter((sku) => sku.providerPriceId !== '' && priceIds.includes(sku.providerPriceId))

/**
 * The charged prices we do not recognise. A transaction can carry a configured price and an
 * unconfigured one together, and asking only "did anything match" loses the second: somebody
 * created a product in the dashboard and forgot its variable, and the charge for it would be
 * acknowledged with no trace of what it was for.
 */
export const unmatchedPrices = (priceIds: readonly string[]): string[] => {
  const known = new Set(CATALOG.filter((sku) => sku.providerPriceId !== '').map((sku) => sku.providerPriceId))
  return priceIds.filter((id) => !known.has(id))
}

/**
 * Whether this is the recurring product that turns a watch paid. Asked rather than assumed: the
 * extra buying question is also a monthly charge and grants nothing on its own.
 */
export const isMonitoring = (sku: Sku): boolean => sku.id.startsWith('watch-')

/** Whole dollars where the price is whole, cents only where they exist. Used on the page and in mail. */
export function priceOf(sku: Sku): string {
  const dollars = sku.cents / 100
  return `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)}`
}

/**
 * The day the giveaway ends, or null while there is no date.
 *
 * Written as a condition rather than remembered, because "free today" with nothing that ends it is
 * not a decision, it is a state nobody has to revisit. The date is deliberately absent: it belongs
 * to whoever owns the business and it cannot be set from a rule. What is here is the mechanism, so
 * that setting it later is one line rather than an argument about what free meant.
 *
 * Two promises constrain what may be written here. `/pricing` says the price is printed so the
 * reader knows what it will become, and the home page says we will ask before it ever costs
 * anything. So a date arriving without a message to everyone already subscribed would break the
 * second one, and `docs/turning-billing-on.md` carries that step.
 *
 * WHAT THIS DATE DOES NOT DO, because a half-built mechanism described as a whole one is worse than
 * none: the monitoring cron serves every confirmed, unstopped watch and reads neither this date nor
 * `plan`. Setting it changes only what a cancellation does. Ending the giveaway for the watches that
 * already exist is a decision about people who subscribed from a page that never showed a price, so
 * the code for it is deliberately not written ahead of that decision. `docs/turning-billing-on.md`
 * names it as work, not as a switch.
 */
export const FREE_MONITORING_ENDS_ON: string | null = null

/**
 * Whether monitoring is currently given away while it is being built, which is what /pricing
 * promises in so many words: "Free while we are building it, and we will ask before it ever costs
 * anything." It decides one thing here, and it is not a detail: a cancelled subscription stops the
 * charge, and only when the service is no longer free does it also stop the service.
 *
 * The day this turns false, the sentence on /pricing has to change in the same commit.
 *
 * A function rather than a constant, because a constant is read once when the module loads and a
 * dyno stays up for days: a date set on Monday would keep answering "free" until the next deploy,
 * which is the same class of mistake as a number computed once and quoted for ever.
 */
export function monitoringIsFree(now = new Date(), endsOn = FREE_MONITORING_ENDS_ON): boolean {
  return endsOn === null || now < new Date(endsOn)
}

/**
 * The audit is deliberately absent from this catalog. It is scoped in a conversation and invoiced
 * by hand, and both merchant-of-record providers we considered exclude services with a person in
 * the middle from what they will process.
 */
export const SOLD_BY_CONVERSATION = 'audit'
