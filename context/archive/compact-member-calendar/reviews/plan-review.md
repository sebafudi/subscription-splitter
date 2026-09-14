<!-- PLAN-REVIEW-REPORT -->
# Plan review: Compact member calendar implementation plan

- **Plan**: `context/archive/compact-member-calendar/plan.md`
- **Mode**: Deep
- **Repository state**: the working tree as handed over, with `plan.md`, `design-spec.md` including its
  §13 rulings, `research.md` and `frame.md` on disk and no application code of this change written.
  `src/client/calendar/` does not exist, which is correct for a plan at step 2.3.
- **Verdict**: REVISE on the first pass; **SOUND** after re-verification of the resolved plan at
  commit `923de31`, recorded in `## Re-verification` at the end of this file
- **Findings**: 4 critical, 6 warnings, 1 observation, plus 5 design findings returned to the designer
- **Reviewer**: independent Opus; did not write the research, the frame, the design specification or
  the plan

Date and effort fields the report schema lists are omitted, matching this repository's convention of
recording progress by change id and commit. This review writes nothing outside this file, its
checkpoint at `context/checkpoints/cmc-2.3-plan-review.md`. It leaves `change.md` untouched: the
first pass could not move it because the verdict was REVISE, and the re-verification pass records
that it may now move to `plan_reviewed`, which is the status writer's action rather than this
reviewer's.

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | WARNING |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | WARNING |
| Plan Completeness | FAIL |

## Grounding

**Paths: 18/18 verified.** Every changed file the plan names exists at the path it names:
`src/client/screens/SubscriptionDetail.tsx`, `src/client/components/MemberList.tsx`,
`PaymentList.tsx`, `RecurringSection.tsx`, `sections.ts`, `src/client/index.css`, `src/client/api.ts`,
`src/domain/calc.ts`, `month-status.ts`, `recurring.ts`, `prices.ts`, `months.ts`,
`vitest.unit.config.ts`, `package.json`, `evidence/runs/release-5.md`,
`context/archive/subscription-management-and-date-inputs/plan.md`,
`context/archive/visual-redesign/design-spec.md`, `mockup/compact-calendar.html`. All twelve new
paths are correctly absent with their parent `src/client/` present; `src/client/calendar/` does not
yet exist.

**Symbols: 14/14 verified.** `chargedMonthStatus` (`src/domain/month-status.ts:67`),
`memberMonthStatus` (`:47`), the owner exclusion (`:55`), `shareForMember` (`src/domain/calc.ts:24`),
`recurringReceived` (`:41`), `balanceForMember` (`:66`), the owner filter (`:88`), the
most-owing-first sort (`:105`), `ownerShareThisMonth` (`:116`), `scheduleMonthStatuses`
(`src/domain/recurring.ts:72`), `isMonthInSchedule` (`:20`), `enumerateMonths`
(`src/domain/months.ts:18`), `REASON_PHRASE` (`src/client/components/RecurringSection.tsx:63-71`),
`Schedule = RecurringSchedule & { exceptionMonths }` (`src/client/api.ts:268`).

**Environment claims: verified.** `vitest.unit.config.ts:6` is `environment: 'node'` with include
`src/**/*.test.ts:7`; `package.json` carries no jsdom and no testing-library dependency and no
charting or virtualization dependency; `npm run test:unit`, `test:integration`, `typecheck` and
`build` all exist as the plan names them. No `.test.tsx` exists anywhere.

**Release precedent: verified.** The Phase 6 heading list matches `evidence/runs/release-5.md`
one for one: release candidate (`:12`), gate results captured verbatim (`:29`), hosted continuous
integration (`:70`), remote state before anything was written (`:90`) with the migration dry run
(`:92`), the deploy (`:123`), rollback (`:156`), live smoke (`:164`), what the release changes for
the certification package (`:271`), defects found (`:305`), what was not exercised (`:310`) and the
hand-off (`:324`). The rollback reference is exact: Worker version `751a8bfd-e62a-4c9a-beb2-1953eb6a7656`
(`release-5.md:142`, `:147`) at release SHA `91ce0da` (`:149`).

**`## Progress` mechanical contract: passes in full.** One `## Progress` heading, last section, after
`## References`. Six `### Phase N` subsections matching the six `## Phase N` headings word for word
and in order. `#### Automated` subsections only, 1-based indices unique within each phase, no
checkbox anywhere outside the section, no prose between phases, no estimates or owners. Measured
against `archive/toolkit/.ai/skills/10x-plan/references/progress-format.md`, which defines Progress
rows as *step titles* rather than success criteria, so the plan's decision to keep the pre-existing
step titles is correct rather than a contract breach.

**Date-free and scope hygiene: passes.** No calendar date, timestamp or duration estimate appears in
`plan.md` or `design-spec.md`; the only date-shaped strings are illustrative months inside example
copy. No server route, repository, validation module or migration is touched by any phase, which is
consistent with `research.md` §5's "Server gap: none found". No dependency is added, and both
candidate dependencies (charting, virtualization) are explicitly excluded in "Desired outcome and
non-goals".

**Design fidelity: verified where it holds.** §13 rulings 3 to 8 are all implemented. Ruling 3: the
plan never invents a status string and defers to the shipped set, which this review confirmed is
exactly `Payment recorded`, `Changes saved`, `Payment deleted`, `Standing order added`,
`Standing order deleted`, `Participant added`/`archived`/`unarchived`/`deleted`, `Marked not received`,
`Marked received` (eighteen `status.confirm` call sites across `src/client/`). Ruling 4: the
`role="row"` wrapper is in the `MonthStrip` contract. Ruling 5: one ARIA row of twelve with Left and
Right wrapping. Ruling 6: `futureYearPayments` returns one `{year, count}` per later year ascending.
Ruling 7: the Participants subtitle is an addition, and `sections.ts` confirms `PARTICIPANTS` carries
no subtitle today. Ruling 8: `PersonYear.recorded` is a receipt-date sum.

