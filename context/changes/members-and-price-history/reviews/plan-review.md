<!-- PLAN-REVIEW-REPORT -->
# Plan review: Implementation plan, members and price history

- **Plan**: `context/changes/members-and-price-history/plan.md`
- **Mode**: Deep
- **Repository state**: commit `c2e1468`, with S-01's implementation-review fixes landing into
  `tests/integration/subscriptions.test.ts` while this review ran
- **Verdict**: REVISE (approve with required changes)
- **Findings**: 2 critical, 7 warnings, 1 observation

Date and effort fields the report schema lists are omitted, matching this repository's convention of
recording progress by change ID, migration ID and commit.

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | WARNING |
| Lean Execution | PASS |
| Architectural Fitness | WARNING |
| Blind Spots | FAIL |
| Plan Completeness | WARNING |

## Grounding

Paths: 11/11 existing files the plan modifies exist (`src/domain/money.ts`, `src/domain/money.test.ts`,
`src/server/index.ts`, `src/server/db/subscriptions.ts`, `src/server/validation/subscriptions.ts`,
`src/client/api.ts`, `src/client/App.tsx`, `src/client/index.css`, `context/foundation/test-plan.md`,
`evidence/index.md`, `evidence/work-log.md`). Symbols: 10/10 verified against the landed code, not
from memory (`shareForMonth`, `ownerResidualForMonth`, `requireSession`, `SessionVariables`,
`sessionUser`, `createSubscriptionSchema`, `patchSubscriptionSchema`, `toSubscription`,
`applyD1Migrations`, `readD1Migrations`), plus every npm script the success criteria invoke
(`test:unit`, `test:integration`, `typecheck`, `build`, `db:migrate:local`). Progress section: the
mechanical contract in `10x-plan/references/progress-format.md` holds. Exactly one `## Progress`
heading, after `## References`; five `### Phase N` headings identical to the five `## Phase N` headers;
every success-criterion bullet has a numbered row (1.1 to 1.6, 2.1 to 2.7, 3.1 to 3.7, 4.1 to 4.13,
5.1 to 5.3) with the Automated/Manual split preserved; no checkbox outside the Progress section. No
calendar dates, durations or estimates anywhere in the plan. The single em dash in the plan is the
` — <commit sha>` token that `progress-format.md` mandates, so it stands. Brief-to-plan: phases,
decisions and scope match, with the one exception recorded under Stale S-01 assumptions below.
`docs/reference/contract-surfaces.md` does not exist in this project, so that check is skipped.

## Stale S-01 assumptions

The plan was written while S-01 was in flight. Five statements about S-01 no longer hold. None of them
invalidates a decision; all of them are hedges that should be replaced with the fact, so phase 4 does
not re-litigate a question that has an answer.

1. **Phase 4, change 3**: "If S-01 phase 4 has not landed when this phase starts, this phase creates
   the file against the same contract rather than waiting or duplicating it." It landed.
   `src/client/api.ts` exists with `request`, `SignedOutError`, `ApiError` carrying `field`,
   `listSubscriptions` and `createSubscription`. The conditional can be deleted and replaced with the
   real extension point.
2. **`research.md`, open question 3**: "`src/client/api.ts` and `src/client/screens/Home.tsx` are
   specified in the S-01 plan but not yet on disk." Both are on disk, along with
   `src/client/screens/Login.tsx` and `src/client/screens/SubscriptionForm.tsx`. The question is
   resolved, not open.
3. **`plan-brief.md`, Prerequisites**: "S-01 phase 4's client files are assumed by phase 4 here and
   built against the same contract if they have not landed." Same as above.
4. **Phase 2, change 6**: "The existing S-01 test files are deliberately left alone in this slice, so
   folding their private copies into this module does not collide with the in-flight slice." Per
   `context/STATUS.md`, all five S-01 phases have landed; only the implementation review and the pull
   request remain. The collision argument is stale, and its consequence is that
   `tests/integration/accounts.ts` becomes a third copy of the helpers rather than a consolidation of
   two. Either fold `auth.test.ts` and `subscriptions.test.ts` onto the shared module in this slice,
   or restate the reason for deferring it.
