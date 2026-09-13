# Checkpoint: release-2

- **Task**: `release-2`, deploying and live-verifying the S-06 visual redesign (goals V06, D05, B12, B08)
- **Model**: Opus
- **Status**: in progress, deploy complete
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

## Changed paths

- This checkpoint

## Verification

`/api/health` 200 `{"ok":true}`, root 200.

## Unresolved

None so far.

## Next action

Live API smoke against the new release, then the browser walkthrough and the ten captures.
