---
change_id: compact-member-calendar
title: Compact member calendars with complete payment details
status: archived
---

## Notes

User request:

> i want the people list to be a calendar for each person
> or some kind of a graph
> right now it's a very very long list
> and I'd like it to be rather compact, with all details preserved

Create a compact overview of each participant's monthly history without rendering every month,
payment and recurring receipt as a long expanded list. Prefer a month-by-person calendar or a
compact yearly calendar per person, with year navigation and a selected-month detail view.
This is a direction to evaluate, not a finalized visual specification. A graph is acceptable if
it preserves the same inspectability and makes payment timing clearer. Multi-year history should
not require scrolling through every elapsed month to reach another participant.

Fable 5.1 remains the sole designer and must use frontend-design. It chooses the final calendar or
graph layout, density, typography, existing design-token use, component appearance, responsive
layout, interaction states, animations and accessibility behavior. Opus and Sonnet implement the
approved specification; unresolved visual decisions return to Fable. Do not silently substitute a
different designer model. The orchestrator delegates implementation and preserves resumable
checkpoints as required by ORCHESTRATOR.md in the parent course workspace.

The compact view must retain access to every existing detail and action: original payment dates,
amounts, notes and tags; multiple payments in one month; standing-order amounts, start/end months
and exceptions; received versus assumed receipts; monthly charges, membership ranges, breaks,
credits and balances; payment editing/deletion and existing member management. Keep the existing
accounting semantics and server-side ownership checks. Never sum a standing-order receipt and its
replaced manual payment twice. Payment totals alone must not imply which billing months were paid.

States must distinguish a month with no receipt from a skipped subscription month, a member outside
an active range, an excepted standing order, future months and missing price information. Missing
prices or membership data must not be presented as settled or zero debt. Keep confirmed manual
receipts distinguishable from assumed recurring receipts even when they occupy one calendar cell.
Use accessible text or symbols in addition to color; month details must work by keyboard and touch,
not hover alone. Define focus restoration, narrow-screen behavior and reduced-motion behavior.

Follow the course flow: 10x-research for the existing people/payment rendering and derived summary
contracts, then the designer specification, 10x-plan, independent 10x-plan-review, phased
10x-implement, 10x-impl-review, designer visual acceptance, verification/release and 10x-archive.
Use the existing archived visual-redesign and subscription-management changes as workflow examples.
Do not call this change planned or implemented before the corresponding artifacts exist.
Register the next roadmap entry and update the active-change pointers during planning.

Acceptance targets for planning:

- A synthetic six-person subscription with eight years of history has a compact people overview;
  collapsed height does not grow with the number of months or payments.
- Selecting a month exposes all its manual receipts and assumed receipts separately, with every
  original detail and management action reachable. Selecting another year retains sensible focus.
- Summaries reconcile with the existing calculation for lump sums, credit, two same-day payments,
  changed recurring amounts, exceptions, breaks and inactive periods.
- No price/membership gap becomes a false settled state. Calendar selection changes the view only.
- Desktop and narrow phone layouts, light/dark themes, keyboard use and reduced motion are verified
  using synthetic fixtures. Include a visual comparison and an independent design acceptance pass.
- Necessary unit/integration checks, typecheck and production build pass; live verification follows
  release, with limitations recorded honestly. All private records remain outside code and evidence.

No live ledger mutation is part of this UI change. Never upload anything to the 10x course without
explicit confirmation. Omit authored dates, timestamps and duration estimates from change artifacts.

The end-to-end execution plan is `plan.md`; Phases 1 and 2 are done, with the independent plan
review closing SOUND after its findings were resolved, and every later execution step remains
pending. `orchestrator-prompt.md` is the reusable start/resume instruction. Research, Fable design
and independent plan review are mandatory gates before application code changes.

The plan review's finding F11c (a drift note about this file's status against the Progress rows
already checked) was recorded here with the earlier move to `plan_reviewed`, as the review's
resolution left it for that step to close; it is closed.

Phases 1 to 5 are complete. Research, framing, the Fable design specification and the finalized
plan closed Phase 1 and Phase 2 with the independent plan review SOUND (`reviews/plan-review.md`).
Phase 3 (the read-only projection and completeness model) and Phase 4 (the compact UI and retained
actions) are implemented. Phase 5 closes with all four gates green, the compactness and behaviour
verification recorded in `evidence/runs/s09-compactness.md` and
`evidence/runs/s09-browser-verification.md`, the independent implementation review APPROVED and
extended twice to the release candidate `650a14d` (`reviews/impl-review.md`), and Fable's visual
acceptance recorded as accepted at `650a14d` (`reviews/design-acceptance.md`). Release is pending:
Phase 6 (hosted checks, deploy, live verification, foundation/status/evidence synchronization and
archive) has not started.

## Closing note

Phase 6 completed and the change is archived. Released as release 6: release commit
`64eb0d3b096eef53a6d264ee483e1d9c7e1dc17a` (`64eb0d3`), Cloudflare version
`a80d2e12-d77e-4b88-b318-aa992eb60d50`, superseding release 5's `751a8bfd-e62a-4c9a-beb2-1953eb6a7656`,
which is recorded as the rollback reference. Hosted CI run `34881238556` green at that SHA; fresh-clone
gates typecheck exit 0, unit 26 files / 359 tests, integration 13 files / 131 tests, build exit 0. Live
smoke: forty-six of forty-six checks pass on a disposable subscription exercising every named
completeness state, no defect found (`evidence/runs/release-6.md`,
`evidence/runs/release-6-live-smoke.txt`, checkpoint `context/checkpoints/release-6.md`). The
certification captures release 6 affects were retaken (seven of ten slots; checkpoint
`context/checkpoints/release-6-captures.md`), the manifest now weighing 1,340,978 bytes across the ten
files, 780,543 in the five required slots and 560,435 in the five optional ones. Fable's visual
acceptance is recorded accepted through three passes plus a fourth pass inspecting the live release
itself (`reviews/design-acceptance.md`, Pass 4).

The honest limits, carried forward rather than smoothed over: browser verification stayed Chrome-only
throughout (headless desktop and a 390px frame for the implementation pass, real Chrome 152 for the
release); Safari, Firefox, mobile browsers and real touch were never driven. The empty-`activeRanges`
branch (no membership range at all) is unreachable through the product's own routes and stays a
unit-test case only, never exercised live. Reduced motion was verified through the existing
zero-duration tokens rather than a live emulation. Separately and outside this change, the workspace
`GOALS.md` F01 final audit still stands at release 4 and has not been re-run against release 5 or
release 6.
