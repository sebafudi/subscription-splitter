# Auth + D1 runtime compatibility spike

Goal IDs touched: D01 (Workers runtime compatibility with auth + local D1).

## Recommendation: Candidate A, Better Auth

Better Auth ran cleanly on the first attempt, on local D1, inside the Workers
runtime, both in the vitest-pool-workers test runner and in a real
wrangler dev process. Since it cleared the time-box on the first attempt,
Candidate B (standard-primitive sessions) was not built out. It stays
documented below as the fallback and comparison point only.

Concrete reasons observed, not opinions:

- Better Auth 1.5+ accepts a D1 binding directly as `database: env.DB`, no
  custom adapter needed. Its Kysely-based D1 dialect detects the binding by
  duck typing (`batch`, `exec`, `prepare` present on the object) and handles
  query execution and introspection itself.
- D1 does not support interactive transactions. Better Auth's D1 dialect
  works around this using D1's `batch()` API, so multi-statement writes stay
  atomic without any app-level workaround.
- Requires `compatibility_flags: ["nodejs_compat"]` in wrangler.jsonc (or the
  narrower `nodejs_als` flag) because Better Auth uses Node's
  AsyncLocalStorage for request context tracking. Confirmed working with
  nodejs_compat in this spike.
- `emailAndPassword.disableSignUp: true` cleanly blocks the public sign-up
  endpoint while a separately constructed Better Auth instance, same D1
  binding, `disableSignUp: false`, can still seed users through the same
  `signUpEmail` server API. Verified both in tests and against a live
  wrangler dev process.
- Session cookies are HttpOnly, Secure, SameSite=Lax by default in
  production mode, and were also set explicitly in this spike via
  `advanced.cookies`. Confirmed by inspecting the real Set-Cookie header
  from wrangler dev.
- Built-in `rateLimit` option (window, max) is available and backed by the
  same D1 database, no separate throttling table needed.
- Origin/CSRF protection ships built-in (`trustedOrigins`,
  `advanced.disableCSRFCheck`, `advanced.disableOriginCheck`), so this does
  not need to be hand-rolled the way it would for Candidate B.

Rough edge found and isolated: a failed `signInEmail` call, wrong password,
produces an "Unhandled Rejection" warning from Vitest when run under
`@cloudflare/vitest-pool-workers`, even though the request path itself
already catches the thrown APIError and returns the correct 401 (the test
that exercises this passes). Disabling rateLimit did not remove it. It did
not reproduce when hitting the same route through a real wrangler dev server
with curl, the dev log only shows the expected
`WARN [Better Auth]: Invalid password` line, no unhandled rejection. Treat
it as a test-harness-only artifact of this Better Auth version until proven
otherwise. It is not a blocker for D01 but is worth re-checking if Better
Auth or the pool-workers package are upgraded.

## Versions installed (from package-lock.json)

| package | version |
|---|---|
| better-auth | 1.7.4 |
| hono | 4.13.7 |
| wrangler | 4.131.1 |
| vitest | 4.1.11 |
| @cloudflare/vitest-pool-workers | 0.22.0 |
| @cloudflare/workers-types | 5.20260911.1 |
| typescript | 7.0.2 |

Note: vitest had to be pinned to `^4.1.0`, not the `^5.0.0` that an
unpinned install currently resolves to, to satisfy
`@cloudflare/vitest-pool-workers`'s peer dependency. Installing vitest
unpinned causes an ERESOLVE conflict. package.json also needs
`"type": "module"`, or vitest.config.ts fails to load
`@cloudflare/vitest-pool-workers`, an ESM-only package loaded via require
otherwise.

## What ran

### Migrations applied to local D1

Command:
```
npx wrangler d1 migrations apply auth-spike-db --local
```
Output, trimmed:
```
Migrations to be applied:
name
0001_init.sql
Executing on local database auth-spike-db (00000000-0000-0000-0000-000000000000) from .wrangler/state/v3/d1:
8 commands executed successfully.
name            status
0001_init.sql   OK
```

### Automated test run

Command:
```
npx vitest run
```
Output, trimmed:
```
Test Files  1 passed (1)
     Tests  6 passed (6)
    Errors  1 error   (the harness-only unhandled-rejection warning above)
  Duration  4.48s
```

All 6 required behaviors passed:
- seed a user via the server-side signUpEmail API while public signup stays disabled
- POST /login sets a session cookie
- GET /me with the cookie returns the user
- GET /me without the cookie returns 401
- POST /login with the wrong password returns 401
- POST /logout invalidates the session, subsequent /me is 401

Full trimmed transcript kept in vitest-output.txt in this directory.

### wrangler dev against real local D1, exercised with curl

Started headless on an unused port, backgrounded, then exercised with curl,
then killed. Nothing was deployed remotely and no Cloudflare resources were
created.

