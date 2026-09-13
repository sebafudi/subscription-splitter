# Implementation plan: Subscription management and native calendar inputs

## Overview

Give the owner two things the shipped ledger never gave them - editing the subscription record and
deleting it with its whole ledger - and replace every plain-text calendar field in the client with a
real browser control. This is roadmap item S-08.

`context/changes/subscription-management-and-date-inputs/design-delta.md` is the design authority for
everything a person sees and for the four product rules the server enforces: the currency lock, the
first-month bounds, the owner opening-range shift and the deletion scope. `research.md` is the
authority for what the code does today. `frame.md` tested the assumptions both rest on and raised two
questions for the designer; both are answered here by the recommendation the frame gives, marked
**[frame Q1]** and **[frame Q2]** where they land, and both are reversible by a designer ruling
without moving a phase boundary.

The change adds one route, extends another, adds two shared client controls, migrates eight call
sites, rewrites the subscription detail header, and updates the foundation documents. It adds no
migration, changes no accounting rule, changes no wire format, and touches nothing under
`src/domain/` except by reuse.

## Current state analysis

`src/server/routes/subscriptions.ts` mounts four routes and applies `requireSession` twice, once for
the collection and once for the subtree (`:8-9`). `PATCH /api/subscriptions/:id` accepts `name`,
`currency`, `locale` and `time_zone` (`src/server/validation/subscriptions.ts:51-55`), merges them
over the stored row (`src/server/db/subscriptions.ts:108-121`) and returns 200. `start_month` is
excluded, with the reason written into the file at `src/server/validation/subscriptions.ts:43-50` and
again at `src/server/db/subscriptions.ts:57-59`. Both of those comments become false in this change.
There is no DELETE verb anywhere on the resource.

Ownership is a SQL predicate, never a separate read. `get` is
`select * from subscriptions where id = ? and user_id = ?` (`src/server/db/subscriptions.ts:91-97`),
documented as returning null for a foreign or missing id indistinguishably, and the route maps null to
404 (`:30-31`, `:43`). Child ownership is the same idea as a subquery, in `members.ts:32-34`,
`payments.ts:19-27` and `recurring.ts:31-38`. Atomicity is `db.batch()` and only `db.batch()`, with
the constraint stated in the code at `src/server/db/recurring.ts:211-213`.

Eight calendar inputs exist in the client and not one declares a `type`
(research.md section 5). `src/client/components/ui/Field.tsx` sets no type either; it is a render-prop
wrapper whose `ControlAttributes` is `{ id, 'aria-describedby'?, 'aria-invalid'? }` (`:4-8`), so a
caller may render any element and add any attribute. All seven forms in `src/client/` carry
`noValidate`. `src/client/index.css` fixes `height: 40px` with `padding: 0 var(--s-3)` at `:289-301`,
44px below 640px at `:455-471`, declares `color-scheme: light dark` at `:49-50`, and carries no
`input[type=` selector and no `::-webkit-calendar-picker-indicator` rule at all.

`src/client/api.ts` calls neither PATCH nor any delete; it exposes `listSubscriptions` (`:142`) and
`createSubscription` (`:146`). `src/client/screens/SubscriptionDetail.tsx:94-104` is a
`header.detail-head` holding a back button, an `h1` and a subtitle, with no action affordance.
`src/client/App.tsx:13` holds the whole selected subscription object and `:54-73` switches screens by
conditional render, so clearing the selection remounts `Home`, whose `useEffect(() => load(), [load])`
refetches the list. `SectionHeader` already sets `tabIndex={-1}` on every heading including Home's
`h1` (`src/client/components/ui/SectionHeader.tsx:49`), and Home already holds a heading-row status
line through `useSectionStatus()`.

### Key findings

- **No migration.** Every table and every foreign key this change reaches already exists, and each
  foreign key is `ON DELETE CASCADE` (`migrations/0002:9`, `0003:8,19`, `0004:14,21`, `0005:17`,
  `0006:18,30`). This change writes no seventh migration and no schema edit of any kind.
- **The delete is eight statements, deepest first, and every one is ownership-scoped.** Four child
  tables carry no `subscription_id` and are reached by join. A foreign id makes every subquery empty,
  so nothing at all is deleted, and `meta.changes` on the final
  `delete from subscriptions where id = ? and user_id = ?` separates 204 from 404. Reading
  `meta.changes` off a batched statement is already the pattern at `src/server/db/members.ts:140-160`.
- **The declared cascades do not fight the explicit order.** Deepest-first leaves no orphan at any
  intermediate point, so the cascade fires on an empty set. There is no trigger and no
  `ON DELETE SET NULL` anywhere in `migrations/`, and `members_one_owner_idx`
  (`migrations/0003_members.sql:15`) is a partial UNIQUE index, which a delete cannot violate.
- **Every first-month rule must be checked in the route, never left to a `CHECK`.** A constraint
  violation inside `db.batch()` surfaces as a throw, not as the delta's named refusal sentence. This
  applies to `left_month >= joined_month` (`migrations/0003_members.sql:22`) and to both month GLOBs.
- **The owner's opening range is not an invariant after creation.** `PATCH /members/:memberId` accepts
  `active_ranges` for the owner too (`src/server/routes/members.ts:79-104`, applied at
  `src/server/db/members.ts:201-208`); only `is_owner` is unpatchable
  (`src/server/validation/members.ts:49-53`), and `validateActiveRanges` rejects only
  `joined_month < startMonth` (`src/domain/members.ts:38-40`). So the owner may already hold several
  ranges and the first may carry a `left_month`. The delta's shift rule is conditional for exactly
  this reason, and the shifted set needs revalidating. **[frame Q1]**
- **`min` can never raise a browser bubble.** All seven forms carry `noValidate` (`Login.tsx:110`,
  `SubscriptionForm.tsx:82`, `MemberForm.tsx:112`, `PriceHistory.tsx:278`, `BreakMonths.tsx:199`,
  `PaymentForm.tsx:125`, `ScheduleForm.tsx:121`). This answers the delta's open item in 3.4: the
  attribute is recorded here and changed nowhere. `min` narrows a picker and nothing else, exactly as
  the delta says.
