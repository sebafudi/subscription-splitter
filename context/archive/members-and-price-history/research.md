---
git_commit: 676727e
branch: main
repository: subscription-splitter
topic: "What the members-and-price-history slice has to build on: the S-01 contracts, the prototype's monthly accounting semantics, and what D1 and the test pool constrain"
tags: [research, codebase, domain, d1, members, price-history, summary]
status: complete
---

# Research: members-and-price-history

Date and researcher fields the schema lists are omitted; this repository records provenance by commit
and change ID. Findings are separated into **Evidence** (read from this repository, from the
installed packages, or from the read-only prototype), **Inference** (a conclusion drawn from
evidence, stated as such) and **Unknown** (must be settled by a test or a run during
implementation).

The prototype at `spotify-family-split` is read as a source of domain semantics only. No code, data,
fixture or backup is copied from it. Where this slice deliberately departs from it, the departure is
named.

## Research Question

What does the second vertical slice need before it is planned: what S-01 fixed as contracts that
this slice must extend rather than reinvent, what the prototype's monthly accounting actually
decides at each boundary, which of those decisions this project is keeping and which it is
overturning, and what D1, the Workers test pool and the existing route conventions constrain.

## Summary

S-01 has already settled the four things this slice would otherwise have to decide: where ownership
is enforced (inside the repository's SQL), what a foreign identifier looks like from outside (404,
indistinguishable from absent), how validation reaches a route (one Zod schema module per resource,
`safeParse` in the handler, 400 carrying `error` and `field`), and how integration tests reach the
database (one shared local D1, no reset, per-test account emails and per-test client addresses). This
slice extends all four to four new tables rather than establishing anything new at the boundary.

The calculation is the part with no precedent in this repository. `src/domain/` today holds two
helpers, `shareForMonth` and `ownerResidualForMonth`, and nothing else. The prototype has a complete,
tested monthly accounting module, and reading it surfaced three things worth carrying, one thing
worth fixing and one thing worth dropping. Worth carrying: whole-month inclusive ranges with several
ranges per member, effective-dated prices where a break month short-circuits the price lookup
entirely, and the month as the unit that every other number is derived from. Worth fixing: with zero
active members and a non-zero price the prototype's per-person share returns the whole undivided
price, which is a defined-but-wrong answer this project replaces with zero and full owner absorption
(decision D-006). Worth dropping for this slice: the status grid, coverages, opening balances and the
month series, none of which the requirements ask for.

One contract in this repository is narrower than the domain needs. `ownerResidualForMonth(price,
activeCount)` assumes the owner is one of the active members, computing the residual as `price -
share * (activeCount - 1)`. The owner has active ranges like anyone else and can sit a month out, in
which case every active member is charged and the subtraction is wrong by one share. Widening the
helper was the first answer and was dropped after review: nothing would have called it, so the suite
would have proved one expression while the screen showed another. The owner's share of a month is
produced once inside `computeSummary`, as `currentMonthly` less `expectedThisMonth`, and that single
value is what the screen renders and what the tests assert. The helper is left exactly as S-01
shipped it, with no caller in this slice.

Two further departures from the prototype are named here rather than discovered later. Its R3 states
the standing-order rule as bounded by `[startMonth, endMonth ?? currentMonth]`, with elapsed-ness
inside the rule; this project makes the current month an explicit argument instead of a property of
whichever month list the caller passes, because the test plan names the not-yet-elapsed boundary as
its own failure mode. Its R4 requires a warning before deleting the earliest price entry when doing so
would leave priced months unpriced; an API has no dialogue, so the same rule becomes a 409 the caller
can override with an explicit confirmation flag.

## Detailed Findings

### What S-01 fixed, and this slice inherits (Evidence, commit `676727e`)

- **Ownership lives in SQL, not in a route check.** `src/server/db/subscriptions.ts` carries
  `where ... user_id = ?` in every statement, and `get` and `update` return `null` for a foreign or a
  missing id without distinguishing them. Routes translate `null` into 404 and never learn why. Every
  new table in this slice hangs off `subscriptions`, so the same rule reaches them by joining back to
  the parent row and filtering it by `user_id` in the same statement.
- **Route conventions.** Handlers call `schema.safeParse(body)` inline and answer
  `{ error, field }` with 400 on failure, where `error` is the first issue's message and `field` its
  joined path. Not found is `{ error: 'not found' }` with 404. No session is `{ error: 'unauthorized' }`
  with 401, produced by `requireSession`. There is no shared validation middleware; the pattern is
  repeated per handler deliberately.
