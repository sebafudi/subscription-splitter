---
git_commit: c85b946
branch: main
repository: subscription-splitter
topic: "What the runtime-auth slice has to build on: scaffold, auth spike, Better Auth 1.7.4, D1 and the Workers test pool"
tags: [research, codebase, auth, d1, vitest-pool-workers, better-auth]
status: complete
---

# Research: runtime-auth-slice

Date and researcher fields the schema lists are omitted; this repository records provenance by commit
and change ID. Findings are separated into **Evidence** (read from the repository, the installed
packages or the vendor's own documentation), **Inference** (a conclusion drawn from evidence, stated
as such) and **Unknown** (must be settled by a test or a run during implementation).

## Research Question

What does the first vertical slice need to know before it is planned: what the committed scaffold
already provides, what the auth spike proved and what it left out, what Better Auth 1.7.4 actually
does as installed, what D1 and the Workers test pool constrain, and how a session reaches the client.

## Summary

The scaffold is a working single-Worker application with both test runners wired, so the slice adds
code rather than infrastructure. The spike settled the hard question, Better Auth runs on Workers
over D1, and its configuration can be copied forward almost verbatim. Three things the spike left
open have to be designed in this slice, and each one has a test the team lead already asked for:
the auth secret is never set, `trustedOrigins` is absent, and rate limiting runs in per-isolate
memory rather than in the database. One finding changes a route's shape: Better Auth only performs
its origin and CSRF check when the call carries the request headers, and the spike's thin login
route did not pass them, so as written it has no origin protection at all.

## Detailed Findings

### The committed scaffold (Evidence, commit c85b946)

- `src/server/index.ts` is a single Hono app typed with `Bindings = { DB: D1Database }`, exposing
  `GET /api/health` and exported as the default. Everything this slice adds composes into it.
- `wrangler.jsonc` holds `main: ./src/server/index.ts`, `compatibility_flags: ["nodejs_compat"]`
  (required by Better Auth for AsyncLocalStorage), an `assets` block with
  `not_found_handling: "single-page-application"`, and one D1 binding `DB` for
  `subscription-splitter-db` with `migrations_dir: "migrations"` inside the binding entry.
- The compatibility date is held at the newest date the runtime bundled with the test pool accepts.
  Raising it breaks the integration suite; this was found by running it, not by reading docs.
- `vite.config.ts` runs `react()` then `cloudflare()`. The client entry is `index.html` at the
  repository root pointing at `src/client/main.tsx`. `src/client/App.tsx` already fetches
  `/api/health`, which is the pattern the login screen follows.
- Three TypeScript projects: `tsconfig.worker.json` (covers `src/server`, `src/domain`, `tests`),
  `tsconfig.app.json` (client, DOM libs, `react-jsx`), `tsconfig.node.json` (config files).
  `npm run typecheck` runs all three.
- `env.d.ts` declares `Cloudflare.Env` with `DB` by hand; `tests/integration/env.d.ts` adds
  `TEST_MIGRATIONS`. Any new binding this slice introduces has to be added to `env.d.ts`, or the
  worker project stops typechecking.
- `vitest.unit.config.ts` runs `src/domain/**/*.test.ts` in node. `vitest.integration.config.ts`
  reads the migrations directory at config time, passes it as a `TEST_MIGRATIONS` binding and applies
  it in `tests/integration/apply-migrations.ts` as a setup file.
- `migrations/` currently holds only a README. The two migrations this slice adds are the first real
  ones, so the migration path itself is exercised for the first time here.

### What the spike proved and what it left out (Evidence, `evidence/spikes/auth-spike/`)

Carry forward verbatim:

- The instance factory, `src/auth/index.ts:7`, `createAuth(env: AuthEnv, baseURL?: string)`, returning
  `betterAuth({ baseURL, database: env.DB, emailAndPassword: { enabled: true, disableSignUp: true },
  rateLimit: { enabled: true, window: 60, max: 10 }, advanced: { cookies: { session_token: {
  attributes: { sameSite: "lax", httpOnly: true, secure: true } } } } })`.
- Per-request construction. Every route calls `createAuth(c.env, new URL(c.req.url).origin)` because
  a D1 binding only exists inside a request's `env` in Workers, and because the origin legitimately
  differs between the dev server and the deployed Worker.
