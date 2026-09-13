import { describe, expect, it } from 'vitest'
import { createAuth } from './auth'

function baseEnv(overrides: Partial<Env> = {}): Env {
  return {
    DB: {} as D1Database,
    BETTER_AUTH_SECRET: 'unit-test-secret',
    APP_ORIGINS: 'http://example.com',
    COOKIE_SECURE: 'true',
    SEED_ENABLED: 'false',
    SEED_TOKEN: 'unused',
    TEST_MIGRATIONS: [],
    ...overrides,
  }
}

describe('createAuth', () => {
  it('throws when BETTER_AUTH_SECRET is missing, which the dev-seed route shares by building its own instance through this same factory', () => {
    expect(() => createAuth(baseEnv({ BETTER_AUTH_SECRET: '' }), 'http://example.com')).toThrow(/BETTER_AUTH_SECRET/)
    expect(() =>
      createAuth(baseEnv({ BETTER_AUTH_SECRET: '' }), 'http://example.com', { disableSignUp: false }),
    ).toThrow(/BETTER_AUTH_SECRET/)
  })

  it('throws rather than silently trusting every origin when APP_ORIGINS is missing', () => {
    expect(() =>
      createAuth(baseEnv({ APP_ORIGINS: undefined as unknown as string }), 'http://example.com'),
    ).toThrow(/APP_ORIGINS/)
  })

  it('throws when APP_ORIGINS is set but resolves to no origins at all', () => {
    expect(() => createAuth(baseEnv({ APP_ORIGINS: '' }), 'http://example.com')).toThrow(/APP_ORIGINS/)
    expect(() => createAuth(baseEnv({ APP_ORIGINS: ' , , ' }), 'http://example.com')).toThrow(/APP_ORIGINS/)
  })
})

const GOOGLE_ID = 'unit-test-google-client-id'
const GOOGLE_SECRET = 'unit-test-google-client-secret'

/**
 * The resolved options, read without a database. `createAuth` returns
 * synchronously but starts its adapter initialisation in a promise, and the
 * stub `DB` here can never satisfy it; the rejection is swallowed because
 * these cases assert configuration, not connectivity.
 */
function optionsFor(overrides: Partial<Env> = {}) {
  const auth = createAuth(baseEnv(overrides), 'http://example.com')
  void auth.$context.catch(() => undefined)
  return auth.options
}

describe('the Google provider, registered only on a complete pair', () => {
  it('registers no google provider when the client id is absent', () => {
    expect(optionsFor({ GOOGLE_CLIENT_SECRET: GOOGLE_SECRET }).socialProviders?.google).toBeUndefined()
  })

  it('registers no google provider when the client secret is absent', () => {
    expect(optionsFor({ GOOGLE_CLIENT_ID: GOOGLE_ID }).socialProviders?.google).toBeUndefined()
  })

  it('registers no google provider when both are absent, which is the state the test suite runs in', () => {
    expect(optionsFor().socialProviders?.google).toBeUndefined()
  })

  it('registers google with the three default scopes when both are present', () => {
    const google = optionsFor({ GOOGLE_CLIENT_ID: GOOGLE_ID, GOOGLE_CLIENT_SECRET: GOOGLE_SECRET }).socialProviders
      ?.google

    expect(google?.clientId).toBe(GOOGLE_ID)
    expect(google?.clientSecret).toBe(GOOGLE_SECRET)
    expect(google?.includeGrantedScopes).toBe(false)
    expect(google && 'scope' in google).toBe(false)
  })
})

describe('decision D-013, the linking rule as configuration rather than accident', () => {
  it('disables implicit linking and lists no trusted provider, whether or not google is configured', () => {
    const unconfigured = optionsFor()
    const configured = optionsFor({ GOOGLE_CLIENT_ID: GOOGLE_ID, GOOGLE_CLIENT_SECRET: GOOGLE_SECRET })

    for (const options of [unconfigured, configured]) {
      expect(options.account?.accountLinking?.disableImplicitLinking).toBe(true)
      expect('trustedProviders' in (options.account?.accountLinking ?? {})).toBe(false)
    }
  })

  it('sends an api error to the app root, so a failed oauth state lands on the login screen', () => {
    expect(optionsFor().onAPIError?.errorURL).toBe('/')
    expect(optionsFor({ GOOGLE_CLIENT_ID: GOOGLE_ID, GOOGLE_CLIENT_SECRET: GOOGLE_SECRET }).onAPIError?.errorURL).toBe(
      '/',
    )
  })
})
