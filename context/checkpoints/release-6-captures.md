# Checkpoint: release-6-captures

- **Task**: refreshing the certification captures for release 6 (change `compact-member-calendar`,
  S-09, parent goal C06)
- **Model**: Opus
- **Status**: complete. Seven captures refreshed, three deliberately left alone, both course-workspace
  documents updated, no defect found
- **Release SHA**: `64eb0d3b096eef53a6d264ee483e1d9c7e1dc17a` (`64eb0d3`)
- **Cloudflare version id**: `a80d2e12-d77e-4b88-b318-aa992eb60d50`
- **Hosted CI run**: `34881238556`

## What was done

1. Confirmed from inside the captured page that the live root serves `index-DlWpQE-s.js` and
   `index-ByHeNjZo.css`, the two asset names release 6's clean-clone build emitted. The check ran twice
   in the same page session, at sign-in and after the last browser capture. Release 5's bundle carries
   neither name.
2. Created one synthetic subscription under the owner account through the application's own routes,
   "Shared streaming plan" from `2024-01`: six participants including one who left, three prices, two
   skipped months, two standing orders and ten receipts across three years, two of them in the same
   month for one participant. Release 5's "Family music plan" has two participants and starts in March
   2026, so it cannot show a twelve-month calendar or a live year control.
3. Retook `release-03-input-record-payment.png`, `release-04-output-balances.png`,
   `release-06-members-and-prices.png`, `release-07-recurring-assumed-received.png`,
   `release-08-error-before-start-month.png` and `release-10-narrow-phone.png` as 948 by 1033 window
   captures of a real Chrome window against the live URL, in the dark palette, with the address bar
   visible. Each frame was composed against measured element positions in the live DOM rather than by
   replaying release 5's scroll offsets, which `evidence/runs/release-6.md` says no longer frame what
   they framed. `release-10` carries the open month inspector at 390 CSS pixels.
4. Retook `release-05-tests-passing.png` as a 1336 by 1225 Terminal window capture in the throwaway
   clone at the release SHA, showing the full SHA, an empty working tree, a clean typecheck, unit 26
   files / 359 tests and integration 13 files / 131 tests.
5. Left `release-01`, `release-02` and `release-09` untouched. Each shows a screen
   `evidence/runs/release-6.md` reads off the client diff as unaltered.
6. Updated `docs/SUBMISSION-PACKAGE.md` and `docs/SUBMISSION-CHECK.md` in the course workspace, which
   is not under version control: the release identity throughout, the Cloudflare version, the CI run
   id, both comment drafts' SHA and counts in Polish and in English, section 10's per-row byte sizes and
   totals, and release 5 relabelled as history beside releases 2, 3 and 4. The owner-decision
   placeholders and the upload-confirmation line were not touched, and nothing was uploaded.
7. Wrote `evidence/runs/release-6-captures.md`.

## One correction to release 6's own slot list

`evidence/runs/release-6.md` lists six affected slots and rules `release-08-error-before-start-month.png`
unaffected. The payment panel in that frame is indeed unchanged, but the frame also holds the two stored
payments beneath it, and `PaymentList.tsx` now renders that list inside a disclosure closed on every
load. The file was retaken, making seven rather than six. Recorded in the evidence file rather than
left implicit.

## What was not changed live

Forms were opened and cancelled. One payment was submitted and refused, which stores nothing and is
itself the capture in slot 12. The only write was the synthetic subscription this pass created, and the
only delete was that same subscription: `DELETE` answered 204 and a later `GET` answered 404. The
owner's list held the same two subscriptions with the same ids and names before and after, and the
reviewer's list held zero rows before and after. Both sessions were signed out and the signed-out cookie
answers 401 on replay.

## What remains

- `GOALS.md` F01's final audit was last run at release 4 and has not been re-run against release 5 or
  release 6. `docs/SUBMISSION-CHECK.md` and `docs/SUBMISSION-PACKAGE.md` now say so rather than calling
  the audit current.
- The goal-box updates for S-09 and C06 go to the designated status writer. This task edits neither
  `context/foundation/`, `context/STATUS.md`, `evidence/index.md`, `evidence/work-log.md`, `AGENTS.md`,
  `README.md` nor the workspace `GOALS.md`.
- Nothing has been uploaded to the course, and nothing here authorises it.
