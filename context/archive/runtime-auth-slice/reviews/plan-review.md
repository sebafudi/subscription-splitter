<!-- PLAN-REVIEW-REPORT -->
# Plan review: Implementation plan, runtime-auth slice

- **Plan**: `context/changes/runtime-auth-slice/plan.md`
- **Mode**: Deep
- **Repository state**: commit `513a148`, working tree carrying an uncommitted `context/foundation/roadmap.md` status edit
- **Verdict**: REVISE (approve with required changes)
- **Findings**: 4 critical, 4 warnings, 2 observations

Date and effort fields the report schema lists are omitted, matching this repository's convention of
recording progress by change ID, migration ID and commit.

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | WARNING |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | FAIL |
| Plan Completeness | FAIL |

## Grounding

Paths: 8/8 existing files the plan modifies exist (`env.d.ts`, `src/server/index.ts`,
`.dev.vars.example`, `README.md`, `src/client/App.tsx`, `src/client/index.css`, `evidence/index.md`,
`evidence/work-log.md`). Symbols: 10/10 verified against the installed packages, not from memory
(`createAuth`, `signInEmail`, `signOut`, `getSession`, `rateLimit.storage`, `disableSignUp`,
`trustedOrigins`, `advanced.cookies.session_token.attributes`, `readD1Migrations`,
`applyD1Migrations`). Progress section: the mechanical contract in `10x-plan/references/progress-format.md`
passes in full, one `## Progress` after `## References`, five `### Phase N` blocks matching the five
`## Phase N` headers, every success-criteria bullet carrying exactly one numbered row, and no
checkbox syntax inside a Phase block. Brief to plan: phases, decisions and scope match; the one
divergence is that both documents repeat the same incorrect origin-protection claim recorded as F2.
No calendar dates, no time estimates and no em dashes in authored prose, the only `—` being the
commit-suffix separator the progress format itself mandates.

## Findings

### F1 - Rate limiting never runs on the routes this slice builds

- **Severity**: ❌ CRITICAL
- **Impact**: 🔬 HIGH - architectural stake; think carefully before deciding
- **Dimension**: Blind Spots
- **Location**: Phase 1, overview and change 4, auth routes; plus the Phase 1 rate-limit test case
- **Detail**: Better Auth applies rate limiting in exactly one place: the router's `onRequest` hook,
  `node_modules/better-auth/dist/api/index.mjs:172`, which calls `onRequestRateLimit`
  (`node_modules/better-auth/dist/api/rate-limiter/index.mjs:289`). That hook belongs to `router(...)`,
  reached only through `auth.handler(request)`. A direct `auth.api.signInEmail(...)` call runs through
  `toAuthEndpoints` and `dispatchAuthEndpoint`
  (`node_modules/better-auth/dist/api/to-auth-endpoints.mjs:34-56`) and never touches the router, so
  it is not rate limited at all. The consequence is threefold. The Phase 1 case "repeated failed
  sign-ins trip the limit and the response says so" cannot pass against `POST /api/login`. The Phase 1
  overview promise "with the origin check and the rate limit actually enforced" is not met. And the
  login path the browser actually uses, which Phase 4 points at `POST /api/login`, ships with no
  throttling, which is the behaviour the requirements call for in the non-functional line "repeated
  failed sign-in attempts stop being useful to an attacker working through a password list" and which
  D-001 records as covered.
  Two further facts belong in whatever the plan decides. First, moving `rateLimit.storage` to the
  database is real work that is correct and needed, so F1 does not cancel it: the migration table and
  the option are still required, because `auth.handler` does consume them and the Kysely D1 adapter
  implements the `incrementOne` primitive the database wrapper needs
  (`node_modules/@better-auth/kysely-adapter/dist/index.mjs:630`). Second, the plan's configured
  `window: 60, max: 10` does not govern sign-in. A built-in special rule overrides it for every path
  starting with `/sign-in`, `/sign-up`, `/change-password` or `/change-email` to `window: 10, max: 3`
  (`node_modules/better-auth/dist/api/rate-limiter/index.mjs:301-306`), so any test written against
  ten attempts in sixty seconds will be asserting the wrong numbers.
  Research open question 3 names a fallback that points the wrong way: "move the assertion to a direct
  call against the auth instance" is precisely the call path that has no limiter.
