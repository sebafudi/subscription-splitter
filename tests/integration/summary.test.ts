import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { insertOwnerlessSubscription, signedInCookie as signedInCookieWithPrefix } from './accounts'
import { addMonth, currentMonth } from '../../src/domain/months'
import type { Summary } from '../../src/domain/types'

/** This file's slice of the rate limiter's client-address space; see `accounts.ts`. */
function signedInCookie(testId: string, email: string): Promise<string> {
  return signedInCookieWithPrefix('10.5.0', testId, email)
}

const TIME_ZONE = 'Europe/Warsaw'

function jsonHeaders(cookie: string): Record<string, string> {
  return { 'content-type': 'application/json', cookie }
}

function summaryUrl(subscriptionId: string): string {
  return `http://example.com/api/subscriptions/${subscriptionId}/summary`
}

async function createPlan(cookie: string, startMonth: string, ownerName = 'Organizer'): Promise<{ id: string }> {
  const res = await SELF.fetch('http://example.com/api/subscriptions', {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify({
      name: 'Family plan',
      currency: 'PLN',
      locale: 'pl-PL',
      time_zone: TIME_ZONE,
      start_month: startMonth,
      owner_name: ownerName,
    }),
  })
  expect(res.status).toBe(201)
  return res.json<{ id: string }>()
}

async function addParticipant(cookie: string, subscriptionId: string, name: string, joinedMonth: string) {
  const res = await SELF.fetch(`http://example.com/api/subscriptions/${subscriptionId}/members`, {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify({ name, active_ranges: [{ joined_month: joinedMonth }] }),
  })
  expect(res.status).toBe(201)
  return res.json<{ id: string }>()
}

async function addPrice(cookie: string, subscriptionId: string, effectiveFrom: string, amount: number) {
  const res = await SELF.fetch(`http://example.com/api/subscriptions/${subscriptionId}/prices`, {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify({ effective_from: effectiveFrom, amount }),
  })
  expect(res.status).toBe(201)
}

async function addBreakMonth(cookie: string, subscriptionId: string, month: string) {
  const res = await SELF.fetch(`http://example.com/api/subscriptions/${subscriptionId}/break-months`, {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify({ month }),
  })
  expect(res.status).toBe(201)
}

async function readSummary(cookie: string, subscriptionId: string): Promise<Summary> {
  const res = await SELF.fetch(summaryUrl(subscriptionId), { headers: { cookie } })
  expect(res.status).toBe(200)
  return res.json<Summary>()
}

describe("the requirements' worked example, read through the API", () => {
  it('splits 100.00 across the owner and two participants as 33.33 each with 33.34 left to the organizer', async () => {
    const cookie = await signedInCookie('1', 'summary-worked-example@example.com')
    const month = currentMonth(TIME_ZONE)

    const plan = await createPlan(cookie, month)
    await addParticipant(cookie, plan.id, 'Alice', month)
    await addParticipant(cookie, plan.id, 'Bob', month)
    await addPrice(cookie, plan.id, month, 10000)

    const summary = await readSummary(cookie, plan.id)

    expect(summary.currentMonth).toBe(month)
    expect(summary.currency).toBe('PLN')
    expect(summary.currentMonthly).toBe(10000)
    expect(summary.currentActiveCount).toBe(3)
    expect(summary.currentPerPersonShare).toBe(3333)
    expect(summary.ownerShareThisMonth).toBe(3334)
    expect(summary.expectedThisMonth).toBe(6666)
    expect(summary.owedToYouNow).toBe(6666)
    expect(summary.totalPlanCost).toBe(10000)

    expect(summary.members).toHaveLength(2)
    for (const member of summary.members) {
      expect(member.currentShare).toBe(3333)
      expect(member.owed).toBe(3333)
      expect(member.paid).toBe(0)
      expect(member.balance).toBe(-3333)
      expect(member.activeThisMonth).toBe(true)
    }

    // Nothing in this test adds an owner: phase 2 made it part of the create,
    // and a POST asking for one is now a 409.
    expect(summary.members.some((member) => member.name === 'Organizer')).toBe(false)
    expect(summary.currentPerPersonShare * 2 + summary.ownerShareThisMonth).toBe(summary.currentMonthly)
  })

  it('follows a price change and a break month across three months', async () => {
    const cookie = await signedInCookie('2', 'summary-price-change@example.com')
    const month = currentMonth(TIME_ZONE)
    const first = addMonth(month, -2)
    const second = addMonth(month, -1)

    const plan = await createPlan(cookie, first)
    await addParticipant(cookie, plan.id, 'Alice', first)
    await addPrice(cookie, plan.id, first, 9000)
    await addPrice(cookie, plan.id, month, 12000)
    await addBreakMonth(cookie, plan.id, second)

    const summary = await readSummary(cookie, plan.id)

    // Two active members throughout: 9000 in the first month splits 4500 each,
    // the middle month is skipped and costs nobody anything, and the current
    // month is on the new price at 6000 each.
    expect(summary.totalPlanCost).toBe(9000 + 0 + 12000)
    expect(summary.currentMonthly).toBe(12000)
    expect(summary.currentPerPersonShare).toBe(6000)
    expect(summary.members).toHaveLength(1)
    expect(summary.members[0].owed).toBe(4500 + 0 + 6000)
    expect(summary.ownerShareThisMonth).toBe(6000)
  })

  it('leaves a departed participant owing for the months they were there and nothing after', async () => {
    const cookie = await signedInCookie('3', 'summary-departure@example.com')
    const month = currentMonth(TIME_ZONE)
    const first = addMonth(month, -1)

    const plan = await createPlan(cookie, first)
    const leaver = await addParticipant(cookie, plan.id, 'Alice', first)
    await SELF.fetch(`http://example.com/api/subscriptions/${plan.id}/members/${leaver.id}`, {
      method: 'PATCH',
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ active_ranges: [{ joined_month: first, left_month: first }] }),
    })
    await addPrice(cookie, plan.id, first, 10000)

    const summary = await readSummary(cookie, plan.id)

    expect(summary.members[0].owed).toBe(5000)
    expect(summary.members[0].activeThisMonth).toBe(false)
    expect(summary.currentActiveCount).toBe(1)
    expect(summary.currentPerPersonShare).toBe(10000)
    expect(summary.ownerShareThisMonth).toBe(10000)
  })
})