- **Home already has what the deletion return needs.** The `h1` already carries `tabindex="-1"`
  through `SectionHeader`, and the heading-row status line already exists. What is missing is only a
  way for `App` to tell `Home` that a deletion just happened.
- **`ConfirmStrip` renders one sentence.** Its props are `question`, `confirmLabel`, `onConfirm`,
  `onKeep` (`src/client/components/ui/ConfirmStrip.tsx:3-11`), it focuses Keep on mount (`:23-25`) and
  routes a `stopPropagation`'d Escape to `onKeep` (`:27-31`). The delta's amended 3.10 adds a second
  sentence, so the component gains one optional prop and every existing call site is untouched.
- **Wire format is safe by construction.** Native controls expose `.value` as the same `YYYY-MM` and
  `YYYY-MM-DD` strings. `valueAsDate` and `valueAsNumber` are the one trap and appear nowhere in this
  plan.

## What we are NOT doing

- **No migration, no schema change, no new table, no new column.**
- **No accounting change.** Nothing under `src/domain/` is edited. `validateActiveRanges` and
  `currentMonth` are called, not changed.
- **No JavaScript date-picker library and no new dependency.** The accepted specification's preamble
  keeps native elements native (`design-spec.md:15-16`).
- **No edit to the archived `context/archive/visual-redesign/design-spec.md`.** The delta is the
  standing amendment, following the S-07 precedent.
- **No `owner_name` on the subscription edit form.** It is the owner participant's `members.name` and
  stays on the participant row (`src/server/routes/members.ts:79`).
- **No router and no URL handling.** Navigation stays the single piece of state in `App.tsx:13`.
- **No confirmation gate on the currency.** The delta refuses instead, and the frame agrees.
- **No deployment, no `wrangler secret put`, no release evidence refresh and no course upload.** Those
  are a later goal.
- **No edits to `context/STATUS.md`, `GOALS.md`, `evidence/index.md` or `evidence/work-log.md`.** The
  status step owns those.
- **No deletion exercised on demo or user data.** Stated again under Risks, because it is the one
  irreversible action in the change.

## Implementation approach

Server first and controls second, in parallel, because they share no file. Call-site migration third,
because it needs the controls. The detail screen fourth, because it needs both the routes and the
controls. A browser pass fifth, because no test in this repository reads client markup and a green
suite proves nothing about a picker. Foundation documents last, so they describe what landed rather
than what was intended.

Each phase ends on its own commit. Phases 1, 2, 3 and 6 are gated by commands. Phases 4 and 5 are
gated by a browser as well.

### Ownership of shared files

One owner per shared file within a phase, so two implementers never hold the same file.

| File | Phase that owns it |
| --- | --- |
| `src/client/index.css` | phase 2 for the control box; phase 4 for the header action row and the page-level strip. Never both at once |
| `src/client/api.ts` | phase 4 only |
| `src/client/App.tsx` | phase 4 only |
| `src/server/db/subscriptions.ts`, `src/server/routes/subscriptions.ts`, `src/server/validation/subscriptions.ts` | phase 1 only |
| `tests/integration/subscriptions.test.ts` | phase 1 only |
| `src/client/components/ui/ConfirmStrip.tsx` | phase 4 only |

Phases 1 and 2 may run in parallel. Phase 3 depends on 2. Phase 4 depends on 1 and 2 and should not
start before phase 3 lands, because both touch form files. Phase 5 depends on 3 and 4. Phase 6 depends
on 1 through 5.

### Gate commands

From `package.json` and `AGENTS.md`:

| Gate | Command |
| --- | --- |
| Types, all three projects | `npm run typecheck` |
| Unit | `npm run test:unit` |
| Integration | `npm run test:integration` |
| Both suites | `npm test` |
| Production build | `npm run build` |

`tools/reviewer/` is an independent package that neither root gate covers and that this change does
not touch.

### Browser tooling

There is no Playwright, Puppeteer or other browser-automation dependency in `package.json` or
`tools/reviewer/package.json` (research.md section 9). Verification follows the practice this project
already used for its releases and recorded at `evidence/runs/release-4.md:219-227` and `:278-285`: a
throwaway Chrome with its own empty profile driven over the DevTools protocol through the
chrome-devtools tools, captures taken per window id so nothing else on the machine is in frame, and
screenshots written into `evidence/screenshots/` under a named slot. Safari has no such protocol
available here and is driven by hand, which is the only way to verify the month fallback locally,
because Safari is the fallback browser installed on this machine. Firefox and Edge are not installed
and the two mobile browsers cannot be reached; all four are reported from published support data and
marked unverified, per the delta's answer 11.

## Critical implementation details

### The first-month check is one read and one batch

Moving `start_month` **earlier** needs no check at all: every dependent rule is `>=`
(`src/domain/members.ts:38`, `src/server/routes/prices.ts:42`, `break-months.ts:40`,
`recurring.ts:67,135`), so widening the window satisfies all of them. Moving it **later** needs the
minimums the delta names, read for this subscription in one statement set before the write:

- `min(active_ranges.joined_month)` over the subscription's members, **excluding** the owner's opening
  range when that range's `joined_month` equals the old `start_month`
- `min(price_history.effective_from)`
- `min(break_months.month)`
- `min(substr(payments.date, 1, 7))` over the subscription's members
- `min(recurring_schedules.start_month)` over the subscription's members

The refusal names the binding month and the kind, in the delta's tie order. A sixth kind is added for
the owner's own next range. **[frame Q1]**

### The owner opening-range shift, and the sixth refusal kind [frame Q1]

When the owner's opening range has `joined_month` equal to the old `start_month`, it moves to the new
`start_month` in the same batch and is excluded from the minimum above. Before the batch runs, the
route builds the owner's range set as it would be after the shift and passes it through
`validateActiveRanges` (`src/domain/members.ts:29-56`). Two refusals come out of that, both as 400
with field `start_month`:

- the shifted range's own `left_month` would fall before its new `joined_month` - the delta's sentence,
  `start_month cannot be later than YYYY-MM because your own first active range ends then`
- the shifted range would reach or pass the owner's **next** range - a sixth kind, ordered last,
  `start_month cannot be later than YYYY-MM because your own next active range starts then`

Neither is left to the database. A `CHECK` violation inside `db.batch()` throws rather than producing
a refusal sentence, which is why every rule is pre-checked. If the designer rules differently on the
sixth kind, only the sentence and its test change; no phase boundary moves.

### The delete is eight statements in one batch, deepest first

In order: `recurring_exceptions`, `recurring_schedules`, `payments`, `active_ranges`, `members`,
`price_history`, `break_months`, `subscriptions`. Each child statement is scoped by a subquery joining
up to `subscriptions s` with `s.id = ? and s.user_id = ?`, in the established shape of
`src/server/db/members.ts:32-34`. The final statement is
`delete from subscriptions where id = ? and user_id = ?` and its `meta.changes` decides 204 from 404.
A foreign or unknown id therefore deletes nothing anywhere and answers the existing non-disclosing
404; a request with no session is answered 401 first by `requireSession`.

### Detection runs once per page load and is injectable

Create an `input`, set `type = "month"`, and require **both** that `type` reads back `"month"` **and**
that assigning `value = "not-a-month"` reads back `""`. Only a browser passing both gets the native
month input. The function is injectable so unit tests cover both branches and so phase 5 can force
either branch to capture it.

The probes test the month **value sanitisation algorithm**, not picker rendering, and the two are
correlated by browser rather than by specification. That residual is a named gate, not an assumption:
row 5.4 verifies in Safari that the fallback select is what actually renders. If Safari passes both
probes and still shows no picker, the fix is a third condition in the same injectable function and the
measurement is recorded; nothing else in the design moves.

---

## Phase 1: Server - editable first month and the delete verb

### Overview

Extend `PATCH /api/subscriptions/:id` with `start_month`, the currency lock and the first-month rules,
and add `DELETE /api/subscriptions/:id` as one ordered batch over eight tables. Rewrite the two code
comments that this makes false. Independent of phase 2.

### Required changes

#### 1. The patch schema

**File**: `src/server/validation/subscriptions.ts`

**Purpose**: accept `start_month` on patch, and describe how the field works now rather than why it
could not move.

**Contract**: `patchSubscriptionSchema` gains `start_month` reusing the existing month regex at
`:25-27`. The schema stays `.strict()` and keeps its `.refine` rejecting an empty body (`:53-55`). The
comment at `:43-50` is rewritten to state that `start_month` is patchable, that moving it earlier is
always admissible, and that moving it later is bounded by the dependent-record minimums checked in
`src/server/db/subscriptions.ts`. It describes how it works now; it does not narrate the change.

#### 2. The patch write and its rules

**File**: `src/server/db/subscriptions.ts`

**Purpose**: enforce the currency lock and the first-month bounds, and perform the settings update and
any owner opening-range shift as one write.

**Contract**: the existing merge-over-stored-row shape at `:108-121` is kept and extended. Before the
write: refuse a different `currency` when `price_history`, `payments` or `recurring_schedules` holds
any row for this subscription, with field `currency` and the delta's sentence; for a later
`start_month`, read the five minimums, apply the owner opening-range exclusion, and run the prospective
owner range set through `validateActiveRanges` from `src/domain/members.ts`. The write is one
`db.batch` holding the subscription update and, where it applies, the owner opening-range update. The
comment at `:57-59` is rewritten to describe the owner opening range as it now behaves: created at the
first month, and moved with it when the first month moves and the range still sits there.

#### 3. The delete repository function

**File**: `src/server/db/subscriptions.ts`

**Purpose**: remove a subscription and everything reachable from it as one write, or nothing.

**Contract**: one exported function taking the subscription id and the user id, issuing exactly one
`db.batch` of the eight statements in the order above, each child statement scoped by a subquery up to
`subscriptions s` carrying both `s.id` and `s.user_id`, and returning whether the final statement
changed a row. The ownership predicate stays inside the statements; no separate read decides it.

#### 4. The routes

**File**: `src/server/routes/subscriptions.ts`

**Purpose**: expose the extended patch and the new verb with this resource's existing error contract.

**Contract**: `PATCH /api/subscriptions/:id` keeps 200, 400 `{ error, field }`, 404 and 401, and gains
the two refusal families above. `DELETE /api/subscriptions/:id` is added under the same
`requireSession` subtree: 204 with no body on success, 404 for a foreign or unknown id, 401 with no
session. No `?confirm=true` gate: the delta puts the confirmation in the client.

#### 5. Unit tests for the schema

**File**: `src/server/validation/subscriptions.test.ts`

**Purpose**: pin the patch schema's new shape.

**Contract**: cases for a valid `start_month` accepted, a malformed one rejected, an unknown key still
rejected by `.strict()`, and an empty body still rejected by the `.refine`.

#### 6. Integration tests for the extended patch and the new verb

**File**: `tests/integration/subscriptions.test.ts`

**Purpose**: assert the edit rules and extend the existing per-verb cross-account shape.

**Contract**: the cross-account test at `:19-50` gains a DELETE leg asserting 404 from account B. New
cases: each of the five settings patched and read back; a currency change accepted while no amount
exists; a currency change refused once a price, a payment or a standing order exists, with field
`currency`; a first month moved earlier accepted; a first month moved later up to the earliest
dependent month accepted; a first month moved past it refused, once per kind, each naming the binding
month; the owner opening range moved with the first month when it sat there; the owner's `left_month`
case refused; the owner's next-range case refused **[frame Q1]**; an unauthenticated patch and an
unauthenticated delete both 401.

#### 7. Integration tests for deletion

**File**: `tests/integration/subscription-deletion.test.ts` (new)

**Purpose**: prove the delete reaches everything, touches nothing else, and is one write.

