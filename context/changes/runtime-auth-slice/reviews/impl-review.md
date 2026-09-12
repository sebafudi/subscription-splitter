<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Implementation plan, runtime-auth slice

- **Plan**: `context/changes/runtime-auth-slice/plan.md`
- **Scope**: Phases 1 to 5 of 5 (all phases; Progress shows 22 of 23 boxes checked, the one open box being 5.3)
- **Commits reviewed**: `e58187c`, `2801e14`, `dbe3b2e`, `3707615`, `0c6a393`
- **Repository state**: `HEAD` at `210d4d6`, working tree carrying concurrent uncommitted edits to `context/STATUS.md` and three decision records
- **Verdict**: NEEDS ATTENTION (approve with required fixes)
- **Findings**: 0 critical, 3 warnings, 7 observations

Date and effort fields the report schema lists are omitted, matching this repository's convention of
recording progress by change ID, migration ID and commit.

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | WARNING |

## Verification performed

`npm ci && npm run typecheck && npm run test:unit && npm run test:integration && npm run build` run
from a clean install, exit 0. Results reproduce `evidence/runs/runtime-auth-slice-tests.txt` exactly:
typecheck clean, 3 unit files / 17 tests, 4 integration files / 19 tests, build succeeding with an
identical chunk list and identical byte sizes. The recorded evidence is accurate.

A live `wrangler dev` instance was then probed with curl and killed afterwards. Nothing was deployed,
pushed or committed, and no file outside this report was modified.

| Probe | Result |
|---|---|
| `GET /api/me` with no cookie | 401 `{"error":"unauthorized"}` |
| Sign-in with `Origin: https://untrusted.example` | 403 `INVALID_ORIGIN` |
| `POST /api/auth/sign-up/email` | 400 `EMAIL_PASSWORD_SIGN_UP_DISABLED` |
| `POST /api/dev/seed` with a wrong token | 404 `{"error":"not found"}` |
| Unknown `/api/*` path | 404 JSON, not the client shell |
| Session cookie attributes | `better-auth.session_token=...; Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=Lax`, matching D-001 exactly |
| `PATCH` carrying `user_id` | 400, `Unrecognized key: "user_id"` |
| `PATCH` carrying `id` | 400, `Unrecognized key: "id"` |
| `PATCH` renaming the caller's own row | 200 with the row correctly updated |
| Twelve failed sign-ins from one `cf-connecting-ip` | attempts 1 to 10 answered 401, 11 and 12 answered 429 |
| Correct password from the throttled address | 429 |
| Correct password from a different address, while the first stays throttled | 200 |

Two of the plan's stated open risks are closed by that last pair. The custom rule, not the library's
built-in three-per-ten-seconds rule at `node_modules/better-auth/dist/api/rate-limiter/index.mjs:303-305`,
governs sign-in, so the requirement that a mistyped password a few times over still lets the organizer
in holds. And the limiter keys per caller rather than degrading to one shared bucket, which the plan
recorded as proven only as a mechanism.

`migrations/0001_auth.sql` was compared field by field against the installed Better Auth 1.7.4 core
definitions in `node_modules/@better-auth/core/dist/db/get-tables.mjs`. All four core tables match,
including the cascade on both foreign keys, the unique constraints on `user.email` and `session.token`,
and the three indexes; the `account` model has no `issuer` field, exactly as the research claimed. The
`rateLimit` table matches the definition the library adds only when `rateLimit.storage === "database"`.

## Findings

### F1 - A 401 during a live session never returns the client to the login screen

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: Plan Adherence
- **Location**: `src/client/screens/Home.tsx:20-22`, `src/client/screens/SubscriptionForm.tsx:32-34`, `src/client/api.ts:47-49`
- **Detail**: The Phase 4 contract for the API client reads "turns a 401 into a signed-out state the
  application reacts to by showing the login screen". `request()` does throw `SignedOutError` on a 401,
  and `App` handles it correctly on first load, because `getMe()` converts it to `null`. Nothing else
  does. `Home`'s list `catch` is `.catch(() => setLoadError('Could not load subscriptions.'))`, which
  swallows `SignedOutError` along with every other failure, and `SubscriptionForm`'s catch tests
  `err instanceof ApiError`, which `SignedOutError` is not, so it falls to the generic "Could not
  create the subscription." Neither path calls `onSignedOut`. An organizer whose session expires while
  the home screen is open therefore sits on a data screen showing already-fetched rows, reading a
  message that blames the load rather than the session, with no route back to sign-in short of a
  reload. The expired-session case is one of the two risks this slice exists to close, and it is
  covered on the server (`tests/integration/auth.test.ts:108-125`) but not on the screen that shows it.
