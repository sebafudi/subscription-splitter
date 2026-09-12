# Visual redesign specification

Change `visual-redesign`, roadmap S-06. This document is the design authority for implementation.
Implementers resolve mechanical code choices inside it and return any missing, inconsistent or
infeasible detail to the designer as a checkpoint; they do not improvise appearance, hierarchy,
copy, interaction or motion. Every question raised under "Design decisions for Fable" in
`frame.md` is answered here; the answer index at the end maps them.

Constraints carried from `frame.md` and `research.md`: wire field names, `/api` routes,
`formatMoney`, `scheduleMonthStatuses`, the `MemberMonthInputs` assembly and the
recorded-versus-assumed distinction with its seven exclusion phrases stay as they are. The client
derives no money figure, no share and no counted month. Native `button`, `select`, `input`,
`fieldset` and `label` elements stay native. No router is introduced; the detail screen remains one
page. Accounting, authentication, ownership and persistence behaviour do not change.

## 1. Direction

The product is a household ledger for one shared subscription: who is on the plan each month, what
the month cost, who has paid. The design borrows from the object people used for exactly this job
before software: ruled ledger paper. Pale green ground, dark ink, hairline rules between entries,
figures in tabular columns, and red ink used for one thing only, money that is owed. Everything else
is quiet so the figures carry the page.

The one memorable element is the ledger itself: money set in tabular figures on ruled rows, with red
ink appearing only where someone owes something. No cards, no decorative gradients, no icons beyond
the wordmark glyph and two functional glyphs (check, disclosure chevron).

Principles, in order of precedence when they conflict:

1. The figure leads. On every screen the most important number is the largest text.
2. Rules encode structure. A hairline separates ledger entries; a heavier rule opens a section.
   Nothing is boxed unless it is a control or a month tile.
3. Recorded money is ink. Assumed money is pencil. The two never look the same.
4. Red means owed. It appears on no other element.
5. Motion answers an action. Nothing moves on load.

### 1.1 Review against generic defaults

Checked against the common generated-page defaults before writing the rest of this document:

- Not a cream ground with a serif display and terracotta accent. The ground is ledger green, the
  face is a sans, the accent is a bookkeeping green with red ink for debt.
- Not a near-black ground with an acid accent. The dark theme is a green-tinted deep ground and the
  same two functional inks.
- Not a broadsheet. Rules are used only between ledger entries and at section openings, corners are
  softly rounded on controls, and the type is a sans set at a comfortable size.
- Not the card kit. The five equal summary cards are replaced by one leading figure and a three
  cell ledger line; participants, prices, payments and standing orders are ruled rows, not cards.
- No tracked all-caps eyebrows, no middle-dot meta strings, no monospace data labels, no arrows
  appended to buttons or links.

## 2. Tokens

Implement as CSS custom properties on `:root`. Light values are the default; dark values apply
under `@media (prefers-color-scheme: dark)`. Keep `color-scheme: light dark` on `:root` so native
controls follow the theme.

### 2.1 Colour

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--ground` | `#EEF2EA` | `#0F1512` | page background |
| `--paper` | `#F7F9F4` | `#161E19` | form surfaces, open disclosures, month tiles |
| `--ink` | `#17211B` | `#E8EDE6` | primary text, primary button fill |
| `--ink-soft` | `#4A5750` | `#A7B3AB` | secondary text, labels, subtitles |
| `--ink-faint` | `#7C877F` | `#6F7B73` | placeholders, disabled text, settled balances |
| `--rule` | `#C5D0C0` | `#2B352E` | hairline rules, control borders |
| `--rule-strong` | `#17211B` | `#E8EDE6` | section opening rule (same as ink) |
| `--green` | `#1F6F4A` | `#5DBB86` | recorded/ahead figures, success, focus ring, primary action hover |
| `--green-tint` | `#DDEBE1` | `#1C3A2B` | success highlight, counted tile left rule ground |
| `--red` | `#B3261E` | `#F28B82` | owed figures, validation, destructive confirm |
| `--red-tint` | `#F5E1DF` | `#3A1F1D` | destructive confirm panel ground, invalid field ground |
| `--on-ink` | `#F7F9F4` | `#0F1512` | text on primary button |

