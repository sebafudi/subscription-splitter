# Implementation plan: visual redesign

## Overview

Give the shipped app the visual language it has never had. `context/changes/visual-redesign/design-spec.md`
is the design authority: it fixes the palette in both themes, the type scale over a self-hosted IBM
Plex Sans, the spacing scale, one focus style, three motions with their reduced alternatives, and
the appearance and behaviour of every screen and every state the client can render. This plan turns
that document into six phases an implementer can land one at a time, each gated on a browser check
rather than on a test run, because no test in this repository reads the client's markup.

This is roadmap item S-06. It changes `src/client/**`, `index.html`, `public/` and one dependency.
It changes no accounting rule, no route, no ownership check and no stored value.

## Current state analysis

The client is four screens and nine components of hand-written React over one plain stylesheet.
`src/client/index.css` is 279 lines with zero custom properties, zero media queries and two colour
literals; `color-scheme: light dark` at `index.css:2` hands every other colour to the browser and
`font-family: system-ui` at `index.css:3` hands it the typeface. There is nothing to replace, so the
visual language is added rather than changed.

Navigation is one `useState` in `src/client/App.tsx:12`. There is no router and the design does not
introduce one: the detail screen stays one page and gains a sticky section index instead.

The detail screen assembles five equal summary cards and a sentence at
`SubscriptionDetail.tsx:166-195`, then renders six sections in a fixed order. `MemberForm` is
currently a sibling of `MemberList` rather than a child of the Participants section, so the
disclosure model in design-spec 3.7 requires the add and edit forms to move inside the section they
belong to. Every other section already owns its own form.

Feedback is inconsistent in exactly the way design-spec 3.8 unifies. `SubscriptionForm.tsx:82` and
`MemberForm.tsx:108` render `` `${field}: ${message}` ``, which is why a user sees `effective_from`
and `start_month`; `PaymentForm.tsx:101` and `ScheduleForm.tsx:103` place the message under its own
field. No component renders any success state.

Price deletion is the one destructive flow driven by the server rather than the client: the first
attempt is sent unconfirmed, the server answers 409 with the months that would lose their price, and
`PriceHistory.tsx:46-66` turns that refusal into an inline confirmation. Participant deletion has no
confirmation at all (`MemberList.tsx:94`) and relies on the server's 409.

The archive control is a toggle: `MemberList.tsx:88` reads `Unarchive` when the participant is
already archived.

Nothing in the test suite reads any of this. `vitest.unit.config.ts:7` includes only
`src/**/*.test.ts` and `vitest.integration.config.ts:31` only `tests/integration/**/*.test.ts`.
There is no `.test.tsx` file and no DOM testing dependency. A redesign of `src/client/**` breaks
zero tests, which is why every phase below carries a browser check as its gate.

### Key findings

- **A green suite proves nothing.** `npm test` and `npm run typecheck` pass on a client that renders
  a blank page. The automated rows in each phase guard the contract underneath the markup; the manual
  rows are the only thing that can fail on appearance.
- **`@fontsource/ibm-plex-sans` at `5.3.0`** ships `latin-400.css`, `latin-600.css`,
  `latin-ext-400.css` and `latin-ext-600.css` as the four entry points design-spec 2.2 names, each
  already declaring `font-display: swap`. The four upright woff2 files they reference total 79,268
  bytes (22,588 + 24,252 + 15,980 + 16,448), which is under half the 160 KB budget. The exact figure
  is still measured from the built output in phase 6, because Vite decides what ships.
- **The three domain calls stay.** `formatMoney` (`src/domain/money.ts:19`) is called by five client
  files, `scheduleMonthStatuses` once at `RecurringSection.tsx:104`, and the `MemberMonthInputs`
  shape is assembled at `SubscriptionDetail.tsx:152`. Design-spec 3.12 keeps money coming from
  `formatMoney`; the new month and date display formatter is `Intl.DateTimeFormat` over a `YYYY-MM`
  string and touches no amount.
- **The Participants heading count is the server's number.** Design-spec 5.1 asks for
  "Participants (N active)". The only count of active participants that is not a client derivation is
  `summary.currentActiveCount`, which the current screen already renders as a card. Every other
  heading count is an array length, which is a row count and not an accounting figure.
- **No Content Security Policy exists**, so inline SVG for the wordmark glyph and a `background-image`
  data URI for the select chevron are both available. `src/server/index.ts:27` sets no response header
  and nothing in `src/` does either.
- **The bundle baseline is 251,933 bytes of JavaScript and 3,012 bytes of CSS**, essentially all of it
  React. One font package and a larger stylesheet are visible against that; a component library would
  be. Design-spec introduces neither.

## Desired end state

Every screen the product renders carries the ledger language design-spec 1 describes: pale ledger
ground, dark ink, hairline rules between entries, tabular figures, and red ink only where money is
owed. Login, session loading, Home and the subscription detail with all five of its sections look
and behave exactly as design-spec 4 and 5 specify, in light and dark, at 1280 and at 390, with
reduced motion honoured. Every create, edit, delete and toggle confirms itself with a status line;
every field error is one sentence under its own field with no wire name in it; every destructive
action is confirmed in place without blocking the page.

The accounting is untouched and provably so: the wire field names, the routes, the three domain
calls and the recorded-versus-assumed distinction are all still in place, the client still derives
no money figure, and the whole suite still passes.

The designer accepts the result against design-spec 11 from captured evidence.

## What we are NOT doing

- **No router and no addressable screens.** Design-spec 4.4 answers frame question 1 with one page
  and a sticky section index. Splitting the detail screen would be a functional change; it is not in
  this change.
- **No component library, no icon set, no animation library, no CSS framework and no preprocessor.**
  The only dependency this plan adds is the font package. Everything else is plain CSS over custom
  properties and native elements.
- **No client-side arithmetic.** No card, badge, tile or heading computes a share, a balance, a
  counted month or an active count. Comparing a figure the API already returned against zero, to
  choose a colour, is allowed and is the only comparison design-spec 4.4 asks for.
- **No replacement of a native element by a styled div.** `button`, `select`, `input`, `textarea`,
  `fieldset` and `label` stay native, which is what keeps the keyboard behaviour that no test covers.
- **No change to any Zod schema, any route, any repository or anything under `src/domain/` or
  `src/server/`.** If a screen appears to need one, that is a checkpoint, not a change.
- **No new test.** There is no DOM testing dependency and this plan does not add one; introducing a
  client test layer is its own change. The existing unit and integration suites must keep passing
  unchanged.
- **No deployment and no refreshed certification screenshots.** Decision D-010 governs how the live
  instance holds demo data and how certification captures are refreshed. That is a release step after
  the designer accepts, not part of this plan.
- **No edits to `context/STATUS.md`, `context/foundation/goals.md` or `evidence/index.md`.** The
  status step owns those. This plan writes evidence files; it does not index them.

## Implementation approach

Bottom up, because the design is expressed as a small set of shared parts reused across every screen.
Phase 1 lays the token layer, the typeface, the base element styling and the app bar, which every
later phase renders inside. Phase 2 builds the shared presentation parts design-spec 3 describes and
proves them on the two smallest screens, Login and session loading, so that the first adoption is
small enough to inspect completely. Phase 3 takes Home, which is the first screen that exercises the
section opening, the ledger entry, the disclosure panel and the status line together. Phases 4 and 5
take the detail screen in two halves. Phase 6 is the responsive, accessibility and acceptance pass.

Each phase ends with a browser check at 1280 and at 390, in light and dark. The automated rows are
regression guards, not evidence of appearance, and the plan says so in every phase.

Copy changes from design-spec 9 land with the screen that carries them, not as a separate pass, so
that a label and its hint move together with the field they belong to.

### Stability guards

These hold at the end of every phase, not only at the end. They come from `frame.md` under
"What Must Stay Stable" and each has a check an implementer can run.

| Guard | Check |
| --- | --- |
| Wire field names unchanged | `grep -rn "member_id\|effective_from\|start_month\|end_month\|joined_month\|left_month\|active_ranges\|time_zone\|owner_name\|owner_share" src/client/api.ts` shows the same keys the schemas name |
| Routes unchanged | `git diff --stat src/server/ src/domain/ migrations/` is empty for the whole change |
| Money formatting stays in the domain | `grep -rn "NumberFormat" src/client/` returns nothing; `formatMoney` is the only producer of a money string |
| Month status stays in the domain | `scheduleMonthStatuses` is called exactly once in `src/client/` and is the only thing that decides a tile state |
| `MemberMonthInputs` assembly unchanged | the `monthInputs` object keeps its `settings` and `breakMonths` shape and is still built from the subscription and the break-month list |
| No client-side arithmetic | no component sums, divides or rounds an amount; the only numeric operation on a money value is a comparison against zero for colour |
| Native elements kept | `grep -rn 'role="button"\|role="checkbox"\|role="listbox"' src/client/` returns nothing |
| No router | `grep -n "router" package.json` returns nothing and `src/client/App.tsx` still holds one `useState` for the selection |
| Seven exclusion phrases stay distinct and total | the `Record<MonthExclusion, string>` in `RecurringSection.tsx` still has one entry per union member and no two entries share a string |
| Suite unchanged and green | `npm test` and `npm run typecheck` pass with no test file added, removed or edited |

