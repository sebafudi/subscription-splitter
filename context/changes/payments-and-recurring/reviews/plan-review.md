<!-- PLAN-REVIEW-REPORT -->
# Plan review: Implementation plan, payments and recurring

- **Plan**: `context/changes/payments-and-recurring/plan.md`
- **Mode**: Deep
- **Repository state**: commit `989cb8a`. S-02 phase 1 landed at `69b8fbc` and phase 2 at `a304b6d`,
  the second of them while this review ran; phases 3 to 5 are not on disk
- **Verdict**: REVISE (approve with required changes)
- **Findings**: 1 critical, 6 warnings, 2 observations

Date and effort fields the report schema lists are omitted, matching this repository's convention of
recording progress by change ID, migration ID and commit. This review writes nothing outside this
file; `change.md` still reads `status: planned` and wants `plan_reviewed` once the findings are
triaged.

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | FAIL |
| Lean Execution | PASS |
| Architectural Fitness | WARNING |
| Blind Spots | WARNING |
| Plan Completeness | WARNING |

## Grounding

Paths: 13/13 files the plan modifies that should already exist do exist (`src/domain/months.ts`,
`src/domain/money.ts`, `src/domain/money.test.ts`, `src/domain/months.test.ts`,
`src/domain/calc.test.ts`, `src/server/index.ts`, `src/server/db/members.ts`,
`tests/integration/accounts.ts`, `src/client/api.ts`, `src/client/index.css`,
`context/foundation/test-plan.md`, `evidence/index.md`, `evidence/work-log.md`), plus
`evidence/runs/runtime-auth-slice-tests.txt`, the capture whose shape phase 5 copies. Three further
paths the plan edits are owed by S-02 phases 3 and 4 and are not on disk:
`src/server/db/subscription-state.ts`, `tests/integration/summary.test.ts` and
`src/client/screens/SubscriptionDetail.tsx`. That is expected and declared, but see F2.

Symbols: 15/15 verified against landed code rather than from memory. `recurringReceived`,
`balanceForMember`, `computeSummary`, `shareForMember`, `perPersonShare`, `priceForMonth` and the
`collectedThisMonth` field are all in `src/domain/calc.ts` with the four-argument shape the plan
assumes; `rangeCovers`, `activeMembersInMonth`, `chargedMembersInMonth` and `validateActiveRanges` in
`src/domain/members.ts`; `shareForMonth`, `ownerResidualForMonth` and `formatMoney` in
`src/domain/money.ts`; `addMonth`, `enumerateMonths` and `currentMonth` in `src/domain/months.ts`;
`Payment`, `RecurringSchedule` and `RecurringException` in `src/domain/types.ts` with exactly the
fields the plan names; `requireSession` and `SessionVariables` in
`src/server/middleware/require-session.ts`. `hasDependents` landed at `a304b6d` with exactly the
signature the plan consumes, `(db, subscriptionId, memberId, userId): Promise<boolean>` at
`src/server/db/members.ts:226-233`, returning `false` with every parameter unused, and the member
DELETE route already answers 409 on it at `src/server/routes/members.ts:118-120`. The plan's claim
that the 409 branch exists and is unreachable until this slice gives the seam its clauses is
confirmed rather than assumed. `loadState` is S-02 phase 3 and correctly described as not yet
existing. Every npm script the success criteria invoke exists:
`test:unit`, `test:integration`, `typecheck`, `build`, `test`, `db:migrate:local`.

Migration numbering: the `0005`/`0006` assumption holds so far. `migrations/0003_members.sql` is on
disk carrying `members` and `active_ranges`, and S-02's plan puts prices and break months in
`0004_prices_and_breaks.sql`, so the two new files land where the plan says. The plan's hedge stays
useful until S-02 phase 3 commits.

Progress section: the mechanical contract in `10x-plan/references/progress-format.md` holds. Exactly
one `## Progress` heading, at the bottom after `## References`; five `### Phase N` headings whose
titles are identical to the five `## Phase N` headers; every success-criterion bullet has a numbered
row with the Automated/Manual split preserved (1.1-1.5 / 1.6-1.7, 2.1-2.6 / 2.7-2.8, 3.1-3.7 /
3.8-3.9, 4.1-4.3 / 4.4-4.13, 5.1-5.2 / 5.3); no checkbox appears anywhere outside the Progress
section. The only em dash in the plan is the ` — <commit sha>` token `progress-format.md` mandates,
so it stands under the repository's no-em-dash rule. No calendar dates, durations or estimates
anywhere. `docs/reference/contract-surfaces.md` does not exist in this project, so that check is
skipped.

