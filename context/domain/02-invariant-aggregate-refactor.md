Analyzed repository: honojs/hono, commit edd138ee3049749190de3dcd7e32d7bcbf224e41 (upstream tag/version as reported by `git describe --tags`: v4.13.7-7-gedd138ee)

This is an analysis of an external open-source project (Hono, a TypeScript web framework), kept as a separate reference target from the subscription-splitter application. The clone lives at `/Users/sebastian.f/Projects/10xDevs/analysis/hono` and is not part of this repository. This is a refactor PLAN, not an implementation - no production code was modified.

# 02: Invariant, aggregate, and refactor design

## Step 0: Context

No PRD/requirements document exists for this framework repository (see `01-domain-distillation.md`, Step 0). Business logic for the invariant analyzed here lives entirely in `src/context.ts` (the response-construction layer), with peripheral touches from middleware under `src/middleware/*` that mutate response headers directly once a response object exists.

## Step 1: Candidate invariants identified

| Invariant | Source |
|---|---|
| A response's headers, once merged from a prior response (on reassignment or incremental construction), must preserve all previously-set cookies - a cookie set earlier in the request lifecycle must not be silently dropped | Implied by the "built on Web Standards" commitment (`README.md:22`) and by `Context`'s own test suite, which explicitly asserts cookie preservation as intended behavior in two different places (`src/context.test.ts`) |
| `HonoRequest.routeIndex` must always index the entry of `matchResult` corresponding to the currently-executing step of a dispatch chain | Implied by the router being Hono's headline feature (`README.md:41`); code: `src/compose.ts:44`, `src/request.ts:104-124` |
| `next()` (the middleware continuation) must not be invoked more than once per dispatch step | Explicit in `compose.ts`'s own guard (`src/compose.ts:33-35`, `throw new Error('next() called multiple times')`) - a rule the code declares for itself |
| A router's `match()` result must conform to one of exactly two shapes (`Result<T>`, `src/router.ts:98`), and every consumer must agree on which shape a given router returns | Implied by the router being swappable (`HonoOptions.router`, `src/hono-base.ts:65`) |

## Step 2: Classification and selection

| Invariant | (a) Core to product sense | (b) Dispersion (files/layers) | (c) Enforcement |
|---|---|---|---|
| Cookie preservation on header merge | High - HTTP correctness is foundational to a web framework; a dropped session/auth cookie is a real, user-visible defect | High - lives independently in `src/context.ts`'s `res` setter (~414-434) and `#newResponse` (~608-654), plus a further, non-conflicting dispersion point where middleware like `src/middleware/cors/index.ts:102-148` mutate `c.res.headers` directly once a response exists | **Violated in practice** - the two implementations enforce opposite policies (see Step 3); this is not a coverage gap, it is a live contradiction, each side proven by the project's own tests |
| `routeIndex` correctness | High - parameter resolution is inseparable from routing correctness | Medium - `compose.ts` (writer), `request.ts` (owner/reader), 3 external reader files (`middleware/combine`, `middleware/method-not-allowed`, `helper/route`) | Weakly verified - no test drives it through a real multi-handler `compose()` chain (confirmed in `context/changes/hono-request-dispatch-analysis/research.md`) |
| `next()` single-invocation | Medium - a control-flow correctness rule more than a business rule | Low-medium - the rule is declared once in `compose.ts`, but the fast path in `hono-base.ts` implements an equivalent step without the guard | Inconsistent between two dispatch paths, but the gap is currently latent (no known triggering bug), unlike the cookie case |
| `Result<T>` shape agreement | High - "swap the router" is a named product capability | Medium - `router.ts` (type) + 4 router implementations + `request.ts` (consumer) | Enforced structurally (TypeScript catches malformed shapes) but not semantically tagged; verified as a deliberate performance trade-off (`context/changes/hono-refactor-opportunities/research.md`, K2), not accidental |

