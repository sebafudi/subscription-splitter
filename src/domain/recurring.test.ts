import { describe, expect, it } from 'vitest'
import { findScheduleOverlap, isMonthInSchedule, scheduleMonthStatuses } from './recurring'
import type { Member, MonthStr, RecurringSchedule, SubscriptionState } from './types'

function schedule(over: Partial<RecurringSchedule> = {}): RecurringSchedule {
  return { id: 'r1', memberId: 'a', amount: 1000, startMonth: '2026-02', endMonth: '2026-05', ...over }
}

describe('isMonthInSchedule', () => {
  it('includes both ends of the range', () => {
    expect(isMonthInSchedule(schedule(), '2026-02')).toBe(true)
    expect(isMonthInSchedule(schedule(), '2026-05')).toBe(true)
    expect(isMonthInSchedule(schedule(), '2026-01')).toBe(false)
    expect(isMonthInSchedule(schedule(), '2026-06')).toBe(false)
  })

  it('covers exactly one month when the two ends are equal', () => {
    const single = schedule({ startMonth: '2026-03', endMonth: '2026-03' })
    expect(isMonthInSchedule(single, '2026-03')).toBe(true)
    expect(isMonthInSchedule(single, '2026-04')).toBe(false)
  })

  it('is unbounded above when the end month is null', () => {
    const open = schedule({ endMonth: null })
    expect(isMonthInSchedule(open, '2030-12')).toBe(true)
    expect(isMonthInSchedule(open, '2026-01')).toBe(false)
  })
})

describe('findScheduleOverlap', () => {
  const stored = schedule()

  it('finds a range contained inside a stored one', () => {
    const found = findScheduleOverlap([stored], { id: null, memberId: 'a', startMonth: '2026-03', endMonth: '2026-04' })
    expect(found).toEqual(stored)
  })

  it('finds a range straddling the end of a stored one', () => {
    const found = findScheduleOverlap([stored], { id: null, memberId: 'a', startMonth: '2026-05', endMonth: '2026-08' })
    expect(found).toEqual(stored)
  })

  it('treats two ranges that touch in one month as an overlap rather than a continuation', () => {
    const found = findScheduleOverlap([stored], { id: null, memberId: 'a', startMonth: '2026-05', endMonth: null })
    expect(found).toEqual(stored)
  })

  it('finds a stored open-ended range that swallows a later one', () => {
    const open = schedule({ id: 'r2', endMonth: null })
    const found = findScheduleOverlap([open], { id: null, memberId: 'a', startMonth: '2027-01', endMonth: '2027-03' })
    expect(found).toEqual(open)
  })

  it('returns null for two ranges separated by a month', () => {
    expect(findScheduleOverlap([stored], { id: null, memberId: 'a', startMonth: '2026-07', endMonth: null })).toBeNull()
    expect(findScheduleOverlap([stored], { id: null, memberId: 'a', startMonth: '2025-11', endMonth: '2025-12' })).toBeNull()
  })

  it('returns null for a range belonging to a different member', () => {
    expect(findScheduleOverlap([stored], { id: null, memberId: 'b', startMonth: '2026-03', endMonth: '2026-04' })).toBeNull()
  })

  it('ignores the stored row a candidate is editing, so an edit does not collide with itself', () => {
    expect(findScheduleOverlap([stored], { id: 'r1', memberId: 'a', startMonth: '2026-02', endMonth: '2026-06' })).toBeNull()
  })

  it('returns that same stored row for a create, whose candidate has no id yet', () => {
    const found = findScheduleOverlap([stored], { id: null, memberId: 'a', startMonth: '2026-02', endMonth: '2026-05' })
    expect(found).toEqual(stored)
  })
})

const CURRENT = '2026-06'

/**
 * The helper takes only what it reads, which is what lets the browser call it
 * with the two fields it holds rather than a fabricated `SubscriptionState`.
 */
function inputs(over: Partial<Pick<SubscriptionState, 'settings' | 'breakMonths'>> = {}) {
  return {
    settings: { startMonth: '2026-01', currency: 'PLN', locale: 'pl-PL', timeZone: 'Europe/Warsaw' },
    breakMonths: [] as MonthStr[],
    ...over,
  }
}

