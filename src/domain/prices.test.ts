import { describe, expect, it } from 'vitest'
import { monthsLosingTheirPrice, priceForMonth } from './prices'
import type { PriceEntry, SubscriptionState } from './types'

function state(over: Partial<SubscriptionState> = {}): SubscriptionState {
  return {
    settings: { startMonth: '2026-01', currency: 'PLN', locale: 'pl-PL', timeZone: 'Europe/Warsaw' },
    priceHistory: [{ id: 'p1', effectiveFrom: '2026-01', amount: 10000 }],
    breakMonths: [],
    members: [],
    recurring: [],
    recurringExceptions: [],
    payments: [],
    ...over,
  }
}

describe('priceForMonth', () => {
  it('uses the latest entry at or before the month, across a change', () => {
    const priceHistory: PriceEntry[] = [
      { id: 'p1', effectiveFrom: '2026-01', amount: 10000 },
      { id: 'p2', effectiveFrom: '2026-03', amount: 12000 },
    ]
    const s = state({ priceHistory })
    expect(priceForMonth(s, '2026-02')).toBe(10000)
    expect(priceForMonth(s, '2026-03')).toBe(12000)
  })

  it('is zero before the first entry', () => {
    const s = state({ priceHistory: [{ id: 'p1', effectiveFrom: '2026-05', amount: 10000 }] })
    expect(priceForMonth(s, '2026-02')).toBe(0)
  })

  it('a break month is zero, and the price entry still applies to the month after it', () => {
    const s = state({ breakMonths: ['2026-02'] })
    expect(priceForMonth(s, '2026-02')).toBe(0)
    expect(priceForMonth(s, '2026-03')).toBe(10000)
  })
})

describe('monthsLosingTheirPrice', () => {
  const CURRENT = '2026-06'

  it('names every month between the plan start and the next entry when the earliest entry goes', () => {
    const s = state({
      priceHistory: [
        { id: 'p1', effectiveFrom: '2026-01', amount: 10000 },
        { id: 'p2', effectiveFrom: '2026-04', amount: 12000 },
      ],
    })
    expect(monthsLosingTheirPrice(s, 'p1', CURRENT)).toEqual(['2026-01', '2026-02', '2026-03'])
  })

  it('is empty for a later entry, whose removal leaves the earlier price covering those months', () => {
    const s = state({
      priceHistory: [
        { id: 'p1', effectiveFrom: '2026-01', amount: 10000 },
        { id: 'p2', effectiveFrom: '2026-04', amount: 12000 },
      ],
    })
    expect(monthsLosingTheirPrice(s, 'p2', CURRENT)).toEqual([])
  })

  it('names every month through the current one when the only entry goes', () => {
    const s = state({ priceHistory: [{ id: 'p1', effectiveFrom: '2026-01', amount: 10000 }] })
    expect(monthsLosingTheirPrice(s, 'p1', CURRENT)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
    ])
  })

  it('names only the months the entry actually priced, not the ones before it', () => {
    const s = state({ priceHistory: [{ id: 'p1', effectiveFrom: '2026-03', amount: 10000 }] })
    expect(monthsLosingTheirPrice(s, 'p1', CURRENT)).toEqual(['2026-03', '2026-04', '2026-05', '2026-06'])
  })

  it('skips a break month, which already costs nothing and loses nothing', () => {
    const s = state({
      breakMonths: ['2026-02'],
      priceHistory: [
        { id: 'p1', effectiveFrom: '2026-01', amount: 10000 },
        { id: 'p2', effectiveFrom: '2026-04', amount: 12000 },
      ],
    })
    expect(monthsLosingTheirPrice(s, 'p1', CURRENT)).toEqual(['2026-01', '2026-03'])
  })
})
