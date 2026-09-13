<!-- PLAN-REVIEW-REPORT -->
# Plan review: Implementation plan, subscription management and native calendar inputs

- **Plan**: `context/archive/subscription-management-and-date-inputs/plan.md`
- **Mode**: Deep
- **Repository state**: commit `b482f25` on `main`, which is this reviewer's own mechanical commit of
  the designer's amendment to `design-delta.md`. Nothing of this change is on disk. The review was
  taken from that committed state, so the delta's "Rulings on planning questions" are in force.
- **Verdict**: REVISE
- **Findings**: 3 critical, 6 warnings, 2 observations, plus 5 design findings returned to the designer
- **Reviewer**: independent; did not write the brief, the research, the delta, the frame or the plan

Date and effort fields the report schema lists are omitted, matching this repository's convention of
recording progress by change ID, migration ID and commit. This review writes nothing outside this
file, its checkpoint, and the `status` line of `change.md` that the skill assigns to the reviewer.

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | WARNING |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | WARNING |
| Plan Completeness | FAIL |

## Grounding

Paths: 33/33 verified. Every file the plan edits exists at the path it names, including
`src/server/routes/subscriptions.ts`, `src/server/db/subscriptions.ts`,
`src/server/validation/subscriptions.ts`, `src/server/validation/subscriptions.test.ts`,
`tests/integration/subscriptions.test.ts`, `tests/integration/accounts.ts`,
`src/client/components/ui/Field.tsx`, `ConfirmStrip.tsx`, `fieldLabels.ts`, `src/client/index.css`,
`src/client/api.ts`, `src/client/App.tsx`, `src/client/screens/Home.tsx`,
`src/client/screens/SubscriptionDetail.tsx`, the eight calendar call sites, all five migrations it
cites, the four foundation documents and both evidence precedents. All six new paths are correctly
absent with their parent directories present: `src/client/components/ui/MonthField.tsx`,
`DateField.tsx`, `monthControl.ts`, `src/client/screens/subscriptionEdits.ts`,
`src/client/components/SubscriptionSettings.tsx`, `tests/integration/subscription-deletion.test.ts`.

Symbols: 12/12 verified. `validateActiveRanges` (`src/domain/members.ts:29`), `currentMonth`
(`src/domain/months.ts:35`), `formatMonth` returning "Sep 2026" (`src/client/format.ts:12-18`),
`OWNED_MEMBER_IDS` (`src/server/db/members.ts:32-34`), the batched `meta.changes` read
(`src/server/db/members.ts:140-160`), the no-interactive-transaction constraint
(`src/server/db/recurring.ts:211-213`), `tabIndex={-1}` on every heading
(`src/client/components/ui/SectionHeader.tsx:49`), `useSectionStatus().confirm`
(`src/client/components/ui/useSectionStatus.ts:36-43`), `messageWithLabel`
(`src/client/components/ui/fieldLabels.ts:69-77`), `members_one_owner_idx`
(`migrations/0003_members.sql:15`), the `break_months` composite primary key
(`migrations/0004_prices_and_breaks.sql:23`), and `noValidate` on all seven forms.

Brief to plan: consistent. Every required outcome of
`context/foundation/subscription-management-brief.md` has a phase. `plan-brief.md` and `plan.md` agree
on scope, phases and dependencies.

Mechanical `## Progress` contract: passes in full. One `## Progress` heading, last section, after
`## References`. Six phase subsections matching the six phase headings word for word. Criteria against
rows: phase 1 6/6 and 2/2, phase 2 7/7 and 1/1, phase 3 7/7 and 1/1, phase 4 6/6 and 9/9, phase 5 2/2
and 9/9, phase 6 3/3 and 2/2. 55 rows, indices unique and in order, no checkbox anywhere outside the
section.

Foundation line claims: all verified. `prd.md:152` is FR-005, `:161-166` FR-008, `:176-184` FR-011,
`:134` and `:146` the ownership statements, `:231` and `:237` the time-zone conventions, `:292-293`
the currency out-of-scope line; `test-plan.md:52,53,66,67,195`; `roadmap.md:284-291` at status
`planning`; `AGENTS.md:9` and `:46`.

## What the plan gets right, recorded so it is not relitigated

- **Deletion ownership and non-disclosure are correct by construction.** Every one of the eight
  statements carries the ownership predicate, the four tables with no `subscription_id` are reached by
  join up to `subscriptions s`, no separate read decides ownership, and a foreign id deletes nothing
  anywhere and answers 404 from `meta.changes` on the final statement. This is the shape already
  proved at `src/server/db/members.ts:140-160`, and it has no race.
- **The deepest-first order is right and the cascades do not fight it.** Verified against all five
  migrations: eight `ON DELETE CASCADE` declarations, no trigger, no `ON DELETE SET NULL`, and
  `members_one_owner_idx` is a partial unique index a delete cannot violate.
