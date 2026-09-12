# Implementation plan: runtime-auth slice

## Overview

Bring the application to life end to end for the first time: an organizer signs in to a seeded
account, sees and creates their own subscription, and is refused every record belonging to another
account. This is roadmap item S-01. It establishes the ownership rule, the session lifecycle and the
first migrations, all of which every later slice builds on.

## Current state analysis

The scaffold at commit `c85b946` runs a single Hono Worker with `GET /api/health`, a React client
built by Vite into assets the same Worker serves, a D1 binding named `DB`, and both test runners
wired, with the integration runner reading `migrations/` at config time and applying it in setup.
There is no migration yet, no auth, no repository layer and no screen beyond a health readout.

Decision D-001 settles the mechanism: Better Auth on the same Worker and the same D1 binding, public
sign-up disabled, accounts seeded server-side. The compatibility spike proved the runtime combination
and left three things unbuilt, each confirmed against the installed package in
`context/changes/runtime-auth-slice/research.md`: no auth secret, no `trustedOrigins`, and rate
limiting running in per-isolate memory rather than the database.

## Desired end state

Two seeded accounts exist. Signing in from the browser sets a session cookie and lands on a screen
showing the account email, the account's subscriptions and a form to create one. Reloading keeps the
session. Signing out ends it, and the previous cookie is worthless afterwards. Account B asking for
account A's subscription is told it does not exist, whether it reads or writes, and an unauthenticated
request gets nothing at all. Verified by the integration suite, the typecheck, and one manual browser
walkthrough recorded in the evidence directory.

### Key findings

- Rate limiting, origin checking and CSRF all live in one place: the router's request hook, reached
  only through `auth.handler(...)` (`node_modules/better-auth/dist/api/index.mjs:172` calling
  `onRequestRateLimit`). A direct `auth.api.signInEmail(...)` call dispatches through
  `to-auth-endpoints.mjs` and never touches the router, so it is neither throttled nor origin-checked.
  Sign-in and sign-out therefore go to the mounted endpoints, and the protections apply by
  construction rather than by remembering to pass something.
- Even on a direct call, the origin guard needs the request object, not the headers.
  `better-call` populates `ctx.request` from an explicitly passed `request` property
  (`node_modules/better-call/dist/context.mjs:23`), and both guards return early without it
  (`node_modules/better-auth/dist/api/middlewares/origin-check.mjs:96-98`). `signOut` carries no
  middleware array at all (`node_modules/better-auth/dist/api/routes/sign-out.mjs:15`), so a thin
  logout route could never have an origin check whatever it passed.
- A built-in special rule overrides the configured window and maximum for every path starting with
  `/sign-in`, `/sign-up`, `/change-password` or `/change-email`, setting them to three attempts in ten
  seconds (`node_modules/better-auth/dist/api/rate-limiter/index.mjs:301-306`). Entries in
  `rateLimit.customRules` are applied after it (same file, lines 259-275), so a custom rule for the
  sign-in path is what decides the numbers a test can assert.
- The limiter keys on a resolved client IP, read only from the headers named in
  `advanced.ipAddress.ipAddressHeaders`, which defaults to `["x-forwarded-for"]`
  (`node_modules/@better-auth/core/dist/utils/ip.mjs:196,206`). When nothing resolves it falls back to
  the single shared key `no-trusted-ip` per path (`rate-limiter/index.mjs:233,245`), which would let
  three failures from anyone lock out every account. On this runtime the trustworthy header is
  `cf-connecting-ip`.
- Per-cookie attributes win over everything: `advanced.cookies[name].attributes` is spread last in
  `createCookieGetter` (`node_modules/better-auth/dist/cookies/index.mjs:32-44`), after the `secure`
  value derived from `useSecureCookies`. `useSecureCookies` also drives the `__Secure-` name prefix on
  line 23, so flipping it renames the cookie. The per-cookie `secure` attribute is the only safe lever.
- The rate-limit table only exists when `rateLimit.storage === "database"`
  (`node_modules/@better-auth/core/dist/db/get-tables.mjs:33`). The spike left storage at its default,
  so its limiter was per-isolate memory. This slice sets storage to the database and creates the table.
- The installed Better Auth 1.7.4 `account` model has no `issuer` field, though the published
  documentation for a newer branch shows one. The spike's hand-written schema matches what is
  installed, and is copied forward unchanged.
