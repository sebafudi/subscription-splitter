# s08 browser verification and acceptance captures

Phase 5 of change `subscription-management-and-date-inputs` (S-08). Every claim below is a value read
from a live page, with the property it came from named, or a pixel measured off a 1:1 screen capture
where the browser could not be scripted. No credential value appears in this file or in any capture.

## Environment

| What | Value |
| --- | --- |
| Commit the captures were taken against | `bc036e2` |
| Commit the gates were run on | `31398ab` |
| Difference between the two under `src/`, `tests/`, `migrations/` | none (`git diff --name-only bc036e2..HEAD -- src/ tests/ migrations/` is empty) |
| Server | `npm run dev` (Vite plus Worker on one origin, `http://localhost:5173`) against the local D1 |
| Account | the seeded local owner account, through the real password form |
| Chrome | `Chrome/152.0.7977.84`, throwaway profile, driven over the DevTools protocol |
| Safari | `26.6.2`, the machine's own Safari, driven by keystroke only |

The tiling window manager blocks window resizes, the same constraint
`evidence/runs/google-sign-in-manual-rows.md` records, so both widths are Chrome device emulation at a
device scale factor of 2 rather than window sizing. Captures of native picker popups are screen-region
captures of the browser window alone, because a picker popup is drawn by the browser outside the page
and does not appear in a protocol screenshot.

`COOKIE_SECURE` was `true` in the ignored `.dev.vars`. Safari refused the session cookie over plain
http and the sign-in form returned to the login screen with no error. Setting `COOKIE_SECURE=false`
and restarting the dev server, the remedy the README already documents for exactly this browser, let
Safari sign in. The file was restored byte-identical afterwards (`cmp` reports no difference).

## The disposable subscription

Created for this run through the product's own screens and routes, named `S08 disposable`, later
renamed `S08 disposable edited` by the edit panel under test. It carried one participant, two prices,
two skipped months, two payments and one standing order, all synthetic. It is the only record this run
deleted. The two pre-existing subscriptions, `Family plan` and `Payments walkthrough`, were read but
never modified and both survive: `GET /api/subscriptions` after the deletion returns exactly those two.

## Calendar controls, as rendered

Read from the live detail screen with every panel that holds a calendar field open at once, through
`document.querySelectorAll('input, select')` and the element's own properties.

| Field | `id` | Rendered `type` | `min` | `max` | `step` |
| --- | --- | --- | --- | --- | --- |
| First month (edit panel) | `settings_start_month` | `month` | `2016-01` | none | none |
| From (participant) | `member_new_joined_0` | `month` | `2026-03` | none | none |
| To (participant) | `member_new_left_0` | `month` | `2026-03` | none | none |
| Effective from (price) | `price_effective_from` | `month` | `2026-03` | none | none |
| Month (skipped) | `break_month` | `month` | `2026-03` | none | none |
| First month (standing order) | `schedule_new_start` | `month` | `2026-03` | none | none |
| Last month (standing order) | `schedule_new_end` | `month` | none | none | none |
| Date received (payment) | `payment_new_date` | `date` | `2026-03-01` | none | none |

Seven `month` and one `date`, which is the count the delta's amended 3.4 names. Every bound matches the
delta's Bounds paragraph: the subscription's own first month on the four fields with a server lower
bound, the first day of that month on the payment date, the ten-year floor on the subscription first
month itself, and no bound on standing order Last month while its partner is empty. No `max` and no
`step` anywhere.

`inputMode`, `pattern` and `placeholder` read `null` on all eight. `autoComplete` reads `off` on all
eight. The `dd/mm/yyyy` and `mm/dd/yyyy` text visible in an empty date field is the browser's own
segment prompt, not an authored `placeholder`.

The ten-year floor is visible twice over: the attribute reads `min="2016-01"`, and the accessibility
tree gives the year spinner `valuemin="2016"` against a current month of `2026-09`.

### The paired bound follows its partner

Measured by setting and clearing each partner and re-reading the attribute.