Brief-to-plan: phases, decisions and scope match, with the route-count discrepancy recorded in F8(b).
Nothing in "What we are NOT doing" reappears in a phase; the status grid, coverages, opening
balances, lump-sum spreading, negative amounts, an upper date bound, participant views and the
calculation-signature freeze are all honoured by the phase contracts.

## Domain semantics, checked rule by rule

Verified against `src/domain/calc.ts`, section 10 of the read-only prototype's design document, and
the requirements. These are correct in the plan and are recorded so the implementer does not
re-derive them.

Money stays integer minor units everywhere, with `amount > 0` CHECKs on both new tables, matching R1
and R10. The six conditions of the assumed-receipt rule in the plan are exactly the six in
`recurringReceived` at `src/domain/calc.ts`, in the same order, and R3 in the prototype agrees on
every one. The end month is inclusive and a null end means still running, which is R3 and what
`isMonthInSchedule` is specified to do. Break months zero a month for every member regardless of the
schedule, which `recurringReceived` gets from `state.breakMonths.includes(month)` and R6 confirms. An
exception is keyed by schedule and month together and touches nothing else, matching the
`exception.recurringId === schedule.id && exception.month === month` predicate already shipped.
Manual payments are summed for the member with no date filter at all, so a future-dated payment
counts as credit now, which is FR-018 and R8, and only `collectedThisMonth` buckets by month.
`annual` is descriptive with identical arithmetic, which is FR-016. The balance is `paid - owed`,
negative when owing. Two touching arrangements are an overlap rather than a continuation, which is
the same call `validateActiveRanges` already makes for member ranges. The start-month bound on a
schedule matches R10's "all months/dates >= settings.startMonth". Refusing a payment before the
plan's first month with nothing stored is US-02's own acceptance criterion. Archiving rather than
deleting a participant with history is FR-012, R4 and the `AGENTS.md` rule, and it is reachable
because S-02's member PATCH sets `archived`; this slice only supplies the 409.

The zero-active-member behaviour is untouched and stays D-006's: share zero, nobody owes, the full
price still accrues to the plan total and the owner's net cost. Nothing in this slice can reach it.

## Challenge to a core assumption

The plan opens with "The slice adds no new kind of problem" (plan.md:11) and the brief closes with
"The moment anything between them adds the two together, FR-026 is lost quietly, and no test can see
it".

Counter-question: what if the thing that adds the two halves together is not something this slice
writes, but the contract it inherits?

It is. `balanceForMember` at `src/domain/calc.ts` returns `paid` as `manual + recurringReceived(...)`,
one number, and `MemberSummary` in `src/domain/types.ts` carries a single `paid` field with no
recorded/assumed split. The condition the plan names as unobservable has already occurred, in code
that is committed at `69b8fbc`, before this slice writes a line. The plan's own scope line "no change
to the summary route's shape" then forbids the fix.

The consequence is F1. Every other invariant S-01 and S-02 own is enforced somewhere the application
cannot forget it: `members_one_owner_idx` in `migrations/0003_members.sql`, the
`left_month >= joined_month` table CHECK, `s.user_id = ?` in every statement of
`src/server/db/subscriptions.ts`. This slice introduces the first rule that can be none of those (the
overlap, correctly identified and accepted in D-007) and the first number the screen derives from
domain rules instead of reading from the server (the elapsed months of an arrangement). The second
one is new, it is not identified as new, and as specified it is already wrong. "No new kind of
problem" is the assumption that let phase 4 ship with three automated criteria that are a typecheck,
a build and the existing suite, and ten manual ones, for the section the plan itself calls "the one
way this product can mislead its user".

## Findings

### F1 - The screen's assumed-received months come from a rule that applies two of the six conditions

- **Severity**: ❌ CRITICAL
- **Impact**: 🔬 HIGH - architectural stake; broad blast radius, think it through carefully
- **Dimension**: End-State Alignment
- **Location**: Phase 1, change 3 (`scheduleMonths`, plan.md:232-236); Phase 4, change 3
  (plan.md:773-778); Critical implementation details (plan.md:144-151)
