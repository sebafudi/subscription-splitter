# Checkpoint: compact-member-calendar, phase 5 verification

Identity: Opus, phase 5 steps 5.1 and 5.2.

Status: complete. The four gates pass at `29ee6f0` and the compactness identity holds exactly. Progress
row 5.1 is ticked. **Row 5.2 is deliberately left unticked**: three of its criteria are not met, listed
under Progress rows below. Four defects are reported and none is fixed here, because this step does not
write source.

## Actions

1. Read `plan.md` Phase 5 in full, `design-spec.md` §§3 to 9 and §§13 to 16,
   `context/checkpoints/cmc-4-integrate.md`, `evidence/runs/s08-browser-verification.md` for the house
   format and `evidence/runs/release-5.md` for the gate-recording format.
2. Ran the four gates, first at `a87d728`, then again at `29ee6f0` after the tree went clean.
3. Wrote `evidence/runs/s09-scripts/calendar-ledger.mjs`, which builds the SHORT and LONG fixtures
   through the app's own HTTP routes against a disposable account seeded by `POST /api/dev/seed`.
4. Wrote `evidence/runs/s09-scripts/empty-ranges.mjs`, which creates a participant normally and then
   deletes its `active_ranges` rows in the local D1, the only route to the empty-membership state.
5. Measured the compactness figures on both fixtures at year 2026 with no inspector open, three times
   across two commits, with identical results each time.
6. Ran the browser pass: cell states, layouts at 1280 and 390, light and dark, the year control,
   keyboard traversal, the inspector, mutations and focus restoration, the order freeze, the bounded
   payments section, a failed write, `sessionStorage` retention and reduced motion.
7. Wrote `evidence/runs/s09-compactness.md` and `evidence/runs/s09-browser-verification.md`.

## Changed paths

New: `evidence/runs/s09-compactness.md`, `evidence/runs/s09-browser-verification.md`,
`evidence/runs/s09-scripts/calendar-ledger.mjs`, `evidence/runs/s09-scripts/empty-ranges.mjs`,
nine files under `evidence/screenshots/s09/`, and this checkpoint.

Changed: `context/changes/compact-member-calendar/plan.md`, the row 5.1 Progress tick only.

No source, test or migration file was written by this step.

## A collision worth recording

The first browser pass was started at `a87d728`. During it, `d5952a9` and `1cef767` landed in the tree
from the concurrent review-resolution work and the Vite dev server hot-reloaded them under the running
session. Two observations from that pass, a short month in the inspector's record button and an
inverted focusable order inside a person block, turned out to be the pre-fix behaviour rather than
defects. The whole pass was therefore discarded and redone at `29ee6f0` with a restarted dev server, a
fresh browser profile and rebuilt fixtures. The compactness figures were identical before and after,
which is the reason they are reported as taken three times.

The lesson for the next worker: a `npm run dev` browser pass is not pinned to a commit, so check
`git log -1` and `git status` immediately before and after, not only before.

## Verification

| Command | Result |
| --- | --- |
| `npm run typecheck` | exit 0, all three projects |
| `npm run test:unit` | exit 0, 26 files, 351 tests passed |
| `npm run test:integration` | exit 0, 13 files, 131 tests passed |
| `npm run build` | exit 0, `dist/client/assets/index-9rx75q34.js` 306.64 kB, `index-ByHeNjZo.css` 20.10 kB |

Compactness, SHORT against LONG, same six participants and the same selected year 2026:

| Figure | SHORT | LONG |
| --- | --- | --- |
| `[role="gridcell"]` | 72 | 72 |
| `.calendar-cell` | 72 | 72 |
| `.calendar-blocks *` | 418 | 418 |
| `.calendar-blocks` `scrollHeight` | 1114 | 1114 |
| Participants section elements | 480 | 487 |
| `#year-select option` | 2 | 9 |
| Payments section closed `scrollHeight` | 114 | 114 |
| `main.page` `scrollHeight` | 2731 | 2914 |

