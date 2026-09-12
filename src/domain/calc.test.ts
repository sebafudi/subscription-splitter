import { describe, expect, it } from 'vitest'
import {
  balanceForMember,
  computeSummary,
  perPersonShare,
  recurringReceived,
  shareForMember,
} from './calc'
import type { Member, RecurringSchedule, SubscriptionState } from './types'

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

function nonOwner(id: string, name: string, over: Partial<Member> = {}): Member {
  return {
    id,
    name,
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
    members: [owner(), nonOwner('a', 'Alice'), nonOwner('b', 'Bob')],
    recurring: [],
    recurringExceptions: [],
    payments: [],
    ...over,
  }
}

describe('perPersonShare', () => {
  it('splits an evenly divisible price across three active members including the owner', () => {
    const s = state({ priceHistory: [{ id: 'p1', effectiveFrom: '2026-01', amount: 9000 }] })
    expect(perPersonShare(s, '2026-01')).toBe(3000)
  })

  it('is zero when nobody is active, even though the price is not zero', () => {
    const s = state({ members: [] })
    expect(perPersonShare(s, '2026-01')).toBe(0)
  })
})

describe('shareForMember', () => {
  it('is always zero for the owner, whatever their ranges say', () => {
    const s = state()
    expect(shareForMember(s, s.members[0], '2026-01', '2026-06')).toBe(0)
  })

  it('is zero for a member whose ranges do not cover the month', () => {
    const s = state({ members: [owner(), nonOwner('a', 'Alice', { activeRanges: [{ joinedMonth: '2026-03', leftMonth: null }] })] })
    expect(shareForMember(s, s.members[1], '2026-01', '2026-06')).toBe(0)
  })

  it('a member with two ranges and a gap owes for the covered months only', () => {
    const gapMember = nonOwner('a', 'Alice', {
      activeRanges: [
        { joinedMonth: '2026-01', leftMonth: '2026-01' },
        { joinedMonth: '2026-03', leftMonth: null },
      ],
    })
    const s = state({ members: [owner(), gapMember] })
    expect(shareForMember(s, gapMember, '2026-01', '2026-06')).toBeGreaterThan(0)
    expect(shareForMember(s, gapMember, '2026-02', '2026-06')).toBe(0)
    expect(shareForMember(s, gapMember, '2026-03', '2026-06')).toBeGreaterThan(0)
  })

  it('a member whose left month has passed stops accruing', () => {
    const left = nonOwner('a', 'Alice', { activeRanges: [{ joinedMonth: '2026-01', leftMonth: '2026-02' }] })
    const s = state({ members: [owner(), left] })
    expect(shareForMember(s, left, '2026-02', '2026-06')).toBeGreaterThan(0)
    expect(shareForMember(s, left, '2026-03', '2026-06')).toBe(0)
  })
})

describe('a priced month with nobody active', () => {
  it('the share is zero, no member owes, the cost is still counted, and nothing throws', () => {
    const s = state({
      members: [
        owner({ activeRanges: [{ joinedMonth: '2026-01', leftMonth: '2026-01' }] }),
        nonOwner('a', 'Alice', { activeRanges: [{ joinedMonth: '2026-01', leftMonth: '2026-01' }] }),
      ],
    })
    expect(() => perPersonShare(s, '2026-02')).not.toThrow()
    expect(perPersonShare(s, '2026-02')).toBe(0)
    const summary = computeSummary(s, '2026-02')
    expect(summary.totalPlanCost).toBe(20000)
    expect(summary.ownerNetCost).toBe(20000)
    expect(summary.ownerShareThisMonth).toBe(10000)
    expect(summary.members.every((m) => m.currentShare === 0)).toBe(true)
  })
})

describe('recurringReceived', () => {
  const schedule: RecurringSchedule = { id: 'r1', memberId: 'a', amount: 1000, startMonth: '2026-01', endMonth: null }

  it('counts a month at or after the start month, at or before the current month, not a break month, covered, not excepted', () => {
    const s = state({ recurring: [schedule] })
    const member = s.members.find((m) => m.id === 'a')!
    expect(recurringReceived(s, member, ['2026-01', '2026-02', '2026-03'], '2026-03')).toBe(3000)
  })

  it('excludes a month before the schedule start', () => {
    const s = state({ recurring: [{ ...schedule, startMonth: '2026-02' }] })
    const member = s.members.find((m) => m.id === 'a')!
    expect(recurringReceived(s, member, ['2026-01'], '2026-03')).toBe(0)
  })

  it('excludes a month after the schedule end', () => {
    const s = state({ recurring: [{ ...schedule, endMonth: '2026-01' }] })
    const member = s.members.find((m) => m.id === 'a')!
    expect(recurringReceived(s, member, ['2026-02'], '2026-03')).toBe(0)
  })

  it('excludes a break month', () => {
    const s = state({ recurring: [schedule], breakMonths: ['2026-02'] })
    const member = s.members.find((m) => m.id === 'a')!
    expect(recurringReceived(s, member, ['2026-02'], '2026-03')).toBe(0)
  })

  it('excludes a month the member is not active for', () => {
    const inactive = nonOwner('a', 'Alice', { activeRanges: [{ joinedMonth: '2026-03', leftMonth: null }] })
    const s = state({ members: [owner(), inactive], recurring: [schedule] })
    expect(recurringReceived(s, inactive, ['2026-01'], '2026-03')).toBe(0)
  })

  it('excludes a month listed as an exception', () => {
    const s = state({ recurring: [schedule], recurringExceptions: [{ recurringId: 'r1', month: '2026-02' }] })
    const member = s.members.find((m) => m.id === 'a')!
    expect(recurringReceived(s, member, ['2026-02'], '2026-03')).toBe(0)
  })

  it('a schedule with no end month contributes nothing for a month after the current one', () => {
    const s = state({ recurring: [schedule] })
    const member = s.members.find((m) => m.id === 'a')!
    expect(recurringReceived(s, member, ['2026-04'], '2026-03')).toBe(0)
  })
})

