# Design inputs: compact member calendar

A briefing for the designer, who does not read source. It states what exists and recommends nothing.

## 1. Design tokens that already exist

One stylesheet, no framework. Tokens are CSS custom properties on `:root`, with a second palette
under `prefers-color-scheme: dark`. `color-scheme: light dark` is set, so native controls follow the
system.

**Colour** - thirteen tokens, light / dark:

`--ground` `#eef2ea` / `#0f1512` · `--paper` `#f7f9f4` / `#161e19` · `--ink` `#17211b` / `#e8ede6` ·
`--ink-soft` `#4a5750` / `#a7b3ab` · `--ink-faint` `#7c877f` / `#6f7b73` · `--rule` `#c5d0c0` /
`#2b352e` · `--border` `#7c877f` / `#6f7b73` · `--rule-strong` `#17211b` / `#e8ede6` · `--green`
`#1f6f4a` / `#5dbb86` · `--green-tint` `#ddebe1` / `#1c3a2b` · `--red` `#b3261e` / `#f28b82` ·
`--red-tint` `#f5e1df` / `#3a1f1d` · `--on-ink` `#f7f9f4` / `#0f1512`. A `--chevron` inline SVG
supplies the select glyph.

**Type** - `--font-sans` is `'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', Roboto,
sans-serif`. Six scales, each split into size, leading and weight, exposed as utility classes:
`.t-figure` 34px/1.1/600 · `.t-title` 27px/1.2/600 · `.t-section` 21px/1.25/600 · `.t-entry`
17px/1.35/600 · `.t-body` 15px/1.5/400 · `.t-small` 13px/1.45/400. Helpers: `.soft` (colour
`--ink-soft`), `.faint` (`--ink-faint`), `.tnum` (tabular numerals), `.sr-only`. No letter-spacing is
set anywhere. Sentence case throughout. Running text is capped at 64ch.

**Space** - `--s-1` 4px, `--s-2` 8px, `--s-3` 12px, `--s-4` 16px, `--s-5` 24px, `--s-6` 32px,
`--s-7` 48px, `--s-8` 64px.

**Radius and elevation** - no radius tokens; radii are literal, 4px and 6px only. Zero `box-shadow`
declarations exist in the stylesheet. Elevation is carried by rules and borders alone.

**Layout** - `--bar-height` 56px, `--index-height` 44px, `--sticky-stack` their sum, `--scroll-offset`
that plus `--s-4`. Content column is `max-width: 720px`, centred, padding `--s-5` desktop and `--s-4`
below 640px.

**Motion** - four durations, all set to `0ms` under `prefers-reduced-motion: reduce`:
`--motion-disclosure-open` 180ms, `--motion-disclosure-close` 140ms, `--motion-highlight` 1200ms,
`--motion-status-in` 120ms, `--motion-status-out` 200ms. One easing, `--motion-disclosure-ease`
`cubic-bezier(0.2, 0, 0, 1)`. Only three things move: a disclosure opening, a just-changed row's
green tint fading, and the status sentence. No page-load animation, no hover transitions on rows, no
skeleton shimmer. Button hover colour changes are instant.

**Focus** - one rule for the whole app, never removed and never animated:
`outline: 2px solid var(--green); outline-offset: 2px` on `:focus-visible`. There is no separate
focus token and no destructive-context variant.

## 2. Reusable components, one line each

- **Section opening** - a 2px rule, an `h2` with an optional `(count)`, an optional subtitle, and a
  right-hand group holding a status line then a primary action. Below 640px the three stack.
- **Ledger entry** - the one row shape everywhere: a primary line at `.t-entry`, an optional
  secondary line at small/soft, a right-aligned figure column, an always-visible row of link buttons,
  closed by a 1px `--rule` hairline. Below 640px it becomes one column and the figure left-aligns.
- **Entry cells** - a wrapping row of small soft label/value pairs under an entry, used today for
  Owed / Paid / This month.
- **Ledger line** - a wrapping row of term/value pairs between two hairlines, terms at small/soft,
  values at `.t-entry` weight 600.
- **Tile** - a 156px bordered box, `--paper` ground, 6px radius, used today for a standing order's
  months. Three states: counted takes a 3px `--green` left rule, not-received a 3px `--red` left
  rule, excluded a dashed border. Below 640px tiles become a two-column grid at auto width.
- **Disclosure panel** - a form that opens by animating `grid-template-rows` 0fr to 1fr, focuses its
  first control, closes on Escape or Cancel, and is inert while closed. Red left rule when its alert
  has text.
- **Confirm strip** - replaces a row's action row in place: `--red-tint` ground, 3px `--red` left
  rule, a question, an optional consequence sentence, a destructive button and a Keep button. Focus
  lands on **Keep**. It blocks nothing else on the page.