- Cookies are not carried between `SELF.fetch` calls in the test pool. Tests extract `set-cookie` and
  send it back as a `cookie` header, as the spike's helper does.
- The test pool advertises isolated per-test storage in its README, but version 0.22.0 exposes no
  `isolatedStorage` option and carries no isolation machinery in its distributed code, so state written
  by one test is visible to the next. The one escape hatch is worse than the problem: `reset()` is
  `deleteAllDurableObjects()` (`node_modules/@cloudflare/vitest-pool-workers/dist/worker/lib/cloudflare/test-internal.mjs:826`)
  and miniflare's local D1 is itself a Durable Object
  (`node_modules/miniflare/dist/src/workers/d1/database.worker.js:146`), so calling it drops the tables
  the setup file created. Tests never call `reset()`. They use account emails unique per test so
  seeding cannot collide, and a `cf-connecting-ip` header unique per test so one test's rate-limit
  counter cannot answer another test with a 429.
- D1 has no interactive transactions; atomicity comes from `batch()`. Nothing in this slice needs a
  multi-statement write.

## What we are NOT doing

- No members, prices, break months, payments, recurring schedules or any money calculation. The
  domain module keeps only the two helpers the scaffold already has.
- No interface for more than one subscription per account, and no subscription deletion. The data
  model allows many rows; the screens exercise creation, listing and editing of one.
- No password reset, email verification, invitations or any self-service sign-up.
- No deployment, no remote database creation and no remote seeding. The remote procedure is written
  down for S-04 to follow, not executed here.
- No browser end-to-end test. The one smoke flow belongs to S-04; this slice's browser pass is a
  manual checklist with captured evidence.
- No observability, metrics or structured logging beyond what a failure already surfaces.

## Implementation approach

Test-first for the two phases that carry risk, because both of this slice's risks fail silently: a
session that outlives its sign-out and a record that leaks across accounts both look like success
from the outside. Each of those phases writes the integration test first, watches it fail for the
right reason, then makes it pass.

The ownership rule has exactly one enforcement point. The repository filters by `user_id` inside the
SQL, so a route cannot forget it by forgetting a check, and a row belonging to someone else is
indistinguishable from a row that does not exist. Routes translate `null` from the repository into
404 without knowing why it was null.

Phases are ordered so each one is reversible on its own and leaves the suite green: identity first,
then the owned resource, then the seeding path that makes the accounts real, then the screens that
use them, then the gate that keeps them working.

## Critical implementation details

**Protections live in the router, so sign-in and sign-out use the mounted endpoints.** Rate limiting,
origin validation and CSRF are applied by the router hook that only `auth.handler(...)` reaches. This
slice therefore builds no thin `POST /api/login` or `POST /api/logout`: the client and the tests call
`POST /api/auth/sign-in/email`, `POST /api/auth/sign-out` and, where convenient,
`GET /api/auth/get-session`. The cost is that the sign-in response body is the library's shape rather
than one this project chooses, which the client and the Phase 1 assertions are written against.
`GET /api/me` remains as a read-only convenience for the client, built on `getSession` with both
`headers` and `request` passed, so the guards that do apply to a direct call can run.

**The auth instance is built per request.** A D1 binding only exists inside a request's `env` in
Workers, so nothing auth-related can be captured at module scope, and no route can be registered
conditionally on the value of an environment variable. Gates are evaluated inside handlers.

**The suite shares one database and must never reset it.** There is no per-test isolation and
`reset()` would delete the tables. Every test that creates an account uses an email unique to that
test, and every test that signs in sends a `cf-connecting-ip` header unique to that test so the
rate-limit counters stay separate.

---

## Phase 1: Identity

### Overview

Sign-in, sign-out and session reading work against local D1 through the library's own mounted
endpoints, so the origin check and the rate limit are enforced by the router rather than by a route
remembering to ask for them. Written test-first.

### Required changes:

#### 1. Auth schema migration

**File**: `migrations/0001_auth.sql`

**Purpose**: Create the four tables Better Auth needs, plus the rate-limit table, so the library can
run against D1. Hand-maintained on purpose: the library's schema generator needs a live connection
that D1 cannot give a Node process, and D-001 records that any future schema change is a manual edit
to this file.