Command used to start it:
```
npx wrangler dev --port 18787 --local
```

Seed a user via the server-side signUp API, spike-only /dev/seed route:
```
curl -s -X POST http://localhost:18787/dev/seed -H 'content-type: application/json' \
  -d '{"email":"owner@example.com","password":"correct horse battery staple","name":"Owner"}'
```
Output:
```
{"token":"...","user":{"name":"Owner","email":"owner@example.com","emailVerified":false, ...}}
```

Login with correct password:
```
curl -sD - -X POST http://localhost:18787/login -H 'content-type: application/json' \
  -d '{"email":"owner@example.com","password":"correct horse battery staple"}'
```
Output, headers and body:
```
HTTP/1.1 200 OK
Set-Cookie: better-auth.session_token=...; Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=Lax

{"redirect":false,"token":"...","user":{"name":"Owner","email":"owner@example.com", ...}}
```

/me with the session cookie:
```
curl -s -w '\nHTTP_STATUS:%{http_code}\n' http://localhost:18787/me -H "cookie: $COOKIE"
```
Output:
```
{"user":{"name":"Owner","email":"owner@example.com", ...}}
HTTP_STATUS:200
```

/me without the cookie:
```
curl -s -w '\nHTTP_STATUS:%{http_code}\n' http://localhost:18787/me
```
Output:
```
{"error":"unauthorized"}
HTTP_STATUS:401
```

Login with the wrong password:
```
curl -s -w '\nHTTP_STATUS:%{http_code}\n' -X POST http://localhost:18787/login -H 'content-type: application/json' \
  -d '{"email":"owner@example.com","password":"nope"}'
```
Output:
```
{"message":"Invalid email or password","code":"INVALID_EMAIL_OR_PASSWORD"}
HTTP_STATUS:401
```

Logout:
```
curl -s -w '\nHTTP_STATUS:%{http_code}\n' -X POST http://localhost:18787/logout -H "cookie: $COOKIE"
```
Output:
```
{"success":true}
HTTP_STATUS:200
```

/me after logout:
```
curl -s -w '\nHTTP_STATUS:%{http_code}\n' http://localhost:18787/me -H "cookie: $COOKIE"
```
Output:
```
{"error":"unauthorized"}
HTTP_STATUS:401
```

Full curl transcript kept in curl-output.txt. Full dev server log kept in
wrangler-dev.log. The only warning line present there is the expected
`WARN [Better Auth]: Invalid password`, no unhandled errors.

## Required config

- wrangler.jsonc: `d1_databases` entry with `binding: "DB"`,
  `migrations_dir: "migrations"`, and
  `compatibility_flags: ["nodejs_compat"]`.
- package.json: `"type": "module"`, vitest pinned to `^4.1.0`.
- vitest.config.ts: uses `cloudflareTest` and `readD1Migrations` from
  `@cloudflare/vitest-pool-workers`, both exported by the installed 0.22.0
  package, pointed at wrangler.jsonc, with migrations passed in as a
  TEST_MIGRATIONS binding.
- Migration application in tests: SQL migration files under migrations/,
  applied in test/apply-migrations.ts using applyD1Migrations from
  cloudflare:test against env.DB and env.TEST_MIGRATIONS, as a Vitest
  setupFiles entry so it runs once before the suite. The migration file
  itself was written by hand from Better Auth's documented core schema,
  user, session, account, verification, because Better Auth's own CLI
  schema generator needs a live database connection to introspect, and D1
  can only be reached from inside a Worker, not from a Node CLI process. If
  Better Auth's D1 support is used going forward, keep this migration file
  hand-maintained, or generate it once through a temporary in-Worker
  migrate-style endpoint as Better Auth's own docs suggest for D1, then copy
  the result out into a checked-in migration file.

## Cookie, CSRF, and rate-limit settings actually used

- Cookie: `better-auth.session_token`, HttpOnly, Secure, SameSite=Lax,
  confirmed from the real Set-Cookie header above. Configured explicitly in
  src/auth/index.ts via `advanced.cookies.session_token.attributes`, on top
  of Better Auth's own secure-by-default behavior.
- CSRF and origin protection: built-in origin-header validation against
  trustedOrigins, plus Fetch Metadata, Sec-Fetch-*, checks, both on by
  default. Not exercised end to end in this spike, no cross-origin request
  was sent. Still to do in the real app: set trustedOrigins to the real
  production origin or origins, and add a test that a cross-origin
  POST /login from a disallowed origin is actually rejected.
- Rate limiting: `rateLimit: { enabled: true, window: 60, max: 10 }`
  configured and backed by the same D1 database, no separate throttling
  table needed since Better Auth manages its own rate-limit storage. Not
  load-tested in this spike. Still to do: confirm the limit actually trips
  under repeated failed logins, and decide production window and max
  values.