| Action | `member_new_left_0` `min` | `schedule_new_end` `min` |
| --- | --- | --- |
| Partner holds `2026-03` / empty | `2026-03` | none |
| Partner set to `2026-06` / `2026-08` | `2026-06` | `2026-08` |
| Partner cleared | none | none |

Clearing the partner releases the bound rather than freezing it, which is the rule the delta states.

### Each field submits the plain ISO string

Request bodies captured at `window.fetch` as each form was submitted.

| Field | Body the client sent |
| --- | --- |
| From, To | `{"name":"","active_ranges":[{"joined_month":"2026-06","left_month":"2026-08"}]}` |
| Effective from | `{"effective_from":"2026-04","amount":13000}` |
| Month (skipped) | `{"month":"2026-06"}` |
| Date received | `{"member_id":"...","date":"2026-07-15","amount":7000,"note":"","kind":"manual"}` |
| First month, standing order | `{"member_id":"...","amount":5000,"start_month":"2026-08","end_month":"2026-09"}` |
| First month, New subscription form | the created record reads back `"startMonth":"2026-03"` |
| First month, edit panel | `{"name":"S08 disposable renamed","time_zone":"Europe/Lisbon"}`; a first-month submit was refused by the server naming `start_month`, so the key reached it, but that body was not itself captured |

No `valueAsDate`, no `valueAsNumber` and no constructed `Date` is involved; every value is the string
the field holds.

## Measured control heights

`getBoundingClientRect().height` in Chrome, against the 40px and 44px rule of the delta's Box paragraph.

| Control | 1280 | 390 |
| --- | --- | --- |
| Month input (`settings_start_month`) | 40 | 44 |
| Date input (`payment_new_date`) | 40 | 44 |
| Text input (`settings_name`) | 40 | 44 |
| Text input, disabled (`settings_currency`) | 40 | 44 |
| Form select (`payment_new_member`) | 40 | 44 |

Nothing exceeds the fixed height, so the `min-height` exception the delta allows is **not** needed and
no CSS change is called for. The right padding of the month and date inputs computes `8px` (`--s-2`)
against `12px` on a text input, which is the delta's rule putting the picker glyph inside the box.

In Safari the fallback select measures approximately 40px at 1280, read off a 1:1 screen capture
(box edges 39 to 40 pixels apart, the uncertainty being border antialiasing). This is a pixel
measurement, not a `getBoundingClientRect` reading, because Safari could not be scripted; see
Unverified below.

## Keyboard matrix

| Check | Chrome | Safari |
| --- | --- | --- |
| Enter inside a month control, picker closed | submits the panel's form (one `submit` event, panel's own form) | inherits the native select rule; not separately exercised |
| Enter inside a date input, picker closed | submits the panel's form (one `submit` event) | submits: the Edit payment panel closed and its section status line read "Changes saved" |
| Escape with the picker popup open | consumed by the browser: popup closes, panel stays open (`data-open="true"`), focus stays in the control | consumed by the browser: popup closes, panel stays open, focus stays in the date input with the month segment selected |
| Escape with the picker closed | acts as Cancel: panel closes and focus returns to "Edit subscription" | acts as Cancel: the participant panel closed and focus returned to "Add participant" |
| Escape with the confirmation strip open | acts as Keep: strip closes, action row remounts, focus on "Delete subscription" | not exercised |
| Tab order across the header | "All subscriptions", "Edit subscription", "Delete subscription", then the section index | not exercised |

Both browsers match the delta's amended section 7 exactly. Neither differs, so nothing is recorded as
a browser that had to be worked around.

## The focus ring

`getComputedStyle` in Chrome, on a month input and on a date input, both matching `:focus-visible`.

| Theme | `outline` | `outline-offset` | `--green` |
| --- | --- | --- | --- |
| Light | `rgb(31, 111, 74) solid 2px` | `2px` | `#1f6f4a` |
| Dark | `rgb(93, 187, 134) solid 2px` | `2px` | `#5dbb86` |

That is the 2.4 ring in `--green`, unmodified, on both control types in both themes. In Safari the
same ring is visible on the fallback select, captured rather than computed.

## Header, panel and strip

