# Checkpoint: compact-member-calendar, phase 4 integration

Identity: Opus, phase 4 integrator (steps 4.1 partial, 4.2, 4.3).

Status: complete. Code, gates and the browser pass all landed; Progress rows 4.1, 4.2 and 4.3 are
ticked.

## Actions

1. Read `plan.md` in full, `design-spec.md` §§2-10 and §§13-15, and the three phase checkpoints
   (`cmc-3-projection.md`, `cmc-4-leaf.md`, `cmc-4-sonnet-b.md`).
2. Read `src/client/calendar/*`, `SubscriptionDetail.tsx`, `MemberList.tsx`, `MemberForm.tsx`,
   `PaymentForm.tsx`, `ScheduleForm.tsx`, `PaymentList.tsx`, `RecurringSection.tsx`, `ui/*`,
   `useSectionStatus.ts`, `api.ts`, `format.ts`, `domain/types.ts`, `domain/month-status.ts`.
3. Added `formatLongMonth` and `formatMonthName` to `format.ts` and used the long form in
   `cellText.ts` (accessible name and charge sentence) per §15; updated `cellText.test.ts`.
4. Wrote `interaction.ts` and `interaction.test.ts`: the keyboard reducer, the highlight resolution
   and the order freeze, so the three decidable rules are node-tested rather than buried in handlers.
5. Wrote `MonthStrip.tsx`, `PersonBlock.tsx`, `MonthInspector.tsx`, `MemberCalendar.tsx`.
6. Rewired `SubscriptionDetail.tsx`: `buildSubscriptionState` memoized once, `MemberCalendar` in
   place of `MemberList`, a calendar first-load skeleton for the Participants section.
7. Removed `src/client/components/MemberList.tsx` after confirming nothing imports it.

## Changed paths

New: `src/client/calendar/MonthStrip.tsx`, `PersonBlock.tsx`, `MonthInspector.tsx`,
`MemberCalendar.tsx`, `interaction.ts`, `interaction.test.ts`.

Changed: `src/client/format.ts`, `src/client/calendar/cellText.ts`, `cellText.test.ts`,
`src/client/components/PaymentForm.tsx`, `src/client/screens/SubscriptionDetail.tsx`.

Removed: `src/client/components/MemberList.tsx`, superseded by `MemberCalendar`. No other file was
removed. `index.css` and `RecurringSection.tsx` belong to the concurrent Sonnet worker and were read
only.

## Commits

- `34eb1dc` feat(calendar): month strip, person block, inspector and section
- `7ada1c7` feat(calendar): render the calendar in place of the member list
- `7ca2844` fix(calendar): close on escape, follow the year and clear form presets
- `a87d728` fix(calendar): zero-receipt heading and not-assumed sentence
- `d5952a9` fix(calendar): resolve implementation review findings
- `1cef767` fix(calendar): strip name carries the year

## Verification

| Command | Result |
| --- | --- |
| `npm run typecheck` | exit 0, all three projects |
| `npm run test:unit` | exit 0, 26 files, 350 tests passed |
| `npm run build` | exit 0, `dist/client/assets/index-FKw-nM0T.js` 306.16 kB, `index-BM_6olG5.css` 20.08 kB |
| `git diff --stat HEAD -- src/client/components/ui/DisclosurePanel.tsx` | empty |
| `npm run test:integration` | exit 0, 13 files, 131 tests passed |
| `grep -rn "MemberList" src/` | no match after removal |
| `grep -rn "REASON_PHRASE" src/client/` | one definition, in `src/client/calendar/cellText.ts` |

Gates were rerun after the browser pass and after aligning the skeleton class names. The build
figures above are the second run: `index--q-86jQi.js` 306.50 kB, `index-ByHeNjZo.css` 20.10 kB.

## What the browser showed

