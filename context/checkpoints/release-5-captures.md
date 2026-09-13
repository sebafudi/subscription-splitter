# Checkpoint: release-5-captures

- **Task**: refreshing the certification captures for release 5 (change
  `subscription-management-and-date-inputs`, S-08, parent goal M06)
- **Model**: Opus
- **Status**: complete. Five captures refreshed, five deliberately left alone, both course-workspace
  documents updated, no defect found
- **Release SHA**: `91ce0daa469df960097398ce756730f97845e647` (`91ce0da`)
- **Cloudflare version id**: `751a8bfd-e62a-4c9a-beb2-1953eb6a7656`
- **Parent commit**: `cf928cf`, the tip of `origin/main` after release 5's record landed

## What was done

1. Confirmed from inside the captured page that the live root serves `index-CtqqFhDM.css` and
   `index-D-QEf8bX.js`, the two asset names release 5's clean-clone build emitted. Release 4's bundle
   carries neither, so the screens captured are this release's.
2. Retook `release-03-input-record-payment.png`, `release-04-output-balances.png`,
   `release-06-members-and-prices.png` and `release-08-error-before-start-month.png` as 948 by 1033
   window captures of a real Chrome window against the live URL, in the dark palette, with the address
   bar visible, composed to sit where release 4's files sit.
3. Retook `release-05-tests-passing.png` as a 1336 by 1225 Terminal window capture in the throwaway
   clone at the release SHA, showing the full SHA, an empty working tree, a clean typecheck, unit 22
   files / 262 tests and integration 13 files / 131 tests.
4. Left `release-01`, `release-02`, `release-07`, `release-09` and `release-10` untouched. Each shows a
   screen `evidence/runs/release-5.md` reads off the client diff as unaltered.
5. Updated `docs/SUBMISSION-PACKAGE.md` and `docs/SUBMISSION-CHECK.md` in the course workspace, which
   is not under version control: the release identity throughout, the CI run id, both comment drafts'
   SHA and counts in Polish and in English, section 10's per-row byte sizes and totals, and release 4
   relabelled as history beside releases 2 and 3. The owner-decision placeholders and the
   upload-confirmation line were not touched, and nothing was uploaded.
6. Wrote `evidence/runs/release-5-captures.md`.

## What was not changed live

Forms were opened and cancelled. One payment was submitted and refused, which stores nothing and is
itself the capture in slot 12. The owner's list held the same two subscriptions with the same names
before and after, and the demo plan's summary figures are the release 1 baseline.

## What remains

- `GOALS.md` F01's final audit was last run at release 4 and has not been re-run against release 5.
  `docs/SUBMISSION-CHECK.md` now says so rather than calling the audit current.
- The goal-box updates for S-08 and M06 go to the designated status writer. This task edits neither
  `GOALS.md`, `context/STATUS.md`, `evidence/index.md` nor the work log.
- The change is not archived. `change.md` reads `implemented`.
