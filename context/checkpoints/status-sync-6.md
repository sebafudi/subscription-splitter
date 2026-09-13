# Checkpoint: status-sync-6

- Task id: `status-sync-6`
- Model: Opus
- Status: complete
- HEAD when this task started reading: `26cbd39`. The release agent `g05-release-3` committed the
  implementation review's resolution while this task wrote (`77e1232`, `6da6485`), which changed one
  of this task's two conditional outcomes, so this task's commit sits on `6da6485`.

## Summary

Recorded S-07 implementation, its independent review, the review's resolution and the designer's
acceptance across the five shared documents. G03 and G04 are both checked; G05 is left open with the
release 3 state exactly as the release agent had recorded it.

## The release checkpoint, polled twice as instructed

`context/checkpoints/g05-release-3.md` did not exist at either poll, at the start of this task and
again immediately before this commit, and `evidence/runs/release-3.md` does not exist either. No
release SHA and no Cloudflare version id for release 3 could therefore be written anywhere, and every
document says so in those words rather than guessing. Release 2 remains the live release throughout:
`c842f64` as Cloudflare version `84a95549-cd34-4065-a202-cf5f1385e9f9`, which carries no Google
button.

Between the two polls the release agent landed two commits, so the second poll changed the outcome
of one instruction. The task condition for G04 was that the review's `## Resolution` be committed;
at the first read it was not, at the second it was, at `77e1232` with an em-dash cleanup at
`6da6485`. G04 is therefore checked rather than left open, and the pending-commit wording that had
been written for it was replaced with what the resolution actually records.

## Verification performed before writing

- Every SHA cited was resolved with `git cat-file -e <sha>^{commit}`: `43f41f2`, `cf3e3de`,
  `e6b3dab`, `7a3a3ce`, `f66a431`, `9ce597a`, `4d3fc77`, `ed57890`, `26cbd39`, `77e1232`, `6da6485`,
  `c842f64`, `461b950`, `751d4df`, `24003e5`.
- Read in full before editing: `context/checkpoints/status-sync-5.md`, `g03-phase2-client.md`,
  `g03-phase3-4.md`, `g04-impl-review.md`, `context/changes/google-sign-in/reviews/impl-review.md`
  with its `## Resolution`, and `reviews/design-acceptance.md`.
- `change.md`'s status was read from the file rather than assumed at each stage: `implemented` at
  `4d3fc77`, `impl_reviewed` at `77e1232`.
- The F1 and F2 fixes were confirmed in the tree rather than taken from the resolution's own prose:
  the fourteen phase 2 Progress rows now carry `cf3e3de` and `751d4df`, and the gates file's guard
  section now names the client id in D-012 and the two wider secret checks.

## G03, checked

All four phases landed with all fifty-six Progress rows ticked, each citing its commit. Phase 1
`43f41f2`, phase 2 `cf3e3de` and `e6b3dab` with the browser pass `751d4df`, the designer's 3.3
amendment `a1f9977` and its application `7a3a3ce`, phase 3 `461b950` and `f66a431`, phase 4
`9ce597a`, closed at `4d3fc77`. Gates ran twice on the tree carrying the border fix, secretless and
configured, exit 0 in both at unit 18 files / 214 tests and integration 12 files / 119 tests.
`tests/integration/auth.test.ts` is byte-identical to `c842f64`. Sixteen acceptance captures.

## G04, checked

Review `ed57890`, verdict APPROVED, 0 critical, 2 warnings, 6 observations, both required findings
being record fixes rather than code. Resolution `77e1232` and `6da6485`: F1 fixed in `plan.md`, F2
fixed in the gates file, O4 re-read in the code rather than accepted, O5 deferred to the archive
step, the other four acknowledged. Designer's acceptance `26cbd39`, accepted without corrections.

## G05, left open

Open with the release 3 state as recorded, which is nothing yet, and with the consent roundtrip named
as needing the owner's own Google account, since the audience stays External in Testing with the
owner as its only test user. No artifact says that public Google login works.

## Documents written

- Workspace `GOALS.md`: G03 and G04 checked, G05 rewritten, B12 and B13 given the login-capture
  retake and the package slot that depends on it. V06 untouched.
- `docs/SUBMISSION-PACKAGE.md`: the header note, the screenshot status, field 7 in section 8.1, the
  section 10 manifest row and the pending list now say that the final release becomes release 3 once
  `evidence/runs/release-3.md` exists, that only the login capture changes, and that the Google
  consent roundtrip is not a certification requirement. Owner placeholders untouched.
- `docs/SUBMISSION-CHECK.md`: two readiness rows added, the readiness paragraph rewritten, and the
  consent roundtrip added to the owner list as a non-form item only the owner can do.
- `context/STATUS.md`: current SHA, working tree, the S-07 entry, the gate figures, a release 3
  paragraph in Deployment, and the next executable action.
- `evidence/index.md`: eight rows appended, phases 2 to 4, the 3.3 amendment, G03 closed, the review,
  the designer's acceptance and the resolution.

## Next executable action

The owner's Google consent roundtrip on the live site, once release 3 is deployed; then S-07 is
archived and the final status written. After those, the owner's decisions and the explicit
course-upload confirmation for the package.

## Constraints honoured

Nothing under `src/`, `tests/`, `context/changes/google-sign-in/`, `evidence/runs/release-3*`,
`evidence/screenshots/` or `evidence/work-log.md` was touched. No deploy, no course upload, no nested
delegation, no secret value, no em dash and no new calendar date. Staging by explicit path, with
`git pull --rebase origin main` before the push.
