Analyzed repository: honojs/hono, commit edd138ee3049749190de3dcd7e32d7bcbf224e41 (upstream tag/version as reported by `git describe --tags`: v4.13.7-7-gedd138ee)

This is an analysis of an external open-source project (Hono, a TypeScript web framework), kept as a separate reference target from the subscription-splitter application. The clone lives at `/Users/sebastian.f/Projects/10xDevs/analysis/hono` and is not part of this repository. Tool: `ast-grep 0.45.3` (`ast-grep`/`sg` on PATH). All commands run from the clone root. Every zero-result ast-grep query below is corroborated with `rg`, per the exercise's rule.

# Structural claims extracted from research.md

| # | Claim (as written in research.md) | Verdict |
|---|---|---|
| 1 | `src/router.ts` has zero imports | confirmed |
| 2 | `src/compose.ts` imports only via `import type` (2 declarations, both type-only) | confirmed |
| 3 | Default `Hono` (`src/hono.ts`) wires `new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] })` | refined |
| 4 | Six adapters call the app's `.fetch()`: aws-lambda, lambda-edge, netlify, vercel, service-worker, cloudflare-pages | confirmed |
| 5 | `bun`, `cloudflare-workers`, `deno` adapters contain no `app.fetch(` call | confirmed |
| 6 | `routeIndex` is read/written directly, outside `compose.ts`/`request.ts`, in exactly 3 files: `src/middleware/combine/index.ts`, `src/middleware/method-not-allowed/index.ts`, `src/helper/route/index.ts` | confirmed |
| 7 | `matchResult` (the literal identifier) is scoped to 3 source files plus 1 test file | confirmed / refined precision |
| 8 | `Result<T>`'s two variants are produced as claimed: `RegExpRouter`'s matcher returns a 2-element tuple; `TrieRouter`, `LinearRouter`, `PatternRouter` return the single-element form | confirmed |
| 9 | `compose.ts`'s "next() called multiple times" guard (`if (i <= index) throw ...`) occurs exactly once | confirmed |
| 10 | `Context`'s `set-cookie` special-casing (append, don't overwrite) is a single mechanism inside the `res` setter | refuted (refined) |
| 11 | `#dispatch`'s fast-path check `matchResult[0].length === 1` occurs exactly once, only in `src/hono-base.ts` | confirmed |
| 12 | `Context.req`'s lazy getter uses `??=` memoization | confirmed |
| 13 | `compose.test.ts` never references `routeIndex` (test-gap sub-agent's claim) | confirmed (zero) |
| 14 | `MESSAGE_MATCHER_IS_ALREADY_BUILT` is never referenced by any test file (test-gap sub-agent's claim) | confirmed (zero) |
| 15 | Cited test line ranges are real and match their described assertions (spot check) | confirmed |

# Queries, results, and reasoning

## 1. `src/router.ts` has zero imports

```
ast-grep run --pattern 'import $$$ from $SRC' --lang ts src/router.ts
rg -n "^import" src/router.ts
```
Result: ast-grep matched nothing (with a benign "pattern matched nothing" note); `rg` count = 0. **Confirmed** - zero-result corroborated with `rg` as required.

## 2. `src/compose.ts` import shape

```
ast-grep run --pattern 'import $$$ from $SRC' --lang ts src/compose.ts
```
Result: 2 matches, both are the lines `import type { Context } from './context'` and `import type { Env, ErrorHandler, Next, NotFoundHandler } from './types'` (confirmed by reading the matched lines and by `grep -n "^import" src/compose.ts`, which shows the literal `type` keyword on both). **Confirmed**: exactly 2 import declarations, both type-only - no value-level import of `Context` in `compose.ts`.

## 3. Default router wiring, and a preset nuance

```
ast-grep run --pattern 'new SmartRouter($$$ARGS)' --lang ts src
```
Result: 3 matches, not 1:
- `src/hono.ts:30-32` - `new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] })` (the one research.md cited).
- `src/preset/quick.ts:20-22` - `new SmartRouter({ routers: [new LinearRouter(), new TrieRouter()] })` - a **different** router combination, used by the `hono/quick` preset.
- `src/router/smart-router/router.test.ts:9-11` - a test construction, not production wiring.

**Refined**: research.md's claim about `src/hono.ts`'s wiring is accurate as stated for the main `Hono` class, but it implicitly reads as "the" default when in fact Hono ships at least one other preset (`hono/quick`, `src/preset/quick.ts`) with a different router pairing (`LinearRouter` + `TrieRouter` instead of `RegExpRouter` + `TrieRouter`). This does not change the dispatch trace (both presets still go through `SmartRouter -> Router<T>.match() -> Result<T>`), but research.md should note that `src/hono.ts` is the main entry, not the only one. Corrected in research.md's Architecture insights.

## 4 and 5. Adapter `.fetch()` call sites

```
ast-grep run --pattern '$X.fetch($$$ARGS)' --lang ts src/adapter
ast-grep run --pattern 'app.fetch($$$ARGS)' --lang ts src/adapter
```
The broad pattern (`$X.fetch(...)`, any receiver) returned 9 call expressions across 6 files - but 2 of those are not the Hono app's dispatch: `src/adapter/service-worker/handler.ts:31` (`opts.fetch(evt.request)`, a fallback option, not `app.fetch`) and `src/adapter/cloudflare-pages/handler.ts:117` (`env.ASSETS.fetch(c.req.raw)`, a Cloudflare static-assets binding, unrelated to Hono dispatch). Narrowing the pattern to `app.fetch($$$ARGS)` specifically returns exactly 7 call sites across exactly 6 files: `aws-lambda/handler.ts` (2 call sites, lines 157 and 272), `lambda-edge/handler.ts:128`, `netlify/handler.ts:8`, `vercel/handler.ts:7`, `service-worker/handler.ts:29`, `cloudflare-pages/handler.ts:37`. **Confirmed** for claim 4, with the refinement that a naive `.fetch(` grep (as the original blast-radius pass used) over-counts by 2 unrelated calls - worth noting since "count call sites" claims are exactly what this verification step exists to catch.

```
ast-grep run --pattern 'app.fetch($$$ARGS)' --lang ts src/adapter/bun
ast-grep run --pattern 'app.fetch($$$ARGS)' --lang ts src/adapter/cloudflare-workers
ast-grep run --pattern 'app.fetch($$$ARGS)' --lang ts src/adapter/deno
rg -n "\.fetch\(" src/adapter/bun src/adapter/cloudflare-workers src/adapter/deno
```
All six commands returned zero matches (ast-grep and `rg` agree). **Confirmed** (zero, corroborated with `rg`): these three adapters genuinely contain no call to `app.fetch()`.

## 6. `routeIndex` external consumers

```
ast-grep run --pattern '$X.routeIndex' --lang ts src
rg -n "routeIndex" src --type ts -g '!*.test.ts'
```
Both agree on the same file set: `src/compose.ts:44` (the assignment), `src/request.ts:104,112,114,446` (the field's own consumers, plus its declaration at line 53 which the member-access pattern doesn't match since it's a field declaration, not a `this.`/`c.req.` access), `src/helper/route/index.ts:59,83,108`, `src/middleware/method-not-allowed/index.ts:65`, `src/middleware/combine/index.ts:101,106`. **Confirmed**: exactly 3 files outside the core pair read/write `routeIndex` directly.

## 7. `matchResult` scope

```
rg -ln "matchResult" src --type ts
```
Result: exactly 4 files - `src/request.ts`, `src/hono-base.ts`, `src/context.ts`, `src/helper/route/index.test.ts`. Note `src/router.ts` and `src/compose.ts` do **not** appear - they carry the `Result<T>` type/value without using the literal local-variable name `matchResult` (router.ts defines the type; compose.ts's parameter is named `middleware`). **Confirmed / refined precision**: research.md's original phrasing ("outside the core/router files") was accurate but did not give the exact file count; this pins it at exactly 3 source files + 1 test file.

## 8. `Result<T>` variant shapes across router implementations

```
ast-grep run --pattern 'return [$A, $B]' --lang ts src/router/reg-exp-router/matcher.ts
ast-grep run --pattern 'return [$A]' --lang ts src/router/trie-router/node.ts
ast-grep run --pattern 'return [$A]' --lang ts src/router/linear-router/router.ts
ast-grep run --pattern 'return [$A]' --lang ts src/router/pattern-router/router.ts
```
Results: `reg-exp-router/matcher.ts:24` (`return [[], emptyParam]`) and `:28` (`return [matcher[1][index], match]`) - both 2-element tuples, the `[[T,ParamIndexMap][], ParamStash]` variant. `trie-router/node.ts:215` - `return [handlerSets.map(...)]`, single-element. `linear-router/router.ts:149` and `pattern-router/router.ts:52` - both literally `return [handlers]`, single-element. **Confirmed** exactly as described (with the `search()` method itself declared at `node.ts:86`, matching the blast-radius sub-agent's citation, and its `return` statement at `node.ts:215`).

## 9. "next() called multiple times" guard

```
ast-grep run --pattern 'if ($I <= $INDEX) { throw $ERR }' --lang ts src
```
Result: exactly one match, `src/compose.ts:33-35`. **Confirmed**: single occurrence, no duplicate/parallel guard elsewhere in `src/`.

## 10. `set-cookie` special-casing - refuted as "single mechanism"

```
ast-grep run --pattern "if ($K === 'set-cookie') { $$$BODY }" --lang ts src/context.ts
rg -n "set-cookie" src/context.ts
```
The ast-grep pattern returned no match (a single-character bound-variable pattern against this exact shape did not parse-match, a pattern-syntax limitation, not evidence of absence) but `rg` found 4 lines: 421, 423, 425 (the `res` setter, as research.md described) **and a second, independent occurrence at line 618**, inside a private `#newResponse` helper (used by `c.body()`/`c.json()`/etc.), which has its own `if (key === 'set-cookie') { responseHeaders.append(key, value) } else { responseHeaders.set(key, value) }` block. **Refuted as originally framed**: the "don't clobber set-cookie" rule is implemented twice, independently, in two different methods of `Context` (`res` setter around line 421, and `#newResponse` around line 618) - not once. This is itself a small piece of technical debt (duplicated header-merge logic that could drift out of sync) and has been added to research.md's Technical debt section.

## 11. Fast-path length check is singular

```
rg -n "matchResult\[0\]\.length" src --type ts
```
Result: exactly one hit, `src/hono-base.ts:432`. **Confirmed**: no test or other source file duplicates or asserts on this internal check directly (consistent with the test-gap sub-agent's finding that no test references `matchResult[0].length`).

## 12. Lazy `req` getter memoization

```
ast-grep run --pattern '$X ??= $Y' --lang ts src/context.ts
```
Result includes `src/context.ts:367` - `this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult)`, alongside one other unrelated `??=` (the `#preparedHeaders` lazy default at line 405). **Confirmed** as described.

## 13. `compose.test.ts` never references `routeIndex`

```
ast-grep run --pattern 'routeIndex' --lang ts src/compose.test.ts
rg -n "routeIndex" src/compose.test.ts
```
Both empty. **Confirmed** (zero, corroborated with `rg`) - this is the basis for technical-debt finding #1 in research.md (no compose-level test of per-step `routeIndex` advancing).

## 14. `MESSAGE_MATCHER_IS_ALREADY_BUILT` untested

```
rg -n "MESSAGE_MATCHER_IS_ALREADY_BUILT|already built" src --type ts -g '*.test.ts'
```
Zero matches (checked separately from the non-test search, which does find the 2 production throw sites in `src/router/reg-exp-router/router.ts:73` and `src/router/smart-router/router.ts:15`, both importing the constant from `src/router.ts:21`). **Confirmed** (zero, corroborated by explicitly re-running the search scoped to `*.test.ts` only).

## 15. Spot-checked test citations

Read directly: `src/hono.test.ts:2800-2819` ("Should handle Env and ExecuteContext", calls `app.fetch(request, {TOKEN:'foo'}, {waitUntil:..., passThroughOnException:...})`, asserts on `res.status`/`res.json()`) and `src/compose.test.ts:363-402` ("should get executed order one by one", builds a stack of middleware and asserts execution order via a shared array). Both match their descriptions in research.md and the test-gap sub-agent's report. **Confirmed** for these two; the remaining cited line ranges were taken as reported by the sub-agent without a second independent read of every one (see Unknowns).

# Corrections applied to research.md

1. Added a note that `src/hono.ts`'s `SmartRouter(RegExpRouter, TrieRouter)` wiring is the main entry point's default, not the only router preset - `hono/quick` (`src/preset/quick.ts`) wires `SmartRouter(LinearRouter, TrieRouter)` instead.
2. Corrected the `set-cookie` special-casing claim from "a single mechanism in the `res` setter" to "implemented independently in two places" (`res` setter and `#newResponse`), and added this duplication as a technical-debt observation.
3. Pinned the `matchResult` identifier's scope to an exact file list (3 source files + 1 test file) rather than the looser original phrasing.
4. Noted that a naive `.fetch(` search over-counts adapter call sites by 2 (a service-worker fallback option call and a Cloudflare Pages static-assets binding call) versus the precise `app.fetch(...)` count of 7 call sites in 6 files.

# Unknowns

- Not every test line range cited by the test-gap sub-agent was independently re-read in this verification pass; two were spot-checked and matched. The remainder are taken on the sub-agent's evidence-labeled report, not independently re-verified line-by-line here.
- `ast-grep`'s pattern matcher rejected a few single-character-identifier or short string-literal patterns as ambiguous (the `set-cookie` case in section 10); in those cases `rg` was used as the primary corroborating tool and is noted as such rather than silently treated as an ast-grep result.
