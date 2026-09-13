# Checkpoint: g01-plan (G01)

- **Task id:** `g01-plan`
- **Model:** Opus (subagent)
- **Goal:** G01, the implementation plan for change `google-sign-in`, roadmap S-07, plus the planning
  parts of G03 and G04.
- **Status:** complete. Every artifact assigned is written, committed by explicit path and pushed.

## Artifacts

- `context/changes/google-sign-in/design-delta.md` - the designer's login-screen delta, committed
  first and unmodified, as assigned.
- `context/decisions/D-013-google-account-linking.md` - moved from proposed to accepted, quoting the
  designer's ruling in full and recording the two constraints it adds: the refusal copy is fixed and
  identical whatever the reason, and manual linking stays out of scope for S-07.
- `context/changes/google-sign-in/plan.md` - four phases, stability guards, critical implementation
  details, rollback, risks, one open design question and the canonical `## Progress` table.
- `context/changes/google-sign-in/plan-brief.md` - the short form, in the shape of
  `context/changes/visual-redesign/plan-brief.md`.
- `context/changes/google-sign-in/change.md` - status moved `preparing` to `planned` per the schema.
- `context/foundation/roadmap.md` - S-07 status moved `ready` to `in-progress`.

## Commits

| SHA | Message |
| --- | --- |
| `d37fdc8` | docs(google-sign-in): add the designer's login-screen delta |
| `1fb2968` | docs(decisions): accept d-013 google account linking rule |
| `f496646` | docs(google-sign-in): add the phased implementation plan |
| `69e12aa` | docs(google-sign-in): add the plan brief |
| `137b3e0` | docs(google-sign-in): move change status to planned |
| `c1b6ebe` | docs(roadmap): move s-07 google sign-in to in-progress |

All pushed to `origin/main`.

## Phases and their gates

| Phase | Progress rows | Gate |
| --- | --- | --- |
| 1. The server, the provider and the configuration read | 10 automated, 1 manual | commands: typecheck, both suites with no Google value bound, build, and the configuration endpoint answering both ways |
| 2. The login screen | 6 automated, 8 manual | a browser at 1280 and 390, in both themes, with the button present and absent |
| 3. The tests | 14 automated, 1 manual | commands, including the whole suite twice, once with no Google value and once with both set locally, and `tests/integration/auth.test.ts` unchanged from `main` |
| 4. The verification pass | 2 automated, 12 manual | a browser pass over every state the change produces locally, plus measured contrast and the captures the delta's amended checklist names |

## Deviations from the assignment

- The two pure-options assertions in `src/server/auth.test.ts`, which the assignment grouped under
  phase 3, are rows in phase 1 instead. They need no bindings, they are the executable statement of
  the now-accepted D-013, and leaving the linking rule unasserted across two phases would be the one
  place in this change where a silent regression could hide. Every case that needs a running Worker
  stayed in phase 3. The plan states the adjustment and the reason where it is made.
- Roadmap S-07 moved to `in-progress` rather than staying `ready`, matching how S-06 was carried while
  its change was being planned and implemented. S-07 has no row in the roadmap's "at a glance" table
  and none was added, because the assignment limited foundation edits to what the plan skill requires.
- The `## Progress` convention line carries the one em dash the format reference mandates as a
  mechanical separator before a commit SHA, exactly as `context/changes/visual-redesign/plan.md` does.
  No prose in any authored file uses one.
- Date frontmatter from the toolkit's plan template is omitted, per the project's date-free convention
  and the precedent in the visual-redesign plan.

## The credential dependency

The state moved during this task and the plan records it as it now stands rather than as D-012 left
it. `context/checkpoints/g02-oauth-provision.md`, under "Browser provisioning completed", records that
the consent screen, the audience, the three scopes and the Web application client were created in
project `subscription-splitter-auth`, that all three origins and their `/api/auth/callback/google`
redirects were registered, and that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` now exist in the
ignored local `.dev.vars`. The audience stays External in Testing with the authorized account on the
test-user list.

What is still missing is the remote half: the same checkpoint records that Cloudflare secret
provisioning did not complete, because wrangler had no non-interactive Cloudflare authentication. The
deployed Worker therefore carries neither value, registers no provider and renders no Google button,
which is a supported state and the same state continuous integration runs in.

Consequence for this plan: every one of its Progress rows is executable today against `main` plus the
local `.dev.vars`, with nothing waiting on anything outside the repository. The live Google roundtrip
on the deployed origin is the single exception. It needs `wrangler secret put` for both names with
authorized Cloudflare credentials and then a deploy, it belongs to goal G05, and it is named in the
plan as a manual gate rather than carried as a Progress row, because nothing in this plan can make it
pass. No artifact from G05 may claim that public Google login works while the audience stays in
Testing.

D-012's own "the Web client and the credentials are not yet created" line is superseded by the G02
checkpoint. This task did not edit D-012, because that record says it is completed in place when G02
closes and G02 is not this task's goal.

## Open design questions

One, recorded in the plan under `## Design questions` and left for the designer:

1. A 404 from `POST /api/auth/sign-in/social` after the configuration read answered true, which happens
   when credentials are removed between the read and the click. The delta fixes one sentence for a
   failure before any navigation, in terms of reaching Google, and four sentences for failures on the
   return leg. This outcome is neither: the request succeeds and answers 404. The plan uses the
   connection sentence as the nearest specified outcome and flags it rather than inventing a fifth
   sentence. The designer may prefer one of the four return sentences instead.

Nothing else in the delta was found silent. It answers all nine questions `frame.md` raised, including
placement, the quiet variant, the mark's exemption from the palette, the busy state, the four outcome
sentences with cancellation as a status line, the absent affordance, the stacking rule and the amended
certification checklist.

## Open questions carried forward for implementation

1. Whether provider-present integration cases can take their bindings by overriding them inside the
   existing Vitest project, or need a second project. The plan chooses the first and names the second
   as an explicit fallback, with the constraint that decides it: default `npm test` and the continuous
   integration job must pass with no Google value anywhere. Whichever lands is recorded in the phase 3
   commit.
2. Whether all six migrations are applied to the remote D1 database. Expected yes from D-010; confirmed
   with `wrangler d1 migrations list --remote` at G05 rather than assumed. No new migration is needed.

## Verification

No command that changes state was run beyond the six commits and their pushes. No test was run, because
nothing under `src/` or `tests/` was touched. The plan's findings were read from this repository, from
the design delta, from the research and framing artifacts, and from the accepted decisions; the toolkit
plan skill, its `progress-format.md` reference and the `10x-tdd` and `10x-e2e` skills were read for the
structure and the test shape, and the shape of `context/changes/visual-redesign/plan.md` and
`plan-brief.md` was mirrored, including the canonical `## Progress` table.

## Constraints honoured

No file under `src/`, `tests/`, `context/STATUS.md`, `evidence/index.md`, the workspace `GOALS.md`, or
any `visual-redesign` or `release-2` path was modified. Two files carrying another task's uncommitted
work, `context/STATUS.md` and `context/checkpoints/g02-oauth-provision.md`, were read and deliberately
left unstaged. No secret, no client id, no calendar date and no duration estimate was written. No
deploy, no course upload, no nested delegation.

## Next action

An independent plan review (`10x-plan-review`), producing
`context/changes/google-sign-in/reviews/plan-review.md`. Its findings are resolved before phase 1
begins.