- **Detail**: `recurringReceived` at `src/domain/calc.ts` disqualifies a month on six conditions:
  before the start month, after the end month, after the current month, a break month, outside the
  member's active ranges, and listed as an exception. `scheduleMonths(schedule, currentMonth)` as
  specified applies two of them, the start month and the earlier of the end month and the current
  month. The screen can apply a third itself, because `list` and `get` return the exception months
  attached to the schedule. Nothing gives it break months or the member's active ranges.

  So a standing order that runs across a break month, or across a month after the participant left,
  draws that month in the toggle grid as a counted month, labelled assumed received and visually
  identical to a month that actually counted, while the server's `paid` excludes it. The organizer
  reads five assumed months and a balance that reflects three, with no way to tell which two were
  dropped or why. That is precisely the FR-026 failure the plan exists to prevent, and the screen
  cannot cross-check against the server either, because `MemberSummary` exposes one `paid` field with
  no recorded/assumed split.

  Phase 4's manual criterion 4.10, "a recorded receipt and an assumed one are told apart without
  reading the amounts", passes in this state: the two sections are visually distinct. It is the
  per-month labels inside the assumed section that are wrong, and no criterion looks at them.
- **Fix A ⭐ Recommended**: Replace `scheduleMonths` with
  `scheduleMonthStatuses(state, member, schedule, currentMonth): { month, counted, reason }[]`, where
  `reason` is `'counted' | 'break' | 'inactive' | 'excepted'`, built from the same six conditions as
  `recurringReceived`, and have phase 4 draw both the toggle and the label from it.
  - Strength: one source of truth for which months count, unit-testable in phase 1 beside the paired
    `recurringReceived` cases, and no change to any calculation signature or to the summary route's
    shape, so the scope line survives intact.
  - Trade-off: phase 4 must have break months and the member's ranges in hand, which means the detail
    screen's fetch has to include the break-months read S-02 already builds a route for.
  - Confidence: HIGH - the six conditions are already written in one place and the helper simply
    reports them instead of re-deriving them.
  - Blind spot: whether S-02's landed detail screen already holds break months alongside members; its
    plan gives it a break-months section, so it should, but that is phase 4's first check.
- **Fix B**: Add `paidRecorded` and `paidAssumed` to `MemberSummary`, filled in `balanceForMember`
  and `computeSummary`, and label the balance row from them.
  - Strength: the split is the server's own answer, asserted through the summary route rather than
    recomputed in the browser.
  - Trade-off: it is a change to the summary shape, which "What we are NOT doing" forbids, and it
    still does not tell the organizer which month was dropped or why, so the toggle grid stays wrong.
  - Confidence: MED - additive and easy, but it fixes the total rather than the labels.
  - Blind spot: whether S-02's detail screen renders `paid` in a way that would have to change.
- **Decision**: PENDING

### F2 - One blanket prerequisite covers five phases with different dependencies, and S-02 is only half landed

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: Blind Spots
- **Location**: Implementation approach, Prerequisites (plan.md:130-141); Migration notes
  (plan.md:961-963)
- **Detail**: "S-02 must be on disk before phase 1 starts" is one gate for five phases that need
  different things, and the gate is now half open. At `989cb8a`, S-02 phases 1 and 2 have landed:
  `src/domain/` is complete, `migrations/0003_members.sql` exists, and so do
  `src/server/db/members.ts`, `src/server/routes/members.ts`, `src/server/validation/members.ts` and
  `tests/integration/accounts.ts`. `src/server/db/subscription-state.ts`,
  `src/server/routes/summary.ts` and `src/client/screens/SubscriptionDetail.tsx` do not.

  Phase 1 needs only what landed at `69b8fbc` and is startable now; the blanket gate blocks it for no
  reason. Phase 2 edits `src/server/db/members.ts`, which now exists, *and*
  `src/server/db/subscription-state.ts`, which does not, and its final integration case asserts the
  summary reflects the payment, which needs the summary route. So "S-02 is on disk", read against
  today's tree, starts phase 2 against a file and a route that S-02 phase 3 has yet to write. Phase 4
  needs S-02 phase 4.
