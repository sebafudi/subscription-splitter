import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { currentMonth } from '../../src/domain/months'
import { signedInCookie as signedInCookieWithPrefix } from './accounts'

/** This file's slice of the rate limiter's client-address space; see `accounts.ts`. */
function signedInCookie(testId: string, email: string): Promise<string> {
  return signedInCookieWithPrefix('10.1.0', testId, email)
}

const validBody = {
  name: 'Family plan',
  currency: 'USD',
  locale: 'en-US',
  time_zone: 'America/New_York',
  start_month: '2026-01',
}

describe('subscriptions ownership, persistence and validation', () => {
  it('lists a created subscription for its owner and hides it from another account, and 404s cross-account read/write', async () => {
    const cookieA = await signedInCookie('1', 'sub-owner-a@example.com')
    const cookieB = await signedInCookie('2', 'sub-owner-b@example.com')

    const createRes = await SELF.fetch('http://example.com/api/subscriptions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: cookieA },
      body: JSON.stringify(validBody),
    })
    expect(createRes.status).toBe(201)
    const created = await createRes.json<{ id: string; name: string }>()
    expect(created.name).toBe('Family plan')

    const listA = await SELF.fetch('http://example.com/api/subscriptions', { headers: { cookie: cookieA } })
    const listABody = await listA.json<Array<{ id: string }>>()
    expect(listABody.some((row) => row.id === created.id)).toBe(true)

    const listB = await SELF.fetch('http://example.com/api/subscriptions', { headers: { cookie: cookieB } })
    const listBBody = await listB.json<Array<{ id: string }>>()
    expect(listBBody.some((row) => row.id === created.id)).toBe(false)

    const getFromB = await SELF.fetch(`http://example.com/api/subscriptions/${created.id}`, {
      headers: { cookie: cookieB },
    })
    expect(getFromB.status).toBe(404)

    const patchFromB = await SELF.fetch(`http://example.com/api/subscriptions/${created.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', cookie: cookieB },
      body: JSON.stringify({ name: 'Hijacked' }),
    })
    expect(patchFromB.status).toBe(404)

    const deleteFromB = await SELF.fetch(`http://example.com/api/subscriptions/${created.id}`, {
      method: 'DELETE',
      headers: { cookie: cookieB },
    })
    expect(deleteFromB.status).toBe(404)

    const stillThere = await SELF.fetch(`http://example.com/api/subscriptions/${created.id}`, {
      headers: { cookie: cookieA },
    })
    expect(stillThere.status).toBe(200)
  })

  it('persists a created subscription across a fresh, separate request', async () => {
    const cookie = await signedInCookie('3', 'sub-persist@example.com')

    const createRes = await SELF.fetch('http://example.com/api/subscriptions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify(validBody),
    })
    const created = await createRes.json<{ id: string }>()

    const getRes = await SELF.fetch(`http://example.com/api/subscriptions/${created.id}`, { headers: { cookie } })
    expect(getRes.status).toBe(200)
    const fetched = await getRes.json<{ id: string; name: string }>()
    expect(fetched.id).toBe(created.id)
    expect(fetched.name).toBe('Family plan')
  })

  it('returns 401 from every subscriptions route without a session cookie', async () => {
    const listRes = await SELF.fetch('http://example.com/api/subscriptions')
    expect(listRes.status).toBe(401)

    const createRes = await SELF.fetch('http://example.com/api/subscriptions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validBody),
    })
    expect(createRes.status).toBe(401)

    const getRes = await SELF.fetch('http://example.com/api/subscriptions/does-not-exist')
    expect(getRes.status).toBe(401)

    const patchRes = await SELF.fetch('http://example.com/api/subscriptions/does-not-exist', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'x' }),
    })
    expect(patchRes.status).toBe(401)

    const deleteRes = await SELF.fetch('http://example.com/api/subscriptions/does-not-exist', { method: 'DELETE' })
    expect(deleteRes.status).toBe(401)
  })

  it('returns 400 for invalid bodies: a bad month, a bad time zone, an empty name and an unknown key', async () => {
    const cookie = await signedInCookie('4', 'sub-invalid@example.com')

    const badMonth = await SELF.fetch('http://example.com/api/subscriptions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ ...validBody, start_month: '2026-13' }),
    })
    expect(badMonth.status).toBe(400)

    const badTimeZone = await SELF.fetch('http://example.com/api/subscriptions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ ...validBody, time_zone: 'Not/AZone' }),
    })
    expect(badTimeZone.status).toBe(400)

    const emptyName = await SELF.fetch('http://example.com/api/subscriptions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ ...validBody, name: '   ' }),
    })
    expect(emptyName.status).toBe(400)

    const unknownKey = await SELF.fetch('http://example.com/api/subscriptions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ ...validBody, extra: 'nope' }),
    })
    expect(unknownKey.status).toBe(400)
  })

  it('lets the owner patch their own subscription, persisting the change and leaving other fields untouched', async () => {
    const cookie = await signedInCookie('5', 'sub-patch-owner@example.com')

    const createRes = await SELF.fetch('http://example.com/api/subscriptions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify(validBody),
    })
    const created = await createRes.json<{ id: string; currency: string }>()

    const patchRes = await SELF.fetch(`http://example.com/api/subscriptions/${created.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ name: 'Renamed plan' }),
    })
    expect(patchRes.status).toBe(200)
    const patched = await patchRes.json<{ id: string; name: string; currency: string }>()
    expect(patched.name).toBe('Renamed plan')
    expect(patched.currency).toBe(created.currency)

    const getRes = await SELF.fetch(`http://example.com/api/subscriptions/${created.id}`, { headers: { cookie } })
    const refetched = await getRes.json<{ name: string; currency: string }>()
    expect(refetched.name).toBe('Renamed plan')
    expect(refetched.currency).toBe(created.currency)
  })

  it('refuses a PATCH body that carries user_id or id, the two keys that would move or rename a row across accounts', async () => {
    const cookie = await signedInCookie('6', 'sub-patch-transfer@example.com')

    const createRes = await SELF.fetch('http://example.com/api/subscriptions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify(validBody),
    })
    const created = await createRes.json<{ id: string }>()

    const withUserId = await SELF.fetch(`http://example.com/api/subscriptions/${created.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ name: 'Still mine', user_id: 'someone-elses-id' }),
    })
    expect(withUserId.status).toBe(400)

    const withId = await SELF.fetch(`http://example.com/api/subscriptions/${created.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ name: 'Still mine', id: 'a-different-id' }),
    })
    expect(withId.status).toBe(400)
  })
})

