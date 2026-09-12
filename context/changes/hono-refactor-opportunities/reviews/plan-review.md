<!-- PLAN-REVIEW-REPORT -->
# Plan review: routeIndex encapsulation + fast-path double-next guard

- **Plan**: `context/changes/hono-refactor-opportunities/plan.md`
- **Mode**: Deep
- **Date**: not recorded (project rule: no calendar dates in artifacts)
- **Verdict**: REVISE (approve with required changes)
- **Findings**: 2 critical, 5 warnings, 3 observations
- **Target**: external repository `honojs/hono`, clone at `/Users/sebastian.f/Projects/10xDevs/analysis/hono`, verified at `edd138ee3049749190de3dcd7e32d7bcbf224e41` via `git rev-parse HEAD`
- **Reviewer note**: this review was produced with fresh context by a reviewer who did not write the plan, per the exercise's handoff step. No subagents were used. No file other than this one was created or modified, so `change.md` status was deliberately left unchanged.

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | WARNING |
| Lean Execution | WARNING |
| Architectural Fitness | FAIL |
| Blind Spots | WARNING |
| Plan Completeness | FAIL |

Two dimensions are FAIL, which by the strict rubric maps to RETHINK. The verdict recorded is REVISE because both failures are locally repairable: F1 is a one-character heading fix and F2 is a choice between two shapes that the plan already enumerates. The three-phase decomposition, its ordering, and the characterization-before-change discipline are sound and are not what needs rework. If F7's re-justification of K1 does not hold, the correct response is to drop Phase 3 alone (F6, fix B), not to redesign the plan.

## Grounding

Paths: 7/7 exist (`src/hono-base.ts`, `src/hono.test.ts`, `src/compose.ts`, `src/compose.test.ts`, `src/request.ts`, `src/request.test.ts`, `src/request/constants.ts`). Symbols: 6/6 confirmed (`routeIndex` at `src/request.ts:53`; the guard at `src/compose.ts:33-35`; the fast-path check at `src/hono-base.ts:432`; the synthetic `next` at `src/hono-base.ts:435-437`; `GET_MATCH_RESULT` at `src/request/constants.ts:1` and `src/request.ts:394`; `http-benchmark-on-pr` at `.github/workflows/ci.yml:197`). Brief to plan: phases, decisions and scope match. No em dashes outside the mandated Progress convention line. No calendar dates, no time estimates. No checkbox bullets outside `## Progress`. `context/foundation/lessons.md` and `docs/reference/contract-surfaces.md` do not exist in this project, so those two skill checks were skipped.

## Counter-question on the starred recommendation (K1)

The exercise requires at least one starred recommendation to be tested with a counter-question. K1 is the top-ranked candidate and the basis of D-004.

**Counter-question**: `routeIndex` is described as a raw, undocumented field whose rawness already caused a real bug, to be fixed by an accessor modelled on `GET_MATCH_RESULT`. Reading the clone, is any of that true, and would the proposed accessor have prevented the cited bug?

**Evidence gathered in the clone, three parts.**

1. **It is documented, and documented for user-land reads.** The declaration at `src/request.ts:53` indeed carries no JSDoc of its own, which is what research.md checked. But the shipped public JSDoc for the `matchedRoutes` getter instructs users to read it: `src/request.ts:419` contains `i === c.req.routeIndex ? '<- respond from here' : ''` inside an `@example` block for a public API method, and the identical example is repeated in the public `hono/route` helper at `src/helper/route/index.ts:26`. `git log -S routeIndex --oneline -- src` surfaces commit `68011665` ("docs: Add JSDoc (#1916)") as the commit that added it, so the documentation is deliberate, not incidental. `routeIndex` is therefore a documented, user-facing read surface, not undocumented internal state.

2. **The cited precedent is not analogous, in all three of the ways that matter.** `GET_MATCH_RESULT` exposes a **private** field (`#matchResult`), **read only** (`src/request.ts:394` declares a getter and no setter), to **one internal consumer** (`src/helper/route/index.ts:34`, reached through an `@ts-expect-error`); and `./request/constants` is absent from `package.json`'s `exports` map, so user code cannot import the symbol at all. `routeIndex` is the opposite on every axis: public, written as well as read (`src/compose.ts:44` and `src/middleware/combine/index.ts:106` both assign to it), and documented for user reads. A read-only symbol getter cannot model a field with two writers, so the symbol branch of the plan requires inventing a second, write-side symbol for which there is no precedent in the repository.

