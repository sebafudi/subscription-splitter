# google-sign-in manual rows, measured in a browser

Driven with Chrome over the DevTools protocol against `npm run dev` on the local D1 database, with
the real `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` pair in the ignored `.dev.vars`. Every claim
below is a value read from the live page, with the property it came from named. The AeroSpace tiling
manager blocks window resizes, so both widths are device emulation at a device scale factor of 2
rather than window sizing. No credential value appears in this file or in any capture.

## Phase 4

The acceptance pass, on the tree that carries the button border fix. Same method as phase 2: Chrome
driven over the DevTools protocol against `npm run dev` on the local D1, with the real pair in the
ignored `.dev.vars` except where a row says otherwise. The tiling manager still blocks window
resizes, so both widths are device emulation at a device scale factor of 2. Contrast is a WCAG 2.2
relative-luminance ratio computed inside the page from the `getComputedStyle` values of the two
colours being compared, the formula of success criterion 1.4.3, rather than judged from a capture or
read off a colour picker. No credential value appears in this file or in any capture.

**4.3 and 4.11, login idle with the button.** At 1280 the block is 360px wide, `.login-actions`
computes `display: flex`, `gap: 12px` (`--s-3`), `flex-wrap: wrap`, `flex-direction: row`, and both
buttons share `top: 424.58px`, so one line: `Sign in` at x 475px width 80.78px, `Continue with
Google` at x 567.78px width 209.09px, both 40px high. The Google button computes `min-height: 40px`,
`padding: 0px 16px`, `gap: 8px` (`--s-2`), `border-radius: 4px`, `font-weight: 600`,
`font-size: 15px`, background `rgba(0, 0, 0, 0)`, `type="button"`. Light: text `rgb(23, 33, 27)`
(`--ink`), border `1px solid rgb(124, 135, 127)` (`--border`). Dark: text `rgb(232, 237, 230)`,
border `rgb(111, 123, 115)`, the same two tokens in their dark values. Geometry is identical in both
themes. At 390 the row computes `flex-direction: column`, `align-items: stretch`, `gap: 12px`;
`Sign in` sits at y 421.38px and `Continue with Google` at y 477.38px, so `Sign in` is first; both
are 343px wide and 44px high, in both themes.
`document.documentElement.scrollWidth - clientWidth` is 0 at both widths in both themes.
Captures `google-sign-in-accept-01-login-idle-1280-{light,dark}.png` and
`google-sign-in-accept-02-login-idle-390-{light,dark}.png`.

**4.4, login idle without the button.** Produced by removing the two Google names from `.dev.vars`
and restarting the dev server, so the server half is exercised too rather than the client being fed
a false: `/api/auth-config` answers `{"google":false}` and the social call answers 404.
`document.querySelector('.login-google')` is `null`, `.login-actions` holds one child whose whole
text is "Sign in", the form holds no `svg`, and nothing marks the absence. The primary sits at the
same geometry it has in the configured run: x 475px, y 424.58px, 80.78x40 at 1280, and x 31px,
y 421.38px, 343x44 at 390, in both themes, with no horizontal overflow.
`document.getAnimations().length` is 0.

One deliberate difference from the shipped screen, which this row would otherwise claim away. The
primary is 80.78px wide rather than the 78.78px the phase 2 pass measured, because the 3.3
amendment reserves its 1px border at rest. That is the designer's ruling applied, it holds on every
screen, and it is the whole point of the fix. Everything else about the unconfigured login screen is
the shipped screen. Captures `google-sign-in-accept-08-button-absent-{light,dark}.png`.

**4.5, the mark.** 18x18 in every state read, `aria-hidden="true"`, four path fills
`rgb(66, 133, 244)`, `rgb(52, 168, 83)`, `rgb(251, 188, 5)`, `rgb(234, 67, 53)`, identical in light,
in dark, and while the button is disabled. In the disabled state only the button's own text and
border change colour; the background stays `rgba(0, 0, 0, 0)`.

**4.6, the quiet variant's contrast, measured.** On `--ground` in both themes:

| Pair | Light | Dark | Requirement |
| --- | --- | --- | --- |
| button text `--ink` on `--ground` | 14.59:1 | 15.57:1 | 4.5:1, WCAG AA text |
| button border `--border` on `--ground` | 3.29:1 | 4.19:1 | 3:1, WCAG 1.4.11 non-text |
| disabled text `--ink-faint` on `--ground` | 3.29:1 | 4.19:1 | 3:1, the floor 2.1 sets for `--ink-faint` |

Every pair clears its requirement in both themes.