- **The five minimums are complete.** Nothing else in the schema carries a month or date bounded below
  by the subscription first month. `recurring_exceptions.month` looks like a sixth, but it is
  constrained inside its schedule's range at `src/server/routes/recurring.ts:192-196`, so the schedule
  minimum already covers it.
- **The earlier direction genuinely needs no rule check.** Every dependent comparison is `>=`, so
  widening the window satisfies all of them. Confirmed at `src/domain/members.ts:38`,
  `src/server/routes/prices.ts:42`, `break-months.ts:40` and `recurring.ts:67,135`.
- **The 204 path works through the existing client helper unchanged.** `request()` does
  `res.json().catch(() => null)` before the `res.ok` branch (`src/client/api.ts:57-61`), so a 204
  returns null rather than throwing. `deleteSubscription` needs nothing special.
- **The `min` reasoning holds.** All seven forms carry `noValidate`, so `min` narrows a picker and can
  never raise a browser bubble.
- **The refusal transform will render as the delta says.** `messageWithLabel` replaces a leading wire
  token with the field label and touches nothing else, so `currency cannot change while ...` and
  `start_month cannot be later than ...` become "Currency cannot change ..." and "First month cannot be
  later than ...".
- **Home needs no new machinery for the deletion return.** `SectionHeader` already sets `tabIndex={-1}`
  on the `h1`, `useSectionStatus` already exists, and `Home.tsx:54` refetches on remount.

## Findings

### F1 - The month-detection unit test cannot run, because the unit pool has no DOM

- **Severity**: ❌ CRITICAL
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: Phase 2 change 1 (plan.md:370-383), change 5 (plan.md:426-436), criterion 2.2 and
  Progress row 2.2
- **Detail**: The detection function "create an `input`, set `type = "month"` ..." calls
  `document.createElement`. `vitest.unit.config.ts` runs with `environment: 'node'` and no jsdom, and
  `package.json` carries no DOM test dependency, so `document` is undefined in the only suite that is
  supposed to cover both branches. "Injectable" in the plan means the detection *function* is injected
  into the control, which is a different seam: it lets a caller bypass detection, but it gives the unit
  test no way to "inject each fault separately" into the probes themselves. Criterion 2.2 and Progress
  row 2.2 therefore cannot pass as written.
- **Fix**: Give the detection function an injectable element factory defaulting to
  `() => document.createElement('input')`, plus a `typeof document === 'undefined'` guard returning
  false. The unit test then passes stubs whose `type` and `value` accessors reproduce each branch: both
  probes passing, type reflection failing, and value sanitisation failing. State this in the phase 2
  contract so the seam is built for the test rather than discovered by it.
- **Decision**: APPLIED. Phase 2 change 1 now gives the detection function an injectable element factory defaulting to `() => document.createElement('input')` plus a `typeof document === 'undefined'` guard returning false, and change 5 covers both probes with stubs in the `node` environment. The control keeps a separate override seam, used by phase 5 to force a branch for a capture. Confirmed against `vitest.unit.config.ts`, which is `environment: 'node'` with no DOM dependency in `package.json`.

### F2 - The atomicity test's failing statement cannot fail where the plan appends it

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: Plan Completeness
- **Location**: Phase 1 change 7 (plan.md:330-334); Testing strategy (plan.md:838-839); Progress row
  1.3
- **Detail**: The plan induces the failure by appending "a duplicate composite primary key on
  `break_months` (`migrations/0004_prices_and_breaks.sql:23`)" after the eight deletes. Statement seven
  of that same batch is the delete of this subscription's `break_months` rows. By the time the appended
  insert runs, the row it is supposed to duplicate is gone, so it conflicts with nothing, the batch
  commits, and the assertion "every row still stands" fails against a batch that deleted everything.
  The test would then be quietly weakened to make it pass, which is the opposite of what it exists for.
- **Fix**: Name the conflicting row explicitly and put it outside the deleted set. The cheapest is a
  `break_months` row belonging to a *second* subscription of the same account, which the preservation
  fixture already creates: append `insert into break_months (subscription_id, month) values (?, ?)`
  binding that second subscription and a month it already holds. An equivalent alternative is to append
  the same new `(subscription_id, month)` pair twice. Either way the contract should say which row is
  duplicated and why it survives the batch.
- **Decision**: APPLIED, with the reviewer's first option. Phase 1 change 8 now duplicates a `break_months` row belonging to the same account's **second** subscription, which the preservation fixture already creates and which statement seven of the batch never touches, so the appended insert conflicts with the live composite primary key at `migrations/0004_prices_and_breaks.sql:23`. The contract names the row, says why it survives the batch, and Progress row 1.8 checks that the file says so.