3. **The historical bug is real but does not point at the proposed fix.** Commit `43497358` ("fix(middleware/combine): prevent `c.req.routeIndex` from being changed (#3663)", Taku Amano) exists and is about this field, as research.md states. Reading its diff, the offending writer is `compose()` itself, not third-party code reaching into a raw field: `every()` calls `compose()` on a nested middleware array, and `src/compose.ts:44` unconditionally assigns `context.req.routeIndex = i` using the inner array's indices, overwriting the outer chain's value. The fix wraps each inner middleware with `c.req.routeIndex = currentRouteIndex // should be unchanged in this context`. An accessor whose read and write semantics are, in plan.md's own Phase 3 contract, "identical to the existing `routeIndex` field" would have been written through by that same nested `compose()` call and produced the same bug.

**Outcome**: the counter-question is not answered by the plan. Two of K1's three supporting claims are contradicted by code in the clone, and the third does not support the remedy. The defect class #3663 actually exposed is that `routeIndex` is per-dispatch-chain state held on a per-request object shared by nested chains; encapsulation does not address that, whereas scoping or a stack-shaped representation would. This does not automatically demote K1 (its bounded, fully enumerated blast radius and additive first step are unaffected), but the rank must be re-justified on those grounds rather than the ones currently written down, in plan.md, plan-brief.md, D-004 and research.md alike. Recorded as F7.

## Findings

### F1 - Phase 3 heading mismatch breaks the Progress parsing contract

- **Severity**: CRITICAL
- **Impact**: LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: `plan.md:112` and `plan.md:213`
- **Detail**: `references/progress-format.md` requires one `### Phase N: <name>` in Progress matching the `## Phase N: <name>` header in the plan body. The body reads `## Phase 3: `routeIndex` accessor, added alongside the existing field` while Progress reads `### Phase 3: `routeIndex` accessor added alongside the existing field`. The comma differs, so the headings do not match and `/10x-implement` cannot bind the phase to its Progress block. Phases 1 and 2 match exactly. Everything else in the Progress section is compliant: one heading, placed after `## References`, per-phase Automated and Manual subdivision, 1-based unique indices, one row per success criterion in both directions, no checkboxes elsewhere in the document.
- **Fix**: Remove the comma from `plan.md:112` so both headings read `Phase 3: `routeIndex` accessor added alongside the existing field`.
- **Decision**: PENDING

### F2 - Phase 3's contract offers two mutually exclusive shapes, one of which is not additive

- **Severity**: CRITICAL
- **Impact**: HIGH - architectural stake; broad implications, think carefully before deciding
- **Dimension**: Architectural Fitness
- **Location**: Phase 3, "Changes Required" item 1, Contract
- **Detail**: The contract reads "A getter/setter pair (or symbol-keyed accessor, matching the `GET_MATCH_RESULT` style ...)". These are not interchangeable. `routeIndex` is an instance data property initialised at `src/request.ts:53` (`routeIndex: number = 0`); declaring `get routeIndex()` / `set routeIndex()` on the same class does not sit alongside that field, it replaces it, turning an own data property into a prototype accessor. That contradicts the plan's central safety claim ("purely additive ... cannot break the three existing consumers") and its own Phase 3 manual verification step ("the existing `routeIndex` field itself is untouched - still public, still the same default and type"). It also changes observable shape for anything doing `Object.keys`, spread or `hasOwnProperty` on a `HonoRequest`, and puts a function call on `src/request.ts:104`, `112`, `114` and `446`, which are the parameter-resolution reads on every request. The symbol branch is genuinely additive but, per the counter-question, has no precedent for its write half and needs a new symbol added to `src/request/constants.ts`, which is not a public export path. The implementer is left to pick, and the two picks have opposite risk profiles.
- **Fix A (Recommended)**: Commit the plan to the symbol-keyed accessor and delete the getter/setter alternative. Name the symbols, state that they go in `src/request/constants.ts`, and state explicitly that a write-side symbol has no precedent in the repository and is new design.
  - Strength: Preserves the additive property the whole phase rests on, and keeps `src/request.ts:104-114` free of an added call on the parameter hot path.
  - Trade-off: Half the shape is invented rather than precedented, which weakens "an existing in-repo abstraction already fits" as a ranking argument for K1.
  - Confidence: HIGH - verified directly that `GET_MATCH_RESULT` is getter-only at `src/request.ts:394` and that `./request/constants` is not in `package.json` exports.
  - Blind spot: Whether a symbol write path is idiomatic for this repository is not determinable from the clone; no similar symbol setter exists anywhere in `src/`.
