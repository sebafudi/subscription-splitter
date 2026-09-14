# s09 compactness measurement

Phase 5 step 5.2 of change `compact-member-calendar` (S-09). Every number below was read off a live
page through `document.querySelector`, with the property it came from named. Both fixtures are
synthetic and were built through the app's own HTTP routes against a local dev instance. No remote D1
and no real ledger record was read or written.

## Environment

| What | Value |
| --- | --- |
| Commit measured | `29ee6f0` |
| Working tree | clean under `src/`, `tests/`, `migrations/` at the time of measurement |
| Server | `npm run dev` (Vite plus Worker on one origin, `http://localhost:5173`) against the local D1 |
| Account | `s09-calendar@example.invalid`, disposable, created through `POST /api/dev/seed` and signed in through the real password form |
| Chrome | `Chrome/152.0.7977.84`, headless, throwaway profile, driven over the DevTools protocol |
| Viewport | 1280 by 900, `window.innerWidth` read back as `1280` |
| Selected year | `2026` on both fixtures, read from `#year-select.value` |
| Inspector state | none open, `document.querySelectorAll('.calendar-inspector').length === 0` on both |

## Method

The measurement is a single function evaluated in the page, returning the seven figures the plan's
Phase 5 names plus the section heights that decompose the whole-page difference. It counts
`.calendar-blocks *` for the person blocks, `[role="gridcell"]` and `.calendar-cell` for the rendered
cells, `#year-select option` for the stated bound, and `scrollHeight` on `.calendar-blocks`, on the
Participants `section`, on each other section and on `main.page` and `document.body`.

The script that builds the fixtures is `evidence/runs/s09-scripts/calendar-ledger.mjs`. The plan names
`tests/fixtures/calendar-ledger.mjs` as its home; it lives under `evidence/runs/s09-scripts/` instead
because that is the path this step was given to write, and it is a throwaway measurement tool rather
than a test input.

The two fixtures hold **identical records inside 2026 by construction**, so the identity clauses below
are a property the fixtures make testable rather than a coincidence. LONG adds seven earlier years of
history that SHORT does not have, plus one extra skipped month and one extra standing order.

## The two fixtures

| | SHORT | LONG |
| --- | --- | --- |
| Name | `S09 SHORT one year` | `S09 LONG eight years` |
| Plan first month | `2019-01` is LONG's; SHORT's is `2026-01` | `2019-01` |
| Participants | Ada, Bo, Cleo, Dev, Esi, Fin | the same six |
| Price entries | one, `£12.00` from `2026-01` | one, `£12.00` from `2019-03` |
| Standing orders | one, Ada `£4.00` from `2026-01`, open ended | two adjacent rates for Ada, `£3.00` to Dec 2023 and `£4.00` from Jan 2024, open ended |
| Skipped months | `2026-05` | `2021-05` and `2026-05` |
| Exceptions | Ada `2026-07` | Ada `2022-08` and Ada `2026-07` |
| Manual receipts | 5 | 19 |
| Records dated in 2026 | two same-day receipts for Ada on 3 Mar, one for Bo in Feb, one yearly lump sum for Dev in Jan, one break month, one exception, Cleo's range gap May to Aug, Esi joining in Jun, Fin leaving after Mar | identical |
| Future-dated receipt | Bo, `2027-05-20` | Bo, `2027-05-20` |

## The seven figures

| Figure | SHORT | LONG | Difference |
| --- | --- | --- | --- |
| `document.querySelectorAll('[role="gridcell"]').length` | 72 | 72 | 0 |
| `document.querySelectorAll('.calendar-cell').length` | 72 | 72 | 0 |
| `document.querySelectorAll('.calendar-blocks *').length` | 418 | 418 | 0 |
| `document.querySelector('.calendar-blocks').scrollHeight` | 1114 | 1114 | 0 |
| `document.querySelectorAll('#year-select option').length` | 2 | 9 | 7 |
| `document.querySelectorAll('.entry-list > li').length` | 8 | 17 | 9 |
| `document.querySelectorAll('main.page *').length` | 768 | 861 | 93 |
| `document.querySelector('main.page').scrollHeight` | 2731 | 2914 | 183 |

