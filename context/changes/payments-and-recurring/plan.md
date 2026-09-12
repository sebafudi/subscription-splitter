# Implementation plan: payments and recurring

## Overview

Give the ledger its other half. S-02 decides what every participant owes; this slice records what
they actually paid, standing orders that keep paying without monthly data entry, and the single
months of those standing orders that did not arrive. Every balance moves accordingly, and the
interface never shows assumed money as confirmed money. This is roadmap item S-03, source refs
US-02, FR-015 to FR-021, FR-025 and FR-026.

The slice adds no new kind of problem. Three tables hang off records S-02 created, nine routes follow
conventions S-01 and S-02 fixed, and the calculation they feed is already written and already unit
tested against a literal state. What is new is that the assumed-receipt rule becomes reachable from
outside, which is the half of test-plan risk 4 that S-02 left open by design.

## Current state analysis

S-01 is on main: sessions, two seeded accounts, the `subscriptions` table with its repository and
four routes, and the ownership rule enforced inside the repository's SQL.

S-02 is planned and under independent review; none of its code is on disk. Its plan is authoritative
here and this slice consumes it rather than re-deciding any of it. From it come the domain module
(`types.ts`, `months.ts`, `money.ts`, `members.ts`, `calc.ts`), the `members` and `active_ranges`
tables, the `price_history` and `break_months` tables, their repositories and routes, the state
loader, the summary route, the owner member created with its subscription, and the subscription
detail screen. Critically, S-02 already declares `Payment`, `RecurringSchedule` and
`RecurringException`, already writes `recurringReceived`, `balanceForMember` and `computeSummary`
against them, already leaves `hasDependents` as the seam a delete rule asks, and already returns the
three ledger arrays empty from `loadState` with a note saying this slice fills them.

So nothing in the calculation has to change. There is no `payments` table, no `recurring_schedules`
table, no `recurring_exceptions` table, no route that can write one, and no screen that can show one.
A standing order cannot be stored, so the stored half of test-plan risk 4 cannot be tested. The
member DELETE 409 branch for a member with history exists and is unreachable, because nothing can
give a member history.

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
  SQL differs.

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
- No change to any calculation signature from S-02, no change to the summary route's shape, and no
  new domain concept. The three arrays stop being empty; nothing else moves.
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

S-02 must be on disk before phase 1 starts. This plan names S-02 files it extends and S-02 functions
it calls, and none of them exists yet. Three things are checked in the first minutes of phase 1 and
adjusted in place if they moved:

- The migration identifiers. `0005` and `0006` assume S-02 landed `0003` and `0004`.
- Which recurring and payment cases S-02's unit suite already pins. This slice extends those files and
  does not duplicate a case that is already there.
- The detail screen's shape, its data fetching and its mutation refresh. The new sections adapt to
  what S-02 landed rather than rewriting it.

## Critical implementation details

**The current month is threaded, never inferred a second time.** S-02 makes it an explicit argument
to `recurringReceived` and `balanceForMember`, and `computeSummary` derives it once from the
subscription's own time zone. This slice adds no new caller of any of the three: the summary route
stays the only entry point into the calculation, no payment or standing-order route computes a month
of its own, and the screen takes the current month from the summary response rather than from the
browser. A second source would let an open-ended arrangement claim a month that has not arrived, in a
way no test of the rule itself would see, and `AGENTS.md` already forbids the derivation that
produces it.

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

**A payment or a schedule naming the owner is refused.** The owner is never owed from and does not
appear in the per-member summary list, so money recorded against them would be counted nowhere and
visible nowhere. The route answers 400 naming the member field, which is the same shape as any other
value the rules do not allow.

## Phase 1: The ledger rules in the domain

### Overview

The three pure predicates the routes need before any of them can refuse anything, and the unit cases
that pin the assumed-receipt rule at its four boundaries. Pure, with no import from D1 or Hono.
Written test-first, because test-plan rollout phase 3 exists for exactly these cases.

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

**Purpose**: Two questions the routes ask and one the screen asks, all decided by the same range
arithmetic, in one place so they cannot disagree.

**Contract**: `isMonthInSchedule(schedule: RecurringSchedule, month: MonthStr): boolean`, true when
`schedule.startMonth <= month` and either `endMonth` is null or `month <= endMonth`. The end month is
inclusive, so a schedule whose two ends are equal covers exactly one month.

