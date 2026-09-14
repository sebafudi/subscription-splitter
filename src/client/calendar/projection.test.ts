import { describe, expect, it } from 'vitest'
import { balanceForMember, computeSummary, recurringReceived } from '../../domain/calc'
import { enumerateMonths } from '../../domain/months'
import type { Member, MonthStr, Payment, SubscriptionState } from '../../domain/types'
import type { Schedule } from '../api'
import {
  buildSubscriptionState,
  calendarYearRange,
  futureYearPayments,
  monthsOfYear,
  projectPersonYear,
  projectYear,
  type MonthCell,
  type PersonYear,
} from './projection'

/**
 * One synthetic six-person, eight-year ledger, built as a `SubscriptionState`
 * literal. Names and amounts are invented. It carries every edge case the plan
 * lists: two same-day receipts, a lump sum, a future-dated receipt, a receipt
 * in a later year, two sequential schedules at different rates for one person,
 * an exception, a break month, a membership gap, an early leave, an empty
 * membership, months with no price and months that have not arrived.
 */

const CURRENT: MonthStr = '2026-09'
const START: MonthStr = '2019-01'
const LOCALE = 'en-GB'
const CURRENCY = 'GBP'

const EARLY_PRICE = 4000
const LATE_PRICE = 6000
const BREAK = '2021-07'
const EXCEPTED = '2024-05'

const EARLY_RATE = 1000
const LATE_RATE = 1200
const ERIN_RATE = 500

const CARA_RECEIPT = 2000
const DAN_RECEIPT = 3000
const BOB_LUMP_SUM = 50000
const ALICE_MARCH_FIRST = 2500
const ALICE_MARCH_SECOND = 1800
const ALICE_FUTURE_DATED = 9000
const ALICE_NEXT_YEAR = 1000

function member(id: string, name: string, over: Partial<Member> = {}): Member {
  return {
    id,
    name,
    isOwner: false,
    archived: false,
    activeRanges: [{ joinedMonth: START, leftMonth: null }],
    ...over,
  }
}

const ORGANIZER = member('owner', 'Organizer', { isOwner: true })
const ALICE = member('alice', 'Alice')
const BOB = member('bob', 'Bob', {
  activeRanges: [
    { joinedMonth: START, leftMonth: '2020-06' },
    { joinedMonth: '2022-01', leftMonth: null },
  ],
})
const CARA = member('cara', 'Cara', { activeRanges: [{ joinedMonth: START, leftMonth: '2019-08' }] })
const DAN = member('dan', 'Dan', { activeRanges: [] })
const ERIN = member('erin', 'Erin', { archived: true })

const PAYMENTS: Payment[] = [
  { id: 'pay-cara', memberId: 'cara', date: '2019-05-10', amount: CARA_RECEIPT, note: '', kind: 'manual' },
  { id: 'pay-dan', memberId: 'dan', date: '2020-03-05', amount: DAN_RECEIPT, note: 'off the plan', kind: 'manual' },
  { id: 'pay-bob', memberId: 'bob', date: '2023-02-15', amount: BOB_LUMP_SUM, note: 'a year up front', kind: 'annual' },
  {
    id: 'pay-alice-first',
    memberId: 'alice',
    date: '2026-03-03',
    amount: ALICE_MARCH_FIRST,
    note: 'first half',
    kind: 'manual',
  },
  {
    id: 'pay-alice-second',
    memberId: 'alice',
    date: '2026-03-03',
    amount: ALICE_MARCH_SECOND,
    note: '',
    kind: 'manual',
  },
  {
    id: 'pay-alice-future',
    memberId: 'alice',
    date: '2026-12-20',
    amount: ALICE_FUTURE_DATED,
    note: '',
    kind: 'manual',
  },
  {
    id: 'pay-alice-next-year',
    memberId: 'alice',
    date: '2027-01-15',
    amount: ALICE_NEXT_YEAR,
    note: '',
    kind: 'manual',
  },
]