- **Fix**: Replace the blanket prerequisite with a per-phase one: phase 1 needs S-02 phase 1 only and
  can start now; phases 2 and 3 need S-02 phase 3 as well as phase 2; phase 4 needs S-02 phase 4.
  Record the facts now verified, that S-02's members migration is `0003_members.sql` so the
  `0005`/`0006` assumption holds pending S-02 phase 3, and that `hasDependents` landed with the
  signature the plan consumes, and keep the numbering check as the first act of phase 2.
- **Decision**: PENDING

### F3 - The overlap check has no defined shape for a candidate that has no id yet

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: Phase 1, change 3 (plan.md:224-230); Phase 3, change 6 (plan.md:628-631)
- **Detail**: `findScheduleOverlap(existing: RecurringSchedule[], candidate: RecurringSchedule)`
  requires `candidate.id`, and ignoring the stored row with that id is the self-collision guard that
  makes an edit work. On `POST` there is no id: the repository generates it with
  `crypto.randomUUID()` inside `create`, which is the pattern the plan states for payments at
  plan.md:398. The route therefore has nothing to pass, and the implementer either invents a
  placeholder id or moves generation into the route and changes the repository contract.
- **Fix**: Type the candidate as
  `{ id: string | null; memberId: string; startMonth: MonthStr; endMonth: MonthStr | null }` and say
  that a null id matches no stored row, with one unit case covering the create path alongside the
  existing "candidate matching its own stored id" case.
- **Decision**: PENDING

### F4 - Whether `member_id` is patchable on a schedule is unstated, and two rules depend on the answer

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: Architectural Fitness
- **Location**: Phase 3, change 2 (plan.md:557-563); Phase 3, change 6 (plan.md:633-636)
- **Detail**: The payments PATCH is explicit: it re-runs "the date rule when a date is supplied and
  the owner rule when a member is supplied" (plan.md:447-449). The schedule PATCH is specified only
  as "the partial strict form rejecting an empty body", with `end_month` nullability called out and
  the field list left open, and the route contract says the merged row is judged on month ordering,
  the start-month rule and the overlap.

  If `member_id` is patchable, two things the plan does not say become load-bearing: the overlap must
  be read with `listForMember` for the *merged* member rather than the stored one, or moving an
  arrangement onto a second participant who already has one passes the check and double-counts that
  participant's months; and the owner refusal must be re-run, or a schedule can be moved onto the
  owner by PATCH after being refused at POST. If it is not patchable, the schema must exclude it so
  a body carrying it is a 400 naming the field, in the same shape as S-02's refusal of `start_month`.
- **Fix**: Name the patchable fields of `patchScheduleSchema` explicitly. If `member_id` is among
  them, add to the PATCH contract that the overlap is read for the merged member and that the owner
  refusal re-runs, with one integration case for each. If it is not, say so and add the 400 case.
- **Decision**: PENDING

### F5 - Schedules are listed with no ordering, so the section and its tests depend on SQLite's row order

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: Phase 3, change 1 (plan.md:548-549); Phase 3, change 3 (plan.md:577-588); Phase 4,
  change 3 (plan.md:771-772)
- **Detail**: Payments get an explicit `ORDER BY date DESC, created_at DESC` with the stated reason
  that "the screen does no sorting of its own" (plan.md:398-400). Schedules get none, and the
  migration deliberately drops `created_at` from both new tables on the grounds that "neither is ever
  ordered by when it was entered". Meanwhile phase 4 draws "one block per participant with an
  arrangement" from that list, and phase 3's integration cases read schedules back and assert their
  fields. With no `ORDER BY`, the order is whatever the query plan returns, which is stable enough to
  pass today and free to change when an index or a row count changes.
- **Fix**: Give `list` an `ORDER BY` on `member_id` then `start_month` ascending, and say so in the
  repository contract beside the payments ordering rule.
- **Decision**: PENDING

### F6 - The stated reason for refusing an owner payment is wrong, and the refusal is the only thing holding the headline card together

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: Blind Spots
- **Location**: Critical implementation details (plan.md:170-173); Phase 2, change 6
  (plan.md:443-445)
