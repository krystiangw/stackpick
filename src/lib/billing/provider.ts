import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Sku } from './catalog'

/**
 * The seam between what we sell and who takes the money.
 *
 * A decision audit on 2026-08-18 picked Paddle as merchant of record, with Polar as the fallback,
 * and the two differ in almost nothing this codebase touches: a hosted checkout, a signed webhook,
 * and an event that says somebody paid. So the choice lives behind this interface rather than in
 * the pages, and the fallback costs a file rather than a rewrite.
 *
 * Nothing here can be finished without an account: the price identifiers and the signing secret
 * come from a dashboard. Everything that does not need one is written and tested now, and the
 * default provider stays `manual`, so production keeps behaving exactly as it does today until
 * somebody sets the variable.
 */
export type PaidEvent = {
  kind: 'paid' | 'subscription-ended'
  /**
   * The prices the provider says were actually bought. Entitlement is resolved from these against
   * our catalogue rather than from anything the buyer's checkout could carry: a signature proves
   * the provider sent the event, not that the person paid for what the event asks us to grant.
   */
  priceIds: string[]
  email: string
  /**
   * The charge, unique per payment. Renewals of one subscription share a subscription id and
   * nothing else, so using that as the payment identity made the second month look like a retry
   * of the first and dropped its work record.
   */
  paymentRef: string
  /** The subscription this belongs to, when it belongs to one. What a cancellation names. */
  subscriptionRef: string | null
  domain: string | null
}

export type BillingProvider = {
  name: string
  /** Where to send a buyer, or null when this provider has no checkout of its own. */
  checkoutFor(sku: Sku, email: string | null, domain: string | null): string | null
  /** True only when the signature really matches, so a forged body cannot grant anything. */
  verify(rawBody: string, signature: string | null): boolean
  /** What the provider is telling us, in our words, or null when it is an event we do not act on. */
  read(rawBody: string): PaidEvent | null
}

/**
 * What the site does today: an email, and a person answering it. Kept as a real implementation
 * rather than a null object, because it is what production runs until an account exists, and
 * because it is the honest fallback if a provider ever refuses us.
 */
export const manual: BillingProvider = {
  name: 'manual',
  checkoutFor: (sku, _email, domain) =>
    `mailto:hello@letagentsin.com?subject=${encodeURIComponent(sku.label)}${domain ? `&body=${encodeURIComponent(`Domain: ${domain}`)}` : ''}`,
  verify: () => false,
  read: () => null,
}

/**
 * Paddle signs `ts:body` with HMAC-SHA256 and sends `ts=...;h1=...`. Two things this must not do:
 * accept a body whose signature merely looks similar, and accept one signed hours ago, because a
 * replay of a `paid` event is a free subscription.
 */
const FIVE_MINUTES_MS = 5 * 60 * 1000

export function paddle(secret: string, now: () => number = Date.now): BillingProvider {
  return {
    name: 'paddle',
    checkoutFor: () => null,
    verify(rawBody, signature) {
      if (!secret || !signature) return false
      const parts = signature.split(';').map((part) => part.split('=') as [string, string])
      const ts = parts.find(([key]) => key === 'ts')?.[1]
      // Every h1, not the last one: while a secret is being rotated the header carries a digest per
      // secret, and keeping only the last would reject a request signed with the one we hold.
      const digests = parts.filter(([key]) => key === 'h1').map(([, value]) => value)
      if (!ts || digests.length === 0) return false
      // A timestamp that is not a number would otherwise pass the window check as NaN comparisons
      // are always false, which is the wrong direction for a security check.
      const at = Number(ts)
      if (!Number.isFinite(at) || Math.abs(now() - at * 1000) > FIVE_MINUTES_MS) return false
      const mine = Buffer.from(createHmac('sha256', secret).update(`${ts}:${rawBody}`).digest('hex'), 'hex')
      return digests.some((digest) => {
        const given = Buffer.from(digest, 'hex')
        return given.length === mine.length && timingSafeEqual(given, mine)
      })
    },
    read(rawBody) {
      try {
        const event = JSON.parse(rawBody) as {
          event_type?: string
          data?: {
            id?: string
            /**
             * A completed transaction carries the subscription it belongs to here, and the id above
             * is the transaction. Storing the transaction as the subscription reference meant a
             * later cancellation, which arrives with the subscription's own id, matched nothing and
             * the monitoring stayed paid forever.
             */
            subscription_id?: string
            /** Ours, set on the checkout we open. Carries who and which domain, never what to grant. */
            custom_data?: { domain?: string; email?: string }
            /**
             * Paddle sends a customer_id here, not an address: reading `customer.email` alone meant
             * every real event was discarded as incomplete. The address travels in custom_data
             * instead, where we put it, and resolving the id through their API would need a key
             * this route deliberately does not have.
             */
            customer?: { email?: string; id?: string }
            items?: { price?: { id?: string } }[]
          }
        }
        const data = event.data
        if (!data) return null
        const email = data.custom_data?.email ?? data.customer?.email
        const paymentRef = data.id
        if (!email || !paymentRef) return null
        const priceIds = (data.items ?? []).flatMap((item) => (item.price?.id ? [item.price.id] : []))
        const domain = data.custom_data?.domain ?? null
        // Only the two that change what somebody is owed. Everything else Paddle sends is
        // bookkeeping, and acting on an event we do not understand is how a cancelled customer
        // keeps their monitoring.
        if (event.event_type === 'transaction.completed') {
          return { kind: 'paid', priceIds, email, paymentRef, subscriptionRef: data.subscription_id ?? null, domain }
        }
        // A cancellation is about the subscription, and its own id is that subscription.
        if (event.event_type === 'subscription.canceled') {
          return { kind: 'subscription-ended', priceIds, email, paymentRef, subscriptionRef: paymentRef, domain }
        }
        return null
      } catch {
        return null
      }
    },
  }
}

/** Chosen by one variable, defaulting to what production does today. */
export function billingProvider(): BillingProvider {
  return process.env.BILLING_PROVIDER === 'paddle' ? paddle(process.env.PADDLE_WEBHOOK_SECRET ?? '') : manual
}