- **Fix B**: Drop Phase 3 from this plan and land Phases 1 and 2 only, re-scoping K1 in a follow-up once F6 and F7 are resolved.
  - Strength: Removes the only ambiguous deliverable, and Phases 1 and 2 stand on their own as a correctness fix plus a real closed test gap.
  - Trade-off: The plan then delivers no part of the top-ranked candidate's production change, so D-004's selection would need restating.
  - Confidence: MED - depends on whether the exercise requires K1 to produce production code in this plan.
  - Blind spot: Not verified whether the course exercise treats a test-only phase as a sufficient K1 deliverable.
- **Decision**: PENDING

### F3 - Phase 1's "no per-request cost" claim does not match the code the guard has to be written into

- **Severity**: WARNING
- **Impact**: MEDIUM - a real trade-off; pause to think it through
- **Dimension**: Blind Spots
- **Location**: Phase 1, plus "Performance Considerations", plus D-004's "one-line guard"
- **Detail**: The plan states the guard "executes only when `next()` is called a second time - a case that never occurs on a correct, successful request - so no per-request cost is expected". `compose()`'s guard is free because `compose` already maintains `let index = -1` at `src/compose.ts:21` for its own dispatch loop. The fast path has no equivalent state: `src/hono-base.ts:435-437` is a bare `async () => { c.res = await this.#notFoundHandler(c) }` with no counter and no flag. Adding the guard therefore means introducing a new per-dispatch closure variable and writing to it on every legitimate `next()` call, inside the exact block that `benchmarks/http-server/benchmark.ts`'s primary route (`app.get('/', (c) => c.text('Hi'))`) drives and that `http-benchmark-on-pr` measures on every PR (`.github/workflows/ci.yml:197-218`). The cost is very likely unmeasurable, but the plan asserts zero cost on a basis that is not what the code will do, and D-004 compounds this by calling K3 "a one-line guard plus a mirroring test". The plan's instinct to verify by benchmark is correct; only the stated reasoning is wrong.
- **Fix**: Restate Performance Considerations to say the guard adds a closure-local flag initialised per fast-path dispatch and assigned on each legitimate `next()`, expected to be below benchmark noise but measured rather than assumed, and correct D-004's "one-line guard" wording. Keep step 1.5 as written.
- **Decision**: PENDING

### F4 - Phase 1's manual benchmark step is unrunnable under the plan's stated prerequisites, and compares against the wrong baseline

- **Severity**: WARNING
- **Impact**: LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 Manual Verification, Testing Strategy step 1, plan-brief "Prerequisites"
- **Detail**: plan-brief states "Prerequisites: none beyond the pinned clone ... with `bun install` run". The benchmark shells out to `bombardier` (`benchmarks/http-server/benchmark.ts:185-187`), which is not a repository dependency; CI installs it explicitly as a separate step (`.github/workflows/ci.yml:210-214`). Separately, the script defaults to `--baseline=origin/main` (`benchmarks/http-server/benchmark.ts:25`) and checks that ref out, while the clone is detached at `edd138ee`, seven commits past v4.13.7. Running the command as written measures against `origin/main`, not against the pinned-commit baseline the Testing Strategy asks for. The hedge "or `benchmarks/fetch/compare.sh` if available" can also be resolved: that file exists.
- **Fix**: Add `bombardier` to prerequisites, specify the invocation as `bun run benchmark.ts --baseline=edd138ee`, and drop the "if available" hedge now that `benchmarks/fetch/compare.sh` is confirmed present.
- **Decision**: PENDING

### F5 - The PR-gated bundle and type-perf gate is named in the plan but never verified in the phase that would move it

