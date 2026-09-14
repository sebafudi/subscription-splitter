---
git_commit: c10d54f
branch: main
repository: subscription-splitter
topic: "What a compact per-person calendar inherits: how the subscription detail screen loads and renders five unbounded lists, every field, state and action those lists display, the exact accounting contract a read-only month projection has to reproduce, what record shapes the browser already holds, and what a six-person eight-year fixture costs to build"
tags: [research, ui, client, calendar, accounting, projection, fixtures, accessibility]
status: complete
---

# Research: compact-member-calendar

Date and researcher fields the 10x-research schema lists are omitted; this repository records
provenance by commit and change ID, per `AGENTS.md`. Findings are separated into **Evidence** (read
from this repository at the commit above), **Inference** (a conclusion drawn from evidence, stated
as such) and **Unknown** (must be settled by the designer, by the plan, or by a measurement this
research did not take).

This research describes what exists and what the calculation guarantees. It names no layout, no
cell shape, no colour, no type size and no interaction. Those belong to the designer. The questions
this research surfaced are in the last section, each marked *designer decision*, *plan decision* or
*resolved by research*.

## Research question

What does the subscription detail screen actually render, from load to each list, and what makes it
grow without bound? What is the complete inventory of fields, states and actions that a compact
per-person calendar has to keep reachable, including error, archived, deleted-refusal, signed-out
and empty states? Exactly how does the shipped calculation combine recorded receipts with assumed
recurring receipts, and what invariants must a read-only monthly projection reproduce so a calendar
cell cannot disagree with the summary? Which record shapes does the browser already hold, and would
a calendar need anything the server does not already send? And what does a synthetic six-person,
eight-year fixture require?

## Summary

Nine findings carry this change.

**The page is unbounded in four independent directions at once, and only one of them is the
participant list.** `SubscriptionDetail.tsx:105-113` loads six collections in one `Promise.all` and
`:408-462` renders five sections in sequence. `PaymentList` renders one row per payment
(`PaymentList.tsx:213-301`), `RecurringSection` renders one row per schedule *and one tile per
elapsed month of every schedule* (`RecurringSection.tsx:333-377`), `PriceHistory` one row per price
entry and `BreakMonths` one row per skipped month. With six people and eight years, the standing
orders alone produce up to 96 tiles per schedule. `MemberList` is the *shortest* of the five: it
renders exactly one row per participant and does not grow with history at all. Decorating
`MemberList` would therefore leave the page as long as it is now. This confirms the plan's stated
current state (`plan.md`, "Current state") against the tree.

**No pagination or limit exists anywhere on the server.** Every list route returns every row
(`src/server/db/payments.ts:62`, `prices.ts:21`, `recurring.ts:67`, `break-months.ts:10`,
`members.ts:65`), with `order by` and no `limit` clause; the only two `limit 1` occurrences
(`payments.ts:212`, `recurring.ts:309`) are single-row lookups. Bounding is entirely a client
concern, and a calendar that renders only the selected year is the only mechanism available.

**The browser already holds everything the domain calculation reads. No server change is needed.**
`SubscriptionDetail` holds `summary`, `members`, `prices`, `breakMonths`, `payments` and `schedules`
(`:62-69`, `:347`). Those are exactly the seven fields of `SubscriptionState` (`src/domain/types.ts:63-71`)
once `settings` is taken from the `subscription` prop and `recurringExceptions` is flattened out of
`Schedule.exceptionMonths` (`src/client/api.ts:268`). The screen already does half of this at
`SubscriptionDetail.tsx:357-365`, where it assembles the narrowed `MemberMonthInputs` and passes it
into `RecurringSection`, which calls `scheduleMonthStatuses` in the browser
(`RecurringSection.tsx:261-267`). A projection may call `chargedMonthStatus`, `perPersonShare`,
`priceForMonth` and `scheduleMonthStatuses` directly rather than reimplementing any rule.

**Recorded money and assumed money are two separate stores that the calculation adds without ever
reconciling them.** `balanceForMember` sums *every* manual payment for the member with no month
filter at all (`calc.ts:73-76`) and adds `recurringReceived` over the enumerated window
(`calc.ts:76`). Nothing anywhere detects that a manual receipt and an assumed receipt describe the
same money. The organizer's only tool is the per-month exception toggle
(`RecurringSection.tsx:355-372`). A cell that showed one combined figure would silently assert a
reconciliation the product does not perform; the two must stay separately labelled inside one cell.

**A payment's date is its receipt month and says nothing about which months it settles.** The domain
buckets a manual payment by month in exactly one place, `collectedThisMonth`
(`calc.ts:125-127`), and there only to answer "collected this month". `owed` and `paid` are lifetime
figures over different windows: `owed` runs from the plan's first month to the current month
(`calc.ts:87`), while manual `paid` has no window whatsoever. A future-dated payment therefore
raises `paid` now and is pinned as such by `calc.test.ts:235-240`. Any per-year grid that sums its
own cells to a balance will disagree with the summary unless receipts outside the selected window
are surfaced somewhere.

**Zero is not "unpriced", and the calculation deliberately keeps price out of receipt eligibility.**
`priceForMonth` returns `0` both for a month before any price entry applies and for a break month
(`prices.ts:10-21`), so the number alone cannot distinguish "costs nothing because the plan was
paused" from "no price has ever been recorded". `memberMonthStatus` excludes price from its
conditions on purpose, with the reason written into the file (`month-status.ts:42-45`, decision
D-007): an unpriced month still counts as received against a standing order but charges nobody.
`chargedMonthStatus` adds `unpriced` on top (`month-status.ts:67-77`). A completeness signal must be
read from actual price coverage (`priceHistory.some(entry => entry.effectiveFrom <= month)`), never
from a zero amount.

