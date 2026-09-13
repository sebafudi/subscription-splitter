<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Google sign-in alongside the existing password login

- **Plan**: `context/archive/google-sign-in/plan.md`
- **Scope**: Phases 1 to 4 of 4 (Progress shows 56 of 56 boxes checked)
- **Commits reviewed**: `cf3e3de`, `e6b3dab`, `43f41f2`, `a1f9977`, `7a3a3ce`, `461b950`,
  `f66a431`, `ec7b3b0`, `9ce597a`, `4d3fc77`, against the pre-change baseline `c842f64`
- **Repository state**: reviewed at `4d3fc77` in the primary checkout. The reviewer wrote no part of
  the brief, the research, the delta, the plan or any implementation commit, and read the code
  before reading the checkpoints.
- **Verdict**: APPROVED (with two required corrections, both to the record rather than to code)
- **Findings**: 0 critical, 2 warnings, 6 observations

Date and effort fields the report schema lists are omitted, matching this repository's convention of
recording progress by change ID and commit.

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Verification performed

Every gate was re-run in this checkout rather than accepted from the record, once with `.dev.vars`
moved aside and once with it restored, in that order, with the file put back by a shell trap.

| Gate | Run A, secretless | Run B, `.dev.vars` restored | Recorded in `google-sign-in-gates.txt` |
|---|---|---|---|
| `npm run typecheck` | clean, three projects | clean, three projects | clean, three projects |
| `npm run test:unit` | 18 files / 214 cases | 18 files / 214 cases | 18 files / 214 cases |
| `npm run test:integration` | 12 files / 119 cases | 12 files / 119 cases | 12 files / 119 cases |
| `npm run build` | succeeds | succeeds | succeeds |

Run A confirmed no `GOOGLE_CLIENT` name in the process environment before it started. Run B printed
"Using secrets defined in .dev.vars" twelve times, so the pool really did bind the local pair, and
the same 119 cases still passed. That is the regression the plan says matters most, reproduced
independently.

### Stability guards, read against `c842f64`

| Guard | Reading |
|---|---|
| Password sign-in unchanged | `git diff --stat c842f64..HEAD -- tests/integration/auth.test.ts` is empty, and the file passes in both runs |
| Accounting untouched | `git diff --stat c842f64..HEAD -- src/domain migrations` is empty |
| Server surface grows by one read only | the only added registration under `src/server/routes/` is `app.get('/api/auth-config', ...)`; no line was removed |
| No secret in the tree | `git log -S<secret> --all` returns no commit and `git grep -lF <secret> HEAD` no file, so the client secret is absent from every tracked file and from the whole history. The client id appears in exactly one tracked file, `context/decisions/D-012-google-oauth-provisioning.md`, where D-012 records it deliberately as public. See finding F2 |
| The client id never reaches the bundle | `grep -rn "GOOGLE_CLIENT" src/client/` no match; the id does not appear in `dist/client/`; the endpoint returns a boolean |
| Scopes stay minimal | `grep -n "scope:" src/server/auth.ts` no match, and the provider block sets no `scope`. See observation O5 |
| No new dependency | `git diff --stat c842f64..HEAD -- package.json package-lock.json` is empty |
| Suite green without secrets | run A above, all four commands exit 0 |

`wrangler.jsonc` and `.github/` are byte-identical to `c842f64`, so continuous integration is
unchanged and still holds no secret. The fourteen changed files under `src`, `tests`, `env.d.ts` and
`.dev.vars.example` are exactly the fourteen the plan names, with nothing extra.

### The specific probes this review was asked to run

**The provider is configured only on a complete pair.** `src/server/auth.ts:28-38` builds the
provider behind `env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET` and spreads it in only when it
exists, so a half-configured deployment gets no `socialProviders` key at all rather than an empty
object. Four unit cases pin all four combinations.

**Nothing about Google leaks when absent.** `/api/auth-config` returns `c.json({ google: ... })` and
nothing else; the integration case asserts `toEqual({ google: false })`, which is exact rather than
a subset. The social call answers 404 with `{"message":"Provider not found","code":"PROVIDER_NOT_FOUND"}`,
which names no provider. The button is absent from the DOM rather than hidden, guarded by
`{googleEnabled && ...}` in `src/client/screens/Login.tsx:170`, and capture
`google-sign-in-accept-08-button-absent-light.png` shows the shipped screen with nothing marking the
absence.