- **Severity**: WARNING
- **Impact**: LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Current State Analysis, and Phase 3 Success Criteria
- **Detail**: Current State Analysis correctly notes the PR-gated type and bundle-size check. That job (`.github/workflows/ci.yml:184-195`, implemented in `.github/actions/perf-measures/action.yml`) runs tsc and typescript-go diagnostics plus `perf-measures/bundle-check/scripts/check-bundle-size.ts` and reports through octocov. Phase 3 adds code and a new exported symbol to `src/request.ts`, a core-spine file that lands in nearly every bundle, and adds a new type surface to a class the RPC client infers from. Phase 3's Automated Verification lists type check, tests, lint and build, none of which surfaces a bundle-size or type-instantiation delta. Phase 1 is the phase with a perf verification step; Phase 3 is the phase that moves the measured perf gate.
- **Fix**: Add a Phase 3 automated row running `bun run build` followed by `bun perf-measures/bundle-check/scripts/check-bundle-size.ts`, with a matching `3.x` entry in Progress.
- **Decision**: PENDING

### F6 - Phase 3 ships a mechanism with no consumer and no defined enforcement step

- **Severity**: WARNING
- **Impact**: HIGH - architectural stake; broad implications, think carefully before deciding
- **Dimension**: Lean Execution / End-State Alignment
- **Location**: Phase 3, and "What We Are NOT Doing"
- **Detail**: The exercise's Step 4 property is that mechanisms land green and enforcement is then switched on as an explicit, separate step. Phase 3 lands the mechanism, but no enforcement step exists anywhere: migration of the three consumers is out of scope, privatisation is out of scope, and no follow-up change is named, so nothing states when or whether enforcement becomes possible. What actually ships is a second way to reach a field that is already public and, per the counter-question, already documented for user-land reads at `src/request.ts:419`. Note that Phase 3 is the only production-code deliverable of K1 in this plan, since Phase 2 is test-only. Additionally, the enforcement step has a blocker the plan does not name: migrating the three internal consumers is non-breaking, but removing the public field afterwards is a breaking change to a documented public property, which is a semver-major decision for an upstream project and one this local analysis clone cannot make.
- **Fix A (Recommended)**: Keep Phase 3 but add a short "Enforcement" note stating the named follow-up (migrate the three consumers to the accessor), and stating explicitly that removing the public field is a breaking change to documented public API and is therefore not on this plan's path at all. That converts an open end into a recorded decision.
  - Strength: Preserves the mechanism-then-enforcement discipline the exercise asks for and makes the deferral defensible rather than silent.
  - Trade-off: It makes visible that "encapsulation" in the change title is never actually reached for this field.
  - Confidence: HIGH - verified the field is public and documented, and that all three consumers still read it directly.
  - Blind spot: Whether upstream would ever accept privatising a documented property is unknown and unknowable from the clone; the plan already flags this class of unknown honestly.
- **Fix B**: Drop Phase 3 (see F2 fix B) and re-scope K1 around the defect `#3663` actually exposed, namely nested `compose()` chains sharing one `routeIndex`.
  - Strength: Targets a verified real bug class rather than a naming and access-shape concern.
  - Trade-off: A larger, non-additive change touching `src/compose.ts`, contradicting the "cheapest and most independent first" ordering that makes this plan good.
  - Confidence: MED - the mechanism is verified from the `43497358` diff, but no target shape has been explored.
  - Blind spot: The blast radius of a scoping change to `compose()` was not assessed by this review.
- **Decision**: PENDING

### F7 - K1's ranking rationale rests on claims contradicted by the clone

- **Severity**: WARNING
- **Impact**: HIGH - architectural stake; broad implications, think carefully before deciding
- **Dimension**: End-State Alignment
- **Location**: `plan.md` Overview and Current State Analysis, `plan-brief.md` "What and why", `D-004` Rationale, `research.md:32` and `research.md:112`
- **Detail**: Full evidence is in the counter-question section above. In short: "no JSDoc" is true of the declaration but false of the field, which is documented for user-land reads at `src/request.ts:419` by deliberate commit `68011665`; the `GET_MATCH_RESULT` precedent is private, read-only and internal-only where `routeIndex` is public, read-write and documented; and bug `#3663`'s stomping writer was `compose()` itself on a nested chain, not "unrelated code reaching into" the field, so an identical-semantics accessor would not have prevented it. Three of the four axes on which D-004 declares K1 "the strongest candidate on every axis" are affected. The remaining two axes, small fully enumerated blast radius and an additive first step, are verified and hold.
- **Fix**: Correct the characterisation in `plan.md`, `plan-brief.md`, `D-004` and `research.md`'s K1 section, then either re-justify K1's rank on the two axes that survive or re-rank it against K3. Record the nested-compose scoping issue as a separate candidate rather than folding it into K1's justification.
- **Decision**: PENDING

