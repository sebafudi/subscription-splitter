<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Implementation plan, members and price history

- **Plan**: `context/changes/members-and-price-history/plan.md`
- **Scope**: Phases 1 to 5 of 5 (all phases; Progress shows 42 of 42 boxes checked)
- **Commits reviewed**: `69b8fbc`, `a304b6d`, `b805445`, `682080d`, `41adf58`, closed by `a0683ba`
- **Repository state**: reviewed against `e5f0116`, the slice's last code commit, in a detached
  worktree, so the concurrent payments-and-recurring work in the shared checkout does not reach these
  results
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
| Pattern Consistency | WARNING |
| Success Criteria | WARNING |

## Verification performed

`npm ci && npm run typecheck && npm run test:unit && npm run test:integration && npm run build` run
from a clean install in a worktree checked out at `e5f0116`, exit 0 throughout.

| Gate | Observed | Recorded in `evidence/runs/members-and-price-history-tests.txt` |
|---|---|---|
| `npm run typecheck` | clean across all three projects | clean across all three projects |
| `npm run test:unit` | 11 files / 111 tests | 11 files / 111 tests |
| `npm run test:integration` | 7 files / 52 tests | 7 files / 52 tests |
| `npm run build` | succeeds, two bundles | not captured (phase 5 does not ask for it) |

The recorded counts are accurate. The capture's own header states which commit it belongs to and why
a clean worktree was used, which is the right disclosure for a shared checkout.

Four mutation probes were run against the worktree to test the claims the implementer flagged as
highest risk. Every mutation was reverted and the worktree confirmed clean (`git status --porcelain`
empty) before this report was written. Nothing was deployed, and no file outside this report was
modified in the repository.

| Probe | Result |
|---|---|
| Neutralise the `s.id` half of the predicate in `src/server/db/members.ts`, keeping bind arity | 11 of 12 members cases still pass; only the wrong-parent case fails (`members.test.ts:203`, 200 instead of 404). The plan's claim is exactly right. |
| Same, in `src/server/db/prices.ts` and `src/server/db/break-months.ts` | Only the wrong-parent case fails (`prices.test.ts:191` and `:194`). The claim holds for all three child resources. |
| Delete `app.use('/api/subscriptions/*', requireSession)` from all four new routers | All 52 integration tests still pass. See F3. |
| Replace `Math.round` with `Math.floor` in `shareForMonth` | All 111 unit and 52 integration tests still pass. See F2. |

`hasDependents` was read and confirmed to keep its four-argument signature, run no statement and
return `false`, matching the Progress note exactly; the delete route calls it at
`src/server/routes/members.ts:118`.

`monthsLosingTheirPrice` was checked against the plan's narrower wording. The departure is sound and
is pinned by its own unit cases, including the case that motivated it: the only-entry delete
(`src/domain/prices.test.ts:64-79`) and the break-month skip (`:81-90`). Deleting a later entry
returns an empty list, so the guard fires only where it should.

The five screenshots in `evidence/screenshots/` were opened and read. They are genuine captures of
the built screen, and their figures are internally consistent and arithmetically correct: a plan of
100,00 zł over three seats reads 33,33 zł per person against 33,34 zł for the organizer with a plan
total of 300,00 zł over three months; the price-delete capture shows the inline confirmation naming
`2026-07` alone, correctly skipping the `2026-08` break month, over a plan total of 220,00 zł that
is 100 + 0 + 120; the narrow capture stacks the card row to one column and shows an archived
participant with a live balance still visible beside a toggle for one settled archived participant.
The manual rows are honestly claimed.

## Findings

### F1 - The month-balancing table re-derives its expectations from the implementation's own formulas

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `src/domain/calc.test.ts:199-208`
- **Detail**: The plan's phase-1 test contract requires that each row of this table assert
  `currentMonthly`, `currentPerPersonShare`, `expectedThisMonth` and `ownerShareThisMonth` "against
  values computed by hand, and only then their sum", and states why: "Asserting the sum alone would
  pass whatever the implementation did, because `ownerShareThisMonth` is defined as that
  subtraction." The plan review's F4 was accepted on the same terms and its resolution row records
  that the balancing tests "assert ... against hand-computed values first and their sum second".
  The shipped test computes its expectations instead: `expectedShare` is
  `activeCount === 0 ? 0 : Math.round(price / activeCount)`, which is the body of `shareForMonth`
  plus the zero guard in `perPersonShare`, and `ownerShare` is `price - expectedThisMonth`, which is
  verbatim the definition at `src/domain/calc.ts:116`. The `ownerShareThisMonth` assertion therefore
  cannot fail once `expectedThisMonth` passes, which is the near-vacuity D-006's third review
  objection was resolved to remove. It has returned at the test layer. Compounding it, all three
  rows use evenly divisible prices (9000/3, 10000/2, 5000/0), so no row exercises a remainder at all.