**`disableImplicitLinking` and `onAPIError.errorURL` are unconditional.** Both sit in the object
literal outside the conditional spread, and two unit cases assert each in the configured and the
unconfigured case. `trustedProviders` is absent, asserted by an `in` check rather than by a value
comparison, so adding it as `[]` would still fail.

**No new scopes.** No `scope` option is set. The integration case asserts the authorize url's scope
is exactly `email`, `openid`, `profile` after a sort, so a fourth scope fails the case.

**`trustedOrigins` and CORS unchanged.** The only lines the diff touches in `src/server/auth.ts` are
the provider block, the `account` block and the `onAPIError` block. `APP_ORIGINS` handling, the
cookie attributes, the rate limit rules and the compatibility date are untouched.

**The callback path matches D-012.** The library derives `redirect_uri` as
`${baseURL}/api/auth/callback/google` where `baseURL` is the request origin. The integration case
pins `http://example.com/api/auth/callback/google` and the phase 2 browser pass recorded
`http://localhost:5173/api/auth/callback/google`. D-012 registers exactly that path on all three
origins.

**`error_description` is never rendered and both query keys go.** `grep -rn "error_description"
src/client/` returns nothing. `loginUrlWithoutQuery` clears the whole `search` rather than one key,
and its unit cases pin a description with no code beside it and a description-only return.

**The tones and the focus.** `access_denied` renders inside a permanent `div role="status"` as
`p.login-status` in `--ink-soft` with no red rule; the other three render inside the shipped
`FormAlert`, whose wrapper hardcodes `role="alert"`. Both message elements carry `tabIndex={-1}` and
an effect on the notice object moves focus to whichever one is showing. Because the effect keys on
the notice object rather than on its text, a repeated identical failure still moves focus.

**The busy state disables all controls.** Both fields take the `disabled` attribute from `busy`;
both buttons take `aria-disabled` from `busy` and stay focusable, which is this repository's shipped
convention, with the real stop being the `if (busy) return` guard at the top of both handlers. The
Google button alone takes `aria-busy`, the form takes it too, and neither label changes.

**The mark.** `GoogleMark.tsx` is the standard four-colour "G" at an 18px square with the four
official hex values and no wrapper, background or `currentColor`. It carries `aria-hidden="true"`
and `focusable="false"`, so the button's accessible name is the label alone.

**The reserved border, measured independently.** I rendered the shipped `dist/client` stylesheet in
headless Chrome with a primary, quiet, destructive and link button in one flex row, once as built
and once with `.btn-primary { border: 0 }` restored. The primary goes from 66.44px to 68.44px wide,
its height stays 40.00px in both, and the three neighbours shift right by exactly 2.00px with no
change to their own width or height. With the primary `aria-disabled`, its width is 68.44px, the
same as at rest, so the reflow the phase 2 pass recorded is gone. That is the 2px primary width the
checkpoint declares and nothing beyond it. No other variant's box changed.

**Trying to break the client mapping.** I exercised `googleReturnNotice` with `__proto__`,
`constructor`, `toString`, `hasOwnProperty`, `ACCESS_DENIED`, `access_denied` with leading and with
trailing whitespace, `<img src=x onerror=alert(1)>`, `state_mismatch&x=1`, a 5000-character value,
and a non-string object and array. Every one returned the did-not-finish sentence as an alert. The
raw code is never rendered, only the mapped constant, so there is no injection path and
`STATE_CODES.includes` gives no prototype reachability.

**The new integration cases are real.** `tests/integration/google-auth.test.ts` runs in the Workers
pool against the real D1. The state-persistence case reads the `verification` table directly with
`env.DB.prepare` and asserts exactly one row for the `state` it just received. The
`account_not_linked` case seeds a password account through the shipped `seedUser`, builds the real
`auth.$context` from the same `createAuth` the Worker uses, and calls the library's own
`handleOAuthUserInfo`. Nothing in the file mocks the adapter, stubs the context or fakes Google, and
the file's own comments state the boundary it stops at.

**Credential hygiene.** I compared the client id D-012 records with the one in `.dev.vars` by
`shasum` of each value; the first twelve hex characters are identical, so they are the same id, and
neither value was printed. The client secret appears in no tracked file and in no commit.

## Findings