Person blocks rendered: 6 on both. Standing-order month tiles on the page: `.tile, .month-tile`
counts 0 on both, which is the removal Phase 4 made.

## Section heights and element counts

| Section | SHORT `scrollHeight` | LONG `scrollHeight` | SHORT elements | LONG elements |
| --- | --- | --- | --- | --- |
| Participants | 1335 | 1335 | 480 | 487 |
| Price history | 150 | 150 | | |
| Skipped months | 173 | 253 | | |
| Payments received | 114 | 114 | | |
| Standing orders | 214 | 317 | | |

The Payments section is closed on load on both, so its own height is identical while its heading reads
`Payments received (5)` against `Payments received (19)`. With the disclosure closed the DOM holds 5
entries on SHORT and 12 on LONG, which is the bound rather than the filtered count.

## Acceptance, clause by clause

| Clause from the plan | Result |
| --- | --- |
| The gridcell count is identical for both fixtures | **Met.** 72 and 72. |
| The person-blocks element count `.calendar-blocks *` is identical | **Met.** 418 and 418. |
| `.calendar-blocks` `scrollHeight` differs by under five per cent | **Met.** 1114 and 1114, a difference of 0.00 per cent. |
| The Participants section's element count differs by no more than the extra `option` elements plus the range sentence's fragment count | **Met exactly.** 487 minus 480 is 7, and LONG carries exactly 7 more `option` elements. The range sentence contributes nothing: both fixtures hold a receipt dated in 2027, so both render one future-year fragment. |
| The whole page's `scrollHeight` differs by under five per cent | **Not met on these fixtures: 6.70 per cent.** See below. |

### The whole-page clause, decomposed

`main.page` grows by 183 pixels, 6.70 per cent, and `document.body` by the same 183 pixels, 6.57 per
cent. The difference is fully accounted for by two sections that the calendar does not own:

| Source | Pixels |
| --- | --- |
| Skipped months, 173 to 253, because LONG holds a second skipped month | 80 |
| Standing orders, 214 to 317, because LONG holds a second standing order | 103 |
| Total | 183 |

Participants, Price history and Payments received are pixel-identical between the two fixtures. Page
height minus the Skipped months and Standing orders sections is 2344 on both.

So the clause fails on the letter and holds on the thing it was written to protect. The plan attributed
the residual whole-page difference to "the same option count and the range sentence", which is not what
these fixtures differ by: LONG deliberately carries a second skipped month and a second standing order
so that the eight-year ledger exercises a range gap, two recurring rates and an exception outside the
selected year. Those two sections grow with the number of skipped months and arrangements, not with
years or payments. This is recorded as a defect against the plan's clause rather than against the
implementation, and the Phase 5 owner should decide whether to reword the clause or rebuild the
fixtures to hold equal counts of both record kinds.

## What the numbers say

The Participants section renders the same 6 blocks, the same 72 cells and the same 418 elements at the
same 1335 pixels whether the ledger holds one year and 5 receipts or eight years and 19. The only
growth inside the section is 7 `option` elements in the year select, which grows with elapsed years and
not with transactions. The Payments section stays at 114 pixels closed and holds at most 12 entries in
the DOM. That is the bound the change exists to establish.

## Reproduction

```
npm run dev
node evidence/runs/s09-scripts/calendar-ledger.mjs
```

Then sign in as the account the script prints, open each subscription and evaluate the measurement
function in `evidence/runs/s09-browser-verification.md` under Method.

## Not measured

- The pre-change build. The plan asks for the same figures on the build before the calendar landed, so
  the reduction is a measurement rather than a claim. That comparison was not run in this step: it
  needs a second checkout, a second local D1 and the fixture rebuilt against it, and this step's scope
  was the SHORT against LONG comparison on the current tree. The figures above establish that the
  section no longer grows with history; they do not quantify the reduction against `MemberList`.
- Any width other than 1280. The 390 layout is measured in `s09-browser-verification.md`, not here.
