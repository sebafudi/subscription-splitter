# Design delta: Google sign-in on the login screen

Designer: Fable 5.1, applying the frontend-design skill to the accepted visual specification at
`context/changes/visual-redesign/design-spec.md`. This delta amends that specification for change
`google-sign-in` (roadmap S-07). Everything not named here is unchanged. Implementers apply this
delta as written; a missing or infeasible detail goes back to the designer through a checkpoint,
not into an improvised choice. Section numbers below refer to the design specification.

## Direction

The login screen keeps its one job: get the organizer into their ledger. Google is a second door
into the same room, not a feature. So the affordance is one more button in the existing action
row, in the existing quiet variant, carrying Google's own mark and nothing else new. No divider, no
"or" line, no card, no second heading, no new colour token. The hierarchy already in 3.3 says what
matters: the filled primary is the default, the quiet button beside it is the alternative.

## Ruling on D-013 (account linking)

Accepted as recommended by the research: `disableImplicitLinking: true`, `google` not in
`trustedProviders`. A Google identity whose email matches an existing password account is refused
with `account_not_linked`. A Google identity with a new email creates its own account and its own
empty ledger, never touching the seeded demo owner. Manual linking from inside the app is out of
scope for S-07. Rationale: the seeded accounts are reviewer and demo credentials whose ownership
must stay provable; a refusal is reversible, an unintended merge is not.

## 4.1 Login (amended)

Replace the last bullet, "No link to anything else; there is no registration.", with:

"No link to anything else. A Google account can sign in; on its first visit it gets its own empty
ledger. There is no password registration."

Amended block (desktop, 360px content block, left aligned, block centred, 20vh from the top):

```
[glyph] Subscription Splitter                       t-title, glyph 28px
Sign in to your ledger.                             t-body ink-soft

Email
[                                              ]
Password
[                                              ]
[Sign in]  [G  Continue with Google]                primary, then quiet with mark
```

Below 640px the two buttons stack, full width, `Sign in` first, gap `--s-3`, both 44px high:

```
[Sign in                                       ]
[G  Continue with Google                       ]
```

- The action row is a flex row, gap `--s-3`, wrapping allowed; at 640px and above both buttons are
  intrinsic width and sit on one line inside the 360px block (if the label does not fit on one
  line at 360px in the loaded typeface, the row wraps and the Google button drops under the primary,
  left aligned, still intrinsic width; do not shrink the label or the padding).
- DOM and tab order: email, password, Sign in, Continue with Google. The Google button is
  `type="button"` inside the same form so Enter in a field still submits the password form.
- When the deployment has no Google credential the Google button is not rendered and nothing marks
  its absence; the row holds the primary alone, exactly as today.

## Google button appearance

- Variant: quiet, per 3.3 in every state (rest transparent, text `--ink`, 1px `--border`; hover
  border `--ink`; active ground `--paper`; disabled text `--ink-faint`, border `--border`,
  `aria-disabled`). Radius 4px, min height 40px (44px below 640px), padding `0 var(--s-4)`,
  `--t-body` weight 600. Focus ring per 2.4.
- Content: Google's four-colour "G" mark as an inline SVG, 18px square, then a gap of `--s-2`, then
  the label "Continue with Google". The mark is Google's unmodified brand asset in its own colours
  in both themes; it is exempt from the palette in 2.1 and is never recoloured, outlined or given a
  background. In the disabled state only the text and border change; the mark keeps its colours.
- The label is exactly "Continue with Google" everywhere (button, copy, tests). Not "Sign in with
  Google", because the same button serves first visits and returns.

## Busy state and the redirect

- On click, the Google button gets `aria-busy="true"` with its label unchanged, the whole form gets
  `aria-busy="true"`, and both fields and both buttons are disabled per 3.3, until the browser
  leaves for Google. No spinner, no copy change.
- If the request that produces the Google URL fails before any navigation, the form re-enables and
  the generic alert of 3.8 shows "Could not reach Google. Check your connection and try again.",
  focus on the alert line.
- The password submit path is unchanged; while it is busy the Google button is disabled with the
  rest of the form.

## 4.2 Session loading (return leg)

The return from Google lands on the app root and reuses the 4.2 session loading screen unchanged
(wordmark app bar, one static skeleton bar, `sr-only` "Loading your session"). No Google-specific
interstitial. The unauthenticated read that tells the client whether Google is configured runs
during this same loading phase, in parallel with the session read, so the login screen paints with
its final action row and never shifts. If that read fails, treat Google as not configured.

## Outcomes on return with an error

Every error return lands on the login screen with a message in the existing alert position at the
top of the panel (3.8). The client maps the `error` code to one of four sentences; it never shows
`error_description`. After rendering the message the client removes the error query from the URL
with `history.replaceState` so a reload shows a clean login. Focus moves to the message line.

| Code | Treatment | Copy |
| --- | --- | --- |
| `access_denied` | informational: `role="status"`, `--t-body` colour `--ink-soft`, no red rule | "Google sign-in was cancelled. Sign in with your email, or try Google again." |
| `state_not_found`, `state_invalid`, `state_mismatch` | alert per 3.8: `role="alert"`, `--red`, 3px left rule `--red` | "This sign-in link has expired. Start again from this page." |
| `account_not_linked` | alert per 3.8 | "This Google account cannot be used here. Sign in with your email and password instead." |
| any other code, or a failed exchange | alert per 3.8 | "Google sign-in did not finish. Try again, or sign in with your email." |

The `account_not_linked` sentence is identical whatever the reason for the refusal, so it confirms
nothing about whether an account with that address exists.

## Home for a Google-created account

Unchanged. The existing Home empty state, "No subscriptions yet. Add the first one to start tracking
who pays.", is already the invitation; no onboarding hint, banner or name greeting is added.

## 7 and 8, keyboard and responsive

- Tab reaches the Google button after Sign in; Enter and Space activate it; the focus ring is the
  2.4 ring. Escape does nothing on the login screen, as today.
- Responsive rule is the stacking described in 4.1 above. Nothing else in section 8 changes.

## 2.5 Motion

No motion is added. The busy and disabled states change immediately, as every button state does.

## 9 Copy

New sentences introduced by this delta, all sentence case, all listed above: the button label, the
connection sentence, and the four outcome sentences. No other copy changes.

## 11 Acceptance checklist (amended)

Item 1 becomes: "Login idle with and without the Google button, submitting, 401 error, Google button
busy, cancelled (status line), expired link, account not usable, and did not finish (alert lines)."
Add item 10: "Google button: mark unmodified in both themes, quiet variant contrast per 2.1,
button row on one line at 1280 and stacked at 390, tab order email, password, Sign in, Google."

Certification captures: the optional login capture shows the login screen with the Google button
present. No other form slot changes.

## Answer index to frame.md

1. 4.1 amended in place; replacement sentence above.
2. Beside the primary in one action row at 640px and above, stacked below it under 640px; no
   divider and no "or".
3. Quiet variant with Google's unmodified mark; reads as the alternative next to the filled primary.
4. Busy per 3.3 with no copy change; the password form is disabled meanwhile; the return leg reuses
   4.2 unchanged.
5. Four sentences in the 3.8 alert position, cancellation as a status line rather than an alert;
   focus to the message line; `error_description` never shown.
6. No onboarding hint.
7. Stacked full width under 640px, Sign in first.
8. Nothing marks the absence; no shift because the configuration read completes during 4.2.
9. Checklist item 1 extended and item 10 added; the optional login certification capture shows the
   button.
