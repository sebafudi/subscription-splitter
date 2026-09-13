# visual-redesign phase gates

Each phase of `context/changes/visual-redesign/plan.md` ends with a browser check rather than a
test run, because no test in this repository reads the client's markup. The captures behind each
phase's manual rows live beside the plan in `context/changes/visual-redesign/reference/`, named
`phase-<N>-<screen>-<theme>-<width>.png`. They are working evidence for the phase gate, not the
acceptance set: phase 6 produces the designer's captures under `evidence/screenshots/`.

Captures are taken against `npm run dev` on the local D1 database, which holds synthetic fixtures
only, signed in as the seeded development account.

## Phase 1: tokens, typeface, base elements and the app bar

| Capture | What it shows |
| --- | --- |
| `phase-1-home-light-desktop.png` | Home at 1280 in light: the bar on `--ground` with the glyph wordmark, the email, the quiet Sign out and the bottom hairline, aligned to the 720px column |
| `phase-1-home-dark-desktop.png` | the same in dark, with the dark palette from design-spec 2.1 |
| `phase-1-detail-light-desktop.png` | the detail screen at 1280 in light, carrying the same bar above its unredesigned content |
| `phase-1-detail-dark-desktop.png` | the same in dark |
| `phase-1-detail-light-desktop-sticky.png` | the bar held at the top of the viewport at 1280 with page content passing under it |
| `phase-1-detail-light-mobile-sticky.png` | the same at 390, scrolled 1400px into a 4307px column |
| `phase-1-home-light-mobile.png` | Home at 390: the email visually hidden, the wordmark and Sign out remaining, both bar controls 44px high |
| `phase-1-favicon.png` | `/favicon.svg` served from the app's own origin and rendering as the split glyph |

Measured during the same session rather than captured:

- Every one of the 45 focusable controls on the detail screen, and all 11 on Home, computes
  `2px solid` `--green` at `2px` offset under `:focus-visible`, in light and in dark.
- Four woff2 requests, all to the app's own origin, none to any third party. The latin faces load
  on Home; the two latin-ext faces load only once `zł` is on screen, which is what the
  `unicode-range` split is for.
- No element on either screen carries a transition or an animation and no animation runs on load,
  with reduced motion on or off. The `prefers-reduced-motion` block zeroes all five motion
  durations.
- The bar computes `position: sticky`, `top: 0`, 56px high, on `--ground` with a 1px `--rule`
  bottom line, its column 720px wide.

## Phase 2: the shared presentation layer, on Login and session loading

| Capture | What it shows |
| --- | --- |
| `phase-2-login-light-desktop.png` | Login at 1280 in light: a 360px block at 20vh, centred on the page and left aligned inside, with the 28px glyph wordmark, the subtitle, two labelled fields in one column and the primary button |
| `phase-2-login-dark-desktop.png` | the same in dark |
| `phase-2-login-error-light-desktop.png` | a refused sign-in: the generic error line above the fields, the block carrying the 3px red left rule, focus on the email field |
| `phase-2-login-submitting-light-desktop.png` | the submitting state: the label unchanged, both fields disabled, the primary in its disabled treatment, no spinner |
| `phase-2-login-light-mobile.png` | Login at 390: the block filling the width, the button full width, every control 44px |
| `phase-2-session-loading-light-desktop.png` | the session loading screen: the bar with the wordmark alone and one static 240x27 skeleton bar |

Measured during the same session rather than captured:

- The login block is 360px wide, its top edge 180px into a 900px viewport, and its horizontal
  centre is the page's centre. The wordmark computes 27px/1.2 at weight 600 over a 28px glyph.
- A refused sign-in puts "Email or password is not right. Try again." in the always-mounted
  `role="alert"` region and leaves focus on the email field.
- While the request is in flight the button reads "Sign in", carries `aria-busy` and
  `aria-disabled` but not the `disabled` attribute, the form carries `aria-busy`, both fields are
  disabled and no spinner exists. Three further clicks during one in-flight request produced one
  sign-in call, not four.