**Contract**: Copy the four `CREATE TABLE` statements and their indexes verbatim from
`evidence/spikes/auth-spike/migrations/0001_init.sql`: `user` (id, name, email unique,
emailVerified, image, createdAt, updatedAt), `session` (id, userId referencing user with cascade,
token unique, expiresAt, ipAddress, userAgent, createdAt, updatedAt, plus an index on userId),
`account` (id, accountId, providerId, userId referencing user with cascade, accessToken,
refreshToken, idToken, accessTokenExpiresAt, refreshTokenExpiresAt, scope, password, createdAt,
updatedAt, plus an index on userId) and `verification` (id, identifier, value, expiresAt, createdAt,
updatedAt, plus an index on identifier). Add one table the spike did not have, required because this
slice moves the limiter into the database:

```sql
CREATE TABLE "rateLimit" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "count" INTEGER NOT NULL,
  "lastRequest" INTEGER NOT NULL
);
```

#### 2. Auth instance factory

**File**: `src/server/auth.ts`

**Purpose**: Build the request-scoped Better Auth instance with the configuration D-001 fixed, and
close the three gaps the spike left: the signing secret, the trusted origins and durable rate-limit
storage.

**Contract**: `createAuth(env: Env, origin: string)` returning a `betterAuth` instance. Options:
`baseURL` set to the passed origin; `secret` from `env.BETTER_AUTH_SECRET`; `database: env.DB`;
`emailAndPassword: { enabled: true, disableSignUp: true }`; `trustedOrigins` parsed from
`env.APP_ORIGINS`, a comma-separated list, trimmed, empty entries dropped.

Rate limiting: `enabled: true`, `window: 60`, `max: 10`, `storage: "database"`, plus
`customRules` carrying an entry for the sign-in path, `"/sign-in/email": { window: 60, max: 10 }`.
The custom entry is not decoration: without it the library's built-in special rule silently governs
sign-in at three attempts in ten seconds, and every assertion written against the configured numbers
would be wrong. Paths in `customRules` are matched after the base path is stripped, so the key is
`/sign-in/email`, not `/api/auth/sign-in/email`.

Client address: `advanced.ipAddress.ipAddressHeaders: ["cf-connecting-ip"]`, the header this runtime
populates. Without it nothing resolves and every caller shares one bucket per path, which would let a
handful of failures from anyone lock out both accounts. The test pool supplies no such header by
itself, so the suite sets one per test and thereby exercises the keying as well as the mechanism.

Cookies: `advanced.cookies.session_token.attributes` set to `httpOnly: true`, `sameSite: "lax"` and
`secure: env.COOKIE_SECURE !== "false"`, defaulting to secure whenever the variable is unset. Nothing
else in the factory sets `secure`, and `useSecureCookies` is left alone, because it also drives the
`__Secure-` name prefix and flipping it would rename the cookie rather than change one attribute.

A missing `BETTER_AUTH_SECRET` throws at construction rather than starting with a default secret.

#### 3. Session middleware

**File**: `src/server/middleware/require-session.ts`

**Purpose**: One place that decides whether a request has a session, so every protected route inherits
the same answer.

**Contract**: A Hono middleware that builds the auth instance from `c.env` and the request origin,
calls `auth.api.getSession({ headers: c.req.raw.headers })`, returns `401` with a JSON body when there
is no session, and otherwise sets the session on the context for downstream handlers under a typed
variable.

#### 4. Auth routes

**File**: `src/server/routes/auth.ts`

**Purpose**: Let the library own sign-in and sign-out entirely, and add only the one read the client
cannot get any other way.

**Contract**: Mount `app.on(["POST", "GET"], "/api/auth/*", ...)` delegating to
`auth.handler(c.req.raw)`. That is the whole of sign-in and sign-out: the client and the tests call
`POST /api/auth/sign-in/email` and `POST /api/auth/sign-out`, so rate limiting, origin validation and
CSRF apply by construction. This slice deliberately builds no thin `POST /api/login` or
`POST /api/logout`; the spike's versions are not carried forward, because a direct `auth.api` call
bypasses the router and therefore every one of those protections.