- **Detail**: The plan justifies the refusal by saying money recorded against the owner "would be
  counted nowhere and visible nowhere". That is not what the shipped calculation does.
  `computeSummary` in `src/domain/calc.ts` derives `manualCollectedThisMonth` from `state.payments`
  filtered by date alone, with no member filter, while `recurringCollectedThisMonth` iterates
  `nonOwnerMembers` and `totalCollected` sums only the non-owner member rows. An owner payment dated
  in the current month therefore moves `collectedThisMonth` and moves nothing else: the collected
  versus expected card reads higher than any balance on the screen explains, and the two cannot be
  reconciled by looking at them.

  The refusal is the right call. The reason given for it is wrong, it is stated in the one document
  the implementer reads, and the defence is a single route check with no test behind it in the layer
  where the asymmetry actually lives.
- **Fix**: Correct the sentence to say what happens, and close the asymmetry in the domain:
  `manualCollectedThisMonth` filters to non-owner members, which is an additive change inside
  `computeSummary` with no signature change and no summary shape change, pinned by one unit case
  asserting that a payment whose member is the owner does not move `collectedThisMonth`. Keep the
  route refusal as the primary guard; the filter is what makes the invariant true in the layer the
  tests already cover.
- **Decision**: PENDING

### F7 - The residual-helper precondition resolves the wrong way against the code that exists, and its fallback contradicts D-006

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: Phase 1, change 4 (plan.md:250-253); Success criteria (plan.md:311-312); Progress row
  1.5 (plan.md:996)
- **Detail**: The precondition reads "a search: if S-02 landed a caller after all, the helper stays,
  it gains the charged-count argument D-006 describes, and this change becomes that instead", and the
  criterion is "a search for `ownerResidualForMonth` across `src/` returns nothing, or it returns the
  caller that kept it alive".

  A search across `src/` today returns `src/domain/money.test.ts:2`, `:13` and `:18`. Those are
  callers. A literal reading keeps the helper and widens it with the charged-count argument, which is
  exactly what `context/decisions/D-006-owner-member-and-zero-active-invariant.md` records as
  rejected after review, with `ownerShareThisMonth` on the summary as the replacement. The criterion
  also passes in both branches, so nothing catches the wrong turn.

  The removal itself is safe and this review confirms it: the two assertions in `money.test.ts` that
  use the helper are the month-balances invariant and the zero-active case, and both are already
  covered without it at `src/domain/calc.test.ts:127` (`ownerShareThisMonth` is 10000 with nobody
  active) and `src/domain/calc.test.ts:233`
  (`expectedThisMonth + ownerShareThisMonth` equals the price). Deleting the helper and those two
  assertions loses no coverage.
- **Fix**: Scope the criterion to callers outside `src/domain/money.test.ts`, and replace the
  fallback branch with a note that D-006 rejected the charged-count widening, so a surviving
  non-test caller is a finding to raise rather than a branch to take. Add a line recording that the
  balancing and zero-active assertions survive in `calc.test.ts`, so the deletion is not re-litigated
  during implementation.
- **Decision**: PENDING

### F8 - Three grounding errors in the plan text

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: Phase 1, change 5 (plan.md:257-262); Overview (plan.md:11-12) and plan-brief Scope;
  Risk mapping (plan.md:939-940)
- **Detail**: (a) The unit-test step says its files "extend files S-02 created; a case S-02 already
  pins is not repeated". `src/domain/months.test.ts` and `src/domain/calc.test.ts` exist;
  `src/domain/payments.test.ts` and `src/domain/recurring.test.ts` do not and cannot, because
  `src/domain/payments.ts` and `src/domain/recurring.ts` are created by this slice. Two of the four
  are new files and the instruction to avoid duplicating S-02's cases does not apply to them.
  (b) The Overview and the brief both say "nine routes". The phases specify five (plan.md:330) plus
  seven (plan.md:623), which is twelve. The count matters because "every new route answers 401
  without a cookie, asserted per route rather than once" is an automated criterion in two phases.
  (c) The risk-4 row of the risk-mapping table is split across plan.md:939 and plan.md:940, so line
  940 falls out of the table and renders as loose text below it.
- **Fix**: Say which two test files are new; change "nine routes" to twelve in both documents; join
  lines 939 and 940 into one table row.
- **Decision**: PENDING

### F9 - Two boundary details the plan leaves to the implementer to discover

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: Phase 3, change 1 (plan.md:541-543), change 3 (plan.md:577-588) and change 5
  (plan.md:613-615); Phase 2, change 8 (plan.md:470-472)
