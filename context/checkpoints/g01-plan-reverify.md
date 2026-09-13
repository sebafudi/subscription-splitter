# Checkpoint: g01-plan-reverify (G01)

- **Task id:** `g01-plan-reverify`
- **Model:** Opus (subagent)
- **Goal:** G01, independently re-verifying the resolution of the plan review of change
  `google-sign-in`, roadmap S-07.
- **Status:** complete. Verdict **SOUND**. Every required finding is closed at the commit it cites,
  the four observations are resolved too, and the plan is approved to implement.
- **Independence:** this task wrote neither the plan, the resolutions, the research nor the design
  delta, and read no other task's summary of them before checking the artifacts itself.

## What was checked

| Finding | Verified | Where |
| --- | --- | --- |
| F1 | yes | `2fe573c` (`plan.md:290`, row 1.12, phase 3 body at `:629`), `d73ad99` (`research.md:224-242`) |
| F2 | yes | `2fe573c` (`plan.md:635-660`), Fix A with Fix B written in as a named fallback instruction |
| F3 | yes | `91fcbce` (`design-delta.md:115-118`), `2fe573c` (`plan.md:405`, `:810-822`, rows 2.15, 3.16, 4.13) |
| F4 | yes | `2fe573c` (`plan.md:783` restated unverified, `:752-756` the 200-not-403 gate) |
| F5 | yes | `2fe573c` (`plan.md:185-220`), `69f326d` (`plan-brief.md`) |
| F6 | yes | `2fe573c` (`plan.md:412-419`, `:547`, row 3.16) |
| F7 | yes | `2fe573c` (`plan.md:357-363`), row 2.13 title already covers the query |
| F8 | yes, as a stated choice | `2fe573c` (`plan.md:17-23`) |
| F9 | yes | `2fe573c` (`plan.md:264-273`) |
| F10 | yes | `91fcbce` (`design-delta.md:108-110`) |

## The installed package, re-read rather than recalled

Three claims the resolutions rest on were checked in `node_modules/better-auth@1.7.4`:

- `onAPIError.errorURL` exists as a typed option with the default the fix overrides
  (`@better-auth/core/dist/types/init-options.d.mts:1430-1450`), and `callback.mjs:37` reads
  `c.context.options.onAPIError?.errorURL || ${baseURL}/error`. The root-relative `/` the plan sets
  survives `appendQueryParams`, which keeps a `/` path relative
  (`@better-auth/core/dist/utils/url.mjs:40-49`).
- `handleOAuthUserInfo` is exported from `better-auth/oauth2` (`dist/oauth2/index.mjs:5`) with the
  signature `(c, opts)` (`dist/oauth2/link-account.mjs:12`) that the plan's
  `{ context: await auth.$context }` satisfies. The refusal branch reads only `internalAdapter`,
  `options`, `trustedProviders` and `logger` off that context.
- The refusal returns exactly `{ error: "account not linked", data: null }`
  (`link-account.mjs:79-85`), entered when `accountLinking?.disableImplicitLinking === true`, which
  matches the plan's test expectation.

## Progress coverage

Every delta requirement carries a row: the button present and absent (2.7, 2.14, 4.3, 4.4), busy
states (2.10, 4.8), the five sentences (2.12, 3.2, 3.16, 4.9, 4.13), the URL cleanup on both keys
(2.13, with 2.5 guarding the client), the configuration endpoint's exact shape (1.5),
`disableImplicitLinking` (1.10), `onAPIError` (1.12, 3.10), secretless continuous integration (1.3,
3.4, 3.14) and `tests/integration/auth.test.ts` unchanged (3.5). Rows 1.12 and 3.16 append after the
manual rows in their phase because titles are immutable once a plan is reviewed.

## The client id binding

Consistent across `plan.md`, `plan-brief.md` and D-012. The plan decides `wrangler secret put` and
gives its reasons; the brief carries the same decision; D-012 leaves the binding pending the
implementation goal's choice, which is the question this plan answers, and the plan says it does not
edit D-012 because that line is completed in place when G02 closes. No credential value appears in
any of the three.

## Side fix, in its own commit

The accepted S-06 specification moved to `context/archive/visual-redesign/design-spec.md`. Five
references in `frame.md`, `research.md` and `change.md` still named the pre-archive path and now name
the archived one. Two related things were deliberately left alone and are recorded in the review:
`design-delta.md:4` carries the old path but is outside this task's permitted files, and `frame.md`
cites the login block at `design-spec.md:366-382` where the quoted sentence now sits at line 386,
the spec having grown through S-06 design questions D9 to D11. The section reference and the quoted
sentence both still hold, so the evidence stands and only the line range drifted.

## Status

`change.md` keeps `status: plan_reviewed`, which the schema sequence places between `planned` and
`implementing` and which the S-06 precedent confirms is where an approved plan waits. No change was
needed to that line.

## Files touched

- `context/changes/google-sign-in/reviews/plan-review.md` (`## Re-verification` appended)
- `context/changes/google-sign-in/frame.md`, `research.md`, `change.md` (spec path only)
- `context/checkpoints/g01-plan-reverify.md` (this file)

Nothing under `src/`, `tests/`, `plan.md`, `design-delta.md`, `context/STATUS.md`, `evidence/index.md`
or the workspace goals file was modified.
