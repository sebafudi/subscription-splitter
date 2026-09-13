# Implementation plan: Google sign-in

## Overview

Add "Continue with Google" to the shipped login screen through the Better Auth integration that is
already mounted, keeping password sign-in for the seeded demo and reviewer accounts exactly as it is.
`context/changes/google-sign-in/design-delta.md` is the design authority for everything the login
screen shows, and it rules on decision D-013. `context/changes/google-sign-in/research.md` is the
authority for what the installed `better-auth@1.7.4` does. This plan turns both into four phases an
implementer can land one at a time.

This is roadmap item S-07. It changes `src/server/auth.ts`, `src/server/routes/auth.ts`, `env.d.ts`,
`.dev.vars.example`, four files under `src/client/`, two test files and one new client module. It
adds no migration, changes no accounting rule, no route other than one unauthenticated read, no
ownership check and no stored subscription value.

The accepted S-06 specification, now at `context/archive/visual-redesign/design-spec.md`, is
deliberately not edited. It keeps its original wording, the archive carries it as it was accepted, and
`design-delta.md` is the standing amendment for sections 4.1, 9 and 11, so the amendment lives in one
file that a reader of either can follow rather than in two files that can drift apart. Artifacts
written before S-06 was archived still name the specification under `context/changes/`; the file is the
same one.

The change is small in code and concentrated in risk. Research says it plainly: the schema was
already written from the library's own table definitions, the handler is a catch-all so the callback
route is already mounted, and `createAuth` is already built per request so a conditional provider
needs no new pattern. What deserves the attention is the linking rule, which produces the right
behaviour today for a reason nobody chose, and the configuration read, without which the affordance
cannot be absent and continuous integration has no secrets to give it.

## Current state analysis

`src/server/auth.ts` configures exactly one authentication method. `emailAndPassword` is enabled with
`disableSignUp` defaulting to true, `trustedOrigins` is parsed from `APP_ORIGINS` and the factory
throws when it resolves to nothing, the session cookie carries `sameSite: 'lax'` and `httpOnly`, and
rate limiting is database backed with a global window of sixty seconds and a maximum of ten. There is
no `socialProviders` block and no `account` block.

`src/server/routes/auth.ts` mounts the library handler at `/api/auth/*` for `GET` and `POST` and adds
`/api/me`, which answers 401 when signed out. `src/server/index.ts` adds `/api/health`, which returns
`{ ok: true }` and nothing else. Those are the only two unauthenticated surfaces, and neither can
carry configuration, which is why this change adds a third.

`env.d.ts` declares `Cloudflare.Env` by hand with six names and no optional members.
`.dev.vars.example` lists ten names with blank values and two explanatory paragraphs.

`src/client/App.tsx` boots by calling `getMe()` once in an effect and holds the result as
`SessionUser | null | 'loading'`. While it is `'loading'` it renders the session loading screen of
design-spec 4.2: the wordmark app bar, one static skeleton bar and an `sr-only` status line. When it
is `null` it renders `Login`. Nothing else runs during that phase, which is exactly the slot the
design delta assigns to the configuration read.

`src/client/screens/Login.tsx` renders one `form` holding a `FormAlert`, two `Field` inputs and one
`button.btn-primary.login-submit`. It tracks failures as `{ message, attempt }` so a repeated refusal
still moves focus to the email field, and the submit button stays focusable while announcing
`aria-busy` and `aria-disabled` rather than becoming disabled. The block takes `panel-invalid` while a
failure is showing.

`src/client/api.ts` has one `request()` helper that sets `credentials: 'include'`, throws
`SignedOutError` on 401 and `ApiError` otherwise, and a `signIn` that posts to
`/api/auth/sign-in/email` directly so throttling, origin checking and CSRF apply by construction. The
same helper can call `/api/auth/sign-in/social` unchanged, which is why this change adds no dependency
and no Better Auth client SDK.

`src/client/index.css` already carries `.btn-quiet` in every state design-spec 3.3 names, the focus
ring of 2.4, and the spacing scale. The quiet variant the delta asks for exists; what does not exist
is the action row that holds two buttons and the sizing for an 18px inline mark inside one.

`src/server/auth.test.ts` is a pure options test with no bindings: it asserts `createAuth` fails
closed on a missing secret and on an `APP_ORIGINS` that resolves to no origin. Adding provider
assertions to it needs no new harness.

`tests/integration/auth.test.ts` covers sign-in success, `/api/me` agreement with `get-session`, 401
without a cookie, a wrong password, sign-out invalidation, a forced expiry, the sign-up refusal, the
cross-origin refusal and the per-address throttle. It takes the `10.0.0.x` client-address prefix from
`tests/integration/accounts.ts`, whose comment allocates one prefix per file because the limiter is
database backed and the test database is never reset between files.

`vitest.integration.config.ts` binds five test-only values and deliberately carries no secret.
`.github/workflows/ci.yml` runs typecheck, the unit suite, the integration suite and the build, with
no repository secret of any kind.

### Key findings

- **No migration.** `migrations/0001_auth.sql:29-45` already carries every column the account model
  declares, plus the `userId` index, and `:47-54` carries `verification`, where the library persists
  the OAuth `state` and the PKCE `codeVerifier`. This is the finding most likely to be assumed the
  other way, so it is stated first: do not write a seventh migration for this change.
- **The callback path is derived, not configured.** `baseURL` is the request's own origin, and the
  library builds a provider callback as `${baseURL}/callback/${providerId}`, so the redirect URI is
  `<origin>/api/auth/callback/google` at every origin the app is reached on. Every such origin must be
  registered with the OAuth client at Google, or the callback is refused by Google rather than here.
- **The linking rule must be written down.** `accountLinking.enabled` defaults to true and
  `disableImplicitLinking` to false. A same-email Google sign-in is refused today only because seeded
  accounts keep `emailVerified = 0` and `requireLocalEmailVerified` defaults to true. Decision D-013,
  now accepted and ruled on by the designer, makes the refusal configuration instead of an accident.
- **The affordance needs an unauthenticated read.** `/api/me` answers 401 signed out and `/api/health`
  carries nothing, so the login screen has nowhere to learn whether Google is configured. Asking
  `/api/auth/sign-in/social` and reading its 404 would only tell the user after they click.
- **Registering the provider unconditionally is not an option.** The Google provider throws
  `CLIENT_ID_AND_SECRET_REQUIRED` when either value is absent, so empty strings would turn every click
  into a server error rather than into an absent button.
