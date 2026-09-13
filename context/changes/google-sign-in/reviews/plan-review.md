<!-- PLAN-REVIEW-REPORT -->
# Plan review: Implementation plan, Google sign-in

- **Plan**: `context/changes/google-sign-in/plan.md`
- **Mode**: Deep
- **Repository state**: commit `a6cf39b` on `main`. Nothing of this change is on disk yet. The working
  tree carries four other tasks' uncommitted edits, of which two are load bearing for this review and
  were read but not staged: the designer's HTTP-error paragraph in
  `context/changes/google-sign-in/design-delta.md`, and the Cloudflare secret tail in
  `context/checkpoints/g02-oauth-provision.md`.
- **Verdict**: REVISE
- **Findings**: 3 critical, 3 warnings, 4 observations
- **Reviewer**: independent; did not write the plan, the research or the design delta

Date and effort fields the report schema lists are omitted, matching this repository's convention of
recording progress by change ID, migration ID and commit. This review writes nothing outside this
file, its checkpoint, and the `status` line of `change.md` that the skill assigns to the reviewer.

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | FAIL |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | FAIL |
| Plan Completeness | WARNING |

## Grounding

Paths: 13/13 verified. Every file the plan edits exists at the path it names (`src/server/auth.ts`,
`src/server/routes/auth.ts`, `env.d.ts`, `.dev.vars.example`, `src/client/api.ts`,
`src/client/App.tsx`, `src/client/screens/Login.tsx`, `src/client/index.css`,
`src/server/auth.test.ts`, `tests/integration/accounts.ts`, `tests/integration/auth.test.ts`,
`.github/workflows/ci.yml`, `wrangler.jsonc`), and all three new paths are absent as they should be
(`src/client/components/GoogleMark.tsx`, `src/client/components/ui/googleErrors.ts`,
`tests/integration/google-auth.test.ts`), with their parent directories present.

Symbols: 6/6 verified. `.btn-quiet` exists in `src/client/index.css`; `FormAlert` and
`CONNECTION_FAILURE` are exported from `src/client/components/ui/FormAlert.tsx`; the catch-all in
`src/server/routes/auth.ts` is `app.on(['POST','GET'], '/api/auth/*', ...)` and cannot capture
`/api/auth-config`; `src/client/api.ts` carries the single `request()` helper the plan reuses;
`tests/integration/accounts.ts` carries the prefix allocation comment through `10.7.0.x`, so
`10.8.0.x` is genuinely free; `.github/workflows/ci.yml` holds no secret.

Progress contract: PASS. One `## Progress` heading at the bottom, four `### Phase N` subsections
matching the four `## Phase N` bodies by name, every success-criteria bullet carried by a row, and no
checkbox anywhere outside the Progress section.

Brief to plan: consistent. `plan-brief.md` names the same four phases, the same scope boundary and the
same open questions.

Library claims verified against the installed `better-auth@1.7.4` and the current documentation: 6
confirmed, 1 wrong. Confirmed: `account.accountLinking.disableImplicitLinking` exists and rejects a
same-email OAuth sign-in even for a verified email or a trusted provider; `trustedProviders` is the
option the plan deliberately leaves unset; the Google provider's default scopes are exactly `email`,
`profile`, `openid` (`@better-auth/core/src/social-providers/google.ts:172-174`), so the phase 3
scope assertion will hold; `includeGrantedScopes` does send `include_granted_scopes=true` unless set
to `false` (`:191-193`), so the plan's reason for setting it is right; `CLIENT_ID_AND_SECRET_REQUIRED`
is thrown inside `createAuthorizationURL` at click time (`:163-168`), not at `betterAuth()`
construction, which is exactly why the plan's per-request conditional registration is safe and why
empty strings would be a server error; `callbackURL` and `errorCallbackURL` are both validated against
`trustedOrigins` before the flow starts
(`node_modules/better-auth/dist/api/middlewares/origin-check.mjs:50-68`), so the plan closes the open
redirect by construction. Wrong: where a failure lands when the state itself fails. See F1.

## Findings

### F1 - The expired-link outcome cannot reach the login screen

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: Blind Spots
- **Location**: Key findings, "Errors on the redirect leg arrive as a browser redirect"; Phase 2, error
  mapping; Phase 3, Progress row 3.10
