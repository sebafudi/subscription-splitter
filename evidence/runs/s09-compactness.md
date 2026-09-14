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

---

# Re-run at 05ff614

Re-measured after `4753a52` (defect fixes and the amended acceptance clause) and `a671ca0` (the
designer's §18 corrections). The fixture was corrected first; see below.

## The fixture defect this re-run found

`design-spec.md` §18.3 adds a lifetime completeness sentence, "N month(s) have no price, so owed and
the balance are incomplete.", under the lifetime cells of any participant with an unpriced elapsed
month. On the first re-measurement the two fixtures were no longer identical:

| Figure | SHORT as first built | LONG |
| --- | --- | --- |
| `.calendar-blocks *` | 418 | 423 |
| `.calendar-blocks` `scrollHeight` | 1114 | 1228 |
| Lifetime completeness sentences | 0 | 5 |

The five extra elements and 114 extra pixels are exactly the five sentences, one for each participant
whose charged window reaches LONG's two unpriced months. LONG's first price is effective from March
2019 and its plan starts in January 2019; SHORT's first price covered its whole plan from the start,
so SHORT had no unpriced month anywhere and no sentence.

That is a defect in the fixture, not in the implementation. The pair exists to isolate one variable,
depth of history, and it was silently differing in a second, lifetime price coverage. The difference
was invisible until §18.3 gave it a rendering.

**The correction**: `evidence/runs/s09-scripts/calendar-ledger.mjs` now starts SHORT at `2025-11` with
its first price effective from `2026-01`, so SHORT carries exactly two unpriced months, November and
December 2025, matching LONG's January and February 2019. Both fixtures now have the same lifetime
completeness state and the same 2026 records, and differ only in how much history sits before the
selected year. SHORT is renamed `S09 SHORT recent history`, because it now spans fourteen months
rather than one year.

## The seven figures, corrected fixtures

| Figure | SHORT | LONG | Difference |
| --- | --- | --- | --- |
| `[role="gridcell"]` | 72 | 72 | 0 |
| `.calendar-cell` | 72 | 72 | 0 |
| `.calendar-blocks *` | 423 | 423 | 0 |
| `.calendar-blocks` `scrollHeight` | 1228 | 1228 | 0 |
| `#year-select option` | 3 | 9 | 6 |
| `.entry-list > li` | 8 | 17 | 9 |
| `main.page *` | 774 | 866 | 92 |
| `main.page` `scrollHeight` | 2845 | 3028 | 183 |

Person blocks: 6 on both. Lifetime completeness sentences: 5 on both. Standing-order month tiles: 0 on
both.

## Section heights, corrected fixtures

| Section | SHORT | LONG | Difference |
| --- | --- | --- | --- |
| Participants | 1449 | 1449 | 0 |
| Price history | 150 | 150 | 0 |
| Skipped months | 173 | 253 | 80 |
| Payments received, closed | 114 | 114 | 0 |
| Standing orders | 214 | 317 | 103 |

Participants element counts are 486 and 492, a difference of 6, which is exactly the six extra
`option` elements. The Payments section is closed on load on both and holds 5 and 12 entries in the
DOM against filtered counts of 5 and 19.

## The amended acceptance clause, clause by clause

| Clause | Result |
| --- | --- |
| The gridcell count is identical | **Met.** 72 and 72. |
| The person-blocks element count is identical | **Met.** 423 and 423. |
| `.calendar-blocks` `scrollHeight` differs by under five per cent | **Met.** 1228 and 1228, 0.00 per cent. |
| The Participants section's element count differs by no more than the extra `option`s plus the range sentence's fragments | **Met exactly.** 492 minus 486 is 6, against 6 extra `option`s. Both render one future-year fragment. |
| The Participants section's own `scrollHeight` is identical | **Met.** 1449 and 1449. |
| Every pixel of the whole-page difference is attributable to a section bounded by the count of skipped months, standing orders or price entries, plus the option count and the range sentence | **Met.** The 183 pixel difference is 80 for the second skipped month and 103 for the second standing order. Participants, Price history and Payments received are pixel-identical. Page height minus those two sections is 2662 on both. |
| No part of the difference is attributable to months elapsed or receipts | **Met.** LONG carries seven more years and fourteen more receipts and draws not one extra pixel for either. |

## The pre-change comparison

The release-5 commit `91ce0da` was checked out into a temporary `git worktree` under the scratchpad,
served by its own `npm run dev` on the same port against a copy of the same local D1, so both builds
rendered the same two fixtures. `package.json`, `package-lock.json`, `vite.config.ts` and every file
under `migrations/` are identical between `91ce0da` and `05ff614`, so the worktree needed no install
and no migration. Its `node_modules` is a directory of symlinks into the main checkout with
`@fontsource` copied in, because a symlinked font package falls outside Vite's serving allow list and
the webfont would otherwise have failed to load and changed every text metric. With the copy,
`document.fonts.check('600 16px "IBM Plex Sans"')` reads `true` on both builds. The worktree was
removed afterwards.

### The LONG fixture, before and after

| Figure | `91ce0da` before | `05ff614` after | Change |
| --- | --- | --- | --- |
| `main.page` `scrollHeight` | 7158 | 3028 | −4130, −57.7 per cent |
| `document.body` `scrollHeight` | 7214 | 3084 | −4130 |
| `main.page *` | 1035 | 866 | −169 |
| Participants section | 687 | 1449 | +762 |
| Participants elements | 134 | 492 | +358 |
| Price history | 150 | 150 | 0 |
| Skipped months | 253 | 253 | 0 |
| Payments received | 2059 | 114 | −1945 |
| Payment rows rendered | 19 | 12 | −7 |
| Standing orders | 3266 | 317 | −2949 |
| Standing-order month tiles (`.tile`) | 93 | 0 | −93 |

The 93 tiles are one per elapsed month per schedule: 60 months for the arrangement that ran from
January 2019 to December 2023, plus 33 for the one running since January 2024.

### Growth with history, before and after

This is the measurement the change exists to make. Both builds, both fixtures, same selected year.

| Build | SHORT | LONG | Growth |
| --- | --- | --- | --- |
| `91ce0da` `main.page` `scrollHeight` | 2960 | 7158 | +4198, +141.8 per cent |
| `05ff614` `main.page` `scrollHeight` | 2845 | 3028 | +183, +6.4 per cent |
| `91ce0da` `.tile` count | 9 | 93 | +84 |
| `05ff614` `.tile` count | 0 | 0 | 0 |
| `91ce0da` payment rows | 5 | 19 | +14 |
| `05ff614` payment rows | 5 | 12 | +7, capped at 12 |

Before the change, adding seven years of history to the same six participants made the page 2.4 times
taller. After it, the same seven years add 183 pixels, all of them the one extra skipped month and the
one extra standing order the fixtures deliberately differ by. The reduction is now a measurement
rather than a claim.
