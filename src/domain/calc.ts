import { enumerateMonths } from './months'
import { shareForMonth } from './money'
import { activeMembersInMonth, chargedMembersInMonth, rangeCovers } from './members'
import { chargedMonthStatus, memberMonthStatus } from './month-status'
import { priceForMonth } from './prices'
import type { Member, MemberSummary, Minor, MonthStr, Summary, SubscriptionState } from './types'

/**
 * The rounded share of `month`'s price across everyone active that month,
 * owner included. Zero when the price is zero or when nobody is active
 * (decision D-006): the month still costs what it costs, and the owner
 * absorbs all of it.
 */
export function perPersonShare(state: SubscriptionState, month: MonthStr): Minor {
  const price = priceForMonth(state, month)
  if (price === 0) return 0
  const activeCount = activeMembersInMonth(state, month).length
  if (activeCount === 0) return 0
  return shareForMonth(price, activeCount)
}

/** Zero unless the month charges this member; `chargedMonthStatus` is the one place that decides. */
export function shareForMember(
  state: SubscriptionState,
  member: Member,
  month: MonthStr,
  current: MonthStr,
): Minor {
  if (!chargedMonthStatus(state, member, month, current).counts) return 0
  return perPersonShare(state, month)
}

/**
 * Sums a member's standing-order receipts across `months`. `current` is an
 * explicit argument rather than a property of the caller's month list, so
 * the not-yet-elapsed boundary holds for any caller.
 */
export function recurringReceived(
  state: SubscriptionState,
  member: Member,
  months: MonthStr[],
  current: MonthStr,
): Minor {
  let total = 0
  const schedules = state.recurring.filter((schedule) => schedule.memberId === member.id)

  for (const schedule of schedules) {
    for (const month of months) {
      if (month < schedule.startMonth) continue
      if (schedule.endMonth !== null && month > schedule.endMonth) continue
      if (!memberMonthStatus(state, member, month, current).counts) continue
      const excepted = state.recurringExceptions.some(
        (exception) => exception.recurringId === schedule.id && exception.month === month,
      )
      if (excepted) continue
      total += schedule.amount
    }
  }

  return total
}

/** `owed` is the sum of `shareForMember` over `months`; `paid` is recorded payments plus recurring receipts. */
export function balanceForMember(
  state: SubscriptionState,
  member: Member,
  months: MonthStr[],
  current: MonthStr,
): { owed: Minor; paid: Minor; balance: Minor } {
  const owed = months.reduce((total, month) => total + shareForMember(state, member, month, current), 0)
  const manual = state.payments
    .filter((payment) => payment.memberId === member.id)
    .reduce((total, payment) => total + payment.amount, 0)
  const paid = manual + recurringReceived(state, member, months, current)
  return { owed, paid, balance: paid - owed }
}

/**
 * Every number the product shows, derived from which months each member was
 * active and what the plan cost in each month. Enumerates from the
 * subscription's start month to `current` inclusive, so nothing after the
 * current month is enumerated, owed for, or counted as received.
 */
export function computeSummary(state: SubscriptionState, current: MonthStr): Summary {
  const months = enumerateMonths(state.settings.startMonth, current)
  const nonOwnerMembers = state.members.filter((member) => !member.isOwner)

  const memberResults = nonOwnerMembers.map((member) => {
    const { owed, paid, balance } = balanceForMember(state, member, months, current)
    const summary: MemberSummary = {
      memberId: member.id,
      name: member.name,
      archived: member.archived,
      activeThisMonth: rangeCovers(member, current),
      currentShare: shareForMember(state, member, current, current),
      owed,
      paid,
      balance,
    }
    return summary
  })

  memberResults.sort((a, b) => a.balance - b.balance)

  const currentMonthly = priceForMonth(state, current)
  const currentActiveCount = activeMembersInMonth(state, current).length
  const currentPerPersonShare = perPersonShare(state, current)

  const chargedThisMonth = chargedMembersInMonth(state, current)
  const expectedThisMonth = chargedThisMonth.reduce(
    (total, member) => total + shareForMember(state, member, current, current),
    0,
  )
  const ownerShareThisMonth = currentMonthly - expectedThisMonth

  const owedToYouNow = memberResults.filter((m) => m.balance < 0).reduce((total, m) => total - m.balance, 0)
  const creditOutstanding = memberResults.filter((m) => m.balance > 0).reduce((total, m) => total + m.balance, 0)

  const totalPlanCost = months.reduce((total, month) => total + priceForMonth(state, month), 0)
  const totalCollected = memberResults.reduce((total, m) => total + m.paid, 0)

  const manualCollectedThisMonth = state.payments
    .filter((payment) => payment.date.slice(0, 7) === current)
    .reduce((total, payment) => total + payment.amount, 0)
  const recurringCollectedThisMonth = nonOwnerMembers.reduce(
    (total, member) => total + recurringReceived(state, member, [current], current),
    0,
  )
  const collectedThisMonth = manualCollectedThisMonth + recurringCollectedThisMonth

  return {
    currentMonth: current,
    currency: state.settings.currency,
    locale: state.settings.locale,
    currentMonthly,
    currentActiveCount,
    currentPerPersonShare,
    ownerShareThisMonth,
    owedToYouNow,
    creditOutstanding,
    expectedThisMonth,
    collectedThisMonth,
    totalPlanCost,
    totalCollected,
    ownerNetCost: totalPlanCost - totalCollected,
    members: memberResults,
  }
}
