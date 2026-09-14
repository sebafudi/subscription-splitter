# Checkpoint: cmc-2.3 plan review resolution

## Identity

Opus subagent, step 2.3 (goal C02) of change `compact-member-calendar`. Resolver of the independent
plan review. Sole owner of `context/changes/compact-member-calendar/plan.md` and of this checkpoint
for this step. Did not write the review report and did not edit it, did not edit `design-spec.md`,
`change.md`, the mockup, any source file, any test, STATUS.md, GOALS.md, roadmap.md or AGENTS.md.

## Status

Complete. All eleven findings in `reviews/plan-review.md` carry a disposition, recorded in the new
`## Review resolution` section of `plan.md`: ten fixed in the plan, one (F11c) accepted as is because
`change.md` belongs to the status writer. The five design findings were ruled on by Fable in
`design-spec.md` §14 before these edits and are applied, not re-decided. `change.md` deliberately
left at `status: planned`: moving it to `plan_reviewed` is the reviewer's re-verification and the
status writer's action, not this step's. Progress row 2.3 deliberately left unticked.

## Completed actions

- Read in full: `reviews/plan-review.md` (verdict REVISE, 4 critical, 6 warnings, 1 observation,
  5 design findings, 13-item re-verification checklist), `design-spec.md` including §5, §6, §8, §13
  and §14, `plan.md`, `context/checkpoints/cmc-2.2-plan.md` and `cmc-2.3-plan-review.md`, and
  `archive/toolkit/.ai/skills/10x-plan-review/SKILL.md` step 7, whose dispositions are FIXED,
  SKIPPED, ACCEPTED and DISMISSED.
- Read the cited source rather than trusting the report: `src/client/components/ui/DisclosurePanel.tsx`
  (focus-on-open at `:31-37`, `stopPropagation` at `:39-42`, the untargetable `h3` at `:54`),
  `SectionHeader.tsx:11-15`, `MemberList.tsx:29-33` and `:59-65`, `useSectionStatus.ts`,
  `ConfirmStrip.tsx:36-43`, `RecurringSection.tsx:63-71`, `src/domain/month-status.ts`, `prices.ts`,
  `calc.ts:80-130`, and `src/client/index.css` `.disclosure` rules at `:706-717` with the motion
  tokens at `:109-111` and `:504-505`. Every fix is grounded in what those files do.
- Edited `plan.md` only. Fixes F1 to F10, F11a and F11b applied; the designer rulings §14.1 to §14.5
  applied to the projection interface (`MonthCell.priced` deleted), the `MonthStrip` per-cell bullet
  (`×N` shares the disc slot, dropped at three marks), `cellText.ts` (`owner-member` unreachable),
  the Phase 5 measurement and matrix rows 21 and 31.
- Appended `## Review resolution` before `## References`, one row per finding id with its disposition
  and the plan location changed, plus a note on re-verification items 11 to 13.

## Changed paths

- `context/changes/compact-member-calendar/plan.md` (edited; 320 lines added, 98 removed, across the overview,
  planned-files tables, projection interface, five component contracts, focus table, matrix rows 21
  and 31, Phases 1 and 3 to 6, execution rules and References)
- `context/checkpoints/cmc-2.3-resolve.md` (this file)

Committed in the same commit, unchanged by this worker: the designer's `design-spec.md` §14 and
mockup updates, `reviews/plan-review.md` and `context/checkpoints/cmc-2.3-plan-review.md`, which
were modified or untracked in the working tree when this step began.

## Verification

- `## Progress` contract rechecked after the edits: one `## Progress` heading, last, after
  `## References`; six `### Phase N` subsections matching the six `## Phase N` headings word for word
  and in order; `#### Automated` the only heading level inside; nineteen rows with their indices and
  titles unchanged and none reticked; no checkbox anywhere outside the section (`grep -c "^- \["`
  before the heading returns 0).
- The new `#### Automated verification:` / `#### Manual verification:` headings match the house
  precedent at `context/archive/subscription-management-and-date-inputs/plan.md:471` and `:484`, and
  sit in the phase bodies, not in Progress.
- Date-free: the only date-shaped string added is the illustrative `MonthStr` `2026-03` inside the
  cell id scheme, which is the same class as the existing illustrative months in copy. No timestamp,
  no duration estimate, no em dash in the added text.
- Scope: no dependency added, no server route touched, still exactly one new token `--hatch`, and
  `DisclosurePanel.tsx` is now explicitly excluded from every phase with a Phase 4 criterion
  (`git diff --stat main -- src/client/components/ui/DisclosurePanel.tsx` empty) pinning it.
- No gate was run. Nothing under `src/`, `tests/`, `package.json` or any config changed, so
  typecheck, unit, integration and build do not apply.
- `git status --short` clean for `context/changes/compact-member-calendar/` and both 2.3 checkpoints
  after the commit. The commit's own sha cannot be carried inside it and is reported in the return
  summary.

## Unresolved issues

- F11c stands as accepted, not fixed: `change.md` still reads `status: planned` with five `[x]`
  Progress rows, which trips the drift warning in `progress-format.md`. The rows are planning steps,
  so the status is substantively right; the one-line note belongs with the move to `plan_reviewed`.
- Two facts remain unmeasured and stay Phase 5 work, unchanged since the 2.2 checkpoint: the rendered
  height of the current page under a six-person eight-year ledger, and browser behaviour for a grid
  of many small interactive cells.
- The F3 fix accepts one stated cost: `.disclosure`, `.disclosure-inner` and `.panel` become a CSS
  contract two components depend on, pinned in `index.css` by its single Sonnet owner in step 4.1.

## Exact next action

The independent reviewer re-verifies the edited `plan.md` against the thirteen-item checklist in
`reviews/plan-review.md`. On a clean re-verification, the status writer moves `change.md` to
`plan_reviewed`, ticks Progress row 2.3 with its sha, and Phase 3 begins with the Opus projection
work in `src/client/calendar/projection.ts` and `cellText.ts`.
