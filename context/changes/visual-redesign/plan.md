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

Feedback is inconsistent in exactly the way design-spec 3.8 unifies. Four forms render
`` `${error.field}: ${error.message}` `` and so show a raw wire name to the user:
`SubscriptionForm.tsx:82`, `MemberForm.tsx:108`, `PriceHistory.tsx:130` and `BreakMonths.tsx:73`.
Two place the message under its own field instead, `PaymentForm.tsx:101` and `ScheduleForm.tsx:103`.
The four leaking forms are converted across three phases: the subscription form in phase 3, the
participant form and the price form in phase 4, the skipped-month form in phase 5, so the gate that
proves no wire name is left belongs to phase 5. No component renders any success state.

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
- **`@fontsource/ibm-plex-sans` at `5.3.0` must not be imported through its CSS entry points.** Each
  of `latin-400.css`, `latin-600.css`, `latin-ext-400.css` and `latin-ext-600.css` declares a
  two-format `src`, woff2 followed by a woff fallback, and Vite emits every `url()` it finds in
  imported CSS. Importing the four would ship eight files: 79,268 bytes of woff2 plus 75,112 bytes of
  woff, 154,380 bytes in total against design-spec 2.2's 160 KB budget, about 4 percent of headroom
  for 75 KB no browser in scope needs. The package's `exports` map publishes `./files/*.woff2`
  explicitly, so phase 1 declares the four `@font-face` blocks in `src/client/index.css` by hand and
  ships exactly the four woff2 files at 79,268 bytes (22,588 + 24,252 + 15,980 + 16,448). The per
  subset CSS files carry no `unicode-range`; only the package's aggregate `index.css` does, so the two
  latin and two latin-ext ranges are copied from there, otherwise the latin-ext faces load on every
  page rather than only where `zł` appears. The shipped total is still measured from the build,
  because Vite decides what is emitted.
- **The three domain calls stay.** `formatMoney` (`src/domain/money.ts:19`) is called by five client
  files, `scheduleMonthStatuses` once at `RecurringSection.tsx:104`, and the `MemberMonthInputs`
  shape is assembled at `SubscriptionDetail.tsx:152`. Design-spec 3.12 keeps money coming from
  `formatMoney`; the new month and date display formatter is `Intl.DateTimeFormat` over a `YYYY-MM`
  string and touches no amount.
- **The Participants heading carries no count, and "Active participants" stays a cell.**
  `summary.currentActiveCount` is `activeMembersInMonth(state, current).length` (`src/domain/calc.ts:108`)
  over `state.members` with no owner exclusion (`src/domain/members.ts:14-16`), so it counts the
  organizer. `summary.members`, the array `MemberList` renders, is built from `nonOwnerMembers`
  (`src/domain/calc.ts:88-103`), so the organizer is never a row. The two can never agree, which is why
  design-spec 4.4 keeps the figure as the fourth cell of the ledger line, labelled as today, and
  design-spec 5.1 gives the Participants heading no count at all. Every heading count that does appear
  is the number of rows that list is rendering, which is presentation and not an accounting figure.
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
- **No new client-side derivation of money.** No component starts deriving a share, a balance, an
  owed amount or an active count. The boundary is about new arithmetic, not about all arithmetic, and
  the specification's opening paragraph says so: six pieces of shipped client code do compute, and all
  of them are preserved verbatim. They are: the assumed total and the elapsed-month counts at `RecurringSection.tsx:111-112`,
  the major-to-minor conversions at `PriceHistory.tsx:16`, `PaymentForm.tsx:24` and
  `ScheduleForm.tsx:21`, and the inverse that fills an edit field at `PaymentForm.tsx:28` and
  `ScheduleForm.tsx:25`. Reading a wire amount as zero or not zero, whether for a colour (design-spec
  4.4) or for the "settled" wording and the settled-archived filter (`MemberList.tsx:29-30`,
  design-spec 3.12 and 5.1), is presentation, as is counting the rows a list is rendering.
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
| Wire field names unchanged | Every name `frame.md` lists still appears in `src/client/api.ts`: `member_id`, `date`, `amount`, `note`, `kind`, `effective_from`, `start_month`, `end_month`, `joined_month`, `left_month`, `active_ranges`, `time_zone`, `owner_name`, `currency`, `locale`, `name`. Capture the per-name match counts from `main` before phase 1 into `evidence/runs/visual-redesign-guards.txt` and require the same counts at every phase end; a changed count is a finding, not a pass |
| Routes unchanged | `git diff --stat src/server/ src/domain/ migrations/` is empty for the whole change |
| Money formatting stays in the domain | `grep -rn "NumberFormat" src/client/` returns nothing; `formatMoney` is the only producer of a money string |
| Month status stays in the domain | `scheduleMonthStatuses` is called exactly once in `src/client/` and is the only thing that decides a tile state |
| `MemberMonthInputs` assembly unchanged | the `monthInputs` object keeps its `settings` and `breakMonths` shape and is still built from the subscription and the break-month list |
| No new client-side derivation | no component derives a share, a balance, an owed amount or an active count that it does not derive today. The six shipped exceptions stay verbatim: `RecurringSection.tsx:111-112`, `PriceHistory.tsx:16`, `PaymentForm.tsx:24` and `:28`, `ScheduleForm.tsx:21` and `:25`. Zero comparisons on a wire amount and counts of rendered rows are presentation, per design-spec's opening constraint paragraph |
| Native elements kept | `grep -rn 'role="button"\|role="checkbox"\|role="listbox"' src/client/` returns nothing |
| No router | `grep -n "router" package.json` returns nothing and `src/client/App.tsx` still holds one `useState` for the selection |
| Seven exclusion phrases stay distinct and total | the `Record<MonthExclusion, string>` at `RecurringSection.tsx:42-50` still has one entry per union member, no two entries share a string, and every value is byte-identical to `main` |
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

