---
git_commit: ab5c131
branch: main
repository: subscription-splitter
topic: "What Google sign-in inherits from the shipped Better Auth integration: whether the D1 schema already carries the account and verification rows the Google provider writes, the exact callback path and configuration names, what the installed version does when a Google email matches an existing password account, how the affordance degrades when the provider is not configured, and what the Workers runtime constrains"
tags: [research, auth, oauth, google, better-auth, d1, workers]
status: complete
---

# Research: google-sign-in

Date and researcher fields the schema lists are omitted; this repository records provenance by
commit and change ID, per `AGENTS.md`. Findings are separated into **Evidence** (read from this
repository, from the installed `better-auth@1.7.4` package, or from the library's current
documentation), **Inference** (a conclusion drawn from evidence, stated as such) and **Unknown**
(must be settled during design, provisioning or implementation).

This research describes what exists and what the library does. It names no button placement, colour,
copy or interaction. Those belong to the designer; the design questions this research surfaced are
listed in `frame.md` under "Design decisions for Fable".

## Research question

Can Google sign-in be added to this app without a schema migration, without weakening the shipped
session and ownership behaviour, and without breaking local tests or CI where no Google credential
exists? What is the exact callback path, what configuration names does the Worker need, what does
the installed Better Auth version do by default when a Google identity's email matches an existing
password account, and which failure paths must the login screen be able to show?

## Summary

Five findings carry the change.

**The schema is already complete.** `migrations/0001_auth.sql` was written by hand against Better
Auth's core table definitions and carries every column the Google provider writes. The `account`
table has `accountId`, `providerId`, `userId`, `accessToken`, `refreshToken`, `idToken`,
`accessTokenExpiresAt`, `refreshTokenExpiresAt`, `scope`, `password`, `createdAt` and `updatedAt`,
which is exactly the field list the installed package declares, plus the `account_userId_idx` index
the declaration marks as required. The `verification` table, which is where the library persists the
OAuth `state` and PKCE `codeVerifier` between the redirect and the callback, exists with the
identifier index. **No migration is needed for this change.**

**The callback path is fixed and derivable.** The auth handler is mounted as a catch-all at
`/api/auth/*`, and the library builds a provider's redirect URI as `${baseURL}/callback/${provider
id}`. The registered Google redirect URI is therefore `<origin>/api/auth/callback/google` at every
origin. Three origins matter: `http://localhost:5173`, `http://localhost:8787` and
`https://subscription-splitter.sebastianfudalej.workers.dev`.

**The default linking behaviour is not safe enough to rely on, and the brief's rule has an exact
switch.** In `better-auth@1.7.4`, `account.accountLinking.enabled` defaults to `true`, so a Google
sign-in whose email matches an existing user is implicitly linked when the provider reports a
verified email and the local user is also verified. Today's seeded accounts have `emailVerified = 0`,
so the link would in fact be refused, but only by accident of the seeding path. The precise switch
for the brief's rule is `account.accountLinking.disableImplicitLinking: true`, which rejects a
same-email OAuth sign-in with `account_not_linked` while still allowing a brand new Google user to
sign up.

**Missing configuration has to be answered by a public read, not by the sign-in call.** The login
screen is rendered with no session, and `/api/me` answers 401 when signed out, so the client has no
existing place to learn whether Google is configured. Asking `POST /api/auth/sign-in/social` and
reading its 404 would only tell the user after they click. A small unauthenticated configuration
endpoint is the only way the button can be absent rather than broken when the environment carries no
Google credential, which is what keeps local runs and CI green without secrets.

**The test strategy has a real boundary.** Everything up to Google's authorization endpoint is
testable inside the Workers pool: that the provider is absent without configuration and present with
it, that the authorize URL carries the right client id, redirect URI, scopes and PKCE challenge, that
a tampered or missing `state` is refused, and that session and ownership isolation still hold for a
user created through the OAuth path. What cannot be simulated is Google's own consent and token
exchange. That is the live roundtrip the brief already requires, and no mock may be presented as
having proved it.

## Detailed findings

### 1. Schema readiness