## What the plan gets right, recorded so it is not relitigated

- **The accounting is delegated, not restated.** The projection calls `chargedMonthStatus`,
  `memberMonthStatus`, `shareForMember`, `scheduleMonthStatuses`, `isMonthInSchedule` and
  `enumerateMonths` and writes no exclusion condition of its own. This reproduces the precedent the
  code already sets at `RecurringSection.tsx:258-269`, whose comment says the screen applies none of
  the six conditions itself. The precedence the plan states matches `month-status.ts:53-58` plus
  `:75` plus `recurring.ts:82-85` exactly, including that the exception is applied last and that a
  month already excluded is never relabelled `excepted`.
- **Recorded and assumed stay separate everywhere.** `MonthCell.manualReceipts` and `MonthCell.assumed`
  are distinct fields, `PersonYear.recorded` and `PersonYear.assumed` are distinct sums with the
  comment "Never added to" on each, the cell mark row draws two marks rather than one figure, the
  inspector has two headed groups, and the accessible-name rule forbids a combined total. This is the
  one constraint `frame.md` identifies as deciding whether the change is safe at all, and the plan
  honours it at every level.
- **Completeness comes from price coverage, not from a zero amount.** `MonthCell.priced` is
  `state.priceHistory.some(entry => entry.effectiveFrom <= month)`, with the reason stated: the
  amount cannot distinguish a break month from an unreached price, which `prices.ts:11` and `:13-21`
  confirm. Nothing derives "settled" from a zero.
- **Future-dated receipts stay reachable and stay counted.** `calendarYearRange` extends to the latest
  payment year, `futureYearPayments` links later years from the default year, and invariant 3
  explicitly sums receipts dated after `currentMonth`. This review checked the other end of the range
  too: the server refuses a payment dated before the subscription's first month (the route runs the
  domain's `validatePaymentDate` after `createPaymentSchema`, `src/server/routes/payments.ts:56` and `:94`),
  so no receipt can fall below `calendarYearRange.first` and vanish. Invariant 3 is therefore
  decidable over the projected years, not merely plausible.
- **Selection never writes.** `selection.ts` is `sessionStorage` only, the projection is declared pure
  and read-only, and opening an inspector calls no mutation. Every mutation still runs through the
  existing single `onChanged` reload at `SubscriptionDetail.tsx:105-113`, so no stale row can survive.
- **The empty-membership case is routed correctly.** The plan keeps it a unit-test case because
  `validateActiveRanges` refuses an empty set at the write path (`src/server/db/members.ts:30-32`),
  which matches `research.md` §6, and it carries `PersonYear.hasActiveRange` so the red sentence of
  §4 is driven by a real flag rather than by a zero.
- **The inner-panel Escape claim is true.** Both `DisclosurePanel.tsx:39-42` and
  `ConfirmStrip.tsx:38-41` call `stopPropagation()` before their own handler, so an Escape inside a
  nested form or confirm strip genuinely cannot reach the inspector. The plan's "needs no new code"
  is correct for the *inner* case. It is not correct for the outer case; see F3.
- **The frame's reframing is carried through.** Phase 4 folds `PaymentList` and `RecurringSection`
  into the change rather than decorating `MemberList` alone, which is the single point `frame.md`
  says decides whether the screen actually gets shorter.
- **The 67-row destination table is complete.** Every row number 1 through 67 appears exactly once
  across the table's grouped ranges, and each group names a planned component. Spot-checked against
  `research.md` §3: rows 9, 16, 27, 31, 33, 38, 52, 53, 55, 60, 61, 65 all reach a destination that
  preserves the field or the action, including the archived disclosure rendering full person blocks
  and the `aria-disabled`-not-`disabled` house rule at `PaymentList.tsx:163-169`.

## Findings

### F1 - The Participants heading still carries a count, which §13.1 withdrew

- **Severity**: ❌ CRITICAL
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: End-State Alignment
- **Location**: `plan.md:239`, the `MemberCalendar` component contract
- **Detail**: The plan says `MemberCalendar` "Renders `SectionHeader` with `count`, `subtitle`,
  `StatusLine` and the Add participant primary". `design-spec.md` §13.1 rules that the heading carries
  **no count**, and §2 item 4 says "`h2` without a count". The shipped code agrees and says why:
  `MemberList.tsx:29-33` states the heading carries no count because the API's active count includes
  the organizer, and `SectionHeader.tsx:11-15` documents `count` as "Omitted where a count could not
  agree with the rows beneath it". The mockup at `mockup/compact-calendar.html:111` renders
  `<h2 class="t-section">Participants</h2>` with no count, so the plan is now the only artifact
  carrying it. An implementer following `plan.md:239` literally would pass `count` and ship a number
  the designer withdrew and the code deliberately refuses.
- **Fix**: Strike `count` from the `MemberCalendar` `SectionHeader` list at `plan.md:239` and state
  that the `count` prop is deliberately omitted, citing §13.1 and `MemberList.tsx:29-33`.
- **Decision**: PENDING

### F2 - The owner block survives in two places, and §13.2 withdrew it

