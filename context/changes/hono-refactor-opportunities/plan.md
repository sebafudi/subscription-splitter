Analyzed repository: honojs/hono, commit edd138ee3049749190de3dcd7e32d7bcbf224e41 (upstream tag/version as reported by `git describe --tags`: v4.13.7-7-gedd138ee)

This is a plan for an external open-source project (Hono), kept as a separate reference target from the subscription-splitter application. All file paths below are relative to the clone at `/Users/sebastian.f/Projects/10xDevs/analysis/hono`. Implementing this plan is optional for this exercise; the plan itself is the required deliverable.

# Implementation Plan: routeIndex encapsulation + fast-path double-next guard

## Overview

Two independent, small, reversible changes selected in `context/decisions/D-004-hono-refactor-selection.md` from the ranked options in `context/changes/hono-refactor-opportunities/research.md`: (1) close a real correctness gap where `#dispatch`'s single-handler fast path can have its synthetic `next` called more than once with no error, unlike `compose()`'s equivalent guard, and (2) begin encapsulating `HonoRequest.routeIndex`, currently a raw public mutable field with no documented contract, by adding an accessor alongside it, following the `GET_MATCH_RESULT` precedent already shipped in the same class.

## Current State Analysis

- `src/hono-base.ts:432-449` is the fast path taken when exactly one handler matched a route (`matchResult[0].length === 1`, confirmed the sole occurrence in `src/` via `rg -n "matchResult\[0\]\.length" src`). Its synthetic `next` (lines 435-437) has no guard against being invoked more than once.
- `src/compose.ts:33-35` has the equivalent guard for the composed path (`if (i <= index) { throw new Error('next() called multiple times') }`), confirmed the only occurrence of this shape in `src/` via `ast-grep run --pattern 'if ($I <= $INDEX) { throw $ERR }' --lang ts src`.
- `src/request.ts:53` declares `routeIndex: number = 0` as a plain public field with no JSDoc, written only by `src/compose.ts:44`, and read/written directly (no accessor) by three files outside `compose.ts`/`request.ts`: `src/middleware/method-not-allowed/index.ts:65`, `src/middleware/combine/index.ts:101,106`, `src/helper/route/index.ts:59,83,108`.
- `src/request.ts` already has a working precedent for encapsulating adjacent private state behind a narrow accessor for privileged consumers: `GET_MATCH_RESULT`, a unique symbol (`src/request/constants.ts:1`) exposed as a getter (`src/request.ts:394`) and consumed at `src/helper/route/index.ts:34`.
- `src/compose.test.ts` never references `routeIndex` and never constructs a `Context` with a real `matchResult` (every `new Context(...)` call in that file passes a bare `Request`); the only existing test of `routeIndex`-driven parameter resolution (`src/request.test.ts`) sets the field manually rather than driving it through a real composed dispatch.
- CI (`.github/workflows/ci.yml`) runs, on every PR: `bun run format`, `bun run lint`, `editorconfig-checker`, `bun run build`, `bun run test` (which is `tsc -p tsconfig.spec.json && vitest --run`), the same test suite against `bun`/`node` (20/22/24)/`workerd`/`fastly`/`lambda`/`lambda-edge`/`deno`, a PR-gated type/bundle-size check, and a PR-gated HTTP benchmark (`http-benchmark-on-pr`) whose primary route is single-handler and exercises exactly the fast path this plan touches in Phase 1.

## Desired End State

After this plan: the fast path's synthetic `next` throws the same "next() called multiple times" error as `compose()`'s equivalent guard when called a second time, verified by a new test. A real `compose()`-driven characterization test exists proving `routeIndex` advances correctly across a multi-handler chain (closing a verified test gap). `HonoRequest` exposes a documented accessor for `routeIndex` alongside the existing public field, verified by a new test asserting the accessor's behavior matches the field's current semantics exactly. The existing three external consumers (`middleware/combine`, `middleware/method-not-allowed`, `helper/route`) are not modified and continue to read/write the raw field directly - migrating them to the new accessor is explicitly out of scope for this plan (see "What we are NOT doing").