`findScheduleOverlap(existing: RecurringSchedule[], candidate: RecurringSchedule): RecurringSchedule | null`
returns the first stored schedule for the same member whose month range intersects the candidate's,
ignoring any stored schedule with the candidate's own id so an edit does not collide with itself. Two
ranges intersect when each one's start is at or before the other's end, with a null end treated as
unbounded. Two schedules that touch, where one starts in the month the other ended, are an overlap
rather than a continuation, for the same reason S-02 gives for active ranges: the month is the unit
of account and an arrangement cannot stop and restart inside one.

`scheduleMonths(schedule: RecurringSchedule, currentMonth: MonthStr): MonthStr[]` enumerates the
elapsed months of the arrangement, from its start month to the earlier of its end month and the
current month, inclusive, and empty when the arrangement has not started. This is the list the screen
draws an unpaid toggle for, and it is in the domain rather than in the client so the screen and the
rule cannot disagree about which months an arrangement covers.

#### 4. The residual helper S-02 left behind

**File**: `src/domain/money.ts`

**Purpose**: Answer the question S-02 hands to this slice. Its plan leaves `ownerResidualForMonth`
with no caller and with an `activeCount - 1` expression that assumes the owner is always one of the
active members, wrong for any month the owner sits out and inert only for as long as nothing calls
it, and says explicitly that whether to delete it is settled here.

**Contract**: Remove `ownerResidualForMonth` and its unit cases. The owner's share of a month is
produced inside `computeSummary`, which is the value the screen renders and the tests assert, so the
helper has no caller to gain and payments give it none. A dead export in a pure module that encodes a
false assumption is a trap for the first person who needs a residual and reaches for the one that is
already there. The precondition is a search: if S-02 landed a caller after all, the helper stays, it
gains the charged-count argument D-006 describes, and this change becomes that instead. That search
is the first thing phase 1 does to this file.

#### 5. Unit tests

**Files**: `src/domain/months.test.ts`, `src/domain/payments.test.ts`,
`src/domain/recurring.test.ts`, `src/domain/calc.test.ts`

**Purpose**: Prove test-plan risk 4 at the cheapest layer and close the acceptance example with a
payment in it. Written before the functions they exercise. The first three extend files S-02 created;
a case S-02 already pins is not repeated.

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
  month, for a different member, and for the candidate matching its own stored id
- `scheduleMonths` stops at the current month for an open-ended arrangement, stops at the end month
  when it is earlier, is empty when the arrangement starts next month, and is one month long when it
  starts and ends in the current one
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
- A search for `ownerResidualForMonth` across `src/` returns nothing, or it returns the caller that
  kept it alive and the helper carries its charged-count argument

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
two accounts with emails unique to the test and a client address unique to the test, and creates a
subscription with a member for each. Cases:

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
positive integer in minor units, `start_month` on the month pattern the subscription schema uses, and
accepts `end_month` as nullable on the same pattern, refined so that when it is present it is at or
after `start_month`. `patchScheduleSchema` is the partial strict form rejecting an empty body, where
`end_month` may be set to null to reopen an arrangement, and the same ordering refinement applies to
whichever of the two months the merged result carries, checked by the route against the stored row
rather than by the schema against a partial body. Both are `.strict()`.

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

`list` and `get` return each schedule with its exception months attached as a string array, so the
screen draws its toggles from one read. That is an API view shape; the domain's `RecurringException`
type is unchanged and `loadState` still returns the two collections separately, because the
calculation reads them that way.

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
mapped to the domain shapes. No other line changes, no calculation signature changes, and the summary
route is untouched. From here the summary counts assumed receipts because the state finally contains
them.

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
arrangement. `PATCH` merges the patch onto the stored row before checking the month ordering, the
start-month rule and the overlap, so an edit is judged on its result rather than on its diff, and the
overlap check ignores the arrangement's own id. `DELETE` answers 204 and its exceptions go with it by
cascade.

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
helpers. Cases:

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
and the month it ends or that it is still running. A form adds an arrangement and edits one, including
ending it by setting an end month and reopening it by clearing one. Under each arrangement, the
elapsed months from the domain's `scheduleMonths`, called with the current month taken from the
summary response and never computed in the browser, each with a control that marks the month unpaid
and unmarks it, writing and deleting the exception. A month that is marked shows as not received and is
visibly different from one that is counted. Every counted month is labelled assumed received, and the
label appears wherever an assumed amount is totalled, never only once at the top of the section.

#### 4. The detail screen

**File**: `src/client/screens/SubscriptionDetail.tsx`

**Purpose**: Put the two sections on the screen S-02 built, without rewriting it.

**Contract**: The screen gains the payments section and the standing-order section below the members
and prices it already shows, and re-reads the summary after any mutation in either so the headline
cards and the per-participant balances move together. Nothing about the existing sections changes.

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
- Try to delete a participant who has a payment and read the refusal
- Sign in as the reviewer account and confirm none of the payments or standing orders are reachable
- The layout is usable at a narrow phone width

