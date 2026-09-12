# Implementation plan: payments and recurring

## Overview

Give the ledger its other half. S-02 decides what every participant owes; this slice records what
they actually paid, standing orders that keep paying without monthly data entry, and the single
months of those standing orders that did not arrive. Every balance moves accordingly, and the
interface never shows assumed money as confirmed money. This is roadmap item S-03, source refs
US-02, FR-015 to FR-021, FR-025 and FR-026.

Three tables hang off records S-02 created, twelve routes follow conventions S-01 and S-02 fixed, and
the calculation they feed is already written and already unit tested against a literal state. Two
things are new. The assumed-receipt rule becomes reachable from outside, which is the half of
test-plan risk 4 that S-02 left open by design. And the screen shows, for the first time, a number the
domain derives rather than one the server hands it: which months of a standing order counted, and
which did not. That second one decides whether FR-026 holds, and the screen can get it wrong on its
own, so the rule that answers it lives in one function that both the calculation and the screen read.
Decision D-008.

## Current state analysis

S-01 is on main: sessions, two seeded accounts, the `subscriptions` table with its repository and
four routes, and the ownership rule enforced inside the repository's SQL.

S-02 lands in phases, and two of them are on disk. Its phase 1 brought the whole domain module
(`types.ts`, `months.ts`, `money.ts`, `members.ts`, `calc.ts`), with `Payment`, `RecurringSchedule`
and `RecurringException` declared and `recurringReceived`, `balanceForMember` and `computeSummary`
already written against them. Its phase 2 brought `migrations/0003_members.sql` with `members` and
`active_ranges`, the members repository, routes and validation, and `hasDependents` in
`src/server/db/members.ts` with exactly the `(db, subscriptionId, memberId, userId)` signature this
slice consumes, returning `false` with every parameter unused. The member DELETE route in
`src/server/routes/members.ts` already answers 409 on it, so that branch exists and is unreachable
until this slice gives the seam its clauses.

Its phase 3 brought `migrations/0004_prices_and_breaks.sql`, the price and break-month repositories
and routes, `src/server/db/subscription-state.ts` returning the three ledger arrays empty with a note
saying this slice fills them, `src/server/routes/summary.ts`, `tests/integration/summary.test.ts`, and
`src/domain/month-status.ts`, whose `memberMonthStatus` this slice builds its own month helper over.
What is left is S-02 phase 4, the detail screen, and phase 5. Its plan stays authoritative for those
and this slice consumes it rather than re-deciding any of it. Which phase of this slice waits on which
is in Prerequisites below, per phase rather than as one gate.

No calculation signature has to change and the summary keeps its shape. Two things inside the
calculation do change, both inside function bodies. `recurringReceived` is re-expressed over the
schedule-level month helper this slice adds, which itself defers to S-02's `memberMonthStatus`, so
the last conditions still written inline in its loop, the arrangement's two months and the
exception, stop being written twice. `manualCollectedThisMonth` starts excluding the owner, so
`collectedThisMonth` cannot move for money no balance on the screen explains. Otherwise there is no
`payments` table, no `recurring_schedules` table, no `recurring_exceptions` table, no route that can
write one, and no screen that can show one. A standing order cannot be stored, so the stored half of
test-plan risk 4 cannot be tested.

The prototype at `spotify-family-split` has a complete tested version of this accounting and was read
as a source of semantics only. Nothing is copied from it. Its rules, the four boundaries that make
the assumed-receipt rule hard, and the two rules the requirements imply but never spell out, are
recorded in `context/changes/payments-and-recurring/research.md`.

## Desired end state

The organizer opens a subscription and records a payment from a participant with a date, an amount, a
note and whether it was a one-off or a yearly lump sum. It appears at the top of a list showing the
newest first, and every balance moves by exactly that amount. They correct the payment and the
balance follows; they delete it and the balance returns to where it was. They record that a
participant sends a fixed amount every month from a given month, optionally until a given month, and
from then on that participant's months are counted without further entry, labelled as assumed
received rather than as recorded. When one month of that arrangement does not arrive, they mark that
month unpaid and only that month stops counting.

The acceptance example from the requirements holds: a plan costing 100.00 PLN with the owner and two
participants gives each participant a share of 33.33, and a participant who pays 20.00 shows a
balance of -13.33. A payment dated before the plan's first month is refused and nothing is stored. A
payment dated in the future is accepted and counts as credit now. A standing order contributes
nothing for a month that is skipped, not yet elapsed, outside the participant's active range or
marked as not received. A participant with payments or a standing order cannot be deleted. A second
account asking for any of the new records, by any route and any verb, is told they do not exist.

### Key findings

- S-02's `SubscriptionState` already carries `payments`, `recurring` and `recurringExceptions`, and
  `loadState` already returns them empty with a note naming this slice. Filling them is three reads in
  one function, and no calculation signature changes. This is why S-02 typed them early.
- S-02's revision makes the current month an explicit fourth argument to `recurringReceived` and to
  `balanceForMember`, so the not-yet-elapsed bound is the sixth condition inside the rule rather than a
  property of whatever month list a caller happens to pass. What is left to lose is the threading: this
  slice adds no new caller of either function, and asserts the bound twice, once against the rule and
  once through `computeSummary`, because those two can only disagree if the argument is passed wrongly.
- A schedule overlap cannot be an index. SQLite has no exclusion constraint, so unlike S-02's
  one-owner partial unique index this rule is a read-then-check in the route. The consequence is a
  race between two concurrent writes for one member, which at one organizer per subscription is not
  worth engineering against and produces a visible double count rather than a corrupted ledger.
- `recurring_exceptions(schedule_id, month)` as a composite primary key already indexes every lookup
  by schedule, so no separate index on `schedule_id` is added. Same reasoning S-02 applies to
  `price_history` and `break_months`.
- A `GLOB` pattern and a regular expression both admit `2025-02-30`. FR-015 asks for a real date, so
  the check reconstructs the date and compares its parts back. It is a pure predicate, so it sits in
  the domain beside the month arithmetic and the Zod schema refines on it, keeping validation one
  contract.
- Payments and schedules are two levels below the account: payment to member to subscription to user.
  One statement carries the whole chain, so a foreign payment, a payment reached through a foreign
  member, and a member from another subscription are one answer.
- The payment column is `tag` and the S-02 domain field is `kind`. The repository maps between them at
  the boundary, exactly as it maps `start_month` to `startMonth`. The wire and the domain agree; only
  SQL differs. The exceptions table has the same shape of mismatch and it is the dangerous one: the
  column is `schedule_id` and the domain field is `recurringId`, which `src/domain/calc.ts` reads as
  `exception.recurringId === schedule.id`. A repository that returns `schedule_id` produces an
  exception list that matches nothing, which looks exactly like a participant who never missed a month.
- Six conditions decide whether a month of a standing order counted, and S-02 phase 3 has already
  moved three of them out: `memberMonthStatus` in `src/domain/month-status.ts` answers whether a month
  counts for a member and names the condition that failed, and `recurringReceived` defers to it for the
  elapsed bound, the break month and the active range. What stays inline in `recurringReceived` is the
  arrangement's own start and end months and the exception. The screen needs the same answer per month
  and the reason a month did not count, and it can get neither from the summary: `MemberSummary`
  carries a single `paid` field with no recorded-versus-assumed split, and the response has no
  per-month anything. So this slice finishes the move rather than starting it: `scheduleMonthStatuses`
  adds the arrangement's three conditions and the exception on top of `memberMonthStatus`,
  `recurringReceived` sums over it, and the screen labels from it. Decisions D-008 and D-009.
- `computeSummary` derives `manualCollectedThisMonth` from `state.payments` filtered by date alone,
  with no member filter, while `totalCollected` sums only the non-owner rows and
  `recurringCollectedThisMonth` iterates the non-owner members. A payment recorded against the owner
  would therefore move `collectedThisMonth` and move nothing else, so the collected-versus-expected
  card would read higher than any balance on the screen explains. The route refusal is the primary
  guard; the filter is what makes the invariant true in the layer the unit tests reach.

## What we are NOT doing

- No status grid, no per-month per-member cell status and no first-in-first-out attribution of funds
  against months. The requirements ask for a balance per participant, which needs none of it, and
  S-02 already declined it.
- No coverages, no opening balances carried in from a previous spreadsheet, no charts and no month
  series. All four are non-goals in the requirements.
- No spreading of a yearly lump sum across the months it covers. FR-016 records that counter-argument
  and rejects it: it is an ordinary payment that happens to be large.
- No negative payment amount and therefore no refund record. A correction is an edit or a delete,
  which is what US-02 describes.
- No upper bound on a payment date. FR-018 allows the future deliberately and records the typo
  counter-argument as answered.
- No reminder, no notification and no participant-facing view of a payment. Participants are records,
  not users.
