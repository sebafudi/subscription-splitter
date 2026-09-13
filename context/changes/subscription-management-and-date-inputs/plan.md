# Implementation plan: Subscription management and native calendar inputs

## Overview

Give the owner two things the shipped ledger never gave them - editing the subscription record and
deleting it with its whole ledger - and replace every plain-text calendar field in the client with a
real browser control. This is roadmap item S-08.

`context/changes/subscription-management-and-date-inputs/design-delta.md` is the design authority for
everything a person sees and for the product rules the server enforces: the currency lock, the
first-month bounds in both directions, the owner opening-range shift and the deletion scope. Its
"Rulings on planning questions" and "Rulings on plan review design findings" sections settle every
question this plan raised and every design finding the independent review returned, so nothing in this
plan is left waiting on the designer. `research.md` is the authority for what the code does today;
`frame.md` tested the assumptions both rest on. `reviews/plan-review.md` carries the independent
review of this plan and the decision taken on each of its eleven findings.

The change adds one route, extends another, adds two shared client controls, migrates eight call
sites, rewrites the subscription detail header, and updates the foundation documents. It adds no
migration, changes no accounting rule, changes no wire format, and touches nothing under
`src/domain/` except by reuse.

## Current state analysis

`src/server/routes/subscriptions.ts` mounts four routes and applies `requireSession` twice, once for
the collection and once for the subtree (`:8-9`). `PATCH /api/subscriptions/:id` accepts `name`,
`currency`, `locale` and `time_zone` (`src/server/validation/subscriptions.ts:51-55`), merges them
over the stored row (`src/server/db/subscriptions.ts:99-124`) and returns 200. `update` returns
`Subscription | null` and the route maps null to 404 (`src/server/routes/subscriptions.ts:42-44`), so
`null` already means "not found" and cannot be reused for a refusal. `start_month` is excluded, with
the reason written into the file at `src/server/validation/subscriptions.ts:43-50` and again at
`src/server/db/subscriptions.ts:57-59`. Both of those comments become false in this change. There is
no DELETE verb anywhere on the resource.

Ownership is a SQL predicate, never a separate read. `get` is
`select * from subscriptions where id = ? and user_id = ?` (`src/server/db/subscriptions.ts:91-97`),
documented as returning null for a foreign or missing id indistinguishably. Child ownership is the
same idea as a subquery, in `members.ts:32-34`, `payments.ts:19-27` and `recurring.ts:31-38`. Where a
repository function has to say more than "found or not", this codebase already uses a discriminated
return rather than a nullable one: `MemberRemoval` at `src/server/db/members.ts:223`, whose docblock
at `:215-222` explains why the refusal lives in the repository rather than the caller. Atomicity is
`db.batch()` and only `db.batch()`, with the constraint stated in the code at
`src/server/db/recurring.ts:211-213`.

Eight calendar inputs exist in the client and not one declares a `type` (research.md section 5).
`src/client/components/ui/Field.tsx` sets no type either; it is a render-prop wrapper whose
`ControlAttributes` is `{ id, 'aria-describedby'?, 'aria-invalid'? }` (`:4-8`), so a caller may render
any element and add any attribute. All seven forms in `src/client/` carry `noValidate`.
`src/client/index.css` fixes `height: 40px` with `padding: 0 var(--s-3)` at `:289-301`, 44px below
640px at `:455-471`, declares `color-scheme: light dark` at `:49-50`, and carries no `input[type=`
selector and no `::-webkit-calendar-picker-indicator` rule at all.

`src/client/api.ts` calls neither PATCH nor any delete; it exposes `listSubscriptions` (`:142`) and
`createSubscription` (`:146`). `request()` does `res.json().catch(() => null)` before the `res.ok`
branch (`:57-61`), so a 204 returns null rather than throwing and the delete needs nothing special.
`src/client/screens/SubscriptionDetail.tsx` holds four states (`:49-55`) - loading, ready, `error` and
`no-owner` - and renders one shared `header` in all of them (`:95-125`); the `no-owner` state is the
409 case reached at `:78-79`. `src/client/App.tsx:13` holds the whole selected subscription object and
passes it to the detail screen as a read-only prop (`:32-38`), so the detail screen has no way to
replace it today. Clearing that state remounts `Home`, whose `useEffect(() => load(), [load])`
refetches the list. `SectionHeader` already sets `tabIndex={-1}` on every heading including Home's
`h1` (`src/client/components/ui/SectionHeader.tsx:49`), and Home already holds a heading-row status
line through `useSectionStatus()`.

`vitest.unit.config.ts` runs with `environment: 'node'`, no jsdom, and an include of
`src/**/*.test.ts`. There is no DOM test dependency in `package.json`. Two consequences shape phase 2:
`document` is undefined in the unit suite, and a `.tsx` component test would not even be collected.

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
  `joined_month < startMonth` (`src/domain/members.ts:38-40`). So the owner may hold several ranges
  and the first may carry a `left_month`. The delta's shift rule is conditional for that reason.
- **The owner's later ranges need no rule of their own.** `validateActiveRanges` treats
  `next.joinedMonth <= current.leftMonth` as an overlap (`src/domain/members.ts:51`), so a stored set
  always satisfies `range1.leftMonth < range2.joinedMonth`. Any new first month above `range1.left`
  trips `left_month must not precede joined_month` (`:35-37`) first, and any new first month at or
  below `range1.left` is below `range2.joined` and cannot reach it. The owner's later ranges also sit
  inside the participant minimum like any other range. There is therefore no reachable state for a
  "next active range" refusal, which is why the designer withdrew it.
- **The five minimums are complete.** Nothing else in the schema carries a month or date bounded below
  by the subscription first month. `recurring_exceptions.month` is constrained inside its schedule's
  range at `src/server/routes/recurring.ts:192-196`, so the schedule minimum already covers it.
