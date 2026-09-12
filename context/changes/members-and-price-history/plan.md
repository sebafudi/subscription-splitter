# Implementation plan: members and price history

## Overview

Teach the product to answer its own central question: what does each participant owe. The organizer
records participants with the whole months they were active, records what the plan cost from each
month onward, marks the months that were skipped, and reads this month's per-person share, the
headline totals and a per-participant balance. This is roadmap item S-02 and the milestone's north
star, because the primary success criterion is a balance that matches a hand calculation to the
minor unit and nothing else in the product matters if that number is wrong.

The calculation lands first, as a pure module with no storage dependency, so the boundary cases in
test-plan risks 1 and 5 are unit tests rather than browser runs.

## Current state analysis

S-01 has landed in full: two seeded accounts, sessions through Better Auth's mounted endpoints, a
`subscriptions` table with its repository and four routes, the ownership rule enforced inside the
repository's SQL, and three screens. `src/client/api.ts` exists and exports `request`,
`SignedOutError`, `ApiError` carrying a `field`, `getMe`, `signIn`, `signOut`, `listSubscriptions`
and `createSubscription`, and `src/client/screens/` holds `Login.tsx`, `Home.tsx` and
`SubscriptionForm.tsx`. `migrations/0001_auth.sql` and `0002_subscriptions.sql` are applied,
`src/server/validation/subscriptions.ts` carries the first Zod contract, and the integration suite
runs against one shared local D1 that it never resets.

`src/domain/` holds two helpers and nothing else. `shareForMonth(priceMinor, activeCount)` rounds a
priced month across the active members and already answers `0` for a zero active count.
`ownerResidualForMonth(priceMinor, activeCount)` returns `priceMinor - share * (activeCount - 1)`,
which silently assumes the owner is one of the active members. There is no month arithmetic, no
price lookup, no membership model and no summary. There is no table below `subscriptions`, and no
screen shows a number the product computed.

The prototype at `spotify-family-split` has a complete tested version of this accounting and was read
as a source of semantics only. Nothing is copied from it. Its rules, the ones this slice keeps that it
gets subtly right and the ones it overturns, are recorded in
`context/changes/members-and-price-history/research.md`.

## Desired end state

A subscription has an owner member from the moment it is created, and its first month cannot move
afterwards. The organizer adds participants with one or more whole-month active ranges, edits them,
archives the ones who have history and deletes the ones who do not. They record what the plan cost
from a given month onward, correct or remove a price entry, and mark a month as skipped. The detail
screen shows the headline numbers, what is owed to the organizer now, this month's per-person share,
their own share of this month, collected against expected this month, their net cost since the plan
started and how many participants are active, and underneath the same calculation resolved per
participant, most-owing first.

The worked example from the requirements holds through the API: a plan costing 100.00 PLN with the
owner and two participants active gives each participant a share of 33.33, leaves the owner with
33.34 for that month, and a participant who has paid 20.00 shows a balance of -13.33. A price change,
a skipped month and a participant who left all produce the right answer without manual correction. A
second account asking for any of the new records, by any route and any verb, is told they do not
exist, and so is an account naming its own child record through the wrong parent.

### Key findings

- A new Hono router mounted at `'/'` inherits no middleware from another router.
  `src/server/routes/subscriptions.ts:8-9` registers `requireSession` for its own two path patterns,
  and `src/server/index.ts` mounts each router at `'/'` with the router owning its absolute paths. A
  new route module that forgets its own registration ships unauthenticated and every test that
  carries a cookie still passes.
- Ownership for a child record is one join, not two queries. Filtering
  `join subscriptions s on s.id = <child>.subscription_id where s.id = ? and s.user_id = ?` in the
  same statement answers three cases with one predicate: a foreign child, a child reached through a
  foreign parent, and an account's own child reached through its own other subscription. A repository
  that keeps `s.user_id = ?` but drops the subscription id passes every cross-account test and still
  leaks between one account's own subscriptions.
- `patchSubscriptionSchema` accepts `start_month` (`src/server/validation/subscriptions.ts:42`) and
  `update` writes it. Moving the first month later would leave every stored range that begins earlier
  in violation of the rule the member write path enforces, so a member would become uneditable
  through the API while the summary silently dropped the truncated months from `totalPlanCost`. The
  first month therefore stops being patchable. No landed test asserts that a start-month patch
  succeeds, and the route already refuses `id` and `user_id` in a patch body, so the shape of the
  refusal is established.
- `priceForMonth` returns zero for any month before the first price entry, so deleting the earliest
  entry rewrites every month between the plan's start and the next entry to cost nothing, moving
  `totalPlanCost`, `ownerNetCost` and every balance with no trace. The prototype's R4 requires a
  warning on exactly this delete. This slice keeps that rule and makes it a refusal the caller can
  override deliberately.
- `ownerResidualForMonth` encodes "exactly one active member is the owner" in `activeCount - 1`
  (`src/domain/money.ts:19`). Rather than widening it, this slice leaves it exactly as S-01 shipped it
  and has `computeSummary` return the owner's share of the current month as a named field, so the
  number the organizer reads and the number the tests assert are the same number.
- Elapsed-ness is not one of the five conditions that decide whether a standing order counts for a
  month; in the prototype it arrives from the caller's month list. The test plan names it as a
  boundary in its own right and ties it to the subscription's time zone, so this slice makes the
  current month an explicit input to the rule instead of a property of whoever calls it.
- The integration suite shares one database and one database-backed rate limiter at ten requests per
  sixty seconds per client address (`src/server/auth.ts:26-33`). The three landed test files keep out
  of each other's way by client-address prefix, `10.0.0.x`, `10.1.0.x` and `10.2.0.1`. A shared helper
  that hands out one fixed prefix would put every file in one bucket, and the failure would look like
  a flaky sign-in rather than a throttle.
- D1 has no interactive transactions; `db.batch([...])` is the atomic unit. Two writes here need it:
  creating a subscription together with its owner member and that member's opening range, and
  replacing a member's active ranges.
- SQLite partial indexes express "at most one owner per subscription" in the schema, so the rule
  cannot be forgotten by a route. The cost is that a violation arrives as a thrown D1 error, which the
  route must catch and translate into 409 rather than letting it become a 500.
- The prototype's per-person share returns the whole undivided price when the active count is zero
  and the price is not, and no test pins that value. This project returns zero and lets the owner
  absorb the month, which is what `shareForMonth` already does. Recorded as D-006.
- A range whose joined month equals its left month covers exactly that one month, and two ranges that
  touch in the same month are an overlap rather than a merge, because the month is the unit of
  account and a member cannot leave and rejoin inside one.
- `Intl.DateTimeFormat` with an IANA zone behaves identically in the Workers runtime and in the node
  unit runner, so the current-month rule is testable with a fixed clock at the cheapest layer.

## What we are NOT doing

- No payments, no standing orders and no recurring exceptions through the API or the screens. Their
  types and the received-month rule land in the domain module now, because they are cheap there and
  because `balanceForMember` is meaningless without them, but no table, route or form exists for them
  until S-03. The state loader passes empty arrays, and the one balance the requirements name is
  asserted against the domain's payments input rather than through the API.
- No status grid, no per-month per-member cell status and no first-in-first-out attribution of funds
  against months. The requirements ask for a balance per participant, not a grid.
- No coverages, no opening balances carried in from a previous spreadsheet, and no month series or
  chart. All three are non-goals in the requirements.
