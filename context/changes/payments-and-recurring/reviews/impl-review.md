<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Implementation plan, payments and recurring

- **Plan**: `context/changes/payments-and-recurring/plan.md`
- **Scope**: Phases 1 to 5 of 5 (all phases; Progress shows 43 of 43 boxes checked)
- **Commits reviewed**: `260b6d8`, `24f315b`, `8e9a5ee`, `979d0cf`, evidence at `82eafdd`, closed by
  `b91762c`
- **Repository state**: reviewed against `979d0cf`, the slice's last code commit, in a detached
  worktree with a fresh `npm ci`, so nothing in the shared checkout reaches these results
- **Verdict**: NEEDS ATTENTION (approve with required changes)
- **Findings**: 0 critical, 3 warnings, 5 observations

Date and effort fields the report schema lists are omitted, matching this repository's convention of
recording progress by change ID, migration ID and commit.

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Verification performed

`npm ci && npm run typecheck && npm run test:unit && npm run test:integration && npm run build` run
from a clean install in a worktree checked out at `979d0cf`, exit 0 throughout. The integration suite
was then run three more times consecutively; all three were clean, so the shared-database timing
hazard the implementer recorded for phase 4 did not reproduce in an isolated worktree, which is
consistent with their attribution of it to a concurrent agent writing files mid-run rather than to a
defect in these tests. All six migrations were applied in order to a fresh local D1 under a throwaway
`--persist-to` directory.

| Gate | Observed | Recorded in `evidence/runs/payments-and-recurring-tests.txt` |
|---|---|---|
| `npm run typecheck` | clean across all three projects | clean across all three projects |
| `npm run test:unit` | 15 files / 185 tests | 15 files / 185 tests |
| `npm run test:integration` | 10 files / 103 tests | 10 files / 103 tests |
| `npm run build` | succeeds, two bundles | stated as succeeding, output deliberately not captured |
| `db:migrate:local`, six migrations in order | all six apply to a clean database | stated as applying |

**The slice-only counts were re-derived rather than accepted.** The capture claims this slice's own
contribution is unit 111 to 179 and integration 52 to 95, measured across its first three phases, and
warns that the headline figures are repository-wide because the members review landed test-only fixes
at `09b763b` just before `979d0cf`. Both suites were run at `e5f0116`, the commit before this slice's
first, and at each phase commit:

| Commit | Unit files / tests | Integration files / tests |
|---|---|---|
| `e5f0116` (baseline) | 11 / 111 | 7 / 52 |
| `260b6d8` (p1) | 13 / 153 | 7 / 52 |
| `24f315b` (p2) | 14 / 167 | 8 / 67 |
| `8e9a5ee` (p3) | 15 / 179 | 9 / 95 |

The claim is exact in both numbers and in its framing. The disclosure in the capture header is the
right one for a shared checkout, and the distinction it draws between repository-wide and slice-only
figures is the reason the claim could be checked at all.

**Fourteen mutation probes** were run against the worktree, each applied, measured and reverted, with
`git status --porcelain` confirmed empty before this report was written. Nothing was deployed and no
file outside this report was modified in the repository.

| Probe | Result |
|---|---|
| Neutralise the `s.id` half of the ownership chain in both new repositories, keeping bind arity | Exactly the two wrong-parent cases fail (`payments.test.ts:295`, `recurring.test.ts:448`). Nothing else moves. |
| Neutralise the `s.user_id` half instead | Exactly the two cross-account cases fail (`payments.test.ts:257`, `recurring.test.ts:419`). |
| Remove `app.use('/api/subscriptions/*', requireSession)` from both new routers | All 103 integration tests still pass. See F1. |
| `scheduleMonthStatuses` stops applying the exception | 4 unit and 2 integration cases fail. |
| `update` writes the merged row but drops no exceptions at all | `recurring.test.ts:395` fails. |
| `update` drops only on the end-month side, leaving the start-month side inert | All 185 unit and 103 integration tests still pass. See F2. |
| `hasDependents` returns only its payment clause | `recurring.test.ts:480` fails. |
| `hasDependents` returns only its schedule clause | `payments.test.ts:328` fails. |
| `manualCollectedThisMonth` loses its non-owner filter | `calc.test.ts:250` fails. |
| The schedule PATCH drops the owner refusal on the merged row | `recurring.test.ts:257` fails, which is the create-then-patch bypass. |
| The schedule PATCH drops the overlap check on the merged row | `recurring.test.ts:218` and `:233` fail, including the move onto an occupied participant. |
| The unpaid toggle stops checking the month falls inside the arrangement | `recurring.test.ts:379` fails. |
| `isCalendarDate` degrades to the shape-only regular expression the column CHECK already admits | 8 unit cases fail across three files. |
| `isMonthInSchedule` makes the arrangement's end month exclusive | 2 unit cases fail. |
| `scheduleMonthStatuses` ignores the end month and enumerates to the current month | 3 unit cases fail. |
| `recurringReceived` stops filtering to the caller's month window | 9 unit and 1 integration case fail. |

