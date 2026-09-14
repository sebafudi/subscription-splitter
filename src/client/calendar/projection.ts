/**
 * The read-only monthly projection the calendar renders from. Every accounting
 * question is answered by `src/domain`; nothing here restates an exclusion
 * condition, a precedence order or a rounding rule. No React import and no
 * storage access, so the node unit environment reaches all of it.
 *
 * Recorded and assumed money stay in separate fields at every level. No
 * exported field ever carries their sum, which is the one constraint
 * `frame.md` calls load-bearing.
 */

import { shareForMember } from '../../domain/calc'
import { chargedMonthStatus, memberMonthStatus } from '../../domain/month-status'
import { isMonthInSchedule, scheduleMonthStatuses } from '../../domain/recurring'
import type { MonthStatus } from '../../domain/month-status'
import type {
  Member,
  Minor,
  MonthStr,
  Payment,
  PriceEntry,
  RecurringSchedule,
  SubscriptionState,
} from '../../domain/types'
import type { Schedule, Subscription } from '../api'

/** The six collections the subscription detail screen already holds. */
export type LoadedRecords = {
  subscription: Pick<Subscription, 'startMonth' | 'currency' | 'locale' | 'timeZone'>
  members: Member[]
  prices: PriceEntry[]
  breakMonths: MonthStr[]
  payments: Payment[]
  schedules: Schedule[]
}

export type AssumedReceipt = { scheduleId: string; amount: Minor }

export type MonthCell = {
  month: MonthStr
  /**
   * Every manual receipt whose `date.slice(0, 7)` is this month, ids, dates,
   * kinds and notes intact, same-day duplicates kept as separate entries, in
   * the order the repository returned them. A receipt month is a receipt month
   * and never the billing period a payment settles.
   */
  manualReceipts: Payment[]
  /** The counted standing-order receipt for this month, with the schedule id that owns it. */
  assumed: AssumedReceipt | null
  /**
   * The schedule covering this month, whether or not it counted, so the
   * inspector can address it. Narrowed to `RecurringSchedule`: the exception
   * months are dropped because the cell must never re-derive an exception from
   * them. Whether this month is excepted is `assumedStatus.reason`, which is
   * the domain's answer with the exception already applied last.
   */
  schedule: RecurringSchedule | null
  /**
   * `scheduleMonthStatuses`' answer for this month, or `memberMonthStatus` for
   * a month beyond the enumerated window. Null when no schedule covers it.
   */
  assumedStatus: MonthStatus | null
  /** `shareForMember`; zero whenever the month does not charge. */
  charge: Minor
  /**
   * `chargedMonthStatus` verbatim. `reason === 'unpriced'` is the single source
   * of truth for the `?` mark, the inspector's charge sentence and the year
   * cells' months-without-a-price count. There is no separate price-coverage
   * flag: the reason, never the amount, is what all three read.
   */
  chargeStatus: MonthStatus
}

export type PersonYear = {
  memberId: string
  year: number
  /** Exactly twelve, January to December, regardless of locale. */
  cells: MonthCell[]
  /** Sum of manual receipts dated in this year. Never added to `assumed`. */
  recorded: Minor
  /** Sum of counted assumed receipts in this year. Never added to `recorded`. */
  assumed: Minor
  /** Sum of `charge` over the twelve cells. */
  charged: Minor
  /** Cells whose `chargeStatus.reason` is `'unpriced'`. */
  unpricedMonths: number
  /** False when the member has no active range at all. */
  hasActiveRange: boolean
}

/**
 * Assembles the domain's own state shape from the six collections the screen
 * already holds. `Schedule.exceptionMonths` is flattened into
 * `recurringExceptions` and dropped from the schedule itself, so no consumer
 * can re-derive an exception the domain has already applied.
 */
export function buildSubscriptionState(records: LoadedRecords): SubscriptionState {
  return {
    settings: {
      startMonth: records.subscription.startMonth,
      currency: records.subscription.currency,
      locale: records.subscription.locale,
      timeZone: records.subscription.timeZone,
    },
    priceHistory: records.prices,
    breakMonths: records.breakMonths,
    members: records.members,
    recurring: records.schedules.map((schedule) => ({
      id: schedule.id,
      memberId: schedule.memberId,
      amount: schedule.amount,
      startMonth: schedule.startMonth,
      endMonth: schedule.endMonth,
    })),
    recurringExceptions: records.schedules.flatMap((schedule) =>
      schedule.exceptionMonths.map((month) => ({ recurringId: schedule.id, month })),
    ),
    payments: records.payments,
  }
}