**Exclusion precedence is already fixed, tested, and named.** `memberMonthStatus` checks widest to
narrowest and returns the outermost failing condition (`month-status.ts:47-59`), pinned by
`month-status.test.ts:100-104`. `scheduleMonthStatuses` applies the schedule's own exception *last*,
so a month already excluded by a break or by a membership gap is never relabelled as the organizer's
own mark (`recurring.ts:82-85`, comment at `:59-63`, pinned by `recurring.test.ts:160-169`). Seven
canonical names exist (`MonthExclusion`, `month-status.ts:6-13`) and the screen already has one
English phrase for each (`RecurringSection.tsx:63-71`).

**Row order is by balance and is not stable across a mutation.** `computeSummary` sorts
`memberResults` by `balance` ascending, most-owing first (`calc.ts:105`), and `MemberList` renders
that order verbatim (`MemberList.tsx:68`). Recording a payment changes a balance and therefore can
move a row while the organizer is looking at it. The current screen absorbs this because rows are
short; a per-person calendar makes a reorder far more disruptive. This is a live design question,
not an implementation detail.

**Nothing in this repository renders a React component in a test.** There is no `.test.tsx` file, no
jsdom environment (`vitest.unit.config.ts:6` sets `environment: 'node'`) and no testing-library
dependency. The three client test files test pure exported functions with hand-built stubs. A
projection written as a pure module is therefore testable to the same standard as the domain; a
component is not testable at all without new tooling, which is out of scope.

## Detailed findings

### 1. The rendering path and data flow, load to list

**Evidence.** `App.tsx` holds the selected subscription in state and switches screens by conditional
render; there is no router. `SubscriptionDetail` is given the whole `Subscription` object plus five
callbacks (`SubscriptionDetail.tsx:47-57`).

The load is a single effect (`:130-132`) calling one `useCallback` (`:100-128`) that issues six
parallel requests: `getSummary`, `listMembers`, `listPrices`, `listBreakMonths`, `listPayments`,
`listSchedules` (`:105-112`). All six land in one `Loaded` object (`:62-69`, `:113`). A reload keeps
the figures already on screen rather than collapsing to the skeleton (`:103`).

Three failure branches exist. `SignedOutError` calls `onSignedOut()` and returns (`:115-118`); a 409
becomes the `no-owner` state (`:119-122`); anything else becomes `error` with the server's message or
`CONNECTION_FAILURE` (`:123-127`). The `error` and `no-owner` states render the header plus one
alert and nothing else (`:291-308`).

Every mutation in every section calls `onChanged`, which is `() => void load()`
(`:414`, `:425`, `:435`, `:446`, `:460`). There is one refresh path for the whole screen; no section
refetches itself, with one exception: `PaymentList` refetches its own filtered list from the server
whenever the filter changes (`PaymentList.tsx:67-84`).

`summary.currentMonth` is the subscription's time-zone-derived current month, computed once on the
server (`src/server/routes/summary.ts:34`, `src/domain/months.ts:35-43`). The client never derives it
for accounting purposes. `MonthField` does call `currentMonth(timeZone)` in the browser
(`MonthField.tsx:68`) but only to build the option range of its `<select>` fallback.

**Inference.** A projection can be computed synchronously in `SubscriptionDetail` from data already
in `state.data` plus the `subscription` prop, with no new request and no new round trip per cell.

### 2. What makes the page unbounded

**Evidence.** Row counts per section, at the commit above:

| Section | Rows rendered | Grows with |
| --- | --- | --- |
| `MemberList` | one per `summary.members` entry (`MemberList.tsx:314`) | participants only |
| `PriceHistory` | one per price entry (`PriceHistory.tsx:173`) | price changes |
| `BreakMonths` | one per skipped month (`BreakMonths.tsx:135`) | skipped months |
| `PaymentList` | one per payment (`PaymentList.tsx:214`) | every receipt ever |
| `RecurringSection` | one per schedule (`:221`) plus one tile per elapsed month per schedule (`:335`) | schedules × elapsed months |

`RecurringSection` is the dominant term. `scheduleMonthStatuses` enumerates from the schedule's start
month to the earlier of its end month and the current month (`recurring.ts:79-81`), and every
returned status becomes a `<li class="tile">` (`RecurringSection.tsx:343`). A tile is a 156px-wide
bordered box (`index.css:1045-1055`). Eight years of one open-ended schedule is 96 tiles; six people
with a rate change each is twelve schedules.

`MemberList` already bounds one thing: an archived participant whose balance is exactly zero is
moved behind a disclosure (`:69-70`, `:317-335`), with the stated reason that hiding a live balance
is how money goes missing from a screen (`:36-38`).

`SectionIndex` exists precisely because the column is long: its own comment gives the measured height
as roughly 4200px at 390 wide (`SectionIndex.tsx:47-49`).

### 3. Detail and action preservation matrix

Every row is a field, state or action the shipped screen displays or offers. "Destination" is a
*proposed* category, not a decision: the designer settles the actual placement. Categories are
**cell** (a month cell in the compact view), **inspector** (the selected-month detail view),
**person** (the per-person header or row summary), **history** (bounded full-history access),
**manage** (a management panel or form) and **unchanged** (stays where it is).

#### Participants

