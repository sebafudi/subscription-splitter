# Checkpoint: compact-member-calendar, step 4.1 Sonnet worker B

Identity: Sonnet, step 4.1 (year control, bounded payments, subtitles).

Status: complete for the three assigned files. Not blocking anything.

## Actions

- Read `plan.md` (planned files table, `YearControl` and `PaymentList`/`sections.ts` change rows,
  Phase 4 criteria) and `design-spec.md` §2 (items 7 and 8, subtitles), §3 (year control and legend),
  §7 (bounded payments), §8, §9, §10, §13, §14.
- Read `src/client/components/PaymentList.tsx`, `sections.ts`, `RecurringSection.tsx`,
  `MemberList.tsx` (for the settled-archived disclosure pattern), `ui/DisclosurePanel.tsx`,
  `ui/Money.tsx`, `ui/ConfirmStrip.tsx`, `src/client/calendar/CellMark.tsx`, `selection.ts`, and
  `index.css` (read-only) for existing class names and the `.disclosure`/`.disclosure-inner` motion
  contract.
- Wrote `src/client/calendar/YearControl.tsx`: `‹`/`›` `.btn-quiet` buttons with `aria-label`
  "Previous year"/"Next year", `aria-disabled` (and still focusable) at the range ends; a native
  `select` id `year-select` labelled "Year" via a `.sr-only` label, one `option` per year in `range`;
  the range sentence "Showing Jan to Dec `<year>`." with one `.btn-link` fragment per `futureYears`
  entry ascending ("`<year>` holds N payment(s).") that calls `onSelectYear`; the legend as one
  `.t-small .soft` wrapping line using `CellMark` for `recorded`, `assumed`, `paused`, `unpriced`,
  `excepted`, plus a `.calendar-legend-hatch` swatch span for "not on the plan". The component never
  moves focus itself.
  - Props (primitive, not yet importing from `projection.ts` since it did not exist when I started):
    `year: number`, `range: { first: number; last: number }`, `locale: string` (unused, kept for the
    contract), `futureYears: Array<{ year: number; count: number }>`, `onSelectYear(year: number):
    void`. This matches `projection.ts`'s actual `calendarYearRange`/`futureYearPayments` return
    shapes structurally, confirmed once that file landed, so no alignment change is needed by the
    integrator.
- Changed `src/client/components/PaymentList.tsx`: added the §7 bounded disclosure. New state
  `paymentsOpen` (closed on every mount) and `shown` (page size 12, reset on toggle-close and on a
  changed `filterMemberId`). A `.btn-link.payments-toggle` button ("Show payments"/"Hide payments",
  `aria-expanded`) sits above a `.disclosure`/`.disclosure-inner` wrapper (the same house pattern as
  `MemberList.tsx`'s settled-archived disclosure, plain conditional rendering rather than
  `DisclosurePanel`, since this is a reveal, not a form, and `DisclosurePanel` would wrongly move
  focus to the first entry's control on open). Inside: the existing `entry-list`/`LedgerEntry`
  markup unchanged, sliced to `shown` items (newest-first order preserved, no re-sort), then either a
  "Show N more" `.btn-link` (N capped to what remains) or "That is every payment." in `.t-small
  .soft` once exhausted. Heading count, filter select, entry shape, edit panel, confirm strip,
  refusals and the "No payments recorded yet." sentence are unchanged and ungated by the disclosure.
- Changed `src/client/components/sections.ts`: added the `PARTICIPANTS.subtitle` sentence and one
  appended sentence on `STANDING_ORDERS.subtitle`, both verbatim from `design-spec.md` §2. No other
  string changed.
- Ran `npm run typecheck` (exit 0) and `npm run test:unit` (24 files / 322 tests, all passed,
  including the Opus worker's new `projection.test.ts`/`cellText.test.ts` that landed concurrently).

## Changed paths

- `src/client/calendar/YearControl.tsx` (new)
- `src/client/components/PaymentList.tsx` (changed)
- `src/client/components/sections.ts` (changed)

## Commit

Pending in this same pass: `feat(calendar): year control, bounded payments and subtitles`, with
`context/checkpoints/cmc-4-leaf.md` (left uncommitted by the previous worker) added to the same
commit as instructed. This checkpoint file is added separately, per its own instruction not to be
committed by the identity that wrote it under this assignment.

## Verification results

- `npm run typecheck`: exit 0.
- `npm run test:unit`: 24 files / 322 tests passed, 0 failed.

## CSS classes needed from the CSS owner (`index.css`, step 4.1, Sonnet)

- `.calendar-year-control`, `.calendar-year-row` (buttons, select and range sentence on one row,
  wrapping under 640px per §3).
- `.calendar-year-range` (the range sentence's `.t-small .soft` container; `.t-small`/`.soft` already
  exist, this is only the layout wrapper).
- `.calendar-legend`, `.calendar-legend-item` (mark + phrase pairs, gap `--s-4`, wrapping line).
- `.calendar-legend-hatch` (14px hatched square, radius 2px, the `--hatch` repeating-linear-gradient
  from §5, since `CellMark` has no glyph for `off-plan`).
- `.payments-toggle` on `PaymentList`'s new toggle button: no new visual treatment needed beyond the
  existing `.btn-link`; the class exists only so the CSS owner has a hook if one is wanted. Safe to
  leave unstyled (falls back to plain `.btn-link`).
- `#year-select` needs no dedicated rule; it should size like the existing 40px controls
  (`design-spec.md` §3), which `select` presumably already gets from a shared control rule — please
  confirm one applies, or add one keyed off `#year-select` if native selects aren't already styled at
  40px/44px elsewhere.

## Design-spec questions

None blocking. One note for the integrator: `YearControl`'s props are written with local primitive
types rather than importing `projection.ts`'s return types, because that module did not exist when
this file was started. The shapes match exactly (`{ first, last }` and `{ year, count }[]`), so no
change is needed, but the integrator may prefer to import `ReturnType<typeof calendarYearRange>` and
`ReturnType<typeof futureYearPayments>` instead of the local aliases `YearRange`/`LaterYearPayments`
for a single source of truth. Left as-is since both compile identically and the plan's contract names
the fields, not the import origin.

## Blockers

None.

## Exact next action

None for this worker. The Opus integrator wires `YearControl` into `MemberCalendar`/`PersonBlock`,
the CSS owner adds the classes listed above, and the status writer ticks plan Progress row 4.1 once
every leaf file for that step has landed (`cmc-4-leaf.md`'s two files, this checkpoint's three files,
`index.css`, `RecurringSection.tsx`'s `REASON_PHRASE` move, and the Opus-owned projection/cellText/
component files).
