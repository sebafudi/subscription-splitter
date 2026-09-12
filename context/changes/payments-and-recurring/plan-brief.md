# Payments and recurring - plan brief

> Full plan: `context/changes/payments-and-recurring/plan.md`
> Research: `context/changes/payments-and-recurring/research.md`

## What and why

Give the ledger its other half. S-02 decides what every participant owes; this slice records what
they actually paid, standing orders that keep paying without monthly data entry, and the single
months of those standing orders that did not arrive. Every balance moves accordingly, and the
interface never shows assumed money as confirmed money. This is roadmap item S-03, and it closes the
stored half of test-plan risk 4, the one risk S-02 deliberately left open.

## Starting point

S-01 is on main: sessions, two seeded accounts, subscriptions and the ownership rule enforced inside
SQL. S-02 is planned and not yet on disk; it brings the calculation, members and their active ranges,
prices, break months, the state loader, the summary route and the detail screen. It already declares
the payment, schedule and exception types, already writes the received-month rule against them,
already leaves `hasDependents` as the seam a delete rule asks, already makes the current month an
explicit argument to the rule, and already returns the three ledger arrays empty with a note naming
this slice. Nothing can store a payment or a standing order, so the
assumed-receipt rule is proven only against a literal state.

## Desired end state

The organizer records a payment with a date, an amount, a note and whether it was a one-off or a
yearly lump sum, corrects it, deletes it, and watches every balance follow. They record that a
participant sends a fixed amount every month from a given month, optionally until a given month, and
those months are counted without further entry and labelled assumed received. When one month does not
arrive they mark that month unpaid and only that month stops counting. A payment of 20.00 against a
share of 33.33 shows a balance of -13.33. A payment before the plan's first month is refused; one
dated in the future counts as credit now. A participant with history cannot be deleted. A second
account reaches none of it.

## Key decisions made

| Decision | Choice | Why | Source |
|---|---|---|---|
| Assumed receipts | A standing order counts its elapsed months automatically, corrected by per-month exceptions | Zero entry in the common case, action only on a real miss, and the balance still shows any drift | Decision D-007 |
| The not-yet-elapsed bound | An explicit current-month argument to the rule, asserted against the rule and again through the summary | S-02's revision moves the bound inside the rule, so the only remaining failure is threading the argument wrongly | Research |
| The residual helper S-02 left behind | Removed, once a search confirms no importer | S-02 hands the question here, payments give it no caller, and a dead export with a false assumption is a trap | Plan |
| An overlapping standing order | Refused with 409 naming the rule | The body is well formed; the conflict is with rows already stored, like a second owner or a duplicate price month | Decision D-007 |
| Two arrangements that touch in one month | An overlap, not a continuation | The month is the unit of account, the same reason S-02 gives for active ranges | Research |
| A payment or schedule naming the owner | Refused with 400 naming the member field | The owner is never owed from and is not in the per-member list, so the money would be counted nowhere | Decision D-007 |
| A payment before the plan's first month | Refused with 400 naming the date, nothing stored | US-02 states it, and the rule needs the subscription's own start month so it runs after the schema | Requirements |
| A future-dated payment | Accepted, counted as credit now | FR-018 records the typo counter-argument as answered | Requirements |
| A yearly lump sum | An ordinary payment that happens to be large | FR-016 refuses to spread it | Requirements |
| Derived numbers | Nothing stored: no balance column, no collected total, no paid-through month | An edit or a delete is then correct by construction rather than by a recomputation step | Decision D-007 |
| A narrowed arrangement | Drops the exceptions its new range no longer contains, in the same batch | Otherwise a later widening resurrects a correction made against different months | Decision D-007 |
| Both ends of the unpaid toggle | Idempotent, 204 either way | Each is one end of a toggle and clicking twice is not an error | Plan |
| Ownership two levels down | One statement joining payment to member to subscription to account | A foreign child, a foreign member and a foreign parent become one answer | Research |
| The payment kind | `kind` on the wire and in the domain, `tag` in SQL | The S-02 type says `kind` and the column is fixed; the repository maps them like every other column | Research |