| # | Field / state / action | Source | Current location | Semantics | Proposed destination |
| --- | --- | --- | --- | --- | --- |
| 1 | Participant name | `MemberList.tsx:173` | row primary line | `MemberSummary.name`, copied from the member record | person |
| 2 | "archived" tag | `MemberList.tsx:174` | row primary line | `MemberSummary.archived`; presentation only, never affects liability (`members.ts:8-13`) | person |
| 3 | "not active this month" tag | `MemberList.tsx:175` | row primary line | `rangeCovers(member, current)` (`calc.ts:96`) | person |
| 4 | Balance, as "owes X" / "ahead X" / "settled" | `MemberList.tsx:179-182`, `Money.tsx:31-40` | row figure | `paid - owed`; words carry the sign, never a bare minus | person |
| 5 | Owed (lifetime) | `MemberList.tsx:243` | row cells | Σ `shareForMember` over plan start to current (`calc.ts:72`) | person |
| 6 | Paid (lifetime) | `MemberList.tsx:246` | row cells | all manual receipts, unwindowed, plus recurring in window (`calc.ts:73-76`) | person |
| 7 | This month's share | `MemberList.tsx:249` | row cells | `shareForMember(state, member, current, current)` (`calc.ts:97`) | person |
| 8 | Row order, most-owing first | `calc.ts:105`, `MemberList.tsx:68` | list order | sort by `balance` ascending; unstable across mutations | **designer decision** |
| 9 | Settled-archived participants hidden behind a toggle | `MemberList.tsx:69-70`, `:317-335` | disclosure below list | archived **and** balance exactly 0 | person / history |
| 10 | "No participants yet." | `MemberList.tsx:312` | section body | empty state, shown only when both lists are empty | unchanged |
| 11 | Add participant action and panel | `MemberList.tsx:264-278`, `:284-309` | section header, disclosure | opens `MemberForm` with `editing: null` | manage |
| 12 | Edit participant action and panel | `MemberList.tsx:199-210`, `:135-164` | row actions | opens `MemberForm` with the member; replaces the row in place | manage |
| 13 | Archive / Unarchive action | `MemberList.tsx:212-226` | row actions | `updateMember({archived: !archived})`; label flips | manage |
| 14 | Delete participant action | `MemberList.tsx:227-237` | row actions | opens the confirm strip | manage |
| 15 | Delete confirmation wording "Their payments stay recorded." | `MemberList.tsx:187` | confirm strip | states what survives the delete | manage |
| 16 | Delete refusal, server message | `MemberList.tsx:128`, `:281` | section alert | any `ApiError` message verbatim, else `CONNECTION_FAILURE` | manage |
| 17 | Focus after a completed delete → section heading | `MemberList.tsx:120` | - | the row that held focus is gone | **must be redefined** |
| 18 | Focus after a refused delete → that row's Delete button | `MemberList.tsx:129` | - | the row still stands | **must be redefined** |
| 19 | Focus after closing edit → that row's Edit button | `MemberList.tsx:88-92` | - | | **must be redefined** |
| 20 | Focus after closing add → Add button | `MemberList.tsx:81-86` | - | | **must be redefined** |
| 21 | Success sentence and row highlight | `MemberList.tsx:99`, `:170`, `useSectionStatus.ts:36-43` | heading status line, row tint | one timer drives both, 4000ms | manage |
| 22 | Member form: name | `MemberForm.tsx:124-134` | panel | required | manage |
| 23 | Member form: active ranges, From / To pairs | `MemberForm.tsx:136-202` | panel fieldset | whole set replaced, never merged (`:32`); To empty means "Still active" | manage |
| 24 | Member form: add / remove a range | `MemberForm.tsx:181-201` | panel fieldset | first range cannot be removed | manage |
| 25 | Member form: per-range field errors by path | `MemberForm.tsx:74-81` | panel | server field path `active_ranges.0.joined_month` | manage |

#### Payments received

| # | Field / state / action | Source | Current location | Semantics | Proposed destination |
| --- | --- | --- | --- | --- | --- |
| 26 | Payment amount, recorded treatment | `PaymentList.tsx:248`, `Money.tsx:16` | row primary | ink, weight 600 | cell + inspector |
| 27 | "from `<name>`" | `PaymentList.tsx:248` | row primary | resolved from `members`; falls back to "Unknown participant" (`:94`) | inspector |
| 28 | Kind label, "One-off" / "Yearly lump sum" | `PaymentList.tsx:32-35`, `:253` | row secondary | `Payment.kind`, `'manual' \| 'annual'` | inspector |
| 29 | Note | `PaymentList.tsx:254` | row secondary | free text, may be empty | inspector |
| 30 | Original receipt date, formatted | `PaymentList.tsx:257`, `format.ts:20-29` | row figure | `YYYY-MM-DD`, formatted UTC in the subscription locale | inspector |
| 31 | Two receipts on one day | `PaymentList.tsx:214` | two rows | ordered `date desc, created_at desc` (`db/payments.ts:62`); both keep their own id | cell count + inspector |
| 32 | Heading count of visible payments | `PaymentList.tsx:133` | section heading | reflects the filter, not the total | history |
| 33 | Per-participant filter select | `PaymentList.tsx:137-151`, `:67-84` | section subtitle | server-side filter; a foreign id is a 404, not an empty list (`routes/payments.ts:30-35`) | history |
| 34 | Edit payment action and panel | `PaymentList.tsx:272-283`, `:215-241` | row actions | replaces the row in place | inspector / manage |
| 35 | Delete payment action and confirm | `PaymentList.tsx:284-294`, `:258-269` | row actions | question names amount and participant | inspector / manage |
| 36 | Focus after delete → section heading; after refusal → Delete button | `PaymentList.tsx:115`, `:124` | - | | **must be redefined** |
| 37 | "No payments recorded yet." | `PaymentList.tsx:211` | section body | | unchanged / history |
| 38 | Refusal "Add a participant before recording a payment." | `PaymentList.tsx:176-180`, `:163-169` | under heading | the Add button is `aria-disabled` and `aria-describedby` this sentence, never `disabled` | manage |
| 39 | Payment form: From (participant select) | `PaymentForm.tsx:135-150` | panel | owner excluded (`:51`); falls back to the first participant (`:59-61`) | manage |
| 40 | Payment form: Date received | `PaymentForm.tsx:152-168` | panel | native `type="date"` with `min = startMonth-01` (`DateField.tsx:17-29`) | manage |
| 41 | Payment form: Amount | `PaymentForm.tsx:170-188` | panel | major units in the field, minor over the wire (`:32-34`) | manage |
| 42 | Payment form: Kind | `PaymentForm.tsx:190-202` | panel | two options only | manage |
| 43 | Payment form: Note | `PaymentForm.tsx:204-213` | panel | optional | manage |