Contrast checks required at implementation (WCAG AA): `--ink` on `--ground` and `--paper`,
`--ink-soft` on both, `--green` and `--red` on both grounds, `--on-ink` on `--ink`. `--ink-faint` is
used only for placeholder and disabled text and for the word "settled"; it must still reach 3:1.
If any pair fails, darken the light value or lighten the dark value of the foreground token; do not
change the ground.

### 2.2 Type

One family: IBM Plex Sans, self-hosted through the pinned npm package `@fontsource/ibm-plex-sans`
(exact version), weights 400 and 600, subsets `latin` and `latin-ext` (the latter for `zł`). Import
only those four CSS files. `font-display: swap`. Fallback stack:
`"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Budget for the four
woff2 files together: 160 KB; report the actual number in the plan's Progress.

All figures use `font-variant-numeric: tabular-nums` through the `--tnum` utility class described
below; money and months are always tabular.

| Token | Size / line height | Weight | Use |
| --- | --- | --- | --- |
| `--t-figure` | 34px / 1.1 | 600 | the leading figure on the detail screen |
| `--t-title` | 27px / 1.2 | 600 | screen title, login wordmark |
| `--t-section` | 21px / 1.25 | 600 | section headings |
| `--t-entry` | 17px / 1.35 | 600 | entry primary line (participant name, amount) |
| `--t-body` | 15px / 1.5 | 400 | body, inputs, buttons |
| `--t-small` | 13px / 1.45 | 400 | labels, subtitles, hints, validation, tile reasons |

Sentence case everywhere. No letter-spacing changes. Max measure for running text 64ch.

### 2.3 Space, radius, rules

Spacing scale (px): 4, 8, 12, 16, 24, 32, 48, 64. Named `--s-1` to `--s-8` in that order.

- Radius: controls (inputs, buttons, select) 4px; month tiles and disclosure panels 6px; nothing
  larger. No pill shapes.
- Rules: hairline 1px `--rule` between entries; 2px `--rule-strong` above each section heading.
- Elevation: none. No box shadows anywhere.
- Content column: `max-width: 720px`, left aligned, page padding `--s-5` (24px) on desktop and
  `--s-4` (16px) below 640px.

### 2.4 Focus

One focus style for every focusable element: `outline: 2px solid var(--green); outline-offset:
2px;` applied on `:focus-visible`. Never removed, never animated. Inside a destructive confirmation
panel the outline colour stays green (focus is not a warning).

### 2.5 Motion

Three motions exist. Each has a reduced-motion alternative. Implement the reduction with a single
`@media (prefers-reduced-motion: reduce)` block that sets the relevant durations to `0ms`.

| Name | Property | Duration / easing | Reduced motion |
| --- | --- | --- | --- |
| disclosure | `grid-template-rows` `0fr` to `1fr` on a wrapper, content `overflow: hidden` | 180ms `cubic-bezier(0.2, 0, 0, 1)` open, 140ms same curve close | instant |
| entry highlight | `background-color` from `--green-tint` to transparent on a just-created or just-edited row | 1200ms linear, starts 200ms after the row appears | row shows `--green-tint` statically and clears together with the status line |
| status line | `opacity` 0 to 1 on appear, 1 to 0 on dismiss | 120ms in, 200ms out, both `ease-out` | instant |

No page-load animation, no hover transitions on rows, no skeleton shimmer (skeletons are static
bars). Colour changes on button hover are immediate.

## 3. Global chrome

### 3.1 Wordmark and identity

The product name is Subscription Splitter. The wordmark is the text "Subscription Splitter" at
`--t-body` weight 600 preceded by the split glyph: an inline SVG 18x18 rectangle with 3px radius,
divided by a diagonal from top-right to bottom-left; the upper-left triangle filled `--ink`, the
lower-right triangle filled `--green`; 8px gap to the text. The same glyph at 32x32 is the favicon
(`/favicon.svg`, referenced from the shell). `aria-hidden="true"` on the glyph, the text is the
accessible name.

### 3.2 App bar

Present on Home and Detail, not on Login. Height 56px, ground `--ground`, bottom hairline `--rule`.
Content aligned to the 720px column.

```
[glyph Subscription Splitter]                     owner@example.test   [Sign out]
```

- Left: the wordmark as a `button` (type button) that returns to Home. On Home it is still a button
  but carries `aria-current="page"` and does nothing.
- Right: the signed-in email at `--t-small` colour `--ink-soft`, then a quiet button "Sign out".
- Below 640px: the email is hidden (`sr-only`), the wordmark text remains, "Sign out" stays.

### 3.3 Buttons

Four variants, all native `button`, min height 40px (44px below 640px), padding `0 var(--s-4)`,
radius 4px, `--t-body` weight 600.

| Variant | Rest | Hover | Active | Disabled |
| --- | --- | --- | --- | --- |
| primary | fill `--ink`, text `--on-ink`, no border | fill `--green` | fill `--green`, translate none | fill `--ink-faint`, text `--on-ink`, `aria-disabled` |
| quiet | transparent, text `--ink`, 1px border `--rule` | border `--ink` | ground `--paper` | text `--ink-faint`, border `--rule` |
| link | transparent, text `--ink`, underline 1px `--rule` offset 3px, no border, padding 0, min height 24px | underline `--ink` | same | text `--ink-faint` |
| destructive | transparent, text `--red`, 1px border `--red` | ground `--red-tint` | same | text `--ink-faint`, border `--rule` |

Disabled buttons stay focusable (`aria-disabled="true"`, click handler returns early) so the
explanatory note next to them is reachable; the note is referenced by `aria-describedby`.

While a form submits, its primary button shows the label unchanged and `aria-busy="true"`, the whole
form gets `aria-busy="true"` and every field is disabled; no spinner.

### 3.4 Inputs

`input`, `select`, `textarea`: height 40px (44px below 640px), padding `0 var(--s-3)`, ground
`--paper`, 1px border `--rule`, radius 4px, text `--ink`, placeholder `--ink-faint`. Focus per 2.4.
Invalid: border `--red`, ground `--red-tint`, `aria-invalid="true"`. Disabled: text `--ink-faint`,
ground `--ground`.

Label above the input at `--t-small` weight 600 colour `--ink`, 4px gap. Optional hint under the
label at `--t-small` colour `--ink-soft`, associated with `aria-describedby`. Month fields keep a
text input with `inputMode="numeric"`, `pattern="\d{4}-\d{2}"`, `autoComplete="off"`, and the hint
"Month as YYYY-MM, like 2026-01". Date fields keep a text input with the hint "Date as YYYY-MM-DD".
Amount fields use `inputMode="decimal"` and the hint "Amount, like 100.00".

`select` keeps the native element with the same box styling and a custom chevron glyph on the right
(`background-image` SVG, 12px, colour `--ink-soft`); `appearance: none`.

### 3.5 Section opening

Every section on Detail opens the same way:

```
════════════════════════════════════════════════════════════  2px rule-strong
Participants (2 active)                        [Add participant]
Subtitle sentence at t-small ink-soft, when the section has one.
```

Heading `h2` at `--t-section`; the count in parentheses is part of the heading text at weight 400
colour `--ink-soft` when the section has a count. The primary action button sits on the same line,
right aligned; below 640px it wraps under the heading, left aligned, full text.

### 3.6 Ledger entry

Every list on Detail and the Home list uses the ledger entry:

```
Primary line at t-entry                                   figure column (tnum, right aligned)
secondary line at t-small ink-soft                        secondary figure at t-small
[Edit] [Delete]      (quiet, link-sized, appear in the row, not on hover)
──────────────────────────────────────────────────────────  1px rule
```

Row padding `var(--s-3) 0`. Actions always visible (no hover reveal). Below 640px the figure column
moves under the secondary line, left aligned, and actions wrap on their own line.

### 3.7 Disclosure forms

Each section's add form is closed by default. Its primary action button opens it: the button is
removed from the heading row and the form appears directly under the heading in a panel with ground
`--paper`, 1px border `--rule`, radius 6px, padding `--s-5`. The panel heading (`h3`, `--t-entry`)
repeats the action ("Add a participant"). The last row of the panel holds `[Primary action]
[Cancel]`. Cancel closes the panel, discards field values and returns focus to the heading-row
button, which reappears. On open, focus moves to the first field. Escape inside the panel acts as
Cancel unless a select is open. Open and close use the disclosure motion.

The Home "New subscription" form is a disclosure too, opened by the primary button in the Home
heading row.

Edit forms open in place of the entry they edit, inside the same panel styling, with `[Save changes]
[Cancel]`; only one edit panel per section may be open; opening another closes the first with its
values discarded. The panel's `h3` reads "Edit <thing>", for example "Edit payment".

Field layout inside a panel: a two-column grid (`repeat(2, minmax(0, 1fr))`, gap `--s-4`) for
paired short fields listed per form in section 6; every other field spans both columns. Below 640px
everything is one column.

### 3.8 Validation

One convention. A field error is one sentence under its field at `--t-small` colour `--red`, with
the field marked invalid per 3.4 and the message element referenced by `aria-describedby`. Never
prefix the message with the wire name. Map wire names to labels in the client with a display map
per form (for example `effective_from` to "Effective from", `start_month` to "First month",
`member_id` to "From", `joined_month` to "From", `left_month` to "To"); a wire name with no mapping
is shown as the generic form error below, never raw.

A generic or server error for the whole form is a line at the top of the panel at `--t-body` colour
`--red`, `role="alert"`, with the panel getting a 3px left rule `--red`. Copy states what happened
and what to do: "Could not save. Check your connection and try again." for network failure; the
server message verbatim when the API supplies one that names a rule (the 409 cases in section 6).

On a failed submit, focus moves to the first invalid field; if there is none, to the alert line.

### 3.9 Success

Every successful create, edit, delete and toggle confirms itself the same way: a status line
appears at the right end of the section heading row (below the heading on mobile) at `--t-small`
colour `--green` with a leading 12px check glyph: "Payment recorded", "Changes saved", "Payment
deleted", "Marked received", "Marked not received", "Participant archived", "Month skipped",
"Month unskipped", "Price recorded", "Standing order added". The element has `role="status"` and is
present in the DOM permanently (empty when idle) so announcements are reliable. It dismisses after
4 seconds or when another action in the same section fires. The created or edited entry gets the
entry highlight from 2.5. The disclosure panel closes on success.

Vocabulary stays constant along a flow: the button "Record this payment" produces "Payment
recorded"; "Save changes" produces "Changes saved"; "Delete" produces "<Thing> deleted".

### 3.10 Destructive confirmation

Unified across participant, price, payment and standing order deletion (participant deletion gains
the confirmation it lacks today; the API call is unchanged). The entry's action row is replaced in
place by a confirmation strip: ground `--red-tint`, 3px left rule `--red`, padding `--s-3`,
radius 4px, containing the question at `--t-body` and two buttons: `[Delete]` (destructive variant)
and `[Keep]` (quiet). Focus moves to Keep. Escape acts as Keep. Only one confirmation may be open
per section. Non-blocking: the rest of the page stays usable.

Questions, one per thing: "Delete Alice? Their payments stay recorded." (participant, only if the
API allows the deletion; the existing refusal message from the server is shown through 3.8 if it
does not), "Delete the 110,00 zł price from 2026-09?" (price), "Delete the 50,00 zł payment from
Bob?" (payment), "Delete Bob's standing order?" (schedule). Amounts come from `formatMoney`, months
from the month formatter in 3.12.

### 3.11 Empty states and refusals

An empty list is one sentence at `--t-body` colour `--ink-soft` in the list position, and nothing
else; the section's primary action button in the heading row is the call to action. Copy:

| Section | Sentence |
| --- | --- |
| Home | "No subscriptions yet. Add the first one to start tracking who pays." |
| Participants | "No participants yet." |
| Price history | "No price recorded yet, so every month currently costs nothing." |
| Skipped months | "No months skipped." |
| Payments received | "No payments recorded yet." |
| Standing orders | "No standing orders yet." |

Refusals ("Add a participant before recording a payment." and "Add a participant before adding a
standing order.") render as the disabled primary button in the heading row with the refusal
sentence at `--t-small` colour `--ink-soft` directly under the heading, referenced by the button's
`aria-describedby`. The sentence disappears and the button enables when a participant exists.

### 3.12 Money and months

- Money always comes from `formatMoney`; the client never formats a number itself. Every money
  string is wrapped in an element with the `--tnum` utility (`font-variant-numeric: tabular-nums`).
- Recorded money (payments, prices, the leading figure, collected, per person, your share) is set
  at weight 600 colour `--ink`.
- Assumed money (standing order amounts, "assumed received so far") is set at weight 400 with a
  1px dotted underline in `--ink-soft`, offset 3px, and the word "assumed" stays in the adjacent
  copy. The two never share a treatment.
- Balances: owed to the organizer is `--red`, ahead is `--green`, zero is `--ink-faint` with the
  word "settled". Never a bare minus sign; the words "owes" and "ahead" carry the sign.
- Months: a display formatter turns `YYYY-MM` into a short month name and year using the
  subscription's `locale` with `Intl.DateTimeFormat(locale, { month: "short", year: "numeric" })`
  on `new Date(Date.UTC(y, m - 1, 1))`; dates `YYYY-MM-DD` use `{ day: "numeric", month: "short",
  year: "numeric" }`. Formatting is presentation only; every value the client sends stays
  `YYYY-MM` or `YYYY-MM-DD`. Inputs and hints keep the ISO form.

## 4. Screens

### 4.1 Login

Ground `--ground`. Content block 360px wide (100% below 640px), vertically placed at 20vh from the
top, left aligned inside the block, block centred on the page.

```
[glyph] Subscription Splitter          t-title, glyph 28px
Sign in to your ledger.                t-body ink-soft