const base = 'http://example.com/api/subscriptions'

type ErrorBody = { error: string; field?: string }

function jsonHeaders(cookie: string): Record<string, string> {
  return { 'content-type': 'application/json', cookie }
}

async function createPlan(cookie: string, overrides: Record<string, unknown> = {}): Promise<{ id: string }> {
  const res = await SELF.fetch(base, {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify({ ...validBody, ...overrides }),
  })
  expect(res.status).toBe(201)
  return res.json<{ id: string }>()
}

function patchPlan(cookie: string, id: string, body: unknown): Promise<Response> {
  return SELF.fetch(`${base}/${id}`, { method: 'PATCH', headers: jsonHeaders(cookie), body: JSON.stringify(body) })
}

async function ownerId(cookie: string, id: string): Promise<string> {
  const res = await SELF.fetch(`${base}/${id}/members`, { headers: { cookie } })
  const members = await res.json<Array<{ id: string; isOwner: boolean }>>()
  return members.find((member) => member.isOwner)!.id
}

/**
 * Payments and standing orders are refused against the owner, so every fixture
 * that needs one carries a participant. The join month is a parameter because
 * a participant pins the first month too, and a case testing another kind has
 * to keep this one out of the way.
 */
async function participantId(cookie: string, id: string, joinedMonth: string): Promise<string> {
  const res = await SELF.fetch(`${base}/${id}/members`, {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify({ name: 'Ada', active_ranges: [{ joined_month: joinedMonth }] }),
  })
  expect(res.status).toBe(201)
  const member = await res.json<{ id: string }>()
  return member.id
}