- No largest-remainder allocation. The owner absorbs the residual, as `AGENTS.md` requires.
- No proration. Membership is whole months.
- No second subscription in the interface, no subscription deletion, no currency conversion.
- No re-validation of stored records against a moved first month, because the first month stops
  moving. The alternative, a guard that refuses the patch when any child record precedes the new
  value, was rejected as a rule that has to be kept in step with every child table added later.
- No deployment, no remote database and no browser end-to-end test. S-04 owns all three; this slice's
  browser pass is a manual checklist with captured evidence.
- No backfill of an owner member into subscriptions created before this slice. The summary answers
  409 for them and says why.

## Implementation approach

Test-first for the first two phases, which is where both of this slice's silent failures live. A
mis-rounded share and a leaked record both look like success from the outside, so each of those
phases writes the failing test first and watches it fail for the stated reason.

The calculation comes before any table. It is a pure module that receives a `SubscriptionState` value
and returns numbers, so every boundary the test plan names, price effective dating, break months,
inclusive multi-range membership, rounding, the owner's share, a month with nobody active, the
elapsed bound and the current month in a given time zone, is exercised without a binding. The storage
layers that follow have only one job each, to produce that value and to persist edits to it.

Ownership is extended, not re-established. Every new statement joins back to `subscriptions` and
filters by both the subscription id and the session user in the same query, so a foreign child, a
child reached through a foreign parent and an account's own child reached through its own other
subscription all fail the same predicate and all become 404.

Phases are ordered so each leaves the suite green and is reversible on its own: the calculation, then
members with their ranges and the owner member that comes with every subscription, then prices and
break months and the summary that combines everything, then the screen, then the evidence. The owner
member lands with the members table rather than later, so that no phase in this slice is written
against a precondition that a later phase removes.

## Critical implementation details

**Every new route module registers its own session middleware.** Routers are mounted at `'/'` and own
their absolute paths, so middleware does not cascade between them. Each new module registers
`requireSession` for `/api/subscriptions/*` before declaring its routes. A module that omits it ships
unauthenticated and every test that sends a cookie still passes, so the integration suite asserts a
401 without a cookie for every new route, not only for one of them.

**Ownership needs both halves of the predicate.** Every child statement filters the subscription id
and the session user together. Dropping the subscription id leaves a repository that passes every
cross-account test and still lets one account read its first subscription's members through its
second subscription's id, which is the anti-pattern test-plan risk 2 names.

**The owner member is created in the same batch as its subscription.** A subscription that exists
without an owner has no defined per-person share, so the two writes are one atomic unit, and they land
in phase 2 alongside the members table. From that point no route can produce an ownerless
subscription, which is why the summary's 409 for that state is provoked in tests by writing a
subscription row directly through `env.DB` rather than through the API.

**A duplicate owner arrives as a thrown error, not as a return value.** The partial unique index
rejects a second owner inside D1, so the insert throws. The route catches it, distinguishes the
unique-constraint failure from any other database error, and answers 409 with a message naming the
rule. Letting it escape would be a 500 that reads like a server fault rather than a refused write.

**Active ranges are replaced, never merged.** A member update carries the complete range set, and the
repository deletes every existing row for that member and inserts the new set inside one
`db.batch([...])` together with the member row update. A partial replacement would leave a member
with ranges from two different edits, which is the one way this table can invent liability.

**The first month is fixed at creation.** `start_month` leaves the patch schema, so a patch carrying
it is a 400 naming the field, exactly as a patch carrying `id` or `user_id` already is. Every stored
range, price entry and break month is validated against the first month on the way in, and because
that month cannot move afterwards, nothing has to be re-validated when a subscription changes.

## Phase 1: The calculation

### Overview

The domain module the whole product is judged against: month arithmetic, effective-dated prices,
whole-month membership, the per-person share, the owner's share of a month and the summary. Pure,
with no import from D1 or Hono. Written test-first, one failing unit test at a time, because
test-plan rollout phase 2 exists for exactly these cases.

### Required changes:

#### 1. Domain types

**File**: `src/domain/types.ts`

**Purpose**: One declared shape for everything the calculation reads, so the repositories and the
summary route have a target to produce rather than a shape they invent per call site.

**Contract**: `MonthStr` and `Minor` as named aliases over `string` and `number`, documented as
`YYYY-MM` and integer minor units. `ActiveRange { joinedMonth: MonthStr; leftMonth: MonthStr | null }`.
`Member { id: string; name: string; isOwner: boolean; archived: boolean; activeRanges: ActiveRange[] }`.
`PriceEntry { id: string; effectiveFrom: MonthStr; amount: Minor }`.
`RecurringSchedule { id: string; memberId: string; amount: Minor; startMonth: MonthStr; endMonth: MonthStr | null }`.
`RecurringException { recurringId: string; month: MonthStr }`.
`Payment { id: string; memberId: string; date: string; amount: Minor; note: string; kind: 'manual' | 'annual' }`.
`SubscriptionSettings { startMonth: MonthStr; currency: string; locale: string; timeZone: string }`.
`SubscriptionState { settings: SubscriptionSettings; priceHistory: PriceEntry[]; breakMonths: MonthStr[]; members: Member[]; recurring: RecurringSchedule[]; recurringExceptions: RecurringException[]; payments: Payment[] }`.
`MemberSummary` and `Summary` as the return shapes of `computeSummary`, listed in change 5 below.

The three collections S-03 fills are typed now and passed empty by this slice. Typing them now costs
one line each and keeps `balanceForMember` from being rewritten when payments arrive.

#### 2. Month arithmetic

**File**: `src/domain/months.ts`

**Purpose**: The month is the unit of account, so the two operations over it and the rule that
decides which month is current live in one place with no `Date` arithmetic in sight.

**Contract**: `addMonth(month: MonthStr, delta: number): MonthStr` by integer arithmetic over
`year * 12 + (month - 1) + delta`, correct for negative deltas and multi-year jumps.
`enumerateMonths(start: MonthStr, end: MonthStr): MonthStr[]`, inclusive of both endpoints and empty
when `end` precedes `start`. `currentMonth(timeZone: string, now?: Date): MonthStr`, derived from
`Intl.DateTimeFormat` with the passed zone and reassembled from its parts, with `now` defaulting to
the current instant so a test can pin it. `AGENTS.md` forbids deriving the month from server-local
date parts, and this is the one function allowed to ask what time it is.

Month strings compare chronologically as strings because the format is zero-padded, and the module
says so in one line so no later reader reaches for a parse.

#### 3. Money helpers

**File**: `src/domain/money.ts`

**Purpose**: Keep the rounding rule in one place and add the one formatting function the display
layer needs.

**Contract**: Add `formatMoney(minor: Minor, locale: string, currency: string): string` over
`Intl.NumberFormat`, used only at the display edge and never inside the calculation.

`shareForMonth` and `ownerResidualForMonth` are left exactly as S-01 shipped them, signatures and
tests included. An earlier draft of this plan widened `ownerResidualForMonth` with a charged count,
which was arithmetically correct and pointless: nothing would have called it, so the suite would have
proved one expression while the screen showed another. The owner's share of a month is produced once,
inside `computeSummary`, and that is the value the screen renders and the tests assert.
`ownerResidualForMonth` keeps no caller in this slice; its `activeCount - 1` assumption is therefore
inert rather than wrong, and whether to delete it is left to S-03, where payments make the question
concrete.

#### 4. Membership

**File**: `src/domain/members.ts`

**Purpose**: Decide who occupied a seat in a given month, and validate a proposed set of ranges before
it can be stored.

