# Checkpoint: status-sync-7

- Task id: `status-sync-7`
- Model: Opus
- Status: complete
- HEAD when this task started reading: `a9d1062`. The fix agent `g05-callback-fix` landed `4893a64`
  and `bad3f28` between this task's two polls, which changed what every document had to say, so this
  task's commit sits on `bad3f28`.

## Summary

Recorded release 3 and the callback navigation defect across the five shared documents, and moved the
submission package's final release from release 3 to release 4. G05 stays open.

## The fix checkpoint, polled twice as instructed

At the first poll, at the start of this task, `context/checkpoints/g05-callback-fix.md` did not
exist, `context/decisions/D-014-run-worker-first-for-api.md` did not exist and HEAD was `a9d1062`.
At the second poll, immediately before this commit, all three had changed: the checkpoint exists, the
decision exists, and the fix is committed at `4893a64` with its post-review Progress rows at
`bad3f28`. Every document was rewritten against the second poll rather than the first.

**Release 4 state at commit time: the fix has landed, the release has not.** `wrangler.jsonc` now
carries `"run_worker_first": ["/api/*"]` under `assets`, keeping
`not_found_handling: single-page-application` for every other path, read from the file rather than
from the checkpoint's prose. `evidence/runs/release-4.md` does not exist, so no release 4 SHA and no
release 4 Cloudflare version id is written anywhere. Every place that needs those values carries a
named placeholder pointing at `evidence/runs/release-4.md` and
`context/checkpoints/g05-callback-fix.md` instead of a guess.

## Verification performed before writing

- Every SHA cited was resolved with `git cat-file -e <sha>^{commit}`: `6da6485`, `0ae77a9`, `0cb2f74`,
  `a9d1062`, `4893a64`, `bad3f28`, `c842f64`.
- Read in full before editing: `context/checkpoints/status-sync-6.md`,
  `context/checkpoints/g05-release-3.md`, `evidence/runs/release-3.md` and, at the second poll,
  `context/checkpoints/g05-callback-fix.md`.
- The two capture sizes were measured on disk rather than taken from prose:
  `evidence/screenshots/release-01-login.png` is 54,236 bytes and
  `evidence/screenshots/release-3-google-consent-redirect.png` is 67,540 bytes. The package's manifest
  total was recomputed from the change, 1,034,280 to 1,038,828 bytes, and the Builder required-slot
  subtotal from 501,282 to 505,830.
- `run_worker_first` was confirmed present in `wrangler.jsonc` at HEAD rather than assumed from the
  fix checkpoint.

## Release 3, as recorded

Release commit `6da64850c8f962a76bb8b18f99290ea9d086c271` (`6da6485`) deployed as Cloudflare version
`ad3aaa60-b2b6-458a-92c4-ff57d43f423c`, superseding `a0d38cda-4e0d-4767-a78e-fcb347c4eec4`, a secret
change on release 2's code version `84a95549-cd34-4065-a202-cf5f1385e9f9`. Record `0cb2f74`,
checkpoint `a9d1062`. Live checks passed: the auth-config endpoint returning exactly `{"google":true}`,
the button on the deployed login screen, the Google redirect carrying D-012's client id and the
deployed redirect URI, the deployed origin answering 200 rather than 403, and password login,
sign-out, cookie replay and reviewer isolation unchanged with every demo-plan figure identical.

## The defect, as recorded

A top-level browser navigation to `/api/auth/callback/google` is answered by the asset layer with
`index.html` before the Worker runs, because of `not_found_handling: single-page-application`, with
`Sec-Fetch-Mode: navigate` isolated as the only deciding header. It predates S-07 and regressed
nothing else, since every client API call is fetch or XHR. A real Google sign-in cannot complete on
release 3. The fix landed at `4893a64` under D-014; release 4 will carry it.

## Documents written

- Workspace `GOALS.md`: G05 rewritten with release 3's identity, the passing live checks, the defect,
  the landed fix and release 4 pending, left open. B12 now records the login capture retaken at
  release 3 with the full set to be retaken at release 4. B13's release values now name release 4.
- `docs/SUBMISSION-PACKAGE.md`: the header note, the screenshot status, the slot 7 row, the section 10
  manifest row and byte totals, the section 5 pending item and the S-06 item's tail. The final release
  becomes release 4 with named placeholders for its SHA and version; release 3's identity and the
  defect are stated in one line each. Owner placeholders untouched.
- `docs/SUBMISSION-CHECK.md`: four readiness rows rewritten and the readiness paragraph replaced;
  owner item 8 now says the consent roundtrip waits on release 4 and why.
- `context/STATUS.md`: current SHA, the Deployment section's release 3 entry, a new entry for the
  defect and release 4, the secrets bullet now that running code reads both Google bindings, and the
  next executable action.
- `evidence/index.md`: five rows appended, the release 3 record, the live smoke and browser pass,
  defect D1, the consent redirect capture and the B12 login retake.

## Next executable action

Release 4 carrying the callback fix, then the full capture retake against it, then the owner's Google
consent roundtrip on the live site, which no agent can perform. Then the S-07 archive and the final
status F03. After those, the owner's decisions and the explicit course-upload confirmation.

## Constraints honoured

Nothing under `wrangler.jsonc`, `src/`, `tests/`, `context/changes/google-sign-in/`,
`context/decisions/D-014*`, `evidence/runs/*`, `evidence/screenshots/` or `evidence/work-log.md` was
touched. No deploy, no course upload, no nested delegation, no secret value, no em dash and no new
calendar date. Staging by explicit path, with `git pull --rebase origin main` before the push.