### Key discoveries:
- The fast-path guard gap and the `routeIndex` field's rawness are both classified as accidental complexity, not deliberate trade-offs, per the git archaeology in `context/changes/hono-refactor-opportunities/research.md` - safe to change without reversing a documented design decision.
- A CI-gated performance benchmark (`http-benchmark-on-pr`) specifically isolates the single-handler fast path (`benchmarks/http-server/benchmark.ts`'s primary route has no other middleware registered), so Phase 1's guard must be verified not to change that benchmark's outcome; the guard executes only on the (never-legitimate) second call to `next`, so no per-request-success-path cost is expected, but this is called out explicitly rather than assumed silently.
- No test today drives `routeIndex` through a real `compose()` call with more than one handler - this is a genuine, previously-unfilled gap, not an oversight in this plan; Phase 2 fills it before Phase 3 touches the field it protects.

## What We Are NOT Doing

- Not migrating `middleware/combine/index.ts`, `middleware/method-not-allowed/index.ts`, or `helper/route/index.ts` to use the new `routeIndex` accessor instead of the raw field. The field stays public and directly usable after this plan; only an additional, documented accessor is added alongside it.
- Not removing or making `HonoRequest.routeIndex` private. That would be a breaking change requiring the three consumers above to migrate first, deferred to a follow-up change.
- Not merging `#dispatch`'s fast path into `compose()`. Git archaeology found this is a deliberate, CI-benchmarked performance optimization; only its missing double-`next()` guard is in scope.
- Not touching `Result<T>`'s two-shape union (candidate K2, rejected for this round in `D-004`).
- Not consolidating the `set-cookie` header-merge duplication between `Context`'s `res` setter and `#newResponse` (candidate K4, deferred, ranked third, and found during exploration to need a more careful, mode-parameterized design than a simple merge).
- Not fixing the untested `MESSAGE_MATCHER_IS_ALREADY_BUILT` error path or the untested HEAD-to-GET-through-`compose()` combination - both are real test gaps noted in the L3/L4 research but are not inputs to either selected candidate.
- Not changing anything in the subscription-splitter application. This entire plan targets the separate Hono analysis clone.

## Implementation Approach

Three phases, ordered cheapest and most independent first. Phase 1 (the fast-path guard) has no dependency on the other two and could be dropped without affecting them. Phase 2 (characterization test) is test-only and de-risks Phase 3. Phase 3 (the accessor) is purely additive - it adds a new, documented way to reach `routeIndex` without removing or changing the existing field, so it cannot break the three existing consumers, which are left untouched. Each phase is a separately committable, separately revertable unit.

## Phase 1: Fast-path double-`next()` guard

### Overview

Close the verified correctness gap where `#dispatch`'s single-handler fast path can have its synthetic `next` invoked more than once with no error, unlike `compose()`'s equivalent guard.

### Changes Required:

#### 1. Add the guard to the fast path's synthetic `next`

**File**: `src/hono-base.ts`

**Purpose**: Make the fast path's synthetic `next` (lines 435-437) reject a second invocation, matching `compose()`'s existing contract that `next()` must not be called more than once per dispatch step.

**Contract**: Same error shape and message as `compose.ts:33-35` (`throw new Error('next() called multiple times')`), so both dispatch paths present an identical contract to handler code regardless of which path a given route takes.

#### 2. Add a test proving the guard

**File**: `src/hono.test.ts` (alongside the existing single-handler fast-path describe blocks already covering sync-throw, async-rejection, and no-response-returned cases)

**Purpose**: Assert that a single-handler route whose handler calls `next()` twice throws the "next() called multiple times" error, mirroring `src/compose.test.ts`'s existing "should throw if next() is called multiple times" test for the composed path.

**Contract**: New `it(...)` block; no changes to existing tests in the file.

### Success Criteria:

#### Automated Verification:

- Type check passes: `bun run test` (runs `tsc -p tsconfig.spec.json` first)
- Full test suite passes: `bun run test`
- Lint passes: `bun run lint`
- Format check passes: `bun run format`

#### Manual Verification:

- Run the HTTP benchmark locally (`bun run benchmark.ts` under `benchmarks/http-server/`, or `benchmarks/fetch/compare.sh` if available) against this change and confirm no meaningful regression on the single-handler route, since this is the exact path the PR-gated `http-benchmark-on-pr` job measures.

---

## Phase 2: `compose()`-level `routeIndex` characterization test

### Overview

Add a test that drives `routeIndex` advancement through a real, multi-handler `compose()` dispatch (not a manually-set field), closing the verified gap that no existing test does this. This test becomes the regression detector protecting Phase 3.

### Changes Required:

#### 1. Add a real multi-handler `compose()` test asserting per-step `routeIndex`-driven state

**File**: `src/compose.test.ts`

**Purpose**: Build a `matchResult`-shaped array with at least two entries carrying different parameter maps, run it through the real `compose()` function (not a hand-set `req.routeIndex`), and assert that a handler at each index sees the parameter data associated with its own index - proving `compose.ts:44`'s `context.req.routeIndex = i` assignment is correct across a real multi-step chain, which today only `src/request.test.ts`'s manual-index tests exercise in isolation.

**Contract**: New test(s) only; no changes to `compose()` itself in this phase.

### Success Criteria:

#### Automated Verification:

- Type check passes: `bun run test`
- Full test suite passes: `bun run test`, including the new test
- Lint passes: `bun run lint`

#### Manual Verification:

- Read the new test and confirm it actually dispatches through `compose()` (not a shortcut that sets `req.routeIndex` directly), since a test that takes the shortcut would not close the gap this phase exists to close.

---

## Phase 3: `routeIndex` accessor, added alongside the existing field

### Overview

Add a documented accessor for `routeIndex` on `HonoRequest`, following the `GET_MATCH_RESULT` precedent, without removing or changing the existing public field. This is the mechanism landing green; migrating existing consumers to it (the enforcement step) is explicitly deferred, per "What We Are NOT Doing."

### Changes Required:

#### 1. Add a documented accessor for `routeIndex`

**File**: `src/request.ts`

**Purpose**: Give `HonoRequest` a named, documented entry point for reading and advancing the currently-executing route index, so that future consumers (and, in a later, separate change, today's three direct-field consumers) have a sanctioned alternative to raw field mutation. The existing public field (`src/request.ts:53`) is left in place, unchanged, so this phase cannot break `middleware/combine`, `middleware/method-not-allowed`, or `helper/route`, none of which are touched.

**Contract**: A getter/setter pair (or symbol-keyed accessor, matching the `GET_MATCH_RESULT` style already used for `#matchResult` in the same class) whose read/write semantics are identical to the existing `routeIndex` field - this phase changes how the value can be reached, not what the value means or how `compose()` advances it.

#### 2. Add a test proving the accessor matches the field's existing semantics

**File**: `src/request.test.ts`

**Purpose**: Assert that reading/writing through the new accessor observes exactly the same value as reading/writing the raw `routeIndex` field, so the two are proven interchangeable before any future migration.

**Contract**: New test(s) only.

### Success Criteria:

#### Automated Verification:

- Type check passes: `bun run test`
- Full test suite passes: `bun run test`, including Phase 2's and Phase 3's new tests
- Lint passes: `bun run lint`
- Build succeeds: `bun run build`

#### Manual Verification:

- Confirm by reading the diff that the existing `routeIndex` field itself is untouched (still public, still the same default and type), so the three existing external consumers require no changes.

---

## Testing Strategy

### Unit tests:

- Phase 1: fast path double-`next()` throws (new).
- Phase 2: `compose()`-driven multi-handler `routeIndex` advancement (new).
- Phase 3: accessor/field equivalence (new).

### Integration tests:

- None beyond the existing `bun run test` suite, which already runs full-app dispatch tests (`src/hono.test.ts`) against every change through the standard CI matrix (`bun`/`node`/`workerd`/`fastly`/`lambda`/`lambda-edge`/`deno`).

### Manual testing steps:

1. Run the PR-gated HTTP benchmark locally after Phase 1 and compare against the pinned-commit baseline.
2. Read the Phase 2 test to confirm it drives real `compose()` dispatch.
3. Read the Phase 3 diff to confirm the existing field is untouched.

## Performance Considerations

Phase 1's guard executes only when `next()` is called a second time at the fast path - a case that never occurs on a correct, successful request - so no per-request cost is expected on the success path the CI benchmark measures; this is verified manually in Phase 1 rather than assumed. Phases 2 and 3 add no production code paths that execute during normal dispatch (Phase 2 is test-only; Phase 3 only adds a new accessor, it does not change how `compose.ts:44` writes to the field).

## Migration Notes

Not applicable - no data migration. The three existing `routeIndex` consumers require no code changes as part of this plan, since the field they use is untouched.

## References

- Related research: `context/changes/hono-refactor-opportunities/research.md`
- Related research: `context/changes/hono-request-dispatch-analysis/research.md`
- Decision record: `context/decisions/D-004-hono-refactor-selection.md`
- Existing precedent for the Phase 3 accessor shape: `src/request/constants.ts:1`, `src/request.ts:394`, `src/helper/route/index.ts:34` (`GET_MATCH_RESULT`)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Fast-path double-`next()` guard

#### Automated

- [ ] 1.1 Type check passes
- [ ] 1.2 Full test suite passes
- [ ] 1.3 Lint passes
- [ ] 1.4 Format check passes

#### Manual

- [ ] 1.5 HTTP benchmark shows no meaningful regression on the single-handler route

### Phase 2: `compose()`-level `routeIndex` characterization test

#### Automated

- [ ] 2.1 Type check passes
- [ ] 2.2 Full test suite passes, including the new test
- [ ] 2.3 Lint passes

#### Manual

- [ ] 2.4 New test confirmed to dispatch through real `compose()`, not a manual shortcut

### Phase 3: `routeIndex` accessor added alongside the existing field

#### Automated

- [ ] 3.1 Type check passes
- [ ] 3.2 Full test suite passes, including Phase 2 and Phase 3 new tests
- [ ] 3.3 Lint passes
- [ ] 3.4 Build succeeds

#### Manual

- [ ] 3.5 Diff confirmed to leave the existing `routeIndex` field untouched