There is **no tag field on a payment**. `change.md` names "notes and tags"; the record carries `note`
and `kind` only (`src/domain/types.ts:47-54`, `validation/payments.ts`). *Resolved by research:* the
matrix preserves `note` and `kind`; nothing is lost, and no tag surface needs designing.

#### Standing orders

| # | Field / state / action | Source | Current location | Semantics | Proposed destination |
| --- | --- | --- | --- | --- | --- |
| 44 | Monthly rate, assumed treatment | `RecurringSection.tsx:277` | row primary | dotted underline, weight 400 (`index.css:796-801`) | cell + inspector |
| 45 | Schedule window, "until X" or "from X, still running" | `RecurringSection.tsx:282-284` | row figure | `endMonth` null means open-ended | inspector / manage |
| 46 | Assumed total so far | `RecurringSection.tsx:289` | row secondary | counted months × rate, computed in the browser (`:268-269`) | person / inspector |
| 47 | "over N of M elapsed months" | `RecurringSection.tsx:290-291` | row secondary | counted vs enumerated | person / inspector |
| 48 | Per-month tile: month label | `RecurringSection.tsx:344` | tile | | cell |
| 49 | Per-month tile: "X assumed received" | `RecurringSection.tsx:345-349` | tile | only when the month counts | cell + inspector |
| 50 | Per-month tile: exclusion phrase | `RecurringSection.tsx:350-354`, `:63-71` | tile | one English phrase per `MonthExclusion` | cell + inspector |
| 51 | Tile state: counted / not-received / excluded | `RecurringSection.tsx:336-341` | tile class | green left rule, red left rule, dashed border (`index.css:1061-1071`) | cell |
| 52 | "Mark not received" / "Mark received" toggle | `RecurringSection.tsx:355-372` | tile | `PUT` / `DELETE` on the exception path; only on counted or excepted months | cell or inspector |
| 53 | Schedule id survives rate changes | `api.ts:331-337` | - | an edit is a `PATCH` on the same id; the exception rows hang off that id | **plan decision** |
| 54 | Edit / Delete schedule and confirm wording | `RecurringSection.tsx:307-329`, `:296` | row actions | confirm names what goes and what stays | manage |
| 55 | "No standing orders yet." and the no-participant refusal | `RecurringSection.tsx:218`, `:181-185` | section body / header | | unchanged / manage |
| 56 | Schedule form: member, amount, first month, last month | `ScheduleForm.tsx:136-211` | panel | empty last month reopens an ended arrangement (`:99-106`) | manage |

#### Prices, skipped months and the screen frame

| # | Field / state / action | Source | Current location | Semantics | Proposed destination |
| --- | --- | --- | --- | --- | --- |
| 57 | Price amount "a month" and "from `<month>`" | `PriceHistory.tsx:179`, `:183` | row | effective-dated; latest applicable entry wins (`prices.ts:13-21`) | unchanged / inspector |
| 58 | Price delete, two-step with the server's 409 | `PriceHistory.tsx:89-111`, `:186-201` | confirm strip | the refusal names every month that would lose its price (`prices.ts:33-43`) | unchanged |
| 59 | "No price recorded yet, so every month currently costs nothing." | `PriceHistory.tsx:168-170` | section body | the one place the product says zero price out loud | unchanged |
| 60 | Skipped month row and Unskip | `BreakMonths.tsx:139`, `:141-143` | row | a break is not a zero price (`:29`) | unchanged / cell |
| 61 | Section index, sticky in-page nav | `SectionIndex.tsx:87-103`, `index.css:905-940` | below the summary | current item by `IntersectionObserver` plus a scroll listener | **designer decision** |
| 62 | First-load skeletons for every section | `SubscriptionDetail.tsx:310-344`, `:474-499` | whole page | static bars, no shimmer | must gain a calendar equivalent |
| 63 | Load error with "Try again" | `SubscriptionDetail.tsx:291-308` | in place of the page | re-runs `load()` | unchanged |
| 64 | `no-owner` 409 state | `SubscriptionDetail.tsx:119-122`, `:75-76` | in place of the page | only reachable for a legacy subscription | unchanged |
| 65 | Signed-out handling | `api.ts:54-56`, every `catch` in every section | - | a 401 anywhere calls `onSignedOut()` and renders nothing further | unchanged |
| 66 | Subscription header, edit and delete | `SubscriptionDetail.tsx:192-288` | page header | includes the currency lock and the deletion consequence sentence | unchanged |
| 67 | Summary figures block and sentence | `SubscriptionDetail.tsx:373-404` | above the sections | owed to you now, per-person, owner share, collected/expected, active count | unchanged |

