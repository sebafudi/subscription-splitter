# Checkpoint: cmc-2.3 independent plan review

## Identity

Opus subagent, step 2.3 (goal C02) of change `compact-member-calendar`. The independent reviewer:
did not write `research.md`, `frame.md`, `design-spec.md` or `plan.md`. Sole owner of
`context/changes/compact-member-calendar/reviews/plan-review.md` and of this checkpoint. Did not
edit `plan.md`, `design-spec.md`, `change.md`, any source file, any test, STATUS.md, GOALS.md,
roadmap.md or AGENTS.md. Did not commit.

## Status

Complete, through two passes.

- **Pass 1 (review).** Verdict **REVISE**: 4 critical findings, 6 warnings, 1 observation, plus 5
  design findings returned to the designer.
- **Pass 2 (re-verification).** Verdict **SOUND**. The plan owner resolved every finding at commit
  `923de31` and the designer ruled on all five design findings in `design-spec.md` §14, amending §5,
  §6 and §8 to match. All thirteen re-verification checklist items pass. Nothing blocks Phase 3.

`change.md` is still untouched at `status: planned`. Moving it to `plan_reviewed` and ticking
Progress row 2.3 is the status writer's action, not this reviewer's.

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

- **Re-verification pass.** Re-read `plan.md` at `923de31` in full, including the new
  `## Review resolution` table, `design-spec.md` §5, §6, §8, §13 and §14, and
  `context/checkpoints/cmc-2.3-resolve.md`. Worked the thirteen checklist items against the plan's
  actual text rather than against the resolution table, and re-read the cited source for every claim
  about the code: `index.css:705-719` and the motion tokens at `:109-111` and `:504-505` for the
  inspector's reused CSS, `DisclosurePanel.tsx:31-37`, `:39-42` and `:54`, `ConfirmStrip.tsx:38-41`,
  `useSectionStatus.ts:5-10` and `:36-43`, `MemberList.tsx:29-33`, `:99` and `:303`,
  `SectionHeader.tsx:11-15`, `month-status.ts:73-76`, `prices.ts:11` and
  `src/server/validation/prices.ts:20-24`. Re-counted the destination table (rows 1 to 67, each once,
  67 distinct) and re-ran the `## Progress` mechanical contract (one heading, zero checkboxes before
  it, nineteen rows, five ticked, six phase subsections matching word for word).
- Appended `## Re-verification` to `reviews/plan-review.md` with the item-by-item result, a section
  on the deleted `priced` flag, two non-blocking notes and the final verdict, and updated the
  report's header verdict line and reviewer-scope note to carry the second pass.

## Changed paths

- `context/changes/compact-member-calendar/reviews/plan-review.md` (created in pass 1; in pass 2 the
  `## Re-verification` section appended and the header verdict and scope lines updated)
- `context/checkpoints/cmc-2.3-plan-review.md` (this file)

Nothing else on disk was touched in either pass. `plan.md`, `design-spec.md`, `change.md`, the
mockup, all source and all tests were left to their own owners, and nothing was committed.

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
- Pass 2: verified scope hygiene on the resolved plan directly rather than from its own claims. No
  calendar date or timestamp; the only new date-shaped string is the illustrative `MonthStr`
  `2026-03` in the cell id scheme, and the only em dashes are the Progress commit-sha separators the
  format reference mandates. `src/server` appears nowhere as a changed path. No dependency added.
  Exactly one new token, `--hatch`. `DisclosurePanel.tsx` is in neither planned-files table and is
  pinned by a Phase 4 criterion.
- Pass 2: no gate was run, for the same reason as pass 1. Nothing under `src/`, `tests/`,
  `package.json` or any config changed.

## Unresolved issues

None blocking. All eleven findings are closed: ten fixed in `plan.md`, one (F11c, the `change.md`
drift note) accepted because that file belongs to the status writer and the note belongs with the
status move.

Carried forward, unchanged and not defects:

- Two facts stay unmeasured and are Phase 5 work: the rendered height of the current page under a
  six-person eight-year ledger, and browser behaviour for a grid of many small interactive cells.
- The F3 fix accepts one stated cost, recorded in the plan: `.disclosure`, `.disclosure-inner` and
  `.panel` become a CSS contract two components depend on, pinned in `index.css` by its single Sonnet
  owner in step 4.1.
- Two non-blocking notes are recorded at the end of the re-verification section: the `MemberCalendar`
  tint bullet is phrased more narrowly than matrix row 21, which already covers the
  participant-level case; and one CSS citation drifts by two lines.

## Exact next action

The status writer moves `change.md` to `status: plan_reviewed`, ticks Progress row 2.3 with its sha,
and records the F11c drift note alongside that move. Phase 3 then begins with the Opus projection
work in `src/client/calendar/projection.ts` and `cellText.ts`, written before any component exists.
This reviewer's next involvement is step 5.3, the independent `10x-impl-review`, which is a different
skill and may be a different worker.