- **Severity**: ❌ CRITICAL
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: End-State Alignment
- **Location**: `plan.md:241` (render order) and `plan.md:264-269` (the `PersonBlock` owner contract)
- **Detail**: `plan.md:241` renders "one `PersonBlock` per listed participant, **then the owner
  block**", and `plan.md:264-269` specifies that block in detail: `personYear` null, the owner
  sentence in place of the strip, Owed and Paid at zero, balance "settled", This month from
  `summary.ownerShareThisMonth`. `design-spec.md` §13.2 rules "**No owner block.** Withdrawn from §4
  and the mockup", and §4's Owner bullet now reads "no block ... The mockup's owner row is withdrawn".
  This review confirmed the mockup carries no owner row: the only other match for "owner" or "you" in
  `mockup/compact-calendar.html` is the settled-archived disclosure at `:206`. The plan's own premise
  for the block is also gone: it rests on assumption 2 of `cmc-2.2-plan.md`, which §13.2 overruled,
  and that assumption's stated evidence ("the mockup shows an Edit button on the owner block") is no
  longer true of the file. Leaving it in ships a participant row for a person `computeSummary`
  deliberately excludes (`calc.ts:88`), which is the exact invention §13.2 refuses.
- **Fix**: Remove "then the owner block" from `plan.md:241` and delete the owner paragraph at
  `plan.md:264-269` in full, replacing it with one sentence recording that §13.2 withdrew the block
  and that the owner's share stays in the summary figures above the sections
  (`SubscriptionDetail.tsx:373-404`, matrix row 67). Drop `summary.ownerShareThisMonth` from the
  `PersonBlock` contract; it has no other consumer in the calendar.
- **Decision**: PENDING

### F3 - The inspector is specified as the existing `DisclosurePanel`, which steals focus and owns an untargetable heading

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: Plan Completeness
- **Location**: `plan.md:304` and `plan.md:306`; the planned-files tables at `plan.md:78-109`
- **Detail**: `plan.md:304` says `MonthInspector` "Renders inside the existing `DisclosurePanel`
  motion", and `design-spec.md` §6 says it opens "as a disclosure panel with the existing open/close
  animation". Two properties of the shipped component defeat the contract built on top of it:
  1. **It focuses on open.** `DisclosurePanel.tsx:31-37` runs an effect on `open` that selects the
     first `input, select, textarea, button` in the panel and focuses it. `design-spec.md` §8 requires
     "Focus stays on the cell on open", and `plan.md:285` repeats it. With the shipped component, the
     first control is the `.btn-quiet` Close, so pressing Enter on a cell would move focus off the
     strip and break the roving-tabindex contract on the very first keystroke.
  2. **It renders its own heading.** `DisclosurePanel.tsx:54` emits `<h3>{title}</h3>` with no `id`
     and no `tabIndex`. `plan.md:306` requires an `h3` with `tabIndex={-1}` and id
     `inspector-heading-<memberId>-<month>`, because that heading is the focus target after a receipt
     delete and after a schedule delete (four rows of the §8 focus table). The shipped heading cannot
     be focused and cannot be addressed by `document.getElementById`, which is the only focus
     mechanism the section has (`MemberList.tsx:61-65`, the pattern the plan adopts).

  Neither planned-files table lists `src/client/components/ui/DisclosurePanel.tsx`, and the
  single-owner rule at `plan.md:111-114` names only `index.css`, `sections.ts` and
  `SubscriptionDetail.tsx`. So the plan requires a change to a shared primitive that it does not
  plan, does not assign an owner, and does not scope. That primitive is used by every form on every
  screen, so an unscoped edit to it is the largest blast-radius change in the plan and currently the
  least specified.
- **Fix A ⭐ Recommended**: Give `MonthInspector` its own panel markup and reuse only the CSS. The
  inspector reproduces the `.disclosure` / `.disclosure-inner` / `.panel` structure and the
  `data-open` attribute so it inherits the `grid-template-rows` 0fr→1fr motion and the reduced-motion
  zeroing verbatim, renders its own `h3` with the required `id` and `tabIndex={-1}`, handles Escape
  itself, and runs **no** focus-on-open effect. No shared file changes; the motion contract of §6 is
  still met because it is a CSS contract.
  - Strength: keeps `DisclosurePanel` untouched, so the seven existing forms cannot regress; the
    inspector's focus and heading requirements are both natural rather than bolted on.
  - Trade-off: a second copy of the eight-line panel wrapper, and the CSS classes become a contract
    two components depend on.
  - Confidence: HIGH - the motion lives entirely in `index.css` under `.disclosure`, and the plan
    already gives `index.css` a single Sonnet owner in step 4.1, so the classes can be pinned there.
  - Blind spot: whether `inert` on the closed wrapper is wanted per person block, given twelve
    potential inspectors. Worth stating explicitly.
- **Fix B**: Extend `DisclosurePanel` with two optional props, `autoFocus` (default true) and
  `headingId`/`headingTabIndex`, add it to the changed-files table with an explicit owner, and state
  that every existing call site keeps today's behaviour by omission.
  - Strength: one panel implementation; the motion and Escape behaviour provably cannot diverge.
  - Trade-off: edits a primitive seven shipped forms depend on, inside a change whose non-goals
    include "no unrelated redesign"; needs its own regression check across all seven.
  - Confidence: MED - the edit is small, but nothing in the repository tests `DisclosurePanel`, so the
    regression evidence would have to be browser work in Phase 5.
  - Blind spot: `aria-controls` pairing from a `gridcell` button was not checked against the panel's
    `id` contract.
- **Decision**: PENDING

### F4 - Month cells have no identity and no active-cell state, so four §8 focus rules cannot be implemented

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: Plan Completeness
- **Location**: `plan.md:276-286` (`MonthStrip`), `plan.md:250-251` (the ids `MemberCalendar` owns),
  `plan.md:262` (the ids `PersonBlock` owns), and the focus table at `plan.md:345-359`