**4.7, keyboard.** Four real Tab presses from `document.body`: `input#email`, `input#password`,
`button.btn-primary.login-submit` reading "Sign in", `button.btn-quiet.login-google` reading
"Continue with Google". Each computes `outline: 2px solid rgb(31, 111, 74)` at
`outline-offset: 2px`, which is the 2.4 ring in `--green`. With focus on the Google button, one real
Escape press produced no request, no busy state and no message, and left focus where it was. One
real Space press and, after a reload, one real Enter press each produced exactly one request, to
`/api/auth/sign-in/social`, and put the form into its busy state. With both fields filled and focus
in the email field, one real Enter press produced exactly one request, to `/api/auth/sign-in/email`,
and none to the social route; the refusal that followed read "Email or password is not right. Try
again." and moved focus to `input#email`.

**4.8, the busy state, and the row holding still.** With the social call held open: the form
computes `aria-busy="true"`, the Google button `aria-busy="true"` and `aria-disabled="true"` with
its label still reading "Continue with Google", `Sign in` `aria-disabled="true"` with its label
unchanged, and both `input#email` and `input#password` carry the `disabled` attribute. The Google
button's disabled appearance changes text and border only, to `rgb(124, 135, 127)` in light and
`rgb(111, 123, 115)` in dark, background unchanged, mark fills unchanged.

The reflow the phase 2 pass recorded is gone. `Sign in` measures 80.78px wide at rest and 80.78px
while disabled, and `Continue with Google` sits at x 567.78px in both states. Heights stay 40px.
`document.getAnimations().length` is 0 throughout, and the button computes
`transition-duration: 0s` and `animation-duration: 0s`. Captures
`google-sign-in-accept-03-google-busy-{light,dark}.png`.

**4.9, the four return outcomes.** Produced by visiting the app root with the `error` query set by
hand. All four render at `font-size: 15px`, which is `--t-body`, in the 3.8 position at the top of
the panel.

| Query | Rendered | Role | Colour, light | Colour, dark | Left rule | Focus |
| --- | --- | --- | --- | --- | --- | --- |
| `?error=access_denied` | "Google sign-in was cancelled. Sign in with your email, or try Google again." | `status` | `rgb(74, 87, 80)` (`--ink-soft`) | `rgb(167, 179, 171)` | `3px rgba(0, 0, 0, 0)`, block has no `panel-invalid` | `p.login-status` |
| `?error=state_mismatch` | "This sign-in link has expired. Start again from this page." | `alert` | `rgb(179, 38, 30)` (`--red`) | `rgb(242, 139, 130)` | 3px `--red` on the block | `p.form-alert` |
| `?error=account_not_linked` | "This Google account cannot be used here. Sign in with your email and password instead." | `alert` | `rgb(179, 38, 30)` | `rgb(242, 139, 130)` | 3px `--red` on the block | `p.form-alert` |
| `?error=invalid_grant` | "Google sign-in did not finish. Try again, or sign in with your email." | `alert` | `rgb(179, 38, 30)` | `rgb(242, 139, 130)` | 3px `--red` on the block | `p.form-alert` |

The `role` on the alert rows is on the permanent `div.alert-region` wrapper that holds
`p.form-alert`, which is the shipped 3.8 element; the status row's `role="status"` is on its own
sibling region in the same position.

The cancelled row was visited as
`/?error=access_denied&error_description=User%20denied%20access`. After the message painted,
`location.href` is `http://localhost:5173/` and `location.search` is the empty string, so both keys
are gone rather than the code alone, and `document.body.innerText` never contained the description
text. A reload of the cleaned URL renders the login with no alert element, no status element and no
`panel-invalid`. Captures `google-sign-in-accept-04-cancelled-{light,dark}.png`,
`google-sign-in-accept-05-expired-link-{light,dark}.png`,
`google-sign-in-accept-06-not-usable-{light,dark}.png`,
`google-sign-in-accept-07-did-not-finish-{light,dark}.png`.

**4.10, reduced motion.** Repeated in a Chrome launched with `--force-prefers-reduced-motion`, where
`matchMedia('(prefers-reduced-motion: reduce)').matches` is true. On load, while the Google button
is busy, and with the expired-link alert rendered, `document.getAnimations().length` is 0 every
time, and the button and the block both compute `transition-duration: 0s` and
`animation-duration: 0s`. The row holds still there too: `Sign in` is 80.78px wide and the Google
button keeps its x in both rest and busy. The same three readings in the ordinary Chrome, where the
preference is not set, are also 0.

