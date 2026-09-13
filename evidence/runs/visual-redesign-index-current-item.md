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

The accepted capture `redesign-22-index-current-item-light.png` and its mobile pair showed the
superseded behaviour when they were first taken. They were retaken against the end-of-document rule
below, at the widths and themes of the originals, so the acceptance set now shows what ships.

The four `impl-review-f1-index-current-*` files themselves were retaken for re-verification finding
R1 (`impl-review.md`, `## Re-verification`), whose first pass mismatched three of the four against
this table: the mobile-dark file showed the Home list at desktop width, the desktop-dark file was off
the set's dimensions, and the light and dark desktop pair both rendered dark. Retaken against the same
populated subscription with Chrome over the DevTools protocol against `npm run dev`, signed in as the
seeded owner: desktop at 2560 by 1800 (1280 by 900 at 2x), mobile at 750 by 1624 (375 by 812 at 2x),
each pair light via `prefers-color-scheme: light` and dark via `prefers-color-scheme: dark`. Verified
after saving with `sips -g pixelWidth -g pixelHeight` and by reading each file: the desktop pair shows
Payments received clicked and current, the mobile pair shows Standing orders clicked and current, and
all four now match this table's descriptions above.

## Follow-up: the end-of-document rule

Design-spec 4.4 gained the end-of-document rule after this record was first written: when the
viewport bottom is within 1px of the document's scroll height, the last item is current wherever its
heading sits. `SectionIndex.tsx` implements it alongside the 117px line and carries it on a passive
`scroll` listener, because no heading crossing announces the end of the document.

Re-driven the same way, against the same synthetic account and the same populated subscription, whose
five sections are Participants, Price history, Skipped months, Payments received and Standing orders.

### Desktop, 1280 by 900 at a 2x device pixel ratio

Page height 2328px, viewport 900px, so 1428px of scroll. `scroll-margin-top` computes 116px on every
section heading.

| Index item clicked | Heading top after the scroll | Document at its end | Item marked current |
| --- | --- | --- | --- |
| Participants | 116.25px | no | Participants |
| Price history | 115.81px | no | Price history |
| Skipped months | 115.69px | no | Skipped months |
| Payments received | 116.47px | no | Payments received |
| Standing orders | 280.03px | yes | Standing orders |

All five, the last one included. Scrolling to the bottom without clicking anything gives the same
mark: `scrollHeight - (innerHeight + scrollY)` is 0 and Standing orders carries `aria-current="true"`
while its heading top reads 280.03px, which is the case the previous record had to disclose as
unreachable.

### Narrow, 375 by 812 at a 2x device pixel ratio

Page height 3029px, `document.scrollWidth - document.clientWidth` 0, so nothing scrolls horizontally.

| Index item clicked | Heading top after the scroll | Document at its end | Item marked current |
| --- | --- | --- | --- |
| Participants | 115.72px | no | Participants |
| Price history | 116.41px | no | Price history |
| Skipped months | 116.41px | no | Skipped months |
| Payments received | 116.44px | no | Payments received |
| Standing orders | 115.81px | no | Standing orders |

Unchanged: the column is tall enough here that the 117px line reaches every heading on its own and
the new rule never has to fire. Scrolled to the bottom, Standing orders stays marked.

### Reduced motion

Repeated in a second Chrome launched with `--force-prefers-reduced-motion`, where
`matchMedia('(prefers-reduced-motion: reduce)')` matches: the same five rows at 1280, the same
end-of-document mark, and `document.getAnimations().length` of 0 throughout.

### Follow-up captures

| File | What it shows |
| --- | --- |
| `evidence/screenshots/impl-review-f1-index-last-item-desktop-light.png` | 1280, light: the document scrolled to its end, the Standing orders heading well below the line, its own index item underlined |
| `evidence/screenshots/impl-review-f1-index-last-item-desktop-dark.png` | the same state in dark |

The four `redesign-22-index-current-item` captures were retaken in the same session at 1280 by 900
and 390 by 844, light and dark, each showing Payments received clicked and its own item underlined.