- **Detail**: Every focus target in the plan is an element id driven through the shipped
  `setFocusTarget` → `document.getElementById(id).focus()` pattern (`MemberList.tsx:61-65`,
  `PaymentList.tsx:86-90`). The plan enumerates the ids each component owns:
  `participant-add-button` and the heading id for `MemberCalendar` (`plan.md:250-251`),
  `participant-edit-<id>` and `participant-delete-<id>` for `PersonBlock` (`plan.md:262`),
  `payment-edit-<id>` / `payment-delete-<id>` and the inspector heading for `MonthInspector`. **No id
  is defined for a month cell.** Four rules in the §8 table require focusing one:
  "Up and Down across blocks" (`MemberCalendar` moves focus to a cell in another block),
  "Escape in the inspector returns to its cell", "Inspector close goes to its cell", and the
  fallback "or the Participants heading if the cell is gone", which presupposes the section can ask
  whether that cell exists.

  Separately, the roving tabindex is specified as a **derived** value: "exactly one cell carries
  `tabIndex={0}`, chosen as the selected cell when this person's inspector is open, else the current
  month when it falls in the visible year, else January" (`plan.md:280-283`). It has no dependence on
  where focus actually is. So after Left/Right/Home/End move focus inside a strip without opening an
  inspector, the strip's single tab stop is still January or the current month, not the focused cell:
  tabbing away and back returns the user to January, which is the failure mode roving tabindex
  exists to prevent, and which §8's "**one** tab stop for the strip" implies but does not by itself
  supply. The same gap makes "Up and Down across blocks" ambiguous: after the section moves focus to
  the next block's cell, nothing updates that block's tab stop.
- **Fix**: Add to the `MonthStrip` contract (a) a cell id scheme, `calendar-cell-<memberId>-<month>`,
  owned by `MonthStrip` and listed alongside the other id owners, so `MemberCalendar` and
  `MonthInspector` can target a cell through the existing `focusTarget` effect and can test for its
  existence before falling back to the heading; and (b) a per-strip `activeMonth` state, initialised
  to the derived value the plan already states and updated on cell focus and on every arrow, Home and
  End key, with `tabIndex={0}` on the active cell only. State that `onLeaveVertically` hands the
  target month to `MemberCalendar`, which sets the next block's `activeMonth` and then focuses the
  corresponding cell id. Also reconcile the two names for one callback: `PersonBlock` declares
  `onFocusMove(direction, month)` at `plan.md:259` while `MonthStrip` declares
  `onLeaveVertically(direction, monthIndex)` at `plan.md:276`, and the two disagree on whether the
  payload is a month or an index.
- **Decision**: PENDING

### F5 - One `highlightedId` cannot tint both the block and the changed cell

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: Blind Spots
- **Location**: `plan.md:270-271` and the Phase 4 mutation paragraph; `design-spec.md` §4 and §6
- **Detail**: `plan.md:270-271` says the changed-balance tint is "the existing `entry-highlight`
  treatment driven by `useSectionStatus().highlightedId`", and `design-spec.md` §6 says a save
  "tints the changed cell **and** the block". `useSectionStatus` holds exactly one
  `highlightedId` per section (`useSectionStatus.ts:5-10`, `:36-43`), and every shipped call site
  sets it to the id of the record that changed: `status.confirm('Payment recorded', saved.id)`
  (`PaymentList.tsx:202`), `status.confirm('Changes saved', saved.id)` (`:234`). A payment id cannot
  simultaneously identify the person block whose balance moved. As written, an implementer gets one
  tint or the other and will pick whichever is easier, silently dropping a §4 requirement. The same
  single slot is also asked to carry the moved-receipt tint when an edit relocates a receipt to
  another cell (`plan.md:435-437`, spec §6).
- **Fix**: State in the `MemberCalendar` contract that the section derives **both** targets from one
  confirmation: keep `highlightedId` as the changed record's id, and have `MemberCalendar` resolve it
  to the owning `memberId` and the owning `MonthStr` through the reloaded records, tinting the block
  whose member owns that record and the cell whose month contains it. Say explicitly that no second
  status hook is introduced and no new status string is added, so §9 and ruling 3 still hold.
- **Decision**: PENDING

### F6 - The projection section carries two clauses that cannot be executed as written

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: Plan Completeness
- **Location**: `plan.md:199-202` (cost control) and `plan.md:217-218` (invariant 6)
- **Detail**: Two clauses:
  1. **The status index has nowhere to live.** `plan.md:199-202` says `scheduleMonthStatuses` is
     called "once per schedule per load, not once per cell", and that "the results are indexed by
     month inside `buildSubscriptionState`'s caller and reused for every selected year". But
     `buildSubscriptionState` returns a plain `SubscriptionState` (`plan.md:127`), which has no field
     for such an index, and the two projection entry points take only
     `(state, member, year, current)` (`plan.md:172-178`). There is no parameter, return field or
     module-level cache in the stated interface through which a precomputed index could be passed or
     reused, so an implementer following the signatures must call `scheduleMonthStatuses` inside
     `projectPersonYear`, which is once per schedule per person per projection rather than once per
     load. The cost is acceptable either way at six people and eight years, but the plan asserts a
     property its own interface cannot express, and the assertion is the kind that gets "fixed" by
     inventing a cache nobody planned.
  2. **Invariant 6 is not a decidable assertion.** `plan.md:217-218` reads "No exported field ever
     carries `recorded + assumed`; asserted by construction over a fixture where a manual and an
     assumed receipt fall in the same month." "By construction" is a property of the type, not a test
     a runner can fail. `research.md` §4 invariant 6 states the same rule, and the other six
     invariants are all stated as equalities against `computeSummary` or `balanceForMember` and are
     genuinely decidable; this one is not, and it is the invariant guarding the single constraint
     `frame.md` calls load-bearing.