| Check | Observed | Evidence |
| --- | --- | --- |
| Action row placement | 12px (`--s-3`) between the subtitle's bottom and the row's top; 24px (`--s-5`) `margin-top` on the "Owed to you now" label below it; buttons `13px`, `gap: 12px` | `s08-01-header-action-row-1280[-dark].png` |
| Action row at 390 | both buttons stay on one line at x 16 and x 126, status line empty and on its own line; no horizontal overflow | `s08-01-header-action-row-390[-dark].png` |
| Disabled during first load | with the detail requests held open, both buttons read `aria-disabled="true"` and compute `--ink-faint`; they enable when the load settles | `s08-02-header-first-load-disabled-1280[-dark].png` |
| Error state | with the detail load stubbed to 500, both buttons read `aria-disabled="true"` and the section alert reads the server message | `s08-20-header-error-state-1280.png` |
| Action row absent while a panel is open | the row element holds only its permanently mounted `role="status"` child and collapses to height 0; both buttons are gone from the document | `s08-03-*`, `s08-07-*` |
| Panel pre-filled, focus on Name | `document.activeElement.id` is `settings_name`; the five fields carry the stored values | `s08-03-edit-panel-open-1280[-dark].png`, `s08-03-edit-panel-open-390[-dark].png` |
| Currency locked with its hint | `disabled` is true and `aria-describedby` points at a hint reading "Locked while prices, payments or standing orders are recorded. Every amount is stored in PLN." | same |
| Time zone and first month hints | "Decides which month counts as the current one. Balances follow it." and "Can move back up to ten years, or later up to the earliest recorded month." | same |
| Currency and Locale pair | side by side at 1280 (same `y`, 303px each), one column at 390 | same |
| Refused later first month | panel stays open, value `2026-04` kept, `aria-invalid="true"`, field error reads "First month cannot be later than 2026-03 because a price is recorded from that month" | `s08-04-first-month-refused-1280[-dark].png` |
| No-op submit | no non-GET request at all, panel closes, status line stays empty, focus returns to "Edit subscription" | measured, no capture |
| Real save | `PATCH` carried only the changed keys; status line read "Changes saved"; `h1` and subtitle updated in place | `s08-05-changes-saved-1280[-dark].png` |
| Home row updated on return | Home showed "S08 disposable edited" with `performance.getEntriesByType('navigation').length` still 1, so no page reload | `s08-06-home-row-updated-1280.png` |
| Strip, both sentences and both buttons | question "Delete S08 disposable edited?" and the consequence sentence verbatim; `btn-destructive` and `btn-quiet`; focus on Keep | `s08-07-delete-strip-1280[-dark].png`, `s08-07-delete-strip-390.png` |
| Strip at 390 | spans the 16px-padded column (x 16, width 358), buttons 44px, no horizontal overflow | `s08-07-delete-strip-390.png` |
| Keep | strip closes, action row remounts, focus on "Delete subscription" | measured |
| Failed deletion | strip closes, header alert shows the server message verbatim beside "Dismiss", focus moves to the alert, action row remounts | `s08-13-delete-failed-alert-1280.png` |
| Real deletion | `DELETE` answered 204; Home rendered with `h1` "Your subscriptions (2)" carrying `tabindex="-1"` and holding focus; status line "Subscription deleted" | `s08-08-home-subscription-deleted-1280.png` |
| The deleted id is gone | the subscription root and all six child routes answer 404 from a `fetch` inside the page | measured |

## Reduced motion

Chrome relaunched with `--force-prefers-reduced-motion`, confirmed by
`matchMedia('(prefers-reduced-motion: reduce)').matches` reading `true` in the page.

| State | Without reduced motion | With reduced motion |
| --- | --- | --- |
| `transition-duration` on `.disclosure` | `0.18s` | `0s` |
| `document.getAnimations().length` 60ms after opening the panel | 1, duration 180ms | 0 |
| `grid-template-rows` 60ms after opening the panel | `125.86px`, still growing | `547.69px`, already final |
| `transition-duration` on the confirmation strip | - | `0s`, opacity already 1, zero animations |