**Contract**: a fixture that builds one subscription holding at least one row of every child kind -
members, active ranges, prices, break months, payments, standing orders and standing-order exceptions -
then a delete returning 204 and a row count of zero in all eight tables. Preservation cases in the same
file: another account's subscription and every one of its child rows survive, and the same user's
second subscription and all of its child rows survive, per the existing guidance at
`context/foundation/test-plan.md:195`. Foreign and unknown ids answer 404 and leave every row in place.
A second delete of the same id answers 404. Atomicity: build the same statement list, append one
statement guaranteed to fail - the cheapest is a duplicate composite primary key on `break_months`
(`migrations/0004_prices_and_breaks.sql:23`) - run it as one batch, and assert every row still stands.
That case asserts the platform behaviour the production path relies on; it is named as such in the
file, and a second assertion pins that the production path issues exactly one batch.

This file takes client-address prefix `10.9.0.x`, and the allocation comment at
`tests/integration/accounts.ts:12-21` is extended with it.

### Success criteria

#### Automated

- Typecheck passes across all three projects: `npm run typecheck`
- The unit suite passes, including the four new schema cases: `npm run test:unit`
- The integration suite passes, including the new deletion file: `npm run test:integration`
- The production build succeeds: `npm run build`
- Nothing under `src/client/`, `src/domain/` or `migrations/` has changed: `git diff --stat` is empty
  for those paths
- `grep -rn "start_month cannot move\|cannot be changed" src/server/` returns nothing, confirming both
  falsified comments are gone

#### Manual

- Both rewritten comments read as descriptions of how the code works now, with no narration of what
  changed
- The deletion test file states in its own words that the appended failing statement is a platform
  probe rather than a production path

---

## Phase 2: Shared client calendar controls

### Overview

Add the two controls the rest of the client will use, with the detection, the option range and the CSS
the delta specifies. Independent of phase 1; nothing else depends on this phase's CSS.

### Required changes

#### 1. The detection and option-range helpers

**File**: `src/client/components/ui/monthControl.ts` (new)

**Purpose**: hold the two pure pieces the controls need, so both branches are unit-testable without a
browser.

**Contract**: a detection function running the two probes and returning a boolean, exported so it can
be injected; and a function producing the ordered option list for the fallback from a `min`, a `max`,
a current value and the current month, applying the delta's rule - from `min` when given, otherwise
January ten years before the current year; to `max` when given, otherwise December of the year after
the current one; always extended to include the current value. The current month comes from
`currentMonth` in `src/domain/months.ts`, the one clock read this codebase permits. No `Date` object is
built from any field value anywhere in this file.

#### 2. The month control

**File**: `src/client/components/ui/MonthField.tsx` (new)

**Purpose**: one control that renders a native month input where a picker exists and a native select of
months where it does not.

**Contract**: takes the `ControlAttributes` from `Field`, a `YYYY-MM` value or `null`, a change handler
receiving a `YYYY-MM` string or `null`, `required`, an optional `min`, the subscription locale and time
zone for labelling, and an optional detection override defaulting to the shared one. The picker branch
renders `<input type="month">` with `autoComplete="off"`, the `min` when given, and no `inputMode`, no
`pattern` and no `placeholder`. The select branch renders a native `<select>` whose options are months
in ascending order with `YYYY-MM` values and labels from the month formatter of
`src/client/format.ts` in the given locale; a required field leads with
`<option value="" disabled>Choose a month</option>`, an optional field leads with an empty-valued
option carrying the field's empty meaning. Both branches read and write `.value` only. The control is
labelled by the surrounding `Field` through `htmlFor`, so it renders no label and no fieldset.

#### 3. The date control

**File**: `src/client/components/ui/DateField.tsx` (new)

**Purpose**: the day-precision control, which needs no fallback.

**Contract**: `<input type="date">` with the `ControlAttributes`, a `YYYY-MM-DD` value, a change handler
reading `.value`, `required`, an optional `min`, `autoComplete="off"`, and no `inputMode`, `pattern` or
`placeholder`.

#### 4. The control box

**File**: `src/client/index.css`

**Purpose**: keep the 3.4 box under a control that draws its own indicator.

**Contract**: rules for `input[type="date"]` and `input[type="month"]` setting the right padding to
`--s-2` so the indicator sits inside the box, and a `::-webkit-calendar-picker-indicator` rule setting
`cursor: pointer` and nothing else. `color-scheme: light dark` at `:49-50` already carries the dark
theme. The existing 40px and 44px heights are left as they are and measured in phase 5; if a measured
native control exceeds them in either verified browser, the height for these two types alone becomes
`min-height` at the same value, and the measurement is recorded in Progress.

#### 5. Unit tests

**File**: `src/client/components/ui/monthControl.test.ts` (new)

**Purpose**: cover both detection branches and the option-range rule without a browser.

**Contract**: detection returning true when both probes pass and false when either fails, each fault
injected separately; the option range with no `min` and no `max`; with a `min`; with a `max`; with a
current value outside both, asserting the range is extended to include it; option values in ascending
`YYYY-MM` order with no gap; a `null` value producing the empty option as the selected one; and a
round-trip proving a value in is the same string out, with no `Date` anywhere in the path.

### Success criteria

#### Automated

- Typecheck passes across all three projects: `npm run typecheck`
- The unit suite passes, including the new control tests: `npm run test:unit`
- The integration suite is unchanged and passes: `npm run test:integration`
- The production build succeeds: `npm run build`
- `grep -rn "valueAsDate\|valueAsNumber" src/client/` returns nothing
- `grep -rn "new Date(" src/client/components/ui/` returns nothing
- Nothing under `src/server/`, `src/domain/`, `migrations/` or `tests/` has changed

#### Manual

- The two new controls are not yet referenced by any call site, so the rendered app is unchanged

---

## Phase 3: Migrate the eight calendar call sites

### Overview

Replace every plain-text calendar input with the phase 2 controls, removing the ISO hints and the
text-input attributes and adding `min` where a server rule exists. Depends on phase 2.

### Required changes

