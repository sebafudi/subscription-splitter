import { describe, expect, it } from 'vitest'
import { createScheduleSchema, patchScheduleSchema } from './recurring'

const valid = { member_id: 'm1', amount: 1000, start_month: '2026-01' }

describe('createScheduleSchema', () => {
  it('defaults an absent end month to null, which is the open-ended arrangement', () => {
    expect(createScheduleSchema.parse(valid)).toEqual({ ...valid, end_month: null })
  })

  it('accepts an end month at or after the start month', () => {
    expect(createScheduleSchema.safeParse({ ...valid, end_month: '2026-01' }).success).toBe(true)
    expect(createScheduleSchema.safeParse({ ...valid, end_month: '2026-06' }).success).toBe(true)
  })

  it('rejects an end month before the start month, naming the end month', () => {
    const result = createScheduleSchema.safeParse({ ...valid, end_month: '2025-12' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['end_month'])
  })

  it('rejects the months the database GLOB pattern by itself would admit', () => {
    for (const month of ['2026-00', '2026-13', '2026-19']) {
      expect(createScheduleSchema.safeParse({ ...valid, start_month: month }).success, month).toBe(false)
      expect(createScheduleSchema.safeParse({ ...valid, end_month: month }).success, month).toBe(false)
    }
  })

  it('rejects a zero, a negative and a fractional amount', () => {
    for (const amount of [0, -1, 100.5]) {
      expect(createScheduleSchema.safeParse({ ...valid, amount }).success, String(amount)).toBe(false)
    }
  })

  it('rejects an empty member_id and an unknown key', () => {
    expect(createScheduleSchema.safeParse({ ...valid, member_id: ' ' }).success).toBe(false)
    expect(createScheduleSchema.safeParse({ ...valid, subscription_id: 's1' }).success).toBe(false)
  })
})

describe('patchScheduleSchema', () => {
  it('accepts each of the four columns on its own', () => {
    for (const body of [{ member_id: 'm2' }, { amount: 2000 }, { start_month: '2026-02' }, { end_month: '2026-09' }]) {
      expect(patchScheduleSchema.safeParse(body).success, JSON.stringify(body)).toBe(true)
    }
  })

  it('accepts a null end month, which reopens an arrangement', () => {
    expect(patchScheduleSchema.parse({ end_month: null })).toEqual({ end_month: null })
  })

  it('applies no default, so an absent end month leaves the stored one alone', () => {
    expect(patchScheduleSchema.parse({ amount: 2000 })).not.toHaveProperty('end_month')
  })

  it('rejects an empty body', () => {
    expect(patchScheduleSchema.safeParse({}).success).toBe(false)
  })

  it('rejects a field outside the four columns', () => {
    expect(patchScheduleSchema.safeParse({ exceptions: ['2026-01'] }).success).toBe(false)
  })

  it('leaves the month ordering to the route, which judges it on the merged row', () => {
    expect(patchScheduleSchema.safeParse({ end_month: '2020-01' }).success).toBe(true)
  })
})