- **Errors on the redirect leg arrive as a browser redirect, not as JSON, and two settings are needed
  to catch them all.** `errorCallbackURL` is stored inside the OAuth state and recovered from it
  (`node_modules/better-auth/dist/oauth2/state.mjs:27` and `parseState` at `:46-63`), so it governs
  every failure that happens once the state has parsed: a denied consent, a failed exchange, a
  refused link. It cannot govern a failure of the state itself. A callback carrying no `state` at all
  redirects with `error=state_not_found` (`callback.mjs:74-77`), and under the database state
  strategy this app runs, a fabricated, replayed or expired state finds no verification row and
  throws `state_mismatch` with no stored URL to recover
  (`node_modules/better-auth/dist/state.mjs:119-123`). All of those fall back to `defaultErrorURL`,
  which is `onAPIError?.errorURL` or `${baseURL}/error` (`callback.mjs:37`), and in this app that
  resolves to `/api/auth/error`, the library-rendered page with none of this app's styling. So the
  client sends `errorCallbackURL` on every call **and** the server sets `onAPIError: { errorURL: '/' }`
  unconditionally. Neither alone covers every outcome the delta specifies. A root-relative value is
  supported: the library's URL helper appends the query to a `/` path without resolving it against an
  origin (`@better-auth/core/dist/utils/url.mjs:40-49`), so one value is correct on all three origins.
- **The test boundary is real.** Everything up to Google's authorization endpoint is testable in the
  Workers pool. Google's consent screen and token exchange are not. No mock may be reported as having
  proved the roundtrip.

## Desired end state

A deployment that carries `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` shows a second button in the
login screen's action row: the quiet variant, Google's unmodified four-colour mark at 18px, the label
"Continue with Google", beside the primary at 640px and above and stacked under it below that. Pressing
it disables the form, marks it busy and sends the browser to Google. A first Google identity comes back
signed in to a brand new account with an empty ledger. A Google identity whose email matches an existing
password account comes back refused, with one sentence that confirms nothing about whether such an
account exists. A cancelled consent comes back as a status line rather than an alert. A stale link and
any other failure each come back as their own sentence. Every one of them lands on the login screen,
moves focus to the message and leaves a clean URL behind.

A deployment that carries neither value shows exactly today's login screen, with nothing marking the
absence, and its server registers no Google provider at all. That is the state `npm test` and the
continuous integration job run in, and both stay green with no secret anywhere.

The password path is unchanged and provably so: the whole of `tests/integration/auth.test.ts` passes
untouched, with Google configured and without it.

## What we are NOT doing

- **No manual account linking.** Joining a Google identity to an account that already exists stays out
  of scope, per the designer's ruling on D-013. The library's `linkSocial()` remains available for a
  later change that brings a settings screen with it.
- **No second provider.** Nothing here generalises to GitHub, Apple or any other social provider, and
  no abstraction is built in anticipation of one.
- **No Gmail, Drive or `cloud-platform` scope.** The provider's defaults are exactly `openid`, `email`
  and `profile`, which is the minimal identity set D-012 fixes, so no `scope` option is set at all.
- **No migration and no schema change.** See the first key finding.
- **No change to the accounting, the ownership checks, the domain or any other route.** A new Google
  account owns nothing because the shipped ownership model already produces that for any new account.
  Nothing under `src/domain/` changes, and `src/server/` changes only in the two files named above.
- **No Better Auth client SDK and no new dependency of any kind.** The existing `request()` helper
  reaches `/api/auth/sign-in/social` unchanged.
- **No change to the session cookie attributes, `trustedOrigins`, the rate limit rules or the
  compatibility date.** Research checked each against the redirect leg and none needs to move.
- **No email verification feature.** D-013 deliberately removes the dependence on `emailVerified`
  rather than building on it.
- **No deployment, no `wrangler secret put`, no certification screenshot refresh and no live Google
  roundtrip.** Those belong to goal G05, after this plan's phase 4. This plan names the live roundtrip
  as a gate that depends on credentials which do not yet exist; it does not carry it as a Progress row.
- **No edits to `context/STATUS.md`, `evidence/index.md` or the workspace goals file.** The status step
  owns those.

## Implementation approach

Server first, then client, then tests, then a verification pass. Server first because the client has
nothing to read until the configuration endpoint exists, and because the provider block and the linking
rule are the part of the change that carries the risk. Client second because the delta describes the
login screen in terms of a configuration value the client cannot invent. Tests third as their own phase
because the integration cases need both halves present and because the one genuinely open
implementation choice, how a provider-configured case gets its bindings, is settled there. The
verification pass last because appearance is not something the suite can fail on.

One adjustment to that grouping, made deliberately and named here. The two pure-options assertions in
`src/server/auth.test.ts` land in phase 1 rather than phase 3. They need no bindings, they are the
executable statement of decision D-013, and leaving the accepted linking rule unasserted across two
phases would be the one place in this change where a silent regression could hide. Every case that
needs a running Worker stays in phase 3.

Each phase ends on its own commit. Phases 1 and 3 are gated by commands. Phases 2 and 4 are gated by a
browser, because no test in this repository reads client markup and a green suite proves nothing about
a button.

### The credential dependency, stated plainly

The credential state moved while this plan was being written, so it is recorded here as it now stands
rather than as D-012 left it. `context/checkpoints/g02-oauth-provision.md`, under "Browser provisioning
completed", records that the consent screen, the audience, the scopes and the Web application client
were all created in project `subscription-splitter-auth`, that all three origins and their
`/api/auth/callback/google` redirects were registered, and that `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET` now exist in the local `.dev.vars`, which `git check-ignore` confirms is
excluded. The audience stays External in Testing with the authorized account on the test-user list.
D-012's own "not yet created" line is superseded by that checkpoint and should be completed in place
when G02 closes; this plan does not edit D-012.

The remote half is now half done, and the half matters less than it looks. The same checkpoint, under
"Cloudflare secret", records that `GOOGLE_CLIENT_SECRET` was piped from the ignored `.dev.vars` into
`wrangler secret put` in an authorized environment and appears in `wrangler secret list` beside
`APP_ORIGINS` and `BETTER_AUTH_SECRET`, and that `GOOGLE_CLIENT_ID` was deliberately left unset
pending this plan's choice of binding. So the deployed Worker holds one value of the pair.

That half-state is safe by construction rather than by luck, which is worth stating rather than
leaving to inference. `/api/auth-config` computes `Boolean(c.env.GOOGLE_CLIENT_ID &&
c.env.GOOGLE_CLIENT_SECRET)` and the provider block is conditional on the same Boolean AND, so a
deployment holding one value is indistinguishable from one holding neither: no provider, no button,
no click to answer, no partial state for anyone to reason about. Until the client id lands, the
deployed app is exactly today's product, which is also the state continuous integration runs in.

