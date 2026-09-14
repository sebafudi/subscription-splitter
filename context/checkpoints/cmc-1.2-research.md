# Checkpoint: cmc-1.2 research and frame

## Identity

Opus subagent, plan step 1.2 (goal C01) of change `compact-member-calendar`. Sole owner of
`context/changes/compact-member-calendar/research.md`, `frame.md` and `design-inputs.md`, plus this
checkpoint file. Does not touch `change.md`, `plan.md`, roadmap, STATUS, AGENTS or GOALS; a
concurrent Sonnet worker owns those.

## Status

Complete. All three deliverables written. Nothing committed; the orchestrator assigns the commit.

## Completed actions

- Read `change.md`, `plan.md`, the `10x-research` and `10x-frame` skills, and the archived
  `subscription-management-and-date-inputs` research plus frame and the `visual-redesign` research
  for the house format. Adopted the date-free convention those artifacts use.
- Read the full client surface: `SubscriptionDetail.tsx`, `MemberList.tsx`, `PaymentList.tsx`,
  `RecurringSection.tsx`, `PriceHistory.tsx`, `BreakMonths.tsx`, `MemberForm.tsx`, `PaymentForm.tsx`,
  `ScheduleForm.tsx`, `sections.ts`, `api.ts`, `format.ts` and every `components/ui` primitive.
- Read the whole domain layer: `types.ts`, `calc.ts`, `recurring.ts`, `month-status.ts`, `members.ts`,
  `months.ts`, `payments.ts`, `prices.ts`, `money.ts`.
- Read `routes/summary.ts`, `db/subscription-state.ts`, `routes/payments.ts` and every `order by` in
  `src/server/db`, confirming no pagination or `limit` exists on any list route.
- Delegated two read-only Sonnet inventories: the full `index.css` token and component inventory
  against `visual-redesign/design-spec.md`, and the full test-coverage and fixture inventory
  including the `dev-seed` route.
- Wrote `research.md` to the 10x-research schema: a 67-row detail and action preservation matrix with
  a source location on every row, the accounting contract with seven reproducible invariants, the
  client data contracts and a proposed projection interface, the fixture requirements, and eighteen
  open questions marked designer decision, plan decision or resolved by research.
- Wrote `frame.md` to the 10x-frame schema: six-dimension map, six-row hypothesis table, the reframe,
  confidence, and five numbered questions left explicitly to the designer.
- Wrote `design-inputs.md` at 1494 words: tokens with values, reusable components one line each,
  record shapes with formatted examples, screen structure, the single breakpoint, and the seven
  canonical month-exclusion states with their existing phrases.
- Removed every em dash from the three artifacts, matching house style in the archived documents.

## Changed paths

- `context/changes/compact-member-calendar/research.md` (new)
- `context/changes/compact-member-calendar/frame.md` (new)
- `context/changes/compact-member-calendar/design-inputs.md` (new)
- `context/checkpoints/cmc-1.2-research.md` (this file, new)

No source file, test, `change.md` or `plan.md` was touched.

## Verification

No code changed, so no build or test was run. Every matrix row and every accounting claim carries a
`file:line` reference read at commit `c10d54f` on `main`. Matrix row count verified as 67. Word count
of `design-inputs.md` verified under the 1500 limit. Three items are recorded as unverified in
`research.md` section 9: the rendered height of the current page under a six-person eight-year
ledger, browser behaviour for a grid of many small interactive cells, and whether a literal empty
`activeRanges` exists in production data. `data/`, backups, `.env`, `.dev.vars` and chat exports were
not read.

## Unresolved issues

None blocking. Carried forward for the design and plan gates:

- Eight designer decisions in `research.md` Open questions, five of them restated with their
  supporting evidence in `frame.md` Questions for the designer.
- Four plan decisions, chiefly which fixture route backs which verification step, and how a schedule
  id is carried through an aggregated cell.
- Three behaviours no existing test pins and the projection must therefore cover itself: two receipts
  on one day, a literal empty `activeRanges`, and two concurrent non-overlapping schedules for one
  member.

## Exact next action

Step 1.2 is finished. The orchestrator commits these four files and proceeds to step 2.1, the Fable
design specification, whose inputs are `design-inputs.md` for the existing system vocabulary,
`frame.md` for the five open design questions, and `research.md` for the preservation matrix the
specification has to give every row a destination.
