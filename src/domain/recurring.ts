import { memberMonthStatus } from './month-status'
import { enumerateMonths } from './months'
import type { MemberMonthInputs, MonthExclusion } from './month-status'
import type { Member, MonthStr, RecurringSchedule } from './types'

/** A proposed arrangement, which on the create path has no identifier yet because the repository generates it. */
export type ScheduleCandidate = {
  id: string | null
  memberId: string
  startMonth: MonthStr
  endMonth: MonthStr | null
}

type MonthRange = { startMonth: MonthStr; endMonth: MonthStr | null }

/** One elapsed month of an arrangement: whether it counted and, when it did not, the condition that failed. */
export type ScheduleMonthStatus = { month: MonthStr; counts: boolean; reason: MonthExclusion | null }

/** True when `month` falls inside the arrangement. Both ends are inclusive and a null end is unbounded. */
export function isMonthInSchedule(schedule: RecurringSchedule, month: MonthStr): boolean {
  return schedule.startMonth <= month && (schedule.endMonth === null || month <= schedule.endMonth)
}

/**
 * The first stored arrangement for the same member whose months intersect the
 * candidate's, or `null`. Two arrangements that touch, one starting in the
 * month the other ended, are an overlap rather than a continuation, for the
 * same reason `validateActiveRanges` gives: the month is the unit of account
 * and an arrangement cannot stop and restart inside one.
 *
 * A stored row carrying the candidate's own id is skipped, so an edit does not
 * collide with itself. A null id belongs to no stored row, which is the create
 * path: the repository generates the identifier, so `POST` has none to pass.
 */
export function findScheduleOverlap(
  existing: RecurringSchedule[],
  candidate: ScheduleCandidate,
): RecurringSchedule | null {
  const found = existing.find(
    (schedule) =>
      schedule.memberId === candidate.memberId && schedule.id !== candidate.id && rangesIntersect(schedule, candidate),
  )
  return found ?? null
}

function rangesIntersect(a: MonthRange, b: MonthRange): boolean {
  const aEndsFirst = a.endMonth !== null && a.endMonth < b.startMonth
  const bEndsFirst = b.endMonth !== null && b.endMonth < a.startMonth
  return !aEndsFirst && !bEndsFirst
}

/**
 * One row per elapsed month of an arrangement, ascending, each saying whether
 * the month counted and which condition excluded it. This is the single answer
 * to which months of a standing order were received: `recurringReceived` sums
 * over it and the standing-order section labels from it, so the screen and the
 * server cannot disagree (decision D-008).
 *
 * It is built over `memberMonthStatus` rather than beside it (decision D-009).
 * The row set applies the arrangement's own conditions, its start month and the
 * earlier of its end month and `current`; each row is then `memberMonthStatus`;
 * and the exception, the one condition that module does not own, is applied
 * last, so a month already excluded is never re-labelled.
 *
 * Three `MonthExclusion` values cannot reach a row here: `not-yet-elapsed`
 * because the row set stops at `current`, `before-start-month` because a
 * schedule's start month is refused below the subscription's first month, and
 * `owner-member` because a schedule naming the owner is refused at both write
 * paths. What a row can carry is `break-month`, `outside-active-range` or
 * `excepted`, which are the three the screen renders in words.
 */
export function scheduleMonthStatuses(
  inputs: MemberMonthInputs,
  member: Member,
  schedule: RecurringSchedule,
  exceptionMonths: MonthStr[],
  current: MonthStr,
): ScheduleMonthStatus[] {
  const last = schedule.endMonth !== null && schedule.endMonth < current ? schedule.endMonth : current

  return enumerateMonths(schedule.startMonth, last).map((month) => {
    const status = memberMonthStatus(inputs, member, month, current)
    if (!status.counts) return { month, counts: false, reason: status.reason }
    if (exceptionMonths.includes(month)) return { month, counts: false, reason: 'excepted' }
    return { month, counts: true, reason: null }
  })
}
