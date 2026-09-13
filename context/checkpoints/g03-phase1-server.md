# Checkpoint: g03-phase1-server (G03)

Phase 1 of change `google-sign-in` (roadmap S-07): the Worker side of Google sign-in, plus the tests
that need no browser. The login screen was untouched by this task; a sibling task landed phase 2 in
`cf3e3de` and `e6b3dab` while this ran.

## What landed

- `src/server/auth.ts`: the Google provider registered only when both `GOOGLE_CLIENT_ID` and
  `GOOGLE_CLIENT_SECRET` are present, with `includeGrantedScopes: false` and no `scope` option;
  `account.accountLinking.disableImplicitLinking` and `onAPIError.errorURL` set unconditionally;
  `trustedProviders` left unset; `trustedOrigins` and every other option unchanged.
- `src/server/routes/auth.ts`: `GET /api/auth-config`, unauthenticated, answering exactly
  `{ google: boolean }` from the Boolean AND of the two names.
- `env.d.ts` and `.dev.vars.example`: both names, optional and empty respectively.
- `src/server/auth.test.ts`: six pure options cases, no bindings.
- `tests/integration/google-auth.test.ts`: seven cases, taking the `10.8.0.x` address prefix now
  recorded in `tests/integration/accounts.ts`.
- `evidence/runs/google-sign-in-gates.txt`: a "Phase 1" section. The file was untracked in the tree
  and already carried the sibling's "Phase 2" section, which this task's commit therefore also
  brought into history.

Commits: `43f41f2` code and tests, `922a17a` the phase 1 Progress rows.

## Mechanical choices this task made, where the plan was silent

- **The integration pool binds `.dev.vars`.** The pool prints "Using secrets defined in .dev.vars",
  so on a developer's machine the real Google pair is bound into every integration run, while
  continuous integration has no such file and binds nothing. The plan's binding decision assumed the
  provider-absent cases would see no value. Rather than depend on the machine, each half of the new
  file sets the state it asserts and restores what it found: the absent half deletes both names, the
  present half writes two fabricated literals. Every case then means the same thing in both
  environments. The plan's fallback, a second Vitest project, was not needed: mutating `env` does
  reach the Worker behind `SELF.fetch`.
- **The plan's `grep -n "scope" src/server/auth.ts` guard cannot return nothing**, because the file
  already carried the phrase "module scope" in its opening comment before this change. The guard was
  read at its intent instead, `grep -n "scope:"`, which returns no match.
- **The unit cases swallow the adapter's initialisation rejection.** `createAuth` returns
  synchronously but starts adapter initialisation in a promise that the stub `DB` can never satisfy,
  and the unhandled rejection failed the unit run even with every assertion passing. `optionsFor`
  attaches a catch; the cases assert configuration, not connectivity.
- **The OAuth-shaped isolation case takes its session through the ordinary sign-in and then replaces
  the credential row with a `google` one.** A session cookie is signed by the Worker and cannot be
  fabricated from a test, so this is how a user whose only account row is social gets a live session.
  What the case asserts, the ownership model such a user sees, is unchanged.
- **`handleOAuthUserInfo` worked as the plan's Fix A described**, called with
  `{ context: await auth.$context }` inside the pool against the real D1. The fallback of dropping
  the case was not taken.

## Gates

Both runs are in `evidence/runs/google-sign-in-gates.txt` verbatim with exit codes. Run A removes
`.dev.vars` entirely, which is the continuous integration state; run B restores it, so the local pair
is bound. Typecheck, unit, integration and build all exited 0 in both: unit 18 files and 214 cases,
integration 12 files and 119 cases, each time. `tests/integration/auth.test.ts` is unchanged and
passes in both runs.

Rows 1.5 and 1.11 were read against a running Worker rather than the suite: configured, the
configuration read answers `{"google":true}` and the social call answers 200 with an
`accounts.google.com` authorize url; with only the two Google names removed from `.dev.vars` and
every other binding present, they answer `{"google":false}` and 404 `PROVIDER_NOT_FOUND`.

## Cloudflare

`GOOGLE_CLIENT_ID` was piped from the ignored `.dev.vars` into `wrangler secret put` without being
echoed, per the plan's decision to use a secret rather than a `wrangler.jsonc` var.
`npx wrangler secret list` now names `APP_ORIGINS`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET`. No deploy was run, so the deployed Worker still runs the previous code and
the live roundtrip remains goal G05. No credential value appears in any committed file or log.

## Open questions

None blocking. Two things worth a later reader's attention: D-012 still says the client id is not yet
a Cloudflare binding, which this task's `wrangler secret put` completes and which belongs to whoever
closes G02; and the plan's claim that `vitest.integration.config.ts` "deliberately carries no secret"
holds for the committed config but not for the pool, which loads `.dev.vars` on a developer's machine.