Add `GET /api/me` as a read-only convenience, calling `auth.api.getSession` with both
`headers: c.req.raw.headers` and `request: c.req.raw`, returning the user or 401. It is wrapped in the
try/catch that translates a Better Auth `APIError` into a JSON response carrying the error's own status
code and rethrows anything else, following
`evidence/spikes/auth-spike/src/index.ts:29-44`. The library's own `GET /api/auth/get-session` remains
available and equivalent; `/api/me` exists so the client has one shape to read.

#### 5. Binding declarations

**File**: `env.d.ts`

**Purpose**: Keep the hand-maintained binding declarations in step with what the Worker now reads, or
the worker TypeScript project stops typechecking.

**Contract**: Add `BETTER_AUTH_SECRET: string`, `APP_ORIGINS: string`, `COOKIE_SECURE: string`,
`SEED_ENABLED: string` and `SEED_TOKEN: string` to `Cloudflare.Env` alongside `DB`.

#### 6. Auth integration tests

**File**: `tests/integration/auth.test.ts`

**Purpose**: Prove the session lifecycle and the protections that fail silently. Written before the
code in this phase, per test-plan risk 6.

**Contract**: Seeding uses a second Better Auth instance built against `env.DB` with
`disableSignUp: false`, as the spike does. Two local helpers: one extracts `set-cookie` and returns the
first `;`-delimited pair for reuse as a `cookie` header; one builds the headers for a request, giving
every test a `cf-connecting-ip` value unique to that test so rate-limit counters never cross tests.
Account emails are likewise unique per test. The suite never calls `reset()`.

Cases, all exercised through the mounted endpoints:

- `POST /api/auth/sign-in/email` returns 200 and sets a session cookie
- `GET /api/me` with that cookie returns the user, and `GET /api/auth/get-session` agrees
- `GET /api/me` without a cookie returns 401
- a wrong password returns 401
- after `POST /api/auth/sign-out`, the same cookie returns 401 from `/api/me`
- a session whose stored `expiresAt` is moved into the past returns 401 from `/api/me`, written by
  updating the `session` row directly through `env.DB` rather than waiting
- the public sign-up endpoint under `/api/auth/` is refused while server-side seeding still works
- a sign-in carrying an `Origin` header not in `APP_ORIGINS` is refused
- eleven failed sign-ins from one `cf-connecting-ip` inside the window trip the configured limit and
  the response says so; the numbers asserted are the ones the custom rule sets, not the library's
  built-in sign-in rule

The rate-limit case goes last in the file, or in its own file, because a tripped counter persists for
the length of the window in a database no test resets.

### Success criteria:

#### Automated verification:

- Integration tests pass: `npm run test:integration`
- Typecheck passes: `npm run typecheck`
- Unit tests still pass: `npm run test:unit`
- Migration applies to a local database: `npm run db:migrate:local`

#### Manual verification:

- The failing-first run of each new test failed for the stated reason, not for a setup error

**Implementation note**: After this phase and all its automated verification, stop for human
confirmation before moving to the next phase.

---

## Phase 2: The owned resource

### Overview

One subscription per row, owned through `user_id`, with reads and writes that cannot cross accounts
and a validation contract that rejects bad input before it reaches storage. Written test-first.

### Required changes:

#### 1. Validation dependency

**File**: `package.json`, `package-lock.json`

**Purpose**: Make the validation library a declared dependency of this project before anything imports
it.

**Contract**: Add `zod` to `dependencies` at the exact version `4.6.2`, matching the repository rule
that every dependency is pinned exactly. It is not declared today, and an import would resolve only by
accident, through a hoisted copy that a test-only transitive dependency happens to provide. The
lockfile change lands in the same step.

#### 2. Unit runner scope

**Files**: `vitest.unit.config.ts`, `AGENTS.md`, `README.md`

**Purpose**: Make the unit runner actually run the validation test this phase adds.

**Contract**: Widen the unit include from `src/domain/**/*.test.ts` to `src/**/*.test.ts`, which picks
up `src/server/validation/` while leaving the integration suite under `tests/` to its own runner and
config. Update the one-line description of unit-test scope in both `AGENTS.md` and `README.md` in the
same step, so the config and the two documents agree rather than drifting.

#### 3. Subscriptions migration

**File**: `migrations/0002_subscriptions.sql`

**Purpose**: The first table this project owns, and the root every later record hangs from.

