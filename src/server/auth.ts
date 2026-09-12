import { betterAuth } from 'better-auth'

/**
 * Built fresh per request: a D1 binding only exists inside a request's `env`
 * in Workers, so nothing here can be captured at module scope, and no route
 * can be registered conditionally on an environment variable's value.
 *
 * `disableSignUp` is the one difference the dev-seed route needs (decision
 * D-005): it builds its auth instance through this same factory rather than
 * a second `betterAuth(...)` call, so the seed path shares the same secret,
 * trusted origins and rate limiting as the main instance and fails the same
 * way if either is misconfigured.
 */
export function createAuth(env: Env, origin: string, options?: { disableSignUp?: boolean }) {
  if (!env.BETTER_AUTH_SECRET) {
    throw new Error('BETTER_AUTH_SECRET is not set')
  }

  const trustedOrigins = (env.APP_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  if (trustedOrigins.length === 0) {
    throw new Error('APP_ORIGINS is not set: refusing to start with no trusted origins')
  }

  return betterAuth({
    baseURL: origin,
    secret: env.BETTER_AUTH_SECRET,
    database: env.DB,
    trustedOrigins,
    emailAndPassword: {
      enabled: true,
      disableSignUp: options?.disableSignUp ?? true,
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 10,
      storage: 'database',
      customRules: {
        '/sign-in/email': { window: 60, max: 10 },
      },
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ['cf-connecting-ip'],
      },
      cookies: {
        session_token: {
          attributes: {
            sameSite: 'lax',
            httpOnly: true,
            secure: env.COOKIE_SECURE !== 'false',
          },
        },
      },
    },
  })
}
