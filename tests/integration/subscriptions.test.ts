import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
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
