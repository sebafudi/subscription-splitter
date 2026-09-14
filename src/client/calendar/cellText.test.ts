import { describe, expect, it } from 'vitest'
import type { MonthExclusion } from '../../domain/month-status'
import type { Member, Payment } from '../../domain/types'
import { cellAccessibleName, chargeSentence, exclusionPhrase } from './cellText'
import type { MonthCell } from './projection'

const LOCALE = 'en-GB'
const CURRENCY = 'GBP'

const ALICE: Member = {
  id: 'alice',
  name: 'Alice',
  isOwner: false,
  archived: false,
  activeRanges: [{ joinedMonth: '2019-01', leftMonth: null }],
}

function receipt(id: string, amount: number): Payment {
  return { id, memberId: 'alice', date: '2026-03-03', amount, note: '', kind: 'manual' }
}

function cell(over: Partial<MonthCell> = {}): MonthCell {
  return {
    month: '2026-03',
    manualReceipts: [],
    assumed: null,
    schedule: null,
    assumedStatus: null,
    charge: 1500,
    chargeStatus: { counts: true, reason: null },
    ...over,
  }
}

function excluded(reason: MonthExclusion, over: Partial<MonthCell> = {}): MonthCell {
  return cell({ charge: 0, chargeStatus: { counts: false, reason }, ...over })
}

describe('exclusionPhrase', () => {
  it('gives the shipped English phrase for every condition the domain can name', () => {
    expect(exclusionPhrase('before-start-month')).toBe('that month is before the plan started')
    expect(exclusionPhrase('not-yet-elapsed')).toBe('that month has not arrived yet')
    expect(exclusionPhrase('owner-member')).toBe('the owner is never paid from')
    expect(exclusionPhrase('outside-active-range')).toBe('the participant was not on the plan that month')
    expect(exclusionPhrase('break-month')).toBe('the plan was paused that month')
    expect(exclusionPhrase('unpriced')).toBe('that month had no price')
    expect(exclusionPhrase('excepted')).toBe('marked as not received')
  })
})

describe('cellAccessibleName', () => {
  it('names the month, what was recorded, what was assumed and the charge, in that order', () => {
    const name = cellAccessibleName(
      cell({
        manualReceipts: [receipt('one', 2500), receipt('two', 1800)],
        assumed: { scheduleId: 'sched', amount: 1200 },
      }),
      ALICE,
      LOCALE,
      CURRENCY,
    )

    expect(name).toBe(
      'Mar 2026, 2 payments recorded, £43.00 in total, £12.00 assumed from a standing order, charged £15.00',
    )
  })

  it('says nothing recorded when the month holds no receipt', () => {
    expect(cellAccessibleName(cell(), ALICE, LOCALE, CURRENCY)).toBe(
      'Mar 2026, nothing recorded, charged £15.00',
    )
  })

  it('speaks of one payment in the singular', () => {
    const name = cellAccessibleName(cell({ manualReceipts: [receipt('one', 2500)] }), ALICE, LOCALE, CURRENCY)

    expect(name).toBe('Mar 2026, 1 payment recorded, £25.00 in total, charged £15.00')
  })

  it('never combines a recorded receipt with an assumed one into a single figure', () => {
    const name = cellAccessibleName(
      cell({
        manualReceipts: [receipt('one', 700)],
        assumed: { scheduleId: 'sched', amount: 300 },
      }),
      ALICE,
      LOCALE,
      CURRENCY,
    )

    expect(name).toContain('£7.00 in total')
    expect(name).toContain('£3.00 assumed from a standing order')
    expect(name).not.toContain('£10.00')
  })

  it('replaces the charge with the reason when the month was paused', () => {
    expect(cellAccessibleName(excluded('break-month'), ALICE, LOCALE, CURRENCY)).toBe(
      'Mar 2026, nothing recorded, the plan was paused that month',
    )
  })

  it('replaces the charge with the reason when the month had no price, receipts included', () => {
    const name = cellAccessibleName(
      excluded('unpriced', { manualReceipts: [receipt('one', 2500)] }),
      ALICE,
      LOCALE,
      CURRENCY,
    )

    expect(name).toBe('Mar 2026, 1 payment recorded, £25.00 in total, that month had no price')
  })

  it('keeps a receipt audible on a month the participant was not on the plan for', () => {
    const name = cellAccessibleName(
      excluded('outside-active-range', { manualReceipts: [receipt('one', 3000)] }),
      ALICE,
      LOCALE,
      CURRENCY,
    )

    expect(name).toBe(
      'Mar 2026, 1 payment recorded, £30.00 in total, the participant was not on the plan that month',
    )
  })

  it('says a future month has not arrived yet', () => {
    expect(cellAccessibleName(excluded('not-yet-elapsed', { month: '2026-11' }), ALICE, LOCALE, CURRENCY)).toBe(
      'Nov 2026, nothing recorded, that month has not arrived yet',
    )
  })

  it('says a standing-order month was marked as not received while the charge still stands', () => {
    const name = cellAccessibleName(
      cell({
        schedule: { id: 'sched', memberId: 'alice', amount: 1200, startMonth: '2023-01', endMonth: null },
        assumedStatus: { counts: false, reason: 'excepted' },
      }),
      ALICE,
      LOCALE,
      CURRENCY,
    )

    expect(name).toBe('Mar 2026, nothing recorded, marked as not received, charged £15.00')
  })

  it('does not repeat an exclusion the charge already names', () => {
    const name = cellAccessibleName(
      excluded('break-month', {
        schedule: { id: 'sched', memberId: 'alice', amount: 1200, startMonth: '2023-01', endMonth: null },
        assumedStatus: { counts: false, reason: 'break-month' },
      }),
      ALICE,
      LOCALE,
      CURRENCY,
    )

    expect(name).toBe('Mar 2026, nothing recorded, the plan was paused that month')
  })
})

describe('chargeSentence', () => {
  it('names the charge and the month when the month counts', () => {
    expect(chargeSentence(cell(), LOCALE, CURRENCY)).toEqual({
      text: 'Charged £15.00 for Mar 2026.',
      tone: 'body',
    })
  })

  it('says the charge is unknown, in red, when the month had no price', () => {
    expect(chargeSentence(excluded('unpriced'), LOCALE, CURRENCY)).toEqual({
      text: 'No price recorded for Mar 2026, so the charge is unknown.',
      tone: 'red',
    })
  })

  it('prefixes every other reason with not charged', () => {
    expect(chargeSentence(excluded('break-month'), LOCALE, CURRENCY).text).toBe(
      'Not charged: the plan was paused that month.',
    )
    expect(chargeSentence(excluded('outside-active-range'), LOCALE, CURRENCY).text).toBe(
      'Not charged: the participant was not on the plan that month.',
    )
    expect(chargeSentence(excluded('before-start-month'), LOCALE, CURRENCY).text).toBe(
      'Not charged: that month is before the plan started.',
    )
  })

  it('says a future month has not arrived yet', () => {
    expect(chargeSentence(excluded('not-yet-elapsed', { month: '2026-11' }), LOCALE, CURRENCY)).toEqual({
      text: 'Not charged: that month has not arrived yet.',
      tone: 'body',
    })
  })
})
