# D-013: Whether a Google identity may join an existing password account

**Status: accepted.** Proposed by the `google-sign-in` research and framing step and ruled on by
the designer in `context/changes/google-sign-in/design-delta.md`, under "Ruling on D-013 (account
linking)", which reads in full:

> Accepted as recommended by the research: `disableImplicitLinking: true`, `google` not in
> `trustedProviders`. A Google identity whose email matches an existing password account is refused
> with `account_not_linked`. A Google identity with a new email creates its own account and its own
> empty ledger, never touching the seeded demo owner. Manual linking from inside the app is out of
> scope for S-07. Rationale: the seeded accounts are reviewer and demo credentials whose ownership
> must stay provable; a refusal is reversible, an unintended merge is not.

The ruling accepts the proposal below unchanged. It adds one operative constraint: the refusal copy
is fixed by the same delta as "This Google account cannot be used here. Sign in with your email and
password instead.", identical whatever the reason for the refusal, so it confirms nothing about
whether an account with that address exists. Manual linking stays out of scope for roadmap S-07.

- **Decision:** Google sign-in never joins an existing account implicitly. `createAuth` sets
  `account: { accountLinking: { disableImplicitLinking: true } }`, and `google` is deliberately
  absent from `trustedProviders`. A Google identity whose email matches no existing user creates a
  new `user` row and a new `account` row with `providerId = 'google'`, and that account owns nothing,
  which is the empty subscription space the change brief asks for. A Google identity whose email
  matches an existing user is refused with the library's `account_not_linked` error and no session is
  created, whatever the verification state of either side. The Google provider is registered only
  when both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are present in the request's environment,
  so a deployment or a test run without them offers no Google path at all. Linking a provider to an
  account that already exists remains possible later through the library's explicit `linkSocial()`
  call from an authenticated session, which this change does not build.
- **Rationale:** The installed version, `better-auth@1.7.4`, defaults `accountLinking.enabled` to
  true and `disableImplicitLinking` to false, so its out-of-the-box behaviour is to link a social
  identity onto an existing user when the provider reports a verified email and the local user is
  itself verified. That default is right for most products and wrong for this one. The two accounts
  this app has are a seeded demo account holding every record a course reviewer looks at and a
  deliberately empty reviewer account whose emptiness is the ownership-isolation demonstration
  (decision D-010). A Google identity silently absorbed into either destroys what they exist to
  show. The change brief states the rule directly: a first Google login creates a separate account
  with its own empty space and is never mapped to `owner@example.com`.

  The setting is needed even though the refusal already happens. Seeded accounts are created through
  `auth.api.signUpEmail` (decision D-005), which leaves `emailVerified` at the `0` default in
  `migrations/0001_auth.sql`, and the library's `requireLocalEmailVerified` defaults to true, so a
  same-email Google sign-in is refused today. That is the correct outcome resting on a column value
  nobody chose for this purpose. Adding email verification, changing the seeding path, or setting
  `overrideUserInfoOnSignIn` would each flip it, and the failure mode is not a broken build but a
  stranger holding the demo account. Writing the rule as configuration makes it survive those
  changes and makes it assertable by a test.
- **Rejected alternative:** Leaving the library's default and relying on `requireLocalEmailVerified`,
  rejected above: correct behaviour with no decision behind it and nothing preventing a later change
  from reversing it silently. Adding `google` to `trustedProviders`, rejected outright: it links on
  the provider's say-so without even requiring the provider's verified-email signal, which is the
  documented account-takeover risk. Enabling implicit linking but restricting it to accounts other
  than the two seeded ones, rejected as a special case that encodes fixture identities into
  production configuration and would have to be maintained as fixtures change. Blocking Google
  sign-up entirely for any email that already exists as a password account by checking before the
  redirect, rejected because it would confirm to an unauthenticated stranger which email addresses
  have accounts, which the library's post-consent refusal does not.
- **Review objection:** Refusing the link is a worse experience for the one person it affects: an
  organizer who already signs in with a password and whose Google address happens to match now gets
  an error instead of a convenience, and the error cannot say very much without leaking that an
  account with that address exists. A second objection is that this defers rather than answers the
  linking question, since a real product would eventually want a settings screen offering it.
- **Resolution:** Both are accepted as costs. The affected population is one seeded demo account on a
  certification deployment, and the alternative cost is the loss of the isolation demonstration, so
  the trade is not close. The error copy is a design decision listed in
  `context/changes/google-sign-in/frame.md`, with the explicit constraint that it must be truthful
  without confirming the existence of an account. The deferral is deliberate and cheap to reverse:
  `linkSocial()` stays available, and turning implicit linking back on later is one configuration
  line plus whatever verification story justifies it at the time.
- **Affected tests:** To be added with the change. A unit case in `src/server/auth.test.ts` asserting
  that `createAuth` registers no `google` provider when either Google value is absent and registers
  it when both are present, and that implicit linking is disabled in the resolved options. An
  integration case asserting that a `user` created through a `google` account row sees an empty
  subscription list and is answered 404 for the seeded owner's subscription, which extends the
  existing cross-account assertions in `tests/integration/` to an OAuth-shaped account. The existing
  `tests/integration/auth.test.ts` must pass unchanged both with and without Google configured.
- **Commit:** accepted at planning time for change `google-sign-in`; the configuration and the tests
  that assert it land with that change's phase 1 and phase 3.