**4.13, a social call that refuses.** Repeated with the call answering 404, 500 and 401 in turn. All
three re-enable the form (`aria-busy` absent, both fields enabled, neither button `aria-disabled`)
and show "Google sign-in did not finish. Try again, or sign in with your email." as an alert with
focus on `p.form-alert`. None showed the connection sentence; the 401 arrives as `SignedOutError`
and is still a response that arrived. With the `fetch` rejected as a `TypeError` before any
response, the same press shows "Could not reach Google. Check your connection and try again." with
focus on the same line.

**4.2, the stability guards, read against `c842f64`, the tree before the change began.**

| Guard | Reading |
| --- | --- |
| Password sign-in unchanged | `git diff --stat c842f64 -- tests/integration/auth.test.ts` empty, and the file passes in both phase 3 runs |
| Accounting untouched | `git diff --stat c842f64 -- src/domain migrations` empty |
| Server surface grows by one read only | the only added registration in `src/server/routes/` is `app.get('/api/auth-config', ...)` |
| No secret in the tree | no line of the whole diff assigns a value to either name; the two matches for the pattern are shell variable references in the G02 checkpoint's recorded commands, not values. `.dev.vars.example` carries the two names with empty values and one explanatory paragraph |
| The client id never reaches the bundle | `grep -rn "GOOGLE_CLIENT" src/client/` no match, and the endpoint returns a boolean |
| Scopes stay minimal | `grep -n "scope:" src/server/auth.ts` no match |
| No new dependency | `git diff --stat c842f64 -- package.json package-lock.json` empty |
| Suite green without secrets | phase 3 run A, `.dev.vars` moved aside, all four commands exit 0 |

## Phase 2

**2.7, the action row at 1280, both themes.** The block is 360px wide. `.login-actions` computes
`display: flex`, `gap: 12px` (`--s-3`), `flex-wrap: wrap`, `flex-direction: row`. Both buttons share
`top: 424.578px`, so one line: `Sign in` at left 475px width 78.78px, `Continue with Google` at left
565.78px width 209.09px, both height 40px. Both are intrinsic width and together occupy 299.87px of
the 360px block. The Google button computes `min-height: 40px`, `padding: 0px 16px`, `gap: 8px`
(`--s-2`), `border-radius: 4px`, `font-weight: 600`, `font-size: 15px`, background
`rgba(0, 0, 0, 0)`, and carries `type="button"`. In light its text is `rgb(23, 33, 27)` (`--ink`) on
a `1px solid rgb(124, 135, 127)` border (`--border`); in dark, text `rgb(232, 237, 230)` and border
`rgb(111, 123, 115)`, which are the same two tokens in their dark values. That is the quiet variant
of 3.3 in both themes, with no new token. The mark measures 18x18 with path fills
`rgb(66, 133, 244)`, `rgb(52, 168, 83)`, `rgb(251, 188, 5)`, `rgb(234, 67, 53)`, identical in both
themes, and carries `aria-hidden="true"`. Captures
`google-sign-in-login-present-{light,dark}.png`.

**2.8, stacked at 390.** `.login-actions` computes `flex-direction: column`, `align-items: stretch`,
`gap: 12px`. `Sign in` sits at top 421.375px and `Continue with Google` at top 477.375px, so Sign in
is first. Both are 343px wide, which is the full width of the row, and both are 44px high.
`document.documentElement.scrollWidth - clientWidth` is 0. Captures
`google-sign-in-login-stacked-{light,dark}.png`.

**2.9, tab order and Enter.** Four real Tab presses from `document.body`: `input#email`,
`input#password`, `button.btn-primary.login-submit` reading "Sign in", then
`button.btn-quiet.login-google` reading "Continue with Google". Every one of the four computes
`outline: rgb(31, 111, 74) solid 2px` at `outline-offset: 2px`, which is the 2.4 ring in `--green`.
With both fields filled and focus in the email field, one real Enter press produced exactly one
request, to `/api/auth/sign-in/email`, and no request to `/api/auth/sign-in/social`. The password
refusal that followed read "Email or password is not right. Try again.", moved focus to
`input#email` and put `panel-invalid` on the block, which is the shipped behaviour unchanged.

**2.10, the busy state.** With the social call held open and no navigation, the form computes
`aria-busy="true"`, the Google button `aria-busy="true"` and `aria-disabled="true"` with its label
still reading "Continue with Google", the `Sign in` button `aria-disabled="true"` with its label
unchanged, and both `input#email` and `input#password` are `disabled`. The Google button's disabled
appearance changes text and border only: colour `rgb(124, 135, 127)` (`--ink-faint`), border colour
`rgb(124, 135, 127)`, background still `rgba(0, 0, 0, 0)`, and the four mark fills unchanged.
`document.getAnimations().length` is 0 throughout. Released for real, the press left the page for
`accounts.google.com`. The authorize call itself answers 200 with host `accounts.google.com`, path
`/o/oauth2/v2/auth`, `scope=email profile openid`, `redirect_uri=http://localhost:5173/api/auth/callback/google`,
a `state`, and `code_challenge_method=S256`.