Chrome 152.0.7977.84, headless, against `npm run dev` on `http://localhost:5173` with the local D1,
signed in through the real password form as a disposable account created through `POST /api/dev/seed`.
The fixture is one synthetic subscription, `CMC calendar check`, built through the app's own routes:
two participants (Ada from Jan 2026, Bo from Feb 2026), one price of £12.00 from Jan 2026, one
standing order of £4.00 a month for Ada from Jan 2026, two receipts on 3 Mar 2026, one break month in
May 2026, and later one future-dated receipt in May 2027. No other record was read or written and no
remote D1 was touched.

Observed, each read back off the live page:

- The section renders a year control, the legend and one block per participant. Two `role="grid"`
  elements, one `role="row"` each, 24 `role="gridcell"` buttons, two `#year-select` options.
- Accessible names carry the long month: "March 2026, 2 payments recorded, £8.00 in total, £4.00
  assumed from a standing order, charged £4.00"; "January 2026, nothing recorded, the participant was
  not on the plan that month"; "October 2026, nothing recorded, that month has not arrived yet".
- Clicking a cell opened the inspector, focus stayed on the cell, `aria-selected` read `true`, and
  every other block's disclosure inner read `inert`.
- Keyboard: Right moved March to April and moved the single `tabIndex=0` with it; Up moved to the
  same month in the block above and set that strip's tab stop; Home then Left wrapped January to
  December; Enter opened that cell's inspector and closed the other, leaving one on the page.
- Escape from the inspector heading closed it and returned focus to its cell. Escape on the cell
  itself did nothing at first, because the cell is outside the panel that handles the key; a strip
  handler was added and Escape from the cell now closes and keeps focus there.
- Recording from the inspector: the form opened with the participant preset to this person and the
  date preset to the first of the month, saved, showed "Payment recorded" in the Participants
  heading, tinted both the cell and the block, left the inspector on the same month and focused the
  new entry's Edit button.
- Editing a receipt showed "Changes saved" and returned focus to that entry's Edit. Deleting one
  asked "Delete the £2.22 payment from Ada?" with Keep focused, showed "Payment deleted", left the
  inspector open and moved focus to the inspector heading.
- Moving a receipt's date from March to September left the inspector on March, dropped its count to
  "Recorded (1)" and tinted the September cell, whose name then read "September 2026, 1 payment
  recorded, £4.00 in total, …".
- The exception toggle wrote through the existing routes both ways: "Marked not received" then
  "Marked received", with the cell's name gaining and losing "marked as not received".
- Order freeze: with an inspector open, a £99.00 receipt turned Bo from owing to ahead and Bo stayed
  first; closing the inspector reapplied the order and returned focus to the cell.
- A refused participant delete left the server's own sentence in the section alert and returned focus
  to that block's Delete.
- Year control: the range sentence read "Showing Jan to Dec 2026. 2027 holds 1 payment." and its
  fragment selected 2027; Next year kept focus on the button pressed and carried the open inspector
  from "Ada, March 2026" to "Ada, March 2027"; the strip's tab stop kept its month position.
- `sessionStorage` under `calendar:<id>` held the year and the open inspector, restored both on
  reload, and cleared the inspector when it closed.
- The console carried one message across the whole pass, the expected 409 from the refused delete.

Two behaviours were found broken in the browser and fixed in `7ca2844`: the inspector did not follow
a year change, and the record form kept the first month's date preset because the inspector was
reused across months. Both were retested after the fix.

Destination table: every one of the 67 rows resolves to a rendered destination, checked group by
group against the plan's table on the live page. The rows that belong to unchanged files (participant
and payment and schedule forms, price history, skipped months, the section index, the summary figures
and the load and signed-out states) were confirmed present and unchanged on the same page, and the
rows the calendar took over (1 to 21, 26, 28 to 31, 34 to 36, 44, 45, 48 to 54) were each seen in a
cell, a block or the inspector during the pass above.

## What could not be verified

- The 390px layout. The headless window would not size below a 500px CSS width, so the narrow rules
  were verified at 500px instead: six cells per row, 48px tall, at least 72px wide, one ARIA row per
  person, no horizontal overflow. The 390px capture belongs to Phase 5.