#### 1. The seven month fields and the one date field

**Files**: `src/client/screens/SubscriptionForm.tsx` (`:143`),
`src/client/components/MemberForm.tsx` (`:142` and `:164`),
`src/client/components/PriceHistory.tsx` (`:292`), `src/client/components/BreakMonths.tsx` (`:212`),
`src/client/components/ScheduleForm.tsx` (`:172` and `:193`),
`src/client/components/PaymentForm.tsx` (`:156`)

**Purpose**: give every calendar value a real control while keeping every wire value, every state
shape and every server rule exactly as they are.

**Contract**: each of the seven month fields renders `MonthField` inside its existing `Field`; the
payment date renders `DateField`. Removed from every one: `inputMode`, `pattern`, `placeholder` and
the ISO hint ("Month as YYYY-MM, like 2026-01", "Date as YYYY-MM-DD"). Kept: `autoComplete="off"`,
`required` where it is there today, and the semantic hints "Leave empty while still active" and "Leave
empty while it is still running", which become the empty option's label in the select branch as well.
`min` is added where a server lower-bound rule exists: the subscription first month on participant
From, price Effective from, skipped month and standing-order First month; the first day of the first
month on the payment date. No `max`, no `step`. Submit-time normalisation is unchanged: `MemberForm`
keeps `string | null` and `ScheduleForm` keeps `''`, both normalising to `null`, and a cleared native
control yields `''`, which both already handle.

The subscription create form's First month field takes no `min` and no `max`, and takes its locale and
time zone from the values the form currently holds, falling back to the defaults when they are not
valid, per the delta.

#### 2. The field hint documentation

**File**: `src/client/components/ui/Field.tsx`

**Purpose**: the docblock at `:14` names the hint slot as the home of the ISO form of a month or date,
which is no longer true.

**Contract**: that sentence is rewritten to describe the hint slot as it works now - the field's
semantic guidance, with the format carried by the control itself. No behaviour change; `Field` itself
is not modified.

### Success criteria

#### Automated

- Typecheck passes across all three projects: `npm run typecheck`
- The whole suite passes: `npm test`
- The production build succeeds: `npm run build`
- `grep -rn 'inputMode="numeric"' src/client/` returns nothing
- `grep -rn 'pattern="' src/client/` returns nothing
- `grep -rn "Month as YYYY-MM\|Date as YYYY-MM-DD" src/client/` returns nothing
- Exactly eight call sites render `MonthField` or `DateField`:
  `grep -rn "MonthField\|DateField" src/client/screens src/client/components --include=*.tsx` lists
  them
- Nothing under `src/server/`, `src/domain/`, `migrations/` or `tests/` has changed

#### Manual

- Each of the eight fields still submits the same wire value it did before, checked once per field in
  a running app

---

## Phase 4: The detail header, the edit panel and the deletion strip

### Overview

Build the header action row, the edit panel with its pre-fill and change-only body, the page-level
deletion strip, the client API functions and the Home return. Depends on phases 1, 2 and 3.

### Required changes

#### 1. The client API functions

**File**: `src/client/api.ts`

**Purpose**: reach the two routes phase 1 added.

**Contract**: `patchSubscription(id, changes)` returning the updated subscription, and
`deleteSubscription(id)` returning nothing on 204. Both go through the existing `request()` helper so
the 401 to `SignedOutError` and the `{ message, error, field }` to `ApiError` mapping at `:48-78` apply
unchanged.

#### 2. The change-only body

**File**: `src/client/screens/subscriptionEdits.ts` (new)

**Purpose**: the delta requires that a submit sends only the fields that differ and that a submit with
no differences sends nothing and closes the panel as if cancelled. The PATCH route refuses an empty
body, and a no-op must not report "Changes saved".

**Contract**: a pure function taking the stored subscription and the form values and returning the
changed subset, or null when nothing differs. Unit-tested beside the file.

#### 3. The edit panel

**File**: `src/client/components/SubscriptionSettings.tsx` (new)

**Purpose**: the five-field form the delta specifies, inside the existing `DisclosurePanel` and
`Field` machinery.

**Contract**: fields in the delta's order - Name (span, text, required), Currency and Locale as a
declared pair, Time zone (span), First month (span, `MonthField`, no `min`, no `max`) - each with the
delta's hint. Currency is `disabled` when the loaded detail holds at least one price, payment or
standing order, with the lock sentence as its `aria-describedby` text. Pre-filled from the held
subscription object. Buttons `[Save changes] [Cancel]`. Cancel and Escape discard and return focus to
"Edit subscription". Field errors and whole-form errors follow the existing 3.8 machinery, using the
display map added below. On a refused first month the panel stays open with the entered values.

#### 4. The display map

**File**: `src/client/components/ui/fieldLabels.ts`

**Purpose**: the refusal transform needs this form's wire names.

**Contract**: one more map - `name` to "Name", `currency` to "Currency", `locale` to "Locale",
`time_zone` to "Time zone", `start_month` to "First month" - registered the way the existing six are
at `:9-48`, so `labelFor` and `messageWithLabel` resolve it with no other change.

#### 5. The second sentence on the confirmation strip

**File**: `src/client/components/ui/ConfirmStrip.tsx`

**Purpose**: the delta's amended 3.10 allows one consequence sentence under the question, used only
here.

**Contract**: one optional prop rendering a `--t-small` `--ink` line under the question. All four
existing call sites pass nothing and are not edited. Focus-on-Keep, Escape-to-Keep and
blocks-nothing behaviour are unchanged.

#### 6. The detail header

**File**: `src/client/screens/SubscriptionDetail.tsx`

**Purpose**: the action row, the header status line, the header alert, the edit panel in place and the
page-level deletion strip.

