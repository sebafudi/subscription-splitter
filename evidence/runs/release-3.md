# Release 3: Google sign-in on the deployed instance

Roadmap S-07, goals G04 and G05. This release ships the `google-sign-in` change, which has been
implemented, reviewed and accepted by the designer, to the deployed Worker. It follows the procedure
in `evidence/runs/release-2-plan.md` and the shape of `evidence/runs/release-2.md`.

One live check failed and is recorded in full under "Defects found". It is a deployment
configuration gap that predates this change, and nothing was patched in response to it, per the
task's rule. Every other check passed.

## Release candidate

- **Release SHA**: `6da64850c8f962a76bb8b18f99290ea9d086c271`, the tip of `origin/main` after the
  implementation review resolution landed.
- **Gated on**: the implementation review in
  `context/changes/google-sign-in/reviews/impl-review.md`, verdict APPROVED, resolved at `77e1232`
  with the heading cleanup at `6da6485`. The designer acceptance in
  `reviews/design-acceptance.md` landed at `26cbd39`. `change.md` reads `impl_reviewed`.
- **Built from**: a throwaway clone under the scratchpad path release 2 used, not the shared working
  copy, because other agents push to `main` concurrently and `vite build` reads the working tree.
  The clone reported `git status --porcelain` empty and `git rev-parse HEAD` equal to the release SHA
  both before the gates and immediately before the deploy.
- **No `.dev.vars` in the clone**, so the whole suite ran with no Google value bound anywhere. That
  is the regression the plan says matters most, and it is the state continuous integration runs in.

### Gate results, captured verbatim

```
$ git rev-parse HEAD
6da64850c8f962a76bb8b18f99290ea9d086c271

$ git status --porcelain
(empty)

$ npm run typecheck
> tsc -p tsconfig.worker.json --noEmit && tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.node.json --noEmit
exit: 0

$ npm run test:unit
 Test Files  18 passed (18)
      Tests  214 passed (214)

$ npm run test:integration
 Test Files  12 passed (12)
      Tests  119 passed (119)

$ npm run build
vite v8.3.0 building subscription_splitter environment for production...
✓ 675 modules transformed.
dist/subscription_splitter/index.js   869.09 kB │ gzip: 206.76 kB
✓ built in 85ms
vite v8.3.0 building client environment for production...
✓ 54 modules transformed.
dist/client/assets/index-CLEnPkyw.css  16.89 kB │ gzip:  4.09 kB
dist/client/assets/index-CQZzLfmQ.js  276.66 kB │ gzip: 82.70 kB
✓ built in 536ms
exit: 0
```

The counts are the same figures the implementation review re-ran independently: three typecheck
projects clean, 18 unit files and 214 unit cases, 12 integration files and 119 integration cases.
No regression against the last recorded repository-wide figures.

### The passing-tests capture

Not retaken. `evidence/screenshots/release-05-tests-passing.png` is release 2's Terminal capture at
the release 2 SHA. The gate counts above are identical to the ones in that frame, but the SHA in it
is not this release's, so this document records the gates as text rather than claiming a capture it
did not take. Retaking it is a separate manual step and is listed under hand-off.

## Remote state before anything was written

### Migration dry run

```
$ npx wrangler d1 migrations list subscription-splitter-db --remote
✅ No migrations to apply!
exit: 0
```

No migration ships in this release. `migrations/` is untouched by the change, which the
implementation review confirmed against the pre-change baseline. Nothing needed applying and nothing
was applied.

### Secret state

```
$ npx wrangler secret list
[
  { "name": "APP_ORIGINS",          "type": "secret_text" },
  { "name": "BETTER_AUTH_SECRET",   "type": "secret_text" },
  { "name": "GOOGLE_CLIENT_ID",     "type": "secret_text" },
  { "name": "GOOGLE_CLIENT_SECRET", "type": "secret_text" }
]
exit: 0
```

