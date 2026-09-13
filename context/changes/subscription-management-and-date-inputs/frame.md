# Frame Brief: Subscription management and native calendar inputs

> Framing step between the design delta and `/10x-plan`. It decides no product or design question:
> `design-delta.md` is authoritative for every one of those. What it does is test the load-bearing
> assumptions the delta and the brief rest on against the code, and hand the planner the two places
> the evidence says the delta needs an answer it does not yet have.

## Reported observation

From `context/foundation/subscription-management-brief.md` and roadmap S-08: the subscription record
is create-only and delete-less, and every calendar field in the client is a plain text input.
Literally: `src/server/routes/subscriptions.ts` offers GET, POST, GET/:id and PATCH/:id and no DELETE;
`PATCH` accepts four fields and excludes `start_month` (`src/server/validation/subscriptions.ts:51-55`);
`src/client/api.ts` calls neither PATCH nor any delete, exposing only `listSubscriptions` (:142) and
`createSubscription` (:146); and not one of the eight calendar inputs declares a `type` attribute.

## Initial framing (preserved)

- **Stated cause or approach**: the server already holds half the edit surface and the client none of
  it, so the change is an extension rather than an invention - extend `PATCH`, add `DELETE`, and swap
  eight text inputs for native controls with a fallback where no month picker exists.
- **Proposed direction**: the full change flow on the shipped app - research, frame, the Fable design
  delta, plan, independent plan review, phased implementation, review, visual acceptance, archive.
- **Pre-dispatch narrowing**: no user round was available. The narrowing is taken from the delta,
  which is unusually specific and fixes as decided: five editable settings; currency locked once any
  amount exists; first month free to move earlier and bounded moving later; the owner's opening range
  shifted in the same atomic write; deletion of the whole ledger in one batch; native
  `type=month`/`type=date` with a single native `<select>` fallback chosen by two probes. It leaves
  open only what the code turns out not to support.

## Dimension map

If this change goes wrong, the failure originates at one of these. Each was tested against the tree.

1. **Atomicity** - the eight-table delete or the first-month write might not be one write, or the
   declared cascades might fight the explicit order.
2. **Ownership** - a foreign id might delete children before the final statement discovers it is not
   the user's.
3. **Dependent-record rules** - the first-month bound and the owner opening-range shift might rest on
   an invariant that the shipped participant routes have already made optional.
4. **Control substitution** - native controls might change wire format, activate browser constraint
   validation, or break the fixed control box.  <- where the delta puts most of its detail
5. **Fallback detection** - the two probes might pass in a browser that renders no picker, which is
   the exact case the fallback exists for.
6. **Navigation** - with no router, "old routes inaccessible" might mean something the client cannot do.

## Hypothesis investigation