Email
[                                  ]
Password
[                                  ]
[Sign in]                              primary, full width below 640px only
```

- Field pair layout: single column. `autoComplete="username"` and `"current-password"`.
- Error state: generic error line per 3.8 above the fields ("Email or password is not right.
  Try again." for 401; connection copy for network failure), focus to the email field.
- Submitting state per 3.3.
- No link to anything else; there is no registration.

### 4.2 Session loading

Full page: app bar with the wordmark only, then in the column a single skeleton bar 240x27 at
`--paper`, and an `sr-only` `role="status"` "Loading your session".

### 4.3 Home

```
App bar
Your subscriptions (2)                        [New subscription]
[disclosure panel: New subscription form, closed by default]
Family plan                                        PLN, from Jul 2026
──────────────────────────────────────────────────
Payments walkthrough                               PLN, from Jul 2026
──────────────────────────────────────────────────
```

- Heading `h1` "Your subscriptions" at `--t-title` with the count per 3.5.
- Each subscription is a ledger entry whose whole row is one `button` (type button) that opens the
  detail; primary line the name at `--t-entry`; figure column the currency and "from <month>" at
  `--t-small` colour `--ink-soft`. Hover: ground `--paper`. Focus per 2.4.
- Empty: sentence per 3.11, no rules.
- Load error: alert line per 3.8 with a `[Try again]` quiet button.
- New subscription form fields: Name (span), Currency and Locale (pair), Time zone (span), Start
  month (span, month hint), Your name on this plan (span, hint "How you appear in the participant
  list"). Primary "Create subscription". Success: status line "Subscription created" in the Home
  heading row, then the detail screen opens.

### 4.4 Subscription detail

Structure top to bottom, one page, one column:

```
App bar
All subscriptions                                   link button, t-small
Payments walkthrough                                h1 t-title
PLN, Europe/Warsaw, from Jul 2026                   t-small ink-soft

