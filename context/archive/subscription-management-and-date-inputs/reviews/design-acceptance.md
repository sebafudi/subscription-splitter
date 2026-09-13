# Design acceptance: subscription management and native calendar controls

Designer: Fable 5.1, comparing the implemented visuals against `../design-delta.md` and the
accepted specification it amends. Basis: the 33 captures under `evidence/screenshots/s08-*.png`
taken at `89fabe5` and recorded in `evidence/runs/s08-browser-verification.md`, viewed directly.

## Verdict

**Accepted without required corrections.**

## Checks against the delta's section 11

| # | Check | Capture(s) | Result |
| --- | --- | --- | --- |
| 1 | Header action row placement, spacing, type; disabled during first load | `s08-01-*` (1280, 390, light, dark), `s08-02-*` | Pass. Two link-variant buttons at `--t-small` under the subtitle, 12px above, 24px below, measured in the run file. Disabled treatment in the first-load capture. |
| 2 | Edit panel pre-filled, Currency locked with hint; refused first month with the panel open; "Changes saved"; title and Home row updated | `s08-03-*`, `s08-04-*`, `s08-05-*`, `s08-06-*` | Pass. Panel styling, `h3`, field order and pairs match section 6. The locked Currency shows the disabled treatment and the delta's hint. The refusal renders as the transformed sentence under First month with the invalid ground and border; the panel keeps its values. The status line sits at the right end of the action row with the check glyph, and focus has returned to "Edit subscription". |
| 3 | Confirmation strip at page level with both sentences and both buttons; Keep focused; Home after deletion with status and `h1` focus | `s08-07-*` (1280, 390, dark), `s08-08-*` | Pass. Question at `--t-body`, consequence at `--t-small` in ink, destructive and quiet buttons, focus on Keep, strip spanning the content column at both widths. Home shows "Subscription deleted". |
| 4 | Native controls: Chrome month and date pickers; Safari select fallback for required and optional fields; Safari native date picker | `s08-09-*`, `s08-10-*`, `s08-11-*`, `s08-12-*`, `s08-19-*` | Pass. Chrome renders the month input with the browser indicator inside the 3.4 box. Safari renders the select with "Choose a month" first for From and "Still active" first for To, options from the subscription first month in the subscription locale ("mar 2026"). |
| 5 | Control heights 40px and 44px | run file measurements | Pass. Month, date, text and select all measure 40px at 1280 and 44px at 390 in Chrome; the `min-height` exception is not needed. |
| 6 | Focus ring on a month input, a date input and the fallback select | `s08-14-*`, `s08-15-*`, `s08-18-*` | Pass. The single green outline at the standard offset. |
| 7 | Reduced motion: panel and strip appear instantly | `s08-16-*`, `s08-17-*` | Pass, as recorded in the run file. |

## Observations, none requiring change

- A field showing both its hint and an error stacks hint then error, as the shipped `Field`
  component has done since the redesign; the delta inherits that behaviour and it reads clearly.
- The Chrome month input shows "March 2026" in the browser's UI language beside a `pl-PL` ledger.
  Accepted in advance in the delta's rulings; the two renderings never meet in one browser.
- The 390 capture of the header status line on its own line under the buttons was not taken; the
  run file's DOM check confirms the stacking rule, and the mobile strip and panel captures show
  the column behaving as section 8 requires. Not a correction.

## Scope of this acceptance

Chrome desktop and Safari desktop, light and dark, 1280 and 390 widths, reduced motion on and off
in Chrome. Firefox, Edge and mobile browsers are unverified and stay so in the evidence; the
delta's fallback is designed for them but not observed on them.