- **Detail**: (a) The exceptions table column is `schedule_id` and the domain field is `recurringId`,
  which `src/domain/calc.ts` reads as `exception.recurringId === schedule.id`. The plan names the
  `tag` to `kind` mapping twice, at plan.md:85-87 and plan.md:373-374, and says nothing about this
  one, in the same phase whose loader fills `state.recurringExceptions`. A repository that returns
  `schedule_id` produces an exception list that silently matches nothing, which looks exactly like a
  participant who never missed a month.
  (b) The two new integration files need their own client-address prefixes, and the ones this plan
  might have expected are taken. The Better Auth limiter in `src/server/auth.ts` is
  `window: 60, max: 10` keyed on `cf-connecting-ip`, the integration database is shared and never
  reset, and `tests/integration/accounts.ts:13-15` now records `10.0.0.x` through `10.3.0.x` as in
  use and holds `10.4.0.x` and `10.5.0.x` for the two files S-02 phase 3 adds. This slice's two files
  are therefore `10.6.0.x` and `10.7.0.x`. The plan says only "a client address unique to the test",
  which is ambiguous between one address per file and one prefix per file; one fixed address for two
  seeded accounts is how this suite goes flaky.
- **Fix**: Name the `schedule_id` to `recurringId` mapping in the phase 3 repository and loader
  contracts. Reserve `10.6.0.x` for `payments.test.ts` and `10.7.0.x` for `recurring.test.ts`, and
  extend the constraint line at `tests/integration/accounts.ts:13-15` with both.
- **Decision**: PENDING

## What is right, and worth not disturbing

Most of this plan is unusually well grounded and its shape should survive triage unchanged.

The rules land before the tables, as pure predicates over values, which is what turns the four
boundaries the test plan names into unit tests rather than browser runs, and it is the reason phase 1
can start before S-02 phase 2 commits. The paired-test discipline for the assumed-receipt rule, one
pair per disqualifying condition against the same state so the only difference is the condition under
test, is the right answer to the anti-pattern the test plan names for risk 4, and asserting the
not-yet-elapsed bound twice, once against the rule with the current month as its own argument and
once through `computeSummary`, is exactly the residual failure S-02's revision left behind.

Ownership is extended by one more join rather than re-established, and the plan correctly identifies
that a payment is two levels down and that a single statement carrying payment to member to
subscription to user turns a foreign child, a child reached through a foreign member and a child
reached through a foreign subscription into one answer. Registering `requireSession` per module with
a per-route 401 assertion is the right response to a failure mode where forgetting it leaves every
cookie-carrying test green.

Nothing derived is stored. There is no balance column, no collected total and no paid-through month,
which is what makes US-02's third acceptance criterion true by construction rather than by a
recomputation step, and the performance argument for not caching is honest about the scale.

Both migrations are syntactically sound and copy `0002_subscriptions.sql` and `0003_members.sql`
exactly: quoted identifiers, no `IF NOT EXISTS`, cascade on every foreign key, `GLOB` checks as tight
as they go with the residual gap closed by Zod, and a table-level `end_month >= start_month` CHECK
that is genuinely expressible because both columns sit on one row. Declining a separate index on
`recurring_exceptions(schedule_id)` because the composite primary key already leads with it is
correct. Refusing the overlap in the route rather than pretending SQLite can express it, and
accepting the resulting race explicitly rather than engineering against it, is the right call at one
organizer per subscription.

Dropping the exceptions a narrowed arrangement no longer contains, in the same batch as the edit, is
the kind of detail that is invisible until a widening resurrects a correction made against different
months, and catching it in the plan rather than in a bug report is the plan doing its job. So is
putting `hasDependents` in the repository rather than the route because the cascade means a delete
reaching SQL has already destroyed the history.

Lean Execution passes without a finding. Every phase earns its place, the scope boundaries hold under
inspection, and there is no premature abstraction anywhere in the five phases.

## Resolution