- No change to the parameter list or the return type of any calculation from S-02, and no change to
  the summary route's shape. `MemberSummary` keeps its single `paid` field: the recorded-versus-assumed
  distinction is drawn on the screen from the month-status helper rather than added to the response,
  which was the alternative D-008 rejected. Two things inside the calculation do move, and neither is a
  parameter list or a response shape: `recurringReceived` is re-expressed over that helper, and
  `manualCollectedThisMonth` gains the non-owner filter `totalCollected` already has. Two things at the
  type level do move, in `src/domain/month-status.ts` and in phase 1: `memberMonthStatus`'s first
  parameter is narrowed from `SubscriptionState` to `Pick<SubscriptionState, 'settings' |
  'breakMonths'>`, which every existing caller satisfies structurally, and `MonthExclusion` gains
  `'excepted'`, which no caller of `memberMonthStatus` can produce. Both widen what the module accepts
  rather than what it demands, so no caller changes and no behaviour a caller can observe changes. The
  month status is a new named concept in the domain, and it is the only one this slice adds.
- No deployment, no remote database and no browser end-to-end test. S-04 owns all three; this slice's
  browser pass is a manual checklist with captured evidence.

## Implementation approach

Test-first for phases 1 to 3. Both of this slice's silent failures live there: a standing order
counted for a month it should not cover looks exactly like a well-paid participant, and a leaked
record looks exactly like an empty one. Each of those phases writes the failing test first and
watches it fail for the stated reason.

The rules land before the tables, as pure functions over values, so the four boundaries the test plan
names are unit tests rather than browser runs. Then payments, which are the simpler table and the one
the acceptance example needs. Then standing orders and their exceptions, which is where the assumed
part of the ledger and the member delete rule both close. Then the screen, then the evidence.

Ownership is extended, not re-established. Every new statement joins back through `members` to
`subscriptions` and filters `s.user_id = ?` in the same query, so a foreign child, a child reached
through a foreign member and a child reached through a foreign subscription all fail the same
predicate and all become 404.

Nothing derived is stored. There is no balance column, no collected total and no paid-through month
anywhere in the new schema, which is what makes "editing or deleting the payment moves the balance
back correspondingly" true by construction rather than by a recomputation step that can be forgotten.

### Prerequisites

S-02 lands in phases, so the gate is per phase rather than one blanket condition. Phases 1 to 3 are on
disk and verified against the tree rather than assumed: `migrations/0003_members.sql` carries `members`
and `active_ranges` and `migrations/0004_prices_and_breaks.sql` carries prices and break months, so the
`0005` and `0006` identifiers are settled rather than provisional; `hasDependents` exists with the
four-argument signature this slice consumes and returns `false` with every parameter unused, behind a
member DELETE route that already answers 409 on it; `src/server/db/subscription-state.ts` returns the
three ledger arrays empty with a note naming this slice; `src/server/routes/summary.ts` and
`tests/integration/summary.test.ts` exist; and `src/domain/month-status.ts` exports
`memberMonthStatus`, which change 3 builds on. S-02 phase 4, the detail screen, is what remains.

- **Phase 1** needs S-02 phase 1 only, which is on disk. It is startable now and runs in parallel with
  S-02 phase 3. Its first act is the helper check below.
- **Phase 2** needs S-02 phase 3 as well as phase 2: `src/server/db/subscription-state.ts` to gain the
  payments read, and `src/server/routes/summary.ts` for the last integration case, which asserts the
  summary reflects a stored payment. Both have landed, and prices and break months took `0004`, so
  this phase's migration is `0005` and the numbering hedge is spent.
- **Phase 3** needs S-02 phase 3 for the same two files, plus `tests/integration/summary.test.ts`,
  which has landed and which this phase extends rather than creates.
- **Phase 4** needs S-02 phase 4: `src/client/screens/SubscriptionDetail.tsx` and whatever shape
  `src/client/api.ts` landed with. Its first act is to confirm that screen already reads the members
  with their active ranges and the subscription's break months, because the month-status helper needs
  both. S-02's plan gives the screen a members section and a break-months section, so it should; if
  either read is missing, phase 4 adds it, which is one more call through the existing client module.
- **Phase 5** needs phases 1 to 4 of this slice and nothing further from S-02.

**The month-status helper is S-02's, and this slice builds on it rather than beside it.** S-02 phase 3
landed the per-month classification: `src/domain/month-status.ts` exports
`memberMonthStatus(state, member, month, current)` returning `{ counts, reason }` with a named
`MonthExclusion` per condition, and `recurringReceived` already defers the elapsed bound, the break
month and the active range to it, keeping only the arrangement's start month, its end month and the
exception inline. Decision D-009 records it and says in as many words that S-03's helper should be
built over it rather than re-deriving those conditions. Change 3 does exactly that, and criterion 1.8
asserts afterwards that exactly one export in `src/domain/` decides whether a month counts for a
member.

Two things phase 1 checks in its first minutes and adjusts in place if they moved: which recurring and
payment cases S-02's unit suite already pins, so this slice extends those files without duplicating a
case; and whether any caller of `ownerResidualForMonth` appeared outside `src/domain/money.test.ts`,
which change 5 treats as a finding to raise rather than a branch to take.

## Critical implementation details

**The current month is threaded, never inferred a second time.** S-02 makes it an explicit argument
to `recurringReceived` and `balanceForMember`, and `computeSummary` derives it once from the
subscription's own time zone. This slice adds no new caller of any of the three: the summary route
stays the only entry point into the calculation, no payment or standing-order route computes a month
of its own, and the screen takes the current month from the summary response rather than from the
browser. A second source would let an open-ended arrangement claim a month that has not arrived, in a
way no test of the rule itself would see, and `AGENTS.md` already forbids the derivation that
produces it.

**One function decides whether a month of a standing order counted, and it says why.**
`scheduleMonthStatuses` in `src/domain/recurring.ts` enumerates an arrangement's elapsed months and
resolves each one through `memberMonthStatus`, adding the one condition that module does not own, the
exception. `recurringReceived` adds the amounts of the months it reports as counting, and the
standing-order section draws both its toggle grid and its per-month labels from the same call. D-009
already says this helper should be built over `memberMonthStatus` rather than re-deriving the break
month and the active range for itself, and that is what keeps both decisions' one-place claim true at
once. The alternative, which is what this plan specified before review, was a
`scheduleMonths` list carrying no status at all. The screen would then have applied the start month,
the end month and the current month, and possibly the exceptions, which the API view attaches to the
schedule; nothing would have given it break months or the member's active ranges. A month the server
excluded would have been drawn as a counted month labelled assumed received, visually identical to one
that counted, and the organizer would read five assumed months against a balance reflecting three with
no way to tell which two were dropped or why. That is the FR-026 failure this slice exists to prevent,
and it is the one the screen can cause without the server being wrong about anything. Decision D-008.

**Every new route module registers its own session middleware.** Routers are mounted at `'/'` and own
their absolute paths, so middleware does not cascade between them. Both new modules register
`requireSession` for `/api/subscriptions/*` before declaring anything. A module that omits it ships
unauthenticated and every test that sends a cookie still passes, so the integration suite asserts a
401 without a cookie for every new route individually, never once for the group.

**A narrowed schedule drops the exceptions its new range no longer contains, in the same batch as the
edit.** Otherwise the row survives, contributes nothing while the range is narrow, and silently
returns if the organizer later widens the arrangement again, applying a correction they made against
a different set of months. The delete and the update are one `db.batch([...])` because D1 has no
interactive transaction.

**The member delete rule must refuse before the cascade runs, not after.** `payments.member_id` and
`recurring_schedules.member_id` both cascade on delete, so a member delete that reaches SQL takes
their whole history with it. The refusal is `hasDependents`, which this slice gives its two clauses,
and it is checked in the repository rather than in the route so no future path can skip it.

**A payment or a schedule naming the owner is refused, and the calculation stops being asymmetric
about it.** The owner is never owed from and does not appear in the per-member summary list, so money
recorded against them moves no balance the screen shows. It does not disappear, though, which is what
this plan claimed before review. `computeSummary` derives `manualCollectedThisMonth` from
`state.payments` filtered by date alone, with no member filter, while `totalCollected` and
`recurringCollectedThisMonth` are both non-owner only. An owner payment dated in the current month
therefore raises the collected-versus-expected card and moves nothing else, and the two cannot be
reconciled by looking at them. The route answers 400 naming the member field, which is the same shape
as any other value the rules do not allow, and that stays the primary guard. `manualCollectedThisMonth`
also gains the non-owner filter its two siblings already have, so the invariant holds in the layer the
unit tests reach rather than resting on a single route check with no test beneath it.

## Phase 1: The ledger rules in the domain

### Overview

The pure predicates the routes need before any of them can refuse anything, the one helper the screen
and the calculation both read, and the unit cases that pin the assumed-receipt rule at its four
boundaries. Pure, with no import from D1 or Hono. Written test-first, because test-plan rollout phase
3 exists for exactly these cases.

