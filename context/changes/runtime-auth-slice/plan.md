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

- Better Auth's origin and CSRF check returns immediately when the call carries no request headers
  (`node_modules/better-auth/dist/api/middlewares/origin-check.mjs:97-98`). The spike's thin login
  route passed only a body, so it had no origin protection. Routes in this slice pass the raw request
  through, and the cross-origin test is what proves it.
- The rate-limit table only exists when `rateLimit.storage === "database"`
  (`node_modules/@better-auth/core/dist/db/get-tables.mjs:33`). The spike left storage at its default,
  so its limiter was per-isolate memory. This slice sets storage to the database and creates the table.
- The installed Better Auth 1.7.4 `account` model has no `issuer` field, though the published
  documentation for a newer branch shows one. The spike's hand-written schema matches what is
  installed, and is copied forward unchanged.
- Cookies are not carried between `SELF.fetch` calls in the test pool. Tests extract `set-cookie` and
  send it back as a `cookie` header, as the spike's helper does.
- The test pool documents isolated storage in one README line with no configuration flag and no stated
  granularity. Cross-account assertions therefore seed both accounts inside a single test block.
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

**Origin checking depends on what the route passes.** `auth.api.*` calls only perform origin and CSRF
validation when they receive the request headers. Every thin route in this slice passes
`headers: c.req.raw.headers` and, where the signature accepts it, the request itself. Phase 1 proves
this with a test rather than assuming it; if passing headers does not produce a rejection, the
fallback named in the plan is to move the browser's login onto the mounted Better Auth endpoint and
keep the thin route as a test convenience.

**The auth instance is built per request.** A D1 binding only exists inside a request's `env` in
Workers, so nothing auth-related can be captured at module scope.

---

## Phase 1: Identity

### Overview

Sign-in, sign-out and session reading work against local D1, with the origin check and the rate limit
actually enforced. Written test-first.

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
`env.APP_ORIGINS`, a comma-separated list, trimmed, empty entries dropped; `rateLimit: { enabled:
true, window: 60, max: 10, storage: "database" }`; `advanced.cookies.session_token.attributes` set to
`httpOnly: true`, `secure: true`, `sameSite: "lax"`. A missing `BETTER_AUTH_SECRET` throws at
construction rather than starting with a default secret.

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

**Purpose**: Expose sign-in, sign-out and the identity readout the client needs, while letting the
library own everything under its own path.

**Contract**: Mount `app.on(["POST", "GET"], "/api/auth/*", ...)` delegating to `auth.handler(c.req.raw)`.
Add `POST /api/login` calling `auth.api.signInEmail`, `POST /api/logout` calling `auth.api.signOut`,
and `GET /api/me` calling `auth.api.getSession` and returning the user or 401. Every call passes the
request headers so the origin check runs. `signInEmail` and `signOut` are wrapped in the try/catch
that translates a Better Auth `APIError` into a JSON response carrying the error's own status code,
rethrowing anything else, exactly as `evidence/spikes/auth-spike/src/index.ts:29-44` does.

#### 5. Binding declarations

**File**: `env.d.ts`

**Purpose**: Keep the hand-maintained binding declarations in step with what the Worker now reads, or
the worker TypeScript project stops typechecking.

**Contract**: Add `BETTER_AUTH_SECRET: string`, `APP_ORIGINS: string`, `SEED_ENABLED: string` and
`SEED_TOKEN: string` to `Cloudflare.Env` alongside `DB`.

#### 6. Auth integration tests

**File**: `tests/integration/auth.test.ts`

**Purpose**: Prove the session lifecycle and the protections that fail silently. Written before the
code in this phase, per test-plan risk 6.

**Contract**: Seeding uses a second Better Auth instance built against `env.DB` with
`disableSignUp: false`, as the spike does. A local helper extracts `set-cookie` and returns the first
`;`-delimited pair for reuse as a `cookie` header. Cases, each named for the risk it covers:
sign-in returns 200 and sets a session cookie; `GET /api/me` with that cookie returns the user;
`GET /api/me` without a cookie returns 401; a wrong password returns 401; after `POST /api/logout`
the same cookie returns 401 from `/api/me`; the public sign-up endpoint under `/api/auth/` is refused
while seeding still works; a `POST /api/login` carrying an `Origin` header not in `APP_ORIGINS` is
refused; repeated failed sign-ins trip the limit and the response says so.

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

