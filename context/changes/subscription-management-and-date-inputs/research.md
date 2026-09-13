---
git_commit: 218faad
branch: main
repository: subscription-splitter
topic: "What subscription-level editing and deletion inherit from the shipped ledger: every column and foreign key a delete must reach, which settings are mutable today and what dependent records constrain each one, how this codebase makes a multi-statement write atomic, every calendar field in the client with its wire format and bounds, and what native date and month controls actually do in the browsers this app is checked in"
tags: [research, subscriptions, d1, schema, deletion, atomicity, forms, date-inputs, browser-support]
status: complete
---

# Research: subscription-management-and-date-inputs

Date and researcher fields the schema lists are omitted; this repository records provenance by
commit and change ID, per `AGENTS.md`. Findings are separated into **Evidence** (read from this
repository, from its test run, or from a cited external source), **Inference** (a conclusion drawn
from evidence, stated as such) and **Unknown** (must be settled during design, planning or
implementation).

This research describes what exists and what browsers do. It names no affordance placement, no
copy, no colour and no interaction. Those belong to the designer; the questions this research
surfaced are in the last section.

## Research question

Which subscription-level settings can be edited safely, and what dependent records constrain each
one? What exactly must a subscription delete remove, in what order, and with what atomicity
guarantee on D1? Which calendar fields exist in the client, in what wire format, with what bounds
and what parsing? And do native `<input type="month">` and `<input type="date">` controls actually
render a picker in the browsers this app is verified in?

## Summary

Seven findings carry the change.

**Only four settings are mutable today, and the client offers none of them.** `PATCH
/api/subscriptions/:id` accepts `name`, `currency`, `locale` and `time_zone`
(`src/server/validation/subscriptions.ts:51-55`). `start_month` is deliberately excluded, with the
reason written into the file at `src/server/validation/subscriptions.ts:43-50`. No client code calls
the PATCH route at all: `src/client/api.ts` has only `listSubscriptions` (:142) and
`createSubscription` (:146). So the server already has half the edit surface and the client has none
of it.

**`currency` is the field that can silently corrupt history; `start_month` is the field with real
dependent-record constraints.** Every stored amount is an integer in minor units with no per-row
currency column (`migrations/0004_prices_and_breaks.sql:16`,
`migrations/0005_payments.sql:19`, `migrations/0006_recurring.sql:19`), and `formatMoney` divides by
100 unconditionally (`src/domain/money.ts:20`), so a switch to a zero-decimal currency is wrong by a
factor of one hundred, not merely relabelled. `start_month`, by contrast, is the lower bound five
separate rules validate against, so moving it earlier is always admissible and moving it later needs
five minimums checked. Details in section 3.

**There is no DELETE route, and eight tables have to be reached in order.** Four of the seven child
tables carry no `subscription_id` at all and are reachable only through `members` or through
`recurring_schedules`. `payments` omits the column deliberately
(`migrations/0005_payments.sql:1-4`).

**`db.batch()` is the only atomicity mechanism this codebase has, and D1 gives no other.** Four
existing writes already use it for exactly this reason, one of them with the constraint written in a
comment at `src/server/db/recurring.ts:211-213`. Cascades are declared on every foreign key and were
observed firing in the test runtime once, but the batch is correct whether or not foreign keys are
enforced.

**Eight calendar inputs exist and not one of them declares a `type` attribute.** All eight are
implicit text inputs carrying `inputMode="numeric"`, `pattern="\d{4}-\d{2}"` and an ISO placeholder.
`Field.tsx` sets no type, so switching each to `month` or `date` is a per-call-site change with no
change to the shared component.

**The timezone invariant is currently intact end to end, and there is exactly one way to break it.**
Five date sites exist in `src/client/` and `src/domain/`; all five are UTC-constructed and
UTC-formatted or pure string arithmetic. Native controls expose `.value` as the same ISO strings, so
reading `event.target.value` preserves the invariant. `valueAsDate` and `valueAsNumber` return
UTC-midnight `Date` objects and would reintroduce precisely what this codebase avoids.

**Desktop Safari and Firefox render no month picker; they fall back to a text field.** iOS Safari
does render one. That split is what makes a fallback mandatory, and one of the two browsers that
lacks it is installed on the verification machine. Section 6 has the matrix and the detection
technique.

## Detailed findings

### 1. The schema, table by table

Evidence, all from `migrations/`.

**`subscriptions`** (`migrations/0002_subscriptions.sql:7-17`): `id TEXT PRIMARY KEY` (:8),
`user_id TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE` (:9), `name TEXT NOT NULL` (:10),
`currency TEXT NOT NULL` (:11), `locale TEXT NOT NULL` (:12), `time_zone TEXT NOT NULL` (:13),
`start_month TEXT NOT NULL CHECK (start_month GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]')` (:14),
`created_at TEXT NOT NULL` (:15). One index, `subscriptions_user_id_idx(user_id)` (:17). No
defaults, no unique constraint beyond the primary key.

**`members`** (`migrations/0003_members.sql:6-15`): `id` (:7), `subscription_id TEXT NOT NULL
REFERENCES subscriptions(id) ON DELETE CASCADE` (:8), `name` (:9), `is_owner INTEGER NOT NULL CHECK
(is_owner IN (0,1))` (:10), `archived INTEGER NOT NULL DEFAULT 0` (:11), `created_at` (:12). Index
on `subscription_id` (:14) plus the partial unique index `members_one_owner_idx ON
members(subscription_id) WHERE is_owner = 1` (:15), which is the one-owner invariant of decision
D-006.

**`active_ranges`** (`migrations/0003_members.sql:17-24`): `id` (:18), `member_id TEXT NOT NULL
REFERENCES members(id) ON DELETE CASCADE` (:19), `joined_month NOT NULL` with the month GLOB (:20),
`left_month` nullable with the same GLOB (:21), and a table CHECK `left_month IS NULL OR left_month
>= joined_month` (:22). Index on `member_id` (:24). It references `members`, not the subscription.

**`price_history`** (`migrations/0004_prices_and_breaks.sql:12-18`): `id` (:13), `subscription_id`
with CASCADE (:14), `effective_from` (:15), `amount INTEGER NOT NULL CHECK (amount > 0)` (:16),
`UNIQUE(subscription_id, effective_from)` (:17). No separate foreign-key index, deliberately
(:8-11): the unique index leads with `subscription_id`.

**`break_months`** (`migrations/0004_prices_and_breaks.sql:20-24`): `subscription_id` with CASCADE
(:21), `month` (:22), composite `PRIMARY KEY(subscription_id, month)` (:23). No surrogate id, no
`created_at`.