- **Fix**: Replace the computed expectations with literals per row: 9000 across three active gives a
  share of 3000, `expectedThisMonth` 6000 and an owner share of 3000; 10000 with the owner sitting
  out gives 5000, 10000 and 0; 5000 with nobody active gives 0, 0 and 5000. Add a fourth row with a
  remainder, 10000 across three active, asserting 3333, 6666 and 3334 as literals.
  - Strength: Restores the property the plan and the accepted plan-review resolution both name, at
    the cost of nine numbers; the values are already known, since three of them appear as literals
    in the worked-example test twelve lines above.
  - Tradeoff: A future change to the rounding rule has to update literals rather than inheriting the
    formula, which is the point.
  - Confidence: HIGH - the test source and the implementation source were read side by side and the
    two expressions are textually the same.
  - Blind spot: None significant.
- **Decision**: PENDING

### F2 - No test distinguishes the mandated `round` from truncation in the per-person share

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `src/domain/money.ts:15`, `src/domain/money.test.ts:6`, `src/domain/calc.test.ts:171`
- **Detail**: `AGENTS.md:10` makes the rule explicit: "The share for a priced month is
  `round(price / activeCount)` per active participant". Nothing asserts it. Replacing `Math.round`
  with `Math.floor` in `shareForMonth` leaves all 111 unit tests and all 52 integration tests green,
  verified by mutation. The reason is that every case with a remainder happens to land below the
  half: `shareForMonth(10000, 3)` is 3333.33, so round and floor agree, and the worked example uses
  the same numbers. The rows of the balancing table divide exactly. Only the ceiling direction is
  caught. The behaviour that is unpinned is real money: a share of 100,00 zł across seven seats is
  1429 under the stated rule and 1428 under truncation, which moves six grosze a month off the six
  charged participants and onto the organizer with nothing failing. This is the primary rounding
  risk the slice exists to close, and it is the one
  the suite does not cover. The defect is in the test net, not in the shipped code, which is correct.
- **Fix**: Add one case asserting `shareForMonth(10000, 7)` is `1429`, and one summary case over the
  same state asserting `currentPerPersonShare` 1429, `expectedThisMonth` 8574 and
  `ownerShareThisMonth` 1426, so the rule is pinned both at the helper and through the path the
  screen reads.
  - Strength: Two assertions close the only rounding direction the suite cannot currently see, and
    the second one also gives the balancing table the remainder row F1 asks for.
  - Tradeoff: None; no production code changes.
  - Confidence: HIGH - proven by mutation rather than inferred from reading.
  - Blind spot: `ownerResidualForMonth` has no caller in this slice by design, so its own rounding
    behaviour stays unexercised beyond the existing S-01 case. That is deliberate and left to S-03.
- **Decision**: PENDING

### F3 - The per-route 401 assertions cannot detect a router shipped without its own session middleware

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM - a real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: `tests/integration/members.test.ts:216-244`, `tests/integration/prices.test.ts:202-216`,
  `tests/integration/summary.test.ts:194`; `src/server/routes/members.ts:14`,
  `src/server/routes/prices.ts:14`, `src/server/routes/break-months.ts:11`,
  `src/server/routes/summary.ts:11`
- **Detail**: The plan's Critical implementation details names this as one of the slice's two silent
  failures: "A module that omits it ships unauthenticated and every test that sends a cookie still
  passes, so the integration suite asserts a 401 without a cookie for every new route, not only for
  one of them." Success criterion 2.5 is worded the same way and is checked. The assertions exist
  and are per route, so the criterion is literally met, but they do not deliver what it was written
  to buy. Removing `app.use('/api/subscriptions/*', requireSession)` from all four new routers at
  once leaves the entire 52-test integration suite green, verified by mutation: both the
  subscriptions router and each new router are mounted at `'/'` and both own `/api/subscriptions/*`,
  so Hono's merged router answers 401 from whichever registration survives. The Progress note and
  the test comment are honest about this, which is to the implementation's credit, and the modules
  do register their own. The gap is that nothing holds them to it: the next router to be added by
  copying one of these can lose the line and ship unauthenticated the moment the subscriptions
  router's pattern stops overlapping. In the mutation the typecheck did fail, but only with
  `TS6133: 'requireSession' is declared but its value is never read`, which a copy that omits the
  import too would not produce.