**The client id's binding, decided here.** It goes through `wrangler secret put`, like the secret, and
not into a `vars` block in `wrangler.jsonc`. The id is public and D-012 records it in full, so a var
would leak nothing, and that is the honest argument on the other side. Three reasons decide it the
other way. `vitest.integration.config.ts` loads `wrangler.jsonc` through `configPath`, so a var would
bind the id into every integration run and make the provider-absent cases depend on the absence of the
secret alone rather than on the absence of both. The stability guard that no `GOOGLE_CLIENT_ID` value
appears in the diff stays mechanical, so nobody has to judge which credential values are harmless.
And a matched pair set by one mechanism is one fewer thing to get wrong when either is rotated. The
step itself is `wrangler secret put GOOGLE_CLIENT_ID` followed by a deploy, and it belongs to G05, not
to this plan.

How this plan stands against that:

| Work | Executable now |
| --- | --- |
| Phase 1, every server change and its unit assertions | yes, in full |
| Phase 2, every client change, in both the configured and the not-configured state | yes, in full, using the local `.dev.vars` pair |
| Phase 3, every case | yes: provider-present bindings are fabricated literals inside the test file and are never the real credentials |
| Phase 4, the whole local browser pass | yes, in full |
| The live Google roundtrip on the deployed origin | **no.** It needs `wrangler secret put GOOGLE_CLIENT_ID` with authorized Cloudflare credentials, then a deploy. The secret is already set |

So every Progress row in this plan is executable today, with no step waiting on anything outside the
repository and the local `.dev.vars`. The live roundtrip is goal G05, is named below as a manual gate
outside this plan's Progress, and is the only thing in the change that local work cannot produce. Two
rules survive the provisioning: no credential value reaches a repository file, a status file, a
screenshot or a log, and no artifact may claim that public Google login works while the audience stays
in Testing.

### Stability guards

These hold at the end of every phase, not only at the end.

| Guard | Check |
| --- | --- |
| Password sign-in unchanged | `git diff --stat` shows no change to `tests/integration/auth.test.ts` for the whole change, and that file passes in every run |
| Accounting untouched | `git diff --stat src/domain/ migrations/` is empty for the whole change |
| Server surface grows by one read only | the only route added anywhere is `GET /api/auth-config`; `git diff src/server/routes/` shows no other new registration |
| No secret in the tree | `git diff` contains no value for `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET`; `.dev.vars.example` carries the two names with empty values and nothing else |
| The client id never reaches the bundle | `grep -rn "GOOGLE_CLIENT" src/client/` returns nothing, and the configuration endpoint returns a boolean rather than the id |
| Scopes stay minimal | `grep -n "scope" src/server/auth.ts` returns nothing; the provider's three defaults are used as they are |
| No new dependency | `git diff package.json package-lock.json` is empty for the whole change |
| Suite green without secrets | `npm test` and `npm run typecheck` pass with no Google value set anywhere in the environment |

## Critical implementation details

### The configuration endpoint

`GET /api/auth-config` returns `{ "google": boolean }` and nothing else. It is registered in
`src/server/routes/auth.ts` beside `/api/me`. It does not match the `/api/auth/*` catch-all, which
requires the trailing slash, so ordering is not load bearing. It is computed from the presence of both
environment values inside the handler, which is the only place Workers bindings exist:

```
Boolean(c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET)
```

The response body is exactly `{ "google": true }` or `{ "google": false }`: one key, one boolean, no
client id, no provider list, no message, and the same shape either way. The route takes no session and
no origin check, deliberately: it is read before there is a session to have.

It is also deliberately unthrottled. It sits beside `/api/me` rather than under the `/api/auth/*`
catch-all, so the library's database-backed limiter does not cover it, and this is the first
unauthenticated unthrottled read in the application. The exposure is nil: the boolean reveals nothing
that the rendered login screen does not already reveal, since the button is present in exactly the
deployments where the answer is true.

### The provider block

In `src/server/auth.ts`, built inside the existing factory from the same `env` it already reads:

- Both values present: `socialProviders: { google: { clientId, clientSecret, includeGrantedScopes: false } }`.
- Either absent: no `socialProviders` key at all. Not an empty object, not empty strings, because the
  provider throws `CLIENT_ID_AND_SECRET_REQUIRED` on an empty value.
- `includeGrantedScopes: false` because the provider sends it as true by default and the option's own
  documentation says each flow should request only its own scopes. No `scope` option is set; the
  provider's defaults are already `openid`, `email` and `profile`.
- `account: { accountLinking: { disableImplicitLinking: true } }`, set unconditionally rather than
  inside the provider branch, so the rule does not depend on whether a deployment happens to carry
  credentials. `google` is deliberately absent from `trustedProviders`, which stays unset.
- `onAPIError: { errorURL: '/' }`, also unconditional and in the same edit as the `account` block. It
  is the fallback the callback takes whenever the per-flow `errorCallbackURL` cannot be recovered,
  which is every state failure. With it, a callback whose state is missing, unparseable or unknown
  redirects to `/?error=state_not_found` or `/?error=state_mismatch` on the app's own origin, which is
  the login screen and the delta's expired-link sentence. Without it, those three land on
  `/api/auth/error`, a page this change never styles, and the delta's sentence for them is
  unreachable. The value is root-relative on purpose so that it is correct on all three origins, and
  the library supports that form.

### The environment names

`env.d.ts` gains `GOOGLE_CLIENT_ID?: string` and `GOOGLE_CLIENT_SECRET?: string`, optional rather than
required. Declaring them required would make `npm run typecheck` describe an environment continuous
integration does not have and would invite code that assumes they are present. `.dev.vars.example`
gains both names with empty values and one sentence saying the deployment carries them as Worker
secrets and that their absence is a supported state in which no Google button is rendered.

Both go to the deployed Worker through `wrangler secret put`, including the client id. The id is public
and D-012 says so, but there is no reason to reach for a second mechanism for it, and one mechanism is
one fewer thing to get wrong. That is a G05 step, not a step in this plan.

### The two client calls

Added to `src/client/api.ts`, both over the existing `request()` helper:

```
getAuthConfig(): Promise<{ google: boolean }>      // GET  /api/auth-config
startGoogleSignIn(): Promise<{ url: string }>      // POST /api/auth/sign-in/social
```