- The session loading screen exposes only `status` "Loading your session"; its 240x27 `--paper`
  skeleton is `aria-hidden` and no animation runs.
- Tab order is email, password, Sign in, each computing the 2px `--green` outline at 2px offset.
  No positive `tabindex` exists and focus leaves the page after the last control, so nothing traps.
- At 390 the block is 358px inside the 16px page padding, the button fills it, every control is
  44px and the page does not scroll horizontally.

## Phase 3: Home

| Capture | What it shows |
| --- | --- |
| `phase-3-home-light-desktop.png` | Home populated at 1280 in light: the h1 with its count, the primary in the heading row, and two ledger rows each closed by a hairline with the currency and month in the figure column |
| `phase-3-home-panel-light-desktop.png` | the New subscription panel open under the heading, the button gone from the heading row, Currency and Locale paired, every other field spanning, and focus on Name |
| `phase-3-home-panel-dark-desktop.png` | the same in dark |
| `phase-3-home-success-light-desktop.png` | after a create: the status line first and the primary second in the heading row, focus back on the primary |
| `phase-3-home-empty-light-desktop.png` | Home empty: one sentence in the list position, no rules, the primary the only call to action |
| `phase-3-home-load-error-light-desktop.png` | a failed list load in the permanent section alert under the heading row, carrying the quiet Try again |
| `phase-3-home-light-mobile.png` | Home at 390: heading, status line and primary on three left-aligned lines, the figure column under the primary line |

Measured during the same session rather than captured:

- Escape and Cancel both close the panel, empty the Name field and put focus back on the New
  subscription button as it remounts; the closed panel computes `inert` and `data-open="false"`.
  Focus never reached the document body on any close path.
- A create closed the panel, appended the row, put "Subscription created" in the status line and gave
  the new row the `entry-highlight` animation at 1.2s with a 0.2s delay. Nothing is highlighted on a
  first render of the list.
- A refused create marked only the offending control `aria-invalid="true"`, rendered one sentence
  under it and moved focus to that control. See design question D8 for the sentence itself.
- The list is a `ul` of three `li`, each holding exactly one native `button`; no `role="button"`
  exists anywhere under `src/client/`.
- Above 640px the panel grid computes `303px 303px` with Currency and Locale sharing a row; at 390 it
  computes one column, the two stack, every control in the panel is at least 44px high and the page
  does not scroll horizontally.
- The load failure was forced by refusing `GET /api/subscriptions` in the page, and Try again
  restored the list and cleared the alert.

Two observations for the designer, neither a design question:

- The month in the figure column renders through the subscription's own `locale`, which design-spec
  3.12 requires. With the seeded `pl-PL` subscriptions that reads "from lip 2026" rather than the
  "from Jul 2026" the mockup and the plan's examples show in English. The formatter is right; the
  examples assume an English locale.
- Home shows its count while the list is still loading, so it reads "(0)" for the length of the
  request. Design-spec 4.3 specifies no loading state for Home and the shipped screen had none.

## Design answers folded in after phase 3

The designer answered plan design questions D7 and D8 by editing `design-spec.md` at `02b213e`:
4.3 now keeps the screen on Home after a create, with the new row itself as the way into the detail
screen, and 3.8 now defines one mechanical transform for a server field message. Both are
implemented in the phase 4 commit, so Progress rows 3.11 and 3.12 close with phase 4's SHA rather
than phase 3's.

- The transform lives in `messageWithLabel` in `src/client/components/ui/fieldLabels.ts` and is
  applied by all three redesigned forms. Measured: `start_month must be in YYYY-MM format with a
  valid month` renders as "Start month must be in YYYY-MM format with a valid month" and
  `name must not be empty` as "Name must not be empty". A message that opens with a token other than
  the field's own wire name is shown verbatim, which the specification now states is acceptable.

## Phase 4: the detail summary, the section index, Participants and Price history

