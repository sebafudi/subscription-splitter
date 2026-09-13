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
    /**
     * Google sign-in credentials. Optional: a deployment carrying neither
     * registers no Google provider and renders no Google button, which is a
     * supported state and the one continuous integration runs in.
     */
    GOOGLE_CLIENT_ID?: string
    GOOGLE_CLIENT_SECRET?: string
  }
}

interface Env extends Cloudflare.Env {}
