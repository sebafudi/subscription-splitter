# Compact member calendar implementation plan

## Overview

Replace the unbounded subscription-detail history with a compact per-person view of one selected
year and an inspectable selected month. Preserve every record, action and accounting rule. The
design gate has closed: `design-spec.md` is the authority for every visual, copy, interaction and
motion decision, and this plan turns it into exact component contracts, planned files and owners.
Nothing here re-decides appearance. `design-spec.md` §13 is the standing resolution of the eight
questions this plan raised, and §14 of the five design findings the plan review raised. The
assumptions recorded in `context/checkpoints/cmc-2.2-plan.md` are superseded wherever they differ,
and two of them were overruled: the Participants heading carries no count (§13.1) and there is no
owner block (§13.2).

`research.md` is the authority for what the code does today, `frame.md` for the framing both rest on.
The independent `10x-plan-review` (step 2.3) has run into `reviews/plan-review.md` with verdict
REVISE; every finding's disposition is recorded in `## Review resolution` below.

## Current state

Source inspection at `c10d54f` and `7a44970` establishes:

- `src/client/screens/SubscriptionDetail.tsx:100-128` loads summary, members, prices, breakMonths,
  payments and schedules in one `Promise.all` and `:408-462` renders five sections in sequence.
  `MemberList` is the one section that does not grow with history; `RecurringSection` renders one
  tile per elapsed month per schedule (`:333-377`) and `PaymentList` one row per receipt (`:214`).
  Decorating the participant list alone would leave the page as long as it is.
- `src/client/components/MemberList.tsx` preserves most-owing-first order (`:68`), hides settled
  archived participants behind a disclosure (`:69-70`, `:317-335`), and implements add, edit,
  archive and delete with explicit focus restoration (`:81-131`).
- `computeSummary` excludes the owner from `summary.members` (`src/domain/calc.ts:88`), so the
  Participants section has no owner row today and its heading deliberately carries no count
  (`MemberList.tsx:29-33`).
- `src/domain/calc.ts`, `recurring.ts` and `month-status.ts` own the accounting. `RecurringSection`
  already calls `scheduleMonthStatuses` in the browser (`:258-269`) and applies no condition itself.
  The calendar inherits that precedent rather than restating any rule in a cell.
- Every record the domain reads is already on the client (`research.md` section 5). No server change,
  no new route and no pagination is needed or planned.
- No test renders a React component: `vitest.unit.config.ts:6` sets `environment: 'node'`, the unit
  include glob is `src/**/*.test.ts`, and no testing-library dependency exists in `package.json`.

## Desired outcome and non-goals

A default collapsed view whose height grows with the number of people, not with the number of
historical transactions or elapsed years: twelve month cells per person for one selected year, a
shared year control, one month inspector open at a time, a bounded payments disclosure and standing
orders without their month tiles. Lifetime balances stay distinct from selected-year totals and from
month receipts. Receipt month never identifies the billing periods a payment settles. Opening an
inspector never writes to the ledger.

No schema migration, no financial reconciliation, no import of private records, no inferred payments,
no changed rounding, no chart service, no new authentication flow and no unrelated redesign. No
charting or virtualization dependency. No jsdom or testing-library dependency: see Phase 5 for how
keyboard and focus behaviour is verified instead. No server route change. No live financial mutation
for tests. Existing CSS tokens and native controls stay the baseline; exactly one new token,
`--hatch`, is introduced, as `design-spec.md` section 5 rules.

## Phase 1: Reconcile state and complete research

Complete. `context/checkpoints/cmc-1.1-reconcile.md` records the state reconciliation and the roadmap
registration as S-09; `context/checkpoints/cmc-1.2-research.md` records `research.md` (67-row
preservation matrix, seven accounting invariants, client data contracts, fixture requirements),
`frame.md` and `design-inputs.md`.

#### Manual verification:

Met: every matrix row carries a `file:line`; missing information is explicit; fixture requirements
and minimal data contracts are established; S-09 was free and is registered.

## Phase 2: Fable design and independent plan review

`design-spec.md` is written and frozen, with a mockup at `mockup/compact-calendar.html` and four
captures. This section records the plan that follows from it.

### 2.1 Design specification

Complete. The design-completeness checklist is `design-spec.md` section 11. The rulings this plan
depends on: calendar rather than graph; twelve cells per person for one shared selected year; the
inspector opens under the person's own strip, one at a time; most-owing-first order kept but frozen
while any inspector, edit panel or confirm strip is open; payments kept behind a bounded disclosure
of twelve at a time; standing-order month tiles removed; `SectionIndex` unchanged; one new token.

### 2.2 Component contracts and planned files

#### Planned files

New, all under one new folder so the calendar has a single home:

| File | Owner | What it is |
| --- | --- | --- |
| `src/client/calendar/projection.ts` | Opus | Pure read-only projection. No React import. |
| `src/client/calendar/projection.test.ts` | Opus | Projection unit tests and the invariant comparisons. |
| `src/client/calendar/cellText.ts` | Opus | Pure accessible-name and sentence builders for cells and the inspector. |
| `src/client/calendar/cellText.test.ts` | Opus | Unit tests for every accessible name and every charge sentence. |
| `src/client/calendar/selection.ts` | Sonnet | `sessionStorage` read/write and validation of a restored selection. Pure apart from one guarded storage call. |
| `src/client/calendar/selection.test.ts` | Sonnet | Unit tests: restore, reject and default over `resolveSelection`; the absent and throwing storage guards and one injected-storage round trip over `readSelection`/`writeSelection`. |
| `src/client/calendar/CellMark.tsx` | Sonnet | The seven inline SVG marks, keyed by name. |
| `src/client/calendar/YearControl.tsx` | Sonnet | Previous/Next buttons, the year select, the range sentence and the legend. |
| `src/client/calendar/MonthStrip.tsx` | Opus | The twelve-cell grid, roving tabindex and the keyboard contract. |
| `src/client/calendar/PersonBlock.tsx` | Opus | Header line, lifetime cells, year cells, action row, strip and inspector slot. |
| `src/client/calendar/MonthInspector.tsx` | Opus | The selected-month panel: charge sentence, Recorded group, Assumed group, record action. |
| `src/client/calendar/MemberCalendar.tsx` | Opus | The Participants section: header, add panel, year state, order freeze, status, section alert, archived disclosure. |

Changed:

| File | Owner | Change |
| --- | --- | --- |
| `src/client/screens/SubscriptionDetail.tsx` | Opus | Assemble `SubscriptionState` once, render `MemberCalendar` in place of `MemberList`, add the calendar skeleton. |
| `src/client/components/MemberList.tsx` | Opus | Superseded by `MemberCalendar`. Removed in step 4.1 once nothing imports it; the implementer records the removal in its checkpoint and removes no other file. |
| `src/client/components/PaymentList.tsx` | Sonnet | Bounded disclosure: closed on load, twelve entries, "Show 12 more", "That is every payment." |
| `src/client/components/RecurringSection.tsx` | Sonnet | Remove the per-month tile list and the tile toggle; delete the local `REASON_PHRASE` map (`:63-71`) and import `exclusionPhrase` from `src/client/calendar/cellText.ts` instead, so the seven phrases stay one copy; keep schedule rows, totals, forms and confirmations. |
| `src/client/components/sections.ts` | Sonnet | Participants subtitle; one added sentence on the Standing orders subtitle. |
| `src/client/index.css` | Sonnet | `--hatch` token in both palettes, calendar strip, cell, mark, legend, year control, inspector, `.calendar-blocks` container and skeleton rules; pin `.disclosure`, `.disclosure-inner` and `.panel` with a comment recording that the inspector now depends on them too; remove the tile rules that lose their last caller. |

