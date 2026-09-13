# Checkpoint: m01-plan-review (S-08)

- **Task id:** `m01-plan-review`
- **Model:** Opus (subagent)
- **Goal:** an independent review of the implementation plan for change
  `subscription-management-and-date-inputs`, roadmap S-08.
- **Status:** complete, through re-verification. The designer's amendment was committed mechanically,
  the review was written from that committed state, and after the designer's rulings and the planner's
  resolutions landed the plan was re-verified and approved. No finding was applied by this task; the
  fixes are the planner's.
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

First pass REVISE, re-verification **SOUND, approved for implementation**.

REVISE, first pass. Three critical, six warnings, two observations, plus five design findings returned to the
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

## Re-verification round

The designer ruled all five design findings in `design-delta.md` at `d146993`, and the planner
resolved all eleven review findings in `plan.md` and `plan-brief.md` at `4ea9618`. This task then
re-read both plans and the amended delta in full against the code and appended a `## Re-verification`
section to the report.

**SOUND. Approved for implementation.** Every critical is closed in the plan text and in its test
list, and the mechanical `## Progress` contract still holds: one heading, six matching phase
subsections, 59 rows, every index unique, no checkbox outside the section, with the four new rows
appended rather than renumbering the existing ones.

Checked beyond the findings, at the lead's request:

- The two additions the planner made beyond the review are sound. The currency lock's `not exists`
  guard introduces no new status code and no 400-versus-409 ambiguity, and the gate on the owner
  opening-range statement can only pass after a failed first statement when the new first month
  equals the stored one, in which case the shift writes the range's existing value. There is no
  silent no-op path: `meta.changes === 0` is resolved by a re-read into 404 or the ordinary 400.
- The "First month" label change opens no gap. `Start month` survives in `src/` at exactly the two
  places the plan changes, and no test or fixture asserts the string.
- The ten-year floor breaks no existing creation path. The floor for the current year is `2016-01`,
  the earliest start month in the tree is `2025-12`, and `src/server/routes/dev-seed.ts` creates
  accounts only, never a subscription.
- D4's paired `min` cannot hide a stored value, because the option-range rule always extends the range
  to include the current value.

Two non-required items remain, recorded as R1 and R2 in the report: the re-read rule names only the
first-month family and should say which `field` it names when the currency clause is the one that
binds; and the lost-race branch has no test, which is cheap to add against the `D1Database` stub that
phase 1 change 6 already introduces. One informational note went to the designer about the archived
specification's worked example at `design-spec.md:283`.

`change.md` stays at `status: plan_reviewed`, the status the review skill assigns to a saved and
approved report; the skill defines no later status.

## Next action

Begin implementation. Phases 1 and 2 may start in parallel. Whoever takes phase 1 should fold R1 and
R2 into change 2 and change 6 as they go, since both are one clause and one unit case rather than a
plan edit that needs another review.