**Contract**: `rangeCovers(member: Member, month: MonthStr): boolean`, true when any of the member's
ranges covers the month, where a range covers `joinedMonth <= month` and either `leftMonth` is null or
`month <= leftMonth`. The left month is inclusive, so a range whose two ends are equal covers exactly
one month. `activeMembersInMonth(state: SubscriptionState, month: MonthStr): Member[]`, filtering
every member including the owner and ignoring `archived` entirely, because archiving is a
presentation flag and a member's liability is decided by their ranges alone. Making archiving change
the active count would move every past month's share retroactively.
`chargedMembersInMonth(state, month): Member[]`, the active members excluding the owner, so the count
the owner's share depends on is named once rather than re-derived at each call site.

`validateActiveRanges(ranges: ActiveRange[], startMonth: MonthStr): string | null`, returning null or
the first violation as a message naming the field at fault: the set is empty, a range ends before it
starts, a range begins before the subscription's first month, ranges overlap once sorted by joined
month, or an open-ended range is followed by another range. Two ranges that touch in the same month
count as an overlap rather than a merge.

#### 5. The calculation

**File**: `src/domain/calc.ts`

**Purpose**: Every number the product shows, derived from which months each member was active and
what the plan cost in each month.

**Contract**:

`priceForMonth(state, month): Minor` returns `0` when the month is a break month, without consulting
the price history at all, and otherwise the amount of the latest entry whose `effectiveFrom` is at or
before the month, or `0` when no entry applies yet. The break month wins; that ordering is the whole
point of having both concepts.

`perPersonShare(state, month): Minor` returns `0` when the price for the month is `0` or when nobody
is active, and otherwise `shareForMonth(price, activeCount)` with the owner counted in the active
count. The zero-active answer is decision D-006: the month still costs what it costs, nobody owes a
share, and the owner absorbs all of it.

`shareForMember(state, member, month): Minor` returns `0` for the owner and `0` for a member whose
ranges do not cover the month, and otherwise `perPersonShare` for that month.

`recurringReceived(state, member, months, current: MonthStr): Minor` sums a schedule's amount for
each month that is at or after its start month, at or before its end month when it has one, at or
before the current month whether or not the schedule has an end month, not a break month, covered by
one of the member's ranges, and not listed as an exception for that schedule and month. The current
month is an explicit argument rather than a property of the month list the caller happens to pass,
because the test plan names the not-yet-elapsed boundary as its own failure mode and ties it to the
subscription's time zone. Dropping any one of the six conditions overstates what has been collected,
which is the failure test-plan risk 4 names.

`balanceForMember(state, member, months, current): { owed: Minor; paid: Minor; balance: Minor }`,
where owed is the sum of `shareForMember` over the months, paid is the member's recorded payments plus
`recurringReceived`, and balance is paid minus owed, negative when they owe.

`computeSummary(state, current: MonthStr): Summary` enumerates the months from the settings' start
month to `current` inclusive, so nothing after the current month is enumerated, owed for, or counted
as received, and returns `currentMonth`, `currency`, `locale`, `currentMonthly`, `currentActiveCount`,
`currentPerPersonShare`, `ownerShareThisMonth`, `owedToYouNow` (the total of every negative balance,
as a positive number), `creditOutstanding` (the total of every positive balance), `expectedThisMonth`
(the sum of every charged member's share for the current month), `collectedThisMonth` (payments dated
in the current month plus recurring received for it), `totalPlanCost` (the sum of `priceForMonth` over
every month, whether or not anyone was active), `totalCollected`, `ownerNetCost` (`totalPlanCost` less
`totalCollected`) and `members`, one `MemberSummary` per non-owner member sorted by balance ascending
so the most-owing member is first.

`ownerShareThisMonth` is `currentMonthly` less `expectedThisMonth`: what the month costs, less what
the charged members carry, which is the 33.34 the requirements name. It is computed once, here, and
the screen renders it rather than re-deriving it. `currency` and `locale` are carried so the screen
can format without a second request for the subscription row.

`MemberSummary` carries `memberId`, `name`, `archived`, `activeThisMonth`, `currentShare`, `owed`,
`paid` and `balance`. The owner is not in the list: their position is `ownerShareThisMonth` for this
month and `ownerNetCost` for the whole plan.

The month always balances exactly. For any month, the sum of every charged member's share plus the
owner's share equals the price for that month, including when the price is zero, when the month is a
break month and when nobody is active.

#### 6. Unit tests for the calculation

**Files**: `src/domain/months.test.ts`, `src/domain/money.test.ts`, `src/domain/members.test.ts`,
`src/domain/calc.test.ts`

**Purpose**: Prove test-plan risks 1 and 5 at the cheapest layer, prove the elapsed half of risk 4,
and close the two blind spots the prototype's own suite has. Written before the modules they exercise.

**Contract**: Cases, ported in intent from the prototype and extended where its suite was silent:

- month arithmetic across a year boundary in both directions, and a multi-year jump in one call
- `enumerateMonths` inclusive at both ends, one month when the ends are equal, empty when reversed
- `currentMonth` with a fixed instant and two zones that disagree about the month at that instant, so
  the time-zone rule is exercised rather than assumed, and the same instant in a zone where it is
  already the next month
- the price for a month is the latest entry at or before it, across a change
- the price is zero before the first entry
- a break month is zero and the price entry still applies to the month after it
- three active members including the owner split an evenly divisible price exactly
- the requirements' worked example asserted through `computeSummary`, the path the screen uses:
  `currentMonthly` 10000, `currentActiveCount` 3, `currentPerPersonShare` 3333, `expectedThisMonth`
  6666 and `ownerShareThisMonth` 3334
- the requirements' third acceptance number: the same state with a payment of 2000 from one member
  gives that member a `balance` of -1333 for the single month, and the other member -3333
- the month balances across a table of prices and active counts, including a month the owner sits out
  and a month with nobody active. Each row asserts `currentMonthly`, `currentPerPersonShare`,
  `expectedThisMonth` and `ownerShareThisMonth` against values computed by hand, and only then their
  sum. Asserting the sum alone would pass whatever the implementation did, because
  `ownerShareThisMonth` is defined as that subtraction
- a range whose ends are equal covers exactly that month and no other
- a member with two ranges and a gap owes for the covered months only and nothing for the gap
- a member whose left month has passed stops accruing, and their earlier liability is unchanged
- the owner never owes, whatever their ranges say
- a priced month with nobody active: the share is zero, no member owes, the cost is still in
  `totalPlanCost` and in `ownerNetCost`, `ownerShareThisMonth` is the whole price, and nothing throws
- `recurringReceived` counts a month in range and skips each of the five cases that disqualify one,
  one test per case, including a schedule with no end month contributing nothing for a month after
  the current one
- `balanceForMember` is paid less owed, negative when owing and positive when ahead
- `computeSummary` on a state with a price change, a break month, a departure and a rejoin returns
  every field correctly, with the member list most-owing first
- `validateActiveRanges` accepts a valid set and rejects each violation with its own message
- `formatMoney` renders one amount in the subscription's locale and currency

### Success criteria:

#### Automated verification:

- Unit tests pass: `npm run test:unit`
- Typecheck passes: `npm run typecheck`
- Integration tests still pass: `npm run test:integration`
- Nothing under `src/domain/` imports from `src/server/`, `hono` or a D1 type
- All three of US-01's numeric acceptance criteria are asserted through `computeSummary` and
  `balanceForMember`, the paths the routes and the screen use

#### Manual verification:

- Each new unit test failed first against the unwritten function, for the stated reason rather than
  for an import error
- The worked example in the requirements was computed by hand and matched before the assertion was
  written, rather than copied out of the implementation

**Implementation note**: After this phase and all its automated verification, stop for human
confirmation before moving to the next phase.

