# visual-redesign section index: the current item after a click

Browser verification of implementation-review finding F1 and of the design-spec 4.4 amendment that
answers it: the current item is the last section whose heading top is at or above 117px, one pixel
below the 116px `scroll-margin-top` a click scrolls to.

Driven with Chrome over the DevTools protocol against `npm run dev` on the local D1 database, signed
in as a synthetic account created through the gated dev seed route. Every number below is read from
the live page: `getBoundingClientRect().top` for the heading, the index item carrying
`aria-current="true"` for the mark.

## Desktop, 1280 by 900 at a 2x device pixel ratio

`scroll-margin-top` computes 116px on every section heading. Page height 3269px, scrollable 2369px.

| Index item clicked | Heading top after the scroll | Item marked current |
| --- | --- | --- |
| Participants | 116.25px | Participants |
| Price history | 116.38px | Price history |
| Skipped months | 116.25px | Skipped months |
| Payments received | 116.03px | Payments received |
| Standing orders | 264.06px | Payments received |

Every heading a click can reach lands between 116.0px and 116.4px: above the line the shipped code
watched at 100px and below the 117px line, which is exactly the 16px window the finding names. Under
the old offset the same rule leaves each of these four headings unreached, so the previous section
stays marked, which is what the accepted capture shows.

The fifth row is not the defect. Standing orders is the last section, the document had already
scrolled to its end, and its heading top stays at 264px, so the rule marks Payments received. That is
what design-spec 4.4 prescribes, not a miss.

## Narrow, 375 by 812 at a 2x device pixel ratio

Page height 4317px, scrollable 3505px. `document.scrollWidth - document.clientWidth` is 0, so nothing
scrolls horizontally.

| Index item clicked | Heading top after the scroll | Item marked current |
| --- | --- | --- |
| Participants | 115.72px | Participants |
| Price history | 115.84px | Price history |
| Skipped months | 115.84px | Skipped months |
| Payments received | 115.88px | Payments received |
| Standing orders | 116.28px | Standing orders |

All five, the last section included: the column is tall enough here for its heading to reach the
line.

## Keyboard activation

Focus moved to the Price history index item with a real Tab, activated with a real Enter: the heading
landed at 116.38px, the item took `aria-current="true"`, and focus stayed on the item rather than
moving to the heading.

## Scrolling in both directions

Stepping the desktop page 150px at a time from top to bottom marks Participants, Price history,
Skipped months, Payments received in that order, and the reverse walk marks the same four in reverse.
No item is skipped and none is marked twice.

## Reduced motion

Repeated in a second Chrome launched with `--force-prefers-reduced-motion`, where
`matchMedia('(prefers-reduced-motion: reduce)')` matches and all five motion custom properties read
`0ms`. The four reachable sections mark exactly as above, `document.getAnimations()` stays at zero
through every click, and `scroll-behavior` computes `auto` in both modes, so no smooth scroll is
involved in either.

## Captures

| File | What it shows |
| --- | --- |
| `evidence/screenshots/impl-review-f1-index-current-desktop-light.png` | 1280, light: Payments received clicked, its heading at the top of the column and its own index item underlined |
| `evidence/screenshots/impl-review-f1-index-current-desktop-dark.png` | the same state in dark |
| `evidence/screenshots/impl-review-f1-index-current-mobile-light.png` | 375, light: Standing orders clicked, its own item current |
| `evidence/screenshots/impl-review-f1-index-current-mobile-dark.png` | the same state in dark |

The accepted capture `redesign-22-index-current-item-light.png` and its mobile pair predate this fix
and show the superseded behaviour the finding describes. They are left as they were taken, because
the acceptance set records what the designer reviewed; these four captures are the current behaviour.
