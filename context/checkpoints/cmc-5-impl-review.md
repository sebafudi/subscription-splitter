# Checkpoint: compact-member-calendar, step 5.3 independent implementation review

Identity: Opus, independent implementation reviewer. Wrote no part of the frame, research, design
specification, plan, code, tests or evidence for this change.

Status: complete, including re-verification and a delta review of the release candidate.
`reviews/impl-review.md` opened REVISE, closed **APPROVED** after the integrator's resolution at
`d5952a9` and the designer's §17 rulings, and the approval is **extended to `650a14d`** after five
further code commits reviewed in two delta passes. No source file, test, `plan.md`, `design-spec.md` or `change.md` was modified
by the reviewer. Nothing was committed.

## Scope reviewed

Phases 3 and 4, commits `9ee9d04` through `91a80ca` against baseline `c10d54f`, including the
integrator's fix commit `a87d728` (zero-receipt heading, "Not assumed:" sentence), which was already
in place when the review began and is correct against design-spec §16.

## Actions

1. Read the `10x-impl-review` skill and its output schema, `change.md`, `plan.md` (component
   contracts, projection interface, invariant tests, focus table, 67-row destination table,
   Phase 3 and 4 criteria, `## Review resolution`), `design-spec.md` in full including §§13-16,
   `research.md` §3 and §4, `reviews/plan-review.md`, and the archived
   `subscription-management-and-date-inputs/reviews/impl-review.md` for the date-free house format.
2. Read every changed and new source file, plus the removed `MemberList.tsx` at `c10d54f` and the
   pre-change `PaymentList.tsx` and `RecurringSection.tsx`.
3. Audited accounting safety personally: the projection against the domain, the never-summed
   constraint, the single `unpriced` source of truth, exclusion precedence, future-dated receipts,
   empty membership ranges, selection writes, and the invariant tests against `computeSummary`,
   `balanceForMember` and `recurringReceived`.
4. Dispatched two Opus subagents for the preservation walk (67 rows plus the fourteen focus rules)
   and the design-fidelity audit (§§3-10, §§13-16, CSS), and verified each of their reported
   defects against the code myself before recording it.
5. Re-ran every gate in this checkout: `npm run typecheck` clean across three projects,
   `npm run test` 13 files and 131 cases passed, `npm run build` succeeds. Confirmed no server,
   migration, `wrangler.jsonc` or dependency change, no dates or duration estimates in authored
   files outside synthetic fixtures, and no private data.

## Outcome

Verdict REVISE: 0 critical, 5 warnings, 6 observations, 3 design findings.

Accounting safety is clean, which is the dimension `change.md` calls load-bearing. Recorded and
assumed are never summed in any rendered field, completeness reads only the domain's `unpriced`
reason, and the exclusion precedence is safe by construction because `domain/recurring.ts:81-86`
applies the exception last. 65 of 67 destination rows and 13 of 14 focus rules are preserved.

Every warning is a focus, identity or copy defect in the presentation layer:

- F1 duplicate `payment-edit-<id>` / `payment-delete-<id>` ids between `MonthInspector` and
  `PaymentList`, which can move focus out of the payments section into the calendar.
- F2 `closePaymentEdit` probes an id that is never in the DOM at probe time, so §8's
  close-receipt-edit rule never lands on the entry's Edit button.
- F3 the record button uses the short month form where §6 and §10 give the long one.
- F4 the action row tabs and renders after the strip, reversing §8's stated tab order; the cause is
  `LedgerEntry` rendering children before actions, which is inherited behaviour.
- F5 "Show N more" ships where §7 gives a fixed "Show 12 more".

## Re-verification

Requested after the integrator resolved the review at `d5952a9` (disposition table in
`cmc-4-integrate.md`, sha recorded at `199247e`) and the designer answered the three design findings
in `design-spec.md` §17.

1. Read `git diff a87d728..HEAD -- src/` in full: seven files, all under `src/client/calendar/`.
2. Walked all nine re-verification checklist items against the code. Every one passes.
3. Re-checked the three destination rows and the one focus rule previously marked unpreserved.
   All 67 rows are now preserved and all fourteen §8 focus rules are implemented.
4. Re-ran the gates at `199247e`: `npm run typecheck` clean across three projects; `npm run
   test:unit` 26 files and 351 cases passed; `npm run test:integration` 13 files and 131 cases
   passed; `npm run build` succeeds. `git diff a87d728..HEAD -- src/server migrations
   wrangler.jsonc package.json package-lock.json` is empty.
5. Appended `## Re-verification` to `reviews/impl-review.md` with the item-by-item result, stamped
   every `Decision:` field, and set the header verdict.

Outcome: **APPROVED**, 0 critical, 0 warnings, 1 non-blocking observation. F1, F2, F3, F4, F6, F7,
F8, F10 and F11 are fixed in code; F5 is closed by §17.2 with no code change, which is the correct
resolution because the shipped label never promises more than it reveals; F9 is half closed by
§17.4, and the strip's own accessible name is now the named, tested `stripAccessibleName` but is not
recorded in the specification. Notably, F4 was taken by the recommended option: the action row moved
into `PersonBlock`'s own children and the shared `LedgerEntry` was left byte-identical, so no other
section was disturbed.

