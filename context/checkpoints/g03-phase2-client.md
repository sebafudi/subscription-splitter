# g03-phase2-client

Phase 2 of change `google-sign-in` (roadmap S-07, goal G03): the login screen, built to
`context/changes/google-sign-in/design-delta.md`. Client only. Nothing under `src/server/`,
`src/domain/`, `migrations/` or `tests/integration/` was touched by this task.

## What landed

- `src/client/api.ts` gains `getAuthConfig()`, which resolves to `{ google: false }` on any rejection
  rather than throwing the screen away, and `startGoogleSignIn()`, which posts `provider`,
  `callbackURL` and `errorCallbackURL` to `/api/auth/sign-in/social` over the existing `request()`
  helper. No new dependency and no Better Auth client SDK.
- `src/client/App.tsx` runs the session read and the configuration read in one `Promise.all` behind
  the unchanged 4.2 loading screen, and holds `googleEnabled` in its own state so a later sign-out
  repaints without a second request. `Login` takes it as a prop.
- `src/client/components/GoogleMark.tsx` is Google's unmodified four-colour "G" as an inline SVG at
  18px square, `aria-hidden`, in its own colours in both themes and in the disabled state.
- `src/client/components/ui/googleErrors.ts` holds the pure return-leg logic: `googleReturnNotice`
  mapping the `error` code to one of the four sentences with its tone, `GOOGLE_CONNECTION_FAILURE`,
  `startFailureMessage` choosing between it and the did-not-finish sentence, and
  `loginUrlWithoutQuery` for the cleanup. It does not import `CONNECTION_FAILURE`.
- `src/client/screens/Login.tsx` grows the action row, the Google button with its busy and disabled
  behaviour, the return-leg read on mount with focus to the message line, and the `replaceState`
  cleanup. The password path is unchanged.
- `src/client/index.css` gains `.login-actions`, the mark sizing inside a quiet button, `.login-status`
  and the stacking rule below 640px. No new colour token and no new button variant.
- `src/client/components/ui/googleErrors.test.ts` adds fifteen node-environment cases in the style of
  `apiMessages.test.ts`: one per mapping row plus unknown and missing codes, both start-failure
  branches with all three HTTP statuses, and the url cleanup including a fragment and a clean url.

## Commits

| Commit | What |
| --- | --- |
| `cf3e3de` | `feat(google-sign-in): add the google button to the login screen` |
| `e6b3dab` | `test(google-sign-in): pin the return sentences and the url cleanup` |

Evidence and the Progress ticks follow in their own commits. All pushed.

## Gates

`npm run typecheck` clean across all three projects. `npm test` green: unit 18 files and 214 tests,
integration 12 files and 119 tests, re-run after phase 1 landed. `npm run build` succeeds.
`grep -rn "GOOGLE_CLIENT" src/client/` and `grep -rn "error_description" src/client/` both return
nothing. Output in `evidence/runs/google-sign-in-gates.txt` under "Phase 2".

The browser pass covered every Phase 2 manual row, at 1280 and 390, in light and in dark, with real
credentials in the ignored `.dev.vars`, plus a reduced-motion repeat. Computed values are recorded in
`evidence/runs/google-sign-in-manual-rows.md`. Captures, all at a device scale factor of 2:

- `evidence/screenshots/google-sign-in-login-present-{light,dark}.png`
- `evidence/screenshots/google-sign-in-login-absent-{light,dark}.png`
- `evidence/screenshots/google-sign-in-login-stacked-{light,dark}.png`
- `evidence/screenshots/google-sign-in-login-cancelled-{light,dark}.png`
- `evidence/screenshots/google-sign-in-login-not-linked-{light,dark}.png`

No credential value reached any file, any capture or any recorded URL.

## Progress rows

2.1 and 2.3 through 2.15 are ticked. **2.2 is left pending on purpose.** It reads "The whole suite
passes with no test file changed in this phase", and this task added `googleErrors.test.ts` by
instruction rather than leaving the mapping unasserted until phase 3. The suite does pass; the row as
worded does not describe what happened. Whoever runs phase 3 should tick it, or the lead should
re-word it, rather than this task ticking a row it contradicted. Rows 3.2 and 3.16 are already
satisfied by that file and were left for the phase 3 owner to claim.

## Two readings recorded rather than improvised

**Disabled means `aria-disabled`, not the `disabled` attribute, for both buttons.** The delta says
both buttons are disabled "per 3.3", and 3.3 says disabled buttons stay focusable with
`aria-disabled="true"` and a handler that returns early. The shipped `Sign in` button already works
that way, and the plan says the password path is unchanged. So both buttons take `aria-disabled` and
a guard, and only the two fields take the `disabled` attribute. Tab still reaches the Google button
while the form is busy, which is what 3.3 asks for.

**The cleanup drops any query rather than testing for the two keys by name.** The delta and the plan
both say the whole query goes, on either key. Testing for `error_description` by name would put that
string under `src/client/`, which stability guard 2.5 forbids. Dropping a non-empty query outright
satisfies both, and the login route is the app root of a screen with no router and no other query.

## Open design question, one detail

**When the form is busy, the primary grows 2px and pushes the Google button 2px right.** Design-spec
3.3 gives the primary `border: 0` at rest and `1px solid --border` when disabled. The button is
intrinsically sized, so that border adds 2px to its width: `Sign in` measures 78.78px at rest and
80.78px while disabled, and `Continue with Google` starts at x 399.78px and moves to x 401.78px for
as long as the form is busy. Heights stay 40px and nothing animates. The rule is the shipped 3.3
rule working as written; it was invisible before this change only because the primary had no
neighbour in the row.

The delta does not rule on it. It says the busy and disabled states change immediately and that no
motion is added, and it does not say whether the row is allowed to reflow when the primary takes its
disabled border. **The question for the designer: should the action row hold still while the form is
busy, and if so, does the primary carry a transparent 1px border at rest so its box never changes,
which is a rest-state change to a shipped variant that touches every screen, or does the row reserve
the width some other way?** Nothing was improvised: the behaviour is left as 3.3 produces it and
recorded in `evidence/runs/google-sign-in-manual-rows.md`.

## Not done here

No deploy, no course upload, no live Google roundtrip on a deployed origin. The local press does
reach Google's consent screen over the local origin, which is as far as local work goes; that is
goal G05. `context/STATUS.md`, `evidence/index.md`, the workspace goals file and `design-delta.md`
were not touched.