5. **Current state analysis**: "the only screen is the one S-01 builds." Three screens landed. This
   matters because phase 4 has to slot the detail screen into `App.tsx` and `Home.tsx` as they now
   are; see F7.

Everything else the plan asserts about S-01 checks out against the code: `src/domain/` holds exactly
the two helpers described, `ownerResidualForMonth` really does encode `activeCount - 1` at
`src/domain/money.ts:19`, `src/server/routes/subscriptions.ts:8-9` registers `requireSession` for both
path patterns, `src/server/db/subscriptions.ts` carries `user_id = ?` in every statement and returns
`null` indistinguishably for foreign and missing rows, the integration suite shares one D1 and never
resets it, `vitest.unit.config.ts` includes `src/**/*.test.ts`, and `migrations/0002_subscriptions.sql`
is the style the two new migrations copy.

**On the parent review brief's "truncated open question 4"**: no truncation exists. `research.md` has
three open questions and all three are complete. The requirements' open question 4, in
`context/foundation/prd.md`, is the charged-month-with-nobody-active question, and the plan's default
matches the requirements' own stated default and D-006. The subscriptions-created-before-this-slice
question is answered concretely in the plan's Migration notes and in D-006: 409 from the summary,
naming the missing owner and the members route as the remedy, and no backfill. That default is
specific enough to implement.

## Domain semantics, checked rule by rule

Verified against `lib/calc.ts` and section 10 of the design document in the read-only prototype, and
against the requirements. These are correct in the plan and are recorded here so the implementer does
not re-derive them: the break month short-circuits before the price history is consulted; the latest
entry at or before the month wins and the price is zero before the first entry; ranges are inclusive
at both ends, a range whose ends are equal covers one month, and two touching ranges are an overlap;
the owner is in the denominator and never owes; the share is `Math.round(price / activeCount)`;
`ownerNetCost` is `totalPlanCost - totalCollected`; the member list is ascending by balance;
`currentMonth` comes from `Intl.DateTimeFormat` with the subscription's zone and an injectable `now`;
and the zero-active answer of zero with full owner absorption is the deliberate, recorded departure
from the prototype. The five headline cards match both the prototype's R11 and the requirements'
Business Logic section exactly.

The `ownerResidualForMonth` third-argument change is arithmetically coherent. With the acceptance
example, `ownerResidualForMonth(10000, 3, 2)` is `10000 - 3333 * 2`, which is 3334, the value the
requirements name. With nobody active, `ownerResidualForMonth(10000, 0, 0)` is 10000, which is what
the existing test at `src/domain/money.test.ts:18` already asserts, so that assertion survives the
signature change unchanged. With the owner sitting a month out, the third argument equals the active
count and the residual can go negative by a few minor units, which the plan states. What is not
coherent is that nothing calls it; see F4.

## Findings

### F1 - Phase 4 turns phase 3's summary tests red, and the plan states the opposite

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: End-State Alignment
- **Location**: Critical implementation details; Phase 3, change 7; Phase 4, change 2
- **Detail**: The plan promises, under Critical implementation details, that "Phase 3's summary tests
  create the owner explicitly through the members route because phase 4 is what makes it automatic;
  that ordering is deliberate and the tests written in phase 3 keep passing afterwards." They cannot.
  Phase 3's summary test is specified as "create a subscription starting in the current month, add the
  owner member and two participants active from that month". Once phase 4 makes
  `src/server/db/subscriptions.ts` write the owner member in the same batch as the subscription, that
  second step hits `members_one_owner_idx` and returns 409, and every assertion after it fails. The
  plan's fourth summary case is worse: it asserts the 409 for a subscription with no owner member,
  "created by calling the subscriptions route directly, which is still possible until phase 4". The
  plan names the expiry of its own precondition and then schedules no step to deal with it, while
  phase 4's automated criterion 4.3 is "The whole suite passes". D-006's Affected tests section
  carries the same case and inherits the same problem.