**Evidence.** `migrations/0001_auth.sql:29-45` defines `account` with the columns listed above and
`account_userId_idx` on `userId`. The installed package declares the account model at
`node_modules/@better-auth/core/dist/db/get-tables.mjs:198-280`: `accountId` (string, required),
`providerId` (string, required), `userId` (string, required, `index: true`, cascade reference to
`user.id`), `accessToken`, `refreshToken`, `idToken`, `accessTokenExpiresAt` (date),
`refreshTokenExpiresAt` (date), `scope`, `password`, `createdAt` (date, required),
`updatedAt` (date, required). Every one is present in the migration. No unique constraint over
`(providerId, accountId)` is declared; the library resolves duplicates in application code and
raises `BetterAuthError` when two rows share a provider identity
(`node_modules/better-auth/dist/db/internal-adapter.mjs:555`).

**Evidence.** The `date` typed columns are `INTEGER` in the migration, which is what the same file
already does for `session.expiresAt`, `user.createdAt` and the rest. Those columns are exercised by
the shipped session tests, including the expiry case in `tests/integration/auth.test.ts` that writes
a raw epoch value and expects a 401, so the Kysely D1 dialect's handling of integer dates is proven
by tests that pass today.

**Evidence.** OAuth `state` and the PKCE `codeVerifier` are persisted, not carried in a cookie:
`node_modules/better-auth/dist/state.mjs:83` fails with "Unable to create verification. Make sure the
database adapter is properly working and there is a verification table in the database", and
`:121` fails a callback with "State mismatch: verification not found". `migrations/0001_auth.sql:47-54`
creates `verification` with `identifier`, `value`, `expiresAt`, `createdAt`, `updatedAt` and
`verification_identifier_idx`.

**Inference.** No new migration is required. This is worth stating loudly because the natural
assumption for "add an OAuth provider" is that it needs storage; here the storage was already
written when D-001 chose to hand-maintain the core schema.

**Unknown.** Whether the remote D1 database has all six migrations applied is a fact about one live
database, not about this repository. `context/decisions/D-010-live-demo-data-and-reviewer-access.md`
records that the four additive migrations were applied remotely, so the expectation is yes, but the
implementation phase should confirm it rather than assume it.

### 2. Callback path, origins and configuration names

**Evidence.** `src/server/routes/auth.ts:13-16` mounts the library handler with
`app.on(['POST','GET'], '/api/auth/*', ...)` and builds the instance per request with
`createAuth(c.env, new URL(c.req.url).origin)`. `src/server/auth.ts` passes that origin as `baseURL`.

**Evidence.** `node_modules/better-auth/dist/oauth2/utils.mjs:28-31` defines the callback path as
`/callback/${provider.id}` unless the provider sets `callbackPath`. The Google provider's id is
`google` (`node_modules/@better-auth/core/src/social-providers/google.ts:151`). The redirect URI is
composed at `node_modules/better-auth/dist/api/routes/sign-in.mjs` as
`${c.context.baseURL}${getOAuthCallbackPath(provider)}`.

**Inference.** The authorized redirect URI is `<origin>/api/auth/callback/google`, and because
`baseURL` is the request's own origin rather than a configured constant, the same deployment serves
whichever origin it is reached on. Every origin the app is reached from must therefore be registered
with the OAuth client, or the callback will be refused by Google rather than by this app.

**Evidence.** Origins, from `context/checkpoints/g02-oauth-provision.md` and the README: local dev is
`http://localhost:5173` (`vite dev`, the default `npm run dev`) and `http://localhost:8787`
(`wrangler dev`); the deployed origin is
`https://subscription-splitter.sebastianfudalej.workers.dev`. `APP_ORIGINS` in `.dev.vars` already
carries the local pair, and `src/server/auth.ts` refuses to construct an auth instance when it
resolves to no origin at all.

**Evidence.** Worker variable names are hand-maintained, not generated: `env.d.ts` declares
`Cloudflare.Env` with `DB`, `BETTER_AUTH_SECRET`, `APP_ORIGINS`, `COOKIE_SECURE`, `SEED_ENABLED` and
`SEED_TOKEN`, and `.gitignore` excludes the `wrangler types` output. `.dev.vars.example` lists the
names only, with values left blank.

