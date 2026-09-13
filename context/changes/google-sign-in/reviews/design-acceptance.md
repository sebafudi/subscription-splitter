# Designer acceptance: Google sign-in on the login screen

Designer: Fable 5.1. Compared against `context/changes/google-sign-in/design-delta.md` using the
Phase 4 captures `evidence/screenshots/google-sign-in-accept-01` to `-08` (light and dark) and the
computed values in `evidence/runs/google-sign-in-manual-rows.md`, at the implementation closed as
`implemented` (`4d3fc77`).

## Checked

| State | Capture | Delta requirement | Result |
| --- | --- | --- | --- |
| Login idle, 1280 | 01 light and dark | One action row, filled primary then quiet Google button with the unmodified mark, no divider, no new copy | Matches |
| Login idle, 390 | 02 light and dark | Stacked full width, Sign in first, 44px, gap `--s-3` | Matches |
| Google busy | 03 light and dark | Primary disabled, Google button busy with label unchanged, no reflow of the row (3.3 amendment) | Matches; Sign in width identical in rest and busy, Google button x unchanged |
| Cancelled | 04 light and dark | Status line in `--ink-soft`, no red rule, focus on the line | Matches |
| Expired link | 05 light and dark | 3.8 alert, red text, 3px left rule | Matches |
| Not usable | 06 light and dark | 3.8 alert, sentence confirms nothing about the address | Matches |
| Did not finish | 07 light and dark | 3.8 alert | Matches |
| Button absent | 08 light and dark | Primary alone, nothing marks the absence | Matches |

Contrast as measured by the implementer: quiet text on `--ground` 14.59:1 light and 15.57:1 dark;
quiet border 3.29:1 light and 4.19:1 dark; both above the 2.1 thresholds. Tab order email, password,
Sign in, Google confirmed in the manual rows. No motion added.

## Verdict

Accepted without corrections. The 3.3 amendment (reserved 1px border on every button state) is
accepted as a global rule; its only visible effect is the primary's 2px wider box on every screen,
which is the intended cost of a row that never moves.

## Remaining outside this acceptance

The live Google consent roundtrip (G05) is not a design matter and is not claimed here. After the
deploy, the optional login certification capture is retaken with the button present.
