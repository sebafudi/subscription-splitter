# Google sign-in - plan brief

> Full plan: `context/archive/google-sign-in/plan.md`
> Design authority: `context/archive/google-sign-in/design-delta.md`
> Frame: `context/archive/google-sign-in/frame.md`
> Research: `context/archive/google-sign-in/research.md`

## What and why

Add "Continue with Google" to the login screen through the Better Auth integration that is already
mounted, keeping password sign-in for the seeded demo and reviewer accounts exactly as it is, so that
someone who is neither the organizer nor a course reviewer can get an account of their own. Roadmap
item S-07. The design delta is the authority for everything the screen shows and rules on decision
D-013; the research is the authority for what the installed `better-auth@1.7.4` does.

## Starting point

One authentication method, two seeded accounts, no sign-up and no other way in. `src/server/auth.ts`
configures `emailAndPassword` with `disableSignUp` true and has no `socialProviders` and no `account`
block. `src/server/routes/auth.ts` mounts the library handler at `/api/auth/*` and adds `/api/me`,
which answers 401 signed out; `/api/health` carries nothing. Those two are the only unauthenticated
surfaces, so the login screen has nowhere to learn whether Google is configured. `src/client/App.tsx`
boots with one `getMe()` call behind the session loading screen. `src/client/screens/Login.tsx` renders
two fields and one primary button. No test in the repository reads client markup, and the continuous
integration job holds no secret of any kind.

## Desired end state

A deployment carrying Google credentials shows a second button in the login screen's action row: the
quiet variant, Google's unmodified four-colour mark at 18px, the label "Continue with Google", beside
the primary at 640px and above and stacked under it below. A first Google identity comes back signed in
to a new account with an empty ledger. A Google identity whose email matches an existing password
account comes back refused with one sentence that confirms nothing about whether such an account
exists. Cancelling, a stale link and any other failure each get their own sentence, all in the existing
alert position, all taking focus, all leaving a clean URL. A deployment carrying no credentials shows
exactly today's login screen, with nothing marking the absence, and registers no provider at all.

## Key decisions made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Account linking | `disableImplicitLinking: true`, `google` absent from `trustedProviders`; a same-email Google sign-in is refused with `account_not_linked` | The seeded accounts are demo and reviewer credentials whose ownership must stay provable; a refusal is reversible, an unintended merge is not | Design delta, D-013 |
| Manual linking | Out of scope for S-07; `linkSocial()` stays available for a later change | Nothing in this change builds an authenticated settings surface to offer it from | Design delta |
| Knowing whether Google is configured | One unauthenticated read, `GET /api/auth-config`, returning `{ google: boolean }` and never the client id | `/api/me` is 401 signed out and `/api/health` carries nothing; reading a 404 from the sign-in call would only tell the user after they click | Research 5 |
| Provider registration | Conditional on both environment values, inside the per-request factory; no `socialProviders` key at all when either is absent | The provider throws `CLIENT_ID_AND_SECRET_REQUIRED` on an empty value, so empty strings would make every click a server error | Research 5 |
| Environment typings | `GOOGLE_CLIENT_ID?` and `GOOGLE_CLIENT_SECRET?`, optional | Required names would make typecheck describe an environment continuous integration does not have | Research 2 |
| Scopes | The provider's three defaults, `openid`, `email`, `profile`, with `includeGrantedScopes: false` and no `scope` option | Minimal identity set fixed by D-012; the option's own documentation says each flow should request only its own scopes | Research 2, D-012 |
| Affordance | One more button in the existing action row, existing quiet variant, no divider, no "or", no card, no new colour token | Google is a second door into the same room, not a feature; the hierarchy in 3.3 already says the filled primary is the default | Design delta |
| The mark | Google's unmodified asset in its own colours in both themes, exempt from the palette, never recoloured even while disabled | Google's branding requirement, and the delta states the exemption so it does not read as an oversight | Design delta |
| Error handling | `errorCallbackURL` sent on every call **and** `onAPIError: { errorURL: '/' }` set on the server; four sentences mapped from the `error` code; `error_description` never shown; `history.replaceState` drops the whole query afterwards | `errorCallbackURL` lives inside the OAuth state, so it governs only failures that happen after the state parses; a missing, fabricated or expired state has nothing to recover it from and falls back to the library's own unstyled error page unless the server sets one | Research 4, plan review F1, design delta |
| A social call that answers an HTTP error | The did-not-finish sentence as an alert, not the connection sentence; the connection sentence is reserved for a request that never reached the server | Designer's ruling in the delta; `ApiError` and `SignedOutError` are the two things `request()` throws for a response that arrived, so the test is mechanical | Design delta, plan review F3 |
| The connection sentence's constant | A new `GOOGLE_CONNECTION_FAILURE` in `googleErrors.ts`; the existing `CONNECTION_FAILURE` is never reused | Their texts differ, "Could not reach Google" against "Could not save", the existing one is in scope in the file being edited, and no test in this repository reads client markup | Plan review F6 |
| `GOOGLE_CLIENT_ID` on Cloudflare | A `wrangler secret`, not a `wrangler.jsonc` var, even though the id is public | The integration pool loads `wrangler.jsonc`, so a var would bind the id into every test run; the no-credential-in-the-diff guard stays mechanical; one mechanism for a matched pair | Plan, plan review F5 |
| Cancellation | A status line in `--ink-soft` with no red rule, not an alert | The user changed their mind; it is not a failure | Design delta |
| The return leg | Reuses the 4.2 session loading screen unchanged, with the configuration read running in parallel with the session read | The login screen then paints with its final action row and never shifts | Design delta |
| Onboarding | Nothing added; the existing Home empty state is already the invitation | A Google-created account is an ordinary new account | Design delta |
| Migration | None | The hand-maintained schema already carries every account and verification column the provider writes | Research 1 |
| Test bindings | Provider-present cases override the bindings inside the existing integration project, with a second Vitest project as a named fallback | `npm test` and the continuous integration job must pass with no Google value anywhere, and that constraint decides it | Research 8 |
| Phase order | Server, client, tests, verification, with the two pure-options assertions pulled into phase 1 | The accepted linking rule should not sit unasserted across two phases | Plan |

