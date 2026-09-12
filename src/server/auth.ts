import { betterAuth } from 'better-auth'

/**
 * Built fresh per request: a D1 binding only exists inside a request's `env`
 * in Workers, so nothing here can be captured at module scope, and no route
 * can be registered conditionally on an environment variable's value.
 */
export function createAuth(env: Env, origin: string) {
  if (!env.BETTER_AUTH_SECRET) {
    throw new Error('BETTER_AUTH_SECRET is not set')
  }

  const trustedOrigins = env.APP_ORIGINS.split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  return betterAuth({
    baseURL: origin,
    secret: env.BETTER_AUTH_SECRET,
    database: env.DB,
    trustedOrigins,
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
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