- **Required**: yes
- **Detail**: The plan's key finding says the client must send `errorCallbackURL` on every call so a
  failure two hops later lands on this app. That is true only while the OAuth state parses, because
  `errorCallbackURL` is stored *inside* the state and recovered from it
  (`node_modules/better-auth/dist/oauth2/state.mjs:27`, and `parseState` at `:46-63`). When the state
  is the thing that failed, there is nothing to recover it from, and the callback falls back to
  `defaultErrorURL`, which is `c.context.options.onAPIError?.errorURL || ${baseURL}/error`
  (`node_modules/better-auth/dist/api/routes/callback.mjs:37`). This application sets no `onAPIError`,
  so that resolves to `/api/auth/error`, the library-rendered page with none of the redesign's
  styling.

  Three of the exact codes the delta fixes a sentence for take that path. A callback carrying no
  `state` at all redirects to `defaultErrorURL` with `error=state_not_found`
  (`callback.mjs:74-77`). Under the database state strategy, a fabricated, replayed or expired state
  finds no verification row and throws `state_mismatch` with no `errorURL` attached
  (`node_modules/better-auth/dist/state.mjs:119-123`). Under the cookie strategy, a missing state
  cookie throws `state_mismatch` and a decryption failure throws `state_invalid`, both likewise with
  no `errorURL` (`:96-111`). Only the security-mismatch and expiry throws carry `parsedData.errorURL`,
  and both of those require the state to have parsed first.

  So the delta's "This sign-in link has expired. Start again from this page." is unreachable for the
  most ordinary way of producing it, and the `state_not_found`, `state_invalid`, `state_mismatch` row
  of the plan's own mapping table is dead code. Progress row 3.10, which asserts that a callback with
  a fabricated state "redirects to the configured error URL", is false as written: it redirects to the
  library's error page. The research made the same inference at `research.md:215-222` and did not test
  the state-failure case, so this is inherited rather than introduced.
- **Fix**: Add `onAPIError: { errorURL: '/' }` to the options in `createAuth`, unconditionally and
  alongside the `account` block, so `defaultErrorURL` becomes the app root for every callback failure
  that cannot recover the per-flow URL. Keep sending `errorCallbackURL` on every social call, which
  still governs the cases that do parse. Then correct the key finding and the risk narrative, and add
  a phase 1 Progress row asserting the resolved options carry the error URL, so the setting cannot be
  dropped later without failing a test. Progress row 3.10 should assert the redirect lands on the app
  root rather than on `/api/auth/error`, which is what makes it a real test instead of a tautology.
- **Decision**: RESOLVED (see `## Resolution`)

### F2 - The `account_not_linked` integration case has no executable mechanism

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: Plan Completeness
- **Location**: Phase 3, required change 2, fourth bullet; Progress row 3.11; the credential
  dependency table
- **Required**: yes
- **Detail**: Every other case in phase 3 is specified to the assertion. This one reads "Seed a
  password account, then drive the linking path for the same email and assert the refusal", which is
  the only instruction in the plan an implementer cannot follow without inventing the method. It is
  also the one that may not be reachable at all. The linking branch sits well past the network: the
  callback must pass `provider.validateAuthorizationCode` against
  `https://oauth2.googleapis.com/token` and then `provider.getUserInfo`
  (`node_modules/better-auth/dist/api/routes/callback.mjs:110-135`) before
  `handleOAuthUserInfo` is consulted at all. The Workers test pool has no route to Google, and the
  plan's own boundary rule forbids a mock standing in for that leg. Research proposed five integration
  cases at `research.md:349-368` and deliberately did not propose this one.

  The credential dependency table then states "Phase 3, every case | yes" as executable now. On the
  evidence that row is optimistic, and it is the one place where the plan's otherwise careful honesty
  about what can and cannot be proved slips.
- **Fix A ⭐ Recommended**: Name the mechanism. `handleOAuthUserInfo` is exported from the
  `better-auth/oauth2` entry point (`node_modules/better-auth/dist/oauth2/index.mjs:5`), so the case
  can run inside the Workers pool against the real D1: seed a password user through the existing
  `seedUser` helper, call `handleOAuthUserInfo` with a fabricated `google` account and a `userInfo`
  carrying the same email and `emailVerified: true`, and assert it returns `{ error: 'account not
  linked', data: null }` (`node_modules/better-auth/dist/oauth2/link-account.mjs:79-85`). Note in the
  plan that the underscored `account_not_linked` the delta and D-013 name is the callback's own
  transform of that string, `result.error.split(' ').join('_')` at `callback.mjs:243-245`, so the
  client mapping and this assertion are testing two spellings of one fact.
  - Strength: proves the rule D-013 exists to protect, against the real database, with no network and
    no mock of Google.
  - Trade-off: it asserts the library's function rather than this app's route, so it would not catch a
    later change that stops the callback consulting that function.
  - Confidence: HIGH - the export, the call shape and the returned string were each read in the
    installed package.
  - Blind spot: whether `handleOAuthUserInfo`'s context argument can be built in a test without the
    full endpoint context was not tried.