- **The earlier direction needs no dependent-record check but does need a floor.** Every dependent
  comparison is `>=`, so widening the window satisfies all of them. What it does not bound is cost:
  `src/domain/calc.ts:87` is `enumerateMonths(state.settings.startMonth, current)` and the summary
  walks that list per member on every read, while the only schema bound is the `YYYY-MM` regex
  (`src/server/validation/subscriptions.ts:25-27`), which accepts `0001-01`. The delta now rules a
  ten-year floor on create and on edit alike.
- **`min` can never raise a browser bubble.** All seven forms carry `noValidate` (`Login.tsx:110`,
  `SubscriptionForm.tsx:82`, `MemberForm.tsx:112`, `PriceHistory.tsx:278`, `BreakMonths.tsx:199`,
  `PaymentForm.tsx:125`, `ScheduleForm.tsx:121`). This answers the delta's open item in 3.4: the
  attribute is recorded here and changed nowhere. `min` narrows a picker and nothing else.
- **Home already has what the deletion return needs.** The `h1` already carries `tabindex="-1"`
  through `SectionHeader`, and the heading-row status line already exists. What is missing is only a
  way for `App` to tell `Home` that a deletion just happened.
- **`ConfirmStrip` renders one sentence.** Its props are `question`, `confirmLabel`, `onConfirm`,
  `onKeep` (`src/client/components/ui/ConfirmStrip.tsx:3-11`), it focuses Keep on mount (`:23-25`) and
  routes a `stopPropagation`'d Escape to `onKeep` (`:27-31`). The delta's amended 3.10 adds a second
  sentence, so the component gains one optional prop and every existing call site is untouched.
- **The refusal transform will render as the delta says.** `messageWithLabel`
  (`src/client/components/ui/fieldLabels.ts:69-77`) replaces a leading wire token with the field label
  and touches nothing else.
- **Wire format is safe by construction.** Native controls expose `.value` as the same `YYYY-MM` and
  `YYYY-MM-DD` strings. `valueAsDate` and `valueAsNumber` are the one trap and appear nowhere in this
  plan.

## What we are NOT doing

- **No migration, no schema change, no new table, no new column.**
- **No accounting change.** Nothing under `src/domain/` is edited. `validateActiveRanges` and
  `currentMonth` are called, not changed.
- **No JavaScript date-picker library and no new dependency.** No jsdom and no testing-library either:
  phase 2 is built so that everything worth unit-testing is a pure function in a `.ts` file.
- **No edit to the archived `context/archive/visual-redesign/design-spec.md`.** The delta is the
  standing amendment, following the S-07 precedent.
- **No `owner_name` on the subscription edit form.** It is the owner participant's `members.name` and
  stays on the participant row (`src/server/routes/members.ts:79`).
- **No router and no URL handling.** Navigation stays the single piece of state in `App.tsx:13`.
- **No confirmation gate on the currency.** The delta refuses instead, and the frame agrees.
- **No "next active range" refusal kind.** Withdrawn by the designer as unreachable; see Key findings.
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
| `src/client/components/ui/fieldLabels.ts` | phase 4 only |
| `src/client/screens/SubscriptionForm.tsx` | phase 3 only, including its label change |

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

### The first-month rules, and the floor

Moving `start_month` **earlier** satisfies every dependent rule automatically, because all of them are
`>=` (`src/domain/members.ts:38`, `src/server/routes/prices.ts:42`, `break-months.ts:40`,
`recurring.ts:67,135`). It is bounded instead by cost: a floor of January ten years before the current
year in the subscription's time zone, taken from `currentMonth` in `src/domain/months.ts`, the one
clock read this codebase permits. The refusal is `start_month cannot be earlier than YYYY-MM`. The
same floor applies on create, where the exposure has always existed and has simply never been
reachable on a subscription that already holds a ledger. It matches the span the month select fallback
offers, so the picker path and the select path agree.

Moving it **later** is bounded by the five minimums the delta names, for this subscription:

- `min(active_ranges.joined_month)` over the subscription's members, **excluding** the owner's opening
  range when that range's `joined_month` equals the old `start_month`
- `min(price_history.effective_from)`
- `min(break_months.month)`
- `min(substr(payments.date, 1, 7))` over the subscription's members
- `min(recurring_schedules.start_month)` over the subscription's members

The refusal names the binding month and the kind, in the delta's tie order. The owner's later ranges
take part in the participant minimum like any other range and have no kind of their own.

### The owner opening-range shift, and its one refusal

When the owner's opening range has `joined_month` equal to the old `start_month`, it moves to the new
`start_month` in the same batch and is excluded from the minimum above. Before the batch runs, the
route builds the owner's range set as it would be after the shift and passes it through
`validateActiveRanges` (`src/domain/members.ts:29-56`). One refusal comes out of that, as 400 with
field `start_month`: the shifted range's own `left_month` would fall before its new `joined_month`,
answered with the delta's sentence,
`start_month cannot be later than YYYY-MM because your own first active range ends then`.

Nothing is left to the database. A `CHECK` violation inside `db.batch()` throws rather than producing
a refusal sentence, which is why every rule is pre-checked.

### The repository-to-route contract

`update` returns `Subscription | null` today and the route maps null to 404, so a refusal cannot
travel as `null` without silently turning every 400 into a 404. The extended patch returns a
discriminated union in the shape this repository already uses for exactly this problem, `MemberRemoval`
at `src/server/db/members.ts:223`:

```
{ ok: true; subscription: Subscription }
| { ok: false; kind: 'not-found' }
| { ok: false; kind: 'refused'; field: 'currency' | 'start_month'; message: string }
```

The route maps `not-found` to 404, and `refused` to 400 `{ error, field }` in the existing shape at
`src/server/routes/subscriptions.ts:40`. `get`, `list`, `create` and the new `remove` keep the returns
they have.

### The read-then-write window, and how the write closes it

D1 has no interactive transaction, stated in the code at `src/server/db/recurring.ts:211-213`. A
first-month or currency rule decided by a read and then applied by a separate write leaves a window in
which a concurrent request can land a price, payment, participant range or standing order that the
rule would have refused. The deletion path has no such window, because its ownership predicate is
inside its statements. The patch path closes its window the same way, using the
`insert ... select ... where exists (...)` construction already proved at
`src/server/db/members.ts:143-146`: the bound travels in the update's own `where` clause, and the
prior read supplies only the refusal sentence, never the decision.

