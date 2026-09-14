# Checkpoint: compact-member-calendar, Phase 4 CSS owner

Identity: Sonnet, owner of `src/client/index.css` and `src/client/components/RecurringSection.tsx`.

Status: complete for both assigned files. Not blocking anything; verified against the Opus
integrator's already-committed calendar components (`MonthStrip.tsx`, `PersonBlock.tsx`,
`MonthInspector.tsx`, `MemberCalendar.tsx`, `YearControl.tsx`, `CellMark.tsx`), which had landed by
the time I wrote the CSS, so every class name below is read off their actual JSX rather than guessed.

## Actions

- Read `plan.md`'s planned-files rows for `index.css` and `RecurringSection.tsx`, `design-spec.md`
  §3-9 and §13-15, the mockup CSS, checkpoints `cmc-4-leaf.md` and `cmc-4-sonnet-b.md`, then the
  current `index.css`, `RecurringSection.tsx` and `cellText.ts`.
- `RecurringSection.tsx`: removed the per-month `.tiles` list and its "Mark not received"/"Mark
  received" toggle, and the local `REASON_PHRASE` map and `MonthExclusion` import. Nothing in this
  file needed a phrase after the tiles were removed, so it imports no phrase helper; `cellText.ts`
  (Opus-owned) already exports `exclusionPhrase` as the one remaining definition. `grep -rn
  "before-start-month" src/client` now shows exactly one phrase mapping
  (`src/client/calendar/cellText.ts:28`). Kept schedule rows (rate, window, assumed total so far,
  "over N of M elapsed months"), Edit/Delete, the confirm strip, the add/edit forms, the
  no-participants refusal and the empty state untouched. Removed the now-unused `toggleMonth`
  function and the `markMonthNotReceived`/`clearMonthNotReceived` imports.
