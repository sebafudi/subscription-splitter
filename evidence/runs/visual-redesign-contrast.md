# visual-redesign contrast record

Design-spec 2.1 requires the contrast checks to be run and design-spec 11 item 8 requires the tool
to be named. Both tables below cover both themes.

## Tool and method

The ratios are computed by the WCAG 2.1 relative-luminance formula (W3C, "Understanding SC 1.4.3"),
applied as a small Node script over the token values. The inputs are not taken from the
specification table: each token was read back from the running client with
`getComputedStyle(document.documentElement).getPropertyValue(...)` at 1280 in both themes, and every
value matched design-spec 2.1 exactly, so the table below measures what the browser actually paints.

Threshold rules applied: WCAG 1.4.3 at AA (4.5:1) for text, except `--ink-faint`, which design-spec
2.1 holds to 3:1 because it carries only placeholder text, disabled text and the word "settled";
WCAG 1.4.11 (3:1) for non-text.

No pair failed, so no token value was changed by this phase.

## Text pairs, WCAG 1.4.3

| Foreground | Background | Light | Dark | Threshold | Result |
| --- | --- | --- | --- | --- | --- |
| `--ink` | `--ground` | 14.59:1 | 15.57:1 | 4.5:1 | pass |
| `--ink` | `--paper` | 15.60:1 | 14.34:1 | 4.5:1 | pass |
| `--ink-soft` | `--ground` | 6.69:1 | 8.52:1 | 4.5:1 | pass |
| `--ink-soft` | `--paper` | 7.15:1 | 7.84:1 | 4.5:1 | pass |
| `--green` | `--ground` | 5.40:1 | 7.85:1 | 4.5:1 | pass |
| `--green` | `--paper` | 5.77:1 | 7.23:1 | 4.5:1 | pass |
| `--red` | `--ground` | 5.77:1 | 7.74:1 | 4.5:1 | pass |
| `--red` | `--paper` | 6.17:1 | 7.12:1 | 4.5:1 | pass |
| `--on-ink` | `--ink` | 15.60:1 | 15.57:1 | 4.5:1 | pass |
| `--ink-faint` | `--ground` | 3.29:1 | 4.19:1 | 3:1 | pass |
| `--ink-faint` | `--paper` | 3.52:1 | 3.86:1 | 3:1 | pass |

Lowest text value in either theme: `--ink-faint` on `--ground` in light, 3.29:1 against its 3:1
threshold.

## Non-text pairs, WCAG 1.4.11

| Foreground | Background | Light | Dark | Threshold | Result |
| --- | --- | --- | --- | --- | --- |
| `--border` | `--paper` | 3.52:1 | 3.86:1 | 3:1 | pass |
| `--border` | `--ground` | 3.29:1 | 4.19:1 | 3:1 | pass |
| `--green` tile left rule | `--paper` | 5.77:1 | 7.23:1 | 3:1 | pass |
| `--red` tile left rule | `--paper` | 6.17:1 | 7.12:1 | 3:1 | pass |
| `--green` focus outline | `--ground` | 5.40:1 | 7.85:1 | 3:1 | pass |
| `--green` focus outline | `--paper` | 5.77:1 | 7.23:1 | 3:1 | pass |

Lowest non-text value in either theme: `--border` on `--ground` in light, 3.29:1 against its 3:1
threshold. No token value was changed, so no failing pair had to be darkened or lightened and no
`--border` question was raised to the designer.

## Recorded without a threshold

The disabled primary button keeps `--ink-soft` over a transparent fill, so the page ground shows
through: `--ink-soft` on `--ground` is 6.69:1 in light and 8.52:1 in dark. WCAG exempts inactive
controls, but design-spec 3.3 keeps those buttons focusable and in the tab order with an
`aria-describedby` explanation, so the figure is recorded for the designer. It clears AA anyway.

## The `--rule` exemption and its condition

Design-spec 2.1 exempts `--rule` from the 3:1 non-text threshold as decorative separation, on the
condition that it is never the sole boundary of a control. The condition holds. `var(--rule)` appears
five times in `src/client/index.css` and every one is a separator rather than a control boundary:

| Where | Use |
| --- | --- |
| `.appbar` | bottom hairline under the bar |
| `.section-index` | bottom hairline under the index strip |
| `.entry` | hairline between ledger entries |
| `.ledger-line` | top and bottom hairlines of the summary band |

Measured on the running client in both themes: every input, select, quiet button and disclosure
panel computes a 1px border in `--border` (`#7C877F` light, `#6F7B73` dark); month tiles compute a
`--border` box, dashed when the month is excluded by a rule and solid when it is counted or marked
not received, with their 3px left rule in `--green` or `--red`; and the link variant's underline
computes `text-decoration-color: --border` in both themes, which is what design-spec 3.3 asks for.
The four separators above compute `--rule` (`#C5D0C0` light, `#2B352E` dark). No control anywhere
takes `--rule` as its visible boundary.