const SCHEDULES: Schedule[] = [
  {
    id: 'sched-alice-early',
    memberId: 'alice',
    amount: EARLY_RATE,
    startMonth: START,
    endMonth: '2022-12',
    exceptionMonths: [],
  },
  {
    id: 'sched-alice-late',
    memberId: 'alice',
    amount: LATE_RATE,
    startMonth: '2023-01',
    endMonth: null,
    exceptionMonths: [EXCEPTED],
  },
  {
    id: 'sched-erin',
    memberId: 'erin',
    amount: ERIN_RATE,
    startMonth: START,
    endMonth: null,
    exceptionMonths: [],
  },
]

function ledger(): SubscriptionState {
  return buildSubscriptionState({
    subscription: { startMonth: START, currency: CURRENCY, locale: LOCALE, timeZone: 'Europe/London' },
    members: [ORGANIZER, ALICE, BOB, CARA, DAN, ERIN],
    prices: [
      { id: 'price-early', effectiveFrom: '2019-04', amount: EARLY_PRICE },
      { id: 'price-late', effectiveFrom: '2023-01', amount: LATE_PRICE },
    ],
    breakMonths: [BREAK],
    payments: PAYMENTS,
    schedules: SCHEDULES,
  })
}

const PARTICIPANTS = [ALICE, BOB, CARA, DAN, ERIN]
const FIRST_YEAR = 2019
const LAST_YEAR = 2027

function everyYear(state: SubscriptionState, person: Member): PersonYear[] {
  const years: PersonYear[] = []
  for (let year = FIRST_YEAR; year <= LAST_YEAR; year += 1) {
    years.push(projectPersonYear(state, person, year, CURRENT))
  }
  return years
}

function cellFor(state: SubscriptionState, person: Member, month: MonthStr): MonthCell {
  const year = projectPersonYear(state, person, Number(month.slice(0, 4)), CURRENT)
  const found = year.cells.find((cell) => cell.month === month)
  if (!found) throw new Error(`no cell for ${month}`)
  return found
}

describe('buildSubscriptionState', () => {
  it('flattens schedule exception months into the domain shape and drops them from the schedule', () => {
    const state = ledger()

    expect(state.recurring.map((schedule) => schedule.id)).toEqual([
      'sched-alice-early',
      'sched-alice-late',
      'sched-erin',
    ])
    expect(state.recurring.every((schedule) => !('exceptionMonths' in schedule))).toBe(true)
    expect(state.recurringExceptions).toEqual([{ recurringId: 'sched-alice-late', month: EXCEPTED }])
  })

  it('takes the settings from the subscription record and copies the six collections through', () => {
    const state = ledger()

    expect(state.settings).toEqual({
      startMonth: START,
      currency: CURRENCY,
      locale: LOCALE,
      timeZone: 'Europe/London',
    })
    expect(state.payments).toHaveLength(PAYMENTS.length)
    expect(state.breakMonths).toEqual([BREAK])
    expect(state.members).toHaveLength(6)
  })
})

describe('monthsOfYear', () => {
  it('is always January to December, zero padded', () => {
    expect(monthsOfYear(2026)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
    ])
  })
})

