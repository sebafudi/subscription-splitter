# Frame Brief: Google sign-in

> Framing step before the design delta and /10x-plan. This document captures what is *actually* at
> issue, separated from what was initially assumed. It contains no design decisions: the questions it
> raises are listed for the designer to answer, not answered here.

## Reported observation

From `context/foundation/google-sign-in-brief.md` and roadmap S-07: the shipped app authenticates
only with an email address and a password, against two accounts that exist because a gated seed route
created them. There is no sign-up and no other way in. The request is to add "Continue with Google"
through the existing Better Auth integration, keeping password login intact, so that a person who is
neither the organizer nor a course reviewer can get an account of their own.

The literal observable: `src/client/screens/Login.tsx` offers exactly two inputs and one button, and
`src/server/auth.ts` configures exactly one authentication method, `emailAndPassword`, with
`disableSignUp` set to true.

## Initial framing (preserved)

- **Stated cause or approach**: the app never had a second authentication provider; the fix is to add
  the Google provider that Better Auth already ships, register an OAuth client in a dedicated Google
  Cloud project, and put a button on the login screen. Fable 5.1 owns the button's placement,
  appearance and every interaction, error and loading decision; Opus and Sonnet implement.
- **Proposed direction**: run the full change flow on this existing app - `10x-new`, `10x-research`,
  `10x-frame`, the Fable design delta, `10x-plan`, independent plan review, phased implementation,
  implementation review, Fable visual acceptance, a live Google roundtrip, archive.
- **Pre-dispatch narrowing**: no user round was available for this change, so the narrowing was taken
  from the brief, which is unusually specific. It fixes as decided: a first Google login creates a
  separate account with its own empty subscription space; a Google identity is never mapped to
  `owner@example.com` and never inherits demo data; scopes stay minimal at `openid`, `email`,
  `profile`; password login and resource ownership are preserved exactly. It leaves genuinely open
  only two things: what the installed Better Auth version does when a Google email matches an
  existing password account, which the brief asks to be researched and explicitly decided, and every
  visual and interaction question on the login screen, which it assigns to the designer.

## Dimension map

If adding Google sign-in goes wrong here, the failure could originate at any of these. Research read
the migrations, the auth factory, the mounted handler, the client, the test configuration and the
installed `better-auth@1.7.4` package to test each.

1. **Storage** - the `account` and `verification` rows an OAuth flow writes might not exist in a
   hand-maintained D1 schema, forcing a seventh migration onto a live database.
2. **Identity collision** - a Google identity might be joined to an existing password account, which
   is the one outcome the brief forbids.  <- the dimension the brief leaves open
3. **Configuration reachability** - the affordance might be un-hideable when no Google credential
   exists, breaking local runs and a CI job that has no secrets.
4. **Redirect integrity on Workers** - callback path, `trustedOrigins`, cookie `SameSite`, Node-only
   crypto, or the per-request auth factory might not survive a top-level redirect back from Google.
5. **Design contradiction** - the accepted redesign's login section says in so many words that there
   is no link to anything else, so a new affordance may contradict a specification that has already
   passed review.
6. **Evidence honesty** - the flow might be declared working on the strength of tests that never
   reach Google.

## Hypothesis investigation

| Hypothesis | Evidence | Verdict |
| --- | --- | --- |
| 1. Storage is missing and a migration is needed | `migrations/0001_auth.sql:29-54` carries every field the account model declares at `@better-auth/core/dist/db/get-tables.mjs:198-280`, plus `verification` where `state.mjs:83` and `:121` show OAuth state and PKCE are stored | NONE |
| 2. A Google email matching a password account gets linked | `accountLinking.enabled` defaults true and `disableImplicitLinking` defaults false; linking is blocked today only because `requireLocalEmailVerified` defaults true and seeded users keep `emailVerified = 0` from `migrations/0001_auth.sql:6` and `tests/integration/accounts.ts:52-55` | WEAK today, STRONG as a latent risk |
| 3. The button cannot be hidden without credentials | `/api/me` answers 401 signed out (`src/server/routes/auth.ts:31-33`), `/api/health` carries nothing (`src/server/index.ts:14`), and the provider throws `CLIENT_ID_AND_SECRET_REQUIRED` when registered empty (`google.ts:165-170`); but `createAuth` is already per-request, so a conditional provider needs no new pattern | WEAK, and answered by one new public read |
| 4. The redirect leg breaks on Workers | callback path is `${baseURL}/callback/google` (`oauth2/utils.mjs:28-31`) under an existing `/api/auth/*` catch-all; cookie is `SameSite=Lax`, which a top-level callback navigation allows; state and PKCE use `generateRandomString` and `jose`, no Node crypto; the callback carries no `Origin` and is protected by stored state instead | NONE |
| 5. The design specification is contradicted | `context/changes/visual-redesign/design-spec.md:366-382` fixes the login block and states "No link to anything else; there is no registration", and its screenshot list at line 707 names only idle, submitting and 401 | STRONG |
| 6. Mocked tests get presented as proof | nothing in the repository can reach `accounts.google.com`; every assertion available stops at the authorize URL | STRONG as a process risk |

## Narrowing signals

- The schema question, which looked like the largest risk, is settled by a decision made three
  changes ago: D-001 chose to hand-maintain Better Auth's core tables because the generator needs a
  live connection D1 cannot give. That work already paid for this change.
- The collision question inverts on inspection. The dangerous reading was "the library will link the
  accounts". The accurate reading is "the library will refuse today, for a reason nobody chose". A
  seeding change, an email-verification feature or an `overrideUserInfoOnSignIn` setting would each
  silently turn the refusal into a takeover of the demo account.
