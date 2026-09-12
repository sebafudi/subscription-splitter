import type { ActiveRange, Member, MonthStr, SubscriptionState } from './types'

/** True when any of the member's ranges covers `month`; both ends are inclusive. */
export function rangeCovers(member: Member, month: MonthStr): boolean {
  return member.activeRanges.some((range) => range.joinedMonth <= month && (range.leftMonth === null || month <= range.leftMonth))
}

/**
 * Every member occupying a seat in `month`, owner included, ignoring
 * `archived` entirely: archiving is a presentation flag, and a member's
 * liability is decided by their ranges alone, never by whether they are
 * archived.
 */
export function activeMembersInMonth(state: SubscriptionState, month: MonthStr): Member[] {
  return state.members.filter((member) => rangeCovers(member, month))
}

/** The active members excluding the owner, so the count the owner's share depends on is named once. */
export function chargedMembersInMonth(state: SubscriptionState, month: MonthStr): Member[] {
  return activeMembersInMonth(state, month).filter((member) => !member.isOwner)
}

/**
 * Returns the first violation as a message naming the field at fault, or
 * `null` when the set is valid. Two ranges that touch in the same month
 * count as an overlap rather than a merge, because the month is the unit of
 * account and a member cannot leave and rejoin inside one.
 */
export function validateActiveRanges(ranges: ActiveRange[], startMonth: MonthStr): string | null {
  if (ranges.length === 0) {
    return 'active_ranges must not be empty'
  }

  for (const range of ranges) {
    if (range.leftMonth !== null && range.leftMonth < range.joinedMonth) {
      return 'active_ranges: left_month must not precede joined_month'
    }
    if (range.joinedMonth < startMonth) {
      return 'active_ranges: joined_month must not precede the subscription start month'
    }
  }

  const sorted = [...ranges].sort((a, b) => (a.joinedMonth < b.joinedMonth ? -1 : a.joinedMonth > b.joinedMonth ? 1 : 0))

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const current = sorted[i]
    const next = sorted[i + 1]
    if (current.leftMonth === null) {
      return 'active_ranges: an open-ended range must not be followed by another range'
    }
    if (next.joinedMonth <= current.leftMonth) {
      return 'active_ranges: ranges must not overlap'
    }
  }

  return null
}
