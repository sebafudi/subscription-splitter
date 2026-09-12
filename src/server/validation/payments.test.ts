import { describe, expect, it } from 'vitest'
import { createPaymentSchema, patchPaymentSchema } from './payments'

const valid = { member_id: 'm1', date: '2026-01-15', amount: 2000 }

describe('createPaymentSchema', () => {
  it('defaults the note to empty and the kind to manual', () => {
    expect(createPaymentSchema.parse(valid)).toEqual({ ...valid, note: '', kind: 'manual' })
  })

  it('accepts the yearly lump-sum label', () => {
    expect(createPaymentSchema.parse({ ...valid, kind: 'annual' }).kind).toBe('annual')
  })

  it('rejects a kind outside the two the column allows', () => {
    expect(createPaymentSchema.safeParse({ ...valid, kind: 'refund' }).success).toBe(false)
  })

  it('rejects the dates the database GLOB pattern by itself would admit', () => {
    for (const date of ['2026-00-10', '2026-19-10', '2026-02-30', '2026-01-00', '2026-01-39']) {
      expect(createPaymentSchema.safeParse({ ...valid, date }).success, date).toBe(false)
    }
  })

  it('accepts a leap day in a leap year and rejects it in a common year', () => {
    expect(createPaymentSchema.safeParse({ ...valid, date: '2028-02-29' }).success).toBe(true)
    expect(createPaymentSchema.safeParse({ ...valid, date: '2026-02-29' }).success).toBe(false)
  })

  it('rejects a zero, a negative and a fractional amount', () => {
    for (const amount of [0, -1, 100.5]) {
      expect(createPaymentSchema.safeParse({ ...valid, amount }).success, String(amount)).toBe(false)
    }
  })

  it('rejects an amount sent as a string rather than coercing it', () => {
    expect(createPaymentSchema.safeParse({ ...valid, amount: '2000' }).success).toBe(false)
  })

  it('rejects an empty member_id', () => {
    expect(createPaymentSchema.safeParse({ ...valid, member_id: '  ' }).success).toBe(false)
  })

  it('rejects an unknown key rather than dropping it', () => {
    expect(createPaymentSchema.safeParse({ ...valid, subscription_id: 's1' }).success).toBe(false)
  })
})

describe('patchPaymentSchema', () => {
  it('accepts a single field on its own', () => {
    expect(patchPaymentSchema.parse({ amount: 3000 })).toEqual({ amount: 3000 })
  })

  it('applies no default, so an absent field stays absent rather than resetting the stored value', () => {
    expect(patchPaymentSchema.parse({ amount: 3000 })).not.toHaveProperty('note')
    expect(patchPaymentSchema.parse({ amount: 3000 })).not.toHaveProperty('kind')
  })

  it('rejects an empty body', () => {
    expect(patchPaymentSchema.safeParse({}).success).toBe(false)
  })

  it('carries the same date and amount rules as the create schema', () => {
    expect(patchPaymentSchema.safeParse({ date: '2026-02-30' }).success).toBe(false)
    expect(patchPaymentSchema.safeParse({ amount: 0 }).success).toBe(false)
  })

  it('rejects an unknown key', () => {
    expect(patchPaymentSchema.safeParse({ tag: 'manual' }).success).toBe(false)
  })
})