Owed to you now                                     t-small ink-soft
0,00 zł                                             t-figure, red if > 0, ink if 0

Per person this month   Your share this month   Collected this month
55,00 zł                55,00 zł                55,00 zł of 55,00 zł     t-entry, tnum

Sep 2026 costs 110,00 zł. Your net cost since the plan started is 0,00 zł,
against a plan total of 210,00 zł. You are on this plan as Organizer.    t-body

[Participants] [Price history] [Skipped months] [Payments received] [Standing orders]   section index, sticky

════ Participants (2 active) ...
════ Price history (2) ...
════ Skipped months (1) ...
════ Payments received (2) ...
════ Standing orders (2) ...
```

- "All subscriptions" is a link-variant button above the title.
- Leading figure: label above, figure at `--t-figure`. Colour `--red` when the amount is greater
  than zero, `--ink` when zero. (Whether it is zero is read from the API amount already used to
  render the figure; no arithmetic.)
- The three cell ledger line is a `dl` with three `div` groups: `dt` at `--t-small` colour
  `--ink-soft`, `dd` at `--t-entry` weight 600 tabular. Groups sit in a row with `--s-6` gaps and a
  hairline `--rule` above and below the line. Below 640px they stack in one column with the `dt`
  and `dd` on one line, `dt` left and `dd` right.
- The summary sentence keeps its current content; bold spans are removed, the figures are tabular.
  "Active participants" is no longer a cell; the count moves into the Participants heading.
- Section index: a horizontal list of link-variant buttons (`nav aria-label="Sections"`), labelled
  exactly as the section headings without their counts, that
  scroll the matching section heading into view (`scrollIntoView({ block: "start" })`, with
  `scroll-margin-top` on headings equal to the index height plus `--s-4`). Sticky at the top of the
  viewport under the app bar (`position: sticky; top: 56px`), ground `--ground`, bottom hairline,
  height 44px. The item whose section is currently at or above the top of the viewport carries
  `aria-current="true"` and a 2px bottom rule `--ink` (an `IntersectionObserver` on headings is
  fine). Below 640px the list scrolls horizontally with `overflow-x: auto`, hidden scrollbar, 8px inline
  padding so the first and last items sit clear of the 8px fading edges made with a `mask-image`
  gradient.
- Loading (first load): the leading figure and each `dd` are static skeleton bars in `--paper`
  (figure 160x34, cells 96x21); the sentence area is one 100%x15 bar; section headings render with
  their counts blank; the `sr-only` `role="status"` reads "Loading this subscription". On reload
  after an edit, current figures stay on screen, unchanged behaviour, and the section that caused
  the reload shows its status line.
- Error: alert line per 3.8 with `[Try again]`. The 409 no-owner case shows the server's message
  and a link-variant "All subscriptions".

## 5. Sections in detail

### 5.1 Participants

Heading "Participants (N active)". Primary action "Add participant". Ledger entries:

```
Alice   not active this month                            owes 16,67 zł        t-entry, red
        Owed 33,33 zł   Paid 50,00 zł   This month 0,00 zł                   t-small ledger cells
        [Edit] [Archive] [Delete]
