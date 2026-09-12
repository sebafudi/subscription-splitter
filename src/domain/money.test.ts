import { describe, expect, it } from 'vitest'
import { ownerResidualForMonth, shareForMonth } from './money'

describe('shareForMonth', () => {
  it('splits a priced month equally and rounds to the minor unit', () => {
    expect(shareForMonth(10000, 3)).toBe(3333)
  })

  it('leaves the owner absorbing the residual so the month balances exactly', () => {
    const price = 10000
    const activeCount = 3
    const owed = shareForMonth(price, activeCount) * (activeCount - 1)
    expect(owed + ownerResidualForMonth(price, activeCount)).toBe(price)
  })

  it('treats a priced month with nobody active as a defined state, not an error', () => {
    expect(shareForMonth(10000, 0)).toBe(0)
    expect(ownerResidualForMonth(10000, 0)).toBe(10000)
  })
})
