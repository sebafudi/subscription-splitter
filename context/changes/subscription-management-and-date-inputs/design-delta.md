# Design delta: subscription settings, deletion and native calendar controls

Designer: Fable 5.1, applying the frontend-design skill to the accepted visual specification at
`context/archive/visual-redesign/design-spec.md`. This delta amends that specification for change
`subscription-management-and-date-inputs` (roadmap S-08). Everything not named here is unchanged.
Implementers apply this delta as written; a missing or infeasible detail goes back to the designer
through a checkpoint, not into an improvised choice. Section numbers refer to the design
specification. Evidence behind each ruling is in `research.md` in this folder.

## Direction

The detail screen is one ledger page opened from the Home list. The Home row for a subscription is a
ledger entry; the header of the detail screen is that same entry, opened. So the subscription gains
exactly what every other entry already has: an action row of link-variant buttons under its
secondary line, an edit panel that opens in place, and the red confirmation strip for deletion.
Nothing new is invented for the subscription; it joins the system the rows already use.

Calendar values become real browser controls. The ledger's figures stay set in tabular ISO months
in every message the client sends; only the way a person enters a month or a day changes. Where a
browser has no month picker, the month is chosen from a native select whose options are the months
themselves, named the way the ledger already names months ("Sep 2026"). No JavaScript picker, no
plain string field left unexplained.

Principle order from 1 holds. Red still means owed, and the destructive strip is the one other place
it appears, unchanged from 3.10.

## Rulings on product questions

These are product rules the design depends on. They bind the server as much as the client.

**Editable settings.** The edit form exposes five settings: name, currency, locale, time zone and
first month (`start_month`). `owner_name` stays a participant setting edited through the
participant row, as today.

**Currency.** Currency can change only while no amount is recorded for the subscription: no price,
no payment, no standing order. Once any amount exists, the server refuses a different currency with
field `currency` and the client shows the field disabled with the reason. Rationale: every amount is
stored in minor units with no per-row currency and no conversion, so a change relabels history and
a zero-decimal currency misreads it by a factor of one hundred. Refusal is reversible; corruption is
not.

**Locale and time zone.** Both change freely. Locale is display only. A time-zone change may move
which month counts as current and therefore every balance by one month's worth; the field's hint
says so. No confirmation; no data changes.

**First month.** Moving it earlier is allowed down to the ten-year bound below. Moving it later is allowed only up to the
earliest month any dependent record uses, checked on the server in one place: the earliest
participant join month, the earliest price month, the earliest skipped month, the month of the
earliest payment date and the earliest standing-order first month. The owner's opening range is the
one exception: when its join month equals the old first month it is moved to the new first month in
the same atomic write, so it is excluded from the minimum check. The owner's ranges are editable through
the participant route, so the shifted set is revalidated before writing with the same range rules
the participant route applies (ordered, non-overlapping, open range last): if the shifted range would
end before it starts, the change is refused naming its leave month. The owner's later ranges take
part in the participant minimum like any other range, and non-overlap guarantees the leave-month
refusal fires before any of them could be reached, so no further owner-specific kind exists. A
refusal names the binding month and the kind of record that pins it, in this order when tied: "a
participant is active from", "a price is recorded from", "a month is skipped in", "a payment is dated
in", "a standing order starts in", and for the owner's opening range "your own first active range
ends then". Wire sentence shape: `start_month cannot be later than 2026-03 because a price is
recorded from that month`. The client transform of 3.8 renders it as "First month cannot be later
than 2026-03 because a price is recorded from that month".

Moving it earlier is bounded by one rule, on create and on edit alike: the first month cannot be
earlier than January ten years before the current year in the subscription's time zone. Wire
sentence: `start_month cannot be earlier than YYYY-MM`. The bound exists because the summary
enumerates every month from the first month on every read; it matches the span the month select
fallback offers, so the picker path and the select path agree.

**Deletion.** A confirmed deletion removes the subscription and everything reachable from it:
participants, their active months, prices, skipped months, payments, standing orders and their
month marks. One atomic write, ownership checked first, a foreign or unknown id answering the
existing non-disclosing 404. Nothing else of the user's is touched. Cancelling performs no request.

## 4.4 Subscription detail (amended header)

```
App bar
All subscriptions                                   link button, t-small
Payments walkthrough                                h1 t-title
PLN, Europe/Warsaw, from Jul 2026                   t-small ink-soft
[Edit subscription] [Delete subscription]           ✓ Changes saved    action row, t-small
[edit panel or confirmation strip, in place of the action row when open]