The person-block identity holds exactly and the Participants bound is met exactly: seven extra elements
against seven extra `option`s.

## Defects found

Reported, not fixed.

1. The plan's whole-page five per cent clause fails at 6.70 per cent. The whole difference is the
   Skipped months section, 80 pixels, and the Standing orders section, 103 pixels, both outside the
   calendar and both a deliberate difference between the fixtures. Every calendar-owned figure is
   identical. Needs a clause reword or fixtures with equal counts of both record kinds.
2. The payments disclosure reads `Show 7 more` where `design-spec.md` §7 writes `Show 12 more`. A
   designer ruling, not a bug.
3. No tint follows a receipt delete, where §9 pairs every success with a tint. This follows from the
   one-`highlightedId` resolution the plan specifies and may be intended.
4. **An implementation bug.** Editing a receipt's date so it leaves the inspected month drops focus to
   `document.body`, where §8 requires the inspector heading. The same edit without moving the receipt
   returns focus to its Edit button correctly, and a delete focuses the heading correctly, so one
   branch in `MonthInspector.tsx` is wrong. A keyboard user loses their place.

## Progress rows

Row 5.1 is ticked: all four gates exit 0 at `29ee6f0` and their output is recorded verbatim.

Row 5.2 is **not** ticked. Its criteria require the seven figures on the pre-change build as well, every
acceptance clause to hold, and a failed refresh among the behaviours. Three are outstanding:

- The pre-change build figures were not captured, so the reduction is established as a bound rather
  than measured against `MemberList`.
- The whole-page five per cent clause reads 6.70 per cent, for reasons outside the calendar.
- Defect 4 is a §8 focus rule that does not hold, and a failed refresh was not isolated from the failed
  write that triggers it.

Everything else the row asks for is recorded: both fixtures' figures, every key and its resulting
focus, the 390 and desktop layouts, light and dark, reduced motion, a failed write, a delete refusal
and a payment moved into another year.

## Unverified

Safari, Firefox and mobile browsers; real touch input; the pre-change build comparison the plan asks
for; a server-side 500; the archived-and-settled disclosure holding full blocks; the price-delete 409.
Each is listed with its reason in `evidence/runs/s09-browser-verification.md`.

## State left behind

The disposable account `s09-calendar@example.invalid` and its two subscriptions are still in the local
D1, along with the `Gil` participant whose `active_ranges` rows were deleted. Re-running
`evidence/runs/s09-scripts/calendar-ledger.mjs` deletes and rebuilds every `S09 ` subscription, so the
next worker can reset them with one command or delete them through the app. Nothing remote was touched.

## Exact next action

Step 5.3 is already under way: `context/changes/compact-member-calendar/reviews/impl-review.md` and
`context/checkpoints/cmc-5-impl-review.md` are present in the tree. Step 5.4 is the designer's, and the
captures it needs are listed at the end of `evidence/runs/s09-browser-verification.md`. The three
defects above want a ruling before Phase 6 closes, and defect 4 wants a fix in `MonthInspector.tsx`
plus a re-run of the focus checks in `evidence/runs/s09-browser-verification.md` before row 5.2 can be
ticked.

---

# Re-run at 05ff614

Identity: Opus, phase 5 step 5.2 re-verification.

Status: complete. Gates green, all four earlier defects closed, the pre-change comparison taken, the
failed refresh isolated. **Progress row 5.2 stays unticked**, on one criterion: the failed refresh does
not behave as `design-spec.md` §9 says. Everything else the row asks for is now met.

## Actions

1. Read the amended Phase 5 acceptance clause in `plan.md` and `design-spec.md` §§17 and 18.
2. Ran the four gates at `05ff614`.
3. Found and corrected a fixture defect: §18.3's lifetime completeness sentence exposed that SHORT and
   LONG differed in lifetime price coverage as well as in depth of history. SHORT now starts in
   November 2025 with its first price from January 2026, so both fixtures carry exactly two unpriced
   months and differ only in history. Re-measured.