### F1 — Fourteen phase 2 Progress rows are ticked with no commit

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `context/archive/google-sign-in/plan.md:851-868`
- **Detail**: The Progress convention the plan states at line 824 is that a row appends the commit sha
  after its title when the step lands. Every row in phases 1, 3 and 4 complies. In phase 2, only row 2.2 carries a commit;
  rows 2.1, 2.3, 2.4, 2.5, 2.6 and the nine manual rows 2.7 to 2.15 are ticked with nothing after
  the title. An auditor reading the plan alone cannot map fourteen of the change's fifty-six rows
  to the work that satisfied them, which is the whole point of the convention. The evidence exists,
  in `cf3e3de` for the code rows and in `751d4df` and `evidence/runs/google-sign-in-manual-rows.md`
  for the browser rows, so this is a record gap rather than an unproven claim.
- **Fix**: Append `cf3e3de` to rows 2.1 and 2.3 to 2.6, and `751d4df` to rows 2.7 to 2.15, in the
  separator the convention uses.
  - Strength: Restores the one property that lets a later reader audit the plan without reading nine
    commits, and the commits are already known.
  - Tradeoff: None; it is a fourteen-line edit to a file this review is not permitted to touch.
  - Confidence: HIGH — the two commits were read and each carries the matching content.
  - Blind spot: None significant.
- **Decision**: PENDING

### F2 — The "no secret in the tree" guard reads wider than what was checked

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `evidence/runs/google-sign-in-gates.txt:451-452`, and the same row in
  `evidence/runs/google-sign-in-manual-rows.md`
- **Detail**: The recorded command is `git diff -- . | grep -E "GOOGLE_CLIENT_(ID|SECRET)=.+"`, which
  finds only assignment-shaped text and was run against the phase's own working diff. The conclusion
  written beside it is "no value anywhere". The client id value does appear in the change range, in
  prose in `context/decisions/D-012-google-oauth-provisioning.md`, landed at `24003e5`. That is
  deliberate and harmless: D-012 says in the same sentence that the id is public and safe to record,
  and I confirmed independently that the client secret appears in no tracked file and in no commit on
  any branch. The problem is only that the guard's stated conclusion is broader than its command
  proves, in a change whose own honesty rule is that no artifact may claim more than it verified.
- **Fix**: Reword the conclusion to say the diff carries no credential value except the client id
  that D-012 records as public, and name the separate `git log -S` check that clears the secret.
  - Strength: Keeps the guard mechanical while making its scope match its claim; the stronger check
    on the secret is the one a reader actually wants and it passes.
  - Tradeoff: Two lines in an evidence file that otherwise records exactly what it ran.
  - Confidence: HIGH — `git log -S<secret> --all` returns no commit and `git grep -lF` no file.
  - Blind spot: I did not scan packfiles for unreferenced objects, only reachable history.
- **Decision**: PENDING

### O1 — `npm run build` writes the local credentials into `dist/`

- **Severity**: 💡 OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `dist/subscription_splitter/.dev.vars`
- **Detail**: The Cloudflare Vite plugin copies `.dev.vars` into the Worker output directory. That
  file now carries `GOOGLE_CLIENT_SECRET` beside the `BETTER_AUTH_SECRET`, `SEED_TOKEN` and the two
  seed passwords it already held. `dist/` is git-ignored, the client bundle is clean of every one of
  these values, and this behaviour predates the change, so nothing here is a regression and no
  guard in the plan is violated. It is recorded because the change is what first puts an OAuth
  client secret into that copy, and because a build artifact shipped or archived by hand would carry
  it.
- **Fix**: None required for this change. If it matters later, a `.dev.vars`-free build directory is
  a build-configuration question for its own change.
- **Decision**: PENDING

### O2 — `.login-submit` is now a class with no rule behind it

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `src/client/screens/Login.tsx:163`, `src/client/index.css`
- **Detail**: The two `.login-submit` rules, the `align-self` at rest and the stretch below 640px,
  were both replaced by `.login-actions`. The class is still on the submit button and now matches no
  selector anywhere in the stylesheet. Harmless, and the phase 2 and phase 4 manual rows both use it
  as a selector when they identify the button, which is a reason to keep it rather than an accident.
- **Fix**: Either drop the class from the button, or keep it and say in the evidence that it is a
  test handle rather than a style hook.
- **Decision**: PENDING