## Scope

**In scope:** three pure rule modules in the domain and their unit cases, two migrations for
payments, recurring schedules and recurring exceptions, their repositories and nine routes under the
session and ownership rules, the two clauses that make the member delete refusal reachable, the three
reads that fill the state loader, and the payments and standing-order sections on the detail screen.

**Out of scope:** the status grid and its first-in-first-out attribution, coverages, opening balances,
charts and month series, spreading a yearly lump sum, negative amounts and refund records, any upper
bound on a payment date, reminders and participant-facing views, any change to a calculation signature
or to the summary route's shape, and deployment or a browser end-to-end test.

## Architecture / approach

Nothing derived is stored. Three tables hold only what the organizer entered, and every balance is
recomputed from them on read, which is what makes an edit and a delete correct without a
recomputation step. The rules the routes need are pure functions over values, written and tested
before any table exists, so the four boundaries that make the assumed-receipt rule hard are unit tests
rather than browser runs. Repositories own every statement and each one joins payment or schedule to
member to subscription and filters by the session user, so a record reached through any foreign link
is one answer. Routes validate with Zod, run the domain rules, and map each violation to its own
status code. The state loader gains three reads and the calculation gains nothing.

## Phases at a glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. The ledger rules | Real-date, payment-date, overlap and schedule-month predicates, and the unit cases pinning the assumed-receipt rule | Six conditions decide whether a month counts, and a test that moves more than one at a time proves nothing about either |
| 2. Payments | The payments table, repository, five routes, and the first clause of the member delete refusal | A payment is two levels below the account, so an ownership join that stops at the member leaks across subscriptions |
| 3. Standing orders | The schedule and exception tables, repository, seven routes, and the state loader filled | The overlap rule cannot be an index, so it is the one invariant a route has to remember |
| 4. The two sections | Payment list, form, inline edit and delete, per-participant arrangements and their month toggles | Showing assumed money next to recorded money without labelling it is the one way this product can mislead its user |
| 5. Evidence | Captured runs, the evidence index, the test-plan rollout status | None |

**Prerequisites:** S-02 on disk. This plan names S-02 files and functions that do not exist yet, so
phase 1 begins by confirming the migration numbering, which recurring cases its unit suite already
pins, and what shape its detail screen landed with. Effort is stated as five phases rather than a
duration; this repository does not record time estimates.

## Open risks and assumptions

- Everything here is planned against S-02's plan rather than against S-02's code. If that slice lands
  differently, the migration identifiers, the unit test files this one extends and the detail screen's
  shape are the three places it will show.
- The overlap rule is a read-then-check rather than a constraint, because SQLite has no exclusion
  constraint. Two concurrent writes for one member could both pass. At one organizer per subscription
  that race is not worth engineering against, and losing it produces a visible double count the
  organizer can delete rather than a corrupted ledger.
- Refusing a payment against the owner is a default this plan takes rather than a line the
  requirements write. It is reversible in one route if the organizer ever wants to record money they
  paid themselves.
- The assumed and recorded halves of a balance are separate terms in the calculation and separate
  groups on the screen. The moment anything between them adds the two together, FR-026 is lost
  quietly, and no test can see it.

## Success criteria

- The acceptance example holds to the minor unit: a payment of 20.00 against a share of 33.33 gives a
  balance of -13.33, in the calculation's own tests and read back through the API.
- A standing order contributes nothing for a month that is skipped, not yet elapsed, outside the
  participant's active range or marked as not received, proven against stored data rather than against
  a literal.
- Editing and deleting a payment move the balance back correspondingly, with nothing carried over.
- A second account reaches none of the new records, by any route or verb, including through its own
  subscription id and through a member filter naming another account's participant.
