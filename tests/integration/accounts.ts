import { SELF, env } from 'cloudflare:test'
import { betterAuth } from 'better-auth'

/**
 * The seeding and sign-in dance every integration file needs, in one place.
 *
 * `headersFor` takes the client-address prefix as an argument rather than
 * hard-coding one: sign-in is rate limited at ten requests per sixty seconds
 * per client address, the limiter is database-backed, and the integration
 * database is shared across files and never reset. One prefix for every file
 * would put them all in one bucket and the failure would read as a flaky
 * sign-in rather than a throttle. Assignments in use:
 * `10.0.0.x` auth.test.ts, `10.1.0.x` subscriptions.test.ts,
 * `10.2.0.x` dev-seed.test.ts, `10.3.0.x` members.test.ts,
 * `10.4.0.x` prices.test.ts, `10.5.0.x` summary.test.ts,
 * `10.6.0.x` payments.test.ts, `10.7.0.x` recurring.test.ts,
 * `10.8.0.x` google-auth.test.ts, `10.9.0.x` subscription-deletion.test.ts.
 * Two files take no prefix because neither
 * signs in through a route: router-isolation.test.ts
 * asks each router directly, and member-removal.test.ts seeds its account with
 * `seedUser` and calls the repository.
 */

export const TEST_PASSWORD = 'correct horse battery staple'

/** Sign-up stays enabled here so tests can seed accounts the public API refuses to create. */
export function seedingAuth() {
  return betterAuth({
    baseURL: 'http://example.com',
    database: env.DB,
    emailAndPassword: { enabled: true, disableSignUp: false },
  })
}

export function extractSessionCookie(res: Response): string {
  const setCookie = res.headers.get('set-cookie')
  if (!setCookie) throw new Error('no set-cookie header on response')
  return setCookie.split(';')[0]
}

export function headersFor(prefix: string, testId: string, extra?: Record<string, string>): Record<string, string> {
  return {
    'content-type': 'application/json',
    'cf-connecting-ip': `${prefix}.${testId}`,
    origin: 'http://example.com',
    ...extra,
  }
}

export async function seedUser(email: string, password: string = TEST_PASSWORD, name = 'Owner') {
  const auth = seedingAuth()
  return auth.api.signUpEmail({ body: { email, password, name } })
}

/** Seeds an account and returns the session cookie of a fresh sign-in from `prefix.testId`. */
export async function signedInCookie(prefix: string, testId: string, email: string): Promise<string> {
  await seedUser(email)

  const res = await SELF.fetch('http://example.com/api/auth/sign-in/email', {
    method: 'POST',
    headers: headersFor(prefix, testId),
    body: JSON.stringify({ email, password: TEST_PASSWORD }),
  })
  return extractSessionCookie(res)
}

/**
 * Inserts a subscription row straight into the test database, with no owner
 * member and no ranges. Phase 2 made the owner part of every create, so no
 * route can produce this state any more, and the summary's 409 for a
 * subscription that predates that rule is the one behaviour that still needs
 * it as a precondition. Nothing else should reach around the API this way.
 */
export async function insertOwnerlessSubscription(cookie: string, startMonth = '2026-01'): Promise<string> {
  const meRes = await SELF.fetch('http://example.com/api/me', { headers: { cookie } })
  const me = await meRes.json<{ user: { id: string } }>()

  const id = crypto.randomUUID()
  await env.DB.prepare(
    `insert into subscriptions (id, user_id, name, currency, locale, time_zone, start_month, created_at)
     values (?, ?, 'Legacy plan', 'PLN', 'pl-PL', 'Europe/Warsaw', ?, ?)`,
  )
    .bind(id, me.user.id, startMonth, new Date().toISOString())
    .run()

  return id
}
