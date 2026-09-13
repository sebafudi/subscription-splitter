# Checkpoint: m01-plan

- **Task id:** m01-plan (S-08 frame, plan, and plan-review resolution)
- **Model:** Opus
- **Change:** `subscription-management-and-date-inputs`, roadmap S-08, parent goal M01
- **Status:** complete, pending reviewer re-verification

## Actions

### First pass: frame and plan

1. Committed the designer's `design-delta.md`, which was untracked on arrival.
2. Read `AGENTS.md`, the change folder in full, the `10x-frame` and `10x-plan` skills with the
   `progress-format` reference, and the `google-sign-in` and `visual-redesign` precedents.
3. Ran two read-only investigations to test the frame's load-bearing hypotheses against the tree, and
   verified the two decisive results directly afterwards.
4. Wrote `frame.md`, `plan.md` with six phases and a canonical `## Progress` section, and
   `plan-brief.md`. Moved `change.md` to `planned` and roadmap S-08 to `planning`.

### Second pass: resolving the independent plan review

5. Committed the designer's second amendment to `design-delta.md`, which carries the rulings on the
   review's five design findings.
6. Read `reviews/plan-review.md` in full (verdict REVISE: F1 to F3 critical, F4 to F9 warnings, F10
   and F11 observations) and verified its load-bearing claims against the tree before applying them.
7. Resolved all eleven findings in `plan.md` and `plan-brief.md`, recorded a `Decision:` line on each
   finding in `plan-review.md`, and replaced that file's Resolution paragraph with a resolution table
   in the shape of `context/archive/google-sign-in/reviews/impl-review.md:318`.
8. Left `change.md` at `plan_reviewed` for the reviewer to flip after re-verification.

## Changed paths

- `context/changes/subscription-management-and-date-inputs/design-delta.md` (committed twice, not authored here)
- `context/changes/subscription-management-and-date-inputs/frame.md`
- `context/changes/subscription-management-and-date-inputs/plan.md`
- `context/changes/subscription-management-and-date-inputs/plan-brief.md`
- `context/changes/subscription-management-and-date-inputs/reviews/plan-review.md` (decision lines and resolution table only)
- `context/changes/subscription-management-and-date-inputs/change.md` (status, first pass only)
- `context/foundation/roadmap.md` (S-08 status only, first pass only)
- `context/checkpoints/m01-plan.md` (this file)

## Commits

- `41dba96` docs(s-08): add design delta for subscription management
- `3152954` docs(s-08): frame and plan subscription management
- `d146993` docs(s-08): designer rulings on plan review design findings
- the resolution of findings F1 to F11 in one further commit

## Verification

No code was written and no gate was run, which is correct for a planning task. Every claim the review
turns on was checked in the tree rather than accepted from the report:

- **F1 holds.** `vitest.unit.config.ts` is `environment: 'node'` with an include of `src/**/*.test.ts`
  and no DOM dependency in `package.json`, so `document` is undefined in the unit suite and a `.tsx`
  test would not be collected at all. This grounds both F1 and F9.
- **F3 holds.** `validateActiveRanges` treats `next.joinedMonth <= current.leftMonth` as an overlap
  (`src/domain/members.ts:51`) and refuses `left_month < joined_month` first (`:35-37`), so a stored
  set always satisfies `range1.left < range2.joined` and the withdrawn kind has no reachable state.
- **F4 holds.** `update` returns `Subscription | null` (`src/server/db/subscriptions.ts:99-124`) and
  the route maps null to 404 (`src/server/routes/subscriptions.ts:42-44`), so a refusal travelling as
  `null` would be a silent 404. `MemberRemoval` (`src/server/db/members.ts:223`) is the house shape.
- **F7 holds.** `SubscriptionDetail` has four states (`:49-55`) and renders one shared header in all
  of them, with the `no-owner` state reached from a 409 at `:78-79`.
- **F11 holds.** `subscriptionFieldLabels` already maps `start_month` to "Start month"
  (`src/client/components/ui/fieldLabels.ts:9-16`) and the create form's label matches
  (`src/client/screens/SubscriptionForm.tsx:138`).

## Where I went beyond the review, and why

Two additions to F5, both consequences of the same reasoning the review applied:

1. The read-then-write window it names on the first-month path exists identically on the **currency
   lock**, which the review did not mention. The same `not exists` construction closes it, applied
   only when the currency changes.
2. Inside one `db.batch` the owner opening-range update would otherwise apply even when the
   subscription update lost the race. A later statement in a batch sees an earlier statement's write,
   so the second statement is gated on the subscription already carrying the new first month.

The review left "whether the lost-race answer should be a 400 or a 409" as an open design question.
It does not arise: the update's `where` carries only the ownership terms and the `not exists` clauses,
so a `meta.changes === 0` on a row `get` proved exists resolves by re-read into either 404 (the row is
gone) or the ordinary 400 (a minimum now binds). No third answer exists and no new copy is needed.

F9 was applied in both of its offered forms rather than either, because the pure branch function and
the plain statement of what stays uncovered answer different halves of the finding.

## Things I disagreed with

None. Every finding was verified before being applied, and none turned out to be wrong.

## Progress contract note

Step indices were preserved. Two titles were reworded to match the criteria they now check (1.2, 1.8)
and four rows were added at the next free index in their phase (3.9, 3.10, 4.16, 4.17), which the
contract allows and which the `google-sign-in` plan already precedents at row 3.16. No row has been
executed, so no state was lost. The phase bodies now head their criteria
`#### Automated verification:` and `#### Manual verification:` as the precedent does; the `## Progress`
headings stay `#### Automated` and `#### Manual` as the contract requires.

## Unresolved questions

None. Every planning question and every design finding is ruled in `design-delta.md` under "Rulings on
planning questions" and "Rulings on plan review design findings", and the plan and the brief now point
at those rulings rather than presenting anything as open.

## One risk the plan carries rather than resolves

The detection probes test the month value sanitisation algorithm, not picker rendering. Safari decides
it, and row 5.4 is the gate. If Safari passes both probes and still renders no picker, the fix is a
third condition in the detection function plus one unit case, and the plan names that as the only
source edit phase 5 may produce.

## Next action

Reviewer re-verification of `plan.md`, `plan-brief.md` and the filled-in
`reviews/plan-review.md`, then flipping `change.md` out of `plan_reviewed`.