```

- Tags ("not active this month", "archived") follow the name at `--t-small` colour `--ink-soft`,
  separated by a space, no chips, no borders.
- The balance is the figure column: "owes X" in `--red`, "ahead X" in `--green`, "settled" in
  `--ink-faint`. Below it three labelled cells in one line at `--t-small` (label `--ink-soft`,
  figure `--ink` tabular) separated by `--s-4` gaps; they wrap on narrow widths.
- The settled-archived disclosure: a link-variant button "Show N settled archived participants"
  under the list, toggling to "Hide settled archived participants", using the disclosure motion.
- Archive is a quiet button; on success the status line reads "Participant archived" and the row
  gains the "archived" tag.
- Add form fields: Name (span). Fieldset "Active months" with legend at `--t-small` 600: each range
  is a pair From and To (hint on To: "Leave empty while still active"); "Add another range" as a
  link-variant button under the last range; a link-variant "Remove" at the end of each range beyond
  the first. Primary "Add participant". Success "Participant added".
- Edit form: same fields, primary "Save changes".

### 5.2 Price history

Heading "Price history (N)". Subtitle none. Primary action "Record a price". Entries:

```
110,00 zł a month                                        from Sep 2026
[Delete]
```

- Amount is the primary line (recorded money treatment); the effective month is the figure column
  at `--t-small` colour `--ink-soft`.
- Add form: Effective from and Amount per month (pair). Primary "Record this price". Success
  "Price recorded". The existing server 409 (a price already recorded for that month) shows the
  server message as the generic form error per 3.8 with the existing inline confirmation converted
  to the two-button pattern of 3.10 inside the panel: question from the server, `[Replace]`
  (primary) and `[Keep the existing price]` (quiet).

### 5.3 Skipped months

Heading "Skipped months (N)". Subtitle "A skipped month costs nobody anything." Primary action
"Skip a month". Entries: month name as the primary line, "costs nobody anything" removed from the
row since the subtitle says it, `[Unskip]` quiet. Success "Month skipped" / "Month unskipped". Add
form: Month (span). Primary "Mark as skipped".

### 5.4 Payments received

Heading "Payments received (N)". Subtitle "Money you saw arrive. Every amount here is recorded, not
assumed." Primary action "Record a payment"; refusal per 3.11 when there are no participants.

Filter: a labelled `select` "Show" (Everyone, then each participant) at the right end of the
subtitle line, `--t-small` label, 32px high control. Below 640px it sits under the subtitle.

Entries:

```
50,00 zł from Bob                                        10 May 2028
One-off                                                  (note, if any) at t-small ink-soft
[Edit] [Delete]
```

- Add form: From and Date received (pair), Amount and Kind (pair), Note (span, optional, hint
  "Optional"). Primary "Record this payment". Success "Payment recorded".
- Edit in place: same fields, "Save changes", success "Changes saved".
- Delete per 3.10, success "Payment deleted".

### 5.5 Standing orders

Heading "Standing orders (N)". Subtitle "Money assumed received each month, without further entry.
Nothing here is a recorded receipt." Primary action "Add a standing order"; refusal per 3.11.

Entry:

```
10,00 zł a month from Alice                              from Jul 2026, still running
0,00 zł assumed received so far, over 0 of 3 elapsed months
[Edit] [Delete]
[Jul 2026] [Aug 2026] [Sep 2026]        month tiles
```

- The amount uses the assumed-money treatment (weight 400, dotted underline). "assumed received so
  far" figure likewise. "still running" or "until <month>" is the figure column at `--t-small`.
- Month tiles: a wrapping row (`flex-wrap`, gap `--s-2`) of tiles 156px wide (100% width in a
  two-column grid below 640px), padding `--s-3`, radius 6px, ground `--paper`. Three states, each
  distinct without colour alone:

| State | Left rule | Border | Figure | Reason line | Toggle |
| --- | --- | --- | --- | --- | --- |
| counted | 3px `--green` | 1px `--rule` | "55,00 zł assumed received" assumed treatment | none | `[Mark not received]` link variant |
| excluded by rule | none | 1px dashed `--rule` | none | the exclusion phrase at `--t-small` `--ink-soft` | none |
| marked not received | 3px `--red` | 1px `--rule` | none | "marked as not received" at `--t-small` `--red` | `[Mark received]` link variant |

  The month name is the tile's first line at `--t-small` weight 600. The seven exclusion phrases
  stay one per condition; wording may be tightened by the implementer only by removing the leading
  "not counted, " since the dashed tile already says so, keeping the rest verbatim.

- Add form: From (span), Amount each month and First month (pair), Last month (span, hint "Leave
  empty while it is still running"). Primary "Record this standing order". Success "Standing order
  added". Edit: "Save changes".

## 6. Field pairs summary

Two-column pairs inside panels (everything else spans):

| Form | Pairs |
| --- | --- |
| New subscription | Currency + Locale |
| Participant | From + To (per range) |
| Price | Effective from + Amount per month |
| Skipped month | none |
| Payment | From + Date received; Amount + Kind |
| Standing order | Amount each month + First month |

## 7. Keyboard and screen reader behaviour

- Tab order follows visual order. The section index comes after the summary and before the first
  section.
- Every list is a `ul` of `li`; the Home list items each contain one button.
- Every section is a `section` with `aria-labelledby` its `h2`; ids on headings feed the index.
- Disclosure buttons carry `aria-expanded` and `aria-controls`.
- Status line per 3.9 uses `role="status"`; form errors use `role="alert"`; both are single elements
  per section that stay mounted.
- Escape: closes the open disclosure panel or confirmation strip in the focused section, returning
  focus to the control that opened it.
- Enter inside a text input submits the panel's form; inside a confirmation strip it activates the
  focused button only.
- No element uses `tabindex` greater than 0; no focus traps.
- Skeletons are `aria-hidden`.

## 8. Responsive behaviour

One breakpoint at 640px. Above it: the 720px column, two-column field pairs, ledger figure column
on the right, section index items all visible. At or below it: 16px page padding, one-column
fields, figure column under the text, actions on their own line, 44px controls, hidden email in the
app bar, horizontally scrolling section index. Nothing depends on hover. The page never scrolls
horizontally; tiles use the two-column grid.

## 9. Copy changes

Changed:

| Was | Now |
| --- | --- |
| "Subscriptions" (Home heading) | "Your subscriptions" |
| "New subscription" (heading) | button "New subscription", panel "New subscription" |
| "Back to subscriptions" | "All subscriptions" |
| "Signed in as owner@example.test" | the bare email |
| "Add a participant" (form heading) | button "Add participant", panel "Add a participant" |
| "Active participants" cell | count in the Participants heading |
| "Active months" legend | unchanged |
| "To (blank if still active)" | "To" with hint "Leave empty while still active" |
| "Effective from (YYYY-MM)" | "Effective from" with the month hint |
| "Skip a month (YYYY-MM)" | "Month" with the month hint |
| "Date received (YYYY-MM-DD)" | "Date received" with the date hint |
| "First month (YYYY-MM)" | "First month" with the month hint |
| "Last month (optional, leave empty while it is still running)" | "Last month" with the hint |
| "ahead by 16,67 zł, this month 0,00 zł, owed 33,33 zł against paid 50,00 zł" | "ahead 16,67 zł" plus three cells "Owed", "Paid", "This month" |
| "costs nobody anything" (per row) | section subtitle |
| "from 2026-07 onward" | "from Jul 2026" |
| "Mark received" / "Mark not received" | unchanged |
| "not counted, the plan was paused that month" and the other six | leading "not counted, " removed inside dashed tiles, rest verbatim |

Unchanged and load-bearing: "Payments received", "Standing orders", both section subtitles, "Owed
to you now", "Per person this month", "Your share this month", "Collected this month", the summary
sentence, "Record this payment", "Record this standing order", "Record this price", "Mark as
skipped", "Unskip", "Archive", "Sign in", "Sign out", the six empty sentences and two refusals.

## 10. Mockups

Static references in `reference/`, built from the tokens above and reviewed by the designer at
1280 and 390 widths in both themes. They show the detail screen with a panel open, a field error, a
success status line with entry highlight, a destructive confirmation and the three tile states in
one standing order. They are references for appearance, not implementation code; the mockup loads
Plex from Google Fonts for convenience, the app self-hosts it per 2.2.

- `mockup-detail.html` (source)
- `mockup-detail-light-desktop.png`, `mockup-detail-dark-desktop.png`, `mockup-detail-light-mobile.png`

Designer's notes from the review: the leading red figure and the ruled rows carry the page as
intended; the three cell line reads as one ledger line; tiles are distinguishable without colour.
Mobile stacking works with the figure column moving under the primary line.

## 11. Acceptance checklist for the designer's visual review

The implementation is compared against this document screen by screen at 1280 and 390 widths, in
light and dark themes, with reduced motion on and off:

1. Login idle, submitting, 401 error.
2. Home empty, populated, with the New subscription panel open, load error.
3. Detail loading, populated, error, 409 no-owner.
4. Each section: empty, populated, add panel open, edit panel open, field error, generic error,
   success status line with entry highlight, destructive confirmation open.
5. Standing order tiles in all three states in one entry.
6. Keyboard pass: tab through Detail, open a panel, Escape, delete with Keep, delete with Delete.
7. Section index current-item tracking while scrolling.
8. Contrast checks from 2.1 recorded with the tool used.
9. Fonts loaded from the app's own origin, total woff2 bytes recorded.

## 12. Answer index to frame.md

| Frame question | Answered in |
| --- | --- |
| 1 information architecture | 4.4 (one page, sticky section index, disclosure forms, no router) |
| 2 visual language | 1, 2 |
| 3 money display | 3.12, 4.4, 5.1 |
| 4 recorded versus assumed | 1 principle 3, 3.12, 5.4, 5.5 |
| 5 month chips | 5.5 tiles |
| 6 validation | 3.8 |
| 7 success | 3.9 |
| 8 destructive confirmation | 3.10 |
| 9 forms | 3.4, 3.7, 5.x, 6 |
| 10 empty states | 3.11 |
| 11 loading | 4.2, 4.4 |
| 12 mobile | 8 |
| 13 motion | 2.5 |
| 14 header and sign-out | 3.2 |
| 15 identity | 3.1 |
| 16 copy | 9 |