- **Fix A ⭐ Recommended**: Make `POST /api/login` a thin forwarder into the mounted handler rather
  than an `auth.api` caller. Build the request for `/api/auth/sign-in/email` from the incoming one and
  return `auth.handler(...)`, keeping the thin path only as the client-facing name. State the sign-in
  limit as three attempts in ten seconds in the Phase 1 test contract.
  - Strength: Recovers rate limiting, origin checking and CSRF in one change, since all three live in
    the router pipeline, and it makes F2 disappear as a separate problem.
  - Trade-off: The login response body becomes Better Auth's own shape, so Phase 4's client and the
    Phase 1 assertions must be written against it rather than against a shape this project chooses.
  - Confidence: HIGH - verified by reading the router construction and the endpoint dispatcher in the
    installed package, not from documentation.
  - Blind spot: Whether the request rewrite preserves the body cleanly under Hono has not been run.
- **Fix B**: Keep the thin routes and point the browser's login at `/api/auth/sign-in/email` directly,
  leaving `POST /api/login` as a test convenience that the plan states carries no throttling.
  - Strength: Smallest edit to the plan; the mounted handler is already in Phase 1 change 4.
  - Trade-off: Two login paths with different protections is exactly the trap the spike fell into, and
    the untested one stays mounted in production.
  - Confidence: MED - it works, but it leaves a route that looks protected and is not.
  - Blind spot: Nothing stops a later slice from reusing the thin route for something real.
- **Decision**: PENDING

### F2 - Origin and CSRF checking needs the request, not the headers

- **Severity**: ❌ CRITICAL
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: "Critical implementation details", and Phase 1 change 4, auth routes
- **Detail**: The plan states "Every call passes the request headers so the origin check runs". That
  is not what the installed code does. `better-call` builds the endpoint context with
  `request: context?.request` (`node_modules/better-call/dist/context.mjs:26`), so `ctx.request` is
  populated only from an explicitly passed `request` property and is left undefined when just
  `headers` are given. Both guards then return immediately:
  `validateFormCsrf` opens with `const req = ctx.request; if (!req) return;` and `validateOrigin` with
  `if (!headers || !ctx.request) return;`
  (`node_modules/better-auth/dist/api/middlewares/origin-check.mjs:96-98` and the `formCsrfMiddleware`
  block below it). `signInEmail` does carry `use: [formCsrfMiddleware]`
  (`node_modules/better-auth/dist/api/routes/sign-in.mjs:242`), so the middleware runs on a direct
  call, it simply finds nothing to validate. Passing the request alongside the body is safe: the
  validator reads `context.body` only (`node_modules/better-call/dist/validator.mjs:6-20`), so
  consuming the body with `c.req.json()` first does not break it. Note also that `signOut` has no
  `use` array at all (`node_modules/better-auth/dist/api/routes/sign-out.mjs:15`), so no thin logout
  route can have an origin check whatever it passes.
  This finding folds into F1 if Fix A is taken. It stands on its own if Fix B is taken.
- **Fix**: Change the contract to `request: c.req.raw` alongside `headers: c.req.raw.headers` on every
  `auth.api` call, and state in the plan that a thin logout has no origin check by construction.
- **Decision**: PENDING

### F3 - Zod is not a declared dependency of this project

- **Severity**: ❌ CRITICAL
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: Phase 2 change 2, validation contract
- **Detail**: Phase 2 builds `src/server/validation/subscriptions.ts` on Zod schemas, and
  `context/foundation/tech-stack.md` records "Zod carries one validation contract at every entry
  point". `package.json` declares no `zod` in `dependencies` or `devDependencies`. The import resolves
  today only by accident: `@cloudflare/vitest-pool-workers`, a devDependency, pins `zod@4.4.3` and npm
  hoisted it to `node_modules/zod`, while Better Auth carries its own nested `zod@4.6.2`. So server
  runtime code would be resolving a package supplied by a test-only transitive dependency, and
  `AGENTS.md`'s rule "Pin every dependency to an exact version" is not satisfied. No phase adds it.