**Implementation note**: Stop for human confirmation before the next phase.

---

## Phase 5: Evidence

### Overview

Capture the verification trail this project requires.

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
- The elapsed months of an arrangement, bounded by the current month and by the end month
- The assumed-receipt rule, one paired test per disqualifying condition, plus the end month itself and
  the month after it
- The not-yet-elapsed bound asserted twice: against the rule with the current month as its own
  argument, and through `computeSummary`
- Drift: a standing order larger than the share accumulates credit and is never clamped
- Payments in balances: future-dated counted now, `annual` counted as ordinary, edit and delete
  recomputed from inputs
- `collectedThisMonth` combining a manual payment and an assumed receipt for the same month
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
| 4, a standing order counted for a month it should not cover | the paired unit cases in `src/domain/recurring.test.ts` and `calc.test.ts`, one per disqualifying condition, the not-yet-elapsed bound asserted against the rule and again through `computeSummary`, and the
stored half in `tests/integration/recurring.test.ts` and `summary.test.ts`. This closes the half S-02 left open | 1, 3 |
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

The identifiers `0005` and `0006` assume S-02 lands `0003_members.sql` and
`0004_prices_and_breaks.sql`. If its numbering moves, these move with it; the first act of phase 2 is
to look.

One behaviour changes for records that already exist: a member who could be deleted before this slice
can no longer be deleted once they have a payment or a standing order. That is FR-012 and it is the
intended consequence, not a regression.

## References

- Related research: `context/changes/payments-and-recurring/research.md`
- Decision: `context/decisions/D-007-recurring-and-payment-semantics.md`
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

- [ ] 1.1 Unit tests pass
- [ ] 1.2 Typecheck passes
- [ ] 1.3 Integration tests still pass
- [ ] 1.4 Nothing under src/domain imports the server, Hono or a D1 type
- [ ] 1.5 A search for ownerResidualForMonth returns nothing, or returns the caller that kept it alive

#### Manual

- [ ] 1.6 Each new unit test failed first for the stated reason
- [ ] 1.7 The acceptance example was computed by hand before the assertion was written

### Phase 2: Payments

#### Automated

- [ ] 2.1 Integration tests pass
- [ ] 2.2 Unit tests pass
- [ ] 2.3 Typecheck passes
- [ ] 2.4 All five migrations apply in order to a clean local database
- [ ] 2.5 Every new route answers 401 without a cookie
- [ ] 2.6 A payment is read back by a separate later request with every field intact

#### Manual

- [ ] 2.7 The ownership cases failed first for the right reason
- [ ] 2.8 A payment before the plan's first month produced 400 naming the date, with nothing stored

### Phase 3: Standing orders and their exceptions

#### Automated

- [ ] 3.1 Integration tests pass
- [ ] 3.2 Unit tests pass
- [ ] 3.3 Typecheck passes
- [ ] 3.4 All six migrations apply in order to a clean local database
- [ ] 3.5 Every new route answers 401 without a cookie
- [ ] 3.6 Deleting a member with a payment or a schedule returns 409 and the history survives
- [ ] 3.7 The summary through the API reflects a stored schedule and its exception

#### Manual

- [ ] 3.8 The exception and out-of-range cases failed first for the right reason
- [ ] 3.9 An overlapping arrangement produced 409 naming the rule rather than a 500

### Phase 4: The payments and standing-order sections

#### Automated

- [ ] 4.1 Typecheck passes across all three projects
- [ ] 4.2 Production build succeeds
- [ ] 4.3 The whole suite passes

#### Manual

- [ ] 4.4 A recorded payment moves the balance and the headline cards by its amount
- [ ] 4.5 An edit moves the balance and a delete returns it to where it started
- [ ] 4.6 A payment before the plan's first month is refused with a message naming the date
- [ ] 4.7 A future-dated payment counts as credit now
- [ ] 4.8 A standing order's elapsed months are counted and labelled assumed received
- [ ] 4.9 Marking one month as not received stops that month alone from counting
- [ ] 4.10 A recorded receipt and an assumed one are told apart without reading the amounts
- [ ] 4.11 Deleting a participant with history is refused
- [ ] 4.12 The reviewer account reaches none of the payments or standing orders
- [ ] 4.13 The layout is usable at a narrow phone width

### Phase 5: Evidence

#### Automated

- [ ] 5.1 The captured file exists and shows the passing counts
- [ ] 5.2 The same commands pass in one run

#### Manual

- [ ] 5.3 The evidence index row and work-log entry name this slice, its commit and its risks
