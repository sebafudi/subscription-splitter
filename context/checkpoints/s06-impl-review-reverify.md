# Checkpoint: s06-impl-review-reverify

- **Task**: `s06-impl-review-reverify`, the independent re-review of the `## Resolution` to
  `context/changes/visual-redesign/reviews/impl-review.md` (S-06, goal V04)
- **Model**: Opus
- **Status**: complete; all seven findings re-verified, verdict APPROVED, one new observation raised

## What was re-verified

F2 to F7 were checked against the resolution commits `da99573`, `5c02639`, `3d94766`, `da7ad52` and
`1d5d80a`. F1 was held until the designer-decided follow-up landed on `origin/main` as `b5208f3`,
`7e84dd3`, `a4360d2` and `4a7c6cc`, then verified against the amended design-spec 4.4, the code, the
retaken captures and a real browser. The per-finding table, the evidence run for each and the
residual risks are in the review's `## Re-verification` section.

## Gates re-run

In a detached worktree created from `origin/main` with `node_modules` linked from the primary
checkout, at the resolution revision `1d5d80a` and again at the follow-up revision `4a7c6cc`.

| Gate | `1d5d80a` | `4a7c6cc` |
|---|---|---|
| `npm run typecheck` | exit 0 | exit 0 |
| `npm run test:unit` | 16 files / 189 tests, exit 0 | 17 files / 194 tests, exit 0 |
| `npm run test:integration` | 11 files / 112 tests, exit 0 | 11 files / 112 tests, exit 0 |
| `npm run build` | exit 0 | exit 0 |

Both match `evidence/runs/visual-redesign-gates.txt` exactly, counts included.

## Browser verification of F1

Headless Chrome over the DevTools protocol against `npm run dev` on the local D1, signed in as the
seeded owner. At 1280 by 900 every index item takes `aria-current` when clicked, the last one through
the end-of-document rule with the gap at 0; a plain scroll to the bottom marks the same item. A real
Tab reaches the index with a 2px ring at 2px offset and a real Enter makes that item current. At 375
by 812 all five are current and nothing overflows horizontally. Repeated in a second Chrome launched
with `--force-prefers-reduced-motion`: identical rows, zero running animations, `scroll-behavior`
`auto`. The F6 transform was additionally probed with eleven inputs beyond its committed cases.

## New observation

R1, three of the four `impl-review-f1-index-current-*` captures do not match their rows in
`evidence/runs/visual-redesign-index-current-item.md`: one shows the Home list at desktop width where
its row claims 375 dark, one is off the set's dimensions, and the light and dark pair both render
dark. The behaviour is independently confirmed by the browser run and by the two correct follow-up
captures, so this is an evidence-record defect of the same class as F5. Required action before
archive: retake those four or correct their rows. No code change required.

## Changed paths

- `context/changes/visual-redesign/reviews/impl-review.md` (`## Re-verification` appended)
- `context/changes/visual-redesign/change.md` (status `implemented` to `impl_reviewed`, note added)
- This checkpoint

Nothing under `src/`, `tests/`, `context/STATUS.md`, `evidence/index.md` or the workspace `GOALS.md`
was touched.

## Next action

None from this pass. R1 is for whoever closes the change out before archive.
