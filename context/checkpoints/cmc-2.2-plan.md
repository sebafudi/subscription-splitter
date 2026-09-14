# Checkpoint: cmc-2.2 finalized plan

## Identity

Opus subagent, plan step 2.2 (goal C02) of change `compact-member-calendar`. Sole owner of
`context/changes/compact-member-calendar/plan.md`, the `status` line of `change.md` and this
checkpoint. Did not touch STATUS.md, GOALS.md, roadmap.md, AGENTS.md, any source file or any test.
Fable 5.1's `design-spec.md` was treated as frozen: no visual, copy, interaction or motion decision
was made, changed or reinterpreted here.

## Status

Complete. Both deliverables written and committed. Step 2.3, the independent `10x-plan-review`, has
not run, so `change.md` stands at `planned` and not `plan_reviewed`.

## Completed actions

- Read in full: `change.md`, `plan.md`, `design-spec.md`, `research.md`, `frame.md`,
  `orchestrator-prompt.md`, `context/checkpoints/cmc-1.1-reconcile.md`, `cmc-1.2-research.md`, the
  `10x-plan` skill with `references/progress-format.md`, the `10x-new` `references/change-md.md`
  status vocabulary, and the archived `subscription-management-and-date-inputs/plan.md` for the
  house format.
- Inspected the source the plan touches rather than trusting the research summary:
  `SubscriptionDetail.tsx`, `MemberList.tsx`, `PaymentList.tsx`, `RecurringSection.tsx`,
  `sections.ts`, `PaymentForm.tsx`, `ScheduleForm.tsx`, `MemberForm.tsx`, every `components/ui`
  primitive, `api.ts`, `format.ts`, `src/domain/{calc,month-status,recurring,types}.ts`,
  `index.css` tokens, `vitest.unit.config.ts` and `package.json` scripts. Also read the mockup's
  markup to compare it against the specification text.
- Rewrote `plan.md` keeping every existing section heading and every Progress step title unchanged.
  Added: the planned-file table with an owner tier per file and a single-owner rule for
  `index.css`, `sections.ts` and `SubscriptionDetail.tsx`; the projection interface as TypeScript
  signatures with the domain functions it calls and the seven invariant tests; component contracts
  with props, events, focus targets and aria attributes; a table mapping each of the thirteen focus
  rules of `design-spec.md` section 8 and the accessible-name rules of section 5 to an owner
  component; the fixture strategy per verification step; the decision not to add a React-rendering
  test setup, with its justification; the 67-row destination table citing the research row numbers;
  the Phase 5 height and compactness measurement method; and the rollback reference and release
  steps following `evidence/runs/release-5.md`. No date, timestamp or duration estimate appears.
- Set `change.md` frontmatter `status` from `new` to `planned`.
- Corrected one sentence in `change.md`'s Notes that had become false, "all execution steps remain
  pending", to name Phases 1 and 2.1 to 2.2 as done. This is outside the literal instruction, which
  named the frontmatter only; it is recorded here because leaving a false statement in the
  lifecycle file would have been drift. No other body text was touched.

## Changed paths

- `context/changes/compact-member-calendar/plan.md` (rewritten)
- `context/changes/compact-member-calendar/change.md` (status, and the one Notes sentence above)
- `context/checkpoints/cmc-2.2-plan.md` (this file)

## Commit shas

- `SHA_CONTENT` `docs(plan): research, design spec and finalized plan for s-09` - the whole change
  folder (`change.md`, `plan.md`, `research.md`, `frame.md`, `design-inputs.md`, `design-spec.md`,
  `orchestrator-prompt.md`, `mockup/compact-calendar.html` and the four captures), plus
  `context/checkpoints/cmc-1.2-research.md` and this checkpoint.
- `SHA_PROGRESS` `docs(plan): record progress shas` - appends the step shas to Progress 1.2, 1.3,
  2.1 and 2.2. No amend was used.

Progress state after both commits: 1.1 done with `7a44970`, and 1.2, 1.3, 2.1 and 2.2 done with
`SHA_CONTENT`. Every later step is pending.

## Verification

- `git status --short -- context/changes/compact-member-calendar context/checkpoints/cmc-2.2-plan.md`
  clean after the second commit.
- `git show --stat` on both commits read back to confirm the file lists.
- Progress section checked against `references/progress-format.md`: one `## Progress` heading at the
  bottom after `## References`, one `### Phase N` per phase in order, `#### Automated` subsections,
  1-based indices unchanged, no renamed titles, no estimates or owners inside Progress.
- `change.md` status checked against the `10x-new` allowed values: `planned` is the value
  `/10x-plan` sets, and `plan_reviewed` follows only after `/10x-plan-review`.
- No test, typecheck or build was run: nothing under `src/`, `tests/`, `package.json` or any config
  changed, so no gate applies. No `wrangler` or Cloudflare command was run.