- **Fix**: Give `Home` and `SubscriptionForm` a `SignedOutError` branch that calls the existing
  `onSignedOut` callback, and export `SignedOutError` handling once rather than per screen, so the
  single place that recognises a signed-out state is `src/client/api.ts`.
  - Strength: The callback and the state machine already exist; `App` already renders `Login` whenever
    `user` is null, so this is a branch rather than a new mechanism.
  - Trade-off: Two screens gain a second catch arm, and any later screen has to remember it unless the
    handling is lifted into a shared helper.
  - Confidence: HIGH - the control flow was read end to end and the missing branch is unambiguous.
  - Blind spot: Whether an expiry mid-session is reachable in practice before the seven-day `Max-Age`
    was not exercised in a browser; the server-side revocation path after sign-out is covered.
- **Decision**: PENDING

### F2 - Three assertions in the auth suite are weaker than the properties they are named for

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `tests/integration/auth.test.ts:137`, `:152-153`, `:172`
- **Detail**: The behaviour under all three is correct, confirmed by live probe; the assertions are
  what is weak, and a regression in any of the three would pass unnoticed.
  First, the sign-up case asserts `expect(signUpRes.status).not.toBe(200)`. Any error at all satisfies
  it, including a throttled 429 or a malformed-body 400 from an unrelated change, so it does not prove
  sign-up is disabled. The live answer is 400 with code `EMAIL_PASSWORD_SIGN_UP_DISABLED`.
  Second, the cross-origin case asserts only that the status is in the 4xx range. A wrong password
  also answers 401 and a tripped limiter answers 429, both in range, so the assertion does not
  distinguish an origin refusal from any other refusal. The live answer is 403 with code
  `INVALID_ORIGIN`.
  Third, and most consequential against the plan's own wording, the throttling case loops eleven
  attempts and asserts only `expect(lastStatus).toBe(429)`. Under the library's built-in sign-in rule
  of three attempts in ten seconds the eleventh attempt is also 429, so the assertion passes
  identically whether the custom rule is in force or silently absent. The Phase 1 test contract states
  "the numbers asserted are the ones the custom rule sets, not the library's built-in sign-in rule",
  and this test does not assert them. Delete `customRules` from `src/server/auth.ts:31-33` and the
  suite stays green.
- **Fix**: Assert the exact statuses the endpoints return (400 for sign-up refused, 403 for the origin
  refusal) and record each status per attempt in the throttling loop, asserting that the tenth attempt
  is still 401 and the eleventh is 429, which is the pair that distinguishes the custom rule from the
  built-in one.
- **Decision**: PENDING

### F3 - The PATCH success path and the ownership-transfer refusal have no test

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `tests/integration/subscriptions.test.ts:70-75`, `:109-114`; `src/server/db/subscriptions.ts:84-110`
- **Detail**: `update()` is the one repository function no passing-path test reaches. The two PATCH
  cases in the suite are a cross-account attempt asserting 404 and a no-session attempt asserting 401,
  and both return before any UPDATE statement runs: the first exits at `if (!existing) return null`
  on line 91, the second never leaves the middleware. The whole read-modify-write body, including the
  five-way field merge and the seven bound parameters, is therefore unexercised. A transposed bind
  order there would silently write a subscription's locale into its currency and the suite would stay
  green. The behaviour is in fact correct, verified live: a rename returns 200 with every other field
  intact.
  Separately, nothing asserts the sharpest form of the ownership rule, that a PATCH cannot move a row
  to another account. `patchSubscriptionSchema` is `.strict()`, so `user_id` and `id` are both refused
  with 400 and `Unrecognized key`, confirmed live, but that property rests on one `.strict()` call
  with no regression test naming it. The unknown-key unit test at
  `src/server/validation/subscriptions.test.ts:78-81` uses `nope`, which does not document the
  security property the way the real key names would.
- **Fix**: Add one integration case that patches the caller's own row and asserts both the changed
  field and an unchanged one, and two cases asserting 400 for a patch carrying `user_id` and for one
  carrying `id`.
- **Decision**: PENDING

