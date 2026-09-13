# Release 4: the callback fix on the deployed instance

Roadmap S-07, goals G05 and B12. This release ships one configuration fix, `run_worker_first` for
`/api/*` in `wrangler.jsonc`, decided in `context/decisions/D-014-run-worker-first-for-api.md`. It
exists because of defect D1 in `evidence/runs/release-3.md`: a top-level browser navigation to
`/api/auth/callback/google` never reached the Worker, which made the Google return leg impossible on
the deployed origin.

Every live check release 3 ran was repeated. **The one that failed then passes now.** No check
regressed, and no new defect was found.

## Release candidate

- **Release SHA**: `bad3f2816611c00cd691b4ef67f1108d618bed60`, the tip of `origin/main` after the fix
  commit `4893a64` and the Progress commit `bad3f28`.
- **Gated on**: the fix itself, verified locally before it was pushed. The reproduction, the edit, the
  same server after the edit and the gates are all under "Callback fix" in
  `evidence/runs/google-sign-in-gates.txt`. The local verification ran against
  `dist/subscription_splitter/wrangler.json`, the configuration the Vite plugin writes and
  `wrangler deploy` uploads, because that is the only local run that carries the deployed asset layer.
- **Built from**: a throwaway clone under the scratchpad, not the shared working copy, because other
  agents push to `main` concurrently and `vite build` reads the working tree. The clone reported
  `git status --porcelain` empty and `git rev-parse HEAD` equal to the release SHA both before the
  gates and immediately before the deploy.
- **No `.dev.vars` in the clone**, so the whole suite ran with no Google value bound anywhere, which
  is the state continuous integration runs in.

### Gate results, captured verbatim

```
$ git rev-parse HEAD
bad3f2816611c00cd691b4ef67f1108d618bed60

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
✓ built in 86ms
vite v8.3.0 building client environment for production...
✓ 54 modules transformed.
dist/client/assets/index-CLEnPkyw.css  16.89 kB │ gzip:  4.09 kB
dist/client/assets/index-CQZzLfmQ.js  276.66 kB │ gzip: 82.70 kB
✓ built in 551ms
exit: 0
```

Identical to release 3's figures, and the two client asset names are the same, which is what says this
release changes no emitted client byte. The fix is configuration only.

### The passing-tests capture

Retaken this time. `evidence/screenshots/release-05-tests-passing.png`, 1340 by 1230, the same
dimensions and method as release 2's, taken in a real Terminal window sitting in this release's clean
clone. It shows `git rev-parse HEAD` printing the release SHA, an empty `git status --porcelain`, the
typecheck, and `npm test` at 18 files / 214 cases and 12 files / 119 cases, with the SHA echoed again
at the bottom under `--- release SHA again ---` so the run is bracketed by the commit it describes.
Release 3 recorded its gates as text because it did not retake this capture; that gap is now closed.

## Remote state before anything was written

### Migration dry run

```
$ npx wrangler d1 migrations list subscription-splitter-db --remote
✅ No migrations to apply!
exit: 0
```

No migration ships in this release. `migrations/` is untouched by the fix, which changes exactly one
file, `wrangler.jsonc`.

### Secret state

```
$ npx wrangler secret list
[
  { "name": "APP_ORIGINS",          "type": "secret_text" },
  { "name": "BETTER_AUTH_SECRET",   "type": "secret_text" },
  { "name": "GOOGLE_CLIENT_ID",     "type": "secret_text" },
  { "name": "GOOGLE_CLIENT_SECRET", "type": "secret_text" }
]
```

Both Google names are present, which is the precondition G05 names. Name-only listing; no value was
printed. `SEED_ENABLED` and `SEED_TOKEN` are absent, so the seed route stays closed, unchanged from
release 3. This release sets, rotates and deletes no secret.

### Why release 1's snapshot and Time Travel bookmark were not repeated

