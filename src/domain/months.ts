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

/**
 * True only for a real day in a real month. Both the database `GLOB` and a
 * plain regular expression admit `2025-02-30`, so the check reconstructs the
 * date and compares its parts back. `setUTCFullYear` on the epoch is used
 * rather than parsing, so the answer does not depend on how an engine reads an
 * ISO string, and midnight UTC keeps a day from shifting under a zone.
 */
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  if (month < 1 || month > 12 || day < 1) return false
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

/** The month a `YYYY-MM-DD` date falls in. A slice rather than a parse: the format is fixed and zero-padded. */
export function monthOf(date: string): MonthStr {
  return date.slice(0, 7)
}
