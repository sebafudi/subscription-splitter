# Checkpoint: m06-phase6-docs

- **Task:** phase 6 of change `subscription-management-and-date-inputs` (roadmap S-08): make the
  foundation documents describe the shipped product
- **Model:** Opus
- **Status:** complete for everything document edits can satisfy; two progress rows left open, both
  belonging to phases this one does not own

## Actions

1. Read `AGENTS.md`, then `plan.md` phase 6 with its Critical implementation details, `design-delta.md`
   (Rulings on product questions, the amended 3.4 with Bounds, section 9 Copy) and `research.md`
   section 10, which names every foundation line this change falsifies.
2. Read the shipped server code rather than trusting the plan: `src/server/routes/subscriptions.ts`,
   `src/server/validation/subscriptions.ts` and the refusal sentences in `src/server/db/subscriptions.ts`,
   so the requirement text describes the behaviour that actually landed.
3. Checked each claim added to the test plan against a test that exists:
   `tests/integration/subscription-deletion.test.ts` for the four deletion properties,
   `tests/integration/subscriptions.test.ts` for the patch and delete ownership cases, and
   `src/client/components/ui/monthControl.test.ts` for the detection branches and the option range.
4. Looked at how S-07 left the same documents (`7ad3950`) and how S-06 and S-07 were marked mid-flight
   (`c1b6ebe`), and matched both registers: in-place description, `> Shipped:` notes, status
   `in-progress`.
5. Edited the four documents, ran `npm run typecheck`, committed by explicit path and pushed.

## What changed

- `context/foundation/prd.md`. FR-005 gains a `> Shipped:` note pointing at the editable settings and
  the shared first-month floor. Three requirements are new: FR-027 (the five editable settings, the
  currency lock and its reason from §Non-Goals, the ten-year floor, the five dependent minimums, the
  owner opening-range shift and its one refusal), FR-028 (deleting a subscription with its whole
  ledger, atomically, ownership first, and the carve-out against FR-012 and FR-013) and FR-029, under a
  new "Entering months and dates" heading (native calendar controls, the named-month fallback, the
  unchanged wire formats, bounds as advice only). FR-011's note now says a subscription delete removes
  the owner participant. Two non-functional lines gain what an editable time zone and an editable
  locale move, and what the currency cannot move.
- `context/foundation/test-plan.md`. Risks 2 and 3 and their response rows now name the whole-ledger
  delete, the refused settings edit and the bounds that travel inside the write. §2.1 rows 2 and 3 name
  the verbs and the four deletion properties that defend them. §5 gains a browser-matrix gate for a
  control the browser draws itself, with Chrome and Safari driven locally at 1280 and 390 and the rest
  reported from published support data as unverified. §6.3 requires both preservation cases, not just
  the first. §7 carves the native-control matrix out of the browser non-goal and records how far the
  month control was pulled into a plain module to be unit tested without a DOM harness.
- `context/foundation/roadmap.md`. S-08 status `planning` to `in-progress`, the value S-07 used
  mid-flight. Outcome and done-when were read against the delta and are unchanged; neither had drifted.
- `AGENTS.md`. The opening ledger names S-08 as the active change instead of claiming no roadmap item
  is open. Style gains the never-hard-deleted carve-out (rule sentence, then boundary sentence) and the
  calendar-control convention with the unchanged wire format and the no-`Date` rule.
- `README.md` is unchanged. It describes the stack, setup, database and deploy procedure and carries no
  form conventions, no API surface listing and no change ledger, so nothing in it became false.

## Changed paths

- `context/foundation/prd.md`
- `context/foundation/test-plan.md`
- `context/foundation/roadmap.md`
- `AGENTS.md`
- `context/changes/subscription-management-and-date-inputs/plan.md` (phase 6 progress rows)
- `context/checkpoints/m06-phase6-docs.md` (new)

No file under `src/`, `tests/`, `migrations/` or `evidence/`, and neither `context/STATUS.md` nor
`GOALS.md`, was touched.

## Commits

- `890a50a` the four foundation documents
- the progress ticks and this checkpoint follow in the next commit

## Verification

| Check | Result |
|------|--------|
| `npm run typecheck` | pass, all three projects |
| files under `src/`, `tests/`, `migrations/` in this phase's commit | none |
| calendar date, timestamp, deadline or duration estimate in the added text | none; the only relative expression is the delta's own "January ten years before the current year" |
| em dash in the added text | none |
| every test named in the test-plan additions exists | yes, checked file by file |

## Progress rows

Ticked at `890a50a`: 6.2, 6.3, 6.4, 6.5.

Left open: 6.1, "typecheck, the whole suite and the production build all still pass". Only typecheck was
run here, deliberately: the working tree carries another agent's uncommitted phase 4 client work, so a
suite or build run would measure their tree rather than this phase's edits. The row is satisfied by
phase 5's gate run on the captured tree, which owns it.

## Designer questions

None. Every foundation statement written here was settled by the delta or by the plan; nothing needed a
decision and nothing was invented.

## Next

Phase 5 (browser verification and the acceptance pass) is the remaining phase, and its gate run closes
row 6.1. The archive step, not this phase, moves the roadmap entry to `done`.