- **Session middleware is registered per router, not globally.** `src/server/routes/subscriptions.ts`
  registers both `app.use('/api/subscriptions/*', requireSession)` and
  `app.use('/api/subscriptions', requireSession)`, because Hono's `/*` pattern does not match the bare
  parent path. `src/server/index.ts` mounts each router at `'/'` and each router owns its absolute
  paths. **Inference:** a new router mounted the same way inherits no middleware from the
  subscriptions router, so every new route module in this slice registers `requireSession` for its own
  path prefix or the routes ship unauthenticated. This is the single easiest way to lose the
  ownership guarantee in this slice, and it fails open.
- **The context variable is `sessionUser`**, typed `SessionVariables = { sessionUser: SessionUser }`
  and exported from `src/server/middleware/require-session.ts`. Handlers read `c.get('sessionUser')`.
- **Validation module shape.** `src/server/validation/subscriptions.ts` exports
  `createSubscriptionSchema` and `patchSubscriptionSchema` plus their inferred input types, which are
  the exact parameter types the repository functions accept. Field-level schemas are private building
  blocks. Create is `.strict()` with defaults; patch is `.partial().strict()` with a refinement
  rejecting an empty body. Request keys are snake_case (`time_zone`, `start_month`) while the domain
  shape the repository returns is camelCase; the mapping happens at the repository boundary in
  `toSubscription`.
- **Migration conventions.** Double-quoted identifiers, no `IF NOT EXISTS`, indexes named
  `<table>_<column>_idx`, `TEXT` identifiers generated by `crypto.randomUUID()` server-side, `TEXT`
  ISO-8601 timestamps for this project's own tables, `INTEGER` for booleans,
  `ON DELETE CASCADE` on every foreign key, and a `GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]'` CHECK on a
  month column with the residual gap (`00`, `13` to `19`) closed by the Zod range rule that every
  write passes through. `migrations/0002_subscriptions.sql` is the worked example.
- **`start_month` is patchable today.** `patchSubscriptionSchema` carries it
  (`src/server/validation/subscriptions.ts:42`) and `update` writes it. **Inference:** once member
  ranges are validated against the subscription's first month, moving that month later leaves every
  earlier stored range in violation of the rule the write path enforces, so a member becomes
  uneditable through the API while the summary quietly drops the truncated months from
  `totalPlanCost`. No landed test asserts that such a patch succeeds, and the route already refuses
  `id` and `user_id` in a patch body, so removing the field costs nothing green and reuses an
  established refusal.
- **The client landed.** `src/client/api.ts` exports `request`, `SignedOutError`, `ApiError` carrying
  a `field`, `getMe`, `signIn`, `signOut`, `listSubscriptions` and `createSubscription`, and
  `src/client/screens/` holds `Login.tsx`, `Home.tsx` and `SubscriptionForm.tsx`. `Home` renders each
  subscription as a plain list item with no selection affordance, so a detail screen needs it to gain
  one rather than being reachable today.
- **The rate limiter is shared across test files.** `src/server/auth.ts:26-33` enables it at ten
  requests per sixty seconds per client address with database storage, and the database is shared and
  never reset, so the three landed files keep apart by address prefix: `10.0.0.x`, `10.1.0.x` and
  `10.2.0.1`. **Inference:** a shared helper that hands out one fixed prefix would put every file in
  one bucket, and the failure would arrive as an intermittent 429 during sign-in that reads like a
  flaky auth test.
- **The unit runner covers `src/**/*.test.ts`** after S-01 widened it, so a test placed beside the
  module it exercises runs. The integration runner covers `tests/integration/**/*.test.ts` only and
  applies the migrations directory as a `TEST_MIGRATIONS` binding in a setup file.
- **Integration tests share one database and never reset it.** `reset()` deletes durable objects and
  miniflare's local D1 is one, so calling it drops the tables the setup file created. Tests use
  account emails unique per test and a `cf-connecting-ip` unique per test. Requests go through
  `SELF.fetch`, cookies are extracted from `set-cookie` by a local helper and sent back as a `cookie`
  header. Those helpers are currently redefined per test file rather than shared.

### The existing domain module is two helpers and one wrong assumption (Evidence)

`src/domain/money.ts` exports `shareForMonth(priceMinor, activeCount)`, which throws `RangeError` on a
negative or non-integer input, returns `0` when `activeCount` is `0`, and otherwise returns
`Math.round(priceMinor / activeCount)`. It also exports
`ownerResidualForMonth(priceMinor, activeCount)`, which returns
`priceMinor - share * Math.max(activeCount - 1, 0)`.