describe('the month the summary reports', () => {
  it("comes from the subscription's own time zone, not the machine's", async () => {
    const cookie = await signedInCookie('7', 'summary-time-zone@example.com')
    const farAway = 'Pacific/Auckland'
    const month = currentMonth(farAway)

    const res = await SELF.fetch('http://example.com/api/subscriptions', {
      method: 'POST',
      headers: jsonHeaders(cookie),
      body: JSON.stringify({
        name: 'Antipodean plan',
        currency: 'PLN',
        locale: 'pl-PL',
        time_zone: farAway,
        start_month: month,
      }),
    })
    expect(res.status).toBe(201)
    const plan = await res.json<{ id: string }>()

    // Two zones only disagree about the month for a few hours around a month
    // boundary, so this pins the wiring: the route reads the stored zone. That
    // the rule itself is zone-sensitive is proven against a fixed instant in
    // the unit tests for `currentMonth`.
    expect((await readSummary(cookie, plan.id)).currentMonth).toBe(currentMonth(farAway))
  })
})

async function addSchedule(
  cookie: string,
  subscriptionId: string,
  memberId: string,
  amount: number,
  startMonth: string,
  endMonth: string | null = null,
): Promise<{ id: string }> {
  const res = await SELF.fetch(`http://example.com/api/subscriptions/${subscriptionId}/schedules`, {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify({ member_id: memberId, amount, start_month: startMonth, end_month: endMonth }),
  })
  expect(res.status).toBe(201)
  return res.json<{ id: string }>()
}

async function markUnpaid(cookie: string, subscriptionId: string, scheduleId: string, month: string) {
  const res = await SELF.fetch(
    `http://example.com/api/subscriptions/${subscriptionId}/schedules/${scheduleId}/exceptions/${month}`,
    { method: 'PUT', headers: { cookie } },
  )
  expect(res.status).toBe(204)
}

async function addPayment(cookie: string, subscriptionId: string, memberId: string, date: string, amount: number) {
  const res = await SELF.fetch(`http://example.com/api/subscriptions/${subscriptionId}/payments`, {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify({ member_id: memberId, date, amount }),
  })
  expect(res.status).toBe(201)
}

/** A three-month-old plan priced from its first month, with one participant present throughout. */
async function threeMonthPlan(cookie: string, participantJoins?: string) {
  const month = currentMonth(TIME_ZONE)
  const first = addMonth(month, -2)
  const plan = await createPlan(cookie, first)
  const member = await addParticipant(cookie, plan.id, 'Alice', participantJoins ?? first)
  await addPrice(cookie, plan.id, first, 9000)
  return { planId: plan.id, memberId: member.id, first, middle: addMonth(month, -1), month }
}

