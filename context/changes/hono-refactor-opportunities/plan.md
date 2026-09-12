Analyzed repository: honojs/hono, commit edd138ee3049749190de3dcd7e32d7bcbf224e41 (upstream tag/version as reported by `git describe --tags`: v4.13.7-7-gedd138ee)

This is a plan for an external open-source project (Hono), kept as a separate reference target from the subscription-splitter application. All file paths below are relative to the clone at `/Users/sebastian.f/Projects/10xDevs/analysis/hono`. Implementing this plan is optional for this exercise; the plan itself is the required deliverable.

**Revised after independent plan review** (`reviews/plan-review.md`, verdict: approve with required changes). The review's counter-question on K1 (the original top-ranked candidate) found three of its four supporting claims contradicted by the clone; K1's production-code step is deferred as a result. This plan now covers exactly the two steps that survived review: a characterization test closing a verified, real coverage gap, and a corrected, honestly-costed guard fix. See `reviews/plan-review.md`'s `## Resolution` section for the full finding-by-finding mapping, and `research.md`'s K1 section for the corrected evidence.

# Implementation Plan: routeIndex characterization test + fast-path double-next guard

## Overview

Two independent, small, reversible changes selected in `context/decisions/D-004-hono-refactor-selection.md` (as re-ranked after independent review) from the options in `context/changes/hono-refactor-opportunities/research.md`: (1) a `compose()`-level characterization test proving `routeIndex` advances correctly across a real multi-handler dispatch chain, a real and previously-unfilled coverage gap; and (2) closing a verified correctness gap where `#dispatch`'s single-handler fast path can have its synthetic `next` called more than once with no error, unlike the general middleware runner, which already guards against exactly this. The `routeIndex` encapsulation (an accessor added alongside the field) that was originally planned as a third phase is deferred - see "What We Are NOT Doing."

## Current State Analysis

- `src/compose.ts:44` (`context.req.routeIndex = i`) is the sole place that advances `HonoRequest.routeIndex` during composed dispatch. `src/compose.test.ts` never references `routeIndex` and never constructs a `Context` with a real `matchResult`: `rg -c "new Context\(" src/compose.test.ts` returns 30 constructions, `rg -c "matchResult" src/compose.test.ts` returns 0. `compose.ts` does already track its own dispatch position via `let index = -1` (`src/compose.ts:21`), used for its "next() called multiple times" guard (lines 33-35) - a piece of existing state the fast path (below) does not have an equivalent of.
- `src/hono-base.ts:432-449` is the fast path taken when exactly one handler matched a route (`matchResult[0].length === 1`, confirmed the sole occurrence in `src/` via `rg -n "matchResult\[0\]\.length" src`). Its synthetic `next` (lines 435-437) is a bare `async () => { c.res = await this.#notFoundHandler(c) }` with no counter and no flag - unlike `compose()`, it has no state to check against, so adding a guard here means introducing new per-dispatch state, not reusing existing state the way `compose()`'s guard does.
- `.github/workflows/ci.yml:197-218` runs a PR-gated HTTP benchmark (`http-benchmark-on-pr`) whose script, `benchmarks/http-server/benchmark.ts`, drives a primary route (`app.get('/', (c) => c.text('Hi'))`) with no other middleware registered - it exercises exactly the fast path this plan's second change touches, on every pull request. The CI job installs `bombardier` as an explicit step (`.github/workflows/ci.yml:210-214`); it is not a project dependency, so running the benchmark locally requires it too. The script defaults to comparing against `--baseline=origin/main` (`benchmarks/http-server/benchmark.ts`'s argument parsing); since this plan targets the pinned clone (detached at `edd138ee`, seven commits past `v4.13.7`, not `origin/main`), a local run must pass `--baseline=edd138ee` explicitly to compare against the right commit.
- `.github/actions/perf-measures/action.yml` (invoked by the PR-gated `perf-measures-check-on-pr` job, `.github/workflows/ci.yml:184-195`) runs `bun run build` then `bun perf-measures/bundle-check/scripts/check-bundle-size.ts` against the built `dist/index.js` bundle, plus `tsc`/`tsgo` type-check diagnostics, reported through octocov. `src/hono-base.ts` is part of that default bundle (`src/index.ts` imports `Hono` from `./hono`, which extends `HonoBase`), so a change to it is in scope for this gate, even though the change itself is small.
- CI's `main` job (`.github/workflows/ci.yml:49-53`) runs `format`, `lint`, `editorconfig-checker`, `build`, and `test` (`tsc -p tsconfig.spec.json && vitest --run`) on every push - both phases below are held to the same four checks plus build where a phase touches `src/`, since both are separately committable units that should each clear the gate CI actually runs.