**Focus never reaches the document body.** Design-spec 7 fixes every destination and 3.7 and 3.10
carry the detail. The rule is that focus returns to the control that opened a panel or a strip
whenever either closes, by any route, and to the section's `h2` when that control no longer exists.
Concretely:

| Event | Focus lands on |
| --- | --- |
| A disclosure panel opens | its first field |
| Cancel or Escape on a panel | the heading-row button, as it remounts |
| A panel closes on success | that same heading-row button |
| A submit fails | the first invalid field, or the panel alert when there is none |
| A confirmation strip opens | Keep |
| Keep or Escape on a strip | that entry's Delete button, as the action row remounts |
| A delete succeeds | the section's `h2`, which carries `tabindex="-1"` |

Every section `h2` therefore carries `tabindex="-1"` and no focus ring treatment beyond the standard
outline. Without the last two rows, pressing Keep or completing a delete unmounts the focused button
and drops focus to `<body>`, which loses a keyboard user's place in a column roughly 4200px tall at
390. No focus trap and no positive `tabindex` anywhere.

**The Escape-and-native-select case needs no code.** Design-spec 3.7 removed the earlier special
case: a native select consumes Escape itself while its list is open, so the key never reaches the
panel's handler. The requirement is satisfied by handling Escape normally and building no detection
for an open select popup, which the browser exposes no way to observe.

**The sticky stack obscures 100px and two offsets follow from it.** The app bar holds 56px at `top:
0` and the section index 44px at `top: 56px`. Design-spec 4.4 therefore sets `scroll-margin-top` on
every section heading to 116px, the two heights plus `--s-4`, and gives the `IntersectionObserver` a
top `rootMargin` of -100px so `aria-current` changes when a heading crosses the visible top rather
than the viewport top. Express both as one custom property so they cannot drift apart.

**The status line element is permanent.** Design-spec 3.9 requires the `role="status"` element to
stay mounted and be empty when idle, because a `role="status"` node inserted at the moment it gains
text is announced unreliably. The same applies to the `role="alert"` line per section.

**The disclosure motion animates `grid-template-rows`, not `height`.** Design-spec 2.5 names the
property. An implementation that animates `max-height` instead produces the wrong easing on content
of unknown height and is not what the specification asks for.

**Nothing animates on load.** Design-spec principle 5 and 2.5 both say it. The entry highlight starts
200ms after a row appears in response to an action, never on first render of a list.

**The no-participant refusal means no non-owner participant.** `PaymentForm.tsx:32` and
`ScheduleForm.tsx:29` already hold `members.filter((member) => !member.isOwner)`, which is the
condition design-spec 3.11 and 5.4 need. A refusal keyed on "no members" would never fire, because the
organizer is always a member.

**`tsconfig.app.json` sets `noUnusedLocals` and `noUnusedParameters`.** A shared component built in
phase 2 with a prop that phases 3 to 5 have not adopted yet fails `npm run typecheck` at the end of
phase 2, not at the end of phase 5. So phase 2 ships only what Login and session loading consume plus
what phase 3 adopts immediately, and a part with no consumer yet is declared in the phase that first
uses it.

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

#### 2. The four font faces

**File**: `src/client/index.css`

**Purpose**: Ship exactly the four faces design-spec 2.2 names and nothing else. The package's four
CSS entry points each declare a woff2 followed by a woff fallback, and Vite emits every `url()` in
imported CSS, so importing them would ship eight files and 154,380 bytes against a 160 KB budget.

**Contract**: Four hand-written `@font-face` blocks at the top of `src/client/index.css`, family
`"IBM Plex Sans"`, `font-style: normal`, `font-display: swap`, weights 400 and 600, each with a single
`src` pointing at `@fontsource/ibm-plex-sans/files/ibm-plex-sans-<subset>-<weight>-normal.woff2` for
subsets `latin` and `latin-ext`. That subpath is an explicit entry in the package's `exports` map, so
it resolves without reaching into `node_modules`.

Each block carries a `unicode-range`. Without one, the latin-ext faces load on every page rather than
only where `zł` appears. The ranges are weight independent, so there are two values and not four; the
same pair applies to both 400 and 600:

- `latin`: `U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD`
- `latin-ext`: `U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF`

