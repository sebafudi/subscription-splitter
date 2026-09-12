import { describe, expect, it } from 'vitest'
import { createBreakMonthSchema, createPriceSchema, monthValue } from './prices'

describe('createPriceSchema', () => {
  it('accepts a month and a positive integer amount in minor units', () => {
    const result = createPriceSchema.parse({ effective_from: '2026-01', amount: 10000 })
    expect(result).toEqual({ effective_from: '2026-01', amount: 10000 })
  })

  it('rejects a zero and a negative amount, because a month costing nothing is a break month', () => {
    expect(createPriceSchema.safeParse({ effective_from: '2026-01', amount: 0 }).success).toBe(false)
    expect(createPriceSchema.safeParse({ effective_from: '2026-01', amount: -1 }).success).toBe(false)
  })

  it('rejects a fractional amount, since money is whole minor units', () => {
    expect(createPriceSchema.safeParse({ effective_from: '2026-01', amount: 100.5 }).success).toBe(false)
  })

  it('rejects an amount sent as a string rather than coercing it', () => {
    expect(createPriceSchema.safeParse({ effective_from: '2026-01', amount: '10000' }).success).toBe(false)
  })

  it('rejects the months the database GLOB pattern by itself would admit', () => {
    for (const month of ['2026-00', '2026-13', '2026-19']) {
      expect(createPriceSchema.safeParse({ effective_from: month, amount: 100 }).success, month).toBe(false)
    }
  })

  it('rejects an unknown key rather than dropping it', () => {
    expect(createPriceSchema.safeParse({ effective_from: '2026-01', amount: 100, nope: true }).success).toBe(false)
  })
})

describe('createBreakMonthSchema', () => {
  it('accepts a well-formed month', () => {
    expect(createBreakMonthSchema.parse({ month: '2026-02' })).toEqual({ month: '2026-02' })
  })

  it('rejects a malformed month and an unknown key', () => {
    expect(createBreakMonthSchema.safeParse({ month: '2026-13' }).success).toBe(false)
    expect(createBreakMonthSchema.safeParse({ month: '2026-2' }).success).toBe(false)
    expect(createBreakMonthSchema.safeParse({ month: '2026-02', nope: 1 }).success).toBe(false)
  })
})

describe('monthValue, the rule a month in a path parameter passes before it reaches SQL', () => {
  it('accepts every valid month number and rejects the ones outside it', () => {
    for (const month of ['2026-01', '2026-09', '2026-10', '2026-12']) {
      expect(monthValue.safeParse(month).success, month).toBe(true)
    }
    for (const month of ['2026-00', '2026-13', 'not-a-month', '2026-1', '2026-01-01', '']) {
      expect(monthValue.safeParse(month).success, month).toBe(false)
    }
  })
})
