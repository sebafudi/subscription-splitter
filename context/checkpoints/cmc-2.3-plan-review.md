# Checkpoint: cmc-2.3 independent plan review

## Identity

Opus subagent, step 2.3 (goal C02) of change `compact-member-calendar`. The independent reviewer:
did not write `research.md`, `frame.md`, `design-spec.md` or `plan.md`. Sole owner of
`context/changes/compact-member-calendar/reviews/plan-review.md` and of this checkpoint. Did not
edit `plan.md`, `design-spec.md`, `change.md`, any source file, any test, STATUS.md, GOALS.md,
roadmap.md or AGENTS.md. Did not commit.

## Status

Complete. Verdict **REVISE**: 4 critical findings, 6 warnings, 1 observation, plus 5 design findings
returned to the designer. `change.md` deliberately left at `status: planned`, because the review
skill moves it to `plan_reviewed` only once blocking findings carry a recorded disposition, and every
finding stands at `Decision: PENDING`.

## Completed actions

- Read in full: `archive/toolkit/.ai/skills/10x-plan-review/SKILL.md` and
  `archive/toolkit/.ai/skills/10x-plan/references/progress-format.md` (the SKILL's own
  `references/` directory does not exist; the Progress contract reference lives under `10x-plan`);
  `change.md`, `plan.md`, `design-spec.md` including §13, `research.md`, `frame.md`,
  `context/checkpoints/cmc-2.2-plan.md`; and the archived
  `context/archive/subscription-management-and-date-inputs/reviews/plan-review.md` plus that change's
  `plan.md` for the house format and the date-free convention.
- Verified the plan against the shipped source rather than against its own prose:
  `src/client/screens/SubscriptionDetail.tsx`, `components/MemberList.tsx`, `PaymentList.tsx`,
  `RecurringSection.tsx`, `sections.ts`, every `components/ui` primitive touched
  (`DisclosurePanel.tsx`, `ConfirmStrip.tsx`, `SectionHeader.tsx`, `LedgerEntry.tsx`,
  `useSectionStatus.ts`, `DateField.tsx`), `src/client/api.ts`, `src/client/index.css` highlight and
  motion tokens, `src/domain/{calc,month-status,recurring,prices,months}.ts`,
  `src/server/validation/{payments,prices}.ts`, `src/server/routes/payments.ts`,
  `vitest.unit.config.ts`, `package.json`, `mockup/compact-calendar.html`, and
  `evidence/runs/release-5.md`. Did not read `data/`, `.env`, `.dev.vars` or any backup.
- Grounding recorded in the report: 18/18 paths, 14/14 symbols, release precedent one for one,
  `## Progress` mechanical contract passing in full, date-free and scope hygiene passing.
- Wrote `context/changes/compact-member-calendar/reviews/plan-review.md` to the skill's output schema,
  with a "What the plan gets right" section, eleven findings, a separate "Design findings" list
  addressed to the designer, and a thirteen-item re-verification checklist.

## Changed paths

- `context/changes/compact-member-calendar/reviews/plan-review.md` (new; the `reviews/` directory was
  created for it)
- `context/checkpoints/cmc-2.3-plan-review.md` (this file)

Nothing else on disk was touched.

## Verification

- Every `file:line` in the report was read back from the file it names after writing, and eleven
  citations were corrected where the plan's own line numbers had drifted by a few lines
  (`calc.ts:66` for `balanceForMember`, `DisclosurePanel.tsx:31-37` and `:54`,
  `MemberList.tsx:61-65`, `SectionHeader.tsx:11-15`, `useSectionStatus.ts:5-10`,
  `prices.ts:20-24`, `routes/payments.ts:56`).
- The four critical findings were each confirmed against two independent sources: the specification
  text and the shipped code. F1 against `design-spec.md` §2/§13.1, `MemberList.tsx:29-33`,
  `SectionHeader.tsx:11-15` and the mockup's `<h2>Participants</h2>` at `:111`. F2 against §13.2, §4's
  Owner bullet, `calc.ts:88` and the mockup, which carries no owner row. F3 against §6, §8,
  `DisclosurePanel.tsx:31-37` and `:54`, and the plan's own planned-files tables, which omit that
  file. F4 against §8's thirteen rules, the plan's four id-owner lists and the shipped
  `getElementById` focus pattern.
- No gate was run. Nothing under `src/`, `tests/`, `package.json` or any config changed, so
  typecheck, unit, integration and build do not apply. No `wrangler` or Cloudflare command was run.
- Confirmed the rollback reference the plan carries is exact against `evidence/runs/release-5.md:142`,
  `:147` and `:149`.

## Unresolved issues

- Eleven findings stand at `Decision: PENDING`. Four are critical and block Phase 3: the heading
  count, the owner block, the inspector's panel and heading, and the missing cell identity and
  active-cell state.
- Design findings 1 to 5 are the designer's to rule on. Design finding 1 is the specification half of
  critical finding F3 and should be answered before the plan is edited, because the two fixes offered
  for F3 differ in whether a shared primitive is touched.
- `change.md` stands at `planned` with five `[x]` Progress rows, which trips the drift warning in
  `progress-format.md`. Substantively correct, since those rows are planning steps; recorded as part
  of observation F11 rather than as a defect.
- Two facts remain unmeasured and stay Phase 5 work, unchanged from the 2.2 checkpoint: the rendered
  height of the current page under a six-person eight-year ledger, and browser behaviour for a grid of
  many small interactive cells.

## Exact next action

The plan's author, or another Opus worker holding `plan.md`, works the re-verification checklist in
`context/changes/compact-member-calendar/reviews/plan-review.md`: resolve F1 to F4 in `plan.md`,
record a disposition on F5 to F11, and route design findings 1 to 5 to Fable. The designer answers
design finding 1 first, since it decides which of the two F3 fixes applies. Only once every finding
carries a disposition does `change.md` move to `plan_reviewed` and Phase 3 begin. This reviewer edits
nothing further.