**Prerequisite**: S-02 phase 1, which is on disk. This phase is startable now and runs in parallel
with S-02 phase 3. It begins with the month-status helper check in Prerequisites.

### Required changes:

#### 1. A real calendar date

**File**: `src/domain/months.ts`

**Purpose**: FR-015 asks for a real date, and both the database `GLOB` and a regular expression admit
`2025-02-30`. The predicate belongs beside the month arithmetic, where the one function allowed to
ask what time it is already lives.

**Contract**: `isCalendarDate(value: string): boolean`, true only when the value matches
`YYYY-MM-DD` and reconstructing it yields the same year, month and day, so a day that overflows its
month is rejected and a leap day is accepted in a leap year and rejected otherwise.
`monthOf(date: string): MonthStr` returns the first seven characters, with a one-line note that this
is a slice rather than a parse because the format is fixed and zero-padded. Both are used by the
validation layer and by nothing in the calculation.

#### 2. The payment date rule

**File**: `src/domain/payments.ts`

**Purpose**: US-02 rejects a payment dated before the plan's first month and accepts one dated in the
future. The rule needs the subscription's start month, so it cannot be expressed in a schema over the
body alone, and it mirrors how S-02 runs `validateActiveRanges` after the schema.

**Contract**: `validatePaymentDate(date: string, startMonth: MonthStr): string | null` returns null or
the violation as a message naming the field at fault: the value is not a real calendar date, or its
month precedes the subscription's first month. There is no upper bound; a future date is valid and
the message set says so by omission.

#### 3. The standing-order rules

**File**: `src/domain/recurring.ts`

**Purpose**: Two questions the routes ask and one the screen and the calculation both ask. The first
two are range arithmetic over a schedule; the third is the arrangement's range plus everything
`memberMonthStatus` already decides, in one place so the screen and the server cannot disagree.

**Precondition**: `scheduleMonthStatuses` below is written over `memberMonthStatus` in
`src/domain/month-status.ts`, which S-02 phase 3 landed. This change reads that module before it
writes, and if its names or shape have moved since, it adopts what is there rather than restating the
contract below.

**Contract**: `isMonthInSchedule(schedule: RecurringSchedule, month: MonthStr): boolean`, true when
`schedule.startMonth <= month` and either `endMonth` is null or `month <= endMonth`. The end month is
inclusive, so a schedule whose two ends are equal covers exactly one month.

`findScheduleOverlap(existing: RecurringSchedule[], candidate: ScheduleCandidate): RecurringSchedule | null`,
where `ScheduleCandidate` is
`{ id: string | null; memberId: string; startMonth: MonthStr; endMonth: MonthStr | null }`. It returns
the first stored schedule for the same member whose month range intersects the candidate's, ignoring
any stored schedule with the candidate's own id so an edit does not collide with itself. A null id
matches no stored row, which is the create path: `create` generates the identifier with
`crypto.randomUUID()` inside the repository, so `POST` has no id to pass and must not have to invent a
placeholder or move generation into the route. Two ranges intersect when each one's start is at or
before the other's end, with a null end treated as unbounded. Two schedules that touch, where one
starts in the month the other ended, are an overlap rather than a continuation, for the same reason
S-02 gives for active ranges: the month is the unit of account and an arrangement cannot stop and
restart inside one.

`scheduleMonthStatuses(inputs, member, schedule, exceptionMonths, current)` returns
`{ month: MonthStr; counts: boolean; reason: MonthExclusion | null }[]`, one row per elapsed month of
the arrangement, ascending. This is the single answer to which months of a standing order counted, and
it is what both the calculation and the screen read; nothing else applies any of the six conditions.

It is built over `memberMonthStatus` rather than beside it, which is what D-009 asks for. The row set
is the arrangement's own three conditions: from its start month to the earlier of its end month and
`current`, inclusive, and empty when the arrangement has not started. Each row is then
`memberMonthStatus(inputs, member, month, current)`, and a month that survives it and appears in
`exceptionMonths` becomes `excepted`. So `break-month` and `outside-active-range` are reported by the
module that already owns them, in the order it already checks them, and this slice adds exactly one
condition and one reason.

`MonthExclusion` in `src/domain/month-status.ts` gains `'excepted'`. That is an additive change to a
union the landed module exports; no existing value moves and no caller of `memberMonthStatus` can
produce the new one.

Three of that union's members are unreachable from this helper and the plan says so rather than
leaving it to be discovered: `not-yet-elapsed` cannot occur because the row set already stops at
`current`; `before-start-month` cannot, because a schedule's start month is refused below the
subscription's first month; and `owner-member` cannot, because a schedule naming the owner is refused
at `POST` and at `PATCH`. The reasons a row can actually carry are `break-month`,
`outside-active-range` and `excepted`, which are exactly the three the screen renders in words.

`inputs` is the same first argument `memberMonthStatus` takes, and phase 1 narrows that parameter's
type from `SubscriptionState` to `Pick<SubscriptionState, 'settings' | 'breakMonths'>`, which is
everything that function reads and everything this one adds. `SubscriptionState` satisfies it
structurally, so every caller in the calculation compiles unchanged and nothing about the server path
moves. `chargedMonthStatus` beside it keeps the whole state, because `priceForMonth` needs the price
history: only the member-month half narrows, which is the half D-009 keeps separate by name.

The reason for narrowing at all is the browser: the detail screen has the subscription's settings and
its break months, and it has no price history and no payment list, so a parameter typed as the whole
state would have forced it to synthesise one with fabricated empty fields, and the fabrication
would keep compiling on the day someone adds a condition that reads one of them.

#### 4. The calculation reads the month status, and stops counting owner money as collected

**File**: `src/domain/calc.ts`

**Purpose**: Finish the move S-02 phase 3 started, so that no condition deciding whether a month
counted is written in two places, and close the asymmetry that lets `collectedThisMonth` move for
money no balance explains. Both are changes inside function bodies: no signature moves, and `Summary`
and `MemberSummary` keep their shapes.

**Contract**: `recurringReceived(state, member, months, current)` keeps the signature and the meaning
S-02 gave it. It already defers the elapsed bound, the break month and the active range to
`memberMonthStatus`; what is still written inline in its loop is the arrangement's start month, its end
month and the exception lookup. All three move into `scheduleMonthStatuses`. For each of the member's
schedules the function calls that helper with `state`, which satisfies the narrowed `inputs` type
structurally, the months of `state.recurringExceptions` whose `recurringId` equals that schedule's id,
and `current`, then adds the schedule's amount for every
returned row that counts and whose month is in `months`. The row set already applies the arrangement's
range and the current month, so filtering by `months` is the caller's window and nothing more.

The set of months selected is identical to the set the conditions select today, and that is not left
as a claim: criterion 1.9 asserts the two sets are equal for a state carrying a break month, a
departure and an exception.

`computeSummary` derives `manualCollectedThisMonth` from the payments whose date falls in `current`
**and** whose `memberId` names a member that is not the owner, matching `totalCollected`, which
already sums non-owner rows only, and `recurringCollectedThisMonth`, which already iterates the
non-owner members. Nothing else in the function changes.

#### 5. The residual helper S-02 left behind

**File**: `src/domain/money.ts`

**Purpose**: Answer the question S-02 hands to this slice. `ownerResidualForMonth` is exported from
`src/domain/money.ts` with an `activeCount - 1` expression that assumes the owner is always one of the
active members, wrong for any month the owner sits out and inert only for as long as nothing calls it.

**Contract**: Remove `ownerResidualForMonth`, and with it the two assertions in
`src/domain/money.test.ts` that call it. The owner's share of a month is produced inside
`computeSummary` as `ownerShareThisMonth`, which is the value the screen renders and the tests assert,
so the helper has no caller to gain and payments give it none. A dead export in a pure module that
encodes a false assumption is a trap for the first person who needs a residual and reaches for the one
that is already there.

The only callers on disk are in its own unit file: `src/domain/money.test.ts` uses it in the
month-balances assertion and in the zero-active assertion. Both properties survive the deletion
because both are already asserted through the shipped path in `src/domain/calc.test.ts`, where
`ownerShareThisMonth` is 10000 for a priced month with nobody active and
`expectedThisMonth + ownerShareThisMonth` equals the price. The deletion therefore loses no coverage,
and that is recorded here so it is not re-litigated during implementation.

D-006 records the other branch as rejected after review: widening the helper with a charged-count
argument was refused because nothing in the shipped path would have called it, which would have proved
one expression while the interface computed another. So a caller appearing outside
`src/domain/money.test.ts` is a finding to raise, not a branch to take, and criterion 1.10 is scoped
to exactly that.

#### 6. Unit tests

**Files**: `src/domain/months.test.ts`, `src/domain/payments.test.ts`,
`src/domain/recurring.test.ts`, `src/domain/calc.test.ts`

