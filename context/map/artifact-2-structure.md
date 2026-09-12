Analyzed repository: honojs/hono, commit edd138ee3049749190de3dcd7e32d7bcbf224e41 (upstream tag/version as reported by `git describe --tags`: v4.13.7-7-gedd138ee)

This is an analysis of an external open-source project (Hono, a TypeScript web framework), kept as a separate reference target from the subscription-splitter application. The clone lives at `/Users/sebastian.f/Projects/10xDevs/analysis/hono` and is not part of this repository.

# Artifact 2 - Structure (dependency graph evidence)

## Tooling reconnaissance (done before installing anything)

- Package manager: `bun@1.2.20` (from `packageManager` in `package.json`). No `workspaces` field - this is a single package, not a monorepo.
- No path aliases in `tsconfig.json`/`tsconfig.base.json` (no `paths`/`baseUrl`); module resolution is plain relative imports plus the package's own `exports` map.
- Existing scripts (`bun run lint`, `format`, `build`, `test*`) do not include any dependency-graph tool. `grep -Ei 'dependency-cruiser|madge|nx |turborepo' package.json` returned nothing before install - no existing graph tooling to reuse.
- Chose `dependency-cruiser` (per exercise default) since none was present. Installed locally with `bun add -d dependency-cruiser` (needed so it can resolve the project's own local `typescript`, itself installed via `bun install`, from the project's `node_modules` - running it purely through `npx` without local `node_modules` produced 0 parsed modules because no TypeScript transpiler was resolvable). Both `bun install` and `bun add -d dependency-cruiser` touch this clone's `package.json`/`bun.lock` and create `node_modules/`; nothing is committed or pushed anywhere, this is a disposable local analysis clone.

## Commands run

```
bun install
bun add -d dependency-cruiser

./node_modules/.bin/depcruise src \
  --no-config \
  --include-only '^src' \
  --exclude '\.test\.(ts|tsx)$|\.test-d\.(ts|tsx)$' \
  -T json -f full.json \
  --metrics \
  --ts-pre-compilation-deps
```

Result: **188 modules, 568 dependencies cruised** inside `src/` (test files excluded). This is the base graph all findings below are computed from.

## Entry points vs deep hubs

- `src/index.ts` is a thin public barrel: it re-exports `Hono` and public types from `./hono`, `./context`, `./request`, `./types`, `./client` - 6 internal edges, no logic of its own.
- The package additionally exposes **76 subpath exports** in `package.json`'s `exports` map (e.g. `./cache`, `./cookie`, `./basic-auth`, `./cloudflare-workers`, `./tiny`) - one thin entry file per adapter/middleware/helper, each importing from the same small core.
- Fan-in ranking (how many modules import each file) shows the real deep hubs:

| Rank | Module | Fan-in (modules importing it) |
|---|---|---|
| 1 | `src/types.ts` | 53 |
| 2 | `src/context.ts` | 46 |
| 3 | `src/router.ts` | 23 |
| 4 | `src/jsx/base.ts` | 22 |
| 5 | `src/utils/html.ts` | 18 |
| 6 | `src/hono.ts` | 17 |
| 7 | `src/jsx/context.ts` | 16 |
| 8 | `src/http-exception.ts` | 12 |

`src/types.ts` and `src/context.ts` are the two clearest deep centers of the whole codebase - roughly a quarter to a third of all modules in `src/` import them directly. This lines up with `artifact-1-territory.md`'s finding that these same files are cross-cutting "spine" files in the commit history.

Fan-out ranking (how many things a module itself imports) shows the opposite end - modules that pull in the most, i.e. the ones most likely to be hard to unit-test in isolation:

| Rank | Module | Fan-out |
|---|---|---|
| 1 | `src/jsx/dom/index.ts` | 13 |
| 2 | `src/jsx/streaming.ts` | 11 |
| 3 | `src/jsx/index.ts` | 10 |
| 3 | `src/jsx/base.ts` | 10 |
| 3 | `src/middleware/jwk/jwk.ts` | 10 |
| 3 | `src/middleware/jwt/jwt.ts` | 10 |
| 6 | `src/request.ts` | 9 |
| 6 | `src/helper/ssg/ssg.ts` | 9 |

Stability metrics (`--metrics`, instability = efferent / (afferent+efferent)) confirm the pattern quantitatively: `src/types.ts` instability **0.086**, `src/context.ts` **0.167** (both very stable - many depend on them, they depend on little), `src/router.ts` **0** (maximally stable - a pure abstraction other routers implement), `src/hono-base.ts` **0.571** (a genuine mid-layer glue class - it both depends on a fair amount and is depended upon).

## Cycles

Ran with a `no-circular` rule (`severity: warn`) scoped to `src/`, tests excluded: **53 circular-dependency warnings**, in two distinct clusters.

1. **JSX runtime cluster (43 of 53 cycles)**: `src/jsx/base.ts`, `src/jsx/context.ts`, `src/jsx/index.ts`, `src/jsx/components.ts`, `src/jsx/children.ts`, `src/jsx/streaming.ts`, `src/jsx/intrinsic-element/*`, `src/jsx/dom/*` all import each other in various combinations (e.g. `jsx/context.ts -> jsx/index.ts -> jsx/context.ts`, `jsx/components.ts -> jsx/dom/render.ts -> jsx/base.ts -> jsx/context.ts -> jsx/index.ts -> jsx/components.ts`). This is dense but internally contained - none of these cycles reach outside `src/jsx/`.
2. **Core request/response cluster (10 of 53 cycles)**: `src/hono-base.ts`, `src/types.ts`, `src/context.ts`, `src/request.ts`, `src/compose.ts` form a tight mutually-circular group, e.g. `compose.ts -> context.ts -> request.ts -> types.ts -> hono-base.ts -> compose.ts` and `hono-base.ts -> types.ts -> hono-base.ts`. This is the same "spine" identified by fan-in and by the git co-change data in `artifact-1-territory.md` - all three independent signals (commit co-change, fan-in, cycle membership) point at the same five files.

