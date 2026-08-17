import { NextResponse } from 'next/server'
import { billingProvider } from '@/lib/billing/provider'
import { MONITORING_IS_FREE, isMonitoring, skusForPrices, type Sku } from '@/lib/billing/catalog'
import { getStore, type Store } from '@/lib/store'

export const dynamic = 'force-dynamic'

/**
 * What the payment provider tells us, turned into what somebody is owed.
 *
 * Off until a variable says otherwise: with `BILLING_PROVIDER` unset this answers 404, exactly as
 * it did before this file existed, so shipping it changes nothing on production until an account
 * exists and the secret is set. Everything here that does not need an account - the signature, the
 * window, the event reading, granting and revoking - is written and guarded now.
 *
 * Two rules run through all of it. Entitlement follows the price that was charged, never the
 * checkout data a buyer can influence. And a payment that cannot be applied is recorded anyway:
 * the provider does not retry an acknowledged event, so anything we merely logged would exist only
 * in a dyno's output.
 */
export async function POST(request: Request) {
  const provider = billingProvider()
  if (provider.name === 'manual') return NextResponse.json({ error: 'billing is not enabled' }, { status: 404 })

  const raw = await request.text()
  // Read from the request rather than trusted: a body that fails this is not logged with its
  // contents either, because an unverified payload is somebody else's text.
  if (!provider.verify(raw, request.headers.get('paddle-signature'))) {
    return NextResponse.json({ error: 'signature' }, { status: 400 })
  }

  const event = provider.read(raw)
  // A 200 on an event we do not act on: the provider retries anything else, and retrying a
  // bookkeeping event forever is noise on both sides.
  if (!event) return NextResponse.json({ ok: true, acted: false })

  const store = getStore()

  // Revoking comes first and asks nothing of the catalogue. A cancellation already names the
  // subscription, and prices get replaced: resolving it through the current price list meant a
  // repricing left every earlier subscriber paid forever, because their old price no longer
  // matched anything and the event was acknowledged without touching a watch.
  if (event.kind === 'subscription-ended') {
    // The marker is written FIRST, before any watch is touched. Delivery is not ordered and the two
    // requests can overlap: with the marker written afterwards, a payment could pass both of its
    // checks, the cancellation could revoke, and the payment could then write the watch back to
    // paid with nothing left to catch it. Written first, the payment's second check always sees it.
    await store.saveLead({
      email: event.email,
      domain: event.domain ?? '',
      reportId: event.subscriptionRef ?? event.paymentRef,
      paymentRef: `${event.subscriptionRef}:canceled`,
      createdAt: new Date().toISOString(),
      source: 'subscription-canceled',
    })
    const ending = (await store.listWatchesForEmail(event.email)).filter(
      (watch) => watch.subscriptionId === event.subscriptionRef,
    )
    for (const watch of ending) {
      watch.plan = 'trial'
      watch.subscriptionId = null
      // The plan alone revokes nothing: the cron serves every confirmed, unstopped watch and does
      // not read it. That is deliberate while monitoring is free, because a cancelled subscriber
      // keeps exactly what a stranger gets. It stops being deliberate the moment it costs money,
      // so the rule lives next to the price rather than in this branch.
      if (!MONITORING_IS_FREE) watch.stoppedAt = new Date().toISOString()
      await store.saveWatch(watch)
    }
    if (ending.length === 0) console.error(`billing: cancellation of ${event.subscriptionRef} matched no watch`)
    return NextResponse.json({ ok: true, acted: ending.length > 0 })
  }

  // Every line of the transaction, not the first one that matches. Monitoring and the extra buying
  // question are bought together and charged together, and collapsing them to one entitlement is
  // how somebody pays for two things and receives one.
  const bought = skusForPrices(event.priceIds)
  if (bought.length === 0) {
    console.error(`billing: no catalogue price matches ${event.priceIds.join(', ') || 'nothing'} on ${event.paymentRef}`)
    return NextResponse.json({ ok: true, acted: false })
  }

  let acted = false
  for (const sku of bought) {
    acted = (await apply(store, sku, event)) || acted
  }
  return NextResponse.json({ ok: true, acted })
}