| Hypothesis | Evidence | Verdict |
| --- | --- | --- |
| 1. The batch is not atomic, or cascades conflict with deepest-first order | every foreign key in `migrations/` is `ON DELETE CASCADE` (`0002:9`, `0003:8,19`, `0004:14,21`, `0005:17`, `0006:18,30`); no trigger and no `ON DELETE SET NULL` anywhere; `members_one_owner_idx` (`0003:15`) is a partial UNIQUE index, which deletes cannot violate. Deepest-first leaves no orphan at any intermediate point and the cascade fires on an empty set | NONE |
| 2. A foreign id leaves child rows deleted | the ownership predicate is already a subquery in three modules (`src/server/db/members.ts:32-34`, `payments.ts:19-27`, `recurring.ts:31-38`) and a child delete scoped by a join to `subscriptions s ... and s.user_id = ?` deletes nothing at all for a foreign id. `meta.changes` on the final `delete from subscriptions where id = ? and user_id = ?` separates 204 from 404, and reading `meta.changes` off a batched statement is already the pattern at `src/server/db/members.ts:140-160` | NONE |
| 3. The first-month rules rest on an invariant that no longer holds | **the creation-time equality between the owner's opening range and `start_month` is not an invariant afterwards.** `PATCH /members/:memberId` accepts `active_ranges` for the owner too (`src/server/routes/members.ts:79-104`, applied at `src/server/db/members.ts:201-208`); only `is_owner` is unpatchable (`src/server/validation/members.ts:49-53`), and `validateActiveRanges` rejects only `joined_month < startMonth` (`src/domain/members.ts:38-40`). So the owner may already hold several ranges, the first carrying a `left_month` | **STRONG** |
| 4. Native controls break the wire format, the validation convention or the box | wire format is safe: every calendar value is read through `.value` and every existing date site is UTC-anchored (`src/client/format.ts:7-30`, `src/domain/months.ts:29-64`). Validation is safe: **all seven forms carry `noValidate`** (`Login.tsx:110`, `SubscriptionForm.tsx:82`, `MemberForm.tsx:112`, `PriceHistory.tsx:278`, `BreakMonths.tsx:199`, `PaymentForm.tsx:125`, `ScheduleForm.tsx:121`), so `min` can never raise a browser bubble. The box is the open part: `height: 40px`, `padding: 0 var(--s-3)`, no `input[type=` selector and no `::-webkit-calendar-picker-indicator` rule anywhere in `src/client/index.css`, with `color-scheme: light dark` already at `:50` | WEAK, and confined to measured height |
| 5. The probes pass where no picker renders | the value-sanitisation probe tests the month value sanitisation algorithm, not picker rendering. The two are correlated by browser, not by specification, and the browser that decides this is installed on the verification machine | **WEAK as evidence, STRONG as a verification obligation** |
| 6. Navigation cannot express the deletion return | `src/client/App.tsx:13` holds the whole subscription object and `:54-73` switches screens by conditional render, so clearing it remounts `Home`, whose `useEffect(() => load(), [load])` refetches the list on mount. `SectionHeader` already sets `tabIndex={-1}` on every heading including Home's `h1` (`src/client/components/ui/SectionHeader.tsx:49`), and Home already holds a heading-row status line through `useSectionStatus()` | NONE |

## Narrowing signals

- The delete looked like the risky half and is the safe half. Every mechanism it needs - the ordered
  batch, the ownership subquery, the `meta.changes` read, the non-disclosing 404 - already exists in
  this codebase with the reason written beside it. What is new is only the eight-statement list.
- The first-month rule looked like arithmetic and is a validation problem. The delta's phrase "when
  its join month equals the old first month" is exactly right as written, and the code shows why it
  has to be conditional rather than assumed: the owner's ranges are as editable as anyone's.
- Two things the delta asks for already exist and cost nothing: the Home `h1` already carries
  `tabindex="-1"`, and every form is already `noValidate`, which turns `min` into what the delta calls
  it - a convenience, never enforcement - by construction rather than by discipline.
- The one detection question cannot be closed by reading. It is a browser measurement, and the plan
  has to carry it as a gate rather than as an assumption.

## Cross-system convention

The usual handling for a cascade delete on a relational store is to declare the foreign keys and let
the database do it, and D1 does enforce them. This project departs from that deliberately, and the
departure is already house style: `src/server/db/recurring.ts:211-213` states in the code that D1 has
no interactive transaction, so the batch is what makes several statements one write. Writing the eight
deletes out keeps the delete correct whether or not foreign keys are enforced, and makes the row
counts assertable. The usual handling for a missing browser control is a JavaScript picker library;
the accepted specification's preamble rules native elements stay native (`design-spec.md:15-16`), and
the delta's native `<select>` follows that rather than the convention.

## Reframed problem statement

> **The actual problem to plan around is**: not how to write a cascade delete or swap an input type,
> both of which this codebase is already shaped for, but how to make every rule the delta states be
> checked in the route before the batch runs rather than by a database constraint that would abort it,
> and how to prove the month fallback in the one browser that decides it rather than from the probes.

The original framing held. Adding the verb and the controls is a small amount of code in well-worn
patterns. What deserves the planning attention is two seams. The first is that a `CHECK` violation
inside `db.batch()` surfaces as a throw, not as the delta's named refusal sentence, so the route must
pre-check the owner range set rather than let `left_month >= joined_month`
(`migrations/0003_members.sql:22`) or the ordering rules decide. The second is that no test and no
document can settle whether Safari's probe result matches Safari's picker; only Safari can, and the
plan must gate on it.

## Confidence

**HIGH** for the server half and the navigation half: the batch semantics, the ownership shape, the
cascade declarations, the `noValidate` distribution and the heading `tabindex` were each read in this
tree with file references. **MEDIUM** for the detection branch, which rests on a browser measurement
this frame did not take. That measurement is a named gate in the plan, not an open question.

## Where the frame agrees with the delta, and why