describe('projectPersonYear cells', () => {
  it('keeps two receipts recorded on one day as two entries with their notes and ids intact', () => {
    const cell = cellFor(ledger(), ALICE, '2026-03')

    expect(cell.manualReceipts.map((payment) => payment.id)).toEqual(['pay-alice-first', 'pay-alice-second'])
    expect(cell.manualReceipts.map((payment) => payment.amount)).toEqual([
      ALICE_MARCH_FIRST,
      ALICE_MARCH_SECOND,
    ])
    expect(cell.manualReceipts[0].note).toBe('first half')
    expect(cell.manualReceipts[0].kind).toBe('manual')
  })

  it('carries the counted standing-order receipt with the schedule that owns it, never summed with the receipts', () => {
    const cell = cellFor(ledger(), ALICE, '2026-03')

    expect(cell.assumed).toEqual({ scheduleId: 'sched-alice-late', amount: LATE_RATE })
    expect(cell.charge).toBe(1500)
    expect(cell.chargeStatus).toEqual({ counts: true, reason: null })
  })

  it('reports a month with no price entry yet as unpriced rather than as a zero charge', () => {
    const cell = cellFor(ledger(), ALICE, '2019-02')

    expect(cell.chargeStatus).toEqual({ counts: false, reason: 'unpriced' })
    expect(cell.charge).toBe(0)
    expect(cell.assumed).toEqual({ scheduleId: 'sched-alice-early', amount: EARLY_RATE })
  })

  it('reports a break month as paused for both the charge and the standing order', () => {
    const cell = cellFor(ledger(), ALICE, BREAK)

    expect(cell.chargeStatus).toEqual({ counts: false, reason: 'break-month' })
    expect(cell.assumedStatus).toEqual({ counts: false, reason: 'break-month' })
    expect(cell.assumed).toBeNull()
    expect(cell.schedule?.id).toBe('sched-alice-early')
  })

  it('reports an excepted month as excepted while the charge still counts', () => {
    const cell = cellFor(ledger(), ALICE, EXCEPTED)

    expect(cell.assumedStatus).toEqual({ counts: false, reason: 'excepted' })
    expect(cell.assumed).toBeNull()
    expect(cell.chargeStatus.counts).toBe(true)
    expect(cell.charge).toBe(1500)
  })

  it('reports a month after the current one as not yet elapsed, with no assumed receipt', () => {
    const cell = cellFor(ledger(), ALICE, '2026-11')

    expect(cell.chargeStatus).toEqual({ counts: false, reason: 'not-yet-elapsed' })
    expect(cell.assumedStatus).toEqual({ counts: false, reason: 'not-yet-elapsed' })
    expect(cell.assumed).toBeNull()
    expect(cell.charge).toBe(0)
  })

  it('shows a future-dated receipt in its own receipt month, still uncharged', () => {
    const cell = cellFor(ledger(), ALICE, '2026-12')

    expect(cell.manualReceipts.map((payment) => payment.id)).toEqual(['pay-alice-future'])
    expect(cell.chargeStatus.reason).toBe('not-yet-elapsed')
  })

  it('keeps a receipt visible for a participant whose ranges cover no month at all', () => {
    const state = ledger()
    const dan = projectPersonYear(state, DAN, 2020, CURRENT)
    const march = dan.cells[2]

    expect(dan.hasActiveRange).toBe(false)
    expect(march.manualReceipts.map((payment) => payment.id)).toEqual(['pay-dan'])
    expect(march.chargeStatus).toEqual({ counts: false, reason: 'outside-active-range' })
    expect(dan.charged).toBe(0)
  })

  it('reports every month of a membership gap as outside the active range', () => {
    const bob = projectPersonYear(ledger(), BOB, 2021, CURRENT)

    expect(bob.hasActiveRange).toBe(true)
    expect(bob.cells.every((cell) => cell.chargeStatus.reason === 'outside-active-range')).toBe(true)
    expect(bob.charged).toBe(0)
  })

  it('reports the months after an early leave as outside the active range', () => {
    const cara = projectPersonYear(ledger(), CARA, 2019, CURRENT)

    expect(cara.cells[8].chargeStatus).toEqual({ counts: false, reason: 'outside-active-range' })
    expect(cara.cells[4].manualReceipts.map((payment) => payment.id)).toEqual(['pay-cara'])
  })

  it('has no schedule and no assumed status where no standing order covers the month', () => {
    const cell = cellFor(ledger(), BOB, '2023-02')

    expect(cell.schedule).toBeNull()
    expect(cell.assumedStatus).toBeNull()
    expect(cell.assumed).toBeNull()
    expect(cell.manualReceipts.map((payment) => payment.amount)).toEqual([BOB_LUMP_SUM])
  })

  it('reads the rate of each of two sequential schedules in the months that schedule covers', () => {
    const state = ledger()

    expect(cellFor(state, ALICE, '2022-12').assumed).toEqual({
      scheduleId: 'sched-alice-early',
      amount: EARLY_RATE,
    })
    expect(cellFor(state, ALICE, '2023-01').assumed).toEqual({
      scheduleId: 'sched-alice-late',
      amount: LATE_RATE,
    })
    expect(recurringReceived(state, ALICE, enumerateMonths(START, CURRENT), CURRENT)).toBe(
      47 * EARLY_RATE + 44 * LATE_RATE,
    )
  })
})