The zero-active answer is already the one this project wants, and it already differs from the
prototype. The residual is not. **Inference:** `activeCount - 1` encodes "exactly one of the active
members is the owner". The owner is a member with active ranges like anyone else, and the
requirements allow a month in which the owner is not active while others are; in that month every
active member is charged and the residual must subtract every one of their shares, not all but one.
The resolution is not to widen the helper but to stop needing it: `computeSummary` returns the
owner's share of the current month as a named field, computed once from the price and what the
charged members carry, so the assumption has no path into the shipped number. The helper keeps no
caller here, which makes its assumption inert rather than wrong; whether to delete it is a question
for S-03, when payments make the answer concrete.

### The prototype's monthly accounting, rule by rule (Evidence, read-only prototype)

| Rule | What the prototype does | This slice |
|---|---|---|
| Month representation | `"YYYY-MM"` string, compared lexicographically, which is chronological because the format is zero-padded | Same |
| `addMonth` | Integer arithmetic on `year * 12 + (month - 1) + delta`, no `Date` object involved, handles negative deltas and multi-year jumps | Same |
| `enumerateMonths(start, end)` | Empty when `end < start`, otherwise inclusive of both endpoints | Same |
| Current month | `Intl.DateTimeFormat("en-CA", { timeZone, year, month }).formatToParts(now)` with an injectable `now` | Same, and unlike the prototype it is unit tested with a fixed clock |
| Rounding | `Math.round(price / count)`, round-half-away-from-zero for positive values | Same, already in `shareForMonth` |
| Price for a month | Break month short-circuits to `0` before the price history is consulted at all; otherwise the latest entry whose `effectiveFrom <= month` wins; `0` before the first entry | Same |
| Active range | `{ joinedMonth, leftMonth \| null }`, `leftMonth` inclusive, several ranges per member, active if any range covers the month | Same |
| Owner in the denominator | The owner is counted in the active count, so their seat lowers everyone else's share | Same |
| Owner's own share | Always `0`, checked before anything else | Same |
| Zero active members, non-zero price | `perPersonShare` returns the **whole undivided price** | **Changed**: returns `0`, the owner absorbs the whole month. See D-006 |
| Owner net cost | `totalPlanCost - totalCollected`, with the rounding residual never itemised | Same for the headline, and the per-month residual becomes its own tested helper |
| Recurring received | Counts a month only when it is at or after the start, at or before the end, not a break month, covered by one of the member's ranges, and not excepted | Same, and the rule is implemented here even though nothing can store a schedule until S-03 |
| Recurring elapsed bound | The rule reads as `[startMonth, endMonth ?? currentMonth]`, so elapsed-ness rides on the caller's month list | **Changed**: the current month is an explicit argument, so the bound holds for any caller |
| Deleting the earliest price entry | Warn before deleting it when that would leave priced months unpriced | Same rule, expressed as a 409 the caller overrides with a confirmation flag, since an API has no dialogue |
| Member list order | Ascending by balance, so the most-owing member is first | Same |
| Validation of ranges | Non-empty, every `joinedMonth` at or after the subscription start, no overlap after sorting, and an open-ended range may not be followed by another | Same |

Two prototype details are worth repeating because they are easy to get backwards. A range whose
`joinedMonth` equals its `leftMonth` covers exactly that one month. And two ranges that touch, where
the second starts in the same month the first ended, are rejected as an overlap rather than merged,
because a member cannot leave and rejoin inside one month when the month is the unit of account.

### What the prototype has that this slice does not build (Evidence)

The prototype's `buildStatusGrid` resolves a per-member, per-month cell status from a single pool of
funds applied first-in-first-out against the running liability, which is why a shortfall caused by a
mid-range exception shows up on the last cell rather than on the excepted month. It also carries
coverages (a month forgiven for one member), opening balances carried in from a spreadsheet, and a
month-by-month series for charting. All four are named as non-goals or as parked in
`context/foundation/prd.md` and `context/foundation/roadmap.md`. None is built here. **Inference:**
the FIFO waterfall is the single most intricate piece of the prototype and it exists only to drive a
grid this product has no screen for, so leaving it out removes the largest source of accidental
complexity in the port.

### The prototype's test suite, and its two blind spots (Evidence)

Thirty-eight cases cover price effective dating, the break-beats-price rule, the rounding boundary, a
single-month range, an owner-only subscription, multi-range membership with a gap, recurring receipt
and its exception, future-dated payments, opening balances, the status grid and coverages. Two gaps
matter for the port. First, no test calls the current-month function with a fixed clock, so the
time-zone rule the requirements care most about is unexercised. Second, the zero-active-member case
asserts only that no aggregate is `NaN`; it never asserts what the per-person share returns, which is
exactly the value this project is changing. Both gaps are closed by tests in this slice.

