import { SELF, env } from 'cloudflare:test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { handleOAuthUserInfo } from 'better-auth/oauth2'
import { createAuth } from '../../src/server/auth'
import { headersFor as headersWithPrefix, seedUser, signedInCookie as signedInCookieWithPrefix } from './accounts'

/** This file's slice of the rate limiter's client-address space; see `accounts.ts`. */
function headersFor(testId: string, extra?: Record<string, string>): Record<string, string> {
  return headersWithPrefix('10.8.0', testId, extra)
}

function signedInCookie(testId: string, email: string): Promise<string> {
  return signedInCookieWithPrefix('10.8.0', testId, email)
}

/**
 * Fabricated literals, never a credential. The real pair lives in the ignored
 * `.dev.vars` and in the Worker's secret store, and nothing in this file
 * reaches Google: every assertion stops at the authorization URL.
 */
const TEST_CLIENT_ID = 'integration-test-google-client-id.apps.googleusercontent.com'
const TEST_CLIENT_SECRET = 'integration-test-google-client-secret'

type GoogleEnv = { GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string }

const googleEnv = env as unknown as GoogleEnv

/**
 * The pool binds whatever `.dev.vars` holds, which on a developer's machine is
 * the real pair and in continuous integration is nothing at all. Both halves of
 * this file therefore set the state they are about to assert and put back what
 * they found, so each case means the same thing in both environments. The
 * values written here are fabricated literals, never a credential.
 */
function bindGoogle(clientId?: string, clientSecret?: string) {
  const previous = { id: googleEnv.GOOGLE_CLIENT_ID, secret: googleEnv.GOOGLE_CLIENT_SECRET }

  if (clientId === undefined) delete googleEnv.GOOGLE_CLIENT_ID
  else googleEnv.GOOGLE_CLIENT_ID = clientId

  if (clientSecret === undefined) delete googleEnv.GOOGLE_CLIENT_SECRET
  else googleEnv.GOOGLE_CLIENT_SECRET = clientSecret

  return function restore() {
    if (previous.id === undefined) delete googleEnv.GOOGLE_CLIENT_ID
    else googleEnv.GOOGLE_CLIENT_ID = previous.id

    if (previous.secret === undefined) delete googleEnv.GOOGLE_CLIENT_SECRET
    else googleEnv.GOOGLE_CLIENT_SECRET = previous.secret
  }
}

function socialSignIn(testId: string, body: Record<string, unknown> = {}) {
  return SELF.fetch('http://example.com/api/auth/sign-in/social', {
    method: 'POST',
    headers: headersFor(testId),
    body: JSON.stringify({
      provider: 'google',
      callbackURL: 'http://example.com/',
      errorCallbackURL: 'http://example.com/',
      ...body,
    }),
  })
}

describe('a deployment carrying no Google credentials', () => {
  let restore = () => {}

  beforeAll(() => {
    restore = bindGoogle(undefined, undefined)
  })

  afterAll(() => restore())

  it('answers the configuration read with false', async () => {
    const res = await SELF.fetch('http://example.com/api/auth-config')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ google: false })
  })

  it('has no social route to offer, so the call answers 404 rather than a broken redirect', async () => {
    const res = await socialSignIn('1')

    expect(res.status).toBe(404)
  })
})