### F4 - A malformed body behind a valid seed token answers 500 rather than 400

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `src/server/routes/dev-seed.ts:21`
- **Detail**: `const body = await c.req.json<...>()` carries no `.catch()`, so a body that is not JSON
  throws out of the handler. Probed live with a valid token: the response is a bare
  `Internal Server Error` with status 500. Both subscription routes handle the same call as
  `await c.req.json().catch(() => null)` and answer 400
  (`src/server/routes/subscriptions.ts:19` and `:37`), so this is the one entry point in the slice
  that can produce an unhandled exception. The blast radius is small, because the gate runs first and
  the caller already holds the token, and the body is also unvalidated beyond its TypeScript type, so
  a missing `password` reaches `signUpEmail` rather than being refused at the boundary.
- **Fix**: Catch the parse failure and validate the three fields with a Zod schema, answering 400,
  matching the pattern the subscription routes already use.
- **Decision**: PENDING

### F5 - `APP_ORIGINS` is unguarded while `BETTER_AUTH_SECRET` is guarded

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `src/server/auth.ts:9-15`
- **Detail**: The factory refuses to construct without a secret, with an explicit message. Two lines
  later it calls `env.APP_ORIGINS.split(',')` with no such check. `env.d.ts:12` declares the binding
  `string`, so TypeScript is satisfied, but a deployment that forgets the variable gets a
  `TypeError` on every request touching auth rather than the clear failure the secret gets. The
  variable is load-bearing for the origin check that F2's second assertion covers, so a missing value
  is exactly the misconfiguration worth failing loudly on.
- **Fix**: Throw with a named message when `APP_ORIGINS` is unset, alongside the existing secret check.
- **Decision**: PENDING

### F6 - The seeding auth instance runs on the library's default secret

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `src/server/routes/dev-seed.ts:23-27`
- **Detail**: The second Better Auth instance passes `baseURL`, `database` and `emailAndPassword` but
  no `secret`, so it falls back to the library's default while the application instance uses
  `env.BETTER_AUTH_SECRET`. Accounts seeded this way do sign in, proved by
  `tests/integration/dev-seed.test.ts:47-68` and again by live probe, because password hashing is
  salted scrypt and does not involve the secret. The same omission appears in both test files'
  `seedingAuth()` helpers, so the pattern is consistent within the slice; it is just undocumented,
  and it leaves a route in the deployed bundle that constructs an auth instance on a default secret.
  Nothing signed by that instance is used, since the seed response discards the session cookie.
- **Fix**: Pass `secret: c.env.BETTER_AUTH_SECRET` to the seeding instance so the two instances differ
  only in `disableSignUp`, which is the one difference D-005 describes.
- **Decision**: PENDING

### F7 - Em dash in user-facing text

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `src/client/screens/Home.tsx:53`
- **Detail**: The subscription list renders `{subscription.name} — {subscription.currency}, starting
  {subscription.startMonth}`. It is the only em dash in `src/`, `tests/`, `migrations/` and
  `.github/`, checked by grep, and this repository's authoring rules exclude the character.
- **Fix**: Replace with a comma or a plain hyphen.
- **Decision**: PENDING

### F8 - `seed:local` is an unreviewable one-line program inside `package.json`

- **Severity**: 💡 OBSERVATION
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: Pattern Consistency
- **Location**: `package.json:17`
- **Detail**: The script is roughly seven hundred characters of escaped JavaScript on one line: a
  `.dev.vars` parser, a `fetch` helper and an async driver. It works, and Phase 3's manual criteria
  record it exercised end to end, but it cannot be linted, typechecked or diffed usefully, and it is
  the only executable code in the repository outside `src/`, `tests/` and `tools/`. Its parser splits
  each line on the first `=` and trims, which silently mishandles a quoted value, so a password
  containing a `#` or wrapped in quotes would be seeded wrong and the failure would surface later as a
  sign-in that does not work. The implementation notes record the reason for the shape, that a new
  file sat outside the run's write ownership, which is a process constraint rather than a design one.
- **Fix A ⭐ Recommended**: Move the body to `tools/seed-local.mjs` and reduce the script to
  `node tools/seed-local.mjs`, keeping behaviour identical.
  - Strength: Restores reviewability and typechecking to the one piece of operational code a developer
    runs against a real server, and lets the `.dev.vars` parsing be tested.
  - Trade-off: One more file, and `README.md`'s first-run section gains a path to keep in step.
  - Confidence: HIGH - the script is self-contained and depends only on `node:fs` and `fetch`.
  - Blind spot: Whether `tools/` is the right home, given `tools/reviewer/` is an independent npm
    package with its own install, has not been settled with whoever owns that directory.
- **Fix B**: Leave the script and document the quoting limitation in `.dev.vars.example`.
  - Strength: No code movement, and the limitation becomes visible where values are written.
  - Trade-off: The reviewability problem stands, and the next person to extend seeding extends a
    one-liner.
  - Confidence: MED - it removes the surprise without removing the cause.
  - Blind spot: None significant.