The social call sends `provider: 'google'`, `callbackURL` and `errorCallbackURL`, both set to
`window.location.origin + '/'`. The endpoint answers 200 with `{ url, redirect }` as JSON while also
setting a `Location` header; a `fetch` receives the body, so the client navigates itself with
`window.location.assign(url)`. The `errorCallbackURL` is what makes a failure two hops later land on
this app's login screen instead of the library's own error page, so it is sent on every call without
exception.

`getAuthConfig` must not throw the screen away when it fails. A rejection, including a 401 that the
helper turns into `SignedOutError`, resolves to `{ google: false }`, because the delta says a failed
configuration read is treated as not configured.

### The boot sequence

`src/client/App.tsx` currently runs `getMe()` alone. It runs both reads in one effect instead, with
`Promise.all`, and holds the configuration result in its own state so it survives a later sign-out
without a second request. The loading screen of design-spec 4.2 stays exactly as it is and now covers
both reads, which is what the delta means by the login screen painting with its final action row and
never shifting. `Login` takes one new prop, `googleEnabled: boolean`.

### Error codes to sentences

A new module, `src/client/components/ui/googleErrors.ts`, maps an `error` query value to one of the
four outcomes the delta fixes. It is a pure function with no React in it, which is what lets it carry
a unit test under the existing `src/**/*.test.ts` glob:

| Code | Tone | Copy |
| --- | --- | --- |
| `access_denied` | status | Google sign-in was cancelled. Sign in with your email, or try Google again. |
| `state_not_found`, `state_invalid`, `state_mismatch` | alert | This sign-in link has expired. Start again from this page. |
| `account_not_linked` | alert | This Google account cannot be used here. Sign in with your email and password instead. |
| anything else | alert | Google sign-in did not finish. Try again, or sign in with your email. |

The three state codes are all reachable, and only because of the `onAPIError` setting above:
`state_not_found` for a callback with no `state` at all, and `state_mismatch` for a fabricated,
replayed or expired one under the database strategy this app runs. `state_invalid` belongs to the
cookie strategy and is mapped for completeness rather than because this configuration produces it.

`error_description` is read from the URL by nothing and rendered by nothing, but the library does
write it: the callback appends both `error` and `error_description` to the redirect
(`node_modules/better-auth/dist/oauth2/errors.mjs:34-38`), so Google's own description text reaches
the address bar, the history entry and any outbound referrer until the replace runs. So the replace
drops the **whole query** rather than the `error` key, and it runs on mount whenever either `error` or
`error_description` is present, including for codes the mapping does not recognise and for a returned
`error_description` with no `error` beside it. The status tone is
`role="status"`, `--t-body`, colour `--ink-soft`, with no red rule; the alert tone is the existing 3.8
treatment. `FormAlert` hardcodes `role="alert"`, so the status tone needs either a `role` prop on that
component or a sibling with the same position and typography. Either is acceptable; the position, the
colours and the focus behaviour are what the delta fixes.

On mount, `Login` reads `error` from `window.location.search`, renders the mapped message, moves focus
to the message line, and then calls `history.replaceState` to drop the query so a reload shows a clean
login. The replace happens after the render that shows the message, never before.

### The mark

`src/client/components/GoogleMark.tsx` holds Google's four-colour "G" as an inline SVG at 18px square,
in its own colours in both themes. It is exempt from the palette of design-spec 2.1 and is never
recoloured, outlined or given a background, including in the disabled state, where only the button's
text and border change. There is no Content Security Policy in this app, so an inline SVG needs no
accommodation. The mark is decorative beside a text label, so it carries `aria-hidden="true"` and the
button's accessible name comes from the label alone.

### The action row

`.login-actions` is a flex row with `gap: var(--s-3)` and wrapping allowed. At 640px and above both
buttons are intrinsic width on one line inside the 360px block; if the label does not fit, the row wraps
and the Google button drops under the primary, left aligned and still intrinsic width. Neither the label
nor the padding shrinks. Below 640px both stack full width, `Sign in` first, both 44px high.

DOM and tab order is email, password, Sign in, Continue with Google. The Google button is
`type="button"` inside the same form, so Enter in a field still submits the password form.

### Busy states

On click, the Google button takes `aria-busy="true"` with its label unchanged, the form takes
`aria-busy="true"`, and both fields and both buttons are disabled per design-spec 3.3 until the browser
leaves. No spinner and no copy change. While the password submit is busy, the Google button is disabled
with the rest of the form.

If the call fails before any navigation the form re-enables and focus moves to the message line, and
which sentence shows is decided by what `request()` threw. The designer has ruled on this, so it is no
longer an open question:

| What the social call did | Sentence, as an alert per 3.8 |
| --- | --- |
| answered with an HTTP error of any status, which includes the 404 of a deployment whose credentials were removed between the configuration read and the click, and the 401 the helper turns into `SignedOutError` | "Google sign-in did not finish. Try again, or sign in with your email." |
| never produced a response at all, so the `fetch` itself rejected | "Could not reach Google. Check your connection and try again." |

`ApiError` and `SignedOutError` are the only two classes `src/client/api.ts` throws for a response that
arrived, so the test is whether the rejection is one of those. Both sentences take the alert treatment;
the difference is which one is true.

**The connection sentence is a new constant and does not reuse `CONNECTION_FAILURE`.** That constant is
exported from `src/client/components/ui/FormAlert.tsx:31`, it will already be in scope in the file being
edited, and its text is different:

| Constant | Text |
| --- | --- |
| `CONNECTION_FAILURE`, existing, for the save paths | "Could not save. Check your connection and try again." |
| `GOOGLE_CONNECTION_FAILURE`, new, in `googleErrors.ts` | "Could not reach Google. Check your connection and try again." |

Reusing the existing one would ship copy the delta does not specify, and no automated row in this
repository reads client markup, so nothing else would catch it. The choice between the two sentences is
a pure function beside the code mapping, `startFailureMessage(error: unknown)` in the same module, which
is what lets the `googleErrors` unit test pin both sentences exactly as it pins the other four.

### The integration bindings question, and its fallback

Research left one implementation choice open: whether the provider-present integration cases run in the
existing Vitest project with overridden bindings or in a second project. This plan chooses the first.
The new integration file assigns `env.GOOGLE_CLIENT_ID` and `env.GOOGLE_CLIENT_SECRET` to test-only
literals in a `beforeAll` and deletes them in an `afterAll`, so the provider-absent cases and the whole
of `tests/integration/auth.test.ts` still run against an environment with neither. The literals are
fabricated strings, never a credential, and nothing in those cases reaches Google.