- **Fix**: Add one integration case that fetches each new router in isolation, with no other router
  mounted, and asserts 401: `import membersRoutes from '../../src/server/routes/members'` and
  `await membersRoutes.fetch(new Request(url), env)`, once per router in an `it.each`.
  - Strength: Prototyped in the worktree against all four routers. It passes as shipped and fails
    with 500 when the registration is removed, so it distinguishes the module's own middleware from
    the neighbouring pattern, which is the property the plan asked for. About twenty lines, no
    production change, and the existing per-route cases stay as the caller-facing contract.
  - Tradeoff: The test reaches a router directly rather than through `SELF`, so it asserts a module
    property rather than a deployed-surface property. That is the point, and the existing cases
    still cover the surface.
  - Confidence: HIGH - both halves were executed, not reasoned about.
  - Blind spot: Whether `env` passed straight to `router.fetch` stays sufficient once a router needs
    an execution context was not explored; none of the four does today.
- **Decision**: PENDING

### F4 - The members repository states a module-wide rule that two of its statements do not follow

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `src/server/db/members.ts:17-23`, `:98-104`, `:42-48`
- **Detail**: The module header reads "Every statement in this module carries both halves: the
  subscription id and the session user", and the plan's repository contract says the same without
  exception, explicitly so that "an exception to a module-wide rule stops being safe quietly". Two
  statements do not carry it. `get`'s second read is
  `select ... from active_ranges r where r.member_id = ?` with no join, and `rangeInserts` binds a
  member id with no ownership predicate at all. Both are safe today by ordering: `get` has already
  proved the member row through the full predicate on the line above, and every `rangeInserts` call
  site sits behind either that `get` or the `owned` check at `:121-125`. The finding is the mismatch
  between a stated invariant and the code, which is what a later reader will trust. Separately and
  more narrowly, `create` puts the range inserts in the same batch as a member insert guarded by
  `where exists`, so if that guard ever returned zero rows the inserts would still run; the
  preceding `owned` check makes this reachable only by a race with a subscription delete.
- **Fix**: Narrow the header to what is true, naming the two statements and why ordering makes them
  safe, or give the ranges read the same join its sibling in `list` already carries.
- **Decision**: PENDING

### F5 - The owner member cannot be renamed anywhere in the interface

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `src/client/components/MemberList.tsx:28`, `src/client/screens/SubscriptionDetail.tsx:168`
- **Detail**: The plan removes `owner_name` from the subscription patch path with the reason
  "Renaming the owner is a member edit, not a subscription edit, so there is one path for it rather
  than two." The API honours that: `PATCH /api/subscriptions/:id/members/:ownerId` with a name works.
  The screen never offers it. `MemberList` renders `summary.members`, which excludes the owner by
  construction, and `MemberForm` only ever opens from a member row, so the owner's name is set once
  at creation and is unreachable afterwards; the detail screen shows it as prose, "You are on this
  plan as Organizer". No plan criterion asks for the control, so this is a gap between the stated
  rationale and the shipped screen rather than an unmet criterion.
- **Fix**: Render the owner above the participant list with a rename control that calls the existing
  `updateMember`, or record in the plan that the rename is API-only until a later slice.
- **Decision**: PENDING

### F6 - Two summary fields are computed and returned but read by nothing

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: `src/domain/calc.ts:117`, `:120`
- **Detail**: `creditOutstanding` and `totalCollected` appear in no test and on no screen, checked by
  grep across `src/domain/*.test.ts`, `tests/` and `src/client/`. `totalCollected` at least feeds
  `ownerNetCost`, which is both rendered and asserted, so only its own value is unpinned;
  `creditOutstanding` is inert in this slice. `collectedThisMonth` is rendered on the detail screen
  but asserted nowhere. All three are in the plan's contract for `computeSummary` and all three
  become meaningful the moment S-03 stores a payment, so this is a note about the test net rather
  than about scope creep.
- **Fix**: Add one unit case over a state with two members, one ahead and one owing, asserting
  `owedToYouNow`, `creditOutstanding`, `totalCollected` and `collectedThisMonth` together.
- **Decision**: PENDING

### F7 - `collectedThisMonth` and `totalCollected` count over different member sets

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `src/domain/calc.ts:120`, `:122-124`
- **Detail**: `totalCollected` sums `paid` over `memberResults`, which is non-owner members only.
  `collectedThisMonth` sums every payment dated in the current month with no member filter, so a
  payment naming the owner, or naming a member id that is not in this subscription, would raise the
  collected figure without raising the total. The two cannot disagree in this slice, because
  `loadState` always passes `payments: []` and no route can store one, so this is latent rather than
  live. D-007 already forbids a payment against the owner, which is where the rule belongs; the note
  is that the calculation does not currently assume it.