4. Built `91ce0da` in a temporary `git worktree` under the scratchpad, served it against a copy of the
   same local D1 with the webfont available, measured both fixtures, and removed the worktree.
5. Re-checked V1 to V4, the four §18 corrections, the keyboard traversal, the refused participant
   delete, the bounded payments section on both branches of §17.2, reduced motion and the 390 layout.
6. Isolated a failed refresh from a failed write by wrapping `window.fetch` so the write passes and
   the reload GETs reject.
7. Retook every designer capture at `05ff614` and added three: `range-sentence-2019.png`,
   `marks-order-ada-march.png`, `failed-refresh-after-write.png`.

## Changed paths

Changed: `evidence/runs/s09-browser-verification.md`, `evidence/runs/s09-compactness.md`,
`evidence/runs/s09-scripts/calendar-ledger.mjs`, twelve files under `evidence/screenshots/s09/`, and
this checkpoint. No source, test or migration file was written.

## Verification

| Gate | Result |
| --- | --- |
| `npm run typecheck` | exit 0 |
| `npm run test:unit` | exit 0, 26 files, 354 tests |
| `npm run test:integration` | exit 0, 13 files, 131 tests |
| `npm run build` | exit 0, `index-DGCB6uJ3.js` 307.18 kB, `index-ByHeNjZo.css` 20.10 kB |

Compactness on the corrected fixtures: gridcells 72 and 72, `.calendar-blocks *` 423 and 423,
`.calendar-blocks` `scrollHeight` 1228 and 1228, Participants `scrollHeight` 1449 and 1449,
Participants elements 486 and 492 against 6 extra `option`s, payments closed 114 and 114. The 183
pixel whole-page difference is 80 for the second skipped month and 103 for the second standing order.

Pre-change comparison on LONG: `main.page` `scrollHeight` 7158 at `91ce0da` against 3028 at
`05ff614`, a 57.7 per cent reduction; 93 standing-order month tiles against 0; 19 payment rows against
12. Growth from SHORT to LONG was 4198 pixels before and is 183 pixels now.

## Defects

V1 resolved by the amended clause and met on corrected fixtures. V2 resolved by §17.2 and both
branches exercised. V3 and V4 fixed and confirmed fixed. One new finding:

V5. A failed refresh after a successful write empties the detail screen and shows "Could not save"
although the save landed. `load()` sets `status: 'error'`, replacing the ready state, so every section
disappears where §9 requires the previous records to stay. Not introduced by the calendar: the same
branch exists at `91ce0da`. Reproduction and evidence are in
`evidence/runs/s09-browser-verification.md`.

## Progress row 5.2

Met now: the seven figures on both fixtures **and** on the pre-change build; every acceptance clause of
the amended wording; every key and its resulting focus; the 390 and desktop layouts; light and dark;
reduced motion; a failed write; a delete refusal; a payment moved into another year.

Not met: "a failed write, a failed refresh, a delete refusal and a payment moved into another year each
behave as the specification says." The failed refresh does not. V5 needs a fix or a designer ruling
amending §9 before the row can be ticked.

## State left behind

The disposable account and its two subscriptions are in the local D1. The LONG fixture was grown to 33
payments to exercise the upper branch of §17.2 and carries the `Gil` participant whose
`active_ranges` rows were deleted; re-running `evidence/runs/s09-scripts/calendar-ledger.mjs` rebuilds
both fixtures from scratch. The temporary worktree was removed and `git worktree list` shows only the
main checkout. Nothing remote was touched.

## Exact next action

V5 wants a ruling: either keep the ready state on a failed reload and word the alert for a read
failure, or amend §9. Once that lands, re-run the failed-refresh case and tick row 5.2. Step 5.4 is
the designer's, and every capture it needs is retaken at `05ff614`.