## Scope

**In scope:** `src/server/auth.ts`, `src/server/routes/auth.ts`, `env.d.ts`, `.dev.vars.example`,
`src/client/api.ts`, `src/client/App.tsx`, `src/client/screens/Login.tsx`, `src/client/index.css`, two
new client modules for the mark and the error mapping, `src/server/auth.test.ts`, one new unit test,
one new integration test, the prefix allocation comment in `tests/integration/accounts.ts`, and
evidence files under `evidence/screenshots/`.

**Out of scope:** manual account linking; any second provider; any Gmail, Drive or `cloud-platform`
scope; any migration or schema change; anything under `src/domain/`; any other route; any new
dependency, including the Better Auth client SDK; the cookie attributes, `trustedOrigins`, the rate
limit rules and the compatibility date; email verification; the deployment, the Cloudflare secrets, the
certification screenshot refresh and the live Google roundtrip, which are goal G05; and
`context/STATUS.md`, `evidence/index.md` and the workspace goals file.

## Approach

Four phases. Phase 1 is the server alone: the conditional provider, the linking rule, the
configuration endpoint, the two optional environment names, and three pure-options unit assertions that
need no bindings. Phase 2 is the login screen: the two client calls, both reads running in parallel
behind the unchanged loading screen, the action row, the busy state, the error mapping and the URL
cleanup. Phase 3 is the tests that need a running Worker: provider toggling, the authorize URL and its
persisted state, a fabricated-state callback that must land on the app root with `error=state_mismatch`
rather than on the library's error page, the refusal for a seeded email driven through the exported
`handleOAuthUserInfo` against the real database, isolation for an OAuth-shaped account, and the
untouched password suite passing both with Google configured and without it. Phase 4
is a browser pass at 1280 and 390, in both themes, with the button present and absent.

Phases 1 and 3 are gated by commands. Phases 2 and 4 are gated by a browser, because no test here reads
client markup and a green suite proves nothing about a button.