- The configuration question is not about OAuth at all. It is that this app has no unauthenticated
  endpoint carrying anything, because until now the login screen needed nothing from the server.
- No test reads client markup anywhere in the repository, so the design delta is free to move the
  login screen's markup without test churn. The constraint on the designer is the specification, not
  the suite.

## Cross-system convention

Adding a social provider to an app that already has password login is ordinary, and the usual
handling is the one the library defaults to: match on verified email, link silently, one user, two
accounts. This project is the case where the convention is wrong. Its two accounts are a seeded demo
account holding the certification data and a deliberately empty reviewer account that exists to prove
isolation (`context/decisions/D-010-live-demo-data-and-reviewer-access.md`). Silently linking a
Google identity to either would destroy the thing they were created to demonstrate. So the leading
hypothesis deliberately departs from convention, and the departure is worth a decision record rather
than a configuration line nobody can find later.

## Reframed problem statement

> **The actual problem to plan around is**: not how to add an OAuth provider, which this codebase is
> already shaped for, but how to make the separation between a Google identity and the seeded
> accounts an explicit, tested rule rather than an accident of two defaults, and how to give the
> login screen an affordance that can be absent when no credential exists.

The original framing held for the mechanism and understated the risk. Adding the provider is a small
amount of code: one conditional block in `createAuth`, one public boolean endpoint, one client call
that reuses the existing `request()` helper, and a button. What deserves the planning attention is
the linking rule, because doing nothing produces the correct behaviour today for a reason that is not
a decision, and the configuration read, because without it the affordance cannot degrade and CI has
no secrets.

If this is addressed, the change ships with the brief's product rule written down as
`account.accountLinking.disableImplicitLinking: true`, asserted by a test, and recorded as
`context/decisions/D-013-google-account-linking.md`, instead of resting on `emailVerified = 0`.

## Confidence

**HIGH** - the schema, callback path, scopes, error codes and linking logic were each read in the
installed package or the current documentation with file references, and the departure from
convention is justified by a decision already recorded in this project.

## Product decisions already fixed by the brief

These are not open. The designer and the planner inherit them.

- A first Google login creates a separate account with its own empty subscription space.
- A Google identity is never mapped to `owner@example.com` and never inherits demo data.
- Password login for the seeded demo and reviewer accounts keeps working unchanged.
- Scopes are `openid`, `email`, `profile` and nothing else. No Gmail, Drive or cloud-platform scope.
- The client secret lives only in an ignored local file and in Cloudflare secrets, never in a bundle,
  screenshot, log, commit or status file.
- Existing resource ownership and session behaviour are preserved exactly.
- Verified-email linking is to be explicitly decided rather than inherited. Research recommends
  refusing implicit linking; see `context/decisions/D-013-google-account-linking.md`, proposed.
- The flow is proven by a real consent roundtrip on the deployed origin, not by mocks.
- Nothing is uploaded to the course without the user's explicit confirmation.

## Design decisions for Fable

Research deliberately answers none of these. Each one changes what implementers build.

1. **Amending section 4.1.** The accepted specification says "No link to anything else; there is no
   registration." A provider button contradicts that sentence as written. Does 4.1 get amended in
   place, and what replaces that line?
2. **Placement and order.** Above the email and password fields, below the submit button, or beside
   them. Whether a divider separates the two methods and what it says, if anything.
3. **Appearance.** Google's sign-in branding requirements set constraints on the mark, the wording
   and the button's minimum treatment. How those reconcile with the redesign's own button styles,
   tokens and the `--ground` and `--paper` palette, and whether the button reads as primary,
   secondary or quiet next to the existing primary submit.
4. **Loading and redirect state.** Between the click and the browser leaving for Google there is a
   network call. What the button shows during it, whether the password form is disabled meanwhile,
   whether the existing `aria-busy` and `aria-disabled` convention from 3.3 applies unchanged, and
   what the user sees for the moment after returning from Google before the session resolves. Section
   4.2 already specifies a session loading screen; whether the return leg reuses it is a decision.
5. **Error copy and placement.** Whether the outcomes in research section 4 get distinct copy or
   collapse. Specifically: consent denied at Google, which is not a failure; a stale or invalid
   state; a failed token exchange; and `account_not_linked` when a Google email matches a seeded
   account. That last one is the hardest sentence in the change, because it must be truthful without
   confirming to a stranger that an account with that address exists. Also whether these share the
   existing `FormAlert` line above the fields or sit near the Google button, and whether focus moves
   the way a password failure moves it today.
6. **Onboarding hint for a Google-created account.** A new Google user lands on an empty subscription
   list. Whether that empty state says anything different from the existing one, or nothing at all.
7. **Mobile layout.** How the affordance behaves in the 360px block and at full width below 640px,
   and whether the stacking order changes.
8. **Absent affordance.** When the deployment has no Google credential, the button is not rendered.
   Whether anything at all marks its absence, and whether the layout shifts.
9. **Certification screenshots.** The list at design-spec line 707 names login idle, submitting and
   401. Which Google states join it.

## References

- Research: `context/changes/google-sign-in/research.md`
- Brief: `context/foundation/google-sign-in-brief.md`
- Proposed decision: `context/decisions/D-013-google-account-linking.md`
- Login screen: `src/client/screens/Login.tsx`; auth factory: `src/server/auth.ts`
- Design specification: `context/changes/visual-redesign/design-spec.md` sections 3.3, 3.8, 4.1, 4.2
- Prior decisions: `context/decisions/D-001-auth-solution.md`,
  `context/decisions/D-005-account-seeding.md`,
  `context/decisions/D-010-live-demo-data-and-reviewer-access.md`
- Provisioning facts: `context/checkpoints/g02-oauth-provision.md`
