---
project: "Subscription Splitter"
version: 1
status: draft
prd_version: 1
main_goal: quality
top_blocker: external
milestone_id: first-certified-subscription-flow
milestone_seq: 1
milestone_status: open
---

# Roadmap: Subscription Splitter

> Derived from `context/foundation/prd.md` (v1), `context/foundation/tech-stack.md` and the current
> state of this repository.
> Edit in place; archive when superseded.
> Items below are listed in dependency order. The "At a glance" table is the index.

## Milestone

**M-1: First certified subscription flow** - Status: open

- **Goal:** One complete subscription is certified end to end: an organizer signs in, sets up
  participants and prices, records payments, and reads balances that match a hand calculation, with
  a second account proven unable to see any of it.
- **Source materials:** `context/foundation/prd.md` (v1), plus the scope anchors below for the two
  items the requirements document does not cover.
- **Done when:** every F-NN and S-NN below is `done`, and the worked example in US-01 and the
  isolation checks in US-05 both hold against a deployed instance.
- **Scope anchors:** drawn from the requirements document (FR-001 to FR-026, US-01 to US-05), plus:
  - MS-01: an automated code review pipeline comments on pull requests in continuous integration.
  - MS-02: the certified flow runs on a deployed instance with its own remote database, with the
    walkthrough captured as evidence.

## Vision recap

One person pays for a shared monthly plan and collects money back from everyone on it. The
bookkeeping goes wrong because membership and price both change over the life of the plan, so the
unit of account has to be the month: what each participant owes is decided by who was active in that
month and what the plan cost that month. The product records those facts and derives every balance
from them.

## North star

**S-02: The organizer reads what each participant owes for a month they set up themselves** - this is
the milestone's validation point, because the primary success criterion is a per-participant balance
that matches a hand calculation, and nothing else in the product matters if that number is wrong.

> North star means the smallest end-to-end item whose successful delivery would prove the product's
> core hypothesis. It is placed as early as its prerequisites allow, because everything else only
> matters once it holds.

## At a glance

| ID | Change ID | Outcome (the organizer can ...) | Prerequisites | Source refs | Status |
|---|---|---|---|---|---|
| F-01 | product-foundation-docs | (foundation) plan every later item against a named anchor | - | FR-001 to FR-026, US-01 to US-05 | ready |
| S-01 | runtime-auth-slice | sign in, see their own subscription, and be refused everyone else's | F-01 | US-05, FR-001, FR-002, FR-003, FR-004, FR-005 | done |
| S-02 | members-and-price-history | record participants and prices and read this month's share and balances | S-01 | US-01, US-03, US-04, FR-006 to FR-014, FR-022, FR-023, FR-024 | done |
| S-03 | payments-and-recurring | record payments and standing orders and watch balances move | S-02 | US-02, FR-015 to FR-021, FR-025, FR-026 | done |
| S-04 | verification-and-release | use the certified flow on a deployed instance | S-03 | US-01, US-02, US-03, US-04, US-05, MS-02 | done |
| S-05 | ai-review-pipeline | (supporting) get an automated review comment on a pull request | F-01 | MS-01 | in-progress |

## Streams

Navigation aid - groups items that share a prerequisite chain. The canonical order is the dependency
graph below; this table is a proposed reading order across parallel paths.

| Stream | Theme | Chain | Note |
|---|---|---|---|
| A | The ledger | `F-01` → `S-01` → `S-02` → `S-03` → `S-04` | The certified flow itself, sequenced so the money calculation is exercised as early as its prerequisites allow. |
| B | Review tooling | `S-05` | Shares only the repository with stream A; it can run alongside the ledger chain from the second slice onward without blocking it. |

## Baseline

What is already in place in this repository. The foundations below assume these are present and do
not recreate them.

- **Frontend:** absent - no application code.
- **Backend / API:** absent - no application code.
- **Data:** absent - no migrations and no database binding.
- **Auth:** absent in the product, but the mechanism is settled by decision D-001 and proven by a
  compatibility spike kept under `evidence/spikes/auth-spike/`.
- **Deployment / infra:** absent - no scaffold, no wrangler configuration, no workflows.
- **Observability:** absent, and deliberately out of scope for this milestone.
- **Project documentation:** present - `context/foundation/` holds the requirements, the stack
  hand-off, this roadmap and the test plan; `context/decisions/` holds D-002 and D-003;
  `evidence/index.md` maps goals to artifacts.

## Foundations

### F-01: Foundation documents

- **Outcome:** (foundation) the product requirements, the stack hand-off, this roadmap and the test
  plan are on disk and agreed, so every later item traces to a named anchor and a named risk.
