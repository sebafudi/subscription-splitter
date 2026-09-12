import { describe, expect, it } from 'vitest'
import { formatMoney, shareForMonth } from './money'

describe('shareForMonth', () => {
  it('splits a priced month equally and rounds to the minor unit', () => {
    expect(shareForMonth(10000, 3)).toBe(3333)
  })

  it('treats a priced month with nobody active as a defined state, not an error', () => {
    expect(shareForMonth(10000, 0)).toBe(0)
  })
})

describe('formatMoney', () => {
  it('renders one amount in the subscription locale and currency', () => {
    expect(formatMoney(3333, 'en-US', 'USD')).toBe('$33.33')
  })
})
