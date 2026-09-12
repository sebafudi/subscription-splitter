import { SELF, env } from 'cloudflare:test'
import { betterAuth } from 'better-auth'
import { describe, expect, it } from 'vitest'

function seedingAuth() {
  return betterAuth({
    baseURL: 'http://example.com',
    database: env.DB,
    emailAndPassword: {
      enabled: true,
      disableSignUp: false,
    },
  })
}

function extractSessionCookie(res: Response): string {
  const setCookie = res.headers.get('set-cookie')
  if (!setCookie) throw new Error('no set-cookie header on response')
  return setCookie.split(';')[0]
}

function headersFor(testId: string, extra?: Record<string, string>): Record<string, string> {
  return {
    'content-type': 'application/json',
    'cf-connecting-ip': `10.0.0.${testId}`,
    origin: 'http://example.com',
    ...extra,
  }
}

async function seedUser(email: string, password: string, name: string) {
  const auth = seedingAuth()
  return auth.api.signUpEmail({ body: { email, password, name } })
}

describe('session lifecycle against local D1', () => {
  it('signs in with a seeded user and sets a session cookie', async () => {
    await seedUser('sign-in-ok@example.com', 'correct horse battery staple', 'Owner')

    const res = await SELF.fetch('http://example.com/api/auth/sign-in/email', {
      method: 'POST',
      headers: headersFor('1'),
      body: JSON.stringify({ email: 'sign-in-ok@example.com', password: 'correct horse battery staple' }),
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toBeTruthy()
  })

  it('returns the user from /api/me when the session cookie is present, agreeing with get-session', async () => {
    await seedUser('me-ok@example.com', 'correct horse battery staple', 'Owner')

    const signInRes = await SELF.fetch('http://example.com/api/auth/sign-in/email', {
      method: 'POST',
      headers: headersFor('2'),
      body: JSON.stringify({ email: 'me-ok@example.com', password: 'correct horse battery staple' }),
    })
    const cookie = extractSessionCookie(signInRes)

    const meRes = await SELF.fetch('http://example.com/api/me', { headers: { cookie } })
    expect(meRes.status).toBe(200)
    const meBody = await meRes.json<{ user: { email: string } }>()
    expect(meBody.user.email).toBe('me-ok@example.com')

    const getSessionRes = await SELF.fetch('http://example.com/api/auth/get-session', { headers: { cookie } })
    expect(getSessionRes.status).toBe(200)
    const sessionBody = await getSessionRes.json<{ user: { email: string } }>()
    expect(sessionBody.user.email).toBe('me-ok@example.com')
  })

  it('returns 401 from /api/me without a session cookie', async () => {
    const res = await SELF.fetch('http://example.com/api/me')
    expect(res.status).toBe(401)
  })

  it('returns 401 for a wrong password', async () => {
    await seedUser('wrong-pw@example.com', 'correct horse battery staple', 'Owner')

    const res = await SELF.fetch('http://example.com/api/auth/sign-in/email', {
      method: 'POST',
      headers: headersFor('3'),
      body: JSON.stringify({ email: 'wrong-pw@example.com', password: 'not the password' }),
    })

    expect(res.status).toBe(401)
  })

  it('invalidates the session on sign-out', async () => {
    await seedUser('sign-out@example.com', 'correct horse battery staple', 'Owner')

    const signInRes = await SELF.fetch('http://example.com/api/auth/sign-in/email', {
      method: 'POST',
      headers: headersFor('4'),
      body: JSON.stringify({ email: 'sign-out@example.com', password: 'correct horse battery staple' }),
    })
    const cookie = extractSessionCookie(signInRes)

    const signOutRes = await SELF.fetch('http://example.com/api/auth/sign-out', {
      method: 'POST',
      headers: { cookie, origin: 'http://example.com' },
    })
    expect(signOutRes.status).toBe(200)

    const meRes = await SELF.fetch('http://example.com/api/me', { headers: { cookie } })
    expect(meRes.status).toBe(401)
  })

  it('refuses a session whose stored expiry has passed', async () => {
    await seedUser('expired@example.com', 'correct horse battery staple', 'Owner')

    const signInRes = await SELF.fetch('http://example.com/api/auth/sign-in/email', {
      method: 'POST',
      headers: headersFor('5'),
      body: JSON.stringify({ email: 'expired@example.com', password: 'correct horse battery staple' }),
    })
    const cookie = extractSessionCookie(signInRes)
    const token = cookie.split('=').slice(1).join('=').split('.')[0]

    await env.DB.prepare('update session set expiresAt = ? where token = ?')
      .bind(Date.now() - 1000, token)
      .run()

    const meRes = await SELF.fetch('http://example.com/api/me', { headers: { cookie } })
    expect(meRes.status).toBe(401)
  })

  it('refuses the public sign-up endpoint while server-side seeding still works', async () => {
    const signUpRes = await SELF.fetch('http://example.com/api/auth/sign-up/email', {
      method: 'POST',
      headers: headersFor('6'),
      body: JSON.stringify({
        email: 'public-signup@example.com',
        password: 'correct horse battery staple',
        name: 'Attempted signup',
      }),
    })
    expect(signUpRes.status).not.toBe(200)

    const seeded = await seedUser('server-seeded@example.com', 'correct horse battery staple', 'Owner')
    expect(seeded.user.email).toBe('server-seeded@example.com')
  })

  it('refuses a sign-in whose Origin header is not in APP_ORIGINS', async () => {
    await seedUser('cross-origin@example.com', 'correct horse battery staple', 'Owner')

    const res = await SELF.fetch('http://example.com/api/auth/sign-in/email', {
      method: 'POST',
      headers: headersFor('7', { origin: 'https://untrusted.example' }),
      body: JSON.stringify({ email: 'cross-origin@example.com', password: 'correct horse battery staple' }),
    })

    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })
})

describe('rate limiting on sign-in (runs last, tripped counters persist in shared D1)', () => {
  it('trips the configured sign-in limit after repeated failed attempts from one client address', async () => {
    await seedUser('throttle-target@example.com', 'correct horse battery staple', 'Owner')
    const throttleHeaders = headersFor('200')

    let lastStatus = 0
    for (let attempt = 0; attempt < 11; attempt += 1) {
      const res = await SELF.fetch('http://example.com/api/auth/sign-in/email', {
        method: 'POST',
        headers: throttleHeaders,
        body: JSON.stringify({ email: 'throttle-target@example.com', password: 'wrong password' }),
      })
      lastStatus = res.status
    }

    expect(lastStatus).toBe(429)
  })
})