- **Fix B**: Drop Progress row 3.11 and let D-013 rest on the phase 1 options assertion plus the G05
  live roundtrip, recording in the plan that the refusal is configuration-asserted rather than
  path-asserted.
  - Strength: keeps every remaining row honest and needs no new test technique.
  - Trade-off: the one rule this change exists to guarantee has no behavioural test until a manual
    gate outside the plan.
  - Confidence: HIGH - the phase 1 assertion does pin the option.
  - Blind spot: none significant.
- **Decision**: RESOLVED (see `## Resolution`)

### F3 - The designer's ruling on an HTTP error from the social call is unabsorbed

- **Severity**: ❌ CRITICAL
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: End-State Alignment
- **Location**: Design questions, item 1; Critical implementation details, "Busy states"; Phase 2
  Progress
- **Required**: yes
- **Detail**: The plan raises as an open design question what to show when the configuration read said
  Google was available but the social call answers an HTTP error, and it resolves it provisionally with
  the connection sentence. The design delta in the working tree now rules on exactly that: an HTTP
  error such as 404 or 500 re-enables the button and shows "Google sign-in did not finish. Try again,
  or sign in with your email." as an alert per 3.8, and the connection sentence is reserved for a
  request that never reached the server. The plan therefore contradicts its own design authority on a
  question the designer has answered, and no Progress row covers the ruled behaviour in any phase.
- **Fix**: Split the failure in "The two client calls" and "Busy states" by what the `request()` helper
  throws: an `ApiError` of any status, and a `SignedOutError` from a 401, take the fourth sentence as
  an alert; only a rejection that never produced a response takes the connection sentence. Delete
  Design question 1. Add one phase 2 manual row and one phase 4 manual row for the HTTP-error case,
  beside the existing network-blocked rows 2.11 and 4.9.
- **Decision**: RESOLVED (see `## Resolution`)

### F4 - The deployed origin's presence in `APP_ORIGINS` is asserted, not verified

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Blind Spots
- **Location**: Risks table, the `trustedOrigins` row; the live gate
- **Required**: yes
- **Detail**: The mitigation reads "The deployed origin is already in `APP_ORIGINS`". That value is a
  Cloudflare secret, `wrangler secret list` shows names and never values, and nothing in this
  repository can confirm it. The consequence of it being absent or differing by a trailing slash is
  narrow and late: `callbackURL` and `errorCallbackURL` are validated against `trustedOrigins` before
  the redirect starts (`origin-check.mjs:50-68`), so the deployed app would answer the click with a
  403 and `INVALID_CALLBACK_URL` while every local run and the whole suite stayed green. The plan's
  risk row treats a fact it cannot see as a mitigation.
- **Fix**: Restate the row as unverified, and add one step to the G05 live gate ahead of the consent
  roundtrip: on the deployed origin, confirm the social call answers 200 with an
  `accounts.google.com` url rather than 403, which exercises the trusted-origin list and the redirect
  registration in one request before a human is asked to consent to anything.
- **Decision**: RESOLVED (see `## Resolution`)

### F5 - The credential statement is stale in the opposite direction

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: "The credential dependency, stated plainly"; the live gate
- **Required**: yes
- **Detail**: The plan records that Cloudflare secret provisioning did not complete and that the
  deployed Worker carries neither value. The working tree's `context/checkpoints/g02-oauth-provision.md`
  now carries a "Cloudflare secret" section recording that `GOOGLE_CLIENT_SECRET` was piped into
  `wrangler secret put` in an authorized environment and appears in `wrangler secret list`, and that
  `GOOGLE_CLIENT_ID` was deliberately left unset pending this change's choice of `secret` against
  `vars`. So the remote state is half provisioned, not empty, and the plan already answers the question
  that was left open: both names go through `wrangler secret put`.

  The plan's design survives this unharmed, and that is worth saying rather than leaving to inference.
  `/api/auth-config` computes `Boolean(id && secret)` and the provider block is conditional on both, so
  a deployment holding one value of the pair is indistinguishable from one holding neither: no
  provider, no button, no partial state to reason about. The honesty the task asks for is better served
  by stating that than by a paragraph that is now wrong in its facts.
- **Fix**: Rewrite the paragraph to the current state, name the half-provisioned case and why the
  Boolean-AND makes it safe, and reduce the G05 prerequisite from two secrets to
  `wrangler secret put GOOGLE_CLIENT_ID` plus a deploy.
- **Decision**: RESOLVED (see `## Resolution`)

