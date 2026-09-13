# visual-redesign manual rows, re-measured in a browser

Implementation-review finding F4 says that roughly nineteen manual Progress rows rest on prose
recorded under "Measured during the same session rather than captured", with no computed value a
third party can re-derive. This file answers that: every claim below is a value read from the live
page, with the property it came from named.

Driven with Chrome over the DevTools protocol against `npm run dev` on the local D1 database, signed
in as a synthetic account created through the gated dev seed route and populated through the app's
own API with fixture participants, prices, a break month, payments and one standing order. Real key
events are dispatched through the protocol where the row is about the keyboard; everything else is a
read of computed style, geometry or rendered text.

## Phase 1

**1.9, the focus ring.** Forty-five consecutive Tab stops on the detail screen, every one a native
`button` or `select`, computed `outline` `2px solid rgb(31, 111, 74)` at `outline-offset` `2px`. That
is one distinct ring across all forty-five stops, and `rgb(31, 111, 74)` is `--green`. Focus never
reached `document.body` during the walk. On Login the same three-stop walk gives the same ring on
both fields and the button.

**1.11, the font requests.** `performance.getEntriesByType('resource')` filtered to `.woff2` on the
Login screen returns `ibm-plex-sans-latin-400-normal.woff2` and `ibm-plex-sans-latin-600-normal.woff2`,
both from `location.origin`. Requests to any other origin: zero. The two latin-ext faces are absent
here and load only once `zł` is on screen, which is what the `unicode-range` split is for.

**1.12, nothing animates on load.** `document.getAnimations().length` is 0 immediately after the
Login screen loads with motion on, and 0 again in a Chrome launched with
`--force-prefers-reduced-motion`, where `matchMedia('(prefers-reduced-motion: reduce)').matches` is
true and `--motion-disclosure-open`, `--motion-disclosure-close`, `--motion-highlight`,
`--motion-status-in` and `--motion-status-out` all read `0ms`.

## Phase 2

**2.12, tab order on Login.** Four real Tab presses from the top of the document: `input` Email,
`input` Password, `button` Sign in, then `document.body`, and the fifth returns to Email. Three stops,
in the specified order, each with the ring above, and no trap.

## Phase 3

**3.9, focus after the create panel closes.** Opening New subscription puts focus on the `input`
labelled Name. Escape returns focus to the `button` "New subscription", which then reads
`aria-expanded="false"`. Cancel returns focus to the same button. A successful create returns focus
there too, recorded under 3.11.

**3.10, the Currency and Locale pair.** At 1280 both controls have `getBoundingClientRect().top` of
294px and sit side by side at left 329px and left 648px, each 303px wide: one row. At 375 they share
left 41px and width 293px at tops 306px and 389px: stacked, each spanning the column, with
`document.scrollWidth - document.clientWidth` at 0.

**3.11, what a create does.** Sampled 400ms after the submit: the section status line reads
"Subscription created"; the new row carries the `entry-highlight` animation with a duration of 1200ms
and a delay of 200ms; focus is on the "New subscription" button; the `h1` still reads "Your
subscriptions", so the screen stays on Home. The disclosure wrapper computes
`grid-template-rows: 0px` with its inner element at height 0 and `inert` true, which is the panel
closed. This is the behaviour design-spec 4.3 prescribes, and the Progress row now says so.

**3.12, a refused create.** Submitting with the Name field emptied leaves the panel open, moves focus
to that `input`, sets `aria-invalid="true"` on it and points its `aria-describedby` at one message
reading "Name must not be empty". The sentence carries the mapped label Name, not the wire name, and
it is the only message rendered.

## Phase 4

**4.9, the summary sentence.** Rendered text: "wrz 2026 costs 240,00 zł. Your net cost since the plan
started is 1273,90 zł, against a plan total of 1830,00 zł. You are on this plan as Organizer." Months
come through the formatter, and `main p strong, main p b` counts 0, so no span inside it is bold.

**4.10, the section index.** Re-measured in full in `visual-redesign-index-current-item.md`.

**4.13, a second edit panel.** With an edit panel open on the first participant and "Typed but
discarded" in its Name field, opening a second participant's edit removes the first panel from the
document. Reopening the first shows `value` "Celina", the stored name, so what had been typed is
gone.

**4.18, a reload after an edit.** Sampled 150ms after an archive, while the refetch is in flight: the
four ledger values still read "60,00 zł", "60,00 zł", "52,50 zł of 180,00 zł" and "4", the count of
skeleton elements anywhere in `main` is 0, and the acting section's status line already reads
"Participant archived".

**4.19, Archive and Unarchive.** Before the action the entry's buttons are Edit, Archive, Delete;
after it they are Edit, Unarchive, Delete with the status line "Participant archived", and after
Unarchive they are Edit, Archive, Delete with "Participant unarchived".

**4.21, the section alert.** A refused delete puts "this member has records attached and is archived
rather than deleted" in the Participants section alert with a Dismiss beside it, and the confirm
strip is closed. Dismiss empties the alert. No other section holds an alert at any point.

**4.23, focus around a delete.** Opening the strip moves focus to Keep. Keep returns focus to that
entry's own Delete. A completed delete moves focus to the `h2` "Participants", whose `tabIndex` is
-1, with the status line reading "Participant deleted". Focus never reaches the body on any of these
paths.

## Phase 5

**5.10, the three payment sentences.** Recording gives "Payment recorded", editing the amount gives
"Changes saved", deleting gives "Payment deleted", each read from the Payments received section's own
status line.

**5.14, the tile phrases.** The nine tiles of the one standing order render three distinct states:
`tile tile-counted` reading "52,50 zł assumed received", `tile tile-excluded` reading "the plan was
paused that month", and `tile tile-not-received` reading "marked as not received". Each phrase stands
alone with no prefix, and no two states share a phrase.

**5.15, toggling one month.** Marking maj 2026 as not received changes exactly one of the nine tiles,
by index and by text. The section's assumed total falls from 420,00 zł to 367,50 zł, one month of the
52,50 zł order, and the summary's collected cell holds at "52,50 zł of 180,00 zł", because an assumed
month is not a recorded receipt.

**5.16, two failures in their own alerts.** With the break month deleted from the database behind the
page's back, Unskip renders "not found" in the Skipped months section alert and nowhere else; Dismiss
empties it. With the schedule deleted the same way, a tile toggle renders "not found" in the Standing
orders section alert and nowhere else; Dismiss empties it. In both cases a sweep of every section for
`[role="alert"]` content finds exactly one non-empty alert, the acting section's.