**`payments`** (`migrations/0005_payments.sql:15-25`): `id` (:16), `member_id TEXT NOT NULL
REFERENCES members(id) ON DELETE CASCADE` (:17), `date TEXT NOT NULL` with the `YYYY-MM-DD` GLOB
(:18), `amount INTEGER NOT NULL CHECK (amount > 0)` (:19), `note TEXT NOT NULL DEFAULT ''` (:20),
`tag TEXT NOT NULL CHECK (tag IN ('manual','annual'))` (:21), `created_at` (:22). Index on
`member_id` (:25). **No `subscription_id` column, by design** (:1-4).

**`recurring_schedules`** (`migrations/0006_recurring.sql:16-27`): `id` (:17), `member_id` with
CASCADE (:18), `amount` (:19), `start_month` (:20), `end_month` nullable with a CHECK ordering it
after `start_month` (:21-24). Index on `member_id` (:27). Overlap between two schedules for one
member is not a database constraint (decision D-007, :5-7); it is a read-then-check in the route.

**`recurring_exceptions`** (`migrations/0006_recurring.sql:29-33`): `schedule_id` with CASCADE
(:30), `month` (:31), composite `PRIMARY KEY(schedule_id, month)` (:32). Two levels below the
subscription.

**Auth tables**, which a subscription delete must never touch: `user`, `session`, `account`,
`verification`, `rateLimit` in `migrations/0001_auth.sql`. The dependency runs the other way:
deleting a `user` cascades into `subscriptions` (`migrations/0002_subscriptions.sql:9`), never the
reverse.

### 2. Foreign-key enforcement on D1

Evidence. No `PRAGMA foreign_keys` and no `defer_foreign_keys` exists anywhere in `migrations/`,
`src/`, `tests/` or `wrangler.jsonc`. The only occurrences of the phrase in the repository are prose
in `context/archive/payments-and-recurring/reviews/impl-review.md:86` and `:198-199`.

Evidence, historical. That archived review records a probe that ran inside the integration runtime:
`PRAGMA foreign_keys` read back `1`, and deleting a schedule that had an exception took the exception
row count from one to zero (`context/archive/payments-and-recurring/reviews/impl-review.md:85-89`,
repeated at `:198-199`). The probe file itself is not in the tree.

Evidence, vendor. Cloudflare's D1 documentation states that D1 enforces foreign-key constraints by
default, equivalent to `PRAGMA foreign_keys = on` for every transaction, that user queries cannot
turn the setting off because every query runs in an implicit transaction, that only `PRAGMA
defer_foreign_keys = on` is available to defer validation to commit, and that enforcement covers
queries and migrations alike.

Unknown. Whether wrangler's migration runner behaves differently is not evidenced either way in this
repository. It cannot matter here: every file in `migrations/` is `CREATE TABLE` and `CREATE INDEX`
only, with no data rows, so foreign-key state during migration cannot affect this schema. The
integration suite applies the same files through `applyD1Migrations`
(`tests/integration/apply-migrations.ts:4-7`, migrations read at `vitest.integration.config.ts:6`).

Inference. Relying on the cascade alone would make the delete's correctness depend on a platform
default the repository has probed exactly once, in a file that no longer exists. An explicit ordered
`db.batch()` is correct whether or not foreign keys are enforced, and one integration test asserting
zero rows in every child table afterwards pins it either way.

### 3. The subscription routes, and what each setting costs to edit

Evidence. The router is `src/server/routes/subscriptions.ts`, mounted at `/` in
`src/server/index.ts:16`. `requireSession` is applied twice, once for the collection and once for
the subtree (`src/server/routes/subscriptions.ts:8-9`), because routers own absolute paths and
middleware does not cascade between them.