No schema change ships, so there is nothing new to roll back at the database layer, and the migration
dry run above confirms nothing is pending. Same reasoning as releases 2 and 3.

## The deploy

```
$ npx wrangler deploy
🌀 Building list of assets...
✨ Read 11 files from the assets directory .../release-4/dist/client
🌀 Starting asset upload...
No updated asset files to upload. Proceeding with deployment...
Total Upload: 1629.06 KiB / gzip: 349.78 KiB
Worker Startup Time: 34 ms
Your Worker has access to the following bindings:
  env.DB (subscription-splitter-db)   D1 Database
Uploaded subscription-splitter (12.24 sec)
Deployed subscription-splitter triggers (4.76 sec)
  https://subscription-splitter.sebastianfudalej.workers.dev
Current Version ID: 1d0f71c1-6832-4bc1-aace-5feef621e715
```

| Field | Value |
|---|---|
| New version id | `1d0f71c1-6832-4bc1-aace-5feef621e715` |
| Supersedes | `ad3aaa60-b2b6-458a-92c4-ff57d43f423c` (release 3) |
| Release SHA | `bad3f2816611c00cd691b4ef67f1108d618bed60` |
| Live URL | https://subscription-splitter.sebastianfudalej.workers.dev |

"No updated asset files to upload" is the expected line and is worth reading rather than skipping: the
client bundle is byte-identical to release 3's, because this release changes routing configuration and
no client source. The live root still serves `index-CLEnPkyw.css` and `index-CQZzLfmQ.js`, the names
this release's own clean-clone build produced.

### Rollback

Not exercised and not indicated. Nothing that worked before this release works less well now. If it
were needed: `npx wrangler deployments list` then
`npx wrangler rollback --version-id ad3aaa60-b2b6-458a-92c4-ff57d43f423c`. No migration rollback
applies. The configuration rollback is the removal of one key from `wrangler.jsonc`, which returns the
deployment to release 3's behaviour, defect D1 included.

## Live API smoke

Full transcript at `evidence/runs/release-4-live-smoke.txt`.

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
| **Fabricated-state callback, as a browser navigation** | **PASS**, 302 to `/?error=state_mismatch`, was the release 3 failure |
| Cross-origin password sign-in | PASS, 403 `INVALID_ORIGIN` |
| Sign-up endpoint | PASS, 400, still disabled |
| Owner password sign-in, session, sign-out, cookie replay | PASS |
| Reviewer isolation spot checks | PASS, all six 404 |
| Client routes and static assets after the fix | PASS, `index.html` for every non-`/api` navigation |

### The header matrix, repeated

Release 3 isolated `Sec-Fetch-Mode: navigate` as the single deciding header. The same six-row matrix
was fired at this release and every row now reaches the Worker:

```
callback, no special headers                 302  application/json  location: /?error=state_mismatch
callback, Accept: text/html only             302  application/json  location: /?error=state_mismatch
callback, Sec-Fetch-Dest: document only      302  application/json  location: /?error=state_mismatch
callback, Accept: */* + Sec-Fetch-Dest: doc  302  application/json  location: /?error=state_mismatch
callback, Sec-Fetch-Mode: navigate only      302  application/json  location: /?error=state_mismatch
callback, full browser navigation shape      302  application/json  location: /?error=state_mismatch
```

The fifth row is the one release 3 recorded as `200 text/html`. `/api/me`, `/api/health` and
`/api/auth-config` answer 401, 200 and 200 in the navigation shape as well.

### The single-page-application fallback is unharmed

This is the half of the fix that could have gone wrong and did not:

```
/                                200  text/html         535 bytes, index.html
/some/client/route               200  text/html         535 bytes, index.html
/subscriptions/does-not-exist    200  text/html         535 bytes, index.html
/assets/index-CLEnPkyw.css       200  text/css          16892 bytes
/assets/index-CQZzLfmQ.js        200  text/javascript   276667 bytes
/api/nope, navigation shape      404  application/json  {"error":"not found"}
```

