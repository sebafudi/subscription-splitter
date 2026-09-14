# Frame Brief: Compact member calendars

> Framing step between `research.md` and `/10x-plan`. It decides no visual question: the designer is
> authoritative for every one of those, and this brief hands them a numbered list rather than an
> answer. What it does is test the load-bearing assumption in the request against the code, and name
> the one place where the request's own words point at the wrong section.

## Reported observation

From `change.md`, verbatim:

> i want the people list to be a calendar for each person
> or some kind of a graph
> right now it's a very very long list
> and I'd like it to be rather compact, with all details preserved

The literal, checkable part: the subscription detail screen is very long. Its own code says so -
`SectionIndex` exists because the column is "roughly 4200px tall ... at 390 with the section a
reviewer most wants at the bottom" (`src/client/components/ui/SectionIndex.tsx:47-49`).

## Initial framing (preserved)

- **Stated cause or approach**: the people list is the long thing, and turning it into a per-person
  calendar or graph is what makes the screen compact.
- **Proposed direction**: a month-by-person calendar, or a compact yearly calendar per person, with
  year navigation and a selected-month detail view. A graph is acceptable if it preserves the same
  inspectability. `change.md` marks this as a direction to evaluate, not a finalized specification.
- **Pre-dispatch narrowing**: no user round was available. The narrowing is taken from `change.md`,
  which fixes as decided: collapsed height must not grow with months or payments; every existing
  detail and action stays reachable; recorded and assumed receipts stay distinguishable even in one
  cell; a payment total must never imply which billing months were settled; missing price or
  membership data must never read as settled; text or symbol in addition to colour; keyboard and
  touch, not hover. It leaves the layout, density, typography and interaction open.

## Dimension map

If the screen stays long, or gets compact at the cost of the ledger, the failure originates at one of
these. Each was tested against the tree at `c10d54f`.

1. **The participant list** - one row per person, possibly with per-person history inside it.
   ← the request's framing
2. **The standing-order tiles** - one bordered tile per elapsed month per schedule.
3. **The payment list** - one row per receipt, for the life of the plan.
4. **Page composition** - five sections rendered in sequence with no bounding mechanism of any kind.
5. **The server** - a list route that returns everything because it has no `limit`.
6. **The accounting model** - whether the detail can be collapsed at all without asserting a
   reconciliation the product does not perform.

## Hypothesis investigation

| Hypothesis | Evidence | Verdict |
| --- | --- | --- |
| 1. The participant list is what grows | **It is the one section that does not.** `MemberList` renders exactly one row per `summary.members` entry (`MemberList.tsx:314`) and holds three figures per row (`:241-251`). It already bounds itself further by hiding archived participants whose balance is exactly zero (`:69-70`, `:317-335`). Eight years of history adds nothing to it | **NONE** |
| 2. The standing-order tiles dominate | `scheduleMonthStatuses` enumerates every month from the schedule's start to the earlier of its end and the current month (`recurring.ts:79-81`) and every status becomes a `<li class="tile">` (`RecurringSection.tsx:335-343`), each a 156px bordered box (`index.css:1045-1055`). One open-ended schedule over eight years is 96 tiles; six people with one rate change each is twelve schedules | **STRONG** |
| 3. The payment list grows without bound | one `<li>` per payment (`PaymentList.tsx:214`), newest first, with no windowing. The only narrowing offered is a per-participant filter (`:137-151`) | **STRONG** |
| 4. Nothing bounds the page as a whole | `SubscriptionDetail.tsx:105-113` loads six collections in one `Promise.all` and `:408-462` renders all five sections unconditionally. There is no lazy section, no virtualization, no "show more", no default-collapsed section anywhere on the screen | **STRONG** |
| 5. The server hands over everything | every list query carries `order by` and no `limit` (`db/payments.ts:62`, `prices.ts:21`, `recurring.ts:67`, `break-months.ts:10`, `members.ts:65`); the two `limit 1` uses are single-row lookups. `loadState` assembles the whole ledger for the summary (`db/subscription-state.ts:26-32`) | **STRONG as cause, NONE as blocker** - bounding is available client-side without touching a route |
| 6. Collapsing the detail would force a false reconciliation | `balanceForMember` adds every manual receipt, unwindowed, to the windowed recurring total, and nothing anywhere detects that the two describe the same money (`calc.ts:73-76`). `priceForMonth` returns `0` both for a break month and for a month no price entry has reached (`prices.ts:10-21`). So a single combined figure per cell, or a bare zero, would assert something the product does not know | **STRONG, and it is a constraint rather than a cause** |