- **Change ID:** product-foundation-docs
- **Source refs:** FR-001 to FR-026, US-01 to US-05, MS-01, MS-02
- **Unlocks:** S-01, S-02, S-03, S-04 and S-05 all trace their scope to anchors defined here; it also
  reduces the blocking unknown of what "correct" means for the money calculation, by fixing the
  worked example in US-01 that later items are tested against.
- **Prerequisites:** -
- **Parallel with:** -
- **Blockers:** -
- **Unknowns:** -
- **Risk:** Sequenced first because every later item is verified against the anchors defined here; if
  the rounding rule or the ownership rule were left implicit, they would be re-decided differently in
  each slice.
- **Status:** ready

## Slices

### S-01: Sign in and reach only your own subscription

- **Outcome:** The organizer signs in, sees their own subscription, and is refused every record that
  belongs to another account.
- **Change ID:** runtime-auth-slice
- **Source refs:** US-05, FR-001, FR-002, FR-003, FR-004, FR-005
- **Prerequisites:** F-01
- **Parallel with:** S-05
- **Blockers:** -
- **Unknowns:**
  - Whether the second seeded account is read-only or has full control of its own data - Owner: the
    organizer. Block: no; the default is full control, which is the stricter isolation test.
- **Risk:** Sequenced first because ownership resolution is the one defect that is silent: a slice
  built on a route that forgets it would have to be reworked everywhere. Decision D-001 removed the
  runtime risk from the sign-in choice; what is left is the seeding path and the origin and
  rate-limit checks the spike configured but did not exercise end to end.
- **Status:** done

### S-02: Record participants and prices, and read the share

- **Outcome:** The organizer records participants with the months they were active, records the price
  history and any skipped months, and reads this month's per-person share, the headline totals and a
  per-participant balance.
- **Change ID:** members-and-price-history
- **Source refs:** US-01, US-03, US-04, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012,
  FR-013, FR-014, FR-022, FR-023, FR-024
- **Prerequisites:** S-01
- **Parallel with:** S-05
- **Blockers:** -
- **Unknowns:**
  - Whether archived participants stay in the balance list - Owner: the organizer. Block: no; the
    default is hidden from the current-month view and still reachable in history.
  - How a charged month with no active participants is presented - Owner: the organizer. Block: no;
    the default is an ordinary line whose whole cost falls on the organizer.
- **Risk:** This is the milestone's validation point, so it is placed as early as its prerequisites
  allow. The risk is that the calculation is written against the storage layer rather than as a
  module that can be exercised on its own, which would make the boundary cases in the test plan
  expensive to cover and therefore uncovered.
- **Status:** done

### S-03: Record payments and standing orders

- **Outcome:** The organizer records, edits and deletes payments, records standing orders and their
  exceptions, sees balances move accordingly, and can tell a recorded receipt from an assumed one.
- **Change ID:** payments-and-recurring
- **Source refs:** US-02, FR-015, FR-016, FR-017, FR-018, FR-019, FR-020, FR-021, FR-025, FR-026
- **Prerequisites:** S-02
- **Parallel with:** S-05
- **Blockers:** -
- **Unknowns:** -
- **Risk:** Sequenced after the share calculation because a balance is meaningless until what is owed
  is correct. The risk is the assumed-receipt rule: counting a standing order for a month that was
  skipped, not yet elapsed, or outside the participant's active range would overstate what has been
  collected and quietly understate what is owed.
- **Status:** done

### S-04: Use the certified flow on a deployed instance

- **Outcome:** The organizer walks the whole flow in a browser against a deployed instance with its
  own remote database, and the walkthrough is captured as evidence.
- **Change ID:** verification-and-release (`context/archive/verification-and-release/`)
- **Source refs:** US-01, US-02, US-03, US-04, US-05, MS-02
- **Prerequisites:** S-03
- **Parallel with:** S-05
- **Blockers:** -
- **Unknowns:**
  - Whether the deployed instance seeds the same accounts as local development - Owner: the
    organizer. Block: no; the default is the same two seeded accounts with different credentials.
- **Risk:** Sequenced last in its stream because it certifies the others rather than adding
  behaviour. The risk is that local behaviour and deployed behaviour diverge on the two things that
  are environment-sensitive: which month counts as current, and whether migrations have been applied
  to the remote database.
- **Status:** done

### S-05: Automated review comment on a pull request

- **Outcome:** (supporting) A pull request receives an automated review comment produced by the
  reviewer package, with its prompts exercised by an evaluation suite.