**Purpose**: Prove test-plan risk 4 at the cheapest layer and close the acceptance example with a
payment in it. Written before the functions they exercise.

Two of the four files exist and are extended: `src/domain/months.test.ts` and
`src/domain/calc.test.ts`, where a case S-02 already pins is not repeated. The other two are new,
because `src/domain/payments.ts` and `src/domain/recurring.ts` are created by this slice, so nothing
in them can duplicate an S-02 case. The exception is the month-status helper: if S-02 phase 3 landed
it with a test file of its own, that file is the one extended and only the cases it lacks are added.

**Contract**: Cases:

- `isCalendarDate` accepts an ordinary date, accepts 29 February in a leap year, rejects it in a
  common year, rejects a day past the end of its month, rejects month 13 and rejects a malformed
  string
- `validatePaymentDate` accepts a date in the first month, accepts one years in the future, rejects
  one in the month before the plan started, and names the date field in every message
- `isMonthInSchedule` is inclusive at both ends, covers exactly one month when the ends are equal, and
  is unbounded above when the end is null
- `findScheduleOverlap` finds a contained range, a straddling range, two ranges that touch in one
  month and an open-ended range that swallows a later one; returns null for two ranges separated by a
  month and for a different member; returns null for a candidate whose id matches the stored row it
  intersects, which is the edit path; and returns that same stored row for a candidate with a null id
  and otherwise identical months, which is the create path
- `scheduleMonthStatuses` returns rows for the elapsed months only: it stops at the current month for
  an open-ended arrangement, stops at the end month when that is earlier, is empty when the
  arrangement starts next month, and is one row long when it starts and ends in the current month
- `scheduleMonthStatuses` reports why a month did not count, one case per reachable reason against the
  same arrangement so the difference is the condition alone: a month outside every active range of the
  member is `outside-active-range`, a break month is `break-month`, a month in the exception list is
  `excepted`, and an ordinary month counts with a null reason
- a month that is both outside the member's ranges and a break month reports `outside-active-range`,
  which is `memberMonthStatus`'s own order rather than a second one invented here
- an excepted month that is also a break month reports `break-month`, because the exception is the last
  condition applied and a month already excluded is never re-labelled
- the assumed-receipt rule through `recurringReceived`, one test per disqualifying condition and each
  written as a pair against the same state so the difference is the condition alone: a month inside
  the range counts; an exception for that schedule and month removes it; a break month removes it; a
  month outside every active range of the member removes it; the end month itself counts and the
  month after it does not
- an exception for one schedule leaves another schedule's same month untouched
- the not-yet-elapsed bound: an open-ended schedule and one ending well after the current month both
  contribute for elapsed months only, asserted directly against `recurringReceived` with the current
  month passed as its own argument, and again through `computeSummary`, so an argument threaded
  wrongly cannot pass unnoticed
- drift: a schedule paying more than the member's share each month produces a growing positive
  balance, and is not clamped to the share
- a payment dated in the current month and a payment dated years ahead both count in `paid` now, and
  `collectedThisMonth` counts the first and not the second
- `collectedThisMonth` adds a manual payment in the current month to the assumed receipt for the same
  month for the same member
- a payment in the current month naming the owner member does not move `collectedThisMonth`, while the
  same payment naming a participant does
- `recurringReceived` selects exactly the months `scheduleMonthStatuses` reports as counted, for one
  state carrying a break month, a departure and an exception, asserted as the two sets of months
  rather than as a single total, so a re-expression that quietly drops or adds a condition fails here
  rather than netting out
- a payment with kind `annual` is counted exactly as one with kind `manual`, with no spreading
- the acceptance example: a price of 10000 minor units with the owner and two participants active
  gives each participant an owed of 3333, and with one participant's payment of 2000 in the state
  their balance is -1333 while the other's is -3333
- recompute on edit and on delete: the same state with the payment's amount changed, and with the
  payment removed, produces the balance the inputs imply, with nothing carried over from the previous
  computation

### Success criteria:

#### Automated verification:

- Unit tests pass: `npm run test:unit`
- Typecheck passes: `npm run typecheck`
- Integration tests still pass: `npm run test:integration`
- Nothing under `src/domain/` imports from `src/server/`, `hono` or a D1 type
- Exactly one export in `src/domain/` decides whether a month counts for a member, and both
  `recurringReceived` and `scheduleMonthStatuses` resolve through it rather than repeating a condition
  inline; no start month, end month, break month, active range or exception check appears in
  `recurringReceived`'s own body
- The months `recurringReceived` counts equal the months `scheduleMonthStatuses` reports as counted,
  for a state carrying a break month, a departure and an exception
- A search for `ownerResidualForMonth` across `src/` returns nothing. Before the change it returns
  only `src/domain/money.ts` and `src/domain/money.test.ts`; any other path is a finding to raise
  rather than a reason to keep the helper

#### Manual verification:

- Each new unit test failed first against the unwritten function, for the stated reason rather than
  for an import error
- The acceptance example's -13.33 was computed by hand from the requirements before the assertion was
  written, rather than read out of the implementation

**Implementation note**: After this phase and all its automated verification, stop for human
confirmation before moving to the next phase.

---

## Phase 2: Payments

### Overview

The first ledger table, its repository, its five routes and the ownership tests that prove a second
account cannot reach any of it. Written test-first, because a leak looks like success from the
outside.

**Prerequisite**: S-02 phase 3, for `src/server/db/subscription-state.ts`, which change 5 extends, and
`src/server/routes/summary.ts`, which the last integration case reads. Both have landed, and prices
and break months took `0004`, so this phase's migration is `0005`.

### Required changes:

#### 1. Payments migration

**File**: `migrations/0005_payments.sql`

**Purpose**: Store the money the organizer saw arrive.

**Contract**: `payments(id TEXT PRIMARY KEY, member_id TEXT NOT NULL REFERENCES "members"("id") ON
DELETE CASCADE, date TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
amount INTEGER NOT NULL CHECK (amount > 0), note TEXT NOT NULL DEFAULT '', tag TEXT NOT NULL CHECK
(tag IN ('manual', 'annual')), created_at TEXT NOT NULL)` with
`CREATE INDEX "payments_member_id_idx" ON "payments"("member_id")`.

Style follows `0002_subscriptions.sql` and S-02's migrations exactly: quoted identifiers, no
`IF NOT EXISTS`, cascade on the foreign key, and a date CHECK as tight as `GLOB` allows with the
residual gap, a day of `00` or `39` and every impossible day of a real month, closed by the Zod rule
every write passes through. A positive amount is deliberate: a correction is an edit or a delete, not
a negative row.

There is no `subscription_id` column. The owning subscription is reached through the member, which is
the only path that exists for a payment, and duplicating it would create a second version of the
truth that a later edit could contradict.

#### 2. Payment validation contract

**File**: `src/server/validation/payments.ts`

**Purpose**: One declared schema for payment input, shared by the routes and exercised directly by a
unit test.

**Contract**: Request body keys stay snake_case, matching every other validation module.
`createPaymentSchema` requires `member_id` as a non-empty string, `date` as a string refined with the
domain's `isCalendarDate`, `amount` as a positive integer in minor units, and accepts optional `note`
trimmed and defaulting to the empty string with a bounded length, and optional `kind` restricted to
`manual` or `annual` and defaulting to `manual`. `patchPaymentSchema` is the partial strict form
rejecting an empty body, carrying the same four fields. Both are `.strict()`, so an unknown key is a
400 rather than a silent drop.

The field name is `kind` on the wire and in the domain; only the column is `tag`. The two are mapped
at the repository boundary like every other column name.

The start-month rule is not in Zod: the schema checks shape, the domain's `validatePaymentDate`
checks the invariant against the subscription's own first month, and the route runs the second after
the first and turns its message into the same 400 shape.

#### 3. Payments repository

**File**: `src/server/db/payments.ts`

**Purpose**: The only place that writes SQL for payments, and the single enforcement point for
ownership over them.

**Contract**: `list(db, subscriptionId, userId, memberId?)`,
`get(db, subscriptionId, paymentId, userId)`, `create(db, subscriptionId, userId, input)`,
`update(db, subscriptionId, paymentId, userId, patch)` and
`remove(db, subscriptionId, paymentId, userId)`. Every statement joins
`members m on m.id = payments.member_id` and `subscriptions s on s.id = m.subscription_id` and filters
`s.id = ?` and `s.user_id = ?` in the same query, so a foreign payment, a payment reached through a
foreign member and a payment reached through a foreign subscription are one answer: `null`, or `false`
from `remove`.

`create` and `update` resolve the target member through the same predicate before writing, so a
`member_id` belonging to another subscription is indistinguishable from one that does not exist.
`create` generates the identifier with `crypto.randomUUID()` and writes `created_at` as
`new Date().toISOString()`. `list` orders by `date` descending then `created_at` descending, so the
screen does no sorting of its own, and applies the member filter only when one is passed. Rows are
mapped into the domain's camelCase `Payment` shape at this boundary, `tag` becoming `kind`, so no
column name escapes the module.