Every finding was re-checked against the landed code before being acted on, and every citation held.
`ownerResidualForMonth` has exactly three call sites, all in `src/domain/money.test.ts`, and the two
properties they assert are already covered through `computeSummary` in `src/domain/calc.test.ts`.
`manualCollectedThisMonth` filters by date alone while `totalCollected` and
`recurringCollectedThisMonth` are non-owner only. `hasDependents` is on disk with the four-argument
signature and an unconditional `false`, behind a member DELETE route that already answers 409 on it.
`migrations/0003_members.sql` carries `members` and `active_ranges`. While this revision ran, S-02
phase 3 landed at `b805445`, bringing `migrations/0004_prices_and_breaks.sql`, the state loader, the
summary route, and `src/domain/month-status.ts` with decision D-009, which makes F1's fix smaller than
the review specified; that row records how. It also settles two of the review's open hedges: the
`0005` and `0006` identifiers are now the next free numbers rather than an assumption, and the
client-address prefixes `10.4.0.x` and `10.5.0.x` went to `prices.test.ts` and `summary.test.ts`, so
F9's reservation of `10.6.0.x` and `10.7.0.x` is against the landed file rather than against a plan.
The client-address comment in `tests/integration/accounts.ts` records `10.0.0.x` to `10.3.0.x` as
taken. The phases specify five routes and seven routes, which is twelve, not nine. Resolved in
`plan.md`, `plan-brief.md` and a new
`context/decisions/D-008-one-source-for-a-counted-month.md`, written to sit alongside D-009 rather
than to duplicate it.