## Narrowing signals

- **The request names the shortest section.** Three of the four growing surfaces are elsewhere.
  `plan.md` had already reached this conclusion in its "Current state" section; this frame confirms it
  against the tree rather than discovering it.
- **The tile list is a calendar already, in the wrong place.** `RecurringSection`'s tiles carry a
  month label, an amount, an exclusion phrase and a toggle, with three visual states
  (`RecurringSection.tsx:333-377`, `index.css:1061-1075`). The vocabulary the change needs exists; it
  is attached to a schedule instead of to a person, and it is unbounded instead of windowed.
- **The browser already runs the accounting.** `RecurringSection` imports `scheduleMonthStatuses`
  and applies none of the six conditions itself, with the reason in the file
  (`RecurringSection.tsx:258-260`). Everything a cell needs is already client-side; assembling a full
  `SubscriptionState` in `SubscriptionDetail` needs no new request and no server change.
- **Markup is free; contracts are not.** No test in the repository renders a React component - no
  `.test.tsx`, `environment: 'node'` at `vitest.unit.config.ts:6`, no testing-library dependency. The
  client may be rewritten wholesale. What may not move are the wire field names and the domain
  functions the client imports.
- **One signal points the other way and is worth keeping.** The compactness claim itself is
  unmeasured. No six-person, eight-year fixture exists, and none was built here. That is a gate for
  the plan, not a finding.

## Cross-system convention

The usual handling for a long transactional screen is virtualization, server pagination, or a
charting library over an aggregate. This project departs from all three deliberately and the
departures are already house style: no route carries a `limit`; `context/archive/visual-redesign/design-spec.md`
rules that native `button`, `select`, `input`, `fieldset` and `label` stay native; the whole app is
one 1297-line stylesheet with no framework. A client-side projection over one selected year, rendered
with existing tokens and native controls, is the house-consistent answer. A windowing library or a
chart dependency would be the departure and `plan.md` already gates one on demonstrated need.

The usual handling for "recorded versus assumed" is a single reconciled balance. This product refuses
that too, and says so in two section subtitles (`sections.ts:41`, `:48`) and in the two money
treatments (`Money.tsx:11`, `index.css:791-801`). A calendar cell inherits the refusal.

## Reframed problem statement

> **The actual problem to plan around is**: not that the participant list is long - it is the one
> section that does not grow - but that the detail screen has no bounding mechanism anywhere, so the
> per-person calendar is only worth building if it also absorbs the standing-order tile lists and the
> payment list, and it can only do that if a cell can show a recorded receipt and an assumed receipt
> side by side without ever adding them together.

The request's instinct is right and its aim is off by one section. A calendar that replaced
`MemberList` alone would leave roughly nine-tenths of the height in place, because
`RecurringSection` and `PaymentList` are what scale with eight years of history. The same calendar,
built as a per-person projection that the tile lists and the payment list fold into, bounds all three
at once - and the projection costs no server change, because the browser already holds every record
the domain calculation reads.

The constraint that decides whether it is safe is dimension 6. The product keeps two ledgers that it
never reconciles, and it keeps them visually distinct on purpose. A cell that shows one number has
thrown that away; a cell that shows two labelled figures has not. The same applies to zero: a month
with no price and a month that costs nothing are the same number and different facts.

## Confidence

