# Checkpoint: m03-server-review

- **Task:** independent review of the phase 1 server work of change
  `subscription-management-and-date-inputs` (roadmap S-08; parent goals M02, M03)
- **Model:** Opus
- **Status:** review saved, verdict APPROVED, one warning left for the implementer

## Actions

1. Read `AGENTS.md`, the migrations and the three commits' source before any document, so the contract
   was checked against the code rather than against the implementer's checkpoint, which was not read
   as evidence.
2. Read the contract: `design-delta.md` Rulings on product questions and the phase 1 implementation
   ruling, `plan.md` phase 1 with Critical implementation details, and `reviews/plan-review.md`
   findings F2 to F5, F10 plus re-verification items R1 and R2.
3. Ran all four gates in a detached worktree at `7b2e56f`, because the shared tree carried an
   uncommitted edit to `design-delta.md`.
4. Probed three claims that reading cannot settle, in throwaway test files deleted afterwards: a patch
   carrying only unchanged values, the control that the eight deletion statements alone do empty every
   table, and the reason the atomicity batch fails.
5. Wrote `reviews/phase1-server-review.md` with the verdict, one warning, five observations and the
   gate counts.

## What the probes established

- A patch resending stored values answers 200, so the no-op path behaves as the route always did.
- The eight statements batched with nothing appended empty all eight tables, so the atomicity
  assertion is not passing vacuously.
- The committed atomicity batch fails on `SQLITE_CONSTRAINT_PRIMARYKEY` against
  `break_months.subscription_id, break_months.month`, which is exactly the row F2 asked for: one the
  batch never deletes, belonging to the account's second subscription.

## The one warning

The owner opening-range leave-month rule is pre-checked but does not travel in the write, unlike every
other bound after F5. A concurrent member patch closing that range between the read and the batch makes
the shift statement violate the `active_ranges` CHECK, so the lost race costs a 500 with nothing
written rather than the 400 the delta specifies. The fix named in the review adds one `exists` term to
the settings update's `where` and re-reads the owner ranges in the `meta.changes === 0` branch.

## Gates

| Gate | Result |
|------|--------|
| `npm run typecheck` | pass, all three projects |
| `npm run test:unit` | pass, 20 files, 243 tests |
| `npm run test:integration` | pass, 13 files, 131 tests |
| `npm run build` | pass, 57 modules |

## Changed paths

- `context/changes/subscription-management-and-date-inputs/reviews/phase1-server-review.md` (new)
- `context/checkpoints/m03-server-review.md` (new)

No source file, no STATUS, no GOALS and no evidence entry was touched.

## Next

The warning does not block phase 2. The phase 1 implementation ruling the shipped fallback sentence
rests on landed as `7d5b588` while this review was being written, so the contract and the code are now
in the history together.