## Questions for the designer

Eight points where `design-spec.md` is silent, disagrees with the shipped code, or is not
implementable as written. None blocked planning. Each names the assumption the plan proceeds on, and
each is cheap to change if Fable rules otherwise.

1. **Participants heading count.** Sections 2 and 3 show "Participants (6)" and the mockup renders
   it. The section carries no count today and the reason is written into the code
   (`MemberList.tsx:29-33`, `SectionHeader.tsx:19-22`): the API's active count includes the
   organizer, so it could never agree with the rows beneath. What does the new count count: listed
   participants only, listed plus settled archived, or those plus the owner block? *Assumed:* the
   number of person blocks rendered in the open list, excluding the ones behind the settled-archived
   disclosure and excluding the owner.
2. **The owner block is a new row.** `computeSummary` filters the owner out of `summary.members`
   (`calc.ts:88`), so the Participants section has no owner row at all today. Section 4's owner block
   adds one. *Assumed:* intended. Its figures are exact rather than invented: Owed and Paid are zero
   because `month-status.ts:55` never charges the owner and both payment write paths refuse a receipt
   recorded against them, the balance is therefore "settled", and This month is
   `summary.ownerShareThisMonth`. Section 4 says "No actions change" while the mockup shows an Edit
   button on the owner block; since the row does not exist today there is nothing to keep unchanged.
   *Assumed:* the mockup wins and the owner block carries Edit only, with no Archive and no Delete.
3. **Status sentences.** Section 9 lists "Payment recorded.", "Payment updated.", "Payment deleted.",
   "Standing order updated.", "Marked as not received.", "Marked as received." as the existing
   strings. The shipped strings are `Payment recorded`, `Changes saved`, `Payment deleted`,
   `Standing order added`, `Standing order deleted`, `Participant added`, `Participant archived`,
   `Participant unarchived`, `Participant deleted`, `Marked not received`, `Marked received`: no
   trailing stop, and "Payment updated" and "Standing order updated" do not exist. Section 10 forbids
   implementers introducing strings. *Assumed:* the shipped strings are used verbatim and nothing is
   added or repunctuated.
4. **`role="grid"` without a row.** Section 4 specifies a `role="grid"` holding twelve
   `role="gridcell"` buttons, and the mockup renders exactly that. A `gridcell` must be owned by a
   `row`, so the markup as drawn is invalid and screen readers will not expose the grid. *Assumed:*
   a `role="row"` wrapper is added inside the grid. It changes nothing visually.
5. **Twelve cells in two visual rows below 640px.** Section 4 puts six cells per row in two rows;
   section 8 says Left and Right "wrap within the row". *Assumed:* the strip stays one ARIA row of
   twelve cells at every width, so Left and Right wrap December to January rather than June to July,
   and the two visual rows are a CSS wrap only.
6. **More than one future year holding payments.** Section 3 gives one fragment, "2027 holds 1
   payment.", appended to the range sentence. *Assumed:* when several later years hold payments, one
   such fragment per year is rendered in ascending order, each a `.btn-link` selecting that year. The
   template is the designer's; only its repetition is assumed.
7. **The Participants subtitle.** Section 2 says its subtitle "replaces the current one", but
   `sections.ts` gives Participants no subtitle at all today. *Assumed:* it is an addition, and the
   sentence is used exactly as written.
8. **"Recorded in `<year>`" and future-dated receipts.** Section 4 defines it as the sum of manual
   receipts dated in that year. A receipt dated later in the current year already raises lifetime
   `paid` today (`calc.ts:73-76`, pinned by `calc.test.ts:235-240`). *Assumed:* such a receipt is
   included in the year figure, because the figure is a receipt-date sum and not a charge sum.

## Unresolved issues

- Step 2.3, the independent plan review, has not run. `change.md` must not move to `plan_reviewed`
  and no application code may be written before it resolves.
- Two facts stay unmeasured from `research.md` section 9 and are Phase 5 work, not assumptions: the
  rendered height of the current page under a six-person eight-year ledger, and browser behaviour for
  a grid of many small interactive cells. The plan's compactness acceptance captures both the
  pre-change and post-change figures for exactly this reason.
- Removing `src/client/components/MemberList.tsx` in step 4.1 is the only file removal the plan
  authorizes. The implementer records it in its checkpoint and removes nothing else.

## Exact next action

An independent Opus reviewer, not this one and not the plan's author, runs `10x-plan-review` against
`context/changes/compact-member-calendar/plan.md` and writes
`context/changes/compact-member-calendar/reviews/plan-review.md`, reading `design-spec.md` as frozen
and treating the eight questions above as open designer items rather than plan defects. Every
blocking finding is resolved with a recorded disposition before `change.md` moves to `plan_reviewed`
and before Phase 3 begins.
