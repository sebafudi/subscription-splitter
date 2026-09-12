import type { SubscriptionState } from '../../domain/types'
import { list as listBreakMonths } from './break-months'
import { list as listMembers } from './members'
import { list as listPayments } from './payments'
import { list as listPrices } from './prices'
import { get as getSubscription } from './subscriptions'

/**
 * The exact value the domain module reads, assembled in one place so the
 * summary route does no assembly of its own. Null when the subscription is
 * missing or foreign; every read below carries the same ownership predicate,
 * so a partial answer is not reachable.
 *
 * Recurring schedules and their exceptions are still empty here: S-03 phase 3
 * adds those two reads and changes nothing else, because the domain is already
 * written against the full shape.
 */
export async function loadState(
  db: D1Database,
  subscriptionId: string,
  userId: string,
): Promise<SubscriptionState | null> {
  const subscription = await getSubscription(db, subscriptionId, userId)
  if (!subscription) return null

  const [members, priceHistory, breakMonths, payments] = await Promise.all([
    listMembers(db, subscriptionId, userId),
    listPrices(db, subscriptionId, userId),
    listBreakMonths(db, subscriptionId, userId),
    listPayments(db, subscriptionId, userId),
  ])

  return {
    settings: {
      startMonth: subscription.startMonth,
      currency: subscription.currency,
      locale: subscription.locale,
      timeZone: subscription.timeZone,
    },
    priceHistory,
    breakMonths,
    members,
    recurring: [],
    recurringExceptions: [],
    payments,
  }
}