**Contract**: inside the existing `header.detail-head` (`:94-104`), under the subtitle, an action row
of two link-variant buttons, "Edit subscription" and "Delete subscription", with the header status
line at its right end, permanently mounted and empty when idle. Both buttons render disabled during
the first load and enable when it settles. Only one of the panel and the strip is open at a time, and
the action row is absent while either is. A permanently mounted `role="alert"` under the action row
position carries a failed deletion, with "Dismiss", and adds an "All subscriptions" link on a 404.
After a saved edit the client replaces its held subscription object with the PATCH response, reloads
the detail data keeping the current figures on screen, closes the panel, returns focus to "Edit
subscription" and shows "Changes saved". The deletion strip carries the delta's two sentences and the
`[Delete subscription] [Keep]` buttons, takes `aria-busy` while the request is in flight with both
buttons disabled and the labels unchanged, and on success hands the deletion up to `App`.

#### 7. The Home return

**Files**: `src/client/App.tsx`, `src/client/screens/Home.tsx`

**Purpose**: a deletion leaves the detail, returns Home, refetches, focuses the `h1` and shows
"Subscription deleted".

**Contract**: `App` gains a deletion handler that clears the selected subscription so nothing deleted
is held anywhere in client state, and passes a one-shot signal to `Home`. `Home` consumes that signal
on mount into its existing `useSectionStatus().confirm` with the sentence "Subscription deleted" and
moves focus to its `h1`, which already carries `tabindex="-1"` through `SectionHeader`. Remounting
`Home` already refetches the list through `useEffect(() => load(), [load])`; no second fetch is added.

#### 8. Styling for the two new page-level surfaces

**File**: `src/client/index.css`

**Purpose**: the header action row and the page-level strip.

**Contract**: the action row under the subtitle with `--s-3` above and `--s-5` below, two link-variant
buttons at `--t-small` separated by `--s-3`, and the status line at the right end; below 640px the
buttons keep one line and the status line moves to its own line, left aligned, only when it has text.
The confirmation strip spans the content column at page level with the same appearance it has inside a
row, and its second sentence sits at `--t-small` colour `--ink`.

### Success criteria

#### Automated

- Typecheck passes across all three projects: `npm run typecheck`
- The whole suite passes, including the new change-only body tests: `npm test`
- The production build succeeds: `npm run build`
- `grep -rn "valueAsDate\|valueAsNumber" src/client/` returns nothing
- Nothing under `src/server/`, `src/domain/`, `migrations/` or `tests/` has changed
- The four existing `ConfirmStrip` call sites are unchanged: `git diff` shows no edit to
  `PriceHistory.tsx`, `MemberList.tsx`, `PaymentList.tsx` or `RecurringSection.tsx` in this phase

#### Manual

- The action row sits under the subtitle with the delta's spacing, and both buttons are disabled
  during the first load and enabled after it
- The edit panel opens in place of the action row, pre-filled, with focus on Name
- Currency is locked with its hint on a subscription that holds an amount, and free on one that holds
  none
- A submit with no differences closes the panel with no request and no status line
- A saved edit updates the title, the subtitle and the Home row, shows "Changes saved", and returns
  focus to "Edit subscription"
- A refused first month shows the field error under First month with the panel still open and the
  entered values kept
- The deletion strip shows both sentences, focuses Keep, and Escape and Keep both return focus to
  "Delete subscription"
- A real deletion of a synthetic disposable subscription returns Home with "Subscription deleted" and
  focus on the `h1`
- A failed deletion closes the strip, shows the header alert and moves focus to it

---

## Phase 5: Browser verification and the acceptance pass

### Overview

Measure what only a browser can settle and capture the delta's acceptance evidence. Depends on phases
3 and 4. No source change is expected in this phase; anything it forces is a named, separate edit.

### Required changes

#### 1. The verification run

**Files**: `evidence/runs/s08-manual-rows.md` (new), `evidence/runs/s08-gates.txt` (new)

**Purpose**: record every manual row with what was actually observed, and the gate output, following
the shape of `evidence/runs/google-sign-in-manual-rows.md` and `evidence/runs/google-sign-in-gates.txt`.

**Contract**: Chrome at 1280 and 390, light and dark, and again with reduced motion forced; Safari by
hand at both widths in both themes. Measured and recorded: the rendered height of a month input, a date
input and the fallback select in each browser at each width, against the 40px and 44px rule; and the
keyboard behaviour of the native controls - whether Enter inside the control with the picker closed
submits the panel's form, and whether Escape with the picker open is consumed by the browser and with
it closed reaches the panel as Cancel. A browser that differs is recorded, not worked around.

#### 2. The captures

**Files**: `evidence/screenshots/s08-*.png` (new)

**Purpose**: the seven items of the delta's amended section 11 acceptance checklist.

**Contract**: header action row placement and the disabled first-load state; the edit panel open and
pre-filled with Currency locked and its hint, a refused first month showing the field error with the
panel still open, "Changes saved" after a real save, and the Home row updated on return; the page-level
strip with both sentences, Keep returning focus, and Home after a real deletion showing "Subscription
deleted" with focus on the `h1`; in Chrome, one capture each of a month picker open and a date picker
open; in Safari, the select fallback open for a required and for an optional month field and the native
date picker for the payment date; the measured control heights; the focus ring on a month input, a date
input and the fallback select; and the reduced-motion state showing the panel and strip appearing
instantly. Captures are taken per window id so nothing else on the machine is in frame.

#### 3. The fallback gate

**Purpose**: settle the one thing reading cannot.

**Contract**: verify in Safari that the fallback select is what actually renders, not a bare month-typed
box. If Safari passes both probes and still shows no picker, add a third condition to the injectable
detection function in `src/client/components/ui/monthControl.ts`, extend its unit test with that case,
and record the measurement. That is the only source edit this phase may produce, and it is recorded as
such.

### Success criteria

#### Automated

- Typecheck, the whole suite and the production build all pass on the tree that was captured:
  `npm run typecheck`, `npm test`, `npm run build`
- Every capture the delta's section 11 names exists under `evidence/screenshots/` with an `s08-` prefix

#### Manual

- Every calendar field renders `type="month"` or `type="date"` in Chrome, verified in the element
  inspector rather than from the source
- In Safari, every month field renders the fallback select and the payment date renders the native date
  picker
