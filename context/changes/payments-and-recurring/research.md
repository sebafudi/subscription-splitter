---
git_commit: c2e1468
branch: main
repository: subscription-splitter
topic: "What the payments-and-recurring slice has to build on: the S-02 contracts it extends, the prototype's payment and standing-order semantics, and the four boundaries that make the assumed-receipt rule hard"
tags: [research, codebase, domain, d1, payments, recurring, exceptions]
status: complete
---

# Research: payments-and-recurring

Date and researcher fields the schema lists are omitted; this repository records provenance by commit
and change ID. Findings are separated into **Evidence** (read from this repository, from the
installed packages, or from the read-only prototype), **Inference** (a conclusion drawn from
evidence, stated as such) and **Unknown** (must be settled by a test or a run during
implementation).

The prototype at `spotify-family-split` is read as a source of domain semantics only. No code, data,
fixture or backup is copied from it. Where this slice deliberately departs from it, the departure is
named.

## Research Question

What does the third vertical slice need before it is planned: which contracts S-02 fixes that this
slice extends rather than reinvents, what the prototype's payment and standing-order accounting
decides at each boundary, which of those decisions this project keeps and which it overturns, what
the requirements demand that the prototype never had to answer, and what D1, the Workers test pool
and the existing route conventions constrain.

## Summary

This slice adds almost no new kind of problem. S-01 settled where ownership is enforced and what a
foreign identifier looks like from outside; S-02 settles the child-resource shape of all of it: the
ownership join back to `subscriptions`, the per-router session registration, the repository as the
only place SQL is written, the Zod-per-resource validation contract, the `db.batch` atomic unit, and
the `SubscriptionState` value that the calculation reads. Three more tables and nine more routes
follow those rules without changing any of them.

The one genuinely new thing is the assumed-receipt rule, and it is new only in that it becomes
reachable. S-02 writes `recurringReceived` and unit tests it against a literal state; nothing can
store a schedule or an exception until this slice, so the stored half of test-plan risk 4 is open by
design and this slice closes it. The rule has five conditions and each one, dropped on its own,
overstates what has been collected: at or after the schedule's start month, at or before its end
month when it has one, not a break month, covered by one of the member's active ranges, and not
listed as an exception for that schedule and month. A sixth condition, not after the current month,
is not in the function at all: it holds because `computeSummary` enumerates only up to the current
month and never asks about a later one. That is correct and it is also the condition most likely to
be lost by a future caller, so it is pinned at the summary level rather than assumed.

The prototype answers every one of those boundaries the same way this project wants, so the
departures here are not about the rule. They are about what the requirements ask for that the
prototype never had to: a payment dated before the plan's first month is rejected outright (US-02),
a real calendar date is required rather than a well-shaped string, and the assumed part of a receipt
has to be visible wherever it is counted (FR-026). Against that, three prototype concepts are
dropped: the first-in-first-out status grid, coverages and opening balances, all named as non-goals.

Two rules the requirements imply but never spell out are settled here as defaults and recorded in
D-007: two standing orders for one member may not overlap in any month, and no payment or standing
order may be recorded against the owner, who is never owed from.

## Detailed Findings

### What S-02 fixes, and this slice extends (Evidence, `context/changes/members-and-price-history/plan.md`)

S-02 is planned and under independent review; its code is not on disk. Its plan is treated as
authoritative and every item below is a contract this slice consumes rather than re-decides.

- **The domain state shape is already complete.** `SubscriptionState` carries `recurring`,
  `recurringExceptions` and `payments` from S-02 onward, typed and passed empty. `Payment` is
  `{ id, memberId, date, amount, note, kind: 'manual' | 'annual' }`, `RecurringSchedule` is
  `{ id, memberId, amount, startMonth, endMonth: MonthStr | null }` and `RecurringException` is
  `{ recurringId, month }`. This slice fills the three arrays and changes no type.
- **The received-month rule is already written.** `recurringReceived(state, member, months)` sums a
  schedule's amount for each month satisfying the five conditions above.
  `balanceForMember(state, member, months)` returns owed, paid and balance where paid is recorded
  payments plus `recurringReceived`. `computeSummary(state, current)` defines `collectedThisMonth`
  as payments dated in the current month plus recurring received for it. None of the three changes
  shape here.
- **`loadState(db, subscriptionId, userId)` is the single assembly point.** S-02 returns the three
  ledger arrays empty with a note that S-03 fills them. **Inference:** this slice adds three reads to
  one function and touches no route's assembly logic, which is exactly why S-02 typed the arrays
  early.
- **Ownership for a child record is one join.** Every statement joins
  `subscriptions s on s.id = <child>.subscription_id` and filters `s.user_id = ?`, so a foreign
  child and a child reached through a foreign parent fail the same predicate and both become 404.
  Records two levels down, which payments and schedules are through `member_id`, join through the
  member to the subscription in the same statement rather than in a second query.