## Delta review at 05ff614

Requested because three code commits landed after the APPROVED verdict: `1cef767` (the strip's
accessible name carries the year), `4753a52` (V3 tint decided at mutation time, V4 cross-month edit
focus, the Phase 5 compactness clause amended) and `a671ca0` (designer §18: future-year fragments,
the no-membership-range balance, the lifetime completeness sentence, `×N` after the disc).

1. Read `git diff 199247e..HEAD -- src/ plan.md design-spec.md` in full, plus `cmc-4-integrate.md`,
   `cmc-5-verify.md`, `s09-compactness.md` and `s09-browser-verification.md`.
2. Audited the two new projection helpers for accounting safety: both read the domain's charge
   reason, neither infers anything from a zero amount, neither produces money, and the never-summed
   and invariant suites are untouched and still pass.
3. Checked `highlightFor` at all nine call sites, including delete, edit and a move across a year,
   and confirmed `useSectionStatus` is byte-identical to the baseline.
4. Checked focus rule V4 in both branches plus the one-second heading fallback.
5. Checked `futureYearPayments` against §18.1 and its three tests.
6. Confirmed the no-membership-range branch is unreachable through the API
   (`validateActiveRanges` refuses an empty list, called on all three write paths) and that the Gil
   fixture does not contradict that: it is created with a range and the rows are deleted directly in
   the local disposable D1, which the script's own comment and `cmc-5-verify.md:118` both state.
7. Judged the amended compactness clause honest: it replaces a whole-page percentage bound that
   mixes in untouched sections with identity on the calendar's own figures plus an attribution rule,
   and `s09-compactness.md` accounts for the 183 pixel difference exactly as 80 plus 103.
8. Reconciled the unit count 351 to 350 to 354: `resolveHighlight`'s two record-lookup cases went
   with the function that had them, and four cases were added for the new helpers.
9. Re-ran the gates at `05ff614`: `npm run typecheck` clean across three projects, `npm run
   test:unit` 26 files and 354 cases passed.

Outcome: **APPROVED, extended to `05ff614`.** 0 critical, 0 warnings, 2 observations, 1 design
finding, nothing required before release. The observations are that
`evidence/runs/s09-browser-verification.md` still describes the pre-fix build in two rows, which
`cmc-5-verify.md:128` already requires a re-run for before Progress row 5.2 is ticked, and that this
delta was verified as code and unit tests rather than in a browser. The design finding is that §18.1
now names the year the reader is already on when a later year holding a payment is selected.

## Delta review at 650a14d

Requested after two further code commits: `eba7e43` (`loadFailure` in `subscriptionEdits.ts` and a
"load ever succeeded" ref in `SubscriptionDetail.tsx`, so a failed refresh keeps the records and
shows the alert beside them) and `83c010d` (`REFRESH_FAILURE`, the designer's §19 sentence).

1. Read `git diff 05ff614..HEAD -- src/` in full, plus `design-spec.md` §19 and `cmc-5-verify.md`.
2. Confirmed the signed-out handoff is tested first in `loadFailure`, ahead of the 409 branch and
   the keep-or-replace split, and is pinned with records both absent and present.
3. Confirmed the 409 no-owner path is unchanged and now reaches its screen whether or not records
   are already shown.
4. Confirmed the reload is all-or-nothing: one `Promise.all` of six reads, destructured, with the
   single `setState` only on full success, so no partial or mixed snapshot can render.
5. Traced whether the ref can strand the screen on the loading skeleton. It cannot at HEAD, but only
   because the screen is unmounted on every navigation and nothing re-triggers `load` from the
   `'error'` or `'no-owner'` screens. Recorded as observation 1, because the invariant is not local
   to `load`.
6. Confirmed the inspector stays consistent when a refresh fails mid-mutation: the write and the
   reload are separate awaits, the records do not change, and §19's wording is written so the true
   success sentence and the refresh alert do not contradict each other.
7. Re-ran the gates at `650a14d`: `npm run typecheck` clean across three projects, `npm run
   test:unit` 26 files and 359 cases passed. No server, migration or dependency change.

Outcome: **APPROVED, extended to `650a14d`.** 0 critical, 0 warnings, 3 observations, 1 design
finding, nothing required before release. The design finding is that §19's single sentence tells a
reader to check their connection even when the refresh was refused by the server, which the tests
pin deliberately, so it is the specification's choice to revisit rather than a code defect.

## Next action

Step 5.3 is closed at the release candidate `650a14d`. The change proceeds to the remainder of
Phase 5 and the designer's visual acceptance, then Phase 6 release and archive. The orchestrator
stamps `change.md` to `impl_reviewed`; the reviewer did not, having been scoped to the two files
below.

## Changed paths

- `context/changes/compact-member-calendar/reviews/impl-review.md` (new, then re-verification
  appended and decisions stamped)
- `context/checkpoints/cmc-5-impl-review.md` (new, then updated with the re-verification)
