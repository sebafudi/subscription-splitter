# Checkpoint: status-sync-4

- Task id: `status-sync-4`
- Model: Opus
- Status: complete
- HEAD before this task's commits: `e5a0b50`

## Summary

Recorded release 2 and the S-06 archive across the four shared documents, closing V06, W06, W07 and
W08 and refreshing D05, B12 and B08 to name the final release rather than its predecessor.

Every SHA cited was resolved with `git cat-file -e` before being written: `c842f64`, `7b68101`,
`ede931b`, `7b05886`, `8a639f3`, `44b6664`, `84e3e5c`, `e5a0b50`. Every path cited was confirmed with
`ls`, including `evidence/runs/release-2.md`, `evidence/runs/release-2-live-smoke.txt`, the ten
`evidence/screenshots/release-*.png` files, the six archive folders under `context/archive/`, the
thirteen decision records `D-001` through `D-013`, and the checkpoints read for this task
(`status-sync-3`, `release-2`, `s06-archive`, `g01-plan-fix`, `submission-fill-1`).

## Boxes checked, and what was verified first

- **V06.** Deploy `c842f64` / version `84a95549-cd34-4065-a202-cf5f1385e9f9`, hosted CI check run
  `103696850548`, live smoke `evidence/runs/release-2-live-smoke.txt`, release record
  `evidence/runs/release-2.md` at `7b68101`, the ten captures retaken at `ede931b` (confirmed by
  `git show --stat`, ten binary files replaced in place), the archive at `7b05886` and the roadmap
  flip at `8a639f3`.
- **W06 and W07.** Checked only after confirming the full chain on all six slices. Each `change.md`
  under `context/archive/` reads `status: archived`: `runtime-auth-slice`,
  `members-and-price-history`, `payments-and-recurring`, `verification-and-release`,
  `ai-review-pipeline` and `visual-redesign`. The roadmap's At a glance table reads `done` for `S-01`
  to `S-06` and each has a `## Done` entry.
- **W08.** Checked against three things, each opened rather than assumed. Thirteen decision records
  exist, `D-001-auth-solution.md` through `D-013-google-account-linking.md`. Every archived slice's
  `reviews/plan-review.md` and `reviews/impl-review.md` carries a `## Resolution` section, and four
  carry `## Re-verification` as well (`payments-and-recurring` and `verification-and-release` plan
  reviews, `ai-review-pipeline`'s phase 5 implementation review, and `visual-redesign`'s
  implementation review). `evidence/index.md` carries commit SHAs, run ids and version ids throughout.

## Boxes left open, and why

- **W09.** Its maintenance half is current and the text now says so; it stays open on the final
  independent audit, which has not run and whose report belongs at `evidence/audit/final-audit.md`.
- **F01 to F03, B11, B13 to B16, A15+, C10+, G01, G03 to G05.** Left with their current text, per the
  task's instruction. G01 in particular is one step from closing: all ten plan-review findings are
  resolved at `g01-plan-fix`, and what remains is the reviewer's independent re-verification.

## Changed paths

- `context/STATUS.md`: Current SHA rewritten to `e5a0b50` with the trail since `20057c6`; the
  working-tree line rewritten now that the four concurrent tasks have finished; a new leading bullet
  in Active change recording the complete `F-01` to `S-06` ledger with the six archive paths; the
  `visual-redesign` entry moved to archived with its closing paragraph rewritten; the
  `google-sign-in` entry given the plan-review resolution and the re-verification gate; the
  Deployment section's current release rewritten to release 2 with the rollback path, the walkthrough
  and the retaken captures; Next executable action items 6 to 9 rewritten.
- `evidence/index.md`: eight rows appended, five for V06 (release record, live smoke, captures,
  archive, roadmap) and one each superseding B12, B08 and D05 against release 2.
- `AGENTS.md`: two stale one-liners corrected, see below.
- `context/checkpoints/status-sync-4.md`: this file.
- Workspace file, not under Git: `GOALS.md` (V06, W06, W07 and W08 checked with their evidence
  rewritten; W09 text refreshed and left unchecked; D05, B12 and B08 extended to name release 2).

## The `AGENTS.md` change

Two sentences in the opening paragraph were factually stale and both are now one-liners that match
the record. "What remains is the release itself, tracked as roadmap S-04" became "The roadmap ledger
`F-01` to `S-06` is archived under `context/archive/`, and `S-07` `google-sign-in` is the active
change." "Four slices have shipped" became "Four ledger slices shipped the product behaviour",
because the enumeration that follows is `S-01` to `S-04`'s product behaviour while `S-05` and `S-06`
have also shipped. The paragraph was rewrapped to the file's existing width. Nothing else in
`AGENTS.md` was touched; its hard rules, structure, commands, style, testing and reviewer sections
carry no roadmap claim.

## Constraints honoured

No file under `src/`, `tests/`, `docs/SUBMISSION-*.md` or `context/changes/google-sign-in/` was
modified, and the S-06 archive was read rather than written. No secret value, client id or credential
appears anywhere. No em dash and no calendar date was written, confirmed by grepping the diff. No
deploy, no course upload, no nested delegation. Staging was by explicit path throughout.

## Next action

The final independent audit, goal F01, writing `evidence/audit/final-audit.md`. In parallel, the
reviewer's re-verification of the S-07 plan-review resolution, which closes G01 and unblocks phase 1.
