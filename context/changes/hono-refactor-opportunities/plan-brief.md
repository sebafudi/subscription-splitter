Analyzed repository: honojs/hono, commit edd138ee3049749190de3dcd7e32d7bcbf224e41 (upstream tag/version as reported by `git describe --tags`: v4.13.7-7-gedd138ee). This is an external open-source project, kept separate from the subscription-splitter application.

**Revised after independent plan review.** The original plan's top candidate (encapsulating `routeIndex`) was deferred after a reviewer's counter-question found its supporting evidence contradicted by the clone. See "Key decisions made" below for what changed and why.

# routeIndex characterization test + fast-path guard - Plan brief

> Full plan: `context/changes/hono-refactor-opportunities/plan.md`
> Decision record: `context/decisions/D-004-hono-refactor-selection.md`
> Independent review: `context/changes/hono-refactor-opportunities/reviews/plan-review.md`
> Research: `context/changes/hono-refactor-opportunities/research.md`, `context/changes/hono-request-dispatch-analysis/research.md`

## What and why

This plan makes two small, independent, reversible changes to Hono's request-dispatch core: a characterization test proving a piece of per-request routing state advances correctly through a real multi-step middleware chain (nothing tested this directly before), and closing a verified correctness gap where the fast dispatch path can have its continuation called twice with no error, unlike the general middleware runner, which already guards against exactly this.

## Starting point

`compose.ts`'s middleware runner advances `HonoRequest.routeIndex` on every dispatch step, but no test drives this through a real multi-handler chain - only a manual, non-representative unit test exists. The single-handler fast path in the dispatcher duplicates part of what the general runner does, but is missing one of its safety checks, and unlike the general runner it has no existing per-dispatch state to check against, so the fix is not free. A third change originally planned here, adding an accessor for `routeIndex`, was found by independent review to rest on evidence the clone contradicts, and is deferred.

## Desired end state

A new test proves the per-step routing state is set correctly across a real multi-step middleware chain. The fast path rejects a doubled continuation call exactly like the general runner does, verified to add no meaningful cost on the repository's own performance benchmark. `routeIndex` itself remains an unchanged public field - no accessor is added.

## Key decisions made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| Whether to implement the routeIndex accessor (K1) in this plan | No, deferred | Independent review found the "undocumented field" and "existing precedent fits" claims false, and the cited historical bug's actual cause (nested middleware chains sharing one field) is not addressed by an accessor | Review / Decision |
| What replaces it as the plan's production-code deliverable | The fast-path double-continuation guard | The cheapest surviving fix in the candidate set, unaffected by the accessor's re-justification | Review / Decision |
| Whether the guard is free to add | No | The general runner already tracks dispatch position for its own reasons; the fast path has no equivalent state, so the guard needs new per-dispatch state, verified by benchmark rather than assumed free | Review |
| Whether to merge the fast path into the general runner entirely | No, guard only | The repo's own CI benchmarks this exact path, so removing it is a performance trade-off, not a safe default | Research |
| Whether to touch the two other candidates found (param-shape union, cookie-merge duplication) | No | One is a deliberate performance decision; the other needs its own characterization step first | Research / Decision |

## Scope

**In scope:** a characterization test for real multi-step routing-state advancement; a guard on the fast path's synthetic continuation, with the new state it requires; tests and benchmark verification for both.

**Out of scope:** the `routeIndex` accessor (deferred, blocked on it being a documented public property whose removal would be a breaking upstream change); the request-matching result's two-shape union; consolidating the duplicated cookie-merge logic; merging the fast path into the general runner; any change to the subscription-splitter application.

## Architecture / approach

Two phases, each a separately revertable commit, in the order the surviving candidates are safest to land: (1) the characterization test, fully standalone and test-only; (2) the fast-path guard, which touches production code and is verified against the repository's own performance gates (a benchmark and a bundle-size check) rather than assumed safe.

## Phases at a glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Characterization test | Proof that per-step routing state advances correctly through a real multi-handler chain | None significant; test-only |
| 2. Fast-path guard | Double-continuation-call now throws, matching the general runner | Adds new per-dispatch state on a benchmarked path; verified by benchmark and bundle-size check, not assumed free |

**Prerequisites:** the pinned clone already existing at `/Users/sebastian.f/Projects/10xDevs/analysis/hono` with `bun install` run; `bombardier` installed locally for Phase 2's manual benchmark step (it is not a project dependency, only a CI-installed tool).

## Open risks and assumptions

- The fast-path guard's cost is expected to be small but is unverified until Phase 2's benchmark step actually runs; the plan does not assume zero cost.
- Whether any upstream maintainer would ever accept re-scoping the deferred `routeIndex` candidate around the nested-dispatch-chain defect the review found (rather than around field visibility) is unknown; this plan targets a local, disposable analysis clone, not an upstream contribution.

## Success criteria (summary)

- A test exists proving multi-step routing state advances correctly through real dispatch, where none did before.
- The fast path and the general middleware runner present an identical "called twice" contract to handler code, with the added cost measured, not assumed.
- `routeIndex` is left exactly as it is today; no accessor is introduced by this plan.