### O3 — The 3.3 amendment names every variant; one variant was changed

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `src/client/index.css:194`, `src/client/index.css:248-252`
- **Detail**: The amendment reads "Every button variant reserves a 1px border in every state".
  `.btn-primary` was given `1px solid transparent`; the base `button` rule and `.btn-link` still
  carry `border: 0`. The phase 3 and 4 checkpoint reasons this out: quiet and destructive already
  carry a border in all four states, and the link variant has no border in any state, so neither can
  reflow. The rule as written is therefore not literally satisfied, but its purpose is. Recorded so
  that a later reader comparing the delta to the stylesheet does not think something was missed.
- **Fix**: Leave the stylesheet alone and let the delta's sentence stand as the intent it is.
- **Decision**: PENDING

### O4 — The boot `Promise.all` has no rejection handler

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `src/client/App.tsx:19`
- **Detail**: `getAuthConfig` swallows every rejection and resolves to `{ google: false }`, which is
  what the delta requires. `getMe` returns null for a 401 but rethrows anything else, so a 500 or a
  dropped connection on `/api/me` leaves `user` at `'loading'` and the app on the 4.2 skeleton with
  no way out but a reload. That was equally true of the `getMe().then(setUser)` this replaced, so it
  is not a regression, and the second request cannot cause it. It is recorded because the boot
  effect was rewritten here and the rewrite was the natural moment to notice it.
- **Fix**: Out of scope for this change. A `.catch(() => setUser(null))` on the boot effect would
  paint the login screen instead of hanging, and belongs to whichever change owns the loading state.
- **Decision**: PENDING

### O5 — The plan's `scope` guard cannot pass as written

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `context/archive/google-sign-in/plan.md:239-252`, Progress row 1.6
- **Detail**: The guard is `grep -n "scope" src/server/auth.ts` returns nothing. It returns three
  lines: a pre-existing "module scope" in the file's opening comment and two words in the comments
  the change itself added. No `scope` option is set, which is the thing the guard exists to prove,
  and `grep -n "scope:"` does return nothing. The implementer disclosed the narrowing in
  `evidence/runs/google-sign-in-gates.txt:448-449` and again in the phase 1 checkpoint rather than
  quietly substituting the command, which is the right handling. Recorded only so the plan's guard
  table and Progress row 1.6 are not read literally by a later change.
- **Fix**: When the change is archived, correct the guard text to `grep -n "scope:"`.
- **Decision**: PENDING

### O6 — Phase 3's test files landed in the phase 1 commit

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: `43f41f2`
- **Detail**: The plan says each phase ends on its own commit. `43f41f2`, the phase 1 commit, also
  carries `tests/integration/google-auth.test.ts` and the `10.8.0.x` prefix in
  `tests/integration/accounts.ts`, both of which the plan assigns to phase 3. Likewise the phase 2
  unit test file landed at `e6b3dab` rather than in phase 3. Phase 1's own criterion still held,
  because nothing under `src/client`, `src/domain` or `migrations` moved in it, and rows 3.8 to 3.13
  and 3.2 and 3.16 each cite the earlier commit that satisfies them rather than claiming a phase 3
  commit that does not exist. The deviation is disclosed in both checkpoints. No phase 3 work is
  missing; I read the landed files against every row rather than trusting the citation.
- **Fix**: None. The disclosure is the right outcome and the rows are accurate.
- **Decision**: PENDING

## Notes on what this review did not cover

- **The live Google roundtrip.** Nothing here exercises Google's consent screen, its token exchange
  or a real identity, and nothing in the change claims to. That is goal G05 and it still depends on
  `GOOGLE_CLIENT_ID` reaching the deployed Worker followed by a deploy. I confirmed only that no
  artifact in this change claims public Google login works.
- **The deployed origin.** `APP_ORIGINS` on the deployed Worker, the trusted-origin validation of
  `callbackURL` and `errorCallbackURL` against the button's real origin, and whether all six
  migrations are applied to the remote D1 are all outside a local checkout. The plan names each of
  them as a live gate.
- **Thirteen of the sixteen acceptance captures.** I opened
  `google-sign-in-accept-01-login-idle-1280-light.png`,
  `google-sign-in-accept-02-login-idle-390-dark.png` and
  `google-sign-in-accept-08-button-absent-light.png` and checked each against the delta: one line
  with the primary first at 1280, stacked full width with `Sign in` first at 390, and the shipped
  screen with no button and nothing marking its absence. The remaining thirteen were not opened.