### F6 - Reusing `CONNECTION_FAILURE` would ship copy the delta does not specify

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: End-State Alignment
- **Location**: Critical implementation details, "Busy states"; Phase 2, required change 5
- **Required**: yes
- **Detail**: The plan calls for "the generic alert of 3.8" showing "the connection sentence", and
  names it once in full as "Could not reach Google. Check your connection and try again." The
  repository already exports a constant with that role from
  `src/client/components/ui/FormAlert.tsx:31`, and its text is "Could not save. Check your connection
  and try again." An implementer reading "the connection sentence" with that constant in scope, in a
  file that already imports it, is one keystroke away from shipping the wrong sentence, and no
  automated row would catch it because no test in this repository reads client markup.
- **Fix**: State in phase 2 that the Google path introduces its own constant and does not reuse
  `CONNECTION_FAILURE`, and quote both sentences side by side so the difference is visible at the point
  of the edit. The `googleErrors` unit test is the natural place to pin it, since it already asserts
  exact sentences for the other four.
- **Decision**: RESOLVED (see `## Resolution`)

### F7 - `error_description` reaches the address bar even though nothing renders it

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Blind Spots
- **Location**: Critical implementation details, "Error codes to sentences"; Progress rows 2.5 and 2.13
- **Required**: no
- **Detail**: The delta says `error_description` is never shown and the plan guards it with
  `grep -rn "error_description" src/client/` returning nothing. That guard proves the client never
  reads it; it cannot see that the library writes it. `redirectOnError` appends both `error` and
  `error_description` to the redirect
  (`node_modules/better-auth/dist/oauth2/errors.mjs:34-38`, and the callback's local copy at
  `callback.mjs:81-86`), so Google's own description text lands in the URL bar, the browser history
  entry and any outbound referrer until `history.replaceState` runs.
- **Fix**: Say in the plan that the replace drops the whole query rather than the `error` key, and that
  it runs on mount whenever either `error` or `error_description` is present, including for codes the
  mapping does not recognise. Extend Progress row 2.13 to name both keys.
- **Decision**: RESOLVED (see `## Resolution`)

### F8 - `design-spec.md` 4.1 still carries the sentence the delta replaces

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: Overview; the file list in References
- **Required**: no
- **Detail**: The delta opens 4.1 with "Replace the last bullet, 'No link to anything else; there is no
  registration.'". The plan edits no specification file and does not say whether that replacement is
  meant to land in `context/changes/visual-redesign/design-spec.md` or to stand in the delta alone.
  Since the plan touches neither, a later reader of the accepted specification finds a sentence this
  change contradicts, with nothing at that line pointing anywhere.
- **Fix**: One sentence in the Overview recording that `design-spec.md` is deliberately not edited and
  that the delta is the standing amendment for sections 4.1, 9 and 11, so the omission reads as a
  choice rather than an oversight.
- **Decision**: RESOLVED (see `## Resolution`)

### F9 - The configuration endpoint's exposure and its absence of throttling are left to inference

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Architectural Fitness
- **Location**: Critical implementation details, "The configuration endpoint"
- **Required**: no
- **Detail**: `GET /api/auth-config` is registered on the Hono app beside `/api/me`, outside the
  `/api/auth/*` catch-all, so the library's database-backed rate limiter does not cover it. It is the
  first unauthenticated, unthrottled read this application has. The exposure is genuinely nil: it
  returns one boolean, the client id is deliberately excluded, and the same boolean is already
  legible from whether the button renders. The plan makes the right call and does not write down why,
  which is the kind of absence that reads as an oversight to the next reviewer.
- **Fix**: Two sentences in that section: the route is deliberately unthrottled and unauthenticated
  because it is read before a session exists, and the boolean reveals nothing the rendered login
  screen does not already reveal.
- **Decision**: RESOLVED (see `## Resolution`)

### F10 - `state_mismatch` conflates an expired link with a tampered one - for the designer

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: End-State Alignment
- **Location**: Critical implementation details, error mapping table, second row
- **Required**: no
- **Detail**: The delta's grouping is accurate against the installed library: `state_not_found`,
  `state_invalid` and `state_mismatch` are the complete set of state failures a user can be shown, and
  the internal `state_security_mismatch` is collapsed into `state_mismatch` before it reaches the URL
  (`node_modules/better-auth/dist/oauth2/state.mjs:57`). Worth knowing that the collapse is what makes
  the grouping broader than its copy: `state_mismatch` covers a genuine expiry
  (`state.mjs:141-145`), but also a state parameter that does not match what was stored and a state
  cookie that was not persisted (`:113, :126, :133`), which are tampering or replay rather than
  staleness. "This sign-in link has expired. Start again from this page." is the correct instruction
  in all of those cases and leaks nothing, so this is a conflation the designer may simply want
  recorded rather than changed.