describe('a deployment carrying both Google credentials', () => {
  let restore = () => {}

  beforeAll(() => {
    restore = bindGoogle(TEST_CLIENT_ID, TEST_CLIENT_SECRET)
  })

  afterAll(() => restore())

  it('answers the configuration read with true and never with the client id', async () => {
    const res = await SELF.fetch('http://example.com/api/auth-config')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ google: true })
    expect(await (await SELF.fetch('http://example.com/api/auth-config')).text()).not.toContain(TEST_CLIENT_ID)
  })

  it('answers the social call with a Google authorization url carrying the derived callback, three scopes and a pkce challenge', async () => {
    const res = await socialSignIn('2')
    expect(res.status).toBe(200)

    const body = await res.json<{ url: string }>()
    const url = new URL(body.url)

    expect(url.host).toBe('accounts.google.com')
    expect(url.searchParams.get('client_id')).toBe(TEST_CLIENT_ID)
    expect(url.searchParams.get('redirect_uri')).toBe('http://example.com/api/auth/callback/google')
    expect(url.searchParams.get('scope')?.split(' ').sort()).toEqual(['email', 'openid', 'profile'])
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('code_challenge')).toBeTruthy()

    const state = url.searchParams.get('state')
    expect(state).toBeTruthy()

    const stored = await env.DB.prepare('select count(*) as rows from "verification" where "identifier" = ?')
      .bind(state)
      .first<{ rows: number }>()
    expect(stored?.rows).toBe(1)
  })

  it('sends a callback whose state matches no stored row back to the app root with an error and no session', async () => {
    const res = await SELF.fetch(
      'http://example.com/api/auth/callback/google?state=fabricated-state&code=fabricated-code',
      { redirect: 'manual' },
    )

    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)

    const location = new URL(res.headers.get('location') ?? '', 'http://example.com')
    expect(location.origin).toBe('http://example.com')
    expect(location.pathname).toBe('/')
    expect(location.searchParams.get('error')).toBe('state_mismatch')

    const cookie = (res.headers.get('set-cookie') ?? '')
      .split(',')
      .map((entry) => entry.split(';')[0].trim())
      .filter((entry) => entry.length > 0)
      .join('; ')
    const meRes = await SELF.fetch('http://example.com/api/me', cookie ? { headers: { cookie } } : undefined)
    expect(meRes.status).toBe(401)
  })

  /**
   * The refusal decision D-013 exists to protect, asserted against the real
   * database. `handleOAuthUserInfo` is where the callback decides whether a
   * Google identity may join an account that already exists, and it is reached
   * only after a token exchange with Google that this pool cannot perform, so
   * the function is called directly rather than through the route.
   *
   * The underscored `account_not_linked` the design delta and D-013 name is the
   * callback's own transform of this string, `result.error.split(' ').join('_')`
   * in `better-auth/dist/api/routes/callback.mjs`: two spellings of one fact.
   *
   * This asserts the library's function rather than this application's route,
   * so it would not catch a later change that stopped the callback consulting
   * it. The unit assertion on the resolved options pins the configuration, and
   * the live roundtrip exercises the route.
   */
  it('refuses a Google identity whose email already belongs to a password account', async () => {
    const email = 'already-a-password-account@example.com'
    await seedUser(email)

    const auth = createAuth(env as unknown as Env, 'http://example.com')
    const context = await auth.$context

    const result = await handleOAuthUserInfo(
      { context } as unknown as Parameters<typeof handleOAuthUserInfo>[0],
      {
        userInfo: {
          id: 'google-subject-1',
          email,
          emailVerified: true,
          name: 'Someone With The Same Address',
          image: null,
        },
        account: {
          providerId: 'google',
          accountId: 'google-subject-1',
        },
      },
    )

    expect(result).toMatchObject({ error: 'account not linked', data: null })
  })

  /**
   * Ownership isolation for an account no password created. The session is
   * taken through the ordinary sign-in and the credential row is then replaced
   * by a `google` one, because a session cookie is signed by the Worker and
   * cannot be fabricated here; what the case asserts is the ownership model
   * seen by a user whose only account row is a social one.
   */
  it('gives an account whose only credential is a google row an empty ledger and 404 for the seeded owner’s subscription', async () => {
    const ownerCookie = await signedInCookie('3', 'google-isolation-owner@example.com')
    const createRes = await SELF.fetch('http://example.com/api/subscriptions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: ownerCookie },
      body: JSON.stringify({
        name: 'Family plan',
        currency: 'USD',
        locale: 'en-US',
        time_zone: 'America/New_York',
        start_month: '2026-01',
      }),
    })
    expect(createRes.status).toBe(201)
    const created = await createRes.json<{ id: string }>()

    const googleCookie = await signedInCookie('4', 'google-shaped-account@example.com')
    const me = await (await SELF.fetch('http://example.com/api/me', { headers: { cookie: googleCookie } })).json<{
      user: { id: string }
    }>()

    await env.DB.prepare('delete from "account" where "userId" = ?').bind(me.user.id).run()
    const now = Date.now()
    await env.DB.prepare(
      `insert into "account" ("id", "accountId", "providerId", "userId", "createdAt", "updatedAt")
       values (?, ?, 'google', ?, ?, ?)`,
    )
      .bind(crypto.randomUUID(), 'google-subject-2', me.user.id, now, now)
      .run()

    const listRes = await SELF.fetch('http://example.com/api/subscriptions', { headers: { cookie: googleCookie } })
    expect(listRes.status).toBe(200)
    expect(await listRes.json()).toEqual([])

    const readRes = await SELF.fetch(`http://example.com/api/subscriptions/${created.id}`, {
      headers: { cookie: googleCookie },
    })
    expect(readRes.status).toBe(404)
  })
})