- **Every route module registers its own session middleware.** Routers are mounted at `'/'` and own
  their absolute paths, so `requireSession` does not cascade between them. A module that forgets it
  ships unauthenticated and every test that carries a cookie still passes. This is named in S-01's
  research, repeated in S-02's plan, and it is the single easiest way to lose the guarantee here too.
- **Status codes and shapes.** 401 is `{ error: 'unauthorized' }` from `requireSession`. 400 is
  `{ error, field }` where `error` is the first Zod issue's message and `field` its joined path. 404
  is `{ error: 'not found' }` for anything missing or foreign, with no distinction between the two.
  409 is `{ error }` naming a rule, used by S-02 for a second owner, for deleting the owner and for a
  duplicate price month. There is no response envelope: a success returns the resource itself.
- **Request body keys are snake_case; path and query parameters are camelCase.** S-01 sends
  `start_month` and `time_zone` in bodies while returning `startMonth` and `timeZone`; S-02's routes
  use `:memberId` and `:priceId`. **Inference:** a `memberId` query filter and a `:paymentId` path
  parameter are consistent with that split, and body keys stay snake_case.
- **`hasDependents(db, memberId)` already exists as the named seam.** S-02 puts it in
  `src/server/db/members.ts` and has it answer `false`, with a note saying S-03 adds its clauses
  there rather than in the route. The member DELETE 409 branch is therefore already routed; this
  slice only makes it reachable.
- **Validation modules are one file per resource under `src/server/validation/`,** exporting a
  strict create schema with defaults and a partial strict patch schema refusing an empty body, plus
  the inferred input types the repository functions accept. Invariants that need more than the
  submitted value live in the domain and are run by the route after the schema.
- **Migration style.** Double-quoted identifiers, no `IF NOT EXISTS`, `<table>_<column>_idx` index
  names, `TEXT` identifiers from `crypto.randomUUID()` generated server-side, `TEXT` ISO-8601
  timestamps, `ON DELETE CASCADE` on every foreign key, and a month CHECK as tight as `GLOB` allows
  with the residual gap closed by Zod.

### The prototype's payment and standing-order semantics, rule by rule (Evidence, read-only prototype)

| Rule | What the prototype does | This slice |
|---|---|---|
| Schedule shape | `{ memberId, amount, startMonth, endMonth \| null }`, several segments per member, all summed independently | Same shape, but overlapping segments for one member are refused |
| Months a schedule contributes | At or after `startMonth`, at or before `endMonth` when set, and only months the caller enumerated | Same |
| End month inclusivity | `endMonth` is inclusive; a null end means "still running" | Same |
| The current-month bound | Falls out of the caller enumerating only to the current month; there is no clamp inside the function | Same, and unlike the prototype it is pinned by a test at the summary level |
| Break months | Zero the contribution for that month for every member, whatever the schedule says | Same |
| Member's active range | A month outside every range of the member contributes nothing, silently | Same |
| Exception | Keyed by schedule and month together, removes that month's whole contribution, affects no other month and no other schedule | Same |
| Manual payments | Summed for the member with no date filter at all; the date only buckets a payment into a month | Same |
| Future-dated payment | Counted immediately as credit | Same, and required by FR-018 |
| Payment before the plan's first month | Nothing in the calculation forbids it; the input layer is what rejects it | Same, and required by US-02 |
| Payment tag | `manual` or `annual`, purely descriptive; the arithmetic is identical for both | Same, and required by FR-016, which explicitly refuses to spread a yearly lump sum |
| Balance | `paid - owed`, negative when owing, positive when ahead | Same, plus S-02's opening-balance term is absent here because opening balances are a non-goal |
| Drift | A schedule's amount is never clamped to the member's computed share, so a member sending more than their share accumulates visible credit | Same, and it is the behaviour that makes a standing order safe to record once |
| `collectedThisMonth` | Manual payments whose date falls in the month, plus recurring received for that one month | Same |
| Money | Integer minor units throughout, `Math.round` at the single division, formatting only at the display edge | Same, and `AGENTS.md` requires it |

### The four boundaries that make the assumed-receipt rule hard (Evidence and Inference)

Test-plan risk 4 names the failure as "a standing order counted for a month it should not cover" and
its anti-pattern as "testing a single mid-range month and never the four boundaries that make the
rule hard". Read against the prototype's suite and the requirements, the boundaries are:

1. **Not yet elapsed.** A schedule with no end month, or with an end month in the future, must
   contribute nothing for months after the current one. The guard is the enumeration, not the rule,
   which is why it needs its own test.
2. **Outside the member's active range.** A member who left in July and rejoined in October has a
   schedule that may span the gap. The gap months contribute nothing. **Inference:** this is the
   boundary most likely to be missed, because the schedule and the range are edited on different
   screens and nothing links them.