### F3 - The sixth refusal kind is unreachable, so a required integration case cannot be written

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: Plan Completeness
- **Location**: Critical implementation details (plan.md:186, 191-206); Phase 1 change 6 (plan.md:315);
  Testing strategy (plan.md:831); `plan-brief.md:46`
- **Detail**: The minimum at plan.md:186 is taken over the subscription's members' `joined_month`
  excluding **only** the owner's opening range, which is what the delta's "the owner's opening range is
  the one exception" says. So the owner's *next* range participates in the minimum, and the new first
  month can never exceed that range's `joined_month`. Separately, the stored set already satisfies
  non-overlap: `validateActiveRanges` treats `next.joinedMonth <= current.leftMonth` as an overlap
  (`src/domain/members.ts:51`), so `range1.left < range2.joined` always holds. Put together, any new
  first month above `range1.left` trips `left_month must not precede joined_month`
  (`src/domain/members.ts:35-37`) first, and any new first month at or below `range1.left` is below
  `range2.joined` and cannot reach it. There is no state in which the shifted opening range reaches the
  owner's next range without first ending before it starts. The sixth kind is dead, and the integration
  case phase 1 requires for it has no fixture.
- **Fix**: Drop the sixth kind, its sentence and its test, and record in the plan that the owner's next
  range is already bound by the participant minimum. Return it to the designer as design finding D1,
  since the delta now carries the sentence too. If it is kept instead, the plan must name the concrete
  stored state that reaches it, which this review could not construct.
- **Decision**: APPLIED. The designer withdrew the kind as design finding 1, so the sentence, the kind and its integration case are gone from the plan, from `plan-brief.md` and from `design-delta.md`. The plan's Key findings now records why it is unreachable, citing `src/domain/members.ts:51` for the overlap rule and `:35-37` for the refusal that always fires first, and states that the owner's later ranges sit inside the participant minimum.

