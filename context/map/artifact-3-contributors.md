Analyzed repository: honojs/hono, commit edd138ee3049749190de3dcd7e32d7bcbf224e41 (upstream tag/version as reported by `git describe --tags`: v4.13.7-7-gedd138ee)

This is an analysis of an external open-source project (Hono, a TypeScript web framework), kept as a separate reference target from the subscription-splitter application. The clone lives at `/Users/sebastian.f/Projects/10xDevs/analysis/hono` and is not part of this repository.

# Artifact 3 - Contributors (who knows what)

## Candidate areas considered

From `artifact-1-territory.md` and `artifact-2-structure.md`, five areas stood out as candidates for a contributor deep-dive: the core spine (`context.ts`/`types.ts`/`hono-base.ts`/`request.ts`/`compose.ts`), `src/adapter/aws-lambda`, `src/middleware/jwt` + `jwk`, `src/router/reg-exp-router`, and the `src/jsx` runtime.

**Chosen area: the core spine** (`src/context.ts`, `src/types.ts`, `src/hono-base.ts`, `src/request.ts`, `src/compose.ts`, plus `src/hono.ts` and `src/router.ts` as the two files that assemble them). This is the single area flagged by all three independent signals gathered so far: highest fan-in in the dependency graph, the only non-JSX circular-dependency cluster, and a top-3 co-change cluster in git history. That combination - central, mutually circular, still actively edited - is exactly the kind of area worth understanding "who to ask" before touching it.

## Command used

```
git shortlog -sne --since="12 months ago" HEAD -- src/context.ts src/types.ts src/hono-base.ts src/request.ts src/compose.ts src/hono.ts src/router.ts
```

No bot or CI accounts appeared in the output (no `dependabot`, `renovate`, `github-actions`, or similar), and no commits carried agent authorship (Claude/Codex/Copilot) with no human listed - so nothing needed to be filtered out for this area.

## Contributors, last 12 months, core spine files

| Contributor | Commits (core spine, 12mo) |
|---|---|
| Yusuke Wada | 19 |
| Igor Savin | 3 |
| Taku Amano | 3 |
| kosei28 | 2 |
| tako._.v | 2 |
| (18 further people) | 1 each |

Knowledge here is **concentrated, not dispersed**: one contributor (Yusuke Wada) authored roughly 40% of all core-spine commits in the last year, with the remainder spread thinly across ~22 different people at 1-3 commits each - a classic single-maintainer-plus-drive-by-contributions pattern (consistent with Wada being the project's original author/BDFL, verified only via commit volume, not via any external claim).

## Recurring themes per contributor (from commit subjects)

**Yusuke Wada** (19 commits) - two consistent themes:
- Performance micro-optimizations directly in the hot request/response path: `perf(context): skip Headers creation when there are no headers to merge` (#5122), `perf(url): replace regex tests with indexOf` (#5121), `perf(hono-base): avoid rest parameter in fetch` (#5113), `perf(context): iterate the header record with for..in` (#5118).
- Type-system correctness in `types.ts`/`hono-base.ts`: `fix(types): fix middleware union type merging in MergeMiddlewareResponse` (#4602), `perf(types): reduce Simplify in ToSchema` (#5597 subject as `#4597`), `refactor(types): fix the type definitions in hono-base` (#4407).
- One explicit revert: `fix(context): revert PR #4707` (#4757) - a prior change to this area was reverted, worth reading both PRs before assuming any single commit here is final.

**Igor Savin** (3 commits) - same hot-path performance theme as Wada: `perf(request): probe the body cache without allocating` (#5176), `perf(request): allocate #validatedData lazily` (#5175), `perf(context): drop the throwaway env field initializer` (#5174).

**Taku Amano** (3 commits) - routing/request edge cases rather than performance: `fix(request): handle params on unmatched requests` (#5268), `fix(route): preserve the base path of the mounted route() app` (#4942).

## A specific edge case worth reading before changing `context.ts`'s constructor path

Git history shows a direct back-and-forth on the same line of code: Igor Savin's `perf(context): drop the throwaway env field initializer` (#5174) was followed, in the same batch of history, by Yusuke Wada's `perf(context): restore the env field initializer` (#5186) - i.e. a performance optimization to the `Context` constructor was merged and then reverted by the maintainer. This is a concrete signal that the `Context` constructor's field-initialization order is more sensitive than it looks (likely a V8 hidden-class/monomorphism concern) and that a plausible-looking micro-optimization there has already been tried and undone once. Anyone touching `src/context.ts`'s constructor should read both PRs (#5174 and #5186) first.

## Concentrated vs dispersed

- **Concentrated**: the performance-tuning thread through `context.ts`/`hono-base.ts`/`request.ts` (hot path allocations, field init order) is effectively owned by Yusuke Wada, with Igor Savin contributing in the same style/area.
- **Dispersed**: correctness edge cases in routing/request parsing (unmatched params, mounted route base paths, multipart boundary handling) come from a wider set of one-off contributors, each fixing a specific bug they hit.
- Practical implication: for a performance-sensitive change to the core spine, Yusuke Wada's prior commits (and the #5174/#5186 pair specifically) are the right reading list; for a routing/parsing edge case, there is no single go-to person - expect to read the specific historical PR for that exact case instead.

## Limitations

- Based only on commit authorship in the public git history for the pinned window (12 months); it does not capture GitHub PR review activity by people who commented but did not author commits, nor any private/maintainer-only discussion.
- Author identity is taken from git `name <email>`; the same person could appear under more than one identity if they used different emails, which was not cross-checked.
- No claim is made about anyone's current availability or willingness to be contacted - this is a historical-activity signal only, not a support directory.
