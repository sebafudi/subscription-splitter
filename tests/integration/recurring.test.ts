import { SELF, env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { signedInCookie as signedInCookieWithPrefix } from './accounts'

/** This file's slice of the rate limiter's client-address space; see `accounts.ts`. */
function signedInCookie(testId: string, email: string): Promise<string> {
  return signedInCookieWithPrefix('10.7.0', testId, email)
}

type ScheduleBody = {
  id: string
  memberId: string
  amount: number
  startMonth: string
  endMonth: string | null
  exceptionMonths: string[]
}

type MemberBody = { id: string; name: string; isOwner: boolean }

const planBody = {
  name: 'Family plan',
  currency: 'PLN',
  locale: 'pl-PL',
  time_zone: 'Europe/Warsaw',
  start_month: '2026-01',
}

function jsonHeaders(cookie: string): Record<string, string> {
  return { 'content-type': 'application/json', cookie }
}

function schedulesUrl(subscriptionId: string, scheduleId?: string): string {
  const base = `http://example.com/api/subscriptions/${subscriptionId}/schedules`
  return scheduleId ? `${base}/${scheduleId}` : base
}

function exceptionUrl(subscriptionId: string, scheduleId: string, month: string): string {
  return `${schedulesUrl(subscriptionId, scheduleId)}/exceptions/${month}`
}

async function createPlan(cookie: string, overrides: Record<string, unknown> = {}): Promise<{ id: string }> {
  const res = await SELF.fetch('http://example.com/api/subscriptions', {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify({ ...planBody, ...overrides }),
  })
  expect(res.status).toBe(201)
  return res.json<{ id: string }>()
}

async function createMember(cookie: string, subscriptionId: string, name = 'Alice'): Promise<MemberBody> {
  const res = await SELF.fetch(`http://example.com/api/subscriptions/${subscriptionId}/members`, {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify({ name, active_ranges: [{ joined_month: '2026-01' }] }),
  })
  expect(res.status).toBe(201)
  return res.json<MemberBody>()
}

async function ownerOf(cookie: string, subscriptionId: string): Promise<MemberBody> {
  const res = await SELF.fetch(`http://example.com/api/subscriptions/${subscriptionId}/members`, {
    headers: { cookie },
  })
  const members = await res.json<MemberBody[]>()
  const owner = members.find((member) => member.isOwner)
  if (!owner) throw new Error('the subscription has no owner member')
  return owner
}

async function planWithMember(cookie: string): Promise<{ planId: string; member: MemberBody }> {
  const plan = await createPlan(cookie)
  return { planId: plan.id, member: await createMember(cookie, plan.id) }
}

function postSchedule(cookie: string, subscriptionId: string, body: unknown): Promise<Response> {
  return SELF.fetch(schedulesUrl(subscriptionId), {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify(body),
  })
}

async function createSchedule(cookie: string, subscriptionId: string, body: unknown): Promise<ScheduleBody> {
  const res = await postSchedule(cookie, subscriptionId, body)
  expect(res.status).toBe(201)
  return res.json<ScheduleBody>()
}

function patchSchedule(
  cookie: string,
  subscriptionId: string,
  scheduleId: string,
  body: unknown,
): Promise<Response> {
  return SELF.fetch(schedulesUrl(subscriptionId, scheduleId), {
    method: 'PATCH',
    headers: jsonHeaders(cookie),
    body: JSON.stringify(body),
  })
}

async function listSchedules(cookie: string, subscriptionId: string): Promise<ScheduleBody[]> {
  const res = await SELF.fetch(schedulesUrl(subscriptionId), { headers: { cookie } })
  expect(res.status).toBe(200)
  return res.json<ScheduleBody[]>()
}

async function readSchedule(cookie: string, subscriptionId: string, scheduleId: string): Promise<ScheduleBody> {
  const res = await SELF.fetch(schedulesUrl(subscriptionId, scheduleId), { headers: { cookie } })
  expect(res.status).toBe(200)
  return res.json<ScheduleBody>()
}

describe('standing order round trip', () => {
  it('returns a posted arrangement on a later, separate request with its months and amount intact', async () => {
    const cookie = await signedInCookie('1', 'recurring-round-trip@example.com')
    const { planId, member } = await planWithMember(cookie)

    const created = await createSchedule(cookie, planId, {
      member_id: member.id,
      amount: 1500,
      start_month: '2026-02',
      end_month: '2026-08',
    })

    const read = await readSchedule(cookie, planId, created.id)
    expect(read).toEqual({
      id: created.id,
      memberId: member.id,
      amount: 1500,
      startMonth: '2026-02',
      endMonth: '2026-08',
      exceptionMonths: [],
    })
  })

  it('defaults an absent end month to null and lists by member then start month', async () => {
    const cookie = await signedInCookie('2', 'recurring-order@example.com')
    const { planId, member } = await planWithMember(cookie)
    const second = await createMember(cookie, planId, 'Bob')

    await createSchedule(cookie, planId, { member_id: second.id, amount: 900, start_month: '2026-01', end_month: '2026-03' })
    await createSchedule(cookie, planId, { member_id: member.id, amount: 1000, start_month: '2026-05' })
    await createSchedule(cookie, planId, { member_id: member.id, amount: 800, start_month: '2026-01', end_month: '2026-04' })

    const listed = await listSchedules(cookie, planId)
    expect(listed).toHaveLength(3)
    expect(listed.filter((s) => s.memberId === member.id).map((s) => s.startMonth)).toEqual(['2026-01', '2026-05'])
    expect(listed.find((s) => s.startMonth === '2026-05')!.endMonth).toBeNull()
  })

  it('deletes an arrangement, and a following read answers 404 with its exceptions gone', async () => {
    const cookie = await signedInCookie('3', 'recurring-delete@example.com')
    const { planId, member } = await planWithMember(cookie)
    const schedule = await createSchedule(cookie, planId, {
      member_id: member.id,
      amount: 1000,
      start_month: '2026-01',
      end_month: '2026-06',
    })
    expect((await SELF.fetch(exceptionUrl(planId, schedule.id, '2026-03'), { method: 'PUT', headers: { cookie } })).status).toBe(204)

    const deleted = await SELF.fetch(schedulesUrl(planId, schedule.id), { method: 'DELETE', headers: { cookie } })
    expect(deleted.status).toBe(204)
    expect((await SELF.fetch(schedulesUrl(planId, schedule.id), { headers: { cookie } })).status).toBe(404)
    expect(await listSchedules(cookie, planId)).toHaveLength(0)

    // Read straight from the table: an orphaned exception row is invisible to
    // both reads above, because each one goes through the schedule that is gone.
    const orphans = await env.DB.prepare('select count(*) as n from recurring_exceptions where schedule_id = ?')
      .bind(schedule.id)
      .first<{ n: number }>()
    expect(orphans?.n).toBe(0)
  })
})

describe('the overlap rule', () => {
  it('refuses a second arrangement overlapping the first for the same member, and leaves the first alone', async () => {
    const cookie = await signedInCookie('4', 'recurring-overlap@example.com')
    const { planId, member } = await planWithMember(cookie)
    await createSchedule(cookie, planId, { member_id: member.id, amount: 1000, start_month: '2026-01', end_month: '2026-06' })

    const res = await postSchedule(cookie, planId, {
      member_id: member.id,
      amount: 2000,
      start_month: '2026-04',
      end_month: '2026-09',
    })
    expect(res.status).toBe(409)
    // Naming the rule and the arrangement it conflicts with, rather than a 500
    // escaping from a constraint SQLite cannot express in the first place.
    const refusal = await res.json<{ error: string; conflict?: { id: string; startMonth: string } }>()
    expect(refusal.error).toContain('same month')
    expect(refusal.conflict?.startMonth).toBe('2026-01')

    const listed = await listSchedules(cookie, planId)
    expect(listed).toHaveLength(1)
    expect(listed[0].amount).toBe(1000)
  })

  it('treats two arrangements touching in one month as an overlap, and a clean gap as no overlap', async () => {
    const cookie = await signedInCookie('5', 'recurring-touching@example.com')
    const { planId, member } = await planWithMember(cookie)
    await createSchedule(cookie, planId, { member_id: member.id, amount: 1000, start_month: '2026-01', end_month: '2026-06' })

    const touching = await postSchedule(cookie, planId, { member_id: member.id, amount: 500, start_month: '2026-06' })
    expect(touching.status).toBe(409)

    await createSchedule(cookie, planId, { member_id: member.id, amount: 500, start_month: '2026-07' })
    expect(await listSchedules(cookie, planId)).toHaveLength(2)
  })

  it('lets a different member hold an arrangement covering the same months', async () => {
    const cookie = await signedInCookie('6', 'recurring-other-member@example.com')
    const { planId, member } = await planWithMember(cookie)
    const second = await createMember(cookie, planId, 'Bob')

    await createSchedule(cookie, planId, { member_id: member.id, amount: 1000, start_month: '2026-01' })
    await createSchedule(cookie, planId, { member_id: second.id, amount: 1000, start_month: '2026-01' })
    expect(await listSchedules(cookie, planId)).toHaveLength(2)
  })

  it('lets an edit move an arrangement clear of another, and refuses one that moves it onto another', async () => {
    const cookie = await signedInCookie('7', 'recurring-edit-overlap@example.com')
    const { planId, member } = await planWithMember(cookie)
    const first = await createSchedule(cookie, planId, { member_id: member.id, amount: 1000, start_month: '2026-01', end_month: '2026-03' })
    const second = await createSchedule(cookie, planId, { member_id: member.id, amount: 2000, start_month: '2026-06', end_month: '2026-09' })

    // Widening the first up to the month before the second starts is fine.
    expect((await patchSchedule(cookie, planId, first.id, { end_month: '2026-05' })).status).toBe(200)
    // Widening it into the second is not.
    expect((await patchSchedule(cookie, planId, first.id, { end_month: '2026-07' })).status).toBe(409)

    expect((await readSchedule(cookie, planId, first.id)).endMonth).toBe('2026-05')
    expect((await readSchedule(cookie, planId, second.id)).startMonth).toBe('2026-06')
  })

  it('reads the overlap for the merged member, so moving onto an occupied participant returns 409', async () => {
    const cookie = await signedInCookie('8', 'recurring-merged-member@example.com')
    const { planId, member } = await planWithMember(cookie)
    const second = await createMember(cookie, planId, 'Bob')

    const mine = await createSchedule(cookie, planId, { member_id: member.id, amount: 1000, start_month: '2026-01', end_month: '2026-06' })
    await createSchedule(cookie, planId, { member_id: second.id, amount: 2000, start_month: '2026-03' })

    const res = await patchSchedule(cookie, planId, mine.id, { member_id: second.id })
    expect(res.status).toBe(409)
    expect((await readSchedule(cookie, planId, mine.id)).memberId).toBe(member.id)
  })

  it('accepts an edit that does not collide with the arrangement own stored row', async () => {
    const cookie = await signedInCookie('9', 'recurring-self-overlap@example.com')
    const { planId, member } = await planWithMember(cookie)
    const only = await createSchedule(cookie, planId, { member_id: member.id, amount: 1000, start_month: '2026-01', end_month: '2026-06' })

    expect((await patchSchedule(cookie, planId, only.id, { amount: 1200 })).status).toBe(200)
    expect((await readSchedule(cookie, planId, only.id)).amount).toBe(1200)
  })
})

describe('standing order validation at the route', () => {
  it('refuses an arrangement naming the owner member, on create and on patch alike', async () => {
    const cookie = await signedInCookie('10', 'recurring-owner@example.com')
    const { planId, member } = await planWithMember(cookie)
    const owner = await ownerOf(cookie, planId)

    const created = await postSchedule(cookie, planId, { member_id: owner.id, amount: 1000, start_month: '2026-01' })
    expect(created.status).toBe(400)
    expect((await created.json<{ field?: string }>()).field).toBe('member_id')

    const mine = await createSchedule(cookie, planId, { member_id: member.id, amount: 1000, start_month: '2026-01' })
    const moved = await patchSchedule(cookie, planId, mine.id, { member_id: owner.id })
    expect(moved.status).toBe(400)
    expect((await moved.json<{ field?: string }>()).field).toBe('member_id')
    expect((await readSchedule(cookie, planId, mine.id)).memberId).toBe(member.id)
  })

  it('refuses a start month before the plan first month and an end month before the start', async () => {
    const cookie = await signedInCookie('11', 'recurring-months@example.com')
    const { planId, member } = await planWithMember(cookie)

    const early = await postSchedule(cookie, planId, { member_id: member.id, amount: 1000, start_month: '2025-12' })
    expect(early.status).toBe(400)
    expect((await early.json<{ field?: string }>()).field).toBe('start_month')

    const reversed = await postSchedule(cookie, planId, {
      member_id: member.id,
      amount: 1000,
      start_month: '2026-05',
      end_month: '2026-02',
    })
    expect(reversed.status).toBe(400)
    expect((await reversed.json<{ field?: string }>()).field).toBe('end_month')
  })

  it('judges the month ordering on the merged row rather than on the patch body', async () => {
    const cookie = await signedInCookie('12', 'recurring-merged-months@example.com')
    const { planId, member } = await planWithMember(cookie)
    const schedule = await createSchedule(cookie, planId, {
      member_id: member.id,
      amount: 1000,
      start_month: '2026-04',
      end_month: '2026-09',
    })

    const res = await patchSchedule(cookie, planId, schedule.id, { end_month: '2026-02' })
    expect(res.status).toBe(400)
    expect((await res.json<{ field?: string }>()).field).toBe('end_month')
    expect((await readSchedule(cookie, planId, schedule.id)).endMonth).toBe('2026-09')
  })

  it('reopens an arrangement when the patch sets the end month to null', async () => {
    const cookie = await signedInCookie('13', 'recurring-reopen@example.com')
    const { planId, member } = await planWithMember(cookie)
    const schedule = await createSchedule(cookie, planId, {
      member_id: member.id,
      amount: 1000,
      start_month: '2026-01',
      end_month: '2026-03',
    })

    expect((await patchSchedule(cookie, planId, schedule.id, { end_month: null })).status).toBe(200)
    expect((await readSchedule(cookie, planId, schedule.id)).endMonth).toBeNull()
  })

  it('refuses a patch naming a field outside the four columns, and an empty patch body', async () => {
    const cookie = await signedInCookie('14', 'recurring-bad-patch@example.com')
    const { planId, member } = await planWithMember(cookie)
    const schedule = await createSchedule(cookie, planId, { member_id: member.id, amount: 1000, start_month: '2026-01' })

    // A strict-object violation has no path, so the key is named in the message
    // rather than in `field`, which is the shape every other module here returns.
    const unknown = await patchSchedule(cookie, planId, schedule.id, { exception_months: ['2026-02'] })
    expect(unknown.status).toBe(400)
    expect((await unknown.json<{ error: string }>()).error).toContain('exception_months')

    const empty = await SELF.fetch(schedulesUrl(planId, schedule.id), {
      method: 'PATCH',
      headers: jsonHeaders(cookie),
      body: '{}',
    })
    expect(empty.status).toBe(400)
  })
})

describe('the unpaid toggle', () => {
  it('marks a month unpaid, is idempotent, and shows the month once in a following read', async () => {
    const cookie = await signedInCookie('15', 'recurring-exception-put@example.com')
    const { planId, member } = await planWithMember(cookie)
    const schedule = await createSchedule(cookie, planId, {
      member_id: member.id,
      amount: 1000,
      start_month: '2026-01',
      end_month: '2026-06',
    })

    const first = await SELF.fetch(exceptionUrl(planId, schedule.id, '2026-03'), { method: 'PUT', headers: { cookie } })
    expect(first.status).toBe(204)
    const again = await SELF.fetch(exceptionUrl(planId, schedule.id, '2026-03'), { method: 'PUT', headers: { cookie } })
    expect(again.status).toBe(204)

    expect((await readSchedule(cookie, planId, schedule.id)).exceptionMonths).toEqual(['2026-03'])
  })

  it('unmarks a month, is idempotent at that end too, and the month is gone afterwards', async () => {
    const cookie = await signedInCookie('16', 'recurring-exception-delete@example.com')
    const { planId, member } = await planWithMember(cookie)
    const schedule = await createSchedule(cookie, planId, {
      member_id: member.id,
      amount: 1000,
      start_month: '2026-01',
      end_month: '2026-06',
    })
    await SELF.fetch(exceptionUrl(planId, schedule.id, '2026-03'), { method: 'PUT', headers: { cookie } })

    const first = await SELF.fetch(exceptionUrl(planId, schedule.id, '2026-03'), { method: 'DELETE', headers: { cookie } })
    expect(first.status).toBe(204)
    const again = await SELF.fetch(exceptionUrl(planId, schedule.id, '2026-03'), { method: 'DELETE', headers: { cookie } })
    expect(again.status).toBe(204)

    expect((await readSchedule(cookie, planId, schedule.id)).exceptionMonths).toEqual([])
  })

  it('refuses a month outside the arrangement range and a malformed month', async () => {
    const cookie = await signedInCookie('17', 'recurring-exception-range@example.com')
    const { planId, member } = await planWithMember(cookie)
    const schedule = await createSchedule(cookie, planId, {
      member_id: member.id,
      amount: 1000,
      start_month: '2026-02',
      end_month: '2026-04',
    })

    expect((await SELF.fetch(exceptionUrl(planId, schedule.id, '2026-01'), { method: 'PUT', headers: { cookie } })).status).toBe(400)
    expect((await SELF.fetch(exceptionUrl(planId, schedule.id, '2026-05'), { method: 'PUT', headers: { cookie } })).status).toBe(400)
    expect((await SELF.fetch(exceptionUrl(planId, schedule.id, '2026-13'), { method: 'PUT', headers: { cookie } })).status).toBe(400)
    expect((await SELF.fetch(exceptionUrl(planId, schedule.id, 'nonsense'), { method: 'DELETE', headers: { cookie } })).status).toBe(400)
  })

  it('drops the exceptions a narrowed range no longer contains, in the same write as the edit', async () => {
    const cookie = await signedInCookie('18', 'recurring-narrowed@example.com')
    const { planId, member } = await planWithMember(cookie)
    const schedule = await createSchedule(cookie, planId, {
      member_id: member.id,
      amount: 1000,
      start_month: '2026-01',
      end_month: '2026-08',
    })
    for (const month of ['2026-02', '2026-07']) {
      expect((await SELF.fetch(exceptionUrl(planId, schedule.id, month), { method: 'PUT', headers: { cookie } })).status).toBe(204)
    }
    expect((await readSchedule(cookie, planId, schedule.id)).exceptionMonths).toEqual(['2026-02', '2026-07'])

    expect((await patchSchedule(cookie, planId, schedule.id, { end_month: '2026-04' })).status).toBe(200)
    expect((await readSchedule(cookie, planId, schedule.id)).exceptionMonths).toEqual(['2026-02'])

    // Widening it again does not resurrect the correction made against the old range.
    expect((await patchSchedule(cookie, planId, schedule.id, { end_month: '2026-08' })).status).toBe(200)
    expect((await readSchedule(cookie, planId, schedule.id)).exceptionMonths).toEqual(['2026-02'])
  })

  it('drops them on the start-month side of the range too, and lowering the start does not bring one back', async () => {
    const cookie = await signedInCookie('23', 'recurring-narrowed-start@example.com')
    const { planId, member } = await planWithMember(cookie)
    const schedule = await createSchedule(cookie, planId, {
      member_id: member.id,
      amount: 1000,
      start_month: '2026-01',
      end_month: '2026-08',
    })
    for (const month of ['2026-02', '2026-07']) {
      expect((await SELF.fetch(exceptionUrl(planId, schedule.id, month), { method: 'PUT', headers: { cookie } })).status).toBe(204)
    }

    expect((await patchSchedule(cookie, planId, schedule.id, { start_month: '2026-05' })).status).toBe(200)
    expect((await readSchedule(cookie, planId, schedule.id)).exceptionMonths).toEqual(['2026-07'])

    expect((await patchSchedule(cookie, planId, schedule.id, { start_month: '2026-01' })).status).toBe(200)
    expect((await readSchedule(cookie, planId, schedule.id)).exceptionMonths).toEqual(['2026-07'])
  })
})

describe('standing order ownership', () => {
  it('hides one account arrangements from another on every verb, including through a foreign parent', async () => {
    const cookieA = await signedInCookie('19', 'recurring-owner-a@example.com')
    const cookieB = await signedInCookie('20', 'recurring-owner-b@example.com')

    const a = await planWithMember(cookieA)
    const b = await planWithMember(cookieB)
    const schedule = await createSchedule(cookieA, a.planId, {
      member_id: a.member.id,
      amount: 1000,
      start_month: '2026-01',
      end_month: '2026-06',
    })

    expect((await SELF.fetch(schedulesUrl(a.planId), { headers: { cookie: cookieB } })).status).toBe(404)
    expect((await SELF.fetch(schedulesUrl(a.planId, schedule.id), { headers: { cookie: cookieB } })).status).toBe(404)
    expect((await postSchedule(cookieB, a.planId, { member_id: a.member.id, amount: 1, start_month: '2026-01' })).status).toBe(404)
    expect((await patchSchedule(cookieB, a.planId, schedule.id, { amount: 1 })).status).toBe(404)
    expect((await SELF.fetch(schedulesUrl(a.planId, schedule.id), { method: 'DELETE', headers: { cookie: cookieB } })).status).toBe(404)
    expect((await SELF.fetch(exceptionUrl(a.planId, schedule.id, '2026-03'), { method: 'PUT', headers: { cookie: cookieB } })).status).toBe(404)
    expect((await SELF.fetch(exceptionUrl(a.planId, schedule.id, '2026-03'), { method: 'DELETE', headers: { cookie: cookieB } })).status).toBe(404)

    // The wrong-parent case: B's own subscription id with A's member id.
    expect((await postSchedule(cookieB, b.planId, { member_id: a.member.id, amount: 1, start_month: '2026-01' })).status).toBe(404)

    const survivors = await listSchedules(cookieA, a.planId)
    expect(survivors).toHaveLength(1)
    expect(survivors[0].amount).toBe(1000)
  })

  it("refuses an arrangement named through the caller's own other subscription", async () => {
    const cookie = await signedInCookie('21', 'recurring-wrong-parent@example.com')
    const { planId, member } = await planWithMember(cookie)
    const second = await createPlan(cookie, { name: 'Second plan' })
    const schedule = await createSchedule(cookie, planId, { member_id: member.id, amount: 1000, start_month: '2026-01' })

    expect((await SELF.fetch(schedulesUrl(second.id, schedule.id), { headers: { cookie } })).status).toBe(404)
    expect((await patchSchedule(cookie, second.id, schedule.id, { amount: 2 })).status).toBe(404)
    expect((await SELF.fetch(schedulesUrl(second.id, schedule.id), { method: 'DELETE', headers: { cookie } })).status).toBe(404)
    expect((await SELF.fetch(exceptionUrl(second.id, schedule.id, '2026-02'), { method: 'PUT', headers: { cookie } })).status).toBe(404)
    expect(await listSchedules(cookie, planId)).toHaveLength(1)
  })

  it('returns 401 from every standing-order route without a session cookie', async () => {
    const calls: Array<[string, RequestInit]> = [
      [schedulesUrl('any'), {}],
      [schedulesUrl('any'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }],
      [schedulesUrl('any', 'any-schedule'), {}],
      [schedulesUrl('any', 'any-schedule'), { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: '{}' }],
      [schedulesUrl('any', 'any-schedule'), { method: 'DELETE' }],
      [exceptionUrl('any', 'any-schedule', '2026-01'), { method: 'PUT' }],
      [exceptionUrl('any', 'any-schedule', '2026-01'), { method: 'DELETE' }],
    ]

    for (const [url, init] of calls) {
      const res = await SELF.fetch(url, init)
      expect(res.status, `${init.method ?? 'GET'} ${url}`).toBe(401)
    }
  })
})

describe('standing orders against the rest of the subscription', () => {
  it('refuses to delete a member who has an arrangement, and the arrangement survives', async () => {
    const cookie = await signedInCookie('22', 'recurring-member-delete@example.com')
    const { planId, member } = await planWithMember(cookie)
    await createSchedule(cookie, planId, { member_id: member.id, amount: 1000, start_month: '2026-01' })

    const res = await SELF.fetch(`http://example.com/api/subscriptions/${planId}/members/${member.id}`, {
      method: 'DELETE',
      headers: { cookie },
    })
    expect(res.status).toBe(409)
    expect(await listSchedules(cookie, planId)).toHaveLength(1)
  })
})