#### 4. The member delete rule gains its first clause

**File**: `src/server/db/members.ts`

**Purpose**: Make S-02's 409 branch reachable. A member with recorded payments is archived, never
hard-deleted, which is FR-012 and the `AGENTS.md` rule.

**Contract**: `hasDependents(db, subscriptionId, memberId, userId)` answers true when any payment
names the member. The function keeps the signature and the module-wide ownership predicate S-02 gave
it, joining `subscriptions` and filtering `s.id = ?` and `s.user_id = ?` alongside the member, and it
keeps its place: S-02 left it answering false for exactly this clause. The check stays in the
repository rather than in the route because the cascade on `payments.member_id` means a delete that
reaches SQL has already destroyed the history.

#### 5. The state loader reads payments

**File**: `src/server/db/subscription-state.ts`

**Purpose**: Fill the first of the three arrays S-02 returns empty.

**Contract**: `loadState` reads the subscription's payments through the same ownership predicate and
returns them in `state.payments`, mapped to the domain shape. The note saying S-03 fills the other two
stays until phase 3 removes it. No other line of the function changes and the summary route is
untouched.

#### 6. Payment routes

**File**: `src/server/routes/payments.ts`

**Purpose**: The five operations the payment list needs, each behind the session middleware and each
scoped through the owning subscription.

**Contract**: The module registers `app.use('/api/subscriptions/*', requireSession)` for itself before
declaring anything, because middleware does not cascade from another router mounted at the same base.

`GET /api/subscriptions/:id/payments` returns the subscription's payments, newest first, and accepts
an optional `memberId` query parameter which is resolved through the subscription first, so a member
id from another subscription answers 404 rather than an empty list. That filter is FR-025.

`POST /api/subscriptions/:id/payments` validates the body, loads the subscription for its start month,
runs `validatePaymentDate`, refuses a `member_id` naming the owner with 400 naming the field, creates
the payment and returns 201.

`GET`, `PATCH` and `DELETE /api/subscriptions/:id/payments/:paymentId` read, update and remove one
payment, with `PATCH` re-running the date rule when a date is supplied and the owner rule when a
member is supplied, and `DELETE` answering 204.

Status codes: 401 without a session, 400 with a message naming the field at fault, 404 for anything
missing or foreign including a member id from another subscription, 201 on create, 204 on delete.

#### 7. Composition

**File**: `src/server/index.ts`

**Purpose**: Mount the new router.

**Contract**: Add `app.route('/', paymentsRoutes)` alongside the existing routers, before the
`notFound` handler. Order does not matter because the paths do not collide.

#### 8. Tests

**Files**: `tests/integration/payments.test.ts`, `src/server/validation/payments.test.ts`

**Purpose**: Prove test-plan risk 2 for a resource two levels down and risk 3 for its round trip.
Written before the routes.

**Contract**: The integration test uses the shared helpers in `tests/integration/accounts.ts`, seeds
two accounts with emails unique to the test, and passes `10.6.0` as its client-address prefix to
`signedInCookieWithPrefix`, one address per seeded account rather than one address for the whole
file. Sign-in is rate limited at ten
requests per sixty seconds per client address, the limiter is database-backed, and the integration
database is shared across files and never reset, so a shared prefix or a single reused address reads
as a flaky sign-in rather than as a throttle. The comment at the top of that module records the
assignments: `10.0.0.x` to `10.3.0.x` are in use and `10.4.0.x` went to `prices.test.ts` and `10.5.0.x` to
`summary.test.ts` when S-02 phase 3 landed, so this slice takes `10.6.0.x` here and `10.7.0.x` in
phase 3. This phase
extends that comment with its own line. It then creates a subscription with a member for each account.
Cases:

- a payment created by account A is listed for A and returned by a later, separate request with its
  date, amount, note and kind intact, which is what proves it persisted rather than being held in
  memory
- account B gets 404 from `GET`, `POST`, `PATCH` and `DELETE` naming A's subscription or A's payment,
  and from a `POST` naming A's member id through B's own subscription id, which is the wrong-parent
  case
- `GET` with a `memberId` from the other account's subscription answers 404, not an empty list
- every one of the five routes returns 401 without a cookie, asserted per route
- a payment dated before the subscription's first month returns 400 naming the date, and a following
  read confirms nothing was stored
- a payment dated in the future is accepted and appears in the list
- `2025-02-30` returns 400 naming the date
- a payment naming the owner member returns 400 naming the member field
- an amount of zero and a negative amount both return 400
- an unknown body key returns 400, and an empty patch body returns 400
- editing a payment's amount and reading it back returns the new amount, and deleting it returns 204
  with a following read returning 404
- deleting a member who has a payment returns 409, and the payment is still readable afterwards
- the summary for the subscription reflects the payment: the paying member's balance moves by exactly
  the amount, and `collectedThisMonth` counts a payment dated in the current month

The unit test covers the schema alone: defaults for note and kind, the real-date refinement including
the values the database pattern by itself would admit, rejection of an unknown key and rejection of an
empty patch.

### Success criteria:

#### Automated verification:

- Integration tests pass: `npm run test:integration`
- Unit tests pass: `npm run test:unit`
- Typecheck passes: `npm run typecheck`
- All five migrations apply in order to a clean local database: `npm run db:migrate:local`
- Every new route answers 401 without a cookie, asserted per route rather than once
- A payment written by one request is read back by a separate later request with every field intact

#### Manual verification:

- The ownership cases failed first against the unwritten routes, and for the right reason
- A payment dated before the plan's first month was attempted against a local database and produced
  400 naming the date, with nothing stored

**Implementation note**: Stop for human confirmation before the next phase.

---

## Phase 3: Standing orders and their exceptions

### Overview

The arrangement that stops needing monthly data entry, the single-month correction that keeps it
honest, and the tests that close the stored half of test-plan risk 4. Written test-first.

**Prerequisite**: S-02 phase 3, which has landed, for `src/server/db/subscription-state.ts`, which
change 5 extends, and `tests/integration/summary.test.ts`, which change 8 extends rather than
creates.

### Required changes:

#### 1. Recurring migration

**File**: `migrations/0006_recurring.sql`

**Purpose**: Store the arrangements and the months of them that did not arrive.

**Contract**: `recurring_schedules(id TEXT PRIMARY KEY, member_id TEXT NOT NULL REFERENCES
"members"("id") ON DELETE CASCADE, amount INTEGER NOT NULL CHECK (amount > 0), start_month TEXT NOT
NULL CHECK (start_month GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]'), end_month TEXT CHECK (end_month IS
NULL OR (end_month GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]' AND end_month >= start_month)))` with
`CREATE INDEX "recurring_schedules_member_id_idx" ON "recurring_schedules"("member_id")`.

`recurring_exceptions(schedule_id TEXT NOT NULL REFERENCES "recurring_schedules"("id") ON DELETE
CASCADE, month TEXT NOT NULL CHECK (month GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]'), PRIMARY
KEY(schedule_id, month))`.

The exceptions table needs no separate index: its composite primary key leads with `schedule_id` and
already serves every lookup this slice makes. The `end_month >= start_month` CHECK is expressible in
SQLite because both columns are on the same row, so unlike the overlap rule it does not have to be
remembered by a route. There is no `created_at` on either table: neither is ever ordered by when it
was entered.

#### 2. Recurring validation contract

**File**: `src/server/validation/recurring.ts`

**Purpose**: One declared schema per write, in the same shape as the other validation modules.

**Contract**: `createScheduleSchema` requires `member_id` as a non-empty string, `amount` as a
positive integer in minor units, `start_month` on the month pattern the subscription schema uses,
and accepts `end_month` as nullable on the same pattern, refined so that when it is present it is at
or after `start_month`. `patchScheduleSchema` is the partial strict form rejecting an empty body,
and its patchable fields are named rather than left open: `member_id`, `amount`, `start_month` and
`end_month`, which is every column of the row. `end_month` may be set to null to reopen an
arrangement. The ordering refinement applies to whichever of the two months the merged result
carries, checked by the route against the stored row rather than by the schema against a partial
body. Both are `.strict()`, so a body naming anything else is a 400 naming the field.

`member_id` is patchable because an arrangement entered against the wrong participant is an ordinary
correction, and the payments PATCH already allows the same move. Two rules then have to run on the
merged row rather than the stored one, and both are load-bearing: the overlap is read with
`listForMember` for the **merged** member, or moving an arrangement onto a participant who already has
one passes the check and double-counts that participant's months; and the owner refusal re-runs, or a
schedule can be moved onto the owner by PATCH after being refused at POST. One integration case
covers each. Exceptions are keyed by schedule and month, not by member, so a member change drops none
of them; only a narrowed month range does that.