An unmatched `/api` path still answers the Worker's own JSON 404 rather than the client shell, which
is what `src/server/index.ts` already did and what worker-first routing must not change.

### The rate limiter, read carefully

Two cross-origin probes answered 429 "Too many requests" on their first attempt, because the
transcript fires the social endpoint several times in quick succession from one address and Better
Auth's limiter is on. That is the limiter working. Both were re-run after a pause and gave release 3's
answers: 403 `INVALID_CALLBACK_URL` for a same-origin call carrying an attacker `callbackURL`, and a
200 with no `access-control-allow-origin` header for a cross-origin call without one. Recorded as such
in the transcript rather than left looking like a behaviour change.

### The demo plan is unchanged by this release

Read from the owner session and compared field by field with the release 3 baseline. Every figure is
identical: `currentMonthly` 12000, `currentActiveCount` 2, `currentPerPersonShare` 6000,
`ownerShareThisMonth` 6000, `owedToYouNow` 3999, `creditOutstanding` 2001, `expectedThisMonth` 6000,
`collectedThisMonth` 21000, `totalPlanCost` 66000, `totalCollected` 36000, `ownerNetCost` 30000,
Blake owed 27999 paid 24000 balance -3999, Casey R. owed 9999 paid 12000 balance 2001, currency PLN,
current month 2026-09. No drift.

## Browser walkthrough, release version `1d0f71c1-6832-4bc1-aace-5feef621e715`

A throwaway Chrome (Chrome/152.0.7977.84) with its own empty profile, driven over the DevTools
protocol against the live URL. Readings are computed values from the live page.

### The check release 3 could not pass

A real top-level navigation to `/api/auth/callback/google?state=bogus&code=bogus`, typed into the
browser rather than sent by curl:

- the document the browser ended on is `https://subscription-splitter.sebastianfudalej.workers.dev/`,
  the application root, not the callback path
- `location.search` is empty, so the client cleaned the query after rendering, per the delta
- the alert reads "This sign-in link has expired. Start again from this page.", word for word the
  expired-link sentence the change specifies for `state_mismatch`
- captured as `evidence/screenshots/release-4-callback-expired-link.png`

Release 3 recorded this same navigation loading `index.html` at the callback path with the query
intact and no alert at all. That is the defect, and it is gone.

### The client router still owns its own paths

`/subscriptions/does-not-exist` and `/some/client/route` were each opened as real navigations. Both
kept their URL, loaded the client shell with the application mounted, and rendered the login screen,
which is the correct unauthenticated result. Neither was answered by the Worker.

### The live Google button

Pressed on the live login screen. The browser left for `accounts.google.com/v3/signin/identifier`
carrying the client id D-012 records as public, `redirect_uri` equal to the deployed callback URL,
`response_type=code`, scope `email profile openid`, `code_challenge_method=S256` and a 32-character
state. Google's page reads "to continue to sebastianfudalej.workers.dev". Nothing was typed and no
account was chosen. Captured as `evidence/screenshots/release-4-google-consent-redirect.png`.

### The product walkthrough behind the certification captures

| Step | Input | Observed | Capture |
|---|---|---|---|
| Sign in | owner account, through the real form | The sign-in screen with the Google button, then the subscription list | `release-01-login.png`, `release-02-home.png` |
| Record a payment | Blake, dated S+6 (`2026-09-08`), 45,00 zł, "Release 4 walkthrough, S+6" | Form filled before submitting; after submitting, Blake moved from owing 39,99 zł to being ahead by 5,01 zł | `release-03-input-record-payment.png` |
| Read the balances | the walkthrough payment deleted again first | Five headline figures, the net-cost line, Blake owing and Casey R. ahead, at the baseline | `release-04-output-balances.png` |
| Members and prices | Casey R.'s edit panel opened, then cancelled | Inclusive active range 2026-03 to 2026-06 above the two price entries | `release-06-members-and-prices.png` |
| Standing orders | none | Three month tiles: S+4 and S+6 assumed received, S+5 marked as not received, 60,00 zł over 2 of 3 elapsed months | `release-07-recurring-assumed-received.png` |
| Refused payment | Blake, dated `2026-01-15`, two months before S, 20,00 zł | "Date received must not precede the subscription start month" under the date field, which took `aria-invalid="true"`; both stored payments untouched | `release-08-error-before-start-month.png` |
| Reviewer account | signed out, signed in as the reviewer | "Your subscriptions (0)" and the empty state | `release-09-reviewer-sees-nothing.png` |
| Phone width | device emulation at 390 CSS pixels | One column, both participants, no horizontal overflow | `release-10-narrow-phone.png` |