- **Status line** - a green tick glyph plus a short sentence at the right end of a section heading,
  living four seconds, in a permanent `role="status"` region.
- **Section alert** - a sentence plus a Dismiss button in a permanent `role="alert"` region. It
  carries the server's own words verbatim.
- **Buttons** - `.btn-primary` (ink fill, green on hover), `.btn-quiet` (outlined), `.btn-link`
  (underlined text, 24px minimum), `.btn-destructive`. A disabled action is styled through
  `aria-disabled` and stays focusable; it is never truly `disabled`.
- **Field** - label above the control, hint and error below it, two-column panel grid that collapses
  to one column below 640px.
- **Money treatments** - recorded money is `--ink` weight 600; assumed money is weight 400 with a
  1px dotted `--ink-soft` underline at 3px offset. Balance is a word plus a figure: "owes X" in red,
  "ahead X" in green, "settled" in `--ink-faint`. A balance never shows a bare minus.
- **Section index** - a sticky 44px nav bar of link buttons under the app bar, marking the current
  section with a 2px ink underline. Below 640px it scrolls horizontally behind a fade mask.
- **Skeletons** - static bars in `--paper` at fixed sizes, no shimmer, not announced.

## 3. Record shapes and example formatted values

Amounts are integers in minor units, always formatted through one function; months are `YYYY-MM` and
dates `YYYY-MM-DD`, both formatted in the plan's own locale. Examples use `en-GB` / `GBP`; a `pl-PL`
/ `PLN` plan renders the same data as `wrz 2026` and `123,45 zł`.

- **Participant** - name ("Alice"), owner flag, archived flag, and one or more active ranges, each a
  from-month and an optional to-month (`Jan 2019` to `Mar 2021`, or open-ended).
- **Participant summary** - name, archived, active-this-month, this month's share (`£12.50`),
  lifetime owed (`£1,204.00`), lifetime paid (`£1,150.00`), balance (`owes £54.00`).
- **Payment** - a participant, a date (`3 Aug 2026`), an amount (`£25.00`), an optional free-text
  note, and a kind, one of exactly two: **One-off** or **Yearly lump sum**. There is no tag field.
- **Standing order** - a participant, a monthly amount (`£10.00`), a first month, an optional last
  month ("from Jan 2020, still running" or "until Dec 2023"), and the months the organizer marked as
  not received.
- **Price entry** - an amount (`£40.00`) and a first month it applies from.
- **Skipped month** - a single month.
- **Plan header** - name, currency, time zone, and the month it started.

## 4. Current screen structure, top to bottom

App bar (56px, wordmark, email, Home, Sign out), back link, plan name as `h1`, a small soft line
reading currency, time zone and start month, Edit and Delete subscription, the headline figure "Owed
to you now" at 34px, a four-cell ledger line (per person this month, your share this month, collected
of expected, active participants), one summary sentence, the sticky section index, then five sections
in fixed order: **Participants**, **Price history**, **Skipped months**, **Payments received**,
**Standing orders**. Every section has the same opening and its own add form. The column measures
roughly 4200px at 390 wide with a modest ledger, and grows with every payment and every elapsed month
of every standing order.

## 5. Breakpoints

One, `max-width: 640px`. There is no `min-width` query anywhere. Below it: page padding drops to
16px, buttons reach a 44px minimum (link buttons stay 24px), inputs and selects reach 44px, entries
and panels collapse to one column, the ledger line stacks, the section index scrolls horizontally,
tiles become two per row, and the app bar hides the email.

## 6. The states a month cell must distinguish

Seven exclusion reasons exist, with these canonical names and these existing English phrases:

| Name | Existing phrase | Meaning |
| --- | --- | --- |
| `before-start-month` | "that month is before the plan started" | outside the plan's window |
| `not-yet-elapsed` | "that month has not arrived yet" | after the current month |
| `owner-member` | "the owner is never paid from" | the account holder's own row |
| `outside-active-range` | "the participant was not on the plan that month" | no membership range covers it |
| `break-month` | "the plan was paused that month" | an organizer-declared skipped month |
| `unpriced` | "that month had no price" | no price entry has taken effect |
| `excepted` | "marked as not received" | the organizer marked this standing-order month unpaid |

They are checked in that order, widest first, and a cell names the **outermost** condition that
fails. `excepted` is applied last, so a month already excluded by a break or a membership gap is
never relabelled as the organizer's own mark.

Beyond those seven, a cell carries: **recorded receipts** (possibly several in one month, possibly
two on one day, each with its own amount, date, kind and note), **an assumed recurring receipt** (one
per schedule, shown in the pencil treatment and never added to a recorded one), **the month's
charge**, and **a completeness flag** independent of the figures. That last one matters because zero
is ambiguous: a month with no price recorded and a month that costs nothing are the same number and
different facts, and neither may read as settled.
