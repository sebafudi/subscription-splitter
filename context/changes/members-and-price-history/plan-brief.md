# Members and price history - plan brief

> Full plan: `context/changes/members-and-price-history/plan.md`
> Research: `context/changes/members-and-price-history/research.md`
> Plan review and resolution: `context/changes/members-and-price-history/reviews/plan-review.md`

## What and why

Teach the product to answer its own central question: what does each participant owe. The organizer
records participants with the whole months they were active, records what the plan cost from each
month onward and marks skipped months, then reads this month's share, the headline totals and a
balance per participant. This is roadmap item S-02 and the milestone's north star, because the
primary success criterion is a balance matching a hand calculation to the minor unit, and nothing
else in the product matters if that number is wrong.

## Starting point

S-01 has landed in full: sessions, two seeded accounts, the `subscriptions` table with its repository
and routes, the ownership rule enforced inside SQL, and three screens on a small API client.
`src/domain/` holds two helpers and nothing else: a rounding function and a residual function whose
`activeCount - 1` quietly assumes the owner is always one of the active members. There is no table
below `subscriptions` and no screen that shows a number the product computed.

## Desired end state

A subscription has an owner member from the moment it is created, and its first month cannot move
afterwards. The organizer adds participants with one or more whole-month ranges, edits and archives
them, records price changes from a given month onward and marks months as skipped, and reads a detail
screen showing what is owed now, this month's share, their own share of this month, collected against
expected, their net cost since the plan started, how many are active, and the same calculation
resolved per participant, most-owing first. A price of 100.00 with the owner and two participants
gives 33.33 each, leaves 33.34 as the organizer's own share, and a participant who paid 20.00 shows
-13.33. A second account reaches none of it, and neither does an account naming its own record
through the wrong parent.

## Key decisions made

| Decision | Choice | Why | Source |
|---|---|---|---|
| Where the calculation lives | A pure module in `src/domain/` taking a state value | Its boundary cases become unit tests rather than browser runs | Plan |
| Zero active members in a priced month | Share of zero, the owner absorbs the whole cost | The prototype returned the undivided price, which reads as one person owing everything | Decision D-006 |
| The owner member | Created with the subscription, in the same atomic write, in phase 2 | A subscription without an owner has no defined per-person share, and no later phase should remove an earlier phase's precondition | Decision D-006, Review |
| One owner per subscription | A partial unique index in the schema | A rule in an index cannot be forgotten by a route | Plan |
| The owner's share of a month | A named `ownerShareThisMonth` field on the summary | The screen must render the number the tests assert, not a second expression that happens to agree | Review |
| The residual helper | Left exactly as S-01 shipped it, with no caller | Widening it would have proved one expression while the screen showed another | Review |
| The first month | Immutable after creation, a 400 when patched | Moving it invalidates every range, price and break month validated against it | Decision D-006, Review |
| Archived members | A presentation flag, never an input to the active count | Otherwise archiving would move every past month's share retroactively | Research |
| A month costing nothing | Always a break month, never a price of zero | The two differ in whether a standing order counts as received | Plan |
| Deleting the earliest price entry | 409 naming the months that would lose their price, unless the call carries a confirmation flag | Without it the delete silently re-prices those months to zero and moves every balance | Review |
| The not-yet-elapsed boundary | The current month is an explicit argument to the standing-order rule | The test plan names it as its own failure mode and ties it to the subscription's time zone | Review |
| Ownership for child records | One join filtering the subscription id and the session user together, in every statement | Answers the foreign child, the foreign parent and an account's own wrong parent with one predicate | Research, Review |
| Session middleware | Registered by every new route module for itself | Routers mounted at the same base do not inherit middleware, and the omission fails open | Research |
| Active range edits | The complete set, replaced inside one `db.batch` | A partial replacement is the one way this table can invent liability | Plan |
| Payments and standing orders | Typed and calculated now, stored from S-03 | `balanceForMember` is meaningless without them, and US-01's third number can be asserted against the domain input today | Plan, Review |
| Subscriptions without an owner | 409 from the summary, no backfill, precondition built by a direct row insert in the test | A backfill would invent a name and a joined month nobody entered, and no route can produce that state after phase 2 | Plan, Review |