**Sixty-seven rows.** Rows 17-20 and 36 are the focus-restoration behaviours that have no equivalent
yet in a calendar and must be respecified.

### 4. The accounting contract

All Evidence unless marked.

**Window.** `computeSummary` enumerates `enumerateMonths(settings.startMonth, current)` inclusive at
both ends (`calc.ts:87`, `months.ts:18-27`). Nothing after `current` is enumerated, owed for, or
counted as received.

**Owed.** `owed = Σ shareForMember(state, member, month, current)` over that window (`calc.ts:72`).
`shareForMember` returns `0` unless `chargedMonthStatus(...).counts`, then `perPersonShare(state, month)`
(`calc.ts:24-32`). `perPersonShare` is `Math.round(priceForMonth / activeMembersInMonth.length)`,
zero when the price is zero or nobody is active (`calc.ts:15-21`, `money.ts:7-16`). The owner is
counted in the divisor (`members.ts:14-16`) and charged nothing (`month-status.ts:55`); the owner
absorbs the remainder, which is decision D-006 in the file.

**Paid.** `paid = (every manual payment for the member, no month filter at all) + recurringReceived(...)`
(`calc.ts:73-76`). This asymmetry is the single most consequential fact for a calendar: manual
receipts are lifetime and unwindowed; assumed receipts are windowed.

**Recurring receipts.** `recurringReceived` takes the member's schedules, collects that schedule's
exception months from `state.recurringExceptions`, calls `scheduleMonthStatuses`, and adds
`schedule.amount` for each status that both counts and falls inside the caller's `months`
(`calc.ts:47-62`). The caller's window is the caller's and nothing more, stated as decision D-008
at `calc.ts:34-39`.

**Inclusion and exceptions.** `scheduleMonthStatuses` enumerates from `schedule.startMonth` to the
earlier of `schedule.endMonth` and `current` (`recurring.ts:79`). For each month it calls
`memberMonthStatus`; if that excludes the month it returns that reason unchanged; only then does it
test the exception list (`recurring.ts:82-85`). Three `MonthExclusion` values cannot reach a row
here, and the file says which and why (`recurring.ts:64-71`).

**Exclusion precedence.** `memberMonthStatus` (`month-status.ts:47-59`), widest first:

1. `before-start-month` - month precedes `settings.startMonth`
2. `not-yet-elapsed` - month is after `current`
3. `owner-member` - the member is the owner
4. `outside-active-range` - no `activeRanges` entry covers the month (`members.ts:4-6`)
5. `break-month` - the month is in `breakMonths`
6. otherwise counts

`chargedMonthStatus` then adds `unpriced` when `priceForMonth(state, month) === 0`
(`month-status.ts:67-77`). `excepted` is applied only by `scheduleMonthStatuses`, last.

So the full precedence a cell must honour is: **plan window → elapsed → owner → membership → break →
(for a charge) price → (for an assumed receipt) exception.**

**Credit.** There is no credit record. Credit is the sign of a balance: `creditOutstanding` sums the
positive balances and `owedToYouNow` sums the negative ones (`calc.ts:118-119`). `MemberList`
renders the sign as a word (`Money.tsx:31-40`). A future-dated or lump-sum payment produces credit
purely by raising `paid` above `owed`.

**Missing price.** `priceForMonth` returns `0` for a break month before consulting the price history
at all (`prices.ts:11`) and `0` when no entry has taken effect yet (`prices.ts:13-21`). *Inference:*
the projection must carry a completeness flag derived from `priceHistory.some(entry => entry.effectiveFrom <= month)`
and from `breakMonths.includes(month)`, because the amount cannot distinguish the two.

**Empty membership.** `validateActiveRanges` rejects an empty set at the write path
(`members.ts:30-32`), so the API cannot create one. At read time `rangeCovers` on an empty array is
simply `false` for every month (`members.ts:4-6`), giving `outside-active-range` everywhere. A
member can also have ranges that cover no part of the plan's history. *Unknown, tested nowhere:* no
test feeds a literal `activeRanges: []` through `computeSummary`. A recorded payment from a
participant whose ranges do not cover its receipt month is entirely possible and must remain visible.

**Current month.** Derived once, server side, from the subscription's own time zone via
`Intl.DateTimeFormat` (`months.ts:35-43`), and returned as `Summary.currentMonth`
(`routes/summary.ts:34`). `AGENTS.md` forbids deriving it from server-local date parts, and
`months.ts:29-34` says so in the file. The projection takes it as an argument and never asks the
browser clock.

**Invariants a read-only projection must reproduce.** For each participant:

1. Σ over all months in `[startMonth, currentMonth]` of the cell's charge == `MemberSummary.owed`.
2. Σ over all months in that window of the cell's assumed receipt == `recurringReceived(state, member, allMonths, current)`.
3. Σ over **all** manual receipts, including those dated after `currentMonth`, plus (2) == `MemberSummary.paid`.
4. (3) − (1) == `MemberSummary.balance`.
5. A per-year subtotal is never a balance. Only the lifetime figures reconcile with the summary.
6. A cell never adds a manual receipt to an assumed receipt into one figure.
7. A cell's manual receipts are addressed by `date.slice(0, 7)`, which is a receipt month and not a
   billing month.

Functions to call, with signatures:

- `chargedMonthStatus(state: SubscriptionState, member: Member, month: MonthStr, current: MonthStr): MonthStatus` - `month-status.ts:67`
- `memberMonthStatus(state: MemberMonthInputs, member, month, current): MonthStatus` - `month-status.ts:47`
- `perPersonShare(state: SubscriptionState, month: MonthStr): Minor` - `calc.ts:15`
- `shareForMember(state, member, month, current): Minor` - `calc.ts:24`
- `scheduleMonthStatuses(inputs: MemberMonthInputs, member, schedule, exceptionMonths: MonthStr[], current): ScheduleMonthStatus[]` - `recurring.ts:72`
- `recurringReceived(state, member, months: MonthStr[], current): Minor` - `calc.ts:41`
- `priceForMonth(state, month): Minor` - `prices.ts:10`
- `rangeCovers(member, month): boolean` - `members.ts:4`
- `enumerateMonths(start, end): MonthStr[]` - `months.ts:18`
- `formatMoney(minor, locale, currency): string` - `money.ts:19`; `formatMonth` / `formatDate` - `format.ts:11`, `:20`

Which existing tests pin these:

| Behaviour | Pinned by |
| --- | --- |
| Lump sum counts exactly as an ordinary payment, no spreading | `calc.test.ts:257-266` |
| Future-dated payment is credit now, not collected this month | `calc.test.ts:235-240`; API side `tests/integration/payments.test.ts:181-187` |
| Excepted month drops out of the recurring total | `calc.test.ts:142-146`; `tests/integration/summary.test.ts:241-249` |
| Break month drops out | `calc.test.ts:130-134`; `month-status.test.ts:88-93`; `summary.test.ts:251-260` |
| Outside an active range drops out | `calc.test.ts:65-68`, `:136-140`; `month-status.test.ts:72-78` |
| Not-yet-elapsed boundary, current month itself counts | `month-status.test.ts:54-63` |
| Unpriced month, and the effective-from boundary | `month-status.test.ts:112-121`; `prices.test.ts:29-31` |
| Owner is never charged and never paid from | `calc.test.ts:59-63`; `month-status.test.ts:65-69` |
| Outermost failing condition wins | `month-status.test.ts:100-104`; `recurring.test.ts:160-169` |
| Rounding, and that the month always balances exactly | `money.test.ts:18-29`; `calc.test.ts:310-394` |
| Two schedules for one member, one excepted | `calc.test.ts:166-174` |

Not pinned by any existing test, and therefore the projection's own burden: **two distinct receipts
on the same day for the same member**, **a literal empty `activeRanges`**, and **two concurrently
valid non-overlapping schedules both contributing in the same window**.

### 5. Data contracts already on the client

**Evidence.** Shapes the browser holds, all re-exported from the domain through
`src/client/api.ts:182-192`:

```
Member          { id, name, isOwner, archived, activeRanges: { joinedMonth, leftMonth|null }[] }   types.ts:17-23
PriceEntry      { id, effectiveFrom, amount }                                                       types.ts:25-29
Payment         { id, memberId, date, amount, note, kind: 'manual'|'annual' }                        types.ts:47-54
Schedule        RecurringSchedule & { exceptionMonths: MonthStr[] }                                  api.ts:268
RecurringSchedule { id, memberId, amount, startMonth, endMonth|null }                                 types.ts:32-38
breakMonths     MonthStr[]                                                                           api.ts:245
Summary         { currentMonth, currency, locale, ...totals, members: MemberSummary[] }               types.ts:84-99
MemberSummary   { memberId, name, archived, activeThisMonth, currentShare, owed, paid, balance }      types.ts:73-82
Subscription    { id, userId, name, currency, locale, timeZone, startMonth, createdAt }               api.ts:5-14
```

A full `SubscriptionState` is assemblable in the browser with no new request:

```
settings           <- subscription.{startMonth, currency, locale, timeZone}
priceHistory       <- prices
breakMonths        <- breakMonths
members            <- members
recurring          <- schedules            (structurally a RecurringSchedule)
recurringExceptions<- schedules.flatMap(s => s.exceptionMonths.map(m => ({ recurringId: s.id, month: m })))
payments           <- payments
```

`SubscriptionDetail.tsx:357-365` already builds the narrowed two-field version of this and comments
that nothing is fabricated to satisfy the type (decision D-008).

**Proposed minimal projection interface** (a shape, not a design):

```
MonthCell   { month, manualReceipts: Payment[], assumedReceipt: { scheduleId, amount } | null,
              charge: Minor, activity: 'active'|'outside-range'|'break'|'before-start'|'future',
              excepted: boolean, complete: boolean }
PersonYear  { memberId, year, cells: MonthCell[12], yearCharged: Minor,
              yearManual: Minor, yearAssumed: Minor }
PersonTotals{ memberId, owed, paid, balance, receiptsOutsideWindow: Payment[] }
```

`assumedReceipt` keeps the schedule id so a rate change and an exception toggle both address the
right row across an aggregation (matrix row 53). `complete` is false when the month is inside the
plan window, is not a break, and no price entry has taken effect. `receiptsOutsideWindow` exists so
invariant 3 above can be satisfied without a future-dated receipt vanishing.

**Server gap: none found.** Every field the projection needs is already on the wire. *Inference,
stated as such:* the only argument for a server change would be payload size, and with no pagination
anywhere today the change would be a new capability rather than a preservation of one.

### 6. Synthetic fixture requirements

**Evidence on what exists.** `POST /api/dev/seed` creates exactly one auth user and nothing else
(`src/server/routes/dev-seed.ts:16`, `:31-33`), gated by `SEED_ENABLED` plus an `x-seed-token`
header, answering 404 rather than 403 when the gate fails (`:9-19`, decision D-005). It **cannot**
create a subscription, a member, a price, a payment or a schedule.