## Critical implementation details

**The app bar and the section index share a sticky stack.** Design-spec 3.2 fixes the app bar at
`position: sticky; top: 0` above page content in stacking order, at every width, and design-spec 4.4
fixes the section index directly under it at `top: 56px`. The two offsets are one decision: the
index's is only correct while the bar holds the top 56px of the viewport. Neither may be changed
without the other.

**Two error surfaces exist per section and they do not overlap.** Design-spec 3.8 keeps an error
raised inside a disclosure panel inside that panel. Design-spec 3.5 adds a second, permanent
`role="alert"` element under the section's heading row for errors raised outside any panel: a refused
participant delete, a failed archive or unarchive, a failed unskip, a failed tile toggle and a failed
list load. Both stay mounted and empty when idle. An implementation that routes an out-of-panel
failure into the panel alert, or that mounts either on demand, is wrong on both counts.

**Focus moves in four places and nowhere else.** On opening a disclosure panel, to the first field;
on Cancel or Escape, back to the button that opened it; on a failed submit, to the first invalid
field or else to the alert line; on opening a confirmation strip, to Keep. Design-spec 7 forbids any
focus trap and any positive `tabindex`. Nothing else in the product moves focus today, and adding a
fifth movement would be a design change.

**The status line element is permanent.** Design-spec 3.9 requires the `role="status"` element to
stay mounted and be empty when idle, because a `role="status"` node inserted at the moment it gains
text is announced unreliably. The same applies to the `role="alert"` line per section.

**The disclosure motion animates `grid-template-rows`, not `height`.** Design-spec 2.5 names the
property. An implementation that animates `max-height` instead produces the wrong easing on content
of unknown height and is not what the specification asks for.

**Nothing animates on load.** Design-spec principle 5 and 2.5 both say it. The entry highlight starts
200ms after a row appears in response to an action, never on first render of a list.

## Phase 1: Tokens, typeface, base elements and the app bar

### Overview

The layer every later phase renders inside: the custom properties for both themes, self-hosted IBM
Plex Sans, the base styling for buttons, inputs and focus, the reduced-motion block, the product's
glyph and wordmark, and the app bar on the two signed-in screens.

Nothing about information architecture changes in this phase. Home and the detail screen keep their
current content and gain the app bar in place of their current headers.

### Required changes:

#### 1. The font package

**File**: `package.json`

**Purpose**: Self-host IBM Plex Sans per design-spec 2.2 rather than loading it from a third party,
which the mockup does only for convenience.

**Contract**: `@fontsource/ibm-plex-sans` as a dependency at the exact version `5.3.0`, with no range
prefix, matching the exact-pinning rule in `AGENTS.md`. The lockfile is committed with it.

#### 2. The font imports

**File**: `src/client/main.tsx`

**Purpose**: Pull in only the four faces design-spec 2.2 names, so the build ships four woff2 files
and not the family's full matrix.

**Contract**: Four CSS imports beside the existing `index.css` import:
`@fontsource/ibm-plex-sans/latin-400.css`, `latin-600.css`, `latin-ext-400.css`, `latin-ext-600.css`.
The `latin-ext` pair is what carries `zł`. No italic and no other weight is imported. Each of those
files already declares `font-display: swap`; do not override it.

#### 3. The token layer and the base stylesheet

**File**: `src/client/index.css`

**Purpose**: Replace the 279-line stylesheet with the design's foundation. This is the largest single
edit in the change and everything after it is additive.