- **Fix**: Add a Phase 2 step that adds `zod` to `dependencies` at an exact version and records the
  lockfile change, before the validation module is written.
- **Decision**: PENDING

### F4 - The Phase 2 unit test sits outside the unit runner's include glob

- **Severity**: ❌ CRITICAL
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: Phase 2 change 6, and success criterion "Unit tests pass"
- **Detail**: Phase 2 places the validation unit test at `src/server/validation/subscriptions.test.ts`.
  `vitest.unit.config.ts` includes only `src/domain/**/*.test.ts`, and no phase changes it. The file
  would never run, and criterion 2.2 would report green while covering nothing. `AGENTS.md` and
  `README.md` both state unit tests cover `src/domain/`, so this is not a typo in the config but a
  scope decision the plan silently crosses.
- **Fix**: Add an explicit Phase 2 step widening the unit include to cover `src/server/**/*.test.ts`,
  and update the one-line description of unit scope in `AGENTS.md` and `README.md` in the same step so
  the three stay in agreement.
- **Decision**: PENDING

### F5 - The test pool's storage isolation is assumed, and the named escape hatch destroys the schema

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: Blind Spots
- **Location**: "Key findings", Phase 1 and Phase 2 test contracts, research open question 4
- **Detail**: The plan treats isolation as undocumented and designs conservatively around it, which is
  right as far as it goes, but it only guards against one of the two possible answers. Reading the
  installed pool at 0.22.0 finds no `isolatedStorage` option in the pool's schema and no stack
  push-and-pop machinery anywhere in `node_modules/@cloudflare/vitest-pool-workers/dist/`, so state
  written by one test is visible to the next. The one tool the research names for a clean slate makes
  things worse rather than better: `reset()` is implemented as
  `await workerdUnsafe.deleteAllDurableObjects()` (the pool's `src/worker/reset.ts`, readable through
  `dist/worker/lib/cloudflare/test-internal.mjs.map`), its published type says "Deletes all data from
  all attached bindings", and miniflare's local D1 is itself a Durable Object
  (`node_modules/miniflare/dist/src/workers/d1/database.worker.js:146`,
  `var D1DatabaseObject = class extends MiniflareDurableObject`). Calling `reset()` therefore drops
  the tables the setup file created along with the migration bookkeeping, and every later query fails
  with a missing table.
  The concrete hazard this creates for the plan as written: if Fix A of F1 is taken and sign-ins run
  through the handler, the rate-limit test leaves a tripped counter in the `rateLimit` row keyed
  `<ip>|/sign-in/email`, and the sign-in window is ten seconds. Any later test in the same run that
  signs in, which is every case in Phase 2, can be answered 429 instead of 200. The suite would fail
  in a way that reads like an ownership bug.
- **Fix**: State the isolation answer in the plan as verified, no isolation and no `reset()`, and make
  the test contract carry the two consequences: unique account emails per test so seeding never
  collides, and the rate-limit case placed last in its file or given its own file, with the plan
  saying why the ordering matters.
  - Strength: Turns an open question into a written constraint before anyone writes a flaky test.
  - Trade-off: Ties the suite to an observed behaviour of one pool version, so a pool upgrade needs a
    re-read.
  - Confidence: HIGH for `reset()` and the D1 backing, both read directly; MED for the absence of
    isolation, which is argued from the absence of any mechanism rather than from a run.
  - Blind spot: Whether the setup file re-runs per test file has not been exercised with a real
    migration present, since `migrations/` currently holds only a README.
- **Decision**: PENDING