**Inference.** Two new names are needed, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, added to
`env.d.ts` as optional (`?: string`) rather than required, to `.dev.vars.example` as blank names, and
to the real `.dev.vars` locally. Declaring them required would make `npm run typecheck` describe an
environment that CI does not have, and would invite code that assumes they are present. The secret
goes to the deployed Worker through `wrangler secret put`, matching the rule in `AGENTS.md`. The
client id is not secret but there is no reason to treat it differently; both read from `env` inside
the request, which is the only place Workers bindings exist.

**Evidence.** The Google provider's default scopes are exactly `email`, `profile`, `openid`
(`node_modules/@better-auth/core/src/social-providers/google.ts:172-176`), which is the minimal
identity set the brief asks for. No `scope` option is needed.

**Evidence.** The same provider sends `include_granted_scopes=true` by default
(`google.ts:191-193`); the option's own documentation comment says each OAuth flow should request
only its own scopes. Setting `includeGrantedScopes: false` narrows the request to the three identity
scopes.

**Evidence.** The authorization-code path verifies nothing locally beyond the transport: `getUserInfo`
calls `decodeJwt` on the id token returned by Google's token endpoint (`google.ts:238-245`). The
`jwtVerify` path with Google's JWKS applies only to the client-supplied id-token sign-in, which this
change does not use.

### 3. What a first Google login does, and what happens on an email collision

**Evidence.** `POST /api/auth/sign-in/social`
(`node_modules/better-auth/dist/api/routes/sign-in.mjs:116-235`) takes `provider`, optional
`callbackURL`, `errorCallbackURL`, `newUserCallbackURL` and `disableRedirect`, and returns
`{ url, redirect }` as JSON with a 200 while also setting a `Location` header. A `fetch` from the
client receives the JSON body, so the existing `request()` helper in `src/client/api.ts` can call it
and the client then navigates to `url` itself. No new dependency and no Better Auth client SDK is
required.

**Evidence.** When the named provider is not configured, the same endpoint answers 404 with
`PROVIDER_NOT_FOUND` (`sign-in.mjs:148-151`).

**Evidence.** `emailAndPassword.disableSignUp: true`, which `src/server/auth.ts` sets, does not block
social sign-up. The social path reads only `provider.disableSignUp` and `provider.disableImplicitSignUp`
(`sign-in.mjs:196`). A first Google login therefore creates a new `user` row and a new `account` row
with `providerId = 'google'`.

**Inference.** A new Google user owns no `subscriptions` rows, because every subscription carries
`user_id` and is created only through `POST /api/subscriptions`. The empty subscription space the
brief asks for is not a feature to build; it is what the existing ownership model already produces
for any new account. The isolation this needs is the isolation `tests/integration/` already proves
for two password accounts, extended to cover an OAuth-created one.

**Evidence.** The email-collision rule, from the installed version's linking code quoted in the
current documentation (`packages/better-auth/src/oauth2/link-account.ts`): implicit linking is
refused unless `accountLinking.enabled !== false`, `disableImplicitLinking !== true`, and either the
provider is trusted or the provider reports a verified email, and additionally
`requireLocalEmailVerified` (default `true`) is satisfied by the existing local user's own
`emailVerified`. Otherwise the result is `account not linked`.

**Evidence.** `account.accountLinking.enabled` defaults to `true` and `disableImplicitLinking`
defaults to `false` in this version's options reference.

**Evidence.** Seeded accounts are created through `auth.api.signUpEmail` (decision
`context/decisions/D-005-account-seeding.md`, and `tests/integration/accounts.ts:52-55`), which
leaves `emailVerified` at the `0` default set in `migrations/0001_auth.sql:6`.