**Contract**: Custom properties on `:root` for every token in design-spec 2.1, 2.2 and 2.3, with the
dark values redefined inside one `@media (prefers-color-scheme: dark)` block. `color-scheme: light
dark` stays on `:root` so native controls follow the theme. The font stack is
`"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.

Then: the base element rules, the four button variants of design-spec 3.3 with their rest, hover,
active and disabled states, the input, select and textarea box of 3.4 including the chevron glyph as
a `background-image` data URI with `appearance: none`, the single `:focus-visible` rule of 2.4, the
`--tnum` utility, the content column at `max-width: 720px` with its two page paddings, and one
`@media (prefers-reduced-motion: reduce)` block that sets the three motion durations to `0ms`.

No box shadow anywhere. No radius above 6px. No letter-spacing change.

#### 4. The glyph, the wordmark and the favicon

**Files**: `src/client/components/Wordmark.tsx` (new), `public/favicon.svg` (new), `index.html`

**Purpose**: Give the product the identity design-spec 3.1 specifies, which it has never had.

**Contract**: `Wordmark` renders the inline SVG glyph followed by the text "Subscription Splitter";
the glyph is `aria-hidden="true"` and the text is the accessible name. The glyph is an 18x18
rectangle with a 3px radius divided by a diagonal from top right to bottom left, upper-left triangle
`--ink` and lower-right triangle `--green`, with an 8px gap to the text. A `size` prop covers the
28px login use in design-spec 4.1. `public/favicon.svg` is the same glyph at 32x32 with literal
colours rather than custom properties, and `index.html` references it. The existing
`public/favicon.ico` stays for browsers that ask for it; the SVG link comes first.

#### 5. The app bar

**File**: `src/client/components/AppBar.tsx` (new)

**Purpose**: The persistent chrome of design-spec 3.2, which answers frame question 14. Home and the
detail screen both have ad hoc headers today and neither shows the product.

**Contract**: A 56px bar on ground `--ground` with a bottom hairline `--rule`, its content aligned to
the 720px column, sticky at `position: sticky; top: 0` and above page content in stacking order at
every width per design-spec 3.2. Left: the wordmark as a native `button` of type button that returns to Home,
carrying `aria-current="page"` and doing nothing when already on Home. Right: the signed-in email at
`--t-small` colour `--ink-soft`, then a quiet "Sign out" button. Below 640px the email becomes
`sr-only` and the other two stay. The component takes the email, an `onHome` handler that may be
absent, and an `onSignOut` handler.

#### 6. Adopting the app bar

**Files**: `src/client/screens/Home.tsx`, `src/client/screens/SubscriptionDetail.tsx`

**Purpose**: Put the app bar on both signed-in screens and retire the two headers it replaces.

**Contract**: Home's `home-header` block with "Signed in as" and its bare Sign out button is replaced
by `AppBar`; the detail screen's header keeps the "All subscriptions" link-variant button above the
title per design-spec 4.4 and loses its own sign-out affordance to the bar. Both keep every other
element and every handler they have. The sign-out call and the `onSignedOut` flow are unchanged.

### Success criteria:

#### Automated verification:

- Typecheck passes across all three projects: `npm run typecheck`
- The whole suite passes with no test file changed: `npm test`
- The production build succeeds: `npm run build`
- `@fontsource/ibm-plex-sans` is pinned to `5.3.0` with no range prefix in `package.json`
- The built output contains four woff2 files and no other font file, and their total byte count is
  recorded in `evidence/runs/visual-redesign-bundle.txt` against the 160 KB budget from design-spec 2.2
- `grep -rn "NumberFormat" src/client/` returns nothing
- `git diff --stat src/server/ src/domain/ migrations/` is empty

#### Manual verification:

- At 1280 in light and again in dark, Home and the detail screen show the app bar with the glyph
  wordmark, the email and Sign out, aligned to the 720px column, on `--ground` with a bottom hairline;
  a pass means the bar's colours come from the tokens in design-spec 2.1 and not from the browser
- Tabbing through the app bar gives every control the 2px `--green` outline at 2px offset from
  design-spec 2.4, and no control anywhere on either screen has lost its focus ring
- The browser tab shows the split glyph favicon
- Text renders in IBM Plex Sans, confirmed in the browser's network panel as four woff2 requests to
  the app's own origin and no request to any third party
- With reduced motion enabled and again disabled, nothing animates on page load on either screen
- At 390 the email is visually hidden while the wordmark and Sign out remain, and every control in the
  bar is at least 44px high
- The app bar stays at the top of the viewport while the page scrolls, at 1280 and at 390, with page
  content passing under it rather than over it

**Implementation note**: The automated rows above cannot fail on appearance. Stop here for human
confirmation that the manual rows passed before starting phase 2.

---

## Phase 2: The shared presentation layer, proven on Login and session loading

### Overview

Every part design-spec 3 describes, built once and adopted first on the two screens small enough to
inspect completely. Login exercises the button variants, the input box, the validation convention and
the submitting state; session loading exercises the skeleton and the status role. The parts that
Login does not exercise are still built here, because phases 3 to 5 all consume them, and they are
inspected at their first use: the heading-row flex group and the section alert in phase 3, the
confirmation strip in phase 4.

This phase deviates from a pure bottom-up build in one way, deliberately: it adopts the layer rather
than only defining it, so that the phase has a browser check that can fail. A phase that adds only
unused components would gate on nothing.

### Required changes:

#### 1. The month and date display formatter

**File**: `src/client/format.ts` (new)

**Purpose**: Turn `YYYY-MM` into a short month name and year and `YYYY-MM-DD` into a short date, per
design-spec 3.12, which answers the "from 2026-07 onward" to "from Jul 2026" copy change in 9.

**Contract**: Two functions taking the value and the subscription's `locale`. Months use
`Intl.DateTimeFormat(locale, { month: "short", year: "numeric" })` over
`new Date(Date.UTC(y, m - 1, 1))`; dates use `{ day: "numeric", month: "short", year: "numeric" }`
over the same UTC construction. This is presentation only: every value the client sends stays in its
ISO form, and every input and hint keeps the ISO form. Neither function touches an amount.

#### 2. The section opening and the status line

**Files**: `src/client/components/ui/SectionHeader.tsx` (new),
`src/client/components/ui/StatusLine.tsx` (new)

**Purpose**: Design-spec 3.5 and 3.9. Every section on the detail screen and the Home heading open
the same way and confirm themselves the same way.

**Contract**: `SectionHeader` renders the 2px `--rule-strong` rule, an `h2` at `--t-section` whose
optional count is part of the heading text at weight 400 colour `--ink-soft`, and an optional subtitle
sentence. The right end of the heading row is one flex group with gap `--s-4` holding the status line
first and the primary action button second, per design-spec 3.5. While the section's disclosure panel
is open the button is absent and the status line stands alone. Below 640px the heading takes the first
line, the status line the second and only when it has text, and the button the third, left aligned and
full text. It takes the heading id so the section's `aria-labelledby` and the section index can both
point at it.

`StatusLine` is one permanently mounted element per section with `role="status"`, empty when idle,
rendering the 12px check glyph and the sentence at `--t-small` colour `--green` when set, clearing
itself after 4 seconds or when the section fires another action. It uses the status-line motion from
design-spec 2.5.

#### 3. The section alert

**File**: `src/client/components/ui/SectionAlert.tsx` (new)

**Purpose**: Design-spec 3.5. Errors raised outside any disclosure panel have no home in design-spec
3.8, which places a generic error at the top of a panel. This is that home, and it is what makes a
refused participant delete, a failed archive, a failed unskip and a failed tile toggle visible.

**Contract**: One permanently mounted `role="alert"` element per section, empty when idle, rendered
directly under the heading row and under the subtitle where there is one. With text it renders at
`--t-body` colour `--red` on ground `--red-tint` with a 3px left rule `--red`, padding `--s-3` and
radius 4px, ending in a link-variant "Dismiss" button. It carries the server's message verbatim when
the API supplies one that names a rule, and otherwise "Could not save. Check your connection and try
again." It clears on Dismiss and on the next successful action in the same section. It never carries
an error raised inside a panel, which stays in that panel's own alert per design-spec 3.8.

#### 4. The ledger entry

**File**: `src/client/components/ui/LedgerEntry.tsx` (new)

**Purpose**: Design-spec 3.6, the one row shape used by the Home list and every detail section.

**Contract**: Slots for the primary line at `--t-entry`, a secondary line at `--t-small` colour
`--ink-soft`, a figure column that is tabular and right aligned above 640px and moves under the
secondary line left aligned below it, and an actions row of link-variant buttons at `--t-small`
separated by `--s-3`, always visible and never revealed on hover, per design-spec 3.6. A 1px `--rule`
hairline closes the row; padding is `var(--s-3) 0`. A variant renders the whole
row as one native button for the Home list per design-spec 4.3, and that variant carries no action
slot, so no button is ever nested inside another.

#### 5. The disclosure panel

**File**: `src/client/components/ui/DisclosurePanel.tsx` (new)

**Purpose**: Design-spec 3.7, which answers frame question 9 and is how every form on every screen is
opened from here on.

**Contract**: A wrapper whose open and close use the disclosure motion of design-spec 2.5, animating
`grid-template-rows` from `0fr` to `1fr` with the content set to `overflow: hidden`, 180ms opening
and 140ms closing on `cubic-bezier(0.2, 0, 0, 1)`, reduced to instant under the reduced-motion block
from phase 1. The panel is ground `--paper`, 1px `--rule`, radius 6px, padding `--s-5`, with an `h3`
at `--t-entry` naming the action. The opening button carries `aria-expanded` and `aria-controls`. On
open, focus moves to the first field; Cancel and Escape both close the panel, discard the field
values and return focus to the opening button, which reappears. Escape does not close the panel while
a native select is open. Field layout inside the panel is a two-column grid at
`repeat(2, minmax(0, 1fr))` with gap `--s-4`, collapsing to one column below 640px; which fields pair
is per form in design-spec 6.

#### 6. The field, its hint and its error

**Files**: `src/client/components/ui/Field.tsx` (new),
`src/client/components/ui/fieldLabels.ts` (new)

**Purpose**: Design-spec 3.4 and 3.8. This is where the two coexisting validation conventions become
one and where the raw wire names stop reaching users.

**Contract**: `Field` renders the label above the input at `--t-small` weight 600 with a 4px gap, an
optional hint under the label at `--t-small` colour `--ink-soft`, the control, and an optional error
sentence under the control at `--t-small` colour `--red`. The hint and the error are both referenced
through `aria-describedby`; an invalid field carries `aria-invalid="true"` and takes the red border
and `--red-tint` ground of design-spec 3.4. The message is never prefixed with the wire name.

`fieldLabels.ts` exports one display map per form, from wire name to label, covering at minimum
`effective_from` to "Effective from", `start_month` to "First month", `member_id` to "From",
`joined_month` to "From" and `left_month` to "To". A wire name with no entry in the form's map is not
rendered against a field: it becomes the form's generic error line instead, never shown raw.

#### 7. The generic error line

**File**: `src/client/components/ui/FormAlert.tsx` (new)

**Purpose**: The whole-form half of design-spec 3.8.

**Contract**: One permanently mounted `role="alert"` element per panel, empty when idle, rendered at
the top of the panel at `--t-body` colour `--red`, with the panel taking a 3px left rule `--red`
while it has text. Network failure reads "Could not save. Check your connection and try again."; a
server message that names a rule is shown verbatim. On a failed submit focus moves to the first
invalid field, or to this line when there is none.

#### 8. The destructive confirmation strip

**File**: `src/client/components/ui/ConfirmStrip.tsx` (new)

**Purpose**: Design-spec 3.10, which answers frame question 8 and unifies four flows that are
currently three different shapes plus one absence.

**Contract**: Replaces an entry's action row in place with a strip on `--red-tint`, 3px left rule
`--red`, padding `--s-3`, radius 4px, holding the question at `--t-body` and two buttons, `[Delete]`
in the destructive variant and `[Keep]` in the quiet variant. Focus moves to Keep on open and Escape
acts as Keep. The rest of the page stays usable; nothing blocks. Only one strip may be open per
section. The focus ring inside the strip stays green per design-spec 2.4.

#### 9. The money treatments

**File**: `src/client/components/ui/Money.tsx` (new)

**Purpose**: Design-spec 3.12, which answers frame questions 3 and 4 and carries the
recorded-versus-assumed distinction the accounting depends on.

**Contract**: Three presentations over a string that `formatMoney` produced, wrapped in the `--tnum`
utility: recorded at weight 600 colour `--ink`; assumed at weight 400 with a 1px dotted `--ink-soft`
underline at 3px offset; and a balance that is `--red` for owed, `--green` for ahead and `--ink-faint`
with the word "settled" for zero, with the words "owes" and "ahead" carrying the sign and never a bare
minus. The component formats nothing itself and takes no minor-unit number: it takes the formatted
string and the caller's choice of treatment, so `formatMoney` stays the only producer of a money
string.

#### 10. Login and session loading

**Files**: `src/client/screens/Login.tsx`, `src/client/App.tsx`, `src/client/index.css`

**Purpose**: Design-spec 4.1 and 4.2, and the first adoption of everything above.

**Contract**: Login is a 360px block placed at 20vh from the top and centred on the page, left aligned
inside itself, full width below 640px. It carries the wordmark at `--t-title` with the 28px glyph, the
subtitle "Sign in to your ledger." at `--t-body` colour `--ink-soft`, the two fields in one column
with their existing `autoComplete` values, and a primary "Sign in" that is full width only below
640px. A 401 renders as the generic error line above the fields reading "Email or password is not
right. Try again." with focus moving to the email field; a network failure uses the connection copy.
The submitting state is design-spec 3.3: the label is unchanged, the form and the button carry
`aria-busy="true"`, every field is disabled and there is no spinner, which replaces the current
"Signing in…" label swap.

Session loading in `App.tsx` becomes the app bar with the wordmark only, then one static 240x27
skeleton bar on `--paper` in the column, with an `sr-only` `role="status"` reading "Loading your
session". The skeleton is `aria-hidden`.

### Success criteria:

#### Automated verification:

- Typecheck passes across all three projects: `npm run typecheck`
- The whole suite passes with no test file changed: `npm test`
- The production build succeeds: `npm run build`
- `grep -rn '${field}' src/client/` returns nothing, so no wire name can reach a rendered string
- `grep -rn "DateTimeFormat" src/client/` finds it only in `src/client/format.ts`
- `grep -rn "NumberFormat" src/client/` still returns nothing

#### Manual verification:

- Login at 1280 in light and again in dark matches design-spec 4.1: a 360px block at 20vh, the glyph
  wordmark at `--t-title`, the subtitle, two labelled fields and the primary button; a pass means the
  block's position, width and every colour come from the tokens
- A refused sign-in shows "Email or password is not right. Try again." as the generic error line above
  the fields, the panel takes the 3px red left rule, and focus lands on the email field
- Submitting keeps the button label unchanged, disables both fields, sets `aria-busy` on the form and
  shows no spinner
- Session loading shows the app bar with the wordmark only and one static skeleton bar, and a screen
  reader announces "Loading your session" while the skeleton itself is not announced
- At 390 the Login block fills the width, the primary button is full width and every control is at
  least 44px high
- Keyboard: tab order is email, password, Sign in, each with the green focus ring, and nothing traps
  focus

**Implementation note**: Stop here for human confirmation that the manual rows passed before starting
phase 3.

---

## Phase 3: Home

### Overview

The first screen that uses the section opening, the ledger entry, the disclosure panel and the status
line together. Design-spec 4.3 turns the current list plus always-visible create form into a heading
with a count, a disclosed form and ledger rows.

### Required changes:

#### 1. The subscription list

**File**: `src/client/screens/Home.tsx`

**Purpose**: Design-spec 4.3 and the copy changes in 9 that belong to this screen.

**Contract**: An `h1` "Your subscriptions" at `--t-title` carrying the list length as its count, above
a `ul` of `li` each holding one `LedgerEntry` in its whole-row button variant: the name as the primary
line at `--t-entry`, and the currency with "from <month>" through the phase 2 month formatter as the
figure column at `--t-small` colour `--ink-soft`. Hover gives the row ground `--paper`. The empty
state is the single sentence "No subscriptions yet. Add the first one to start tracking who pays."
with no rules, and the heading's "New subscription" button is the call to action. A load failure
renders in the permanent section alert of design-spec 3.5, directly under the heading row, carrying
the quiet "Try again" button that design-spec 4.3 specifies in place of the alert's Dismiss; that is
the only reading that satisfies both sections, which agree on the message and differ only on the
button. The "Signed in as" header is already
gone; this screen's only chrome is the app bar from phase 1.

#### 2. The new subscription form

**File**: `src/client/screens/SubscriptionForm.tsx`

**Purpose**: Design-spec 4.3 and 3.7. This is one of the two forms that currently shows raw wire names
to users.

**Contract**: The form becomes the content of a disclosure panel opened by the "New subscription"
button in the heading row, headed "New subscription". Fields in design-spec 4.3 order: Name spanning
both columns, Currency and Locale as the pair from design-spec 6, Time zone spanning, Start month
spanning with the hint "Month as YYYY-MM, like 2026-01", and "Your name on this plan" spanning with
the hint "How you appear in the participant list". The last row is `[Create subscription] [Cancel]`.
Field errors go through the phase 2 `Field` and this form's display map, so `start_month` and
`time_zone` are never rendered raw. On success the panel closes, the status line in the heading row
reads "Subscription created", the new row takes the entry highlight, and the detail screen opens as it
does today. While the panel is open the "New subscription" button is absent from the heading row and
the status line stands alone in the flex group, per design-spec 3.5.

The payload keys the form submits are unchanged: `name`, `currency`, `locale`, `time_zone`,
`start_month`, `owner_name`.

#### 3. Home layout rules

**File**: `src/client/index.css`

**Purpose**: The rules the two files above need, added to the foundation rather than replacing it.

**Contract**: The heading row, the list, the whole-row button hover and the below-640px wrap of the
heading action. No new token and no new radius.

### Success criteria:

#### Automated verification:

- Typecheck passes across all three projects: `npm run typecheck`
- The whole suite passes with no test file changed: `npm test`
- The production build succeeds: `npm run build`
- The create payload still sends `name`, `currency`, `locale`, `time_zone`, `start_month` and
  `owner_name`, confirmed against `src/client/api.ts` and the schema in `src/server/validation/`
- The list is a `ul` of `li` each containing exactly one native `button`, and
  `grep -rn 'role="button"' src/client/` returns nothing

#### Manual verification:

- Home populated at 1280 in light and again in dark: the heading reads "Your subscriptions (2)", each
  row shows the name at `--t-entry` with the currency and "from Jul 2026" in the figure column, and a
  hairline closes each row; a pass means the month reads as a short name and year rather than `2026-07`
- Home empty shows only the design-spec 3.11 sentence with no rules, and "New subscription" is the
  only call to action
- "New subscription" opens the panel under the heading with the disclosure motion, the button leaves
  the heading row, and focus moves to the Name field
- Escape and Cancel both close the panel, discard the typed values and return focus to the button,
  which reappears
- Currency and Locale sit side by side above 640px and stack below it, and every other field spans
- Creating a subscription closes the panel, shows "Subscription created" in the heading row, highlights
  the new row for the duration in design-spec 2.5, and opens the detail screen
- A refused create shows one sentence under the offending field with that field marked invalid, with
  the label from the display map and never a wire name, and focus moves to that field
- A load failure shows the section alert under the heading row with a quiet "Try again" button that
  retries
- After a create, the right end of the heading row shows the status line first and the "New
  subscription" button second; while the panel is open the button is absent and the status line stands
  alone
- At 390 the "New subscription" button wraps under the heading, left aligned with its full text, the
  heading, status line and button occupy three lines in that order, and the page does not scroll
  horizontally

**Implementation note**: Stop here for human confirmation that the manual rows passed before starting
phase 4.

---

## Phase 4: The detail summary, the section index, Participants and Price history

### Overview

The top of the detail screen and the first two of its five sections. This phase replaces the five
equal summary cards with the leading figure and the three cell ledger line, adds the sticky section
index that answers frame question 1, and moves the participant form inside the section it belongs to.

### Required changes:

#### 1. The summary

**File**: `src/client/screens/SubscriptionDetail.tsx`

**Purpose**: Design-spec 4.4. Five cards of equal weight become one figure that leads and one ledger
line of three cells, which is principle 1 of design-spec 1.

**Contract**: Above the sections: the "All subscriptions" link-variant button, the `h1` at
`--t-title`, and the currency, time zone and start month at `--t-small` colour `--ink-soft`. Then the
label "Owed to you now" at `--t-small` above the figure at `--t-figure`, coloured `--red` when
`summary.owedToYouNow` is greater than zero and `--ink` when it is zero. That comparison is the only
numeric operation on the value; nothing is computed.

Then a `dl` of three `div` groups for "Per person this month", "Your share this month" and "Collected
this month", with `dt` at `--t-small` colour `--ink-soft` and `dd` at `--t-entry` weight 600 tabular,
in a row with `--s-6` gaps and a hairline `--rule` above and below. Below 640px they stack with the
`dt` left and the `dd` right on one line. "Collected this month" keeps its "X of Y" form.

The summary sentence keeps its current content with its bold spans removed and its figures tabular.
The "Active participants" card is gone; its number moves into the Participants heading and comes from
`summary.currentActiveCount`, not from anything the screen counts.

Loading on first load, per design-spec 4.4: the figure and each `dd` are static skeleton bars on
`--paper` at 160x34 and 96x21, the sentence area is one 100%x15 bar, section headings render with
their counts blank and their subtitles present, each section's primary action button renders in its
disabled state, and each list position shows two skeleton entries, each a 45% by 17 bar over a 30% by
13 bar on `--paper` with the hairline below. An `sr-only` `role="status"` reads "Loading this
subscription". Every skeleton is `aria-hidden`. A reload
after an edit keeps the current figures on screen, which is the existing behaviour at
`SubscriptionDetail.tsx:53` and does not change; the section that caused the reload shows its status
line instead.

The error state and the 409 no-owner state use the generic alert line, with a quiet "Try again" for
the first and a link-variant "All subscriptions" for the second. The no-owner state cannot be produced
locally through the product, so its appearance is checked against
`evidence/screenshots/detail-no-owner-state.png` and the code path rather than a fresh capture.

#### 2. The section index

**File**: `src/client/components/ui/SectionIndex.tsx` (new)

**Purpose**: Design-spec 4.4. The detail screen is one column roughly 4200px tall at 390 with the
section a reviewer most wants at the bottom. This is the in-page navigation that answers frame
question 1 without a router.

**Contract**: A `nav` with `aria-label="Sections"` holding a horizontal list of link-variant buttons
labelled exactly as the five section headings without their counts. Each scrolls its section heading
into view with `scrollIntoView({ block: "start" })`, and every heading carries a `scroll-margin-top`
equal to the index height plus `--s-4`. The nav is sticky at `top: 56px`, directly under the app bar
that design-spec 3.2 fixes at `top: 0`, on ground `--ground` with a bottom hairline, 44px high. The item whose section is at or above the top of the viewport
carries `aria-current="true"` and a 2px `--ink` bottom rule; an `IntersectionObserver` over the
headings is the intended mechanism. Below 640px the list scrolls horizontally with `overflow-x: auto`,
a hidden scrollbar, 8px inline padding and 8px fading edges made with a `mask-image` gradient. In tab
order it comes after the summary and before the first section.

#### 3. Participants

**Files**: `src/client/components/MemberList.tsx`, `src/client/components/MemberForm.tsx`,
`src/client/screens/SubscriptionDetail.tsx`

**Purpose**: Design-spec 5.1. This is the section whose form currently sits outside it, and the one
whose delete has no confirmation today.

**Contract**: The section opens per design-spec 3.5 with the heading "Participants (N active)" where N
is `summary.currentActiveCount`, and a primary "Add participant". `MemberForm` moves inside this
section: as the add disclosure panel headed "Add a participant" when adding, and in place of the entry
being edited, headed "Edit <name>", when editing. Only one edit panel may be open; opening another
closes the first and discards its values. The `editing` state that `SubscriptionDetail.tsx` holds today
moves into the section with it, so the detail screen stops threading it.

Each participant is a ledger entry: the name as the primary line with the "archived" and "not active
this month" tags following it at `--t-small` colour `--ink-soft` with no chips and no borders; the
balance as the figure column through the phase 2 money treatment, "owes X" in `--red`, "ahead X" in
`--green` and "settled" in `--ink-faint`; and under it three labelled cells "Owed", "Paid" and "This
month" in one line at `--t-small` with the label `--ink-soft` and the figure `--ink` tabular,
separated by `--s-4` gaps and wrapping on narrow widths. Actions are `[Edit] [Archive] [Delete]` as link-variant buttons at `--t-small`, always visible.
Archive is a toggle per design-spec 5.1: it reads "Archive" on an active participant and "Unarchive"
on an archived one, producing "Participant archived" with the tag added and "Participant unarchived"
with the tag removed.

The form's fields are Name spanning, then a `fieldset` "Active months" whose legend is at `--t-small`
weight 600, each range a From and To pair with the hint "Leave empty while still active" on To, "Add
another range" as a link-variant button under the last range, and a link-variant "Remove" at the end of
each range beyond the first. The payload still sends `active_ranges` with `joined_month` and
`left_month`. Primary "Add participant" produces "Participant added" and "Save changes" produces "Changes saved".

Deletion uses the confirmation strip with "Delete <name>? Their payments stay recorded." The API call
is unchanged, including the server's 409 for a participant with history; that refusal lands in the
section alert of design-spec 3.5 with the server's message verbatim, and the strip closes. A failed
archive or unarchive lands there too.

The settled-archived toggle becomes a link-variant button under the list reading "Show N settled
archived participants" and "Hide settled archived participants", using the disclosure motion.

#### 4. Price history

**File**: `src/client/components/PriceHistory.tsx`

**Purpose**: Design-spec 5.2.

**Contract**: Heading "Price history (N)" with no subtitle and a primary "Record a price". Each entry
is a ledger entry whose primary line is the amount in the recorded money treatment followed by "a
month", with the effective month through the month formatter as the figure column at `--t-small`
colour `--ink-soft`, and `[Delete]`. The add panel pairs "Effective from" and "Amount per month" per
design-spec 6, with the month hint and the amount hint from design-spec 3.4, and a primary "Record
this price" producing "Price recorded".

The server 409 for a price already recorded in that month renders as the generic error line inside the
panel with the server's message, and the existing inline confirmation becomes the two-button pattern
inside the panel: the server's question with `[Replace]` as the primary variant and `[Keep the existing
price]` as the quiet variant.

Deletion runs design-spec 5.2's two steps inside one confirmation strip. Step one asks "Delete the
<amount> price from <month>?" with `[Delete]` and `[Keep]`. Delete sends the request exactly as today.
If the server answers 409 with the months that would lose their price, the strip stays open, its text
becomes the server's message verbatim followed by "Delete anyway?", the buttons become `[Delete
anyway]` in the destructive variant and `[Keep]`, and focus returns to Keep. "Delete anyway" sends the
confirmed request that `PriceHistory.tsx:46-66` sends today. Any other failure goes to the section
alert and the strip closes. The two requests and their parameters are unchanged.

#### 5. Detail layout rules

**File**: `src/client/index.css`

**Purpose**: The rules the four changes above need.

**Contract**: The summary block, the three cell ledger line and its stacking below 640px, the sticky
index with its current-item rule and its mobile scroller with the mask, the participant entry's three
cells, and the tag treatment. No new token.

### Success criteria:

#### Automated verification:

- Typecheck passes across all three projects: `npm run typecheck`
- The whole suite passes with no test file changed: `npm test`
- The production build succeeds: `npm run build`
- The Participants heading count reads `summary.currentActiveCount`, and
  `grep -n "activeRanges" src/client/components/MemberList.tsx` returns nothing, so no active count is
  derived in the client
- Every money string on the detail screen comes from `formatMoney`, and `grep -rn "NumberFormat"
  src/client/` still returns nothing
- The member, range and price payload keys are unchanged: `active_ranges`, `joined_month`,
  `left_month`, `effective_from`
- No router was added: `grep -n "router" package.json` returns nothing and `src/client/App.tsx` still
  holds the selection in one `useState`

#### Manual verification:

- The detail screen at 1280 in light and again in dark: the leading figure is the largest text on the
  page, red when the amount is above zero and ink when it is zero, above the three cell ledger line
  with a hairline above and below it; a pass means no card remains anywhere
- The summary sentence carries its current content with no bold spans and with tabular figures
- The app bar stays at the top and the section index sticks directly under it while scrolling with no
  gap between them, the item for the section at the top of the viewport carries `aria-current` and the
  2px bottom rule, and clicking an item scrolls that heading clear of both rather than under them
- Participant entries show the name with its tags, the balance in the figure column coloured per
  design-spec 3.12 with "owes", "ahead" and "settled" carrying the sign in words, and the three
  labelled cells below
- "Add participant" opens the disclosure with the "Active months" fieldset, From and To side by side,
  and both "Add another range" and "Remove" as link-variant buttons
- Editing a participant opens the panel in place of that entry; opening a second edit closes the first
  and discards its values
- Deleting a participant opens the confirmation strip with focus on Keep, Escape acts as Keep, and the
  rest of the page stays usable while it is open; a participant the server refuses puts the server's
  message in the section alert and closes the strip
- Price history entries show the amount as the primary line in the recorded treatment and the
  effective month as a short month and year in the figure column
- The settled-archived toggle opens and closes with the disclosure motion and its label counts
  correctly in both directions
- First load shows the static skeleton bars for the figure and the cells, every section's subtitle
  present with its count blank and its action button disabled, and two skeleton entries in each list
  position; it announces "Loading this subscription" and announces no skeleton
- A reload after an edit keeps the figures on screen and shows the acting section's status line instead
- The Archive action reads "Archive" on an active participant and "Unarchive" on an archived one, and
  the two success sentences are "Participant archived" and "Participant unarchived" with the tag
  following
- Deleting a price that the server refuses keeps one strip open across both steps, showing the server's
  months verbatim with "Delete anyway?" and focus back on Keep, and "Delete anyway" completes it
- The section alert clears on Dismiss and again on the next successful action in the same section, and
  an error raised inside a panel never appears in it
- At 390 the figure column moves under the secondary line, the actions take their own line, the three
  cells wrap, and the section index scrolls horizontally with its fading edges and no page-level
  horizontal scroll

**Implementation note**: Stop here for human confirmation that the manual rows passed before starting
phase 5.

---

## Phase 5: Skipped months, Payments received and Standing orders

### Overview

The remaining three sections, including the one that carries the recorded-versus-assumed distinction
the accounting depends on and the three tile states that replace the month chips.

### Required changes:

#### 1. Skipped months

**File**: `src/client/components/BreakMonths.tsx`

**Purpose**: Design-spec 5.3.

**Contract**: Heading "Skipped months (N)" with the subtitle "A skipped month costs nobody anything."
and a primary "Skip a month". Each entry's primary line is the month through the month formatter, with
"costs nobody anything" removed from the row because the subtitle now carries it, and a link-variant
`[Unskip]` at `--t-small`. The add panel has one field "Month" spanning, with the month hint, and a primary "Mark as
skipped". Success reads "Month skipped" and "Month unskipped". A failed unskip lands in the section
alert of design-spec 3.5, not in a panel. The empty sentence is "No months skipped."

#### 2. Payments received

**Files**: `src/client/components/PaymentList.tsx`, `src/client/components/PaymentForm.tsx`

**Purpose**: Design-spec 5.4. This is the recorded half of the ledger and its subtitle is load bearing.

**Contract**: Heading "Payments received (N)" with the subtitle "Money you saw arrive. Every amount
here is recorded, not assumed." unchanged, and a primary "Record a payment". With no participants the
button is disabled but still focusable per design-spec 3.3, with "Add a participant before recording a
payment." at `--t-small` colour `--ink-soft` under the heading and referenced by the button's
`aria-describedby`; both disappear when a participant exists.

The "Show" filter is a labelled native `select` listing Everyone and then each participant, at the
right end of the subtitle line above 640px and under the subtitle below it, with a 32px control and a
`--t-small` label. It keeps going to the server as it does today; nothing is filtered in the component.

Each payment is a ledger entry: the amount in the recorded treatment followed by "from <name>" as the
primary line, the note as the secondary line when there is one, the date through the date formatter as
the figure column, and `[Edit] [Delete]` as link-variant buttons at `--t-small`. The add panel pairs "From" with "Date received" and "Amount"
with "Kind", with "Note" spanning and hinted "Optional", and a primary "Record this payment" producing
"Payment recorded". Editing opens in place with "Save changes" producing "Changes saved". Deleting
uses the confirmation strip with "Delete the <amount> payment from <name>?" and produces "Payment
deleted".

The payload keys are unchanged: `member_id`, `date`, `amount`, `note`, `kind`.

#### 3. Standing orders

**Files**: `src/client/components/RecurringSection.tsx`, `src/client/components/ScheduleForm.tsx`

**Purpose**: Design-spec 5.5, which answers frame question 5 and is where assumed money must never
read as recorded money.

**Contract**: Heading "Standing orders (N)" with the subtitle "Money assumed received each month,
without further entry. Nothing here is a recorded receipt." unchanged, a primary "Add a standing
order", and the same refusal treatment as payments when there are no participants.

Each entry's primary line is the monthly amount in the assumed money treatment followed by "a month
from <name>", with "from <month>, still running" or "until <month>" as the figure column at
`--t-small`, and a secondary line reading the assumed total, also in the assumed treatment, with "over
N of M elapsed months". Actions are `[Edit] [Delete]` as link-variant buttons at `--t-small`.

Under each entry, a wrapping row of month tiles with `flex-wrap` and gap `--s-2`, each 156px wide,
padding `--s-3`, radius 6px, ground `--paper`, falling into a two-column grid at full width below
640px. The month name is the tile's first line at `--t-small` weight 600. The three states are
exactly design-spec 5.5: counted takes a 3px `--green` left rule, a 1px `--rule` border, the assumed
amount and a `[Mark not received]` link-variant button; excluded by rule takes no left rule, a 1px
dashed `--rule` border, no figure, the exclusion phrase at `--t-small` colour `--ink-soft` and no
toggle; marked not received takes a 3px `--red` left rule, a 1px `--rule` border, no figure, "marked
as not received" at `--t-small` colour `--red` and a `[Mark received]` link-variant button. Each state
is distinguishable with colour removed.

Which state a tile is in comes from the single existing call to `scheduleMonthStatuses` at
`RecurringSection.tsx:104` and from nothing else. The seven exclusion phrases in
`RecurringSection.tsx:42-50` stay one per `MonthExclusion` and the map stays total over the union; the
only permitted edit is removing the leading "not counted, " from each, because the dashed tile already
says it. The rest of each phrase stays verbatim.

A failed tile toggle lands in the section alert of design-spec 3.5 with the server's message verbatim
and leaves the tile in the state it was in.

The add panel has "From" spanning, "Amount each month" paired with "First month", and "Last month"
spanning with the hint "Leave empty while it is still running". The primary "Record this standing
order" produces "Standing order added"; editing produces "Changes saved"; the toggles produce "Marked
not received" and "Marked received". Deleting uses the confirmation strip with "Delete <name>'s
standing order?"

The payload keys are unchanged: `member_id`, `amount`, `start_month`, `end_month`.

#### 4. Section layout rules

**File**: `src/client/index.css`

**Purpose**: The rules the three sections above need.

**Contract**: The tile row, the three tile states, the filter's placement on the subtitle line and its
wrap below 640px, and the refusal sentence. No new token.

### Success criteria:

#### Automated verification:

- Typecheck passes across all three projects: `npm run typecheck`
- The whole suite passes with no test file changed: `npm test`
- The production build succeeds: `npm run build`
- `scheduleMonthStatuses` is called exactly once in `src/client/` and no component applies an
  exclusion condition itself
- The exclusion map is still a `Record<MonthExclusion, string>` with one entry per union member and no
  two entries sharing a string; the compiler proves totality and a read proves distinctness
- The payment and schedule payload keys are unchanged: `member_id`, `date`, `amount`, `note`, `kind`,
  `start_month`, `end_month`
- The payments filter still reaches the server and nothing is filtered in the component

#### Manual verification:

- Skipped months at 1280 in light and again in dark: the subtitle carries "A skipped month costs
  nobody anything.", each row shows the month as a short name and year with a quiet Unskip, and the
  two success sentences appear in the heading row
- Payments received keeps its subtitle verbatim, the Show filter sits at the right end of the subtitle
  line, and each entry shows the amount in the recorded treatment with the date in the figure column
- Recording a payment closes the panel, highlights the new row and shows "Payment recorded"; editing
  one opens in place and shows "Changes saved"; deleting one opens the confirmation strip and then
  shows "Payment deleted"
- With no participants, both refusals render as a disabled but still focusable primary button with the
  refusal sentence under the heading, reachable through `aria-describedby`, and both clear when a
  participant is added
- Standing orders: the monthly amount and the assumed total both carry the dotted underline of the
  assumed treatment and neither is ever set in the recorded treatment, so the two are distinguishable
  side by side with a payment
- One standing order shows all three tile states at once, and with the page rendered in greyscale each
  state is still identifiable from its rule, its border and its words
- The seven exclusion phrases still read one per condition, with only the leading "not counted, "
  removed, and no two tiles in any state share a phrase
- Marking a month not received and then received again changes only that month, shows "Marked not
  received" and "Marked received", and leaves the assumed total matching what the summary reports
- A failed unskip and a failed tile toggle each put the server's message in their own section alert,
  leave the row or tile unchanged, and clear on Dismiss
- At 390 the tiles fall into the two-column grid, the filter sits under the subtitle, and the page does
  not scroll horizontally

**Implementation note**: Stop here for human confirmation that the manual rows passed before starting
phase 6.

---

## Phase 6: The responsive, accessibility and acceptance pass

### Overview

Nothing new is designed here. Every screen and every state is walked at both widths, in both themes,
with reduced motion on and off, the contrast pairs are measured, the bundle is measured, and the
evidence the designer needs for the review in design-spec 11 is captured.

Fixes found in this phase are corrections to what earlier phases landed, in `src/client/index.css` and
in the component that owns the defect. A fix that would change an appearance the specification fixes
is a checkpoint under "Design questions", not a fix.

### Required changes:

#### 1. Responsive and accessibility corrections

**Files**: `src/client/index.css` and whichever component carries a defect

**Purpose**: Close whatever the full pass finds.

**Contract**: Corrections only. The one breakpoint stays at 640px per design-spec 8; no second
breakpoint is introduced. Every control at or below 640px is at least 44px high. Nothing depends on
hover. No page scrolls horizontally at 390 in any state.

#### 2. The contrast record

**File**: `evidence/runs/visual-redesign-contrast.md` (new)

**Purpose**: Design-spec 2.1 requires the contrast checks to be run and design-spec 11 item 8 requires
the tool to be named.

**Contract**: Every pair design-spec 2.1 lists, in both themes, with its measured ratio, the WCAG AA
threshold it is held to, and the tool used. `--ink-faint` is held to 3:1 because it carries only
placeholder text, disabled text and the word "settled". A failing pair is fixed by darkening the light
foreground or lightening the dark foreground, never by changing a ground, and the changed token value
is recorded beside the original.

#### 3. The bundle record

**File**: `evidence/runs/visual-redesign-bundle.txt` (new, extended from phase 1)

**Purpose**: Frame risk "bundle growth" and design-spec 11 item 9.

**Contract**: The built `dist/client/assets/` JavaScript and CSS byte counts against the 251,933 and
3,012 byte baseline from `research.md`, and the total byte count of the woff2 files the build ships
against the 160 KB budget from design-spec 2.2, with the exact `@fontsource/ibm-plex-sans` version
beside it.

#### 4. The evidence captures

**Files**: `evidence/screenshots/redesign-*.png` (new)

**Purpose**: The designer reviews the implementation against design-spec 11 from captures, not from a
running session.

**Contract**: The capture set below, named so the review can be assembled by pattern, taken against
`npm run dev` on a local database holding synthetic data only, at 1280 CSS pixels and at 390 CSS
pixels with a 2x device pixel ratio, following the naming convention the existing sets in
`evidence/screenshots/` use. Light and dark are separate files where the state is theme sensitive.

| File | State, per design-spec 11 |
| --- | --- |
| `redesign-01-login-idle.png` | 11.1 login idle |
| `redesign-02-login-submitting.png` | 11.1 login submitting |
| `redesign-03-login-error.png` | 11.1 login 401 |
| `redesign-04-home-empty.png` | 11.2 home empty |
| `redesign-05-home-populated.png` | 11.2 home populated |
| `redesign-06-home-panel-open.png` | 11.2 home with the New subscription panel open |
| `redesign-07-home-load-error.png` | 11.2 home load error |
| `redesign-08-detail-loading.png` | 11.3 detail first load with skeletons |
| `redesign-09-detail-populated.png` | 11.3 detail populated, full column |
| `redesign-10-detail-error.png` | 11.3 detail error |
| `redesign-11-detail-no-owner.png` | 11.3 the 409 no-owner state |
| `redesign-12-section-states.png` | 11.4 one section in each of its eight states |
| `redesign-13-tiles-three-states.png` | 11.5 one standing order showing all three tile states |
| `redesign-14-section-index-current.png` | 11.7 the index with the current item marked mid-scroll |
| `redesign-15-dark-desktop.png` | the detail screen in dark at 1280 |
| `redesign-16-light-mobile.png` | the detail screen in light at 390 |
| `redesign-17-dark-mobile.png` | the detail screen in dark at 390 |
| `redesign-18-reduced-motion.png` | a disclosure and an entry highlight with reduced motion on |
| `redesign-19-section-alert.png` | 11.4 a section alert carrying a refused participant delete |
| `redesign-20-price-delete-step-two.png` | 11.4 the price delete strip on its second step with the server's months |

The keyboard pass of design-spec 11.6 is recorded as prose in
`evidence/runs/visual-redesign-keyboard.md` rather than as an image, naming each step and what
happened. The 409 no-owner state cannot be produced locally through the product, per `research.md`, so
`redesign-11` is taken by driving the state directly in the client during a dev session and the note
records that it was not produced through the API.

#### 5. The designer handoff

**File**: `context/changes/visual-redesign/plan.md` (this file, the Design questions section)

**Purpose**: Hand the designer a review that is complete against design-spec 11 and record the result.

**Contract**: The implementer states that all twenty captures, the contrast record, the bundle record
and the keyboard record exist and are readable, then requests the designer's review against design-spec
11. The designer's findings are recorded under "Design questions" as checkpoints, each naming the
specification section it concerns. The implementer changes no appearance in response to a finding until
the designer has answered it.

### Success criteria:

#### Automated verification:

- Typecheck passes across all three projects: `npm run typecheck`
- The whole suite passes with no test file changed: `npm test`
- The production build succeeds: `npm run build`
- `package.json` dependencies differ from the baseline by `@fontsource/ibm-plex-sans` and nothing else
- Every row of the Stability guards table above is re-checked in one pass and the result recorded in
  `evidence/runs/visual-redesign-guards.txt`
- The bundle and font byte counts are recorded in `evidence/runs/visual-redesign-bundle.txt` against
  the baseline and the budget
- `git diff --stat src/server/ src/domain/ migrations/ tests/` is empty for the whole change

#### Manual verification:

- All twenty captures listed above exist, show the state they name, and contain no real credential,
  token or session cookie
- The keyboard pass of design-spec 11.6 is walked and recorded: tab through the detail screen, open a
  panel, Escape it, delete with Keep, delete with Delete
- The section index current-item tracking of design-spec 11.7 is walked while scrolling the whole
  detail column in both directions
- The contrast record covers every pair in design-spec 2.1 in both themes, names the tool, and every
  pair reaches AA with `--ink-faint` at 3:1
- Reduced motion on and off are compared for all three motions of design-spec 2.5: the disclosure is
  instant, the entry highlight is static and clears with the status line, and the status line appears
  and dismisses instantly
- No screen or state scrolls horizontally at 390, and every control at that width is at least 44px high
- The designer has reviewed the captures against design-spec 11 and either accepted the implementation
  or recorded findings under "Design questions"

**Implementation note**: This phase closes only when the designer accepts. Findings recorded under
"Design questions" are answered by the designer and then implemented; they are not resolved by the
implementer.

---

## Design questions

Design-spec 1 states that implementers "resolve mechanical code choices inside it and return any
missing, inconsistent or infeasible detail to the designer as a checkpoint; they do not improvise
appearance, hierarchy, copy, interaction or motion."

**Protocol.** When a specification detail is missing, inconsistent or infeasible, the implementer:

1. Adds a numbered entry under this heading naming the design-spec section, what is missing or
   contradictory, and which phase item it blocks.
2. Stops that item and leaves the existing behaviour and appearance in place for it.
3. Continues every other item in the phase.
4. Does not choose an appearance, a hierarchy, a wording, an interaction or a motion to fill the gap,
   and does not treat the mockup as an answer where the specification is silent, because design-spec 10
   says the mockups are references for appearance and not implementation.
5. Records the designer's answer against the entry when it arrives, then implements it.

A mechanical code choice is not a design question. Which React hook holds a panel's open state, whether
the section index uses an `IntersectionObserver` or a scroll handler, and how the display maps are
typed are all the implementer's to make.

Six questions were raised while writing this plan. All six were answered by the designer and folded
into the specification, which records them in design-spec 12. None is open, and the phase items above
implement the answers rather than the questions.

| Question | Resolved in | What the phases implement |
| --- | --- | --- |
| D1 where a section-level action error renders | design-spec 3.5 | One permanent `role="alert"` per section under the heading row, with Dismiss; built in phase 2, used in phases 3, 4 and 5 |
| D2 the price delete and the server's 409 | design-spec 5.2 | One strip, two steps; the second carries the server's months and "Delete anyway", in phase 4 |
| D3 the unarchive control | design-spec 5.1 | The Archive row action toggles to "Unarchive" with "Participant unarchived", in phase 4 |
| D4 whether the app bar is sticky | design-spec 3.2 | The bar is sticky at `top: 0` at every width and the index sits at `top: 56px`, in phases 1 and 4 |
| D5 the button and the status line in the heading row | design-spec 3.5 | One flex group, status line first and button second, three stacked lines below 640px, in phases 2, 3, 4 and 5 |
| D6 section bodies on first load | design-spec 4.4 | Subtitles present, counts blank, action buttons disabled, two skeleton entries per list, in phase 4 |

Nothing further is open. Questions found during implementation are added below under the protocol
above.

## Testing strategy

There is no test to write. This change adds no DOM testing dependency, edits no existing test and
changes nothing any existing test covers. The suites are regression guards here, not evidence.

### Unit tests

Unchanged. `src/domain/` and `src/server/validation/` are untouched, so every existing unit test must
pass with no edit. A phase that needs a unit test changed has left the client.

### Integration tests

Unchanged. `tests/integration/` drives the Hono app over HTTP and asserts JSON. Every one must pass
with no edit. A failing integration test means a wire field name or a route moved, which the stability
guards forbid.

### Manual browser steps

The real gate, per phase, in a real browser against `npm run dev` on a local database holding synthetic
data only. Every phase's manual rows above are walked at 1280 and at 390 CSS pixels, in light and in
dark, and phase 6 repeats the whole set with reduced motion on and off. A pass is what the phase's row
states, not "it looks fine".

Two states cannot be produced through the product on a local database and are checked against the code
path and the existing captures instead: the detail screen's 409 no-owner state, per `research.md`, and
a participant delete that the server refuses, which needs a participant with payments or a standing
order and is therefore set up through the product's own routes before the check.

## Performance considerations

One font package is added and the stylesheet grows. The baseline from `research.md` is 251,933 bytes of
JavaScript and 3,012 bytes of CSS, and there is no recorded budget and no CI size check, so the numbers
are recorded rather than enforced. The four woff2 files of `@fontsource/ibm-plex-sans@5.3.0` that
design-spec 2.2 names total 79,268 bytes in the package, against the specification's 160 KB budget; the
shipped total is measured from the build in phase 6 because Vite decides what is emitted.
`font-display: swap` is what the package already declares and is what design-spec 2.2 asks for.

The section index uses an `IntersectionObserver` over five headings rather than a scroll handler, so
scrolling the roughly 4200px detail column costs nothing per frame.

No motion runs on load, so the first paint is unaffected by design-spec 2.5.

## Migration notes

None. No migration, no schema change, no stored value and no secret. The change is client-only and its
release is the existing manual `npm run deploy`, which is a separate step after the designer accepts
and is not part of this plan. Decision D-010 governs how the live instance's demo data exists and how
certification screenshots are refreshed; both belong to that release step.

## References

- Design authority: `context/changes/visual-redesign/design-spec.md`
- Mockups: `context/changes/visual-redesign/reference/mockup-detail.html` and the three PNGs beside it
- Frame: `context/changes/visual-redesign/frame.md`, in particular "What Must Stay Stable" and "Risks"
- Research: `context/changes/visual-redesign/research.md`
- Current interface captures: `context/changes/visual-redesign/reference/current-*.png`
- Prior evidence for the two states that cannot be produced locally:
  `evidence/screenshots/detail-no-owner-state.png`, `evidence/screenshots/detail-error-state.png`
- Format reference for this plan: `context/archive/payments-and-recurring/plan.md`
- Decisions this change must not disturb: `context/decisions/D-006`, `D-007`, `D-008`, `D-009`, `D-010`
- Repository rules: `AGENTS.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Tokens, typeface, base elements and the app bar