A month in a path parameter is validated with the same month schema before it reaches SQL, so a
malformed month in an exception route is a 400 rather than a silent miss. The overlap rule and the
start-month rule are not in Zod: the schema checks shape, the domain checks the invariants, and the
route maps each to its own status code.

#### 3. Recurring repository

**Files**: `src/server/db/recurring.ts`

**Purpose**: The only place that writes SQL for schedules and their exceptions, and the single
enforcement point for ownership over both.

**Contract**: `list(db, subscriptionId, userId)`, `get(db, subscriptionId, scheduleId, userId)`,
`create(db, subscriptionId, userId, input)`, `update(db, subscriptionId, scheduleId, userId, patch)`,
`remove(db, subscriptionId, scheduleId, userId)`, `listForMember(db, subscriptionId, memberId, userId)`,
`addException(db, subscriptionId, scheduleId, userId, month)` and
`removeException(db, subscriptionId, scheduleId, userId, month)`. Every statement joins `members` and
`subscriptions` and filters `s.id = ?` and `s.user_id = ?`, so a foreign schedule, a schedule reached
through a foreign member and one reached through a foreign subscription are one answer.

`list` orders by `member_id` then `start_month` ascending, and `listForMember` by `start_month`
ascending, for the same reason the payments repository orders by date: the screen draws one block per
participant from that list and does no sorting of its own, and a query whose order comes from the
current plan rather than from an `ORDER BY` is stable until an index or a row count changes. Neither
table carries `created_at`, so entry order is not available and is not wanted.

`list` and `get` return each schedule with its exception months attached as a string array, so the
screen draws its toggles from one read. That is an API view shape; the domain's `RecurringException`
type is unchanged and `loadState` still returns the two collections separately, because the
calculation reads them that way.

The exceptions column is `schedule_id` and the domain field is `recurringId`; `src/domain/calc.ts`
matches on `exception.recurringId === schedule.id`. This module maps between them at the boundary,
exactly as the payments repository maps `tag` to `kind`. A repository that returns `schedule_id`
produces an exception list that matches nothing, and a participant whose corrections are all silently
ignored looks exactly like one who never missed a month, so nothing in the suite would fail.

`update` writes the schedule row and, in the same `db.batch([...])`, deletes every exception whose
month falls outside the new range. `listForMember` is what the route uses to check for an overlap
before writing. `addException` is an insert that treats an existing row as success, and
`removeException` reports success whether or not a row was there, because both are one end of a
toggle.

#### 4. The member delete rule gains its second clause

**File**: `src/server/db/members.ts`

**Purpose**: Close FR-012 and FR-013 completely.

**Contract**: `hasDependents(db, subscriptionId, memberId, userId)` answers true when any payment or
any recurring schedule names the member, both reached through the same ownership predicate as its
first clause. With this clause the function is complete and the 409 branch covers everything the
requirements call history.

#### 5. The state loader reads schedules and exceptions

**File**: `src/server/db/subscription-state.ts`

**Purpose**: Fill the last two arrays, and remove the note saying a later slice will.

**Contract**: `loadState` reads the subscription's recurring schedules and their exceptions through
the same ownership predicate and returns them in `state.recurring` and `state.recurringExceptions`,
mapped to the domain shapes, with each exception's `schedule_id` becoming `recurringId`, which is
the field `recurringReceived` matches on. An exception list that keeps the column name matches
nothing and fails silently, so this mapping is asserted by the summary cases rather than assumed. No
other line changes, no calculation signature changes, and the summary route is untouched. From here
the summary counts assumed receipts because the state finally contains them.

#### 6. Recurring routes

**File**: `src/server/routes/recurring.ts`

**Purpose**: The five schedule operations and the two ends of the unpaid toggle.

**Contract**: The module registers `app.use('/api/subscriptions/*', requireSession)` for itself.

`GET /api/subscriptions/:id/schedules` returns the subscription's schedules, each with its exception
months. `POST` validates the body, refuses a `member_id` naming the owner with 400, refuses a
`start_month` before the subscription's first month with 400 naming the field, reads the member's
other schedules and refuses an overlap with 409 naming the rule and the conflicting arrangement, then
creates and returns 201.

`GET`, `PATCH` and `DELETE /api/subscriptions/:id/schedules/:scheduleId` read, update and remove one
arrangement. `PATCH` merges the patch onto the stored row before checking anything, so an edit is
judged on its result rather than on its diff: the month ordering, the start-month rule, the owner
refusal and the overlap all run against the merged row. The overlap is read with `listForMember` for
the merged member, which is the patched one when the body carries `member_id`, and it ignores the
arrangement's own id so an edit does not collide with itself. `DELETE` answers 204 and its
exceptions go with it by cascade.

`PUT /api/subscriptions/:id/schedules/:scheduleId/exceptions/:month` marks that month unpaid and
`DELETE` on the same path unmarks it. Both validate the month, both answer 404 when the schedule is
missing or foreign, both answer 400 when the month falls outside the arrangement's range, and both
answer 204 whether or not the mark was already in the state they leave it in, because each is one end
of a toggle and an organizer clicking twice has not made an error.

Status codes: 401 without a session, 400 with a message naming the field at fault, 404 for anything
missing or foreign, 409 for an overlapping arrangement, 201 on create, 204 on delete and on both
exception routes.

#### 7. Composition

**File**: `src/server/index.ts`

**Purpose**: Mount the new router.

**Contract**: One more `app.route('/', recurringRoutes)` before the `notFound` handler.

#### 8. Tests

**Files**: `tests/integration/recurring.test.ts`, `tests/integration/summary.test.ts`,
`src/server/validation/recurring.test.ts`

**Purpose**: Prove the ownership rule for the last two resources, prove that the assumed-receipt rule
holds against stored data rather than against a literal, and prove the member delete rule.

**Contract**: The integration test mirrors the payments file, seeding two accounts through the shared
helpers and passing `10.7.0` as its client-address prefix, one address per seeded account, for the
reason phase 2 records. Cases:

- a schedule created by account A is listed for A and returned by a later, separate request with its
  amount, start month and end month intact
- account B gets 404 from `GET`, `POST`, `PATCH`, `DELETE`, `PUT` on an exception and `DELETE` on an
  exception, naming A's subscription or A's schedule, and from a `POST` naming A's member id through
  B's own subscription id
- every one of the seven routes returns 401 without a cookie, asserted per route
- a second schedule for the same member overlapping the first returns 409 and the first is unchanged;
  a second schedule for the same member starting the month after the first ends is accepted; a
  schedule for a different member covering the same months is accepted
- editing a schedule so that it no longer overlaps is accepted, and editing it onto another
  arrangement returns 409
- moving a schedule onto a participant who already has one covering the same months returns 409, which
  is the overlap read for the merged member rather than the stored one
- moving a schedule onto the owner member returns 400 naming the member field, the same refusal `POST`
  gives, so the rule cannot be walked around by creating then patching
- a patch naming a field outside `member_id`, `amount`, `start_month` and `end_month` returns 400
  naming it
- a start month before the subscription's first month returns 400 naming the field, and an end month
  before the start month returns 400
- a schedule naming the owner member returns 400 naming the member field
- `PUT` on an exception returns 204, a second `PUT` on the same month returns 204, and the month
  appears once in a following read of the schedule
- `DELETE` on an exception returns 204, a second `DELETE` returns 204, and the month is gone from a
  following read
- an exception for a month outside the arrangement's range returns 400, and a malformed month returns
  400
- narrowing a schedule's range drops an exception that falls outside the new range, and a following
  read shows it gone
- deleting a schedule returns 204, a following read returns 404, and its exceptions are gone
- deleting a member who has a schedule returns 409

The summary test gains its S-03 cases, extending the file S-02 created: a stored schedule covering
three elapsed months moves the member's balance by three times its amount; an exception on the middle
month removes exactly one month's worth; a break month over one of the three removes another; a month
outside the member's active range contributes nothing; an arrangement with no end month contributes
for elapsed months only, with nothing for the month after the current one; and `collectedThisMonth`
counts a manual payment in the current month plus the assumed receipt for the same month.

The unit test covers the schema alone: the month pattern, the nullable end month, the ordering
refinement, rejection of unknown keys and rejection of an empty patch.

### Success criteria:

#### Automated verification:

- Integration tests pass: `npm run test:integration`
- Unit tests pass: `npm run test:unit`
- Typecheck passes: `npm run typecheck`
- All six migrations apply in order to a clean local database: `npm run db:migrate:local`
- Every new route answers 401 without a cookie, asserted per route rather than once
- Deleting a member who has a payment or a schedule returns 409 and the history survives
- The summary read through the API reflects a stored schedule and its exception, to the minor unit

#### Manual verification:

- The exception and out-of-range cases failed first against the unwritten routes, and for the right
  reason
- An overlapping arrangement was attempted against a local database and produced 409 naming the rule
  rather than a 500

**Implementation note**: Stop for human confirmation before the next phase.

---