- Control heights are measured and equal 40px and 44px, or the `min-height` exception is applied and
  the measured values recorded
- The focus ring of design-spec 2.4 is present and unmodified on a month input, a date input and the
  fallback select in both browsers
- Enter and Escape behaviour inside the native controls is measured in both browsers and recorded,
  including any browser that differs from the design-spec 7 contract
- With reduced motion on, the panel and the strip appear instantly
- At 390 nothing scrolls horizontally on the detail screen, with the panel open and with the strip open
- Firefox, Edge, Chrome Android and Firefox Android are reported from published support data and
  marked unverified, with the reason
- Deletion was exercised only on a synthetic disposable subscription created for the capture, and no
  demo or user record was deleted

---

## Phase 6: Foundation documents

### Overview

Make the foundation describe what landed. Depends on phases 1 through 5.

### Required changes

#### 1. The product requirements

**File**: `context/foundation/prd.md`

**Purpose**: the document has no functional requirement for editing or deleting a subscription, and
three of its existing statements are affected.

**Contract**: FR-005 (`:152`) gains the editable settings and their rules using the existing
"> Shipped:" note convention of `:162-166`; a requirement for deleting a subscription with its whole
ledger is added beside it. FR-011 (`:176-184`), where the owner participant "cannot be deleted", gains
a note that removing the whole subscription removes it. FR-008 (`:161-166`) is confirmed against the
new refusals rather than rewritten. `:134` and `:146`, which already cover deletes naming another
account's records, are confirmed against the new verb. The out-of-scope line at `:292-293`, "No
currency conversion. One subscription, one currency.", is named as the reason the currency locks. The
time-zone and display conventions at `:231` and `:237` gain the note that the time zone is now
editable and what that moves.

#### 2. The test plan

**File**: `context/foundation/test-plan.md`

**Purpose**: the risk-to-test mapping gains a verb and an atomic write.

**Contract**: risk 2 (`:52`) and risk 3 (`:53`) are extended to name the subscription delete and what
it is allowed to cascade to; "for every verb the resource offers" (`:66`) gains DELETE; the atomic-write
coverage inventory (`:67`) gains the delete batch and the first-month batch; the
preserve-unrelated-data guidance (`:195`) is confirmed against the two preservation cases phase 1 adds.

#### 3. The roadmap

**File**: `context/foundation/roadmap.md`

**Purpose**: close S-08 (`:284-291`).

**Contract**: the item's status is moved forward only. Its outcome and done-when lines are confirmed
against what landed.

#### 4. The repository guide

**File**: `AGENTS.md`

**Purpose**: two statements in it become false.

**Contract**: `:9`, "No roadmap item is open", is updated to reflect S-08. `:46`, "Participants with
payments or schedules are archived or closed out, never hard-deleted (409)", gains the carve-out that
deleting the whole subscription does hard-delete them, because the rule protects a participant inside a
living ledger rather than the ledger itself.

### Success criteria

#### Automated

- Typecheck, the whole suite and the production build all still pass: `npm run typecheck`, `npm test`,
  `npm run build`
- No file under `src/`, `tests/` or `migrations/` changed in this phase
- No calendar date, timestamp, deadline or duration estimate appears in any file this phase edits

#### Manual

- Every document reads as a description of the shipped product rather than a record of this change
- The `AGENTS.md` carve-out states the rule and its boundary in one sentence each

---

## Testing strategy

### Unit tests

- The patch schema: `start_month` accepted, malformed rejected, `.strict()` still rejecting an unknown
  key, the empty-body `.refine` still firing
- The month-control detection: both branches, each probe failed separately
- The option range: no bounds, a `min`, a `max`, a value outside both, ascending order with no gap, a
  `null` value selecting the empty option, and a string round-trip with no `Date` in the path
- The change-only PATCH body: one field differing, several differing, nothing differing

### Integration tests

- Every setting patched and read back; the currency lock accepted and refused; the first month moved
  earlier, moved later within bounds, and refused past each of the six kinds; the owner opening range
  shifted; the owner `left_month` and next-range refusals
- Unauthenticated patch and delete both 401; foreign patch and delete both 404
- The full-ledger delete with every child kind present, asserting zero rows in all eight tables
- Preservation: another account's subscription and children survive; the same user's second
  subscription and children survive
- A second delete of the same id answers 404
- Atomicity: a batch carrying one deliberately failing statement leaves every row standing, and the
  production path issues exactly one batch

### Manual testing

The manual rows are the Success Criteria of phases 4 and 5 and are not restated here. The one rule that
governs all of them: deletion is exercised only on a synthetic disposable subscription created for the
purpose.

## Risks

| Risk | Handling |
| --- | --- |
| A `CHECK` violation inside `db.batch()` throws instead of producing the delta's refusal sentence | every rule is pre-checked in the route; no refusal is left to the database |
| The owner's range set is not what the shift rule assumes, because the participant PATCH can already move it | the shift is conditional on the range still sitting at the old first month, and the prospective set is run through `validateActiveRanges` before the batch **[frame Q1]** |
| The two detection probes pass in a browser that renders no picker | row 5.4 is a gate in Safari, the browser that decides it; the detection function is injectable so a third condition costs one edit and one test |
| Native controls exceed the fixed 40px and 44px box | measured in phase 5; the delta's `min-height` exception applies to these two types alone and the measurement is recorded |
| Enter or Escape inside a native control differs from the design-spec 7 contract | measured in both browsers and recorded rather than worked around, per the delta |
| An irreversible deletion reaches real data | deletion is exercised only on synthetic disposable records, in tests and in the capture pass, and never on existing demo or user data |
| Four browsers cannot be verified on this machine | reported from published support data and marked unverified, with the reason, per the delta's answer 11 |

## Rollback

No migration is needed and none is written, so rollback is a revert of the commits and nothing else -
confirmed against the schema, which this change does not touch in any file under `migrations/`. Each
phase is its own commit, so a phase can be reverted without the ones before it. Phase 1 is the only
phase that changes stored data, and only through the routes a user drives: a first-month edit and a
deletion. A deletion is irreversible by design, which is why it is confirmed in the client and never
exercised on data that matters.