- The mounted handler, `app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw))`.
- The error translation that turns a wrong password into a 401 rather than an uncaught exception:
  `auth.api.*` throws a Better Auth `APIError` on failure even with `asResponse: true`, so each thin
  route wraps the call and returns `c.json({ error: error.message }, error.statusCode)` for an
  `APIError`, rethrowing anything else.
- `GET /me` needs no try/catch: `auth.api.getSession({ headers: c.req.raw.headers })` returns a
  falsy value rather than throwing, so the 401 is an explicit branch.
- The seeding pattern: a second `betterAuth` instance built against the same `env.DB` with
  `disableSignUp: false`, then `auth.api.signUpEmail({ body: { email, password, name } })`, while the
  application's own instance keeps sign-up disabled.
- The test helpers: `extractSessionCookie(res)` reads the `set-cookie` header and keeps only the
  first `;`-delimited pair, which is then sent back as a `cookie` request header.

Explicitly spike-only, not to be copied: the ungated `POST /dev/seed` route, its inline instance with
no rate limiting or cookie configuration, and the hardcoded `baseURL: "http://example.com"` in the
test's seeding helper.

Left out by the spike, and therefore this slice's work:

1. **No `secret`.** `betterAuth` is called without a `secret` key anywhere, and `AuthEnv` declares
   only `DB`. Nothing in the spike establishes where the signing secret comes from.
2. **No `trustedOrigins`.** The option does not appear in the spike at all, and the spike's own
   report says cross-origin rejection was configured in principle but never exercised.
3. **Rate limiting is not durable.** See the next section; the spike's report claims it is backed by
   D1, and the installed package contradicts that.

### Better Auth 1.7.4 as installed (Evidence)

Read from `node_modules`, not from documentation, because the published docs track a newer branch:

- `@better-auth/core/dist/db/get-tables.mjs:33` reads
  `const shouldAddRateLimitTable = options.rateLimit?.storage === "database";`. The spike never set
  `storage`, so no rate-limit table exists and the counters live in whatever memory the isolate
  happens to have. On Workers that memory is not shared between isolates and does not survive them.
  To make the limit real, and to make a test of it meaningful, `rateLimit.storage` must be
  `"database"` and the migration must create the table.
- The rate-limit model in the same file defines `key` (string, unique, required), `count` (number,
  required) and `lastRequest` (number, bigint, required). With the conventional `id` primary key that
  is: `id TEXT PRIMARY KEY, key TEXT NOT NULL UNIQUE, count INTEGER NOT NULL, lastRequest INTEGER NOT NULL`.
- The `account` model in the installed version has `accountId`, `providerId`, `userId`, `accessToken`,
  `refreshToken`, `idToken`, `accessTokenExpiresAt`, `refreshTokenExpiresAt`, `scope`, `password`,
  `createdAt`, `updatedAt`. It has **no `issuer` field**, and there is no unique index on
  `(issuer, accountId)`. The published documentation for the main branch shows both. The spike's
  hand-written migration matches the installed version, which is why it worked.
- Origin and CSRF checking, `better-auth/dist/api/middlewares/origin-check.mjs`: `validateOrigin`
  opens with `const headers = ctx.request?.headers; if (!headers || !ctx.request) return;` (lines
  97-98). It then computes `useCookies = headers.has("cookie")` and returns early unless
  `forceValidate || useCookies` (line 108). A separate path forces validation whenever an `Origin` or
  `Referer` header is present (line 152). Untrusted origins raise `FORBIDDEN` / `INVALID_ORIGIN`.

From the vendor documentation, with references:

- Passing a D1 binding straight through as `database: env.DB` is the supported path, no adapter, and
  the binding is auto-detected. D1 has no interactive transactions, so the library uses batching for
  atomicity. Source: `docs/content/blogs/1-5.mdx` and `docs/content/docs/concepts/database.mdx`.
- The Hono integration mounts the handler exactly as the spike does, and the documented way to read a
  session in middleware is `auth.api.getSession({ headers: c.req.raw.headers })` stored on the Hono
  context. Source: `docs/content/docs/integrations/hono.mdx`.
