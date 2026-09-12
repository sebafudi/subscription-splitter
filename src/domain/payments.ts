import { isCalendarDate, monthOf } from './months'
import type { MonthStr } from './types'

/**
 * Returns the first violation as a message naming the field at fault, or
 * `null` when the date is allowed. The rule needs the subscription's first
 * month, so it runs after the schema rather than inside it, the same way
 * `validateActiveRanges` does.
 *
 * There is no upper bound: a future-dated payment is valid and counts as
 * credit now (FR-018), and the message set says so by having nothing to say
 * about it.
 */
export function validatePaymentDate(date: string, startMonth: MonthStr): string | null {
  if (!isCalendarDate(date)) {
    return 'date must be a real calendar date in YYYY-MM-DD form'
  }
  if (monthOf(date) < startMonth) {
    return 'date must not precede the subscription start month'
  }
  return null
}
