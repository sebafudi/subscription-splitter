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

  const googleProvider =
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            includeGrantedScopes: false,
          },
        }
      : undefined

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
    /**
     * Decision D-013: a Google identity never joins an existing password
     * account implicitly, so the seeded demo and reviewer accounts keep
     * provable ownership. `trustedProviders` is deliberately left unset, since
     * listing `google` there would link on the provider's say-so. Set whether
     * or not this deployment carries credentials, so the rule does not depend
     * on configuration that varies by environment.
     */
    account: {
      accountLinking: {
        disableImplicitLinking: true,
      },
    },
    /**
     * A callback whose OAuth state is missing, fabricated or expired has no
     * per-flow `errorCallbackURL` left to recover, so it falls back to this.
     * Without it the fallback is the library's own unstyled `/api/auth/error`
     * page and the login screen never sees the failure. Root-relative on
     * purpose, so one value is correct on every origin the app is reached on.
     */
    onAPIError: {
      errorURL: '/',
    },
    /**
     * Registered only when both values are present: the provider throws
     * `CLIENT_ID_AND_SECRET_REQUIRED` on an empty one, so a half-configured
     * deployment must offer no provider at all rather than a click that fails.
     * The provider's own defaults are the three identity scopes, which is what
     * D-012 fixes, so no `scope` option is set.
     */
    ...(googleProvider ? { socialProviders: googleProvider } : {}),
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