Two further checks were run directly against a live database rather than by mutation, because the
brief asks whether a delete can orphan or misattribute. A probe test read `PRAGMA foreign_keys`, which
is `1`, created an arrangement with an exception and a payment, then deleted the arrangement: the
exception row count went from 1 to 0, so the cascade fires and no orphan survives. A member delete
against the same member answered 409 with both records intact. The probe file was removed and the
worktree confirmed clean.

**`scheduleMonthStatuses` is genuinely the single source, verified by reading and by search.**
Nothing in `src/server/routes/`, `src/server/db/` or `src/client/` re-derives a counted-month
condition. The two predicates the routes do use, `findScheduleOverlap` and `isMonthInSchedule`, are
range arithmetic over one arrangement rather than a second copy of the rule. The screen reaches the
domain function directly (`src/client/components/RecurringSection.tsx:99-105`) and takes the current
month from the summary response rather than from the browser. The one range expression written in SQL
is the exception drop inside `update`, and it cannot disagree with the domain predicate: the drop is
`month < startMonth` or `month > endMonth` (`src/server/db/recurring.ts:243`, `:250`), which is the
exact complement of `isMonthInSchedule`, and both compare zero-padded `YYYY-MM` strings, where SQLite
TEXT ordering and JavaScript string ordering agree. The invariant that no exception can exist outside
its arrangement's range is closed at the other end too, because the toggle refuses such a month with
400 before writing (`src/server/routes/recurring.ts:192-198`).

**Payment edit and delete at month boundaries behave correctly.** Nothing derived is stored, so both
recompute from the inputs. `balanceForMember` sums a member's payments with no month filter, which is
what makes a future-dated payment count as credit now (FR-018), while `collectedThisMonth` filters to
the current month. Both halves are pinned separately (`src/domain/calc.test.ts:235`, `:268`), and the
combination is visible in the captured screen, where a payment dated 2028-05-10 counts toward `paid`
while collected-this-month reads 0,00.

**The screenshots were opened and read.** They are genuine captures of the built screen against the
two seeded synthetic accounts, and the decisive one is arithmetically correct throughout. A plan in
PLN starting 2026-07 with 100,00 zł a month and 2026-07 skipped gives Bob a share of 33,33 zł in
2026-08 across three seats and 50,00 zł in 2026-09 across two, so 83,33 zł owed against a 50,00 zł
future-dated payment leaves 33,33 zł; Alice, active only through 2026-08, owes 33,33 zł against
10,00 zł assumed received, leaving 23,33 zł, and the two sum to the 56,66 zł headline. The plan total
of 200,00 zł less 60,00 zł collected gives the 140,00 zł net cost shown. The same capture carries the
FR-026 property in full: inside one arrangement, 2026-07 reads "not counted, the plan was paused that
month", 2026-09 reads "not counted, the participant was not on the plan that month", neither is
labelled assumed received, neither carries a toggle, and the section's assumed total of 10,00 zł over
1 of 3 elapsed months equals the `paid` the summary returns. The narrow capture stacks the month chips
one per row with no horizontal overflow, and the reviewer capture shows an empty subscription list.
The manual rows are honestly claimed.