- **Fix**: For (1), either add the index to the projection interface explicitly (for example a
  `CalendarIndex` value returned by a `buildCalendarIndex(state, current)` and taken by
  `projectPersonYear`), or delete the reuse claim and state plainly that `scheduleMonthStatuses` is
  called per projection, with the enumerated-month count as the stated cost. For (2), replace "by
  construction" with concrete assertions on a fixture whose month holds a manual receipt and a
  counted assumed receipt of different amounts: assert `cell.manualReceipts` sums to the manual
  amount alone, `cell.assumed.amount` equals the rate alone, `personYear.recorded` and
  `personYear.assumed` each differ from their sum, and no cell field equals that sum.
- **Decision**: PENDING

### F7 - Phase 5's element-count acceptance criterion contradicts its own scrollHeight criterion and cannot pass

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: `plan.md:519-522`
- **Detail**: The acceptance reads "the gridcell count is identical for both fixtures; **the
  Participants section's element count is identical for both fixtures**; the whole page's
  `scrollHeight` differs between them by under five per cent, **the remaining difference being the
  year select's option count and the range sentence**". The year control and legend sit inside the
  Participants section (`design-spec.md` §2 item 4, §3, and `plan.md:240`), and §3 puts one `option`
  per year from the plan's start year to the latest year holding a record. The long fixture has eight
  years, the short one has one. So the Participants section's element count differs by roughly seven
  `option` elements plus the range sentence's future-year fragments, by the plan's own admission two
  clauses later. The criterion as written fails on a correct implementation, and the likely outcome
  is that it is quietly restated at measurement time rather than before.
- **Fix**: Restate the middle criterion as a bound rather than an identity: the Participants
  section's element count differs between the two fixtures by no more than the number of extra
  `option` elements plus the range sentence's fragment count, and the count of elements inside the
  person blocks, `main.page [role="grid"] *`, is identical. That keeps the measurement decidable and
  still pins the property the change exists to prove.
- **Decision**: PENDING

### F8 - Two leaf contracts cannot be met by their named owner or in their named environment

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Architectural Fitness
- **Location**: `plan.md:335-337` and `plan.md:107`; `plan.md:92` and `plan.md:341-344`
- **Detail**: Two:
  1. **`REASON_PHRASE` is moved across an ownership boundary with no deletion instruction.**
     `plan.md:335-337` says `cellText.ts`'s `exclusionPhrase` "is the existing `REASON_PHRASE` map
     moved out of `RecurringSection.tsx:63-71` unchanged, so the phrases stay one copy". `cellText.ts`
     is Opus and written in Phase 3; `RecurringSection.tsx` is Sonnet and written in step 4.1, and
     its stated change is only "Remove the per-month tile list and the tile toggle" (`plan.md:107`).
     Nothing instructs Sonnet to delete the map or to import the moved one. Between Phase 3 and step
     4.1 the map is duplicated, and if the Sonnet instruction is followed literally it stays
     duplicated, which is exactly the drift the sentence claims to prevent. The map is the only
     source of the seven exclusion phrases the cell sentence and the inspector both render.
  2. **`selection.test.ts` runs where `sessionStorage` does not exist.** `plan.md:92` promises "Unit
     tests for restore, reject and default" and `plan.md:341-344` puts `readSelection` and
     `writeSelection` over `sessionStorage`. The unit suite is `environment: 'node'`
     (`vitest.unit.config.ts:6`) with no jsdom and no web-storage dependency in `package.json`, and
     Node does not expose `sessionStorage` without an explicit flag. `readSelection` is therefore
     only testable on its guarded-failure branch; `resolveSelection`, being pure, is fully testable.
     The plan does not say which of the three named tests target which function, so the promise reads
     as coverage the environment cannot give.
- **Fix**: For (1), add to `plan.md:107` that `RecurringSection.tsx` deletes `REASON_PHRASE` and
  imports `exclusionPhrase` from `src/client/calendar/cellText.ts`, and make it a step 4.1 success
  criterion that `grep -n "REASON_PHRASE" src/client/` returns one definition. For (2), state that
  `selection.test.ts` covers `resolveSelection` for restore, reject and default, and covers
  `readSelection` and `writeSelection` only for the absent-and-throwing storage branches, with any
  round-trip case using an injected storage object rather than a global.
- **Decision**: PENDING

### F9 - The plan still points implementers at the superseded 2.2 assumptions

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: End-State Alignment
- **Location**: `plan.md:9-11`, `plan.md:279`, `plan.md:582-584`
- **Detail**: Three sentences treat the eight questions in `cmc-2.2-plan.md` as still open and treat
  the plan's assumptions as the standing resolution. `plan.md:9-11` tells the reader that where the
  specification is silent the point "is recorded in `cmc-2.2-plan.md` ... and the plan continues with
  a stated assumption"; `plan.md:582-584` says "Eight points where `design-spec.md` is silent or
  disagrees ... each with the assumption this plan proceeds on. None blocks planning"; `plan.md:279`
  says the `role="row"` wrapper is added, "see the designer question recorded on this point".
  `design-spec.md` §13 answers all eight and states "The plan follows these, not its earlier
  assumptions where they differ". Two of those assumptions were overruled (F1 and F2 above), and the
  checkpoint's evidence for assumption 2 is now stale against the mockup file. An implementer reading
  the plan alone is pointed at the wrong authority.
- **Fix**: Replace the three sentences with a single statement that `design-spec.md` §13 is the
  standing resolution of all eight questions, that the checkpoint's assumptions are superseded where
  they differ, and that §13.4 is the authority for the `role="row"` wrapper. Once F1 and F2 land,
  nothing in the plan depends on a superseded assumption.
- **Decision**: PENDING