The subscription update carries one `not exists` clause per minimum when `start_month` moves later,
and one per amount-bearing table when `currency` changes:

```
update subscriptions set name = ?, currency = ?, locale = ?, time_zone = ?, start_month = ?
 where id = ? and user_id = ?
   and not exists (select 1 from price_history where subscription_id = ? and effective_from < ?)
   and not exists (select 1 from active_ranges ar join members m on m.id = ar.member_id
                    where m.subscription_id = ? and ar.joined_month < ? and ar.id <> ?)
   ...
```

The `ar.id <> ?` exclusion is the owner's opening range when it is being shifted, and is the one
non-obvious part: without it the clause the shift exists to satisfy refuses the shift. Bind a
non-existent id when no shift applies.

The owner opening-range update is the second statement of the same batch and must not apply when the
first statement did not. Inside one batch a later statement sees an earlier statement's write, so it
is gated on the subscription already carrying the new first month:
`where id = ? and exists (select 1 from subscriptions where id = ? and user_id = ? and start_month = ?)`
binding the new month.

**Reading the outcome.** `meta.changes === 0` on the subscription update, for a row that `get` proved
exists, is the lost race. The route then re-reads: if `get` now returns null the row was deleted
concurrently and the answer is 404; otherwise a minimum now binds and the answer is the ordinary 400
naming it. Those are the only two possibilities, because the `where` clause has no other term, so no
third answer and no new copy string is needed.

### The delete is eight statements in one batch, deepest first

In order: `recurring_exceptions`, `recurring_schedules`, `payments`, `active_ranges`, `members`,
`price_history`, `break_months`, `subscriptions`. Each child statement is scoped by a subquery joining
up to `subscriptions s` with `s.id = ? and s.user_id = ?`, in the established shape of
`src/server/db/members.ts:32-34`. The final statement is
`delete from subscriptions where id = ? and user_id = ?` and its `meta.changes` decides 204 from 404.
A foreign or unknown id therefore deletes nothing anywhere and answers the existing non-disclosing
404; a request with no session is answered 401 first by `requireSession`.

### Detection runs once per page load, in two injectable seams

The probes are: create an `input`, set `type = "month"`, and require **both** that `type` reads back
`"month"` **and** that assigning `value = "not-a-month"` reads back `""`.

Two seams, not one, because the unit suite has no DOM:

- The detection function takes an **element factory**, defaulting to
  `() => document.createElement('input')`, and returns false immediately when
  `typeof document === 'undefined'`. The unit test passes stubs whose `type` and `value` accessors
  reproduce each branch, so both probes are covered in the `node` environment with no dependency.
- The **control** takes the detection result, so a caller can bypass detection entirely. That is the
  seam phase 5 uses to force either branch for a capture.

Which element to render is itself a pure decision and lives in `monthControl.ts` as a function
returning `'input' | 'select'` from the detection result, so the branch is unit-tested and only the
JSX it selects is left to the browser.

The probes test the month **value sanitisation algorithm**, not picker rendering, and the two are
correlated by browser rather than by specification. That residual is a named gate, not an assumption:
row 5.4 verifies in Safari that the fallback select is what actually renders. If Safari passes both
probes and still shows no picker, the fix is a third condition in the same detection function and the
measurement is recorded; nothing else in the design moves.

---

## Phase 1: Server - editable first month and the delete verb

### Overview

Extend `PATCH /api/subscriptions/:id` with `start_month`, the currency lock, the first-month floor and
the first-month minimums, and add `DELETE /api/subscriptions/:id` as one ordered batch over eight
tables. Rewrite the two code comments that this makes false. Independent of phase 2.

### Required changes

#### 1. The patch schema

**File**: `src/server/validation/subscriptions.ts`

**Purpose**: accept `start_month` on patch, and describe how the field works now rather than why it
could not move.

**Contract**: `patchSubscriptionSchema` gains `start_month` reusing the existing month regex at
`:25-27`. The schema stays `.strict()` and keeps its `.refine` rejecting an empty body (`:53-55`). The
ten-year floor is **not** a schema rule, because it depends on the subscription's time zone and so on
the stored row; it is enforced in the repository beside the other first-month rules, on create and on
patch alike. The comment at `:43-50` is rewritten to state that `start_month` is patchable, that
moving it earlier is admissible down to the floor, and that moving it later is bounded by the
dependent-record minimums checked in `src/server/db/subscriptions.ts`. It describes how it works now;
it does not narrate the change.

#### 2. The patch write and its rules

**File**: `src/server/db/subscriptions.ts`

**Purpose**: enforce the currency lock, the first-month floor and the first-month minimums, and
perform the settings update and any owner opening-range shift as one write that cannot lose a race.

**Contract**: `update` changes its return type to the discriminated union named under Critical
implementation details. Before the write it reads what it needs for the refusal sentences: whether any
amount exists for the currency lock, the five minimums for a later first month, the owner's opening
range and the rest of the owner's range set for the shift, and `currentMonth` for the floor. The
decision, however, travels in the write: the subscription update carries one `not exists` clause per
applicable rule, and the owner opening-range update is gated on the subscription already carrying the
new first month. Both statements are one `db.batch`. A `meta.changes === 0` on the first statement is
resolved by the re-read rule above. The floor is checked before the write and needs no clause, because
it depends on nothing another request can change. The comment at `:57-59` is rewritten to describe the
owner opening range as it now behaves: created at the first month, and moved with it when the first
month moves and the range still sits there.

#### 3. The delete repository function

**File**: `src/server/db/subscriptions.ts`

**Purpose**: remove a subscription and everything reachable from it as one write, or nothing.

**Contract**: one exported function taking `db`, the subscription id and the user id, issuing exactly
one `db.batch` of the eight statements in the order above, each child statement scoped by a subquery
up to `subscriptions s` carrying both `s.id` and `s.user_id`, and returning whether the final
statement changed a row. The ownership predicate stays inside the statements; no separate read decides
it.