async function post(cookie: string, path: string, body: unknown): Promise<void> {
  const res = await SELF.fetch(`http://example.com${path}`, {
    method: 'POST',
    headers: jsonHeaders(cookie),
    body: JSON.stringify(body),
  })
  expect(res.status, await res.clone().text()).toBe(201)
}

/**
 * The floor is ten years of whole calendar years before the current one in the
 * subscription's time zone, so it is derived here the same way the server
 * derives it rather than written down as a literal that would age out.
 */
function floorFor(timeZone: string): string {
  return `${Number(currentMonth(timeZone).slice(0, 4)) - 10}-01`
}

describe('the editable subscription settings', () => {
  it('patches all five settings and reads every one of them back', async () => {
    const cookie = await signedInCookie('7', 'sub-settings-all@example.com')
    const plan = await createPlan(cookie)

    const patchRes = await patchPlan(cookie, plan.id, {
      name: 'Payments walkthrough',
      currency: 'PLN',
      locale: 'pl-PL',
      time_zone: 'Europe/Warsaw',
      start_month: '2025-09',
    })
    expect(patchRes.status).toBe(200)

    const getRes = await SELF.fetch(`${base}/${plan.id}`, { headers: { cookie } })
    expect(await getRes.json()).toMatchObject({
      name: 'Payments walkthrough',
      currency: 'PLN',
      locale: 'pl-PL',
      timeZone: 'Europe/Warsaw',
      startMonth: '2025-09',
    })
  })

  it('accepts a currency change while the subscription records no amount at all', async () => {
    const cookie = await signedInCookie('8', 'sub-currency-free@example.com')
    const plan = await createPlan(cookie)

    const patchRes = await patchPlan(cookie, plan.id, { currency: 'EUR' })
    expect(patchRes.status).toBe(200)
    expect(await patchRes.json()).toMatchObject({ currency: 'EUR' })
  })

  it('refuses a currency change once a price, a payment or a standing order is recorded', async () => {
    const cookie = await signedInCookie('9', 'sub-currency-locked@example.com')

    const priced = await createPlan(cookie)
    await post(cookie, `/api/subscriptions/${priced.id}/prices`, { effective_from: '2026-01', amount: 4999 })

    const paid = await createPlan(cookie)
    await post(cookie, `/api/subscriptions/${paid.id}/payments`, {
      member_id: await participantId(cookie, paid.id, '2026-01'),
      date: '2026-01-15',
      amount: 2500,
    })

    const scheduled = await createPlan(cookie)
    await post(cookie, `/api/subscriptions/${scheduled.id}/schedules`, {
      member_id: await participantId(cookie, scheduled.id, '2026-01'),
      amount: 2500,
      start_month: '2026-01',
    })

    for (const plan of [priced, paid, scheduled]) {
      const res = await patchPlan(cookie, plan.id, { currency: 'EUR' })
      expect(res.status).toBe(400)
      expect(await res.json<ErrorBody>()).toEqual({
        field: 'currency',
        error: 'currency cannot change while prices, payments or standing orders are recorded',
      })

      const getRes = await SELF.fetch(`${base}/${plan.id}`, { headers: { cookie } })
      expect(await getRes.json()).toMatchObject({ currency: 'USD' })
    }
  })

  it('moves the first month earlier, which every dependent rule already admits', async () => {
    const cookie = await signedInCookie('10', 'sub-month-earlier@example.com')
    const plan = await createPlan(cookie)
    await post(cookie, `/api/subscriptions/${plan.id}/prices`, { effective_from: '2026-03', amount: 4999 })

    const patchRes = await patchPlan(cookie, plan.id, { start_month: '2025-01' })
    expect(patchRes.status).toBe(200)
    expect(await patchRes.json()).toMatchObject({ startMonth: '2025-01' })
  })

  it('refuses a first month below the ten-year floor, on create and on patch alike', async () => {
    const cookie = await signedInCookie('11', 'sub-month-floor@example.com')
    const floor = floorFor(validBody.time_zone)
    const tooEarly = `${Number(floor.slice(0, 4)) - 1}-01`

    const createRes = await SELF.fetch(base, {
      method: 'POST',
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ ...validBody, start_month: tooEarly }),
    })
    expect(createRes.status).toBe(400)
    expect(await createRes.json<ErrorBody>()).toEqual({
      field: 'start_month',
      error: `start_month cannot be earlier than ${floor}`,
    })

    const plan = await createPlan(cookie)
    const patchRes = await patchPlan(cookie, plan.id, { start_month: tooEarly })
    expect(patchRes.status).toBe(400)
    expect(await patchRes.json<ErrorBody>()).toEqual({
      field: 'start_month',
      error: `start_month cannot be earlier than ${floor}`,
    })

    const getRes = await SELF.fetch(`${base}/${plan.id}`, { headers: { cookie } })
    expect(await getRes.json()).toMatchObject({ startMonth: '2026-01' })
  })

  it('accepts a first month moved later as far as the earliest month a dependent record uses', async () => {
    const cookie = await signedInCookie('12', 'sub-month-later-ok@example.com')
    const plan = await createPlan(cookie)
    await post(cookie, `/api/subscriptions/${plan.id}/prices`, { effective_from: '2026-05', amount: 4999 })

    const patchRes = await patchPlan(cookie, plan.id, { start_month: '2026-05' })
    expect(patchRes.status).toBe(200)
    expect(await patchRes.json()).toMatchObject({ startMonth: '2026-05' })
  })

  it('refuses a first month moved past a dependent record, naming the binding month and the kind that pins it', async () => {
    const cookie = await signedInCookie('13', 'sub-month-later-refused@example.com')

    const participant = await createPlan(cookie)
    await post(cookie, `/api/subscriptions/${participant.id}/members`, {
      name: 'Ada',
      active_ranges: [{ joined_month: '2026-03' }],
    })

    const priced = await createPlan(cookie)
    await post(cookie, `/api/subscriptions/${priced.id}/prices`, { effective_from: '2026-03', amount: 4999 })

    const skipped = await createPlan(cookie)
    await post(cookie, `/api/subscriptions/${skipped.id}/break-months`, { month: '2026-03' })

    const paid = await createPlan(cookie)
    await post(cookie, `/api/subscriptions/${paid.id}/payments`, {
      member_id: await participantId(cookie, paid.id, '2026-05'),
      date: '2026-03-15',
      amount: 2500,
    })

    const scheduled = await createPlan(cookie)
    await post(cookie, `/api/subscriptions/${scheduled.id}/schedules`, {
      member_id: await participantId(cookie, scheduled.id, '2026-05'),
      amount: 2500,
      start_month: '2026-03',
    })

    const cases: Array<[{ id: string }, string]> = [
      [participant, 'a participant is active from that month'],
      [priced, 'a price is recorded from that month'],
      [skipped, 'a month is skipped in that month'],
      [paid, 'a payment is dated in that month'],
      [scheduled, 'a standing order starts in that month'],
    ]

    for (const [plan, because] of cases) {
      const res = await patchPlan(cookie, plan.id, { start_month: '2026-04' })
      expect(res.status).toBe(400)
      expect(await res.json<ErrorBody>()).toEqual({
        field: 'start_month',
        error: `start_month cannot be later than 2026-03 because ${because}`,
      })

      const getRes = await SELF.fetch(`${base}/${plan.id}`, { headers: { cookie } })
      expect(await getRes.json()).toMatchObject({ startMonth: '2026-01' })
    }
  })

  it('refuses a first month that would pass the leave month of the owner opening range, naming that month', async () => {
    const cookie = await signedInCookie('14', 'sub-month-owner-left@example.com')
    const plan = await createPlan(cookie)
    const owner = await ownerId(cookie, plan.id)

    const closeRes = await SELF.fetch(`${base}/${plan.id}/members/${owner}`, {
      method: 'PATCH',
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ active_ranges: [{ joined_month: '2026-01', left_month: '2026-02' }] }),
    })
    expect(closeRes.status).toBe(200)

    const patchRes = await patchPlan(cookie, plan.id, { start_month: '2026-03' })
    expect(patchRes.status).toBe(400)
    expect(await patchRes.json<ErrorBody>()).toEqual({
      field: 'start_month',
      error: 'start_month cannot be later than 2026-02 because your own first active range ends then',
    })
  })
})
