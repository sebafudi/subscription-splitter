Analyzed repository: honojs/hono, commit edd138ee3049749190de3dcd7e32d7bcbf224e41 (upstream tag/version as reported by `git describe --tags`: v4.13.7-7-gedd138ee). This is an external open-source project, kept separate from the subscription-splitter application.

# routeIndex encapsulation + fast-path guard - Plan brief

> Full plan: `context/changes/hono-refactor-opportunities/plan.md`
> Decision record: `context/decisions/D-004-hono-refactor-selection.md`
> Research: `context/changes/hono-refactor-opportunities/research.md`, `context/changes/hono-request-dispatch-analysis/research.md`

## What and why

This plan makes two small, independent, reversible changes to Hono's request-dispatch core: closing a verified correctness gap where the fast dispatch path can have its continuation called twice with no error (unlike the general middleware runner, which already guards against exactly this), and beginning the encapsulation of a raw, undocumented, directly-mutable field (`routeIndex`) that has already caused one real bug when unrelated code reached into it.

## Starting point

`HonoRequest.routeIndex` is a plain public field with no documentation, set by the middleware-composition runner and read directly by three unrelated middleware/helper files with no accessor in between. The single-handler fast path in the dispatcher duplicates part of what the middleware runner does, but is missing one of its safety checks. Neither gap is a deliberate design choice; both were confirmed via git history as complexity that accumulated rather than was decided.

## Desired end state

The fast path rejects a doubled continuation call exactly like the general runner does. A new test proves the field's per-step value is set correctly across a real multi-step middleware chain (nothing tested this directly before). A documented accessor exists alongside the raw field, following a pattern the codebase already uses elsewhere for similar internal state - existing consumers are untouched and need no changes.

## Key decisions made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| Which candidate to implement first | routeIndex encapsulation (K1) | Accidental complexity with a real historical bug, an existing in-repo pattern to follow, and a small, fully known blast radius | Research / Decision |
| Whether to bundle a second candidate | Yes, the narrowed fast-path guard fix (K3) | Cheapest possible fix in the whole set, closes a real gap, touches no files K1 touches | Research / Decision |
| Whether to merge the fast path into the general runner entirely | No, guard only | The repo's own CI benchmarks this exact path, so removing it is a performance trade-off, not a safe default | Research |
| Whether to migrate existing routeIndex consumers to the new accessor | No, deferred | Keeps this change purely additive; migration is a separate, later decision | Plan |
| Whether to touch the two other candidates found (param-shape union, cookie-merge duplication) | No | One was found to be a deliberate performance decision; the other turned out more delicate than first thought and needs its own characterization step first | Research / Decision |

## Scope

**In scope:** a guard on the fast path's synthetic continuation; a characterization test for real multi-step `routeIndex` advancement; a new, additive accessor for `routeIndex` alongside the existing field; tests for all three.

**Out of scope:** migrating any of the three existing `routeIndex` consumers; removing or hiding the existing field; touching the request-matching result's two-shape union; consolidating the duplicated cookie-merge logic; merging the fast path into the general runner; any change to the subscription-splitter application.

## Architecture / approach

Three phases, each a separately revertable commit, ordered cheapest and most independent first: (1) the fast-path guard, fully standalone; (2) a test-only characterization step with no production code change; (3) the additive accessor, which cannot break existing callers because nothing existing is removed or changed. Phase 2 exists specifically to de-risk Phase 3 by proving today's behavior before adding a new way to reach it.

## Phases at a glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Fast-path guard | Double-continuation-call now throws, matching the general runner | Touches a path this repo's own CI benchmarks; verified manually, not assumed safe |
| 2. Characterization test | Proof that per-step routing state advances correctly through a real multi-handler chain | None significant; test-only |
| 3. Accessor | A documented, additive way to reach routing state, alongside the untouched existing field | Low; nothing existing is removed |

**Prerequisites:** none beyond the pinned clone already existing at `/Users/sebastian.f/Projects/10xDevs/analysis/hono` with `bun install` run (already done for the L2 dependency-graph analysis).

## Open risks and assumptions

- The fast-path guard is assumed to have no measurable performance cost on the success path, since it only fires on an illegitimate second call; this is checked manually in Phase 1 rather than only assumed.
- Whether any upstream maintainer would accept these changes as framed (e.g. prefer a different accessor shape for `routeIndex`) is unknown; this plan targets a local, disposable analysis clone, not an upstream contribution.

## Success criteria (summary)

- The fast path and the general middleware runner present an identical "called twice" contract to handler code.
- A test exists proving multi-step routing state advances correctly through real dispatch, where none did before.
- `routeIndex` has a documented, additive accessor with no change to any existing consumer's behavior.