If that mutation turns out not to reach the Worker that `SELF.fetch` runs, the fallback is a second
Vitest project, `vitest.integration.google.config.ts`, binding the same two literals, with its own
`test:integration:google` script and its own continuous integration step. The default `npm test` must
pass with no Google value in either case, and that constraint is what decides the question rather than
taste. Whichever lands, record it in the phase 3 commit and in the checkpoint.

The new file takes the `10.8.0.x` client-address prefix and adds it to the allocation comment in
`tests/integration/accounts.ts`. The limiter is database backed and the test database is never reset
between files, so reusing another file's prefix reads as a flaky sign-in rather than as a throttle.

---

## Phase 1: The server, the provider and the configuration read

### Overview

Everything the Worker needs, and nothing the browser sees. At the end of this phase a deployment with
credentials registers the Google provider and answers `{ "google": true }`; a deployment without them
registers nothing and answers `{ "google": false }`; and the accepted linking rule is set and asserted.
The login screen is untouched.

### Required changes

#### 1. `env.d.ts`

Add `GOOGLE_CLIENT_ID?: string` and `GOOGLE_CLIENT_SECRET?: string` to `Cloudflare.Env`, optional, with
one line of comment saying their absence is a supported state.

#### 2. `.dev.vars.example`

Add both names with empty values, and one paragraph in the file's existing voice: the deployment
carries them as Worker secrets set with `wrangler secret put`, and leaving them unset is supported and
means no Google button is rendered. No value, no example id, no placeholder that looks like a
credential.

#### 3. `src/server/auth.ts`

Add the `account.accountLinking.disableImplicitLinking` setting and `onAPIError: { errorURL: '/' }`
unconditionally, and the `socialProviders.google` block conditionally on both values being present,
exactly as "Critical implementation details" describes. Carry a short comment recording that the rule
is decision D-013 and that `trustedProviders` is deliberately left unset, because that absence is
otherwise invisible, and a second recording that the error URL is what keeps a state failure on the
login screen rather than on the library's own error page.

#### 4. `src/server/routes/auth.ts`

Register `GET /api/auth-config` returning `{ google: boolean }`, with a comment saying why the login
screen cannot learn this from `/api/me`.

#### 5. `src/server/auth.test.ts`

Three cases, all pure options assertions with no bindings, in the file's existing shape:

- `createAuth` registers no `google` provider when `GOOGLE_CLIENT_ID` is absent, when
  `GOOGLE_CLIENT_SECRET` is absent, and when both are.
- `createAuth` registers `google` when both are present.
- The resolved options disable implicit linking and list no trusted provider, whether or not Google is
  configured.
- The resolved options carry `onAPIError.errorURL` set to `/`, whether or not Google is configured, so
  the setting cannot be dropped later without failing a test.

### Success criteria

#### Automated verification

- `npm run typecheck` passes across all three projects.
- `npm run test:unit` passes, including the four new cases.
- `npm run test:integration` passes with no Google value bound anywhere.
- `npm run build` succeeds.
- `curl -s localhost:8787/api/auth-config` answers `{"google":false}` with no Google value in
  `.dev.vars`, and `{"google":true}` with both set.
- `grep -n "scope" src/server/auth.ts` returns nothing.
- The resolved options carry `onAPIError.errorURL` as `/`, configured and unconfigured alike.
- `git diff --stat src/domain/ migrations/ src/client/` is empty for this phase.
- `git diff` carries no credential value and `.dev.vars.example` carries two empty names.

#### Manual verification

- With both values set locally, `POST /api/auth/sign-in/social` with `provider: 'google'` answers 200
  with a `url` on `accounts.google.com`; with them unset it answers 404. Read it with a shell request,
  not a browser, since there is no button yet.

---

## Phase 2: The login screen

### Overview

The delta, built. At the end of this phase a configured deployment shows the action row the delta
specifies, a click leaves for Google, and every one of the four return outcomes renders correctly when
the URL is constructed by hand. An unconfigured deployment shows today's login screen exactly.

### Required changes

#### 1. `src/client/api.ts`

`getAuthConfig()` and `startGoogleSignIn()` as described above, including the rule that a failed
configuration read resolves to `{ google: false }` rather than rejecting.

#### 2. `src/client/App.tsx`

Run both reads in one effect with `Promise.all`, hold the configuration in its own state, keep the 4.2
loading screen unchanged, and pass `googleEnabled` to `Login`.

#### 3. `src/client/components/GoogleMark.tsx`

New. The four-colour mark at 18px square, `aria-hidden`, unmodified in both themes.

#### 4. `src/client/components/ui/googleErrors.ts`

New. The pure code-to-outcome map of the four sentences, with its tone, plus
`GOOGLE_CONNECTION_FAILURE` and the pure `startFailureMessage(error: unknown)` that chooses between it
and the did-not-finish sentence, per "Busy states". The module does not import `CONNECTION_FAILURE`.

#### 5. `src/client/screens/Login.tsx`

The action row, the Google button with its busy and disabled behaviour, the failure of the social call
routed through `startFailureMessage` so an HTTP error takes the did-not-finish sentence and only a
rejection with no response takes the connection sentence, the error read on mount with focus to the
message line and the `history.replaceState` that drops the whole query afterwards, and the rule that
nothing Google renders at all when `googleEnabled` is false.

#### 6. `src/client/index.css`

`.login-actions` and the mark sizing inside a quiet button, plus the stacking rule below 640px. No new
colour token, no new variant: the button is `.btn-quiet` as it already exists.

### Success criteria

#### Automated verification

- `npm run typecheck` passes.
- `npm test` passes with no test file changed in this phase.
- `npm run build` succeeds.
- `grep -rn "GOOGLE_CLIENT" src/client/` returns nothing.
- `grep -rn "error_description" src/client/` returns nothing.
- `git diff --stat src/server/ src/domain/ migrations/` is empty for this phase.

#### Manual verification

Run the app locally with both Google values set, in a browser, unless a row says otherwise.

- The action row matches the delta at 1280: primary then quiet, one line inside the 360px block, gap
  `--s-3`, the mark in its own colours.
- At 390 the two buttons stack full width, `Sign in` first, both at least 44px high, with no horizontal
  scroll.
- Tab order is email, password, Sign in, Continue with Google, each with the design-spec 2.4 focus ring;
  Enter in a field submits the password form rather than starting Google.
- Pressing the Google button disables both fields and both buttons, sets `aria-busy` on the button and
  the form with the label unchanged, and leaves for Google's consent screen.
- With the network blocked, the same press re-enables the form and shows the connection sentence with
  focus on the alert line.