### F6 - The Secure-cookie fallback cannot work as described, and no phase builds it

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: End-State Alignment
- **Location**: Phase 1 change 2, auth instance factory; Phase 4 manual checklist; brief, open risks
- **Detail**: The brief and the research both name the same fallback if a browser refuses a `Secure`
  cookie over `http://localhost`: "drive `advanced.useSecureCookies` from an environment flag". That
  fallback is inert against the configuration Phase 1 fixes. `createCookieGetter` composes cookie
  attributes with `advanced.cookies[name].attributes` spread last
  (`node_modules/better-auth/dist/cookies/index.mjs:38-42`), after
  `defaultCookieAttributes` and after the `secure` value derived from `useSecureCookies`, so the
  hardcoded `secure: true` in `advanced.cookies.session_token.attributes` wins in every environment
  and flipping `useSecureCookies` changes nothing. Worse, `useSecureCookies` also drives the
  `__Secure-` cookie name prefix on the same line 23, so flipping it renames the cookie rather than
  just unsetting an attribute. Separately, no phase contains a step that builds the fallback, so this
  is also a promise in the brief with no supporting phase: Phase 4's manual checklist can only
  discover the problem, not resolve it. The risk is narrow but real, since Safari does not accept a
  `Secure` cookie over plain http even on localhost while Chrome and Firefox do.
- **Fix**: Make the environment flag drive the per-cookie `secure` attribute directly, defaulting to
  true and set to false only when the flag says so, and add it to Phase 1's factory contract as a
  built step rather than a named fallback. Leave `useSecureCookies` alone so the cookie name stays
  stable.
- **Decision**: PENDING

### F7 - The seed route's gate cannot be a mount-time condition in Workers

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: Phase 3 change 1, seed route; mirrored in `context/decisions/D-005-account-seeding.md`
- **Detail**: The contract reads "mounted only when `env.SEED_ENABLED === "true"`, and answering 404
  otherwise". Those two clauses describe different mechanisms and only the second is achievable. The
  plan's own "Critical implementation details" establishes that bindings and variables exist only
  inside a request's `env` in Workers, which is why the auth instance is built per request; the same
  constraint means a Hono route cannot be conditionally registered at module scope on the value of
  `env.SEED_ENABLED`. An implementer following the first clause literally will reach for a module-scope
  branch and find `env` undefined. The route must always be registered and must answer 404 from inside
  the handler when either gate fails. The security property the decision record wants, that the route
  is not detectable, is preserved by the 404 either way.
  A second, smaller gap in the same phase: D-005 names four integration cases (gate off returns 404,
  gate on with a wrong token returns 404, gate on with the right token creates the accounts and a
  second identical call reports them unchanged, and sign-up stays refused throughout), while Phase 3's
  success criteria name only "a seed call refused when the gate is off". The idempotency case in
  particular is the one the contract claims and the criteria do not check.
- **Fix**: Reword the contract to "registered unconditionally, answering 404 from the handler unless
  both `env.SEED_ENABLED === "true"` and the `x-seed-token` header matches", in the plan and in D-005,
  and list all four D-005 cases in the Phase 3 automated criteria with matching Progress rows.
- **Decision**: PENDING

### F8 - On Workers the limiter cannot resolve a client IP, so it degrades to one shared bucket

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: Blind Spots
- **Location**: Phase 1 change 2, auth instance factory
- **Detail**: `getIP` reads only the headers named in `advanced.ipAddress.ipAddressHeaders`, defaulting
  to `["x-forwarded-for"]` (`node_modules/@better-auth/core/dist/utils/ip.mjs`, `DEFAULT_IP_HEADERS`),
  and it returns null for any multi-value forwarded chain unless `trustedProxies` is configured. On
  Cloudflare Workers the trustworthy client address is `cf-connecting-ip`. The plan configures neither.
  When no IP resolves, `resolveRateLimitConfig` logs a warning and falls back to the literal key
  `no-trusted-ip` combined with the path
  (`node_modules/better-auth/dist/api/rate-limiter/index.mjs:235-247`), which is a single bucket shared
  by every caller. Combined with the built-in sign-in rule of three attempts per ten seconds, three
  failed sign-ins from anyone lock out every account for the window. That contradicts the requirements
  line "an organizer who mistypes their password a few times in a row can still get in", which the
  test plan lists under risk 6 as a thing that must be challenged.