### F10 - Phases carry no verification headings, and Phase 6 carries no success criteria at all

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: `plan.md:455`, `:481`, `:497-540`, `:541-577`; Progress rows 4.3, 5.2, 5.4 and 6.1 to 6.4
- **Detail**: Phases 3 and 4 head their criteria "Success criteria, automated:" as plain text;
  Phase 5 states gates and measurements in prose with no criteria block; Phase 6 states no success
  criteria of any kind. The house precedent this plan names as its format source uses
  `#### Automated verification:` and `#### Manual verification:` headings
  (`context/archive/subscription-management-and-date-inputs/plan.md:471`, `:484`), and the previous
  plan review in this repository recorded that wording as the settled convention. More substantively,
  seven Progress rows have nothing to check against: 4.3 "Verify mutation refresh and selection
  behavior", 5.2 "Verify compactness, responsive layouts and accessibility in the browser", 5.4
  "Obtain Fable visual acceptance", and all four Phase 6 rows. The `## Progress` contract itself is
  clean, so nothing is unparseable; what is missing is the evidence an implementer needs before
  flipping those boxes. Phase 6 is the phase that deploys, so it is the worst one to leave without a
  stated gate.
- **Fix**: Head each phase's criteria `#### Automated verification:` and `#### Manual verification:`,
  and add criteria for the seven uncovered rows. For Phase 6 the criteria are already implied by the
  prose and by `evidence/runs/release-5.md`: gate output captured verbatim from a throwaway clone,
  the hosted run id recorded, the pre-deploy Worker version recorded as the restore point, the new
  Worker version recorded, the live smoke read-only on real records, and
  `evidence/runs/release-6.md` written with the twelve headings the plan already lists.
- **Decision**: PENDING

### F11 - Small contract inconsistencies in the projection interface and the lifecycle status

