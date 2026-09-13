# Checkpoint: s06-impl-review-resolution

- **Task**: resolve findings F1 to F7 of `context/changes/visual-redesign/reviews/impl-review.md`
- **Model**: Opus
- **Status**: complete; all seven findings resolved, committed and pushed

## Completed

| Finding | What changed | Commit |
|---|---|---|
| F1 | `SectionIndex` tracks the current item at the heading's own `scroll-margin-top` plus one pixel; design-spec 4.4 amendment committed with it; verified in a browser | `da99573` |
| F6 | `withoutApiInstruction` extracted to `ui/apiMessages.ts` and given a fallback to the server's own words, with four unit cases | `3d94766` |
| F2, F3, F4, F5, F7 | Progress row 3.11 parenthetical, the gates record, the manual-row measurements, the index verification, the two corrected counts, the protocol's lesson | `5c02639` |
| Record | `## Resolution` in the review file, `change.md` note, work-log entry, this checkpoint | `HEAD` |

## Changed paths

- `src/client/components/ui/SectionIndex.tsx`, `src/client/components/ui/apiMessages.ts` (new),
  `src/client/components/ui/apiMessages.test.ts` (new), `src/client/components/PriceHistory.tsx`
- `context/changes/visual-redesign/design-spec.md`, `plan.md`, `change.md`, `reviews/impl-review.md`
- `evidence/runs/visual-redesign-gates.txt` (new), `visual-redesign-manual-rows.md` (new),
  `visual-redesign-index-current-item.md` (new), `visual-redesign-guards.txt`,
  `visual-redesign-phase-gates.md`, `evidence/work-log.md`
- `evidence/screenshots/impl-review-f1-index-current-{desktop,mobile}-{light,dark}.png` (new)

## Verification

- `npm run typecheck` clean across all three projects, exit 0
- `npm run test:unit` 16 files / 189 tests, exit 0
- `npm run test:integration` 11 files / 112 tests, exit 0
- `npm run build` succeeds, exit 0
- Output of all four captured in `evidence/runs/visual-redesign-gates.txt`
- Browser: Chrome over the DevTools protocol against `npm run dev`, at 1280 by 900 and 375 by 812
  both at a 2x device pixel ratio, light and dark, real Tab and Enter keys, and a second Chrome
  launched with `--force-prefers-reduced-motion`. Numbers in
  `evidence/runs/visual-redesign-index-current-item.md` and `visual-redesign-manual-rows.md`

## Unresolved

None blocking. Two things a re-reviewer should know:

- A last section whose heading sits below the line once the document has scrolled to its end is not
  marked current, and the section above it stays marked. Visible at 1280, not at 375. This is what
  design-spec 4.4 prescribes; no offset can fix it. Recorded, not treated as a defect.
- The accepted captures `redesign-22-index-current-item-light.png` and its mobile pair show the
  superseded behaviour and were deliberately not retaken: the acceptance set records what the
  designer reviewed, and the four `impl-review-f1-*` captures record what ships now. If the project
  would rather the acceptance set track the code, retaking that pair is the one open call.

## Next action

Hand back for the independent re-review of the resolution. No further implementer work is pending.
