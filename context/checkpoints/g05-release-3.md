# Checkpoint: g05-release-3

- **Task**: `g05-release-3`, closing the S-07 review record and deploying and live-verifying Google
  sign-in (goals G04, G05, B12)
- **Model**: Opus
- **Status**: complete, one blocking defect found live and recorded, not patched
- **Release SHA**: `6da64850c8f962a76bb8b18f99290ea9d086c271` (`6da6485`)
- **Cloudflare version id**: `ad3aaa60-b2b6-458a-92c4-ff57d43f423c`
- **Superseded version**: `a0d38cda-4e0d-4767-a78e-fcb347c4eec4` (a secret change on top of release
  2's code version `84a95549-cd34-4065-a202-cf5f1385e9f9`)
- **Live URL**: `https://subscription-splitter.sebastianfudalej.workers.dev`

## Actions

1. Committed the designer acceptance alone at `26cbd39`. It accepts the delta without corrections.
2. Applied the implementation review's two required findings at `77e1232`, with a heading cleanup at
   `6da6485`. F1: `cf3e3de` appended to Progress rows 2.1 and 2.3 to 2.6, `751d4df` to the nine
   manual rows 2.7 to 2.15, in the separator `plan.md:824` states. All fifty-six rows now carry a
   commit. F2: the secret guard in `evidence/runs/google-sign-in-gates.txt` now says what its
   assignment-shaped grep proves, names the client id in D-012 as the one credential value in the
   change range and deliberately public, and carries two wider checks run in this task with the value
   read into a shell variable and never printed: `git log -S ... --all` returns no commit and
   `git grep -lF ... HEAD` no file.
3. Re-read the review's O4 observation against the code instead of accepting it. `getAuthConfig` at
   `src/client/api.ts:110-116` already catches every rejection and returns `{ google: false }`, so it
   cannot reject and the `Promise.all` at `src/client/App.tsx:19` cannot reject through the
   configuration read. The delta's rule that a failed read is treated as not configured is satisfied
   at the source. No fix, no new test, no gate re-run, and `getMe`'s own rethrow on a non-401 left
   exactly as it was. Recorded as F-obs in the review's `## Resolution`, which also decides the other
   five observations. `change.md` set to `impl_reviewed`.
4. Pinned `6da6485` at `origin/main` after the push and cloned fresh into the scratchpad path release
   2 used. `git status --porcelain` empty, HEAD equal to the release SHA before the gates and again
   immediately before the deploy.
5. Gates in the clean clone, which carries no `.dev.vars`, so the suite ran secretless: typecheck
   clean across three projects; unit 18 files and 214 cases; integration 12 files and 119 cases;
   build exit 0. The same figures the implementation reviewer re-ran independently.
6. Remote state before the deploy: `No migrations to apply!`, and `wrangler secret list` showing
   `APP_ORIGINS`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, with
   `SEED_ENABLED` and `SEED_TOKEN` still absent. Name-only listing, no value printed. The client id
   does not appear anywhere under `dist/client/`.
7. `npx wrangler deploy` from the clean clone. Worker startup 32 ms, three static assets uploaded.
   The live root now serves `index-CLEnPkyw.css` and `index-CQZzLfmQ.js`, the names this release's
   build produced, which is what proves this bundle is live.
8. Live API smoke saved as `evidence/runs/release-3-live-smoke.txt`. `/api/auth-config` returns
   exactly `{"google":true}`; root 200 and `/api/me` 401 as before; the social call from the deployed
   origin answers 200, not 403, with a client id equal to D-012's full public value and a
   `redirect_uri` equal to the deployed callback; scopes exactly `email profile openid` with an S256
   challenge and a 32-character state; the fabricated-state callback answers 302 to
   `/?error=state_mismatch` with `/api/me` still 401; cross-origin password sign-in still 403; sign-up
   still disabled; owner sign-in, session, sign-out and cookie replay all behave; the reviewer is
   answered 404 on all six of the owner's endpoints; every figure in the demo plan's summary is
   identical to the release 2 baseline.
9. Probed the cross-origin reading rather than leaving it ambiguous: a social call with a
   `callbackURL` off the deployed origin is refused 403 `INVALID_CALLBACK_URL` whether it comes from
   the deployed origin or from another one, and the 200 returned to a cross-origin call with no
   `callbackURL` carries no allow-origin header, so its body is not readable cross-origin.
10. Browser pass in a throwaway Chrome over the DevTools protocol against the live URL. The login
    screen matches the delta at 1280x900 and 390x844 in light and in dark: one flex row then a
    stacked column, gap 12px, `Sign in` first, 40px then 44px, the 18px mark `aria-hidden` in its
    four official colours, no divider, no new copy, no horizontal overflow, tab order email,
    password, Sign in, Continue with Google.
11. Pressed the live Google button. The browser left for `accounts.google.com/v3/signin/identifier`
    carrying the matching client id and redirect uri. No account chosen, nothing typed.
12. Retook `evidence/screenshots/release-01-login.png` as a 948 by 1033 window capture, release 2's
    dimensions and method, now showing the Google button live. Added
    `evidence/screenshots/release-3-google-consent-redirect.png` at the same dimensions.
13. Wrote `evidence/runs/release-3.md` and appended the work-log entry.

## The defect found live

A top-level browser navigation to `/api/auth/callback/google` never reaches the Worker. A
single-variable matrix isolates `Sec-Fetch-Mode: navigate` as the only deciding header: with it the
request is answered 200 with `index.html`, and every other request shape is answered 302 to
`/?error=state_mismatch`. The cause is `"assets": { "not_found_handling": "single-page-application" }`
in `wrangler.jsonc`, which lets Cloudflare's asset layer answer navigations to non-asset paths before
the Worker runs. That block has been there since the scaffold and
`git diff --stat c842f64..HEAD -- wrangler.jsonc` is empty, so this change neither introduced nor
altered it. Every client API call is fetch or XHR and passes through untouched, which is why nothing
else regressed. The OAuth return leg is the first thing this application does that needs a document
navigation to an `/api` path.

A real Google sign-in therefore cannot complete on this deployment. It was recorded and not patched,
per the task's rule that a failed live check stops rather than being fixed here. It needs its own
change, since it edits deployment configuration and wants its own verification that asset routing
still serves the client for every non-API path.

## What remains

- The G05 consent step is pending the owner's own Google account, and is blocked by the defect above
  until that is resolved. What it must show is written out in `evidence/runs/release-3.md`: Google
  consent for "Subscription Splitter", a return to the app root, a new account with an empty Home
  that holds none of the seeded owner's data, sign-out, and a second sign-in returning to the same
  account rather than creating another.
- The passing-tests capture was not retaken at this release SHA. The gate counts are recorded as
  text instead.
- `docs/SUBMISSION-PACKAGE.md` section 10 still records `release-01-login.png` at its release 2 size.
  This task does not edit that document.
- The goal-box updates go to the designated status writer. This task does not edit `GOALS.md`,
  `context/STATUS.md` or `evidence/index.md`, and does not archive the change.

## Parent commit

`6da6485`, the release SHA, with this pass's evidence committed on top.
