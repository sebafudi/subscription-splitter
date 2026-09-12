import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { signedInCookie as signedInCookieWithPrefix } from './accounts'

/** This file's slice of the rate limiter's client-address space; see `accounts.ts`. */
function signedInCookie(testId: string, email: string): Promise<string> {
  return signedInCookieWithPrefix('10.6.0', testId, email)
}

type PaymentBody = {
  id: string
  memberId: string
  date: string
  amount: number
  note: string
  kind: 'manual' | 'annual'
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

function paymentsUrl(subscriptionId: string, paymentId?: string): string {
  const base = `http://example.com/api/subscriptions/${subscriptionId}/payments`
  return paymentId ? `${base}/${paymentId}` : base
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

/** A plan with its own participant, which is what almost every case below starts from. */
async function planWithMember(cookie: string): Promise<{ planId: string; member: MemberBody }> {
  const plan = await createPlan(cookie)
  return { planId: plan.id, member: await createMember(cookie, plan.id) }
}

function postPayment(cookie: string, subscriptionId: string, body: unknown): Promise<Response> {
  return SELF.fetch(paymentsUrl(subscriptionId), {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify(body),
  })
}

async function createPayment(cookie: string, subscriptionId: string, body: unknown): Promise<PaymentBody> {
  const res = await postPayment(cookie, subscriptionId, body)
  expect(res.status).toBe(201)
  return res.json<PaymentBody>()
}

async function listPayments(cookie: string, subscriptionId: string, query = ''): Promise<PaymentBody[]> {
  const res = await SELF.fetch(`${paymentsUrl(subscriptionId)}${query}`, { headers: { cookie } })
  expect(res.status).toBe(200)
  return res.json<PaymentBody[]>()
}

describe('payment round trip', () => {
  it('returns a posted payment on a later, separate request with every field intact', async () => {
    const cookie = await signedInCookie('1', 'payments-round-trip@example.com')
    const { planId, member } = await planWithMember(cookie)

    const created = await createPayment(cookie, planId, {
      member_id: member.id,
      date: '2026-01-15',
      amount: 2000,
      note: 'January transfer',
      kind: 'annual',
    })

    const readRes = await SELF.fetch(paymentsUrl(planId, created.id), { headers: { cookie } })
    expect(readRes.status).toBe(200)
    const read = await readRes.json<PaymentBody>()
    expect(read).toEqual({
      id: created.id,
      memberId: member.id,
      date: '2026-01-15',
      amount: 2000,
      note: 'January transfer',
      kind: 'annual',
    })
  })

  it('lists the newest payment first and defaults the note and the kind', async () => {
    const cookie = await signedInCookie('2', 'payments-order@example.com')
    const { planId, member } = await planWithMember(cookie)

    await createPayment(cookie, planId, { member_id: member.id, date: '2026-01-10', amount: 1000 })
    await createPayment(cookie, planId, { member_id: member.id, date: '2026-03-10', amount: 3000 })

    const listed = await listPayments(cookie, planId)
    expect(listed.map((payment) => payment.date)).toEqual(['2026-03-10', '2026-01-10'])
    expect(listed[1]).toMatchObject({ note: '', kind: 'manual' })
  })

  it('filters the list by member, and answers 404 for a member of another subscription', async () => {
    const cookie = await signedInCookie('3', 'payments-member-filter@example.com')
    const { planId, member } = await planWithMember(cookie)
    const second = await createMember(cookie, planId, 'Bob')
    const otherPlan = await createPlan(cookie, { name: 'Second plan' })
    const outsider = await createMember(cookie, otherPlan.id, 'Carol')

    await createPayment(cookie, planId, { member_id: member.id, date: '2026-01-10', amount: 1000 })
    await createPayment(cookie, planId, { member_id: second.id, date: '2026-01-11', amount: 2000 })

    const filtered = await listPayments(cookie, planId, `?memberId=${member.id}`)
    expect(filtered.map((payment) => payment.amount)).toEqual([1000])

    const foreign = await SELF.fetch(`${paymentsUrl(planId)}?memberId=${outsider.id}`, { headers: { cookie } })
    expect(foreign.status).toBe(404)
  })

  it('edits an amount, reads the new one back, then deletes and answers 404 afterwards', async () => {
    const cookie = await signedInCookie('4', 'payments-edit-delete@example.com')
    const { planId, member } = await planWithMember(cookie)
    const payment = await createPayment(cookie, planId, { member_id: member.id, date: '2026-01-15', amount: 2000 })

    const patchRes = await SELF.fetch(paymentsUrl(planId, payment.id), {
      method: 'PATCH',
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ amount: 3500 }),
    })
    expect(patchRes.status).toBe(200)
    expect((await patchRes.json<PaymentBody>()).amount).toBe(3500)
    expect((await listPayments(cookie, planId))[0].amount).toBe(3500)

    const deleteRes = await SELF.fetch(paymentsUrl(planId, payment.id), { method: 'DELETE', headers: { cookie } })
    expect(deleteRes.status).toBe(204)
    expect((await SELF.fetch(paymentsUrl(planId, payment.id), { headers: { cookie } })).status).toBe(404)
    expect(await listPayments(cookie, planId)).toHaveLength(0)
  })
})