**Progress and the manual rows are honest.** Every box is checked with a commit SHA, and the gap at
1.5 is not an omission: the plan review retired that criterion and replaced it with 1.10 rather than
renumbering, which the Resolution records. Criteria 2.5 and 3.5 are literally satisfied, since a 401
is asserted for each new route, but they buy less than they appear to, which is F1. The work-log is
candid about three things a less careful record would have left out: that the phase-2 per-route 401
case passed before the module existed, that the browser pass caught a bug the suite could not, and
that a transient failure was seen in one full run and attributed rather than hidden.

## Findings

### F1 - The two new routers are not in the isolated-router test the previous slice added for exactly this

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `tests/integration/router-isolation.test.ts:20-25`; `src/server/routes/payments.ts:14`,
  `src/server/routes/recurring.ts:25`
- **Detail**: Removing `app.use('/api/subscriptions/*', requireSession)` from both new routers leaves
  all 103 integration tests green, verified by mutation. This is the same blindness the members review
  raised as its F3 and the repository accepted as a required fix, landing
  `tests/integration/router-isolation.test.ts` at `09b763b` to close it. That file lists the four
  routers that existed then and was not extended when this slice added two more, so the property holds
  for members, prices, break-months and summary and not for payments or recurring. The slice knows the
  rule: its own phase-5 note in `context/foundation/test-plan.md` section 6.5 says a per-route 401
  asserted through the composed application does not prove a module's own session middleware and names
  that file as what does. The modules do register their own middleware, so nothing ships
  unauthenticated; what is missing is anything holding them to it, which is precisely the copy-paste
  case the earlier report described.
- **Fix**: Add `payments` and `recurring` to the `routers` array in
  `tests/integration/router-isolation.test.ts`, with the same two `it.each` cases.
  - Strength: Two lines plus two imports, no production change, and the mechanism is already proven in
    this repository. Prototyped here by the inverse: the mutation that should fail today does not.
  - Tradeoff: None material.
  - Confidence: HIGH - the mutation was executed, not reasoned about.
  - Blind spot: None significant; both routers take `env` alone, as the other four do.
- **Decision**: PENDING

### F2 - The start-month side of the exception drop is untested

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `src/server/db/recurring.ts:242-244`; `tests/integration/recurring.test.ts:395-415`
- **Detail**: `update` drops exceptions on both sides of the new range, `month < start_month` and
  `month > end_month`. Only the second is covered. The single case narrows `end_month` from 2026-08 to
  2026-04 and widens it back, so making the start-month delete a no-op leaves all 185 unit and 103
  integration tests green, verified by mutation. The hazard is the one the plan names in Critical
  implementation details and the one the existing case was written to prevent, just approached from the
  other end: raise `start_month` past a marked month, lower it again, and a correction made against a
  different set of months comes back. The shipped code is correct; nothing pins it.
- **Fix**: Extend `tests/integration/recurring.test.ts:395` to raise `start_month` as well as lowering
  `end_month`, marking a month below the new start and asserting it is gone and does not return when
  the start month is lowered again.
  - Strength: One existing case grows by a few lines and covers both sides of the same batch. Verified
    here by mutation that the added assertion is the one that would fail.
  - Tradeoff: None material.
  - Confidence: HIGH - the mutation was executed.
  - Blind spot: None significant.
- **Decision**: PENDING

### F3 - The member delete refusal is checked in the route, which the plan and the comment both say it is not

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM - a real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: `src/server/db/members.ts:216-225` (`remove`), `:229-247` (`hasDependents` and its
  comment), `src/server/routes/members.ts:118`
- **Detail**: The plan's Critical implementation details says the refusal "is checked in the repository
  rather than in the route so no future path can skip it", and the comment on `hasDependents` says "The
  check lives here rather than in the route because both `payments.member_id` and
  `recurring_schedules.member_id` cascade on delete". Neither is what the code does. `hasDependents` is
  a predicate in the repository module, but it is called from `src/server/routes/members.ts:118`, and
  `remove` runs its `DELETE` with no reference to it. Both cascades are confirmed live here (`PRAGMA
  foreign_keys` is 1, and a probe watched an exception row disappear with its schedule), so a second
  call site for `remove` that forgets the guard destroys the history the rule exists to protect, with
  no test and no type to stop it. Today there is exactly one call site and two integration cases pin the
  409 with the record surviving, so nothing is broken; the gap is between the stated property and the
  shipped one.
