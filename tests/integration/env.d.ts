/// <reference types="@cloudflare/vitest-pool-workers/types" />

/** Extra bindings the integration test pool provides on top of the Worker's own. */
declare namespace Cloudflare {
  interface Env {
    TEST_MIGRATIONS: D1Migration[]
  }
}
