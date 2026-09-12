/// <reference types="@cloudflare/workers-types" />

/**
 * Worker bindings, kept by hand so the repository does not carry the very large
 * file `wrangler types` generates. Keep in step with `wrangler.jsonc`.
 */
declare namespace Cloudflare {
  interface Env {
    DB: D1Database
  }
}

interface Env extends Cloudflare.Env {}