- With the social call answering an HTTP error instead, which is what a deployment answers when its
  credentials are removed after the configuration read, the same press re-enables the form and shows
  "Google sign-in did not finish. Try again, or sign in with your email." as an alert rather than the
  connection sentence. Produce it by unsetting the credentials between the load and the click.
- Each of the four return outcomes renders its own sentence, with `access_denied` as a status line in
  `--ink-soft` with no red rule and the other three as alerts with the 3.8 red rule. Produce them by
  visiting the app root with the `error` query set by hand.
- After any of those renders, the URL has lost its query and a reload shows a clean login.
- With both values unset, the login screen is exactly today's: one button, nothing marking an absence,
  no layout shift between the loading screen and the painted login.
- Both themes, at both widths, with reduced motion on and off: nothing animates and nothing moves.

---

## Phase 3: The tests

### Overview

Everything a test can honestly prove, and nothing it cannot. The provider toggling, the authorize URL
and its persisted state, a refused callback, the refusal for a seeded email, isolation for an
OAuth-shaped account, the untouched password path, and the error mapping.

### Required changes

#### 1. `tests/integration/accounts.ts`

Add `10.8.0.x` to the client-address prefix allocation comment for the new file. Nothing else in this
file changes.

#### 2. `tests/integration/google-auth.test.ts`

New. Provider-present cases get their bindings by the mutation described above, with the fallback
recorded if it is needed.

- **Provider absent.** `POST /api/auth/sign-in/social` with `provider: 'google'` answers 404, and
  `GET /api/auth-config` answers `{ google: false }`.
- **Provider present.** `GET /api/auth-config` answers `{ google: true }`. The same social call answers
  200 with a `url` whose host is `accounts.google.com`, whose `redirect_uri` is
  `http://example.com/api/auth/callback/google`, whose `scope` is the three identity scopes and nothing
  else, and which carries `state`, `code_challenge` and `code_challenge_method=S256`. A `verification`
  row exists afterwards, read from `env.DB`.
- **Invalid state.** `GET /api/auth/callback/google` with a fabricated `state` answers a redirect whose
  `Location` is the app root carrying `error=state_mismatch`, which is what the database state strategy
  produces when no verification row matches, and not `${baseURL}/error`. Assert the path as well as the
  code, because asserting only that some error came back would pass against the library's own error
  page and prove nothing about the login screen. No session is created either: a following `/api/me`
  with whatever cookies came back is 401.
- **`account_not_linked` for a seeded email.** Seed a password account through the existing `seedUser`
  helper, then call `handleOAuthUserInfo`, which `better-auth/oauth2` exports
  (`node_modules/better-auth/dist/oauth2/index.mjs:5`), with a fabricated `google` account and a
  `userInfo` carrying that same email and `emailVerified: true`, and assert it answers
  `{ error: 'account not linked', data: null }`
  (`node_modules/better-auth/dist/oauth2/link-account.mjs:79-85`). The context argument is
  `{ context: await auth.$context }` built from the same `createAuth` the Worker uses: the refusal
  branch returns before any cookie, transaction or redirect work, and reads only `internalAdapter`,
  `options`, `trustedProviders` and `logger` from that context. This runs inside the Workers pool
  against the real D1 with no network and no mock of Google, which is why it is preferred over the
  alternative below. Assert the error string, not a message shown to anyone.

  Two things to record in the test file rather than leave to a reader. The underscored
  `account_not_linked` that the delta and D-013 name is the callback's own transform of that string,
  `result.error.split(' ').join('_')` (`callback.mjs:243-245`), so the client mapping and this
  assertion are two spellings of one fact. And this case asserts the library's function rather than
  this application's route, so it would not catch a later change that stopped the callback consulting
  it; the phase 1 options assertion is what pins the configuration, and the G05 roundtrip is what
  exercises the route.

  **If the context cannot be built.** If `auth.$context` turns out not to satisfy the call inside the
  pool, do not invent a fuller fake and do not mock the adapter. Drop this case and Progress row 3.11,
  record in the phase 3 commit and in the checkpoint that `account_not_linked` is proven by the phase 1
  options assertion and by the G05 live roundtrip only, and correct the credential dependency table's
  phase 3 row to say so. The honesty rule outranks the coverage.
- **Isolation for an OAuth-shaped account.** Insert a `user` row with a `google` `account` row, sign
  that user in through a session the test creates, and assert an empty subscription list and a 404 for
  the seeded owner's subscription. This is the existing cross-account assertion extended to an account
  that no password created.

Progress row 3.10 keeps its title, because titles are immutable once a plan is reviewed. What it asserts
is now the sharper thing stated above: the redirect lands on the app root with `error=state_mismatch`,
not merely that some error came back.

#### 3. `src/client/components/ui/googleErrors.test.ts`

New. One case per row of the mapping table, plus an unknown code and a missing code. Assert the exact
sentences, because the delta fixes them as copy. Two more for `startFailureMessage`: an `ApiError` of
any status and a `SignedOutError` each return the did-not-finish sentence, and a rejection that carries
no response returns `GOOGLE_CONNECTION_FAILURE`, whose text is asserted in full so it cannot drift into
`CONNECTION_FAILURE`.

### Success criteria

#### Automated verification

- `npm run typecheck` passes.
- `npm run test:unit` passes, including the error-mapping cases.
- `npm run test:integration` passes.
- `npm test` passes with no Google value in the environment, which is the state continuous integration
  runs in.
- `tests/integration/auth.test.ts` is byte-identical to its state on `main`:
  `git diff --stat main -- tests/integration/auth.test.ts` is empty.
- The whole suite passes a second time with `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` set in the
  local environment, which is the regression that matters most.
- `npm run build` succeeds.
- `.github/workflows/ci.yml` is unchanged unless the fallback second project landed, in which case it
  gains exactly one step and still holds no secret.

#### Manual verification

- Read the new integration file once against the boundary: no case asserts anything about Google's
  consent screen, its token exchange or its identity, and no test name claims that Google
  authentication works.

---

## Phase 4: The verification pass

### Overview

A browser walk of every state the change can produce locally, at both widths, in both themes, with the
button present and absent, plus the accessibility rows the delta's amended checklist adds. No code
changes in this phase unless a row fails, in which case the fix lands here with the row that found it.

### Required changes

- Corrections only, to whatever the walk finds.
- Captures for the designer under `evidence/screenshots/`, covering the states the delta's amended
  acceptance checklist names: login idle with the Google button, the Google button busy, cancelled as a
  status line, the expired link, the account not usable, and the did-not-finish alert, plus login idle
  without the button. This plan writes evidence files; it does not index them.

