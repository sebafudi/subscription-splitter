# Checkpoint: g01-plan-fix (G01)

- **Task id:** `g01-plan-fix`
- **Model:** Opus (subagent)
- **Goal:** G01, resolving the independent plan review of change `google-sign-in`, roadmap S-07.
- **Status:** complete. All ten findings are resolved, every artifact is committed by explicit path
  and pushed, and `change.md` carries the resolution note.

## What was resolved

| Finding | Severity | Resolution | Commit |
| --- | --- | --- | --- |
| F1 | CRITICAL | `onAPIError: { errorURL: '/' }` in the server phase, new Progress row 1.12, row 3.10 sharpened to the app root with `error=state_mismatch`, and the same correction made in `research.md` | `2fe573c`, `d73ad99` |
| F2 | CRITICAL | Fix A: `handleOAuthUserInfo` from `better-auth/oauth2` with `{ context: await auth.$context }`, and Fix B written in as the named fallback | `2fe573c` |
| F3 | CRITICAL | The designer's ruling committed unmodified and absorbed; design question 1 deleted; rows 2.15, 3.16 and 4.13 added | `91fcbce`, `2fe573c` |
| F4 | WARNING | The `trustedOrigins` risk row restated as unverified; the G05 live gate gains the 200-not-403 check ahead of consent | `2fe573c` |
| F5 | WARNING | The credential paragraph rewritten to the half-provisioned state, with the Boolean AND that makes it safe; the client id's binding decided | `2fe573c`, `69f326d` |
| F6 | WARNING | `GOOGLE_CONNECTION_FAILURE` named, `CONNECTION_FAILURE` forbidden, both sentences quoted side by side, pinned by row 3.16 | `2fe573c` |
| F7 | OBSERVATION | The replace drops the whole query, on either key, including unrecognised codes | `2fe573c` |
| F8 | OBSERVATION | The Overview records that the accepted specification is deliberately not edited | `2fe573c` |
| F9 | OBSERVATION | The configuration endpoint's exact shape, its deliberate lack of throttling and its nil exposure stated | `2fe573c` |
| F10 | OBSERVATION | The designer's sentence added to the delta under the outcomes table | `91fcbce` |

## Designer rulings recorded

- The HTTP-error ruling was already written in the working tree and is committed as written: an HTTP
  error from the social call after the configuration read said true shows the fourth sentence,
  "Google sign-in did not finish. Try again, or sign in with your email.", and the connection
  sentence is reserved for a request that never reached the server.
- The three state codes keep one sentence deliberately, because staleness, replay and tampering end
  the same way for the person at the keyboard and the interface does not accuse.
- The accepted S-06 specification is not edited. `design-delta.md` is the standing amendment for
  sections 4.1, 9 and 11, and the archive of S-06 carries the original wording. The plan's Overview
  states it.

## Decisions this task made

- **`GOOGLE_CLIENT_ID` goes through `wrangler secret put`, not a `wrangler.jsonc` var.** The id is
  public, so a var would leak nothing, and the plan says so. Three reasons decide it the other way:
  `vitest.integration.config.ts` loads `wrangler.jsonc` through `configPath`, so a var would bind the
  id into every integration run and make the provider-absent cases depend on the absence of the
  secret alone; the guard that no `GOOGLE_CLIENT_ID` value appears in the diff stays mechanical; and
  one mechanism for a matched pair is one fewer thing to get wrong on rotation.
- **F2 is a real test with a written fallback, not a live-only outcome.** The export, the call shape
  and the returned string were read in the installed package, and the refusal branch returns before
  any cookie, transaction or redirect work, reading only `internalAdapter`, `options`,
  `trustedProviders` and `logger` from the context. Nothing was executed, because this task touches
  no file under `tests/`, so the plan instructs the implementer to drop the case and row 3.11 rather
  than mock the adapter if the context does not satisfy the call inside the pool.

## Library claims verified in the installed package

- `onAPIError.errorURL` exists on the options type
  (`@better-auth/core/dist/types/init-options.d.mts:1430`) and is read as `defaultErrorURL` by the
  callback (`better-auth/dist/api/routes/callback.mjs:37`) and by `parseState`.
- A root-relative error URL is supported: `appendQueryParams` appends the query to a `/` path without
  resolving it against an origin (`@better-auth/core/dist/utils/url.mjs:40-49`).
- With a database bound, the state strategy resolves to `database`
  (`better-auth/dist/context/create-context.mjs:137`), so a fabricated state finds no verification
  row and produces `state_mismatch` (`better-auth/dist/state.mjs:119-123`). That is the code the
  phase 3 assertion names.
- `handleOAuthUserInfo` is exported from `better-auth/oauth2`
  (`better-auth/dist/oauth2/index.mjs:5`) and returns `{ error: 'account not linked', data: null }`
  from the branch `disableImplicitLinking` reaches (`better-auth/dist/oauth2/link-account.mjs`).

## Commits

| SHA | Message |
| --- | --- |
| `91fcbce` | docs(google-sign-in): record the designer ruling on http errors before redirect |
| `2fe573c` | docs(google-sign-in): resolve the plan review findings f1 to f9 |
| `69f326d` | docs(google-sign-in): update the plan brief for the resolved review |
| `d73ad99` | docs(google-sign-in): correct the error-redirect claim in the research |
| `2aaa594` | docs(google-sign-in): record the plan review resolution |
| `d98d99c` | docs(google-sign-in): note the plan review is resolved |

`change.md` stays at `status: plan_reviewed`, which is where the precedent leaves a change whose plan
review is closed and whose phase 1 has not begun: `context/archive/ai-review-pipeline/change.md` sat
at that status through its own resolution commit and moved on only when implementation started.

## Constraints honoured

Nothing under `src/`, `tests/`, `context/STATUS.md`, `evidence/index.md`, the workspace goals file or
any `visual-redesign` or `release-2` path was modified. Files carrying other tasks' uncommitted work
were left alone; every commit names its single path explicitly. No secret and no client id value was
written, no calendar date, no duration and no em dash. No deploy, no course upload, no nested
delegation, and no command that changes state beyond these commits and their push.

## Next action

Phase 1 of `context/changes/google-sign-in/plan.md`. Every required finding is closed, so nothing
blocks it.
