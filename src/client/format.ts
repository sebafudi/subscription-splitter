/**
 * Display formatting for months and dates. Presentation only: every value the
 * client sends stays `YYYY-MM` or `YYYY-MM-DD`. Neither function touches an
 * amount, which only `formatMoney` produces.
 *
 * The parts are read as UTC and formatted in UTC, so a month never slides into
 * its neighbour in a runtime whose local zone sits behind Greenwich.
 */

/** `2026-09` to `Sep 2026`, in the subscription's locale. */
export function formatMonth(month: string, locale: string): string {
  const [year, monthIndex] = month.split('-').map(Number)
  if (!year || !monthIndex) return month
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, monthIndex - 1, 1)),
  )
}

/** `2026-08-03` to `3 Aug 2026`, in the subscription's locale. */
export function formatDate(date: string, locale: string): string {
  const [year, monthIndex, day] = date.split('-').map(Number)
  if (!year || !monthIndex || !day) return date
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, monthIndex - 1, day)))
}
