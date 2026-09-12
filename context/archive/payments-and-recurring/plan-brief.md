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
SQL. S-02 has landed three of its five phases. Phases 1 and 2 brought the whole domain module, the
`members` and `active_ranges` tables with their repository and routes, and `hasDependents` with exactly
the four-argument signature this slice consumes, returning false, behind a member DELETE route that
already answers 409 on it. The domain already declares the payment, schedule and exception types,
already writes the received-month rule against them, and already makes the current month an explicit
argument to it. S-02 phase 3 has landed too, and it brings the piece this slice builds directly on:
`memberMonthStatus` in `src/domain/month-status.ts`, which answers whether a month counts for a member
and names the condition that failed, with `recurringReceived` already deferring three of its six
conditions to it. It also brings prices, break months, the state loader returning the three ledger
arrays empty with a note naming this slice, and the summary route. What is left of S-02 is the detail
screen. Nothing can store a payment or a standing order, so the assumed-receipt rule is proven only
against a literal state.

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
| Which months of a standing order counted | One domain helper answers per month, with the reason, built over S-02's `memberMonthStatus`, and both the calculation and the screen read it | The screen cannot get the answer from the summary, and a second copy of the six conditions is a rule that can disagree with itself | Decisions D-008, D-009 |
| The recorded-versus-assumed split | Drawn on the screen from that helper, not added to `MemberSummary` | Splitting the total would leave the per-month labels as wrong as before, and it changes the summary shape this slice excludes | Decision D-008 |
| The residual helper S-02 left behind | Removed; its only callers are two assertions in its own unit file, both already covered through `computeSummary` | D-006 records the alternative, widening it with a charged-count argument, as rejected after review, so a non-test caller would be a finding rather than a branch | Plan, D-006 |
| An overlapping standing order | Refused with 409 naming the rule | The body is well formed; the conflict is with rows already stored, like a second owner or a duplicate price month | Decision D-007 |
| Two arrangements that touch in one month | An overlap, not a continuation | The month is the unit of account, the same reason S-02 gives for active ranges | Research |
| What a schedule PATCH may change | Every column, `member_id` included, judged on the merged row | An arrangement entered against the wrong participant is an ordinary correction and payments already allow the move; the overlap is then read for the merged member and the owner refusal re-runs, or the rule can be walked around by creating then patching | Plan review F4 |
| A payment or schedule naming the owner | Refused with 400 naming the member field, and `manualCollectedThisMonth` gains the non-owner filter its two siblings already have | The owner is not in the per-member list, so the money moves no balance, but it does move `collectedThisMonth`, leaving the collected card unreconcilable with the screen | Decision D-007, plan review F6 |
| A payment before the plan's first month | Refused with 400 naming the date, nothing stored | US-02 states it, and the rule needs the subscription's own start month so it runs after the schema | Requirements |
| A future-dated payment | Accepted, counted as credit now | FR-018 records the typo counter-argument as answered | Requirements |
| A yearly lump sum | An ordinary payment that happens to be large | FR-016 refuses to spread it | Requirements |
| Derived numbers | Nothing stored: no balance column, no collected total, no paid-through month | An edit or a delete is then correct by construction rather than by a recomputation step | Decision D-007 |
| A narrowed arrangement | Drops the exceptions its new range no longer contains, in the same batch | Otherwise a later widening resurrects a correction made against different months | Decision D-007 |
| Both ends of the unpaid toggle | Idempotent, 204 either way | Each is one end of a toggle and clicking twice is not an error | Plan |
| Ownership two levels down | One statement joining payment to member to subscription to account | A foreign child, a foreign member and a foreign parent become one answer | Research |
| The payment kind | `kind` on the wire and in the domain, `tag` in SQL | The S-02 type says `kind` and the column is fixed; the repository maps them like every other column | Research |

## Scope

**In scope:** three pure rule modules in the domain and their unit cases, including the one helper that
decides which months of a standing order counted and why; two changes inside existing calculation
bodies, re-expressing `recurringReceived` over that helper and giving `manualCollectedThisMonth` the
non-owner filter its siblings have; two migrations for payments, recurring schedules and recurring
exceptions; their repositories and twelve routes under the session and ownership rules; the two clauses
that make the member delete refusal reachable; the three reads that fill the state loader; and the
payments and standing-order sections on the detail screen.

**Out of scope:** the status grid and its first-in-first-out attribution, coverages, opening balances,
charts and month series, spreading a yearly lump sum, negative amounts and refund records, any upper
bound on a payment date, reminders and participant-facing views, any change to a calculation signature
or to the summary route's shape including a recorded-versus-assumed split on `MemberSummary`, and
deployment or a browser end-to-end test.

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
| 4. The two sections | Payment list, form, inline edit and delete, per-participant arrangements and their month labels drawn from the domain helper | The screen labels months the server excluded, so a break month or a departure reads as assumed received and the assumed total cannot be reconciled with the balance |
| 5. Evidence | Captured runs, the evidence index, the test-plan rollout status | None |

**Prerequisites:** per phase, not one gate. Phase 1 needs S-02 phase 1 only, which is on disk, so it is
startable now: S-02 phase 3 has landed, so `src/domain/month-status.ts` is on
disk and phase 1 builds on it. Phases 2 and 3 need S-02 phase 3, for the state
loader and the summary route, which has landed. Phase 4 needs S-02 phase 4, the detail screen, which
is what remains. Phase 5 needs nothing from S-02. Prices and break months took migration `0004`, so
this slice's two are `0005` and `0006`. Effort is stated as five phases rather than a duration; this repository
does not record time estimates.

## Open risks and assumptions

- S-02 phases 1 to 3 are now on disk and this plan is grounded against them, including the migration
  numbering and `memberMonthStatus`. Only the detail screen is still planned against S-02's plan
  rather than against its code, so its shape is the one place a divergence would show, and confirming
  it is phase 4's first act.
- The overlap rule is a read-then-check rather than a constraint, because SQLite has no exclusion
  constraint. Two concurrent writes for one member could both pass. At one organizer per subscription
  that race is not worth engineering against, and losing it produces a visible double count the
  organizer can delete rather than a corrupted ledger.
- Refusing a payment against the owner is a default this plan takes rather than a line the
  requirements write. It is reversible in one route if the organizer ever wants to record money they
  paid themselves.
- The assumed and recorded halves of a balance are separate terms in the calculation and separate
  groups on the screen, and FR-026 turns on the per-month labels inside the assumed group rather than
  on the grouping. That is why one domain helper answers which months counted and why, and why both
  the calculation and the screen read it: the failure the review found was the screen deriving the
  answer itself from two of the six conditions. What remains is that the helper needs the members'
  active ranges and the subscription's break months in the browser, which S-02's detail screen already
  reads for its own sections.

## Success criteria

- The acceptance example holds to the minor unit: a payment of 20.00 against a share of 33.33 gives a
  balance of -13.33, in the calculation's own tests and read back through the API.
- A standing order contributes nothing for a month that is skipped, not yet elapsed, outside the
  participant's active range or marked as not received, proven against stored data rather than against
  a literal.
- Editing and deleting a payment move the balance back correspondingly, with nothing carried over.
- A second account reaches none of the new records, by any route or verb, including through its own
  subscription id and through a member filter naming another account's participant.
- A month the server excludes from a standing order is never drawn as assumed received: the screen's
  per-month labels and the server's total come from one function, and the two are asserted equal.