- **Fix A ⭐ Recommended**: Move the guard inside `remove`, returning a discriminated result such as
  `'deleted' | 'has-dependents' | 'not-found'`, and have the route map it to 204, 409 and 404.
  - Strength: Delivers the property the plan specified and the comment claims, and makes the refusal
    unskippable by construction rather than by discipline. About ten lines across two files, with one
    caller to update and the existing 409 cases unchanged.
  - Tradeoff: `remove`'s boolean return becomes a union, so the repository's shape stops matching its
    three siblings, which all return `boolean`.
  - Confidence: HIGH - one caller, and the two integration cases already assert the behaviour the
    change must preserve.
  - Blind spot: Whether a later slice wants a force-delete path that deliberately bypasses the guard
    was not explored; none exists today.
- **Fix B**: Leave the call site alone and correct the comment and the plan's wording to say the
  predicate lives in the repository while the guard runs in the route, naming `remove` as the path that
  must not be called without it.
  - Strength: One comment and one sentence; no production behaviour moves and no signature changes.
  - Tradeoff: Keeps the safety property as a convention a future edit can break silently, which is the
    thing the plan set out to avoid.
  - Confidence: HIGH - purely documentary.
  - Blind spot: None significant.
- **Decision**: PENDING

### F4 - The schedule PATCH merges the row twice, in two modules, with nothing holding the two merges equal

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Architecture
- **Location**: `src/server/routes/recurring.ts:121-127`, `src/server/db/recurring.ts:221-227`
- **Detail**: The route merges the patch onto the stored arrangement to run the month ordering, the
  start-month rule, the owner refusal and the overlap; the repository then merges it again, from its own
  re-read, to write the row and to compute the exception-drop bounds. The two merges are the same four
  lines written twice and agree today, which the mutation probes confirm from both ends. If they ever
  drift, every rule is validated against one row and a different row is written, and the exception drop
  uses the bounds of the row that was not checked.
- **Fix**: Have the route pass its `merged` row to `update`, and let the repository write what it is
  given rather than re-deriving it.
- **Decision**: PENDING

### F5 - A delete case claims more than it asserts

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `tests/integration/recurring.test.ts:154-169`
- **Detail**: The case is titled "deletes an arrangement, and a following read answers 404 with its
  exceptions gone", but its three assertions are a 204, a 404 and an empty list. An orphaned
  `recurring_exceptions` row is invisible to all three, since both reads go through the schedule that no
  longer exists. The cascade does fire, verified here directly against the database, so the title is true
  and only unproven by its own body.
- **Fix**: Assert the exception row count for that schedule is zero through `env.DB`, or re-title the
  case to what it checks.
- **Decision**: PENDING

### F6 - The reason-phrase fallback names the wrong condition

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `src/client/components/RecurringSection.tsx:137`
- **Detail**: A month that does not count renders `REASON_PHRASE[status.reason ?? 'excepted']`, so a
  not-counted row carrying a null reason would read "marked as not received", which is a specific claim
  about the organizer's own action rather than a neutral one. `ScheduleMonthStatus` makes that state
  unreachable, since every `counts: false` row is built with a reason, but the fallback picks the one
  phrase that would mislead if the invariant ever weakened.
- **Fix**: Narrow the type at the call site so no fallback is needed, or fall back to a neutral phrase
  rather than to `excepted`.
- **Decision**: PENDING

### F7 - No regression test exists for the class of bug the browser pass caught, and no reason is recorded

- **Severity**: 💡 OBSERVATION
- **Impact**: 🔎 MEDIUM - a real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: `src/client/components/PaymentForm.tsx:33-42`, `src/client/components/ScheduleForm.tsx:30-39`;
  `vitest.unit.config.ts:7`
- **Detail**: Both forms seeded the participant select from `useState` before the participants had
  loaded, so the select displayed a name while submitting an empty id, and the first recorded payment
  came back rejected. The fix derives the effective choice each render and is correct in both files,
  with a comment in each saying why. Nothing tests it, and nothing could: the unit config includes only
  `src/**/*.test.ts`, so a `.tsx` test would not be collected, and there is no jsdom, happy-dom or
  testing-library dependency in `package.json`. The plan's "What we are NOT doing" excludes browser
  end-to-end tests and assigns them to S-04, which is a different thing from a component test, so the
  absence is neither covered by a stated exclusion nor recorded as a limitation. The work-log describes
  the bug candidly, which is why it can be reviewed at all.