| Capture | What it shows |
| --- | --- |
| `phase-4-detail-owed-light-desktop.png` | the detail screen at 1280 in light with an amount owed: the leading figure in `--red` as the largest text on the page, over the four cell ledger line between its two hairlines, then the count-free Participants heading and its ledger rows |
| `phase-4-detail-owed-dark-desktop.png` | the same in dark |
| `phase-4-detail-light-desktop.png` | the second subscription, whose figure is zero and therefore `--ink` |
| `phase-4-detail-loading-light-desktop.png` | first load: the figure, cell and sentence skeletons, every heading with its count blank and its subtitle present, every action disabled, two skeleton entries per list |
| `phase-4-detail-error-light-desktop.png` | a failed load in the alert line with the quiet Try again |
| `phase-4-participant-add-light-desktop.png` | the add panel with the Active months fieldset, two ranges, and Remove and Add another range as link-variant buttons |
| `phase-4-participant-field-error-light-desktop.png` | a refused create: the red border and tint on the offending control with one sentence under it, carrying the mapped label |
| `phase-4-participant-success-light-desktop.png` | a participant just added, with the balance in the figure column and the three labelled cells below |
| `phase-4-participant-refused-delete-light-desktop.png` | a delete the server refused: the message verbatim in the section alert, the strip closed and the row standing |
| `phase-4-participants-settled-archived-light-desktop.png` | the settled archived disclosure open, its row carrying "settled" in `--ink-faint` and every action |
| `phase-4-prices-light-desktop.png` | Price history: the amount as the primary line in the recorded treatment, the effective month in the figure column |
| `phase-4-price-delete-step-two-light-desktop.png` | the price delete strip on its second step, carrying the server's months and Delete anyway, focus back on Keep |
| `phase-4-detail-light-mobile.png` | the detail screen at 390: the ledger line stacked with `dt` left and `dd` right, the figure column under the primary line, the three cells and the actions on their own lines, and the section index scrolling sideways with a faded edge |

Measured during the same session rather than captured:

- The sticky stack is exact. The app bar's bottom edge and the index's top edge are both at 56px, the
  index's bottom at 100px, and a heading reached through the index lands at 116px, at 1280 and again
  at 390. There is no gap between the bar and the index.
- `aria-current` tracks all five sections while scrolling down and again while scrolling back up.
  Because the two offsets differ by `--s-4`, a heading reached by clicking its index item sits 16px
  below the line the observer watches, so the clicked item becomes current only after a further 16px
  of scrolling. Both numbers are the specification's.
- Focus never reached the document body on any path tested: Escape and Cancel on the add panel and on
  an edit panel return to the control that opened them, Keep and Escape on a strip return to that
  entry's Delete button, a refused delete returns there too because the row survives, and a completed
  delete moves to the section's `h2`.
- Opening a second edit panel closed the first and discarded what had been typed into it.
- The archive action read "Archive" then "Unarchive" and produced "Participant archived" and
  "Participant unarchived", the tag following the name in both directions.
- The price delete ran both steps inside one strip: the first asked with the amount and the short
  month, the server's 409 became the strip's own question followed by "Delete anyway?", the buttons
  became Delete anyway and Keep, and focus returned to Keep.
- The price create 409 rendered as the generic form error at the top of the panel with the panel's
  3px red left rule and focus on the alert line, and the section alert stayed empty, so an error
  raised inside a panel never reaches the section's own alert. The section alert cleared both on
  Dismiss and on the next successful action in the section.
- A reload after an archive kept the figure and all four cells on screen with no skeleton, and the
  acting section showed its status line.
- The build ships four woff2 files totalling 79,268 bytes and no `.woff`, `.ttf`, `.eot` or `.otf`.

Three observations for the designer, none of them a design question:

- The price delete's second step shows the server's message verbatim, as design-spec 5.2 requires,
  and that message ends "Repeat the request with confirm=true to go ahead." before the specified
  "Delete anyway?". The sentence is the server's and `src/server/` is out of scope.
- "Show N settled archived participants" is rendered verbatim from design-spec 5.1, so with one such
  participant it reads "Show 1 settled archived participants".
- Months render through the subscription's `locale` throughout, so the seeded `pl-PL` subscriptions
  read "from lip 2026" and "wrz 2026 costs 120,00 zł" rather than the English months the mockup shows.