**Inference, and the recommendation.** Today a Google sign-in as `owner@example.com` would be refused
with `account_not_linked`, because the local account is unverified and `requireLocalEmailVerified`
defaults to true. That is the right outcome for the wrong reason: it depends on a column value that a
future seeding change, an email-verification feature or an `overrideUserInfoOnSignIn` setting could
flip, after which the same sign-in would silently take over the demo account and all its data. The
brief's rule should be expressed as configuration, not inherited from a default:
`account: { accountLinking: { disableImplicitLinking: true } }`, with `google` deliberately absent
from `trustedProviders`. That rejects a same-email Google sign-in outright with `account_not_linked`,
still lets a genuinely new Google identity sign up, and leaves an explicit `linkSocial()` path
available later if linking is ever wanted from a settings screen. This is drafted as
`context/decisions/D-013-google-account-linking.md`.

### 4. Failure paths the login screen must be able to show

**Evidence.** Errors during the redirect leg are delivered as a browser redirect, not as a JSON
response. `node_modules/better-auth/dist/oauth2/errors.ts` (`redirectOnError`) appends
`?error=<code>` and optionally `&error_description=<msg>` to the caller's `errorCallbackURL` and
issues a 302. The callback route recovers that URL from the parsed state, so an `errorCallbackURL`
sent on the original `sign-in/social` call is what governs where a failure two hops later lands.

**Evidence.** Without an `errorCallbackURL`, the fallback is `defaultErrorURL`, which is
`onAPIError?.errorURL || ${baseURL}/error` (`node_modules/better-auth/dist/api/routes/callback.mjs:37`).
This application sets no `onAPIError`, so that resolves to `/api/auth/error`, a library-rendered page
rather than this app's login screen.

**Evidence, correcting an inference this section first drew the other way.** `errorCallbackURL` is
stored inside the OAuth state and recovered by `parseState`
(`node_modules/better-auth/dist/oauth2/state.mjs:27` and `:46-63`), so it can only govern a failure
that happens once the state has parsed. When the state is the thing that failed there is nothing to
recover it from. A callback carrying no `state` at all redirects to `defaultErrorURL` with
`error=state_not_found` (`callback.mjs:74-77`); under the database state strategy this application
runs, a fabricated, replayed or expired state finds no verification row and throws `state_mismatch`
with no `errorURL` attached (`node_modules/better-auth/dist/state.mjs:119-123`); under the cookie
strategy a missing cookie throws `state_mismatch` and a decryption failure throws `state_invalid`,
both likewise without one (`:96-111`). Only the security-mismatch and expiry throws carry
`parsedData.errorURL`, and both of those need the state to have parsed first.

**Inference.** The client must send `errorCallbackURL` on every call, which covers a denied consent, a
failed exchange and a refused link. It does not cover a state failure, so the server must also set
`onAPIError: { errorURL: '/' }`, which is what `defaultErrorURL` reads. A root-relative value is
supported: `appendQueryParams` appends the query to a `/` path without resolving it against an origin
(`node_modules/@better-auth/core/dist/utils/url.mjs:40-49`), so one value is correct on all three
origins. Without both settings, three of the error codes this section lists below end on a page that
has none of the redesign's styling. This correction comes from the plan review, finding F1.

**Evidence.** State failures are classified in `node_modules/better-auth/dist/oauth2/state.mjs:45-60`:
`state_not_found`, `state_invalid` and `state_mismatch` are forwarded to the user, the internal
`state_security_mismatch` is collapsed to `state_mismatch` so nothing is leaked, and anything
unexpected becomes `internal_server_error`. All of these are safe to show; full details go only to
the log.

**Inference.** The distinct outcomes the login screen has to be able to render are:

1. Consent denied at Google. Google redirects back to the callback with `error=access_denied`, which
   the callback forwards to the error URL. Not an error in any real sense; the user changed their
   mind.
2. State not found, invalid or mismatched, typically a stale or reused authorization link, or a
   session that took longer than the ten minute state expiry set in
   `node_modules/better-auth/dist/oauth2/state.mjs:30`.
3. A failed token exchange or a missing code, surfaced as a generic failure.
4. A same-email collision refused by the linking rule, arriving as `account_not_linked`.
5. Google not configured on this deployment, which under the recommendation below never reaches a
   click because the affordance is not rendered.
6. The network failing before the redirect even starts, which is the existing `CONNECTION_FAILURE`
   case that `src/client/screens/Login.tsx` already handles for password sign-in.

**Unknown.** Which of these get distinct copy and which collapse into one line is a design decision,
not a research finding. It is listed in `frame.md`.