- **Decision**: PENDING

### F9 - A status cast defeats the strict-TypeScript contract on the error path

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `src/server/routes/auth.ts:41`
- **Detail**: `return c.json({ error: error.message }, error.statusCode as 401)` asserts a runtime
  value into a literal type to satisfy Hono's status parameter. Any `APIError` whose status is not 401,
  which is every error this catch is meant to generalise over, is passed through a claim that is
  false. It typechecks and it works, because Hono does not read the literal at runtime, but it is the
  only type assertion of its kind in the server code.
- **Fix**: Widen the parameter with Hono's `ContentfulStatusCode` type rather than asserting a literal.
- **Decision**: PENDING

### F10 - The browser walkthrough left no captured artifact

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `evidence/screenshots/`, `context/changes/runtime-auth-slice/plan.md:30` and `:91`
- **Detail**: The plan asks twice for the manual browser pass to be recorded: "one manual browser
  walkthrough recorded in the evidence directory" and "this slice's browser pass is a manual checklist
  with captured evidence". Seven manual Phase 4 rows are checked, and `evidence/work-log.md` describes
  a real Chrome walkthrough covering sign-in, creation, reload, sign-out, reviewer isolation and a
  375px viewport, which is a stronger record than an unchecked checklist. But `evidence/screenshots/`
  is empty and `evidence/runs/` holds only the test capture and a no-session smoke capture, so the
  seven rows rest on a prose claim rather than on an artifact a later reader can check. This is the one
  place in the slice where a checked manual box has no independently verifiable evidence behind it.
- **Fix**: Capture the home screen and the narrow-viewport layout into `evidence/screenshots/` on the
  next run of the same flow, or amend the plan's wording to say the work-log entry is the record.
- **Decision**: PENDING

## Drift table

The six deviations the implementation reported, each judged on its own.

| # | Reported deviation | Judgement | Basis |
|---|---|---|---|
| 1 | `/api/me` forces `asResponse: false`, which no plan phase anticipated | Acceptable, and correctly diagnosed | Verified in the installed package: `node_modules/better-auth/dist/api/to-auth-endpoints.mjs:48` reads `asResponse: context?.asResponse ?? isRequestLike(context?.request)`, so passing `request`, which F2 of the plan review required, flips the default to a `Response`. Forcing it false is the only way to keep both the guard and the parsed return. The code comment records the mechanism accurately. |
| 2 | The gate-off case is a unit test on an extracted pure function plus manual curl, not an integration case | Acceptable | `vitest.integration.config.ts:19` fixes `SEED_ENABLED: 'true'` for the whole run through the miniflare bindings, so the flag genuinely cannot be varied per test at that layer. Extracting `isSeedRequestAllowed` gives the branch a real test and keeps the handler thin, and the other three D-005 cases are proved live. The seam is a small improvement on the plan rather than a shortfall. |
| 3 | D-005's commit field left unfilled because `context/decisions/` was outside the run's write ownership | Resolved during this review | Both records now carry their commit: D-001 reads `e58187c` and D-005 reads `dbe3b2e` plus the two test paths, as uncommitted working-tree edits by concurrent work. No action remains beyond committing them. |
| 4 | `seed:local` implemented as an inline script in `package.json` rather than a file | Requires change, at low priority | See F8. It works and was exercised, but it is unreviewable and its `.dev.vars` parser is naive about quoting. |
| 5 | Sign-out sends an explicit empty JSON body | Acceptable | The mounted router requires a JSON content type once a body stream is present, and `src/client/api.ts:96-99` records why in a comment that describes the current behaviour rather than the change. The integration suite signs out with no body at all and also gets 200, so both shapes work and the client's choice is the safe one. |
| 6 | Manual Phase 4 rows self-checked through a real Chrome session | Acceptable, with the caveat in F10 | Checking the rows against a real browser pass is stronger than leaving them for a later reviewer, and the work-log describes each step. The plan asked for captured evidence and none was captured. |

## What the implementation gets right

Worth recording so ten findings, none critical, are not read as a poor result.

The ownership rule is built exactly as argued. Every statement in `src/server/db/subscriptions.ts`
carries `where user_id = ?`, including the UPDATE, which also repeats the filter rather than trusting
the preceding `get`. `get` and `update` return `null` without distinguishing absent from foreign, and
both routes translate that to 404 without knowing why, so the 404-not-403 rule is structural. No route
in the slice reaches data outside `requireSession`, checked against every registration in
`src/server/index.ts`. The strict Zod schemas close the ownership-transfer path as a side effect of
rejecting unknown keys, which is a stronger guarantee than an explicit field blocklist would have been.

