import type { MonthStr } from './types'

/**
 * Month strings compare chronologically as plain strings because the format
 * is zero-padded `YYYY-MM`; nothing here parses one into a `Date`.
 */

/** Adds `delta` whole months to `month`, by integer arithmetic over `year * 12 + (month - 1)`. */
export function addMonth(month: MonthStr, delta: number): MonthStr {
  const [year, monthNumber] = month.split('-').map(Number)
  const total = year * 12 + (monthNumber - 1) + delta
  const nextYear = Math.floor(total / 12)
  const nextMonth = (total % 12) + 1
  return `${String(nextYear).padStart(4, '0')}-${String(nextMonth).padStart(2, '0')}`
}

/** Every month from `start` to `end`, inclusive of both ends; empty when `end` precedes `start`. */
export function enumerateMonths(start: MonthStr, end: MonthStr): MonthStr[] {
  if (end < start) return []
  const months: MonthStr[] = []
  let month = start
  while (month <= end) {
    months.push(month)
    month = addMonth(month, 1)
  }
  return months
}

/**
 * The calendar month in `timeZone` at `now`. `AGENTS.md` forbids deriving the
 * month from server-local date parts; this is the one function allowed to
 * ask what time it is, and `now` defaults to the current instant so a test
 * can pin it.
 */
export function currentMonth(timeZone: string, now: Date = new Date()): MonthStr {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' }).formatToParts(now)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  if (!year || !month) {
    throw new RangeError(`could not derive a month from Intl for time zone ${timeZone}`)
  }
  return `${year}-${month}`
}