- **Fix**: If the designer is content, add one line to the delta's table noting that the expired-link
  sentence deliberately also covers a mismatched or unpersisted state, so the copy is not read later
  as a bug. No code change.
- **Decision**: RESOLVED (see `## Resolution`)

## What the plan gets right

Recorded because a review that lists only problems misrepresents this plan.

The scope discipline holds under inspection: no linking UI, no second provider, no extra scope, no new
dependency, no migration, no domain change, and a "What we are NOT doing" section whose every item
stays absent from the phases. The stability guards are executable rather than aspirational, and the
one about the client id never reaching the bundle is the right guard for the right risk. The rollback
is the strongest part of the change: the feature is absent when the environment is absent, that state
needs no code change and no migration, and it is the state continuous integration runs in on every
push, so it is exercised rather than believed. The test boundary is stated plainly in three places and
the plan refuses to claim what a mock cannot prove. The provider is registered conditionally rather
than with empty strings, which the installed package confirms is the difference between an absent
button and a server error on every click. And pulling the two D-013 options assertions forward into
phase 1 is the right call for the reason the plan gives.

## Verdict

**REVISE.** The approach is right and the architecture fits; nothing here calls for a rethink. Three
required corrections are substantive: one specified outcome cannot reach the screen as planned (F1),
one Progress row has no executable method and the plan's own honesty table says otherwise (F2), and a
design ruling that has since been made is not reflected (F3). The remaining three required findings
are single-paragraph corrections. Resolve F1 through F6 before phase 1 begins; F1's fix is one option
in `createAuth` and belongs in the same edit as the `account` block.

## Resolution

Applied after the review by a task that did not write the plan. Every finding is resolved: F1 through
F6 as required, F7, F9 and F10 as well, and F8 by stating the omission as a choice. None is deferred or
declined. Section references point at the state after the edits. The commits are listed with each
finding; all are single-artifact commits made by explicit path.

| Finding | Resolution | Commit |
| --- | --- | --- |
| F1 | `onAPIError: { errorURL: '/' }` added to the server phase, with a Progress row and a sharper callback assertion | `2fe573c`, `d73ad99` |
| F2 | Fix A taken: `handleOAuthUserInfo` named, with Fix B as the recorded fallback | `2fe573c` |
| F3 | The designer's ruling committed, absorbed into the plan, and carried by three new rows | `91fcbce`, `2fe573c` |
| F4 | The risk row restated as unverified; a 200-not-403 check added to the G05 live gate | `2fe573c` |
| F5 | The credential paragraph rewritten; the client id's binding decided | `2fe573c`, `69f326d` |
| F6 | `GOOGLE_CONNECTION_FAILURE` named, `CONNECTION_FAILURE` forbidden, both sentences quoted | `2fe573c` |
| F7 | The replace drops the whole query, on either key | `2fe573c` |
| F8 | The Overview records that the specification is deliberately not edited | `2fe573c` |
| F9 | Two sentences on the endpoint's exposure and its lack of throttling | `2fe573c` |
| F10 | One sentence added to the delta, by the designer's ruling | `91fcbce` |

### F1 - The expired-link outcome cannot reach the login screen (CRITICAL)

Fixed as recommended, and the correction landed in the research as well as in the plan, since both
carried the same claim. `src/server/auth.ts` gains `onAPIError: { errorURL: '/' }` unconditionally, in
the same edit as the `account` block, and phase 1 asserts it whether or not Google is configured as new
Progress row 1.12. The key finding now separates the two settings and says which failures each governs:
`errorCallbackURL` covers everything that happens once the state has parsed, and the error URL covers
every state failure, which has nothing to recover the per-flow URL from. The root-relative form was
verified rather than assumed: `appendQueryParams` appends the query to a `/` path without resolving it
against an origin (`@better-auth/core/dist/utils/url.mjs:40-49`), so one value is correct on all three
origins.

Progress row 3.10 keeps its title, because titles are immutable once a plan is reviewed, and the phase 3
body now states what it asserts: the fabricated-state callback lands on the app root carrying
`error=state_mismatch`, which is what the database state strategy produces when no verification row
matches, and not `${baseURL}/error`. The phase body says explicitly why the path must be asserted
alongside the code: an assertion that some error came back would pass against the library's own error
page. `research.md` section 4 carries the same correction, attributed to this finding.

### F2 - The `account_not_linked` integration case has no executable mechanism (CRITICAL)