- **Fix**: Filter `manualCollectedThisMonth` to the same non-owner member set `totalCollected` uses,
  so the two fields cannot diverge whatever S-03 stores.
- **Decision**: PENDING

### F8 - Em dash in user-facing text

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `src/client/screens/SubscriptionDetail.tsx:97`
- **Detail**: The loading state renders each card's placeholder value as an em dash. It is the only
  one in `src/`, `tests/` and `migrations/`, checked by grep, and this repository's authoring rules
  exclude the character. Same class as finding F7 of the runtime-auth-slice implementation review,
  which remains open.
- **Fix**: Use a plain hyphen or an en dash as the placeholder glyph.
- **Decision**: PENDING

## Reported deviations

The three departures the implementation recorded in the plan's Progress notes, each judged on its own.

| # | Reported deviation | Judgement | Basis |
|---|---|---|---|
| 1 | `hasDependents` keeps a four-argument signature but runs no statement until S-03 | Acceptable, and correctly reasoned | Read at `src/server/db/members.ts:226-233`: parameters underscore-prefixed, returns `false`, called at `routes/members.ts:118`. Keeping the signature inside the module-wide predicate rather than growing a narrower one beside it is the smaller choice, and the delete route's 409 branch is already wired so S-03 adds a clause rather than a code path. |
| 2 | The per-route 401 assertions cannot prove the module's own middleware registration | Accurate, and the residual gap is worth closing | The note is exactly right and is proven by mutation above. It is recorded honestly in the Progress notes, the test comment and the work log. See F3 for the cheap way to make the assertion mean what the plan wanted. |
| 3 | `monthsLosingTheirPrice` bounds the affected months by the later of the last entry and the current month, not by the next entry alone | Acceptable, and better than the plan's wording | The plan's phrasing covers only the case where a later entry exists. The implementation's bound is the one that does not understate what the caller loses when the deleted entry is also the last, and it is pinned by its own unit case (`prices.test.ts:64-79`), by the only-entry-from-a-later-month case (`:76-79`) and by the break-month skip (`:81-90`). The 409 message it produces was seen working in `evidence/screenshots/detail-price-delete-confirm.png`, naming one month and correctly omitting the break month beside it. |

## What the implementation gets right

Worth recording so eight findings, none critical, are not read as a poor result.

The ownership rule is built exactly as argued, and the argument is now proven rather than asserted.
Dropping the subscription half of the predicate in any of the three child repositories fails exactly
one test, the wrong-parent case inside one account, and passes every cross-account case, which is
what the plan's Key findings predicted before the code existed. `get`, `update` and `remove` in all
three repositories return `null` or `false` without distinguishing absent from foreign, so 404 is
structural rather than a route decision.

D-009's refactor holds. `shareForMember` now resolves through `chargedMonthStatus`, which adds two
conditions the phase-1 expression did not have, before-start-month and not-yet-elapsed. Both are
unreachable from `computeSummary`, which enumerates start to current inclusive, so the phase-1 suite
genuinely doubles as the regression net the decision claims. `month-status.test.ts` covers one case
per condition including both inclusive range ends, the current month as the boundary that counts,
and the outermost-condition-wins rule, matching D-009's Affected tests line for line. No rounding or
boundary regression was found: the worked example, the price-change case, the break-month case, the
departure case and the zero-active case all produce the figures the requirements name, both in the
unit suite and read through the API.

The zero-active-member behaviour of D-006 is implemented, defined and tested at both layers: the
share is zero, nobody owes, the month's full price stays in `totalPlanCost` and `ownerNetCost`, the
owner's share is the whole price, and nothing throws.

The migrations match the plan field for field, including the partial unique index that makes the
one-owner rule a schema rule, the `left_month >= joined_month` CHECK, and the deliberate absence of
a redundant foreign-key index on the two tables whose leading key column already serves every lookup.
The style follows `0002_subscriptions.sql` exactly.

The evidence is honest in the places where it would have been easy not to be. The captured run
states the commit it belongs to and why a clean worktree was used. The work log records which cases
were red before implementation and, unusually, names the two that were already green and why. The
loading-state check is recorded as a programmatic DOM read rather than dressed up as a screenshot,
and the narrow-width check names the emulation it used. Every count I measured matches every count
recorded.

## Required fixes

1. Replace the computed expectations in the month-balancing table with hand-computed literals, and add a row with a remainder, so `ownerShareThisMonth` stops being asserted against its own definition (F1).
2. Add a case that distinguishes `round` from truncation in the per-person share, at the helper and through `computeSummary` (F2).
3. Add an isolated-router 401 case per new router, so the assertion detects a module that ships without its own session middleware (F3).

All three are test-only changes. No production code needs to move for this slice to be approved.