## Seeding approach for owner and reviewer accounts

Verified pattern: construct a second, otherwise-identical Better Auth
instance with `emailAndPassword.disableSignUp: false`, and call
`auth.api.signUpEmail(...)` directly, server-side, against the same D1
binding used by the main app, whose own instance keeps
`disableSignUp: true`, so the public /api/auth/sign-up/email route stays
blocked for everyone else. In this spike that pattern lives at the
POST /dev/seed route in src/index.ts, which is spike-only scaffolding built
to prove the pattern against a real wrangler dev process. It is not part of
the recommended production design and should not be carried into the app as
a permanent route.

For the real app: run the same signUpEmail call once, from a one-off local
script, or a temporary admin endpoint that is removed again right after use,
not a permanent route left mounted in the app. Credentials for local seeding
go in .dev.vars, gitignored, not committed to source. Credentials or
secrets needed at deploy time go through `wrangler secret put`, never
hardcoded in source.

## Exposing Better Auth routes under Hono and reading the session

Mount Better Auth's own handler once, under a wildcard, and let it own
everything under that path:

```ts
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  const auth = createAuth(c.env, new URL(c.req.url).origin);
  return auth.handler(c.req.raw);
});
```

This gives the app all of Better Auth's own endpoints for free, sign-in,
sign-out, get-session, and so on, without hand-writing them. The spike also
adds thin app-specific routes, POST /login, POST /logout, GET /me, that call
`auth.api.signInEmail`, `auth.api.signOut`, and `auth.api.getSession`
directly rather than going through the mounted handler, since the brief
asked for exactly those three route shapes. A request handler built this
way constructs a fresh Better Auth instance per request from `c.env`, since
D1 bindings only exist inside a request's env in Workers, they cannot be
captured once at module scope the way a single long-lived Node server would.

To read the session in a middleware, guarding any other route in the app,
the same `auth.api.getSession` call used in GET /me is the building block:

```ts
async function requireSession(c, next) {
  const auth = createAuth(c.env, new URL(c.req.url).origin);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "unauthorized" }, 401);
  c.set("session", session);
  await next();
}
```

This was exercised indirectly in the spike, since GET /me is exactly this
check inlined into a route rather than factored into Hono middleware, but
the /me test results above, 200 with a valid cookie and user body, 401 with
none, demonstrate the same underlying call working correctly. Factoring it
into an actual Hono middleware for reuse across protected routes is
mechanical and was not separately re-tested.

Error handling note: `auth.api.*` calls throw a Better Auth APIError on
failure even when called with `asResponse: true`, they do not return a
response object for the error case. Both POST /login and POST /logout in
the spike wrap the call in a try/catch and translate a caught APIError into
a JSON response with the error's own status code, this is what turns a
wrong password into a 401 rather than an uncaught exception. Any real route
built the same way needs the same try/catch, not just the happy path.

## Unresolved issues and risks

- The harness-only unhandled-rejection warning on failed login, described
  above, is unresolved as to root cause. It did not reproduce under real
  wrangler dev, so it is not believed to affect production behavior, but it
  was not traced to a specific line inside Better Auth's dispatch or
  telemetry code in the time available.
- CSRF and origin rejection, and rate-limit tripping, were configured but
  not exercised by an automated test in this spike, both are worth a
  follow-up test once the real app's origins are known.
- The migration file for Better Auth's schema is hand-written, not
  generated by Better Auth's own CLI, because that CLI needs a live
  database connection D1 cannot provide outside a Worker. Any future change
  to Better Auth's core schema fields, for example a new plugin needing
  extra columns, needs this same file hand-updated, or generated once via a
  temporary in-Worker migration endpoint and copied out.
- Candidate B, standard-primitive sessions, was not implemented or tested
  in this spike, since Candidate A cleared its time-box. If Better Auth is
  later rejected for other reasons, bundle size, plugin surface, dependency
  risk, Candidate B still needs its own compatibility pass before it could
  be recommended in Better Auth's place.

## Runnable spike code, exact paths

Base directory:
`/private/tmp/claude-502/-Users-sebastian-f-Projects-10xDevs/1fcb8003-5685-4a1b-9ed2-06d63bfe7bb1/scratchpad/auth-spike/`

- `wrangler.jsonc`
- `tsconfig.json`
- `vitest.config.ts`
- `package.json`, `package-lock.json`
- `migrations/0001_init.sql`
- `src/auth/index.ts`
- `src/index.ts`
- `test/apply-migrations.ts`
- `test/auth.test.ts`
- `curl-output.txt`, `vitest-output.txt`, `wrangler-dev.log`, raw transcripts backing the output above
