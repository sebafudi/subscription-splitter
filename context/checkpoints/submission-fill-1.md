# Checkpoint: submission-fill-1

- Task id: `submission-fill-1`
- Model: Sonnet
- Status: complete
- Scope: `docs/SUBMISSION-PACKAGE.md` and `docs/SUBMISSION-CHECK.md` in the workspace root, not this
  repository. This repository was read only, except this checkpoint.

## What was done

Replaced every release 1 reference used as the submitted release (SHA `8ed3422`, version
`8e4fa506-cd63-412c-88f2-0101b6348bdb`) with release 2's values (SHA
`c842f64cfaa1f362b0f34cbad35ec8e565805437` / `c842f64`, version
`84a95549-cd34-4065-a202-cf5f1385e9f9`, typecheck 0, unit 17 files / 194 tests, integration 11 files /
112 tests, build 0, hosted CI run `103696850548`), reading them from
`evidence/runs/release-2.md`, `evidence/runs/release-2-live-smoke.txt` and
`context/checkpoints/release-2.md`. Historical mentions of release 1 as the superseded predecessor
were left in place and labelled as history.

Edits in `docs/SUBMISSION-PACKAGE.md`:

- Front matter revision note, section 2 status line and its "three things stand between" paragraph,
  the Live URL paragraph, the screenshot-status paragraph, the two screenshot tables, the release
  candidate table, the old section-2 comment draft's bracketed test counts, the note below it, the
  reviewer-instructions quote source, the Builder readiness checklist rows and its numbered pending
  list (item 1 rewritten as done, item 3 narrowed to the archive alone), the section 7 verification
  notes (four bullets), the Part II "Release values" paragraph, the section 8.1 field table (rows 6-12),
  the section 8.2 and 8.3 comment placeholders, the section 9.4 "cannot fill" table (release SHA row
  removed as resolved), the "form fields not yet filled" table (screenshot and live-URL rows removed,
  comment row narrowed to the one remaining placeholder), the "fully ready" summary sentence, owner
  decision 6, and the full section 10 attachment manifest (all ten Builder files re-sized and marked
  Ready).
- Attachment sizes were re-measured with `ls -l` against the actual files on disk (the S-06 redeploy
  overwrote the ten `release-*.png` files in place): required-slot total 501,282 bytes, optional total
  532,998 bytes, ten-file total 1,034,280 bytes (0.99 MiB). Superseding the earlier release 1 sizes
  (683,417 / 456,769 / 1,140,186 bytes), which are recorded only as history where they remain.
- Added the S-07 Google sign-in caveat requested for the readiness note: if that feature ships before
  submission, it adds a button to the login screen and `release-01-login.png` would need one more
  retake; not the case today.

Edits in `docs/SUBMISSION-CHECK.md`: the Builder readiness table rows for live URL, comment text, the
two screenshot rows, and the release-SHA/test-count row (all flipped to Ready/Filled); the closing
sentence after the readiness table; and owner decision 5 (live URL) reworded from pending to confirmed.

## What was left untouched, as instructed

- The owner-decision placeholders: course email, promotion consent, credential channel, LICENSE
  choice, and both impressions paragraphs (Builder and joint form). These stay bracketed and clearly
  marked for the owner in both documents.
- Everything unrelated to release 1 versus release 2 (Architect and Champion sections, the joint form,
  the `GOALS.md` F01 final audit note, the S-06 archive-in-progress note).

## Remaining placeholders (owner decisions only)

- `[OWNER: course account email]` / `[COURSE EMAIL - OWNER TO CONFIRM]`
- `[OWNER: Tak or Nie]` (promotion consent)
- `[KANAŁ]` / `[CHANNEL]` (reviewer credential delivery channel)
- `[WRAŻENIA ...]` / `[IMPRESSIONS ...]` in both the Builder and the joint form comments
- LICENSE choice (noted, not a form field)

## Verification

- Re-read both documents end to end after editing; no remaining occurrence of `8ed3422`, `8e4fa506`,
  `34716922381`, `15 files`/`185 tests`, or "Retake in progress"/"pre-redesign" outside clearly labelled
  history.
- Screenshot byte counts came from `ls -l` on the actual files under
  `subscription-splitter/evidence/screenshots/`, not copied from any draft.
- Nothing was uploaded, attached or submitted. This checkpoint documents package edits only.