**HIGH** for everything read in this tree: the row counts per section, the absence of any `limit`,
the client's possession of every field, the exclusion precedence, the windowed/unwindowed asymmetry
in `paid`, and the absence of component tests. Each carries a `file:line` in `research.md`.

**MEDIUM** for the compactness claim itself, which rests on a measurement nobody has taken. No
six-person, eight-year ledger exists in this repository, and `POST /api/dev/seed` cannot create one -
it creates a single auth user and nothing else (`src/server/routes/dev-seed.ts:31-33`). Building the
fixture is a named plan step, not an assumption.

## What changes for /10x-plan

The plan should be about a **per-person monthly projection that the calendar, the standing-order
months and the payment history all read from**, not about a new participant-list rendering. Phase 3 of
`plan.md` already describes that projection correctly; this frame's contribution is that Phase 4's
integration surface is load-bearing rather than optional - leaving `PaymentList` and
`RecurringSection` as they are would satisfy the letter of the request and none of its purpose.

## Questions for the designer

Five, each raised by evidence rather than by preference. None has a recommended answer here: the
brief makes the designer sole authority on all of them. `research.md` carries three more under
"Open questions", numbered 4 through 8 there.

1. **Calendar or graph.** `change.md` allows either. The evidence that bears on the choice: a cell
   must distinguish seven named exclusion states (`month-status.ts:6-13`) plus two receipt kinds plus
   a completeness flag, must carry text or symbol as well as colour, and must be operable by keyboard
   and touch. A continuous graph encodes magnitude well and categorical state poorly. Whichever is
   chosen, the same projection feeds it.
2. **Twelve cells per person, or a year grid per person.** Six people by twelve months is 72 cells on
   one screen and answers "who is behind this year". Eight years by twelve months for one person is
   96 cells and answers "what has this person's history been". Only one can be the default, and the
   second has to be reachable from the first.
3. **Where full history lives.** Payments today are one filterable list with a count
   (`PaymentList.tsx:133-151`), and the filter is a real server round trip, not a client slice
   (`:67-84`). The calendar can replace the list, keep it behind bounded disclosure, or keep the
   filter and drop the list. A future-dated receipt is the hard case: it raises `paid` today
   (`calc.test.ts:235-240`) and sits outside any current-year grid.
4. **Where the inspector sits**, and what the other people's rows do while it is open. `MemberList`
   currently replaces a row in place when its edit panel opens (`MemberList.tsx:135-164`), which is
   the only precedent on the screen.
5. **Whether most-owing-first survives.** `computeSummary` sorts by balance ascending
   (`calc.ts:105`) and `MemberList` renders that order verbatim (`:68`). Recording a payment changes
   a balance, so a row can move while its calendar is open. Keeping the order, freezing it while an
   inspector is open, and sorting by name with the ranking shown some other way are all consistent
   with the rest of the screen; the code does not choose between them.

## References

- Research: `context/archive/compact-member-calendar/research.md`
- Designer briefing: `context/archive/compact-member-calendar/design-inputs.md`
- Request and plan: `context/archive/compact-member-calendar/change.md`, `plan.md`
- Client: `src/client/screens/SubscriptionDetail.tsx:100-128`, `:408-462`;
  `src/client/components/MemberList.tsx:67-70`, `:314`;
  `src/client/components/PaymentList.tsx:67-84`, `:214`;
  `src/client/components/RecurringSection.tsx:258-269`, `:333-377`;
  `src/client/components/ui/SectionIndex.tsx:47-49`
- Domain: `src/domain/calc.ts:66-105`, `src/domain/month-status.ts:6-13`, `:47-77`,
  `src/domain/recurring.ts:72-86`, `src/domain/prices.ts:10-22`
- Server: `src/server/db/subscription-state.ts:18-47`, `src/server/routes/dev-seed.ts:31-33`
- Accepted design system: `context/archive/visual-redesign/design-spec.md`
- Prior frame precedent: `context/archive/subscription-management-and-date-inputs/frame.md`