- **Severity**: 📋 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: `plan.md:117-124`, `plan.md:141`, `plan.md:126`; `change.md` frontmatter
- **Detail**: Three minor points, none blocking. (a) `plan.md:126` says the interface imports
  "`MonthStatus`, `MonthExclusion`, `Member`, `Payment`, `Minor`, `MonthStr` and `SubscriptionState`
  ... from `src/domain`; nothing is redeclared", but `LoadedRecords` also uses `Subscription`,
  `PriceEntry` and `Schedule`, of which `Subscription` and `Schedule` are client types from
  `src/client/api.ts:5-14` and `:268`, not domain types. (b) `LoadedRecords.schedules` is
  `Schedule[]` (which carries `exceptionMonths`) while `MonthCell.schedule` is
  `RecurringSchedule | null`, which drops them; the inspector's toggle state comes from
  `assumedStatus.reason` so nothing breaks, but the narrowing should be deliberate and said so. (c)
  `change.md` stands at `status: planned` while the Progress section holds five `[x]` rows, which
  trips the documented drift warning in `progress-format.md` ("status `planned` with any `[x]` →
  status should be `implementing`"). The rows are planning steps rather than implementation, so the
  status is substantively right; a one-line note in `change.md` would stop `/10x-status` reporting it
  as drift.
- **Fix**: Correct the import provenance sentence, state the `RecurringSchedule` narrowing and its
  reason, and add the drift note to `change.md` when its status next moves.
- **Decision**: PENDING

## Design findings

Returned to the designer rather than resolved here. Each is a point in `design-spec.md` that an
implementer cannot settle alone.

1. **§6's "existing open/close animation" names a component that focuses itself on open.** §6 calls
   the inspector "a disclosure panel with the existing open/close animation" while §8 requires focus
   to stay on the cell. The shipped `DisclosurePanel` focuses its first control on open
   (`DisclosurePanel.tsx:31-37`) and renders its own `h3` with no id and no `tabIndex`
   (`:54`), which §8 also needs as a focus target. Confirm the intent is the *motion*, reproduced by
   new markup that does not move focus, rather than the component. See F3.
2. **§5 does not say whether the `×N` count spends one of the three mark slots.** The marks table
   lists `recorded count` as a row of its own, drawn as text `×N` after the disc, and the paragraph
   above says "**At most three marks show**: receipt marks first, then the state mark." A month with
   two recorded receipts, a counted assumed receipt and an `unpriced` charge needs disc, `×2`, dashed
   circle and `?` in one 12px row. State whether `×N` counts toward the three, and what is dropped
   when it does not fit.
3. **§5's `unpriced` mark and the domain's `unpriced` are defined differently.** The table glosses it
   "no price entry reaches this month", while `chargedMonthStatus` returns `unpriced` whenever
   `priceForMonth` is zero (`month-status.ts:75`). Today they coincide, because the API refuses a
   non-positive price (`src/server/validation/prices.ts:20-24`), so nothing is at risk now. Confirm
   which is the mark's source of truth, since the plan carries both a `priced` flag and
   `chargeStatus.reason` and the year cells' "N months without a price" fragment reads from one of
   them.
4. **§3 puts the year control and legend inside the Participants section, which is the section the
   plan measures for compactness.** The select's `option` count grows with the number of years in the
   range, so the section's element count is not constant across ledger lengths even when the person
   blocks are. Confirm the placement is intended (it reads as correct, since §9 hides both when there
   are no participants); the measurement wording is a plan fix, recorded as F7.
5. **§5's mark precedence still lists `owner-member`, which §13.2 made unreachable.** With the owner
   block withdrawn, no cell can ever belong to the owner, so `owner-member` cannot reach a cell and
   its phrase ("the owner is never paid from", `RecurringSection.tsx:69`) cannot render. Harmless, but
   the list reads as though a case exists. One clause would close it.

## Re-verification checklist

Before `change.md` moves to `plan_reviewed` and Phase 3 begins, confirm each of the following against
the edited `plan.md`:

1. `grep -n "count" plan.md` shows no `SectionHeader` `count` prop for the Participants section, and
   the contract states the omission with its reason (F1).
2. `grep -n -i "owner block" plan.md` returns nothing, `summary.ownerShareThisMonth` no longer appears
   in the `PersonBlock` contract, and the render order at `plan.md:241` runs person blocks →
   settled-archived disclosure → empty state with no owner step (F2).
3. The `MonthInspector` contract names the panel implementation it uses, states that no focus-on-open
   effect runs, and either adds `DisclosurePanel.tsx` to the changed-files table with an owner or
   states that no shared primitive is touched (F3).
4. The `MonthStrip` contract defines a cell id scheme, defines per-strip active-cell state updated on
   focus and on every arrow, Home and End key, and uses one name and one payload for the
   leave-vertically callback across `PersonBlock` and `MonthStrip`. All thirteen §8 rules in the focus
   table resolve to a named id or a named state (F4).
5. The `MemberCalendar` contract states how one `highlightedId` yields both the block tint and the
   cell tint, and confirms no new status hook and no new status string (F5).
6. The projection interface either exposes the reusable status index or the reuse claim is gone, and
   invariant 6 is stated as assertions on named fixture values rather than "by construction" (F6).
7. The Phase 5 element-count criterion is a stated bound with the grid-scoped identity beside it, and
   is consistent with the scrollHeight clause two lines below (F7).
8. `RecurringSection.tsx`'s change line includes deleting `REASON_PHRASE` and importing
   `exclusionPhrase`, with a one-definition grep as a step 4.1 criterion; `selection.test.ts`'s three
   cases are assigned to `resolveSelection` and the storage guards (F8).
9. `plan.md:9-11`, `:279` and `:582-584` name `design-spec.md` §13 as the standing resolution, and no
   sentence in the plan still defers to an assumption §13 overruled (F9).
10. Every phase heads its criteria `#### Automated verification:` / `#### Manual verification:`, and
    Progress rows 4.3, 5.2, 5.4, 6.1, 6.2, 6.3 and 6.4 each have at least one criterion (F10).
11. The `## Progress` contract still passes after the edits: one heading at the bottom after
    `## References`, six phase subsections matching the six phase headings word for word, indices
    unique and unrenumbered, no checkbox outside the section, step titles unchanged.
12. The plan is still date-free, still adds no dependency, still changes no server route, and still
    plans exactly one new token, `--hatch`.
13. Design findings 1 to 5 have a designer ruling recorded, or an explicit note that the
    implementation may proceed without one and why.

## Re-verification

Run by the same independent reviewer against `plan.md` at commit `923de31`, with `design-spec.md`
§13 and the new §14 as the standing design authority and `context/checkpoints/cmc-2.3-resolve.md` as
the resolver's record. Every item below was checked against the plan's actual text and, where it
makes a claim about the code, against the cited source read back from the file.

- **Verdict: SOUND.** All four critical findings are genuinely closed, all six warnings and the
  observation carry a disposition that holds, and all five designer rulings are applied rather than
  reinterpreted. Nothing blocks Phase 3.

### Item-by-item result

1. **No heading count — PASS.** `plan.md:269` renders `SectionHeader` with `subtitle`, `StatusLine`
   and the primary only, and `:273-276` states the omission with §13.1, `MemberList.tsx:29-33` and
   `SectionHeader.tsx:11-15` as the reason. `grep -n "\`count\`"` over the plan returns only that
   deliberate-omission paragraph and the resolution row. (F1 closed)
2. **No owner block anywhere — PASS.** `plan.md:278-282` renders the person-blocks container with no
   owner step and states the withdrawal with §13.2 and `calc.ts:88`; the `PersonBlock` contract at
   `:313-316` says every block is a participant's, `personYear` is never null for a rendered block,
   and no owner sentence, owner figure or `summary.ownerShareThisMonth` appears. `grep -i` for
   "owner block", "ownerShareThisMonth" and "owner sentence" returns only withdrawal statements. The
   67-row destination table was re-counted: rows 1 to 67 each appear exactly once, 67 distinct, and
   row 67 keeps the owner's share in `SubscriptionDetail`, which is where the shipped code puts it.
   (F2 closed)
3. **Inspector is new markup with a focusable heading — PASS.** `plan.md:378-391` states that the
   inspector reproduces `.disclosure` / `.disclosure-inner` / `.panel` and `data-open` for the
   motion, runs no focus-on-open effect, renders its own `h3` with an id and `tabIndex={-1}`, handles
   Escape itself, and carries `inert` on the closed wrapper. `DisclosurePanel.tsx` appears in neither
   planned-files table; `plan.md:113-116` says no shared UI primitive is modified and names that file;
   a Phase 4 criterion pins it with an empty `git diff --stat`. The CSS the plan relies on was read
   back: the `.disclosure` rules and their `data-open` branch are at `index.css:705-719`, the motion
   tokens at `:109-111`, the reduced-motion zeroing at `:504-505`. The inner-panel Escape claim still
   holds at `DisclosurePanel.tsx:39-42` and `ConfirmStrip.tsx:38-41`. §6 and §14.1 now say the same
   thing from the design side. (F3 closed, Fix A, matching designer ruling §14.1)
4. **Cell ids and per-strip active-cell state across all fourteen rules — PASS.**
   `plan.md:330-335` defines `calendar-cell-<memberId>-<month>`, owned by `MonthStrip`, reached
   through the shipped `setFocusTarget` → `getElementById` pattern and tested for before falling back
   to the heading. `:336-347` defines `activeMonth`, lifted to `PersonBlock`, initialised to the
   derived value the specification states and **updated on every cell focus and on every Left, Right,
   Home and End key**, with `tabIndex={0}` on that cell alone; the tab-away-and-back property is
   stated explicitly. Up and Down set the receiving block's `activeMonth` before focusing its cell,
   so tab stop and focus agree. The callback is one name and one `MonthStr` payload across
   `MonthStrip`, `PersonBlock` and `MemberCalendar`. The focus table at `:453-468` now carries a
   Target column and fourteen rows, each resolving to a named id or a named piece of state, closed by
   an explicit id-owner list. (F4 closed)
5. **F5 one `highlightedId`, two tints — PASS.** `plan.md:290-297` states the resolution against the
   reloaded records, tinting block and cell from one confirmation, with no second status hook and no
   new status string; `PersonBlock:320-322` takes `highlighted` and never reads the hook; matrix row
   21 matches. Verified against `useSectionStatus.ts:5-10`, `:36-43` and the call sites at
   `PaymentList.tsx:202`, `:234`.
6. **F6 projection contract — PASS.** The cost-control paragraph at `plan.md:219-225` now says
   `scheduleMonthStatuses` runs once per schedule per projection with no cross-call index and no
   cache, states the cost in enumerations, and keeps only the existing memoization on records plus
   year. Invariant 6 at `:235-247` is four named assertions plus a sweep over every numeric field,
   which is runnable rather than a property of the type.
7. **F7 compactness measurement — PASS.** Seven figures are listed at `plan.md:645-651`, including
   `.calendar-blocks` scrollHeight and element count and `#year-select option` count. The identity is
   now on the person blocks, the section's own count is an explicit bound of extra options plus
   range-sentence fragments, and the page `scrollHeight` clause reads consistently with it. Applies
   §14.4 rather than re-deciding it. `YearControl` gives the select the `year-select` id at `:301`.
8. **F8 two leaf contracts — PASS.** `RecurringSection.tsx`'s change line at `plan.md:107` now
   deletes `REASON_PHRASE` and imports `exclusionPhrase`, with a one-definition grep as a Phase 4
   criterion; `cellText.ts` records that the duplication exists only between Phase 3 and step 4.1.
   `selection.ts` gains an injectable storage argument and `:441-448` assigns restore, reject and
   default to `resolveSelection`, the guards and one injected round trip to the read and write
   functions, and states that no test touches a global. Consistent with `vitest.unit.config.ts:6`.
9. **F9 superseded assumptions — PASS.** The Overview at `plan.md:10-14` and the execution rules at
   `:769-772` name §13 and §14 as the standing authority and the 2.2 assumptions as superseded,
   naming the two that were overruled. The `MonthStrip` `role="row"` sentence at `:328-329` cites
   §13.4 instead of an open question. No sentence in the plan now defers to a checkpoint assumption.
10. **F10 verification headings and uncovered rows — PASS.** Phases 1 and 3 to 6 head their criteria
    `#### Automated verification:` / `#### Manual verification:`, matching the house precedent.
    Every Progress row now has at least one criterion naming it, including 4.3, 5.2, 5.3, 5.4 and
    6.1 to 6.4; Phase 6's follow `evidence/runs/release-5.md`, and the rollback reference is
    unchanged and still exact.
11. **`## Progress` contract — PASS.** One `## Progress` heading, last, after `## References`. Zero
    checkboxes before it. Nineteen rows, five ticked, indices and titles unchanged and none
    reticked. Six `### Phase N` subsections matching the six `## Phase N` headings word for word and
    in order, `#### Automated` the only heading inside.
12. **Date-free, no dependency, no server change, one token — PASS.** No calendar date or timestamp;
    the only new date-shaped string is the illustrative `MonthStr` `2026-03` in the cell id scheme.
    The only em dashes are the Progress commit-sha separators the format reference mandates. No
    dependency is added and both candidate dependencies stay excluded. `src/server` appears nowhere
    as a changed path. Exactly one new token, `--hatch`.
13. **Design findings ruled — PASS.** All five carry a designer ruling in `design-spec.md` §14, and
    each is applied rather than re-decided: §14.1 in the `MonthInspector` panel paragraph, §14.2 in
    the `MonthStrip` per-cell bullet and matrix row 31, §14.3 by the deletion of `MonthCell.priced`,
    §14.4 in the Phase 5 acceptance, §14.5 in `cellText.ts`. The specification itself was amended in
    §5, §6 and §8 to match, so plan and specification no longer disagree.

### The `priced` flag, checked specifically

`MonthCell.priced` is gone from the projection interface. Completeness is
`chargeStatus.reason === 'unpriced'` in all three places that render it: the `?` mark, the
inspector's charge sentence and `PersonYear.unpricedMonths` (`plan.md:163-169`, `:185`, `:213-216`),
with a Phase 3 grep criterion pinning that no flag returns. The plan's justification was checked
against the domain and holds: `chargedMonthStatus` asks the price question only after every wider
condition (`month-status.ts:73-76`), and `priceForMonth` short-circuits a break month before
consulting the history (`prices.ts:11`), so `unpriced` can never be the reason for a month a wider
condition already excluded. A zero price cannot exist to blur the two, because the create schema
requires a positive amount (`src/server/validation/prices.ts:20-24`). Nothing is read as settled from
an amount.

### Two notes, neither a required change

- The `MemberCalendar` tint bullet describes resolving "the payment or schedule it names". A
  participant-level confirmation sets `highlightedId` to a member id instead (`MemberList.tsx:99`,
  `:303`), which names neither. Matrix row 21's wording, "resolves the one `highlightedId` to the
  owning member and the owning month", already covers that case, so the rule is stated correctly in
  the plan; the component bullet is simply the narrower of the two phrasings.
- `plan.md:381` cites `index.css:706-717` for the `.disclosure` rules; the block with its comment
  runs `:704-719`. A two-line drift in a citation, not a substantive error.

### Verdict after resolution

**SOUND.** `change.md` may move to `plan_reviewed` and Progress row 2.3 may be ticked with its sha.
Phase 3 may begin with the Opus projection work in `src/client/calendar/projection.ts` and
`cellText.ts`.
