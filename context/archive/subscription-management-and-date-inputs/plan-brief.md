# Subscription management and native calendar inputs - plan brief

> Full plan: `context/archive/subscription-management-and-date-inputs/plan.md`
> Design authority: `context/archive/subscription-management-and-date-inputs/design-delta.md`
> Independent review: `context/archive/subscription-management-and-date-inputs/reviews/plan-review.md`
> Frame: `context/archive/subscription-management-and-date-inputs/frame.md`
> Research: `context/archive/subscription-management-and-date-inputs/research.md`

## What and why

Give the owner the two things the shipped ledger never gave them - editing the subscription record and
deleting it with its whole ledger - and replace every plain-text calendar field with a real browser
control. Roadmap item S-08. The frame's conclusion sharpens the why: the code is already shaped for
both halves, so what deserves the attention is making every rule the design states get decided by the
write rather than by a read that a concurrent request can invalidate, and proving the month fallback in
the one browser that decides it rather than from a feature probe.

## Starting point

The subscription record is create-only and delete-less. `PATCH /api/subscriptions/:id` accepts four
settings and excludes the first month, with the reason written into two code comments; no client code
calls it, and there is no DELETE verb at all. Eight calendar inputs exist in the client and not one
declares a `type`, so every one is an implicit text input carrying an ISO placeholder and a numeric
pattern. Four of the seven child tables carry no `subscription_id` and are reachable only by join.
`db.batch()` is the only atomicity mechanism D1 offers this codebase, and four existing writes already
use it for that reason. The unit suite runs in `node` with no DOM and collects only `src/**/*.test.ts`,
which shapes how the new controls are built.

## Desired end state

The subscription detail header carries two link-variant buttons. "Edit subscription" opens a panel in
place with five pre-filled settings; Currency is locked with a stated reason once any amount is
recorded, and the first month may move back up to ten years or forward only to the earliest month any
dependent record uses, with a refusal that names the binding month and the kind of record that pins it.
"Delete subscription" opens the page-level confirmation strip, and a confirmed deletion removes the
subscription and its entire ledger as one atomic write, returns to Home, refetches the list and says
"Subscription deleted". Every calendar value is entered through a native picker, or in a browser with
no month picker, through a native select of named months.

## Key decisions

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Editable settings | Name, currency, locale, time zone, first month | the brief asks for the first month and the settings that are meaningful beside it | Delta |
| Currency when amounts exist | refused, with the field disabled and the reason shown | amounts are minor units with no per-row currency and `formatMoney` divides by 100 unconditionally, so a zero-decimal currency misreads history by a hundred | Delta, agreed by Frame |
| First month, forward | bounded by five dependent minimums | every dependent rule is `>=`, so widening the window satisfies all of them automatically | Delta, agreed by Frame |
| First month, backward | floored at January ten years before the current year in the subscription's time zone, on create and edit alike | the summary enumerates every month from the first month on every read, and the schema regex would accept `0001-01` | Review F10, ruled by Delta |
| Owner opening range | shifted with the first month in the same batch, and only when it still sits at the old first month | the participant PATCH can already move the owner's ranges, so the creation-time equality is not an invariant | Delta, sharpened by Frame |
| Owner's later ranges | no rule of their own; they sit inside the participant minimum | non-overlap guarantees the opening range's leave-month refusal fires first, so a "next active range" kind is unreachable | Review F3, ruled by Delta |
| How the rules are decided | pre-read for the sentence, `not exists` clauses in the update's own `where` for the decision | D1 has no interactive transaction, so a read-then-write leaves a window a concurrent record can land in | Review F5 |
| Repository to route | a discriminated union, not a nullable return | `null` already means 404 on this resource, so reusing it would turn every refusal into a silent 404 | Review F4 |
| Deletion mechanism | one `db.batch` of eight ordered statements, each ownership-scoped by subquery | correct whether or not foreign keys are enforced, and the row counts become assertable | Delta, agreed by Frame |
| Month fallback | one native `<select>` of named months | two selects would need a composite value and a fieldset; a date adaptation would put a day into a month field | Delta, agreed by Frame |
| Detection | two probes, once per page load, behind an injectable element factory | the unit suite has no DOM, so the probes need a stub seam rather than a jsdom dependency | Review F1 |
| Which element renders | a pure function returning `'input' \| 'select'` | a `.tsx` test would not even be collected, so the decision is unit-tested and only the JSX is left to the browser | Review F9 |
| Empty month value | the control's handler always emits a string | `ScheduleForm` holds a plain string and would break on a `null`; both call sites already normalise at submit | Review F6 |
| Header action row in `error` and `no-owner` | both disabled in `error`; Delete enabled and Edit disabled in `no-owner` | deletion needs only the id and is the one useful action on a subscription the product cannot show | Review F7, ruled by Delta |
| `min` and `max` | `min` wherever a bound exists, including each paired field and the ten-year floor; no `max`, no `step` | all seven forms carry `noValidate`, so `min` narrows a picker and can never raise a browser bubble | Delta, Plan |
| One label per wire name | `start_month` is "First month" everywhere, including the create form | one value should not have two names on two screens | Review F11, ruled by Delta |
| Browser coverage | Chrome and Safari verified locally; the rest reported and marked unverified | Firefox and Edge are not installed and there is no browser-automation dependency | Delta |

