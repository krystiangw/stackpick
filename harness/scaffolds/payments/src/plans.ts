/** The two plans to sell. Prices are in minor units, as the Go service expects them. */
export const PLANS = [
  { id: 'standard', name: 'Standard support', amount: 4900, currency: 'USD', interval: 'month' },
  { id: 'priority', name: 'Priority support', amount: 14900, currency: 'USD', interval: 'month' },
] as const

/** What the Go service needs after a purchase. It will not talk to a payment provider itself. */
export type Entitlement = { customerId: string; planId: (typeof PLANS)[number]['id'] }
