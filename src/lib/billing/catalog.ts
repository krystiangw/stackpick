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
 * Whether monitoring is currently given away while it is being built, which is what /pricing
 * promises in so many words: "Free while we are building it, and we will ask before it ever costs
 * anything." It decides one thing here, and it is not a detail: a cancelled subscription stops the
 * charge, and only when the service is no longer free does it also stop the service.
 *
 * The day this turns false, the sentence on /pricing has to change in the same commit.
 */
export const MONITORING_IS_FREE = true

/**
 * The audit is deliberately absent from this catalog. It is scoped in a conversation and invoiced
 * by hand, and both merchant-of-record providers we considered exclude services with a person in
 * the middle from what they will process.
 */
export const SOLD_BY_CONVERSATION = 'audit'