`ł` is U+0142 and sits in the latin-ext range, so `zł` renders as intended. Nothing is imported into
`src/client/main.tsx`; no italic and no other weight exists anywhere in the build.

#### 3. The token layer and the base stylesheet

**File**: `src/client/index.css`

**Purpose**: Replace the 279-line stylesheet with the design's foundation. This is the largest single
edit in the change and everything after it is additive.

**Contract**: Custom properties on `:root` for every token in design-spec 2.1, 2.2 and 2.3, with the
dark values redefined inside one `@media (prefers-color-scheme: dark)` block. Note that `--rule` and
`--border` are two tokens with two jobs: `--rule` is decorative separation only, the hairline between
entries and the bottom lines of the bar and the index, and must never be the sole boundary of a
control; `--border` is the 1px boundary of every input, select, quiet button, disclosure panel and
month tile, and is the token that has to reach 3:1 for non-text contrast. `color-scheme: light
dark` stays on `:root` so native controls follow the theme. The font stack is
`"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.

Then: the base element rules, the four button variants of design-spec 3.3 with their rest, hover,
active and disabled states, including the disabled primary, which is transparent with a 1px
`--border` and `--ink-soft` text rather than a filled `--ink-faint` block, the input, select and
textarea box of 3.4 bordered in `--border` including the chevron glyph as
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

#### 6. Adopting the app bar, and threading what it needs

**Files**: `src/client/App.tsx`, `src/client/screens/Home.tsx`,
`src/client/screens/SubscriptionDetail.tsx`

**Purpose**: Put the app bar on both signed-in screens. Home can feed it today; the detail screen
cannot, so this change adds the path.

**Contract**: `AppBar` needs the email and a sign-out handler. `Home` has both: it receives `user` and
owns `handleSignOut` at `Home.tsx:34-37`. `SubscriptionDetail` has neither: its props are
`subscription`, `onBack` and `onSignedOut` (`SubscriptionDetail.tsx:26-30`), it never receives the
user and never imports `signOut`. The email lives only in `App.tsx:8`. So `handleSignOut` lifts out of
`Home` into `App`, which then passes `user.email` and that one handler to both screens, and
`SubscriptionDetail` gains the two props. One handler serves both screens and the `onSignedOut` flow
that clears the selection and the user is unchanged.

Home's `home-header` block with "Signed in as" and its bare Sign out button is replaced by `AppBar`.
The detail screen keeps the "All subscriptions" link-variant button above the title per design-spec
4.4 and **gains** a sign-out control, which it does not have today; nothing is relocated there. Both
screens keep every other element and every handler they have. No API call changes.

### Success criteria:

#### Automated verification:

- Typecheck passes across all three projects: `npm run typecheck`
- The whole suite passes with no test file changed: `npm test`
- The production build succeeds: `npm run build`
- `@fontsource/ibm-plex-sans` is pinned to `5.3.0` with no range prefix in `package.json`
- The built output contains four woff2 files and no `.woff`, `.ttf`, `.eot` or `.otf` file at all, and
  their total is 79,268 bytes, recorded in `evidence/runs/visual-redesign-bundle.txt` against the
  160 KB budget from design-spec 2.2
- `grep -rn "fontsource" src/client/main.tsx` returns nothing, because the faces are declared in
  `src/client/index.css` rather than imported as CSS
- The per-name match counts for every wire field name in the Stability guards table are captured from
  `main` into `evidence/runs/visual-redesign-guards.txt` and are unchanged at this phase's end
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

The entry highlight belongs to the same state, not to CSS alone. Design-spec 2.5 gives it a
reduced-motion alternative that is not a duration change: the row shows `--green-tint` statically and
clears together with the status line. That couples a row's background to the status line's timer, so
one small shared hook per section owns both: it holds the sentence and the id of the row just created
or edited, starts the 4 second timer, and clears both together. `LedgerEntry` takes a `highlighted`
prop from it. With motion, the row runs the 1200ms linear fade beginning 200ms after it appears; under
reduced motion it holds `--green-tint` for the status line's lifetime and clears with it. Nothing
highlights on first render of a list.

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
from phase 1. The panel is ground `--paper`, 1px `--border`, radius 6px, padding `--s-5`, with an
`h3` at `--t-entry` naming the action. The opening button carries `aria-expanded` and
`aria-controls`. On open, focus moves to the first field. Cancel and Escape both close the panel,
discard the field values and return focus to the opening button as it reappears; closing on success
returns focus to that same button. Escape is handled normally with no special case for an open native
select, because the select consumes the key itself while its list is open and the browser exposes no
way to observe that popup; build no detection for it. Field layout inside the panel is a two-column grid at
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
acts as Keep. On Keep the action row remounts and focus moves to that entry's Delete button; after a
successful delete the row is gone, so focus moves to the section's `h2`, which carries
`tabindex="-1"`, and the status line announces the deletion. Neither path may leave focus on the
document body. The rest of the page stays usable; nothing blocks. Only one strip may be open per
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
"Signing in…" label swap. What stays unchanged is the visible label, not the button's behaviour: while
the form is busy the primary button also carries `aria-disabled="true"` and its submit handler returns
early, which is the same mechanism design-spec 3.3 already uses for a refused action and is how the
double-submit guard every form has today (`Login.tsx:58`, `MemberForm.tsx:113`,
`SubscriptionForm.tsx:87`, `PaymentForm.tsx:156`, `ScheduleForm.tsx:158`) survives the change. Losing
it would let a second Enter during an in-flight request record a second payment, which is an
accounting effect from a change whose premise is that no accounting behaviour moves.

Session loading in `App.tsx` becomes the app bar with the wordmark only, then one static 240x27
skeleton bar on `--paper` in the column, with an `sr-only` `role="status"` reading "Loading your
session". The skeleton is `aria-hidden`.

### Success criteria:

#### Automated verification:

- Typecheck passes across all three projects: `npm run typecheck`
- The whole suite passes with no test file changed: `npm test`
- The production build succeeds: `npm run build`
- No wire name reaches a rendered string in the files this phase touches:
  `grep -rn 'error\.field' src/client/screens/Login.tsx src/client/App.tsx src/client/components/ui/`
  finds no interpolation into a message. The four forms that do leak today
  (`SubscriptionForm.tsx:82`, `MemberForm.tsx:108`, `PriceHistory.tsx:130`, `BreakMonths.tsx:73`) are
  converted in phases 3, 4 and 5, so the repository-wide gate is phase 5's criterion, not this one
- `grep -rn "DateTimeFormat" src/client/` finds it only in `src/client/format.ts`
- `grep -rn "NumberFormat" src/client/` still returns nothing

#### Manual verification:

- Login at 1280 in light and again in dark matches design-spec 4.1: a 360px block at 20vh, the glyph
  wordmark at `--t-title`, the subtitle, two labelled fields and the primary button; a pass means the
  block's position, width and every colour come from the tokens
- A refused sign-in shows "Email or password is not right. Try again." as the generic error line above
  the fields, the panel takes the 3px red left rule, and focus lands on the email field
- Submitting keeps the button label unchanged, disables both fields, sets `aria-busy` on the form and
  shows no spinner, and a second Enter or click while the request is in flight sends nothing, because
  the button carries `aria-disabled="true"` and the handler returns early
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
- Escape and Cancel both close the panel, discard the typed values and return focus to the button as
  it reappears, and a successful create returns focus to that same button rather than to the body
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

Then a `dl` of four `div` groups for "Per person this month", "Your share this month", "Collected
this month" and "Active participants", with `dt` at `--t-small` colour `--ink-soft` and `dd` at
`--t-entry` weight 600 tabular, in a row with `--s-6` gaps that wraps if needed, and a hairline
`--rule` above and below. Below 640px they stack with the `dt` left and the `dd` right on one line.
"Collected this month" keeps its "X of Y" form.

"Active participants" stays a cell and keeps `summary.currentActiveCount` exactly as today, organizer
included, which is what makes it agree with "Per person this month" beside it. Design-spec 4.4 and 5.1
keep it out of the Participants heading for the reason in the key findings above: the figure counts the
organizer and the list never shows them, so a heading count could not agree with the rows under it.

The summary sentence keeps its current content and order with its bold spans removed and its figures
tabular, and its month names go through the phase 2 display formatter, so it opens "Sep 2026 costs
110,00 zł" rather than "2026-09 costs ...".

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
through the product on a local database, so this phase builds it against the code path and the content
shown in `evidence/screenshots/detail-no-owner-state.png`, and phase 6 captures the new design by
forcing the state in the client during a dev session. The prior capture is a reference for what the
state says, never a substitute for the new capture.

#### 2. The section index

**File**: `src/client/components/ui/SectionIndex.tsx` (new)

**Purpose**: Design-spec 4.4. The detail screen is one column roughly 4200px tall at 390 with the
section a reviewer most wants at the bottom. This is the in-page navigation that answers frame
question 1 without a router.

**Contract**: A `nav` with `aria-label="Sections"` holding a horizontal list of link-variant buttons
labelled exactly as the five section headings without their counts. Each scrolls its section heading
into view with `scrollIntoView({ block: "start" })`, and every heading carries a `scroll-margin-top`
of 116px, which design-spec 4.4 derives as the 56px app bar plus the 44px index plus `--s-4`. The nav
is sticky at `top: 56px`, directly under the app bar that design-spec 3.2 fixes at `top: 0`, on ground
`--ground` with a bottom hairline, 44px high. The item whose section is at or above the visible top
carries `aria-current="true"` and a 2px `--ink` bottom rule; an `IntersectionObserver` over the
headings with a top `rootMargin` of -100px, the bar plus the index, is the intended mechanism. Without
that root margin the current item changes a full screen-third late, because the true viewport top sits
100px behind the visible one. Express the 116px and the 100px as custom properties derived from the
same two heights, so the offsets cannot drift apart. Below 640px the list scrolls horizontally with `overflow-x: auto`,
a hidden scrollbar, 8px inline padding and 8px fading edges made with a `mask-image` gradient. In tab
order it comes after the summary and before the first section.

#### 3. Participants

**Files**: `src/client/components/MemberList.tsx`, `src/client/components/MemberForm.tsx`,
`src/client/screens/SubscriptionDetail.tsx`

**Purpose**: Design-spec 5.1. This is the section whose form currently sits outside it, and the one
whose delete has no confirmation today.

**Contract**: The section opens per design-spec 3.5 with the heading "Participants", carrying no count
at all per design-spec 5.1, and a primary "Add participant". `MemberForm` moves inside this
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
- The Participants heading carries no count, "Active participants" is the fourth cell of the ledger
  line reading `summary.currentActiveCount` unchanged, and every other heading count equals the number
  of rows its list renders
- `grep -n "activeRanges" src/client/components/MemberList.tsx` returns nothing, so no active count is
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
- Pressing Keep on a confirmation strip returns focus to that entry's Delete button, and completing a
  delete moves focus to the section's `h2`; in neither case does focus land on the document body,
  checked by tabbing once afterwards and seeing where the ring appears
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

**Contract**: Heading "Payments received (N)" where N is the number of rows listed under the current
filter, with the subtitle "Money you saw arrive. Every amount here is recorded, not assumed."
unchanged, and a primary "Record a payment". With no participant other than
the organizer, which is the condition `PaymentForm.tsx:32` already computes, the button is disabled but
still focusable per design-spec 3.3, with "Add a participant before recording a payment." at
`--t-small` colour `--ink-soft` under the heading and referenced by the button's
`aria-describedby`; both disappear when a participant exists.

The "Show" filter is a labelled native `select` listing Everyone and then each participant, at the
right end of the subtitle line above 640px and under the subtitle below it, with a 32px control and a
`--t-small` label. It keeps going to the server as it does today; nothing is filtered in the component.

Each payment is a ledger entry: the amount in the recorded treatment followed by "from <name>" as the
primary line; the secondary line is the kind label exactly as the shipped client names it ("One-off",
"Yearly lump sum" and any other existing label), followed by ", " and the note when a note exists, so
the kind is never dropped; the date through the date formatter as the figure column; and
`[Edit] [Delete]` as link-variant buttons at `--t-small`. The add panel pairs "From" with "Date received" and "Amount"
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
exactly design-spec 5.5: counted takes a 3px `--green` left rule, a 1px `--border` border, the assumed
amount and a `[Mark not received]` link-variant button; excluded by rule takes no left rule, a 1px
dashed `--border` border, no figure, the exclusion phrase at `--t-small` colour `--ink-soft` and no
toggle; marked not received takes a 3px `--red` left rule, a 1px `--border` border, no figure, "marked
as not received" at `--t-small` colour `--red` and a `[Mark received]` link-variant button. Each state
is distinguishable with colour removed.

Which state a tile is in comes from the single existing call to `scheduleMonthStatuses` at
`RecurringSection.tsx:104` and from nothing else. The seven values in the `Record<MonthExclusion,
string>` at `RecurringSection.tsx:42-50` are already bare phrases such as "the plan was paused that
month"; the leading "not counted, " lives in the template that renders them at
`RecurringSection.tsx:142`. So the map is not edited at all: its seven values stay byte-identical and
total over the union, and the prefix is simply not reproduced in the new tile, because the dashed
border already says the month did not count.

A failed tile toggle lands in the section alert of design-spec 3.5 with the server's message verbatim
and leaves the tile in the state it was in.

The add panel has "From" spanning, "Amount each month" paired with "First month", and "Last month"
spanning with the hint "Leave empty while it is still running". The primary "Record this standing
order" produces "Standing order added"; editing produces "Changes saved"; the toggles produce "Marked
not received" and "Marked received". Deleting uses the confirmation strip with "Delete <name>'s standing
order? Its assumed receipts and not-received marks go with it. Recorded payments stay."

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
- No wire name can reach a rendered string anywhere: `grep -rn 'error\.field' src/client/` finds
  `error.field` only where it is compared against a literal or looked up in a display map, never
  interpolated into a message. This is the gate F7 asks for and it can only pass once the last of the
  four leaking forms is converted, which happens in this phase
- The seven exclusion phrase values at `RecurringSection.tsx:42-50` are byte-identical to `main`

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
- Each dashed tile carries its own exclusion phrase with no "not counted, " prefix, one phrase per
  condition, and no two conditions sharing a phrase
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

**Contract**: Two tables, both in both themes, each row carrying its measured ratio, the threshold it
is held to, and the tool used.

Text pairs, WCAG 1.4.3 at AA: every pair design-spec 2.1 lists. `--ink-faint` is held to 3:1 because
it carries only placeholder text, disabled text and the word "settled".

Non-text pairs, WCAG 1.4.11 at 3:1, which design-spec 2.1 now requires and which a text-only record
would miss entirely: `--border` on `--paper` and on `--ground`, since it is the sole visual boundary of
every input, select, quiet button, disclosure panel and month tile; `--green` and `--red` as tile left
rules on `--paper`; and the focus outline `--green` on both grounds. `--rule` is not measured against
3:1 because design-spec 2.1 exempts it as decorative separation, on the condition that it is never the
sole boundary of a control; this phase checks that condition by reading the stylesheet, and a control
bordered in `--rule` is a defect, not a contrast failure.

Also record, without holding it to a threshold, the disabled primary button's `--ink-soft` on
`--ground`. WCAG exempts inactive controls, but design-spec 3.3 deliberately keeps those buttons
focusable and in the tab order with an `aria-describedby` explanation, so the designer should see the
number.

A failing pair is fixed by darkening the light foreground or lightening the dark foreground, never by
changing a ground, and the changed token value is recorded beside the original. A failure on `--border`
is raised to the designer as a token question rather than fixed here, because that token is the
boundary of every control on the page.

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

**Contract**: Captures are taken against `npm run dev` on a local database holding synthetic data
only, at a 2x device pixel ratio, following the naming convention the existing sets in
`evidence/screenshots/` use.

**Naming rule**: `redesign-NN-<slug>-<theme>.png` at 1280 CSS pixels and
`redesign-NN-<slug>-mobile-<theme>.png` at 390, where `<theme>` is `light` or `dark`. Every state is
captured in both themes, so every row below yields two files at 1280 and, where it is also in the
mobile set, two more at 390.

The twenty-three states, each at 1280 in both themes, are forty-six files:

| NN | Slug | State, per design-spec 11 |
| --- | --- | --- |
| 01 | `login-idle` | 11.1 login idle |
| 02 | `login-submitting` | 11.1 login submitting |
| 03 | `login-error` | 11.1 login 401 |
| 04 | `home-empty` | 11.2 home empty |
| 05 | `home-populated` | 11.2 home populated |
| 06 | `home-panel-open` | 11.2 home with the New subscription panel open |
| 07 | `home-load-error` | 11.2 home load error |
| 08 | `detail-loading` | 11.3 detail first load with skeletons |
| 09 | `detail-populated` | 11.3 detail populated, full column |
| 10 | `detail-error` | 11.3 detail error |
| 11 | `detail-no-owner` | 11.3 the 409 no-owner state |
| 12 | `section-empty` | 11.4 a section empty |
| 13 | `section-populated` | 11.4 a section populated |
| 14 | `section-add-panel` | 11.4 its add panel open |
| 15 | `section-edit-panel` | 11.4 its edit panel open |
| 16 | `section-field-error` | 11.4 a field error inside that panel |
| 17 | `section-generic-error` | 11.4 the section alert carrying a refused participant delete |
| 18 | `section-success` | 11.4 the success status line with the entry highlight |
| 19 | `section-confirm` | 11.4 a destructive confirmation open |
| 20 | `price-delete-step-two` | the price delete strip on its second step with the server's months |
| 21 | `tiles-three-states` | 11.5 one standing order showing all three tile states |
| 22 | `index-current-item` | 11.7 the index with the current item marked mid-scroll |
| 23 | `reduced-motion` | a disclosure and an entry highlight with reduced motion on |

Design-spec 11.4 lists eight section states and they cannot coexist in one render, which is why rows
12 to 19 are eight separate files per theme rather than one composite.

The mobile set is the eight states where design-spec 8 changes the layout rather than only the width:
`01 login-idle`, `05 home-populated`, `06 home-panel-open`, `09 detail-populated`,
`13 section-populated`, `14 section-add-panel`, `21 tiles-three-states` and `22 index-current-item`.
Each is captured at 390 in both themes, which is sixteen files.

**Total: sixty-two files.** That number is the criterion; a set that does not reach it is incomplete.

The keyboard pass of design-spec 11.6 is recorded as prose in
`evidence/runs/visual-redesign-keyboard.md` rather than as an image, naming each step and what
happened.

The 409 no-owner state cannot be produced through the product on a local database, per `research.md`.
Row 11 is therefore captured by forcing that state in the client during a dev session, in both themes,
and `evidence/runs/visual-redesign-keyboard.md` records that it was not produced through the API. The
prior capture `evidence/screenshots/detail-no-owner-state.png` shows the old design and is a reference
for the state's content only, not a substitute for row 11. Phase 4 uses it that way and this phase
captures the new design; the two are not alternatives.

#### 5. The designer handoff

**File**: `context/changes/visual-redesign/plan.md` (this file, the Design questions section)

**Purpose**: Hand the designer a review that is complete against design-spec 11 and record the result.

**Contract**: The implementer states that all sixty-two captures, the contrast record with both its tables, the
bundle record and the keyboard record exist and are readable, then requests the designer's review against design-spec
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
  the baseline and the budget, and the built output still contains four woff2 files totalling 79,268
  bytes and no `.woff`, `.ttf`, `.eot` or `.otf` file
- `git diff --stat src/server/ src/domain/ migrations/ tests/` is empty for the whole change

#### Manual verification:

- All sixty-two captures exist under the naming rule above, show the state they name, and contain no
  real credential, token or session cookie
- The keyboard pass of design-spec 11.6 is walked and recorded: tab through the detail screen, open a
  panel, Escape it, delete with Keep, delete with Delete
- The section index current-item tracking of design-spec 11.7 is walked while scrolling the whole
  detail column in both directions
- The contrast record covers the text pairs at AA with `--ink-faint` at 3:1, and the non-text pairs at
  3:1 including `--border` on both grounds, in both themes, naming the tool
- No control anywhere takes `--rule` as its visible boundary: every input, select, quiet button,
  panel and tile is bordered in `--border`, and the link variant's underline is `--border` too per
  design-spec 3.3, so the check matches the exemption's intent and not only the word "border"
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

Questions found during implementation are added below under the protocol above.

**D7, raised in phase 3. Design-spec 4.3: the Home success feedback and the screen it opens.**
Design-spec 4.3 ends the create flow with "status line 'Subscription created' in the Home heading
row, then the detail screen opens", and design-spec 3.9 gives that status line four seconds and the
created row the entry highlight, which design-spec 2.5 runs for 1200ms beginning 200ms after the row
appears. Opening the detail screen unmounts Home, so neither the sentence nor the highlight can be
seen, and no interval between the two is specified. Choosing one would be choosing a motion. This
blocks phase 3 change 2's last clause and Progress row 3.11. Left in place for it: the shipped
behaviour, in which the created subscription is appended to the list and the screen stays on Home.
Everything else in that clause is implemented, so the panel closes, the heading row reads
"Subscription created" and the new row takes the highlight.

**D8, raised in phase 3. Design-spec 3.8: the sentence a field error carries.**
Design-spec 3.8 fixes the shape of a field error and forbids prefixing it with the wire name, and
its display map turns the wire name into the field's label. The sentence itself still comes from the
server, and the shipped server's messages name the wire field inside the sentence: `start_month must
be in YYYY-MM format with a valid month`, `time_zone must be a valid IANA time zone`,
`currency must be a three-letter uppercase ISO code` and the same pattern for every other rule in
`src/server/validation/`. `src/server/` is out of this change's scope, and writing replacement copy
per rule in the client would be inventing copy. So the label beside the field is correct while the
wire name survives inside the server's own sentence. This blocks Progress row 3.12, and the same
condition reaches every refused field in phases 4 and 5. Left in place for it: the server's message
verbatim, with the client prefix that phase 3 removes gone. The phase 5 gate on `error.field` is
unaffected, because no wire name is interpolated by the client anywhere.

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

- [x] 1.1 Typecheck passes across all three projects — d0f9a05
- [x] 1.2 The whole suite passes with no test file changed — d0f9a05
- [x] 1.3 The production build succeeds — d0f9a05
- [x] 1.4 @fontsource/ibm-plex-sans is pinned to 5.3.0 with no range prefix — d0f9a05
- [x] 1.5 Four woff2 files ship at 79,268 bytes with no woff, ttf, eot or otf, recorded against the budget — d0f9a05
- [x] 1.6 No NumberFormat appears anywhere under src/client — d0f9a05
- [x] 1.7 Nothing under src/server, src/domain or migrations has changed — d0f9a05
- [x] 1.15 The faces are declared in index.css and nothing imports fontsource CSS from main.tsx — d0f9a05
- [x] 1.16 The wire-name match counts are captured from main and are unchanged at this phase's end — d0f9a05

#### Manual

- [x] 1.8 The app bar renders per design-spec 3.2 on Home and Detail at 1280 in light and dark — d0f9a05
- [x] 1.9 Every control keeps the focus ring of design-spec 2.4 — d0f9a05
- [x] 1.10 The browser tab shows the split glyph favicon — d0f9a05
- [x] 1.11 Four woff2 requests go to the app's own origin and none to a third party — d0f9a05
- [x] 1.12 Nothing animates on load with reduced motion on and with it off — d0f9a05
- [x] 1.13 At 390 the email is visually hidden and every bar control is at least 44px high — d0f9a05
- [x] 1.14 The app bar stays at the top of the viewport while the page scrolls at 1280 and at 390 — d0f9a05

### Phase 2: The shared presentation layer, proven on Login and session loading

#### Automated

- [x] 2.1 Typecheck passes across all three projects — b8db05f
- [x] 2.2 The whole suite passes with no test file changed — b8db05f
- [x] 2.3 The production build succeeds — b8db05f
- [x] 2.4 No wire name reaches a rendered string in the files this phase touches — b8db05f
- [x] 2.5 DateTimeFormat appears only in src/client/format.ts — b8db05f
- [x] 2.6 No NumberFormat appears anywhere under src/client — b8db05f

#### Manual

- [x] 2.7 Login matches design-spec 4.1 at 1280 in light and in dark — b8db05f
- [x] 2.8 A refused sign-in shows the generic error line and focus moves to the email field — b8db05f
- [x] 2.9 Submitting keeps the label, disables the fields, sets aria-busy and aria-disabled, and refuses a second submit — b8db05f
- [x] 2.10 Session loading shows the wordmark-only bar, a static skeleton and the status announcement — b8db05f
- [x] 2.11 At 390 the Login block fills the width with a full-width button and 44px controls — b8db05f
- [x] 2.12 Tab order is email, password, Sign in, each with the green focus ring and no trap — b8db05f

### Phase 3: Home

#### Automated

- [x] 3.1 Typecheck passes across all three projects — 00813fe
- [x] 3.2 The whole suite passes with no test file changed — 00813fe
- [x] 3.3 The production build succeeds — 00813fe
- [x] 3.4 The create payload still sends name, currency, locale, time_zone, start_month and owner_name — 00813fe
- [x] 3.5 The list is a ul of li each holding exactly one native button and no role="button" exists — 00813fe

#### Manual

- [x] 3.6 Home populated matches design-spec 4.3 at 1280 in light and in dark — 00813fe
- [x] 3.7 Home empty shows only the design-spec 3.11 sentence with no rules — 00813fe
- [x] 3.8 New subscription opens the disclosure under the heading with focus on the Name field — 00813fe
- [x] 3.9 Escape, Cancel and a successful close all return focus to the heading-row button — 00813fe
- [x] 3.10 Currency and Locale pair above 640px and stack below it while other fields span — 00813fe
- [ ] 3.11 A create closes the panel, shows "Subscription created", highlights the row and opens Detail
- [ ] 3.12 A refused create shows one sentence under its own field with the mapped label and moves focus
- [x] 3.13 A load failure shows the section alert under the heading row with a quiet Try again — 00813fe
- [x] 3.14 At 390 the New subscription button wraps under the heading with no horizontal scroll — 00813fe
- [x] 3.15 The heading row shows the status line first and the button second, and no button while the panel is open — 00813fe

### Phase 4: The detail summary, the section index, Participants and Price history

#### Automated

- [ ] 4.1 Typecheck passes across all three projects
- [ ] 4.2 The whole suite passes with no test file changed
- [ ] 4.3 The production build succeeds
- [ ] 4.4 Participants carries no count, Active participants is the fourth cell, and other counts equal rows rendered
- [ ] 4.5 Every money string on Detail comes from formatMoney and no NumberFormat exists
- [ ] 4.6 The member, range and price payload keys are unchanged
- [ ] 4.7 No router was added and App.tsx still holds the selection in one useState
- [ ] 4.24 No active count is derived in the client; grep activeRanges in MemberList returns nothing

#### Manual

- [ ] 4.8 The leading figure and the four cell ledger line match design-spec 4.4 at 1280 in light and dark
- [ ] 4.9 The summary sentence keeps its content and order, with no bold spans and months through the formatter
- [ ] 4.10 The index sticks under the bar, clicking scrolls a heading clear of both 116px, and aria-current changes at the visible top
- [ ] 4.11 Participant entries show the tags, the coloured balance and the three labelled cells
- [ ] 4.12 Add participant opens with the Active months fieldset and its link-variant range controls
- [ ] 4.13 Editing opens in place and opening a second edit closes the first and discards its values
- [ ] 4.14 Deleting a participant opens the strip with focus on Keep, and a refusal goes to the section alert
- [ ] 4.23 Keep returns focus to that entry's Delete and a completed delete focuses the section h2, never the body
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
- [ ] 5.18 No wire name can reach a rendered string anywhere under src/client
- [ ] 5.19 The seven exclusion phrase values are byte-identical to main

#### Manual

- [ ] 5.8 Skipped months matches design-spec 5.3 at 1280 in light and in dark
- [ ] 5.9 Payments received keeps its subtitle, places the Show filter and shows recorded amounts
- [ ] 5.10 Recording, editing and deleting a payment each confirm with their own status sentence
- [ ] 5.11 Both no-participant refusals render as a focusable disabled button with its describedby sentence
- [ ] 5.12 Standing order amounts carry the assumed treatment and never the recorded one
- [ ] 5.13 One standing order shows all three tile states, each identifiable in greyscale
- [ ] 5.14 Each dashed tile carries its own exclusion phrase with no prefix and no two conditions share one
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
- [ ] 6.6 The bundle and font byte counts are recorded, with four woff2 files and no other font format
- [ ] 6.7 Nothing under src/server, src/domain, migrations or tests has changed across the whole change

#### Manual

- [ ] 6.8 All sixty-two captures exist under the naming rule, show their state, and carry no credential
- [ ] 6.9 The keyboard pass of design-spec 11.6 is walked and recorded
- [ ] 6.10 The section index current-item tracking of design-spec 11.7 is walked in both directions
- [ ] 6.11 The contrast record covers the text pairs at AA and the non-text pairs at 3:1 in both themes
- [ ] 6.15 No control takes --rule as its boundary, link underlines included; every control uses --border
- [ ] 6.12 Reduced motion on and off are compared for all three motions of design-spec 2.5
- [ ] 6.13 No screen or state scrolls horizontally at 390 and every control there is at least 44px high
- [ ] 6.14 The designer has reviewed the captures against design-spec 11 and accepted or recorded findings
