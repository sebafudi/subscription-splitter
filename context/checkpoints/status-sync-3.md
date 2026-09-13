# Checkpoint: status-sync-3

- Task id: `status-sync-3`
- Model: Opus
- Status: complete
- HEAD when written: `20057c6`, revised against `ec6a8d3`

## Summary

Recorded the S-07 `google-sign-in` planning block and the S-06 release's deploy and live API smoke
across the three shared status documents, and closed G02 on the provisioning record while naming its
one handed-over item under G05.

Every SHA cited was resolved with `git cat-file -e` before being written: `9e2649d`, `bab0f42`,
`9ae624c`, `1fb2968`, `d37fdc8`, `f496646`, `69e12aa`, `137b3e0`, `c1b6ebe`, `24003e5`, `20057c6`,
`10f6fa5`, `c842f64`, `4a7c6cc`, `da7ad52`, `8ed3422`, `ec6a8d3`. Every path cited was confirmed with `ls`,
including the six `context/changes/google-sign-in/*` files, `D-012`, `D-013`, the six checkpoints read
for this task, `evidence/runs/release-2-live-smoke.txt`, `evidence/runs/release-2-plan.md` and the two
workspace documents under `docs/`.

## Changed paths

- `context/STATUS.md`: Current SHA rewritten to `20057c6` with the trail since `d934944`; the
  working-tree line rewritten to name the release agent and the plan reviewer; a new line recording
  that shared files have one owner; a new Active change entry for `google-sign-in`; the
  `visual-redesign` entry's closing sentences rewritten from "not redeployed" to the landed release;
  two new Checks lines, the release gates and the no-Google-value constraint; the Deployment section's
  current release replaced and the secrets line extended; Next executable action item 6 rewritten,
  item 7's owner list moved out, and new items 8 (S-07) and 9 (pending on the owner); the Newly
  requested work section rewritten; the three trailing Google handoff sections folded into one.
- `evidence/index.md`: the placeholder V06 row replaced with a real partial row, and seven rows
  appended, five for G01, one for G02 and one for B13.
- `context/checkpoints/status-sync-3.md`: this file.
- Workspace file, not under Git: `GOALS.md` (G01 text updated and left unchecked, G02 checked, G05
  given G02's handed-over item, V06 and B13 text updated and left unchecked, the stale provisioning
  handoff section corrected).

## The external `context/STATUS.md` edit

`context/STATUS.md` carried an uncommitted change from another session: three appended sections,
"OAuth browser provisioning handoff", "Google OAuth, resume with saved credentials" and its
continuation. Its accurate content was that Google Console provisioning is complete, that the
credentials are in the git-ignored `.dev.vars`, that the project and client must not be recreated and
the owner must not be asked for the credentials again, that the audience stays External in Testing
with no silent publication or scope expansion, that password login and cross-account isolation are
preserved, and that no course upload happens without explicit confirmation. All of that is kept.

Its inaccurate content was that Cloudflare secret provisioning remains pending and that remote secrets
must not be assumed to exist. That was true when written and is not true now: `24003e5` and `20057c6`
record `GOOGLE_CLIENT_SECRET` set in the Worker's secret store and confirmed by name. The three
sections were folded into one, "Google sign-in addition, S-07", which states plainly that it replaces
them and that the secret is no longer pending, and which keeps the still-correct facts, including that
`GOOGLE_CLIENT_ID` is deliberately unset on Cloudflare. The same correction was made to the workspace
`GOALS.md` handoff section.

## What stayed open, and why

- **G01**: the independent plan review landed at `ec6a8d3` while this task was writing, so the three
  documents were revised in a second pass to record the real outcome rather than a review in progress.
  Verdict REVISE, 3 critical, 3 warnings, 4 observations, with End-State Alignment and Blind Spots
  FAIL. `change.md` is now `plan_reviewed`. The box stays unchecked because F1 through F6 must be
  resolved and re-verified before phase 1, and F10 goes back to the designer.
- **V06**: deploy and live API smoke are done at `c842f64` / version
  `84a95549-cd34-4065-a202-cf5f1385e9f9`. The browser walkthrough, the ten certification captures and
  `evidence/runs/release-2.md` are in progress, and the archive and roadmap flip follow them.
- **B13**: the drafts exist; seven owner decisions and the release values block it.
- **G03 to G05**: not started; G05 additionally carries G02's remaining item, verifying the remote
  Google configuration by running code.

## Files deliberately left unstaged

One file carried another task's uncommitted work and was not staged: the designer's
`context/changes/google-sign-in/design-delta.md`, whose HTTP-error paragraph the plan reviewer also
read without staging and raised as F3. The plan reviewer's own edits landed as `ec6a8d3` during this
task and needed no handling. Only `context/STATUS.md`, `evidence/index.md` and this checkpoint were
staged and committed, each by explicit path.

## Constraints honoured

No file under `src/`, `tests/`, `docs/SUBMISSION-*.md` or any `visual-redesign` or `google-sign-in`
change path was modified. No secret value appears anywhere; the client id was not copied out of D-012.
No em dash and no new calendar date was written. No deploy, no course upload, no nested delegation.

## Next action

When the release agent writes `evidence/runs/release-2.md` and the ten captures, replace the partial
V06 row with real rows, flip V06 and fill the submission package's release values. When F1 through F6
of the plan review are resolved and re-verified, close G01 and start the S-07 phases.