#### Automated

- [ ] 1.1 Typecheck passes across all three projects
- [ ] 1.2 The whole suite passes with no test file changed
- [ ] 1.3 The production build succeeds
- [ ] 1.4 @fontsource/ibm-plex-sans is pinned to 5.3.0 with no range prefix
- [ ] 1.5 Four woff2 files ship and their total byte count is recorded against the 160 KB budget
- [ ] 1.6 No NumberFormat appears anywhere under src/client
- [ ] 1.7 Nothing under src/server, src/domain or migrations has changed

#### Manual

- [ ] 1.8 The app bar renders per design-spec 3.2 on Home and Detail at 1280 in light and dark
- [ ] 1.9 Every control keeps the focus ring of design-spec 2.4
- [ ] 1.10 The browser tab shows the split glyph favicon
- [ ] 1.11 Four woff2 requests go to the app's own origin and none to a third party
- [ ] 1.12 Nothing animates on load with reduced motion on and with it off
- [ ] 1.13 At 390 the email is visually hidden and every bar control is at least 44px high
- [ ] 1.14 The app bar stays at the top of the viewport while the page scrolls at 1280 and at 390

### Phase 2: The shared presentation layer, proven on Login and session loading

#### Automated

- [ ] 2.1 Typecheck passes across all three projects
- [ ] 2.2 The whole suite passes with no test file changed
- [ ] 2.3 The production build succeeds
- [ ] 2.4 No wire name reaches a rendered string anywhere under src/client
- [ ] 2.5 DateTimeFormat appears only in src/client/format.ts
- [ ] 2.6 No NumberFormat appears anywhere under src/client

