# Checkpoint: m02-phase1-server

- **Task:** phase 1 of change `subscription-management-and-date-inputs` (roadmap S-08), the server half
- **Model:** Opus
- **Status:** implemented, independently reviewed and approved, review findings resolved

## Actions

1. Read `AGENTS.md`, the `10x-implement` and `10x-tdd` skills, the change's `design-delta.md`,
   `plan.md` phase 1 with its Critical implementation details, Testing strategy and Risks, and
   `reviews/plan-review.md` findings F2, F3, F4, F5, F10 plus the Re-verification items R1 and R2.
2. Extended `patchSubscriptionSchema` with `start_month` and rewrote the comment that said the field
   could not be patched.
3. Rewrote `update` in the repository around a discriminated return, the currency lock, the ten-year
   floor, the five dependent minimums and the owner opening-range shift, with every bound travelling
   as a `not exists` clause inside the update's own `where`.
4. Added `remove` as one ordered eight-statement `db.batch`, deepest first, ownership inside every
   statement, and exported the statement list so a test can batch the real statements.
5. Applied the floor to `create` as well, which is a product rule on both paths.
6. Added the DELETE verb and mapped the union to the resource's existing error contract.
7. Wrote the unit and integration cases the plan lists, including R2's lost-race branch against a
   `D1Database` stub and F2's atomicity probe against a row the batch does not delete.

## Changed paths

- `src/server/validation/subscriptions.ts`, `src/server/validation/subscriptions.test.ts`
- `src/server/db/subscriptions.ts`, `src/server/db/subscriptions.test.ts` (new)
- `src/server/routes/subscriptions.ts`
- `tests/integration/accounts.ts`, `tests/integration/members.test.ts`,
  `tests/integration/subscriptions.test.ts`, `tests/integration/subscription-deletion.test.ts` (new)
- `context/changes/subscription-management-and-date-inputs/plan.md` (Progress rows only)

Nothing under `src/client/`, `src/domain/` or `migrations/` was touched.

## Decisions worth recording

- **R1, the field a lost race names.** `deriveRefusal` checks the currency lock before the first-month
  minimums, so when both families could bind the answer names `currency`. It is the coarser rule and
  the one the client renders as a disabled field. A unit case pins the precedence.
- **R2, the lost-race branch.** Covered by three unit cases against the stub: a batch reporting no
  change followed by an empty re-read answers not-found, followed by a row that stands answers a
  refusal, and the currency precedence above.
- **The owner's leave month competes on month, not on position.** The design fixes a tie order over
  six kinds, so the owner's opening-range kind is appended last to the same candidate list rather
  than checked before the five minimums. The earliest month wins; the listed order only breaks a tie.
- **`create` returns a union too.** The plan's change 5 requires the floor on create, and `create`
  had no way to refuse. It now returns the same `ok`-discriminated shape as `update`, minus the
  `not-found` arm it cannot produce. The route is its only caller.
- **`assertOwnerRangesSurvive` throws rather than refusing.** The design requires the shifted owner
  range set to be revalidated with `validateActiveRanges` before the write. The only violation a
  person can ask for is the leave-month one, which is a named refusal above. Any other violation
  means a stored invariant broke, so it raises rather than inventing product copy for a state the
  review proved unreachable.
- **One existing integration test was falsified by this change.** `tests/integration/members.test.ts`
  asserted that a subscription PATCH carrying `start_month` answers 400. It now asserts the
  behaviour that replaced it: the patch succeeds and the owner's opening range moves with the first
  month. The file is inside phase 1's `tests/integration/**` ownership.

## Verification

Run from the repository root. The working tree is shared with the agent implementing phase 2, whose
in-flight edits under `src/client/` make the root typecheck red for reasons outside this phase, so
the typecheck and build below were also run in a clean worktree holding HEAD plus this phase's paths
alone.

| Gate | Command | Result |
| --- | --- | --- |
| Types, three projects, phase 1 paths in isolation | `npm run typecheck` | passes, no output |
| Unit | `npm run test:unit` | 20 files, 236 tests, all passing |
| Integration | `npm run test:integration` | 13 files, 131 tests, all passing |
| Build | `npm run build` | succeeds |
| Falsified comments gone | `grep -rn "start_month cannot move\|cannot be changed\|can no longer be patched\|not one of the patchable" src/server/` | no match |
| Client, domain and migrations untouched | `git status --short` over those paths | no phase 1 entry |

## Designer questions

One, and it does not block anything.

- **The sentence a doubly-lost race would carry.** When the settings update reports no change, the
  route re-reads and re-derives. The design supplies a sentence for every rule that can bind. It
  supplies none for the case where the re-derivation finds that nothing binds any more, which needs
  a concurrent request to have removed the blocking record between the batch and the re-read. The
  code answers `start_month cannot be later than <the stored month>`, which is true and carries the
  wire name the client transform needs, but it has no "because" clause and so is the one refusal
  sentence not drawn from the delta. Recommended answer: leave it. D1 runs statements sequentially
  and non-concurrently, the reviewer recorded the branch as having no integration fixture at all, and
  a second sentence for a state nothing in the product can produce is copy nobody will read.

## Unresolved issues

None inside phase 1.

## Next action

Phase 1 is complete. The next action belongs to another phase: phase 4 consumes the two routes from
the client, and phase 6 updates the foundation documents.


## Review round

`reviews/phase1-server-review.md` (commits `f625f92`, `1c7f2ac`) approved the phase with one warning
and five observations. All six are resolved in `688757a` and recorded in that file's `## Resolution`
section.

- **W1, fixed.** The owner's leave month now travels as a sixth `exists` clause in the settings
  update rather than being pre-checked alone, and the `meta.changes === 0` branch re-reads the owner
  ranges instead of reusing the row captured before the batch, so a race stopped by that clause is
  answered with the delta's sentence naming the leave month rather than by a constraint violation.
  Two unit cases against the `D1Database` stub cover it.
- **W1, one correction to the finding.** The 500 it describes is not reachable through today's
  participant route, which replaces a member's whole range set with fresh ids rather than updating a
  row in place, so the id captured before the batch holds no closed range but no row at all. The
  clause is still the right fix: it stops this rule depending on that detail of another module, and
  it was the only one of the six bounds not travelling in the write.
- **O1, O2 and O3, fixed.** The atomicity case asserts the sibling's counts too, a successful update
  returns the row read back from the database, and both accepted-move cases re-read through `GET`.
- **O4 and O5, recorded.** The floor deliberately outranks the minimums, for the reasons written into
  the Resolution section. O5 needed no action: the ruling it names is committed at `7d5b588`.

### Gates after the review fix

Run on the shared working tree, which typechecked and built clean, so no detached worktree was
needed. The unit counts include the Phase 4 agent's files, which had landed by then.

| Gate | Command | Result |
| --- | --- | --- |
| Types, three projects | `npm run typecheck` | passes, no output |
| Unit | `npm run test:unit` | 22 files, 262 tests, all passing |
| Integration | `npm run test:integration` | 13 files, 131 tests, all passing |
| Build | `npm run build` | succeeds |