---

## Phase 2: Members, their active ranges and the owner

### Overview

The first child table, its repository, its routes, the owner member every subscription now gets at
creation, and the ownership tests that prove neither another account nor another subscription can
reach any of it. Written test-first, because a leak looks like success from the outside.

### Required changes:

#### 1. Members migration

**File**: `migrations/0003_members.sql`

**Purpose**: Store participants and the whole months each of them took part in.

**Contract**: `members(id TEXT PRIMARY KEY, subscription_id TEXT NOT NULL REFERENCES
"subscriptions"("id") ON DELETE CASCADE, name TEXT NOT NULL, is_owner INTEGER NOT NULL CHECK (is_owner
IN (0, 1)), archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)), created_at TEXT NOT NULL)`
with `CREATE INDEX "members_subscription_id_idx"` on the foreign key and a partial unique index
`CREATE UNIQUE INDEX "members_one_owner_idx" ON "members"("subscription_id") WHERE "is_owner" = 1`,
which is how "exactly one owner per subscription" stops being a rule a route has to remember. The
index name carries the repository's `_idx` suffix so it reads like every other index in `migrations/`.

`active_ranges(id TEXT PRIMARY KEY, member_id TEXT NOT NULL REFERENCES "members"("id") ON DELETE
CASCADE, joined_month TEXT NOT NULL CHECK (joined_month GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]'),
left_month TEXT CHECK (left_month IS NULL OR left_month GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]'))` with
an added `CHECK (left_month IS NULL OR left_month >= joined_month)` and
`CREATE INDEX "active_ranges_member_id_idx"`. Style follows `0002_subscriptions.sql` exactly: quoted
identifiers, no `IF NOT EXISTS`, cascade on every foreign key, month CHECKs as tight as `GLOB` allows
with the residual gap closed by the Zod range rule every write passes through.

#### 2. The owner member, and a first month that stops moving

**Files**: `src/server/validation/subscriptions.ts`, `src/server/db/subscriptions.ts`,
`src/client/screens/SubscriptionForm.tsx`

**Purpose**: Make a subscription without an owner unreachable rather than merely discouraged, and
remove the one edit that would invalidate every stored range.

**Contract**: `createSubscriptionSchema` gains `owner_name`, an optional non-empty string defaulting to
`Me`. `patchSubscriptionSchema` loses `start_month`, so a patch carrying it is a 400 naming the field,
in the same shape as the existing refusal of `id` and `user_id`. Renaming the owner is a member edit,
not a subscription edit, so there is one path for it rather than two.

`create` writes the subscription row, the owner member row with `is_owner` set and the owner's opening
active range starting at the subscription's first month with no left month, in one `db.batch([...])`.
The returned shape is unchanged, so S-01's routes, tests and screens keep working untouched, and the
create form gains one optional field for the owner's name.

This lands with the members table rather than in a later phase so that nothing in phases 3 and 4 is
written against a precondition that a later phase removes. No landed test asserts that a start-month
patch succeeds, so removing the field breaks nothing already green.

#### 3. Member validation contract

**File**: `src/server/validation/members.ts`

**Purpose**: One declared schema for member input, shared by the routes and exercised directly by a
unit test.

**Contract**: Request keys stay snake_case, matching `subscriptions.ts`. An active range is
`{ joined_month, left_month }` with the same month pattern the subscription schema uses and
`left_month` nullable. `createMemberSchema` requires `name` non-empty after trimming, `active_ranges`
as a non-empty array, and accepts optional `is_owner` defaulting to false and `archived` defaulting to
false. A create carrying `is_owner: true` is schema-valid and is refused by the database, which is
what makes 409 the answer rather than 400: the rule is "there is already an owner", not "this field is
malformed". `patchMemberSchema` is the partial, strict form rejecting an empty body, and may carry
`archived` and a complete replacement `active_ranges`. Both are `.strict()`, so an unknown key is a
400 rather than a silent drop. Ordering rules over a range set are not expressed in Zod: the schema
checks shape, the domain's `validateActiveRanges` checks the invariant, and the route runs the second
after the first and turns its message into the same 400 shape.

#### 4. Members repository

**File**: `src/server/db/members.ts`

**Purpose**: The only place that writes SQL for members and their ranges, and the single enforcement
point for ownership over both.

**Contract**: `list(db, subscriptionId, userId)`, `get(db, subscriptionId, memberId, userId)`,
`create(db, subscriptionId, userId, input)`, `update(db, subscriptionId, memberId, userId, patch)`,
`remove(db, subscriptionId, memberId, userId)` and
`hasDependents(db, subscriptionId, memberId, userId)`. Every statement without exception joins
`subscriptions` and filters `s.id = ?` and `s.user_id = ?` together, so a foreign member, a member
reached through a foreign subscription, a member reached through the caller's own other subscription
and a member that does not exist are one answer: `null`, or `false` from `remove`. `hasDependents`
carries the same predicate as its siblings even though the route calls it only after a scoped `get`,
because S-03 adds clauses to it and an exception to a module-wide rule stops being safe quietly.

Ranges are read with the member and mapped into the domain's camelCase `Member` shape at this
boundary, so no column name escapes the module. `create` generates the identifiers with
`crypto.randomUUID()` and writes the member row and all its range rows in one `db.batch([...])`.
`update` writes the member row update, a delete of every range for that member and inserts for the
complete new set in one `db.batch([...])`, so a half-applied edit cannot leave ranges from two
versions side by side.

#### 5. Member routes

**File**: `src/server/routes/members.ts`

**Purpose**: The five operations the participant list needs, each behind the session middleware and
each scoped through the owning subscription.

**Contract**: The module registers `app.use('/api/subscriptions/*', requireSession)` for itself before
declaring anything, because middleware does not cascade from another router mounted at the same base.

`GET /api/subscriptions/:id/members` returns the members of the subscription, 404 when the
subscription is missing or belongs to someone else. `POST` validates the body, runs
`validateActiveRanges` against the subscription's start month, creates the member and returns 201, or
409 when the body asks for an owner and one already exists.
`GET /api/subscriptions/:id/members/:memberId` returns the member or 404. `PATCH` validates, replaces
the range set atomically when one is supplied, may set `archived`, and returns the updated member or
404. `DELETE` returns 204 on success, 409 when the member is the owner, because a subscription without
an owner has no defined share, and 409 when `hasDependents` is true, which in this slice cannot happen
but is where S-03's payments and schedules attach.

Status codes: 401 without a session, 400 with a message naming the field at fault, 404 for anything
missing or foreign, 409 for a second owner and for a refused delete. A second owner surfaces as a
thrown unique-constraint error from D1; the route distinguishes it from any other database failure and
answers 409 with a message naming the rule rather than letting it become a 500.

#### 6. Composition

**File**: `src/server/index.ts`

**Purpose**: Mount the new router.

**Contract**: Add `app.route('/', membersRoutes)` alongside the existing routers, before the
`notFound` handler. Order relative to the subscriptions router does not matter because the paths do
not collide.

#### 7. Shared integration helpers

**Files**: `tests/integration/accounts.ts`, `tests/integration/auth.test.ts`,
`tests/integration/subscriptions.test.ts`, `tests/integration/dev-seed.test.ts`

**Purpose**: Consolidate the two-account seeding dance into one module before three more files copy
it, and keep the client-address namespaces that stop the throttle from crossing files.