### 5. Degrading when the provider is not configured

**Evidence.** `createAuth` is called per request (`src/server/routes/auth.ts:14`) precisely because
bindings only exist inside a request in this runtime, which is the same reason D-005 gives for the
seed route's in-handler gates. A provider can therefore be added to `socialProviders` conditionally
on the presence of `env.GOOGLE_CLIENT_ID` and `env.GOOGLE_CLIENT_SECRET` without any module-scope
branch.

**Evidence.** The provider itself throws `CLIENT_ID_AND_SECRET_REQUIRED` when either value is absent
(`google.ts:165-170`), so registering it unconditionally with empty strings would turn every click
into a server error.

**Evidence.** The login screen is the one screen rendered with no session, and `/api/me` returns 401
when signed out (`src/server/routes/auth.ts:31-33`). There is no existing unauthenticated endpoint
that carries configuration; `/api/health` returns `{ ok: true }` and nothing else
(`src/server/index.ts:14`).

**Inference.** A small unauthenticated read is needed, for example `GET /api/auth-config` returning
`{ google: boolean }`, computed from the presence of both environment values. It must expose
presence only and never the client id itself, which keeps the endpoint uninteresting to an attacker
and keeps the response identical in shape whether or not the provider is configured. The client
reads it once while the login screen mounts and renders the affordance only when it is true. With
that, `vitest.integration.config.ts` needs no Google values for the existing suite to pass, and the
CI run in `.github/workflows/ci.yml`, which has no secrets at all, stays green.

**Unknown.** Whether the boolean should also be surfaced somewhere else later, for instance to warn
an operator that the deployed Worker is missing a secret, is out of scope here.

### 6. Workers-specific constraints

**Evidence.** `wrangler.jsonc` sets `compatibility_flags: ["nodejs_compat"]` for
`AsyncLocalStorage`, per D-001, and pins a `compatibility_date` held at the newest value the test
pool's runtime accepts, because raising it breaks the integration suite. Nothing in this change needs
a newer one, so that line is not touched.

**Evidence.** The code paths this change adds use `generateRandomString`
(`node_modules/better-auth/dist/crypto/random.mjs`) for the PKCE verifier and state, `jose` for
`decodeJwt`, and `betterFetch` for the token exchange. None of them is a Node-only crypto API, and
the shipped password sign-in already exercises the library's crypto on this runtime.

**Evidence.** `trustedOrigins` is built in `src/server/auth.ts` from the comma-separated
`APP_ORIGINS`, and the existing integration test asserts a sign-in from an unlisted `Origin` header
is refused with `INVALID_ORIGIN` (`tests/integration/auth.test.ts`). The social sign-in call is a
`POST` from the client and carries an `Origin`, so it is covered by the same check. The Google
callback is a top-level `GET` navigation initiated by Google and carries no `Origin` header; its
integrity comes from the stored `state` and the PKCE verifier, not from the origin check.

**Evidence.** The session cookie is configured with `sameSite: 'lax'`, `httpOnly: true` and
`secure` unless `COOKIE_SECURE === 'false'` (`src/server/auth.ts`). `SameSite=Lax` permits the cookie
to be set on a top-level `GET` navigation, which is exactly the shape of the Google callback.

**Inference.** No cookie attribute needs to change. This is worth recording because `SameSite=Strict`
would have broken the callback, and a future tightening of that attribute would break Google sign-in
without breaking password sign-in, so the test suite should pin the behaviour rather than the
attribute.

**Evidence.** Rate limiting is database backed with a global window of 60 seconds and a maximum of
10, plus a custom rule for `/sign-in/email` (`src/server/auth.ts`). `/sign-in/social` and
`/callback/google` fall under the global rule.

**Inference.** Ten requests per minute per client address is ample for an interactive OAuth flow, but
the limiter is keyed on `cf-connecting-ip` and the integration database is never reset between test
files (`tests/integration/accounts.ts`), so any new test that drives the social endpoint repeatedly
must take its own client-address prefix from that file's allocation comment, or it will read as a
flaky failure rather than as a throttle.

### 7. What the login screen and its design already commit to

