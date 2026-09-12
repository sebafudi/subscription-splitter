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

/** What the owner absorbs: the plan cost less every non-owner's rounded share. */
export function ownerResidualForMonth(priceMinor: number, activeCount: number): number {
  const share = shareForMonth(priceMinor, activeCount)
  const nonOwners = Math.max(activeCount - 1, 0)
  return priceMinor - share * nonOwners
}