Unit tests build a `SubscriptionState` with a local `state()` helper redefined in each file
(`calc.test.ts:34-45`, `month-status.test.ts:27-38`, `prices.test.ts:5-16`, `members.test.ts:16-26`,
`recurring.test.ts:79-96`). There is no shared fixture module.

Integration tests share `tests/integration/accounts.ts` for sign-in only (`:56-65`, `:41-48`) and
then define per-file helpers that drive the real HTTP routes (`summary.test.ts:22-65`,
`payments.test.ts:38-92`, `recurring.test.ts:42-114`).

**Requirements.** The acceptance target is six participants and eight years. Cases the fixture must
contain, each mapped to the rule it exercises:

| Case | Mechanism |
| --- | --- |
| Two distinct receipts on one day, one participant | two `POST /payments` with identical `date`, different amounts |
| Advance credit / lump sum | one `POST /payments` with `kind: 'annual'` and an amount well above the share |
| Future-dated manual receipt | `date` after the current month; the route has no upper bound (`payments.ts:9-12`) |
| Changed recurring amount | two schedules for one member with adjacent, non-overlapping windows and different `amount` |
| Exception | `PUT /schedules/:id/exceptions/:month` on a counted month |
| Break | `POST /break-months` for a month inside somebody's active range |
| Inactive range | a member with two ranges and a gap, and a member with an early `left_month` |
| Future month | any month after `summary.currentMonth`; the plan window ends at current |
| Missing price | the plan's first price entry effective some months **after** `start_month` |
| Empty membership range | not creatable through the API (`members.ts:30-32`); reachable only in a unit fixture |
| Archived, settled | an archived member whose balance is exactly zero, to keep row 9 exercised |

**How to create them.** Three routes, in order of preference:

1. **Unit-level `SubscriptionState` literals** for every projection assertion. This is the only way
   to reach the empty-`activeRanges` case, it needs no server, and it matches how the domain is
   already tested. Assertions compare the projection's sums against `computeSummary` on the same
   literal.
2. **A fixture builder driving the real routes** for the browser pass, modelled on the existing
   per-file integration helpers. Nothing shared exists to reuse, so one has to be written; it should
   live with the tests, not in `src/`.
3. **The app's own forms on a disposable account** as the fallback. Feasible but slow: eight years of
   six participants is on the order of two hundred form submissions.

*Plan decision:* which of 1-3 backs which verification step. *Resolved by research:* `dev-seed`
cannot help with any of it.

### 7. Styling, tokens and existing component vocabulary

Summarised here; the designer's own briefing is `design-inputs.md`.

One stylesheet, 1297 lines, no framework and no preprocessor. Thirteen colour tokens on `:root`
(`index.css:54-67`) with a full second palette under `@media (prefers-color-scheme: dark)` (`:117-135`);
`color-scheme: light dark` at `:50`. Six type scales, each split into size, leading and weight
(`:71-89`). Eight spacing steps `--s-1` 4px through `--s-8` 64px (`:92-99`). Four motion durations,
all zeroed under `prefers-reduced-motion` (`:109-114`, `:502-509`). One focus rule for the whole app
(`:183-186`). **No shadow tokens, no radius tokens and no `box-shadow` anywhere.** One breakpoint,
`max-width: 640px`, used in four blocks.

Directly reusable for a calendar: `.tile` and its three states (`:1045-1075`) are already a
month-cell vocabulary with a green left rule for counted, a red left rule for not-received and a
dashed border for excluded. `.money-recorded` / `.money-assumed` (`:791-801`) already make ink and
pencil visually distinct, which is the one distinction `change.md` insists on.

### 8. Accessibility behaviour already in place

Every one of these has to survive, and several have no calendar equivalent yet.

- Every section heading carries `tabIndex={-1}` so focus can land on it after a delete
  (`SectionHeader.tsx:49`).
- Every form is `noValidate` (`MemberForm.tsx:118`, `PaymentForm.tsx:129`, `ScheduleForm.tsx:130`,
  `PriceHistory.tsx:306`, `BreakMonths.tsx:226`), so `min` on a calendar control is guidance, never
  enforcement.
- A disabled action is `aria-disabled` plus `aria-describedby`, never `disabled`, so it stays
  focusable and its refusal is announced (`PaymentList.tsx:163-169`).
- `DisclosurePanel` focuses its first control on open, handles Escape, and is `inert` while closed
  (`DisclosurePanel.tsx:31-47`).
- `ConfirmStrip` focuses **Keep**, not the destructive button (`ConfirmStrip.tsx:34-36`).
- Status is a permanent `role="status"` region whose contents change (`StatusLine.tsx:42`); errors
  are a permanent `role="alert"` region (`SectionAlert.tsx:33`).
- The tile toggles are real buttons, so the current month affordances already work by keyboard and
  touch without hover (`RecurringSection.tsx:356`).
- `Balance` spells the sign as a word rather than showing a bare minus (`Money.tsx:31-40`).

### 9. What this research could not verify

- Rendered height and cell counts of the current page with a six-person, eight-year ledger. No such
  fixture exists yet, and none was created here. The `SectionIndex` comment's "roughly 4200px at 390"
  (`SectionIndex.tsx:47-49`) is the only measurement in the tree and it predates this change.
- Whether any browser behaviour differs for a grid of many small interactive cells. Not measured.
- Whether `activeRanges: []` can exist in the production database. The write path refuses it now;
  whether an older row predates that rule was not checked, and `data/` was deliberately not read.

## Code references