**2.11, a request that never reached the server.** With the social `fetch` rejected as a `TypeError`
before any response, the form re-enables (`aria-busy` absent, both fields enabled, both buttons
without `aria-disabled`) and the alert line reads "Could not reach Google. Check your connection and
try again." in `rgb(179, 38, 30)` (`--red`), with focus on `p.form-alert` and `panel-invalid` on the
block.

**2.15, an HTTP error from the social call.** Repeated with the social call answering 404, 500 and
401 in turn. All three re-enable the form and show "Google sign-in did not finish. Try again, or
sign in with your email." as an alert in `--red` with focus on the alert line. None of the three
showed the connection sentence, which is the ruling in the delta: the 401 arrives as
`SignedOutError` and is still a response that arrived.

**2.12, the four return outcomes.** Produced by visiting the app root with the `error` query set by
hand.

| Query | Rendered | Role | Colour | Left rule | Focus |
| --- | --- | --- | --- | --- | --- |
| `?error=access_denied` | "Google sign-in was cancelled. Sign in with your email, or try Google again." | `status` | `rgb(74, 87, 80)` (`--ink-soft`) | `0px`, block has no `panel-invalid` | `p.login-status` |
| `?error=state_mismatch` | "This sign-in link has expired. Start again from this page." | `alert` | `rgb(179, 38, 30)` (`--red`) | 3px `--red` on the block | `p.form-alert` |
| `?error=account_not_linked` | "This Google account cannot be used here. Sign in with your email and password instead." | `alert` | dark run: `rgb(242, 139, 130)` (`--red` dark) | 3px `--red` on the block | `p.form-alert` |
| `?error=invalid_grant` | "Google sign-in did not finish. Try again, or sign in with your email." | `alert` | `rgb(179, 38, 30)` | 3px `--red` on the block | `p.form-alert` |

All four render at `font-size: 15px`, which is `--t-body`. Captures
`google-sign-in-login-cancelled-{light,dark}.png` and
`google-sign-in-login-not-linked-{light,dark}.png`.

**2.13, the query afterwards.** Visited as
`/?error=access_denied&error_description=User%20denied%20access`. After the message painted,
`location.href` is `http://localhost:5173/` and `location.search` is the empty string, so both keys
are gone rather than the code alone. `document.body.innerText` never contained the description text.
A reload of that cleaned URL renders the login with no alert element, no status element and no
`panel-invalid`.

**2.14, no Google value set.** Produced by answering `/api/auth-config` with `{"google": false}`
before the app booted, which is the one input the client reads. `document.querySelector('.login-google')`
is `null`, `.login-actions` holds one child, its whole text content is "Sign in", the form holds no
`svg`, and nothing else marks the absence. The primary sits at exactly the geometry it has in the
configured run, x 475px, y 424.578px, width 78.78px, height 40px, so the two states differ only by
the button that is not there. The configuration read runs inside the same `Promise.all` as the
session read, so the login screen has no intermediate paint to shift from.
`document.getAnimations().length` is 0. Captures `google-sign-in-login-absent-{light,dark}.png`.

**Reduced motion.** Repeated in a Chrome launched with `--force-prefers-reduced-motion`, where
`matchMedia('(prefers-reduced-motion: reduce)').matches` is true. The Google button computes
`transition-duration: 0s` and `animation-duration: 0s`, and `document.getAnimations().length` is 0
on load and 0 again while the button is busy.

## One thing the delta does not decide

**The primary grows 2px when it takes its 3.3 disabled border, and the row absorbs it.** Measured
with the social call held open: `Sign in` goes from 78.78px wide at rest to 80.78px while disabled,
because 3.3 gives the primary `border: 0` at rest and `1px solid --border` when disabled, and the
button is intrinsically sized, so the border adds to its shrink-to-fit width whatever `box-sizing`
says. `Continue with Google` therefore starts 2px further right, from x 399.78px to x 401.78px, for
as long as the form is busy. Both heights stay at 40px and nothing animates. This is the shipped
3.3 rule working as written; it was invisible before this change only because the primary had no
neighbour. It is recorded rather than fixed, because the fix would be a rest-state change to a
shipped variant and the delta does not rule on it. The question is written into
`context/checkpoints/g03-phase2-client.md`.