| Finding | Decision | What changed |
|---|---|---|
| F1 | Accepted, Fix A, smaller than specified because S-02 met it half way | The review's blind-spot note asked whether S-02's screen would already hold what the fix needs. More than that: while this revision ran, S-02 phase 3 landed `src/domain/month-status.ts` with `memberMonthStatus(state, member, month, current)` returning `{ counts, reason }` over a named `MonthExclusion`, re-expressed `recurringReceived` to defer three of its six conditions to it, and recorded it as decision D-009, which says in as many words that S-03's helper should be built over it. So `scheduleMonths` is gone and phase 1 change 3 specifies `scheduleMonthStatuses(inputs, member, schedule, exceptionMonths, current)`, built over `memberMonthStatus`: the row set is the arrangement's own start month, end month and the current month; each row is `memberMonthStatus`; and the exception, the one condition that module does not own, is applied last. This slice therefore adds one condition and one reason, `MonthExclusion` gaining `'excepted'`, rather than a second vocabulary beside `break-month` and `outside-active-range`. Two departures from the review's wording, both recorded in D-008: the helper does not take a `SubscriptionState`, because the browser has none and would have had to fabricate empty price history and payments, so `memberMonthStatus`'s first parameter is narrowed to `Pick<SubscriptionState, 'settings' \| 'breakMonths'>`, which every existing caller satisfies structurally; and phase 1 change 4 re-expresses `recurringReceived` over the new helper too, not only the screen, so the arrangement's range and the exception stop being written inline. The plan also records which three `MonthExclusion` values are unreachable here and why, so the screen's phrase mapping is total. Phase 4 change 3 draws the toggle and the per-month label from one call and puts the toggle only on months that count or are excepted. New criteria 1.8 and 1.9 assert that exactly one export decides whether a month counts for a member and that the two answers are the same set of months, not the same total. New manual criterion 4.14 puts a break month and a departure inside an arrangement and checks both are drawn as not counted with the reason named. Fix B is rejected in D-008 for the reason the review gives: it changes the summary shape and still leaves the per-month labels wrong. The Overview no longer claims the slice adds no new kind of problem; it names what is new. |
| F2 | Accepted | Prerequisites is now per phase. Phase 1 needs S-02 phase 1 only and is startable now, in parallel with S-02 phase 3. Phases 2 and 3 need S-02 phase 3 for `src/server/db/subscription-state.ts` and `src/server/routes/summary.ts`, and phase 3 also for `tests/integration/summary.test.ts`. Phase 4 needs S-02 phase 4. Phase 5 needs nothing from S-02. Each phase overview carries its own prerequisite line and its first act. The verified facts are recorded: `0003_members.sql` on disk, `hasDependents` with its signature, the 409 branch reachable only from here. Current state analysis is rewritten against the tree rather than against S-02's plan. Added: a coordination step, since S-02 phase 3 may land the month classification itself. Phase 1's first act is a search of `src/domain/` for such an export; if one exists it is adopted and extended, if not it is created, and criterion 1.8 asserts there is exactly one either way. |
| F3 | Accepted | `findScheduleOverlap` takes `ScheduleCandidate`, `{ id: string \| null; memberId; startMonth; endMonth }`, with a null id matching no stored row, and the plan says why: `create` generates the identifier inside the repository, so `POST` has none to pass and must not invent a placeholder or move generation into the route. The unit case list gains the null-id create case beside the existing matching-own-id edit case. |
| F4 | Accepted, with `member_id` patchable | `patchScheduleSchema` names its fields: `member_id`, `amount`, `start_month`, `end_month`, which is every column. `member_id` is patchable because an arrangement entered against the wrong participant is an ordinary correction and the payments PATCH already allows the move; the asymmetry would have been the odd choice. Both consequences the review names are now in the route contract: the overlap is read with `listForMember` for the merged member, and the owner refusal re-runs on the merged row, so the rule cannot be walked around by creating then patching. Three integration cases added: moving onto an occupied participant returns 409, moving onto the owner returns 400, and a patch naming any other field returns 400. One point the review did not raise is recorded: a member change drops no exceptions, because they are keyed by schedule and month, so only a narrowed month range does that. |
| F5 | Accepted | `list` orders by `member_id` then `start_month` ascending and `listForMember` by `start_month` ascending, stated in the repository contract beside the payments ordering rule and for the same reason, with the note that neither table carries `created_at` so entry order is neither available nor wanted. |
| F6 | Accepted, both halves | The sentence in Critical implementation details is corrected to say what actually happens: an owner payment moves `collectedThisMonth` and nothing else, so the collected-versus-expected card reads higher than any balance on the screen explains and the two cannot be reconciled. The route refusal stays the primary guard. Phase 1 change 4 gives `manualCollectedThisMonth` the non-owner filter `totalCollected` and `recurringCollectedThisMonth` already have, pinned by a unit case asserting that a current-month payment naming the owner does not move `collectedThisMonth` while the same payment naming a participant does. |
| F7 | Accepted | Criterion 1.5 is retired and replaced by 1.10, scoped to the actual state: a search returns nothing after the change, and before it returns only `money.ts` and `money.test.ts`. The fallback branch is gone; the plan now records that D-006 rejected the charged-count widening, so a caller outside that test file is a finding to raise rather than a branch to take. The change also records that the month-balances and zero-active assertions survive in `src/domain/calc.test.ts`, so the deletion loses no coverage and is not re-litigated during implementation. |
| F8 | Accepted, all three | (a) The unit-test change says which two files are extended, `months.test.ts` and `calc.test.ts`, and which two are new, `payments.test.ts` and `recurring.test.ts`, with the note that nothing in a new file can duplicate an S-02 case. (b) "nine routes" is twelve in the Overview and in the brief's Scope. (c) The risk-4 row is one line again, and it gains the set-equality case and phase 4. |
| F9 | Accepted, both | (a) The `schedule_id` to `recurringId` mapping is named in the phase 3 repository contract, in the loader contract and in Key findings, each time with what goes wrong without it: an exception list that matches nothing looks exactly like a participant who never missed a month. (b) Phase 2 reserves the `10.6.0.` prefix and phase 3 the `10.7.0.` prefix, one address per seeded account rather than one per file, with the reason and the existing assignments recorded, and phase 2 extends the comment at the top of `tests/integration/accounts.ts`. |

**Scope honesty.** "What we are NOT doing" no longer says the slice makes no domain concept and moves
nothing but the three arrays. It now says what holds, which is that no calculation signature and no
response shape changes, `MemberSummary` keeps its single `paid` field, and two function bodies do
change: `recurringReceived` re-expressed over the helper, and `manualCollectedThisMonth` filtered to
non-owners. The month status is named as the one new domain concept this slice adds.

**Progress rows.** Existing step titles are unchanged. One row was removed and four added. Removed:
1.5, whose title encoded the branch F7 rejected, leaving a gap. Added: 1.8, 1.9 and 1.10 in phase 1,
and 4.14 in phase 4. No index was reused and none was renumbered.

Nothing in the review was rejected or deferred. F1 was resolved by the fix the review recommended,
strengthened so that the server's own total reads the new helper rather than only agreeing with it,
and F4 was resolved by the branch that keeps `member_id` patchable, which costs two rules on the
merged row and two integration cases.