**Selected invariant #1: cookie preservation on response header merge.** It scores highest on core-ness (a real HTTP-correctness guarantee, not an internal control-flow detail) and is the only one of the four where enforcement is not merely weak but **actively contradictory today**, provable with the project's own existing tests. `routeIndex` correctness (rank #2 by this analysis) is already the subject of the code-structure-driven refactor selected in `context/changes/hono-refactor-opportunities/D-004-hono-refactor-selection.md`'s K1 - this domain-lens analysis independently arrives at the same area as a strong candidate, which is corroborating evidence rather than a competing claim.

## Step 3: Diagnosis of the selected invariant

Both code paths that claim to "merge headers, preserving cookies" were read in full, at the pinned commit:

**`Context`'s `res` setter** (`src/context.ts:414-434`), which runs on `c.res = someResponse`: iterates the **old** response's headers onto the **new** one; for `content-type` it skips (new always wins); for `set-cookie` it takes the **old** response's cookies, `_res.headers.delete('set-cookie')`, then appends only the old ones back - **discarding whatever cookies the newly-assigned response already carried**. Proven intentional (not a misreading) by `src/context.test.ts`'s own test, "Should set cookie headers when re-assigning Response to `c.res`": after two cookies are set, then `c.res` is reassigned to a response carrying one different new cookie, the assertion expects the result to equal the original two, with the new one gone.

**`Context`'s `#newResponse`** (`src/context.ts:608-654`, backing `c.body()`/`c.json()`/etc.): seeds header state from the **old** response, then layers new headers on top; for `set-cookie` it **appends** rather than replaces, so old and new cookies **both survive**. Proven by `src/context.test.ts`'s "Should keep previous cookies in response headers" test.

The invariant "cookie preservation" is therefore declared twice, in the same class, with opposite meanings: replace-on-reassignment vs. append-on-incremental-build. Neither path is unenforced (each has a passing test); the problem is that **the two enforcements disagree**, and a caller cannot know which behavior to expect from "setting a cookie and then touching the response again" without knowing which of the two code paths they are about to go through. A third, non-conflicting dispersion point exists: once `c.res` has been read (creating the underlying `Response` object), middleware such as `src/middleware/cors/index.ts:102,120,144,147-148` mutate `c.res.headers` directly via `.set()`/`.append()`/`.delete()` - this does not implement a competing merge policy (there is nothing to merge, only one live `Headers` object being mutated in place), but it means any change to how header merging works must also account for code that bypasses both `Context` methods entirely once a response exists.

No client (UI) layer is involved - Hono is a server-side library, so "the client is the only guard" does not apply here; the closest analogue is that **callers of `c.res = ...` have no way to discover which merge policy will apply**, since both call sites look identical from outside `Context`.

## Step 4: Aggregate-guardian design

Design goal: make `Context` (already the natural aggregate root for per-request state) the **sole** owner of response header merging, replacing the two independently-invented implementations with one explicit, named policy per operation.

**Domain type**: a private `ResponseHeaderMerge` concern (not necessarily a new class - could be two private methods on `Context`, but named and documented as a pair rather than incidental helpers) with two operations:

```
replaceResponse(current: Response | undefined, next: Response): Response
  // Precondition: none - next may be a fresh Response with no relation to current.
  // Policy: COOKIE_MODE (a named, single decision - see below) determines whether
  // next's own cookies are kept, or current's cookies take precedence.
  // Postcondition: content-type from `next` always wins (unchanged from today).

extendResponse(current: Response | undefined, incomingHeaders: HeaderRecord): Headers
  // Precondition: none.
  // Policy: incoming cookies are always appended to current's cookies (unchanged
  // from today's #newResponse behavior) - this becomes the one authoritative
  // definition, not a second, independently-arrived-at copy of it.
```

`replaceResponse`'s `COOKIE_MODE` is the one open product decision this diagnosis surfaces rather than resolves: today's `res`-setter behavior (old cookies win on reassignment) may be an accident of implementation order, not a considered choice, since git archaeology in `context/changes/hono-refactor-opportunities/research.md` found no commit ever discussing this specific asymmetry. The domain-modeling recommendation is to make `replaceResponse` use the **same** append policy as `extendResponse` (both survive) by default, since "silently dropping a cookie the caller just set" is a stronger correctness violation than "an old cookie the caller may have expected to be replaced also survives" - a caller wanting true replacement can already call `c.res.headers.delete('set-cookie')` explicitly before reassigning. This is a recommendation for the planning stage to confirm, not a decision made here; the aggregate's contract is designed to make this a single, visible, testable decision instead of two silent, disagreeing ones.