describe('payment validation at the route', () => {
  it('refuses a date before the subscription first month with 400 naming the date, and stores nothing', async () => {
    const cookie = await signedInCookie('5', 'payments-before-start@example.com')
    const { planId, member } = await planWithMember(cookie)

    const res = await postPayment(cookie, planId, { member_id: member.id, date: '2025-12-31', amount: 2000 })
    expect(res.status).toBe(400)
    expect((await res.json<{ field?: string }>()).field).toBe('date')
    expect(await listPayments(cookie, planId)).toHaveLength(0)
  })

  it('accepts a future-dated payment, which counts as credit now', async () => {
    const cookie = await signedInCookie('6', 'payments-future@example.com')
    const { planId, member } = await planWithMember(cookie)

    await createPayment(cookie, planId, { member_id: member.id, date: '2031-07-04', amount: 2000 })
    expect(await listPayments(cookie, planId)).toHaveLength(1)
  })

  it('refuses a day that does not exist, which the database pattern alone would admit', async () => {
    const cookie = await signedInCookie('7', 'payments-impossible-day@example.com')
    const { planId, member } = await planWithMember(cookie)

    const res = await postPayment(cookie, planId, { member_id: member.id, date: '2025-02-30', amount: 2000 })
    expect(res.status).toBe(400)
    expect((await res.json<{ field?: string }>()).field).toBe('date')
  })

  it('refuses a payment naming the owner member with 400 naming the member field', async () => {
    const cookie = await signedInCookie('8', 'payments-owner@example.com')
    const plan = await createPlan(cookie)
    const owner = await ownerOf(cookie, plan.id)

    const res = await postPayment(cookie, plan.id, { member_id: owner.id, date: '2026-01-15', amount: 2000 })
    expect(res.status).toBe(400)
    expect((await res.json<{ field?: string }>()).field).toBe('member_id')
    expect(await listPayments(cookie, plan.id)).toHaveLength(0)
  })

  it('refuses a zero amount, a negative amount, an unknown key and an empty patch body', async () => {
    const cookie = await signedInCookie('9', 'payments-bad-bodies@example.com')
    const { planId, member } = await planWithMember(cookie)
    const payment = await createPayment(cookie, planId, { member_id: member.id, date: '2026-01-15', amount: 2000 })

    expect((await postPayment(cookie, planId, { member_id: member.id, date: '2026-01-15', amount: 0 })).status).toBe(400)
    expect((await postPayment(cookie, planId, { member_id: member.id, date: '2026-01-15', amount: -5 })).status).toBe(
      400,
    )
    expect(
      (await postPayment(cookie, planId, { member_id: member.id, date: '2026-01-15', amount: 10, nope: true })).status,
    ).toBe(400)

    const emptyPatch = await SELF.fetch(paymentsUrl(planId, payment.id), {
      method: 'PATCH',
      headers: jsonHeaders(cookie),
      body: '{}',
    })
    expect(emptyPatch.status).toBe(400)
  })

  it('re-runs the date and owner rules on a patch', async () => {
    const cookie = await signedInCookie('10', 'payments-patch-rules@example.com')
    const { planId, member } = await planWithMember(cookie)
    const owner = await ownerOf(cookie, planId)
    const payment = await createPayment(cookie, planId, { member_id: member.id, date: '2026-01-15', amount: 2000 })

    const badDate = await SELF.fetch(paymentsUrl(planId, payment.id), {
      method: 'PATCH',
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ date: '2025-11-01' }),
    })
    expect(badDate.status).toBe(400)
    expect((await badDate.json<{ field?: string }>()).field).toBe('date')

    const ontoOwner = await SELF.fetch(paymentsUrl(planId, payment.id), {
      method: 'PATCH',
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ member_id: owner.id }),
    })
    expect(ontoOwner.status).toBe(400)
    expect((await ontoOwner.json<{ field?: string }>()).field).toBe('member_id')

    expect((await listPayments(cookie, planId))[0]).toMatchObject({ date: '2026-01-15', memberId: member.id })
  })
})

