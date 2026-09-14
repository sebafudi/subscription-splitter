<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Compact member calendar implementation plan

- **Plan**: `context/changes/compact-member-calendar/plan.md`
- **Scope**: Phases 3 and 4 of 6 (the application-code phases; Phases 1 and 2 are documents already
  reviewed by `reviews/plan-review.md`)
- **Commits reviewed**: `9ee9d04` through `91a80ca`, against the pre-change baseline `c10d54f`.
  The integrator's fix commit `a87d728` (zero-receipt heading, "Not assumed:" sentence) landed
  before this review began and is included.
- **Repository state**: the reviewer wrote no part of the frame, research, design specification,
  plan, code, tests or evidence, and modified no file under `src/`, `tests/`, `plan.md` or
  `design-spec.md`.
- **Verdict**: APPROVED at `650a14d`, the release candidate (opened REVISE: 0 critical, 5 warnings,
  6 observations, 3 design findings; every one closed at `d5952a9` and by `design-spec.md` §17, see
  `## Re-verification`. Five later code commits re-reviewed in two passes and the approval extended
  each time, see `## Delta review at 05ff614` and `## Delta review at 650a14d`)
- **Findings**: 0 critical, 5 warnings, 6 observations

Date and effort fields the report schema lists are omitted, matching this repository's convention of
recording progress by change ID and commit.

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | WARNING at open, PASS after resolution |
| Success Criteria | WARNING at open, PASS after resolution |

Accounting safety, the one dimension `change.md` calls load-bearing, is clean. Every warning is a
focus, identity or copy defect in the presentation layer.

## Verification performed

Every gate was re-run in this checkout at `91a80ca`.

| Gate | Result |
|---|---|
| `npm run typecheck` | clean, three projects |
| `npm run test` (unit then integration) | 13 files / 131 cases passed |
| `npm run build` | succeeds, 306.54 kB client bundle |
| `git diff c10d54f..HEAD -- src/server migrations wrangler.jsonc` | empty |
| `git diff c10d54f..HEAD -- package.json package-lock.json` | empty |
| Dates, timestamps, duration estimates in authored files | none outside synthetic fixtures |
| Private data in fixtures | none; six invented names, invented amounts |

## Accounting safety, checked specifically

Recorded against this being the constraint the change exists to protect. All clear.

- The projection calls the domain and restates no rule. `projection.ts:165-180` reads
  `isMonthInSchedule`, `scheduleMonthStatuses`, `memberMonthStatus`, `shareForMember` and
  `chargedMonthStatus`; no exclusion condition, precedence order or rounding rule is re-derived.
- **Recorded and assumed are never summed** in any rendered field. `projection.ts:187-193` keeps
  three separate reducers; `cellText.ts:74-84` pushes the recorded phrase and the assumed phrase as
  separate sentence parts; `PersonBlock.tsx:163-180` renders three labelled figures. A grep for any
  addition of the two across cells, year totals, accessible names, the inspector and the status
  strings returns nothing. `projection.test.ts:522-543` proves it with a ledger whose forbidden sum
  appears in no numeric field of the projection.
- **Completeness comes only from the domain's reason.** `projection.ts:193`
  (`chargeStatus.reason === 'unpriced'`), `MonthStrip.tsx:43` (the `?` mark) and `cellText.ts:103`
  (the red sentence) all read the same field. There is no separate price-coverage flag, as §14.3
  required.
- **Exclusion precedence is preserved, structurally.** `MonthStrip.tsx:41-46` checks `break-month`,
  then `unpriced`, then `excepted` off the assumed status. That last check cannot mislabel a month
  excluded by a range gap, because `domain/recurring.ts:81-86` applies the exception *after*
  `memberMonthStatus` and only when the month already counted, so `excepted` can never coexist with
  `outside-active-range` or `break-month`. The cell inherits the domain's ordering rather than
  restating it.
- **Future-dated receipts** sit in the month their date names and nowhere else
  (`projection.ts:171`, proved at `projection.test.ts:466-478`), stay uncharged, and remain
  discoverable through `futureYearPayments` (`projection.ts:234-248`) and the year control's
  ascending link fragments.
- **Empty membership ranges** produce `hasActiveRange: false` (`projection.ts:194`), the red
  sentence (`PersonBlock.tsx:181-185`) and a hatched strip, with recorded receipts still drawn.
  Nothing reads "settled".
- **Selection never writes to the ledger.** `selection.ts` touches `sessionStorage` only, and every
  read and write is wrapped so a throwing or absent storage is a plain absence.
