/// <reference types="@cloudflare/workers-types" />

/**
 * Worker bindings, kept by hand so the repository does not carry the very large
 * file `wrangler types` generates. Keep in step with `wrangler.jsonc`.
 */
declare namespace Cloudflare {
  interface Env {
    DB: D1Database
    BETTER_AUTH_SECRET: string
    APP_ORIGINS: string
    COOKIE_SECURE: string
    SEED_ENABLED: string
    SEED_TOKEN: string
  }
}

interface Env extends Cloudflare.Env {}
