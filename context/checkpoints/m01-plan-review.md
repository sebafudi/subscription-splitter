# Checkpoint: m01-plan-review (S-08)

- **Task id:** `m01-plan-review`
- **Model:** Opus (subagent)
- **Goal:** an independent review of the implementation plan for change
  `subscription-management-and-date-inputs`, roadmap S-08.
- **Status:** complete. The designer's amendment was committed mechanically, the review was written
  from that committed state, committed by explicit path and pushed. No finding was applied; fixes
  belong to whoever triages them.
- **Independence:** this task did not write the brief, the research, the framing, the design delta,
  the plan brief or the plan.

## Actions

1. Committed the designer's uncommitted amendment to `design-delta.md` by explicit path as
   `b482f25`, pulled with rebase and pushed. The review then started from that state, so the delta's
   "Rulings on planning questions" and the owner-range revalidation rule are in force throughout.
2. Read the review skill and its report schema in full, both precedent reviews, and the six change
   documents.
3. Verified every load-bearing plan claim against the tree rather than against the documents.
4. Wrote the report, moved `change.md` to `status: plan_reviewed`, wrote this checkpoint, committed
   all three by explicit path and pushed.

## Changed paths

- `context/changes/subscription-management-and-date-inputs/design-delta.md` (step 0, designer's own
  content, committed unmodified)
- `context/changes/subscription-management-and-date-inputs/reviews/plan-review.md` (new)
- `context/changes/subscription-management-and-date-inputs/change.md` (`status` only)
- `context/checkpoints/m01-plan-review.md` (new)

## Commits

- `b482f25` `docs(s-08): record designer rulings on planning questions`
- the review commit carrying this checkpoint, `docs(s-08): independent plan review`

## Verdict

REVISE. Three critical, six warnings, two observations, plus five design findings returned to the
designer. Plan Completeness fails; End-State Alignment and Blind Spots warn; Lean Execution and
Architectural Fitness pass. The approach and the architecture are right, so nothing calls for a
rethink.

| Finding | Severity | Required | One line |
| --- | --- | --- | --- |
| F1 | CRITICAL | yes | The month-detection unit test cannot run: the unit pool is node with no DOM and the probes are not injectable |
| F2 | CRITICAL | yes | The atomicity test's appended duplicate-key insert conflicts with a row the same batch already deleted |
| F3 | CRITICAL | yes | The sixth refusal kind is unreachable under the plan's own minimum rule, so its required test has no fixture |
| F4 | WARNING | yes | The repository-to-route refusal contract is unnamed, and `null` already means 404 |
| F5 | WARNING | yes | The read-then-write window on the first-month minimums is unstated in Risks |
| F6 | WARNING | yes | The month control's empty value is `string \| null` in phase 2 and `''` in phase 3 |
| F7 | WARNING | yes | The header action row is unspecified in the detail screen's error and no-owner states |
| F8 | WARNING | yes | No prop carries the PATCH response up to `App`, which holds the subscription |
| F9 | WARNING | yes | Nothing tests that the fallback branch renders a select; one manual Safari row is the proof |
| F10 | OBSERVATION | no | Moving the first month earlier is unbounded and the summary enumerates every month from it |
| F11 | OBSERVATION | no | `start_month` gets two labels and the create form keeps the old one |

## Verification

Grounding: paths 33/33 verified, six new paths correctly absent with their parents present; symbols
12/12; brief to plan consistent; foundation line claims all correct. The mechanical `## Progress`
contract passes in full: one heading, last section, six matching phase subsections, 55 rows, criteria
against rows 6/6, 2/2, 7/7, 1/1, 7/7, 1/1, 6/6, 9/9, 2/2, 9/9, 3/3, 2/2, no checkbox outside the
section.

Claims checked against the code, with what each settled:

- Eight `ON DELETE CASCADE` declarations, no trigger, no `ON DELETE SET NULL`, and
  `members_one_owner_idx` is partial. The deletion order and its ownership scoping are correct.
- `request()` returns null on 204 because it parses the body before the `res.ok` branch, so the
  client delete needs nothing special.
- The five minimums are complete; `recurring_exceptions.month` is already bounded inside its
  schedule's range.
- `validateActiveRanges` forbids touching ranges, which is what makes F3's sixth kind unreachable.
- `vitest.unit.config.ts` is node with no DOM and includes `.ts` only, which is what makes F1 and F9
  findings rather than preferences.
- `src/domain/calc.ts:87` enumerates from the first month to the current one, which is what makes
  F10 worth recording.

No command that changes state was run beyond the two commits and their pushes. No file under `src/`,
`tests/`, `migrations/`, `plan.md`, `frame.md`, `research.md`, `context/STATUS.md`, `GOALS.md`,
`evidence/index.md` or `evidence/work-log.md` was modified. `design-delta.md` was committed, never
edited. No calendar date, timestamp, deadline or duration estimate was written; no em dash appears in
either authored file; no agent attribution label appears in either. No deployment, no course upload,
no nested delegation.

## Unresolved items

- All eleven findings carry `Decision: PENDING`. None was applied to the plan; applying them is the
  triage step's work, not the reviewer's.
- The five design findings are open with the designer. D1 and D2 change what the plan must say; D3,
  D4 and D5 do not move a phase boundary.
- F5 is the one finding with two genuine options rather than a single fix, and the choice between
  closing the window in SQL and recording the residual is a judgement the plan's author should make.

## Next action

Triage the eleven findings against the saved report by resuming the review skill with
`context/changes/subscription-management-and-date-inputs/reviews/plan-review.md`, and send design
findings D1 through D5 to the designer. F1 through F9 should close before the phase each names
begins: F2, F3, F4 and F5 before phase 1; F1, F6 and F9 before phase 2; F7 and F8 before phase 4.