describe('assumed receipts read through the API, against stored arrangements', () => {
  it('counts every elapsed month of an arrangement, so three months move the balance by three times the amount', async () => {
    const cookie = await signedInCookie('8', 'summary-recurring-elapsed@example.com')
    const { planId, memberId, first, month } = await threeMonthPlan(cookie)
    await addSchedule(cookie, planId, memberId, 1000, first, month)

    const summary = await readSummary(cookie, planId)
    expect(summary.members.find((m) => m.memberId === memberId)!.paid).toBe(3000)
  })

  it('removes exactly the month marked as not received', async () => {
    const cookie = await signedInCookie('9', 'summary-recurring-exception@example.com')
    const { planId, memberId, first, middle, month } = await threeMonthPlan(cookie)
    const schedule = await addSchedule(cookie, planId, memberId, 1000, first, month)
    await markUnpaid(cookie, planId, schedule.id, middle)

    const summary = await readSummary(cookie, planId)
    expect(summary.members.find((m) => m.memberId === memberId)!.paid).toBe(2000)
  })

  it('removes a break month, and the exception and the break month remove one month each', async () => {
    const cookie = await signedInCookie('10', 'summary-recurring-break@example.com')
    const { planId, memberId, first, middle, month } = await threeMonthPlan(cookie)
    const schedule = await addSchedule(cookie, planId, memberId, 1000, first, month)
    await markUnpaid(cookie, planId, schedule.id, middle)
    await addBreakMonth(cookie, planId, first)

    const summary = await readSummary(cookie, planId)
    expect(summary.members.find((m) => m.memberId === memberId)!.paid).toBe(1000)
  })

  it('counts nothing for a month outside the participant own active range', async () => {
    const cookie = await signedInCookie('11', 'summary-recurring-inactive@example.com')
    const month = currentMonth(TIME_ZONE)
    const { planId, memberId, first } = await threeMonthPlan(cookie, month)
    await addSchedule(cookie, planId, memberId, 1000, first, month)

    const summary = await readSummary(cookie, planId)
    expect(summary.members.find((m) => m.memberId === memberId)!.paid).toBe(1000)
  })

  it('counts elapsed months only for an open-ended arrangement, with nothing for the month ahead', async () => {
    const cookie = await signedInCookie('12', 'summary-recurring-open-ended@example.com')
    const { planId, memberId, first } = await threeMonthPlan(cookie)
    await addSchedule(cookie, planId, memberId, 1000, first, null)

    const summary = await readSummary(cookie, planId)
    expect(summary.members.find((m) => m.memberId === memberId)!.paid).toBe(3000)
  })

  it('adds a manual payment in the current month to the assumed receipt for the same month', async () => {
    const cookie = await signedInCookie('13', 'summary-recurring-collected@example.com')
    const { planId, memberId, first, month } = await threeMonthPlan(cookie)
    await addSchedule(cookie, planId, memberId, 1000, first, month)
    await addPayment(cookie, planId, memberId, `${month}-05`, 2500)

    const summary = await readSummary(cookie, planId)
    expect(summary.collectedThisMonth).toBe(3500)
    expect(summary.members.find((m) => m.memberId === memberId)!.paid).toBe(3000 + 2500)
  })
})

describe('summary ownership and preconditions', () => {
  it('answers 404 for another account and 401 without a cookie', async () => {
    const cookieA = await signedInCookie('4', 'summary-owner-a@example.com')
    const cookieB = await signedInCookie('5', 'summary-owner-b@example.com')
    const plan = await createPlan(cookieA, currentMonth(TIME_ZONE))

    expect((await SELF.fetch(summaryUrl(plan.id), { headers: { cookie: cookieB } })).status).toBe(404)
    expect((await SELF.fetch(summaryUrl(plan.id))).status).toBe(401)
    expect((await SELF.fetch(summaryUrl('does-not-exist'), { headers: { cookie: cookieA } })).status).toBe(404)
  })

  it('answers 409 naming the missing owner for a subscription that predates the owner-on-create rule', async () => {
    const cookie = await signedInCookie('6', 'summary-no-owner@example.com')
    const subscriptionId = await insertOwnerlessSubscription(cookie)

    const res = await SELF.fetch(summaryUrl(subscriptionId), { headers: { cookie } })
    expect(res.status).toBe(409)
    const body = await res.json<{ error: string }>()
    expect(body.error).toContain('owner')
    expect(body.error).toContain('members')
  })
})