- **Change ID:** ai-review-pipeline
- **Source refs:** MS-01
- **Prerequisites:** F-01
- **Parallel with:** S-02, S-03, S-04
- **Blockers:** Model API access for the review route is not available in this environment; the
  account owner has to provide it as a repository secret.
- **Unknowns:**
  - Which model and prompt shape the reviewer uses - Owner: decision D-003. Block: yes until the
    evaluation suite can run against a model.
- **Risk:** Kept out of the ledger stream entirely so that a missing credential never blocks the
  product work. The risk is scope drift: a review pipeline can absorb unlimited effort, and it
  certifies nothing about the money calculation.
- **Status:** in-progress

## Backlog Handoff

| Roadmap ID | Change ID | Suggested task title | Ready for `/10x-plan` | Notes |
|---|---|---|---|---|
| F-01 | product-foundation-docs | Write the product foundation documents | yes | This change |
| S-01 | runtime-auth-slice | Sign-in, sessions and owned subscription resource | yes | Run `/10x-plan runtime-auth-slice` |
| S-02 | members-and-price-history | Participants, price history and the share calculation | no | Run after S-01 lands |
| S-03 | payments-and-recurring | Payments, standing orders and balances | no | Run after S-02 lands |
| S-04 | verification-and-release | Browser walkthrough, smoke test and deployment | no | Run after S-03 lands |
| S-05 | ai-review-pipeline | Reviewer package, evaluations and pull request comment | no | Waits on model API access |

## Open Roadmap Questions

1. **Whether the second seeded account is read-only or has full control of its own data** - Owner:
   the organizer. Blocks: nothing; default is full control of its own data.
2. **Whether archived participants stay in the balance list** - Owner: the organizer. Blocks:
   nothing; default is hidden from the current-month view, still reachable in history.
3. **How a charged month with no active participants is presented** - Owner: the organizer. Blocks:
   nothing; default is an ordinary line whose whole cost falls on the organizer.
4. **Model API access for the review route** - Owner: the account owner. Blocks: S-05. This is the
   one remaining external dependency, and it is why the main blocker is external rather than an
   unresolved decision.

(Which sign-in mechanism the seeded accounts use was resolved by decision D-001.)

## Parked

- **Coverage waivers** - Why parked: requirements §Non-Goals; deferred until the core ledger is trusted.
- **Opening balances from a previous spreadsheet** - Why parked: requirements §Non-Goals; the first
  month in the product is the first month of record.
- **Charts and time series beyond the headline totals** - Why parked: requirements §Non-Goals; they
  add reading, not decisions.
- **An interface for more than one subscription per account** - Why parked: requirements §Non-Goals;
  the records allow it, the screens are out of scope for this milestone.
- **Currency conversion** - Why parked: requirements §Non-Goals; one subscription, one currency.
- **Payment processing, payment links and bank integration** - Why parked: requirements §Non-Goals;
  the product records money that moved elsewhere.
- **A machine-facing interface to the ledger** - Why parked: requirements §Non-Goals.
- **Mobile applications** - Why parked: requirements §Non-Goals; the browser is the only surface.
- **Offline use, multi-region availability, formal certification** - Why parked: requirements
  §Non-Goals, non-functional.
- **Observability beyond what a failure in the flow already shows** - Why parked: not named by any
  requirement, and this milestone's guardrails are correctness and isolation, not operations.

## Milestone History

(Empty at the first milestone.)

## Done

- **S-01: The organizer signs in, sees their own subscription, and is refused every record that belongs to another account.** — Archived → `context/archive/runtime-auth-slice/`. Lesson: —.
- **S-02: The organizer records participants with the months they were active, records the price history and any skipped months, and reads this month's per-person share, the headline totals and a per-participant balance.** - Archived to `context/archive/members-and-price-history/`. Lesson: a helper that restates a rule the shipped code already applies proves nothing; the month-status seam was only worth adding because `shareForMember` and `recurringReceived` were both re-expressed over it.
- **S-03: The organizer records, edits and deletes payments, records standing orders and marks single months of them as not received, and every balance moves accordingly.** - Archived to `context/archive/payments-and-recurring/`. Lesson: a per-route assertion made through the composed application can prove a contract a caller sees while proving nothing about the module that answers it, because routers mounted at one base share the pattern; the property only becomes testable when the router is asked on its own.
- **S-04: The organizer walks the whole flow in a browser against a deployed instance carrying every migration, and the walkthrough is captured as evidence.** - Archived to `context/archive/verification-and-release/`. Lesson: a release SHA only describes the deployed bundle if the build runs from a tree nobody else can touch, because `vite build` reads the working tree rather than a git ref; building from a throwaway clone at the pinned SHA is what made the first deployment's recorded defect impossible to repeat here.