#### 1. Subscriptions migration

**File**: `migrations/0002_subscriptions.sql`

**Purpose**: The first table this project owns, and the root every later record hangs from.

**Contract**: `subscriptions(id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES "user"("id"), name
TEXT NOT NULL, currency TEXT NOT NULL, locale TEXT NOT NULL, time_zone TEXT NOT NULL, start_month TEXT
NOT NULL CHECK (start_month GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'), created_at TEXT NOT NULL)` plus
`CREATE INDEX subscriptions_user_id_idx ON subscriptions(user_id)`. Identifiers are generated
server-side with `crypto.randomUUID()`, never supplied by the client.

#### 2. Validation contract

**File**: `src/server/validation/subscriptions.ts`

**Purpose**: One declared schema for subscription input, shared by the routes and exercised directly
by a unit test, per the PRD's validation contract.

**Contract**: Zod schemas for create and patch. `name` non-empty after trimming; `currency` a
three-letter uppercase ISO code; `locale` a BCP-47 tag; `time_zone` an IANA zone accepted by `Intl`;
`start_month` matching `^\d{4}-(0[1-9]|1[0-2])$`. Create requires name and start month and defaults
currency to `PLN`, locale to `pl-PL` and time zone to `Europe/Warsaw`. Patch accepts a subset and
rejects an empty object. Unknown keys are rejected rather than ignored.

#### 3. Repository

**File**: `src/server/db/subscriptions.ts`

**Purpose**: The only place that writes SQL for this resource, and the single enforcement point for
ownership.

**Contract**: `list(db, userId)`, `create(db, userId, input)`, `get(db, id, userId)` and
`update(db, id, userId, patch)`. Every statement carries `where user_id = ?`; `get` and `update`
return `null` when nothing matched, without distinguishing absent from someone else's. `create`
generates the id and the created-at stamp. Rows are mapped to a camel-cased shape at this boundary so
no column name escapes the repository.

#### 4. Subscription routes

**File**: `src/server/routes/subscriptions.ts`

**Purpose**: The four operations the first screen needs, each behind the session middleware.

**Contract**: `GET /api/subscriptions` lists the session user's rows. `POST /api/subscriptions`
validates the body and returns 201 with the created row. `GET /api/subscriptions/:id` and
`PATCH /api/subscriptions/:id` return the row or 404. Status codes: 401 with no session, 400 with a
body that fails validation and a message naming the field at fault, 404 for an id that is missing or
belongs to another account.

#### 5. Composition

**File**: `src/server/index.ts`

**Purpose**: Assemble the routers and make the API's boundary explicit.

**Contract**: Mount the auth routes and the subscription routes, keep `GET /api/health`, and answer
any other `/api/*` path with a JSON 404 rather than falling through to the client shell. Non-API paths
continue to be served by the assets binding.

#### 6. Ownership and validation tests

**Files**: `tests/integration/subscriptions.test.ts`, `src/server/validation/subscriptions.test.ts`

**Purpose**: Prove test-plan risk 2 directly, and risk 3 for this resource's round trip. Written
before the code in this phase.

**Contract**: The integration test seeds two accounts and signs both in inside one test block, because
the pool does not document storage isolation between blocks. Cases: a subscription created by account A
is listed for A and absent from B's list; `GET` and `PATCH` from B against A's id both return 404; a
create followed by a fresh request returns the same row, proving it persisted rather than being held
in memory; every route returns 401 without a cookie; invalid bodies return 400, covering a bad month,
a bad time zone, an empty name and an unknown key. The unit test covers the schema's month format and
its defaults without touching a binding.

### Success criteria:

#### Automated verification:

- Integration tests pass: `npm run test:integration`
- Unit tests pass: `npm run test:unit`
- Typecheck passes: `npm run typecheck`
- Both migrations apply in order to a clean local database: `npm run db:migrate:local`

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

**Contract**: `POST /api/dev/seed`, mounted only when `env.SEED_ENABLED === "true"`, and answering 404
otherwise so its existence is not detectable. Requires header `x-seed-token` equal to `env.SEED_TOKEN`,
compared with a length-safe comparison, returning 404 on mismatch rather than 401. The body carries
the accounts to create as email, password and name; nothing is read from source. Creation goes through
a second Better Auth instance with `disableSignUp: false` against the same binding. Idempotent: an
email that already exists is reported as unchanged rather than failing the call. The response never
echoes a password.