#### Manual

- [ ] 2.7 Login matches design-spec 4.1 at 1280 in light and in dark
- [ ] 2.8 A refused sign-in shows the generic error line and focus moves to the email field
- [ ] 2.9 Submitting keeps the label, disables the fields, sets aria-busy and shows no spinner
- [ ] 2.10 Session loading shows the wordmark-only bar, a static skeleton and the status announcement
- [ ] 2.11 At 390 the Login block fills the width with a full-width button and 44px controls
- [ ] 2.12 Tab order is email, password, Sign in, each with the green focus ring and no trap

### Phase 3: Home

#### Automated

- [ ] 3.1 Typecheck passes across all three projects
- [ ] 3.2 The whole suite passes with no test file changed
- [ ] 3.3 The production build succeeds
- [ ] 3.4 The create payload still sends name, currency, locale, time_zone, start_month and owner_name
- [ ] 3.5 The list is a ul of li each holding exactly one native button and no role="button" exists

#### Manual

- [ ] 3.6 Home populated matches design-spec 4.3 at 1280 in light and in dark
- [ ] 3.7 Home empty shows only the design-spec 3.11 sentence with no rules
- [ ] 3.8 New subscription opens the disclosure under the heading with focus on the Name field
- [ ] 3.9 Escape and Cancel close the panel, discard values and return focus to the button
- [ ] 3.10 Currency and Locale pair above 640px and stack below it while other fields span
- [ ] 3.11 A create closes the panel, shows "Subscription created", highlights the row and opens Detail
- [ ] 3.12 A refused create shows one sentence under its own field with the mapped label and moves focus
- [ ] 3.13 A load failure shows the section alert under the heading row with a quiet Try again
- [ ] 3.14 At 390 the New subscription button wraps under the heading with no horizontal scroll
- [ ] 3.15 The heading row shows the status line first and the button second, and no button while the panel is open