#### 4. The routes

**File**: `src/server/routes/subscriptions.ts`

**Purpose**: expose the extended patch and the new verb with this resource's existing error contract.

**Contract**: `PATCH /api/subscriptions/:id` keeps 200, 400 `{ error, field }`, 404 and 401, mapping
the union's `not-found` to 404 and `refused` to 400 with its `field` and `message`.
`DELETE /api/subscriptions/:id` is added under the same `requireSession` subtree: 204 with no body on
success, 404 for a foreign or unknown id, 401 with no session. No `?confirm=true` gate: the delta puts
the confirmation in the client.

#### 5. The create path's floor

**File**: `src/server/db/subscriptions.ts`

**Purpose**: the floor is a product rule on create as well as on edit, per the delta.

**Contract**: `create` refuses a `start_month` below the floor computed from the submitted time zone,
with the same sentence and the same `field`. The route's existing 400 `{ error, field }` shape carries
it unchanged.

#### 6. Unit tests

**Files**: `src/server/validation/subscriptions.test.ts`,
`src/server/db/subscriptions.test.ts` (new)

**Purpose**: pin the patch schema's new shape, and pin the one structural claim that an integration
test against a real binding cannot make.

**Contract**: schema cases for a valid `start_month` accepted, a malformed one rejected, an unknown
key still rejected by `.strict()`, and an empty body still rejected by the `.refine`. Separately, every
repository function takes `db: D1Database` as a parameter, so a stub recording its calls is a unit
test: one case asserting the delete path issues exactly one `batch` and no other write, with the eight
statements in the documented order, and one asserting the patch path issues exactly one `batch`.

#### 7. Integration tests for the extended patch and the new verb

**File**: `tests/integration/subscriptions.test.ts`

**Purpose**: assert the edit rules and extend the existing per-verb cross-account shape.

**Contract**: the cross-account test at `:19-50` gains a DELETE leg asserting 404 from account B. New
cases: each of the five settings patched and read back; a currency change accepted while no amount
exists; a currency change refused once a price, a payment or a standing order exists, with field
`currency`; a first month moved earlier accepted; a first month below the ten-year floor refused, with
the floor sentence, on patch and on create alike; a first month moved later up to the earliest
dependent month accepted; a first month moved past it refused, once per kind, each naming the binding
month; the owner opening range moved with the first month when it sat there; the owner's `left_month`
case refused; an unauthenticated patch and an unauthenticated delete both 401.

#### 8. Integration tests for deletion

**File**: `tests/integration/subscription-deletion.test.ts` (new)

**Purpose**: prove the delete reaches everything, touches nothing else, and rolls back as one write.

**Contract**: a fixture that builds one subscription holding at least one row of every child kind -
members, active ranges, prices, break months, payments, standing orders and standing-order exceptions -
then a delete returning 204 and a row count of zero in all eight tables. Preservation cases in the same
file: another account's subscription and every one of its child rows survive, and the same user's
second subscription and all of its child rows survive, per the existing guidance at
`context/foundation/test-plan.md:195`. Foreign and unknown ids answer 404 and leave every row in place.
A second delete of the same id answers 404.

Atomicity: build the same eight-statement list for the first subscription and append one statement
that is guaranteed to fail **on a row the batch does not delete**. The duplicated row is a
`break_months` row belonging to the same account's *second* subscription, which the preservation
fixture already creates, so statement seven of the batch never removes it and the appended
`insert into break_months (subscription_id, month) values (?, ?)` conflicts with the live composite
primary key at `migrations/0004_prices_and_breaks.sql:23`. Run it as one batch and assert every row of
the first subscription still stands. The file states in its own words which row is duplicated, why it
survives the batch, and that the appended statement is a platform probe rather than a production path.

This file takes client-address prefix `10.9.0.x`, and the allocation comment at
`tests/integration/accounts.ts:12-21` is extended with it.

### Success criteria

#### Automated verification:

- Typecheck passes across all three projects: `npm run typecheck`
- The unit suite passes, including the schema cases and the single-batch repository cases:
  `npm run test:unit`
- The integration suite passes, including the floor cases and the new deletion file:
  `npm run test:integration`
- The production build succeeds: `npm run build`
- Nothing under `src/client/`, `src/domain/` or `migrations/` has changed: `git diff --stat` is empty
  for those paths
- `grep -rn "start_month cannot move\|cannot be changed" src/server/` returns nothing, confirming both
  falsified comments are gone

#### Manual verification:

- Both rewritten comments read as descriptions of how the code works now, with no narration of what
  changed
- The deletion test file names the duplicated row, says why it survives the batch, and states that the
  appended statement is a platform probe

---

## Phase 2: Shared client calendar controls

### Overview

Add the two controls the rest of the client will use, with the detection, the branch decision, the
option range and the CSS the delta specifies. Everything worth testing is a pure function in a `.ts`
file, because the unit suite runs in `node` with no DOM and collects only `src/**/*.test.ts`.
Independent of phase 1.

### Required changes

#### 1. The pure helpers

**File**: `src/client/components/ui/monthControl.ts` (new)

**Purpose**: hold every decision the controls make, so all of them are unit-testable without a
browser and without a new dependency.

**Contract**: three exports.

- A detection function running the two probes. It takes an **element factory** defaulting to
  `() => document.createElement('input')` and returns false immediately when
  `typeof document === 'undefined'`, so the unit test can reproduce each probe outcome with a stub
  and the `node` environment never throws.
- A branch function returning `'input' | 'select'` from the detection result, so which element renders
  is a unit-tested decision and only the JSX is left to the browser.
- An option-range function producing the ordered option list for the fallback from a `min`, a `max`, a
  current value and the current month, applying the delta's rule: from `min` when given, otherwise
  January ten years before the current year; to `max` when given, otherwise December of the year after
  the current one; always extended to include the current value. The current month comes from
  `currentMonth` in `src/domain/months.ts`, the one clock read this codebase permits. No `Date` object
  is built from any field value anywhere in this file.