**No repository/persistence layer applies** - `Context` does not persist anything; "loading and saving the aggregate" here means "constructing and returning a `Response`," which is already atomic (a single object returned once per request). No transaction boundary is needed beyond what already exists.

**API/route boundary**: unchanged from today - `c.res = ...`, `c.json(...)`, `c.body(...)` etc. remain the public surface; only their shared internal implementation changes. No error needs to become a thrown domain exception here, since there is no "illegal operation," only an implementation choice about which of two already-tested behaviors is authoritative.

## Step 5: Before/after, plan, tests

| Site | Before | After |
|---|---|---|
| `res` setter (`src/context.ts:414-434`) | Own inline "replace, but old-cookie-wins" logic | Calls the shared `replaceResponse` operation |
| `#newResponse` (`src/context.ts:608-654`) | Own inline "append, both survive" logic | Calls the shared `extendResponse` operation |
| `src/middleware/cors/index.ts` and similar direct `c.res.headers` mutators | Unchanged - they do not merge two responses, only mutate one live object | Unchanged; noted as a dependency to be aware of, not something this refactor touches |

Phased plan (consistent with `context/changes/hono-refactor-opportunities/plan.md`'s convention of characterization tests before structural change, and complementary to, not a duplicate of, that plan's K1/K3 phases - this is the K4 candidate's design, deferred there to "after a characterization step"):

1. **Characterization phase** (test-only): add tests pinning both of today's behaviors explicitly as named cases - "reassignment currently keeps only the prior cookies" and "incremental body construction currently keeps both" - so the current, possibly-accidental behavior is a documented fact before anything changes. Uses the project's existing `vitest` runner (`bun run test`), no new tooling needed.
2. **Extraction phase**: introduce `extendResponse` as the single implementation backing `#newResponse`, with no behavior change (it already matches the recommended default) - a pure refactor, verified by the characterization test from step 1 continuing to pass unchanged.
3. **Decision phase**: for `replaceResponse`, either (a) change the `res` setter to use the append policy (a behavior change, requires updating the "re-assigning Response" test's expectation, and should be called out prominently, e.g. in a changelog, since it is user-visible) or (b) keep the replace policy but make it an explicit, named parameter rather than an accident of which code path executes - this decision is out of scope for this document per the exercise's own rule ("if the real fix is a business-concept redesign, say so and stop"); it is a genuine domain/product call, not a structural one.

Test cases needed for the invariant (legal/illegal is not quite the right frame here, since both directions are "legal," but both must be pinned): reassignment with disjoint cookie sets (today: old wins), incremental construction with disjoint cookie sets (today: both survive), reassignment/construction with overlapping cookie names (unspecified today - not currently tested, and worth adding as its own case since "which cookie with the same name wins" is a distinct question from "are both preserved").

No new "load-bearing names" need registering in a contract registry - this repository has no `docs/reference/contract-surfaces.md` or equivalent; `replaceResponse`/`extendResponse` are internal, not part of the public API.

## Summary

The response-header-merge invariant, specifically cookie preservation, is the strongest domain-level refactor candidate in the areas examined: it is core to what a "Web Standards" HTTP framework must guarantee, and unlike every other invariant considered, it is not merely weakly tested but **actively implemented two contradictory ways today**, each provable with the project's own passing tests. The diagnosis traced both implementations to file:line and showed they disagree specifically on whether a cookie set on a freshly-reassigned response is kept or discarded. The proposed fix consolidates both into two named operations on `Context`, `replaceResponse` and `extendResponse`, with a single explicit policy each - surfacing, rather than resolving, the one real product question (which cookie-merge direction is "correct" for reassignment) as a decision for the planning stage. This finding independently reinforces, rather than duplicates, the code-structure-driven K1/K4 candidates already selected and deferred in `context/changes/hono-refactor-opportunities/`.