## Phase 4: The payments and standing-order sections

### Overview

The two sections the requirements describe, added to the screen S-02 built, and the browser pass that
confirms the balance moves where the organizer can see it.

**Prerequisite**: S-02 phase 4, for `src/client/screens/SubscriptionDetail.tsx` and the shape
`src/client/api.ts` landed with. The first act of this phase is change 4's check: the standing-order
section cannot label a month without the members' active ranges and the subscription's break months,
so the screen must already hold both.

### Required changes:

#### 1. API client

**File**: `src/client/api.ts`

**Purpose**: Keep the new calls in the one place S-01 established rather than scattering `fetch` calls
across components.

**Contract**: Extend the wrapper with the payment and schedule calls, including both ends of the
exception toggle, following whatever shape the file landed with: same credentials handling, same JSON
handling, same translation of a 401 into a signed-out state and of a 400 into a field-level message.

#### 2. The payments section

**Files**: `src/client/components/PaymentList.tsx`, `src/client/components/PaymentForm.tsx`

**Purpose**: FR-015, FR-017 and FR-025 on one screen: record a payment, correct it, remove it, and
read one participant's history.

**Contract**: The list shows the subscription's payments newest first, each row carrying the
participant's name, the date, the amount formatted with the subscription's locale and currency, the
kind and the note, with a filter that narrows the list to one participant. An edit control turns a row
into the same fields inline and saves in place. A delete control asks for confirmation in the row
itself, with a confirm and a cancel control, and never with a blocking browser dialog, so the
organizer can see what they are deleting while they decide. The form adds a payment with a
participant, a date, an amount entered in major units and converted at the edge, a note and the
one-off or yearly choice. Field-level messages from a 400 are shown against the field the response
names. After every mutation the screen refreshes both the list and the summary, so the balances on the
screen are the server's answer rather than a local guess.

#### 3. The standing-order section

**File**: `src/client/components/RecurringSection.tsx`

**Purpose**: FR-019, FR-020, FR-021 and FR-026: record an arrangement once, correct a single month of
it, and never let assumed money read as confirmed money.

**Contract**: One block per participant with an arrangement, showing the amount, the month it started
and the month it ends or that it is still running, in the order the list arrives, which the repository
sorts by participant and then by start month.

Under each arrangement, the months come from one call to the domain's `scheduleMonthStatuses`, and
that call is the only thing that decides how a month is drawn. It is given the arrangement, the member
with their active ranges, the subscription's break months, the exception months the schedule carries
in the API view, and the current month taken from the summary response and never computed in the
browser. A row the helper reports as counting is drawn as counted and labelled assumed received. A row it
reports as not counting is drawn as not counted and carries its reason in words, one phrase per
reachable `MonthExclusion`: `break-month` is the plan was paused that month, `outside-active-range` is
the participant was not on the plan that month, and `excepted` is marked as not received. The other
three values of the union cannot reach this screen, for the reasons phase 1 change 3 records, so the
mapping is total rather than needing a fallback phrase. The screen applies none of the six conditions
itself, so a month the server excluded can never appear as assumed received; the two answers come from
the same function and cannot disagree.

Only the rows whose reason is `excepted`, and the rows that count, carry the toggle, because the
exception is the one condition the organizer owns: the
control marks a month unpaid and unmarks it, writing and deleting the exception, and after either the
section and the summary are re-read. A month excluded as a break month or as outside the participant's
active range is not togglable, because marking it would change nothing and the screen would be
offering an action with no effect.

A form adds an arrangement and edits one, including moving it to another participant, ending it by
setting an end month and reopening it by clearing one. Field-level messages from a 400 are shown
against the field the response names, and the 409 from an overlap is shown as the message the route
returns, naming the conflicting arrangement. Every counted month is labelled assumed received, and the
label appears wherever an assumed amount is totalled, never only once at the top of the section.

#### 4. The detail screen

**File**: `src/client/screens/SubscriptionDetail.tsx`

**Purpose**: Put the two sections on the screen S-02 built, without rewriting it.

**Contract**: The screen gains the payments section and the standing-order section below the members
and prices it already shows, and re-reads the summary after any mutation in either so the headline
cards and the per-participant balances move together. Nothing about the existing sections changes.

It also supplies the standing-order section with what `scheduleMonthStatuses` needs and the summary
response does not carry: the members with their active ranges, and the subscription's settings and
break months, which together are the narrowed `Pick<SubscriptionState, 'settings' | 'breakMonths'>`
that phase 1 gives `memberMonthStatus`. `MemberSummary` carries none of it, so it comes from the reads
S-02's own members and break-months sections already make, plus the subscription the screen already
holds. Nothing is fabricated to satisfy a type. The first act of this phase is to confirm those reads
are there and reach this screen; if one is missing, this change adds it through the existing client
module rather than fetching from a component.

#### 5. Layout

**File**: `src/client/index.css`

**Purpose**: Keep the two new sections readable on a phone.

**Contract**: Extend the existing plain stylesheet with a payment row that reads as a row on a wide
screen and stacks on a narrow one, an inline confirmation that does not shift the rows around it, and
a month toggle grid that wraps. No design system, no icon font, no external stylesheet.

### Success criteria:

#### Automated verification:

- Typecheck passes across all three projects: `npm run typecheck`
- Production build succeeds: `npm run build`
- The whole suite passes: `npm test`

#### Manual verification:

- Record a payment from a participant and watch their balance and the headline cards move by exactly
  that amount
- Edit that payment's amount and watch the balance follow, then delete it and watch the balance return
  to where it started
- Record a payment dated before the plan's first month and read a message naming the date, with
  nothing added to the list
- Record a payment dated in the future and confirm it counts as credit now
- Record a standing order for a participant from the first month and confirm their elapsed months are
  counted and labelled assumed received
- Mark one month of that standing order as not received and confirm that month alone stops counting
  and the balance moves by one month's amount
- Confirm a recorded receipt and an assumed one are told apart on the screen without reading the
  amounts
- Add a break month covering one month of a standing order, and a participant departure covering
  another, and confirm both months are drawn as not counted with the reason named, that neither is
  labelled assumed received, and that the assumed total on the screen matches the balance the summary
  returns
- Try to delete a participant who has a payment and read the refusal
- Sign in as the reviewer account and confirm none of the payments or standing orders are reachable
- The layout is usable at a narrow phone width

**Implementation note**: Stop for human confirmation before the next phase.

---

## Phase 5: Evidence

### Overview

Capture the verification trail this project requires.

**Prerequisite**: phases 1 to 4 of this slice, and nothing further from S-02.

### Required changes:

#### 1. Captured run

**File**: `evidence/runs/payments-and-recurring-tests.txt`

**Purpose**: A record of what passed, at which commit, rather than an assertion that it did.

**Contract**: The captured output of `npm run typecheck`, `npm run test:unit` and
`npm run test:integration` in one file, with the counts visible, in the same shape as
`evidence/runs/runtime-auth-slice-tests.txt`.

#### 2. Index and work log

**Files**: `evidence/index.md`, `evidence/work-log.md`

**Purpose**: Keep the evidence map complete.

**Contract**: Append one evidence row naming this slice, the artifacts, the commit and the risks
covered, and one work-log entry. Append only; never rewrite either file.

#### 3. Test plan status

**File**: `context/foundation/test-plan.md`

**Purpose**: Record that rollout phase 3 has shipped.

**Contract**: Set rollout phase 3's Status and Change folder in the table in section 3, and add the
short note section 6.5 invites, saying what this phase taught about the assumed-receipt rule: that
its six conditions are cheapest to test as pairs against one state, so the only difference between a
counted month and a skipped one is the single condition under test. Leave every other
section untouched, including the cookbook entries 6.1, 6.2 and 6.3, which belong to other rollout
phases.

### Success criteria:

#### Automated verification:

- The captured file exists and shows the passing counts for all three commands
- The same commands pass in one run: `npm run typecheck && npm test`

#### Manual verification:

- The evidence index row and the work-log entry name this slice, its commit and the risks it covered

---

## Testing strategy

### Unit tests:

- A real calendar date accepted and rejected at its own boundaries, including a leap day in both kinds
  of year
- The payment date rule: accepted in the first month, accepted in the future, rejected before the plan
  started
- Schedule range membership, inclusive at both ends and unbounded above when the end is null
- Schedule overlap: contained, straddling, touching in one month, open-ended swallowing a later one,
  and the three cases that are not overlaps
- The elapsed months of an arrangement, bounded by the current month and by the end month, and the
  reason reported for each month that did not count, with the order of the reasons pinned
- The months `recurringReceived` counts equal the months `scheduleMonthStatuses` reports as counted
- The assumed-receipt rule, one paired test per disqualifying condition, plus the end month itself and
  the month after it
- The not-yet-elapsed bound asserted twice: against the rule with the current month as its own
  argument, and through `computeSummary`
