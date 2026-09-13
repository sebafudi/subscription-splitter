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

## Phase 4

The acceptance pass. No row failed, so no code changed in this phase. Method as phase 2: Chrome over
the DevTools protocol against `npm run dev` on the local D1, both widths by device emulation at a
device scale factor of 2 because the tiling manager refuses window resizes, both themes, plus a
repeat in a second Chrome launched with `--force-prefers-reduced-motion`. Every computed value is in
the "Phase 4" section of `evidence/runs/google-sign-in-manual-rows.md`, with the property it came
from named.

Contrast was computed rather than judged: a WCAG 2.2 relative-luminance ratio evaluated inside the
page from the `getComputedStyle` values of the two colours, the formula of success criterion 1.4.3.
The quiet button's text on `--ground` is 14.59:1 in light and 15.57:1 in dark against a 4.5:1
requirement; its border is 3.29:1 and 4.19:1 against the 3:1 of WCAG 1.4.11; its disabled text is the
same pair as the border, against the 3:1 floor 2.1 sets for `--ink-faint`.

Two readings worth a later reader's attention.

**The absent-button state was produced for real rather than stubbed.** The two Google names were
removed from the ignored `.dev.vars` and the dev server restarted, so `/api/auth-config` answered
`{"google":false}` and the social call answered 404. Phase 2 produced the same screen by answering
the configuration read from the client side; this pass exercises the server half as well. The pair
was restored afterwards and the file is untracked, as `git check-ignore` has always said.

**Row 4.4 is ticked with a named difference.** It reads "identical to the shipped screen", and the
unconfigured login screen is not pixel-identical: the primary is 80.78px wide rather than 78.78px,
because the 3.3 amendment reserves its 1px border at rest. That is the designer's ruling applied and
it holds on every screen in the product, so the row is ticked with the difference stated in the row
itself rather than glossed.

Captures for the designer's acceptance, sixteen, at a device scale factor of 2:

| File stem | State |
| --- | --- |
| `google-sign-in-accept-01-login-idle-1280-{light,dark}` | login idle with the button at 1280 |
| `google-sign-in-accept-02-login-idle-390-{light,dark}` | login idle with the button at 390, stacked |
| `google-sign-in-accept-03-google-busy-{light,dark}` | the Google button busy |
| `google-sign-in-accept-04-cancelled-{light,dark}` | the cancelled status line |
| `google-sign-in-accept-05-expired-link-{light,dark}` | the expired-link alert |
| `google-sign-in-accept-06-not-usable-{light,dark}` | the account-not-usable alert |
| `google-sign-in-accept-07-did-not-finish-{light,dark}` | the did-not-finish alert |
| `google-sign-in-accept-08-button-absent-{light,dark}` | the login screen with no Google button |

No credential value reached any file, any capture or any recorded URL. Commit `9ce597a`.

## Where this leaves the change

Every Progress row in `plan.md` is ticked, all four phases included, each citing the commit that
satisfies it. `change.md` is `implemented` and `evidence/work-log.md` carries the entry.
`context/STATUS.md`, `evidence/index.md`, `evidence/champion/` and the workspace goals file were not
touched.

## Open design questions

None. The one the phase 2 checkpoint left open, whether the action row may reflow while the form is
busy, is answered by the delta's "## 3.3 Buttons (amended)" section and built.

## Not done here

No deploy, no course upload, no live Google roundtrip. Goal G05 still needs `GOOGLE_CLIENT_ID` on the
deployed Worker followed by a deploy, and it still owns the one check that fails in a way nothing
local can reproduce: that the deployed `APP_ORIGINS` accepts the button's own origin, read as a 200
with an `accounts.google.com` url rather than a 403 `INVALID_CALLBACK_URL`, before any human is asked
to consent to anything.
