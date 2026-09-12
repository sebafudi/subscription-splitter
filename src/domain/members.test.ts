import { describe, expect, it } from 'vitest'
import { activeMembersInMonth, chargedMembersInMonth, rangeCovers, validateActiveRanges } from './members'
import type { Member, SubscriptionState } from './types'

function member(over: Partial<Member> = {}): Member {
  return {
    id: 'm1',
    name: 'Alice',
    isOwner: false,
    archived: false,
    activeRanges: [{ joinedMonth: '2026-01', leftMonth: null }],
    ...over,
  }
}

function state(members: Member[]): SubscriptionState {
  return {
    settings: { startMonth: '2026-01', currency: 'PLN', locale: 'pl-PL', timeZone: 'Europe/Warsaw' },
    priceHistory: [],
    breakMonths: [],
    members,
    recurring: [],
    recurringExceptions: [],
    payments: [],
  }
}

describe('rangeCovers', () => {
  it('covers exactly one month when the two ends are equal', () => {
    const m = member({ activeRanges: [{ joinedMonth: '2026-03', leftMonth: '2026-03' }] })
    expect(rangeCovers(m, '2026-02')).toBe(false)
    expect(rangeCovers(m, '2026-03')).toBe(true)
    expect(rangeCovers(m, '2026-04')).toBe(false)
  })

  it('covers every month at or after joinedMonth when leftMonth is null', () => {
    const m = member({ activeRanges: [{ joinedMonth: '2026-03', leftMonth: null }] })
    expect(rangeCovers(m, '2026-02')).toBe(false)
    expect(rangeCovers(m, '2026-03')).toBe(true)
    expect(rangeCovers(m, '2099-01')).toBe(true)
  })

  it('is true when any of several ranges covers the month', () => {
    const m = member({
      activeRanges: [
        { joinedMonth: '2026-01', leftMonth: '2026-02' },
        { joinedMonth: '2026-05', leftMonth: null },
      ],
    })
    expect(rangeCovers(m, '2026-03')).toBe(false)
    expect(rangeCovers(m, '2026-01')).toBe(true)
    expect(rangeCovers(m, '2026-06')).toBe(true)
  })
})

describe('activeMembersInMonth', () => {
  it('includes the owner and ignores archived entirely', () => {
    const owner = member({ id: 'owner', isOwner: true, archived: false })
    const archivedButActive = member({ id: 'a', archived: true })
    const s = state([owner, archivedButActive])
    expect(activeMembersInMonth(s, '2026-01').map((m) => m.id)).toEqual(['owner', 'a'])
  })

  it('excludes a member whose range does not cover the month', () => {
    const gone = member({ id: 'gone', activeRanges: [{ joinedMonth: '2026-01', leftMonth: '2026-01' }] })
    const s = state([gone])
    expect(activeMembersInMonth(s, '2026-02')).toEqual([])
  })
})

describe('chargedMembersInMonth', () => {
  it('excludes the owner even when the owner is active', () => {
    const owner = member({ id: 'owner', isOwner: true })
    const a = member({ id: 'a' })
    const s = state([owner, a])
    expect(chargedMembersInMonth(s, '2026-01').map((m) => m.id)).toEqual(['a'])
  })
})

describe('validateActiveRanges', () => {
  const startMonth = '2026-01'

  it('accepts a valid set', () => {
    expect(
      validateActiveRanges(
        [
          { joinedMonth: '2026-01', leftMonth: '2026-03' },
          { joinedMonth: '2026-05', leftMonth: null },
        ],
        startMonth,
      ),
    ).toBeNull()
  })

  it('rejects an empty set', () => {
    expect(validateActiveRanges([], startMonth)).not.toBeNull()
  })

  it('rejects a range that ends before it starts', () => {
    expect(validateActiveRanges([{ joinedMonth: '2026-03', leftMonth: '2026-01' }], startMonth)).not.toBeNull()
  })

  it('rejects a range beginning before the subscription start month', () => {
    expect(validateActiveRanges([{ joinedMonth: '2025-12', leftMonth: null }], startMonth)).not.toBeNull()
  })

  it('rejects ranges that overlap once sorted by joined month', () => {
    expect(
      validateActiveRanges(
        [
          { joinedMonth: '2026-01', leftMonth: '2026-04' },
          { joinedMonth: '2026-03', leftMonth: null },
        ],
        startMonth,
      ),
    ).not.toBeNull()
  })

  it('rejects two ranges that touch in the same month as an overlap rather than a merge', () => {
    expect(
      validateActiveRanges(
        [
          { joinedMonth: '2026-01', leftMonth: '2026-03' },
          { joinedMonth: '2026-03', leftMonth: null },
        ],
        startMonth,
      ),
    ).not.toBeNull()
  })

  it('rejects an open-ended range followed by another range', () => {
    expect(
      validateActiveRanges(
        [
          { joinedMonth: '2026-01', leftMonth: null },
          { joinedMonth: '2026-05', leftMonth: null },
        ],
        startMonth,
      ),
    ).not.toBeNull()
  })
})