**Contract**: `subscriptions(id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES "user"("id") ON
DELETE CASCADE, name TEXT NOT NULL, currency TEXT NOT NULL, locale TEXT NOT NULL, time_zone TEXT NOT
NULL, start_month TEXT NOT NULL CHECK (start_month GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]'), created_at
TEXT NOT NULL)` plus `CREATE INDEX subscriptions_user_id_idx ON subscriptions(user_id)`. Identifiers
are generated server-side with `crypto.randomUUID()`, never supplied by the client.

Two details are deliberate. The cascade matches every auth table carried over from the spike and
settles, once, what happens to a subscription when its account is removed; every child table in later
slices inherits that answer rather than an omission. The month pattern is as tight as SQLite's `GLOB`
can express, `[01][0-9]` rather than `[0-1][0-9]`, and the remaining gap, a stored `00` or `13` to
`19`, is closed by the range rule in the validation schema that every write passes through.

#### 4. Validation contract

**File**: `src/server/validation/subscriptions.ts`

**Purpose**: One declared schema for subscription input, shared by the routes and exercised directly
by a unit test, per the PRD's validation contract.

**Contract**: Zod schemas for create and patch. `name` non-empty after trimming; `currency` a
three-letter uppercase ISO code; `locale` a BCP-47 tag; `time_zone` an IANA zone accepted by `Intl`;
`start_month` matching `^\d{4}-(0[1-9]|1[0-2])$`. Create requires name and start month and defaults
currency to `PLN`, locale to `pl-PL` and time zone to `Europe/Warsaw`. Patch accepts a subset and
rejects an empty object. Unknown keys are rejected rather than ignored.

#### 5. Repository

**File**: `src/server/db/subscriptions.ts`

**Purpose**: The only place that writes SQL for this resource, and the single enforcement point for
ownership.

**Contract**: `list(db, userId)`, `create(db, userId, input)`, `get(db, id, userId)` and
`update(db, id, userId, patch)`. Every statement carries `where user_id = ?`; `get` and `update`
return `null` when nothing matched, without distinguishing absent from someone else's. `create`
generates the id and the created-at stamp. Rows are mapped to a camel-cased shape at this boundary so
no column name escapes the repository.

#### 6. Subscription routes

**File**: `src/server/routes/subscriptions.ts`

**Purpose**: The four operations the first screen needs, each behind the session middleware.

**Contract**: `GET /api/subscriptions` lists the session user's rows. `POST /api/subscriptions`
validates the body and returns 201 with the created row. `GET /api/subscriptions/:id` and
`PATCH /api/subscriptions/:id` return the row or 404. Status codes: 401 with no session, 400 with a
body that fails validation and a message naming the field at fault, 404 for an id that is missing or
belongs to another account.

#### 7. Composition

**File**: `src/server/index.ts`

**Purpose**: Assemble the routers and make the API's boundary explicit.

**Contract**: Mount the auth routes and the subscription routes, keep `GET /api/health`, and answer
any other `/api/*` path with a JSON 404 rather than falling through to the client shell. Non-API paths
continue to be served by the assets binding.

#### 8. Ownership and validation tests

**Files**: `tests/integration/subscriptions.test.ts`, `src/server/validation/subscriptions.test.ts`

**Purpose**: Prove test-plan risk 2 directly, and risk 3 for this resource's round trip. Written
before the code in this phase.

**Contract**: The integration test seeds two accounts with emails unique to the test and signs both in
inside one test block, since there is no storage isolation between blocks and no safe way to reset.
Each sign-in carries the test's own `cf-connecting-ip`. Cases: a subscription created by account A is
listed for A and absent from B's list; `GET` and `PATCH` from B against A's id both return 404; a
create followed by a fresh request returns the same row, proving it persisted rather than being held in
memory; every route returns 401 without a cookie; invalid bodies return 400, covering a bad month, a
bad time zone, an empty name and an unknown key. The unit test covers the schema's month format,
including the values the database pattern alone would admit, and its defaults, without touching a
binding.

### Success criteria:

#### Automated verification:

- Integration tests pass: `npm run test:integration`
- Unit tests pass: `npm run test:unit`
- Typecheck passes: `npm run typecheck`
- Both migrations apply in order to a clean local database: `npm run db:migrate:local`
- Zod is declared in `dependencies` at an exact version, and the lockfile records it
- The validation unit test is picked up by the unit runner, visible in its reported file count