#### 2. The month control

**File**: `src/client/components/ui/MonthField.tsx` (new)

**Purpose**: one control that renders a native month input where a picker exists and a native select of
months where it does not.

**Contract**: takes the `ControlAttributes` from `Field`, a `YYYY-MM` value or the empty string, a
change handler that **always receives a string**, `''` when the field is cleared, `required`, an
optional `min`, the subscription locale and time zone for labelling, and an optional detection result
overriding the shared one. The string-only handler is deliberate: `ScheduleForm` holds a plain string
(research.md section 5, row 8) and would break on a `null`, the fallback select's empty option yields
`''` through `.value` anyway, and both call sites already normalise to `null` at submit. The picker
branch renders `<input type="month">` with `autoComplete="off"`, the `min` when given, and no
`inputMode`, no `pattern` and no `placeholder`. The select branch renders a native `<select>` whose
options come from the option-range function, with `YYYY-MM` values and labels from the month formatter
of `src/client/format.ts` in the given locale; a required field leads with
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

**Purpose**: cover every decision the controls make, in the `node` environment, with no dependency.

**Contract**: detection with a stub element factory - both probes passing, type reflection failing,
value sanitisation failing, each fault injected separately - plus the `typeof document === 'undefined'`
guard returning false. The branch function returning `'input'` and `'select'` for the two detection
results. The option range with no `min` and no `max`; with a `min`; with a `max`; with a current value
outside both, asserting the range is extended to include it; option values in ascending `YYYY-MM` order
with no gap; and a round-trip proving a value in is the same string out, with no `Date` anywhere in the
path.

### Success criteria

#### Automated verification:

- Typecheck passes across all three projects: `npm run typecheck`
- The unit suite passes, covering both detection branches through injected stubs, the branch function
  and the option-range rule: `npm run test:unit`
- The integration suite is unchanged and passes: `npm run test:integration`
- The production build succeeds: `npm run build`
- `grep -rn "valueAsDate\|valueAsNumber" src/client/` returns nothing
- `grep -rn "new Date(" src/client/` returns only the two known-safe UTC-anchored sites at
  `src/client/format.ts:16` and `:29`
- Nothing under `src/server/`, `src/domain/`, `migrations/` or `tests/` has changed

#### Manual verification:

- The two new controls are not yet referenced by any call site, so the rendered app is unchanged

---

## Phase 3: Migrate the eight calendar call sites

### Overview

Replace every plain-text calendar input with the phase 2 controls, removing the ISO hints and the
text-input attributes and adding `min` where a bound exists. Depends on phase 2.

### Required changes

#### 1. The seven month fields and the one date field

**Files**: `src/client/screens/SubscriptionForm.tsx` (`:143`),
`src/client/components/MemberForm.tsx` (`:142` and `:164`),
`src/client/components/PriceHistory.tsx` (`:292`), `src/client/components/BreakMonths.tsx` (`:212`),
`src/client/components/ScheduleForm.tsx` (`:172` and `:193`),
`src/client/components/PaymentForm.tsx` (`:156`)

**Files, addendum**: the subscription's `time_zone` and `start_month` reach none of these forms today,
because `Summary` carries only `currentMonth`, `currency` and `locale`, so this phase also threads both
values down through `src/client/screens/SubscriptionDetail.tsx` (prop lines in the five section JSX
blocks only), `src/client/components/MemberList.tsx`, `PaymentList.tsx` and `RecurringSection.tsx`.

**Purpose**: give every calendar value a real control while keeping every wire value, every state
shape and every server rule exactly as they are.

**Contract**: each of the seven month fields renders `MonthField` inside its existing `Field`; the
payment date renders `DateField`. Removed from every one: `inputMode`, `pattern`, `placeholder` and
the ISO hint ("Month as YYYY-MM, like 2026-01", "Date as YYYY-MM-DD"). Kept: `autoComplete="off"`,
`required` where it is there today, and the semantic hints "Leave empty while still active" and "Leave
empty while it is still running", which become the empty option's label in the select branch as well.
Submit-time normalisation is unchanged: `MemberForm` keeps `string | null` and `ScheduleForm` keeps
`''`, both normalising to `null`, and the control's handler always emits a string, which both already
handle.

`min` per the delta's amended Bounds paragraph:

| Field | `min` |
| --- | --- |
| Participant From | the subscription first month |
| Participant To | the paired From value, whenever it is a complete month; otherwise none |
| Price Effective from | the subscription first month |
| Skipped month | the subscription first month |
| Standing order First month | the subscription first month |
| Standing order Last month | the paired First month value, whenever it is a complete month; otherwise none |
| Payment date | the first day of the first month, `YYYY-MM-01` |
| Subscription first month, create form | the ten-year floor for the time zone the form holds |

No `max`, no `step`. The paired bounds follow the live value of their partner field, so clearing the
From field removes the To field's `min` rather than freezing it.

#### 2. The first-month label

**File**: `src/client/screens/SubscriptionForm.tsx`

**Purpose**: one wire name, one label. The delta rules `start_month` is "First month" on every screen.

**Contract**: the field's label at `:138` changes from "Start month" to "First month". The shared label
map is phase 4's file and carries the single matching entry; this phase adds no map.

#### 3. The create form's locale and time zone for the fallback

**File**: `src/client/screens/SubscriptionForm.tsx`

**Purpose**: the select branch labels its months in a locale, and on the create form the subscription
does not exist yet.

**Contract**: the first-month control takes the locale and time zone the form currently holds, falling
back to the form's defaults when a held value is not valid, per the delta.

#### 4. The field hint documentation

**File**: `src/client/components/ui/Field.tsx`

**Purpose**: the docblock at `:14` names the hint slot as the home of the ISO form of a month or date,
which is no longer true.

**Contract**: that sentence is rewritten to describe the hint slot as it works now - the field's
semantic guidance, with the format carried by the control itself. No behaviour change; `Field` itself
is not modified.

### Success criteria

#### Automated verification:

- Typecheck passes across all three projects: `npm run typecheck`
- The whole suite passes: `npm test`
- The production build succeeds: `npm run build`
- `grep -rn 'inputMode="numeric"' src/client/` returns nothing
- `grep -rn 'pattern="' src/client/` returns nothing
- `grep -rn "Month as YYYY-MM\|Date as YYYY-MM-DD" src/client/` returns nothing
- Exactly eight call sites render `MonthField` or `DateField`:
  `grep -rn "MonthField\|DateField" src/client/screens src/client/components --include=*.tsx` lists
  them
- `grep -rn "Start month" src/client/` returns nothing
- Nothing under `src/server/`, `src/domain/`, `migrations/` or `tests/` has changed

#### Manual verification:

- Each of the eight fields still submits the same wire value it did before, checked once per field in
  a running app
- Participant To and standing order Last month take their `min` from their partner field, and lose it
  when the partner is cleared

---

## Phase 4: The detail header, the edit panel and the deletion strip

### Overview

Build the header action row in all four detail states, the edit panel with its pre-fill and
change-only body, the page-level deletion strip, the client API functions and the Home return.
Depends on phases 1, 2 and 3.

### Required changes

#### 1. The client API functions

**File**: `src/client/api.ts`

**Purpose**: reach the two routes phase 1 added.

**Contract**: `patchSubscription(id, changes)` returning the updated subscription, and
`deleteSubscription(id)` returning nothing on 204. Both go through the existing `request()` helper so
the 401 to `SignedOutError` and the `{ message, error, field }` to `ApiError` mapping at `:48-78` apply
unchanged; `request()` already tolerates an empty 204 body at `:57-61`.

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
declared pair, Time zone (span), First month (span, `MonthField`, `min` at the ten-year floor, no
`max`) - each with the delta's hint. Currency is `disabled` when the loaded detail holds at least one
price, payment or standing order; the lock sentence is its `aria-describedby` text and interpolates
the subscription's current currency code in place of the delta's example PLN. Pre-filled from the held
subscription object. Buttons `[Save changes] [Cancel]`. Cancel and Escape discard and return focus to
"Edit subscription". Field errors and whole-form errors follow the existing 3.8 machinery, using the
shared label map below. On a refused first month the panel stays open with the entered values.

#### 4. The label map

**File**: `src/client/components/ui/fieldLabels.ts`

**Purpose**: the refusal transform needs a label for every wire name this form sends, and the delta
rules there is one label per wire name.

**Contract**: the existing `subscriptionFieldLabels` (`:9-16`) is reused for both the create form and
the edit panel, with its `start_month` entry changed from "Start month" to "First month". No second
map is added. `labelFor` and `messageWithLabel` resolve it with no other change, so
`start_month cannot be later than ...` renders as "First month cannot be later than ...".

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
page-level deletion strip, in all four of the screen's states.

**Contract**: inside the existing `header.detail-head` (`:94-104`), under the subtitle, an action row
of two link-variant buttons, "Edit subscription" and "Delete subscription", with the header status
line at its right end, permanently mounted and empty when idle.

Per state, as the delta's amended 4.4 now rules:

| State | Edit subscription | Delete subscription |
| --- | --- | --- |
| loading, the skeleton of 4.4 | disabled | disabled |
| ready | enabled | enabled |
| `error` (`:52`) | disabled | disabled |
| `no-owner` (`:54`, the 409 of `:78-79`) | disabled | **enabled** |

Both disabled states use the 3.3 treatment, `aria-disabled="true"` with `--ink-faint` text. In
`no-owner` the strip, the Home return and the status line behave exactly as in the ready state:
deletion needs only the id, while the edit panel's currency lock needs lists that state does not have.

Only one of the panel and the strip is open at a time, and the action row is absent while either is. A
permanently mounted `role="alert"` under the action row position carries a failed deletion, with
"Dismiss", and adds an "All subscriptions" link on a 404. After a saved edit the screen hands the PATCH
response up through a new `onUpdated(subscription)` prop, reloads the detail data keeping the current
figures on screen, closes the panel, returns focus to "Edit subscription" and shows "Changes saved".
The deletion strip carries the delta's two sentences and the `[Delete subscription] [Keep]` buttons,
takes `aria-busy` while the request is in flight with both buttons disabled and the labels unchanged,
and on success hands the deletion up to `App`.

#### 7. The held subscription and the Home return

**Files**: `src/client/App.tsx`, `src/client/screens/Home.tsx`

**Purpose**: the held subscription object lives in `App.tsx:13` and the detail screen receives it as a
read-only prop, so both a saved edit and a deletion have to reach it. Without that, the title and
subtitle keep showing the old name after a save.

**Contract**: `App` passes `onUpdated` to `SubscriptionDetail`, implemented as `setSelected(updated)`,
so the header, the subtitle and the held object agree. `App` also gains a deletion handler that clears
the selected subscription, so nothing deleted is held anywhere in client state, and passes a one-shot
signal to `Home`. `Home` consumes that signal on mount into its existing `useSectionStatus().confirm`
with the sentence "Subscription deleted" and moves focus to its `h1`, which already carries
`tabindex="-1"` through `SectionHeader`. Remounting `Home` already refetches the list through
`useEffect(() => load(), [load])`, so the Home row shows the new values after an edit and the deleted
row is gone after a deletion; no second fetch is added.

#### 8. Styling for the two new page-level surfaces

**File**: `src/client/index.css`

**Purpose**: the header action row and the page-level strip.

**Contract**: the action row under the subtitle with `--s-3` above and `--s-5` below, two link-variant
buttons at `--t-small` separated by `--s-3`, and the status line at the right end; below 640px the
buttons keep one line and the status line moves to its own line, left aligned, only when it has text.
The confirmation strip spans the content column at page level with the same appearance it has inside a
row, and its second sentence sits at `--t-small` colour `--ink`.

### Success criteria

#### Automated verification:

- Typecheck passes across all three projects: `npm run typecheck`
- The whole suite passes, including the new change-only body tests: `npm test`
- The production build succeeds: `npm run build`
- `grep -rn "valueAsDate\|valueAsNumber" src/client/` returns nothing
- `grep -rn "new Date(" src/client/` returns only the two known-safe UTC-anchored sites at
  `src/client/format.ts:16` and `:29`
- `grep -rn "Start month" src/client/` returns nothing, and `subscriptionFieldLabels` is the only
  subscription label map in `fieldLabels.ts`
- Nothing under `src/server/`, `src/domain/`, `migrations/` or `tests/` has changed
- The four existing `ConfirmStrip` call sites are unchanged: `git diff` shows no edit to
  `PriceHistory.tsx`, `MemberList.tsx`, `PaymentList.tsx` or `RecurringSection.tsx` in this phase

#### Manual verification:

- The action row sits under the subtitle with the delta's spacing, and both buttons are disabled
  during the first load and enabled after it
- The edit panel opens in place of the action row, pre-filled, with focus on Name
- Currency is locked with its hint, naming the subscription's own currency code, on a subscription
  that holds an amount, and free on one that holds none
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
- The `error` state shows both buttons disabled, and the `no-owner` state shows Delete enabled and
  Edit disabled, with a deletion from that state behaving as it does from the ready state

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
instantly. Captures are taken per window id so nothing else on the machine is in frame. The control's
detection override is the seam used to force a branch where a browser will not produce it naturally.

#### 3. The fallback gate

**Purpose**: settle the one thing reading cannot.

**Contract**: verify in Safari that the fallback select is what actually renders, not a bare month-typed
box. If Safari passes both probes and still shows no picker, add a third condition to the detection
function in `src/client/components/ui/monthControl.ts`, extend its unit test with that case, and record
the measurement. That is the only source edit this phase may produce, and it is recorded as such.

### Success criteria

#### Automated verification:

- Typecheck, the whole suite and the production build all pass on the tree that was captured:
  `npm run typecheck`, `npm test`, `npm run build`
- Every capture the delta's section 11 names exists under `evidence/screenshots/` with an `s08-` prefix

#### Manual verification:

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

**Contract**: FR-005 (`:152`) gains the editable settings and their rules, including the first month's
floor and ceiling, using the existing "> Shipped:" note convention of `:162-166`; a requirement for
deleting a subscription with its whole ledger is added beside it. FR-011 (`:176-184`), where the owner
participant "cannot be deleted", gains a note that removing the whole subscription removes it. FR-008
(`:161-166`) is confirmed against the new refusals rather than rewritten. `:134` and `:146`, which
already cover deletes naming another account's records, are confirmed against the new verb. The
out-of-scope line at `:292-293`, "No currency conversion. One subscription, one currency.", is named as
the reason the currency locks. The time-zone and display conventions at `:231` and `:237` gain the note
that the time zone is now editable and what that moves.

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

#### Automated verification:

- Typecheck, the whole suite and the production build all still pass: `npm run typecheck`, `npm test`,
  `npm run build`
- No file under `src/`, `tests/` or `migrations/` changed in this phase
- No calendar date, timestamp, deadline or duration estimate appears in any file this phase edits

#### Manual verification:

- Every document reads as a description of the shipped product rather than a record of this change
- The `AGENTS.md` carve-out states the rule and its boundary in one sentence each

---

## Testing strategy

### Unit tests

- The patch schema: `start_month` accepted, malformed rejected, `.strict()` still rejecting an unknown
  key, the empty-body `.refine` still firing
- The repository shape, through a `D1Database` stub recording calls: the delete path issues exactly one
  `batch` with the eight statements in order and no other write; the patch path issues exactly one
  `batch`
- The month-control detection, through a stub element factory: both probes passing, type reflection
  failing, value sanitisation failing, and the no-DOM guard
- The branch function: `'input'` and `'select'` for the two detection results
- The option range: no bounds, a `min`, a `max`, a value outside both, ascending order with no gap, and
  a string round-trip with no `Date` in the path
- The change-only PATCH body: one field differing, several differing, nothing differing

### Integration tests

- Every setting patched and read back; the currency lock accepted and refused; the first month moved
  earlier, refused below the ten-year floor on patch and on create, moved later within bounds, and
  refused past each of the five kinds; the owner opening range shifted; the owner `left_month` refusal
- Unauthenticated patch and delete both 401; foreign patch and delete both 404
- The full-ledger delete with every child kind present, asserting zero rows in all eight tables
- Preservation: another account's subscription and children survive; the same user's second
  subscription and children survive
- A second delete of the same id answers 404
- Atomicity: a batch carrying one statement that duplicates a live `break_months` row of a subscription
  the batch does not touch leaves every row standing

### What no automated test in this repository covers

Stated plainly rather than implied. There is no jsdom, no testing-library and no browser-automation
dependency, and the unit include is `src/**/*.test.ts`, so a `.tsx` component test would not be
collected at all. Every decision the month control makes is therefore pulled into `monthControl.ts` and
unit-tested, but the JSX those decisions select is not. That the false branch renders a native select
rather than a bare month-typed box is proved only by manual row 5.4, in the one browser that can
produce that branch. Adding a DOM test environment for one assertion is not worth a dependency in a
project that pins every version by hand, so this is accepted, not overlooked.

### Manual testing

The manual rows are the Success Criteria of phases 4 and 5 and are not restated here. The one rule that
governs all of them: deletion is exercised only on a synthetic disposable subscription created for the
purpose.

## Risks

| Risk | Handling |
| --- | --- |
| A `CHECK` violation inside `db.batch()` throws instead of producing the delta's refusal sentence | every rule is pre-checked in the route; no refusal is left to the database |
| A concurrent write lands between reading the minimums and writing the new first month, leaving a record the rule would have refused | the bound travels in the update's own `where` clause as `not exists`, in the shape proved at `src/server/db/members.ts:143-146`, and the owner range update is gated on the first statement having applied; the prior read supplies only the sentence |
| The same window on the currency lock | the same construction, one `not exists` per amount-bearing table, applied only when the currency changes |
| The owner's range set is not what the shift rule assumes, because the participant PATCH can already move it | the shift is conditional on the range still sitting at the old first month, and the prospective set is run through `validateActiveRanges` before the batch |
| Moving the first month earlier makes every later summary walk an unbounded month list | the ten-year floor, on create and edit alike, checked in the repository because it depends on the stored time zone |
| The two detection probes pass in a browser that renders no picker | row 5.4 is a gate in Safari, the browser that decides it; the detection function takes an element factory and the control takes an override, so a third condition costs one edit and one test |
| The rendering the detection selects is not unit-testable | accepted and recorded under Testing strategy; every decision is a pure function, only the JSX is left to the browser |
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