Both the panel and the strip appear instantly. Captures `s08-16-reduced-motion-panel-1280.png` and
`s08-17-reduced-motion-strip-1280.png`.

## Safari: the fallback gate

This is the check reading the source could not settle, and it passes. Safari renders **the native
select of named months**, not a bare month-typed box: the participant panel shows "From" and "To" as
selects with the 3.4 chevron. The detection function needs no third condition and
`src/client/components/ui/monthControl.ts` is unchanged by this phase.

| Check | Observed | Evidence |
| --- | --- | --- |
| Required month field | popup opens with a greyed "Choose a month" first, then months ascending from `2026-03`, the field's `min` | `s08-11-safari-month-select-required-open.png` |
| Optional month field | popup opens with "Still active" first and selectable, then the same ascending months | `s08-12-safari-month-select-optional-open.png` |
| Option labels | the subscription locale, `pl-PL`: "mar 2026", "kwi 2026", "maj 2026", "cze 2026", "lip 2026", "sie 2026", "wrz 2026", "paź 2026", "lis 2026", "gru 2026", "sty 2027", "lut 2027" | same |
| Closed state | "mar 2026" on the required field, "Still active" on the optional one, with "Leave empty while still active" below | `s08-11-safari-month-select-fallback-1280.png` |
| Payment date | a real native date input, rendering `07/15/2026` in segments, with the native calendar popup | `s08-19-safari-date-picker-open.png` |
| Focus ring on the fallback select | the green 2.4 ring is present, read from the capture rather than computed | `s08-18-safari-focus-ring-select.png` |

## Chrome: the pickers

Both native popups open and are the browser's own, with no drawing of ours beyond the indicator glyph.
The month picker shows a year header, a four-by-three month grid with the held month selected, and the
browser's "Clear" and "This month" actions. Captures `s08-09-month-picker-open-1280.png` and
`s08-10-date-picker-open-1280.png`.

The month input renders its text in the browser's own UI language ("March 2026") rather than the
subscription locale, which the delta's Box paragraph accepts in advance.

## Console

No JavaScript error was raised in any flow, in either browser session. The only console entries across
the whole run are network status lines from refusals this run caused deliberately: one 400 from a
participant submitted with an empty name while capturing its wire value, and seven 404s from the
probes confirming the deleted subscription is gone. No uncaught exception, no React warning, no
resource failure.

## Horizontal overflow

`document.documentElement.scrollWidth - clientWidth` reads 0 at 390 on the detail screen in every state
captured: idle, with the edit panel open, and with the confirmation strip open. It reads 0 at 1280 too.

## Unverified

| What | Why | What would settle it |
| --- | --- | --- |
| Firefox, Edge, Chrome Android, Firefox Android | not installed and not reachable from this machine; the delta's answer 11 plans for this | published support data, already the plan's stated position |
| Safari control heights as computed values | Safari could not be scripted, so the heights are pixel measurements off a 1:1 capture rather than `getBoundingClientRect` readings | the owner enabling **Develop, Allow Remote Automation** (then `safaridriver --enable`, which needs an administrator password) or **Develop, Allow JavaScript from Apple Events** |
| Safari at 390 width | Safari has no scriptable viewport emulation here and the window manager blocks resizing the window | the same Safari setting above, or Responsive Design Mode driven by hand |
| Safari in light appearance | the machine's appearance is dark and Safari follows it; there is no per-page override without scripting | the same |
| Safari Tab order and Escape on the confirmation strip | keystroke-only driving reached the panels but not a reliable full traversal | the same |
| The header's `no-owner` state (plan row 4.17, second half) | the 409 no-owner case needs a subscription whose owner participant row is absent, which the product's own routes refuse to produce (the owner cannot be deleted) | a direct D1 fixture, or an integration test rather than a browser check |

## Method notes

Deletion was exercised once, on the disposable subscription created for this run, in the local dev
environment only. Nothing was run against the deployed Worker. No demo or user record was deleted.
The one source-file question this phase was allowed to raise, a third condition in the month
detection, did not arise: Safari already takes the select branch.
