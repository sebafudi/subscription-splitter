import { describe, expect, it } from 'vitest'
import { createSubscriptionSchema, patchSubscriptionSchema } from './subscriptions'

describe('createSubscriptionSchema', () => {
  it('accepts a full valid body', () => {
    const result = createSubscriptionSchema.safeParse({
      name: 'Family plan',
      currency: 'USD',
      locale: 'en-US',
      time_zone: 'America/New_York',
      start_month: '2026-01',
    })
    expect(result.success).toBe(true)
  })

  it('defaults currency to PLN, locale to pl-PL and time zone to Europe/Warsaw', () => {
    const result = createSubscriptionSchema.parse({ name: 'Family plan', start_month: '2026-01' })
    expect(result.currency).toBe('PLN')
    expect(result.locale).toBe('pl-PL')
    expect(result.time_zone).toBe('Europe/Warsaw')
  })

  it('rejects a name that is empty after trimming', () => {
    const result = createSubscriptionSchema.safeParse({ name: '   ', start_month: '2026-01' })
    expect(result.success).toBe(false)
  })

  it('rejects a month with an invalid month component, including 00 and 13-19 admitted by the looser database pattern', () => {
    for (const bad of ['2026-00', '2026-13', '2026-19', '2026-1', '26-01']) {
      const result = createSubscriptionSchema.safeParse({ name: 'Plan', start_month: bad })
      expect(result.success, `expected ${bad} to be rejected`).toBe(false)
    }
  })

  it('accepts every valid month from 01 to 12', () => {
    for (let month = 1; month <= 12; month += 1) {
      const value = `2026-${String(month).padStart(2, '0')}`
      const result = createSubscriptionSchema.safeParse({ name: 'Plan', start_month: value })
      expect(result.success, `expected ${value} to be accepted`).toBe(true)
    }
  })

  it('rejects a currency that is not a three-letter uppercase code', () => {
    const result = createSubscriptionSchema.safeParse({ name: 'Plan', start_month: '2026-01', currency: 'usd' })
    expect(result.success).toBe(false)
  })

  it('rejects a time zone Intl does not recognize', () => {
    const result = createSubscriptionSchema.safeParse({
      name: 'Plan',
      start_month: '2026-01',
      time_zone: 'Not/AZone',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown key rather than ignoring it', () => {
    const result = createSubscriptionSchema.safeParse({
      name: 'Plan',
      start_month: '2026-01',
      extraField: 'nope',
    })
    expect(result.success).toBe(false)
  })
})

describe('patchSubscriptionSchema', () => {
  it('accepts a subset of fields', () => {
    const result = patchSubscriptionSchema.safeParse({ name: 'Renamed plan' })
    expect(result.success).toBe(true)
  })

  it('rejects an empty patch body', () => {
    const result = patchSubscriptionSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects an unknown key', () => {
    const result = patchSubscriptionSchema.safeParse({ name: 'Renamed plan', nope: true })
    expect(result.success).toBe(false)
  })
})
