import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { headersFor } from './accounts'

describe('dev seed route (decision D-005)', () => {
  it('returns 404 with the gate on but a wrong token', async () => {
    const res = await SELF.fetch('http://example.com/api/dev/seed', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-seed-token': 'wrong-token' },
      body: JSON.stringify({ email: 'seed-wrong-token@example.com', password: 'correct horse battery staple', name: 'Owner' }),
    })
    expect(res.status).toBe(404)
  })

  it('returns 404 with no token header at all', async () => {
    const res = await SELF.fetch('http://example.com/api/dev/seed', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'seed-no-token@example.com', password: 'correct horse battery staple', name: 'Owner' }),
    })
    expect(res.status).toBe(404)
  })

  it('creates the account with the gate on and the right token, and reports an identical second call unchanged', async () => {
    const seedRequest = () =>
      SELF.fetch('http://example.com/api/dev/seed', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-seed-token': 'integration-test-seed-token' },
        body: JSON.stringify({
          email: 'seed-idempotent@example.com',
          password: 'correct horse battery staple',
          name: 'Owner',
        }),
      })

    const firstRes = await seedRequest()
    expect(firstRes.status).toBe(200)
    const firstBody = await firstRes.json<{ email: string; created: boolean }>()
    expect(firstBody.created).toBe(true)
    expect(firstBody).not.toHaveProperty('password')

    const secondRes = await seedRequest()
    expect(secondRes.status).toBe(200)
    const secondBody = await secondRes.json<{ email: string; created: boolean }>()
    expect(secondBody.created).toBe(false)
  })

  it('returns 400 with a Zod-shaped error for a non-JSON body behind a valid token, never 500', async () => {
    const res = await SELF.fetch('http://example.com/api/dev/seed', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-seed-token': 'integration-test-seed-token' },
      body: 'not json at all',
    })
    expect(res.status).toBe(400)
    const body = await res.json<{ error: string; field?: string }>()
    expect(typeof body.error).toBe('string')
  })

  it('returns 400 for a JSON body missing a required field, never 500', async () => {
    const res = await SELF.fetch('http://example.com/api/dev/seed', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-seed-token': 'integration-test-seed-token' },
      body: JSON.stringify({ email: 'seed-missing-field@example.com', name: 'Owner' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json<{ error: string; field?: string }>()
    expect(body.field).toBe('password')
  })

  it('lets the seeded account sign in afterward', async () => {
    await SELF.fetch('http://example.com/api/dev/seed', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-seed-token': 'integration-test-seed-token' },
      body: JSON.stringify({
        email: 'seed-then-signin@example.com',
        password: 'correct horse battery staple',
        name: 'Owner',
      }),
    })

    const signInRes = await SELF.fetch('http://example.com/api/auth/sign-in/email', {
      method: 'POST',
      headers: headersFor('10.2.0', '1'),
      body: JSON.stringify({ email: 'seed-then-signin@example.com', password: 'correct horse battery staple' }),
    })
    expect(signInRes.status).toBe(200)
  })
})