- `index.css`: by the time I wrote this, `MonthStrip.tsx`, `PersonBlock.tsx`, `MonthInspector.tsx`,
  `MemberCalendar.tsx` and `YearControl.tsx` already existed with concrete class names, so I read
  them directly and matched CSS to what they actually render rather than inventing names first. Added:
  - `--hatch` token, light `#c5d0c0` / dark `#6f7b73`, in both `:root` blocks.
  - `.calendar-blocks`, `.calendar-blocks-archived` (margin-top `--s-4`).
  - `.calendar-year-control` (outer wrapper, margin `--s-5 0 --s-3`), `.calendar-year-row` (flex row:
    prev/next buttons, `#year-select`, range sentence), `.calendar-year-range`, `.calendar-legend`,
    `.calendar-legend-item`, `.calendar-legend-hatch` (14px hatched swatch).
  - `.calendar-strip` (grid-column 1/-1, the role="grid" wrapper) and `.calendar-row` (the actual
    `repeat(12, 1fr)` / `repeat(6, 1fr)` grid, since `MonthStrip` puts the grid on the role="row" div,
    not the role="grid" one).
  - `.calendar-cell`, `.calendar-cell-month` (label, with the current-month underline via
    `.calendar-cell-current .calendar-cell-month::after`), `.calendar-cell-marks`,
    `.calendar-cell-selected` (ink ground, on-ink marks via a compound selector so no `!important` is
    needed), `.calendar-cell-offplan` (hatch), `.calendar-cell-future` (dashed, faint label),
    `.calendar-cell-highlight` (reuses the `entry-highlight` keyframes and its reduced-motion override).
  - `.mark`, `.mark-recorded`, `.mark-assumed`, `.mark-excepted`, `.mark-paused`, `.mark-unpriced`
    (colours per design-spec.md §5's table; `CellMark.tsx` already emits `mark mark-<name>`).
  - `.calendar-inspector`: sits alongside `.panel` on the same element in `MonthInspector.tsx`
    (`className="panel calendar-inspector"`), so it only overrides padding (`--s-4`) and margin-top
    (`--s-2`) rather than redeclaring background/border/radius.
  - `.calendar-inspector > .btn-primary { margin-top: var(--s-4); }` for the "Record a payment"
    button, which has no wrapper div of its own in `MonthInspector.tsx`.
  - `.calendar-inspector-head`, `.calendar-group-heading`, `.calendar-assumed-status`,
    `.calendar-assumed-actions`, `.calendar-red` (generic red text, used for the charge sentence, the
    "Marked as not received" sentence, the unpriced year-cells fragment and the no-active-range
    sentence).
  - `.skeleton-calendar-name`, `.skeleton-calendar-line`, `.skeleton-calendar-strip`,
    `.skeleton-calendar-cell` per design-spec.md §9. **Unused so far**: no component renders a
    calendar loading skeleton yet (verified by grep across `src/client`); the rules are in place for
    whichever step adds it.
  - Added `grid-column: 1 / -1` to the base `.disclosure` rule: `PersonBlock.tsx` nests the
    inspector's `.disclosure`/`.disclosure-inner` wrapper directly inside `.entry` (the `LedgerEntry`
    grid), which needed it to span both columns instead of collapsing into the first. No-op
    everywhere else `.disclosure` is used (outside a grid parent).
  - Added a comment above `.disclosure` and above `.panel` recording that the month inspector's own
    markup depends on both (reproducing the motion and, for `.panel`, sharing the class directly on
    `calendar-inspector`'s own element).
  - Removed `.tiles`/`.tile`/`.tile-month`/`.tile-counted`/`.tile-excluded`/`.tile-not-received`/
    `.tile-reason-red` and their 640px overrides: `grep -rn "\.tile\b|\.tiles\b" src/client` showed no
    remaining caller after the `RecurringSection.tsx` change.
  - Replaced the 640px `.tiles`/`.tile` overrides with `.calendar-row` (6-column grid),
    `.calendar-cell` (48px height) and `.calendar-year-range` (drops to its own line).
  - Did **not** add a generic `.red` utility: `MonthInspector.tsx`/`PersonBlock.tsx` already use
    `.calendar-red`, so that is the one red-text class rather than a duplicate.
- Verification: `npm run typecheck` (exit 0, all three project references), `npm run test:unit` (26
  files, 350 tests, all passed, on the tree with the Opus integrator's commits already applied),
  `npm run build` (both the worker and client builds succeeded).

## Changed paths

- `src/client/components/RecurringSection.tsx`
- `src/client/index.css`

## Commits

- `a2af4f8` — `refactor(recurring): drop month tiles, share exclusion phrases`
- `b445216` — `style(calendar): strip, cells, marks, inspector and year control`

(The first commit was created without the session trailer and amended once, locally, before the
second commit; nothing was pushed.)

## Verification results

- `npm run typecheck`: exit 0.
- `npm run test:unit`: 26 files / 350 tests passed, 0 failed.
- `npm run build`: both builds succeeded.

## Class list handed to the integrator (all already consumed by their landed components)

`calendar-blocks`, `calendar-blocks-archived`, `calendar-block` (no CSS needed; a plain wrapper),
`calendar-year-control`, `calendar-year-row`, `calendar-year-range`, `calendar-legend`,
`calendar-legend-item`, `calendar-legend-hatch`, `calendar-strip`, `calendar-row`, `calendar-cell`,
`calendar-cell-month`, `calendar-cell-marks`, `calendar-cell-count` (no CSS needed; styled entirely by
the `t-small tnum` utilities already on it), `calendar-cell-selected`, `calendar-cell-current`,
`calendar-cell-offplan`, `calendar-cell-future`, `calendar-cell-highlight`, `mark`, `mark-recorded`,
`mark-assumed`, `mark-excepted`, `mark-paused`, `mark-unpriced`, `calendar-inspector`,
`calendar-inspector-head`, `calendar-group-heading`, `calendar-assumed-status`,
`calendar-assumed-actions`, `calendar-red`, `calendar-year-cells` (no CSS needed; `.entry-cells`
already covers its layout, this is only a hook).

## Design-spec questions

None blocking. One note: `#year-select` needed no dedicated rule, as `cmc-4-sonnet-b.md` asked me to
confirm — the generic `select` rule already sizes every native select at 40px (44px below 640px).

## Blockers

None.

## Exact next action

None for this worker. The status writer can tick Phase 4 / plan Progress row 4.1 once every leaf file
for that step has landed: this file's two files, `cmc-4-leaf.md`'s `CellMark.tsx`/`selection.ts`,
`cmc-4-sonnet-b.md`'s `YearControl.tsx`/`PaymentList.tsx`/`sections.ts`, and the Opus integrator's
`MonthStrip.tsx`/`PersonBlock.tsx`/`MonthInspector.tsx`/`MemberCalendar.tsx`/`projection.ts`/
`interaction.ts`/`selection.ts` work, all of which are already committed on `main` as of this
checkpoint.
