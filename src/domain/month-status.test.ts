import { describe, expect, it } from 'vitest'
import { chargedMonthStatus, memberMonthStatus } from './month-status'
import type { Member, SubscriptionState } from './types'

function owner(over: Partial<Member> = {}): Member {
  return {
    id: 'owner',
    name: 'Me',
    isOwner: true,
    archived: false,
    activeRanges: [{ joinedMonth: '2026-01', leftMonth: null }],
    ...over,
  }
}

function nonOwner(over: Partial<Member> = {}): Member {
  return {
    id: 'a',
    name: 'Alice',
    isOwner: false,
    archived: false,
    activeRanges: [{ joinedMonth: '2026-01', leftMonth: null }],
    ...over,
  }
}

function state(over: Partial<SubscriptionState> = {}): SubscriptionState {
  return {
    settings: { startMonth: '2026-01', currency: 'PLN', locale: 'pl-PL', timeZone: 'Europe/Warsaw' },
    priceHistory: [{ id: 'p1', effectiveFrom: '2026-01', amount: 10000 }],
    breakMonths: [],
    members: [owner(), nonOwner()],
    recurring: [],
    recurringExceptions: [],
    payments: [],
    ...over,
  }
}

const CURRENT = '2026-06'

describe('memberMonthStatus, one case per condition', () => {
  it('counts a month inside the window, elapsed, covered and not a break month', () => {
    expect(memberMonthStatus(state(), nonOwner(), '2026-03', CURRENT)).toEqual({ counts: true, reason: null })
  })

  it('excludes a month before the subscription first month', () => {
    expect(memberMonthStatus(state(), nonOwner(), '2025-12', CURRENT)).toEqual({
      counts: false,
      reason: 'before-start-month',
    })
  })

  it('excludes a month after the current one, so nothing not yet elapsed counts', () => {
    expect(memberMonthStatus(state(), nonOwner(), '2026-07', CURRENT)).toEqual({
      counts: false,
      reason: 'not-yet-elapsed',
    })
  })

  it('counts the current month itself, the boundary the not-yet-elapsed rule sits on', () => {
    expect(memberMonthStatus(state(), nonOwner(), CURRENT, CURRENT).counts).toBe(true)
  })

  it('excludes the owner, who occupies a seat but never owes and is never paid from', () => {
    expect(memberMonthStatus(state(), owner(), '2026-03', CURRENT)).toEqual({
      counts: false,
      reason: 'owner-member',
    })
  })

  it('excludes a month no range of the member covers', () => {
    const member = nonOwner({ activeRanges: [{ joinedMonth: '2026-04', leftMonth: null }] })
    expect(memberMonthStatus(state({ members: [owner(), member] }), member, '2026-03', CURRENT)).toEqual({
      counts: false,
      reason: 'outside-active-range',
    })
  })

  it('counts both ends of a range, which are inclusive', () => {
    const member = nonOwner({ activeRanges: [{ joinedMonth: '2026-02', leftMonth: '2026-04' }] })
    const s = state({ members: [owner(), member] })
    expect(memberMonthStatus(s, member, '2026-02', CURRENT).counts).toBe(true)
    expect(memberMonthStatus(s, member, '2026-04', CURRENT).counts).toBe(true)
    expect(memberMonthStatus(s, member, '2026-05', CURRENT).reason).toBe('outside-active-range')
  })

  it('excludes a break month', () => {
    expect(memberMonthStatus(state({ breakMonths: ['2026-03'] }), nonOwner(), '2026-03', CURRENT)).toEqual({
      counts: false,
      reason: 'break-month',
    })
  })

  it('counts a month with no price entry yet, because a standing order is not conditioned on the price', () => {
    const s = state({ priceHistory: [{ id: 'p1', effectiveFrom: '2026-05', amount: 10000 }] })
    expect(memberMonthStatus(s, nonOwner(), '2026-03', CURRENT).counts).toBe(true)
  })

  it('names the outermost failing condition when more than one fails', () => {
    const member = nonOwner({ activeRanges: [{ joinedMonth: '2026-04', leftMonth: null }] })
    const s = state({ members: [owner(), member], breakMonths: ['2026-07'] })
    expect(memberMonthStatus(s, member, '2026-07', CURRENT).reason).toBe('not-yet-elapsed')
  })
})

describe('chargedMonthStatus, the further question of whether the month costs the member anything', () => {
  it('charges a month that counts and has an effective price', () => {
    expect(chargedMonthStatus(state(), nonOwner(), '2026-03', CURRENT)).toEqual({ counts: true, reason: null })
  })

  it('does not charge a month with no price entry effective yet', () => {
    const s = state({ priceHistory: [{ id: 'p1', effectiveFrom: '2026-05', amount: 10000 }] })
    expect(chargedMonthStatus(s, nonOwner(), '2026-03', CURRENT)).toEqual({ counts: false, reason: 'unpriced' })
  })

  it('charges from the month an entry becomes effective, not before', () => {
    const s = state({ priceHistory: [{ id: 'p1', effectiveFrom: '2026-05', amount: 10000 }] })
    expect(chargedMonthStatus(s, nonOwner(), '2026-04', CURRENT).reason).toBe('unpriced')
    expect(chargedMonthStatus(s, nonOwner(), '2026-05', CURRENT).counts).toBe(true)
  })

  it('reports a break month as a break month rather than as unpriced, though both cost nothing', () => {
    expect(chargedMonthStatus(state({ breakMonths: ['2026-03'] }), nonOwner(), '2026-03', CURRENT).reason).toBe(
      'break-month',
    )
  })

  it('passes through every exclusion the shared rule already found', () => {
    expect(chargedMonthStatus(state(), owner(), '2026-03', CURRENT).reason).toBe('owner-member')
    expect(chargedMonthStatus(state(), nonOwner(), '2025-12', CURRENT).reason).toBe('before-start-month')
    expect(chargedMonthStatus(state(), nonOwner(), '2026-07', CURRENT).reason).toBe('not-yet-elapsed')
  })
})