Owed to you now
0,00 zł
...
```

- The action row sits directly under the subtitle with `--s-3` above it and `--s-5` below it before
  "Owed to you now". Two link-variant buttons at `--t-small`, always visible, separated by `--s-3`:
  "Edit subscription" and "Delete subscription". At the right end of the same row the header status
  line per 3.9 (`role="status"`, permanently mounted, empty when idle). Below 640px the buttons keep
  one line and the status line moves to its own line under them, left aligned, only when it has
  text.
- During the first load of the detail (the skeleton state of 4.4) both buttons render disabled per
  3.3 (`aria-disabled="true"`, text `--ink-faint`). They enable when the first load settles. The
  currency lock below depends on the loaded lists, and deletion should not race the first load.
- In the detail's error state (the load failed) both buttons stay disabled, because nothing about
  the subscription's lists is known. In the no-owner state (the 409 case of 4.4) "Delete
  subscription" is enabled and "Edit subscription" stays disabled: deletion needs only the id and is
  the one useful action on a subscription the product cannot show, while the edit panel's currency
  lock needs lists that state does not have. The strip, the Home return and the status line behave
  as in the ready state.
- Only one of the edit panel and the confirmation strip is open at a time; while either is open the
  action row is absent, exactly as a heading-row button is absent while its panel is open (3.7).
- A permanent `role="alert"` element sits under the action row position for header actions that fail
  outside the panel: a failed deletion. Same appearance and copy rules as the section alert of 3.5,
  including the link-variant "Dismiss". A 404 on deletion (the subscription is already gone or is
  not the user's) shows the server message and a link-variant "All subscriptions" beside Dismiss,
  matching the 409 no-owner case of 4.4.
- After a saved edit the title, subtitle and Home list entry reflect the new values without a
  page reload: the client replaces its held subscription object with the PATCH response and reloads
  the detail data (a first-month or time-zone change moves the figures). Current figures stay on
  screen during that reload per 4.4.

### Edit subscription panel

Opens in place of the action row with the disclosure motion, panel styling of 3.7, `h3` "Edit
subscription". Focus moves to the Name field on open. Fields, in this order:

| Field | Layout | Control | Hint |
| --- | --- | --- | --- |
| Name | span | text input, `required` | none |
| Currency | pair, left | same control as the New subscription form | when locked: "Locked while prices, payments or standing orders are recorded. Every amount is stored in PLN." (the current currency code in place of PLN) |
| Locale | pair, right | same control as the New subscription form | same hint as the New subscription form, if it has one |
| Time zone | span | same control as the New subscription form | "Decides which month counts as the current one. Balances follow it." |
| First month | span | month control per 3.4 below, `min` at the ten-year lower bound above, no `max` | "Can move back up to ten years, or later up to the earliest recorded month." |

- Currency is `disabled` when the loaded detail has at least one price, payment or standing order.
  The disabled treatment of 3.4 applies and the hint above is its `aria-describedby` text. The
  server enforces the same rule independently; if it refuses anyway, the message renders as a field
  error under Currency per 3.8.
- Fields are pre-filled from the held subscription object. Cancel and Escape discard edits and
  return focus to "Edit subscription" as the action row remounts. Buttons `[Save changes] [Cancel]`.
- Submitting sends only the fields whose values differ from the stored ones; a submit with no
  differences sends nothing and closes the panel as if cancelled, with no status line. (The PATCH
  route refuses an empty body, and a no-op should not report "Changes saved".)
- Success: panel closes, focus moves to "Edit subscription" as the action row remounts, the header
  status line reads "Changes saved". No entry highlight; the header is not a row.
- Field errors and whole-form errors follow 3.8 exactly. The display map for this form: `name` to
  "Name", `currency` to "Currency", `locale` to "Locale", `time_zone` to "Time zone", `start_month`
  to "First month". On a refused first month the panel stays open with the entered values.

### Delete subscription confirmation

Replaces the action row in place with the confirmation strip of 3.10, spanning the content column.
Two sentences, then the buttons:

- Question at `--t-body`: "Delete Payments walkthrough?" (the subscription name verbatim).
- Consequence at `--t-small` colour `--ink`: "Its participants and their active months, prices,
  skipped months, payments, standing orders and their month marks will be removed. This can't be
  undone."
- Buttons `[Delete subscription]` (destructive) and `[Keep]` (quiet). Focus moves to Keep. Escape
  acts as Keep. Keep remounts the action row and focuses "Delete subscription". Nothing else on the
  page is blocked.
- While the request is in flight the strip gets `aria-busy="true"`, both buttons are disabled per
  3.3 and the labels do not change.
- Success: the client leaves the detail, returns to Home, refetches the list, focuses the Home `h1`
  (which gains `tabindex="-1"`) and shows "Subscription deleted" in the Home heading-row status
  line. The deleted subscription is no longer held anywhere in client state.
- Failure: the strip closes, the header alert shows the server message verbatim or the connection
  copy of 3.5, and focus moves to the alert.

## 3.4 Inputs (amended)

Replace the two sentences on month and date fields with the following.

**Date fields** (the payment date) are `<input type="date">`. **Month fields** (subscription first
month on create and edit, participant From and To, price Effective from, skipped month, standing
order First month and Last month) use one shared month control that renders `<input
type="month">` when the browser implements a month picker and a native `<select>` of months when it
does not. Both controls read and write plain `YYYY-MM` or `YYYY-MM-DD` strings through `.value`;
neither `valueAsDate` nor `valueAsNumber` is used anywhere, and no `Date` object is constructed from
a field value. The ISO format hints ("Month as YYYY-MM, like 2026-01", "Date as YYYY-MM-DD") are
removed; the picker or the option labels carry the format. Semantic hints stay ("Leave empty while
still active", "Leave empty while it is still running"). `inputMode`, `pattern` and `placeholder`
are removed from every calendar field. `autoComplete="off"` stays.

Picker detection runs once per page load: create an `input`, set `type = "month"`, and require both
that `type` reads back `"month"` and that assigning `value = "not-a-month"` reads back `""`. Only a
browser passing both renders the month input. The detection function is injectable so tests cover
both branches; there is no user-facing toggle.

**Box.** Native date and month inputs keep the 3.4 box: 40px (44px below 640px), `--paper` ground,
1px `--border`, radius 4px, `--ink` text, focus per 2.4, invalid and disabled per 3.4. In Chromium and
WebKit the picker indicator (`::-webkit-calendar-picker-indicator`) keeps the browser's glyph, gets
`cursor: pointer` and follows `color-scheme` for the dark theme; nothing else is drawn. The right
padding of these two types is `--s-2` so the glyph sits inside the box. If a measured native control
exceeds the fixed height in any verified browser, the height rule for `input[type="date"]` and
`input[type="month"]` alone becomes `min-height` at the same value, and the measured heights are
recorded in the plan's Progress. The browser renders the month input's text in its own UI language,
not the subscription locale; that is accepted.

**Select fallback.** The same `select` box and chevron as 3.4. Options are months in ascending
order, value `YYYY-MM`, label from the month formatter of 3.12 in the subscription locale ("Sep
2026"; on the New subscription form, the locale the form currently holds, falling back to the
default locale when it is not valid). The range is: from `min` when given, otherwise January ten
years before the current year; to `max` when given, otherwise December of the year after the
current one; always extended to include the field's current value. The current year comes from the
domain's `currentMonth` for the subscription's time zone (on the create form, the time zone the
form holds), the one clock read the code allows. A required field's first option is
`<option value="" disabled>Choose a month</option>`; an optional field's first option is
`<option value="">` labelled with the field's empty meaning, "Still active" for participant To and
"Still running" for standing order Last month, and choosing it clears the value to `null` at submit
as today. The select is labelled by the field label through `htmlFor`, so no fieldset is needed.

**Bounds.** `min` is set where a server lower-bound rule exists: the subscription first month on
participant From, price Effective from, skipped month and standing order First month; the first day
of the first month (`YYYY-MM-01`) on the payment date; the paired From value on participant To and
the paired First month value on standing order Last month, whenever that paired value is a complete
month, otherwise no `min`; and the ten-year lower bound on the subscription first month itself, on
create and edit. No `max`, no `step`. Bounds are a convenience
only; the server rules remain the enforcement, and a browser that ignores the attributes (iOS
Safari) is not a defect. Each form keeps its current form-level validation attribute; whether the
form is `noValidate` today is recorded in the plan and not changed by this delta.

## 3.9 Success (amended)

Add to the sentence list: "Changes saved" for the subscription edit, in the header status line;
"Subscription deleted", in the Home heading-row status line.

## 3.10 Destructive confirmation (amended)

The strip may carry a second sentence at `--t-small` colour `--ink` under the question; it is used
only by the subscription deletion above. The strip may also appear at page level, in place of the
header action row, with the same behaviour it has inside a row.

## 6. Field pairs summary (amended)

Add the row: Edit subscription | Currency + Locale.

## 7. Keyboard and screen reader behaviour (amended)

- Inside a native date or month input, arrow keys move within and between segments, digits type
  directly, and Space or Enter on the indicator opens the picker. Enter inside the control while the
  picker is closed submits the panel's form, as it does in a text input. Escape while the picker
  popup is open closes the popup and is consumed by the browser; Escape while it is closed acts as
  Cancel per 3.7, the same rule the spec already states for an open native select. Implementers
  measure these in Chrome and Safari and record the result; a browser that differs is recorded, not
  worked around.
- The month select fallback is an ordinary native select and inherits the existing select rules.
- The header action row is in the tab order between the subtitle and the leading figure. The Home
  `h1` carries `tabindex="-1"` so deletion can land focus on it.

## 8. Responsive behaviour (amended)

Below 640px the header action row keeps its two buttons on one line and the status line on the
next; the edit panel's Currency and Locale pair collapses to one column like every pair; the
confirmation strip spans the 16px-padded column. Native controls are 44px tall like every input.

## 9. Copy (additions)

| Where | Text |
| --- | --- |
| header action | Edit subscription |
| header action | Delete subscription |
| panel heading | Edit subscription |
| panel buttons | Save changes, Cancel |
| currency hint when locked | Locked while prices, payments or standing orders are recorded. Every amount is stored in PLN. |
| time zone hint | Decides which month counts as the current one. Balances follow it. |
| first month hint | Can move back up to ten years, or later up to the earliest recorded month. |
| first month label | First month, on both the New subscription form and the edit panel |
| strip question | Delete <name>? |
| strip consequence | Its participants and their active months, prices, skipped months, payments, standing orders and their month marks will be removed. This can't be undone. |
| strip buttons | Delete subscription, Keep |
| status | Changes saved |
| status | Subscription deleted |
| month select placeholder | Choose a month |
| month select empty option | Still active (participant To), Still running (standing order Last month) |

Server refusal sentences begin with the wire name so 3.8's transform applies: `currency cannot
change while prices, payments or standing orders are recorded`; `start_month cannot be later than
YYYY-MM because <kind> that month`, with the five kinds listed under Rulings; and, for the owner's
opening range, `start_month cannot be later than YYYY-MM because your own first active range ends
then`; and for the lower bound, `start_month cannot be earlier than YYYY-MM`.

## Rulings on planning questions

1. Owner range shift: the shifted owner range set is revalidated before writing and refused with the
   owner-specific kind above when it would end before it starts. The "next active range" kind first
   proposed here was withdrawn after the plan review showed it unreachable (design finding 1).
2. First month has no bounds, so the select fallback lists the full default range (about 144
   options) on both the create and edit forms. Accepted; narrowing would hide the move-earlier case
   the rulings allow. A native select handles that count, and typing a month name jumps to it.

## Ruling on an implementation question from phase 1

When the guarded first-month update matches no row and the re-read finds no binding record (a
doubly lost race that D1's sequential execution makes unreachable in practice), the server answers
`start_month cannot be later than <stored month>` with no because-clause. Accepted: the sentence is
truthful and the branch has no fixture, so no extra copy is specified for it.

## Rulings on implementation questions from phases 4 and 5

1. The gap between the header action row and "Owed to you now" is `--s-5`, which replaces the
   `--s-6` margin the summary label carried before; it applies in all four detail states. Accepted
   as implemented.
2. The action row's container stays mounted while the edit panel or the strip is open and carries
   only the status line, so "action row absent" and "status line permanently mounted" both hold.
   Accepted as implemented; it matches 3.5.
3. A browser with a month picker renders the chosen month in the browser's own UI language
   ("March 2026"), while the select fallback names months in the subscription locale ("mar 2026").
   Accepted: the picker text is browser chrome, not application copy, and the two never appear in
   the same browser.

## Rulings on plan review design findings

1. The "next active range" refusal kind is withdrawn; see Rulings on product questions.
2. Error and no-owner states of the action row are specified in 4.4 above.
3. One label. `start_month` is "First month" on every screen; the New subscription form's label
   changes from "Start month" to "First month" and the shared label map carries the single entry.
   Section 4.3's field list reads "First month (span, month control)".
4. `min` on participant To and standing order Last month follows the paired field; see Bounds.
5. Accepted as a deliberate ruling: a time-zone change reports "Changes saved" and the figures
   update in place; the field hint carries the warning before the change, which is where it helps.

## 11. Acceptance checklist (additions)

The designer's visual review of this change checks, from real captures at 1280 and 390 widths,
light and dark, in Chrome and Safari:

1. Header action row placement, spacing and type match this delta; disabled state during first load.
2. Edit panel open, pre-filled, with Currency locked and its hint; a refused first month showing the
   field error with the panel still open; "Changes saved" after a real save; title and subtitle
   updated; Home row updated on return.
3. Confirmation strip at page level with both sentences and both buttons; Keep returning focus to
   "Delete subscription"; after a real deletion of a disposable subscription, Home with
   "Subscription deleted" and focus on the `h1`.
4. Every calendar field renders `type="month"` or `type="date"` in Chrome with the picker open in
   one capture each for a month and a date; in Safari, the select fallback open for a required and an
   optional month field, and the native date picker for the payment date.
5. Control heights measured and equal to 40px and 44px, or the recorded `min-height` exception.
6. Focus ring on a native date input, on a month input and on the fallback select.
7. Reduced motion: panel and strip appear instantly.

## Answer index to the research's open questions

1. Five settings: name, currency, locale, time zone, first month. 2. Currency refused once any
amount exists; client disables the field with the reason. 3. Time zone changes freely with a hint.
4. Action row under the subtitle; edit panel in place, following 3.7. 5. The existing strip, at page
level, extended with one consequence sentence. 6. Native select of months. 7. Detect once per page
load with both probes; injectable for tests. 8. ISO hints removed everywhere; semantic hints stay.
9. `min` only where a server rule exists; no `max`, no `step`. 10. This file amends the archived
spec; the archived spec is not edited. 11. Chrome and Safari verified locally at both widths;
Firefox, Edge and mobile reported from published support data and marked unverified in evidence.
12. Fixed heights kept, measured, with the `min-height` exception recorded if needed.