describe('payment ownership', () => {
  it('hides one account payments from another on every verb, including through a foreign parent', async () => {
    const cookieA = await signedInCookie('11', 'payments-owner-a@example.com')
    const cookieB = await signedInCookie('12', 'payments-owner-b@example.com')

    const a = await planWithMember(cookieA)
    const b = await planWithMember(cookieB)
    const payment = await createPayment(cookieA, a.planId, {
      member_id: a.member.id,
      date: '2026-01-15',
      amount: 2000,
    })

    expect((await SELF.fetch(paymentsUrl(a.planId), { headers: { cookie: cookieB } })).status).toBe(404)
    expect((await SELF.fetch(paymentsUrl(a.planId, payment.id), { headers: { cookie: cookieB } })).status).toBe(404)
    expect(
      (await postPayment(cookieB, a.planId, { member_id: a.member.id, date: '2026-01-15', amount: 100 })).status,
    ).toBe(404)
    expect(
      (
        await SELF.fetch(paymentsUrl(a.planId, payment.id), {
          method: 'PATCH',
          headers: jsonHeaders(cookieB),
          body: JSON.stringify({ amount: 1 }),
        })
      ).status,
    ).toBe(404)
    expect(
      (await SELF.fetch(paymentsUrl(a.planId, payment.id), { method: 'DELETE', headers: { cookie: cookieB } })).status,
    ).toBe(404)

    // The wrong-parent case: B's own subscription id with A's member id.
    expect(
      (await postPayment(cookieB, b.planId, { member_id: a.member.id, date: '2026-01-15', amount: 100 })).status,
    ).toBe(404)

    expect(await listPayments(cookieA, a.planId)).toHaveLength(1)
  })

  it("refuses a payment named through the caller's own other subscription", async () => {
    const cookie = await signedInCookie('13', 'payments-wrong-parent@example.com')
    const { planId, member } = await planWithMember(cookie)
    const second = await createPlan(cookie, { name: 'Second plan' })
    const payment = await createPayment(cookie, planId, { member_id: member.id, date: '2026-01-15', amount: 2000 })

    expect((await SELF.fetch(paymentsUrl(second.id, payment.id), { headers: { cookie } })).status).toBe(404)
    expect(
      (await SELF.fetch(paymentsUrl(second.id, payment.id), { method: 'DELETE', headers: { cookie } })).status,
    ).toBe(404)
    expect(await listPayments(cookie, planId)).toHaveLength(1)
  })

  it('returns 401 from every payment route without a session cookie', async () => {
    const calls: Array<[string, RequestInit]> = [
      [paymentsUrl('any'), {}],
      [paymentsUrl('any'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }],
      [paymentsUrl('any', 'any-payment'), {}],
      [
        paymentsUrl('any', 'any-payment'),
        { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: '{}' },
      ],
      [paymentsUrl('any', 'any-payment'), { method: 'DELETE' }],
    ]

    for (const [url, init] of calls) {
      const res = await SELF.fetch(url, init)
      expect(res.status, `${init.method ?? 'GET'} ${url}`).toBe(401)
    }
  })
})

describe('payments against the rest of the subscription', () => {
  it('refuses to delete a member who has a payment, and the payment survives', async () => {
    const cookie = await signedInCookie('14', 'payments-member-delete@example.com')
    const { planId, member } = await planWithMember(cookie)
    await createPayment(cookie, planId, { member_id: member.id, date: '2026-01-15', amount: 2000 })

    const res = await SELF.fetch(`http://example.com/api/subscriptions/${planId}/members/${member.id}`, {
      method: 'DELETE',
      headers: { cookie },
    })
    expect(res.status).toBe(409)
    expect(await listPayments(cookie, planId)).toHaveLength(1)
  })

  it('moves the balance in the summary by exactly the amount paid', async () => {
    const cookie = await signedInCookie('15', 'payments-summary@example.com')
    const { planId, member } = await planWithMember(cookie)
    await createMember(cookie, planId, 'Bob')
    await SELF.fetch(`http://example.com/api/subscriptions/${planId}/prices`, {
      method: 'POST',
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ effective_from: '2026-01', amount: 10000 }),
    })

    const before = await (
      await SELF.fetch(`http://example.com/api/subscriptions/${planId}/summary`, { headers: { cookie } })
    ).json<{ members: { memberId: string; balance: number; paid: number }[] }>()
    const balanceBefore = before.members.find((m) => m.memberId === member.id)!.balance

    await createPayment(cookie, planId, { member_id: member.id, date: '2026-01-15', amount: 2000 })

    const after = await (
      await SELF.fetch(`http://example.com/api/subscriptions/${planId}/summary`, { headers: { cookie } })
    ).json<{ members: { memberId: string; balance: number; paid: number }[] }>()
    const paying = after.members.find((m) => m.memberId === member.id)!
    expect(paying.paid).toBe(2000)
    expect(paying.balance).toBe(balanceBefore + 2000)
  })
})