#### Manual verification:

- The ownership tests failed first against the unwritten routes, and for the right reason

**Implementation note**: Stop for human confirmation before the next phase.

---

## Phase 3: Seeding the accounts

### Overview

A gated, idempotent way to create the owner and reviewer accounts without a permanent route, without
credentials in source, and without leaving a hole in a deployed environment.

### Required changes:

#### 1. Seed route

**File**: `src/server/routes/dev-seed.ts`

**Purpose**: Create the two accounts through the library's own API while public sign-up stays closed.
This is the only supported way to make an account exist.

**Contract**: `POST /api/dev/seed`, registered unconditionally, because a route cannot be registered
conditionally on an environment variable in this runtime: bindings and variables exist only inside a
request. Both gates are evaluated inside the handler. When `env.SEED_ENABLED !== "true"` the handler
answers 404. When the `x-seed-token` header is missing or does not equal `env.SEED_TOKEN`, compared
with a length-safe comparison, the handler also answers 404, so the response is never an oracle for
either the route's existence or the token's correctness. With both gates satisfied, the body carries
the accounts to create as email, password and name; nothing is read from source. Creation goes through
a second Better Auth instance with `disableSignUp: false` against the same binding. Idempotent: an
email that already exists is reported as unchanged rather than failing the call. The response never
echoes a password.

#### 2. Seeding decision record

**File**: `context/decisions/D-005-account-seeding.md`

**Purpose**: Keep the record in step with the route as built. The record already exists and was
committed with this plan; this phase edits it rather than writing it.

**Contract**: The only edits are the commit field, filled in when the slice lands, and the wording of
the gate, which now says the route is registered unconditionally and answers 404 from inside the
handler when either gate fails. Everything else in the record stands.

#### 3. Local variable names

**File**: `.dev.vars.example`

**Purpose**: Tell a developer which variables to set without telling anyone the values.

**Contract**: Names only, no values: `BETTER_AUTH_SECRET`, `APP_ORIGINS`, `COOKIE_SECURE`,
`SEED_ENABLED`, `SEED_TOKEN`, and the seeded account emails. A comment records that `COOKIE_SECURE` is
left unset in every deployed environment and set to `false` only in local development if a browser
refuses the cookie over plain http. The real `.dev.vars` stays ignored by git.

#### 4. Setup documentation and the placeholders it replaces

**Files**: `README.md`, `package.json`

**Purpose**: Make first-run reproducible, and clear the two artifacts that still describe this slice as
unfinished.

**Contract**: Extend the setup section with the variables to set, the order to run migrations and the
seed call, and a note that remote seeding follows the same procedure under S-04 with the variables set
and then removed. Replace the `seed:local` script, which currently exits 1 with a message saying
seeding lands with this slice, so that it performs the documented local seed call. Remove the two
stale README lines, the one saying sign-in is not yet wired up and the one calling `seed:local` a
placeholder.

### Success criteria:

#### Automated verification:

- Integration tests pass, including a seed call refused when the gate is off: `npm run test:integration`
- Typecheck passes: `npm run typecheck`
- All four cases the decision record names pass: gate off returns 404, gate on with a wrong token
  returns 404, gate on with the right token creates both accounts, and an identical second call
  reports them unchanged
- `npm run seed:local` performs the documented seed rather than exiting with a placeholder message,
  and no README line still describes this slice as unfinished

#### Manual verification:

- Running the documented setup from a clean local database produces two accounts that can both sign in
- With `SEED_ENABLED` unset, the seed path returns 404

**Implementation note**: Stop for human confirmation before the next phase.

---

## Phase 4: The first screens

### Overview

The browser side of the same flow: sign in, see the account and its subscriptions, create one, sign
out.

### Required changes:

#### 1. API client

**File**: `src/client/api.ts`

**Purpose**: One place that talks to the API, so session handling is not repeated per screen.

**Contract**: A wrapper over `fetch` that sends `credentials: "include"`, sets the JSON content type on
bodies, parses JSON responses, and turns a 401 into a signed-out state the application reacts to by
showing the login screen. Non-401 failures surface the server's message. Sign-in posts to
`/api/auth/sign-in/email` and sign-out to `/api/auth/sign-out`, the library's own endpoints, so both
carry the router's protections; the response bodies are the library's shapes and the client reads them
as such. Identity is read from `/api/me`. A 429 from sign-in is surfaced as its own message rather than
as a failed password.