- **Fix**: Add `advanced.ipAddress.ipAddressHeaders: ["cf-connecting-ip"]` to the Phase 1 factory
  contract, and note in the plan that the test pool supplies no such header so the suite exercises the
  shared-bucket path.
  - Strength: One option, verified against the resolver, and it makes the limit per-caller in every
    deployed environment.
  - Trade-off: The local dev server and the test pool still fall into the shared bucket, so the tests
    prove the mechanism rather than the keying.
  - Confidence: HIGH for the resolver behaviour; MED that Cloudflare's edge always populates
    `cf-connecting-ip` for the Worker in this configuration, which has not been exercised here.
  - Blind spot: Whether a two-account product cares about the shared bucket is a product call the plan
    should make explicitly rather than leave implied.
- **Decision**: PENDING

### F9 - Two details in the subscriptions migration are weaker than the contract they back

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Architectural Fitness
- **Location**: Phase 2 change 1, subscriptions migration
- **Detail**: Two small mismatches, neither a defect on the success path. The CHECK constraint
  `GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'` admits `0000-00` and every month from `13` to `19`, while
  the Zod rule beside it is `^\d{4}-(0[1-9]|1[0-2])$`. The database backstop is therefore looser than
  the validator it is meant to survive, which matters for the seed route and for any future write that
  does not go through the same schema. Separately, `subscriptions.user_id` is declared
  `REFERENCES "user"("id")` with no `ON DELETE` clause, while every auth table carried over from the
  spike uses `ON DELETE CASCADE`; the plan does not say what should happen to a subscription when its
  account is removed, and the inconsistency will be copied by every child table in later slices, since
  this row is described as "the root every later record hangs from".
- **Fix**: Tighten the CHECK so the month half matches the validator, and state the delete behaviour
  for `subscriptions.user_id` explicitly so later slices inherit a decision rather than an omission.
- **Decision**: PENDING

### F10 - Three loose ends in the plan's own bookkeeping

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: Phase 3 change 2, Phase 3 change 4, and the risk mapping table
- **Detail**: First, `context/decisions/D-005-account-seeding.md` already exists and was committed
  with the plan itself in `6e81a71`, yet Phase 3 lists writing it as a required change with a full
  contract. The phase should say the record exists and that the only remaining edit is its commit
  field, or F7's rewording. Second, two artifacts point at this slice as unfinished and no phase
  clears them: `package.json`'s `seed:local` script exits 1 with the message "Account seeding lands
  with the runtime-auth slice (S-01)", and `README.md` carries both "Sign-in is Better Auth on that
  same binding (decision D-001), not yet wired up" and "`npm run seed:local` is a placeholder until
  the same slice adds account seeding". Phase 3 change 4 mentions only extending the setup section.
  Third, the risk mapping table claims test-plan risk 6 is covered by "`tests/integration/auth.test.ts`,
  all cases", but the test plan's own protection statement for risk 6 is "After sign-out the previous
  session reaches nothing, an expired session reaches nothing, and repeated failed sign-ins stop being
  useful". No phase plans an expiry case. Either the table should say risk 6 is partially covered, with
  expiry named as deferred and why, or a case should be added.
- **Fix**: Correct the Phase 3 wording for D-005, add the `seed:local` script and the two stale README
  lines to Phase 3's change list, and make the risk-6 row in the mapping table state what it does not
  cover.
- **Decision**: PENDING

## What the plan gets right

Worth recording so the corrections above are not read as a rejection of the approach. Putting the
ownership filter inside the repository's SQL rather than in a route check is the right call and is
correctly argued: a leak becomes a bug in one file rather than an omission in any of several, and the
404-for-absent-or-foreign rule follows from it rather than being bolted on. The test-first ordering is
applied exactly where it earns its cost, on the two risks the test plan names as silent. The scope
boundary is honest, with the "what we are NOT doing" list actually holding across all five phases and
no item reappearing in a phase. The phases are genuinely reversible one at a time. The research behind
the plan found three real gaps the spike left and read the installed package rather than the
documentation to find them, which is why the schema in `0001_auth.sql` matches better-auth 1.7.4's
`account` model with no `issuer` field, verified here against
`node_modules/@better-auth/core/dist/db/get-tables.mjs`. The `migrations_dir` key is correctly placed
inside the D1 binding entry, and the npm build-script approvals in `package.json` are a real npm 11
mechanism, both checked. The `## Progress` block satisfies the mechanical contract in full.

