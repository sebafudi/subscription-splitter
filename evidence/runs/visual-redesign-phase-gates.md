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