**Contract**: Export the helpers the existing integration files define privately: a Better Auth
instance built against `env.DB` with sign-up enabled for seeding, a `set-cookie` extractor, a header
builder and a helper that seeds an account and returns a signed-in cookie. The header builder takes a
per-file address prefix as an argument rather than hard-coding one, because the limiter is
database-backed at ten requests per sixty seconds per address and the database is shared and never
reset. One line beside the helper records the constraint and the assignments already in use:
`10.0.0.x` for `auth.test.ts`, `10.1.0.x` for `subscriptions.test.ts`, `10.2.0.1` for
`dev-seed.test.ts`, and `10.3.0.x`, `10.4.0.x` and `10.5.0.x` for the three files this slice adds.

The three landed files are folded onto the shared module in the same step, keeping their existing
prefixes and their existing assertions, so this module consolidates two copies rather than becoming a
third. S-01 has landed in full, so the collision argument an earlier draft of this plan gave for
deferring the fold no longer applies. If S-01's implementation review is still editing those files
when this step starts, the fold alone moves to its own change and the new files use the shared module
from the outset.

#### 8. Ownership and validation tests

**Files**: `tests/integration/members.test.ts`, `src/server/validation/members.test.ts`

**Purpose**: Prove test-plan risk 2 for a child resource and risk 3 for its round trip. Written before
the routes.

**Contract**: The integration test seeds two accounts inside one block with emails unique to the test,
signs both in on the `10.3.0.x` prefix, and creates a subscription for each. Cases:

- a created subscription comes back with exactly one owner member, named from `owner_name` or `Me`,
  whose single range starts at the subscription's first month and has no left month
- a `PATCH` on a subscription carrying `start_month` returns 400 naming the field, and the stored row
  is unchanged
- a member created by account A is listed for A
- account B gets 404 from `GET`, `POST`, `PATCH` and `DELETE` naming A's subscription or A's member,
  including A's member id reached through B's own subscription id
- one account creates two subscriptions, and naming the first subscription's member through the
  second subscription's id returns 404 for `GET`, `PATCH` and `DELETE`. A repository that keeps the
  user predicate and drops the subscription predicate passes every cross-account case above and fails
  this one, which is the only case that catches it
- every one of the five routes returns 401 without a cookie
- a created member with two ranges is returned by a later, separate request with both ranges intact,
  proving it persisted rather than being held in memory
- a `PATCH` replacing the range set leaves exactly the new set, with no row from the previous edit
- a `POST` asking for a second owner returns 409, and the existing owner is unaffected
- deleting the owner returns 409; deleting an ordinary member returns 204 and a following read is 404
- invalid bodies return 400 with the field named, covering a bad month, an empty name, an empty range
  array, a range ending before it starts, overlapping ranges, a range beginning before the
  subscription's start month and an unknown key

The unit test covers the schema alone: defaults, the month format including the values the database
pattern by itself would admit, rejection of unknown keys, rejection of an empty patch, and the absence
of `start_month` from the subscription patch schema.

### Success criteria:

#### Automated verification:

- Integration tests pass: `npm run test:integration`
- Unit tests pass: `npm run test:unit`
- Typecheck passes: `npm run typecheck`
- All three migrations apply in order to a clean local database: `npm run db:migrate:local`
- Every new route answers 401 without a cookie, asserted per route rather than once
- A created subscription comes back with exactly one owner member whose range starts at its first month
- A subscription `PATCH` carrying `start_month` is refused with 400 and changes nothing

#### Manual verification:

- The ownership cases failed first against the unwritten routes, and for the right reason
- A second owner was attempted against a local database and produced 409 rather than a 500

**Implementation note**: Stop for human confirmation before the next phase.

---

## Phase 3: Prices, break months and the summary

### Overview

What the plan cost from each month onward, which months were skipped, and the route that loads the
whole state and answers with the numbers the screen shows.

### Required changes:

#### 1. Prices and break months migration

**File**: `migrations/0004_prices_and_breaks.sql`

**Purpose**: The two remaining inputs the calculation needs.

**Contract**: `price_history(id TEXT PRIMARY KEY, subscription_id TEXT NOT NULL REFERENCES
"subscriptions"("id") ON DELETE CASCADE, effective_from TEXT NOT NULL CHECK (effective_from GLOB
'[0-9][0-9][0-9][0-9]-[01][0-9]'), amount INTEGER NOT NULL CHECK (amount > 0), UNIQUE(subscription_id,
effective_from))`. A positive amount is deliberate: a month that costs nothing is a break month, not a
price of zero, and the requirements keep the two apart because they differ in whether a standing order
counts as received.

`break_months(subscription_id TEXT NOT NULL REFERENCES "subscriptions"("id") ON DELETE CASCADE, month
TEXT NOT NULL CHECK (month GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]'), PRIMARY KEY(subscription_id,
month))`.

Neither table needs a separate index on its foreign key: `UNIQUE(subscription_id, effective_from)` and
the composite primary key each lead with `subscription_id`, so they already serve every lookup this
slice makes. Adding one would be a second index over the same leading column.

#### 2. Price and break-month validation

**File**: `src/server/validation/prices.ts`

**Purpose**: One schema per write, in the same shape as the other validation modules.

**Contract**: `createPriceSchema` with `effective_from` on the month pattern and `amount` a positive
integer in minor units, strict. `createBreakMonthSchema` with `month` on the same pattern, strict. A
month in a path parameter is validated with the same month schema before it reaches SQL, so a
malformed month is a 400 rather than a silent miss.

Both writes are additionally checked against the subscription's first month in the route, with the
same message shape `validateActiveRanges` produces, so a price entry or a break month cannot sit
before the plan started. Member ranges were already bounded that way and the asymmetry would have been
confusing rather than harmful; the prototype's R10 bounds all three the same way. The bound is stable
because the first month cannot be patched.

#### 3. Price and break-month repositories

**Files**: `src/server/db/prices.ts`, `src/server/db/break-months.ts`

**Purpose**: The only places that write SQL for these two tables.

**Contract**: `list(db, subscriptionId, userId)`, `create(db, subscriptionId, userId, input)` and
`remove(db, subscriptionId, ..., userId)` in each, every statement joining `subscriptions` and
filtering `s.id = ?` and `s.user_id = ?` together, as in the members repository. Prices are removed by
identifier, break months by their month value, which is their own key. A duplicate price for a month
violates the unique constraint and throws, which the route translates into 409; a duplicate break
month is idempotent and answers 201 either way, because marking an already-skipped month as skipped is
not an error.

#### 4. State loader

**File**: `src/server/db/subscription-state.ts`

**Purpose**: Produce the exact `SubscriptionState` the domain module expects, in one place, so the
summary route does no assembly of its own.

**Contract**: `loadState(db, subscriptionId, userId): Promise<SubscriptionState | null>` reads the
subscription, its members with their ranges, its price history and its break months, all filtered
through the same ownership predicate, and returns `null` when the subscription is missing or foreign.
Recurring schedules, exceptions and payments are returned as empty arrays with a one-line note saying
S-03 fills them; the domain is already written against the full shape, so that slice adds three reads
and changes nothing else.

#### 5. Price, break-month and summary routes

**Files**: `src/server/routes/prices.ts`, `src/server/routes/break-months.ts`,
`src/server/routes/summary.ts`

**Purpose**: The remaining API surface this slice needs.

**Contract**: Each module registers `requireSession` for `/api/subscriptions/*` itself.

`GET` and `POST /api/subscriptions/:id/prices`, `DELETE /api/subscriptions/:id/prices/:priceId`.
`GET` and `POST /api/subscriptions/:id/break-months`,
`DELETE /api/subscriptions/:id/break-months/:month`. Status codes follow the members routes: 401, 400
with the field named, 404 for missing or foreign, 201 on create and 204 on delete.

