/**
 * Money is handled in integer minor units (grosze). Nothing here knows about
 * storage; the calculation is exercised directly by unit tests.
 */

/** Splits a priced month equally between the active members, owner included. */
export function shareForMonth(priceMinor: number, activeCount: number): number {
  if (!Number.isInteger(priceMinor) || priceMinor < 0) {
    throw new RangeError('price must be a non-negative integer amount in minor units')
  }
  if (!Number.isInteger(activeCount) || activeCount < 0) {
    throw new RangeError('active count must be a non-negative integer')
  }
  if (activeCount === 0) return 0
  return Math.round(priceMinor / activeCount)
}

/** Formats a minor-unit amount for display only; never used inside the calculation. */
export function formatMoney(minor: number, locale: string, currency: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(minor / 100)
}