/** One line of one transaction, applied. Returns whether anything changed for the customer. */
async function apply(
  store: Store,
  sku: Sku,
  event: { email: string; paymentRef: string; subscriptionRef: string | null; domain: string | null },
): Promise<boolean> {
  // Per charge and per line: a monthly renewal is a new payment and needs its own work record, and
  // two lines of one transaction must not collide on the unique index that makes retries harmless.
  const record = async (source: string, part = '') => {
    await store.saveLead({
      email: event.email,
      domain: event.domain ?? '',
      reportId: event.paymentRef,
      paymentRef: `${event.paymentRef}:${sku.id}${part}`,
      createdAt: new Date().toISOString(),
      source,
    })
  }

  // A delivery we have already applied changes nothing, and this has to be asked before any watch
  // is touched rather than discovered when the record collides: a retry of last month's payment
  // would otherwise clear stoppedAt and resume monitoring somebody has since stopped.
  if (await store.hasPaymentRef(`${event.paymentRef}:${sku.id}`)) {
    return false
  }

  // Money that arrives without a domain still leaves a durable trace, whatever it bought:
  // unassignable is something a person fixes, lost is not.
  if (!event.domain) {
    await record(`paid-unassigned-${sku.id}`)
    console.error(`billing: ${sku.id} paid by ${event.email} with no domain named, recorded for assignment`)
    return false
  }

  // Anything that is not monitoring is recorded for a person rather than granted. The extra buying
  // question costs $29 a month and used to fall through into paid monitoring, which is a plan
  // nobody bought: what a payment buys has to be named, not inferred from what it is not.
  if (!isMonitoring(sku)) {
    await record(`paid-${sku.id}`)
    return true
  }

  // A payment for a subscription we have already been told is over: out of order, and granting on
  // it would undo the cancellation with nothing left to revoke it again.
  if (event.subscriptionRef && (await store.hasPaymentRef(`${event.subscriptionRef}:canceled`))) {
    await record(`paid-after-cancel-${sku.id}`)
    console.error(`billing: payment on cancelled subscription ${event.subscriptionRef}, recorded and not granted`)
    return false
  }

  const watches = (await store.listWatchesForEmail(event.email)).filter((watch) => watch.domain === event.domain)
  if (watches.length === 0) {
    // Paid for monitoring on a domain nobody is watching yet. Nothing to grant, and inventing a
    // watch here would mail somebody who never confirmed the address.
    await record(`paid-unmatched-${sku.id}`)
    console.error(`billing: payment for ${event.email} with no watch on ${event.domain}`)
    return false
  }
  for (const watch of watches) {
    watch.plan = 'paid'
    // Paying is an unambiguous request to resume, so a watch somebody stopped comes back. Without
    // this the charge succeeds and the scheduler keeps skipping them, because a stopped watch is
    // not due and nothing else would ever clear that.
    watch.stoppedAt = null
    // The subscription, because that is what a cancellation will name. A one-off monitoring
    // payment with no subscription behind it keeps the charge as its own reference.
    watch.subscriptionId = event.subscriptionRef ?? event.paymentRef
    await store.saveWatch(watch)
  }
  // The marker is read again after the write, because the two requests can overlap: a cancellation
  // that lands between the check above and the save would otherwise leave the plan paid with
  // nothing left to revoke it. This is a narrow window rather than a transaction, and the day money
  // actually moves this belongs in a payments ledger with the provider's own event ordering.
  if (event.subscriptionRef && (await store.hasPaymentRef(`${event.subscriptionRef}:canceled`))) {
    for (const watch of watches) {
      watch.plan = 'trial'
      watch.subscriptionId = null
      // The same rule as the cancellation branch, and for the same reason: the grant above cleared
      // stoppedAt, so rolling back the plan without rolling back that would leave a cancelled
      // watch running the day monitoring stops being free.
      if (!MONITORING_IS_FREE) watch.stoppedAt = new Date().toISOString()
      await store.saveWatch(watch)
    }
    await record(`paid-after-cancel-${sku.id}`)
    console.error(`billing: cancellation of ${event.subscriptionRef} overlapped a payment, plan left stopped`)
    return false
  }
  // Every successful charge leaves a record, renewals included. Without it the second month of a
  // subscription is invisible to anything but the provider's own dashboard.
  await record(`paid-${sku.id}`)
  // An address that never confirmed is still not mailed: that rule is older than this file and it
  // is the reason the confirmation link exists. The payment stands, and the outstanding
  // confirmation is written down so somebody asks rather than the customer waiting in silence.
  const unconfirmed = watches.filter((watch) => watch.confirmedAt === null)
  if (unconfirmed.length > 0) {
    await record(`paid-awaiting-confirmation-${sku.id}`, ':unconfirmed')
    console.error(`billing: ${event.email} paid for ${event.domain} before confirming the address`)
  }
  // A pack pays for several domains and the checkout names one. The rest are assigned by a person
  // until there is a screen for it, so they are written down rather than logged: a log is not a
  // work queue, and the entitlement somebody paid for must not depend on anybody reading one.
  if (sku.domains > 1) {
    await record(`paid-${sku.id}-unassigned-${sku.domains - 1}`, ':unassigned')
    console.error(
      `billing: ${sku.id} covers ${sku.domains} domains, ${event.domain} granted, ${sku.domains - 1} still to assign for ${event.email}`,
    )
  }
  return true
}