- Drift: a standing order larger than the share accumulates credit and is never clamped
- Payments in balances: future-dated counted now, `annual` counted as ordinary, edit and delete
  recomputed from inputs
- `collectedThisMonth` combining a manual payment and an assumed receipt for the same month, and not
  moving at all for a payment naming the owner
- The acceptance example with a payment: a balance of -13.33 against a share of 33.33
- Both validation schema modules: formats, defaults, unknown keys, empty patch

### Integration tests:

- Payments and schedules: create, read back in a separate request, edit, delete
- Ownership for every new route and verb, including a child reached through a foreign member and
  through a foreign subscription, and a member filter naming another account's member
- 401 for every new route without a cookie, asserted per route
- The refusals: a payment before the plan's first month, an impossible calendar date, an amount of
  zero, a payment or a schedule naming the owner, an overlapping arrangement, an exception outside its
  arrangement's range
- Both ends of the exception toggle are idempotent, and a narrowed arrangement drops the exceptions
  its new range no longer contains
- Deleting a member with a payment or a schedule returns 409 and the history survives
- The summary through the API reflecting stored payments, a stored arrangement, an exception, a break
  month and a month outside the member's active range

### Manual testing steps:

1. Record a payment and watch the participant's balance and the headline cards move by its amount.
2. Edit the payment, then delete it, and watch the balance follow and then return.
3. Record a payment dated before the plan's first month and read the message naming the date.
4. Record a payment dated in the future and confirm it counts as credit now.
5. Record a standing order and confirm its elapsed months are counted and labelled assumed received.
6. Mark one month of it as not received and confirm that month alone stops counting.
7. Confirm recorded and assumed receipts are told apart without reading the amounts.
8. Try to delete a participant with history and read the refusal.
9. Sign in as the reviewer account and confirm none of it is reachable.
10. Resize to a narrow phone width and confirm both new sections stay usable.

### Risk mapping

| Test-plan risk | Covered by | Phase |
|---|---|---|
| 4, a standing order counted for a month it should not cover | the paired unit cases in `src/domain/recurring.test.ts` and `calc.test.ts`, one per disqualifying condition; the not-yet-elapsed bound asserted against the rule and again through `computeSummary`; the equality of the months `recurringReceived` counts and the months `scheduleMonthStatuses` reports as counted, which is what keeps the screen's labels and the server's total from drifting; and the stored half in `tests/integration/recurring.test.ts` and `summary.test.ts`. This closes the half S-02 left open | 1, 3, 4 |
| 3, a record lost or half-applied | the create-then-refetch cases for both tables, the edit and delete cases, the narrowed-range exception cleanup, the member delete refusal, and all six migrations applying in order | 2, 3 |
| 2, a record reached across accounts | ownership and 401 cases in `tests/integration/payments.test.ts` and `recurring.test.ts`, including a child reached through a foreign member, through a foreign parent, and through a member filter naming another account's member | 2, 3 |
| 1, a balance wrong by rounding, by a month or by a price | the acceptance example with a payment asserted in the domain and read back through the summary route; the rest of risk 1 is S-02's and is not re-proven here | 1, 3 |
| 5, a charged month with nobody active | covered by S-02 and not revisited | - |
| 6, session lifecycle | covered by S-01 and not revisited, beyond asserting 401 for every new route | - |

## Performance considerations

The summary now reads the ledger as well as the membership on every request and computes over it in
memory. For one household over a few years that is hundreds of rows and hundreds of month iterations,
far below any threshold worth engineering against, and the requirements record the expected scale as
small. No caching, no pagination and no denormalised totals, which is also what keeps an edit correct
by construction. If a subscription ever ran long enough for this to matter, the cheapest first move
would be to bound the enumerated range rather than to cache a derived number that can go stale.

## Migration notes

Two migrations, applied in order after the four that precede them, on tables that have never held
data. Nothing is migrated from an earlier shape and nothing existing changes shape.

The identifiers `0005` and `0006` are settled rather than provisional: `migrations/0003_members.sql`
and `migrations/0004_prices_and_breaks.sql` are both on disk, so these two are the next free
numbers.

One behaviour changes for records that already exist: a member who could be deleted before this slice
can no longer be deleted once they have a payment or a standing order. That is FR-012 and it is the
intended consequence, not a regression.

## References

- Related research: `context/changes/payments-and-recurring/research.md`
- Decision: `context/decisions/D-007-recurring-and-payment-semantics.md`
- Decision: `context/decisions/D-008-one-source-for-a-counted-month.md`, which this plan's phase 1 and
  phase 4 both implement
- The review this plan was revised against: `context/changes/payments-and-recurring/reviews/plan-review.md`
- The slice this one builds on: `context/changes/members-and-price-history/plan.md`, whose domain
  types, `recurringReceived`, `balanceForMember`, `computeSummary`, `hasDependents` and `loadState`
  are consumed unchanged
- The slice that established the conventions: `context/changes/runtime-auth-slice/plan.md` and its
  `reviews/plan-review.md`
- The owner member this slice refuses payments against:
  `context/decisions/D-006-owner-member-and-zero-active-invariant.md`
- Risks and their test types: `context/foundation/test-plan.md`, rollout phase 3
- Product contract: `context/foundation/prd.md`, US-02, FR-015 to FR-021, FR-025 and FR-026
- Repository rules: `AGENTS.md`, the money, ownership and time-zone hard rules

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: The ledger rules in the domain

#### Automated

- [x] 1.1 Unit tests pass — 260b6d8
- [x] 1.2 Typecheck passes — 260b6d8
- [x] 1.3 Integration tests still pass — 260b6d8
- [x] 1.4 Nothing under src/domain imports the server, Hono or a D1 type — 260b6d8
- [x] 1.8 Exactly one export in src/domain decides whether a month counts for a member and both callers resolve through it — 260b6d8
- [x] 1.9 The months recurringReceived counts equal the months scheduleMonthStatuses reports as counted — 260b6d8
- [x] 1.10 A search for ownerResidualForMonth across src returns nothing — 260b6d8

#### Manual

- [x] 1.6 Each new unit test failed first for the stated reason — 260b6d8
- [x] 1.7 The acceptance example was computed by hand before the assertion was written — 260b6d8

### Phase 2: Payments

#### Automated

- [x] 2.1 Integration tests pass — 24f315b
- [x] 2.2 Unit tests pass — 24f315b
- [x] 2.3 Typecheck passes — 24f315b
- [x] 2.4 All five migrations apply in order to a clean local database — 24f315b
- [x] 2.5 Every new route answers 401 without a cookie — 24f315b
- [x] 2.6 A payment is read back by a separate later request with every field intact — 24f315b

#### Manual

- [x] 2.7 The ownership cases failed first for the right reason — 24f315b
- [x] 2.8 A payment before the plan's first month produced 400 naming the date, with nothing stored — 24f315b

### Phase 3: Standing orders and their exceptions

#### Automated

- [x] 3.1 Integration tests pass — 8e9a5ee
- [x] 3.2 Unit tests pass — 8e9a5ee
- [x] 3.3 Typecheck passes — 8e9a5ee
- [x] 3.4 All six migrations apply in order to a clean local database — 8e9a5ee
- [x] 3.5 Every new route answers 401 without a cookie — 8e9a5ee
- [x] 3.6 Deleting a member with a payment or a schedule returns 409 and the history survives — 8e9a5ee
- [x] 3.7 The summary through the API reflects a stored schedule and its exception — 8e9a5ee

#### Manual

- [x] 3.8 The exception and out-of-range cases failed first for the right reason — 8e9a5ee
- [x] 3.9 An overlapping arrangement produced 409 naming the rule rather than a 500 — 8e9a5ee

### Phase 4: The payments and standing-order sections

#### Automated

- [x] 4.1 Typecheck passes across all three projects
- [x] 4.2 Production build succeeds
- [x] 4.3 The whole suite passes

#### Manual

- [x] 4.4 A recorded payment moves the balance and the headline cards by its amount
- [x] 4.5 An edit moves the balance and a delete returns it to where it started
- [x] 4.6 A payment before the plan's first month is refused with a message naming the date
- [x] 4.7 A future-dated payment counts as credit now
- [x] 4.8 A standing order's elapsed months are counted and labelled assumed received
- [x] 4.9 Marking one month as not received stops that month alone from counting
- [x] 4.10 A recorded receipt and an assumed one are told apart without reading the amounts
- [x] 4.11 Deleting a participant with history is refused
- [x] 4.12 The reviewer account reaches none of the payments or standing orders
- [x] 4.13 The layout is usable at a narrow phone width
- [x] 4.14 A break month and a departure inside a standing order are drawn as not counted with the reason named

### Phase 5: Evidence

#### Automated

- [ ] 5.1 The captured file exists and shows the passing counts
- [ ] 5.2 The same commands pass in one run

#### Manual

- [ ] 5.3 The evidence index row and work-log entry name this slice, its commit and its risks