#### 2. Screens

**Files**: `src/client/App.tsx`, `src/client/screens/Login.tsx`, `src/client/screens/Home.tsx`,
`src/client/screens/SubscriptionForm.tsx`

**Purpose**: The smallest set of screens that exercises the whole slice.

**Contract**: `App` asks `GET /api/me` once on load and renders the login screen or the home screen on
the answer. Login takes an email and a password, shows the server's error message on failure without
guessing which field was wrong, distinguishes a throttled response from a rejected password, and
disables submission while in flight. Home shows the account email,
the list of subscriptions, the create form and a sign-out button. The form takes a name, a currency
defaulting to PLN, a locale defaulting to pl-PL, a time zone defaulting to Europe/Warsaw and a start
month, and shows field-level messages from a 400. Signing out returns to the login screen.

#### 3. Layout

**File**: `src/client/index.css`

**Purpose**: A plain, readable layout that works on a phone without a component library.

**Contract**: One column with a readable measure, form controls that are legible at small sizes, and
visible focus states. No design system, no icon font, no external stylesheet.

### Success criteria:

#### Automated verification:

- Typecheck passes across all three projects: `npm run typecheck`
- Production build succeeds: `npm run build`
- The suite still passes: `npm test`

#### Manual verification:

- Sign in as the owner account, land on the home screen showing the account email
- Create a subscription, see it appear in the list
- Reload the page and find the session and the subscription still there
- Sign out, confirm the login screen returns and the browser back button does not restore the data
- Sign in as the reviewer account and confirm none of the owner's subscriptions are listed
- The layout is usable at a narrow phone width
- The session cookie is accepted by the browser over local http. Safari refuses a `Secure` cookie on
  plain http even on localhost while Chrome and Firefox accept it, so if sign-in appears to succeed and
  the next request is unauthenticated, set `COOKIE_SECURE=false` in `.dev.vars` and repeat. Deployed
  environments leave the variable unset and keep the attribute.

**Implementation note**: Stop for human confirmation before the next phase.

---

## Phase 5: The gate

### Overview

Continuous integration runs the same checks on every push and pull request, and the slice's evidence
is captured.

### Required changes:

#### 1. Workflow

**File**: `.github/workflows/ci.yml`

**Purpose**: Make the checks that matter run without anyone remembering to run them.

**Contract**: Triggered on push and on pull request. One job on a current Ubuntu runner: check out,
set up Node matching the version the project expects, `npm ci`, `npm run typecheck`,
`npm run test:unit`, `npm run test:integration`, `npm run build`. No deployment step and no secrets.
The install must succeed non-interactively, so the build-script approvals recorded in `package.json`
are what let `workerd` and `esbuild` install on the runner.

#### 2. Evidence

**File**: `evidence/runs/runtime-auth-slice-tests.txt`, `evidence/index.md`, `evidence/work-log.md`

**Purpose**: Keep the verification trail this project requires.

**Contract**: Save the captured output of the typecheck and both suites. Append one evidence row and
one work-log entry naming the slice, the risks covered and the commit. Append only; never rewrite
those two files.

### Success criteria:

#### Automated verification:

- The workflow file is valid and the same commands pass locally: `npm ci && npm run typecheck && npm test && npm run build`
- The captured output file exists and shows the passing counts

#### Manual verification:

- The workflow run on the pull request is green

---

## Testing strategy

### Unit tests:

- The subscription validation schema: month format, defaults, rejection of unknown keys, rejection of
  an empty patch.
- The existing money helpers keep passing untouched.

### Integration tests:

- Session lifecycle against local D1: sign in, read, wrong password, sign out invalidates, and a
  session whose stored expiry has passed is refused.
- Sign-up refused while server-side seeding still works.
- Cross-origin sign-in refused.
- Rate limit trips after the configured number of failures, asserted against the custom rule's numbers
  and placed last so its counter cannot answer a later test.
- The four seeding cases: gate off, wrong token, first call, identical second call.
- Ownership: list, read and patch across two accounts in one test block.
- Persistence: a created subscription is returned by a later, separate request.
- Validation: 400 responses for each named bad input.

### Risk mapping