The 45,00 zł payment was deleted again through the product's own confirm strip once its arithmetic had
been checked, so the demo state a reviewer opens is the one release 1 left.

### The payment, against a hand calculation

Computed before the screen was read, and the same calculation release 2 recorded. Blake owed 279,99 zł
against 240,00 zł paid, so 45,00 zł recorded takes him to 285,00 zł paid and a balance of 5,01 zł
ahead. Nobody then owes anything, so `owedToYouNow` falls to 0,00 zł, collected this month rises from
210,00 zł to 255,00 zł, and the organizer's net cost falls from 300,00 zł to 255,00 zł. The live
screen showed exactly those figures. After the delete every field returned to the baseline, confirmed
on screen and by re-reading the summary.

### The screenshot set

Ten files, `evidence/screenshots/release-*.png`, each overwriting release 2's or release 3's file in
the same slot, with the same slot meaning, dimensions and method. Nine are browser captures from the
live URL at 948 by 1033 with the address bar visible; `release-05-tests-passing.png` is the Terminal
capture at 1340 by 1230 taken in this release's clean clone, and is the one that has no address bar to
show. Each is a capture of a single window by its window id, so nothing else on the machine is in
frame. The machine's appearance is dark, so the browser captures are the dark palette, matching
releases 2 and 3.

| File | Dimensions | What it shows | Release SHA / version |
|---|---|---|---|
| `release-01-login.png` | 948 by 1033 | The sign-in screen with "Continue with Google" beside `Sign in`, empty fields, no app bar | `bad3f28` / `1d0f71c1` |
| `release-02-home.png` | 948 by 1033 | The post-login list: the app bar with the wordmark, address and Sign out, "Your subscriptions (2)", the demo plan and the first-deployment artefact | `bad3f28` / `1d0f71c1` |
| `release-03-input-record-payment.png` | 948 by 1033 | The payment panel open under its heading, fields filled, two-column pairs, before submitting | `bad3f28` / `1d0f71c1` |
| `release-04-output-balances.png` | 948 by 1033 | The leading figure in red, the four ledger cards, the net-cost sentence, the section index with Participants current, Blake owing and Casey R. ahead | `bad3f28` / `1d0f71c1` |
| `release-05-tests-passing.png` | 1340 by 1230 | The release SHA, an empty working tree, the typecheck and `npm test` passing, from the clean clone at `bad3f28` | `bad3f28` |
| `release-06-members-and-prices.png` | 948 by 1033 | Casey R.'s inclusive active range, 2026-03 to 2026-06, above the price history with its change | `bad3f28` / `1d0f71c1` |
| `release-07-recurring-assumed-received.png` | 948 by 1033 | The standing order's three months, two assumed received and one marked not received, the total over 2 of 3 elapsed months, and Standing orders current in the index | `bad3f28` / `1d0f71c1` |
| `release-08-error-before-start-month.png` | 948 by 1033 | The refused payment, its message under the date field, both stored payments untouched below | `bad3f28` / `1d0f71c1` |
| `release-09-reviewer-sees-nothing.png` | 948 by 1033 | The second account signed in, "Your subscriptions (0)" and the empty state | `bad3f28` / `1d0f71c1` |
| `release-10-narrow-phone.png` | 948 by 1033 | The detail screen at 390 CSS pixels, one column, both participants, no horizontal overflow | `bad3f28` / `1d0f71c1` |