No shared UI primitive is modified. `src/client/components/ui/DisclosurePanel.tsx` in particular is
**not** changed by any phase: the inspector reproduces its markup and reuses its CSS instead, for the
reasons in the `MonthInspector` contract below, so the seven shipped forms that depend on it keep
today's behaviour exactly.

Single-owner rule: `index.css` and `sections.ts` are written by the Sonnet component worker only, in
step 4.1, and by nobody else in any phase. `SubscriptionDetail.tsx` is written by the Opus
integration worker only. No two workers hold the same file in the same step.

#### The projection interface

`projection.ts` exports these signatures. `MonthStatus`, `MonthExclusion`, `Member`, `Payment`,
`Minor`, `MonthStr`, `PriceEntry`, `RecurringSchedule` and `SubscriptionState` are imported from
`src/domain`; `Subscription` and `Schedule` are imported from `src/client/api.ts` (`:5-14` and
`:268`), which is where those two client shapes live. Nothing is redeclared.

```ts
export type LoadedRecords = {
  subscription: Pick<Subscription, 'startMonth' | 'currency' | 'locale' | 'timeZone'>
  members: Member[]
  prices: PriceEntry[]
  breakMonths: MonthStr[]
  payments: Payment[]
  schedules: Schedule[]
}

/** Assembles the domain's own state shape from the six collections the screen already holds. */
export function buildSubscriptionState(records: LoadedRecords): SubscriptionState

export type AssumedReceipt = { scheduleId: string; amount: Minor }

export type MonthCell = {
  month: MonthStr
  /** Every manual receipt whose `date.slice(0, 7)` is this month, ids, dates, kinds and notes intact,
      same-day duplicates kept as separate entries, in the order the repository returned them. */
  manualReceipts: Payment[]
  /** The counted standing-order receipt for this month, with the schedule id that owns it. */
  assumed: AssumedReceipt | null
  /** The schedule covering this month, whether or not it counted, so the inspector can edit it.
      Deliberately narrowed from the client's `Schedule` to the domain's `RecurringSchedule`: the
      exception months are dropped because the cell must never re-derive an exception from them.
      Whether this month is excepted comes from `assumedStatus.reason`, which is the domain's answer
      with the exception already applied last (`recurring.ts:82-85`). The id survives the narrowing,
      which is all the inspector needs to address the schedule (matrix row 53). */
  schedule: RecurringSchedule | null
  /** `scheduleMonthStatuses`' answer for this month, or `memberMonthStatus` for a month beyond the
      enumerated window. Null when no schedule covers the month. `reason` is a canonical name. */
  assumedStatus: MonthStatus | null
  /** `shareForMember`; zero whenever the month does not charge. */
  charge: Minor
  /** `chargedMonthStatus` verbatim: `counts`, and the canonical `MonthExclusion` name when it does
      not. `reason === 'unpriced'` is the single source of truth for the `?` mark, the inspector's
      charge sentence and the year cells' "N months without a price" count. There is no separate
      price-coverage flag: `design-spec.md` §5 and §14.3 rule that the domain's reason is the one
      answer, and an amount of zero is never read as settled because the reason, not the amount, is
      what any of the three render. */
  chargeStatus: MonthStatus
}

export type PersonYear = {
  memberId: string
  year: number
  /** Exactly twelve, January to December, regardless of locale. */
  cells: MonthCell[]
  /** Sum of manual receipts dated in this year. Never added to `assumed`. */
  recorded: Minor
  /** Sum of counted assumed receipts in this year. Never added to `recorded`. */
  assumed: Minor
  /** Sum of `charge` over the twelve cells. */
  charged: Minor
  /** Cells whose `chargeStatus.reason` is `'unpriced'`. */
  unpricedMonths: number
  /** False when the member has no active range at all, which drives the red sentence in section 4. */
  hasActiveRange: boolean
}

export function projectPersonYear(
  state: SubscriptionState, member: Member, year: number, current: MonthStr,
): PersonYear

export function projectYear(
  state: SubscriptionState, members: Member[], year: number, current: MonthStr,
): PersonYear[]

/** Plan start year through the greater of the current year, the latest payment year and the latest
    bounded schedule end year. An open-ended schedule contributes the current year. */
export function calendarYearRange(state: SubscriptionState, current: MonthStr): { first: number; last: number }

/** Years strictly after `selectedYear` that hold at least one manual receipt, ascending, with counts.
    This is how a future-dated receipt stays discoverable from the default year. */
export function futureYearPayments(
  state: SubscriptionState, selectedYear: number,
): { year: number; count: number }[]
```

Domain functions called, and nothing else: `chargedMonthStatus` and `memberMonthStatus`
(`month-status.ts:47`, `:67`), `shareForMember` (`calc.ts:24`), `scheduleMonthStatuses`
(`recurring.ts:72`), `isMonthInSchedule` (`recurring.ts:20`), `enumerateMonths` (`months.ts:18`).
Month completeness is `chargeStatus.reason === 'unpriced'` and nothing else; the module derives no
price-coverage flag of its own, because `chargedMonthStatus` already asks the price question after
every wider condition (`month-status.ts:75`) and a break month short-circuits before it
(`prices.ts:11`), so the reason can never be `unpriced` for a month excluded by a wider condition.
No exclusion condition, no precedence order and no rounding rule is written in this module.

Cost control: `scheduleMonthStatuses` is called **once per schedule per projection**, inside
`projectPersonYear`, not once per cell. There is no cross-call index and no module-level cache: the
projection interface exposes none, and inventing one would be unplanned state. The stated cost of one
projection is one enumeration per schedule over the months from `startMonth` to `currentMonth`, which
at the eight-year six-person fixture is eight enumerations of at most ninety-six months. Switching
year re-runs the projection at that cost. `projectYear` is memoized in `SubscriptionDetail` on the
loaded records plus the selected year, so a re-render that changes neither costs nothing.

#### Invariant tests in `projection.test.ts`

Each compares the projection's own sums against the canonical domain outputs on the same literal
state, so a cell cannot disagree with the summary (`research.md` section 4, invariants 1 to 7):

1. Sum of `charge` over every month from `startMonth` to `currentMonth` equals
   `balanceForMember(...).owed` and `computeSummary(...).members[i].owed`.
2. Sum of `assumed` over that window equals `recurringReceived(state, member, allMonths, current)`.
3. Sum of every manual receipt, including receipts dated after `currentMonth`, plus (2), equals
   `MemberSummary.paid`.
4. (3) minus (1) equals `MemberSummary.balance`.
5. A single year's `recorded`, `assumed` and `charged` are asserted not to equal the balance where
   history spans more than one year, pinning that a year subtotal is not a balance.
6. No exported field ever carries `recorded + assumed`. Asserted on a fixture whose month holds one
   manual receipt of a distinct amount and one counted assumed receipt of a different amount, with
   `manual + assumed` differing from both and from every other figure in the fixture:
   `cell.manualReceipts` sums to the manual amount alone; `cell.assumed.amount` equals the schedule's
   rate alone; `personYear.recorded` equals the manual amount and `personYear.assumed` equals the
   rate, so each differs from their sum; and a sweep over every numeric field of the projected
   `PersonYear` and of its twelve `MonthCell`s asserts that none equals `manual + assumed`. This is a
   runnable assertion rather than a property of the type, and it guards the one constraint `frame.md`
   calls load-bearing.
7. A manual receipt is addressed by `date.slice(0, 7)`; a receipt dated in a month it does not settle
   appears in that receipt month's cell and nowhere else.