### F8 - Verification gates differ between phases without a stated reason

- **Severity**: OBSERVATION
- **Impact**: LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Success Criteria of Phases 1, 2 and 3
- **Detail**: Phase 1 checks format but not build, Phase 2 checks neither, Phase 3 checks build but not format. CI's `main` job runs `format`, `lint`, `editorconfig-checker`, `build` and `test` on every push (`.github/workflows/ci.yml:49-53`), and the plan's own design makes each phase a separately committable, separately revertable unit, so each should clear the same gate.
- **Fix**: Give all three phases the same four automated rows (type check, test suite, lint, format), plus build where a phase touches `src/`, and mirror the additions in Progress with new indices.
- **Decision**: PENDING

### F9 - Cross-document consistency: one broken path reference, otherwise consistent

- **Severity**: OBSERVATION
- **Impact**: LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: `context/domain/02-invariant-aggregate-refactor.md`, Step 2
- **Detail**: The domain document points at `context/changes/hono-refactor-opportunities/D-004-hono-refactor-selection.md`; the decision record actually lives at `context/decisions/D-004-hono-refactor-selection.md`. Separately, on the cookie-merge question the brief asked about, the four documents are consistent: `research.md` (K4), `D-004`, `plan.md`'s "What We Are NOT Doing" and the domain document all state the two implementations are behaviourally opposite, and all four defer K4 behind a characterization step covering both directions rather than one. The domain document goes further and recommends aligning both call sites on the append policy, but explicitly marks that as a planning-stage recommendation and not a decision, so it does not contradict the deferral. The plan's `## References` section does not list the domain document even though that document describes itself as complementary to these phases.
- **Fix**: Correct the path in the domain document and add it to the plan's `## References`. Both edits fall outside this review's write scope.
- **Decision**: PENDING

### F10 - Exercise framing and external-repository targeting are stated honestly

- **Severity**: OBSERVATION
- **Impact**: LOW - no action required
- **Dimension**: Plan Completeness
- **Location**: `plan.md` header, `change.md`, `plan-brief.md` header, `D-004`
- **Detail**: Recorded as a pass rather than a problem, since the brief asked about it. Every artifact states the target is the external `honojs/hono` clone at the pinned commit, that all plan paths are relative to that clone, and that implementing the plan is optional for the certification exercise with the ranked research and the plan itself as the required deliverables. `plan.md`'s scope section explicitly excludes any change to the subscription-splitter application, and the open-risks section is candid that upstream acceptance of the accessor shape is unknown and that the plan targets a local, disposable clone rather than an upstream contribution. Non-goals are explicit and defensible throughout: seven items under "What We Are NOT Doing", each traceable to research.md or D-004. K2's rejection is evidenced by commit `ec94acd9` and its literal "optimized for RegExpRouter" title, and K4's deferral is evidenced by five named commits plus the two named `src/context.test.ts` tests pinning the divergent behaviours, so neither is assumed. Remaining unknowns are carried explicitly in research.md rather than resolved by guesswork.
- **Fix**: None.
- **Decision**: PENDING

## Exercise Step 4 properties, assessed

| Property | Holds? | Reference |
|---|---|---|
| Characterization before touching uncovered code | YES | Phase 2 is test-only and precedes Phase 3; the gap it closes is real, confirmed by `rg -c "new Context\(" src/compose.test.ts` returning 30 constructions with zero `matchResult` hits, so `src/compose.ts:44` has no compose-level coverage today |
| Phases as separately reversible commits, cheapest and most independent first | YES | Stated in "Implementation Approach" and true on inspection: Phase 1 touches `src/hono-base.ts` and `src/hono.test.ts`, Phase 2 only `src/compose.test.ts`, Phase 3 `src/request.ts` and `src/request.test.ts`, with no file overlap between phases |
| Automatic and manual verification per phase | YES, with gaps | Every phase has both; F5 and F8 are gaps in which checks, not in whether checks exist |
| Mechanisms land green before enforcement is switched on | PARTIAL | Phase 3 lands the mechanism green, but no enforcement step exists anywhere in the plan or in a named follow-up, and its blocker is unstated (F6) |