#### 2. Seeding decision record

**File**: `context/decisions/D-005-account-seeding.md`

**Purpose**: Record why seeding works this way, in the format D-001 to D-004 use.

**Contract**: ID, decision, rationale, rejected alternative, review objection and resolution, affected
tests, commit. The rejected alternative is a permanent seed route or credentials checked into source.
The objection to answer is that any seeding path is an account-creation hole, resolved by the double
gate, the 404 response and the documented remote procedure of setting the variables, calling once and
unsetting them again.

#### 3. Local variable names

**File**: `.dev.vars.example`

**Purpose**: Tell a developer which variables to set without telling anyone the values.

**Contract**: Names only, no values: `BETTER_AUTH_SECRET`, `APP_ORIGINS`, `SEED_ENABLED`, `SEED_TOKEN`,
and the seeded account emails. The real `.dev.vars` stays ignored by git.

#### 4. Setup documentation

**File**: `README.md`

**Purpose**: Make first-run reproducible.

**Contract**: Extend the setup section with the variables to set, the order to run migrations and the
seed call, and a note that remote seeding follows the same procedure under S-04 with the variables set
and then removed.

### Success criteria:

#### Automated verification:

- Integration tests pass, including a seed call refused when the gate is off: `npm run test:integration`
- Typecheck passes: `npm run typecheck`

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
showing the login screen. Non-401 failures surface the server's message.

#### 2. Screens

**Files**: `src/client/App.tsx`, `src/client/screens/Login.tsx`, `src/client/screens/Home.tsx`,
`src/client/screens/SubscriptionForm.tsx`

**Purpose**: The smallest set of screens that exercises the whole slice.

**Contract**: `App` asks `GET /api/me` once on load and renders the login screen or the home screen on
the answer. Login takes an email and a password, shows the server's error message on failure without
guessing which field was wrong, and disables submission while in flight. Home shows the account email,
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

- Session lifecycle against local D1: sign in, read, wrong password, sign out invalidates.
- Sign-up refused while server-side seeding still works.
- Cross-origin sign-in refused.
- Rate limit trips after the configured number of failures.
- Ownership: list, read and patch across two accounts in one test block.
- Persistence: a created subscription is returned by a later, separate request.
- Validation: 400 responses for each named bad input.

### Risk mapping

| Test-plan risk | Covered by | Phase |
|---|---|---|
| 2, leaked data across accounts | ownership and 401 cases in `tests/integration/subscriptions.test.ts` | 2 |
| 6, session lifecycle | `tests/integration/auth.test.ts`, all cases | 1 |
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

- [ ] 1.1 Integration tests pass
- [ ] 1.2 Typecheck passes
- [ ] 1.3 Unit tests still pass
- [ ] 1.4 Migration applies to a local database

#### Manual

- [ ] 1.5 Each new test failed first for the stated reason

### Phase 2: The owned resource

#### Automated

- [ ] 2.1 Integration tests pass
- [ ] 2.2 Unit tests pass
- [ ] 2.3 Typecheck passes
- [ ] 2.4 Both migrations apply in order to a clean local database

#### Manual

- [ ] 2.5 Ownership tests failed first for the right reason

### Phase 3: Seeding the accounts

#### Automated

- [ ] 3.1 Integration tests pass, including the refused seed call
- [ ] 3.2 Typecheck passes

#### Manual

- [ ] 3.3 Documented setup produces two accounts that can sign in
- [ ] 3.4 Seed path returns 404 with the gate off

### Phase 4: The first screens

#### Automated

- [ ] 4.1 Typecheck passes across all three projects
- [ ] 4.2 Production build succeeds
- [ ] 4.3 The suite still passes

#### Manual

- [ ] 4.4 Sign in lands on the home screen showing the account email
- [ ] 4.5 Creating a subscription shows it in the list
- [ ] 4.6 Reload keeps the session and the subscription
- [ ] 4.7 Sign out returns to login and leaves nothing reachable
- [ ] 4.8 The reviewer account sees none of the owner's subscriptions
- [ ] 4.9 The layout is usable at a narrow phone width

### Phase 5: The gate

#### Automated

- [ ] 5.1 The same commands pass locally in one run
- [ ] 5.2 Captured output exists and shows the passing counts

#### Manual

- [ ] 5.3 The workflow run on the pull request is green