### Phase 4: The detail summary, the section index, Participants and Price history

#### Automated

- [ ] 4.1 Typecheck passes across all three projects
- [ ] 4.2 The whole suite passes with no test file changed
- [ ] 4.3 The production build succeeds
- [ ] 4.4 The Participants count reads summary.currentActiveCount and no active count is derived in the client
- [ ] 4.5 Every money string on Detail comes from formatMoney and no NumberFormat exists
- [ ] 4.6 The member, range and price payload keys are unchanged
- [ ] 4.7 No router was added and App.tsx still holds the selection in one useState

#### Manual

- [ ] 4.8 The leading figure and the three cell ledger line match design-spec 4.4 at 1280 in light and dark
- [ ] 4.9 The summary sentence keeps its content with no bold spans and tabular figures
- [ ] 4.10 The index sticks directly under the sticky app bar, tracks the current section and scrolls headings clear of both
- [ ] 4.11 Participant entries show the tags, the coloured balance and the three labelled cells
- [ ] 4.12 Add participant opens with the Active months fieldset and its link-variant range controls
- [ ] 4.13 Editing opens in place and opening a second edit closes the first and discards its values
- [ ] 4.14 Deleting a participant opens the strip with focus on Keep, and a refusal goes to the section alert
- [ ] 4.15 Price history entries show the recorded amount and the short effective month
- [ ] 4.16 The settled-archived toggle opens and closes with the disclosure motion and counts correctly
- [ ] 4.17 First load shows the figure and cell skeletons, present subtitles, disabled buttons and two skeleton entries per list
- [ ] 4.18 A reload after an edit keeps the figures on screen and shows the acting section's status line
- [ ] 4.19 Archive reads Archive or Unarchive by state and produces its matching success sentence
- [ ] 4.20 A refused price delete keeps one strip open across both steps with the server's months and Delete anyway
- [ ] 4.21 The section alert clears on Dismiss and on the next success, and never carries a panel error
- [ ] 4.22 At 390 the figure column moves under the text, actions wrap and the index scrolls horizontally

