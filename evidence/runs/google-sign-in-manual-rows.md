# google-sign-in manual rows, measured in a browser

Driven with Chrome over the DevTools protocol against `npm run dev` on the local D1 database, with
the real `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` pair in the ignored `.dev.vars`. Every claim
below is a value read from the live page, with the property it came from named. The AeroSpace tiling
manager blocks window resizes, so both widths are device emulation at a device scale factor of 2
rather than window sizing. No credential value appears in this file or in any capture.

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