function member(over: Partial<Member> = {}): Member {
  return {
    id: 'a',
    name: 'Alice',
    isOwner: false,
    archived: false,
    activeRanges: [{ joinedMonth: '2026-01', leftMonth: null }],
    ...over,
  }
}

function monthsOf(rows: { month: MonthStr }[]): MonthStr[] {
  return rows.map((row) => row.month)
}

describe('scheduleMonthStatuses, which months of an arrangement elapsed', () => {
  it('stops at the current month for an open-ended arrangement', () => {
    const rows = scheduleMonthStatuses(inputs(), member(), schedule({ startMonth: '2026-04', endMonth: null }), [], CURRENT)
    expect(monthsOf(rows)).toEqual(['2026-04', '2026-05', '2026-06'])
  })

  it('stops at the end month when that is earlier than the current month', () => {
    const rows = scheduleMonthStatuses(inputs(), member(), schedule({ startMonth: '2026-04', endMonth: '2026-05' }), [], CURRENT)
    expect(monthsOf(rows)).toEqual(['2026-04', '2026-05'])
  })

  it('is empty when the arrangement starts next month', () => {
    const rows = scheduleMonthStatuses(inputs(), member(), schedule({ startMonth: '2026-07', endMonth: null }), [], CURRENT)
    expect(rows).toEqual([])
  })

  it('is one row long when the arrangement starts and ends in the current month', () => {
    const rows = scheduleMonthStatuses(inputs(), member(), schedule({ startMonth: CURRENT, endMonth: CURRENT }), [], CURRENT)
    expect(monthsOf(rows)).toEqual([CURRENT])
  })
})

describe('scheduleMonthStatuses, why a month did not count', () => {
  const arrangement = schedule({ startMonth: '2026-01', endMonth: null })

  it('counts an ordinary month with no reason', () => {
    const rows = scheduleMonthStatuses(inputs(), member(), arrangement, [], CURRENT)
    expect(rows.find((row) => row.month === '2026-03')).toEqual({ month: '2026-03', counts: true, reason: null })
  })

  it('reports a month outside every active range of the member', () => {
    const left = member({ activeRanges: [{ joinedMonth: '2026-01', leftMonth: '2026-02' }] })
    const rows = scheduleMonthStatuses(inputs(), left, arrangement, [], CURRENT)
    expect(rows.find((row) => row.month === '2026-03')).toEqual({
      month: '2026-03',
      counts: false,
      reason: 'outside-active-range',
    })
  })

  it('reports a break month', () => {
    const rows = scheduleMonthStatuses(inputs({ breakMonths: ['2026-03'] }), member(), arrangement, [], CURRENT)
    expect(rows.find((row) => row.month === '2026-03')).toEqual({
      month: '2026-03',
      counts: false,
      reason: 'break-month',
    })
  })

  it('reports a month the organizer marked as not received', () => {
    const rows = scheduleMonthStatuses(inputs(), member(), arrangement, ['2026-03'], CURRENT)
    expect(rows.find((row) => row.month === '2026-03')).toEqual({
      month: '2026-03',
      counts: false,
      reason: 'excepted',
    })
  })

  it('names the outermost condition when a month is both outside the ranges and a break month', () => {
    const left = member({ activeRanges: [{ joinedMonth: '2026-01', leftMonth: '2026-02' }] })
    const rows = scheduleMonthStatuses(inputs({ breakMonths: ['2026-03'] }), left, arrangement, [], CURRENT)
    expect(rows.find((row) => row.month === '2026-03')?.reason).toBe('outside-active-range')
  })

  it('leaves an already excluded month labelled by the condition that excluded it, not by the exception', () => {
    const rows = scheduleMonthStatuses(inputs({ breakMonths: ['2026-03'] }), member(), arrangement, ['2026-03'], CURRENT)
    expect(rows.find((row) => row.month === '2026-03')?.reason).toBe('break-month')
  })
})