Plus the three behaviours no existing test pins (`research.md` section 4): two distinct receipts on
one day for one member, a literal empty `activeRanges`, and two concurrent non-overlapping schedules
contributing in the same window. Plus the named edge cases: advance credit, a yearly lump sum, a
changed recurring amount across adjacent schedules, an exception, a break month, an inactive range, a
future month, a future-dated manual receipt and a missing price.

#### Component contracts

`MemberCalendar` (section owner, `aria-labelledby={PARTICIPANTS.id}`)

- Props: `subscriptionId`, `startMonth`, `members`, `summary`, `timeZone`, `state: SubscriptionState`,
  `payments`, `schedules`, `onChanged`, `onSignedOut`.
- Owns: selected year, open inspector `{ memberId, month } | null`, add panel, editing member id,
  pending delete, section error, `useSectionStatus`, and the `focusTarget` effect that focuses an
  element id after the control holding it has remounted (the pattern at `MemberList.tsx:59-63`).
- Order: `summary.members` order verbatim, frozen to the order captured when the first inspector,
  edit panel or confirm strip opened, and reapplied when the last one closes (spec section 4).
- Renders `SectionHeader` with `subtitle`, `StatusLine` and the Add participant primary, then the
  add `DisclosurePanel` with `MemberForm`, then `YearControl`, then the person-blocks container, then
  the existing settled-archived disclosure, then the existing "No participants yet." empty state.
  Section refusals render in the existing `SectionAlert`, verbatim.
  The `count` prop of `SectionHeader` is **deliberately omitted**: `design-spec.md` §13.1 rules that
  the Participants heading carries no count, the shipped code refuses one for the same reason (the
  API's active count includes the organizer, `MemberList.tsx:29-33`), and `SectionHeader.tsx:11-15`
  documents `count` as omitted "where a count could not agree with the rows beneath it".
- The person-blocks container is a `div.calendar-blocks` holding one `PersonBlock` per listed
  participant, in order. **There is no owner block**: `design-spec.md` §13.2 withdrew it from §4 and
  from the mockup, `computeSummary` excludes the owner from `summary.members` (`calc.ts:88`), and the
  owner's share stays where it is today, in the summary figures above the sections
  (`SubscriptionDetail.tsx:373-404`, matrix row 67). The class exists so Phase 5 can measure the
  blocks alone, without the year control and legend that share the section (`design-spec.md` §14.4).
- Focus targets it owns: `participant-add-button`, and the `PARTICIPANTS.id` heading after a
  completed participant delete or when a closing inspector's cell no longer exists. It focuses a cell
  by the `calendar-cell-<memberId>-<month>` id `MonthStrip` owns, through the same `focusTarget`
  effect, and tests for that element before falling back to the heading.
- **Both tints come from one confirmation.** `useSectionStatus` holds exactly one `highlightedId`
  (`useSectionStatus.ts:5-10`, `:36-43`) and every shipped call site sets it to the id of the record
  that changed (`PaymentList.tsx:202`, `:234`). `MemberCalendar` resolves that id against the
  reloaded records: the payment or schedule it names yields an owning `memberId`, which tints that
  person's block, and a receipt month, which tints the cell whose month contains it. A receipt edited
  into another month or year tints its new cell by the same resolution. No second status hook is
  introduced and no new status string is added, so `design-spec.md` §9 and §13.3 still hold.

`YearControl`

- Props: `year`, `range: { first, last }`, `locale`, `futureYears: { year, count }[]`,
  `onSelectYear(year: number)`.
- Two `.btn-quiet` buttons with the glyphs and `aria-label` "Previous year" / "Next year",
  `aria-disabled` and focusable at the ends of the range and doing nothing there; a native `select`
  with id `year-select`, labelled for the year, one `option` per year in the range, which Phase 5
  counts directly; the range sentence; the legend as one wrapping `.t-small .soft` line whose
  swatches are the same `CellMark` glyphs plus a 14px hatched square.
- Focus stays on the control pressed; the component never moves focus itself.

`PersonBlock`

- Props: `row: MemberSummary`, `member: Member | undefined`, `personYear: PersonYear | null`,
  `year`, `locale`, `currency`, `currentMonth`, `selectedMonth: MonthStr | null`,
  `highlighted: boolean`, `editing: boolean`, `pendingDelete: boolean`, `onSelectMonth`,
  `onLeaveVertically(direction: 'up' | 'down', month: MonthStr)`, `onEdit`, `onArchiveToggle`,
  `onDelete`, `onCancelDelete`, and the inspector as `children`.
- Header line, lifetime cells, year cells and the action row exactly as spec section 4. Every block
  is a participant's: `design-spec.md` §13.2 withdrew the owner block, so `personYear` is never null
  for a rendered block and no owner sentence, owner figures or `summary.ownerShareThisMonth` appears
  anywhere in the calendar.
- Element ids it owns: `participant-edit-<id>`, `participant-delete-<id>`.
- The changed-balance tint is the existing `entry-highlight` treatment, applied when
  `MemberCalendar` resolves `useSectionStatus().highlightedId` to this block's member and passes
  `highlighted`. The block never reads the hook itself.

`MonthStrip`

- Props: `memberId`, `cells: MonthCell[]`, `year`, `locale`, `currentMonth`, `selectedMonth`,
  `activeMonth: MonthStr`, `onSelect(month)`, `onActiveMonthChange(month: MonthStr)`,
  `onLeaveVertically(direction: 'up' | 'down', month: MonthStr)`. The leave-vertically callback
  carries a `MonthStr`, not an index, and `PersonBlock` forwards it under the same name and the same
  payload, so one name and one type cross all three components.
- Markup: a `role="grid"` container holding one `role="row"` holding twelve `role="gridcell"`
  `<button type="button">` cells. The `role="row"` wrapper is added because a `gridcell` must be
  owned by a row; `design-spec.md` §13.4 is the authority for it.
- **Cell ids.** Every cell carries `id="calendar-cell-<memberId>-<month>"`, where `<month>` is the
  `MonthStr` the cell holds (`2026-03`). `MonthStrip` owns this scheme and is listed with the other
  id owners. It is what `MemberCalendar` and `MonthInspector` target through the existing
  `setFocusTarget` → `document.getElementById(id).focus()` pattern (`MemberList.tsx:61-65`), and what
  they test for with `document.getElementById` before falling back to the Participants heading.
- **Active cell and roving tabindex.** The strip holds per-strip `activeMonth` state, lifted to
  `PersonBlock` so it survives a re-render of the cells. It is initialised to the derived value the
  specification states: the selected cell when this person's inspector is open, else the current
  month when it falls in the visible year, else January. It is then **updated on every cell focus and
  on every Left, Right, Home and End key**, through `onActiveMonthChange`. Exactly the cell whose
  month equals `activeMonth` carries `tabIndex={0}`; every other cell is `tabIndex={-1}`. Tabbing
  away and back therefore returns to the cell the reader left, which is the property a roving
  tabindex exists to give and which `design-spec.md` §8's "**one** tab stop for the strip" assumes.
  Changing year keeps the active month's position (same month index in the new year); opening an
  inspector sets `activeMonth` to the selected month.
- Keys: Left and Right move by month and wrap December to January and back; Home and End go to
  January and December; each of these moves focus to the target cell's id and raises
  `onActiveMonthChange`. Up and Down call `onLeaveVertically(direction, month)`, and `MemberCalendar`
  sets the next or previous block's `activeMonth` to that month and then focuses
  `calendar-cell-<thatMemberId>-<thatMonth>`, so the receiving strip's tab stop and its focus agree.
  Enter and Space select the focused cell. Focus stays on the cell when the inspector opens.
- Per cell: `aria-selected` on the selected cell, `aria-current="date"` on the current month, the
  one-sentence `aria-label` from `cellText.ts`, the month label, and a mark row of at most three
  `CellMark` glyphs, receipt marks before the state mark. Marks are `aria-hidden`. The recorded
  count `×N` is not a mark: it shares the recorded disc's slot, is drawn whenever the cell holds at
  most two marks, and is dropped from the cell when all three marks are present, staying in the
  accessible name and in the inspector's "Recorded (N)" (`design-spec.md` §5, §14.2).

`CellMark`

- Props: `name: 'recorded' | 'assumed' | 'excepted' | 'paused' | 'unpriced'`, optional `title` unused.
- One 12 by 12 inline SVG per name, `aria-hidden="true"`, `focusable="false"`, stroke or fill
  `currentColor`, drawn exactly as the table in spec section 5. `off-plan` and the future and dashed
  treatments are cell background and border, not marks, and belong to `index.css`.

`MonthInspector`

- Props: `member: Member`, `row: MemberSummary`, `cell: MonthCell`, `month`, `locale`, `currency`,
  `startMonth`, `currentMonth`, `members`, `subscriptionId`, `editingPaymentId`,
  `pendingDeletePaymentId`, `scheduleEditing`, `schedulePendingDelete`, `onChanged`, `onSignedOut`,
  `onClose`, plus the section's status and alert setters.
- **Panel implementation: the inspector's own markup, not `DisclosurePanel`.** It reproduces the
  `.disclosure` / `.disclosure-inner` / `.panel` structure and the `data-open` attribute so it
  inherits the `grid-template-rows` 0fr→1fr motion and the reduced-motion zeroing from `index.css`
  verbatim (`index.css:706-717`, tokens at `:109-111` and `:504-505`). It runs **no** focus-on-open
  effect, because `DisclosurePanel.tsx:31-37` focuses the panel's first control on open and
  `design-spec.md` §8 requires focus to stay on the cell; and it renders its own heading, because
  `DisclosurePanel.tsx:54` emits an `h3` with no `id` and no `tabIndex`, which §8 needs as a focus
  target. `design-spec.md` §6 and §14.1 name the *motion*, not the component.
  `src/client/components/ui/DisclosurePanel.tsx` is therefore **not modified** and appears in neither
  planned-files table; the seven shipped forms that use it cannot regress. The cost is a second copy
  of the eight-line panel wrapper, and `.disclosure`, `.disclosure-inner` and `.panel` become a
  contract two components depend on, pinned in `index.css` by its single Sonnet owner in step 4.1.
  The closed wrapper carries `inert`, as `DisclosurePanel` does, so a closed inspector holds no tab
  stops; only the open inspector exists in the DOM per person, because `MemberCalendar` renders at
  most one inspector on the page.
- Escape is handled by the inspector itself, on the panel's `onKeyDown`, closing the inspector and
  returning focus to its cell id.
- Heading `h3` with `tabIndex={-1}`, id `inspector-heading-<memberId>-<month>`, text "Name, Month Year";
  it is the focus target after a completed receipt delete and after a schedule delete.
- Charge sentence from `cellText.ts`. Recorded group: `h4` "Recorded (N)" or the single empty
  sentence; each receipt is the existing `LedgerEntry` shape with `Money` in recorded treatment, the
  kind label and note on the secondary line, `formatDate` in the figure column, and Edit and Delete
  link buttons with ids `payment-edit-<id>` and `payment-delete-<id>`. Edit replaces the entry with
  `PaymentForm`; Delete swaps the actions for `ConfirmStrip` with the existing question naming amount
  and participant, focus on Keep.
- Assumed group: `h4` "Assumed"; the rate in assumed treatment, the window phrase, the status
  sentence and the mark toggle, or the exclusion phrase with no toggle when a wider condition
  excludes the month, or "No standing order for this month." Edit and Delete standing order open the
  same `ScheduleForm` and `ConfirmStrip` the Standing orders section uses, addressed by
  `cell.schedule.id`, which is how a rate change and an exception toggle reach the same row
  (matrix row 53).
- Record action: `.btn-primary` "Record a payment for `Month Year`" opening `PaymentForm` with
  `members` unchanged, the participant preset to this person and the date preset to the first day of
  the month, or today when the month is the current one.
- Errors: refusals raised inside the inspector render in a `SectionAlert` inside the inspector, above
  the groups, verbatim. Participant-level refusals stay in the section alert.
- Escape anywhere inside closes the inspector and returns focus to
  `calendar-cell-<memberId>-<month>`, or to the Participants heading when that cell no longer exists.
  This outer case is the inspector's own handler, described above. Escape inside an open form or
  confirm strip closes only that inner panel and needs no new code: `DisclosurePanel.tsx:39-42` and
  `ConfirmStrip.tsx:38-41` both call `stopPropagation()` before their own handler, so the key never
  reaches the inspector.

`cellText.ts`

- `cellAccessibleName(cell, member, locale, currency): string` builds the one sentence of spec
  section 5 in order, omitting empty parts, never combining recorded and assumed.
- `chargeSentence(cell, locale, currency): { text: string; tone: 'body' | 'red' }` builds the
  inspector's charge sentence, including the unpriced variant.
- `exclusionPhrase(reason: MonthExclusion): string` is the existing `REASON_PHRASE` map moved out of
  `RecurringSection.tsx:63-71` unchanged, so the phrases stay one copy. The move is completed in step
  4.1, where `RecurringSection.tsx` deletes its own copy and imports this one; until that step lands
  the map exists twice, and the step 4.1 criterion below is what closes it.
- The map keeps its `owner-member` key, because `MonthExclusion` declares it and the record is
  exhaustive, but no cell can reach that reason: with the owner block withdrawn (§13.2) no cell
  belongs to the owner, so the phrase "the owner is never paid from" never renders in the calendar
  (`design-spec.md` §5, §14.5). `CellMark` has no glyph for it and the cell precedence list does not
  carry it.
- Every string these produce is from `design-spec.md` sections 5, 6 and 9 or from the existing map.

`selection.ts`

- `readSelection(subscriptionId): { year: number; memberId: string; month: MonthStr } | null` and
  `writeSelection(subscriptionId, value)` over `sessionStorage` key `calendar:<subscription id>`, each
  wrapped so a throwing or absent storage yields the default rather than an error.
- `resolveSelection(stored, range, members, defaultYear)` is pure and decides whether a restored year
  is inside the range and the member still exists.
- `readSelection` and `writeSelection` take an optional storage argument defaulting to
  `window.sessionStorage`, so a test can pass an object instead of a global.
- What `selection.test.ts` covers, given `vitest.unit.config.ts:6` is `environment: 'node'` with no
  jsdom and no web-storage dependency: **restore, reject and default are three `resolveSelection`
  cases**, since that function is pure and fully testable. `readSelection` and `writeSelection` are
  covered for their guarded branches, absent storage and throwing storage, both yielding the default
  rather than an error, and for one round trip through an injected storage object. No test touches a
  `sessionStorage` global.

#### Focus rules mapped to owners

Every rule resolves to a named element id or a named piece of state, so none depends on an implicit
focus order.

| Spec section 8 rule | Owner | Target |
| --- | --- | --- |
| Tab order inside a block, one stop for the strip | `PersonBlock` and `MonthStrip` | the cell whose month equals `activeMonth`, `tabIndex={0}` |
| Left, Right, Home, End inside the strip | `MonthStrip` | `calendar-cell-<memberId>-<month>`, with `activeMonth` set to the same month |
| Enter, Space inside the strip | `MonthStrip` | focus stays on the focused cell; the inspector opens |
| Up and Down across blocks | `MonthStrip` raises `onLeaveVertically(direction, month)`, `MemberCalendar` sets the target block's `activeMonth` and focuses | `calendar-cell-<otherMemberId>-<month>` |
| Escape in the inspector returns to its cell | `MonthInspector` | `calendar-cell-<memberId>-<month>`, else `PARTICIPANTS.id` |
| Delete participant completed goes to the Participants heading | `MemberCalendar` | `PARTICIPANTS.id` |
| Delete participant refused goes to that block's Delete | `MemberCalendar` | `participant-delete-<id>` |
| Close participant edit goes to that block's Edit; close add goes to Add | `MemberCalendar` | `participant-edit-<id>`, `participant-add-button` |
| Delete receipt completed goes to the inspector heading, inspector stays open | `MonthInspector` | `inspector-heading-<memberId>-<month>` |
| Delete receipt refused goes to that entry's Delete | `MonthInspector` | `payment-delete-<id>` |
| Close receipt edit goes to that entry's Edit, or the inspector heading if the entry left the month | `MonthInspector` | `payment-edit-<id>`, else `inspector-heading-<memberId>-<month>` |
| Schedule edit and delete from the inspector | `MonthInspector` | the Assumed group's buttons, and `inspector-heading-<memberId>-<month>` after a delete |
| Year change keeps focus on the control pressed | `YearControl` by doing nothing | the pressed control |
| Inspector close goes to its cell, or the Participants heading if the cell is gone | `MemberCalendar`, testing `document.getElementById` first | `calendar-cell-<memberId>-<month>`, else `PARTICIPANTS.id` |

Element id owners: `MemberCalendar` owns `participant-add-button` and uses `PARTICIPANTS.id`;
`PersonBlock` owns `participant-edit-<id>` and `participant-delete-<id>`; `MonthStrip` owns
`calendar-cell-<memberId>-<month>`; `MonthInspector` owns `inspector-heading-<memberId>-<month>`,
`payment-edit-<id>` and `payment-delete-<id>`.

#### Accessible names mapped to owners

The cell sentence, `aria-selected` and `aria-current="date"` belong to `MonthStrip` with the text from
`cellText.ts`. The year buttons' `aria-label` and the select's label belong to `YearControl`. The
inspector heading text belongs to `MonthInspector`. Every mark is `aria-hidden` and carries no name,
because the sentence already carries the meaning. The hatch carries its phrase in the sentence, never
in colour alone. Disabled controls stay `aria-disabled` and focusable, never `disabled`, which is the
existing house rule (`PaymentList.tsx:163-169`).

#### Row-by-row destination table

All 67 rows of `research.md` section 3, each to a planned component.

| Rows | Field or action | Destination |
| --- | --- | --- |
| 1, 2, 3 | Name, "archived" tag, "not active this month" tag | `PersonBlock` header line |
| 4 | Balance as owes / ahead / settled | `PersonBlock` header figure, existing `Balance` |
| 5, 6, 7 | Owed, Paid, This month, lifetime | `PersonBlock` lifetime cells, from `summary.members` unchanged |
| 8 | Most-owing-first order | `MemberCalendar`, frozen while any panel is open, reapplied on close |
| 9 | Settled archived behind a disclosure | `MemberCalendar`, revealed rows render as full person blocks |
| 10 | "No participants yet." | `MemberCalendar` |
| 11 | Add participant action and panel | `MemberCalendar` header and add `DisclosurePanel` |
| 12 | Edit participant action and panel | `PersonBlock`, `MemberForm` replacing the block in place |
| 13 | Archive and Unarchive | `PersonBlock` |
| 14, 15 | Delete action and its confirm wording | `PersonBlock` `ConfirmStrip` |
| 16 | Delete refusal, server message | `MemberCalendar` `SectionAlert` |
| 17, 18, 19, 20 | Focus after delete, refusal, close edit, close add | `MemberCalendar`, per the focus table |
| 21 | Success sentence and row tint | `MemberCalendar` `useSectionStatus`; it resolves the one `highlightedId` to the owning member and the owning month, tinting the `PersonBlock` and the `MonthStrip` cell |
| 22, 23, 24, 25 | Member form name, ranges, add and remove range, field errors | `MemberForm`, unchanged |
| 26 | Payment amount, recorded treatment | `MonthStrip` recorded mark and `MonthInspector` entry |
| 27 | "from `<name>`" | `PaymentList` entry, unchanged; in the inspector the heading names the person |
| 28, 29, 30 | Kind label, note, original date | `MonthInspector` entry and `PaymentList` entry |
| 31 | Two receipts on one day | `MonthStrip` count `×N` in the disc's slot, dropped from the cell when three marks are present but kept in the accessible name, and two `MonthInspector` entries under "Recorded (2)" |
| 32, 33 | Heading count and the participant filter | `PaymentList`, unchanged |
| 34, 35 | Edit and Delete payment with its confirm | `MonthInspector` and `PaymentList` |
| 36 | Focus after payment delete and refusal | `MonthInspector` heading and entry Delete; `PaymentList` unchanged |
| 37 | "No payments recorded yet." | `PaymentList` |
| 38 | "Add a participant before recording a payment." | `PaymentList` |
| 39, 40, 41, 42, 43 | Payment form participant, date, amount, kind, note | `PaymentForm`, unchanged, with the inspector's presets |
| 44, 45 | Rate in assumed treatment, schedule window phrase | `MonthInspector` Assumed group and `RecurringSection` row |
| 46, 47 | Assumed total so far, "over N of M elapsed months" | `RecurringSection`, kept |
| 48 | Tile month label | `MonthStrip` cell label |
| 49 | "X assumed received" | `CellMark` assumed glyph and the `MonthInspector` status sentence |
| 50 | Exclusion phrase per `MonthExclusion` | `cellText.ts`, used by the cell sentence and the inspector |
| 51 | Tile state counted, not received, excluded | `CellMark` marks and the cell's hatch, dash and label treatments |
| 52 | Mark not received and Mark received toggle | `MonthInspector` Assumed group |
| 53 | Schedule id survives rate changes | `MonthCell.schedule.id` and `MonthCell.assumed.scheduleId` |
| 54 | Edit and Delete schedule with its confirm wording | `MonthInspector` Assumed group and `RecurringSection` |
| 55 | "No standing orders yet." and the no-participant refusal | `RecurringSection` |
| 56 | Schedule form fields | `ScheduleForm`, unchanged, rendered in both places |
| 57, 58, 59 | Price amount and month, price delete refusal, no-price sentence | `PriceHistory`, unchanged |
| 60 | Skipped month row and Unskip | `BreakMonths`, unchanged; also drawn as the `paused` mark |
| 61 | Section index | Unchanged, five items, same labels |
| 62 | First-load skeletons | `SubscriptionDetail` `SkeletonSection` plus the calendar skeleton in `MemberCalendar` |
| 63, 64 | Load error with Try again, `no-owner` state | `SubscriptionDetail`, unchanged |
| 65 | Signed-out handling | Every component's `onSignedOut`, unchanged |
| 66, 67 | Subscription header, summary figures and sentence | `SubscriptionDetail`, unchanged |

### 2.3 Independent plan review

A separate Opus reviewer runs `10x-plan-review` into `reviews/plan-review.md`, resolves every blocking
finding with a recorded disposition, and only then is `change.md` moved to `plan_reviewed` and
implementation begun. A design gap found later returns to Fable and triggers review of the affected
plan sections.

## Phase 3: Projection and completeness model

Opus owns every file in this phase. `src/client/calendar/projection.ts`, `cellText.ts` and their two
test files are written first, before any component exists, so the accounting is settled in a module
that the node test environment can reach.

`buildSubscriptionState` assembles the domain shape from the six collections already on the client,
flattening `Schedule.exceptionMonths` into `recurringExceptions` (`api.ts:268`) and taking settings
from the subscription prop. Nothing is fabricated to satisfy a type. The current month is
`summary.currentMonth`, derived once on the server from the subscription's own time zone
(`routes/summary.ts:34`); the browser clock is never consulted for accounting.

Exclusion precedence is the domain's and is never restated: `chargedMonthStatus` for the charge,
`scheduleMonthStatuses` for the assumed receipt with its exception applied last, and
`memberMonthStatus` for a month beyond a schedule's enumerated window. An unpriced month still counts
as received against a standing order; receipt eligibility and charge completeness stay separate.
A missing price or an empty membership range is never equated with a paid month. Recorded payments
outside a known active range stay visible.

Fixtures for this phase are `SubscriptionState` literals in `projection.test.ts`, which is route 1 of
`research.md` section 6. It is the only route that reaches a literal empty `activeRanges`, it needs no
server, and it matches how the domain is already tested. The synthetic six-person eight-year state is
built by a local helper in that file with two recurring rates, manual receipts and every edge case
listed in section 2.2 above.

#### Automated verification:

- `npm run test:unit` passes with the new `src/client/calendar/*.test.ts` files included by the
  existing `src/**/*.test.ts` glob, with no config change (step 3.1, step 3.2).
- All seven invariants and the three unpinned behaviours assert against `computeSummary` and
  `balanceForMember` outputs on the same literal state; invariant 6 asserts on named fixture values,
  not on a type property (step 3.2).
- `npm run typecheck` exits 0 (step 3.1).
- `git grep -n "priced:" src/client/calendar/` returns nothing, so no price-coverage flag exists;
  completeness reads `chargeStatus.reason === 'unpriced'` only (step 3.1).

#### Manual verification:

- The projection module imports no React and touches no storage, read back from the file (step 3.1).

## Phase 4: Compact UI and retained actions

Opus implements `MonthStrip`, `PersonBlock`, `MonthInspector`, `MemberCalendar` and the
`SubscriptionDetail` integration. Sonnet implements `CellMark`, `YearControl`, `selection.ts`,
`index.css`, `sections.ts`, the `PaymentList` disclosure and the `RecurringSection` tile removal.
The two workers hold disjoint files and run in the order below because the components import the
marks and the styles.

Step 4.1 is the Sonnet leaf work plus the `MemberList` removal; steps 4.2 and 4.3 are Opus. Reuse
existing forms, validation, mutation APIs, confirmation strips and status handling; no form, no
validation rule and no wire field name changes. Only the active inspector or management panel is
expanded; changing year never resets an unsaved form, and an open inspector stays open for the same
person and calendar month in the new year. Existing deletion refusals, archived access and signed-out
handling are preserved. After a mutation the screen reloads through the existing single `onChanged`
path and the projection recomputes from the reloaded records, so no stale or duplicated entry can
survive. A receipt edited into another month or year leaves the inspector where it is and tints its
new cell; if that cell is in another year the range sentence updates.

#### Automated verification:

- `npm run typecheck` exits 0 and `npm run test:unit` and `npm run test:integration` still pass
  (steps 4.1, 4.2).
- Every one of the 67 destination-table rows has an implemented destination, checked row by row
  (step 4.2).
- `git grep -n "MemberList"` returns nothing outside the change documents (step 4.1).
- `git grep -n "REASON_PHRASE" src/client/` returns exactly one definition, in
  `src/client/calendar/cellText.ts`, and no occurrence in `RecurringSection.tsx` (step 4.1).
- `git diff --stat main -- src/client/components/ui/DisclosurePanel.tsx` is empty, so the shared
  primitive the seven other forms depend on is untouched (step 4.2).

#### Manual verification:

- Step 4.3: a record, an edit, a delete and a refusal each reload through the single `onChanged`
  path, leaving no stale entry; the status sentence is a shipped string; the tint lands on both the
  changed cell and the person's block; a receipt edited into another month tints its new cell and
  leaves the inspector where it is; the selected year and open inspector survive a reload through
  `sessionStorage` and are discarded when the year leaves the range or the member is gone.
- Carried into Phase 5: selecting a month exposes all its records and both provenance categories
  separately; management and full-history access do not recreate the long page.

## Phase 5: Verification and acceptance

Gates first: `npm run typecheck`, `npm run test:unit`, `npm run test:integration` and `npm run build`
on the integrated tree, with the actual output recorded.

Browser fixture. The browser pass uses route 2 of `research.md` section 6: a fixture builder that
drives the app's own HTTP routes against a local dev instance, signed in as a disposable account
created through the normal sign-up path or through `POST /api/dev/seed` where `SEED_ENABLED` is set.
It lives with the tests, not in `src/`, as `tests/fixtures/calendar-ledger.mjs`. It builds two
ledgers with the same six participants:

- The **long** fixture: eight years of history, two recurring rates per person through adjacent
  non-overlapping schedules, an exception, a break month, a member with a range gap, a member with an
  early leave month, two receipts on one day, a yearly lump sum, a future-dated receipt, and a first
  price entry effective several months after the plan's start month.
- The **short** fixture: the same six participants and the same selected year, with one year of
  history and no earlier records.

No real ledger is read or written at any point. The empty `activeRanges` case is unreachable through
the API by design (`members.ts:30-32`) and stays a unit-test case only.

Compactness measurement, on both fixtures, same participant count and same selected year, in the
browser, recorded as numbers:

- `document.querySelector('main.page').scrollHeight`
- `document.querySelectorAll('main.page *').length`
- `document.querySelectorAll('[role="gridcell"]').length`
- `document.querySelectorAll('.entry-list > li').length`
- `document.querySelector('.calendar-blocks').scrollHeight`
- `document.querySelectorAll('.calendar-blocks *').length`
- `document.querySelectorAll('#year-select option').length`

Acceptance, per `design-spec.md` §14.4, which rules that compactness is measured on the person blocks
and the rendered cells rather than on the whole section:

- The gridcell count is identical for both fixtures.
- The person-blocks element count, `.calendar-blocks *`, is identical for both fixtures, and
  `.calendar-blocks` `scrollHeight` differs by under five per cent. This is the section's body minus
  the year control and legend, which is what the change exists to bound.
- The Participants section's own element count is a **bound**, not an identity: it differs between
  the two fixtures by no more than the number of extra `option` elements plus the range sentence's
  fragment count. One `option` per year in the range is expected and grows with years, not with
  payments, so the long fixture's eight years legitimately carry seven more than the short one's.
- The whole page's `scrollHeight` differs between them by under five per cent, the remaining
  difference being the same `option` count and the range sentence, consistent with the bound above.

The same figures are captured on the pre-change build with the same two fixtures, so the reduction is
a measurement rather than a claim. `#year-select` is the id `YearControl` gives its select, so the
option count is measurable directly rather than inferred.

Keyboard, focus and touch are verified in the real browser rather than in a component test. No jsdom
environment and no testing-library dependency is added: no `.test.tsx` exists today, the unit
environment is `node`, and every decidable string, sum and selection rule is already extracted into
`projection.ts`, `cellText.ts` and `selection.ts`, which the node suite covers. What the browser pass
must exercise, key by key, with the resulting focus recorded: Tab order through a block, one stop for
the strip, Left, Right, Home, End, Up, Down, Enter, Space, Escape from the inspector, Escape from an
open form, every one of the fourteen focus rules in the table above, the year change, tabbing away
from a strip and back to confirm the active cell is the tab stop, and a rapid
member and year switch. Also: a failed write, a failed refresh, a delete refusal, moving a payment
into another year, light and dark themes, desktop and 390px layouts, and reduced motion.

An independent Opus reviewer runs `10x-impl-review`; blocking findings are fixed and only the affected
checks repeated. Fable compares real screenshots and interactions against `design-spec.md` and writes
`reviews/design-acceptance.md`; screenshots alone do not verify keyboard or mutation behaviour.
Delegated browser checks and Fable acceptance replace routine user visual approval. Unsupported
browsers stay explicitly unverified. No fabricated human review and no fabricated test result.

#### Automated verification:

- Step 5.1: `npm run typecheck`, `npm run test:unit`, `npm run test:integration` and `npm run build`
  each exit 0 on the integrated tree, with their actual output recorded verbatim.

#### Manual verification:

- Step 5.2: the seven compactness figures are recorded for both fixtures and for the pre-change
  build, and every acceptance clause above holds on those numbers; every key in the list above is
  pressed and the resulting `document.activeElement` recorded for each of the fourteen focus rules;
  the 390px and desktop layouts, light and dark themes and reduced motion are each captured; a failed
  write, a failed refresh, a delete refusal and a payment moved into another year each behave as the
  specification says.
- Step 5.3: `reviews/impl-review.md` exists with a verdict, every blocking finding carries a
  disposition, and the checks affected by each fix are rerun.
- Step 5.4: `reviews/design-acceptance.md` exists, written by Fable, comparing real screenshots and
  interactions against every section of `design-spec.md`, and records either acceptance or the
  specific divergences to fix.

## Phase 6: Release and close

Follow the structure `evidence/runs/release-5.md` already establishes, into a new
`evidence/runs/release-6.md` with the same headings: release candidate and ancestry gates, gate
results captured verbatim from a throwaway clone rather than the shared working copy, hosted
continuous integration and its run id, remote state before anything is written including the
migration dry run (this change ships none), the deploy and the resulting Cloudflare Worker version,
rollback, live smoke, what the release changes for the certification package, defects found, what was
not exercised, and the hand-off.

Rollback reference: record the currently deployed Worker version `751a8bfd-e62a-4c9a-beb2-1953eb6a7656`
(release 5, release SHA `91ce0da`) as the restore point before deploying, and keep it until the live
verification passes. If verification fails, restore that version through the existing release flow and
keep the change open with the failing evidence. Do not migrate or rewrite D1. No new paid service and
no permission expansion.

Live verification is read-only on any real record plus synthetic-account workflows only. No real
ledger record is mutated as a smoke test.

Then update the foundation PRD, test plan and roadmap, the AGENTS active-work summary, STATUS, the
evidence index and work log, and the applicable parent GOALS entry through the sole status writer.
Completed certification history is preserved, badge checklists are not reset, nothing is uploaded to
the course. Affected synthetic certification captures are retaken only where needed. Archive with
`10x-archive` only after acceptance and live verification, into a date-free archive folder, and record
the deployment and the remaining limitations in a concise final handoff.

#### Automated verification:

- Step 6.1: the four gates are rerun in a throwaway clone of the release candidate and their output
  is pasted verbatim into `evidence/runs/release-6.md`; the hosted continuous integration run for
  that SHA is green and its run id is recorded.
- Step 6.3: the foundation PRD, test plan, roadmap, AGENTS active-work summary, STATUS, evidence
  index and work log and the parent GOALS entry all name S-09 at its new state, written by the sole
  status writer in one pass.

#### Manual verification:

- Step 6.1: the pre-deploy Cloudflare Worker version is recorded as the restore point before
  anything is deployed, and the deploy's resulting Worker version is recorded after.
- Step 6.2: the live smoke is read-only on real records and synthetic-account only for writes, its
  result recorded; both Worker versions and the rollback command appear in
  `evidence/runs/release-6.md`, which carries the twelve headings `evidence/runs/release-5.md`
  establishes.
- Step 6.4: the archive folder is date-free, completed certification history is preserved, no badge
  checklist is reset, nothing is uploaded to the course, and the final handoff records the deployment
  and the remaining limitations.

## Execution rules and open risks

Fable coordinates and performs design and visual acceptance only. Opus and Sonnet do research, code,
commands, tests, reviews, docs and deployment. Routine questions are resolved autonomously from the
existing requirements, the designer's rulings and the independent review. Every assignment specifies
allowed paths, dependencies, acceptance checks, checkpoint path and return format. Every worker
checkpoints after each meaningful step and before stopping, including partial work and the exact next
action.

The designer may write `design-spec.md` and the design acceptance directly as the explicit exception
in `ORCHESTRATOR.md`. All other shared files have a single status or integration writer, and this plan
names the owner of every planned file per phase. No Fable subagents. If a required model is
unavailable, checkpoint the concrete blocker; never silently substitute a model and never have the
orchestrator implement.

The eight points where `design-spec.md` was silent or disagreed with the shipped code are answered in
`design-spec.md` §13, and the five design findings the plan review raised in §14. Those two sections
are the standing authority; the assumptions in `context/checkpoints/cmc-2.2-plan.md` are superseded
where they differ, and no sentence in this plan now rests on one.

Risks: confusing received money with settled billing periods; losing a detail while collapsing a list;
presenting an incomplete ledger as settled; retaining an unbounded hidden DOM behind a disclosure;
losing focus while the order is reapplied; and verifying against private data. The phase gates, the
destination table, the invariant tests and the synthetic-only fixture rule address these. No recurring
human phase approvals are required. Pause only for genuinely missing access, unapproved spending,
destructive out-of-scope actions or explicitly gated course transmission.

## Review resolution

Dispositions for every finding in `reviews/plan-review.md` (verdict REVISE: 4 critical, 6 warnings,
1 observation, 5 design findings). The review report itself is the reviewer's file and is left
unedited; this section is the record. Design findings were ruled on by Fable in `design-spec.md` §14
before these edits were made, and those rulings are applied here, not re-decided.

| Finding | Disposition | Where the plan changed |
| --- | --- | --- |
| F1 Participants heading count | **Fixed** | `MemberCalendar` contract: `count` struck from the `SectionHeader` list and its omission stated with §13.1, `MemberList.tsx:29-33` and `SectionHeader.tsx:11-15` as the reason. |
| F2 Owner block | **Fixed** | `MemberCalendar` render order (person blocks → settled-archived disclosure → empty state, no owner step, owner share stays in the summary above the sections) and the `PersonBlock` contract, whose owner paragraph and `summary.ownerShareThisMonth` prop are deleted. |
| F3 Inspector panel and heading | **Fixed, Fix A** | `MonthInspector` contract: new markup reproducing `.disclosure`/`.disclosure-inner`/`.panel` and `data-open` for the motion, no focus-on-open effect, own `h3` with id and `tabIndex={-1}`, own Escape handler, `inert` on the closed wrapper. A note above the planned-files tables and a Phase 4 criterion state that `DisclosurePanel.tsx` is not modified; `index.css`'s change line pins the three classes. |
| F4 Cell identity and active-cell state | **Fixed** | `MonthStrip` contract: `calendar-cell-<memberId>-<month>` ids, per-strip `activeMonth` lifted to `PersonBlock`, updated on cell focus and on every arrow, Home and End key, driving the single `tabIndex={0}`; one name and one `MonthStr` payload for `onLeaveVertically` across `PersonBlock` and `MonthStrip`. The focus table gains a Target column resolving all fourteen rules to a named id or state, plus an id-owner list. |
| F5 One `highlightedId`, two tints | **Fixed** | `MemberCalendar` contract: the section resolves the one `highlightedId` against the reloaded records to an owning member and an owning month, tinting block and cell; no second status hook, no new status string. `PersonBlock` takes `highlighted` and never reads the hook. Matrix row 21 updated. |
| F6 Status index and invariant 6 | **Fixed** | Cost control rewritten: `scheduleMonthStatuses` runs once per schedule per projection, no cross-call index and no cache, with the stated cost and the existing memoization on records plus year. Invariant 6 restated as runnable assertions on named fixture values plus a sweep asserting no field equals `manual + assumed`. |
| F7 Phase 5 element-count criterion | **Fixed** | Phase 5 measurement: three figures added (`.calendar-blocks` scrollHeight and element count, `#year-select option` count); the person-blocks count is the identity, the section count a stated bound of extra `option`s plus range-sentence fragments, consistent with the scrollHeight clause. Applies `design-spec.md` §14.4. `YearControl` gains the `year-select` id. |
| F8 `REASON_PHRASE` move and `selection.test.ts` | **Fixed** | `RecurringSection.tsx`'s change line now deletes the map and imports `exclusionPhrase`, with a one-definition grep as a Phase 4 criterion; `cellText.ts` records that the duplication exists only between Phase 3 and step 4.1. `selection.ts` gains an injectable storage argument and the three named cases are assigned to `resolveSelection`, with the storage guards and one injected round trip separate. |
| F9 Superseded 2.2 assumptions | **Fixed** | Overview and "Execution rules and open risks" now name `design-spec.md` §13 and §14 as the standing resolution and the checkpoint's assumptions as superseded; the `MonthStrip` `role="row"` sentence cites §13.4 instead of an open question. |
| F10 Verification headings and uncovered Progress rows | **Fixed** | Phases 1 and 3 to 6 head their criteria `#### Automated verification:` / `#### Manual verification:`, matching `context/archive/subscription-management-and-date-inputs/plan.md:471`, `:484`. Rows 4.3, 5.2, 5.3, 5.4 and 6.1 to 6.4 each gain at least one criterion; Phase 6's follow `evidence/runs/release-5.md`. |
| F11 (a) import provenance | **Fixed** | The projection interface preamble names `PriceEntry` and `RecurringSchedule` as domain imports and `Subscription` and `Schedule` as client imports from `api.ts:5-14` and `:268`. |
| F11 (b) `RecurringSchedule` narrowing | **Fixed** | `MonthCell.schedule`'s comment states the narrowing and its reason: the exception months are dropped so the cell cannot re-derive an exception, which `assumedStatus.reason` already answers. |
| F11 (c) `change.md` drift note | **Accepted as is** | `change.md` is outside this step's allowed paths and is owned by the status writer. The note belongs with the status move to `plan_reviewed`, which is the next writer's action; recorded here so it is not lost. |
| Design 1 inspector motion | **Designer-ruled** (§14.1) | Applied in the `MonthInspector` contract; see F3. |
| Design 2 `×N` and the three slots | **Designer-ruled** (§14.2) | Applied in the `MonthStrip` per-cell bullet and matrix row 31: the count shares the disc's slot and is dropped from the cell when three marks are present, staying in the accessible name and in "Recorded (N)". |
| Design 3 `unpriced` source of truth | **Designer-ruled** (§14.3) | Applied by deleting `MonthCell.priced`: the domain's `chargeStatus.reason` feeds the mark, the sentence and the year count, with a Phase 3 grep criterion pinning that no flag returns. |
| Design 4 year control inside the section | **Designer-ruled** (§14.4) | Applied in the Phase 5 measurement; see F7. |
| Design 5 `owner-member` unreachable | **Designer-ruled** (§14.5) | Applied in `cellText.ts`: the map keeps the key for exhaustiveness over `MonthExclusion`, but no cell can reach it, `CellMark` has no glyph for it and the precedence list omits it. |

Re-verification checklist items 1 to 10 are addressed by the fixes above. Items 11, 12 and 13 are
unchanged properties: the `## Progress` contract still passes with step titles untouched and indices
unrenumbered, the plan stays date-free with no new dependency, no server route change and exactly one
new token, and all five design findings carry a designer ruling in `design-spec.md` §14.

## References

- `change.md`, `research.md`, `frame.md`, `design-inputs.md`, `design-spec.md` including §13 and §14,
  `mockup/compact-calendar.html`, `reviews/plan-review.md`
- `context/checkpoints/cmc-1.1-reconcile.md`, `cmc-1.2-research.md`, `cmc-2.2-plan.md`,
  `cmc-2.3-plan-review.md`, `cmc-2.3-resolve.md`
- Parent workspace `ORCHESTRATOR.md`
- `context/foundation/prd.md`, `test-plan.md`, `roadmap.md`
- `context/archive/visual-redesign/design-spec.md`
- `context/archive/subscription-management-and-date-inputs/plan.md` for the house plan format
- `evidence/runs/release-5.md` for the release and rollback pattern
- `src/client/screens/SubscriptionDetail.tsx:100-128`, `:347-365`, `:408-462`
- `src/client/components/MemberList.tsx:67-70`, `:110-131`; `PaymentList.tsx:67-84`, `:214`;
  `RecurringSection.tsx:63-71`, `:258-269`, `:333-377`; `sections.ts`
- `src/domain/calc.ts:24`, `:41`, `:66-105`; `month-status.ts:6-13`, `:47-77`;
  `recurring.ts:20`, `:72-86`; `prices.ts:10-22`; `months.ts:18`
- `vitest.unit.config.ts:6`, `package.json` scripts
- Course skills: 10x-research, 10x-frame, 10x-plan, 10x-plan-review, 10x-implement,
  10x-impl-review, 10x-archive; frontend-design for the named designer

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Reconcile state and complete research

#### Automated

- [x] 1.1 Reconcile checkout and active work with resumable checkpoints — 7a44970
- [x] 1.2 Complete research and frame with the full detail and action preservation matrix — cbf54df
- [x] 1.3 Register the roadmap change and synchronize active-work pointers — cbf54df

### Phase 2: Fable design and independent plan review

#### Automated

- [x] 2.1 Complete the Fable design specification and design-completeness checklist — cbf54df
- [x] 2.2 Finalize component contracts and implementation plan from the approved design — cbf54df
- [ ] 2.3 Complete independent plan review and resolve blocking findings

### Phase 3: Projection and completeness model

#### Automated

- [ ] 3.1 Implement read-only monthly projection with canonical accounting helpers
- [ ] 3.2 Verify completeness states and edge-case reconciliation with synthetic fixtures

### Phase 4: Compact UI and retained actions

#### Automated

- [ ] 4.1 Implement the approved compact overview and month inspector
- [ ] 4.2 Preserve all management actions and bounded full-history access
- [ ] 4.3 Verify mutation refresh and selection behavior

### Phase 5: Verification and acceptance

#### Automated

- [ ] 5.1 Pass typecheck, relevant tests and production build
- [ ] 5.2 Verify compactness, responsive layouts and accessibility in the browser
- [ ] 5.3 Complete independent implementation review and resolve blocking findings
- [ ] 5.4 Obtain Fable visual acceptance against the real implementation

### Phase 6: Release and close

#### Automated

- [ ] 6.1 Verify hosted checks and deploy the accepted revision
- [ ] 6.2 Verify the live release and record the Worker version and rollback reference
- [ ] 6.3 Synchronize foundation documents, goals and evidence
- [ ] 6.4 Archive the accepted change and record the final handoff