- Light theme, reduced motion, touch, Safari, a failed refresh, and the compactness measurement
  against a pre-change build. All are Phase 5's.
- Visual acceptance. The CSS landed mid-pass (`b445216`), so what was seen is the styled build, but
  judging it against the mockup is the designer's step.

## CSS classes introduced, for the `index.css` owner

Strip and cells: `.calendar-strip` (the `role="grid"`), `.calendar-row` (the `role="row"`),
`.calendar-cell` plus `.calendar-cell-offplan` (the hatch), `.calendar-cell-future` (dashed border,
faint label), `.calendar-cell-selected`, `.calendar-cell-current` (the 2px underline under the
label), `.calendar-cell-highlight` (the changed-cell tint), `.calendar-cell-month`,
`.calendar-cell-marks`, `.calendar-cell-count`.

Blocks and inspector: `.calendar-blocks` (already named in the plan), `.calendar-blocks-archived`
(the same container inside the settled-archived disclosure, kept separate so `.calendar-blocks *`
measures the listed blocks alone), `.calendar-block`, `.calendar-year-cells` (the second
`entry-cells` row), `.calendar-red` (the red fragments and sentences: the months-without-a-price
count, the empty-membership sentence, the unpriced charge sentence, the marked-not-received status),
`.calendar-inspector` (applied beside `.panel`), `.calendar-inspector-head`,
`.calendar-group-heading` (the `h4` at `.t-small .soft` weight 600), `.calendar-assumed-status`,
`.calendar-assumed-actions`.

Skeleton: `.skeleton-strip`, `.skeleton-strip-cell` (twelve 44px `--paper` blocks with a 1px
`--rule` border). The name and cells bars reuse the shipped `.skeleton-entry-primary` (17px) and
`.skeleton-entry-secondary` (13px), which are already §9's two heights.

`.calendar-red` replaces the role the removed `.tile-reason-red` played; the tile rules can go.

The CSS owner landed all of these in `b445216` except the skeleton, which they named
`.skeleton-calendar-name`, `.skeleton-calendar-line`, `.skeleton-calendar-strip` and
`.skeleton-calendar-cell`. The screen was changed to use their names, so nothing is outstanding.
`.calendar-block`, `.calendar-cell-count` and `.calendar-year-cells` are deliberately unstyled and
inherit from `.entry` and `.entry-cells`.

## Deviations from the plan's letter, with reasons

1. `PaymentForm` gained two optional props, `presetMemberId` and `presetDate`, used only when
   `editing` is null. §6 requires the inspector to open the form with the participant and the date
   already filled, and the shipped form took its initial values from `editing` alone, so there was no
   other way to preset without filtering `members` (which §6 says stays unchanged) or faking an
   `editing` record. No field, validation rule or wire name changed.
2. `format.ts` gained a second formatter beside the long one: `formatMonthName` ("Sep"), because §4
   makes a cell label the locale's short month name alone and splitting `formatMonth`'s output on a
   space breaks in locales that order the parts differently.
3. `MonthInspector` holds its own panel state (editing receipt, pending deletes, schedule edit,
   record form) rather than taking it as props from the section. The section already freezes the
   order on the inspector being open, so nothing above needs those four flags; the section passes
   `onConfirm` and `onClearStatus` so the status sentence still lands in the Participants heading.
4. `MonthStrip` takes `member` and `currency` beyond the props the plan lists, because
   `cellAccessibleName(cell, member, locale, currency)` needs both.
5. The per-strip active month is held in `MemberCalendar` as one month index per member rather than
   inside `PersonBlock`. Up and Down have to set the *receiving* strip's tab stop, which a
   block-local state cannot do, and storing the index rather than the month is what keeps the active
   cell's position when the year changes.
6. `MemberCalendar` restores the stored year even when no inspector was stored. `resolveSelection`
   answers for the pair and discards the year when its member id does not match a participant, which
   a stored selection with no open inspector never can; §3 retains the year as well, so the range
   test is applied to the year directly in that one branch.