- **Fix**: Add a change to phase 4 that rewrites the phase-3 summary tests in the same commit as the
  owner-on-create batch: drop the explicit owner `POST`, and rebuild the no-owner case by inserting a
  subscription row directly through `env.DB` in the test, since no route can produce that state any
  more. If direct insertion is judged too far inside the implementation, delete the case and cover the
  no-owner branch where it can still be reached, in a `loadState` unit or repository test. Amend
  D-006's Affected tests line to say which of the two was chosen.
- **Decision**: PENDING

### F2 - A `start_month` patch wedges every member whose ranges precede it

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: Blind Spots
- **Location**: Phase 1, change 4; Phase 2, change 4; Phase 4, change 2
- **Detail**: `patchSubscriptionSchema` accepts `start_month`
  (`src/server/validation/subscriptions.ts:42`) and `update` writes it
  (`src/server/db/subscriptions.ts:98,103`). The plan introduces `validateActiveRanges(ranges,
  startMonth)`, which rejects any range beginning before the subscription's first month, and runs it
  on every member `POST` and `PATCH`. It also pins the owner's opening range to the start month at
  creation, once. Nothing re-validates when the start month moves. Move it later and every stored
  range that begins earlier, the owner's included, now violates the rule the write path enforces, so
  any subsequent member `PATCH` is a 400 even when it resends the member's own unchanged ranges: the
  member becomes uneditable through the API. The summary also silently drops the truncated months from
  `totalPlanCost` and from every member's `owed`, which is the "a price change is applied to the wrong
  months" half of test-plan risk 1 arriving through a different door. The plan never mentions the
  interaction, and the same gap lets a price entry or break month sit before the start month, since
  neither is checked against it while member ranges are.
- **Fix A ⭐ Recommended**: Add a guard to the subscriptions `PATCH` handler: when `start_month`
  changes, refuse with 409 if any member range, price entry or break month precedes the new value,
  naming the rule. Add one integration case per direction.
  - Strength: Additive. It leaves S-01's shipped contract, its route and its tests untouched, and it
    matches how the plan already handles a refused write elsewhere, the second owner and the owner
    delete, both 409.
  - Trade-off: The organizer who genuinely mistyped the first month has to correct the member ranges
    first, in the opposite order from the one they would expect.
  - Confidence: HIGH - the predicate is one query per child table and the failure mode was reproduced
    by reading the patch schema and the update statement together.
  - Blind spot: Whether `time_zone` deserves the same treatment. Changing it can move `currentMonth`
    by one month at a boundary, which shifts the enumerated range by a month. Smaller, but unexamined.
- **Fix B**: Remove `start_month` from `patchSubscriptionSchema` entirely and document that correcting
  the first month means recreating the subscription.
  - Strength: Removes the class of problem rather than guarding one entry to it; nothing downstream
    has to stay in sync.
  - Trade-off: It is a breaking change to an S-01 contract that has landed, with its own test and its
    own client form, and it takes away a capability the requirements never asked to remove.
  - Confidence: MED - correct, but it reopens a slice that is closing.
  - Blind spot: Whether any S-01 review finding already depends on `start_month` being patchable.
- **Decision**: PENDING

### F3 - The elapsed-month half of test-plan risk 4 lands in no module and no test

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: Blind Spots
- **Location**: Phase 1, change 5; Risk mapping table
- **Detail**: `recurringReceived` is specified with five conditions: at or after the start month, at or
  before the end month when there is one, not a break month, covered by a range, not excepted. None of
  them is "elapsed". Elapsed-ness arrives only from whatever month list the caller passes, and
  `computeSummary` happens to pass one bounded by the current month. `context/foundation/test-plan.md`
  risk 4 names "not yet elapsed" as one of the four failure modes, its response row requires proof
  that a standing order counts "only when that month is elapsed", its anti-pattern is "Testing a
  single mid-range month and never the four boundaries that make the rule hard", and it directs
  research to ground "the elapsed-month rule relative to the subscription time zone". The prototype's
  authoritative R3 states the rule as `[startMonth, endMonth ?? currentMonth]`, with the current month
  as the default upper bound inside the rule. The plan's own risk-mapping row nonetheless claims risk
  4 is covered because "The rule is proven in the domain module". Three of the four boundaries are;
  the one the test plan singles out as time-zone dependent is not.
