# Handoff: compact-member-calendar (roadmap S-09)

## What shipped

The Participants section on the subscription detail screen is now a compact per-person year calendar
with a month inspector, replacing the earlier unbounded per-person history list. Each participant
shows a lifetime summary, a selected-year row of twelve month cells (recorded, assumed, excepted,
paused, unpriced and future states, each with an accessible sentence and a visible mark, never colour
alone), and a month inspector that exposes every manual receipt and the standing-order status
separately, with all existing management actions (add/edit/archive/delete participant, record/edit/
delete payment, edit/delete standing order, mark an exception) reachable from it. Received and assumed
receipts are never summed into one figure. A shared year control and legend sit above the person
blocks; payments received stay behind the same bounded, twelve-at-a-time disclosure; standing-order
month tiles are removed from `RecurringSection`, which keeps its rows, totals and forms.

Collapsed height no longer grows with elapsed months or receipts: a one-year and an eight-year
synthetic fixture with the same six participants render an identical 72 gridcells and an identical
`.calendar-blocks`/Participants `scrollHeight`, with the whole-page difference between them
attributable only to a second skipped month and a second standing order, never to history length.

## Release identity and rollback

- Release commit: `64eb0d3b096eef53a6d264ee483e1d9c7e1dc17a` (`64eb0d3`)
- Cloudflare Worker version: `a80d2e12-d77e-4b88-b318-aa992eb60d50`
- Superseded (rollback reference): `751a8bfd-e62a-4c9a-beb2-1953eb6a7656` (release 5)
- Rollback command: `npx wrangler rollback --version-id 751a8bfd-e62a-4c9a-beb2-1953eb6a7656`
- Hosted CI: run `34881238556`, green at the release SHA
- Gates at the release SHA: typecheck exit 0 across three projects; unit 26 files / 359 tests;
  integration 13 files / 131 tests; build exit 0
- No migration, no Worker configuration change, no server change and no dependency change ship; the
  diff is twenty-four files under `src/client/`
- Live smoke: forty-six of forty-six checks pass on a disposable subscription, no defect found

## Evidence paths

- Release and live verification: `evidence/runs/release-6.md`, `evidence/runs/release-6-live-smoke.txt`,
  `evidence/screenshots/s09-live/`, checkpoint `context/checkpoints/release-6.md`
- Compactness and browser behaviour: `evidence/runs/s09-compactness.md`,
  `evidence/runs/s09-browser-verification.md`
- Implementation review: `reviews/impl-review.md` (this folder), APPROVED and extended twice to the
  release candidate
- Design acceptance: `reviews/design-acceptance.md` (this folder), accepted at the release candidate,
  extended to a fourth pass inspecting the live release
- Certification-capture refresh: checkpoint `context/checkpoints/release-6-captures.md`; seven of ten
  slots retaken; manifest 1,340,978 bytes (780,543 required / 560,435 optional)
- Evidence index row: `evidence/index.md`, C06; work log entries: `evidence/work-log.md`
- This archive's own record: `context/checkpoints/cmc-6-archive.md`

## Limits, carried forward honestly

- Browser verification stayed Chrome-only throughout: headless desktop and a 390px frame for the
  implementation pass, real Chrome 152 for the release. Safari, Firefox, mobile browsers and real
  touch were never driven.
- The empty-`activeRanges` case (a member with no membership range at all) is unreachable through the
  product's own routes and stays a unit-test case only; it was never exercised live.
- Reduced motion was verified through the existing zero-duration tokens rather than a live emulation.
- The archived-and-settled disclosure, a server-side 500 and the price-delete refusal were not
  re-exercised in this change and are unchanged code.

## Open items outside this change

- The workspace `GOALS.md` F01 final audit still stands at release 4 and has not been re-run against
  release 5 or release 6. Re-auditing it is a submission-package task, not part of this change.
- The submission package (`docs/SUBMISSION-PACKAGE.md`, `docs/SUBMISSION-CHECK.md`) carries owner-only
  placeholders: the course account email and name, the promotion-consent answer, the joint form's
  badge selection, the reviewer credential delivery channel and its values, the closing impressions
  paragraph for each comment, and the LICENSE decision for the public repository.
- Nothing has been uploaded, attached or submitted to the course. The explicit course-upload
  confirmation remains the owner's alone; no agent may give it.
