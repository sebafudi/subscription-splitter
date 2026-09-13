# Design acceptance: visual-redesign

Reviewer: the designer (Fable 5.1), comparing the implemented screens against `design-spec.md`.
Basis: the phase 6 capture set in `evidence/screenshots/redesign-*.png` (62 files, 1280 and 390
widths, light and dark, reduced motion on and off) and the phase gate records in
`evidence/runs/visual-redesign-phase-gates.md`. Captures opened for this pass: 01 login idle
(light), 05 home populated (light), 08 detail loading (light), 09 detail populated (light desktop and
light mobile), 14 section add panel (light), 16 section field error (light), 18 section success
(light), 19 section confirm (light), 21 tiles three states (light), 22 index current item (mobile
light). Dark variants and the remaining states are covered by the independent implementation review
and by the checklist in spec section 11, whose contrast and measurement rows the phase 6 record
carries.

## Verdict

Accepted with three required corrections (A1 to A3). Acceptance becomes unconditional when the
corrections land, are browser-checked at both widths, and the affected captures are retaken.

## What matches the specification

- Direction and tokens: ledger ground, ink, hairline rules between entries and a strong rule at each
  section opening, red reserved for money owed and for validation and destructive states, green for
  success, focus and the counted tile rule. No cards, no shadows, no decorative colour.
- Detail summary: label over the leading figure at `--t-figure` in red when owed, the four cell
  ledger line between hairlines, the summary sentence with locale month names, the sticky section
  index with the current item underlined, and the mobile stacking of the ledger line with labels
  left and figures right.
- Sections: heading with count where the count equals rows rendered, none on Participants; primary
  action in the heading row; status line with check glyph beside the button after a success; the
  new entry highlighted; disclosure panel with `h3`, two-column pairs, hints under controls, field
  error in red under an invalid field with the red-tinted ground; two-line skeleton entries and
  disabled buttons on first load.
- Standing orders: assumed amounts dotted-underlined at regular weight, recorded amounts at 600;
  tiles in the three states distinguishable by left rule, dashed border and text without relying on
  colour alone; reason phrases shortened only by the removed "not counted, " prefix.
- Login: 360px block, wordmark with the split glyph, subtitle, two fields and a primary button.
- Home: heading with count, primary action, ledger rows with name and currency plus start month.
- Copy: every changed label from spec section 9 appears as specified; load-bearing copy unchanged.

## Required corrections

A1. Participant balance weight (spec 3.6 and 5.1). The figure column ("owes 40,00 zł") renders at
weight 400. The figure column is `--t-entry`, which is 600. Set weight 600 on the balance figure in
the participant entry (and on any other entry figure column rendered at 400). Captures 09, 13, 18,
19 to retake.

A2. Confirmation strip width (spec 3.10). The strip is fit-to-content; it must span the full width
of the entry like the mockup. Captures 19 and 20 to retake.

A3. Mobile index fade (spec 4.4). At 390 the `mask-image` fade is applied to the `nav`, so the
bar's ground becomes transparent at both edges and page content scrolling underneath shows through
(visible in capture 22 mobile, a fragment of "Unskip" at the left edge). Keep the `nav` ground
opaque and apply the mask to an inner scrolling list element only. Captures 22 mobile (both themes)
to retake.

## Observations, not required

- The index on mobile hides the first item's left edge slightly when scrolled; the 8px inline
  padding from spec 4.4 should keep the first and last items clear once A3 moves the mask to the
  inner list. Verify after A3.
- Server validation sentences without a trailing full stop ("Name must not be empty") are the
  server's copy and out of scope.

## Resolution

To be appended by the implementer with commit SHAs per correction, then re-checked by the designer.