- **Fix**: Give `recurringReceived` the current month as an explicit argument and treat a null
  `endMonth` as bounded by it, then add the unit case: a schedule with no end month contributes
  nothing for a month after the current one. If the elapsed bound is deliberately left to the caller,
  say so in the risk-mapping row instead of claiming the rule is proven, and move the boundary to
  S-03's row.
- **Decision**: PENDING

### F4 - The widened residual helper has no producer for its third argument and no call site

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: Architectural Fitness
- **Location**: Phase 1, change 3; Phase 1, change 5; Phase 4, change 4
- **Detail**: The plan widens `ownerResidualForMonth` to take a charged count, which is the right
  correction and is the reason D-006 exists. But no contract in the plan produces that count:
  `chargedCount` appears only in prose, `computeSummary`'s field list never calls the helper, and the
  number the screen actually shows is specified twice as the subtraction `currentMonthly -
  expectedThisMonth`. So the shipped path computes the residual by one expression and the test suite
  proves a different one. That also makes the month-balances test near-vacuous: with the residual
  defined as `price - share * chargedCount` and the expectation defined as `share * chargedCount`,
  their sum is the price by construction, whatever the implementation does elsewhere. The guardrail
  the requirements care most about, "no month loses or invents money", ends up asserted against an
  identity rather than against the number the organizer reads.
- **Fix**: Have `computeSummary` return the current month's residual as a named field computed through
  `ownerResidualForMonth`, and define the charged count in `src/domain/members.ts` as the non-owner
  members active in the month. The screen then renders a value instead of re-deriving one, and the
  balancing test exercises the shipped path.
- **Decision**: PENDING

### F5 - No test reaches a child through the wrong parent inside the same account

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - a quick decision; the fix is obvious and narrow
- **Dimension**: Blind Spots
- **Location**: Phase 2, change 7; Phase 3, change 7
- **Detail**: The ownership cases are specified as cross-account only, including the wrong-parent
  variant "A's member id reached through B's own subscription id". A repository that filters by
  `s.user_id = ?` and forgets the `subscription_id` predicate passes every one of those cases and
  still lets account A read and edit its own first subscription's members through its second
  subscription's id. That is the exact shape of test-plan risk 2's anti-pattern, "Testing only the
  top-level resource and assuming children inherit the check", and it is reachable: the API allows an
  account several subscriptions even though phase 4's interface offers one.
- **Fix**: Add one case per child resource: one account creates two subscriptions, and naming a
  member, price or break month of the first through the second's id returns 404 for `GET`, `PATCH` and
  `DELETE`.
- **Decision**: PENDING

### F6 - Deleting the earliest price entry silently re-prices every earlier month to zero

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: Blind Spots
- **Location**: Phase 3, change 5; Phase 4, change 4
- **Detail**: `DELETE /api/subscriptions/:id/prices/:priceId` is specified with no guard, and
  `priceForMonth` returns zero for any month before the first entry. Deleting the earliest entry
  therefore rewrites every month between the plan's start and the next entry to cost nothing, which
  moves `totalPlanCost`, `ownerNetCost` and every member's `owed` and `balance`, with no confirmation
  and no trace. The prototype's authoritative R4 requires exactly this case to warn: "Price entries are
  deletable (recompute handles gaps) but warn before deleting the earliest one if it leaves priced
  months unpriced." `research.md` states that every deliberate departure from the prototype is named;
  this one is not named anywhere. No test in the plan asserts what a price delete does to the summary,
  only that the row disappears.
