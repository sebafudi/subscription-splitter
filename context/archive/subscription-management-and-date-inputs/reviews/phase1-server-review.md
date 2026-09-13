<!-- PHASE-REVIEW-REPORT -->
# Phase 1 server review: subscription settings, the first month and the delete verb

- **Change**: `subscription-management-and-date-inputs` (roadmap S-08; parent goals M02, M03)
- **Scope**: commits `4978603`, `62783e8`, `7b2e56f`
- **Contract**: `design-delta.md` Rulings on product questions and the phase 1 implementation ruling;
  `plan.md` phase 1 and Critical implementation details; `reviews/plan-review.md` F2 to F5, F10, R1, R2
- **Verdict**: APPROVED
- **Findings**: 0 critical, 1 warning, 5 observations
- **Reviewer**: independent; wrote none of the phase 1 code, the plan, the delta or the plan review

Date and effort fields are omitted, matching this repository's convention of recording progress by
change ID, migration ID and commit. This review writes only this file and its checkpoint.

## Method

The migrations and the source were read before the documents, so the contract was checked against the
code rather than against the implementer's checkpoint, which was not read as evidence. Three claims
that reading alone cannot settle were probed empirically in a detached worktree at `7b2e56f`, with
throwaway test files deleted afterwards: whether a patch carrying only unchanged values still answers
200, whether the eight deletion statements on their own really do empty every table (the control the
atomicity test needs in order to be capable of failing), and why the atomicity batch actually fails.

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Contract fidelity | PASS |
| Ownership and non-disclosure | PASS |
| Atomicity | PASS |
| Race handling | WARNING |
| Test strength | PASS |
| Regressions | PASS |

## 1. DELETE, verified

Eight statements, one `db.batch`, deepest first. `remove` at `src/server/db/subscriptions.ts:468-472`
issues exactly one batch and reads `meta.changes` off the last statement;
`deletionStatements:479-498` holds the list in the plan's order: `recurring_exceptions`,
`recurring_schedules`, `payments`, `active_ranges`, `members`, `price_history`, `break_months`,
`subscriptions`. The unit case at `src/server/db/subscriptions.test.ts:115-128` pins both the count
and the order against a stub, and asserts no statement ran outside the batch.

**Every statement is scoped through the parent chain.** There are no unscoped id lists anywhere.
`OWNED_MEMBER_IDS:454-456` and `OWNED_SUBSCRIPTION_IDS:458` both carry `s.id = ? and s.user_id = ?`,
and the deepest statement joins `recurring_schedules` to `members` to `subscriptions` inline
(`:483-487`). Every one of the eight binds exactly `(id, userId)`, which
`src/server/db/subscriptions.test.ts:130-139` asserts statement by statement.

**Ownership semantics.** There is no read before the batch, so the window the question asks about does
not exist: the predicate lives inside each statement, a foreign or unknown id makes every subquery
empty, and the last statement reporting no change is the 404. This is stronger than the delta's
"ownership checked first" and satisfies it.