Both Google names are present on the deployed Worker, which is the precondition G05 names. This is a
name-only listing; no value was printed. `SEED_ENABLED` and `SEED_TOKEN` are absent, so the seed
route stays closed, unchanged from release 2.

The client id in the local `.dev.vars` and the id D-012 records are the same value, compared by
prefix without printing either in full. The id appears in no file under `dist/client/`, and no
`GOOGLE_CLIENT` string appears there either, so it does not reach the bundle.

### Why release 1's snapshot and Time Travel bookmark were not repeated

No schema change ships in this release, so there is nothing new to roll back at the database layer,
and the migration dry run above confirms nothing is pending. This is the same reasoning release 2
recorded.

## The deploy

```
$ npx wrangler deploy
Total Upload: 1629.06 KiB / gzip: 349.78 KiB
Worker Startup Time: 32 ms
Your Worker has access to the following bindings:
  env.DB (subscription-splitter-db)   D1 Database
Uploaded subscription-splitter (14.93 sec)
Deployed subscription-splitter triggers (4.82 sec)
  https://subscription-splitter.sebastianfudalej.workers.dev
Current Version ID: ad3aaa60-b2b6-458a-92c4-ff57d43f423c
```

| Field | Value |
|---|---|
| New version id | `ad3aaa60-b2b6-458a-92c4-ff57d43f423c` |
| Supersedes | `a0d38cda-4e0d-4767-a78e-fcb347c4eec4` (a secret change) |
| Last code version before this one | `84a95549-cd34-4065-a202-cf5f1385e9f9` (release 2) |
| Release SHA | `6da64850c8f962a76bb8b18f99290ea9d086c271` |
| Live URL | https://subscription-splitter.sebastianfudalej.workers.dev |

Three static assets were new or modified and uploaded: `/index.html`,
`/assets/index-CLEnPkyw.css`, `/assets/index-CQZzLfmQ.js`.

### Proving this release's bundle is the one that is live

The live root serves exactly those two asset names, which are the ones the clean clone's build
produced at the release SHA. A cached predecessor would carry release 2's `index-Bx-I_EYB.js` and
`index-CdlKxmN3.css` instead.

### Rollback

Not exercised and not indicated. Nothing that worked before this release works less well now. If it
were needed: `npx wrangler deployments list` then
`npx wrangler rollback --version-id 84a95549-cd34-4065-a202-cf5f1385e9f9`. No migration rollback
applies.

## Live API smoke

Full transcript at `evidence/runs/release-3-live-smoke.txt`.

| Check | Result |
|---|---|
| `GET /api/auth-config` returns exactly `{"google":true}` | PASS, byte-exact |
| `GET /` root | PASS, 200, serving this release's assets |
| `GET /api/health` | PASS, 200, `{"ok":true}` |
| `GET /api/me` with no cookie | PASS, 401 |
| `GET /api/subscriptions` with no cookie | PASS, 401 |
| Social call from the deployed origin | PASS, 200, not 403 |
| Authorize url client id and redirect uri | PASS, both match D-012 and the deployed callback |
| Scopes on the authorize url | PASS, exactly `email profile openid`, S256 challenge, 32-char state |
| Fabricated-state callback, as an API request | PASS, 302 to `/?error=state_mismatch`, `/api/me` still 401 |
| Fabricated-state callback, as a browser navigation | **FAIL**, see "Defects found" |
| Cross-origin password sign-in | PASS, 403 `INVALID_ORIGIN`, unchanged from release 2 |
| Sign-up endpoint | PASS, 400, still disabled |
| Owner password sign-in, session, sign-out, cookie replay | PASS |
| Reviewer isolation spot checks | PASS, all six 404 |

### The origin check, read carefully

The check G05 asks for passes: a request carrying `Origin: https://subscription-splitter.sebastianfudalej.workers.dev`
to the social sign-in endpoint answers 200, not 403.

A cross-origin social call with no `callbackURL` also answers 200, which is worth stating plainly
rather than leaving as a surprise. Three further probes establish that this is not a hole:

- The same call from `https://evil.example` carrying a `callbackURL` on `evil.example` is refused
  403 `INVALID_CALLBACK_URL`.
- So is the same `callbackURL` sent from the deployed origin itself, so the rule is on the value and
  not on the caller.
- The 200 response carries no `access-control-allow-origin` header, so a browser on another origin
  cannot read its body.

The `redirect_uri` in the returned authorize url is derived from the deployed origin and not from
the caller's `Origin` header, so the url an attacker could obtain returns the user to this
application, not to them. Cross-origin password sign-in remains 403, exactly as release 2 recorded.

### The demo plan is unchanged by this release

Read from the owner session and compared field by field with the release 2 baseline. Every figure is
identical: `currentMonthly` 12000, `currentActiveCount` 2, `currentPerPersonShare` 6000,
`ownerShareThisMonth` 6000, `owedToYouNow` 3999, `creditOutstanding` 2001, `expectedThisMonth` 6000,
`collectedThisMonth` 21000, `totalPlanCost` 66000, `totalCollected` 36000, `ownerNetCost` 30000,
Blake owed 27999 paid 24000 balance -3999, Casey R. owed 9999 paid 12000 balance 2001, currency PLN,
current month 2026-09. The owner still sees the same two subscriptions. No drift, which is what the
change's hard constraint requires.

## Browser walkthrough, release version `ad3aaa60-b2b6-458a-92c4-ff57d43f423c`

A throwaway Chrome (Chrome/152.0.7977.84) with its own empty profile, driven over the DevTools
protocol against the live URL. Readings are computed values from the live page.

### What was recorded in the browser

The login screen was read at 1280x900 and at 390x844, each in light and in dark. All four match
`design-delta.md`:

- At 1280 the action row is one flex row, gap 12px, with the filled `Sign in` first at 80.78 by
  40.00 and the quiet `Continue with Google` beside it at 209.09 by 40.00.
- At 390 the row is a column, gap 12px, `Sign in` first, both buttons 343.00 by 44.00, document
  scroll width 390 with no horizontal overflow.
- The mark is 18.00 by 18.00, `aria-hidden="true"`, carrying the four official hex values
  `#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`, so the button's accessible name is the label alone.
- No divider and no new copy in any of the four.
- Tab order is email, password, Sign in, Continue with Google.

Pressing the live button sent the browser to `accounts.google.com/v3/signin/identifier` carrying the
client id D-012 records as public, `redirect_uri` equal to the deployed callback URL,
`response_type=code`, scope `email profile openid`, `code_challenge_method=S256` and a 32-character
state. Google's page reads "to continue to sebastianfudalej.workers.dev". Nothing was typed and no
account was chosen.

### The screenshot set

| File | Dimensions | What it shows |
|---|---|---|
| `evidence/screenshots/release-01-login.png` | 948 by 1033 | Retaken. The live login screen at this release, with the Google button present beside `Sign in`, address bar visible |
| `evidence/screenshots/release-3-google-consent-redirect.png` | 948 by 1033 | New. Google's own page as reached from the live button, no account chosen, nothing typed |

Both are captures of the test browser's own window by its window id, so nothing else on the machine
is in frame, at the same 948 by 1033 as release 2's nine browser captures. The machine's appearance
is dark, so both are the dark palette, matching release 2's set. Neither shows a password, a token,
a session cookie or the client secret.

The second capture is Google's account-chooser step rather than the consent screen proper. The
consent screen is only reached after an account is chosen, which this pass deliberately does not do.
The file name says "consent-redirect" because what it evidences is the redirect, not the consent.

The other nine `release-*.png` captures are release 2's and are untouched; nothing in this release
changes the screens they show.

## Defects found

### D1: a browser navigation to an `/api` path never reaches the Worker

**Severity: blocking for the Google sign-in return leg. Not a regression.**