- `emailAndPassword` accepts `enabled`, `disableSignUp`, `minPasswordLength` (default 8),
  `maxPasswordLength` (default 128) among others. Source:
  `docs/content/docs/reference/options.mdx`.
- `rateLimit` accepts `enabled`, `window`, `max`, `customRules`, `storage` and `modelName`. Same
  source.
- `trustedOrigins` takes a static array, or wildcard patterns such as `https://*.example.com`. Same
  source.
- `advanced` carries `cookies` for per-cookie names and attributes, `defaultCookieAttributes`,
  `cookiePrefix`, and `useSecureCookies` which forces the `Secure` attribute in every environment.
  Same source.

### The origin check and the thin login route (Evidence, then Inference)

Evidence: `validateOrigin` returns immediately when the call has no `ctx.request` or headers.

Inference: the spike's `POST /login` calls `auth.api.signInEmail({ body, asResponse: true })` and
passes no headers and no request, so no origin or CSRF validation runs on that route at all. The
protection the spike reported as built in applies to requests that reach the mounted
`/api/auth/*` handler, which does carry the raw request. A login route that keeps the thin shape has
to pass the request through, and the cross-origin test the team lead asked for is exactly what proves
whether it does.

Default we will take if passing headers does not produce a rejection: move the browser's login call
onto Better Auth's own mounted endpoint and keep the thin route only as a convenience wrapper for
tests. This is a fallback the plan names rather than an assumption it relies on.

### D1 (Evidence)

- No interactive transactions. Atomicity comes from `batch()`, which the library uses internally and
  which `applyD1Migrations` also uses: it creates its bookkeeping table, reads the applied names, then
  executes each migration's statements plus one bookkeeping insert in a single `db.batch(...)` call.
- Practical consequence for the repository layer: a write that must be atomic across statements is
  one `batch()` call, not a `BEGIN`/`COMMIT` pair. Nothing in this slice needs a multi-statement
  write, so the repository can use single prepared statements throughout.

### The Workers test pool, version 0.22.0 (Evidence)

- `cloudflare:test` exports `env`, `SELF`, `applyD1Migrations`, `reset`,
  `createExecutionContext`, `waitOnExecutionContext`, the Durable Object helpers, and the queue and
  workflow helpers. There is **no `fetchMock` export in this version**; the undici mocking types are
  declared but not exported.
- `env` and `SELF` both carry deprecation notices pointing at `cloudflare:workers`
  (`import { exports } from "cloudflare:workers"` and `exports.default.fetch()`). Both still work and
  the existing tests use them; this slice keeps the working style rather than migrating mid-slice.
- `applyD1Migrations(db: D1Database, migrations: D1Migration[], migrationsTableName?: string)` where
  `D1Migration` is `{ name: string; queries: string[] }`. `readD1Migrations(migrationsPath: string)`
  produces that array and is exported from the package root; a doc comment in the types claims a
  `/config` subpath that this version's `exports` map does not have.
- Isolated storage is a single line in the package README, "Implements isolated per-test storage",
  with no further detail anywhere in the package, and no configuration flag exposed in the pool's
  options schema. `reset()` is documented as "useful for resetting state between test blocks", with
  an `afterEach` example.
- **Cookies are not carried between `SELF.fetch` calls.** Nothing in the package documents a cookie
  jar and `SELF` is typed as a plain `Fetcher`. A test that signs in and then calls another route
  must extract `set-cookie` itself and send it back as a `cookie` header, which is what the spike's
  helper does.
- An `Origin` header is set through the ordinary `RequestInit`; there is no pool-specific helper.

Inference, flowing from the storage-isolation gap: a test that has to prove account B cannot read
account A's row should seed both accounts and make the assertion inside one test block, rather than
relying on state surviving or being cleared between blocks. If a block needs a clean database,
call `reset()` explicitly.

### Development origins and cookies (Inference and Unknown)

- Evidence: the dev server is `vite dev`, default port 5173, and the built Worker runs under
  `wrangler dev`, default port 8787. The spike ran on 18787. Both are origins Better Auth will see
  as the request origin.
