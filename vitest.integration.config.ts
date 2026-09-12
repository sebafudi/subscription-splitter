import path from 'node:path'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(import.meta.dirname, 'migrations'))

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            // Test-only values; real secrets never land in a committed config.
            BETTER_AUTH_SECRET: 'integration-test-secret-not-for-production',
            APP_ORIGINS: 'http://example.com',
            COOKIE_SECURE: 'true',
            SEED_ENABLED: 'true',
            SEED_TOKEN: 'integration-test-seed-token',
          },
        },
      }),
    ],
    test: {
      name: 'integration',
      include: ['tests/integration/**/*.test.ts'],
      setupFiles: ['./tests/integration/apply-migrations.ts'],
    },
  }
})