**Fix A taken**, with Fix B recorded as a named fallback rather than dropped. The export was confirmed
in the installed package (`better-auth/dist/oauth2/index.mjs:5`), as was the returned string
(`link-account.mjs:79-85`). The plan now names the whole mechanism: seed through `seedUser`, call
`handleOAuthUserInfo` with `{ context: await auth.$context }`, a fabricated `google` account and a
`userInfo` carrying the seeded email with `emailVerified: true`, and assert
`{ error: 'account not linked', data: null }`. The review's blind spot, whether that context argument
can be built in a test, was narrowed rather than left open: the refusal branch returns before any
cookie, transaction or redirect work and reads only `internalAdapter`, `options`, `trustedProviders`
and `logger`, all of which `auth.$context` carries. It was not executed, because this task touches no
file under `tests/`.

So the fallback is written into the plan as an instruction rather than as a hope: if the context does
not satisfy the call inside the pool, drop the case and row 3.11, do not invent a fuller fake and do not
mock the adapter, and correct the credential dependency table to say the outcome is proven by the phase 1
options assertion and the G05 roundtrip alone. The underscore transform the review found
(`callback.mjs:243-245`) is recorded in the plan, as is the trade-off that this case asserts the
library's function rather than this application's route.

### F3 - The designer's ruling on an HTTP error from the social call is unabsorbed (CRITICAL)

The delta's paragraph is committed as the designer wrote it, unmodified, in `91fcbce`. The plan's
"Busy states" now splits the failure by what `request()` threw, in a two-row table: an `ApiError` of any
status and the `SignedOutError` of a 401 take the did-not-finish sentence, and only a rejection that
never produced a response takes the connection sentence. Design question 1 is deleted and that section
now records that nothing is open. Three rows carry the ruled behaviour: 2.15 in the browser pass, 3.16
on the pure mapping function, and 4.13 in the verification phase, each beside the existing
network-blocked row rather than replacing it.

### F4 - The deployed origin's presence in `APP_ORIGINS` is asserted, not verified (WARNING)

The risk row now reads as unverified and says why: `APP_ORIGINS` is a Cloudflare secret,
`wrangler secret list` shows names and never values, and a mismatch answers the click with 403 and
`INVALID_CALLBACK_URL` while every local run stays green. The G05 live gate gains the check the review
proposed, ahead of the consent roundtrip: on the deployed origin, confirm the social call answers 200
with an `accounts.google.com` url rather than 403. One request exercises the deployed origin list, the
validation of both callback URLs and the button's own origin, before a human is asked to consent to
anything.

### F5 - The credential statement is stale in the opposite direction (WARNING)

Rewritten to the current state in both the plan and the brief. `GOOGLE_CLIENT_SECRET` is set on
Cloudflare and appears in `wrangler secret list`; `GOOGLE_CLIENT_ID` is not. The half-state is named
and so is the reason it is safe: both the provider block and `/api/auth-config` are a Boolean AND of the
two names, so a deployment holding one value is indistinguishable from one holding neither. The G05
prerequisite drops from two secrets to `wrangler secret put GOOGLE_CLIENT_ID` plus a deploy.

**The binding question is decided here rather than deferred: the client id goes through
`wrangler secret put`, not into a `wrangler.jsonc` var.** The id is public and D-012 records it in full,
so a var would leak nothing, and that argument is stated in the plan rather than hidden. Three reasons
decide it the other way. `vitest.integration.config.ts` loads `wrangler.jsonc` through `configPath`, so
a var would bind the id into every integration run and make the provider-absent cases depend on the
absence of the secret alone. The stability guard that no `GOOGLE_CLIENT_ID` value appears in the diff
stays mechanical, so nobody has to judge which credential values are harmless. And one mechanism for a
matched pair is one fewer thing to get wrong when either is rotated.

### F6 - Reusing `CONNECTION_FAILURE` would ship copy the delta does not specify (WARNING)

The Google path introduces `GOOGLE_CONNECTION_FAILURE` in
`src/client/components/ui/googleErrors.ts`, and the plan states that the module does not import
`CONNECTION_FAILURE`. Both sentences are quoted side by side in a table at the point of the edit, so the
difference is visible rather than remembered: "Could not save. Check your connection and try again."
against "Could not reach Google. Check your connection and try again." The choice between the Google
connection sentence and the did-not-finish sentence is a pure function in the same module,
`startFailureMessage(error)`, which is what lets the `googleErrors` unit test pin both in full, as
Progress row 3.16.

### F7 - `error_description` reaches the address bar even though nothing renders it (OBSERVATION)

Resolved, since it cost one paragraph. The plan now records that the library writes the key even though
the client never reads it (`oauth2/errors.mjs:34-38`), that the replace therefore drops the whole query
rather than the `error` key, and that it runs on mount whenever either key is present, including for
codes the mapping does not recognise and for an `error_description` arriving with no `error` beside it.
Progress row 2.13 keeps its title, which already covers the query rather than one key.

