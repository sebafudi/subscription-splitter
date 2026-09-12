import { describe, expect, it } from 'vitest'
import { createMemberSchema, patchMemberSchema } from './members'

const oneRange = [{ joined_month: '2026-01' }]

describe('createMemberSchema', () => {
  it('defaults is_owner, archived and an omitted left_month', () => {
    const result = createMemberSchema.parse({ name: 'Ada', active_ranges: oneRange })
    expect(result.is_owner).toBe(false)
    expect(result.archived).toBe(false)
    expect(result.active_ranges).toEqual([{ joined_month: '2026-01', left_month: null }])
  })

  it('trims the name and rejects one that is empty after trimming', () => {
    expect(createMemberSchema.parse({ name: '  Ada  ', active_ranges: oneRange }).name).toBe('Ada')
    expect(createMemberSchema.safeParse({ name: '   ', active_ranges: oneRange }).success).toBe(false)
  })

  it('accepts is_owner, which the database rather than the schema refuses when an owner already exists', () => {
    const result = createMemberSchema.parse({ name: 'Ada', active_ranges: oneRange, is_owner: true })
    expect(result.is_owner).toBe(true)
  })

  it('rejects the months the database GLOB pattern by itself would admit', () => {
    for (const month of ['2026-00', '2026-13', '2026-19']) {
      expect(createMemberSchema.safeParse({ name: 'Ada', active_ranges: [{ joined_month: month }] }).success, month).toBe(false)
      expect(
        createMemberSchema.safeParse({ name: 'Ada', active_ranges: [{ joined_month: '2026-01', left_month: month }] }).success,
        month,
      ).toBe(false)
    }
  })

  it('rejects a month that is not YYYY-MM at all', () => {
    expect(createMemberSchema.safeParse({ name: 'Ada', active_ranges: [{ joined_month: '2026-1' }] }).success).toBe(false)
    expect(createMemberSchema.safeParse({ name: 'Ada', active_ranges: [{ joined_month: '2026-01-01' }] }).success).toBe(false)
  })

  it('rejects an empty range array, since a member with no range has no liability to record', () => {
    expect(createMemberSchema.safeParse({ name: 'Ada', active_ranges: [] }).success).toBe(false)
  })

  it('rejects an unknown key rather than dropping it', () => {
    expect(createMemberSchema.safeParse({ name: 'Ada', active_ranges: oneRange, nope: true }).success).toBe(false)
    expect(createMemberSchema.safeParse({ name: 'Ada', active_ranges: [{ joined_month: '2026-01', nope: true }] }).success).toBe(false)
  })
})

describe('patchMemberSchema', () => {
  it('accepts a single field', () => {
    expect(patchMemberSchema.parse({ archived: true }).archived).toBe(true)
    expect(patchMemberSchema.parse({ name: 'Ada' }).name).toBe('Ada')
  })

  it('accepts a complete replacement range set, defaulting an omitted left_month', () => {
    const result = patchMemberSchema.parse({ active_ranges: [{ joined_month: '2026-02' }] })
    expect(result.active_ranges).toEqual([{ joined_month: '2026-02', left_month: null }])
  })

  it('rejects an empty body', () => {
    expect(patchMemberSchema.safeParse({}).success).toBe(false)
  })

  it('rejects an unknown key and a key the member does not own', () => {
    expect(patchMemberSchema.safeParse({ name: 'Ada', nope: true }).success).toBe(false)
    expect(patchMemberSchema.safeParse({ name: 'Ada', is_owner: true }).success).toBe(false)
    expect(patchMemberSchema.safeParse({ name: 'Ada', subscription_id: 'somewhere-else' }).success).toBe(false)
  })

  it('rejects an empty replacement range set', () => {
    expect(patchMemberSchema.safeParse({ active_ranges: [] }).success).toBe(false)
  })
})