describe('projectPersonYear totals', () => {
  it('sums recorded, assumed, charged and unpriced months for the selected year alone', () => {
    const alice = projectPersonYear(ledger(), ALICE, 2026, CURRENT)

    expect(alice.recorded).toBe(ALICE_MARCH_FIRST + ALICE_MARCH_SECOND + ALICE_FUTURE_DATED)
    expect(alice.assumed).toBe(9 * LATE_RATE)
    expect(alice.charged).toBe(9 * 1500)
    expect(alice.unpricedMonths).toBe(0)
  })

  it('counts the months of the year that had no price', () => {
    const alice = projectPersonYear(ledger(), ALICE, 2019, CURRENT)

    expect(alice.unpricedMonths).toBe(3)
    expect(alice.charged).toBe(5 * 800 + 4 * 1000)
    expect(alice.assumed).toBe(12 * EARLY_RATE)
  })

  it('counts a receipt dated in a year after the selected one in that later year', () => {
    const alice = projectPersonYear(ledger(), ALICE, 2027, CURRENT)

    expect(alice.recorded).toBe(ALICE_NEXT_YEAR)
    expect(alice.charged).toBe(0)
    expect(alice.assumed).toBe(0)
  })
})

describe('projectYear', () => {
  it('projects one year per member, in the order the members were given', () => {
    const years = projectYear(ledger(), PARTICIPANTS, 2026, CURRENT)

    expect(years.map((year) => year.memberId)).toEqual(['alice', 'bob', 'cara', 'dan', 'erin'])
    expect(years.every((year) => year.cells.length === 12)).toBe(true)
    expect(years.every((year) => year.year === 2026)).toBe(true)
  })
})

describe('calendarYearRange', () => {
  it('runs from the plan start year to the latest year that holds any record', () => {
    expect(calendarYearRange(ledger(), CURRENT)).toEqual({ first: 2019, last: 2027 })
  })

  it('reaches at least the current year when nothing later is recorded', () => {
    const state = buildSubscriptionState({
      subscription: { startMonth: START, currency: CURRENCY, locale: LOCALE, timeZone: 'Europe/London' },
      members: [ORGANIZER, ALICE],
      prices: [],
      breakMonths: [],
      payments: [],
      schedules: [],
    })

    expect(calendarYearRange(state, CURRENT)).toEqual({ first: 2019, last: 2026 })
  })

  it('reaches the end year of a bounded schedule that outlives the current month', () => {
    const state = buildSubscriptionState({
      subscription: { startMonth: START, currency: CURRENCY, locale: LOCALE, timeZone: 'Europe/London' },
      members: [ORGANIZER, ALICE],
      prices: [],
      breakMonths: [],
      payments: [],
      schedules: [
        {
          id: 'sched-long',
          memberId: 'alice',
          amount: EARLY_RATE,
          startMonth: START,
          endMonth: '2029-12',
          exceptionMonths: [],
        },
      ],
    })

    expect(calendarYearRange(state, CURRENT)).toEqual({ first: 2019, last: 2029 })
  })
})

describe('futureYearPayments', () => {
  it('names only the years after the selected one that hold a receipt, ascending, with counts', () => {
    const state = ledger()

    expect(futureYearPayments(state, 2026)).toEqual([{ year: 2027, count: 1 }])
    expect(futureYearPayments(state, 2019)).toEqual([
      { year: 2020, count: 1 },
      { year: 2023, count: 1 },
      { year: 2026, count: 3 },
      { year: 2027, count: 1 },
    ])
    expect(futureYearPayments(state, 2027)).toEqual([])
  })
})