**Evidence.** `src/client/screens/Login.tsx` renders a `<main className="login">` containing one
block with the wordmark, a subtitle, a `FormAlert`, two `Field` inputs and one primary submit. It
focuses the email field on every distinct failure, tracked by an incrementing `attempt` counter so a
repeated failure still moves focus. The submit button stays focusable and announces `aria-disabled`
and `aria-busy` rather than becoming disabled.

**Evidence.** `context/changes/visual-redesign/design-spec.md` section 4.1 fixes the login block at
360px wide, full width below 640px, placed at 20vh, left aligned inside a centred block, and states
explicitly "No link to anything else; there is no registration." Section 4.2 specifies a session
loading screen. Section 3.8 governs the error line and section 3.3 the submitting state. The
certification screenshot list at line 707 includes "Login idle, submitting, 401 error".

**Inference.** Adding a provider button contradicts the "no link to anything else" line as written,
so the design delta has to amend section 4.1 rather than sit beside it, and the screenshot list needs
a Google row. Both are the designer's to decide; they are recorded here so the plan does not miss
them.

**Evidence.** No test in this repository reads client markup. `vitest.unit.config.ts` includes only
`src/**/*.test.ts` and `vitest.integration.config.ts` only `tests/integration/**/*.test.ts`. The
login screen can gain an affordance with no test churn.

### 8. Tests to extend

**Evidence.** `tests/integration/auth.test.ts` currently covers sign-in success and cookie issue,
`/api/me` agreement with `get-session`, 401 without a cookie, a wrong password, sign-out
invalidation, a forced expiry, the sign-up refusal, the cross-origin refusal, and the per-address
throttle. `src/server/auth.test.ts` covers `createAuth` failing closed on a missing secret or
unusable `APP_ORIGINS`.

**Inference.** The extensions that are honest, in the sense that they assert something a mock cannot
fake:

- `src/server/auth.test.ts`: `createAuth` registers no `google` provider when either Google value is
  absent, and registers it when both are present. This is a pure options assertion and needs no
  bindings, matching the file's existing shape.
- Integration, provider absent: `POST /api/auth/sign-in/social` with `provider: 'google'` answers
  404 while the configuration endpoint answers `{ google: false }`, and every existing password test
  still passes. This is the state CI runs in.
- Integration, provider present: with Google values bound in a second pool configuration or by
  overriding the binding, the same call answers 200 with a `url` whose host is
  `accounts.google.com`, whose `redirect_uri` is `http://example.com/api/auth/callback/google`,
  whose `scope` is the three identity scopes, and which carries `state`, `code_challenge` and
  `code_challenge_method=S256`. Also assert a `verification` row now exists.
- Integration, invalid state: a `GET` to `/api/auth/callback/google` with a fabricated `state`
  redirects to the configured error URL with an `error` parameter and creates no session.
- Integration, isolation: a user row created directly with a `google` account row sees an empty
  subscription list and is refused the seeded owner's subscription with a 404, which is the existing
  cross-account assertion extended to an OAuth-shaped account.
- Integration, password login unaffected: the whole existing file passes unchanged with Google
  configured, which is the regression that matters most.

**Unknown.** Whether the "provider present" cases belong in the existing integration project with an
overridden binding or in a second Vitest project is an implementation choice for the plan. The
constraint is that the default `npm test` must pass with no Google values anywhere.

**The boundary, stated plainly.** None of the above proves that Google will authenticate anyone. The
consent screen, the authorization code and the token exchange are Google's, and the only evidence
that the integration works is the live roundtrip on the deployed origin that the brief already
requires: consent, landing signed in, seeing an empty subscription space, signing out, and signing in
again. A passing mock must never be reported as that.

## Code references