## Scope

**In scope:** the domain module (months, prices, membership, share, the owner's share, balances,
summary), two migrations for members, active ranges, price history and break months, their
repositories and routes under the session and ownership rules, the owner member created with its
subscription, an immutable first month, the state loader and the summary route, the price-delete
guard, and the subscription detail screen with its selection path from the home list.

**Out of scope:** payment and standing-order storage, routes and forms; the status grid and its
first-in-first-out attribution; coverages; opening balances; charts and month series;
largest-remainder allocation; proration; a second subscription in the interface; deployment; and the
browser end-to-end test.

## Architecture / approach

Four layers, one direction of travel. The domain module receives a `SubscriptionState` value and
returns numbers, importing nothing from storage or the web framework. Repositories own every SQL
statement and each one joins back to `subscriptions` filtering the subscription id and the session
user together, so a foreign record, a record reached through a foreign parent and a record reached
through the caller's own other subscription are the same answer. Routes validate with Zod, run the
domain's range validator, and translate results into status codes. The summary route loads the state,
asks the domain what the current month is in the subscription's own time zone, and returns the
computed summary, carrying the currency and locale the screen formats with. The client holds no
calculation of its own; it renders what the summary says and formats at the edge.

## Phases at a glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. The calculation | The domain module and its unit tests, written test-first | Getting a boundary subtly wrong in a way every later test then agrees with, which is why the balancing cases assert hand-computed values before they assert a sum |
| 2. Members, ranges and the owner | The members and active-ranges tables, repository, five routes, the owner created with every subscription, the first month fixed, ownership tested first | A new router mounted without its own session middleware ships unauthenticated and still passes every cookie-carrying test |
| 3. Prices, breaks, summary | Price history, break months, the state loader, the summary route and the price-delete guard | The summary is where every rule meets, so an error here reads as a calculation bug rather than an assembly bug |
| 4. The detail screen | Selection from the home list, the five headline cards, the member, price and break-month surfaces, and the loading, error and no-owner states | A subscription created before this slice has no owner, and the summary refuses it, which is the first thing a developer will see |
| 5. Evidence | Captured runs, the evidence index, and the test-plan cookbook entries for the calculation and for a child resource's ownership test | None |

**Prerequisites:** S-01 in full, which has landed: sessions, seeded accounts, the subscriptions table,
the ownership rule, the API client and the three screens this slice extends. Effort is stated as five
phases rather than a duration; this repository does not record time estimates.

## Open risks and assumptions

- The requirements leave two questions open that this slice answers by taking their stated defaults:
  archived members are hidden from the current-month view when their balance is zero and stay
  reachable otherwise, and a month with nobody active is an ordinary line whose whole cost falls on
  the organizer with no warning.
- Test-plan risk 4, a standing order counted for a month it should not cover, is proven here only as a
  rule in the domain module, though now including the not-yet-elapsed boundary. Nothing can store a
  schedule or an exception until S-03, so that half of the risk stays open by design.
- Removing `start_month` from the patch schema takes away a capability S-01 shipped. Nothing green
  depends on it, and the alternative was a guard that every child table added later would have to stay
  in step with.
- The 409 for a subscription with no owner member is correct and also mildly hostile to a developer
  carrying a local database from S-01. The remedy is one call to the members route or a recreated
  subscription, the screen renders the message rather than a generic failure, and the state is
  unreachable for anything created after phase 2.
- The shared test helper consolidates the three landed integration files onto one module. If S-01's
  implementation review is still editing them when that step starts, the fold moves to its own change
  and only the new files use the module.

## Success criteria

- All three of US-01's numeric acceptance criteria hold to the minor unit, in the calculation's own
  tests and, for the first two, read back through the API.
- A price change, a skipped month, a departure and a rejoin each produce the right answer with no
  manual correction, and for every month what everyone owes plus what the owner absorbs equals the
  plan cost exactly.
- A second account reaches none of the new records, by any route or verb, and neither does an account
  naming one of its own records through another of its own subscriptions.