type ScheduleView = { schedule: RecurringSchedule; statuses: Map<MonthStr, MonthStatus> }

/**
 * `scheduleMonthStatuses` runs once per schedule per projection rather than
 * once per cell, and the rows are indexed by month for the twelve lookups that
 * follow. The index lives for this call only: there is no module-level cache
 * and no cross-call state.
 */
function scheduleViews(state: SubscriptionState, member: Member, current: MonthStr): ScheduleView[] {
  return state.recurring
    .filter((schedule) => schedule.memberId === member.id)
    .map((schedule) => {
      const exceptionMonths = state.recurringExceptions
        .filter((exception) => exception.recurringId === schedule.id)
        .map((exception) => exception.month)
      const statuses = new Map<MonthStr, MonthStatus>()
      for (const row of scheduleMonthStatuses(state, member, schedule, exceptionMonths, current)) {
        statuses.set(row.month, { counts: row.counts, reason: row.reason })
      }
      return { schedule, statuses }
    })
}

/** The twelve months of `year`, January first, regardless of locale. */
export function monthsOfYear(year: number): MonthStr[] {
  const prefix = String(year).padStart(4, '0')
  return Array.from({ length: 12 }, (_, index) => `${prefix}-${String(index + 1).padStart(2, '0')}`)
}

function yearOf(monthOrDate: string): number {
  return Number(monthOrDate.slice(0, 4))
}

export function projectPersonYear(
  state: SubscriptionState,
  member: Member,
  year: number,
  current: MonthStr,
): PersonYear {
  const views = scheduleViews(state, member, current)
  const memberPayments = state.payments.filter((payment) => payment.memberId === member.id)

  const cells = monthsOfYear(year).map<MonthCell>((month) => {
    const view = views.find((candidate) => isMonthInSchedule(candidate.schedule, month)) ?? null
    const assumedStatus =
      view === null ? null : (view.statuses.get(month) ?? memberMonthStatus(state, member, month, current))

    return {
      month,
      manualReceipts: memberPayments.filter((payment) => payment.date.slice(0, 7) === month),
      assumed:
        view !== null && assumedStatus !== null && assumedStatus.counts
          ? { scheduleId: view.schedule.id, amount: view.schedule.amount }
          : null,
      schedule: view === null ? null : view.schedule,
      assumedStatus,
      charge: shareForMember(state, member, month, current),
      chargeStatus: chargedMonthStatus(state, member, month, current),
    }
  })

  return {
    memberId: member.id,
    year,
    cells,
    recorded: cells.reduce(
      (total, cell) => total + cell.manualReceipts.reduce((sum, payment) => sum + payment.amount, 0),
      0,
    ),
    assumed: cells.reduce((total, cell) => total + (cell.assumed?.amount ?? 0), 0),
    charged: cells.reduce((total, cell) => total + cell.charge, 0),
    unpricedMonths: cells.filter((cell) => cell.chargeStatus.reason === 'unpriced').length,
    hasActiveRange: member.activeRanges.length > 0,
  }
}

export function projectYear(
  state: SubscriptionState,
  members: Member[],
  year: number,
  current: MonthStr,
): PersonYear[] {
  return members.map((member) => projectPersonYear(state, member, year, current))
}

/**
 * The plan's start year through the greater of the current year, the latest
 * payment year and the latest bounded schedule end year. An open-ended schedule
 * contributes the current year, which the current year already covers.
 */
export function calendarYearRange(
  state: SubscriptionState,
  current: MonthStr,
): { first: number; last: number } {
  const first = yearOf(state.settings.startMonth)
  let last = yearOf(current)

  for (const payment of state.payments) {
    last = Math.max(last, yearOf(payment.date))
  }
  for (const schedule of state.recurring) {
    if (schedule.endMonth !== null) last = Math.max(last, yearOf(schedule.endMonth))
  }

  return { first, last: Math.max(first, last) }
}

/**
 * Years strictly after `selectedYear` that hold at least one manual receipt,
 * ascending, with counts. This is how a future-dated receipt stays
 * discoverable from the default year.
 */
export function futureYearPayments(
  state: SubscriptionState,
  selectedYear: number,
): { year: number; count: number }[] {
  const counts = new Map<number, number>()

  for (const payment of state.payments) {
    const year = yearOf(payment.date)
    if (year > selectedYear) counts.set(year, (counts.get(year) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, count]) => ({ year, count }))
}