Two additions beside the ten:

| File | Dimensions | What it shows |
|---|---|---|
| `release-4-callback-expired-link.png` | 948 by 1033 | The release 3 failure now passing: a real browser navigation to the fabricated-state callback landing on the app root with the expired-link alert |
| `release-4-google-consent-redirect.png` | 948 by 1033 | Google's own page as reached from the live button, no account chosen, nothing typed |

`release-3-google-consent-redirect.png` is left in place; nothing in this release changes what it
shows.

One honest note on `release-01-login.png`. It was retaken this pass, in the same window at the same
size against the same live screen, and the resulting file is byte-identical to release 3's. That is
what a deterministic re-render of an unchanged screen produces, not an omission; the login screen is
one of the things this release deliberately does not touch. `release-10-narrow-phone.png` uses device
emulation at 390 CSS pixels because the tiling window manager clamps the window to a wider minimum,
which is the same limitation releases 1 to 3 recorded, and is why the page occupies the left portion
of a wider window in that one capture. Every window that had to be sized was moved to the floating
layout first (`aerospace layout floating --window-id <id>`), as release 2 noted.

No capture shows a password, a token, a session cookie or the client secret. The two account addresses
are visible, which is deliberate and unchanged from release 1.

## Defects found

None. Release 3's defect D1 is fixed and verified live above, and no check regressed.

## The consent step is still pending the owner's own Google account

This release does not claim that public Google login works, and no artifact in it says so. The consent
roundtrip is the part of G05 that cannot be driven from here: it needs a real Google account and a
human at the keyboard, and the consent audience stays External in Testing with the owner as its only
test user.

What has changed is that it is no longer blocked. Release 3 said the consent step would fail until D1
was resolved, because the return from Google is exactly the navigation D1 intercepted. That navigation
now reaches the Worker, demonstrated above with a fabricated state that produces the expired-link
alert on the app root, which is the same code path a real return takes with a valid state.

When it is run, it must show all five of these, in order:

1. Google's consent screen for "Subscription Splitter", reached from the live login button.
2. A return to the application root after consent, signed in.
3. A new account with an empty Home: no subscriptions, and none of the seeded owner's data. The Google
   identity must not be mapped onto `owner@example.com`.
4. Sign-out from that Google-created account.
5. A second sign-in with the same Google account returning to the same account, with whatever that
   account holds, rather than creating a second one.

## What was not exercised live in this phase

- Google's consent, its token exchange and any real Google identity. Nothing was signed in.
- The `account_not_linked` refusal against a live Google identity whose address matches the seeded
  owner. It is covered by an integration case against the real D1, not live.
- The not-usable and did-not-finish alerts on the deployed origin. The expired-link alert was produced
  live this pass; the other two are covered by the change's own acceptance captures and unit cases.

## Hand-off

Produced by this pass:

- `evidence/runs/release-4.md` (this file)
- `evidence/runs/release-4-live-smoke.txt`
- all ten `evidence/screenshots/release-01` to `release-10` captures, retaken at this release
- `evidence/screenshots/release-4-callback-expired-link.png` and
  `evidence/screenshots/release-4-google-consent-redirect.png` (new)
- `context/checkpoints/g05-callback-fix.md`

Left for their owners:

- The G05 consent roundtrip, which needs the owner's own Google account. It is no longer blocked.
- `docs/SUBMISSION-PACKAGE.md` section 10 records byte sizes and "retaken against release 2" or
  "release 3" for the capture set. Nine of the ten files have changed. This task does not edit that
  document.
- The goal-box updates for G05 and B12 go to the designated status writer. This file does not edit
  `GOALS.md`, `context/STATUS.md` or `evidence/index.md`.
- The change is not archived. `change.md` reads `impl_reviewed`.