### Phase 5: Skipped months, Payments received and Standing orders

#### Automated

- [ ] 5.1 Typecheck passes across all three projects
- [ ] 5.2 The whole suite passes with no test file changed
- [ ] 5.3 The production build succeeds
- [ ] 5.4 scheduleMonthStatuses is called exactly once in src/client and decides every tile state
- [ ] 5.5 The exclusion map is still total over MonthExclusion with no two entries sharing a string
- [ ] 5.6 The payment and schedule payload keys are unchanged
- [ ] 5.7 The payments filter still reaches the server and nothing is filtered in the component

#### Manual

- [ ] 5.8 Skipped months matches design-spec 5.3 at 1280 in light and in dark
- [ ] 5.9 Payments received keeps its subtitle, places the Show filter and shows recorded amounts
- [ ] 5.10 Recording, editing and deleting a payment each confirm with their own status sentence
- [ ] 5.11 Both no-participant refusals render as a focusable disabled button with its describedby sentence
- [ ] 5.12 Standing order amounts carry the assumed treatment and never the recorded one
- [ ] 5.13 One standing order shows all three tile states, each identifiable in greyscale
- [ ] 5.14 The seven exclusion phrases still read one per condition with only the leading phrase removed
- [ ] 5.15 Toggling one month changes only that month and leaves the assumed total matching the summary
- [ ] 5.16 A failed unskip and a failed tile toggle each render in their own section alert and clear on Dismiss
- [ ] 5.17 At 390 the tiles use the two-column grid and the page does not scroll horizontally

### Phase 6: The responsive, accessibility and acceptance pass

#### Automated

- [ ] 6.1 Typecheck passes across all three projects
- [ ] 6.2 The whole suite passes with no test file changed
- [ ] 6.3 The production build succeeds
- [ ] 6.4 package.json dependencies differ from the baseline by the font package and nothing else
- [ ] 6.5 Every Stability guards row is re-checked in one pass and recorded
- [ ] 6.6 The bundle and font byte counts are recorded against the baseline and the budget
- [ ] 6.7 Nothing under src/server, src/domain, migrations or tests has changed across the whole change

#### Manual

- [ ] 6.8 All twenty captures exist, show the state they name and contain no credential or cookie
- [ ] 6.9 The keyboard pass of design-spec 11.6 is walked and recorded
- [ ] 6.10 The section index current-item tracking of design-spec 11.7 is walked in both directions
- [ ] 6.11 The contrast record covers every design-spec 2.1 pair in both themes and names the tool
- [ ] 6.12 Reduced motion on and off are compared for all three motions of design-spec 2.5
- [ ] 6.13 No screen or state scrolls horizontally at 390 and every control there is at least 44px high
- [ ] 6.14 The designer has reviewed the captures against design-spec 11 and accepted or recorded findings
