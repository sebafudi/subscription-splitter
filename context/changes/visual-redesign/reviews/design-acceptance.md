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

All three required corrections are implemented in `src/client/index.css`, browser-checked at 1280
and 390 in light and dark, and the affected captures are retaken. No appearance was changed beyond
what A1 to A3 ask for. All three land in one commit, `f642b89`, together with the D11 filter select
height, because the three are one stylesheet edit and share a single browser check.

| Correction | What changed | Measured after the change | Captures retaken |
| --- | --- | --- | --- |
| A1 balance weight | `.entry-figure` now sets `font-weight: var(--t-entry-weight)`; a following rule returns `var(--t-small-weight)` to any figure column carrying `--t-small`, so only the entry-scale figure moves | every participant balance computes 600 at 17px, in both subscriptions, including "settled"; the six small figure columns (Home's currency and month, the two price months, the two payment dates, the two standing order ranges) still compute 400 at 13px | 09, 13, 14, 15, 16, 17, 18, 19 at 1280 and 09, 13, 14 at 390, both themes |
| A2 strip width | `.entry-confirm` is now `display: block`, so the strip is a block-level flex container instead of a shrink-to-fit flex child | strip 672px against an entry of 672px, on the participant delete and on the price delete's second step; focus still lands on Keep and Escape still returns to that entry's Delete | 19 and 20 at 1280, both themes |
| A3 mobile index fade | the `overflow-x` and the `mask-image` moved from the `nav` to its inner `ul`; the `nav` keeps its opaque `--ground`; `.section-index li` takes `flex: none` so items do not shrink | the nav computes `mask-image: none` over `rgb(238, 242, 234)`; the list scrolls 640px against a 358px viewport; the "Unskip" fragment that bled through the bar in the previous capture is gone | 22 at 390, both themes, and 09, 13, 14, 21 at 390 because they also show the index |

On the non-required observation about the first item's left edge: after A3 the 8px inline padding is
on the scrolling list, so the first and last items clear the fade. Verified in capture 22 mobile,
where "Price history" sits clear of the left edge.

The second observation, server validation sentences without a trailing full stop, is agreed as the
server's copy and out of this change's scope; `src/server/` is untouched by the whole change.

Gates after the corrections: `npm run typecheck` clean across all three projects, 185 unit tests in
15 files and 112 integration tests in 11 files passing with no test file changed, and the production
build succeeding at 273,424 bytes of JavaScript, 16,703 bytes of CSS and 79,268 bytes across four
woff2 files with no other font format.

Re-check by the designer is requested.

## Designer re-check

Re-checked at `f642b89` against the retaken captures 19 (light desktop), 22 (mobile light) and 09
(light desktop and mobile): the participant balance renders at weight 600, the confirmation strip
spans the full entry width, the index bar keeps an opaque ground on mobile with no page content
showing through its edges, and the payments filter select is 44px at 390. A1 to A3 and D11 are
closed. The implemented visuals are accepted against `design-spec.md` without conditions. Progress
row 6.14 may be ticked against this record.

## Addendum after implementation review F1

The section index rule changed after this acceptance was given. Design-spec 4.4 now fixes the
current-item line at 117px, one pixel below the 116px `scroll-margin-top`, and adds an
end-of-document rule: when the viewport bottom is within 1px of the document's scroll height, the
last item is current wherever its heading sits. Together they make every index item reachable,
including a last section shorter than the viewport.

Capture 22, the `redesign-22-index-current-item` pair at 1280 and at 390 in both themes, showed the
superseded behaviour and was retaken at `7e84dd3` at the same widths and themes, so the acceptance
set shows what ships. Nothing else in the accepted visuals changed: the rule governs which item
carries `aria-current` and its 2px bottom rule, not how the bar or the item is drawn. The designer's
acceptance stands.