3. **A skipped month.** US-04 states it directly: a standing order covering a skipped month
   contributes nothing for it. The break month wins over the price and over the schedule alike.
4. **Explicitly marked as not received.** FR-020. The exception exists because deleting and
   re-adding the arrangement would lose its own history, and it is scoped to one month of one
   schedule.

A fifth, the end month itself, is a boundary of inclusivity rather than of the rule, and it is where
an off-by-one costs exactly one month of assumed money.

### What the requirements ask that the prototype never answered (Evidence)

- **A payment dated before the plan's first month is rejected and nothing is stored** (US-02
  acceptance criterion). The prototype's calculation would have counted it; its input layer is what
  refused it. This project refuses it in the route, after the schema, against the subscription's own
  start month, and answers 400 naming the date field, which is what the non-functional requirement
  about rejected input asks for.
- **A real calendar date.** The requirement says "a real date" (FR-015). A `GLOB` pattern and a
  regular expression both admit `2025-02-30`. **Inference:** the check has to reconstruct the date
  and compare its parts back, and because it is a pure predicate it belongs beside the month
  arithmetic and is unit tested there, with the Zod schema refining on it so validation stays one
  contract.
- **The assumed part has to be visible wherever it is counted** (FR-026, and the requirements'
  §Success Criteria secondary line). This is a screen obligation, not a calculation one: the
  calculation already keeps recorded and assumed money in separate terms, and the interface has to
  keep them separate too rather than showing one total.
- **The payment history for one participant** (FR-025). A filter on the list route rather than a
  second route, and a member id from another subscription is answered as absent like every other
  foreign identifier.

### What this slice does not take from the prototype (Evidence)

`buildStatusGrid` resolves a per-member, per-month cell status by applying one pool of funds
first-in-first-out against the running liability, which is why a shortfall caused by a mid-range
exception surfaces on the last cell rather than on the excepted month. It carries coverages, opening
balances and a month-by-month series alongside it. All four are non-goals or parked in
`context/foundation/prd.md` and `context/foundation/roadmap.md`, and S-02 already declined the grid.
**Inference:** the waterfall is the prototype's most intricate piece and exists only to drive a
screen this product does not have, so leaving it out again removes the largest source of accidental
complexity, and the requirements' own reading of a balance, one number per participant, needs none
of it.

### What D1, the runtime and the test pool constrain (Evidence)

- **No interactive transactions.** `db.batch([...])` is the atomic unit. This slice needs it once,
  for a schedule edit that narrows a range and must drop the exceptions the new range no longer
  contains in the same write. Payment create, edit and delete are each a single statement.
- **A range overlap cannot be expressed as an index.** SQLite has no exclusion constraint, so
  "two schedules for one member may not overlap" is a read-then-check in the route rather than a
  rule the schema holds, unlike S-02's one-owner partial unique index. **Inference:** that leaves a
  race between two concurrent writes for the same member. At this product's scale, one organizer
  acting on one subscription, the race is not worth engineering against, and the consequence of
  losing it is a double-counted month that the organizer can see and delete rather than a corrupted
  ledger.
- **A composite primary key is an index.** `recurring_exceptions(schedule_id, month)` as a primary
  key already serves every lookup by schedule, so no separate index on `schedule_id` is added, which
  is the same reasoning S-02 applies to `price_history` and `break_months`.
- **The integration suite shares one local D1 and never resets it.** `reset()` deletes durable
  objects and the local D1 is one, so it would drop the tables the setup file created. Tests use an
  account email unique per test and a `cf-connecting-ip` unique per test. S-02 introduces
  `tests/integration/accounts.ts` with the shared seeding helpers; this slice uses it rather than
  copying the dance a fifth time.
- **Deletes cascade by foreign key.** A deleted member takes its payments and schedules with it and a
  deleted schedule takes its exceptions, which is why the member DELETE route must refuse before the
  cascade can run rather than after.

### What is not on disk yet (Unknown)

`src/domain/calc.ts`, `months.ts`, `members.ts` and `types.ts`, `src/server/db/members.ts`,
`subscription-state.ts`, `prices.ts` and `break-months.ts`, the members, prices, break-months and
summary routes, `tests/integration/accounts.ts`, `migrations/0003_members.sql` and
`0004_prices_and_breaks.sql`, and the subscription detail screen are all specified by S-02 and none
of them exists. Everything this slice plans against them is read from that plan, not from code.
Three consequences, each settled in the plan's prerequisites rather than left open:

- The migration identifiers `0005` and `0006` assume S-02 lands `0003` and `0004`. If its numbering
  moves, these move with it.
- Which of the recurring cases S-02's unit suite already pins is not verifiable from here. This slice
  extends those files rather than duplicating cases, and the first act of its first phase is to read
  what landed.