### F4 - The repository-to-route contract for a refusal is unnamed, and `null` already means 404

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: Phase 1 change 2 (plan.md:256-270) and change 4 (plan.md:283-292)
- **Detail**: `update` in `src/server/db/subscriptions.ts:99-124` returns `Subscription | null`, and the
  route maps null to 404 (`src/server/routes/subscriptions.ts:42-44`). The plan puts both refusal
  families inside the repository ("Before the write: refuse a different `currency` ... with field
  `currency`") and then says the route "gains the two refusal families", without saying what crosses
  between them. An implementer who reuses `null` for a refusal turns every 400 into a 404, which is
  silent and passes the cross-account tests.
- **Fix**: Name a discriminated union in the shape this repository already uses for exactly this
  problem, `MemberRemoval` at `src/server/db/members.ts:223`. For example
  `{ ok: true; subscription } | { ok: false; kind: 'not-found' } | { ok: false; kind: 'refused'; field; message }`,
  with the route mapping stated: `not-found` to 404, `refused` to 400 `{ error, field }`, matching the
  existing shape at `src/server/routes/subscriptions.ts:40`.
- **Decision**: APPLIED. Critical implementation details now names the union `{ ok: true; subscription } | { ok: false; kind: 'not-found' } | { ok: false; kind: 'refused'; field; message }`, modelled on `MemberRemoval` at `src/server/db/members.ts:223`, and phase 1 change 4 states the route mapping. Verified that `update` returns `Subscription | null` today and the route maps null to 404 at `src/server/routes/subscriptions.ts:42-44`, so the finding is exact.

### F5 - The window between reading the minimums and writing is unstated

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: Blind Spots
- **Location**: Critical implementation details (plan.md:176-190); Phase 1 change 2 (plan.md:263-270);
  Risks (plan.md:849-857)
- **Detail**: D1 has no interactive transaction, stated in the code at `src/server/db/recurring.ts:211-213`
  and relied on everywhere else in this plan. The first-month path is a read of five minimums followed
  by a separate `db.batch`. A price, payment, participant range or standing order written by a
  concurrent request in that window lands before the new first month and leaves the ledger holding a
  record the server would have refused. The deletion path has no such window, because its ownership
  predicate is inside the statements; the patch path does, and the Risks table does not carry it.
- **Fix A ⭐ Recommended**: Carry the bound in the write itself. Make the subscription update
  `update subscriptions set ... where id = ? and user_id = ? and not exists (...)` for each minimum,
  in the `insert ... select ... where exists (...)` shape already used at
  `src/server/db/members.ts:143-146`, and treat `meta.changes === 0` on a row that `get` proved exists
  as the lost race. The prior read then supplies only the refusal sentence, never the decision.
  - Strength: closes the window rather than documenting it, using a shape this codebase already proves.
  - Trade-off: the update statement grows five `not exists` clauses, and the lost-race answer needs one
    sentence of its own.
  - Confidence: HIGH - the same construction is in the tree and covered by tests.
  - Blind spot: whether the lost-race answer should be a 400 or a 409 is a design question.
- **Fix B**: Leave the shape alone and add a Risks row stating the window, its consequence and that D1
  offers no better tool, so the residual is recorded rather than implied.
  - Strength: no code change; honest.
  - Trade-off: the ledger can still end up holding a record the rule forbids.
  - Confidence: HIGH.
  - Blind spot: single-user-per-subscription usage makes this rare, which is not the same as safe.
- **Decision**: APPLIED, Fix A, and extended. The bound now travels in the update's own `where` as one `not exists` clause per minimum, in the `insert ... select ... where exists (...)` shape proved at `src/server/db/members.ts:143-146`, with the prior read supplying only the refusal sentence. Two additions the review did not name: the same construction is applied to the currency lock, which has the identical window; and the owner opening-range update, being the second statement of the same batch, is gated on the subscription already carrying the new first month, so it cannot apply when the first statement did not. The reviewer's open design question about a 400 or a 409 does not arise: the update's `where` has only the ownership terms and the `not exists` clauses, so a `meta.changes === 0` on a row `get` proved exists is resolved by a re-read into either 404 (the row is gone) or the ordinary 400 (a minimum now binds), and no new copy string is needed.

### F6 - The empty-value contract of the month control contradicts itself between phase 2 and phase 3

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: Phase 2 change 2 (plan.md:392-394); Phase 3 change 1 (plan.md:483-485)
- **Detail**: Phase 2 gives `MonthField` "a change handler receiving a `YYYY-MM` string or `null`".
  Phase 3 says "`ScheduleForm` keeps `''` ... a cleared native control yields `''`, which both already
  handle". Both cannot be true at the call site: `ScheduleForm`'s `endMonth` is a plain string
  (research.md section 5, row 8), so a `null` from the handler is written straight into it and reaches
  `value={null}` on the control. `MemberForm` holds `string | null` and would be fine either way, which
  is why the mismatch will only show up in one of the two files.
- **Fix**: Have the handler always emit a string, `''` when empty, which is also exactly what the
  fallback select's empty option yields through `.value`, and leave both call sites normalising to
  `null` at submit as they do today. Amend the phase 2 contract to say `string`, not `string | null`.
- **Decision**: APPLIED. Phase 2 change 2 now specifies a handler that always receives a string, `''` when cleared, and states why: `ScheduleForm` holds a plain string, the fallback select's empty option yields `''` through `.value`, and both call sites already normalise to `null` at submit. Phase 3 change 1 agrees with it.

### F7 - Nothing says what the header action row does in the detail screen's error and no-owner states

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: End-State Alignment
- **Location**: Phase 4 change 6 (plan.md:596-608); delta 4.4 amended header
- **Detail**: `SubscriptionDetail` has four states, and `header` is one shared element rendered by all
  of them (`src/client/screens/SubscriptionDetail.tsx:95-125`). The delta and the plan specify the
  action row for the skeleton state ("disabled during the first load ... enable when it settles") and
  for the ready state, and say nothing about `error` or `no-owner`. Both render the same header today.
  The `no-owner` state is the strongest case for the delete button existing at all: it is a
  subscription the product cannot show and the user cannot otherwise remove. Leaving this unstated
  means the implementer decides it, and manual row 4.7 cannot check a rule that was never written.
- **Fix**: State the rule in phase 4 change 6 and raise it with the designer as D2. The reviewer's
  recommendation, offered as a starting point rather than a ruling: both buttons disabled in `error`,
  since nothing is known; Delete enabled and Edit disabled in `no-owner`, since the currency lock needs
  lists that state does not have while the deletion needs only the id.
- **Decision**: APPLIED as the designer ruled it in design finding 2, which matches the reviewer's recommendation. Phase 4 change 6 now carries a per-state table for all four states of `src/client/screens/SubscriptionDetail.tsx:49-55`: both buttons disabled in `error`, Delete enabled and Edit disabled in `no-owner`, with the strip, the Home return and the status line behaving as in the ready state. Progress row 4.17 checks it.

### F8 - Phase 4 never names the prop that carries the PATCH response up to where the subscription is held

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: Phase 4 change 6 (plan.md:604-606) and change 7 (plan.md:610-621)
- **Detail**: The held subscription object is `selected` in `src/client/App.tsx:13`.
  `SubscriptionDetail` receives it as a read-only prop (`:32-38`) and has no way to replace it. Change 6
  says "the client replaces its held subscription object with the PATCH response" but lists only
  `SubscriptionDetail.tsx`; change 7 lists `App.tsx` but only for the deletion return. Without a named
  prop the title and subtitle keep showing the old name after a successful save, which is manual row
  4.11.
- **Fix**: Add an `onUpdated(subscription)` prop to change 6 and `setSelected(updated)` to change 7's
  `App` contract. The Home list needs nothing further: `Home` refetches on remount at `Home.tsx:54`, so
  returning to it after an edit already shows the new values.
- **Decision**: APPLIED. Phase 4 change 6 now hands the PATCH response up through a named `onUpdated(subscription)` prop and change 7 implements it as `setSelected(updated)` in `App`, with `Home` left to its existing remount refetch at `Home.tsx:54`. Verified that `SubscriptionDetail` receives the subscription as a read-only prop at `:32-38`.

### F9 - Nothing tests that the fallback branch renders a select; one manual Safari row is the whole proof

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: Plan Completeness
- **Location**: Phase 2 change 5 (plan.md:426-436); Phase 5 change 3 (plan.md:706-714); Progress row 5.4
- **Detail**: There is no jsdom and no testing-library in `package.json`, and the unit include is
  `src/**/*.test.ts`, so a `.tsx` component test would not even be collected. The plan's unit coverage
  therefore stops at the two pure helpers, and the statement "both branches tested" is true of the
  detection predicate but not of the rendering it selects. Row 5.4 in one hand-driven browser is the
  only evidence that the false branch produces a select rather than a bare month-typed box, and it is
  also the row the plan already flags as the one thing reading cannot settle.
- **Fix**: Accept it and say so plainly in the Testing strategy, or move the branch decision into
  `monthControl.ts` as a pure function returning `'input' | 'select'` from the detection result and the
  props, so the decision is unit-tested and only the JSX is left to the browser. Neither option adds a
  dependency.
- **Decision**: APPLIED, both halves rather than either. The branch decision moved into `monthControl.ts` as a pure function returning `'input' | 'select'`, unit-tested in phase 2 change 5, **and** the Testing strategy gained a section stating plainly that the JSX those decisions select is covered by no automated test here, that manual row 5.4 is its only proof, and that a DOM environment is not worth a dependency in a project that pins every version by hand. Confirmed that the unit include is `src/**/*.test.ts`, so a `.tsx` test would not be collected.

### F10 - Moving the first month earlier is unbounded, and the summary enumerates every month from it

- **Severity**: 📄 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Blind Spots
- **Location**: Critical implementation details (plan.md:176-178); Phase 1 change 1 (plan.md:243-254)
- **Detail**: The plan says moving the first month earlier "needs no check at all", which is correct
  about the dependent rules and incomplete about cost. `src/domain/calc.ts:87` is
  `enumerateMonths(state.settings.startMonth, current)` and the summary walks that list per member on
  every read. The patch schema's only bound is the `YYYY-MM` regex
  (`src/server/validation/subscriptions.ts:25-27`), which accepts `0001-01`, so a single patch can make
  every subsequent summary walk roughly twenty-four thousand months inside a Worker. The same exposure
  exists on create today and has never been reachable on a subscription that already holds a ledger.
- **Fix**: Record the decision in the plan, or bound the earlier move by one cheap rule, for example
  refusing a first month more than a fixed number of years before the current month in the
  subscription's time zone. Either is fine; silence is what makes it a finding.
- **Decision**: APPLIED as the designer ruled it in the delta's amended first-month paragraph: a floor of January ten years before the current year in the subscription's time zone, on create and on edit alike, with the sentence `start_month cannot be earlier than YYYY-MM`. The plan enforces it in the repository rather than the schema, because it depends on the stored time zone, and the first-month control on both forms carries the matching `min`. Integration cases cover create and patch.

### F11 - One wire name gets two labels, and the create form keeps the old one

- **Severity**: 📄 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: Phase 4 change 4 (plan.md:570-578)
- **Detail**: `subscriptionFieldLabels` already exists and already maps `start_month` to "Start month"
  (`src/client/components/ui/fieldLabels.ts:9-16`), and the create form's field is labelled "Start
  month" (`src/client/screens/SubscriptionForm.tsx:138`). The plan adds a second map in which the same
  wire name is "First month", which is what the delta asks for, but nothing says whether the create
  form is deliberately left saying something else about the same value. The plan also describes the
  existing maps as six registered "at `:9-48`", which is right, so this is only the naming question.
- **Fix**: One sentence in phase 4 change 4 saying the create form's label is deliberately unchanged,
  or a decision to align it. Raised with the designer as D3.
- **Decision**: APPLIED as the designer ruled it in design finding 3: one label per wire name. Phase 3 change 2 changes the create form's label at `src/client/screens/SubscriptionForm.tsx:138` from "Start month" to "First month", and phase 4 change 4 changes the single `start_month` entry in the existing `subscriptionFieldLabels` (`src/client/components/ui/fieldLabels.ts:9-16`) rather than adding a second map. Progress rows 3.9 and 4.16 check that no "Start month" string and no second map survive.

## Design findings

Returned to the designer rather than resolved here. Each is a point in `design-delta.md` that an
implementer cannot settle alone.

1. **The sixth refusal kind cannot fire.** The delta's rulings add "your own next active range starts
   then" beside "your own first active range ends then", and the delta also states that the owner's
   opening range is the *one* exception to the minimum check. Those two together make the new sentence
   unreachable: the owner's next range is inside the minimum, and non-overlap already guarantees the
   first range ends before the next begins, so the `left_month` refusal always fires first. Either drop
   the sentence, or restate the minimum so that all of the owner's ranges are excluded from it, which
   would then need a third owner sentence for an owner range that starts before the new first month.
   See F3.
2. **The action row is unspecified in two of the detail screen's four states.** The delta covers the
   skeleton state and the ready state. `error` and `no-owner` render the same header. Deleting a
   `no-owner` subscription is arguably the main reason the button should exist, and the delta's own
   4.4 already mentions the 409 no-owner case in the alert rules. See F7.
3. **"Start month" and "First month" name the same value on two screens.** The delta labels it "First
   month" in the edit panel, the hint and the refusal sentence; the shipped create form and the shipped
   label map say "Start month". Intended, or should the create form move? See F11.
4. **`min` is specified only for bounds derived from the subscription first month.** The participant
   "To" field and the standing order "Last month" field also carry a server lower bound, their own
   From and First month, which the delta's bounds paragraph does not mention. Confirm the omission is
   deliberate, given that `min` is stated to be a picker convenience rather than enforcement.
5. **Informational.** A time-zone change can move every figure on the screen by a month's worth, and
   its only feedback is the same "Changes saved" line a name change produces. The delta accepts this
   with a field hint, which is a defensible ruling; recorded so it is a choice on the record rather
   than an oversight.

## Notes for the implementer, not findings

- Two success-criteria greps are narrower than the rule they protect. `grep -rn "new Date(" src/client/components/ui/`
  (criterion 2.6) does not reach `src/client/screens/subscriptionEdits.ts` or the eight migrated call
  sites, and phase 4 carries no `new Date(` gate at all. Widening to `src/client/` with the two
  known-safe sites at `src/client/format.ts:16,29` excluded by name costs nothing.
- The phase bodies head their success criteria `#### Automated` and `#### Manual`, where the review
  skill's contract and the precedent plan (`context/archive/google-sign-in/plan.md:498,511`) read
  `#### Automated verification` and `#### Manual verification`. The `## Progress` contract itself
  passes in full, so nothing is at risk; it is a wording drift from the precedent.
- Phase 4 change 3 says the locked-currency hint is used "as its `aria-describedby` text" without
  saying the code is interpolated. The delta's copy table is explicit that the current currency code
  replaces PLN in that sentence. One clause.
- The plan and `plan-brief.md` still present the two frame questions as open and "reversible by a
  designer ruling" (plan.md:12-15, 852; plan-brief.md:102-104). Both are now ruled in the delta's
  "Rulings on planning questions". Re-point those references at the delta when the plan is next edited.
- "The production path issues exactly one batch" (plan.md:334) has no stated mechanism in an
  integration test against a real binding. Every repository function takes `db: D1Database` as a
  parameter, so a stub recording `batch` calls is a unit test rather than an integration one. Worth
  moving or dropping.
- The client-address prefix `10.9.0.x` is free: `tests/integration/accounts.ts:12-21` allocates
  `10.0.0.x` through `10.8.0.x`. The plan's extension of that comment is correct.

## Resolution

The verdict was REVISE. All eleven findings are now resolved in `plan.md` and `plan-brief.md`, and the
five design findings were ruled by the designer in `design-delta.md` under "Rulings on plan review
design findings". Nothing was skipped and nothing was deferred; no phase boundary moved.

| Finding | Severity | Decision | Where it landed |
| --- | --- | --- | --- |
| F1 | CRITICAL | Applied | plan Critical implementation details, phase 2 changes 1 and 5, criterion 2.2 |
| F2 | CRITICAL | Applied, reviewer's first option | plan phase 1 change 8, Testing strategy, Progress row 1.8 |
| F3 | CRITICAL | Applied, kind withdrawn by the designer | plan Key findings, What we are NOT doing, phase 1 change 7 |
| F4 | WARNING | Applied | plan Critical implementation details, phase 1 changes 2 and 4 |
| F5 | WARNING | Applied, Fix A, extended to the currency lock and the batch's second statement | plan Critical implementation details, phase 1 change 2, Risks |
| F6 | WARNING | Applied | plan phase 2 change 2, phase 3 change 1 |
| F7 | WARNING | Applied as ruled by the designer | plan phase 4 change 6, Progress row 4.17 |
| F8 | WARNING | Applied | plan phase 4 changes 6 and 7 |
| F9 | WARNING | Applied, both halves | plan Critical implementation details, phase 2 changes 1 and 5, Testing strategy |
| F10 | OBSERVATION | Applied as ruled by the designer | plan Critical implementation details, phase 1 changes 1, 2, 5 and 7, phase 3 change 1 |
| F11 | OBSERVATION | Applied as ruled by the designer | plan phase 3 change 2, phase 4 change 4 |

The five notes for the implementer were taken as well: the two `new Date(` greps now cover
`src/client/` with the two known-safe sites in `format.ts` named as the permitted matches and phase 4
gained the same gate; the phase bodies now head their criteria `#### Automated verification:` and
`#### Manual verification:` as the precedent does, leaving the `## Progress` headings untouched; the
locked-currency hint is stated to interpolate the subscription's own currency code; the two frame
questions are re-pointed at the delta's rulings, which settled both; and the single-batch claim moved
out of the integration file into a unit test against a `D1Database` stub, which is where a repository
function taking `db` as a parameter can actually be observed. The `10.9.0.x` prefix stands.

`change.md` moves to `status: plan_reviewed` with this pass. Per this repository's convention no date
field is written; the review is dated by the commit that carries it.

## Re-verification

Second pass, against `plan.md` and `plan-brief.md` at `4ea9618` and `design-delta.md` at `d146993`,
read in full and checked against the code again rather than against the Decision lines above. The
five design findings were ruled by the designer; the eleven review findings were resolved by the
planner.

### Final verdict

**SOUND. Approved for implementation.** All three critical findings, all six warnings, both
observations, all five design findings and all six implementer notes are closed in the plan, the plan
brief and the delta. The two additions the planner made beyond the review are sound and introduce no
new status code, no ambiguity and no silent no-op. Two observations remain, neither of them required
and neither moving a phase boundary; they are R1 and R2 below.

### Findings, re-verified

- **F1, closed.** The detection function now takes an element factory defaulting to
  `() => document.createElement('input')` and returns false under `typeof document === 'undefined'`
  (plan.md:313-321, 511-518), and the unit contract injects each probe fault separately with a stub
  (`:576-578`). Re-checked `vitest.unit.config.ts`: `environment: 'node'`, include `src/**/*.test.ts`,
  no DOM dependency in `package.json`. The suite can now run what criterion 2.2 claims.
- **F2, closed.** The appended failing statement now duplicates a `break_months` row of the same
  account's *second* subscription (plan.md:457-464). Statement seven of the batch is scoped to the
  first subscription, so that row survives and the insert really does collide with the composite
  primary key at `migrations/0004_prices_and_breaks.sql:23`. The contract also requires the file to
  name the row and say why it survives, and Progress row 1.8 checks that.
- **F3, closed.** The kind is gone from the plan, the plan brief and the delta, and the integration
  list at plan.md:434-441 no longer carries the case. The Key finding at `:92-98` states the reason
  correctly and cites the right lines: the overlap rule at `src/domain/members.ts:51` and the
  leave-month refusal at `:35-37`. Re-derived independently a second time and it holds.
- **F4, closed.** The union is named at plan.md:250-254 and the route mapping at `:398-399`. It
  matches the `MemberRemoval` precedent at `src/server/db/members.ts:223`, and `get`, `list`, `create`
  and `remove` keep their present returns, so no other call site moves.
- **F5, closed, with Fix A.** The bound travels in the update's `where` (plan.md:271-285) and the
  Risks table gained two rows (`:1075-1076`). The `ar.id <> ?` exclusion for the range being shifted
  is right and is called out as the non-obvious part.
- **F6, closed.** The handler is string-only with the reason stated (plan.md:533-538), and phase 3
  agrees (`:629-631`).
- **F7, closed.** The per-state table at plan.md:788-793 matches the delta's amended 4.4 and the four
  states actually present at `src/client/screens/SubscriptionDetail.tsx:49-55`. Progress row 4.17
  checks it.
- **F8, closed.** `onUpdated(subscription)` is named at plan.md:801-802 and implemented as
  `setSelected(updated)` at `:816`. Home is correctly left to its existing remount refetch.
- **F9, closed, both halves.** The branch function is a pure export (plan.md:517-518, 578-579) and the
  new "What no automated test in this repository covers" section (`:1054-1062`) states the residual
  plainly.
- **F10, closed.** The floor is in the delta and in the plan (plan.md:207-216), enforced in the
  repository because it depends on the stored time zone, applied on create as well (`:404-412`), and
  carried as `min` on both first-month controls. It is the same lower bound the select fallback
  already used, so the picker path and the select path list the same span.
- **F11, closed.** One label, one map. Phase 3 change 2 moves the create form's label and phase 4
  change 4 edits the single entry rather than adding a map.

### The two additions, checked

- **The currency lock's `not exists` guard.** Sound, and the same window it closes is real. No new
  status code: the patch still answers 200, 400 `{ error, field }`, 404 and 401, and the delete still
  answers 204, 404 and 401. Nothing introduces a 409.
- **The gate on the owner opening-range statement.** Checked for the case the gate could pass while
  the first statement failed. The gate is `start_month = <new month>` on the subscription row, so it
  can only be true after a failed first statement when the new month equals the stored one, and in
  that case the shift is a write of the range's own existing value. Every other combination behaves:
  a currency race, a minimum race and an earlier move with a currency race all leave the stored month
  at its old value, so the gate is false and the second statement does not apply. The plan's reliance
  on a later statement seeing an earlier one's write inside a batch is consistent with the vendor
  behaviour research section 4 already records, and the deletion order depends on the same property.
- **No silent no-op path.** `meta.changes === 0` on the first statement is explicitly resolved rather
  than ignored (plan.md:293-297), re-reading into 404 when the row is gone and the ordinary 400
  otherwise.

### The rest of the re-verification brief

- **The "First month" label change opens nothing.** `Start month` survives in `src/` at exactly two
  places, `src/client/screens/SubscriptionForm.tsx:138` and
  `src/client/components/ui/fieldLabels.ts:14`, both of which the plan changes. No test, fixture or
  helper under `tests/` or `src/` asserts the string. Progress rows 3.9 and 4.16 make its absence a
  gate.
- **The ten-year floor breaks no existing creation path.** The floor for the current year is
  `2016-01`. The earliest start month anywhere in `tests/` or `src/` is `2025-12`; the only other
  out-of-range literal is `2026-13`, a deliberate malformed-month case the regex rejects before the
  floor is reached. `src/server/routes/dev-seed.ts` creates accounts only and no subscription, so no
  demo record is created through a path the floor touches.
- **D4's paired `min` cannot hide a stored value.** The option-range rule is "always extended to
  include the current value" (plan.md:519-524, delta's Bounds and Select fallback paragraphs), so a
  `To` value earlier than its `From` still appears in the fallback select. On the picker branch an
  out-of-range value is kept and marked invalid rather than cleared, which is what the delta means by
  bounds being a convenience. Manual row 3.10 observes the pairing directly.
- **The Progress contract holds after the edits.** One `## Progress` heading, last section, six phase
  subsections matching the six phase headings word for word, 59 rows, every index unique, no checkbox
  anywhere outside the section. The four rows added by this round (3.9, 3.10, 4.16, 4.17) are appended
  at the end of their blocks rather than renumbering the existing rows, which is the same approach the
  visual-redesign plan took for its row 4.24. Two rows each carry two body bullets: 3.4, which already
  merged the `inputMode` and `pattern` greps before this round, and the new 4.16.
- **The implementer notes were taken.** The `new Date(` gates now cover `src/client/` with the two
  `format.ts` sites named; phase 4 gained the same gate; the phase bodies now head their criteria
  `#### Automated verification:` and `#### Manual verification:`, matching
  `context/archive/google-sign-in/plan.md:498,511`, with the `## Progress` subsection headings left as
  `#### Automated` and `#### Manual`, which is also what the precedent does at `:840,854`; the
  currency-code interpolation is stated; the frame questions are re-pointed at the delta; and the
  single-batch assertion moved to a unit test against a `D1Database` stub.

### Remaining items

Neither is required and neither blocks phase 1.

- **R1 - the re-read rule names only the first-month family.** plan.md:293-297 resolves
  `meta.changes === 0` into 404 or "the ordinary 400 naming it", where "it" is a binding minimum. Now
  that the currency lock's clauses sit in the same `where`, the re-read has to re-derive across both
  families and decide which `field` it names when both bind. One clause would close it, ideally
  giving `currency` precedence, since it is the coarser refusal and the one the client shows as a
  disabled field.
- **R2 - the lost-race path has no test.** It is not reachable from an integration test, because D1
  executes statements sequentially and non-concurrently, but it is cheap at the unit level now that
  phase 1 change 6 introduces a `D1Database` stub: have the stub report `meta.changes: 0` on the first
  statement and assert the route answers 404 when the re-read is empty and 400 otherwise. Worth one
  case in phase 1 change 6 rather than leaving the only branch that decides a refusal unexercised.

### A note for the designer, informational

The archived `context/archive/visual-redesign/design-spec.md:283` still uses "Start month must be in
YYYY-MM format with a valid month" as the worked example of the 3.8 transform. The plan is right not
to edit the archived specification, and the delta's design finding 3 names section 4.3 but not that
example. One line in the delta would keep the standing amendment complete.

`change.md` stays at `status: plan_reviewed`, which is the status the review skill assigns for a saved
and approved report; the skill defines no later status, so the approval is carried by this section and
dated by the commit that holds it.