### F8 - `design-spec.md` 4.1 still carries the sentence the delta replaces (OBSERVATION)

Resolved as a statement of intent rather than an edit, which is the ruling recorded for this change: the
accepted S-06 specification is not edited, `design-delta.md` is the standing amendment for sections 4.1,
9 and 11, and the archive of S-06 carries the original wording. The Overview says so in one paragraph,
so the omission reads as a choice.

### F9 - The configuration endpoint's exposure and its absence of throttling are left to inference (OBSERVATION)

Resolved. "The configuration endpoint" now states that the response is exactly `{ "google": boolean }`
and nothing else, that the route is deliberately unauthenticated and unthrottled because it is read
before a session exists and sits outside the `/api/auth/*` catch-all the library's limiter covers, and
that the boolean reveals nothing the rendered login screen does not already reveal.

### F10 - `state_mismatch` conflates an expired link with a tampered one (OBSERVATION)

The designer is content and ruled that the grouping stands. One sentence is added to `design-delta.md`
under the outcomes table, in the designer's own words: the three state codes share one sentence
deliberately, staleness, replay and tampering all end the same way for the person at the keyboard, start
again from this page, and the interface does not accuse. No code change and no copy change.

## Re-verification

Performed by an independent task that wrote neither the plan nor the resolutions. Every cited commit
was read as a diff, every library claim was re-read in the installed `better-auth@1.7.4` rather than
recalled, and the Progress section was checked row by row against the design delta.

### Findings

| Finding | Verified | Evidence |
| --- | --- | --- |
| F1 | yes | `2fe573c` adds `onAPIError: { errorURL: '/' }` to the server phase unconditionally (`plan.md:290`), Progress row 1.12 asserts the resolved options carry it configured or not, and the phase 3 body now says row 3.10 asserts the `Location` is the app root carrying `error=state_mismatch` rather than `${baseURL}/error` (`plan.md:629`). `d73ad99` carries the same correction into `research.md:224-242`, attributed to this finding. The default the fix overrides is confirmed at `callback.mjs:37`, and the root-relative form is safe: `appendQueryParams` keeps a `/` path relative and returns it without an origin (`@better-auth/core/dist/utils/url.mjs:40-49`). |
| F2 | yes | Fix A taken in `2fe573c`. The plan names the whole mechanism at `plan.md:635-660`: `seedUser`, then `handleOAuthUserInfo` with `{ context: await auth.$context }`, a fabricated `google` account and a `userInfo` carrying the seeded email with `emailVerified: true`, asserting `{ error: 'account not linked', data: null }`. Fix B is written in as an instruction, not a hope: if the context does not satisfy the call, drop the case and row 3.11, do not mock the adapter, and correct the credential dependency table. The underscore transform and the library-versus-route trade-off are both recorded. |
| F3 | yes | `91fcbce` commits the designer's paragraph unmodified (`design-delta.md:115-118`). `2fe573c` splits the failure in "Busy states" by what `request()` threw (`plan.md:405`), deletes design question 1 and replaces that section with "None open" (`plan.md:810-822`), and adds rows 2.15, 3.16 and 4.13 beside the existing network-blocked rows rather than replacing them. |
| F4 | yes | The `trustedOrigins` risk row now opens "**Unverified from here.**" and says why: `APP_ORIGINS` is a Cloudflare secret and `wrangler secret list` shows names only (`plan.md:783`). The G05 live gate gains the check ahead of consent: on the deployed origin, confirm the social call answers 200 with an `accounts.google.com` url and not 403 with `INVALID_CALLBACK_URL` (`plan.md:752-756`). |
| F5 | yes | The credential paragraph is rewritten to the half-provisioned state and names the Boolean AND that makes it safe (`plan.md:185-220`); `69f326d` carries the same into `plan-brief.md`. The binding is decided rather than deferred: `wrangler secret put` for the client id, with the `vitest.integration.config.ts` `configPath` argument, the mechanical diff guard and the matched-pair rotation argument all stated, and the public-id counter-argument stated honestly against them. |
| F6 | yes | `GOOGLE_CONNECTION_FAILURE` is introduced in `googleErrors.ts`, the plan states the module does not import `CONNECTION_FAILURE` (`plan.md:547`), and both sentences are quoted side by side in a two-row table at the point of the edit (`plan.md:412-419`). Progress row 3.16 pins both in full. |
| F7 | yes | The plan records that the library writes the key even though the client never reads it, that the replace drops the whole query rather than the `error` key, and that it runs on mount whenever either key is present, including for unrecognised codes and for an `error_description` arriving alone (`plan.md:357-363`). Row 2.13's title already covers the query rather than one key, and titles are immutable once reviewed. |
| F8 | yes, as a stated choice | The Overview records that the accepted S-06 specification is deliberately not edited, that the archive carries it as accepted, and that `design-delta.md` is the standing amendment for sections 4.1, 9 and 11 (`plan.md:17-23`). |
| F9 | yes | "The configuration endpoint" states the body is exactly `{ "google": boolean }` and nothing else, and that the route is deliberately unauthenticated and unthrottled because it is read before a session exists and sits outside the `/api/auth/*` catch-all the library's limiter covers, with nil exposure (`plan.md:264-273`). |
| F10 | yes | `91fcbce` adds the designer's own sentence under the outcomes table: the three state codes share one sentence deliberately, and the interface does not accuse (`design-delta.md:108-110`). No code or copy change, which is what the finding asked for. |