Deleting a price entry that would leave already-priced months with no price is refused with 409 and a
message naming the months that would lose their price, unless the request carries `?confirm=true`.
This is the case where the entry is the earliest one and at least one month at or after the plan's
first month and before the next entry currently has a price. Without the guard the delete silently
rewrites those months to cost nothing and moves `totalPlanCost`, `ownerNetCost` and every balance with
no trace. The prototype's R4 requires a warning here and this is the same rule expressed as a refusal
the caller can override on purpose, which is what an API can offer in place of a dialogue.

`GET /api/subscriptions/:id/summary` loads the state, derives the current month from the
subscription's own time zone with `currentMonth(settings.timeZone)`, and returns `computeSummary`,
including the `currency` and `locale` the screen formats with. When the state has no owner member,
which after phase 2 is only possible for a subscription created before this slice, it answers 409 with
a message saying the subscription has no owner member and naming the members route as the remedy. The
alternative, a backfill migration, was rejected because it would have to invent both a name and a
joined month for a member the organizer never entered.

#### 6. Composition

**File**: `src/server/index.ts`

**Purpose**: Mount the three new routers.

**Contract**: Three more `app.route('/', ...)` calls before the `notFound` handler.

#### 7. Tests

**Files**: `tests/integration/prices.test.ts`, `tests/integration/summary.test.ts`,
`src/server/validation/prices.test.ts`

**Purpose**: Prove the ownership rule for the two remaining resources and prove the worked example
end to end through the API rather than only in the domain module.

**Contract**: The price and break-month integration tests run on the `10.4.0.x` prefix and mirror the
members file: a round trip that persists across requests, 404 for every verb from the second account
including through a foreign parent, 404 for a child of one of the account's own subscriptions named
through another of its own subscriptions, 401 without a cookie for every route, 400 for a malformed
month, a non-positive amount and a month before the subscription's first month, 409 for a duplicate
price month, and an idempotent second break month. Two cases pin the delete guard: deleting the
earliest price entry while a later one exists returns 409 naming the affected months and changes
nothing, and the same call with `?confirm=true` returns 204 and the summary afterwards shows those
months at zero, so the recompute is pinned rather than assumed.

The summary test runs on the `10.5.0.x` prefix and builds the requirements' worked example through the
API only: create a subscription starting in the current month with an owner name, add two participants
active from that month, post a price of 10000, then read the summary and assert a per-person share of
3333, two members each owing 3333, `expectedThisMonth` 6666, `ownerShareThisMonth` 3334,
`currentActiveCount` 3, `owedToYouNow` 6666 and `totalPlanCost` 10000. No step adds the owner: phase 2
made it automatic, and a `POST` asking for one would now be a 409. A second case adds a price change
and a break month across three months and asserts the totals. A third asserts 404 from the second
account and 401 without a cookie. A fourth asserts the 409 for a subscription with no owner member,
whose precondition is built by inserting a subscription row directly through `env.DB` in a small
test-only helper beside the other account helpers, because after phase 2 no route can produce that
state. The helper carries one line saying why it exists, so it is not mistaken for a shortcut around
the API.

### Success criteria:

#### Automated verification:

- Integration tests pass: `npm run test:integration`
- Unit tests pass: `npm run test:unit`
- Typecheck passes: `npm run typecheck`
- All four migrations apply in order to a clean local database: `npm run db:migrate:local`
- The worked example from the requirements is asserted through the API and matches to the minor unit
- Deleting the earliest price entry is refused without confirmation, and the summary after a confirmed
  delete shows the affected months at zero

#### Manual verification:

- The summary read through the API agrees with the same state computed by the domain unit tests, for
  the worked example
- The current month in the summary matches the calendar month in the subscription's time zone rather
  than the machine's

**Implementation note**: Stop for human confirmation before the next phase.

---

## Phase 4: The detail screen

### Overview

The organizer can do all of this in a browser.

### Required changes:

#### 1. API client

**File**: `src/client/api.ts`

**Purpose**: Keep the new calls in the one place S-01 established rather than scattering `fetch` calls
across screens.

**Contract**: Extend the landed module, which already exports `request`, `SignedOutError`, `ApiError`
carrying a `field`, `getMe`, `signIn`, `signOut`, `listSubscriptions` and `createSubscription`. Add the
members, prices, break-months and summary calls on the same `request` helper, so they inherit its
credential handling, its JSON handling and its translation of a 401 into a signed-out state. The price
delete takes a confirm flag that becomes the `?confirm=true` query. `createSubscription` gains the
optional owner name. Types for the summary and the member shapes live here beside the existing
`Subscription` type.

#### 2. Choosing a subscription

**Files**: `src/client/App.tsx`, `src/client/screens/Home.tsx`

**Purpose**: Get from the list to the detail screen without adding a router for one navigation step.

**Contract**: `Home` takes an `onSelect` prop and renders each subscription as a control that calls it
with the whole `Subscription` object rather than as a plain list item. `App` holds the selected
subscription in its own state, renders the detail screen when one is set, and clears it from a back
control on the detail screen. Holding the object rather than the id means the screen has the name to
show immediately; the currency and locale it formats with come from the summary payload, so nothing
re-reads the subscription row.

#### 3. The detail screen

**Files**: `src/client/screens/SubscriptionDetail.tsx`,
`src/client/components/MemberForm.tsx`, `src/client/components/MemberList.tsx`,
`src/client/components/PriceHistory.tsx`, `src/client/components/BreakMonths.tsx`

**Purpose**: The screen the requirements describe, and the only place the organizer meets the
calculation.

**Contract**: Five headline cards reading from the summary: what is owed to you now, this month's
per-person share, your own share this month, collected against expected this month, and how many
participants are active, with your net cost since the plan started shown beside them. Labels are
honest: the net-cost card says since the plan started, and `ownerShareThisMonth` is rendered as its
own number rather than folded into it.

Below the cards: the member list with each member's balance, owing or ahead, most-owing first, the
owner shown separately as the account holder rather than as a row with a balance, and archived members
hidden behind a toggle when their balance is zero, which is the requirements' own default for open
question 3. A form adds and edits a member with a name and one or more month ranges, adding and
removing a range row. A price history list adds an entry with a month and an amount and deletes one; a
delete refused with 409 turns into an inline confirmation in the list naming the months that lose
their price, with a confirm control that reissues the call with the flag set and a cancel that leaves
everything alone. No browser dialogue, and nothing blocks the rest of the screen while it is open. A
break month list adds and removes a month. Amounts are entered in major units and converted at the
edge; everything over the wire stays in minor units. Field-level messages from a 400 are shown against
the field the response names, read from `ApiError.field`.

Three states are specified rather than left to the implementer. While the summary is in flight the
screen shows a loading state that does not collapse the layout. A failed load shows the error with a
retry control and keeps the back control usable. A 409 from the summary, which is what every local
database carried over from S-01 will answer, renders the message the route returned, since it already
names the missing owner and the remedy, rather than a generic failure.

#### 4. Layout

**File**: `src/client/index.css`

**Purpose**: Keep the new screen readable on a phone without adding a component library.

**Contract**: Extend the existing plain stylesheet with a card row that wraps, a list that reads as
rows on a narrow screen, and form controls legible at small sizes with visible focus states. No design
system, no icon font, no external stylesheet.

### Success criteria:

#### Automated verification:

- Typecheck passes across all three projects: `npm run typecheck`
- Production build succeeds: `npm run build`
- The whole suite passes: `npm test`

#### Manual verification:

- Create a subscription, open it from the home list, and find the owner already listed as the account
  holder