7. The inspector's closing content is held for the length of the close motion (140ms) so the panel
   collapses with something inside it. Opening and closing both animate because the `.disclosure`
   wrapper is always mounted in the person block.

## Implementation review dispositions

`reviews/impl-review.md` is REVISE with 0 critical, 5 warnings and 6 observations. The three design
findings are answered by the designer in `design-spec.md` §17 and are applied here, not re-decided.

| Finding | Disposition | What changed |
| --- | --- | --- |
| F1 duplicate receipt ids | **Fixed** | The inspector's receipt controls are `inspector-payment-edit-<id>` and `inspector-payment-delete-<id>`, so `PaymentList`'s own focus restoration can no longer resolve into an open inspector. |
| F2 close-edit focus | **Fixed** | `closePaymentEdit` sets the entry's Edit id unconditionally. The focus effect retries on the reprojected cell and, when the target never arrives, falls back to the heading, which is exactly §8's entry-left-the-month case. |
| F3 record button month form | **Fixed** (§17.3) | The button and its panel title both read the long form, "Record a payment for March 2026". |
| F4 action row after the strip | **Fixed** | `PersonBlock` renders the action row and the confirm strip as its own children between the year cells and the strip, keeping the shipped `.entry-actions` and `.entry-confirm` classes. `ui/LedgerEntry.tsx` is not modified, so no other section is touched. Verified in the browser: block DOM order is primary, figure, lifetime cells, year cells, actions, strip, inspector, and the tab order is Edit, Archive, Delete, one strip stop, then the inspector's controls. |
| F5 "Show N more" | **No code change** (§17.2) | The designer amended §7 to the smaller of twelve and the number not yet shown, which is what ships. |
| F6 unscoped static inspector ids | **Fixed** | `inspector-record`, `inspector-record-panel`, `inspector-schedule-edit` and `inspector-schedule-delete` all carry the member id and month, so a closing inspector never shares an id with the one opening. |
| F7 dead `closeTarget` export | **Fixed** | Deleted. The rule lives once, in `MemberCalendar.closeInspector`. |
| F8 unused `CellMark.title` | **Fixed** | The prop is removed. This is the one edit made to a file the leaf worker owned; that worker had finished and the prop had no reader. |
| F9 undeclared accessible names | **Fixed** | The strip's name moved into `cellText.stripAccessibleName` with a unit test, so it is a declared string like every other. The designer then declared both strings: §17.4 records the year select's visually hidden "Year" label, and §17.5 rules the strip's name to be "`<Name>`, `<year>` month by month", which the helper, its test and the strip now render. |
| F10 vertical movement past a stripless block | **Fixed** | `leaveVertically` walks on until it finds a block that has the cell. Verified in the browser: Down from the first block skipped a block whose edit panel was open and landed on the third block's same month. |
| F11 unreachable fallback phrase | **Fixed** | The reason is read once into a local and the sentence renders only when it is non-null, so no phrase is invented for a state the projection rules out. |

Gates after the fixes: `npm run typecheck` exit 0; `npm run test:unit` 26 files and 351 tests passed;
`npm run build` exit 0, `index-DAE3nnSA.js` 306.61 kB and `index-ByHeNjZo.css` 20.10 kB.

## Questions for the designer

Both are answered in `design-spec.md` §16 and applied:

1. The Recorded heading reads "Recorded" with no count when the month holds no receipt, with
   "Nothing recorded for `Month Year`." beneath it. "Recorded (0)" is no longer rendered.
2. A month excluded by a wider condition reads "Not assumed: `<exclusion phrase>`." in the Assumed
   group, mirroring the charge sentence's "Not charged: " form, with no toggle.

§17 answers the three design findings the implementation review raised, and all three are applied.

Nothing is outstanding with the designer. §17.4 and §17.5 close the last item, the two accessible
names review finding F9 raised, and both are applied.

## Unresolved issues

None blocking. The disposable subscription and the disposable account are still in the local D1 and
can be deleted through the app whenever the next worker wants the instance clean.

## Exact next action

Phase 5. Nothing further is owed by this step.