- **Currency locked rather than confirm-gated.** Agreed. Amounts are integers in minor units with no
  per-row currency (`migrations/0004:16`, `0005:19`, `0006:19`) and `formatMoney` divides by 100
  unconditionally (`src/domain/money.ts:20`), so a zero-decimal currency misreads history by a factor
  of one hundred. The price-delete `?confirm=true` precedent fits a loss the user can see enumerated;
  it does not fit a silent reinterpretation of every stored figure. A refusal is reversible.
- **First month editable, earlier free and later bounded.** Agreed, and the asymmetry is real rather
  than conservative: every dependent rule is `>=` (`src/domain/members.ts:38`, `routes/prices.ts:42`,
  `break-months.ts:40`, `recurring.ts:67,135`), so widening the window satisfies all five
  automatically and only a forward move needs the minimums.
- **A single native `<select>` rather than two selects or a date adaptation.** Agreed. Two selects
  would need a fieldset and a composite value, and the delta's `htmlFor` labelling works precisely
  because there is one control. A `type="date"` adaptation would put a day into a month field, which
  is the one thing the brief forbids.
- **Detection once per page load, injectable.** Agreed. Per-field detection would run the probe eight
  times for one answer, and rendering `type="month"` unconditionally would leave the fallback browsers
  with a bare box and, since the ISO hints are removed, no format guidance at all.
- **`db.batch()` with the cascades left declared.** Agreed, and the redundancy is the point: the batch
  is correct whether or not foreign keys are enforced, and the cascade is a second net rather than a
  competing mechanism.
- **Deletion returning Home by clearing client state.** Agreed, and it is what "old routes
  inaccessible" can mean here. There are no URLs to invalidate: `App.tsx:13` holds the object and
  clearing it remounts `Home`, which refetches. The server's non-disclosing 404 covers a stale id.

## Questions for the designer

Two, both raised by evidence the delta could not have had. Each carries a recommended answer the plan
proceeds on, marked in `plan.md` where it lands.

1. **The owner's opening range may not be where the shift rule expects, and shifting it can break the
   range set.** The owner's `active_ranges` are freely editable through the participant PATCH, so the
   owner may hold several ranges and the first may carry a `left_month`. Moving the first month later
   and shifting the owner's first range with it can push that range's `joined_month` past the owner's
   *second* range, producing an out-of-order or overlapping set that `validateActiveRanges`
   (`src/domain/members.ts:29-56`) rejects on the participant route but that no database constraint
   catches inside the batch. **Recommended**: run the shifted owner range set through
   `validateActiveRanges` before the batch and refuse with
   `start_month cannot be later than <YYYY-MM> because your own next active range starts then`, a
   sixth kind added to the five the delta lists, ordered last. The delta's existing `left_month`
   refusal stays as written.

2. **The month select's option range on an unbounded field is 144 options.** The delta gives First
   month no `min` and no `max`, so on both the create form and the edit form the fallback select spans
   January ten years back through December of next year. **Recommended**: keep it. It is a native
   select with the browser's own type-ahead, and narrowing it would hide the legitimate "move the
   first month earlier" case the delta deliberately allows. Raised only because it is the one place a
   delta rule produces a control a person has to scroll.

## References

- Design authority: `context/changes/subscription-management-and-date-inputs/design-delta.md`
- Research: `context/changes/subscription-management-and-date-inputs/research.md`
- Brief: `context/foundation/subscription-management-brief.md`
- Server: `src/server/routes/subscriptions.ts`, `src/server/validation/subscriptions.ts:43-55`,
  `src/server/db/subscriptions.ts:56-97`, `src/server/db/recurring.ts:211-247`
- Participant ranges: `src/server/routes/members.ts:79-104`, `src/domain/members.ts:29-56`
- Client: `src/client/App.tsx:10-73`, `src/client/screens/Home.tsx:33-55`,
  `src/client/components/ui/SectionHeader.tsx:44-56`, `src/client/components/ui/ConfirmStrip.tsx:3-44`,
  `src/client/components/ui/Field.tsx:4-50`, `src/client/index.css:49-50`, `:289-334`, `:455-471`
- Accepted specification: `context/archive/visual-redesign/design-spec.md` sections 3.4, 3.7, 3.9,
  3.10, 6, 7, 8, amended by the delta
- Prior frame precedent: `context/archive/google-sign-in/frame.md`
