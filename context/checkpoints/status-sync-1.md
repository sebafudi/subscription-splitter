# Checkpoint: status-sync-1

- Task id: `status-sync-1`
- Model: Opus
- Status: complete
- HEAD when written: `42ee84b`

## Summary

Reconciled the shared status documents against verified repository state. Every claim taken from the
`state-reconciliation-1` audit was re-checked here: all eleven cited commits resolve with
`git cat-file -t`, the eight domain test files and eleven integration test files exist, the captured
run files and the six `evidence/champion/` artifacts exist, and the S-06 implementation review at
`42ee84b` carries verdict APPROVED with F1 and F2 required and F3 to F7 as observations, nothing
resolved at that SHA.

B05, B06 and B07 were checked sub-rule by sub-rule against code rather than against prose. Every
sub-rule the three goals name has an implementation and a test, including the two that the "Partial"
text left ambiguous: manual payments and credits (`creditOutstanding` in `src/domain/calc.ts`, with an
over-payment and a future-dated payment each covered) and owner net cost (`ownerNetCost`, the plan
total less what was collected). All three boxes are now checked.

## Changed paths

- `evidence/index.md`: two existing payments-and-recurring rows retagged with B05, B06 and B07; three
  consolidated rows appended, one per goal, mapping every sub-rule to its file, test, commit and run.
- `context/STATUS.md`: Current SHA, the S-06 entry, Next executable action items 6 and 7, the
  "Newly requested work" paragraph and one restating line under Approved external scope.
- Workspace files, not under Git: `GOALS.md` (B05, B06, B07 checked; W06, W07, V04 text; the Champion
  follow-up paragraph replaced with a resolved statement), `docs/SUBMISSION-PACKAGE.md` (Champion
  section rewritten from BLOCKED to its real state, pending list, form-field gap table),
  `docs/SUBMISSION-CHECK.md` (dynamic-field gap closed, badge readiness, open questions).

## Unresolved

- S-06 `visual-redesign`: F1 and F2 are being resolved by `s06-impl-review-resolution`; its checkpoint
  did not exist when this ran, so its state is reflected only as in progress.
- The accepted revision is not deployed. The live Worker serves `8ed3422` (version `8e4fa506`), which
  predates the redesign, so every `release-*.png` capture the submission package cites is stale.
- Three owner decisions stand: the course email, the promotion consent choice, and the reviewer
  credential delivery channel. The joint form's badge selection is a fourth.
- `evidence/audit/final-audit.md` (F01) does not exist.

## Next action

Wait for the S-06 review findings to be resolved and re-verified, then redeploy, verify live, retake
the release captures, archive the slice, and only then run F01.
