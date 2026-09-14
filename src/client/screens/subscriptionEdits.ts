/**
 * Every decision the subscription header makes that does not need a browser,
 * held outside the JSX so the unit suite covers it in the `node` environment.
 * Months stay plain `YYYY-MM` strings; no `Date` is built from a field value.
 */

import { currentMonth } from '../../domain/months'
import type { PatchSubscriptionInput, Subscription } from '../api'

const YEARS_BELOW = 10

/**
 * The floor the server applies in both directions of the first month: January
 * ten years before the current year in the subscription's own time zone. The
 * year comes from `currentMonth`, the one clock read this codebase permits.
 */
export function firstMonthFloor(timeZone: string): string {
  const year = Number(currentMonth(timeZone).slice(0, 4)) - YEARS_BELOW
  return `${String(year).padStart(4, '0')}-01`
}

/** What the edit panel holds, in the client's own casing. */
export type SubscriptionValues = {
  name: string
  currency: string
  locale: string
  timeZone: string
  startMonth: string
}

export function storedValues(subscription: Subscription): SubscriptionValues {
  return {
    name: subscription.name,
    currency: subscription.currency,
    locale: subscription.locale,
    timeZone: subscription.timeZone,
    startMonth: subscription.startMonth,
  }
}

/**
 * The body of the PATCH: only the settings whose value differs from the stored
 * one. Null when nothing differs, which closes the panel as a cancel would
 * rather than sending a body the route refuses and reporting a save that never
 * happened.
 */
export function subscriptionChanges(
  subscription: Subscription,
  values: SubscriptionValues,
): PatchSubscriptionInput | null {
  const stored = storedValues(subscription)
  const changes: PatchSubscriptionInput = {}
  if (values.name !== stored.name) changes.name = values.name
  if (values.currency !== stored.currency) changes.currency = values.currency
  if (values.locale !== stored.locale) changes.locale = values.locale
  if (values.timeZone !== stored.timeZone) changes.time_zone = values.timeZone
  if (values.startMonth !== stored.startMonth) changes.start_month = values.startMonth
  return Object.keys(changes).length === 0 ? null : changes
}

/** The four states of the detail screen, as the header reads them. */
export type DetailStatus = 'loading' | 'ready' | 'error' | 'no-owner'

export type HeaderActions = { edit: boolean; remove: boolean }

/**
 * Which header verbs are live in each state. Deletion needs only the id, so it
 * is the one useful action on a subscription the product cannot show; the edit
 * panel's currency lock needs lists that state does not have.
 */
export function headerActions(status: DetailStatus): HeaderActions {
  switch (status) {
    case 'ready':
      return { edit: true, remove: true }
    case 'no-owner':
      return { edit: false, remove: true }
    default:
      return { edit: false, remove: false }
  }
}

/**
 * Currency can change only while the subscription carries no amount at all,
 * because every amount is stored in minor units with no per-row currency: a
 * change would relabel history rather than convert it.
 */
export function currencyLocked(lists: {
  prices: readonly unknown[]
  payments: readonly unknown[]
  schedules: readonly unknown[]
}): boolean {
  return lists.prices.length > 0 || lists.payments.length > 0 || lists.schedules.length > 0
}

/** The lock sentence names the currency every amount is already stored in. */
export function currencyLockHint(currency: string): string {
  return `Locked while prices, payments or standing orders are recorded. Every amount is stored in ${currency}.`
}

/**
 * What a failed load should do with the screen. A first load has nothing to
 * keep, so its failure replaces the screen with the error and its "Try again".
 * A refresh after a successful load does have something to keep: a write may
 * already have landed, so the records that are on screen stay there and the
 * failure is an alert beside them rather than an empty page that blames the
 * save (`design-spec.md` §9). Nothing is ever drawn optimistically either way:
 * what stays is the last set the server actually returned.
 */
export type LoadFailure =
  | { kind: 'signed-out' }
  | { kind: 'no-owner'; message: string }
  | { kind: 'replace'; message: string }
  | { kind: 'keep'; message: string }

export function loadFailure(
  error: { signedOut: boolean; status: number | null; message: string | null },
  hasRecords: boolean,
  connectionFailure: string,
): LoadFailure {
  if (error.signedOut) return { kind: 'signed-out' }

  const message = error.message ?? connectionFailure
  if (error.status === 409) return { kind: 'no-owner', message }
  return hasRecords ? { kind: 'keep', message } : { kind: 'replace', message }
}
