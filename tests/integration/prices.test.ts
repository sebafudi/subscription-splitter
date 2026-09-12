import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { signedInCookie as signedInCookieWithPrefix } from './accounts'

/** This file's slice of the rate limiter's client-address space; see `accounts.ts`. */
function signedInCookie(testId: string, email: string): Promise<string> {
  return signedInCookieWithPrefix('10.4.0', testId, email)
}

type PriceBody = { id: string; effectiveFrom: string; amount: number }

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

function pricesUrl(subscriptionId: string, priceId?: string): string {
  const base = `http://example.com/api/subscriptions/${subscriptionId}/prices`
  return priceId ? `${base}/${priceId}` : base
}

function breaksUrl(subscriptionId: string, month?: string): string {
  const base = `http://example.com/api/subscriptions/${subscriptionId}/break-months`
  return month ? `${base}/${month}` : base
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

function postPrice(cookie: string, subscriptionId: string, body: unknown): Promise<Response> {
  return SELF.fetch(pricesUrl(subscriptionId), {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify(body),
  })
}

async function createPrice(cookie: string, subscriptionId: string, body: unknown): Promise<PriceBody> {
  const res = await postPrice(cookie, subscriptionId, body)
  expect(res.status).toBe(201)
  return res.json<PriceBody>()
}

function postBreak(cookie: string, subscriptionId: string, body: unknown): Promise<Response> {
  return SELF.fetch(breaksUrl(subscriptionId), {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify(body),
  })
}

describe('price history round trip and validation', () => {
  it('returns a posted price entry on a later, separate request, in effective-from order', async () => {
    const cookie = await signedInCookie('1', 'prices-round-trip@example.com')
    const plan = await createPlan(cookie)

    await createPrice(cookie, plan.id, { effective_from: '2026-03', amount: 12000 })
    await createPrice(cookie, plan.id, { effective_from: '2026-01', amount: 10000 })

    const listRes = await SELF.fetch(pricesUrl(plan.id), { headers: { cookie } })
    expect(listRes.status).toBe(200)
    const listed = await listRes.json<PriceBody[]>()
    expect(listed.map((entry) => [entry.effectiveFrom, entry.amount])).toEqual([
      ['2026-01', 10000],
      ['2026-03', 12000],
    ])
  })

  it('refuses a duplicate month for the same subscription with 409 and leaves the stored amount alone', async () => {
    const cookie = await signedInCookie('2', 'prices-duplicate@example.com')
    const plan = await createPlan(cookie)
    await createPrice(cookie, plan.id, { effective_from: '2026-01', amount: 10000 })

    const res = await postPrice(cookie, plan.id, { effective_from: '2026-01', amount: 99900 })
    expect(res.status).toBe(409)

    const listed = await (await SELF.fetch(pricesUrl(plan.id), { headers: { cookie } })).json<PriceBody[]>()
    expect(listed).toHaveLength(1)
    expect(listed[0].amount).toBe(10000)
  })

  it('returns 400 naming the field for a malformed month, a non-positive amount and a month before the plan started', async () => {
    const cookie = await signedInCookie('3', 'prices-invalid@example.com')
    const plan = await createPlan(cookie)

    const cases: Array<{ label: string; body: unknown; names: string }> = [
      { label: 'a month outside YYYY-MM', body: { effective_from: '2026-13', amount: 10000 }, names: 'effective_from' },
      { label: 'a zero amount', body: { effective_from: '2026-02', amount: 0 }, names: 'amount' },
      { label: 'a negative amount', body: { effective_from: '2026-02', amount: -100 }, names: 'amount' },
      { label: 'a fractional amount', body: { effective_from: '2026-02', amount: 100.5 }, names: 'amount' },
      {
        label: 'a month before the subscription start',
        body: { effective_from: '2025-12', amount: 10000 },
        names: 'effective_from',
      },
      { label: 'an unknown key', body: { effective_from: '2026-02', amount: 10000, nope: 1 }, names: 'nope' },
    ]

    for (const testCase of cases) {
      const res = await postPrice(cookie, plan.id, testCase.body)
      expect(res.status, testCase.label).toBe(400)
      const error = await res.json<{ error: string; field?: string }>()
      expect(`${error.field ?? ''} ${error.error}`, testCase.label).toContain(testCase.names)
    }
  })
})

describe('break months', () => {
  it('records a break month, returns it and accepts the same month twice without complaint', async () => {
    const cookie = await signedInCookie('4', 'breaks-idempotent@example.com')
    const plan = await createPlan(cookie)

    const first = await postBreak(cookie, plan.id, { month: '2026-02' })
    expect(first.status).toBe(201)
    const second = await postBreak(cookie, plan.id, { month: '2026-02' })
    expect(second.status).toBe(201)

    const listRes = await SELF.fetch(breaksUrl(plan.id), { headers: { cookie } })
    expect(listRes.status).toBe(200)
    expect(await listRes.json<string[]>()).toEqual(['2026-02'])

    const deleteRes = await SELF.fetch(breaksUrl(plan.id, '2026-02'), { method: 'DELETE', headers: { cookie } })
    expect(deleteRes.status).toBe(204)
    expect(await (await SELF.fetch(breaksUrl(plan.id), { headers: { cookie } })).json<string[]>()).toEqual([])
  })

  it('returns 400 for a malformed month in the body and in the path', async () => {
    const cookie = await signedInCookie('5', 'breaks-invalid@example.com')
    const plan = await createPlan(cookie)

    const badBody = await postBreak(cookie, plan.id, { month: '2026-13' })
    expect(badBody.status).toBe(400)

    const beforeStart = await postBreak(cookie, plan.id, { month: '2025-12' })
    expect(beforeStart.status).toBe(400)

    const badPath = await SELF.fetch(breaksUrl(plan.id, 'not-a-month'), { method: 'DELETE', headers: { cookie } })
    expect(badPath.status).toBe(400)
  })
})

describe('price and break-month ownership', () => {
  it('hides both resources from another account on every verb, including through a foreign parent', async () => {
    const cookieA = await signedInCookie('6', 'prices-owner-a@example.com')
    const cookieB = await signedInCookie('7', 'prices-owner-b@example.com')

    const planA = await createPlan(cookieA)
    await createPlan(cookieB)
    const price = await createPrice(cookieA, planA.id, { effective_from: '2026-01', amount: 10000 })
    expect((await postBreak(cookieA, planA.id, { month: '2026-02' })).status).toBe(201)

    expect((await SELF.fetch(pricesUrl(planA.id), { headers: { cookie: cookieB } })).status).toBe(404)
    expect((await postPrice(cookieB, planA.id, { effective_from: '2026-04', amount: 500 })).status).toBe(404)
    expect(
      (await SELF.fetch(pricesUrl(planA.id, price.id), { method: 'DELETE', headers: { cookie: cookieB } })).status,
    ).toBe(404)

    expect((await SELF.fetch(breaksUrl(planA.id), { headers: { cookie: cookieB } })).status).toBe(404)
    expect((await postBreak(cookieB, planA.id, { month: '2026-05' })).status).toBe(404)
    expect(
      (await SELF.fetch(breaksUrl(planA.id, '2026-02'), { method: 'DELETE', headers: { cookie: cookieB } })).status,
    ).toBe(404)

    const stillThere = await (await SELF.fetch(pricesUrl(planA.id), { headers: { cookie: cookieA } })).json<PriceBody[]>()
    expect(stillThere).toHaveLength(1)
  })

  it("refuses a price or break month named through the caller's own other subscription", async () => {
    const cookie = await signedInCookie('8', 'prices-wrong-parent@example.com')
    const first = await createPlan(cookie)
    const second = await createPlan(cookie, { name: 'Second plan' })

    const price = await createPrice(cookie, first.id, { effective_from: '2026-01', amount: 10000 })
    expect((await postBreak(cookie, first.id, { month: '2026-02' })).status).toBe(201)

    const deletePrice = await SELF.fetch(pricesUrl(second.id, price.id), { method: 'DELETE', headers: { cookie } })
    expect(deletePrice.status).toBe(404)

    const deleteBreak = await SELF.fetch(breaksUrl(second.id, '2026-02'), { method: 'DELETE', headers: { cookie } })
    expect(deleteBreak.status).toBe(404)

    expect(
      await (await SELF.fetch(pricesUrl(first.id), { headers: { cookie } })).json<PriceBody[]>(),
    ).toHaveLength(1)
    expect(await (await SELF.fetch(breaksUrl(first.id), { headers: { cookie } })).json<string[]>()).toEqual(['2026-02'])
  })

  // These go through the composed app, where several routers own
  // `/api/subscriptions/*`, so they pin the contract a caller sees rather than
  // proving that these two modules registered their own session middleware.
  // `router-isolation.test.ts` proves that separately, per router.
  it('returns 401 from every price and break-month route without a session cookie', async () => {
    const calls: Array<[string, RequestInit]> = [
      [pricesUrl('any'), {}],
      [pricesUrl('any'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }],
      [pricesUrl('any', 'any-price'), { method: 'DELETE' }],
      [breaksUrl('any'), {}],
      [breaksUrl('any'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }],
      [breaksUrl('any', '2026-01'), { method: 'DELETE' }],
    ]

    for (const [url, init] of calls) {
      const res = await SELF.fetch(url, init)
      expect(res.status, url).toBe(401)
    }
  })
})

describe('deleting the earliest price entry', () => {
  it('is refused with 409 naming the months that would lose their price, and changes nothing', async () => {
    const cookie = await signedInCookie('9', 'prices-delete-guard@example.com')
    const plan = await createPlan(cookie)
    const earliest = await createPrice(cookie, plan.id, { effective_from: '2026-01', amount: 10000 })
    await createPrice(cookie, plan.id, { effective_from: '2026-04', amount: 12000 })

    const res = await SELF.fetch(pricesUrl(plan.id, earliest.id), { method: 'DELETE', headers: { cookie } })
    expect(res.status).toBe(409)
    const error = await res.json<{ error: string; months?: string[] }>()
    expect(error.months).toEqual(['2026-01', '2026-02', '2026-03'])

    const listed = await (await SELF.fetch(pricesUrl(plan.id), { headers: { cookie } })).json<PriceBody[]>()
    expect(listed).toHaveLength(2)
  })

  it('goes through with confirm=true, and the summary afterwards shows those months costing nothing', async () => {
    const cookie = await signedInCookie('10', 'prices-delete-confirmed@example.com')
    const plan = await createPlan(cookie)
    const earliest = await createPrice(cookie, plan.id, { effective_from: '2026-01', amount: 10000 })
    await createPrice(cookie, plan.id, { effective_from: '2026-04', amount: 12000 })

    const summaryUrl = `http://example.com/api/subscriptions/${plan.id}/summary`
    const before = await (await SELF.fetch(summaryUrl, { headers: { cookie } })).json<{ totalPlanCost: number }>()

    const refused = await SELF.fetch(pricesUrl(plan.id, earliest.id), { method: 'DELETE', headers: { cookie } })
    const { months } = await refused.json<{ months: string[] }>()

    const res = await SELF.fetch(`${pricesUrl(plan.id, earliest.id)}?confirm=true`, {
      method: 'DELETE',
      headers: { cookie },
    })
    expect(res.status).toBe(204)

    const listed = await (await SELF.fetch(pricesUrl(plan.id), { headers: { cookie } })).json<PriceBody[]>()
    expect(listed.map((entry) => entry.effectiveFrom)).toEqual(['2026-04'])

    // Every month the refusal named cost 10000 and now costs nothing, so the
    // plan total drops by exactly what those months used to carry.
    const after = await (await SELF.fetch(summaryUrl, { headers: { cookie } })).json<{ totalPlanCost: number }>()
    expect(before.totalPlanCost - after.totalPlanCost).toBe(months.length * 10000)
  })

  it('deletes a later entry without a confirmation, because no month loses its price', async () => {
    const cookie = await signedInCookie('11', 'prices-delete-later@example.com')
    const plan = await createPlan(cookie)
    await createPrice(cookie, plan.id, { effective_from: '2026-01', amount: 10000 })
    const later = await createPrice(cookie, plan.id, { effective_from: '2026-04', amount: 12000 })

    const res = await SELF.fetch(pricesUrl(plan.id, later.id), { method: 'DELETE', headers: { cookie } })
    expect(res.status).toBe(204)

    const listed = await (await SELF.fetch(pricesUrl(plan.id), { headers: { cookie } })).json<PriceBody[]>()
    expect(listed.map((entry) => entry.effectiveFrom)).toEqual(['2026-01'])
  })
})