- `src/client/screens/SubscriptionDetail.tsx:100-128` - the one load, six parallel requests
- `src/client/screens/SubscriptionDetail.tsx:347-365` - destructured data and the narrowed month inputs
- `src/client/screens/SubscriptionDetail.tsx:408-462` - the five sections in render order
- `src/client/components/MemberList.tsx:67-70` - the summary order and the settled-archived split
- `src/client/components/MemberList.tsx:110-131` - focus rules around a delete
- `src/client/components/PaymentList.tsx:67-84` - the server-side participant filter
- `src/client/components/RecurringSection.tsx:258-269` - the single call that decides every tile
- `src/client/components/RecurringSection.tsx:333-377` - the unbounded tile list
- `src/domain/calc.ts:66-78` - the windowed/unwindowed asymmetry in `paid`
- `src/domain/calc.ts:86-105` - the enumerated window and the balance sort
- `src/domain/month-status.ts:47-77` - exclusion precedence, and price deliberately left out
- `src/domain/recurring.ts:72-86` - exception applied last
- `src/domain/prices.ts:10-22` - zero for a break and zero for no entry
- `src/server/db/subscription-state.ts:18-47` - what the server assembles, mirroring what the client holds
- `src/client/index.css:1045-1075` - the existing month-cell vocabulary

## Architecture insights

The codebase has one very consistent rule: **the calculation lives in `src/domain`, is pure, is unit
tested, and both the server and the browser call the same functions.** `RecurringSection` is the
precedent - it imports `scheduleMonthStatuses` directly and applies none of the six conditions itself,
with the reason written at `RecurringSection.tsx:258-260`. A calendar projection that follows that
precedent inherits the tests. One that reimplements a condition in a cell breaks the guarantee the
whole architecture exists to provide.

The second rule is that **a refusal is the server's own sentence, shown verbatim**. Every section
catches `ApiError` and renders `err.message` (`MemberList.tsx:106`, `PaymentList.tsx:123`,
`RecurringSection.tsx:130`, `PriceHistory.tsx:108`). A calendar must keep a place for an arbitrary
server sentence in every context where a mutation can be refused.

The third is that **markup is free and contracts are not**. No test reads the client's markup, so
every element and class in `src/client/` may be rewritten with the suite still passing. What must not
move are the wire field names the forms submit and the domain functions the client imports.

## Historical context

- `context/archive/visual-redesign/research.md` - establishes that no test renders markup, that the
  client imports three domain modules directly, and that the wire field names are the real contract.
- `context/archive/visual-redesign/design-spec.md` - the accepted design system: five principles,
  six type scales, one breakpoint, three motions, "recorded money is ink, assumed money is pencil",
  and "red means owed; it appears on no other element".
- `context/archive/subscription-management-and-date-inputs/frame.md` - the precedent for a frame that
  confirms rather than overturns a framing, and for handing the designer numbered questions each with
  a recommended answer.
- `context/archive/payments-and-recurring/` - where decisions D-007 (price is not a receipt
  condition), D-008 (one answer to which months a standing order covered) and D-009 (built over
  `memberMonthStatus`, not beside it) were taken. Those three decisions are the whole accounting
  contract for a cell.

## Open questions

**Designer decisions.**

1. **Does the most-owing-first order survive?** `calc.ts:105` sorts by balance, so a recorded payment
   can move a person's row while their calendar is open. Options are: keep the order and accept the
   jump; keep the order but freeze it while an inspector is open; or sort by name and surface
   "who owes most" some other way. This is matrix row 8.
2. **Twelve cells per person per year, or a year grid per person?** Six people × twelve months is 72
   cells on one screen; eight years × twelve for one person is 96. The two read very differently and
   only one can be the default.
3. **Where does full history live?** Payments today are a single filterable list with a count
   (`PaymentList.tsx:133-151`). A calendar can replace it, can keep it behind bounded disclosure, or
   can keep the filter and drop the list.
4. **Where does the inspector sit** relative to the person's row, and what happens to the other rows
   while it is open.
5. **What replaces `SectionIndex`** if the five sections collapse into fewer (matrix row 61).
6. **How a cell distinguishes seven states plus two receipt kinds** using text or symbol as well as
   colour, and what a cell shows when it carries both a manual and an assumed receipt.
7. **Focus restoration** for rows 17-20 and 36: where focus goes after a delete removes the record
   the inspector was showing, after a refused delete, after closing a form, and after a year change.
8. **Whether a future-dated receipt is discoverable** from a calendar whose default year is the
   current one. Invariant 3 fails visually if it is not.

**Plan decisions.**

9. Which of the three fixture routes in section 6 backs which verification step.
10. Whether the projection is one pure module with unit tests comparing against `computeSummary`, and
    where it lives.
11. How the schedule id is carried through an aggregated cell so an exception toggle and a rate edit
    address the right row (matrix row 53).
12. Whether `PriceHistory` and `BreakMonths` stay as they are. They are bounded in practice and
    nothing in `change.md` requires moving them.

**Resolved by research.**

13. No server change is needed. The client holds every field.
14. Payments carry `note` and `kind`, not tags. Nothing is lost by preserving those two.
15. `dev-seed` cannot build the fixture; it creates a user and nothing else.
16. Zero is not "unpriced". Completeness must come from price coverage, not from an amount.
17. Exclusion precedence is fixed, named and tested; a cell must call the domain, not restate it.
18. A calendar may rewrite every element and class in `src/client/` without breaking a test, because
    no test reads the client's markup.

## Related research

- `context/archive/visual-redesign/research.md`
- `context/archive/subscription-management-and-date-inputs/research.md`
- `context/changes/compact-member-calendar/frame.md`
- `context/changes/compact-member-calendar/design-inputs.md`
