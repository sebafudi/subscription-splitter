# Checkpoint: m04-phase2-controls

- Task id: `m04-phase2-controls`
- Model: Opus
- Status: complete
- Scope: phase 2 of change `subscription-management-and-date-inputs` (roadmap S-08, parent goal M04),
  the shared client calendar controls. Nothing under `src/server/`, `src/domain/`, `migrations/`,
  `tests/`, `context/foundation/`, `context/STATUS.md`, `GOALS.md` or `evidence/` was touched.
  Phase 1 is being implemented concurrently by another agent in the same working tree.

## What was done

Added the two shared controls the delta's amended 3.4 specifies, with every decision they make pulled
into a plain `.ts` module so the unit suite covers it in the `node` environment with no DOM and no new
dependency.

`src/client/components/ui/monthControl.ts` exports three functions:

- `supportsMonthInput(createElement?)` runs both probes from the delta: `type` reads back as `month`,
  and assigning `value = 'not-a-month'` reads back `''`. The element factory defaults to
  `() => document.createElement('input')`. The `typeof document === 'undefined'` guard covers the
  default factory alone, so an injected stub still runs both probes where `document` does not exist;
  guarding unconditionally would have made the stub branches unreachable in the unit pool, which is the
  suite F1 exists to make runnable.
- `monthControlBranch(supportsPicker)` returns `'input' | 'select'`, so which element renders is a
  unit-tested decision and only the JSX is left to the browser (F9).
- `monthOptionRange({ min, max, value, currentMonth })` returns the ordered option list: from `min` or
  January ten years before the current year, to `max` or December of the year after the current one,
  widened at either end to keep the held value selectable. It takes the current month as a string, so
  the clock read stays at the caller and the function is pure. No `Date` is constructed anywhere in the
  module.

`src/client/components/ui/MonthField.tsx` memoises detection once per page load and renders the branch
`monthControlBranch` selects. The picker branch is `<input type="month">` with `autoComplete="off"` and
the `min` when given, and no `inputMode`, `pattern` or `placeholder`. The select branch builds its
options through `monthOptionRange` with `currentMonth(timeZone)` from `src/domain/months.ts`, labelled
through `formatMonth` in the given locale; a required field leads with
`<option value="" disabled>Choose a month</option>`, an optional field with an empty-valued option
carrying the caller's empty label. The change handler always emits a string, `''` when cleared (F6).
A `supportsPicker` prop overrides detection, which is the seam phase 5 uses to force a branch for a
capture.

`src/client/components/ui/DateField.tsx` is `<input type="date">` with the same attribute discipline
and no fallback branch.

`src/client/index.css` gained the two rules the delta names, directly under the existing `select` rule:
right padding `--s-2` on `input[type='date']` and `input[type='month']`, and
`::-webkit-calendar-picker-indicator { cursor: pointer }` on both. The heights are unchanged; the
`min-height` exception stays unexercised until the phase 5 measurement says otherwise. The dark theme
comes through the existing `color-scheme: light dark`.

`src/client/components/ui/Field.tsx` keeps its API exactly; only the hint-slot doc comment was
rewritten, because the ISO format hints it used to describe are removed by this change.

`src/client/components/ui/monthControl.test.ts` covers, in 14 cases: both probes passing, type
reflection failing alone, value sanitisation failing alone, the no-DOM guard; both branch results; the
option range with no bounds, with a `min`, with a `max`, stretched below `min` and above `max` by the
held value, ascending with no gap, the value round-tripping as the same string, and a case that
replaces `globalThis.Date` with a construct-trapping proxy to prove the range is built without a
`Date`.

## Changed paths

- `src/client/components/ui/monthControl.ts` (new)
- `src/client/components/ui/monthControl.test.ts` (new)
- `src/client/components/ui/MonthField.tsx` (new)
- `src/client/components/ui/DateField.tsx` (new)
- `src/client/components/ui/Field.tsx` (doc comment only)
- `src/client/index.css`
- `context/changes/subscription-management-and-date-inputs/plan.md` (Progress rows 2.1 to 2.7)
- `context/checkpoints/m04-phase2-controls.md` (this file)

## Verification

Run twice. In the shared working tree the unit and integration suites each carried one failure from
phase 1's in-flight edit to `src/server/validation/subscriptions.ts`, which now accepts `start_month`
and so falsifies the two tests that assert the old refusal
(`src/server/validation/subscriptions.test.ts` and `tests/integration/members.test.ts`). Those two
tests are phase 1's to update and no phase 2 file is on their path, so the gates were re-run in a
detached worktree at `34bcf0f` carrying the phase 2 files alone:

| Gate | Result |
| --- | --- |
| `npm run typecheck` | passes, all three projects, no output |
| `npm run test:unit` | 19 files, 228 tests, all passing |
| `npm run test:unit` (new file alone) | 1 file, 14 tests, all passing |
| `npm run test:integration` | 12 files, 119 tests, all passing |
| `npm run build` | succeeds |
| `grep -rn "valueAsDate\|valueAsNumber" src/client/` | no match |
| `grep -rn "new Date(" src/client/` | only `src/client/format.ts:16` and `:29` |

In the shared tree the same run reports unit 18 of 19 files and 227 of 228 tests, integration 11 of 12
files and 118 of 119 tests, with the one failure in each being the phase 1 test named above.

## Progress rows ticked

2.1 through 2.7, in `context/changes/subscription-management-and-date-inputs/plan.md`. Row 2.8 is a
manual row and is left pending for the human check that the rendered app is unchanged; no call site
references either control yet, which is phase 3's work.

## Designer questions

None. Every appearance and behaviour detail phase 2 needed was already settled in the delta's amended
3.4, its Bounds paragraph and its copy table.

## Unresolved issues