## Scope

**In scope:** the extended PATCH and its rules; a new DELETE over eight tables; two shared client
calendar controls with the select fallback; all eight call sites migrated; the detail header action
row, edit panel and page-level deletion strip; the Home return; unit and integration tests for every
rule; a two-browser verification pass with captures; the foundation documents.

**Out of scope:** any migration or schema change; anything under `src/domain/`; a JavaScript
date-picker library, jsdom, testing-library or any other new dependency; editing the archived design
specification; `owner_name` on the subscription form; a router or URL handling; a confirmation gate on
the currency; a "next active range" refusal kind; deployment, release evidence refresh and course
upload; `context/STATUS.md`, `GOALS.md`, `evidence/index.md` and `evidence/work-log.md`.

## Architecture

Server and controls are independent and can be built at the same time. The server half is three files
under `src/server/` plus three test files: the patch schema gains a field, the repository gains the
lock, the floor, the minimums and the delete batch and changes its return to a discriminated union, and
the router gains a verb. The client half is two new controls plus one pure helper module under
`src/client/components/ui/`, consumed by eight existing forms and by one new settings panel on the
detail screen. Every decision the controls make lives in the helper module so the `node` unit suite can
cover it. Nothing crosses between the halves except the two new functions in `src/client/api.ts`, which
go through the existing `request()` helper so the 401 and refusal mapping apply unchanged.

## Phases at a glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Server | extended PATCH with the currency lock, the first-month floor and minimums and the owner shift; DELETE as one eight-statement batch; the tests for both | a rule decided by a read a concurrent write can invalidate |
| 2. Controls | `MonthField`, `DateField`, the detection, branch and option-range helpers, the control-box CSS | the probes pass where no picker renders |
| 3. Call sites | all eight calendar fields migrated, ISO hints and text attributes removed, every `min` added, the create form's label aligned | a wire value or an empty-state convention changes silently |
| 4. Detail screen | the header action row in all four states, edit panel, deletion strip, client API functions and Home return | the no-op submit, the focus moves and replacing the held subscription |
| 5. Verification | the two-browser pass, the measurements and the acceptance captures | the fixed control height and the native Enter and Escape behaviour |
| 6. Foundation | the requirements, test plan, roadmap and repository guide | a document that records the change rather than the product |

**Dependencies:** 1 and 2 are independent and may run in parallel. 3 depends on 2. 4 depends on 1 and
2, and follows 3 because both touch form files. 5 depends on 3 and 4. 6 depends on all of them.

**Prerequisites:** none outside the repository. Every row is executable against `main` with a local D1
and the two browsers installed on this machine.

## Open risks and assumptions

- The detection probes test month value sanitisation, not picker rendering. Safari decides this, and
  the plan carries it as a gate rather than an assumption; a miss costs one condition and one test.
- The JSX that the detection selects is not covered by any automated test in this repository, and
  adding a DOM environment for one assertion is not worth a dependency here. Accepted and stated in
  the plan's Testing strategy rather than implied.
- The native controls may exceed the fixed 40px and 44px box. The delta's `min-height` exception is
  pre-authorised for these two types alone, applied only on a measurement.
- Enter and Escape inside a native control may differ from the accepted keyboard contract. That is
  recorded per browser, not worked around.
- No design or planning question is open. Everything this plan once carried as a recommendation is
  ruled in the delta's "Rulings on planning questions" and "Rulings on plan review design findings".

## Success criteria

- The owner can change all five settings and is refused, with a sentence naming why, exactly where the
  data would otherwise be misread or the summary made unbounded.
- A confirmed deletion removes the subscription and every one of its records and nothing else, and a
  half-deleted subscription is not reachable by any failure path.
- Every calendar value is entered through a picker or a named-month select, and every value on the wire
  is still `YYYY-MM` or `YYYY-MM-DD`.