| Verb | Path | Schema | Writes | Returns | Errors |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/subscriptions` | none | none | array, `created_at asc`, `user_id` filtered (`src/server/db/subscriptions.ts:39-45`) | 401 |
| POST | `/api/subscriptions` | `createSubscriptionSchema` (`src/server/validation/subscriptions.ts:32-41`) | 3-statement `db.batch`: subscription, owner member, owner open range (`src/server/db/subscriptions.ts:60-76`) | 201 | 400 `{error, field}`, 401 |
| GET | `/api/subscriptions/:id` | none | none | the row (`src/server/routes/subscriptions.ts:28-33`) | 404, 401 |
| PATCH | `/api/subscriptions/:id` | `patchSubscriptionSchema` (`src/server/validation/subscriptions.ts:51-55`) | one update of name, currency, locale, time_zone (`src/server/db/subscriptions.ts:115-121`), merged over the stored row at `:108-113` | 200 | 400, 404, 401 |
| PUT | absent | | | | |
| DELETE | absent | | | | |

Validation rules, all in `src/server/validation/subscriptions.ts`: `name` trimmed non-empty (:3);
`currency` `/^[A-Z]{3}$/` (:5); `locale` validated by constructing `Intl.Locale` (:7-14);
`time_zone` by constructing `Intl.DateTimeFormat` (:16-23); `start_month`
`/^\d{4}-(0[1-9]|1[0-2])$/` (:25-27); `owner_name` trimmed non-empty defaulting to `'Me'` (:29).
Creation defaults are `PLN`, `pl-PL`, `Europe/Warsaw` (:36-39). Both schemas are `.strict()`, so an
unknown key including `id` or `user_id` is a 400, pinned by
`tests/integration/subscriptions.test.ts:150-173`. The patch schema is `.partial()` plus a `.refine`
rejecting an empty body (:53-55).

Evidence. The client calls neither PATCH nor any delete. `src/client/api.ts` exposes only
`listSubscriptions` (:142-144) and `createSubscription` (:146-151).
`src/client/screens/SubscriptionForm.tsx` submits create only (:54-62), and
`src/client/screens/SubscriptionDetail.tsx` carries no subscription-level action. Navigation is one
piece of `useState` in `src/client/App.tsx:13` and `:54-64` holding the whole subscription object
rather than an id, and there is no router. Inference: "old routes inaccessible" in the brief means
clearing that selection and letting the server 404, not URL handling.

Per-setting analysis, which is what "safe historical-data validation" has to mean concretely.

**`name`.** A pure label. It is absent from `SubscriptionSettings` (`src/domain/types.ts:56-61`) and
read nowhere in `src/domain/`. No dependent record constrains it.

**`locale`.** Display only. Passed to the summary at `src/domain/calc.ts:137` and consumed by
`formatMoney` (`src/domain/money.ts:19-21`) and the client formatters (`src/client/format.ts`). No
stored value changes meaning.

**`currency`.** Every amount is an integer in the minor units of whatever currency was in force when
the row was written, in `price_history.amount`, `payments.amount` and `recurring_schedules.amount`.
There is no per-row currency column and no conversion anywhere; the PRD puts conversion out of scope
(`context/foundation/prd.md:293`). Changing this field relabels every stored amount, carried through
`src/domain/calc.ts:136` into the summary. The sharper problem is that `formatMoney` divides by 100
unconditionally (`src/domain/money.ts:20`), so a move to a zero-decimal currency such as JPY is
wrong by a factor of one hundred rather than merely mislabelled. Inference: the only two
evidence-supported options are to refuse the change whenever any of the three amount-bearing tables
has a row for this subscription, or to gate it behind an explicit confirmation in the style of the
price-delete `?confirm=true` route. There is no data-preserving reinterpretation without a
conversion feature.

**`time_zone`.** No stored value changes, but the derived present moves. It is the sole input to
`currentMonth` (`src/domain/months.ts:35-43`), the one function permitted to read the clock, which
`AGENTS.md:19` requires. `currentMonth` bounds `enumerateMonths(startMonth, current)` in
`src/domain/calc.ts:87`, gates the not-yet-elapsed rule in `src/domain/month-status.ts:53-58`, and
bounds `affectedRange` in `src/domain/prices.ts:46-53`; the price-delete refusal calls it at
`src/server/routes/prices.ts:80`. Inference: a zone change across a month boundary can add or remove
one elapsed month, which moves `totalPlanCost`, every `owed`, and whether a standing order counts as
received for the edge month. Nothing is destroyed and no dependent record needs revalidating.

**`start_month`.** Five rules pin dependents at or after it, each applied on the way in:

1. Member ranges, `joined_month >= startMonth` (`src/domain/members.ts:38-40`, applied at
   `src/server/routes/members.ts:59` and `:97`).
2. Prices, `effective_from >= startMonth` (`src/server/routes/prices.ts:42-47`).
3. Break months, `month >= startMonth` (`src/server/routes/break-months.ts:40`).
4. Payments, `monthOf(date) >= startMonth` (`src/domain/payments.ts:14-21`, applied at
   `src/server/routes/payments.ts:56` and `:94`).
5. Standing orders, `start_month >= startMonth` (`src/server/routes/recurring.ts:67-68` on create and
   `:135-136` on the merged patch row).

Plus one invariant the create path writes: the owner member's opening range starts exactly at
`start_month` and stays open (`src/server/db/subscriptions.ts:74-75`, with the reason at `:57-59`).

Inference. Moving `start_month` **earlier** satisfies all five rules automatically, because it widens
the admissible window; it still changes derived output, since `src/domain/calc.ts:87` enumerates
from it and `src/domain/month-status.ts:53` excludes months before it, so `totalPlanCost` gains
unpriced months at zero. Moving it **later** requires checking six minimums for this subscription:
`min(active_ranges.joined_month)` over its members, which by construction includes the owner's
opening range at the old start month, `min(price_history.effective_from)`,
`min(break_months.month)`, `min(substr(payments.date,1,7))` over its members, and
`min(recurring_schedules.start_month)`. `left_month` and `end_month` impose no lower bound of their
own; their CHECKs only order each pair (`migrations/0003_members.sql:22`,
`migrations/0006_recurring.sql:21-24`). Note that making this field editable falsifies the prose at
`src/server/validation/subscriptions.ts:43-50` and `src/server/db/subscriptions.ts:57-59`, which both
have to be rewritten to describe how it works then.

**`owner_name`.** Write-once through create (`src/server/db/subscriptions.ts:72`); afterwards it is
the owner `members.name` and is edited through the member PATCH
(`src/server/routes/members.ts:79`). Not a subscription-level field. The owner member cannot be
deleted (`src/server/routes/members.ts:112-114`, 409).

### 4. Deletion: the graph, the order and the atomicity mechanism

Evidence, the graph rooted at a subscription.

```
subscriptions
├── members                        (subscription_id, CASCADE)
│   ├── active_ranges              (member_id, CASCADE)
│   ├── payments                   (member_id, CASCADE)
│   └── recurring_schedules        (member_id, CASCADE)
│       └── recurring_exceptions   (schedule_id, CASCADE)
├── price_history                  (subscription_id, CASCADE)
└── break_months                   (subscription_id, CASCADE)
```

Four tables reference a child rather than the subscription: `active_ranges`, `payments` and
`recurring_schedules` through `members`, and `recurring_exceptions` through `recurring_schedules`.
None carries `subscription_id`, so a hand-written delete reaches them by join.

Safe order, deepest first: `recurring_exceptions`, `recurring_schedules`, `payments`,
`active_ranges`, `members`, then `price_history` and `break_months` in either order, then
`subscriptions`. The last statement is the one carrying `where id = ? and user_id = ?`, and its
`meta.changes` distinguishes 204 from 404. Nothing outside this tree references a subscription or
any of its children, so no auth row and no other subscription is reachable by these statements.

Evidence, atomicity. `db.batch()` is the only mechanism in use. There is no `db.exec(`, no `BEGIN`
and no `COMMIT` anywhere in `src/` or `tests/`. Existing batches:

- `src/server/db/subscriptions.ts:60-76`, subscription plus owner member plus owner range, with the
  reason at `:56-59`: a subscription without an owner member has no defined share, so there must be
  no window in which one can be read.
- `src/server/db/members.ts:140-158`, member insert plus its range inserts, reading
  `[inserted].meta.changes === 0` at `:160` to detect a foreign parent.
- `src/server/db/members.ts:195-210`, member update plus a full range delete-and-reinsert, so a
  partial replacement cannot leave rows from two edits (:174-179).
- `src/server/db/recurring.ts:227-247`, schedule update plus out-of-range exception drops, with the
  constraint stated at `:211-213`: D1 has no interactive transaction, so the batch is what makes the
  two one write.

Single statements use `.prepare().bind().run()` and decide not-found from `result.meta.changes ?? 0`
(`src/server/db/payments.ts:196`, `src/server/db/prices.ts:69`, `src/server/db/members.ts:242`).

Evidence, vendor. Cloudflare's D1 client API documentation states that batched statements are SQL
transactions, that a failure in one statement aborts or rolls back the entire sequence, and that D1
operates in auto-commit with statements executed sequentially and non-concurrently. It describes no
interactive `BEGIN`/`COMMIT` over the binding. Inference: the eight deletes belong in one
`db.batch([...])`.

Evidence, ownership. `get` in `src/server/db/subscriptions.ts:91-97` is
`select * from subscriptions where id = ? and user_id = ?`, documented at `:90` as returning null for
a foreign or missing id, indistinguishable by design. The route maps null to 404 at
`src/server/routes/subscriptions.ts:30-31` and again at `:43`. A session-less request never reaches
it: `requireSession` answers 401 first (`src/server/middleware/require-session.ts:8-17`).

Child ownership is a single SQL predicate reused as a subquery so no separate check can race the
write: `OWNED_MEMBER_IDS` (`src/server/db/members.ts:32-34`), whose docblock at `:19-31` explains why
both `s.id` and `s.user_id` must stay in it; `OWNED_PAYMENT_IDS` (`src/server/db/payments.ts:19-22`)
with `OWNED_MEMBER_EXISTS` at `:25-27` so a PATCH cannot relocate a payment onto a foreign member
(:161-179); `OWNED_SCHEDULE_IDS` (`src/server/db/recurring.ts:31-34`). Inserts embed the predicate as
`insert ... select ... where exists (...)` and read `meta.changes`
(`src/server/db/payments.ts:104-124`, `src/server/db/prices.ts:41-51`). Inference: a subscription
delete should scope every child statement through a join to `subscriptions s ... and s.user_id = ?`,
so a foreign id deletes nothing at all rather than deleting children and then failing.

Evidence, the existing destructive patterns to imitate.

- **Price delete with a named-cost confirmation**, the closest analogue. Server
  `src/server/routes/prices.ts:70-95`: 404 for a foreign subscription or price id (:76-77), then
  unless `?confirm=true` it computes `monthsLosingTheirPrice` (:80, domain function
  `src/domain/prices.ts:33-43`) and answers 409 with a message naming the months and a `months`
  array (:82-88); with confirm it deletes and returns 204 (:92-94). Client
  `deletePrice(subscriptionId, priceId, confirm = false)` at `src/client/api.ts:216-219`, with the
  `months` array carried on `ApiError` (`src/client/api.ts:33-44`). UI
  `src/client/components/PriceHistory.tsx:170-190`, a two-stage `ConfirmStrip` keyed `'ask'` then
  `'anyway'` so it remounts and refocuses.
- **Member removal**, the 409-archival rule of `AGENTS.md:46`. Server
  `src/server/routes/members.ts:106-131`; the guard lives inside `remove`
  (`src/server/db/members.ts:223-243`, docblock `:215-222`) so no call site can skip it, with
  `hasDependents` at `:252-263`. UI `src/client/components/MemberList.tsx:173-184`. Pinned by
  `tests/integration/member-removal.test.ts`.
- **Schedule delete**, whose question already models the sentence the brief asks for: "Delete X's
  standing order? Its assumed receipts and not-received marks go with it. Recorded payments stay."
  (`src/client/components/RecurringSection.tsx:283-294`; server
  `src/server/routes/recurring.ts:157`).
- **Payment delete**: server `src/server/routes/payments.ts:109`, UI
  `src/client/components/PaymentList.tsx:254-266`.
- **Break-month delete**: the one destructive action with no confirmation, deliberately
  (`context/foundation/prd.md:165-166`); server `src/server/routes/break-months.ts:49`, UI
  `src/client/components/BreakMonths.tsx:51`.

`ConfirmStrip` (`src/client/components/ui/ConfirmStrip.tsx:20-44`) takes `question`, optional
`confirmLabel` defaulting to `'Delete'`, `onConfirm` and `onKeep`. It renders a non-modal strip with
a `btn-destructive` confirm and a `btn-quiet` Keep, focuses **Keep** on mount (:21-25) so the
dangerous button is never the default target, and routes a `stopPropagation`'d Escape to `onKeep`
(:27-31). It blocks nothing (:13-18). All four callers pass it into the `confirm` slot of
`LedgerEntry`, gated on a `pendingDelete` state equal to that row's id, and every `onKeep` restores
focus to that row's delete button. Evidence: there is no page-level confirmation component, so a
subscription-level confirmation on the detail screen is new surface.

### 5. Every calendar field in the client

Evidence. Eight rendered inputs, plus one calendar value written with no input at all. **Not one of
the eight declares a `type` attribute**, so every one is an implicit text input.
`src/client/components/ui/Field.tsx` never sets a type either.

| # | Input at | Meaning | Attributes today | Wire format and schema | Optional handling | Server bound |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `src/client/screens/SubscriptionForm.tsx:143` | Subscription start month, create only | `required`, `inputMode="numeric"`, `pattern="\d{4}-\d{2}"`, `autoComplete="off"`, placeholder `2026-01` | `start_month`, `YYYY-MM`, `src/server/validation/subscriptions.ts:25-27` used at `:38` | required, state `''` (:21), sent untrimmed (:59) | regex only; not patchable (`src/server/validation/subscriptions.ts:51-55`) |
| 2 | `src/client/components/MemberForm.tsx:142` | Member join month, per range | same quadruple, `required` | `active_ranges[i].joined_month`, `YYYY-MM`, `src/server/validation/members.ts:5-7`, `:16` | required; defaults to the subscription start month (:24); trimmed (:85) | `src/domain/members.ts:38-40`, ordering and overlap `:35-53` |
| 3 | `src/client/components/MemberForm.tsx:164` | Member leave month, open-ended | same quadruple, **no** `required`, placeholder `2026-06` | `left_month`, `YYYY-MM` or `null`, `src/server/validation/members.ts:18` | state `string \| null`, rendered `?? ''` (:171); empty becomes `null` (:86) | `src/domain/members.ts:35-37`; open range must be last `:48-50` |
| 4 | `src/client/components/PriceHistory.tsx:292` | Effective-price month | same quadruple, `required` | `effective_from`, `YYYY-MM`, `src/server/validation/prices.ts:9-11`, `:20` | required, state `''` (:220) | `src/server/routes/prices.ts:42-47`; no PATCH route for prices |
| 5 | `src/client/components/BreakMonths.tsx:212` | Break month | same quadruple, `required`, placeholder `2026-02` | `month`, `YYYY-MM`, `src/server/validation/prices.ts:28` | required, state `''` (:150) | `src/server/routes/break-months.ts:40-42`; delete takes the month in the path (`src/client/api.ts:232-234`) |
| 6 | `src/client/components/PaymentForm.tsx:156` | Payment date received, the only day-precision field | `required`, `autoComplete="off"`, placeholder `2026-01-15`; **no `inputMode`, no `pattern`** | `date`, `YYYY-MM-DD`, `src/server/validation/payments.ts:12-14` refined by `isCalendarDate`; create `:35-43`, patch `:50-54` | required, trimmed (:101) | `src/domain/months.ts:52-59` plus `src/domain/payments.ts:14-21`; **no upper bound by design** (`src/domain/payments.ts:10-12`) |
| 7 | `src/client/components/ScheduleForm.tsx:172` | Standing-order first month | same quadruple, `required` | `start_month`, `YYYY-MM`, `src/server/validation/recurring.ts:15`, create `:20-26`, patch `:40-44` | required, trimmed (:95) | `src/server/routes/recurring.ts:67-68` and `:135-136`; overlap `src/domain/recurring.ts:47-48` |
| 8 | `src/client/components/ScheduleForm.tsx:193` | Standing-order last month, open-ended | same quadruple, **no** `required`, placeholder `2026-12` | `end_month`, `YYYY-MM` or `null`, `src/server/validation/recurring.ts:16` | state is a plain `string` initialised `?? ''` (:50); empty becomes `null` (:96); clearing it reopens an ended arrangement (:90-91) | cross-field in schema on create (`src/server/validation/recurring.ts:23-26`), at route level on the merged row for patch (`src/server/routes/recurring.ts:129-130`, reason at `:33-39`) |
| 9 | no input, `src/client/components/RecurringSection.tsx:353-354` | Schedule exception month | tiles from `scheduleMonthStatuses` (:251-257), rendered at `:333` | `YYYY-MM` in the URL path, `src/client/api.ts:319-338` | toggle only | `src/server/routes/recurring.ts:184-186` and `:192-196` |

Evidence, absences. There is **no `min`, `max` or `step` attribute anywhere in `src/client/`**. All
bounds are server-side only. There is no date-range filter; the only list filter is a member
`select` (`src/client/components/PaymentList.tsx:137`).

Evidence, conventions. All seven month fields carry an identical attribute quadruple and the
identical hint "Month as YYYY-MM, like 2026-01", except the two open-ended ones, which use "Leave
empty while still active" and "Leave empty while it is still running". The payment date field is the
odd one out with no `pattern` and no `inputMode`. Two different empty conventions exist in state:
`MemberForm` holds `string | null` (`src/client/api.ts:171`), `ScheduleForm` holds `''`. Both
normalise to `null` at submit. Inference: a native month input yields `''` when cleared, so
`ScheduleForm` needs no change and `MemberForm`'s `?? ''` read already handles it.

### 6. Date parsing, and the one way to break the timezone invariant

Evidence. A complete search for `new Date(`, `Date.parse`, `toISOString`, `getMonth`, `Intl.` and
`toLocaleDateString` across `src/client/` and `src/domain/`, excluding tests, finds five sites. None
can shift a value across a timezone boundary.

| Site | What it does | Safe |
| --- | --- | --- |
| `src/client/format.ts:12-18` | `formatMonth`: splits `YYYY-MM`, builds `new Date(Date.UTC(y, m-1, 1))`, formats with `timeZone: 'UTC'` | yes, documented at `:7-8` |
| `src/client/format.ts:21-30` | `formatDate`: the same shape for `YYYY-MM-DD` | yes |
| `src/domain/months.ts:35-43` | `currentMonth`: `new Date()` then `Intl.DateTimeFormat('en-CA', { timeZone })` `formatToParts` | yes and intentional, the one clock read, per `AGENTS.md:19`, reason at `:29-34` |
| `src/domain/months.ts:52-59` | `isCalendarDate`: `new Date(0)` then UTC setters and getters, avoiding ISO-string parsing (`:45-51`) | yes |
| `src/domain/money.ts:20` | `Intl.NumberFormat`, no date | not a date site |

Everything else is string arithmetic: `addMonth` (`src/domain/months.ts:9-15`) works on
`year*12+(month-1)`, `enumerateMonths` (:18-27) and `monthOf` (:62-64, a `slice(0,7)`) never touch
`Date`. Every server-side month comparison is lexicographic on zero-padded ISO strings
(`src/server/routes/prices.ts:42`, `break-months.ts:40`, `recurring.ts:67`,
`src/domain/members.ts:38`), which is exactly why the wire format must not change.

Inference. Native controls expose `.value` as the same `YYYY-MM` and `YYYY-MM-DD` strings, so reading
`event.target.value` preserves the invariant with no change to any schema. The single trap is
`input.valueAsDate` and `input.valueAsNumber`, which yield UTC-midnight `Date` objects and would
reintroduce precisely what this codebase has avoided.

### 7. The presentation layer the designer inherits

Evidence. `src/client/components/ui/Field.tsx` is a render-prop wrapper. Props (:10-21): `id` (also
the control's id, so `<label htmlFor>` points at it), `label`, optional `hint`, optional `error`,
optional `span` defaulting to true, and `children: (control: ControlAttributes) => ReactNode`.
`ControlAttributes` (:4-8) is `{ id, 'aria-describedby'?, 'aria-invalid'? }`. Markup (:33-50) is a
`.field` or `.field .field-span` div, then the label, then the child control, then the hint span,
then the error span; that order is deliberate so a one-sided hint does not push its partner down
(:29-32). `aria-describedby` is the space-joined list of whichever exist (:26); `aria-invalid` is set
only when `error` is (:38). It sets no `type` and already hosts both `<input>` and `<select>`
(`src/client/components/PaymentForm.tsx:133`, `:190`). Inference: adding `type="month"` or
`type="date"` needs no change to `Field` itself. Note `Field.tsx:14` documents the hint slot as the
place the ISO form of a month or date belongs, which a native picker makes debatable.

Evidence, the rest. `fieldLabels.ts` holds six wire-name-to-label maps (:9-48), `labelFor` (:56-60)
resolving a nested path such as `active_ranges.0.joined_month` by falling back to its last segment,
and `messageWithLabel` (:69-77) performing the one permitted transform, swapping a leading wire-name
token for the display label and otherwise passing the sentence through verbatim. `FormAlert.tsx` is
the whole-form error line with an always-mounted `role="alert"` wrapper (:19-27) so announcements are
reliable, plus the shared `CONNECTION_FAILURE` copy (:31). `SectionAlert.tsx` is the same idea
outside a panel, with a dismiss button. `StatusLine.tsx` is the `role="status"` success line whose
sentence outlives its prop by a 200ms fade and leaves instantly under reduced motion (:30-37).

Evidence, how refusals surface. `src/client/api.ts:48-78`: 401 becomes `SignedOutError` (:54-56);
any other failure parses the body for `message` or `error` (:61-68), an optional `field` wire name
(:69) and the price-delete `months` array (:70-73), and throws `ApiError` (:74, class at :33-45).
Each form's `refuse(field, message)` resolves the wire name through `labelFor`; a mapped name becomes
a field error, an unmapped or absent one becomes the panel alert. `MemberForm` additionally gates on
a `RENDERED_FIELDS` set (:21) and decodes the range index (:69-75). A `refusals` counter rather than
a boolean is bumped on each refusal so a repeated identical failure still moves focus, and an effect
focuses the first `[aria-invalid="true"]` element or falls back to the alert line.
`apiMessages.ts:12-19` strips the developer-facing `confirm=true` sentence from a refusal before it
becomes a `ConfirmStrip` question, used only at `PriceHistory.tsx:177`.

Evidence, no range component exists. Both start/end pairs are hand-rolled: `MemberForm.tsx:134-175`
uses two independent `Field`s in a `.range-grid` inside a `fieldset.ranges` legended "Active months"
(:130-131), with add and remove controls (:177-197); `ScheduleForm.tsx:164-204` uses two `Field`s
with no fieldset, and they are not visually paired, because `First month` has `span={false}` (:168)
while `Last month` defaults to spanning.

Evidence, CSS (`src/client/index.css`, 1239 lines). `:root { color-scheme: light dark }` at :49-50,
so native pickers already follow the theme. A full dark token set under
`@media (prefers-color-scheme: dark)` at :117-134, media-query driven with no manual toggle.
`input, select, textarea` at :289-301 fixes `height: 40px`, `padding: 0 var(--s-3)`, a 1px
`--border`, radius 4px. Invalid styling at :314-319, disabled at :321-326, `select` chevron at
:328-334. At `max-width: 640px` controls go to 44px (:455-471). `.field`, `.field-span`,
`.field-hint`, `.field-error` and `.panel-grid` at :718-751; `.range-grid` at :1035-1044; both grids
collapse to one column below 640px (:1166-1169). **There is no
`::-webkit-calendar-picker-indicator` rule and no `input[type=...]` selector anywhere**, which is
unsurprising given that no input declares a type. Inference: the fixed 40px and 44px heights and the
symmetric horizontal padding were written for a bare text box and need checking against a native
control that renders an indicator glyph inside its padding box.

Evidence, the accepted design spec. `context/archive/visual-redesign/design-spec.md` section 3.4
(:189-204) specifies the input box, focus, invalid and disabled treatments and the label, hint and
`aria-describedby` rules, and at **:198-201 it instructs that month fields keep a text input with
`inputMode="numeric"`, `pattern="\d{4}-\d{2}"` and the ISO hint, and that date fields keep a text
input with the hint "Date as YYYY-MM-DD"**. S-08 reverses that instruction, so section 3.4 must be
amended by the designer rather than merely followed; this is the one place the brief and the accepted
spec contradict each other. Also binding: 4px radius and no shadows (:114-117); the single focus ring
`outline: 2px solid var(--green)` with `outline-offset: 2px` on `:focus-visible`, never removed and
never animated (:121-125); the two-column field grid for declared pairs only (:266-270); the full
validation convention (:272-292); months and dates displayed through `Intl` with `timeZone: 'UTC'`
and "every value the client sends stays `YYYY-MM` or `YYYY-MM-DD`" (:357-362); the authoritative pair
table (:614-625); the keyboard contract, where Enter inside a text input submits the panel's form
(:642) and Escape closes the open panel or strip; the single 640px breakpoint (:647-652); and the
preamble's rule that native `button`, `select`, `input`, `fieldset` and `label` elements stay native
(:15-16), which argues against a JavaScript date-picker library for the fallback.

### 8. What native date and month controls actually do

Evidence, external, with sources.

| Browser | `type="month"` | `type="date"` |
| --- | --- | --- |
| Chrome desktop | real month picker | real date picker |
| Edge desktop | real month picker | real date picker |
| Chrome Android | real month picker | real date picker |
| Safari desktop (macOS) | **no picker, falls back to a text field** | real date picker |
| Firefox desktop | **no picker, falls back to a text field** | real date picker |
| Firefox Android | **no picker, falls back to a text field** | real date picker |
| Safari iOS | real month picker (wheel) | real date picker |

Sources: MDN's `<input type="month">` page states the feature is not Baseline because it does not
work in some of the most widely used browsers, that support is limited to Chrome, Opera and Edge on
desktop plus most modern mobile browsers, and that non-supporting browsers degrade to
`<input type="text">`. The caniuse `input-datetime` feature data marks Firefox (through 157) and
Safari (through Technology Preview) as partial with note 6, "partial support omits `week` and
`month` input types", while listing Chrome 154, Edge 151, Chrome Android 151 and iOS Safari 26.6 as
supported; iOS Safari carries note 7 instead, "does not support `min`/`max`/`step` attributes on
date inputs".

Inference. Two of the three browsers a desktop user is likely to have will show a bare text box for
every month field, and one of them, Safari, is installed on the verification machine. That is what
makes the brief's fallback requirement load-bearing rather than defensive. `type="date"` needs no
fallback.

Evidence, feature detection. MDN gives this shape verbatim:

```javascript
const test = document.createElement("input");

try {
  test.type = "month";
} catch (e) {
  console.log(e.description);
}

if (test.type === "text") {
  // Browser does not support month input
}
```

Inference on the type-reflection check alone. A browser that recognises the `month` type but renders
no picker would still reflect `type === 'month'`, so reflection is necessary but not sufficient in
general. The stronger probe is value sanitisation: set `.value` to a string that is not a valid
month, such as `'not-a-month'`, and read it back. A control that implements the month value
sanitisation algorithm returns `''`; a text fallback returns the string unchanged. Running both and
requiring both to pass is the safest detection.

Evidence, `min`, `max`, `step`. On `type="month"` the bounds take the `yyyy-MM` form and `step` is
counted in months with a default of 1, where `any` behaves as `1` because the picker only offers
whole months. MDN notes that out-of-range behaviour differs: Edge may prevent scrolling to an
out-of-range month while Chrome may allow selection and then mark the value invalid. A browser that
falls back to text ignores all three for picker purposes, though constraint validation may still
apply. iOS Safari does not honour `min`, `max` or `step` on date inputs at all (caniuse note 7).
Inference: bounds set through these attributes are a convenience, never the enforcement; the server
rules in section 3 remain the only enforcement, which is consistent with how this codebase already
works.

Evidence, keyboard. MDN's month page carries no statement about keyboard operation. Inference from
the accepted spec's contract: native date and month controls are operated as segmented fields, with
arrow keys moving within and between segments and digits typed directly, and browsers differ on
whether Enter and Escape reach the surrounding form. That collides with design-spec section 7, where
Enter inside a text input submits the panel's form (:642) and Escape closes the open panel. Unknown:
the actual behaviour per browser. This must be measured in a real browser, not asserted, which is
what the brief means by not claiming a native calendar works from JSX inspection alone.

Evidence, styling. MDN states that `<input type="month">` does not support sizing attributes such as
`size`, so sizing is CSS only, and that in Chrome the generated content sits inside the form control
and cannot be styled or shown effectively. `::-webkit-calendar-picker-indicator` is the Chromium and
WebKit pseudo-element for the glyph that opens the picker; it is non-standard and absent in Firefox.
MDN's `color-scheme` page states that user agents change the default colours of form controls to
match the used colour scheme. Inference: because `src/client/index.css:49-50` already declares
`color-scheme: light dark`, the native pickers should follow the dark theme without a per-element
override; what needs checking is the intrinsic height and the indicator's effect on the fixed 40px
and 44px boxes.

### 9. Tests, tooling and gates

Evidence, layout. `vitest.unit.config.ts` runs `src/**/*.test.ts` in the node environment with no
bindings. `vitest.integration.config.ts` runs `tests/integration/**/*.test.ts` in the Workers pool
through `cloudflareTest`, reading `wrangler.jsonc`, binding test-only values for
`BETTER_AUTH_SECRET`, `APP_ORIGINS`, `COOKIE_SECURE`, `SEED_ENABLED` and `SEED_TOKEN`, and applying
migrations in `setupFiles` through `tests/integration/apply-migrations.ts:4-7`.

Evidence, the ownership pattern. `tests/integration/accounts.ts` is the shared fixture: `seedUser`
(:60-63) signs up through a `betterAuth` instance with sign-up enabled, which the public API
refuses; `signedInCookie(prefix, testId, email)` (:66-77) seeds and returns a session cookie;
`headersFor(prefix, testId, extra)` (:44-52) sets `cf-connecting-ip` from a per-file prefix, because
sign-in is rate limited per client address against a shared database that is never reset, and the
prefix assignments are listed in the docblock at `:7-22`. `insertOwnerlessSubscription` (:86-99)
reaches around the API for the one precondition no route can produce any more. The cross-account
shape is one test that creates in account A and asserts 404 from account B for each verb:
`tests/integration/subscriptions.test.ts:19` reads "lists a created subscription for its owner and
hides it from another account, and 404s cross-account read/write", with `expect(getFromB.status)
.toBe(404)` at `:43` and `expect(patchFromB.status).toBe(404)` at `:50`. Inference: a DELETE verb
extends that same test rather than needing a new file.

Evidence, current counts and gate results, run at `218faad`:

| Gate | Command | Result |
| --- | --- | --- |
| Types | `npm run typecheck` | pass, three projects, no output |
| Unit | `npm run test:unit` | pass, 18 files, 214 tests |
| Integration | `npm run test:integration` | pass, 12 files, 119 tests |

`npm test` runs the last two in sequence. `AGENTS.md` adds that `tools/reviewer/` is an independent
package with its own `npm test`, `npm run typecheck` and `npm run review`, invoked from that
directory, and that neither root gate covers it.

Evidence, browser tooling. There is **no Playwright, Puppeteer or other browser-automation
dependency** in `package.json` or `tools/reviewer/package.json`. The established practice is a real
browser driven over the DevTools protocol: `evidence/runs/release-4.md:219-227` records "A throwaway
Chrome (Chrome/152.0.7977.84) with its own empty profile, driven over the DevTools" protocol, with
captures taken per window id so nothing else on the machine is in frame (:284-285), and the machine's
appearance dark so captures show the dark palette (:285). Screenshots live in
`evidence/screenshots/` in numbered release slots (:278-283).

Evidence, browsers on this machine. `/Applications` holds Google Chrome, Safari and Arc. **Firefox
and Microsoft Edge are not installed.** Inference: the Safari month fallback can be verified locally
and Chrome covers the picker case; Firefox, Edge and the two mobile browsers cannot be verified on
this machine without installing something or using a device, and the plan has to say which of those
it will do and which it will report as unverified.

### 10. Foundation documents this change must update

- `context/foundation/prd.md:152`, FR-005 describes creating a subscription with those settings;
  there is no functional requirement for editing or deleting one. The "> Shipped:" note convention at
  `:162-166`, `:180-184` and `:187-189` is the house style for recording what landed.
- `context/foundation/prd.md:161-166`, FR-008, the correct-by-remove-and-re-record policy and the
  `?confirm=true` gate, which a currency or start-month edit interacts with.
- `context/foundation/prd.md:176-184`, FR-011, where the owner participant "is created with the
  subscription itself" and "cannot be deleted"; a subscription delete removes it, and the note must
  say that this happens by removing the whole subscription.
- `context/foundation/prd.md:134` and `:146`, which already cover deletes naming another account's
  records; these need confirming against the new verb, not rewriting.
- `context/foundation/prd.md:292-293`, the out-of-scope list, whose "No currency conversion. One
  subscription, one currency." is the governing constraint on an editable `currency`.
- `context/foundation/prd.md:231` and `:237`, the time-zone and display conventions an editable
  `time_zone` puts in motion.
- `context/foundation/test-plan.md:52`, the risk 2 property covering reads, updates and deletes
  including a child reached through a foreign parent.
- `context/foundation/test-plan.md:53`, the risk 3 property which explicitly names what a delete is
  allowed to cascade to.
- `context/foundation/test-plan.md:66`, "for every verb the resource offers", which gains DELETE.
- `context/foundation/test-plan.md:67`, the atomic-write coverage inventory.
- `context/foundation/test-plan.md:195`, the existing guidance that a preserve-unrelated-data test
  must assert the owner's own records survive.
- `context/foundation/roadmap.md:287`, S-08 status, with the outcome at `:290` and the done-when at
  `:291`.
- `AGENTS.md:9`, "No roadmap item is open", now false; and `AGENTS.md:46`, the never-hard-deleted
  rule for participants with payments, which needs a carve-out because deleting the subscription does
  hard-delete them.
- `src/server/validation/subscriptions.ts:43-50` and `src/server/db/subscriptions.ts:57-59`, two
  comments asserting that `start_month` cannot move, which become false if it can.

## Code references

- `migrations/0002_subscriptions.sql:7-17` through `migrations/0006_recurring.sql:29-33` - the eight
  tables and every foreign key a delete must reach.
- `src/server/routes/subscriptions.ts:8-45` - the four routes and the non-disclosing 404.
- `src/server/validation/subscriptions.ts:32-55` - the create and patch schemas, and the comment
  explaining the `start_month` exclusion.
- `src/server/db/subscriptions.ts:56-76` - the create batch and the owner-member invariant;
  `:91-97` - the ownership read.
- `src/server/db/recurring.ts:211-247` - the atomicity constraint stated and applied.
- `src/server/db/members.ts:19-34` - why both `s.id` and `s.user_id` stay in the ownership predicate;
  `:215-263` - the guard that lives inside `remove`.
- `src/server/routes/prices.ts:70-95` - the confirmation-gated destructive route.
- `src/client/components/ui/ConfirmStrip.tsx:13-44` - the destructive-confirmation component.
- `src/client/components/ui/Field.tsx:4-50` - the render-prop field wrapper that sets no type.
- `src/client/format.ts:7-30` and `src/domain/months.ts:29-64` - every date site, all UTC-anchored.
- `src/client/index.css:49-50`, `:289-341`, `:455-471` - `color-scheme` and the fixed control box.
- `tests/integration/accounts.ts:7-99` - the two-account fixture and the rate-limit prefix scheme.
- `tests/integration/subscriptions.test.ts:19-50` - the cross-account 404 shape per verb.

## Architecture insights

The repository already has a house answer for every hard part of this change, and the work is mostly
extension rather than invention. Ownership is a SQL predicate embedded in the statement, never a
separate read, so a race cannot open between check and write. Atomicity is `db.batch()` and only
`db.batch()`, with the reason written into the code each time. A destructive action that costs the
user something states the cost, refuses with 409 and takes `?confirm=true`. Refusals travel as a
sentence plus a wire field name, and the client maps that name to a label per form. Months and dates
are ISO strings everywhere and become `Date` objects only inside two UTC-anchored formatters and two
domain helpers.

The one genuinely new surface is a page-level confirmation: every existing confirmation is a strip
inside a `LedgerEntry` row, and the subscription delete has no row to sit in and a longer sentence to
say than any existing `question` string.

The one genuine conflict is design-spec section 3.4, which instructs that month and date fields keep
text inputs with ISO hints. The brief overrides it, so the delta has to amend that section rather
than comply with it, in the same way the S-07 login amendment was recorded.

## Historical context

- `context/archive/payments-and-recurring/reviews/impl-review.md:85-89` and `:198-199` - the only
  in-repository evidence that D1 cascades fire, from a probe whose file is gone.
- `context/archive/visual-redesign/design-spec.md:189-204`, `:266-292`, `:357-362`, `:614-652` - the
  accepted form, validation, formatting, pairing and keyboard contract this change must stay inside
  or explicitly amend.
- `context/archive/google-sign-in/change.md` - the precedent for recording a design amendment in the
  change folder rather than editing the archived spec.
- `evidence/runs/release-4.md:219-320` - the browser-verification practice: a throwaway Chrome with
  an empty profile driven over the DevTools protocol, captures by window id, numbered release slots.

## Related research

- `context/archive/visual-redesign/research.md` - how the client's HTML and CSS are produced and what
  a markup change costs in tests.
- `context/archive/google-sign-in/research.md` - the same evidence, inference and unknown separation
  and the Workers-runtime constraints.

## Open questions for the designer

These are questions, not decisions. Each carries the options the evidence supports.

1. **Which settings does the edit form expose?** The server already accepts `name`, `currency`,
   `locale` and `time_zone`. Options: expose exactly those four and leave `start_month` immutable, in
   which case nothing in section 3's dependent-record analysis is needed; or add `start_month`, which
   needs the six-minimum check and rewrites two code comments. The brief asks for "start month and
   other existing user-configurable settings where meaningful", which points at the second but does
   not settle it.

2. **What happens to `currency` when amounts exist?** Options: refuse whenever `price_history`,
   `payments` or `recurring_schedules` has a row, which is the strictest reading of "do not silently
   relabel"; gate it behind a `?confirm=true` 409 that names how many amounts will be reinterpreted,
   matching the price-delete precedent exactly; or allow it freely and explain in the hint. The
   zero-decimal case, where `formatMoney` divides by 100 regardless, argues against the third.

3. **What does a `time_zone` change say?** It moves which month is current and can change every
   balance by one month's worth. Options: allow silently, allow with a hint, or allow with a
   confirmation. No data is at risk either way.

4. **Where does the edit affordance live and what shape is the form?** The detail screen has no
   subscription-level action today and the existing forms are all panels inside sections. Options: a
   new panel at the top of the detail screen following the existing `DisclosurePanel` pattern; a
   dedicated screen; or an inline header action.

5. **What shape is the delete confirmation?** `ConfirmStrip` is non-modal, focuses Keep on mount and
   takes a single `question` string, but every existing use is inside a `LedgerEntry` row. The brief
   wants the confirmation to name the subscription and enumerate seven record kinds, which is longer
   than any current question. Options: reuse `ConfirmStrip` with a multi-sentence question at page
   level; extend it; or specify a new page-level component. Whichever it is, the Keep-focused,
   Escape-cancels, nothing-blocked behaviour is the established contract.

6. **What is the month fallback for Safari desktop and Firefox?** Evidence says both render a bare
   text box. Options: keep today's `pattern` and ISO hint as the fallback, which is what the text box
   already is and which the brief calls an unexplained plain string field unless it is labelled;
   supported native `<select>` elements for year and month, which stays inside the spec's
   native-elements rule; or adapting `type="date"` with an explicit month-only meaning, which the
   brief permits. The spec's preamble at `design-spec.md:15-16` argues against a JavaScript picker
   library.

7. **How is the fallback chosen?** Options: feature-detect once at module load and render one or the
   other; always render `type="month"` and let the browser degrade, adding the explanatory hint
   unconditionally; or feature-detect per field. Detection itself should be both the type reflection
   and the value-sanitisation probe, since reflection alone is not conclusive.

8. **Do the ISO hints stay once a picker renders?** `Field.tsx:14` documents the hint slot as the
   home of the ISO form, and design-spec `:198-201` mandates it. In a browser with a picker the hint
   is redundant; in one without it, it is the only format guidance. Options: keep it always, drop it
   where a picker exists, or reword it.

9. **Do `min` and `max` get set, given they are advisory?** The server rules are the only
   enforcement and iOS Safari ignores the attributes entirely. Options: set `min` to the subscription
   start month on every dependent field for convenience; set none and rely on refusals; or set them
   only where a server rule already exists.

10. **What does section 3.4 of the accepted design spec become?** It currently instructs the
    opposite of this change. Options: amend it in a `design-delta.md` in this change folder, as S-07
    did, or edit the archived spec. The S-07 precedent is the former.

11. **Which browsers get verified, and which are reported unverified?** Only Chrome, Safari and Arc
    are installed on the verification machine; Firefox and Edge are not, and there is no Playwright
    or Puppeteer dependency. Options: install Firefox for the fallback check, verify Safari as the
    representative fallback browser and report Firefox and Edge from published support data, or
    verify on a device for the mobile cases.

12. **Does the fixed 40px and 44px control height survive a native picker?** The CSS was written for
    a bare text box and sets symmetric horizontal padding, while a native control renders an
    indicator glyph inside the padding box and has its own intrinsic height, most notably in Safari.
    This has to be measured, not assumed.
