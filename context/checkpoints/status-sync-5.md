# Checkpoint: status-sync-5

- Task id: `status-sync-5`
- Model: Opus
- Status: complete
- HEAD before this task's commit: `866ae3a`

## Summary

Applied every correction the independent final audit (`evidence/audit/final-audit.md`, `866ae3a`)
records, checked F01, W09 and G01 in the workspace `GOALS.md`, recorded S-07 phase 1 across the
shared documents, and removed the five authored calendar dates the audit found in evidence title
lines.

## Verification performed before writing

- Every SHA cited was resolved with `git cat-file -e <sha>^{commit}`: `866ae3a`, `9e2649d`,
  `bab0f42`, `d37fdc8`, `91fcbce`, `1fb2968`, `f496646`, `ec6a8d3`, `2fe573c`, `3d6c1d0`, `43f41f2`,
  `c842f64`.
- The hosted CI identifier was resolved against GitHub rather than assumed:
  `gh run view 34747075507 -R sebafudi/subscription-splitter --json status,conclusion,headSha`
  returns workflow `CI`, status `completed`, conclusion `success`, head SHA
  `c842f64cfaa1f362b0f34cbad35ec8e565805437`. `103696850548` is a job inside that run.
- Read in full before editing: `evidence/audit/final-audit.md` and the checkpoints
  `final-audit-1.md`, `status-sync-4.md`, `g01-plan-reverify.md` and `g03-phase1-server.md`.

## Corrections applied to the workspace `GOALS.md`

- **D01.** The parenthetical now records what the cited file records, unit 3 files / 17 tests and
  integration 4 files / 21 tests, in place of "19 integration tests", which appeared nowhere in it.
- **B03.** The count is now attached to what it describes: 15 tests across `auth.test.ts` and
  `dev-seed.test.ts`, with 21 named as the whole integration suite at that slice.
- **V01, V04, V05.** The three `context/changes/visual-redesign/...` paths retired by the archive
  move now read `context/archive/visual-redesign/...`.
- **V06.** The hosted CI claim now names run `34747075507` with its workflow, conclusion and head
  SHA, and says plainly that `103696850548` is a job id inside it.
- **W09, checked.** Both of its own wording defects are corrected: the index is described as
  maintained per goal set with 51 goal ids rather than as a row per goal, and the audit report is
  recorded as having existed since `cd25fd9` and been stale rather than absent.
- **F01, checked.** Cites the report, the audit HEAD, the re-run gates, the three independent
  confirmations of release identity, and the explicit list of genuinely missing goals.
- **G01, checked.** Cites research `9e2649d`, framing `bab0f42`, delta `d37fdc8` amended `91fcbce`,
  D-013 `1fb2968`, plan `f496646`, review `ec6a8d3`, resolution `2fe573c` and the independent
  re-verification SOUND at `3d6c1d0`.
- **G03, still open**, with phase 1 recorded: `43f41f2` and `922a17a`, gates run twice, secretless
  and configured, exit 0 both times at unit 18 files / 214 tests and integration 12 files / 119
  tests, phase 2 in progress at `cf3e3de` and `e6b3dab`.
- The provisioning handoff paragraph's claim that `GOOGLE_CLIENT_ID` is unset on Cloudflare was
  stale and now records the phase 1 decision, a secret set with `wrangler secret put`.
- Left with their current text, as instructed: F02, F03, B11, B13 to B16, A15 and after, C10 and
  after, G04 and G05.

## Shared documents

- `docs/SUBMISSION-PACKAGE.md`: the four places presenting `103696850548` as the CI run now name run
  `34747075507`; a readiness row and a verification note record the audit; pending item 4 flipped
  from "does not exist yet" to done. Owner placeholders untouched.
- `docs/SUBMISSION-CHECK.md`: the F01 row reads done with the report and its finding; the readiness
  paragraph now says what actually remains before upload, and states that the deployed release does
  not carry Google sign-in.
- `context/STATUS.md`: current SHA `866ae3a` with the trail since `e5a0b50`; the working-tree line
  rewritten for the two concurrent S-07 implementers; the release-2 gate line's CI identifier
  corrected; the Google binding lines corrected in both places they appear; the no-Google-value gate
  line rewritten to what phase 1 proved; item 7 rewritten around F01 and W09 being closed; item 8
  rewritten around G01 closed, phase 1 landed and phase 2 in progress, with the G05 login capture
  retake named.
- `evidence/index.md`: the two `check run` labels corrected, and four rows appended, F01, W09, G01
  and G03 phase 1.

## Dates removed

Five authored calendar dates in four evidence title and heading lines, per the audit's table:
`evidence/champion/hosted-review-run.md`, `evidence/champion/eval-results.md`,
`evidence/champion/eval-results-8000-superseded.md` (two heading lines) and
`evidence/runs/ai-review-live-call.md`. Run ids, SHAs, model ids and the promptfoo eval ids were
kept, and no data row or JSON output was touched. The audit's grep re-run afterwards returns no
authored date in any of the four. The single known pre-existing hit in `context/STATUS.md`, which
the audit records as the accepted exception, was left in place.

## Next executable action

S-07 phases 2 to 4, then the independent implementation review and the designer's acceptance (G04),
then G05, the deploy and the real Google consent roundtrip, with a retake of
`evidence/screenshots/release-01-login.png`. After those, the owner's decisions and the explicit
course-upload confirmation.

## Constraints honoured

Nothing under `src/`, `tests/`, `context/changes/google-sign-in/` or the `google-sign-in-*` evidence
was touched. No deploy, no course upload, no nested delegation, no secret value, no em dash and no
new calendar date. Staging by explicit path, with `git pull --rebase origin main` before the push.