**Wire contract.** 204 with no body at `src/server/routes/subscriptions.ts:49-54` via
`c.body(null, 204)`, asserted empty at `tests/integration/subscription-deletion.test.ts:124-125`. The
404 body is `{ error: 'not found' }`, byte-identical for a foreign id and an unknown id, so nothing
leaks (`tests/integration/subscription-deletion.test.ts:149-168`, which also asserts the foreign
ledger's row counts are unchanged and that a second delete answers 404). The unauthenticated 401 is
covered at `tests/integration/subscriptions.test.ts:102-103`, and the cross-account DELETE leg at
`:52-62` also re-reads to prove the subscription still stands.

**The fixture creates every child kind.** `createLedger:34-68` builds an owner plus a participant,
both their active ranges, a price, a break month, a payment, a standing order and one exception on it.
`countsFor:73-94` counts all eight tables through the ownership chain, the test asserts every count is
above zero before the delete (`:118-121`) and equal to `EMPTY` after (`:127`), and the preservation
case asserts the same account's second subscription and another account's subscription are both
byte-identical afterwards (`:144-146`).

**The atomicity test really can fail.** Two probes confirm it. First, the eight statements alone,
batched with nothing appended, do empty every table, so the assertion is not passing vacuously.
Second, the committed batch fails for exactly the stated reason:

```
D1_ERROR: UNIQUE constraint failed: break_months.subscription_id, break_months.month:
SQLITE_CONSTRAINT (extended: SQLITE_CONSTRAINT_PRIMARYKEY)
```

The duplicated row belongs to the account's *second* subscription, which every statement in the batch
excludes by id, so statement seven never removes it. F2 is correctly resolved, and the comment at
`tests/integration/subscription-deletion.test.ts:170-184` names the row, says why it survives and says
the appended statement is a platform probe. After the rollback the target's counts are unchanged
across all eight tables (`:202`), and a probe confirmed the sibling's duplicated row also still stands.

A third probe found a detail worth recording, not a defect: appending the conflicting insert on the
*first* subscription's own row also throws, but on a foreign-key violation against the already-deleted
subscription rather than the primary key. The committed test does not rely on that and is the right
shape.

## 2. PATCH, verified

**The five minimums, exactly.** `src/server/db/subscriptions.ts:319-328` carries one `not exists`
clause each for `active_ranges`, `price_history`, `break_months`, `payments` (on
`substr(p.date, 1, 7)`) and `recurring_schedules`, added only when the month moves later. The eleven
bindings at `:329-341` line up with the clause order. The currency lock adds its own three clauses at
`:306-313`, matching the delta's "no price, no payment, no standing order".

**The owner exclusion and the shift gate.** The `ar.id <> ?` exclusion is present at `:321` and binds
`shifted?.id ?? ''`, so an id no row carries excludes nothing when no shift applies. The shift is the
second statement of the same batch and is gated on the subscription already carrying the new first
month (`:357-364`), so it cannot apply when the settings update did not.

**The ten-year floor.** `floorMonth:70-73` derives the year from `currentMonth(timeZone)`, never from
`Date`. It is applied on create against the submitted zone (`:185-188`) and on patch against the zone
the row will hold (`:278-288`), which is the right reading of the delta. Both paths answer the delta's
sentence with field `start_month`, and the integration case derives the expected floor the same way
rather than hard-coding a month that would age out (`tests/integration/subscriptions.test.ts:298-322`).

**Tie-break order and wire sentences.** `FIRST_MONTH_KINDS:115-121` lists the five kinds in the delta's
order and `firstMonthRefusal:131-161` appends the owner's opening range last, then selects the earliest
month with a strict `<`, so a tie keeps the earlier-listed kind, which is what the delta specifies.
Every sentence matches the delta's Copy section verbatim, including the owner's "because your own
first active range ends then" (`:151`) and the currency sentence at `:75`. The integration cases assert
the full body, not a substring, once per kind (`tests/integration/subscriptions.test.ts:361-416`) and
re-read the stored month after each refusal.

**R1, the field a lost race names.** `deriveRefusal:430-451` checks the currency lock before the
first-month minimums, so when both bind the answer names `currency`. The re-read at `:369-385` calls
the same function, so the precedence holds on both paths, and
`src/server/db/subscriptions.test.ts:185-208` pins it with both families binding at once.

**R2, the lost race.** Covered by three unit cases against the `D1Database` stub: `meta.changes` of
zero with the re-read empty answers `not-found` (`:165-171`), with the row standing answers a refusal
(`:173-183`), and the precedence case above. This is the branch D1's sequential execution puts out of
reach of an integration test, so the unit level is the right place.

**Earlier moves accepted, later moves refused per kind.** An earlier move over a later price is
accepted (`tests/integration/subscriptions.test.ts:324-332`), a later move up to exactly the earliest
dependent month is accepted (`:334-342`), and each of the five kinds refuses a move past it (`:344-416`).
The owner's leave-month refusal has its own case (`:418-436`).

**Persistence by re-read.** The all-five-settings case re-reads through `GET` and asserts every field
including an earlier `start_month` (`:229-250`); every refusal case re-reads and asserts the stored
value did not move. The owner shift is re-read in `tests/integration/members.test.ts:96-114`, which
asserts both the stored month and that the owner's range moved with it.

**A body of only unchanged values.** Probed directly: a patch resending the stored name, currency and
first month answers 200. `currencyChanges` and `monthMoves` are both false, so no clause is added and
the update matches on ownership alone. The route behaves as it always did, and a no-op currency resend
on a locked subscription is not refused.

## Findings

### W1 - The owner leave-month rule is pre-checked but does not travel in the write

- **Severity**: ⚠️ WARNING
- **Location**: `src/server/db/subscriptions.ts:290-301`, `:353-365`
- **Detail**: F5's decision put every bound inside the update's own `where`, and plan.md's Critical
  implementation details states that nothing is left to the database because "a `CHECK` violation
  inside `db.batch()` throws rather than producing a refusal sentence, which is why every rule is
  pre-checked". One rule is pre-checked without closing its window. The owner's opening range is read
  at `:290`, its leave month decides the refusal at `:147-153`, and neither the settings update nor
  the shift statement carries any term about it. A concurrent `PATCH /members/:id` that closes the
  owner's opening range between that read and the batch, which the member route allows and
  `tests/integration/members.test.ts` exercises, leaves the shift writing a `joined_month` past the
  row's `left_month`. The `CHECK (left_month IS NULL OR left_month >= joined_month)` at
  `migrations/0003_members.sql` then fires inside the batch, so the outcome is a 500 with nothing
  written rather than the 400 the delta specifies. There is no corruption and the window is narrow,
  which is why this is a warning and not a critical.
- **Fix**: Add the bound to the settings update's `where` so a lost race falls into the existing
  `meta.changes === 0` path instead of throwing:
  `and exists (select 1 from active_ranges where id = ? and (left_month is null or left_month >= ?))`,
  bound only when `shifted` is set, with `shifted.id` and `next.start_month`. For the re-read at
  `:373-379` to then name the right month, re-read the owner ranges there as well rather than reusing
  the `shifted` row captured before the batch, which is stale in exactly this case.

### O1 - The atomicity case asserts the target's rows, not the sibling's

- **Severity**: 📄 OBSERVATION
- **Location**: `tests/integration/subscription-deletion.test.ts:202`
- **Detail**: The rollback assertion covers all eight tables of the deleted subscription, which is the
  claim the test exists to make. It does not assert that the sibling row the appended insert collided
  with is still present and still single. A probe confirms it is, so this is about what the test would
  catch, not about current behaviour.
- **Fix**: Add `expect(await countsFor(sibling.id)).toEqual(siblingBefore)` after `:202`.

### O2 - The success response is synthesised rather than re-read

- **Severity**: 📄 OBSERVATION
- **Location**: `src/server/db/subscriptions.ts:387-397`
- **Detail**: `update` returns an object built from `next` rather than from the row. It is sound,
  because `ok: true` requires `meta.changes` above zero and the `set` list is exactly those five
  fields, and the delta relies on the response to refresh the client's held object. Worth naming so a
  later reader does not mistake the response body for proof of persistence in a test; the cases that
  need that proof re-read, and they do.

### O3 - Two accepted-move cases assert only the response body

- **Severity**: 📄 OBSERVATION
- **Location**: `tests/integration/subscriptions.test.ts:324-342`
- **Detail**: The accepted earlier move and the accepted later move assert the PATCH response only. Per
  O2 that is weaker than a re-read. Both are covered elsewhere, the earlier move at `:229-250` and the
  later move at `tests/integration/members.test.ts:96-114`, so nothing is untested. A `GET` in each
  case would make the two read on their own.

### O4 - The floor outranks the minimums when both could bind

- **Severity**: 📄 OBSERVATION
- **Location**: `src/server/db/subscriptions.ts:278-299`
- **Detail**: A subscription stored below today's floor, patched to another month still below it while
  a dependent record also pins the move, is refused with the floor sentence, because the floor is
  checked first. The delta fixes a tie order among the five kinds and the owner range but says nothing
  about the floor against them. The sentence is truthful either way and the state needs a subscription
  older than ten years, so this is recorded rather than raised.

### O5 - The fallback sentence rests on a ruling that is uncommitted

- **Severity**: 📄 OBSERVATION
- **Location**: `src/server/db/subscriptions.ts:383`
- **Detail**: The doubly-lost-race fallback emits `start_month cannot be later than <stored month>`
  with no because-clause. The ruling that authorises it, "Ruling on an implementation question from
  phase 1", was an uncommitted edit to `design-delta.md` while this review was being written and
  landed as `7d5b588` before the review was committed. The code is correct against the ruling and the
  contract is now in the history beside it. Recorded only because the code shipped ahead of the
  ruling that authorises its sentence.

## Regressions

- **The changed `members.test.ts` assertion is justified.** The old case asserted that a PATCH carrying
  `start_month` is refused with 400. The delta makes the first month one of the five editable settings,
  so the old assertion states the opposite of the contract. The replacement at `:96-114` is strictly
  stronger: it asserts 200, re-reads the stored month, and additionally asserts the owner's opening
  range moved with it, which is the plan's required shift case.
- **The changed validation case is justified.** `subscriptions.test.ts:98-107` flips
  `start_month` from rejected to accepted, matching the schema change, and adds a case rejecting
  `2026-00`, `2026-13`, `2026-19`, `2026-1` and `26-01`, closing the gap the database's `GLOB` admits.
  Net coverage rises.
- **No other test weakened.** The diff over `54b6d8c..7b2e56f` removes assertions from those two files
  only; every other change is an addition.
- **The two rewritten comments describe current behaviour.** The schema comment at
  `src/server/validation/subscriptions.ts:43-52` states that `start_month` is patchable and where its
  two bounds live, and the create comment at `src/server/db/subscriptions.ts:194-198` describes the
  owner's opening range as created at the first month and carried along when it moves. Neither narrates
  the change. The plan's grep gate, `grep -rn "start_month cannot move\|cannot be changed" src/server/`,
  returns nothing.
- **Nothing reads the clock outside `currentMonth`.** The only clock reads left in `src/server/` are
  `new Date().toISOString()` for `created_at` in `subscriptions.ts:192`, `members.ts:153` and
  `payments.ts:117`, all pre-existing, none a month derivation. The floor goes through
  `currentMonth(timeZone)`.
- **Nothing outside the server changed.** The diff touches no path under `src/client/`, `src/domain/`
  or `migrations/`.

## Gates

Run by this reviewer in a detached worktree at `7b2e56f`, because the shared tree carried an
uncommitted edit to `design-delta.md`.

| Gate | Result |
|------|--------|
| `npm run typecheck` | pass, all three projects |
| `npm run test:unit` | pass, 20 files, 243 tests |
| `npm run test:integration` | pass, 13 files, 131 tests |
| `npm run build` | pass, 57 modules, client bundle 278.52 kB |

## Conclusion

APPROVED. The delete verb, the currency lock, the floor, the five minimums, the owner opening-range
shift and the refusal sentences all match the delta and the plan, F2 through F5 and F10 are resolved
in the code rather than only in the plan, and R1 and R2 are both covered by tests that fail for the
right reason. The one warning is a residual race the plan claimed to have closed everywhere; it costs
a 500 rather than a wrong write, so it does not block phase 2, and the fix is four lines in the
statement that already exists.

## Resolution

Implementer's response. The warning is fixed in code, three observations are fixed in code and two
are recorded. Each finding was re-checked against the source before being acted on, and the one place
where re-checking changed the answer is written out under W1 rather than folded into the table.

| Finding | Severity | Outcome | Commit |
|---|---|---|---|
| W1 | warning | Fixed. The owner leave month travels as a sixth `exists` clause in the settings update, and the lost-race branch re-reads the owner ranges so it names the month the clause saw | `688757a` |
| O1 | observation | Fixed. The atomicity case now asserts the sibling subscription's eight counts are unchanged as well as the target's | `688757a` |
| O2 | observation | Fixed. A successful `update` returns the row read back from the database rather than an object assembled from the patch | `688757a` |
| O3 | observation | Fixed. Both accepted-move cases re-read through `GET` and assert the stored first month | `688757a` |
| O4 | observation | Recorded. The floor binding before the minimums is the intended precedence; reasoning below | `688757a` |
| O5 | observation | Recorded. The ruling landed as `7d5b588`; the code already matches it and nothing is outstanding | `688757a` |

**W1.** The fix is the one the finding proposes. The settings update gains
`exists (select 1 from active_ranges where id = ? and (left_month is null or left_month >= ?))`,
bound with the shifted range's id and the new first month, added only when a shift applies and the
month moves later, because an earlier move cannot pass a leave month that the stored set already
places at or after the old first month. The `meta.changes === 0` branch now re-reads the owner ranges
and re-derives the shifted row from the re-read subscription, so a race stopped by this clause is
answered with the delta's "your own first active range ends then" sentence naming the leave month the
clause actually saw, rather than with the stale row's `null`. Two unit cases against the `D1Database`
stub cover it in R2's style: one where the range closes between the two owner-range reads and the
answer is the owner sentence, and one asserting the clause and its binding are in the statement at
all.

Re-checking changed one thing, and it is worth stating rather than leaving implied. The 500 the
finding describes is not reachable through today's participant route. `update` in
`src/server/db/members.ts:201-208` replaces a member's whole range set, deleting every row and
inserting new ones with fresh ids, so a concurrent participant PATCH does not leave a closed range at
the id captured before the batch; it leaves no row at that id at all. The shift statement then matches
nothing, the `CHECK` is never reached, and the participant minimum clause refuses the move anyway
because the replacement's opening range sits at the old first month. So the finding's severity is
right and its mechanism is one step off. The clause is still the correct fix: it stops the rule
depending on an implementation detail of another module, namely that ranges are replaced rather than
updated in place, and it is the only one of the six bounds that was not travelling in the write, which
is the invariant F5's decision established.

**O4.** The floor is checked before the minimums and refuses first when both could bind. That
precedence is deliberate. The floor is a static rule about a single submitted value, decided against
nothing but the subscription's own time zone, while a minimum is a statement about other records. A
month below the floor is refused whatever the dependent records say, and a month below the floor can
never satisfy a minimum either, since every minimum is at or after the stored first month and the
stored first month is at or after the floor on every subscription this code creates. So the two
orderings differ only for a subscription stored below today's floor, which needs a row older than ten
years, and there the floor sentence is the more useful of the two: it names the bound the person has
to clear before any other rule can matter. No code change.

**O5.** Nothing to do. The ruling is committed at `7d5b588`, the fallback sentence at
`src/server/db/subscriptions.ts` matches it, and the observation records a sequencing fact about the
review rather than a defect.

### Gates after the fix

Run on the shared working tree, which typechecks and builds clean; the Phase 4 agent's client work was
committed by the time these ran, so no detached worktree was needed. The suites cover the whole
repository, so the unit counts include that agent's files as well as this phase's.

| Gate | Result |
|------|--------|
| `npm run typecheck` | pass, all three projects |
| `npm run test:unit` | pass, 22 files, 262 tests |
| `npm run test:integration` | pass, 13 files, 131 tests |
| `npm run build` | pass |