- The detail screen's shape, its data fetching and its mutation refresh are whatever S-02 lands. The
  payments and recurring sections adapt to it rather than rewriting it.

## Code References

On disk today:

- `src/domain/money.ts:7` - `shareForMonth`, the rounding rule every balance is built on
- `src/server/db/subscriptions.ts` - the repository pattern, `where user_id = ?` in every statement
  and the row-to-camelCase mapping at the boundary
- `src/server/routes/subscriptions.ts` - the two `requireSession` registrations and the 400 and 404
  shapes every new route copies
- `src/server/validation/subscriptions.ts` - the schema module shape, snake_case body keys,
  `.strict()` and the empty-patch refinement
- `src/server/middleware/require-session.ts` - `SessionVariables` and the `sessionUser` key
- `migrations/0002_subscriptions.sql` - the migration style, the month CHECK and the cascade
- `tests/integration/subscriptions.test.ts` - the two-account seeding and the wrong-parent assertion
  this slice repeats for every new route
- `vitest.unit.config.ts` and `vitest.integration.config.ts` - the two include globs that decide
  where a new test file has to sit

Specified by S-02 and consumed here, not yet on disk:

- `context/changes/members-and-price-history/plan.md`, phase 1 change 1 - the `Payment`,
  `RecurringSchedule` and `RecurringException` types this slice stores
- the same plan, phase 1 change 5 - `recurringReceived`, `balanceForMember` and `computeSummary`
- the same plan, phase 2 change 3 - `hasDependents`, the seam the member DELETE 409 branch hangs on
- the same plan, phase 3 change 4 - `loadState`, where the three empty arrays are filled

## Architecture Insights

- **Nothing is stored that can be derived.** There is no balance column, no collected total and no
  paid-through month anywhere in the schema. Every number comes from the four inputs the organizer
  enters: the price history, the break months, the active ranges and the ledger. This is what makes
  an edit or a delete correct by construction rather than by a recomputation step that could be
  forgotten, and it is why the acceptance criterion "editing or deleting the payment moves the
  balance back correspondingly" needs no code of its own.
- **Assumed money and recorded money are separate terms all the way to the screen.** They are two
  summands inside `paid` in the calculation and two labelled groups in the interface. The moment they
  are added together anywhere in between, FR-026 is lost quietly.
- **The exception is the smallest possible correction.** It records one month of one schedule rather
  than splitting the schedule in two, so the arrangement keeps its own history, which is exactly the
  counter-argument FR-020 records and rejects.
- **Ownership reaches two levels down by the same join.** A payment belongs to a member which belongs
  to a subscription which belongs to an account. One statement carries the whole chain, so a payment
  id from another account, a member id from another subscription and a subscription id from another
  account are one answer.

## Historical Context (from prior changes)

- `context/changes/members-and-price-history/plan.md` and `research.md` - every contract this slice
  extends, and the prototype rules already carried across
- `context/changes/runtime-auth-slice/plan.md` - the ownership rule, the repository-as-enforcement
  argument and the test-pool constraints
- `context/changes/runtime-auth-slice/reviews/plan-review.md` - finding F5, no storage isolation in
  the test pool, and finding F9, why every table carries a cascade and a month CHECK
- `context/decisions/D-006-owner-member-and-zero-active-invariant.md` - the owner member, which is
  why this slice has an owner to refuse payments against
- `context/decisions/D-005-account-seeding.md` - how the second account the ownership tests need
  comes to exist

## Open Questions

1. **Whether an overlapping standing order is refused as a bad request or as a conflict.** Settled
   here as 409 and recorded in D-007: the body is well formed and the conflict is with rows already
   stored, which is the same shape as S-02's second-owner and duplicate-price-month refusals. Blocks
   nothing.
2. **Whether a payment or a standing order may name the owner.** Settled here as no, refused with 400
   naming the member field, and recorded in D-007. The owner is never owed from and does not appear
   in the per-member summary list, so money recorded against them would be counted nowhere and
   visible nowhere. Blocks nothing.
3. **What happens to an exception when its schedule's range is narrowed.** Settled here as deleted in
   the same batch as the edit, so the stored state never holds an exception the rule cannot reach and
   a later widening does not resurrect a correction the organizer made against a different
   arrangement. Blocks nothing.
4. **Whether the payment `kind` field keeps its name over the wire when the column is `tag`.**
   Settled here as yes: the domain type from S-02 says `kind`, the column is `tag`, and the
   repository maps between them at the boundary exactly as it maps `start_month` to `startMonth`.
   Blocks nothing.
5. **Which recurring unit cases S-02's suite already pins.** Unknown until S-02 lands. This slice
   extends those files rather than duplicating cases, and phase 1 begins by reading them. Blocks
   phase 1 only, and for one read.