- `migrations/0001_auth.sql:29-45` - the `account` table and its `userId` index, complete for OAuth
- `migrations/0001_auth.sql:47-54` - the `verification` table, where OAuth state and PKCE live
- `src/server/auth.ts` - the per-request factory, `trustedOrigins`, cookie attributes, rate limits
- `src/server/routes/auth.ts:13-16` - the `/api/auth/*` catch-all that fixes the callback path
- `src/server/routes/auth.ts:31-45` - `/api/me`, 401 when signed out, hence no config can ride on it
- `src/server/index.ts:14` - `/api/health`, the only other unauthenticated route
- `src/client/api.ts` - the `request()` helper the social call can reuse unchanged
- `src/client/screens/Login.tsx` - the screen the affordance lands on
- `env.d.ts` - the hand-maintained binding declarations, where the two Google names go
- `.dev.vars.example` - the committed name-only list
- `tests/integration/accounts.ts` - the client-address prefix allocation a new test must respect
- `tests/integration/auth.test.ts` - the session suite to extend
- `vitest.integration.config.ts:16-24` - the test-only bindings, which deliberately carry no secret
- `node_modules/@better-auth/core/dist/db/get-tables.mjs:198-280` - the account model declaration
- `node_modules/@better-auth/core/src/social-providers/google.ts:149-245` - scopes, endpoints, profile
- `node_modules/better-auth/dist/oauth2/utils.mjs:28-31` - the callback path rule
- `node_modules/better-auth/dist/api/routes/sign-in.mjs:116-235` - the social sign-in endpoint
- `node_modules/better-auth/dist/oauth2/state.mjs:17-60` - state creation, expiry and error codes

## Architecture insights

The shape of this change is unusual in a useful way: almost everything it needs already exists. The
schema was written by hand from the library's own definitions, so it is complete; the handler is a
catch-all, so the route is already mounted; the auth instance is built per request, so a conditional
provider needs no new pattern; the ownership model already gives a new account nothing. What the
change actually adds is one provider block, one linking setting, one public boolean, one button and a
set of tests. The risk is concentrated not in the code but in two places outside it: the OAuth client
registration at Google, where a mismatched redirect URI fails at Google rather than here, and the
linking default, where doing nothing produces the right behaviour today for a reason that could stop
being true.

## Historical context

- `context/decisions/D-001-auth-solution.md` chose Better Auth and set the hand-maintained schema
  policy, which is why no migration is needed now and why any future Better Auth upgrade means
  re-reading the core table definitions by hand.
- `context/decisions/D-005-account-seeding.md` established that a route cannot be registered
  conditionally on a variable in this runtime, and that gates belong inside handlers. The conditional
  provider registration follows the same rule for the same reason.
- `context/decisions/D-010-live-demo-data-and-reviewer-access.md` records that `reviewer@example.com`
  is deliberately empty as the isolation demonstration. A Google-created account is a second, more
  convincing instance of the same demonstration, and the live pass can say so.
- `context/changes/visual-redesign/design-spec.md` section 4.1 is the login screen this change
  amends, and its section 4.2, 3.3 and 3.8 govern the loading and error states any new affordance
  must match.
- `context/checkpoints/g02-oauth-provision.md` verified the auth base path, the default callback
  path, the pinned library version, the three origins and the gcloud account state before this
  research began.
- `context/decisions/D-012-google-oauth-provisioning.md` landed alongside this research and agrees
  with it on every overlapping fact: the callback contract `<origin>/api/auth/callback/google`, the
  same three origins, the scope set `openid`, `email`, `profile`, and the environment names
  `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. It adds one constraint this research did not reach:
  the consent screen's audience is External and deliberately kept in Testing, so sign-in is limited
  to explicitly listed test users and Google's verification is avoided. The live roundtrip therefore
  needs the authorized account on that test-user list, and no artifact may claim that public Google
  login works while the audience stays in Testing. D-012 also records that the Web client and the
  credentials do not exist yet, which is why open question 2 below remains open.

## Open questions

1. Whether all six migrations are applied to the remote D1 database. Expected yes from D-010;
   confirm rather than assume before the live pass.
2. Whether the OAuth consent screen's publishing status and test-user list allow the authorized
   account to complete consent. D-012 fixes the audience as External in Testing and records that the
   Web client and credentials are not yet created, so this is provisioning (G02), not
   implementation, and it gates the live pass.
3. Whether the "provider present" integration cases run in the existing Vitest project with an
   overridden binding or in a second project. An implementation choice for the plan.
4. Every design question in `frame.md`. None of them is answered here.