## Resolution

Every finding was re-verified against the installed packages before being acted on; the review's code
citations all held. Resolved in `plan.md`, `plan-brief.md`, `research.md` and
`context/decisions/D-005-account-seeding.md`.

| Finding | Decision | What changed |
|---|---|---|
| F1 | Neither Fix A nor Fix B: the thin routes are dropped entirely | `POST /api/login` and `POST /api/logout` are not built. The client and the tests call `POST /api/auth/sign-in/email` and `POST /api/auth/sign-out`, so throttling, origin checking and CSRF apply by construction rather than by forwarding. `rateLimit` keeps `storage: "database"` and the migration keeps its table, and a custom rule for `/sign-in/email` at ten attempts per sixty seconds overrides the built-in three-per-ten, so the Phase 1 assertion has numbers it owns. |
| F2 | Accepted, and mostly absorbed by F1 | `GET /api/me` is the only remaining direct `auth.api` call and passes both `headers: c.req.raw.headers` and `request: c.req.raw`. The plan records that `signOut` carries no middleware array, which is one of the reasons a thin logout was not worth keeping. |
| F3 | Accepted | Phase 2 opens with a step adding `zod` to `dependencies` at exactly `4.6.2`, with the lockfile change, before anything imports it. |
| F4 | Accepted | Phase 2 adds a step widening the unit include to `src/**/*.test.ts`, leaving the integration suite under `tests/` to its own config, and updating the one-line unit-scope description in `AGENTS.md` and `README.md` in the same step. Validation schemas stay in `src/server/validation/`. |
| F5 | Accepted, with the stronger form | The plan now states as verified that there is no isolation and that `reset()` is never called, since it deletes durable objects and the local database is one. Tests use per-test account emails and a per-test `cf-connecting-ip`, and the throttling case runs last in its file. |
| F6 | Accepted | A `COOKIE_SECURE` variable drives the per-cookie `secure` attribute directly, defaulting to secure when unset. `useSecureCookies` is left alone so the cookie name stays stable, and nothing else in the factory sets `secure`. The browser check is now a Phase 4 checklist item naming the Safari symptom and the remedy. |
| F7 | Accepted | The route is registered unconditionally and answers 404 from inside the handler when either the flag or the token fails, in the plan and in the decision record. Phase 3's automated criteria now name all four cases the record lists. |
| F8 | Accepted | The factory sets `advanced.ipAddress.ipAddressHeaders: ["cf-connecting-ip"]`, the option name confirmed in the installed resolver. The plan records that the tests prove the mechanism rather than the keying, and research carries an open question about the deployed runtime populating that header. |
| F9 | Accepted | The month pattern is tightened to `[0-9][0-9][0-9][0-9]-[01][0-9]`, with the plan stating that the residual gap is closed by the range rule in the validation schema. `subscriptions.user_id` gains `ON DELETE CASCADE`, matching the auth tables, so later child tables inherit a decision rather than an omission. |
| F10 | Accepted | Phase 3 now says the decision record already exists and that only its commit field and gate wording change. The `seed:local` placeholder script and the two stale README lines are named as work in the same phase. The risk-mapping row for risk 6 lists the cases it covers, including the new expired-session case in Phase 1, and states that throttling is proven as a mechanism and not as per-caller keying. |

Progress rows: existing step titles are unchanged. New criteria added new indices, 2.6 and 2.7 in
Phase 2, 3.5 and 3.6 in Phase 3, and 4.10 in Phase 4. No index was reused and none was renumbered.

Nothing in the review was rejected or deferred.