- **Fix**: Name the departure and pick one of the two ends of it: refuse the delete with 409 when the
  entry is the earliest and later priced months exist, or keep the delete and put a confirmation in
  the price list that says which months lose their price. Either way add one test asserting the
  summary after a price delete, so the recompute is pinned rather than assumed.
- **Decision**: PENDING

### F7 - Phase 4's client contract is missing a file, a data path and three screen states

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - a quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: Phase 4, changes 3 and 4
- **Detail**: Three concrete gaps, all consequences of writing this phase before S-01's client landed.
  First, phase 4 requires the selected subscription to be "set by choosing one on the home screen",
  but `src/client/screens/Home.tsx` renders each subscription as a plain `<li>` with no affordance and
  no callback, and it is not in phase 4's file list. Second, `Summary` as specified carries no
  currency, locale or time zone, while `formatMoney(minor, locale, currency)` needs two of them and
  `src/client/api.ts` exposes `listSubscriptions` but no single-subscription read, so the plan has to
  say which end supplies them. Third, the detail screen has no specified behaviour for its loading
  state, its error state, or the 409 the summary returns for a subscription with no owner member,
  which is the state every S-01-era local database is in and therefore the first thing a developer
  will see.
- **Fix**: Add `src/client/screens/Home.tsx` to phase 4's file list with an `onSelect` prop, state
  that `App` holds the selected `Subscription` object so the detail screen has the locale and currency
  without a second request, and specify the three screen states, with the 409 rendering the message
  the route already returns rather than a generic failure.
- **Decision**: PENDING

### F8 - The shared account helper collapses the per-file client-IP namespace the rate limiter depends on

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - a quick decision; the fix is obvious and narrow
- **Dimension**: Blind Spots
- **Location**: Phase 2, change 6
- **Detail**: `src/server/auth.ts:26-33` enables rate limiting at ten requests per sixty seconds per
  client address with `storage: 'database'`, and the integration database is shared across every test
  file and never reset. The three existing files avoid each other by prefix: `10.0.0.x` in
  `auth.test.ts`, `10.1.0.x` in `subscriptions.test.ts`, `10.2.0.1` in `dev-seed.test.ts`, with
  `subscriptions.test.ts` now up to suffix 6 after S-01's review fixes. Phase 2 specifies the shared
  helper as "a header builder giving each test its own `cf-connecting-ip`" without saying the
  namespace has to stay distinct per file. This slice adds three files that each seed two accounts; a
  helper that hands out one hard-coded prefix puts them all in one bucket, and the failure shows up as
  an intermittent 429 during sign-in that reads like a flaky auth test.
- **Fix**: Give the helper a per-file prefix parameter, assign `10.3.0.x`, `10.4.0.x` and `10.5.0.x`
  to the three new files, and record the constraint in one line where the helper is defined.
- **Decision**: PENDING

### F9 - US-01's payment acceptance criterion is asserted nowhere

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - a quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: Phase 1, change 6
- **Detail**: The requirements' US-01 has three numeric acceptance criteria. The plan pins the first
  two, a share of 3333 and a residual of 3334, in both the unit tests and the summary integration
  test. The third, "A participant who pays 20.00 shows a balance of -13.33 for that month", is pinned
  nowhere: the only balance case is described as "`balanceForMember` is paid less owed, negative when
  owing and positive when ahead", with no worked number. The plan lists US-01 in its References and
  makes the worked example its primary success criterion, so leaving a third of it unasserted is a
  gap, not a scope boundary. It costs one test: `Payment` is already in `SubscriptionState`,
  `balanceForMember` already sums payments, and no storage is needed.
- **Fix**: Add a unit case building a state with a price of 10000, three active members including the
  owner, and a payment of 2000 from one member, asserting `balance` of -1333 for the single month.
- **Decision**: PENDING