| Test-plan risk | Covered by | Phase |
|---|---|---|
| 2, leaked data across accounts | ownership and 401 cases in `tests/integration/subscriptions.test.ts` | 2 |
| 6, session lifecycle | `tests/integration/auth.test.ts`: sign-in, sign-out invalidation, an expired session, cross-origin refusal and the throttling case. The throttling case proves the mechanism but not the keying, because the test pool supplies no client-address header of its own and the suite sets one per test | 1 |
| 3, lost or inconsistent persistence | the create-then-refetch case, and both migrations applying in order | 2 |
| 1, 4, 5 | not reachable in this slice; no money, members or schedules exist yet | - |

### Manual testing steps:

1. Run the documented setup against a clean local database and seed both accounts.
2. Sign in as the owner, create a subscription, reload, confirm both survive.
3. Sign out and confirm the login screen returns and no data is reachable.
4. Sign in as the reviewer and confirm the owner's subscription is not listed.
5. Resize to a narrow phone width and confirm the screens stay usable.

## Migration notes

Two migrations, applied in order, on a database that has never held data. Nothing is being migrated
from an earlier shape. The auth schema is hand-maintained by decision; a future Better Auth upgrade
means re-reading its core table definitions in the installed package and editing
`migrations/0001_auth.sql` by hand rather than regenerating it.

## References

- Related research: `context/changes/runtime-auth-slice/research.md`
- Decision: `context/decisions/D-001-auth-solution.md`
- Spike code to carry forward: `evidence/spikes/auth-spike/src/auth/index.ts:7-32`,
  `evidence/spikes/auth-spike/src/index.ts:29-44`,
  `evidence/spikes/auth-spike/migrations/0001_init.sql`
- Risks and their test types: `context/foundation/test-plan.md`
- Product contract: `context/foundation/prd.md`, FR-001 to FR-005 and US-05

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Identity

#### Automated

- [x] 1.1 Integration tests pass — e58187c
- [x] 1.2 Typecheck passes — e58187c
- [x] 1.3 Unit tests still pass — e58187c
- [x] 1.4 Migration applies to a local database — e58187c

#### Manual

- [x] 1.5 Each new test failed first for the stated reason — e58187c

### Phase 2: The owned resource

#### Automated

- [x] 2.1 Integration tests pass — 2801e14
- [x] 2.2 Unit tests pass — 2801e14
- [x] 2.3 Typecheck passes — 2801e14
- [x] 2.4 Both migrations apply in order to a clean local database — 2801e14
- [x] 2.6 Zod is declared at an exact version and recorded in the lockfile — 2801e14
- [x] 2.7 The validation unit test is picked up by the unit runner — 2801e14

#### Manual

- [x] 2.5 Ownership tests failed first for the right reason — 2801e14

### Phase 3: Seeding the accounts

#### Automated

- [x] 3.1 Integration tests pass, including the refused seed call — dbe3b2e
- [x] 3.2 Typecheck passes — dbe3b2e
- [x] 3.5 All four seeding cases from the decision record pass — dbe3b2e
- [x] 3.6 seed:local performs the documented seed and no stale README line remains — dbe3b2e

#### Manual

- [x] 3.3 Documented setup produces two accounts that can sign in — dbe3b2e
- [x] 3.4 Seed path returns 404 with the gate off — dbe3b2e

### Phase 4: The first screens

#### Automated

- [x] 4.1 Typecheck passes across all three projects — 3707615
- [x] 4.2 Production build succeeds — 3707615
- [x] 4.3 The suite still passes — 3707615

#### Manual

- [x] 4.4 Sign in lands on the home screen showing the account email — 3707615
- [x] 4.5 Creating a subscription shows it in the list — 3707615
- [x] 4.6 Reload keeps the session and the subscription — 3707615
- [x] 4.7 Sign out returns to login and leaves nothing reachable — 3707615
- [x] 4.8 The reviewer account sees none of the owner's subscriptions — 3707615
- [x] 4.9 The layout is usable at a narrow phone width — 3707615
- [x] 4.10 The session cookie is accepted by the browser over local http — 3707615

### Phase 5: The gate

#### Automated

- [x] 5.1 The same commands pass locally in one run
- [x] 5.2 Captured output exists and shows the passing counts

#### Manual

- [ ] 5.3 The workflow run on the pull request is green
