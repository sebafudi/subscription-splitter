# visual-redesign keyboard and forced-state record

The keyboard pass of design-spec 11.6, walked in a real browser against `npm run dev` on the local
D1 holding synthetic fixtures only, signed in as the seeded development account. Every step below
was driven with real key events through the browser, not by calling click handlers, so the tab order
and the focus destinations are the browser's own.

Viewport 1280x900, light theme, reduced motion off, on the "Family plan" subscription.

## Tab through the detail screen

Eight consecutive Tab presses from the Participants heading-row button walked, in order: the first
participant's Edit, Archive and Delete, then the second participant's Edit, Unarchive and Delete,
then the third participant's Edit and Archive. Every stop computed `2px solid rgb(31, 111, 74)`,
which is `--green`, at `outline-offset: 2px`, which is the one focus style of design-spec 2.4.

Structural checks in the same session:

- No element in the document carries a positive `tabindex`; the count is zero, so nothing reorders
  the tab sequence and nothing traps.
- All five section headings carry `tabindex="-1"`: `participants`, `price-history`,
  `skipped-months`, `payments-received`, `standing-orders`. They are focus destinations after a
  delete, never tab stops.

## Open a panel, then Escape it

- Focus on the Participants heading-row button, Enter: the disclosure opened
  (`data-open="true"`) and focus moved to the panel's first field, `member_new_name`.
- Escape: the panel closed (`data-open="false"`), its inner element took `inert`, and focus returned
  to the heading-row button `participant-add-button` as it remounted.

## Delete with Keep

- Focus on a participant's Delete, Enter: the confirmation strip opened reading "Delete Bo? Their
  payments stay recorded." with Delete and Keep, and focus was on Keep.
- Enter on Keep: the strip closed, the participant was still listed, and focus returned to that
  entry's own Delete button.

## Delete with Delete

- Focus on the throwaway participant's Delete, Enter: the strip opened with focus on Keep.
- Shift+Tab: focus moved to the strip's destructive Delete (`class="btn-destructive"`).
- Enter: the row was removed and focus moved to the section's `h2` (`id="participants"`,
  `tagName` H2). Focus did not reach `document.body` on this or any other path walked above.

## Section index current-item tracking, design-spec 11.7

Walked on "Payments walkthrough", whose column is tall enough to scroll through all five sections,
at 1280 and again at 390.

- Scrolling down until the Payments received heading sat at 160px left "Skipped months" as the
  `aria-current="true"` item, which is correct: the observer marks the last heading to have crossed
  the visible top at 100px, and Payments received had not yet crossed it.
- Scrolling back up moved `aria-current` back through the list in the same order.
- Clicking an index item scrolled its heading to exactly 116px from the viewport top, measured at
  both widths, which is the app bar's 56px plus the index's 44px plus `--s-4`.
- At 390 the index itself scrolls horizontally (`scrollWidth > clientWidth`) while the page does not
  scroll horizontally at all.

## Reduced motion on and off, design-spec 2.5

Reduced motion was not emulated by injecting CSS. Chrome was relaunched headless with
`--force-prefers-reduced-motion`, so `matchMedia('(prefers-reduced-motion: reduce)').matches` was
genuinely `true` and the stylesheet's own `@media (prefers-reduced-motion: reduce)` block applied.
The pass was then repeated with a normally launched Chrome, where the same query was `false`.

| Motion | Reduced motion on | Reduced motion off |
| --- | --- | --- |
| Disclosure | `--motion-disclosure-open: 0ms`; `grid-template-rows` went 0px to 384.312px within 20ms | `180ms`; `grid-template-rows` went 0px, 6.4375px at 20ms, 344.969px at 120ms, 384.312px settled, transitioning `grid-template-rows` and not `max-height` |
| Entry highlight | `--motion-highlight: 0ms`; the row had zero running animations and a static `--green-tint` background, cleared by the same timer that clears the status line | `1200ms` with a `200ms` delay, `animation-name: entry-highlight`, sampled mid-run at 367ms with `rgba(221, 235, 225, 0.863)` |
| Status line | `--motion-status-in: 0ms` and `--motion-status-out: 0ms`, so it appears and dismisses instantly | `status-line-in` at `120ms`, `status-line-out` at `200ms` |

All five motion custom properties read `0ms` under reduced motion and their specified values without
it. Nothing animated on load in either mode.

## The 409 no-owner state was forced, not produced through the API

Capture row 11, `redesign-11-detail-no-owner-light.png` and `redesign-11-detail-no-owner-dark.png`,
does not show a state the product can reach on a local database, exactly as `research.md` records.
It was forced during a dev session by intercepting `window.fetch` in the page so that
`GET /api/subscriptions/:id/summary` answered 409 with the server's own no-owner message; nothing on
the server or in `src/client/` was changed to produce it, and the interception lived only in that
page. The screen rendered is the client's real `status: 'no-owner'` branch. The prior capture
`evidence/screenshots/detail-no-owner-state.png` shows the old design and remains a reference for the
state's content only.

Two other captures were produced the same way, and for the same reason, because no product route can
fail on demand: row 07 `home-load-error`, by refusing `GET /api/subscriptions` with a 500, and row 10
`detail-error`, by refusing the same summary call with a 500. Row 02 `login-submitting` was produced
by holding the sign-in request open rather than by slowing the network.

Two captures hold a state that expires on a timer so that both themes could be photographed from one
action. Row 18 `section-success` paused the entry-highlight animation at 300ms of its 1200ms run
through the Web Animations API, which freezes a real frame of the real animation at its real
duration. Row 23 `reduced-motion` additionally suppressed the status line's own 4000ms dismissal
timer, because under reduced motion the highlight is a static background that the same timer clears,
and the two tool round trips needed to photograph both themes take longer than four seconds. Nothing
else was altered in either case.

## Data created and reverted

The captures were taken against the two seeded subscriptions. Three throwaway participants named
"Zoe" were created and deleted again to photograph the success state, the reduced-motion state and
the keyboard delete. One standing order was moved from sie 2026 to lip 2026 and one of its months was
marked not received, so that a single entry could show all three tile states at once for row 21; both
changes were made through the product's own routes and both were reverted.

Verified afterwards through the API: "Family plan" holds Organizer, Bo, Cleo and Ada, one price, the
break month 2026-08, no payments and no standing orders; "Payments walkthrough" holds Organizer,
Alice and Bob, two prices, the break month 2026-07, two payments and its two standing orders at
1000 from 2026-07 excepting 2026-08 and 5500 from 2026-08 excepting nothing. That is the state the
session started in.

No console error or warning was logged during the whole phase 6 session.