- Add two participants active from the first month, set a price of 100.00, and read a per-person share
  of 33.33 with 33.34 shown as your own share of the month
- Record that one participant left, and watch the following month's share move to the smaller group
  while their earlier months are unchanged
- Record a rejoin for the same participant and watch their liability resume without a second record
  appearing
- Mark a month as skipped and confirm nobody owes anything for it and the months around it are
  unchanged
- Change the price from a later month and confirm earlier months keep the old price
- Delete the earliest price entry, read the inline confirmation naming the months that lose their
  price, cancel it, then confirm it and watch the totals move
- Archive a participant with a balance and confirm they stay reachable, and archive one with a zero
  balance and confirm the current-month view hides them until the toggle is used
- Sign in as the reviewer account and confirm none of the owner's participants, prices or break months
  are reachable
- Watch the screen's three states: the loading state while the summary is in flight, the error state
  with a working retry after a failed load, and the no-owner message on a subscription created before
  this slice, which is what a local database carried over from S-01 will show
- The layout is usable at a narrow phone width

**Implementation note**: Stop for human confirmation before the next phase.

---

## Phase 5: Evidence

### Overview

Capture the verification trail this project requires.

### Required changes:

#### 1. Captured run

**File**: `evidence/runs/members-and-price-history-tests.txt`

**Purpose**: A record of what passed, at which commit, rather than an assertion that it did.

**Contract**: The captured output of `npm run typecheck`, `npm run test:unit` and
`npm run test:integration` in one file, with the counts visible.

#### 2. Index and work log

**Files**: `evidence/index.md`, `evidence/work-log.md`

**Purpose**: Keep the evidence map complete.

**Contract**: Append one evidence row naming this slice, the artifacts, the commit and the risks
covered, and one work-log entry. Append only; never rewrite either file.

#### 3. Test plan status and cookbook

**File**: `context/foundation/test-plan.md`

**Purpose**: Record what has shipped, and fill the two cookbook entries this slice is the first to be
able to answer.

**Contract**: In section 3, set rollout phase 2's status and change folder, and correct rollout phase
1's status, which still reads not started although S-01 has landed. In section 6.1, replace the
placeholder with how a unit test for the calculation is added here: where the file goes, that it takes
a `SubscriptionState` value and asserts minor units, and that an expected value is computed by hand
rather than read out of the implementation. In section 6.3, replace the placeholder with the canonical
ownership test for a child resource, which this slice writes three times: the four cross-account
cases, the wrong-parent case inside one account, the 401 per route, and the rule that it asserts
absence rather than a permission error. Leave every other section untouched.

### Success criteria:

#### Automated verification:

- The captured file exists and shows the passing counts for all three commands
- The same commands pass in one run: `npm run typecheck && npm test`
- Test-plan sections 6.1 and 6.3 carry entries rather than placeholders, and rollout phases 1 and 2
  record their status

#### Manual verification:

- The evidence index row and the work-log entry name this slice, its commit and the risks it covered

---

## Testing strategy

### Unit tests:

- Month arithmetic across year boundaries, inclusive enumeration, and the current month derived from a
  fixed instant in two disagreeing time zones
- Price effective dating, including before the first entry and across a change, and a break month
  beating the price
- The per-person share, its rounding, and the owner's exclusion from paying and inclusion in the count
- All three of US-01's numeric acceptance criteria through `computeSummary` and `balanceForMember`
- The month balancing exactly, asserted field by field against hand-computed values and only then as a
  sum, across a table that includes a month the owner sits out and a month with nobody active
- Inclusive single-month ranges, multi-range membership with a gap, and a departure that stops
  accruing without disturbing earlier months
- A priced month with nobody active: share zero, cost absorbed, totals intact, nothing thrown
- The recurring received rule, one test per disqualifying condition, including the not-yet-elapsed
  boundary
- `computeSummary` over a state combining a price change, a break month, a departure and a rejoin
- Range validation, one test per violation
- Both validation schema modules: formats, defaults, unknown keys, empty patch, and the absence of
  `start_month` from the subscription patch schema

### Integration tests:

- Members, prices and break months: create, read back in a separate request, edit, delete
- Ownership for every new route and verb, cross-account and through a foreign parent
- The wrong-parent case inside one account, for each of the three child resources
- 401 for every new route without a cookie
- A created subscription carries exactly one owner member from its first month
- A subscription patch carrying `start_month` is refused
- A second owner returns 409; deleting the owner returns 409
- Range replacement leaves exactly the new set
- The earliest price delete is refused without confirmation and recomputes correctly with it
- The requirements' worked example read through the summary route, matching to the minor unit
- A summary across a price change and a break month
- A subscription with no owner member answers 409 from the summary

### Manual testing steps:

1. Create a subscription and confirm the owner member exists without being entered.
2. Add two participants from the first month, set a price of 100.00, and read 33.33 each with 33.34
   as the organizer's own share.
3. Record a departure, then a rejoin, and confirm the shares move only for the affected months.
4. Mark a month as skipped and confirm nobody owes for it.
5. Change the price from a later month and confirm earlier months are unaffected, then delete the
   earliest entry and walk the confirmation.
6. Archive a participant and confirm the list behaves as the requirements' default describes.
7. Sign in as the reviewer account and confirm none of it is reachable.
8. Resize to a narrow phone width and confirm the screen stays usable.

### Risk mapping

| Test-plan risk | Covered by | Phase |
|---|---|---|
| 1, a balance wrong by rounding, by a month or by a price | the unit tests in `src/domain/*.test.ts`, all three of US-01's numbers asserted through `computeSummary`, and the worked example asserted through the summary route | 1, 3 |
| 5, a charged month with nobody active | the zero-active unit cases: share zero, cost still in the plan total and the owner's net cost, the whole price as the owner's share, nothing thrown | 1 |
| 2, a record reached across accounts | ownership and 401 cases in `tests/integration/members.test.ts`, `prices.test.ts` and `summary.test.ts`, covering a foreign child, a child through a foreign parent, and one account's own child through its own other subscription | 2, 3 |
| 3, a record lost or half-applied | the create-then-refetch cases, the range-replacement case, the price-delete recompute case, and all four migrations applying in order | 2, 3 |
| 4, a standing order counted for a month it should not cover | the `recurringReceived` unit cases, one per condition, including the not-yet-elapsed boundary now that the current month is an explicit input to the rule. Proven as a rule only: no schedule or exception can be stored until S-03, so the stored-exception half of the risk stays with that slice | 1 |
| 6, session lifecycle | covered by S-01 and not revisited here, beyond asserting 401 for every new route | - |

## Performance considerations

The summary reads a subscription's whole history on every request and computes over it in memory. For
one household over a few years that is tens of rows and hundreds of month iterations, which is far
below any threshold worth engineering against, and the requirements record the expected scale as
small. No caching, no pagination and no denormalised totals. If a subscription ever ran long enough
for this to matter, the cheapest first move would be to bound the enumerated range rather than to
cache a derived number that can go stale.

## Migration notes

Two migrations, applied in order after the two S-01 already landed, on tables that have never held
data. Nothing is migrated from an earlier shape.

Two existing shapes change meaning rather than structure. A subscription created before this slice has
no owner member, and nothing backfills one: the summary answers 409 naming the missing owner, and a
local database from S-01 is either given an owner through the members route or recreated. A backfill
was considered and rejected because it would have to invent a name and a joined month for a member the
organizer never entered, and because the number of affected rows is two developers' local databases.
Separately, `start_month` stops being patchable, which removes a capability S-01 shipped; no landed
test or client form depends on it, and the alternative was a guard that would have to be kept in step
with every child table added after this one.