The fabricated-state callback behaves correctly as an API request and incorrectly as a real browser
navigation. A single-variable matrix in the smoke transcript isolates the deciding header exactly:
`Sec-Fetch-Mode: navigate`. With it, `/api/auth/callback/google?state=...&code=...` is answered 200
with `index.html`; without it, the same request is answered 302 to `/?error=state_mismatch`.

The cause is in `wrangler.jsonc`:

```
"assets": { "not_found_handling": "single-page-application" }
```

Cloudflare's asset layer answers any top-level document navigation to a path that is not a static
asset with `index.html`, before the Worker runs. There is nothing in the config asking the Worker to
run first.

That block has been in `wrangler.jsonc` since the scaffold (`c85b946`, then `909dd6a`), and
`git diff --stat c842f64..HEAD -- wrangler.jsonc` is empty, so the `google-sign-in` change neither
introduced nor altered it. It did not surface before because every API call the client makes is
fetch or XHR, which carries `Sec-Fetch-Mode: cors` or `same-origin` and passes through untouched.
Password sign-in, sign-out, the subscription reads and `/api/auth-config` all still work in the
browser and all pass above. The OAuth return leg is the first thing this application does that needs
a top-level document navigation to an `/api` path.

**Consequence.** On this deployment a real Google sign-in cannot complete. Google would return the
browser to `/api/auth/callback/google?code=...&state=...`, that navigation would be answered with
`index.html`, the authorization code would never be exchanged, no session would be created, and the
user would land on a bare login screen with no message. The same interception is why the expired-link
alert could not be produced in the browser during this pass; the redirect that carries
`error=state_mismatch` is itself a navigation.

**Not patched here**, per the task's rule that a failed live check is recorded rather than fixed in
the release task. It needs its own change, since it edits deployment configuration and wants its own
verification that the asset routing still serves the client correctly for every non-API path.

## The consent step is pending the owner's own Google account

This release does not claim that public Google login works, and no artifact in it says so. The
consent roundtrip is the part of G05 that cannot be driven from here: it needs a real Google account
and a human at the keyboard, and the consent audience stays External in Testing.

When it is run, it must show all five of these, in order:

1. Google's consent screen for "Subscription Splitter", reached from the live login button.
2. A return to the application root after consent, signed in.
3. A new account with an empty Home: no subscriptions, and none of the seeded owner's data. The
   Google identity must not be mapped onto `owner@example.com`.
4. Sign-out from that Google-created account.
5. A second sign-in with the same Google account returning to the same account, with whatever that
   account holds, rather than creating a second one.

**That step is blocked by defect D1 above and will fail until D1 is resolved.** It should not be
attempted before then; the return from Google is exactly the navigation D1 intercepts.

## What was not exercised live in this phase

- Google's consent, its token exchange and any real Google identity. Nothing was signed in.
- The `account_not_linked` refusal against a live Google identity whose address matches the seeded
  owner. It is covered by an integration case against the real D1, not live.
- The expired-link, not-usable and did-not-finish alerts on the deployed origin. They are covered by
  the change's own sixteen acceptance captures and unit cases locally; live they are behind D1.
- The passing-tests capture at this release SHA, see the note under "Release candidate".
- The nine other release captures, which this release does not change.

## Hand-off

Produced by this pass:

- `evidence/runs/release-3.md` (this file)
- `evidence/runs/release-3-live-smoke.txt`
- `evidence/screenshots/release-01-login.png` (retaken)
- `evidence/screenshots/release-3-google-consent-redirect.png` (new)
- `context/checkpoints/g05-release-3.md`

Left for their owners:

- Defect D1 needs its own change before the G05 consent step can pass.
- `docs/SUBMISSION-PACKAGE.md` section 10 records `release-01-login.png` at 49,688 bytes and "retaken
  against release 2". The file is now 54,236 bytes and retaken against release 3. This task does not
  edit that document.
- The goal-box updates for G04 and G05 go to the designated status writer. This file does not edit
  `GOALS.md`, `context/STATUS.md` or `evidence/index.md`.
- The change is not archived. `change.md` reads `impl_reviewed`.