- Inference: `trustedOrigins` has to contain whichever development origin is in use plus the
  deployed origin. Hardcoding them is wrong, so they come from an environment variable, `APP_ORIGINS`,
  comma-separated, with the value living in `.dev.vars` locally and in the deployment configuration
  remotely.
- Evidence: the spike's real `Set-Cookie` header on a plain http dev server carried
  `Secure; SameSite=Lax` and the subsequent curl calls with that cookie succeeded. Curl does not
  enforce cookie attributes.
- Unknown: whether a browser accepts that `Secure` cookie over `http://localhost`. Browsers treat
  localhost as a trustworthy origin, so it is expected to work, but no browser has exercised it in
  this project. The manual browser checklist in the plan is what settles it. If a browser rejects it,
  the fallback is to set `advanced.useSecureCookies` from an environment flag so that local
  development omits `Secure` while every deployed environment keeps it.

### How the client learns who is signed in (Evidence and Inference)

- Evidence: the session cookie is `httpOnly`, so no client script can read it.
- Inference: the client cannot hold session state of its own. It calls `GET /api/me`, which returns
  the user for a valid cookie and 401 otherwise, and treats any 401 from any call as "go back to the
  login screen". The fetch wrapper sets `credentials: "include"` so the cookie travels even if the
  client and the API are ever served from different origins during development.

## Code References

- `src/server/index.ts:1-14` - the Hono app this slice extends
- `wrangler.jsonc` - bindings, compatibility flags and the migrations directory
- `vitest.integration.config.ts:6-22` - migrations read at config time, injected as `TEST_MIGRATIONS`
- `tests/integration/apply-migrations.ts:1-7` - the setup file that applies them
- `tests/integration/health.test.ts:1-16` - the existing `SELF.fetch` and `env.DB` patterns
- `env.d.ts` - where a new binding must be declared
- `evidence/spikes/auth-spike/src/auth/index.ts:7-32` - the configuration to carry forward
- `evidence/spikes/auth-spike/src/index.ts:29-44` - the `APIError` try/catch to carry forward
- `evidence/spikes/auth-spike/migrations/0001_init.sql` - the four core tables, verbatim source for `0001_auth.sql`
- `node_modules/@better-auth/core/dist/db/get-tables.mjs:33-57` - rate-limit table gating and columns
- `node_modules/better-auth/dist/api/middlewares/origin-check.mjs:97-108,152` - when origin validation runs

## Architecture Insights

- The ownership rule has exactly one enforcement point per resource: the repository filters by
  `user_id` in the SQL itself, so a route cannot forget it by forgetting a check. A row that belongs
  to someone else is indistinguishable from a row that does not exist, which is what makes 404 the
  correct answer for both.
- Better Auth owns the identity tables and this project owns everything else. The boundary is the
  `user.id` string, which `subscriptions.user_id` references. No other table touches Better Auth's
  schema.
- Because the auth instance is built per request, its configuration is a pure function of the
  environment and the request origin. That keeps configuration testable and keeps secrets out of
  module scope.

## Historical Context (from prior changes)

- `context/decisions/D-001-auth-solution.md` - the decision this slice implements, including the
  objection that the auth migration is hand-maintained and the resolution that any schema change is a
  manual edit to that file.
- `context/foundation/bootstrap-verification.md` - the two failures found while scaffolding, and the
  reason the compatibility date is pinned.
- `context/foundation/test-plan.md` - risks 2 and 6 are this slice's rollout phase 1.

## Open Questions

1. **Does passing the raw request into `auth.api.signInEmail` produce an origin rejection?** Settled
   by the cross-origin test in phase 1. Default if not: move the browser's login onto the mounted
   Better Auth endpoint.
2. **Does a browser accept the `Secure` session cookie over `http://localhost`?** Settled by the
   manual browser checklist. Default if not: drive `advanced.useSecureCookies` from an environment
   flag.
3. **Does the rate limit trip reliably under the test pool once storage is the database?** Settled by
   the rate-limit test. Default if the limit proves flaky in tests: keep the configuration, move the
   assertion to a direct call against the auth instance rather than through `SELF.fetch`.
4. **Is `reset()` needed between integration test blocks?** Settled by writing the isolation test as
   a single block first. Default: no `reset()` unless a block proves it needs one.