### F10 - Three smaller inconsistencies worth settling while the files are open

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW - a quick decision; the fix is obvious and narrow
- **Dimension**: Architectural Fitness
- **Location**: Phase 2, change 3; Phase 3, change 2; Phase 5, change 3
- **Detail**: (a) `hasDependents(db, memberId)` is the one function in the members repository without
  the ownership predicate, in a module whose stated contract is that "Every statement joins
  `subscriptions` and filters `s.user_id = ?`". It is safe today because the route calls it only after
  a scoped `get`, but S-03 adds clauses to it, and the exception is the kind that stops being safe
  quietly. (b) Member ranges are validated against the subscription's start month while price entries
  and break months are not, although the prototype's R10 requires "all months/dates `>=
  settings.startMonth`"; the asymmetry is harmless for the calculation and confusing for the next
  reader. (c) Phase 5 fills test-plan section 6.1 and explicitly leaves "every other section
  untouched", but this slice is the one that writes the canonical ownership test for three new child
  resources, which is exactly what section 6.3 is waiting for, and its own text says "Every new child
  resource gets one". Section 3's rollout phase 1 also still reads "not started" despite S-01 having
  landed, which is S-01's debt but will look like this slice's if left.
- **Fix**: Give `hasDependents` the same `(db, subscriptionId, memberId, userId)` shape as its
  siblings; add the start-month bound to the price and break-month schemas; and extend phase 5 to fill
  section 6.3 and correct rollout phase 1's status.
- **Decision**: PENDING

## What is right, and worth not disturbing

The shape of this plan is correct and most of it is unusually well grounded. The calculation lands
first as a pure module, which is what makes test-plan risks 1 and 5 unit tests. Ownership is extended
by one join rather than re-established, which answers the foreign-child and foreign-parent cases with
the same predicate. The atomic writes are in the two places that need them and nowhere else. The
one-owner rule sits in a partial unique index with an explicit translation to 409, which is valid
SQLite and holds for paths that do not exist yet. Both migrations are syntactically sound and copy
`0002_subscriptions.sql` exactly: quoted identifiers, no `IF NOT EXISTS`, cascade on every foreign
key, `GLOB` month checks, a table-level check comparing `left_month` to `joined_month`, and sequential
`0003` and `0004` names that `readD1Migrations` picks up with no test change. The scope boundaries
hold under inspection: nothing in "What we are NOT doing" reappears in a phase, and the three
collections typed but left empty for S-03 are the cheapest correct call rather than premature
abstraction. Lean Execution passes without a finding.

## Resolution

Every finding was re-checked against the landed code before being acted on; the review's citations all
held, including the patchable `start_month` at `src/server/validation/subscriptions.ts:42`, the absence
of any landed test asserting that such a patch succeeds, `Home.tsx` rendering each subscription as a
plain list item, and the three client-address prefixes already in use across the integration files.
Resolved in `plan.md`, `plan-brief.md`, `research.md` and
`context/decisions/D-006-owner-member-and-zero-active-invariant.md`.

| Finding | Decision | What changed |
|---|---|---|
| F1 | Accepted, and fixed by moving the work rather than by patching the tests | Owner-on-create moves out of phase 4 and into phase 2, alongside the members migration, so no phase is written against a precondition a later phase removes. Phase 3's summary tests never create an owner, and the no-owner case builds its precondition by inserting a subscription row directly through `env.DB` in a test-only helper that carries one line saying why it exists. The claim that phase 3's tests survive phase 4 is gone from Critical implementation details, and D-006's Affected tests names the direct insert. |
| F2 | Accepted, Fix B | `start_month` leaves `patchSubscriptionSchema`, so a patch carrying it is a 400 naming the field, in the same shape as the existing refusal of `id` and `user_id`. Fix A's guard was rejected because it is a rule every child table added later would have to be kept in step with. The immutability is stated in Critical implementation details, in the Migration notes as a capability S-01 shipped and this slice removes, and in D-006 as its third rule, with an integration case and a schema case. |
| F3 | Accepted | `recurringReceived` takes the current month as an explicit argument and treats a null end month as bounded by it, so the not-yet-elapsed boundary holds for any caller rather than riding on the month list `computeSummary` happens to pass. A unit case covers a schedule with no end month contributing nothing for a month after the current one. The risk-mapping row for risk 4 now says the rule is proven including that boundary, and that the stored-exception half stays with S-03. |
| F4 | Accepted, by removing the widening rather than by wiring it up | `ownerResidualForMonth` is left exactly as S-01 shipped it, with no caller in this slice. `computeSummary` returns `ownerShareThisMonth`, the month's price less what the charged members carry, computed once; the screen renders that field and the acceptance tests assert it. `chargedMembersInMonth` is named in `src/domain/members.ts` so the count is not re-derived per call site. The balancing tests assert `currentMonthly`, `currentPerPersonShare`, `expectedThisMonth` and `ownerShareThisMonth` against hand-computed values first and their sum second, with the plan stating why the sum alone would be vacuous. |
| F5 | Accepted | One case per child resource: one account creates two subscriptions and names the first's member, price or break month through the second's id, expecting 404 for `GET`, `PATCH` and `DELETE`. The repository contract now says every statement filters `s.id = ?` and `s.user_id = ?` together, and Critical implementation details records that dropping the subscription half passes every cross-account case and fails only this one. |
| F6 | Accepted, as a refusal the caller can override | `DELETE` on a price entry answers 409 naming the months that would lose their price when the entry is the earliest and priced months would fall to zero, unless the call carries `?confirm=true`. Two integration cases pin it, including the summary after a confirmed delete, so the recompute is asserted rather than assumed. The client shows an inline confirmation naming the affected months, with no browser dialogue and nothing blocking the rest of the screen. `research.md` now names this as a departure in form only from the prototype's R4 warning. |
| F7 | Accepted | `src/client/screens/Home.tsx` joins phase 4's file list with an `onSelect` prop, and `App` holds the selected `Subscription`. `Summary` carries `currency` and `locale`, so the screen formats without a second request. The loading, error and no-owner states are specified, with the 409 rendering the message the route already returns, and a manual criterion covers all three. |
| F8 | Accepted | The shared header builder takes a per-file address prefix as an argument, with the constraint and the assignments recorded beside it: `10.0.0.x`, `10.1.0.x` and `10.2.0.1` for the landed files, `10.3.0.x`, `10.4.0.x` and `10.5.0.x` for the three this slice adds. |
| F9 | Accepted | A unit case builds a price of 10000 with three active members including the owner and a payment of 2000, asserting a balance of -1333 for that member and -3333 for the other. A new automated criterion, 1.7, states that all three of US-01's numbers are asserted through the shipped paths. The API-level version waits for S-03, since nothing can store a payment before it. |
| F10 | Accepted, all three | `hasDependents` takes `(db, subscriptionId, memberId, userId)` like its siblings, with the plan saying why the exception was not worth keeping. Price entries and break months are bounded by the subscription's first month, matching member ranges and the prototype's R10, which is stable because the first month can no longer move. Phase 5 fills test-plan section 6.3 with the canonical child-resource ownership test this slice writes three times, and corrects rollout phase 1's status, which is S-01's debt and would otherwise read as this slice's. |

**Stale S-01 assumptions**: all five are replaced with the fact. The Current state analysis says S-01
landed in full and names what `src/client/api.ts` exports and which screens exist. Phase 4's client
change extends the landed module instead of conditionally creating it. `research.md`'s third open
question is no longer about whether the client landed; it records the first-month decision instead, with
a parenthetical noting the client question was resolved by its landing. The brief's prerequisites say
S-01 has landed. Phase 2's helper step folds the three landed integration files onto the shared module
in the same step rather than becoming a third copy, with the one condition under which the fold moves
to its own change.

**Progress rows**: existing step titles are unchanged. One row was removed and seven added. Removed: 4.4,
whose work moved to phase 2, leaving a gap. Added: 1.7 in phase 1, 2.8 and 2.9 in phase 2, 3.8 in phase
3, 4.14 and 4.15 in phase 4, and 5.4 in phase 5. No index was reused and none was renumbered.

Nothing in the review was rejected or deferred. F2 and F4 were resolved by the alternative the review
ranked second in each case, for the reasons recorded above.