## Phases at a glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. The server, the provider and the configuration read | Conditional Google provider, `disableImplicitLinking`, `onAPIError.errorURL`, `GET /api/auth-config`, two optional environment names, and the options assertions that pin D-013 and the error URL | The provider must be absent rather than empty, or every click becomes a server error instead of an absent button; and without the error URL the delta's expired-link sentence is unreachable |
| 2. The login screen | The action row per the delta, the mark, the busy state, the four sentences, focus and `history.replaceState`, and nothing at all when unconfigured | Appearance cannot fail a test, so every row here is a browser row |
| 3. The tests | Provider toggling, authorize URL and state, a fabricated-state callback landing on the app root, `account_not_linked` through `handleOAuthUserInfo`, OAuth-account isolation, the two start-failure sentences, and the password suite unchanged | The provider-present bindings must not make `npm test` need a secret, the new file must take its own rate-limiter prefix, and if the `handleOAuthUserInfo` context cannot be built in the pool the case is dropped rather than mocked |
| 4. The verification pass | Both widths, both themes, button present and absent, keyboard order, reduced motion, measured contrast, and the captures the delta's amended checklist names | A finding that would change a specified appearance is a design question, not a fix |

**Prerequisites:** none inside the repository. Every row is executable against `main` plus the local
`.dev.vars`.

**Size:** four phases, each landing on its own commit.

## Open risks and assumptions

- **The credentials exist locally and half remotely.** `context/checkpoints/g02-oauth-provision.md`
  records that the consent screen, audience, scopes and Web client were created, all three origins and
  their `/api/auth/callback/google` redirects registered, and both values written to the ignored local
  `.dev.vars`. `GOOGLE_CLIENT_SECRET` is now set on Cloudflare and appears in `wrangler secret list`;
  `GOOGLE_CLIENT_ID` is not, pending this plan's choice of binding, which is `wrangler secret put`. A
  deployment holding one value of the pair is indistinguishable from one holding neither, because both
  the provider block and the configuration endpoint are a Boolean AND of the two, so the half-state
  renders no button and registers no provider. That is a supported state, and it is exactly the state
  continuous integration runs in, so the rollback path is exercised continuously rather than believed.
  D-012's own "not yet created" line is superseded by that checkpoint and is completed when G02 closes.
- **The live roundtrip is the only thing local work cannot produce.** It needs
  `wrangler secret put GOOGLE_CLIENT_ID` with authorized Cloudflare credentials, then a deploy. It is
  goal G05, it is named in the plan as a manual gate, and it is deliberately not a Progress row. Its
  first step is one request confirming the deployed social call answers 200 rather than 403, because
  the deployed `APP_ORIGINS` is a secret this repository cannot read. The audience stays External in
  Testing, so no artifact may claim that public Google login works.
- **No mock proves Google authenticates anyone.** Every assertion available stops at the authorize URL.
  The boundary is written into phase 3's manual row and into the live gate.
- **One implementation choice is settled with a fallback rather than a certainty.** Provider-present
  integration cases override the bindings inside the existing Vitest project; if that override does not
  reach the Worker behind `SELF.fetch`, the fallback is a second Vitest project with its own secretless
  continuous integration step. Whichever lands is recorded in the phase 3 commit.
- **No design question is open.** The one this plan raised, an HTTP error from the social call after the
  configuration read said true, is ruled on in the delta: the did-not-finish sentence as an alert, with
  the connection sentence reserved for a request that never reached the server. The plan and its
  Progress rows carry the ruling.
- **Two facts about live systems are confirmed rather than assumed at G05.** That all six migrations
  are applied to the remote D1 database, read with `wrangler d1 migrations list --remote`; and that the
  three registered origins still match, since a mismatch fails at Google rather than here.

## Success criteria

- A configured deployment lets a new Google identity sign in to its own account with an empty ledger,
  refuses a Google identity whose email matches a seeded account, and renders each of the four outcomes
  exactly as the delta specifies at both widths in both themes.
- An unconfigured deployment is byte-for-byte today's product, and `npm test`, `npm run typecheck` and
  the continuous integration job all pass with no Google value anywhere.
- `tests/integration/auth.test.ts` is unchanged and passes both with Google configured and without it.
- No credential value appears in any repository file, status file, screenshot or log, and the client id
  never reaches the bundle.