### Success criteria

#### Automated verification

- `npm run typecheck`, `npm test` and `npm run build` all pass, with and without Google values set.
- Every stability guard in the table above still holds.

#### Manual verification

- Login idle with the Google button, at 1280 and at 390, in light and in dark, matching the delta.
- Login idle without the Google button, at both widths in both themes, identical to the shipped screen.
- The mark is unmodified in both themes, including while the button is disabled.
- The quiet variant meets the contrast requirement of design-spec 2.1 in both themes, measured rather
  than judged.
- Tab order is email, password, Sign in, Continue with Google, with the 2.4 focus ring on each; Space
  and Enter both activate the Google button; Escape does nothing.
- The busy state disables both fields and both buttons, keeps the label, and sets `aria-busy` on both
  the button and the form.
- Each of the four return outcomes renders its sentence in the right tone and position, takes focus, and
  leaves a clean URL.
- An HTTP error from the social call shows the did-not-finish alert and never the connection sentence,
  and a request that never reaches the server shows the connection sentence.
- Reduced motion on and off: nothing animates in any of the above.
- The action row holds one line at 1280 and stacks at 390, with no horizontal scroll at either.

### The live gate, outside this Progress

After this phase and after deployment, goal G05 completes a real Google consent roundtrip on the
deployed origin with an authorized account, then signs out and signs in again, and confirms the new
account's empty ledger and its isolation from the demo and reviewer records. **It depends on one step
this plan cannot take**: `GOOGLE_CLIENT_ID` reaching the deployed Worker through `wrangler secret put`
with authorized Cloudflare credentials, followed by a deploy. `GOOGLE_CLIENT_SECRET` is already set,
per `context/checkpoints/g02-oauth-provision.md`.

One check comes before the consent screen, because it is cheaper than a human and it fails in a way
nothing local can reproduce. On the deployed origin, with the button rendered, confirm that
`POST /api/auth/sign-in/social` answers 200 with an `accounts.google.com` url and not 403 with
`INVALID_CALLBACK_URL`. That one request exercises the deployed `APP_ORIGINS`, the trusted-origin
validation of `callbackURL` and `errorCallbackURL`, and the fact that the button's own origin is on the
list, all of which this repository cannot see. Only then is anyone asked to consent to anything. The consent audience stays External in Testing with the authorized
account on the test-user list, so no artifact from G05 may claim that public Google login works. It is
not a row below, because nothing in this plan can make it pass.

Two further live checks belong with it, both recorded by research as open: that all six migrations are
applied to the remote D1 database, confirmed with `wrangler d1 migrations list --remote` rather than
assumed from D-010; and that all three origins are registered on the OAuth client, since a mismatch
fails at Google rather than here.

## Rollback

The feature is absent when the environment is absent. Removing `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET` from the deployed Worker returns the product to exactly today's behaviour with
no code change and no migration: the provider is not registered, `/api/auth-config` answers
`{ google: false }`, and the login screen renders one button. That is the rollback, and it is also the
state continuous integration runs in on every push, so it is exercised continuously rather than
believed.

A code-level rollback is a revert of the four phase commits in reverse order. Nothing in them touches
the database, so no migration is rolled back and no stored value is affected.

## Risks

| Risk | Why it is plausible | What this plan does about it |
| --- | --- | --- |
| A mismatched redirect URI | `baseURL` is the request's own origin, so the app serves whichever origin it is reached on, and a missing registration fails at Google with a page this app never sees | All three origins are fixed in D-012 and listed in the G02 checkpoint; the phase 3 authorize-URL assertion pins the shape, and the live gate pins the registration |
| The callback loses its session cookie | `SameSite=Lax` permits a cookie on a top-level `GET` navigation, which is exactly the callback's shape, but a future tightening to `Strict` would break Google sign-in without breaking password sign-in | Nothing changes the attribute in this change, and the phase 3 cases pin the behaviour rather than the attribute, so a later tightening fails a test |
| `trustedOrigins` refuses the social call | the social sign-in is a `POST` from the client and carries an `Origin`, so the existing check applies to it exactly as it applies to password sign-in; `callbackURL` and `errorCallbackURL` are validated against the same list before the redirect starts | **Unverified from here.** `APP_ORIGINS` is a Cloudflare secret, `wrangler secret list` shows names and never values, and nothing in this repository can confirm the deployed origin is in it or that it carries no trailing slash. A mismatch answers the click with 403 and `INVALID_CALLBACK_URL` while every local run and the whole suite stays green, so the G05 live gate checks it with one request before any human is asked to consent |
| The Workers runtime rejects the new code paths | an OAuth flow reaches for crypto, and this runtime has no Node crypto | Research read them: `generateRandomString`, `jose` for `decodeJwt` and `betterFetch`, none Node-only, and the shipped password path already exercises the library's crypto here |
| Continuous integration turns red for want of a secret | the job holds none, and the natural way to test an OAuth provider is to configure one | The provider is conditional, the configuration read answers false, the provider-present bindings are fabricated literals inside the test file, and `npm test` is asserted green with nothing set |
| The rate limiter reads as a flaky test | the limiter is database backed, keyed on `cf-connecting-ip`, and the test database is never reset between files | The new file takes its own `10.8.0.x` prefix and adds it to the allocation comment |
| A mock gets reported as the roundtrip | every assertion available stops at the authorize URL, and a green suite is persuasive | The boundary is written into phase 3's manual row, into the live gate above, and into the checkpoint |
| Google's mark gets recoloured to fit the palette | every other colour on the screen comes from a token, so the exception looks like an oversight | The delta states the exemption, and phase 4 checks it in both themes and in the disabled state |

## References

- Design authority: `context/changes/google-sign-in/design-delta.md`
- Research: `context/changes/google-sign-in/research.md`
- Framing: `context/changes/google-sign-in/frame.md`
- Brief: `context/foundation/google-sign-in-brief.md`
- Decisions: `context/decisions/D-012-google-oauth-provisioning.md`,
  `context/decisions/D-013-google-account-linking.md`, `context/decisions/D-001-auth-solution.md`,
  `context/decisions/D-005-account-seeding.md`,
  `context/decisions/D-010-live-demo-data-and-reviewer-access.md`
- Provisioning state: `context/checkpoints/g02-oauth-provision.md`
- Prior art for the login screen: `context/archive/visual-redesign/design-spec.md` sections 2.1, 2.4,
  3.3, 3.8, 4.1, 4.2, 9 and 11
