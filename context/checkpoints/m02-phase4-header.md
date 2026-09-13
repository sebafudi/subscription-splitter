# Checkpoint: m02 phase 4 - the detail header, the edit panel and the deletion strip

- **Task**: phase 4 of change `subscription-management-and-date-inputs` (S-08; goals M02, M03)
- **Model**: Opus
- **Status**: complete; every automated Progress row of phase 4 is ticked, the manual rows are left
  for phase 5

## Actions

1. Committed the designer's uncommitted amendment to `design-delta.md` ("Ruling on an implementation
   question from phase 1") by explicit path and pushed it.
2. Read `10x-implement` and `10x-tdd` in full and applied their procedure date-free, as the earlier
   phases did: one feature commit per coherent step, gates before each row-claiming commit, Progress
   rows ticked with the closing SHA, no calendar dates anywhere in an authored file.
3. Implemented phase 4 as the delta and the plan specify.

## Changed paths

Client only. Nothing under `src/server/`, `src/domain/`, `migrations/` or `tests/` was touched.

- `src/client/api.ts` - `PatchSubscriptionInput`, `patchSubscription`, `deleteSubscription`, both
  through the existing `request()` helper
- `src/client/api.test.ts` (new) - the two functions against a stubbed `fetch`
- `src/client/screens/subscriptionEdits.ts` (new) - `firstMonthFloor`, `storedValues`,
  `subscriptionChanges`, `headerActions`, `currencyLocked`, `currencyLockHint`
- `src/client/screens/subscriptionEdits.test.ts` (new)
- `src/client/screens/SubscriptionForm.tsx` - imports the shared `firstMonthFloor` instead of holding
  its own copy; nothing else changed
- `src/client/components/SubscriptionSettings.tsx` (new) - the five-field edit form
- `src/client/screens/SubscriptionDetail.tsx` - action row, header status line, header alert, edit
  panel and page-level strip, plus `onUpdated` and `onDeleted`
- `src/client/App.tsx` - `setSelected(updated)` on a save; clears the object and raises the one-shot
  deletion signal
- `src/client/screens/Home.tsx` - consumes that signal once per mount into the heading-row status line
  and moves focus to the `h1`
- `src/client/components/ui/ConfirmStrip.tsx` - optional `consequence` and `busy`
- `src/client/components/ui/SectionAlert.tsx` - optional `action` slot and focusability
- `src/client/index.css` - `.detail-actions`, the stretch and spacing rules for the three header
  surfaces, `.confirm-consequence`, the mobile status-line drop, `.summary-label` at `--s-5`

## Commits

- `7d5b588` docs(s-08): designer ruling on the phase 1 lost-race sentence
- `54d3ff8` feat(s-08): edit and delete a subscription from its header

## Verification

At `54d3ff8`, before the commit:

| Gate | Result |
| --- | --- |
| `npm run typecheck` | clean, all three projects |
| `npm run test:unit` | 22 files, 260 tests, all passing |
| `npm run test:integration` | 13 files, 131 tests, all passing |
| `npm run build` | succeeded |

Re-run after the rebase onto `1c7f2ac`: typecheck clean, unit 22 files / 262 tests, integration 13
files / 131 tests, build succeeded. The two extra unit tests come from the concurrent server review,
not from this phase.

Automated Progress rows, checked directly:

- 4.4 `grep -rn "valueAsDate\|valueAsNumber" src/client/` returns nothing
- 4.16 `grep -rn "new Date(" src/client/` returns only `src/client/format.ts:16` and `:29`, and
  `subscriptionFieldLabels` is the only subscription label map in `fieldLabels.ts`
- 4.5 the commit's file list is entirely under `src/client/`
- 4.6 `PriceHistory.tsx`, `MemberList.tsx`, `PaymentList.tsx` and `RecurringSection.tsx` are not in
  the commit

## Unresolved issues

- The working tree carries uncommitted edits to `src/server/db/subscriptions.ts`,
  `src/server/db/subscriptions.test.ts`, `tests/integration/subscriptions.test.ts` and
  `tests/integration/subscription-deletion.test.ts` from the concurrent phase 1 server review. They
  were left untouched and outside every commit here. One unit run failed transiently while those
  files were mid-write and passed on three subsequent runs.
- Two contracts in the plan were narrower than the delta they implement, so the implementation
  follows the delta:
  - plan change 5 gives `ConfirmStrip` "one optional prop", but the delta's strip also takes
    `aria-busy` with both buttons disabled while the request is in flight. A second optional prop
    `busy` carries that. All four existing call sites still pass neither.
  - plan change 6 puts the header alert's "All subscriptions" beside Dismiss and moves focus to the
    alert, neither of which `SectionAlert` could do. It gained an optional `action` slot and an
    optional `ref` with `tabIndex={-1}`, mirroring `FormAlert`. Its six other call sites pass neither
    and render identically.

## Designer questions

Neither blocks; both are implemented as recommended and can be reversed by a ruling.

1. **The gap above "Owed to you now" moves from `--s-6` to `--s-5`.** The delta places `--s-5` below
   the action row before "Owed to you now", and that gap is `.summary-label`'s own `margin-top`,
   which was `--s-6`. Lowering it changes the spacing in every state of the detail screen, including
   the skeleton. **Recommended answer**: accept. The action row is present in all four states, so one
   value keeps the screen consistent, and the delta names `--s-5` for exactly this gap.

2. **The action row's container stays mounted while the panel or the strip is open.** The delta says
   the action row is absent while either is open, and also that the header status line is permanently
   mounted at the right end of that row. Both hold at once only if the buttons go and the row's
   container with the status line stays, which is what 3.5 already describes for a section heading
   row ("the button is absent and the status line stands alone"). **Recommended answer**: accept. The
   cost is that the empty row still contributes `--s-3` above the panel.

## Exact next action

Phase 5: browser verification and the acceptance pass. The ten manual rows of phase 4 (4.7 to 4.15
and 4.17) are unticked and are verified there, together with phase 5's own rows. Deletion is
exercised only on a synthetic disposable subscription created for the purpose.