- **Fix**: Record the absence as an explicit limitation naming the missing harness, so the next slice
  that adds client behaviour decides deliberately whether to bring one rather than rediscovering the gap.
- **Decision**: PENDING

### F8 - The client-address comment is stale by one phase

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `tests/integration/accounts.ts:16-17`
- **Detail**: The comment still reads "`10.7.0.x` held for the standing-orders file S-03 phase 3 adds".
  Phase 3 landed at `8e9a5ee` and `tests/integration/recurring.test.ts:6-8` uses that prefix. The
  register is the mechanism that keeps the rate limiter from reading as a flaky sign-in, so it is worth
  keeping current.
- **Fix**: Change the last clause to record `10.7.0.x` as taken by `recurring.test.ts`.
- **Decision**: PENDING

## Reported deviations

The implementer flagged five items; each was checked and each holds.

1. **The captured counts are repository-wide.** True, disclosed in the capture header, and the
   slice-only figures of unit 111 to 179 and integration 52 to 95 re-derive exactly at `e5f0116` and
   `8e9a5ee`.
2. **`scheduleMonthStatuses` is the single source.** Holds. No route, repository or component
   re-derives a counted-month condition, and the SQL drop expression is the exact complement of
   `isMonthInSchedule` over a string ordering both sides share.
3. **The schedule PATCH judges the merged row.** Holds. Both bypasses were attempted by mutation and
   both are caught: removing the owner refusal fails the create-then-patch case, removing the overlap
   fails the move onto an occupied participant. The exception drop when a range narrows and widens again
   is covered on the end-month side and not on the start-month side, which is F2.
4. **`hasDependents` refuses before SQL runs.** Holds behaviourally: both clauses are load-bearing,
   each proven by its own mutation, and a member delete returns 409 with the payment and the arrangement
   intact. Where the check sits is F3.
5. **The self-verified manual rows.** The screenshots are genuine and internally consistent, and the
   decisive FR-026 capture proves the property it claims. The bug class the browser pass caught has no
   regression test and no recorded reason, which is F7.

Two further items the brief raised: no em dash appears anywhere under `src/`, including the
placeholder the previous review flagged, which this slice's phase-4 commit carried as agreed; and the
shared-database timing hazard did not reproduce across three consecutive integration runs in an
isolated worktree.

## What this implementation gets right

The ownership chain is the strongest part. Every statement in both new repositories carries the whole
path from child to member to subscription to user, and the mutation probes show both halves are
load-bearing and independently tested. `create` writes through `insert ... select ... where exists` on
that chain, so a member id from another subscription cannot be told from one that does not exist, and
the payment `update` carries the predicate twice so a patch cannot relocate a row out of its own
account. All twelve routes answer 404 across accounts and 401 without a cookie, including the
wrong-parent case in both directions and a `memberId` filter naming a foreign participant.

The domain is tested where it matters. Every one of the six conditions deciding whether a month of a
standing order counted has a mutation that fails a case, and the agreement between `recurringReceived`
and `scheduleMonthStatuses` is asserted as a set of months rather than a total, so a dropped condition
cannot net out against an added one. `isCalendarDate` earns its place: degrading it to the regular
expression the column CHECK already admits fails eight cases.

Nothing derived is stored, which is what makes the edit-and-delete requirement true by construction
rather than by a recomputation step someone can forget. The `schedule_id` to `recurringId` mapping,
which the plan review named as the dangerous one, is confined to the repository boundary and proven by
the summary cases, because a list that kept the column name would match nothing and look exactly like a
participant who never missed a month.

## Required fixes

1. Add the payments and recurring routers to `tests/integration/router-isolation.test.ts`, so the
   assertion detects a module that ships without its own session middleware (F1).
2. Extend the exception-drop case to raise `start_month`, covering the side of the batch that is
   currently inert under mutation (F2).
3. Resolve F3 by one of its two options: move the dependents guard into `remove`, or correct the plan
   sentence and the comment that both say it is already there.

One and two are test-only. Three is either a small code change or a documentation correction, at the
implementer's choice.