## References

- Design authority: `context/changes/subscription-management-and-date-inputs/design-delta.md`
- Frame: `context/changes/subscription-management-and-date-inputs/frame.md`
- Research: `context/changes/subscription-management-and-date-inputs/research.md`
- Brief: `context/foundation/subscription-management-brief.md`
- Accepted specification: `context/archive/visual-redesign/design-spec.md`, amended by the delta
- Atomicity precedent: `src/server/db/recurring.ts:211-247`
- Ownership predicate precedent: `src/server/db/members.ts:19-34`
- Destructive-confirmation precedent: `src/client/components/ui/ConfirmStrip.tsx:13-44` and
  `src/client/components/PriceHistory.tsx:170-190`
- Browser-verification precedent: `evidence/runs/release-4.md:219-227` and `:278-285`
- Plan precedent: `context/archive/google-sign-in/plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename
> step titles.

### Phase 1: Server - editable first month and the delete verb

#### Automated

- [ ] 1.1 Typecheck passes across all three projects
- [ ] 1.2 The unit suite passes, including the four new schema cases
- [ ] 1.3 The integration suite passes, including the new deletion file
- [ ] 1.4 The production build succeeds
- [ ] 1.5 Nothing under `src/client/`, `src/domain/` or `migrations/` has changed
- [ ] 1.6 Neither falsified comment survives anywhere under `src/server/`

#### Manual

- [ ] 1.7 Both rewritten comments describe how the code works now, with no narration of the change
- [ ] 1.8 The deletion test file names its appended failing statement as a platform probe

### Phase 2: Shared client calendar controls

#### Automated

- [ ] 2.1 Typecheck passes across all three projects
- [ ] 2.2 The unit suite passes, including both detection branches and the option-range cases
- [ ] 2.3 The integration suite is unchanged and passes
- [ ] 2.4 The production build succeeds
- [ ] 2.5 No `valueAsDate` or `valueAsNumber` appears anywhere under `src/client/`
- [ ] 2.6 No `new Date(` appears anywhere under `src/client/components/ui/`
- [ ] 2.7 Nothing under `src/server/`, `src/domain/`, `migrations/` or `tests/` has changed

#### Manual

- [ ] 2.8 The rendered app is unchanged, because no call site references the new controls yet

### Phase 3: Migrate the eight calendar call sites

#### Automated

- [ ] 3.1 Typecheck passes across all three projects
- [ ] 3.2 The whole suite passes
- [ ] 3.3 The production build succeeds
- [ ] 3.4 No `inputMode="numeric"` and no `pattern="` attribute remains under `src/client/`
- [ ] 3.5 No ISO format hint remains under `src/client/`
- [ ] 3.6 Exactly eight call sites render `MonthField` or `DateField`
- [ ] 3.7 Nothing under `src/server/`, `src/domain/`, `migrations/` or `tests/` has changed

#### Manual

- [ ] 3.8 Each of the eight fields submits the same wire value it did before, checked once per field

### Phase 4: The detail header, the edit panel and the deletion strip

#### Automated

- [ ] 4.1 Typecheck passes across all three projects
- [ ] 4.2 The whole suite passes, including the change-only body tests
- [ ] 4.3 The production build succeeds
- [ ] 4.4 No `valueAsDate` or `valueAsNumber` appears anywhere under `src/client/`
- [ ] 4.5 Nothing under `src/server/`, `src/domain/`, `migrations/` or `tests/` has changed
- [ ] 4.6 The four existing `ConfirmStrip` call sites are unchanged

#### Manual

- [ ] 4.7 The action row sits under the subtitle with the delta's spacing, disabled during first load
- [ ] 4.8 The edit panel opens in place, pre-filled, with focus on Name
- [ ] 4.9 Currency is locked with its hint where an amount exists and free where none does
- [ ] 4.10 A submit with no differences closes the panel with no request and no status line
- [ ] 4.11 A saved edit updates title, subtitle and the Home row, shows "Changes saved" and returns focus
- [ ] 4.12 A refused first month shows the field error with the panel open and the values kept
- [ ] 4.13 The strip shows both sentences, focuses Keep, and Keep and Escape both return focus
- [ ] 4.14 A real deletion of a disposable subscription returns Home with the sentence and `h1` focus
- [ ] 4.15 A failed deletion closes the strip, shows the header alert and moves focus to it

### Phase 5: Browser verification and the acceptance pass

#### Automated

- [ ] 5.1 Typecheck, the whole suite and the production build all pass on the captured tree
- [ ] 5.2 Every capture the delta's section 11 names exists under `evidence/screenshots/` as `s08-*`

#### Manual

- [ ] 5.3 Every calendar field renders `type="month"` or `type="date"` in Chrome, inspected not assumed
- [ ] 5.4 In Safari every month field renders the fallback select and the payment date its native picker
- [ ] 5.5 Control heights measured and equal to 40px and 44px, or the `min-height` exception recorded
- [ ] 5.6 The focus ring is present and unmodified on a month input, a date input and the select
- [ ] 5.7 Enter and Escape inside the native controls measured in both browsers and recorded
- [ ] 5.8 With reduced motion on, the panel and the strip appear instantly
- [ ] 5.9 At 390 nothing scrolls horizontally, with the panel open and with the strip open
- [ ] 5.10 Firefox, Edge and the two mobile browsers reported from published data and marked unverified
- [ ] 5.11 Deletion was exercised only on a synthetic disposable subscription

### Phase 6: Foundation documents

#### Automated

- [ ] 6.1 Typecheck, the whole suite and the production build all still pass
- [ ] 6.2 No file under `src/`, `tests/` or `migrations/` changed in this phase
- [ ] 6.3 No calendar date, timestamp, deadline or duration estimate appears in any edited file

#### Manual

- [ ] 6.4 Every document reads as a description of the shipped product
- [ ] 6.5 The `AGENTS.md` carve-out states the rule and its boundary in one sentence each