### What D1 and the runtime constrain (Evidence)

- D1 has no interactive transactions. Atomicity comes from `db.batch([...])`, which runs the
  statements as one implicit transaction. This slice needs it twice: replacing a member's active
  ranges (delete every row, insert the new set, update the member in one batch) and creating a
  subscription together with its owner member and the owner's opening range.
- SQLite supports partial indexes, so `CREATE UNIQUE INDEX ... ON members(subscription_id) WHERE
  is_owner = 1` expresses "at most one owner per subscription" in the schema rather than in a check a
  route could forget. A violated unique index surfaces as a thrown D1 error, so the route has to catch
  it and translate it into 409 rather than letting it become a 500.
- `Intl.DateTimeFormat` with an IANA time zone is available in the Workers runtime and in Node, so the
  current-month rule runs identically in the unit runner and in the Worker.

## Code References

- `src/domain/money.ts:7` - `shareForMonth`, the rounding rule and the zero-active answer already in place
- `src/domain/money.ts:19` - `ownerResidualForMonth`, whose `activeCount - 1` assumes an active owner
- `src/server/db/subscriptions.ts` - the repository pattern every new repository follows, including `where user_id = ?` in every statement and the row-to-camelCase mapping at the boundary
- `src/server/routes/subscriptions.ts` - the route pattern, the two `requireSession` registrations and the 400 / 404 shapes
- `src/server/validation/subscriptions.ts` - the schema module shape, snake_case request keys, `.strict()` and the empty-patch refinement
- `src/server/middleware/require-session.ts` - `SessionVariables` and the `sessionUser` key
- `migrations/0002_subscriptions.sql` - the migration style this slice copies, including the month CHECK and the cascade
- `tests/integration/subscriptions.test.ts` - the two-account seeding and signed-in-cookie helpers this slice reuses
- `vitest.unit.config.ts` - the widened `src/**/*.test.ts` include that lets a domain test run beside its module

## Architecture Insights

- **One enforcement point, extended rather than repeated.** Ownership is a join back to
  `subscriptions` filtered by `user_id` inside every statement. A child record reached through a
  parent belonging to someone else fails the same predicate as a foreign child, so the "wrong parent"
  case in test-plan risk 2 is answered by the same SQL that answers the direct case.
- **The domain module is pure by construction, not by discipline.** It receives a
  `SubscriptionState` value and returns numbers. Nothing in it imports D1 or Hono, which is what makes
  the boundary cases in test-plan risks 1 and 5 unit tests rather than browser runs.
- **The month is the unit, and the price is a function of the month.** Every number the product shows
  is derived from two inputs, which months a member was active and what the plan cost in that month.
  Storing a current price instead of a price history is the failure the requirements single out.
- **Archived is a presentation flag, not a ledger fact.** A member's liability is decided by their
  active ranges alone. If archiving changed the active count, every past month's share would move
  retroactively, which would break the guardrail that no month loses or invents money.

## Historical Context (from prior changes)

- `context/changes/runtime-auth-slice/plan.md` - the ownership rule, the repository-as-enforcement-point
  argument and the test-pool constraints this slice inherits
- `context/changes/runtime-auth-slice/reviews/plan-review.md` - finding F5, no storage isolation and
  `reset()` destroys the schema, and finding F9, which is why every table here carries
  `ON DELETE CASCADE` and a month CHECK as tight as `GLOB` allows
- `context/decisions/D-001-auth-solution.md` - why sessions and the seeded accounts work the way the
  integration tests here assume
- `context/decisions/D-005-account-seeding.md` - how the two accounts the ownership tests need come to exist

## Open Questions

1. **Whether archived members stay in the balance list.** Requirements open question 3. The default
   taken here: the calculation ignores `archived` entirely, the summary returns every non-owner member
   with the flag set, and the current-month view hides archived members whose balance is zero behind a
   toggle. Blocks nothing.
2. **How a charged month with no active members is presented.** Requirements open question 4. The
   default taken here, and recorded as D-006: the share is zero, nobody owes, the month's whole cost
   lands in the plan total and in the owner's net cost, and the interface shows it as an ordinary line
   with no warning. Blocks nothing.
3. **Whether the first month should stay editable.** Resolved during plan review: it does not.
   `start_month` leaves the patch schema, because a moved first month invalidates every stored range,
   price entry and break month validated against it, and a guard would have to be kept in step with
   every child table added later. Recorded in D-006 and in the plan's migration notes. Blocks nothing.

(The question of whether S-01's client files would land in time was resolved by their landing.
`src/client/api.ts` and all three screens are on disk, and this slice extends them.)