### The installed package, re-read

Three claims the plan depends on were checked against `node_modules`, not memory.

- `onAPIError.errorURL` exists as an option and is documented as the redirect target on error, with
  the default the plan overrides (`@better-auth/core/dist/types/init-options.d.mts:1430-1450`), and
  `callback.mjs:37` reads exactly `c.context.options.onAPIError?.errorURL || ${baseURL}/error`.
- `handleOAuthUserInfo` is exported from the `better-auth/oauth2` entry point
  (`dist/oauth2/index.mjs:5`) and its signature is `(c, opts)`
  (`dist/oauth2/link-account.mjs:12`), where the plan's `{ context: await auth.$context }` is the
  `c`. The refusal branch reads only `c.context.internalAdapter`, `c.context.options`,
  `c.context.trustedProviders` and `c.context.logger`, which is what makes the narrowed blind spot
  credible.
- The refusal's return shape is `{ error: "account not linked", data: null }`
  (`link-account.mjs:79-85`), matching the plan's assertion exactly, and the branch is entered when
  `accountLinking?.disableImplicitLinking === true`, which is the option the plan sets.

### Progress coverage against the delta

Every delta requirement carries a row. The button present and absent: 2.7, 2.14, 4.3, 4.4. Busy
states: 2.10, 4.8. The five sentences the delta introduces, the four outcomes plus the Google
connection sentence: 2.12, 3.2, 3.16, 4.9, 4.13. The URL cleanup dropping both `error` and
`error_description`: 2.13, with 2.5 guarding the client never reading the second key. The
configuration endpoint's exact `{ google: boolean }` shape: 1.5. `disableImplicitLinking` with no
trusted provider: 1.10. `onAPIError`: 1.12, with 3.10 asserting where a state failure lands.
Secretless continuous integration: 1.3, 3.4 and 3.14. `tests/integration/auth.test.ts` unchanged:
3.5, plus the standing stability guard. Rows 1.12 and 3.16 sit after the manual rows in their phase
numbering because titles are immutable once a plan is reviewed and new rows append; that is the
convention working, not a defect.

### The `GOOGLE_CLIENT_ID` binding, checked for consistency

Consistent across all three. `plan.md:212-220` decides `wrangler secret put` and gives three reasons.
`plan-brief.md` carries the same decision in its decisions table and its risks. `D-012` records the
client id in full as public and leaves the binding "pending the implementation goal's choice of
`vars` vs `secret`", which this plan is that goal answering; the plan says explicitly it does not
edit D-012 and that the line is completed in place when G02 closes. No contradiction, and no
credential value appears in any of the three.

### Two things left open, neither blocking

- `design-delta.md:4` still names the specification at `context/changes/visual-redesign/`. It is one
  path in a file this task is not permitted to touch, and the Overview already records that
  pre-archive artifacts name the old path for the same file.
- `frame.md`'s framing table cites the login block at `design-spec.md:366-382`; in the archived file
  the sentence it quotes is at line 386, the spec having grown through S-06 design questions D9 to
  D11 after the frame was written. The section reference, 4.1, and the quoted sentence both still
  hold, so the evidence stands; only the line range drifted. Left as written rather than silently
  restated, since it is a historical framing artifact.

### Verdict

**SOUND.** All six required findings are closed at the commits they cite, and the closures are
substantive rather than acknowledgements: F1 changes the server options and both the plan and the
research, F2 names an executable mechanism and an honest fallback, F3 absorbs a design ruling into
three Progress rows. The four observations are resolved too, F8 as a stated choice rather than an
edit, which is the right call. Every library claim the resolutions rest on survives re-reading in the
installed package. The plan is approved to implement; `change.md` keeps `status: plan_reviewed`,
which the schema's own sequence puts between `planned` and `implementing`.
