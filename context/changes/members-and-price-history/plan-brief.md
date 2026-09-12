# Members and price history - plan brief

> Full plan: `context/changes/members-and-price-history/plan.md`
> Research: `context/changes/members-and-price-history/research.md`

## What and why

Teach the product to answer its own central question: what does each participant owe. The organizer
records participants with the whole months they were active, records what the plan cost from each
month onward and marks skipped months, then reads this month's share, the headline totals and a
balance per participant. This is roadmap item S-02 and the milestone's north star, because the
primary success criterion is a balance matching a hand calculation to the minor unit, and nothing
else in the product matters if that number is wrong.

## Starting point

S-01 delivered sessions, two seeded accounts, the `subscriptions` table with its repository and
routes, and the ownership rule enforced inside SQL. `src/domain/` holds two helpers and nothing else:
a rounding function and a residual function that quietly assumes the owner is always one of the
active members. There is no table below `subscriptions` and no calculation.

## Desired end state

A subscription has an owner member from the moment it is created. The organizer adds participants
with one or more whole-month ranges, edits and archives them, records price changes from a given
month onward and marks months as skipped, and reads a detail screen showing what is owed now, this
month's share, collected against expected, their own net cost, how many are active, and the same
calculation resolved per participant, most-owing first. A price of 100.00 with the owner and two
participants gives 33.33 each and leaves the owner absorbing 33.34. A second account reaches none of
it.

## Key decisions made

| Decision | Choice | Why | Source |
|---|---|---|---|
| Where the calculation lives | A pure module in `src/domain/` taking a state value | Its boundary cases become unit tests rather than browser runs | Plan |
| Zero active members in a priced month | Share of zero, the owner absorbs the whole cost | The prototype returned the undivided price, which reads as one person owing everything | Decision D-006 |
| The owner member | Created with the subscription, in the same atomic write | A subscription without an owner has no defined per-person share | Decision D-006 |
| One owner per subscription | A partial unique index in the schema | A rule in an index cannot be forgotten by a route | Plan |
| The owner's residual helper | Takes the number of charged members explicitly | The owner can sit a month out, and then every active member is charged | Research |
| Archived members | A presentation flag, never an input to the active count | Otherwise archiving would move every past month's share retroactively | Research |
| A month costing nothing | Always a break month, never a price of zero | The two differ in whether a standing order counts as received | Plan |
| Ownership for child records | One join back to `subscriptions` filtered by `user_id` in every statement | Answers the foreign-child and the foreign-parent case with the same predicate | Research |
| Session middleware | Registered by every new route module for itself | Routers mounted at the same base do not inherit middleware, and the omission fails open | Research |
| Active range edits | The complete set, replaced inside one `db.batch` | A partial replacement is the one way this table can invent liability | Plan |
| Payments and standing orders | Typed and calculated now, stored from S-03 | `balanceForMember` is meaningless without them and would be rewritten later | Plan |
| Subscriptions without an owner | 409 from the summary, no backfill | A backfill would invent a name and a joined month nobody entered | Plan |

## Scope

**In scope:** the domain module (months, prices, membership, share, residual, balances, summary), two
migrations for members, active ranges, price history and break months, their repositories and routes
under the session and ownership rules, the state loader and the summary route, the owner member
created with its subscription, and the subscription detail screen.

**Out of scope:** payment and standing-order storage, routes and forms; the status grid and its
first-in-first-out attribution; coverages; opening balances; charts and month series;
largest-remainder allocation; proration; a second subscription in the interface; deployment; and the
browser end-to-end test.

## Architecture / approach

Four layers, one direction of travel. The domain module receives a `SubscriptionState` value and
returns numbers, importing nothing from storage or the web framework. Repositories own every SQL
statement and each one joins back to `subscriptions` filtered by the session user, so a foreign record
and a record reached through a foreign parent are the same answer. Routes validate with Zod, run the
domain's range validator, and translate results into status codes. The summary route loads the state,
asks the domain what the current month is in the subscription's own time zone, and returns the
computed summary. The client holds no calculation of its own; it renders what the summary says and
formats at the edge.

## Phases at a glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. The calculation | The domain module and its unit tests, written test-first | Getting a boundary subtly wrong in a way every later test then agrees with |
| 2. Members and ranges | The members and active-ranges tables, repository, five routes, ownership tested first | A new router mounted without its own session middleware ships unauthenticated and still passes every cookie-carrying test |
| 3. Prices, breaks, summary | Price history, break months, the state loader and the summary route | The summary is where every rule meets, so an error here reads as a calculation bug rather than an assembly bug |
| 4. Owner member and screen | The owner created with its subscription, and the detail screen | A subscription created before this slice has no owner, and the summary refuses it |
| 5. Evidence | Captured runs, the evidence index and the test-plan cookbook entry | None |

**Prerequisites:** S-01's sessions, seeded accounts, subscriptions table and ownership rule. S-01
phase 4's client files are assumed by phase 4 here and built against the same contract if they have
not landed. Effort is stated as five phases rather than a duration; this repository does not record
time estimates.

## Open risks and assumptions

- The requirements leave two questions open that this slice answers by taking their stated defaults:
  archived members are hidden from the current-month view when their balance is zero and stay
  reachable otherwise, and a month with nobody active is an ordinary line whose whole cost falls on
  the organizer with no warning.
- Test-plan risk 4, a standing order counted for a month it should not cover, is proven here only as a
  rule in the domain module. Nothing can store a schedule until S-03, so the stored-exception half of
  that risk stays open by design.
- The 409 for a subscription with no owner member is correct and also mildly hostile to a developer
  carrying a local database from S-01. The remedy is one call to the members route or a recreated
  subscription, and it is written down rather than automated.
- Phase 4 depends on client shapes S-01 has specified but not yet landed. If they differ, this phase
  adapts to them rather than rewriting them.

## Success criteria

- The requirements' worked example holds to the minor unit, both in the calculation's own tests and
  read back through the API.
- A price change, a skipped month, a departure and a rejoin each produce the right answer with no
  manual correction, and for every month what everyone owes plus what the owner absorbs equals the
  plan cost exactly.
- A second account reaches none of the new records, by any route or verb, including through its own
  subscription id.
