import { enumerateMonths } from './months'
import type { Minor, MonthStr, SubscriptionState } from './types'

/**
 * The price for `month`. A break month short-circuits to zero without
 * consulting the price history at all; otherwise the latest entry whose
 * `effectiveFrom` is at or before the month wins, or zero when no entry
 * applies yet.
 */
export function priceForMonth(state: SubscriptionState, month: MonthStr): Minor {
  if (state.breakMonths.includes(month)) return 0

  let price = 0
  for (const entry of [...state.priceHistory].sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : 1))) {
    if (entry.effectiveFrom <= month) {
      price = entry.amount
    } else {
      break
    }
  }
  return price
}

/**
 * Every month that currently has a price and would stop having one if `entryId`
 * were deleted, which is exactly what the caller has to be told before the
 * delete goes through. Enumerated from the plan's first month to the later of
 * the last price entry and `current`, since months after the last entry lose
 * their price too when the entry that covered them is the one being removed.
 * Empty when the delete changes no month's price, which is the case for every
 * entry except the earliest.
 */
export function monthsLosingTheirPrice(
  state: SubscriptionState,
  entryId: string,
  current: MonthStr,
): MonthStr[] {
  const without = { ...state, priceHistory: state.priceHistory.filter((entry) => entry.id !== entryId) }

  return affectedRange(state, current).filter(
    (month) => priceForMonth(state, month) > 0 && priceForMonth(without, month) === 0,
  )
}

/** The plan's first month through the later of its last price entry and the current month. */
function affectedRange(state: SubscriptionState, current: MonthStr): MonthStr[] {
  const lastEntry = state.priceHistory.reduce<MonthStr | null>(
    (latest, entry) => (latest === null || entry.effectiveFrom > latest ? entry.effectiveFrom : latest),
    null,
  )
  if (lastEntry === null) return []
  return enumerateMonths(state.settings.startMonth, lastEntry > current ? lastEntry : current)
}
