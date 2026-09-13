# Checkpoint: release-2

- **Task**: `release-2`, deploying and live-verifying the S-06 visual redesign (goals V06, D05, B12, B08)
- **Model**: Opus
- **Status**: complete, no defects found
- **Release SHA**: `c842f64cfaa1f362b0f34cbad35ec8e565805437` (`c842f64`)
- **Cloudflare version id**: `84a95549-cd34-4065-a202-cf5f1385e9f9`
- **Superseded version**: `8e4fa506-cd63-412c-88f2-0101b6348bdb` (release 1, at `8ed3422`)
- **Live URL**: `https://subscription-splitter.sebastianfudalej.workers.dev`

## Actions

1. Pinned the release SHA at the tip of `origin/main` after a fetch, cloned fresh into the scratchpad
   and checked it out there. `git status --porcelain` empty.
2. Gated on the S-06 implementation-review resolution: `git merge-base --is-ancestor da7ad52 c842f64`
   exits 0, and the re-review recorded at that SHA reads APPROVED.
3. Gates in the clean clone: typecheck exit 0; `npm test` exit 0 with unit 17 files / 194 tests and
   integration 11 files / 112 tests; build exit 0; `wrangler deploy --dry-run` exit 0 at 1626.97 KiB
   with the `DB` binding resolved. Counts match the re-verification checkpoint at `4a7c6cc` exactly.
   Hosted CI green, check run `103696850548`.
4. Passing-tests capture taken in a real Terminal window in the clean clone, photographed by window id
   at 1340 by 1230, release 1's dimensions.
5. Remote state before the deploy: no migrations to apply, secrets exactly `APP_ORIGINS` and
   `BETTER_AUTH_SECRET`, `SEED_ENABLED` and `SEED_TOKEN` absent. No schema change ships, so release 1's
   export and Time Travel bookmark were deliberately not repeated.
6. `npm run deploy` from the clean clone. Worker startup 38 ms, 8 static assets uploaded.
7. Live API smoke, 64 requests, saved as `evidence/runs/release-2-live-smoke.txt`.
8. Browser walkthrough on the live release in a throwaway Chrome over the DevTools protocol, plus a
   second Chrome with `--force-prefers-reduced-motion`.
9. Retook the ten certification captures against this release, overwriting release 1's files in the
   same slots at the same dimensions.
10. Wrote `evidence/runs/release-2.md` and appended a work-log entry.

## Changed paths

- `evidence/runs/release-2.md`
- `evidence/runs/release-2-live-smoke.txt`
- `evidence/screenshots/release-01-login.png` through `release-10-narrow-phone.png` (ten files)
- `evidence/work-log.md`
- This checkpoint

Nothing under `src/`, `tests/`, `migrations/`, `context/STATUS.md`, `evidence/index.md`,
`context/changes/visual-redesign/` or the workspace `GOALS.md` was touched.

## Verification

- The redesigned bundle is live, proven by its content-addressed names `assets/index-Bx-I_EYB.js` and
  `assets/index-CdlKxmN3.css` answering 200 and being referenced by the root document, and by the
  walkthrough browser reporting that script as the page's only one.
- Tokens read from the live page match the design spec's dark column exactly. App bar 56px sticky,
  absent on Login, address `sr-only` below 640px. Section index sticky at 56px with the F1
  end-of-document rule live. Disclosure and destructive-confirm behaviour match spec 3.7 and 3.10.
  No horizontal overflow at 375 by 812, 390 or 948.
- Reduced motion: all five motion tokens `0s`, `scroll-behavior` `auto`, zero running animations on
  load and through a disclosure open.
- Every balance moved by exactly the amount a hand calculation written before the request predicted,
  at the API and in the browser, and every figure returned to release 1's baseline after cleanup.
- All three refusal states returned release 1's wording verbatim and left the stored data unchanged.
- No password, token or session cookie appears in the transcript or in any capture.

## Unresolved

None blocking. Two notes for whoever runs the next release:

- `docs/SUBMISSION-PACKAGE.md` section 2 still names release 1's version id and flags the S-06
  redeploy as outstanding. It should now name `84a95549-cd34-4065-a202-cf5f1385e9f9` at `c842f64`.
  That document sits outside this repository and outside this task's write scope.
- This machine runs the AeroSpace tiling window manager, which silently refuses every window resize
  API. A window must be floated (`aerospace layout floating --window-id <id>`) before it can be sized,
  which is what makes captures at fixed dimensions possible. The deployment also rate limits sign-in
  per client, so a scripted pass must space its sign-ins apart.

## Next action

Hand the goal-box updates for V06, D05, B12 and B08 to the designated status writer by naming the
paths above, and update `docs/SUBMISSION-PACKAGE.md` section 2.
