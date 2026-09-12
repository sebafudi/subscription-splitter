import { describe, expect, it } from 'vitest'
import { formatMoney, shareForMonth } from './money'

describe('shareForMonth', () => {
  it('splits a priced month equally and rounds to the minor unit', () => {
    expect(shareForMonth(10000, 3)).toBe(3333)
  })

  it('treats a priced month with nobody active as a defined state, not an error', () => {
    expect(shareForMonth(10000, 0)).toBe(0)
  })

  /**
   * `AGENTS.md` states the rule as `round(price / activeCount)`. Every other
   * case here happens to land below the half, where rounding and truncation
   * agree, so these two are what hold the shipped code to the stated rule.
   */
  it('rounds a remainder above the half up rather than truncating it', () => {
    // 10000 / 7 is 1428.57: the rule gives 1429, truncation would give 1428,
    // and the difference is six grosze a month across six charged seats.
    expect(shareForMonth(10000, 7)).toBe(1429)
    // 3500 / 3 is 1166.67: 1167 under the rule, 1166 under truncation.
    expect(shareForMonth(3500, 3)).toBe(1167)
  })

  it('rounds an exact half away from zero', () => {
    // 300 / 8 is 37.5 exactly, which is the boundary the rule name turns on.
    expect(shareForMonth(300, 8)).toBe(38)
  })
})

describe('formatMoney', () => {
  it('renders one amount in the subscription locale and currency', () => {
    expect(formatMoney(3333, 'en-US', 'USD')).toBe('$33.33')
  })
})