## Resolution

Applied after this review, in `research.md`, `plan.md`, `plan-brief.md`, `D-004-hono-refactor-selection.md`, and `context/domain/02-invariant-aggregate-refactor.md`.

| Finding | Decision | What changed |
|---|---|---|
| F1 - Phase 3 heading mismatch | Moot | Phase 3 (the `routeIndex` accessor) was removed entirely as part of resolving F7, so the mismatched heading no longer exists. The revised `plan.md` has exactly two phases; both `## Phase N` body headings and `### Phase N` Progress headings were re-checked and match exactly. |
| F2 - Phase 3's two mutually exclusive accessor shapes | Moot | Same removal as F1: with Phase 3 dropped, the getter/setter-vs-symbol ambiguity no longer exists in this plan. If the deferred K1 candidate is revisited later, this finding is the reason its target shape needs re-designing, not assumed from the original research. |
| F3 - Fast-path guard cost claim did not match the code | Fixed | `plan.md`'s Current State Analysis and the guard phase's Contract and Performance Considerations now state explicitly that the guard needs a new per-dispatch closure flag (`compose()`'s existing `index` state is not reusable), that this is new state rather than free, and that the cost is measured, not assumed. `D-004`'s rationale no longer calls this "a one-line guard." |
| F4 - Benchmark step unrunnable / wrong baseline | Fixed | The guard phase's manual verification step now names `bombardier` as a prerequisite (not a project dependency, installed separately in CI), specifies `bun run benchmark.ts --baseline=edd138ee` explicitly instead of the tool's `origin/main` default, and `plan-brief.md`'s Prerequisites list `bombardier`. |
| F5 - Bundle/type-perf gate unverified in the phase that moves it | Fixed | The guard phase (now the only production-code phase) gained an automated success criterion and a matching Progress row (2.6) running the build plus `perf-measures/bundle-check/scripts/check-bundle-size.ts` against the pinned-commit baseline, since it touches `src/hono-base.ts`, part of the default bundle that gate measures. |
| F6 - Phase 3 ships a mechanism with no consumer or enforcement step | Moot, addressed by removal | Rather than adding an enforcement note to a mechanism-only phase (Fix A), the phase was removed (in the spirit of Fix B) and the blocker is now stated directly in `plan.md`'s "What We Are NOT Doing": the field is a documented public property, so removing or narrowing it is a breaking upstream change requiring a deprecation path and a migrated consumer first - decisions this analysis is not positioned to make. |
| F7 - K1's ranking rationale rests on refuted claims | Fixed | `research.md`'s K1 section now records the three corrections in place of the original claims (documented read surface at `src/request.ts:419`; the `GET_MATCH_RESULT` precedent is not analogous; the `#3663` bug's actual cause was `compose()` overwriting shared state across nested chains, not third-party field access). The ranked list moved K1 to "deferred, re-justify," promoted the characterization test and the fast-path guard to "selected," and kept K4/K2 in their prior positions. `D-004`'s Decision, Rationale, Review objection and Resolution were all updated to match; no document still asserts the refuted claims as settled fact. |
| F8 - Inconsistent verification gates between phases | Fixed | Both remaining phases now carry the same four automated checks (type check, test, lint, format), with build and the bundle-size check added to the phase that touches `src/`, mirrored in `## Progress` with new indices. |
| F9 - Broken cross-reference and a missing plan reference | Fixed | `context/domain/02-invariant-aggregate-refactor.md`'s path reference to the decision record was corrected to `context/decisions/D-004-hono-refactor-selection.md`, its stale mentions of "K1/K3 phases" and "K1/K4 candidates already selected" were corrected to reflect K1's deferral, and `plan.md`'s `## References` now lists the domain document. |
| F10 - Framing and external-repository targeting | No action needed | Re-checked against the revised documents; still holds. Every artifact continues to state the target is the external `honojs/hono` clone, that implementation is optional, and that this repository is unaffected. |

The Exercise Step 4 property that was PARTIAL ("mechanisms land green before enforcement") is resolved by removal rather than by adding the missing enforcement step: there is no longer a mechanism-only phase in this plan to hold that property open. `change.md`'s status is now `plan_reviewed`.
