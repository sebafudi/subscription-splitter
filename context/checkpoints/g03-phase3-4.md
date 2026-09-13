# g03-phase3-4

Phases 3 and 4 of change `google-sign-in` (roadmap S-07, goal G03), plus the designer's amendment to
design-spec 3.3 that the phase 2 checkpoint left open.

## The 3.3 amendment, applied

`context/changes/google-sign-in/design-delta.md` gained a "## 3.3 Buttons (amended)" section in the
working tree: every button variant reserves a 1px border in every state, transparent where 3.3 shows
none, so a state change never moves a neighbour. It was committed on its own in `a1f9977` before any
code changed, because it is the designer's ruling rather than this task's choice.

`src/client/index.css` now gives `.btn-primary` `border: 1px solid transparent` at rest. Hover and
active set only a background, so the transparent border carries through them; the disabled rule
already set `1px solid var(--border)`. The other three variants were read against the amendment and
needed nothing: quiet and destructive already carry a 1px border in rest, hover, active and
disabled, and the link variant has no border by design, no padding and no neighbour in a row.

Re-measured at 1280 with the social call held open, so the form stays busy and the primary takes its
disabled border: `Sign in` is 80.78px wide at rest and 80.78px while disabled, and
`Continue with Google` sits at x 567.78px in both states. The 2px shift the phase 2 checkpoint
recorded is gone. Commit `7a3a3ce`.

The two figures in `evidence/runs/google-sign-in-manual-rows.md` that the fix supersedes are the
phase 2 row 2.7 left of 565.78px and the closing section's 78.78px rest width. They are left as
written, because that file records what was measured when it was measured; the Phase 4 section
records the values that now hold.

## Phase 3

No test was added. Every Phase 3 row was already satisfied by a file that landed earlier:
`tests/integration/google-auth.test.ts` and the `10.8.0.x` prefix in `tests/integration/accounts.ts`
in `43f41f2`, and `src/client/components/ui/googleErrors.test.ts` in `e6b3dab`. Each row was checked
against the landed file rather than assumed, and ticked citing the commit that satisfies it. Nothing
was duplicated.

Row 2.2 was reworded to what happened and ticked. As worded it said no test file changed in phase 2,
which the phase 2 task contradicted by instruction when it added the client unit test file.

The whole suite ran twice on the tree that carries the border fix, recorded verbatim under
"Phase 3" in `evidence/runs/google-sign-in-gates.txt`. Run A moves `.dev.vars` aside, which is the
continuous integration state; run B restores it. Typecheck, unit, integration and build all exited 0
in both: unit 18 files and 214 cases, integration 12 files and 119 cases, each time.

`tests/integration/auth.test.ts` is byte-identical to its state at `c842f64`:
`git diff c842f64 -- tests/integration/auth.test.ts` is empty. `.github/workflows/ci.yml` is
unchanged and still holds no secret; the plan's second-project fallback was never needed.

Commits: `461b950` the gate evidence, `f66a431` the Progress rows.