Every correction the plan review required is present in the built code, not just in the plan. There is
no thin `/api/login` or `/api/logout`; sign-in and sign-out are the mounted handler, and the live
probes confirm all three router protections apply. `zod` is declared at exactly `4.6.2`. The unit
include is widened and `AGENTS.md` and `README.md` agree with it. The cookie's `secure` attribute is
driven per cookie with `useSecureCookies` untouched, and the emitted cookie carries the full attribute
set D-001 specifies. `cf-connecting-ip` keying is configured and now demonstrably works per caller.
The month CHECK uses the tightened `[01][0-9]` form and `subscriptions.user_id` cascades.

The test suite respects the constraints the plan discovered: per-test emails, per-test client
addresses, the throttling case last in its file, and no call to `reset()` anywhere. The validation
unit test covers the exact values the looser database pattern would admit, which is the gap the plan
identified rather than a restatement of the regex.

`migrations/0001_auth.sql` matches the installed library field for field, which is the claim most
likely to have been written from documentation and was not.

## Required fixes

1. Handle `SignedOutError` in `Home` and `SubscriptionForm` so a mid-session 401 returns to the login screen (F1).
2. Assert the exact statuses in the sign-up and cross-origin cases, and assert the tenth and eleventh attempts separately in the throttling case so it distinguishes the custom rule from the library's built-in one (F2).
3. Add an integration case for a successful PATCH by the owner, and cases asserting 400 for a PATCH carrying `user_id` or `id` (F3).

## Resolution

Findings F1, F2 and F3 (all three required fixes) and F8 (observation, addressed at the team's request) are resolved below. F4, F5, F6, F7, F9 and F10 were not in the requested scope for this pass and remain open observations for a later change.

| Finding | Decision | What changed |
|---|---|---|
| F1 | Accepted | `Home`'s subscription-list `catch` and `SubscriptionForm`'s create `catch` both now branch on `error instanceof SignedOutError` (the one class `src/client/api.ts` uses to recognise a signed-out state) and call the existing `onSignedOut` callback; every other failure keeps its prior message. Verified live: signed in, invalidated every local session directly in D1 (`update session set expiresAt = 0`) without reloading the page, then submitted the create form on the still-mounted Home screen - the app returned to the login screen instead of showing "Could not create the subscription." `Home`'s own list-load branch shares the identical `SignedOutError` check and callback, reached the same way; the narrow race that would exercise it on the very first mount (valid at `getMe()`, expired before `listSubscriptions()` resolves) was not independently reproduced, matching the blind spot the finding already named. |
| F2 | Accepted | The sign-up-disabled case now asserts `status === 400` and `body.code === 'EMAIL_PASSWORD_SIGN_UP_DISABLED'`; the cross-origin case asserts `status === 403` and `body.code === 'INVALID_ORIGIN'`; both codes confirmed against a live `wrangler dev` response before being written into the test. The throttling case now records every attempt's status and asserts attempts 1-10 are each `401` and attempt 11 is `429`, which fails if the custom rule's ten-attempt window is silently replaced by the library's built-in three-per-ten-seconds rule (the previous single `lastStatus === 429` assertion could not tell the two apart). Extended past the review's literal ask, at the request that raised this fix: a twelfth attempt from the same address confirms the block persists, and a same-credential sign-in from a different `cf-connecting-ip` returns 200 while the first address is still throttled, proving the limiter keys per caller rather than one shared bucket. |
| F3 | Accepted | Two integration cases added: an owner PATCH renaming their own row, asserting the response's new name and unchanged currency, then a fresh `GET` proving the rename persisted rather than only echoing in the response; and two 400 cases for a PATCH body carrying `user_id` or `id`, naming the exact keys the ownership-transfer risk depends on rather than the generic `nope` key the existing unit test used. |
| F8 | Accepted (Fix A) | The seed script moved to `scripts/seed-local.mjs`, exporting a `parseDevVars()` that handles a quoted value (including one containing a literal `#`), an unquoted value with a trailing `# comment`, and a whole-line comment; `package.json`'s `seed:local` is now `node scripts/seed-local.mjs`. Re-verified end to end against a fresh `wrangler dev`: both accounts created, a second run reports both unchanged. |

Progress rows: no step title changed and no index was added or reused; the fixes land inside existing Phase 1, Phase 2 and Phase 3 steps rather than opening new ones, so no Progress row needed flipping beyond what was already checked.