- **The invariant tests are real.** `projection.test.ts:424-478` reconciles, for each of five
  participants across 2019 to 2027, the projection's charged total against both `balanceForMember`
  and `computeSummary`, its assumed total against `recurringReceived`, and paid and balance against
  the summary row, with decidable values (Alice's balance asserted as `-2061`). The eight-year
  fixture at `projection.test.ts:26-140` carries every edge case the plan lists: two same-day
  receipts, a lump sum, a future-dated receipt, a receipt in a later year, two sequential schedules
  at different rates, an exception, a break month, a membership gap, an early leave, an empty
  membership, unpriced months and months that have not arrived.

## Preservation

65 of the 67 rows of the plan's destination table are present with the same semantics, and 13 of the
14 focus rules in §8 are implemented. The two defects are F1 and F2 below. Points that were most at
risk and are clean: the schedule is addressed by id across a rate change at every site
(`MemberCalendar.tsx:345`, `MonthInspector.tsx:348-349`, `:362`, `:390`); the three deletion
refusals are verbatim; the archived-settled disclosure still renders full person blocks
(`MemberCalendar.tsx:433-451`); all five new catch paths test `SignedOutError` first; the
"Add a participant before recording a payment." refusal, the note and kind, two same-day receipts as
two entries, and the original formatted dates all survive.

## Findings

### F1 — `payment-edit-<id>` and `payment-delete-<id>` are duplicated between the inspector and the payments list

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `src/client/calendar/MonthInspector.tsx:285` and `:297`; `src/client/components/PaymentList.tsx:303` and `:315`
- **Detail**: Both components render `id={`payment-edit-${payment.id}`}` and
  `id={`payment-delete-${payment.id}`}` for the same payment. When the Payments received disclosure
  is open and the payment is on the shown page, both exist at once. `document.getElementById`
  returns the first in document order, and Participants precedes Payments received in
  `sections.ts`. So `PaymentList`'s own focus restoration (`PaymentList.tsx:120` and `:137`) can
  move focus out of the payments history and into the open calendar inspector. It also makes F2's
  probe non-deterministic.
- **Fix**: Prefix the inspector's two ids, for example `inspector-payment-edit-<id>` and
  `inspector-payment-delete-<id>`, and update the four `setFocusTarget` call sites in
  `MonthInspector.tsx` that name them.
- **Decision**: FIXED at `d5952a9`

### F2 — Closing a receipt edit inside the inspector always lands on the heading, never on that entry's Edit

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `src/client/calendar/MonthInspector.tsx:147-153`
- **Detail**: `closePaymentEdit` probes `document.getElementById(`payment-edit-${paymentId}`)`
  synchronously, before `setEditingPaymentId(null)` is committed. While the panel is open the entry
  is replaced by the `DisclosurePanel` (`MonthInspector.tsx:226-255`), so that id is not in the
  inspector's DOM at probe time and the probe returns null. Focus therefore always falls back to
  `headingId`. Design-spec §8 reserves the heading for the case where the entry left the month:
  "Close receipt edit: that entry's Edit button; if the entry left this month, the inspector
  heading." The rule as specified never fires.
- **Fix**: Set the target unconditionally to the entry's Edit id. The focus effect at
  `MonthInspector.tsx:119-128` already retries on the reprojected cell and gives up after a second,
  which is exactly the entry-left-the-month case; add the heading as that effect's give-up target
  rather than deciding at click time.
- **Decision**: FIXED at `d5952a9`

### F3 — The record button names the month in the short form

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `src/client/calendar/MonthInspector.tsx:467` and `:474`
- **Detail**: The code renders `Record a payment for {formatMonth(cell.month, locale)}`, that is
  "Record a payment for Mar 2026". Design-spec §6 and §10 both give the string as "Record a payment
  for March 2026", and §10 traces that exact wording through to the status "Payment recorded".
  `formatLongMonth` is already imported and used for the heading and the sentences at `:132`.
  See design finding D3: §15.1 does not settle whether a button label counts as an inspector
  sentence.
- **Fix**: Use `formatLongMonth` for both the button label and the panel title, once the designer
  confirms D3.
- **Decision**: FIXED at `d5952a9`

### F4 — The action row renders and tabs after the strip, reversing the specified tab order

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: `src/client/calendar/PersonBlock.tsx:128-209`; `src/client/components/ui/LedgerEntry.tsx:42-43`
- **Detail**: `LedgerEntry` renders `{children}` before `{confirm ? … : actions}`. `PersonBlock`
  passes the strip and the inspector as `children` and Edit/Archive/Delete as `actions`, so both
  DOM order and tab order are strip, then inspector, then Edit, Archive, Delete.
  `.entry-actions { grid-column: 1 / -1 }` sets no `grid-row`, so the visual order is not corrected
  either. Design-spec §8 states the order as "Edit, Archive, Delete, then **one** tab stop for the
  strip …, then the inspector's controls when open", and §4's block diagram puts the actions above
  the strip. This is inherited behaviour: the old `RecurringSection` month tiles sat below the
  actions the same way, so it is a pre-existing component shape rather than a new regression.
- **Fix A ⭐ Recommended**: Add an `afterActions` slot to `LedgerEntry` (or render the strip and
  inspector as siblings after the `LedgerEntry`, inside `.calendar-block`) so the action row keeps
  its place above them.
  - Strength: Restores the specified order in both DOM and tab sequence without CSS ordering
    tricks, which would leave the tab order wrong anyway.
  - Tradeoff: Touches a shared component used by every section, so it needs a look at the other
    call sites.
  - Confidence: HIGH — the cause is one line, `LedgerEntry.tsx:42`.
  - Blind spot: Have not checked whether any existing section depends on children preceding actions.
- **Fix B**: Take it to the designer as an amendment and let the strip sit below the actions.
  - Strength: No shared-component change; matches what the old standing-order tiles did.
  - Tradeoff: §8's tab order and §4's diagram both then need rewriting, and the reader tabs through
    twelve-cell strips before reaching the row's own actions.
  - Confidence: MEDIUM — depends on the designer's view of the diagram.
  - Blind spot: Not verified against the phone layout captures.
- **Decision**: FIXED at `d5952a9`

### F5 — "Show N more" ships where the spec gives a fixed "Show 12 more"

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `src/client/components/PaymentList.tsx:336-338`
- **Detail**: The code renders `Show {Math.min(PAGE_SIZE, visible.length - shown)} more`, so a
  partial last page reads "Show 5 more". Design-spec §7 specifies the fixed string "Show 12 more"
  and §10 says implementers add none. The implementation is arguably the better behaviour, which is
  why this is also design finding D2.
- **Fix**: Keep the dynamic count and record it as a designer ruling in §7, or revert to the fixed
  string. The designer decides; see D2.
- **Decision**: CLOSED by `design-spec.md` §17.2, which amends §7 to the shipped rule; no code change

### F6 — Static ids inside the inspector are not scoped to the person

- **Severity**: 📋 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `src/client/calendar/MonthInspector.tsx:459`, `:405`, `:415`, `:472`; `src/client/calendar/PersonBlock.tsx:50-63`
- **Detail**: `inspector-record`, `inspector-record-panel`, `inspector-schedule-edit` and
  `inspector-schedule-delete` are constant strings. `useClosing` keeps a closing inspector mounted
  for 140ms, so opening another person's inspector makes two coexist transiently with identical ids
  and an ambiguous `aria-controls`. The held copy is `inert`, so a focus call that resolves to it
  silently does nothing.
- **Fix**: Suffix all four with the member id and month, as `cellId` and `inspectorHeadingId`
  already do.
- **Decision**: FIXED at `d5952a9`

### F7 — Dead export `closeTarget`

- **Severity**: 📋 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `src/client/calendar/MonthInspector.tsx:505-508`
- **Detail**: Unreferenced, and it duplicates the rule already inlined in
  `MemberCalendar.closeInspector` (`MemberCalendar.tsx:207-212`). Two definitions of one rule can
  drift.
- **Fix**: Delete the export, or use it from `closeInspector` so there is one definition.
- **Decision**: FIXED at `d5952a9`

### F8 — `CellMark` declares an unused `title` prop

- **Severity**: 📋 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `src/client/calendar/CellMark.tsx:5-6`
- **Detail**: `title?: string` is declared and documented as unused, and is never destructured. The
  marks are `aria-hidden` and §8 forbids tooltips, so nothing will ever set it.
- **Fix**: Remove the prop.
- **Decision**: FIXED at `d5952a9`

### F9 — Two accessible-name strings the specification does not define

- **Severity**: 📋 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `src/client/calendar/MonthStrip.tsx:111`; `src/client/calendar/YearControl.tsx:53-55`
- **Detail**: The grid carries `aria-label={`${member.name}, month by month`}` and the year select
  carries an `sr-only` "Year" label. Both are correct accessibility practice and neither is in §3 to
  §10, which §10 forbids ("implementers add none").
- **Fix**: Record both in §3 and §4 as designer additions rather than removing them.
- **Decision**: PARTLY CLOSED — the year select's label is ruled in `design-spec.md` §17.4; the
  strip's name became the named, tested `stripAccessibleName` at `d5952a9` but is not in the
  specification. Recorded as the one remaining observation; no action required.

### F10 — Vertical movement stops at a block with no strip instead of skipping it

- **Severity**: 📋 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `src/client/calendar/MemberCalendar.tsx:215-221`; `src/client/calendar/PersonBlock.tsx:187`
- **Detail**: §8 says Up and Down move to "the same month in the previous/next person block **that
  has a strip**". `leaveVertically` takes the immediately adjacent block and gives up if its cell is
  absent. A block has no strip only when its member or projection is missing, which cannot happen
  with the current data (`summary.members` excludes the owner and always resolves in `byId`), so
  this is latent rather than live. It does mean Up and Down never reach a block whose edit panel is
  open, which is the one reachable case.
- **Fix**: Walk on past blocks whose cell id is absent rather than stopping at the first.
- **Decision**: FIXED at `d5952a9`

### F11 — Unreachable fallback invents a phrase for a state that cannot occur

- **Severity**: 📋 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architecture
- **Location**: `src/client/calendar/MonthInspector.tsx:337`
- **Detail**: `exclusionPhrase(cell.assumedStatus?.reason ?? 'outside-active-range')` would speak
  "the participant was not on the plan that month" for a month whose assumed status is null. The
  projection guarantees that cannot happen: `projection.ts:166-167` sets a non-null `assumedStatus`
  whenever a schedule covers the month, and `assumedGroup` returns early when it does not
  (`MonthInspector.tsx:313-315`). The dead branch asserts a domain fact rather than the domain
  answering it.
- **Fix**: Narrow the type at the call site so the fallback is unnecessary, or fall back to
  "No standing order for this month."
- **Decision**: FIXED at `d5952a9`

## Design findings

For the designer, where the specification itself is the problem rather than the code.

1. **§3 contradicts itself on the year buttons.** It asks for "two `.btn-quiet` buttons with visible
   text 'Previous year' and 'Next year' as `aria-label`, showing the glyphs `‹` `›`". Visible text
   and glyph-plus-`aria-label` are mutually exclusive. The implementer chose the latter. Rule on
   which it is.
2. **§7 has no wording for a final partial page.** "Show 12 more" is wrong whenever fewer than
   twelve remain, which is the common case. The implementation invented "Show N more". Rule on the
   string, and on whether the count is spoken at all.
3. **§6 and §15.1 do not settle the record button's month form.** §6 writes "Record a payment for
   March 2026" (long); §15.1's short-form list is "Cell labels, the legend, the range sentence,
   schedule windows and every existing string", and a new button label is none of those but is also
   not obviously an "inspector sentence". This is the direct cause of F3.

## Re-verification checklist

1. `MonthInspector`'s payment Edit and Delete ids are namespaced and no id in the inspector collides
   with one in `PaymentList` (grep both files for `id={` and diff the id shapes).
2. Cancelling and saving a receipt edit inside the inspector lands focus on that entry's Edit
   button, and only a receipt that left the month lands on the inspector heading.
3. The record button and its panel title read the long month form, matching whatever D3 rules.
4. Tab order inside a person block is Edit, Archive, Delete, strip, inspector, next block, and the
   action row renders above the strip in both themes and at 390px.
5. The payments "Show more" link matches whatever D2 rules.
6. `inspector-record`, `inspector-record-panel`, `inspector-schedule-edit` and
   `inspector-schedule-delete` are unique per person block.
7. `closeTarget` and `CellMark.title` are gone, or `closeTarget` has one caller.
8. `npm run typecheck`, `npm run test` and `npm run build` still pass, and `projection.test.ts`'s
   invariant and never-summed suites still pass unchanged.
9. `git diff c10d54f..HEAD -- src/server migrations wrangler.jsonc package.json package-lock.json`
   is still empty.

## Re-verification

The integrator resolved the findings at `d5952a9` (disposition table in
`context/checkpoints/cmc-4-integrate.md`, sha recorded at `199247e`) and the designer ruled on the
three design findings in `design-spec.md` §17. The diff `a87d728..HEAD -- src/` touches seven files
and was read in full. Nothing outside `src/client/calendar/` changed, and no server, migration,
`wrangler.jsonc` or dependency file was touched.

- **Verdict after resolution**: APPROVED. Nothing further is required.
- **Findings remaining**: 0 critical, 0 warnings, 1 observation, none blocking.

### Designer rulings absorbed

§17 answers all three design findings. D1 is withdrawn: the year buttons are glyph-only with the
phrase as `aria-label`, which is what shipped. D2 amends §7: "Show N more" where N is the smaller of
twelve and the entries not yet shown, which is what shipped, so **F5 is closed with no code change**
and the label never promises more than it reveals. D3 puts the record action in the long month form,
which F3's fix implements. §17.4 additionally rules the year select's visually hidden "Year" label,
which closes half of F9.

### Item-by-item result

| # | Checklist item | Result |
|---|---|---|
| 1 | Inspector ids namespaced, no collision with `PaymentList` | **Pass** |
| 2 | Close receipt edit lands on that entry's Edit; heading only when the receipt left the month | **Pass** |
| 3 | Record button and panel title read the long month form | **Pass** |
| 4 | Tab order Edit, Archive, Delete, strip, inspector; action row above the strip | **Pass** |
| 5 | Payments "Show more" matches the D2 ruling | **Pass** |
| 6 | The four inspector control ids are unique per person block | **Pass** |
| 7 | `closeTarget` and `CellMark.title` gone | **Pass** |
| 8 | `typecheck`, tests and `build` still pass; the projection suites unchanged | **Pass** |
| 9 | No server, migration or dependency change | **Pass** |

1. **Ids.** `MonthInspector.tsx:56-75` introduces `scopedId`, `paymentEditId` and `paymentDeleteId`;
   the receipt buttons are now `inspector-payment-edit-<id>` and `inspector-payment-delete-<id>`
   (`:308`, `:320`), and all six `setFocusTarget` call sites that named the old ids were updated. A
   grep across `src/client/calendar/` for the old bare forms returns nothing, and an inventory of
   every id rendered by the calendar and by `PaymentList` shows no value produced by both. F1 closed.
2. **Receipt edit focus.** `closePaymentEdit` (`MonthInspector.tsx:175-179`) now sets the entry's
   Edit id unconditionally, and the decision moved into the focus effect (`:132-156`), which retries
   on the reprojected cell and, after a second with no such control, focuses the heading. That is the
   entry-left-the-month case §8 reserves the heading for, now decided when the answer is known rather
   than guessed inside the click handler. `headingId` was hoisted above the effect and added to its
   dependencies, so the fallback cannot close over a stale id. F2 closed, and focus rule 11 is
   implemented; **all fourteen §8 focus rules now have an implementation**.
3. **Long month form.** `Record a payment for {longMonth}` at `MonthInspector.tsx:492` and the same
   string as the panel title at `:500`. `formatMonth` is no longer used for either. F3 closed
   against §17.3.
4. **Tab order.** `PersonBlock.tsx:163-190` renders the action row, or the confirm strip in its
   place, as the block's own child between the year cells and the strip, keeping the shipped
   `.entry-actions` and `.entry-confirm` classes; `LedgerEntry` receives neither an `actions` nor a
   `confirm` prop any more and is itself unmodified, so no other section is affected. DOM order is
   now header, lifetime cells, year cells, actions, strip, inspector, which is §4's diagram and §8's
   tab order. F4 closed by Fix A, the recommended option, and the shared component was left alone.
   `git diff c10d54f..HEAD -- src/client/components/ui/LedgerEntry.tsx` is empty.
5. **Bounded payments.** Unchanged, and correct under the amended §7. F5 closed.
6. **Scoped control ids.** `recordButtonId`, `recordPanelId`, `scheduleEditId` and
   `scheduleDeleteId` are built by `scopedId` from the member id and the month
   (`MonthInspector.tsx:157-160`), so the inspector held for the length of its closing motion can no
   longer share an id, or an `aria-controls` target, with the one opening. F6 closed.
7. **Dead code.** `closeTarget` is deleted, and with it the `cellId` import it needed;
   `CellMark.title` is gone. F7 and F8 closed. F10's `leaveVertically` now walks past any block whose
   cell is absent instead of stopping at the first (`MemberCalendar.tsx:214-232`), so Up and Down
   reach the next block that has a strip even when a block between them has its edit panel open;
   F10 closed. F11's unreachable fallback is replaced by an `assumedReason !== null` guard
   (`MonthInspector.tsx:344`, `:362`), so no phrase is invented for a state the projection cannot
   produce; F11 closed.
8. **Gates, re-run in this checkout at `199247e`.** `npm run typecheck` clean across three projects;
   `npm run test:unit` 26 files and 351 cases passed; `npm run test:integration` 13 files and 131
   cases passed; `npm run build` succeeds. The accounting suites in `projection.test.ts` are
   untouched by `d5952a9` and still pass, so the invariants against `computeSummary`,
   `balanceForMember` and `recurringReceived`, and the never-summed proof, still hold. The one test
   change is additive: `cellText.test.ts:196-201` covers the new `stripAccessibleName`.
9. **Hygiene.** `git diff a87d728..HEAD -- src/server migrations wrangler.jsonc package.json
   package-lock.json` is empty.

### Destination rows re-checked

The three rows previously marked unpreserved were rows 34, 35 and 36, all of them the duplicate-id
defect rather than a missing field. With the inspector's ids namespaced, `PaymentList`'s own focus
restoration can no longer resolve into the calendar, and row 36's "PaymentList unchanged" holds:
`git diff c10d54f..HEAD -- src/client/components/PaymentList.tsx` contains only the bounded-payments
work the plan called for. **All 67 destination rows are preserved.**

### The one observation that remains

The strip's own accessible name, "`Name`, month by month", is now a named and tested function
(`cellText.ts:37-44`, `cellText.test.ts:196-201`) rather than an inline template, which is the better
half of F9's fix. §17.4 records the year select's label but not this one, so the string still lives
only in the code. It is correct practice for a `role="grid"`, nothing depends on it being in the
specification, and it is recorded here rather than held against the change. No action required.

## Delta review at 05ff614

Three code commits landed after the APPROVED verdict at `199247e`, so the approval is re-examined
against the release candidate. Reviewed: `git diff 199247e..HEAD -- src/ plan.md design-spec.md`,
read in full, plus `context/checkpoints/cmc-4-integrate.md`, `cmc-5-verify.md`,
`evidence/runs/s09-compactness.md` and `evidence/runs/s09-browser-verification.md`.

- `1cef767` — the strip's accessible name carries the year.
- `4753a52` — V3 the tint is decided at mutation time; V4 cross-month edit focus; the Phase 5
  compactness clause amended in `plan.md`.
- `a671ca0` — designer §18: future-year fragments keyed to the current year, the no-membership-range
  balance, the lifetime completeness sentence, `×N` drawn after the disc.

- **Verdict: APPROVED, extended to `05ff614`.** 0 critical, 0 warnings, 2 observations, 1 design
  finding. Nothing is required before release.

### Accounting safety of the two new projection helpers

Both are clean, and the constraint the change exists to protect is intact.

- `lifetimeUnpricedMonths` (`projection.ts:243-258`) enumerates the plan's start month to the
  current month and counts only `chargedMonthStatus(...).reason === 'unpriced'`. It reads the
  domain's reason, never an amount, so a zero charge is never inferred to be a missing price, and a
  month a break or a membership gap already excluded carries that reason instead and is not counted.
  It is the exact lifetime counterpart of `PersonYear.unpricedMonths` and reads the same field, so
  §14.3's single-source-of-truth ruling still holds with no new flag.
  `projection.test.ts:433-452` proves both halves: the lifetime count equals the sum of the per-year
  counts for all five participants, and with the whole price history removed it equals exactly the
  months `memberMonthStatus` still counts, which is the decidable statement of "never counts a month
  a wider condition already excluded".
- `futureYearPayments` (`projection.ts:231-248`) now takes the current month instead of the selected
  year. It touches only receipt dates and counts; it sums no money and reads no charge.
- **Recorded and assumed are still never summed.** Neither helper produces money. `PersonYear` is
  unchanged in shape, `cellText.ts`'s sentence assembly is unchanged apart from the strip name, and
  the never-summed suite (`projection.test.ts:522-543`) and the invariant suite against
  `computeSummary`, `balanceForMember` and `recurringReceived` are untouched by all three commits
  and still pass.
- The new lifetime sentence and the new balance branch are both presentation over an existing
  domain answer. `PersonBlock.tsx:149-153` renders the sentence from the count alone;
  `PersonBlock.tsx:124-134` switches the balance slot on `!hasActiveRange && balance === 0`, which
  is §18.2 exactly, so a non-zero balance keeps its usual word-plus-figure and a real credit is
  never suppressed.

### The highlight helper

`resolveHighlight` looked the tint up from the reloaded records by the one id `useSectionStatus`
carries, which a deleted record no longer has; that was V3's defect. `highlightFor(memberId,
monthOrDate)` (`interaction.ts:54-70`) is total and decides at the call site, before the reload.
Checked at every one of the nine call sites:

| Action | Tint passed | Correct |
|---|---|---|
| Receipt deleted | `highlightFor(member.id, cell.month)` | the month that lost the record, which is the fix |
| Receipt edited | `highlightFor(member.id, saved.date)` | the month the receipt landed in, not the one it left |
| Receipt recorded | `highlightFor(member.id, saved.date)` | the new receipt's own month |
| Exception toggled | `highlightFor(member.id, cell.month)` | the month whose assumed receipt changed |
| Schedule edited or deleted | `highlightFor(member.id)` | block alone, no single month |
| Participant added, edited, archived | `highlightFor(member.id)` | block alone |
| Participant deleted | `null` | no tint; the block is gone |

`monthOrDate.slice(0, 7)` accepts a month and a date alike, which is why one helper serves both the
delete (a month) and the edit (a date). A receipt moved across a year still resolves: the month is
the new one, no cell in the shown year matches it, and the block tint stands alone, which is §6's
stated behaviour. `useSectionStatus` is **unmodified** (`git diff c10d54f..HEAD --
src/client/components/ui/useSectionStatus.ts` is empty); it still owns the sentence and its single
timer, and `shownHighlight = status.message === null ? null : highlight`
(`MemberCalendar.tsx:177`) ties the tint's lifetime to the sentence's, so the two appear and leave
together as §9 requires. The now-unused `payments` prop was removed from `MemberCalendar` and its
call site rather than left dangling.

### Focus rule V4

`closePaymentEdit(paymentId, landedIn = cell.month)` (`MonthInspector.tsx:176-185`) targets the
entry's Edit button when the receipt stayed and the inspector heading when it did not. Both branches
are wired: `onSaved` passes `saved.date.slice(0, 7)` and `onCancel` takes the default, which is
always this cell's month because a cancel moves nothing. The one-second fallback in the focus effect
(`:139-156`) still focuses the heading if a target never arrives, so a third outcome cannot leave
focus on `document.body`, which was the observed defect. §8's rule now holds in every branch.

### `futureYearPayments` against §18.1

The implementation counts payments whose year is greater than the year of `current`, and `current`
is `summary.currentMonth`, which the domain computes in the subscription's own time zone, so "the
current month's year in the plan's time zone" is satisfied without the client deriving a date. The
fragment set no longer changes as the reader steps years, which is the point of the ruling: a
future-dated receipt stays named whatever year is on screen. Three tests cover it
(`projection.test.ts:411-431`): the fixture's single 2027 receipt from the current month, nothing
once the current year has passed 2027, and a second 2027 receipt counted whatever year is shown.
The old assertions keyed to the selected year were replaced rather than deleted.

### Reachability of the no-membership-range branch

The integrator's claim is correct and the fixture does not contradict it.
`validateActiveRanges` (`src/domain/members.ts:29-32`) returns `active_ranges must not be empty`,
and both member write paths call it (`src/server/routes/members.ts:59` and `:97`), as does the
subscription path (`src/server/db/subscriptions.ts:436`), so no member with zero ranges can be
created or edited through the API. `evidence/runs/s09-scripts/empty-ranges.mjs` creates Gil **with**
a range and says so in its own header comment; `cmc-5-verify.md:118` records that Gil's
`active_ranges` rows were then deleted directly in the local disposable D1. The state is therefore
manufactured on purpose to exercise a defensive branch that production data cannot reach. That is
the right way to cover it, and §18.2 and §4's red sentence remain correct as defence rather than as
live behaviour.

### The amended compactness clause

Honest, and stricter than the clause it replaces for the quantity at issue. The old clause bounded
the **whole page** at five per cent, which mixes in sections this change does not touch; the
measurement came out at 6.70 per cent and the clause would have failed on a difference the calendar
did not cause. The new clause requires identity on the calendar's own figures and requires every
pixel of a whole-page difference to be attributable to a section bounded by skipped months,
schedules or prices, and never by months elapsed or receipts. `s09-compactness.md` supports it
arithmetically: `.calendar-blocks` `scrollHeight` 1114 on both fixtures, the Participants section
1335 on both, 72 gridcells on both, and the whole-page difference of 183 pixels accounted for
exactly by 80 for a second skipped month and 103 for a second standing order. Replacing a bound that
a passing implementation fails with one that names the real invariant is a plan fix, not a lowered
bar. The disposition records the measurement as taken rather than re-taking it to pass.

### Unit count movement

351 at `199247e`, 350 after `4753a52`, 354 at `05ff614`, and 354 is what this checkout runs. Nothing
was quietly dropped. `4753a52` replaced `resolveHighlight`'s five cases with `highlightFor`'s four:
the two that went were the record-lookup cases ("resolves a schedule id to its member", "is null for
an id no record claims") and they test behaviour the helper no longer has, because a total function
taking the member and the month has no id to fail to resolve. No live behaviour lost coverage.
`a671ca0` added two `futureYearPayments` cases and two `lifetimeUnpricedMonths` cases.

### Gates re-run in this checkout at `05ff614`

`npm run typecheck` clean across three projects. `npm run test:unit` 26 files and 354 cases passed.

### Observations

1. **Stale acceptance evidence, already tracked.** `evidence/runs/s09-browser-verification.md:214`
   still shows Gil's header reading "settled", and its mutation table still records no tint after a
   receipt delete. Both describe the pre-fix build; §18.2 and V3 changed them. This is not an
   unrecorded gap: `cmc-5-verify.md:128` requires a re-run of those checks before Progress row 5.2
   is ticked, and 5.2 is still `[ ]`. Recorded so the release does not ship an evidence file that
   contradicts the code. The same re-run has to re-take the compactness figures: `a671ca0`'s
   lifetime completeness sentence is drawn per participant, so it would appear on the deep fixture
   and not on the shallow one and break the identity the clause now requires. The verifier is
   already on it. `evidence/runs/s09-scripts/calendar-ledger.mjs` carries an uncommitted edit in the
   working tree that starts the SHORT fixture two months before its first price entry so both
   fixtures hold the same completeness state, leaving depth of history as the only variable. The
   reviewer did not write that edit and did not touch the file.
2. **Unverified by this review.** The pixel attribution in `s09-compactness.md` was read, not
   re-measured; no browser was driven for this delta. The §18 corrections are verified as code and
   by unit tests, and their visual acceptance is the designer's pass, not this review's.

### Design finding

**§18.1 names the year the reader is already on.** Because the fragments are now keyed to the
current year rather than the selected one, selecting a later year that holds a payment produces
"Showing Jan to Dec 2027. 2027 holds 1 payment." with a link to the year already displayed. The code
matches the ruling exactly, so this is the specification's to settle: either suppress the fragment
whose year equals the selected year, or accept the redundancy as the price of a stable sentence.
Cosmetic, on a year the reader reached deliberately, and not a release blocker either way.

## Delta review at 650a14d

Two code commits after the approval extended to `05ff614`: `eba7e43` (`loadFailure` in
`subscriptionEdits.ts` plus a "load ever succeeded" ref in `SubscriptionDetail.tsx`) and `83c010d`
(`REFRESH_FAILURE`, per the designer's §19). Reviewed `git diff 05ff614..HEAD -- src/` in full, plus
§19 and `context/checkpoints/cmc-5-verify.md`.

- **Verdict: APPROVED, extended to `650a14d`.** 0 critical, 0 warnings, 3 observations, 1 design
  finding. Nothing is required before release.

The shape of the change is right: the decision moved out of the catch block into a pure, total
function with an explicit four-way result, and the screen's catch is now a switch over it. That is
the same move the calendar made with `highlightFor`, and it is why five unit cases can pin behaviour
that previously lived only in a React handler.

### The 401 handoff

`loadFailure` (`subscriptionEdits.ts:126-137`) tests `signedOut` **first**, before the 409 branch and
before the keep-or-replace split, so no ordering of record state can swallow it. The screen still
derives it from `error instanceof SignedOutError` rather than from a status code, which is the
existing contract, and `onSignedOut()` returns without touching state
(`SubscriptionDetail.tsx:134-137`). `subscriptionEdits.test.ts:105-112` pins it with records both
absent and present. Every other new catch path in this change was checked in the original review and
is unchanged.

### The 409 no-owner path

Unchanged in behaviour and now ordered ahead of the keep-or-replace split, so a no-owner response
reaches the no-owner screen whether or not records are already shown
(`subscriptionEdits.ts:133`, pinned both ways at `subscriptionEdits.test.ts:139-148`). The message is
`error.message ?? connectionFailure`, and a 409 can only come from an `ApiError`, which always
carries a message, so the fallback cannot change what the no-owner screen says.

### All-or-nothing reload

Yes. The six reads are one `Promise.all` destructured into one object, and
`setState({ status: 'ready', data: … })` runs only after all six resolve
(`SubscriptionDetail.tsx:109-121`). A rejection skips the assignment entirely, so the `data` object
is only ever replaced wholesale by a complete server snapshot. There is no per-collection setter and
no merge, so a partial reload cannot mix collections from two fetches, and nothing is drawn
optimistically: what stays on screen after a failure is the last set the server actually returned.
`setRefreshError(null)` and `loaded.current = true` both sit on that same success path.

### The ref cannot strand the screen in the loading state

The `keep` branch returns without a `setState`, so it is safe only if `state.status` is already
`'ready'` whenever `loaded.current` is true. It is, and the reasoning is worth writing down because
it is not local to `load`.

- `load` begins with `setState((current) => current.status === 'ready' ? current : { status:
  'loading' })` (`SubscriptionDetail.tsx:111`), so a reload from a ready screen never collapses it.
- `'error'` is reached only through `replace`, which requires `hasRecords` false, so `'error'` and
  `loaded.current === true` cannot hold together.
- `'no-owner'` can follow a successful load, which would leave a non-ready status with the ref set.
  But nothing on that screen calls `load` again: its dismiss is `onBack`, and Try again is offered
  only in `'error'` (`SubscriptionDetail.tsx:341-343`). `load`'s own dependencies, `subscription.id`
  and `onSignedOut`, do not change while the screen is mounted.
- The ref is per-mount, and navigation is one step: reaching another subscription goes through
  `onBack`, which sets `selected` to null (`App.tsx:61`) and unmounts the screen. `onUpdated`
  re-sets the same subscription, so the id and `load`'s identity are unchanged.

So the failure the ref could cause, one subscription's records shown under another's name, is not
reachable. See observation 1: the invariant depends on facts outside this file.

### The inspector when a refresh fails mid-mutation

Consistent. The write and the reload are separate awaits: `run` awaits the mutation, then confirms
and calls `onChanged`, so a failing reload does not retract a write that succeeded. The records do
not change, so the projection, the cells and the open inspector all still render the last complete
snapshot, which is §9's "the previous records stay on screen; nothing is optimistically drawn". The
section keeps its true success sentence ("Payment recorded") while the header carries "Could not
refresh", and §19's wording is written precisely so the two do not contradict: it claims nothing
about the write. The inspector stays on the same person and month because `openInspector` is
untouched.

### Tests and gates

Five new cases (`subscriptionEdits.test.ts:100-148`) pin the signed-out handoff with and without
records, replace on a first-load failure for both a transport error and a server message, keep on a
refresh, the no-owner path both ways, and the sentence itself, including an assertion that it never
contains "save". Unit count 354 to 359, all accounted for. Re-run in this checkout at `650a14d`:
`npm run typecheck` clean across three projects, `npm run test:unit` 26 files and 359 cases passed.
`git diff 05ff614..HEAD -- src/server migrations wrangler.jsonc package.json package-lock.json` is
empty, so no server route, migration or dependency changed.

### Observations

1. **The ref's safety is a non-local invariant.** It holds today only because the detail screen is
   unmounted on every navigation and because no control re-triggers `load` from the `'error'` or
   `'no-owner'` screens. A router that swapped the subscription in place, or a Try again added to
   the no-owner screen, would make `keep` reachable from a non-ready status and strand the screen on
   the loading skeleton with no way forward. Worth a line in the component's comment, or resetting
   the ref in the effect keyed to `subscription.id`. Not a defect at HEAD.
2. **Overlapping loads are unguarded, as before.** Two in-flight reloads settle in completion order,
   so a failure that settles after a success can raise the alert over data that is in fact fresh.
   The error direction is the safe one: a false "may be out of date" warning, never a false
   reassurance, and `refreshError` is cleared by any later success. Pre-existing in shape and merely
   more visible now.
3. **The initial-load failure still borrows the save sentence.** `CONNECTION_FAILURE` is "Could not
   save. Check your connection and try again.", and `replace` uses it for a first load that fails on
   transport. §19 deliberately left the initial-load wording alone, so this is out of scope here and
   is recorded only so it is not mistaken for something this change introduced.

### Design finding

**§19's single sentence fits a transport failure and not a server refusal.** The `keep` branch
discards the server's own words for every non-409 status once records are on screen, so a refresh
that fails with a 403 or a 404, because the subscription was deleted or its ownership changed in
another session, tells the reader to check their connection. The test at
`subscriptionEdits.test.ts:127-135` pins that on purpose, so the code follows the ruling exactly and
the choice is the specification's. The header already models the gone case for writes, with an "All
subscriptions" action, so the refresh path is the less capable of the two. Worth a second sentence
for a refused refresh, or an explicit ruling that one sentence covers both. Not a release blocker:
the current sentence is honest about uncertainty and never claims the write failed.