### Key discoveries:

- The characterization test (this plan's Phase 1) is valuable independent of any other candidate's fate: it protects `compose.ts:44`'s assignment itself, including a nested-`compose()`-chains-sharing-one-`routeIndex` scenario that an independent review traced as the actual cause of a historical bug (`#3663`) - a defect class this plan does not attempt to fix, but the new test at least makes the currently-untested mechanism visible to future changes.
- The fast-path guard (this plan's Phase 2) sits inside an area with a real, CI-benchmarked performance history (commit `bb9a9547`, "perf: do not `compose` if it has only one handler"); the guard itself is a narrow, additive addition that does not remove or alter that optimization, but it does add new per-dispatch state where none existed before, so its cost is verified rather than assumed (see Phase 2's manual verification step).
- `routeIndex`'s field-level rawness (the original K1 candidate) was found, after independent review, not to support the accessor design as originally justified - see "What We Are NOT Doing" for the corrected scope decision.

## Desired End State

After this plan: a real, `compose()`-driven test proves `routeIndex` advances correctly across a multi-handler chain, closing a verified gap. The fast path's synthetic `next` throws the same "next() called multiple times" error as `compose()`'s equivalent guard when called a second time, verified by a new test and confirmed not to introduce a measurable performance regression on the benchmark that exercises this exact path. `HonoRequest.routeIndex` remains an unchanged, fully public field - no accessor is added by this plan.

### Key discoveries:

- Both changes are verified, real gaps (a missing test, a missing guard), not speculative improvements - each is independently justifiable without reference to the deferred K1 candidate.
- Neither phase depends on the other: Phase 1 touches only `src/compose.test.ts`; Phase 2 touches `src/hono-base.ts` and `src/hono.test.ts`. Either could be dropped without affecting the other.

## What We Are NOT Doing

- **Not adding an accessor for `routeIndex` (the original K1 Phase 3).** Deferred, not rejected outright. Independent plan review found that: (a) `routeIndex` is a documented, user-facing read surface (`src/request.ts:419`'s public `@example` JSDoc, added deliberately by commit `68011665`), not an undocumented internal field as originally characterized; (b) the cited `GET_MATCH_RESULT` precedent is not analogous - it is private, getter-only, and consumed by exactly one internal file, where `routeIndex` is public, read-write, and documented; and (c) the historical bug cited as motivation (`#3663`) was caused by `compose()` itself overwriting shared per-request state across nested dispatch chains, a defect an identical-semantics accessor would not have prevented. **The blocker for pursuing this differently**: `routeIndex` is a documented public property; removing or narrowing it is a breaking change to Hono's public API, which requires a deprecation path and at least one migrated consumer before it could even be considered - decisions this local analysis clone is not positioned to make for an upstream project. If this candidate is revisited, it should be re-scoped around the nested-`compose()`-chains defect the review actually found, not around field visibility.
- **Not merging `#dispatch`'s fast path into `compose()`.** Git archaeology found this is a deliberate, CI-benchmarked performance optimization (commit `bb9a9547`); only its missing double-`next()` guard is in scope.
- **Not touching `Result<T>`'s two-shape union** (candidate K2, rejected in `D-004` as a verified deliberate performance decision).
- **Not consolidating the `set-cookie` header-merge duplication** between `Context`'s `res` setter and `#newResponse` (candidate K4, deferred, ranked below the selected pair, and found during exploration to need a more careful, mode-parameterized design than a simple merge - see `context/domain/02-invariant-aggregate-refactor.md` for the domain-level view of the same finding).
- **Not fixing the untested `MESSAGE_MATCHER_IS_ALREADY_BUILT` error path or the untested HEAD-to-GET-through-`compose()` combination** - both are real test gaps noted in the L3/L4 research but are not inputs to either selected change.
- **Not changing anything in the subscription-splitter application.** This entire plan targets the separate Hono analysis clone.

## Implementation Approach

Two phases, in the order the surviving candidates are safest to land: the characterization test first (test-only, zero production risk, no dependency on anything else), then the fast-path guard (a small production change, verified against the repository's own performance gates). Each phase is a separately committable, separately revertable unit with no file overlap between them.

## Phase 1: `compose()`-level `routeIndex` characterization test

### Overview

Add a test that drives `routeIndex` advancement through a real, multi-handler `compose()` dispatch (not a manually-set field), closing the verified gap that no existing test does this.

### Changes Required:

#### 1. Add a real multi-handler `compose()` test asserting per-step `routeIndex`-driven state

**File**: `src/compose.test.ts`

**Purpose**: Build a `matchResult`-shaped array with at least two entries carrying different parameter maps, run it through the real `compose()` function (not a hand-set `req.routeIndex`), and assert that a handler at each index sees the parameter data associated with its own index - proving `compose.ts:44`'s `context.req.routeIndex = i` assignment is correct across a real multi-step chain, which today only `src/request.test.ts`'s manual-index tests exercise in isolation.

**Contract**: New test(s) only; no changes to `compose()` itself in this phase.

### Success Criteria:

#### Automated Verification:

- Type check passes: `bun run test` (runs `tsc -p tsconfig.spec.json` first)
- Full test suite passes: `bun run test`, including the new test
- Lint passes: `bun run lint`
- Format check passes: `bun run format`

#### Manual Verification:

- Read the new test and confirm it actually dispatches through `compose()` (not a shortcut that sets `req.routeIndex` directly), since a test that takes the shortcut would not close the gap this phase exists to close.

---

## Phase 2: Fast-path double-`next()` guard

### Overview

Close the verified correctness gap where `#dispatch`'s single-handler fast path can have its synthetic `next` invoked more than once with no error, unlike `compose()`'s equivalent guard. Verified as needing new per-dispatch state (not free), per independent review.

### Changes Required:

#### 1. Add the guard to the fast path's synthetic `next`

**File**: `src/hono-base.ts`

**Purpose**: Make the fast path's synthetic `next` (lines 435-437) reject a second invocation, matching `compose()`'s existing contract that `next()` must not be called more than once per dispatch step.

**Contract**: Introduce a closure-local flag scoped to the single fast-path dispatch, set on the first (legitimate) call and checked on entry; on a second call, throw the same error shape and message as `compose.ts:33-35` (`throw new Error('next() called multiple times')`), so both dispatch paths present an identical contract to handler code regardless of which path a given route takes. Unlike `compose()`, which already maintains dispatch position in `index` (`src/compose.ts:21`) for unrelated reasons, this flag is new state introduced solely for this guard - noted here so the cost is attributed correctly rather than assumed to be free.

#### 2. Add a test proving the guard

**File**: `src/hono.test.ts` (alongside the existing single-handler fast-path describe blocks already covering sync-throw, async-rejection, and no-response-returned cases)

**Purpose**: Assert that a single-handler route whose handler calls `next()` twice throws the "next() called multiple times" error, mirroring `src/compose.test.ts`'s existing "should throw if next() is called multiple times" test for the composed path.

**Contract**: New `it(...)` block; no changes to existing tests in the file.

### Success Criteria:

#### Automated Verification:

- Type check passes: `bun run test`
- Full test suite passes: `bun run test`
- Lint passes: `bun run lint`
- Format check passes: `bun run format`
- Build succeeds: `bun run build`
- Bundle size check does not regress: `bun run build && bun perf-measures/bundle-check/scripts/check-bundle-size.ts`, compared against the pinned-commit baseline (this phase touches `src/hono-base.ts`, part of the default bundle measured by the PR-gated `perf-measures-check-on-pr` job)

#### Manual Verification:

- Run the HTTP benchmark locally against this change and compare against the pinned commit, not `origin/main`: from `benchmarks/http-server/`, with `bombardier` installed (the CI job installs it explicitly; it is not a project dependency), run `bun run benchmark.ts --baseline=edd138ee`. Confirm no meaningful regression on the single-handler (`/`) route, since this is the exact path the PR-gated `http-benchmark-on-pr` job measures, and this phase's guard adds new per-dispatch state to that path.

---

## Testing Strategy

### Unit tests:

- Phase 1: `compose()`-driven multi-handler `routeIndex` advancement (new).
- Phase 2: fast path double-`next()` throws (new).

### Integration tests:

- None beyond the existing `bun run test` suite, which already runs full-app dispatch tests (`src/hono.test.ts`) against every change through the standard CI matrix (`bun`/`node`/`workerd`/`fastly`/`lambda`/`lambda-edge`/`deno`).

### Manual testing steps:

1. Read the Phase 1 test to confirm it drives real `compose()` dispatch.
2. Run `benchmarks/http-server/benchmark.ts --baseline=edd138ee` (with `bombardier` installed) after Phase 2 and compare against the pinned-commit baseline.
3. Run the bundle-size check (`bun perf-measures/bundle-check/scripts/check-bundle-size.ts` against a build including Phase 2) and compare against the pinned-commit baseline.

## Performance Considerations

Phase 1 adds no production code paths that execute during normal dispatch (test-only). Phase 2's guard requires a new closure-local flag in the fast path, set on every legitimate `next()` call, inside the exact route the PR-gated HTTP benchmark measures - this is new state, not reuse of something `compose()` already tracks for itself, and the expected cost is small but is verified by Phase 2's manual benchmark step rather than assumed to be zero.

## Migration Notes

Not applicable - no data migration, and `routeIndex` itself is left entirely unchanged by this plan (see "What We Are NOT Doing").

## References

- Related research: `context/changes/hono-refactor-opportunities/research.md`
- Related research: `context/changes/hono-request-dispatch-analysis/research.md`
- Related domain analysis: `context/domain/02-invariant-aggregate-refactor.md`
- Decision record: `context/decisions/D-004-hono-refactor-selection.md`
- Independent plan review: `context/changes/hono-refactor-opportunities/reviews/plan-review.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` - <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: `compose()`-level `routeIndex` characterization test

#### Automated

- [ ] 1.1 Type check passes
- [ ] 1.2 Full test suite passes, including the new test
- [ ] 1.3 Lint passes
- [ ] 1.4 Format check passes

#### Manual

- [ ] 1.5 New test confirmed to dispatch through real `compose()`, not a manual shortcut

### Phase 2: Fast-path double-`next()` guard

#### Automated

- [ ] 2.1 Type check passes
- [ ] 2.2 Full test suite passes
- [ ] 2.3 Lint passes
- [ ] 2.4 Format check passes
- [ ] 2.5 Build succeeds
- [ ] 2.6 Bundle size check does not regress against the pinned-commit baseline

#### Manual

- [ ] 2.7 HTTP benchmark run against `--baseline=edd138ee` shows no meaningful regression on the single-handler route
