import { rangeCovers } from './members'
import { priceForMonth } from './prices'
import type { Member, MonthStr, SubscriptionState } from './types'

/** Why a month does not count for a member. One name per condition, so a caller can branch or render. */
export type MonthExclusion =
  | 'before-start-month'
  | 'not-yet-elapsed'
  | 'owner-member'
  | 'outside-active-range'
  | 'break-month'
  | 'unpriced'

export type MonthStatus = { counts: boolean; reason: MonthExclusion | null }

const COUNTS: MonthStatus = { counts: true, reason: null }

function excluded(reason: MonthExclusion): MonthStatus {
  return { counts: false, reason }
}

/**
 * Whether `month` is one this member is part of the plan for, and when it is
 * not, the condition that failed. Checked from the widest condition to the
 * narrowest, so a caller that shows the reason names the outermost thing that
 * is wrong: inside the subscription's window, elapsed at `current`, not the
 * owner, covered by one of the member's ranges, not a break month.
 *
 * `current` is an explicit argument rather than a property of whatever month
 * list a caller happens to pass, because the not-yet-elapsed boundary is a
 * failure mode in its own right and is tied to the subscription's time zone.
 *
 * The price is deliberately not one of these conditions. A month with no price
 * entry yet charges nobody, but it still counts as received against a standing
 * order, whose conditions do not include one (decision D-007). The share a
 * member owes asks the further question; see `chargedMonthStatus`.
 */
export function memberMonthStatus(
  state: SubscriptionState,
  member: Member,
  month: MonthStr,
  current: MonthStr,
): MonthStatus {
  if (month < state.settings.startMonth) return excluded('before-start-month')
  if (month > current) return excluded('not-yet-elapsed')
  if (member.isOwner) return excluded('owner-member')
  if (!rangeCovers(member, month)) return excluded('outside-active-range')
  if (state.breakMonths.includes(month)) return excluded('break-month')
  return COUNTS
}

/**
 * Whether `month` charges this member a share: everything `memberMonthStatus`
 * asks, and an effective-dated price on top. This is the one expression the
 * share, the summary's totals and the screen all resolve through, so the
 * months a member owes for cannot disagree with the months a total counts.
 */
export function chargedMonthStatus(
  state: SubscriptionState,
  member: Member,
  month: MonthStr,
  current: MonthStr,
): MonthStatus {
  const status = memberMonthStatus(state, member, month, current)
  if (!status.counts) return status
  if (priceForMonth(state, month) === 0) return excluded('unpriced')
  return COUNTS
}
