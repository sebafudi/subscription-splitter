# Checkpoint: status-sync-8

- Task id: `status-sync-8`
- Model: Opus
- Status: complete
- HEAD when this task ran: `7b1bef6`, the release 4 record and its live verification. This task's commit sits on it.

## Summary

Moved the submission package and the three shared status documents from "release 4 pending" to
release 4 as the package's final release. G05 stays open, on the owner's consent roundtrip alone.

## Release 4, as recorded

Release commit `bad3f2816611c00cd691b4ef67f1108d618bed60` (`bad3f28`) deployed as Cloudflare version
`1d0f71c1-6832-4bc1-aace-5feef621e715`, superseding `ad3aaa60-b2b6-458a-92c4-ff57d43f423c` (release
3). Gates typecheck exit 0, unit 18 files / 214 tests, integration 12 files / 119 tests, build exit 0.
Hosted CI run `34751198550`, workflow `CI`, conclusion success, at that exact SHA. Record `7b1bef6`,
fix `4893a64` under `context/decisions/D-014-run-worker-first-for-api.md`.

## Verification performed before writing

- Every SHA cited was resolved with `git cat-file -e <sha>^{commit}`: `bad3f28` in full, `4893a64`,
  `7b1bef6`, `6da6485`, `206dde4`.
- The hosted CI run was read live with `gh run list -R sebafudi/subscription-splitter --commit
  bad3f2816611c00cd691b4ef67f1108d618bed60`, not taken from prose. One run, id `34751198550`,
  workflow `CI`, status completed, conclusion success.
- All thirteen capture sizes were measured with `ls -l` rather than copied: the ten certification
  files total 1,000,524 bytes, 494,080 across the first five rows and 506,444 across the five optional
  ones, recomputed from the measured sizes rather than from the previous totals.
- `git log -1 --format=%h -- evidence/screenshots/release-05*.png` returns `7b1bef6`, the same commit
  as the release record rather than an earlier one, so the captures were committed with the record and
  none of them predates it.
- Read in full before editing: `context/checkpoints/status-sync-7.md`,
  `context/checkpoints/g05-callback-fix.md`, `evidence/runs/release-4.md`, the header and the results
  sections of `evidence/runs/release-4-live-smoke.txt`, and
  `context/decisions/D-014-run-worker-first-for-api.md`.

## Documents written

- `docs/SUBMISSION-PACKAGE.md`: the header note, the live URL paragraph, the screenshot status
  paragraph, the two byte tables in section 2, the release candidate table, all four Builder comment
  drafts (Polish and English, in sections 2 and 8), the bracketed-values paragraph, four readiness
  rows, section 5 items 1 and 5, the section 7 release values, section 8.1 fields 6 to 12, the section
  9.4 tail, and the section 10 manifest with its totals. Every "final release" mention now names
  release 4; releases 2 and 3 are labelled history. Owner placeholders untouched.
- `docs/SUBMISSION-CHECK.md`: seven readiness rows, the readiness paragraph, owner item 5 and owner
  item 8, which no longer says the consent roundtrip is blocked.
- Workspace `GOALS.md`: G05 rewritten with release 4 first and release 3 kept as history, left open on
  the consent roundtrip; B12 moved to the release 4 capture set; B13's release values filled from
  release 4; F01 given the delta audit as its next step.
- `context/STATUS.md`: current SHA, the working-tree note, release 2 and 3 relabelled history, a new
  current-release entry for release 4, the secrets bullet, and the next executable action.
- `evidence/index.md`: six rows appended for release 4, its live smoke and browser pass, defect D1
  closed, the two new captures and the full B12 retake.

## The Google mention in the comment drafts

The drafts describe authentication without naming Google at all, so the shorter truthful option was to
leave them that way rather than add a shipped-with-caveat sentence in two languages. Nothing in either
draft claims that Google sign-in works, and nothing needed removing.

## One correction outside the named scope

The task named G05, B12 and F01 in `GOALS.md` and said others were unchanged. B13's release-values
paragraph said the values stay open until release 4 is recorded, which release 4 made false, so it was
filled from release 4 rather than left standing as a wrong statement. No other box was touched.

## Next executable action

The delta audit for release 4, covering only what has changed since the F01 report's HEAD `57065dc`.
Then the owner's Google consent roundtrip on the live site, which no agent can perform and which is no
longer blocked. Then the S-07 archive and the final status F03. After those, the owner's decisions and
the explicit course-upload confirmation.

## Constraints honoured

No deploy, no course upload, no nested delegation, no secret value, no em dash in anything written
here, and no new calendar date. Nothing under `src/`, `tests/`, `wrangler.jsonc`,
`context/changes/google-sign-in/`, `context/decisions/`, `evidence/runs/`, `evidence/screenshots/` or
`evidence/work-log.md` was touched. Staged by explicit path, with `git pull --rebase origin main`
before the push.