Why this matters for a change: any edit to `types.ts` risks a ripple through the entire core cluster because of the cycle, not just its direct importers; the JSX cycles matter only if a change touches JSX rendering, and are otherwise self-contained.

## Layer boundaries

Checked four boundary rules that reflect Hono's intended layering (utils/router as foundation, middleware/adapter/client as consumers):

| Boundary checked | Result | Evidence |
|---|---|---|
| `src/utils` must not import `src/middleware`, `src/router`, `src/adapter`, or `src/client` | Respected | 0 violations (188 modules, 568 deps cruised) |
| `src/router` must not import `src/middleware` or `src/adapter` | Respected | 0 violations |
| `src/middleware` must not import `src/adapter` (no runtime-specific coupling in generic middleware) | Respected | 0 violations |
| core (`context`, `hono-base`, `request`, `compose`, `router`, `types`) must not import `src/middleware` or `src/adapter` | Respected | 0 violations |
| core must not import `src/client` (the RPC client should only consume core types, never the reverse) | Respected | `src/client/*` imports `src/hono.ts`, `src/hono-base.ts`, `src/router.ts`, `src/types.ts` (all type-level, for `InferRequestType`/`InferResponseType`); nothing in core imports back from `src/client` |

None of the active hotspots from `artifact-1-territory.md` (`middleware/etag`, `middleware/cache`, `middleware/cors`, `adapter/aws-lambda`, `router/reg-exp-router`) violate these boundaries. The layering is clean and consistently respected across 568 dependency edges - a positive signal for changing one layer without fear of surprising imports from another.

## Testability risk (active areas from artifact 1)

| Module | Fan-out | What it pulls in | Risk read |
|---|---|---|---|
| `src/middleware/etag/index.ts` | 2 | `types.ts`, own `digest.ts` | Low risk, easy unit test |
| `src/middleware/cors/index.ts` | 2 | `context.ts`, `types.ts` | Low risk, easy unit test |
| `src/middleware/cache/index.ts` | 5 | `context.ts`, `request.ts`, `types.ts`, `utils/crypto.ts`, `utils/http-status.ts` | Moderate - touches request/context together, integration-style test more realistic than a pure unit test |
| `src/adapter/aws-lambda/handler.ts` | 4 | `hono.ts`, `types.ts`, `utils/encode.ts`, own `types.ts` | Moderate - runtime-specific, best tested against the `runtime-tests/lambda` harness rather than mocked in isolation (matches the co-change pairing with `runtime-tests/lambda` from artifact 1) |
| `src/router/reg-exp-router/router.ts` | 8 (all internal to the router) | own `matcher.ts`, `node.ts`, `trie.ts`, plus `router.ts`, `utils/url.ts` | Self-contained despite high fan-out - everything it pulls in is either the shared router contract or its own internals, so it is unit-testable in isolation |
| `src/utils/jwt/jwt.ts` | 8 (all internal to jwt) | own `jwa.ts`, `jws.ts`, `types.ts`, `utf8.ts`, `utils/encode.ts` | Self-contained crypto logic, good unit-test candidate despite the fan-out count |
| `src/helper/ssg/ssg.ts` | 9 | `client/utils.ts`, `hono.ts`, `types.ts`, `utils/concurrent.ts`, `utils/mime.ts`, own `middleware.ts`/`plugins.ts`/`utils.ts` | Highest genuine integration risk in this set - it reaches across into the client and the full `Hono` app type, so isolating it in a unit test means mocking a real app instance |

Summary: most of the actively-changed middleware is intentionally thin and easy to test in isolation; the exceptions worth flagging before a change are `helper/ssg` (integration-shaped) and `adapter/aws-lambda` (best verified against its runtime-tests harness, not mocked).

## Rendered subgraph

Not rendered. No single subgraph answered one question cleanly enough to justify a Graphviz/SVG render at this stage - the core-cluster cycle list above (10 edges) is already small enough to read directly as text, and rendering the full `src/jsx` cluster (43 edges) would mostly restate "this subsystem is internally circular by design," which is already stated above. If a specific refactor targets the JSX runtime or the core cluster later, this is the natural next step (`--focus '^src/(context|hono-base|request|compose|types|router)\.ts$' --focus-depth 1 -T dot`).

## Limitations

- Graph is limited to `src/`; `runtime-tests/*`, `perf-measures/*`, and `benchmarks/*` are not modeled, so their coupling to `src/` (seen in artifact 1's co-change data) is not visible here as an import edge, only as a git co-change signal.
- Dynamic imports, string-based `require`, and any resolution dependent on bundler-specific conditions in `exports` maps may not be fully captured by static analysis - `dependency-cruiser` follows static ES module/type imports.
- Type-only imports (`import type`) are counted the same as value imports in this run; the graph does not distinguish "needs this for types only" from "needs this at runtime," which matters for the client/core boundary noted above (it is type-only in practice, verified by reading the files, not by a separate graph rule).