- Design authority: `context/changes/subscription-management-and-date-inputs/design-delta.md`,
  including its "Rulings on planning questions" and "Rulings on plan review design findings"
- Independent review: `context/changes/subscription-management-and-date-inputs/reviews/plan-review.md`
- Frame: `context/changes/subscription-management-and-date-inputs/frame.md`
- Research: `context/changes/subscription-management-and-date-inputs/research.md`
- Brief: `context/foundation/subscription-management-brief.md`
- Accepted specification: `context/archive/visual-redesign/design-spec.md`, amended by the delta
- Atomicity precedent: `src/server/db/recurring.ts:211-247`
- Ownership predicate precedent: `src/server/db/members.ts:19-34`
- Discriminated repository return precedent: `src/server/db/members.ts:215-243`
- Guard-inside-the-write precedent: `src/server/db/members.ts:143-146`
- Destructive-confirmation precedent: `src/client/components/ui/ConfirmStrip.tsx:13-44` and
  `src/client/components/PriceHistory.tsx:170-190`
- Browser-verification precedent: `evidence/runs/release-4.md:219-227` and `:278-285`
- Plan precedent: `context/archive/google-sign-in/plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename
> step titles.

### Phase 1: Server - editable first month and the delete verb

#### Automated

- [x] 1.1 Typecheck passes across all three projects — 4978603
- [x] 1.2 The unit suite passes, including the schema cases and the single-batch repository cases — 62783e8
- [x] 1.3 The integration suite passes, including the floor cases and the new deletion file — 62783e8
- [x] 1.4 The production build succeeds — 4978603
- [x] 1.5 Nothing under `src/client/`, `src/domain/` or `migrations/` has changed — 62783e8
- [x] 1.6 Neither falsified comment survives anywhere under `src/server/` — 4978603

#### Manual

- [x] 1.7 Both rewritten comments describe how the code works now, with no narration of the change — 4978603
- [x] 1.8 The deletion test names the duplicated row, why it survives, and that it is a platform probe — 62783e8

### Phase 2: Shared client calendar controls

#### Automated

- [x] 2.1 Typecheck passes across all three projects — e47b427
- [x] 2.2 The unit suite passes, covering both detection branches through stubs, the branch function
      and the option range — e47b427
- [x] 2.3 The integration suite is unchanged and passes — e47b427
- [x] 2.4 The production build succeeds — e47b427
- [x] 2.5 No `valueAsDate` or `valueAsNumber` appears anywhere under `src/client/` — e47b427
- [x] 2.6 No `new Date(` appears under `src/client/` outside the two known-safe sites in `format.ts` — e47b427
- [x] 2.7 Nothing under `src/server/`, `src/domain/`, `migrations/` or `tests/` has changed — e47b427

#### Manual

- [ ] 2.8 The rendered app is unchanged, because no call site references the new controls yet

### Phase 3: Migrate the eight calendar call sites

#### Automated

- [x] 3.1 Typecheck passes across all three projects — 75906dd
- [x] 3.2 The whole suite passes — 75906dd
- [x] 3.3 The production build succeeds — 75906dd
- [x] 3.4 No `inputMode="numeric"` and no `pattern="` attribute remains under `src/client/` — 75906dd
- [x] 3.5 No ISO format hint remains under `src/client/` — 75906dd
- [x] 3.6 Exactly eight call sites render `MonthField` or `DateField` — 75906dd
- [x] 3.7 Nothing under `src/server/`, `src/domain/`, `migrations/` or `tests/` has changed — 75906dd
- [x] 3.9 No `Start month` string remains under `src/client/` — 75906dd

#### Manual

- [ ] 3.8 Each of the eight fields submits the same wire value it did before, checked once per field
- [ ] 3.10 Participant To and standing order Last month take their `min` from their partner field and
      lose it when the partner is cleared

### Phase 4: The detail header, the edit panel and the deletion strip

#### Automated

- [x] 4.1 Typecheck passes across all three projects
- [x] 4.2 The whole suite passes, including the change-only body tests
- [x] 4.3 The production build succeeds
- [x] 4.4 No `valueAsDate` or `valueAsNumber` appears anywhere under `src/client/`
- [x] 4.5 Nothing under `src/server/`, `src/domain/`, `migrations/` or `tests/` has changed
- [x] 4.6 The four existing `ConfirmStrip` call sites are unchanged
- [x] 4.16 No `new Date(` appears under `src/client/` outside the two known-safe sites, and
      `subscriptionFieldLabels` is the only subscription label map

#### Manual

- [ ] 4.7 The action row sits under the subtitle with the delta's spacing, disabled during first load
- [ ] 4.8 The edit panel opens in place, pre-filled, with focus on Name
- [ ] 4.9 Currency is locked with its hint naming the subscription's own code where an amount exists
- [ ] 4.10 A submit with no differences closes the panel with no request and no status line
- [ ] 4.11 A saved edit updates title, subtitle and the Home row, shows "Changes saved" and returns focus
- [ ] 4.12 A refused first month shows the field error with the panel open and the values kept
- [ ] 4.13 The strip shows both sentences, focuses Keep, and Keep and Escape both return focus
- [ ] 4.14 A real deletion of a disposable subscription returns Home with the sentence and `h1` focus
- [ ] 4.15 A failed deletion closes the strip, shows the header alert and moves focus to it
- [ ] 4.17 `error` disables both buttons; `no-owner` enables Delete, disables Edit, and deletes normally

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
