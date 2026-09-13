# Checkpoint: s06-f1-followup

- **Task**: `s06-f1-followup`, the two design calls left open by the F1 resolution of
  `context/changes/visual-redesign/reviews/impl-review.md`
- **Model**: Opus
- **Status**: complete; both decisions implemented, recorded and committed

## Actions

| Decision | What changed | Commit |
|---|---|---|
| 1, the end-of-document rule | Design-spec 4.4 gains the rule and the resolution log its paragraph; `SectionIndex.tsx` carries it beside the 117px line; five unit cases on the extracted decision | `b5208f3` |
| 2, the superseded acceptance captures | The four `redesign-22-index-current-item` captures retaken at the originals' widths and themes; two end-of-document captures added | `7e84dd3` |
| Record | F1 follow-up in the review's `## Resolution`, the acceptance addendum, the gate output, the browser numbers, the work-log entry | `a4360d2` |

The rule as implemented: when `scrollHeight - (innerHeight + scrollY)` is within 1px, the last
heading's item is current wherever that heading sits; otherwise the last heading whose top has
reached the line one pixel below its own `scroll-margin-top` is current, which is the approach the
previous commit took and which is kept. A passive `scroll` listener carries the end-of-document case
alongside the `IntersectionObserver`, because no heading crossing announces the end of a document.
The decision itself is an exported pure function, `currentItemId`, so the node unit runner can
collect it: the component is not unit-testable in this repository, whose unit config is
`environment: 'node'` with an include glob of `src/**/*.test.ts` and no DOM library.

## Changed paths

- `src/client/components/ui/SectionIndex.tsx`, `src/client/components/ui/SectionIndex.test.ts` (new)
- `context/changes/visual-redesign/design-spec.md`, `reviews/impl-review.md`,
  `reviews/design-acceptance.md`
- `evidence/runs/visual-redesign-gates.txt`, `visual-redesign-index-current-item.md`,
  `evidence/work-log.md`
- `evidence/screenshots/impl-review-f1-index-last-item-desktop-{light,dark}.png` (new),
  `redesign-22-index-current-item-{light,dark}.png` and the mobile pair (overwritten)
- This checkpoint

## Verification

- `npm run typecheck` clean across all three projects, exit 0
- `npm run test:unit` 17 files / 194 tests, exit 0, up from 16 files / 189 tests
- `npm run test:integration` 11 files / 112 tests, exit 0, no test file changed
- `npm run build` succeeds, exit 0
- All four appended verbatim to `evidence/runs/visual-redesign-gates.txt` under
  "Follow-up: F1 end-of-document rule"
- Browser: Chrome over the DevTools protocol against `npm run dev` on the local D1, signed in as the
  synthetic seeded owner, at 1280 by 900 and 375 by 812 both at a 2x device pixel ratio, light and
  dark, and repeated in a second Chrome launched with `--force-prefers-reduced-motion`. All five
  index items take `aria-current` when clicked at both widths. At 1280 the document reaches its end
  on the last click with the Standing orders heading at 280.03px and that item current, which is the
  case the previous record had to disclose as unreachable. At 375 nothing changes, because the 117px
  line reaches every heading there on its own and the new rule never fires.
  `document.getAnimations().length` stays 0 in both motion modes. Numbers in
  `evidence/runs/visual-redesign-index-current-item.md`

## Unresolved

None. Both open calls are closed and nothing was improvised: the decision text inserted into 4.4 and
into the resolution log is verbatim as given.

## Next action

Hand back for the independent re-review of the resolution. No further implementer work is pending.