- **The browser pass itself.** I re-ran the command gates and measured the button geometry myself
  against the shipped stylesheet, but I did not re-drive the application in a browser. The
  accessibility, focus, keyboard, reduced-motion and contrast readings in
  `evidence/runs/google-sign-in-manual-rows.md` are the implementer's, checked for internal
  consistency and against the code and the captures, not reproduced.
- **Unreachable git objects.** The secret checks cover every tracked file and every commit reachable
  from any ref. Loose or unreferenced objects were not scanned.
- **Prose outside this change.** `context/checkpoints/g02-oauth-provision.md:103` carries an em dash.
  It sits inside the reviewed commit range but belongs to goal G02's provisioning record, not to this
  implementation. The change's own documents and every line of new code are free of them, and the new
  code carries block comments only, no inline ones.

## Resolution

Applied by the release task that carries goals G04 and G05, on the tree at `ed57890`. The two
required findings were record corrections and are both applied. The six observations were each
decided; one of them, O4, was re-checked against the code rather than accepted from the report.

| Finding | Severity | Decision | Where |
|---|---|---|---|
| F1 | WARNING | FIXED | `context/archive/google-sign-in/plan.md`, Progress phase 2 |
| F2 | WARNING | FIXED | `evidence/runs/google-sign-in-gates.txt`, Stability guards |
| O1 | OBSERVATION | ACKNOWLEDGED, no change | `dist/` is git-ignored and the behaviour predates the change |
| O2 | OBSERVATION | ACKNOWLEDGED, no change | `.login-submit` is kept as the test handle the manual rows select on |
| O3 | OBSERVATION | ACKNOWLEDGED, no change | the delta sentence stands as the intent the reviewer reads it as |
| O4 | OBSERVATION | NO FIX NEEDED, verified in the code | `src/client/api.ts:110-116` |
| O5 | OBSERVATION | DEFERRED to the archive step | the guard text becomes `grep -n "scope:"` when the change is archived |
| O6 | OBSERVATION | ACKNOWLEDGED, no change | the deviation is disclosed in both checkpoints and every row cites the commit that satisfies it |

### F1: fourteen phase 2 Progress rows carried no commit

Fixed exactly as the finding specifies. `cf3e3de` now follows rows 2.1, 2.3, 2.4, 2.5 and 2.6, and
`751d4df` follows the nine manual rows 2.7 to 2.15, in the ` — <sha>` separator the convention at
`plan.md:824` states. Row 2.2 already carried `e6b3dab` and was left alone. All fifty-six Progress
rows in the change now map to a commit.

### F2: the "no secret in the tree" guard read wider than what it checked

Fixed by narrowing the stated conclusion and adding the two commands that actually clear the secret.
The `git diff | grep -E "GOOGLE_CLIENT_(ID|SECRET)=.+"` line now says what it proves, that the diff
carries no assignment-shaped credential value, and says what it does not cover, prose. It names the
one credential value that does appear in the change range, the client id in
`context/decisions/D-012-google-oauth-provisioning.md`, and points at D-012 recording it as public.

Two wider checks were then run in this task and recorded beneath it, with the value read from
`.dev.vars` into a shell variable and never printed:

- `git log -S"$GOOGLE_CLIENT_SECRET" --all --oneline` returns no commit.
- `git grep -lF "$GOOGLE_CLIENT_SECRET" HEAD` returns no file.

The reviewer's blind spot stands unchanged: neither command scans loose or unreferenced objects.

### F-obs: O4, the boot `Promise.all` and the delta's failed-read rule

Re-read rather than accepted. The delta rule at `design-delta.md:92` is "if that read fails, treat
Google as not configured". The code already satisfies it, at the source rather than at the call
site, so no fix was made and no gate was re-run.

`getAuthConfig` at `src/client/api.ts:110-116` wraps its whole request in `try`/`catch` and returns
`{ google: false }` on every rejection. It therefore cannot reject, so the `Promise.all` at
`src/client/App.tsx:19` cannot reject through the configuration read, and a failing `/api/auth-config`
neither breaks nor delays the login screen. It resolves to not configured and the screen paints its
password-only action row, which is the delta's stated outcome.

The one path that does leave the app on the 4.2 skeleton is `getMe` rethrowing a non-401, which is
the session read's own failure handling. That behaviour is unchanged by this change and was left
exactly as it was, per the reviewer's own reading that it predates the rewrite and belongs to
whichever change owns the loading state. No unit test was added, because the function whose contract
is at issue is already covered and nothing in the boot effect changed.