## References

- Related research: `context/changes/members-and-price-history/research.md`
- Plan review and its resolution: `context/changes/members-and-price-history/reviews/plan-review.md`
- Decision: `context/decisions/D-006-owner-member-and-zero-active-invariant.md`
- The slice this one builds on: `context/changes/runtime-auth-slice/plan.md` and its
  `reviews/plan-review.md`
- Risks and their test types: `context/foundation/test-plan.md`, rollout phase 2
- Product contract: `context/foundation/prd.md`, US-01, US-03, US-04, FR-006 to FR-014 and FR-022 to
  FR-024
- Repository rules: `AGENTS.md`, the money, ownership and time-zone hard rules

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: The calculation

#### Automated

- [x] 1.1 Unit tests pass — 69b8fbc
- [x] 1.2 Typecheck passes — 69b8fbc
- [x] 1.3 Integration tests still pass — 69b8fbc
- [x] 1.4 Nothing under src/domain imports the server, Hono or a D1 type — 69b8fbc
- [x] 1.7 All three of US-01's numeric acceptance criteria are asserted through the shipped paths — 69b8fbc

#### Manual

- [x] 1.5 Each new unit test failed first for the stated reason — 69b8fbc
- [x] 1.6 The worked example was computed by hand before the assertion was written — 69b8fbc

### Phase 2: Members, their active ranges and the owner

#### Automated

- [x] 2.1 Integration tests pass — a304b6d
- [x] 2.2 Unit tests pass — a304b6d
- [x] 2.3 Typecheck passes — a304b6d
- [x] 2.4 All three migrations apply in order to a clean local database — a304b6d
- [x] 2.5 Every new route answers 401 without a cookie — a304b6d
- [x] 2.8 A created subscription comes back with exactly one owner member starting at its start month — a304b6d
- [x] 2.9 A subscription PATCH carrying start_month is refused with 400 and changes nothing — a304b6d

#### Manual

- [x] 2.6 The ownership cases failed first for the right reason — a304b6d
- [x] 2.7 A second owner produced 409 rather than a 500 — a304b6d

#### Notes

Two choices the phase-2 text left open, both taken the smaller way:

- `hasDependents` keeps the four-argument signature the repository contract
  gives it, but runs no statement in this slice. Nothing references a member
  until S-03's payments and schedules, so a statement carrying the ownership
  predicate would have had no table to query; the parameters are kept and
  marked as awaiting that clause, so it arrives inside the module-wide rule
  rather than beside it.
- The per-route 401 assertions cannot, on their own, prove the members module
  registered its own session middleware. Both routers are mounted at `'/'` and
  both own `/api/subscriptions/*`, and Hono merges them into one router, so the
  subscriptions router's middleware already answers 401 for the member paths.
  The module registers its own anyway, for the reason the plan gives, and the
  test carries a comment saying what the assertion does and does not prove.

### Phase 3: Prices, break months and the summary

#### Automated

- [x] 3.1 Integration tests pass — b805445
- [x] 3.2 Unit tests pass — b805445
- [x] 3.3 Typecheck passes — b805445
- [x] 3.4 All four migrations apply in order to a clean local database — b805445
- [x] 3.5 The worked example is asserted through the API and matches to the minor unit — b805445
- [x] 3.8 The earliest price delete is refused without confirmation and recomputes correctly with it — b805445

#### Manual

- [x] 3.6 The summary read through the API agrees with the domain unit tests — b805445
- [x] 3.7 The current month matches the subscription's time zone rather than the machine's — b805445

#### Notes

- The month conditions the summary and the standing-order rule both depend on
  were pulled into `src/domain/month-status.ts` and recorded as D-009, so S-03
  consumes one source of truth rather than re-deriving `break` and `inactive`
  for its own toggle grid. `shareForMember` gained a `current` argument as part
  of that, matching the rule D-007 already sets for the received side; the
  phase-1 suite is otherwise unchanged and doubles as the refactor's regression
  test. `priceForMonth` moved to `src/domain/prices.ts` with it, to keep the
  import direction one-way.
- The refusal to delete the earliest price entry names the affected months
  bounded by the later of the last price entry and the current month, not by
  the next entry alone. The plan's phrasing covers the case where a later entry
  exists; when the deleted entry is also the last one, every month after it
  loses its price too, and a message that did not say so would understate what
  the caller was about to lose.
- A break month in the path is validated against the same month rule as one in
  a body before it reaches SQL, so `DELETE .../break-months/not-a-month` is a
  400 rather than a silent miss answered as 404.

### Phase 4: The detail screen

#### Automated

- [x] 4.1 Typecheck passes across all three projects — 682080d
- [x] 4.2 Production build succeeds — 682080d
- [x] 4.3 The whole suite passes — 682080d

#### Manual

- [x] 4.5 A new subscription lists the owner as the account holder — 682080d
- [x] 4.6 Two participants and a price of 100.00 give 33.33 each with the owner absorbing 33.34 — 682080d
- [x] 4.7 A departure moves the following month's share and leaves earlier months unchanged — 682080d
- [x] 4.8 A rejoin resumes liability without a second record — 682080d
- [x] 4.9 A skipped month costs nobody anything and leaves its neighbours unchanged — 682080d
- [x] 4.10 A later price change leaves earlier months on the old price — 682080d
- [x] 4.11 Archiving behaves as the requirements' default describes — 682080d
- [x] 4.12 The reviewer account reaches none of the owner's records — 682080d
- [x] 4.13 The layout is usable at a narrow phone width — 682080d
- [x] 4.14 The earliest price delete shows an inline confirmation naming the affected months — 682080d
- [x] 4.15 The detail screen's loading, error and no-owner states render as specified — 682080d

#### Notes

- Every manual row was walked in a real browser against the local dev server
  with the two seeded synthetic accounts, not reasoned about from the code.
  Captures are in `evidence/screenshots/`. The figures seen on screen match
  what the domain tests assert: 33,33 zł each with 33,34 zł left to the
  organizer on a plan of 100,00 zł across three seats, a departure moving the
  next month to 50,00 zł while the earlier months hold, a rejoin resuming
  liability on the same row rather than a second one, a skipped month dropping
  the plan total by exactly one month's price, and a later price entry leaving
  the earlier months on the old price.
- The loading state is recorded programmatically rather than as a screenshot:
  on a local server the four reads resolve faster than a capture settles, so
  the check reads the DOM in the same tick as the click and confirms the five
  cards are still rendered with placeholders, the loading note is present and
  the back control still works. The error and no-owner states are screenshots,
  taken with the network forced offline and against a subscription row inserted
  straight into the local database without an owner member.
- The narrow-width row was checked at a 390 px viewport through device
  emulation, since neither the window-size flag nor a page resize changed the
  layout width in this environment. At that width the card row stacks to one
  column and `document.scrollWidth` equals `clientWidth`, so nothing overflows
  sideways.
- `shareForMember`'s `current` argument, added in phase 3, is what lets the
  screen ask for a single month's share without re-deriving the window; the
  detail screen reads every figure from the summary payload and formats with
  the currency and locale it carries, so no screen re-reads the subscription
  row to format money.

### Phase 5: Evidence

#### Automated

- [x] 5.1 The captured file exists and shows the passing counts
- [x] 5.2 The same commands pass in one run
- [x] 5.4 Test-plan sections 6.1 and 6.3 are filled and rollout phases 1 and 2 record their status

#### Manual

- [x] 5.3 The evidence index row and work-log entry name this slice, its commit and its risks