- Files this change touches: `src/server/auth.ts`, `src/server/routes/auth.ts`, `env.d.ts`,
  `.dev.vars.example`, `src/client/api.ts`, `src/client/App.tsx`,
  `src/client/screens/Login.tsx`, `src/client/index.css`, `src/client/components/GoogleMark.tsx`,
  `src/client/components/ui/googleErrors.ts`, `src/server/auth.test.ts`,
  `src/client/components/ui/googleErrors.test.ts`, `tests/integration/google-auth.test.ts`,
  `tests/integration/accounts.ts`

## Design questions

Anything implementation turns up that would change a specified appearance is recorded here, stopped for
that item only, and returned to the designer. Nothing is improvised.

None open. The one question this plan raised, what to show when the configuration read said true and
the social call then answers an HTTP error, has been ruled on by the designer in `design-delta.md`: the
fourth sentence, "Google sign-in did not finish. Try again, or sign in with your email.", as an alert
per 3.8, with the connection sentence reserved for a request that never reached the server. That ruling
is built into "Busy states" above, into phase 2, and into the Progress rows for both the mapping
function and the browser pass.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename
> step titles. See `archive/toolkit/.ai/skills/10x-plan/references/progress-format.md`.

### Phase 1: The server, the provider and the configuration read

#### Automated

- [ ] 1.1 Typecheck passes across all three projects
- [ ] 1.2 The unit suite passes, including the provider and linking assertions
- [ ] 1.3 The integration suite passes with no Google value bound anywhere
- [ ] 1.4 The production build succeeds
- [ ] 1.5 `/api/auth-config` answers `{"google":false}` unconfigured and `{"google":true}` configured
- [ ] 1.6 No `scope` option appears in `src/server/auth.ts`
- [ ] 1.7 Nothing under `src/domain`, `migrations` or `src/client` has changed
- [ ] 1.8 No credential value appears in the diff and `.dev.vars.example` carries two empty names
- [ ] 1.9 `createAuth` registers no `google` provider when either value is absent and registers it when both are present
- [ ] 1.10 The resolved options disable implicit linking and list no trusted provider, configured or not
- [ ] 1.12 The resolved options carry the app-root error URL, configured or not, so a state failure lands on the login screen

#### Manual

- [ ] 1.11 `POST /api/auth/sign-in/social` answers 200 with an `accounts.google.com` url when configured and 404 when not

### Phase 2: The login screen

#### Automated

- [ ] 2.1 Typecheck passes across all three projects
- [ ] 2.2 The whole suite passes with no test file changed in this phase
- [ ] 2.3 The production build succeeds
- [ ] 2.4 No `GOOGLE_CLIENT` string appears anywhere under `src/client`
- [ ] 2.5 No `error_description` appears anywhere under `src/client`
- [ ] 2.6 Nothing under `src/server`, `src/domain` or `migrations` has changed

#### Manual

- [ ] 2.7 The action row matches the delta at 1280 in light and in dark, mark in its own colours
- [ ] 2.8 At 390 the buttons stack full width, Sign in first, both at least 44px high, no horizontal scroll
- [ ] 2.9 Tab order is email, password, Sign in, Continue with Google, and Enter in a field submits the password form
- [ ] 2.10 The Google press disables both fields and both buttons, keeps the label, sets `aria-busy` on button and form, and leaves for Google
- [ ] 2.11 A press with the network blocked re-enables the form and shows the connection sentence with focus on the alert line
- [ ] 2.12 Each of the four return outcomes renders its own sentence in the right tone and takes focus
- [ ] 2.13 After any outcome renders, the query is gone from the URL and a reload shows a clean login
- [ ] 2.14 With no Google value set the login screen is exactly today's, with nothing marking the absence and no shift after loading
- [ ] 2.15 An HTTP error from the social call re-enables the form and shows the did-not-finish alert rather than the connection sentence

### Phase 3: The tests

#### Automated

- [ ] 3.1 Typecheck passes across all three projects
- [ ] 3.2 The unit suite passes, including one case per error-mapping row plus unknown and missing codes
- [ ] 3.3 The integration suite passes
- [ ] 3.4 `npm test` passes with no Google value in the environment
- [ ] 3.5 `tests/integration/auth.test.ts` is unchanged from `main`
- [ ] 3.6 The whole suite passes a second time with both Google values set locally
- [ ] 3.7 The production build succeeds
- [ ] 3.8 Provider absent: the social call answers 404 and the configuration read answers false
- [ ] 3.9 Provider present: the authorize url carries the right client id, redirect uri, three scopes, state and S256 challenge, and a verification row exists
- [ ] 3.10 A callback with a fabricated state redirects with an error and creates no session
- [ ] 3.11 A Google identity whose email matches a seeded password account is refused with `account_not_linked`
- [ ] 3.12 An OAuth-shaped account sees an empty subscription list and is answered 404 for the seeded owner's subscription
- [ ] 3.13 `10.8.0.x` is recorded in the prefix allocation comment and the new file uses it
- [ ] 3.14 CI is unchanged, or gains exactly one secretless step if the second-project fallback landed
- [ ] 3.16 The start-failure mapping returns the did-not-finish sentence for an HTTP error and the Google connection sentence for a rejection with no response, both asserted in full

#### Manual

- [ ] 3.15 The new integration file claims nothing about Google's consent, token exchange or identity

### Phase 4: The verification pass

#### Automated

- [ ] 4.1 Typecheck, the whole suite and the build all pass, with and without Google values set
- [ ] 4.2 Every stability guard still holds

#### Manual

- [ ] 4.3 Login idle with the Google button at 1280 and 390, in light and in dark, matching the delta
- [ ] 4.4 Login idle without the Google button at both widths in both themes, identical to the shipped screen
- [ ] 4.5 The mark is unmodified in both themes, including while the button is disabled
- [ ] 4.6 The quiet variant meets the design-spec 2.1 contrast requirement in both themes, measured
- [ ] 4.7 Tab order and the 2.4 focus ring hold, Space and Enter both activate, Escape does nothing
- [ ] 4.8 The busy state disables both fields and both buttons and keeps the label
- [ ] 4.9 Each return outcome renders in the right tone and position, takes focus, and leaves a clean URL
- [ ] 4.10 Nothing animates with reduced motion on or off
- [ ] 4.11 The action row holds one line at 1280 and stacks at 390 with no horizontal scroll
- [ ] 4.12 The captures the delta's amended checklist names are written under `evidence/screenshots/`
- [ ] 4.13 An HTTP error from the social call shows the did-not-finish alert and a request that never reaches the server shows the connection sentence
