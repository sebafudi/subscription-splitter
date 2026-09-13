# Checkpoint: submission-draft-1

- **Task id**: `submission-draft-1`
- **Goal ids**: B13, A15 and C10 (package preparation only; nothing uploaded or submitted)
- **Model**: Opus
- **Status**: complete

## Summary

Turned the submission package from an evidence document into a ready-to-paste one. Added a Part II to
`docs/SUBMISSION-PACKAGE.md` in the course workspace with every field of both certification forms in
form order, both comment drafts in Polish with English glosses, the fields the package cannot fill and
why, and an attachment manifest with exact paths and byte sizes. Refreshed the readiness table in
`docs/SUBMISSION-CHECK.md` and closed it with the owner-decision list and the upload-confirmation line.

Read-only against this repository. No source file, no evidence file and no form was touched. Nothing
was uploaded, attached or submitted, and `evidence/private/` was not opened.

## What the drafts are built from

Only the project's own record: the numbered decisions in `context/decisions/`, the six archived and
in-flight implementation reviews and their verdicts, the three defects the Champion work found by
running rather than reading, the section-index offset defect from the visual redesign, the Workers and
D1 constraints recorded in D-001 and D-005, and the date-free progress convention. No personal or
health context, and no name beyond the repository owner handle.

## Release values

`evidence/runs/release-2.md` does not exist yet, so the Builder comment keeps `<release-2 sha>` and a
version placeholder, and all ten `release-*.png` captures are marked "retake in progress by
release-2". `context/checkpoints/release-2.md` records the deploy and the live API smoke as done at
SHA `c842f64`, Cloudflare version `84a95549-cd34-4065-a202-cf5f1385e9f9`, gates 17 unit files / 194
tests and 11 integration files / 112 tests. Part II quotes those three as provisional and says they
must be re-read from the release record once it lands.

## Files

- `/Users/sebastian.f/Projects/10xDevs/docs/SUBMISSION-PACKAGE.md` - new Part II, sections 8 to 10,
  plus a pointer line near the top. Sections 1 to 7 unchanged.
- `/Users/sebastian.f/Projects/10xDevs/docs/SUBMISSION-CHECK.md` - readiness section replaced with a
  per-badge table; the old open-questions list replaced with "Owner decisions needed before upload"
  and "Explicit upload confirmation required".
- This checkpoint.

## Placeholders remaining

1. Course account email, both forms.
2. Promotion consent, `Tak` or `Nie`, Builder form.
3. Badge selection on the joint form; the evidence supports `Obie odznaki`.
4. Reviewer credential delivery channel, and the values themselves, which the owner types.
5. Release SHA and the three test counts in the Builder comment.
6. The impressions paragraph at the end of each comment, which the forms ask for and no project
   document records.
7. LICENSE: no `LICENSE` file exists; nothing requires one.

## Next action

When `evidence/runs/release-2.md` lands, fill the release SHA, version and test counts into section
8.1 and the two comment drafts, and flip the ten attachment rows in section 10 from "retake in
progress" to their new sizes. Then the F01 final audit, then the owner's decisions and explicit upload
confirmation.