describe('invariants against the canonical domain outputs', () => {
  const state = ledger()
  const summary = computeSummary(state, CURRENT)
  const allMonths = enumerateMonths(START, CURRENT)

  for (const person of PARTICIPANTS) {
    const years = everyYear(state, person)
    const row = summary.members.find((entry) => entry.memberId === person.id)
    const balance = balanceForMember(state, person, allMonths, CURRENT)
    const charged = years.reduce((total, year) => total + year.charged, 0)
    const assumed = years.reduce((total, year) => total + year.assumed, 0)
    const recorded = years.reduce((total, year) => total + year.recorded, 0)

    it(`charges the same total as the summary for ${person.name}`, () => {
      expect(row).toBeDefined()
      expect(charged).toBe(balance.owed)
      expect(charged).toBe(row?.owed)
    })

    it(`counts the same standing-order receipts as recurringReceived for ${person.name}`, () => {
      expect(assumed).toBe(recurringReceived(state, person, allMonths, CURRENT))
    })

    it(`reaches the summary's paid figure from recorded plus assumed for ${person.name}`, () => {
      expect(recorded + assumed).toBe(row?.paid)
    })

    it(`reaches the summary's balance from paid minus charged for ${person.name}`, () => {
      expect(recorded + assumed - charged).toBe(row?.balance)
    })
  }

  it('never lets a single year subtotal stand for a lifetime balance', () => {
    const alice = summary.members.find((entry) => entry.memberId === 'alice')
    const year = projectPersonYear(state, ALICE, 2026, CURRENT)

    expect(alice?.balance).toBe(-2061)
    expect(year.recorded).not.toBe(alice?.balance)
    expect(year.assumed).not.toBe(alice?.balance)
    expect(year.charged).not.toBe(alice?.balance)
  })

  it('shows a receipt only in the month its date names, never in a month it might settle', () => {
    const appearances: MonthStr[] = []
    for (const year of everyYear(state, ALICE)) {
      for (const cell of year.cells) {
        if (cell.manualReceipts.some((payment) => payment.id === 'pay-alice-future')) {
          appearances.push(cell.month)
        }
      }
    }

    expect(appearances).toEqual(['2026-12'])
  })
})

/**
 * Invariant 6 has its own ledger so that one month holds exactly one manual
 * receipt and one counted assumed receipt at different amounts, and their sum
 * is a figure that appears nowhere else.
 */
const DISTINCT_MANUAL = 700
const DISTINCT_RATE = 300
const FORBIDDEN_SUM = DISTINCT_MANUAL + DISTINCT_RATE

function distinctAmountsLedger(): SubscriptionState {
  return buildSubscriptionState({
    subscription: { startMonth: '2026-01', currency: CURRENCY, locale: LOCALE, timeZone: 'Europe/London' },
    members: [ORGANIZER, member('solo', 'Solo', { activeRanges: [{ joinedMonth: '2026-01', leftMonth: null }] })],
    prices: [{ id: 'price-only', effectiveFrom: '2026-01', amount: 4000 }],
    breakMonths: [],
    payments: [
      { id: 'pay-solo', memberId: 'solo', date: '2026-02-04', amount: DISTINCT_MANUAL, note: '', kind: 'manual' },
    ],
    schedules: [
      {
        id: 'sched-solo',
        memberId: 'solo',
        amount: DISTINCT_RATE,
        startMonth: '2026-01',
        endMonth: null,
        exceptionMonths: [],
      },
    ],
  })
}

function everyNumber(year: PersonYear): number[] {
  const numbers = [year.recorded, year.assumed, year.charged, year.unpricedMonths, year.year]
  for (const cell of year.cells) {
    numbers.push(cell.charge)
    if (cell.assumed !== null) numbers.push(cell.assumed.amount)
    if (cell.schedule !== null) numbers.push(cell.schedule.amount)
    for (const payment of cell.manualReceipts) numbers.push(payment.amount)
  }
  return numbers
}

describe('recorded and assumed money are never added together', () => {
  const state = distinctAmountsLedger()
  const solo = state.members[1]
  const year = projectPersonYear(state, solo, 2026, '2026-03')
  const february = year.cells[1]

  it('keeps the manual receipt and the assumed receipt apart in the cell', () => {
    expect(february.manualReceipts.map((payment) => payment.amount)).toEqual([DISTINCT_MANUAL])
    expect(february.assumed).toEqual({ scheduleId: 'sched-solo', amount: DISTINCT_RATE })
  })

  it('keeps them apart in the year totals', () => {
    expect(year.recorded).toBe(DISTINCT_MANUAL)
    expect(year.assumed).toBe(3 * DISTINCT_RATE)
    expect(year.recorded).not.toBe(FORBIDDEN_SUM)
    expect(year.assumed).not.toBe(FORBIDDEN_SUM)
  })

  it('carries their sum in no numeric field of the projection at all', () => {
    expect(everyNumber(year)).not.toContain(FORBIDDEN_SUM)
  })
})
