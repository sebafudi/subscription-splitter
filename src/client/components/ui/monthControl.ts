/**
 * Every decision the shared month control makes, held outside the JSX so the
 * unit suite can cover it in the `node` environment with no DOM and no new
 * dependency. Months stay plain `YYYY-MM` strings here; no `Date` is built
 * from a field value.
 */

import { enumerateMonths } from '../../../domain/months'
import type { MonthStr } from '../../../domain/types'

const YEARS_BELOW = 10
const YEARS_ABOVE = 1

/**
 * Whether the browser implements a month picker, from two probes on a throwaway
 * input: `type` reads back as `month`, and an invalid value sanitises to the
 * empty string. The element factory is the seam the unit suite uses; the
 * `document` guard covers the default factory alone, so an injected stub still
 * runs both probes where `document` does not exist.
 */
export function supportsMonthInput(createElement?: () => HTMLInputElement): boolean {
  if (!createElement && typeof document === 'undefined') return false
  const element = (createElement ?? (() => document.createElement('input')))()
  element.type = 'month'
  if (element.type !== 'month') return false
  element.value = 'not-a-month'
  return element.value === ''
}

/** Which element the month control renders for a given detection result. */
export function monthControlBranch(supportsPicker: boolean): 'input' | 'select' {
  return supportsPicker ? 'input' : 'select'
}

type OptionRange = {
  /** The field's lower bound, when a server rule gives it one. */
  min?: MonthStr
  /** The field's upper bound, when it has one. */
  max?: MonthStr
  /** The value the field holds now; the range always stretches to include it. */
  value?: MonthStr
  /** From `currentMonth(timeZone)`, the one clock read this codebase permits. */
  currentMonth: MonthStr
}

/**
 * The fallback select's options, ascending and gapless: from `min` or January
 * ten years before the current year, to `max` or December of the year after the
 * current one, widened at either end to keep the held value selectable.
 */
export function monthOptionRange({ min, max, value, currentMonth }: OptionRange): MonthStr[] {
  const year = Number(currentMonth.slice(0, 4))
  let start = min ?? `${yearOf(year - YEARS_BELOW)}-01`
  let end = max ?? `${yearOf(year + YEARS_ABOVE)}-12`

  if (value) {
    if (value < start) start = value
    if (value > end) end = value
  }

  return enumerateMonths(start, end)
}

function yearOf(year: number): string {
  return String(year).padStart(4, '0')
}

/**
 * The locale to label fallback options in. The New subscription form holds a
 * locale the organizer is still typing, so a tag the runtime cannot read falls
 * back to the form's default rather than throwing inside the formatter.
 */
export function usableLocale(locale: string, fallback: string): string {
  try {
    new Intl.DateTimeFormat(locale)
    return locale
  } catch {
    return fallback
  }
}

/**
 * The time zone behind the fallback's default range, under the same rule: a
 * zone `Intl` does not know falls back to the form's default instead of
 * throwing out of `currentMonth`.
 */
export function usableTimeZone(timeZone: string, fallback: string): string {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone })
    return timeZone
  } catch {
    return fallback
  }
}

/**
 * The `min` a field takes from the field it is paired with: the partner's value
 * while that value is a complete month, and nothing while it is still being
 * typed or has been cleared, so clearing the partner releases the bound rather
 * than freezing it.
 */
export function pairedMonthMin(partner: string | null): string | undefined {
  return partner && /^\d{4}-\d{2}$/.test(partner) ? partner : undefined
}
