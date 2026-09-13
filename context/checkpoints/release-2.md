# Checkpoint: release-2

- **Task**: `release-2`, deploying and live-verifying the S-06 visual redesign (goals V06, D05, B12, B08)
- **Model**: Opus
- **Status**: in progress, deploy and live API smoke complete
- **Release SHA**: `c842f64cfaa1f362b0f34cbad35ec8e565805437` (`c842f64`)
- **Cloudflare version id**: `84a95549-cd34-4065-a202-cf5f1385e9f9`
- **Superseded version**: `8e4fa506-cd63-412c-88f2-0101b6348bdb` (release 1)
- **Live URL**: `https://subscription-splitter.sebastianfudalej.workers.dev`

## Actions so far

- Pinned the release SHA at the tip of `origin/main` after a fetch. Cloned fresh into the scratchpad
  and checked out the pinned SHA; `git status --porcelain` empty.
- Gate on the S-06 implementation review resolution: `git merge-base --is-ancestor da7ad52 c842f64`
  exits 0. The re-review at `c842f64` records the verdict APPROVED.
- Gates in the clean clone: `npm ci` exit 0, `npm run typecheck` exit 0, `npm test` exit 0 with unit
  17 files / 194 tests and integration 11 files / 112 tests, `npm run build` exit 0,
  `npx wrangler deploy --dry-run` exit 0 at 1626.97 KiB with the `DB` binding resolved. Counts match
  the re-verification checkpoint's figures at `4a7c6cc` exactly.
- Hosted CI green for the release SHA: check run `103696850548`, conclusion success.
- Passing-tests capture taken in a real Terminal window in the clean clone, photographed by window id.
- Remote state before the deploy: `wrangler d1 migrations list --remote` reports no migrations to
  apply; `wrangler secret list` returns exactly `APP_ORIGINS` and `BETTER_AUTH_SECRET`, with
  `SEED_ENABLED` and `SEED_TOKEN` absent. No schema change ships in this release, so release 1's
  export and Time Travel bookmark were deliberately not repeated.
- `npm run deploy` from the clean clone. Worker startup 38 ms, 8 new or modified static assets
  uploaded, `DB` bound to `subscription-splitter-db`.
- Confirmed the redesigned bundle is what is live: the new content-addressed asset names
  `assets/index-Bx-I_EYB.js` and `assets/index-CdlKxmN3.css` both answer 200, and the root document
  serves them. The first two root requests after the deploy returned release 1's older asset names
  from a stale Cloudflare edge entry; the entry revalidated within seconds and the root has served
  the new bundle since. `cache-control` on the document is `public, max-age=0, must-revalidate`, so
  this is expected edge behaviour and not a defect.

## Live API smoke

`evidence/runs/release-2-live-smoke.txt`, sixty-four requests against the new release. Root and both
release-build assets 200. Health 200. Five unauthenticated reads 401. Cross-origin sign-in 403
`INVALID_ORIGIN`; sign-up 400 `EMAIL_PASSWORD_SIGN_UP_DISABLED`. Owner sign-in 200 with
`HttpOnly; Secure; SameSite=Lax`; sign-out 200 and the same cookie replayed verbatim 401. Seventeen
404s covering the reviewer naming every one of the owner's records and a child record reached through
the wrong parent inside the owner's own account. Seed route 404 with and without a token.

The demo plan's figures were re-read before anything was written and equal release 1's recorded
values in every field, so the redesign moved no behaviour.

The payment cycle ran against a hand calculation written before the requests. Adding a throwaway
participant active in S+6 only moved the share to `round(12000/3)` 4000; a 2500 payment, a correction
to 3000, a standing order of 1000 assumed received, and that month marked not received each moved the
balance by exactly the expected amount, and the cleanup returned every field to the baseline.

## Changed paths

- `evidence/runs/release-2-live-smoke.txt`
- This checkpoint

## Verification

`/api/health` 200 `{"ok":true}`, root 200. The transcript carries no password, no session token and no
seed token; only `owner@example.com` appears.

## Unresolved

Sign-in is rate limited per client: three sign-ins inside a short window answered 400 and then 429 on
a first attempt at this transcript. The transcript was re-run with the sign-ins spaced apart and all
three then answered 200. Nothing was written during the refused attempts. This is the limiter working,
not a defect, and it is why the pass takes its sign-ins slowly.

## Next action

Browser walkthrough on the live release and the ten certification captures.
