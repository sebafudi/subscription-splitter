# Auth spike evidence

This directory is a compatibility spike, kept as reference evidence, not
application code. It proves that Better Auth runs on Hono plus Cloudflare
D1 inside the Workers runtime, both under `@cloudflare/vitest-pool-workers`
and under a real `wrangler dev` process: seeding an account with public
sign-up disabled, login setting a session cookie, reading the session,
rejecting a wrong password, and logout invalidating the session.

Goal ID: D01, Workers runtime compatibility with auth and local D1.
Status: partial. Proven here in a scratch project outside this repository;
still to be re-proven inside the application's own first auth-carrying
slice, with its own tests, against this application's actual code.

See `REPORT.md` for the full write-up: recommendation, versions, commands
run with trimmed real output, required config, cookie and CSRF and
rate-limit settings, the seeding approach, and unresolved issues. See
`context/decisions/D-001-auth-solution.md` in this repository for the
adopted decision this spike backs.

## Files

- `REPORT.md`: the full spike report.
- `curl-output.txt`: trimmed curl transcript against a real `wrangler dev`
  process, session token and cookie values scrubbed.
- `vitest-output.txt`: trimmed automated test run output.
- `wrangler.jsonc`: Worker config used in the spike, D1 binding,
  `nodejs_compat`, migrations directory.
- `vitest.config.ts`: Vitest config wiring `@cloudflare/vitest-pool-workers`
  and D1 migrations for the test run.
- `package.json`: dependency versions used in the spike.
- `migrations/0001_init.sql`: hand-maintained Better Auth core schema,
  user, session, account, verification.
- `src/auth/index.ts`: Better Auth instance factory used in the spike.
- `src/index.ts`: the spike's Hono app, mounted auth handler, login,
  logout, me, and a spike-only seeding route.
- `test/apply-migrations.ts`: applies the D1 migrations before the test run.
- `test/auth.test.ts`: the automated tests described above.