describe('balanceForMember', () => {
  it('is paid less owed, negative when owing, positive when ahead', () => {
    const s = state({ payments: [{ id: 'pay1', memberId: 'a', date: '2026-01-15', amount: 2000, note: '', kind: 'manual' }] })
    const alice = s.members.find((m) => m.id === 'a')!
    const result = balanceForMember(s, alice, ['2026-01'], '2026-01')
    expect(result.paid).toBe(2000)
    expect(result.owed).toBe(3333)
    expect(result.balance).toBe(2000 - 3333)
  })
})

describe("the requirements' worked example, through computeSummary", () => {
  it('matches the acceptance numbers to the minor unit', () => {
    const s = state()
    const summary = computeSummary(s, '2026-01')
    expect(summary.currentMonthly).toBe(10000)
    expect(summary.currentActiveCount).toBe(3)
    expect(summary.currentPerPersonShare).toBe(3333)
    expect(summary.expectedThisMonth).toBe(6666)
    expect(summary.ownerShareThisMonth).toBe(3334)
  })

  it("the third acceptance number: a payment of 2000 from one member gives -1333, the other -3333", () => {
    const s = state({ payments: [{ id: 'pay1', memberId: 'a', date: '2026-01-15', amount: 2000, note: '', kind: 'manual' }] })
    const summary = computeSummary(s, '2026-01')
    const alice = summary.members.find((m) => m.memberId === 'a')!
    const bob = summary.members.find((m) => m.memberId === 'b')!
    expect(alice.balance).toBe(-1333)
    expect(bob.balance).toBe(-3333)
  })
})

describe('the month always balances exactly', () => {
  it.each([
    { price: 9000, activeIds: ['owner', 'a', 'b'], label: 'three active including owner' },
    { price: 10000, activeIds: ['a', 'b'], label: 'owner sits the month out' },
    { price: 5000, activeIds: [] as string[], label: 'nobody active' },
  ])('$label: every charged share plus the owner share equals the price', ({ price, activeIds }) => {
    const allMembers = [owner(), nonOwner('a', 'Alice'), nonOwner('b', 'Bob')]
    for (const m of allMembers) {
      m.activeRanges = activeIds.includes(m.id) ? [{ joinedMonth: '2026-01', leftMonth: null }] : []
    }
    const s = state({ priceHistory: [{ id: 'p1', effectiveFrom: '2026-01', amount: price }], members: allMembers })
    const summary = computeSummary(s, '2026-01')

    const activeCount = activeIds.length
    const expectedShare = activeCount === 0 ? 0 : Math.round(price / activeCount)
    const chargedCount = activeIds.filter((id) => id !== 'owner').length
    const expectedThisMonth = expectedShare * chargedCount
    const ownerShare = price - expectedThisMonth

    expect(summary.currentMonthly).toBe(price)
    expect(summary.currentPerPersonShare).toBe(expectedShare)
    expect(summary.expectedThisMonth).toBe(expectedThisMonth)
    expect(summary.ownerShareThisMonth).toBe(ownerShare)
    expect(summary.expectedThisMonth + summary.ownerShareThisMonth).toBe(price)
  })
})

describe('computeSummary over a combined history', () => {
  it('handles a price change, a break month, a departure and a rejoin, with the member list most-owing first', () => {
    const departed = nonOwner('a', 'Alice', {
      activeRanges: [
        { joinedMonth: '2026-01', leftMonth: '2026-02' },
        { joinedMonth: '2026-04', leftMonth: null },
      ],
    })
    const steady = nonOwner('b', 'Bob')
    const s = state({
      priceHistory: [
        { id: 'p1', effectiveFrom: '2026-01', amount: 9000 },
        { id: 'p2', effectiveFrom: '2026-04', amount: 12000 },
      ],
      breakMonths: ['2026-03'],
      members: [owner(), departed, steady],
      payments: [{ id: 'pay1', memberId: 'b', date: '2026-01-10', amount: 100000, note: '', kind: 'manual' }],
    })
    const summary = computeSummary(s, '2026-04')

    // months: 01 (9000/3=3000 each), 02 (still 3 active=3000 each), 03 break (0), 04 (12000/3=4000 each)
    expect(summary.totalPlanCost).toBe(9000 + 9000 + 0 + 12000)
    // Bob's large payment leaves him ahead; Alice, unpaid, owes the most and sorts first.
    expect(summary.members[0].memberId).toBe('a')
    expect(summary.members[0].balance).toBeLessThan(summary.members[1].balance)
  })
})
