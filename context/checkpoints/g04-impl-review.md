# Checkpoint: g04-impl-review (G04)

An independent implementation review of change `google-sign-in` (roadmap S-07), written by a
reviewer who wrote no part of the brief, the research, the delta, the plan or any implementation
commit. The report is `context/changes/google-sign-in/reviews/impl-review.md`, mirroring the shape
of `context/archive/visual-redesign/reviews/impl-review.md` and carrying no calendar date.

## Verdict

APPROVED with two required corrections, both to the record rather than to code. No code change is
required and none was made. Five dimensions PASS; Success Criteria is WARNING, which is what the two
required findings sit under.

## What was verified rather than accepted

Both gate runs were re-executed in this checkout, run A with `.dev.vars` moved aside and run B with
it restored by a shell trap, in that order. Typecheck clean across all three projects, unit 18 files
and 214 cases, integration 12 files and 119 cases, build succeeds, in both runs. Every figure
reproduces `evidence/runs/google-sign-in-gates.txt` exactly. Run A confirmed no `GOOGLE_CLIENT` name
in the process environment before it started; run B showed the pool binding the local pair and the
same 119 cases still passing.

All eight stability guards were read against `c842f64` independently. `wrangler.jsonc` and
`.github/` are byte-identical to that baseline, `tests/integration/auth.test.ts` is unchanged, and
the fourteen changed files under `src`, `tests`, `env.d.ts` and `.dev.vars.example` are exactly the
fourteen the plan names.

Ten Progress rows were checked against the commits they cite, spread across all four phases, by
reading the landed file rather than trusting the citation. Every one holds.

Two things were measured rather than reasoned about. The reserved button border was measured in
headless Chrome against the shipped `dist/client` stylesheet: the primary goes from 66.44px to
68.44px wide, its height stays 40.00px, the three other variants do not change, and the primary's
disabled width now equals its rest width, so the reflow is gone. That is the 2px the checkpoint
declares and nothing beyond it. And the client id recorded in D-012 was compared with the one in
`.dev.vars` by `shasum` of each value, which match; neither value was printed.

The client mapping was attacked with twelve hostile `error` values including `__proto__`,
`constructor`, a script-shaped string and a 5000-character value, plus a non-string object and
array. Every one returns the did-not-finish sentence as an alert, and the raw code is never
rendered, so there is no injection or prototype path.

The client secret appears in no tracked file and in no commit reachable from any ref.

## The two required findings

**F1.** Fourteen of the fifty-six Progress rows, all in phase 2, are ticked with no commit after the
title, against the convention the plan states for itself. The work exists in `cf3e3de` and
`751d4df`; the record does not point at it.

**F2.** The "no secret in the tree" guard concludes "no value anywhere" from a grep that matches only
assignment-shaped text and ran against one phase's working diff. The client id value does appear in
the change range, in prose in D-012, which declares it public in the same sentence. The conclusion
is wider than its command proves, in a change whose own rule is that no artifact claims more than it
verified.

Six observations follow them, all low impact: the build's `.dev.vars` copy in the git-ignored
`dist/`, a dead `.login-submit` class, the 3.3 amendment naming every variant where one was changed,
the boot `Promise.all` with no rejection handler, the plan's `scope` guard that cannot pass as
written, and phase 3's test files landing in the phase 1 commit. Each is recorded with why it is not
worth acting on now.

## What this review did not cover

The live Google roundtrip, anything about the deployed origin, thirteen of the sixteen acceptance
captures, and the browser pass itself. The accessibility, keyboard, reduced-motion and contrast
readings in `evidence/runs/google-sign-in-manual-rows.md` were checked for internal consistency and
against the code and the three captures that were opened, not reproduced in a browser.

## Not done here

No code was changed. `src/`, `tests/`, `plan.md`, `design-delta.md`, `context/STATUS.md`,
`evidence/index.md` and the workspace goals file were not touched. No deploy and no course upload.

`change.md` was deliberately left at `status: implemented`. The review skill stamps it
`impl_reviewed`, but its Notes section argues for `implemented` in prose and the status step owns
that file, so the change is left for whoever reconciles the status rather than made here.