- The locale the fallback passes to `formatMonth` is the caller's. The delta's rule that the New
  subscription form falls back to the default locale when the one it holds is not valid is phase 3
  change 3 and is deliberately not implemented here.
- The `min-height` exception for the two native types is not applied, because no measurement exists
  yet. Phase 5 measures and records.

## Next action

Phase 3: migrate the eight calendar call sites to `MonthField` and `DateField`, move the create form's
label to "First month" and set the paired and server-rule `min` values per the delta's Bounds
paragraph.

---

# Phase 3: the eight calendar call sites

- Task id: `m04-phase2-controls`, continued
- Model: Opus
- Status: complete, with one scope deviation recorded below

## The scope deviation, stated first

Phase 3 could not be done inside the file list it was given. Five of the eight call sites need the
subscription's `timeZone` and `startMonth`, and neither value reaches them: `Summary` carries
`currentMonth`, `currency` and `locale` only, and both missing values live on the `subscription`
object held in `src/client/screens/SubscriptionDetail.tsx`. The plan's phase 3 file list names only
the six leaf files and understates this as well.

`SubscriptionDetail.tsx` therefore changed, against the instruction not to touch it. The edit is eight
added lines and no deleted line, all inside the section JSX at `:225-275`, passing
`subscription.startMonth` and `subscription.timeZone` down. The phase 4 header work sits well above
it. The team lead was told before the edit was made and can have it reverted.

## What was done

Seven month fields render `MonthField` and the payment date renders `DateField`, each inside its
existing `Field`. Removed from every one: `inputMode`, `pattern`, `placeholder` and the ISO hint.
Kept: `required` where it stood, `autoComplete="off"` through the controls themselves, and the
semantic hints, which also become the empty option's label in the fallback branch. No state shape,
submit body or normalisation moved: `MemberForm` still holds `string | null` and `ScheduleForm` still
holds `''`, both normalising to `null` at submit, and the control's handler emits a string into both.

Bounds, per the delta's amended Bounds paragraph:

| Field | `min` |
| --- | --- |
| Participant From | the subscription first month |
| Participant To | the From value, through `pairedMonthMin` |
| Price Effective from | the subscription first month |
| Skipped month | the subscription first month |
| Standing order First month | the subscription first month |
| Standing order Last month | the First month value, through `pairedMonthMin` |
| Payment date | the first month with `-01` appended |
| Subscription first month, create form | January ten years before the current year |

No `max` and no `step` anywhere.

`start_month` is "First month" on both the create form's label and the single entry in
`src/client/components/ui/fieldLabels.ts`. No other entry in that file moved, so phase 4 can add the
edit panel's labels without a conflict.

Three helpers joined `monthControl.ts` rather than being written inline in a `.tsx`, where the unit
include `src/**/*.test.ts` would never have collected them:

- `pairedMonthMin(partner)` returns the partner's value only while it is a complete month, so clearing
  the partner releases the bound instead of freezing it, which is what manual row 3.10 checks.
- `usableLocale(locale, fallback)` and `usableTimeZone(timeZone, fallback)` carry the delta's rule that
  the create form falls back to its defaults when the value the organizer is still typing is not one
  the runtime can read. Without them a half-typed time zone throws out of `currentMonth` and a
  half-typed locale throws out of the formatter.

`ScheduleForm` already held a local `startMonth` state, so its new prop is `subscriptionStartMonth`.

## Changed paths

- `src/client/screens/SubscriptionForm.tsx`, `src/client/screens/SubscriptionDetail.tsx`
- `src/client/components/MemberForm.tsx`, `MemberList.tsx`, `PriceHistory.tsx`, `BreakMonths.tsx`,
  `ScheduleForm.tsx`, `RecurringSection.tsx`, `PaymentForm.tsx`, `PaymentList.tsx`
- `src/client/components/ui/fieldLabels.ts`, `monthControl.ts`, `monthControl.test.ts`
- `context/changes/subscription-management-and-date-inputs/plan.md`, this checkpoint

## Verification

The shared working tree carries phase 1's in-flight work across `src/server/` and `tests/`, so every
count below comes from a detached worktree at `54b6d8c` holding the phase 3 client files alone.

| Gate | Result |
| --- | --- |
| `npm run typecheck` | passes, all three projects |
| `npm run test:unit` | 19 files, 235 tests, all passing |
| `npm run test:integration` | 12 files, 119 tests, all passing |
| `npm run build` | succeeds |
| `grep -rn 'inputMode="numeric"' src/client/` | no match |
| `grep -rn 'pattern="' src/client/` | no match |
| `grep -rn "Month as YYYY-MM\|Date as YYYY-MM-DD" src/client/` | no match |
| `grep -rn "Start month" src/client/` | no match |
| `MonthField` and `DateField` render sites | seven and one |
| `git status` under `src/server/`, `src/domain/`, `migrations/`, `tests/` | clean |

Phase 1 landed at `7b2e56f` while this was being committed, so the gates were run once more in the
shared tree with both phases present and everything clean:

| Gate | Result |
| --- | --- |
| `npm run typecheck` | passes, all three projects |
| `npm run test:unit` | 20 files, 243 tests, all passing |
| `npm run test:integration` | 13 files, 131 tests, all passing |
| `npm run build` | succeeds |

That is the authoritative run; the isolated worktree above was only needed while phase 1 was in
flight.

## Progress rows ticked

3.1 through 3.7 and 3.9, each with `75906dd`. Rows 3.8 and 3.10 are manual and stay pending.

## Designer questions

None.

## Next action

Phase 4: the detail header, the edit panel and the deletion strip. It owns `SubscriptionDetail.tsx`
from here; the phase 3 edit there is committed, so there is nothing uncommitted to collide with.
