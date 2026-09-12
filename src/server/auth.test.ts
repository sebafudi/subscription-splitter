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
