Analyzed repository: honojs/hono, commit edd138ee3049749190de3dcd7e32d7bcbf224e41 (upstream tag/version as reported by `git describe --tags`: v4.13.7-7-gedd138ee)

This is an analysis of an external open-source project (Hono, a TypeScript web framework), kept as a separate reference target from the subscription-splitter application. The clone lives at `/Users/sebastian.f/Projects/10xDevs/analysis/hono` and is not part of this repository.

# Artifact 1 - Territory (git history)

## Method and noise exclusions

- Window: last 12 months of commit history (`git log --since="12 months ago"`), 412 commits in that window out of 2815 total.
- Excluded from all counts: `bun.lock`, `package-lock.json`, `pnpm-lock.yaml`, any `__snapshots__/` path, `.changeset/`, anything under `docs/`, `benchmarks/`, any `*.md` file.
- `package.json` at repo root is excluded from the file/co-change ranking after inspection: 90 of its touches in the window are automated release-version-bump commits (subjects like `4.13.7`, `4.13.6`, one per patch release) plus a handful of dependency chores, not feature work. This is release automation noise, not a hands-on hotspot.
- Several "mass" commits touch dozens of unrelated files at once (e.g. `#4797` tsconfig project references, `#4781`/`#4568` eslint/formatter version bumps, TypeScript version upgrades). These inflate raw co-change counts without indicating real design coupling; they are called out explicitly below rather than silently included.
- Commands used are given inline before each result so they can be rerun.

## Top 10 active directories (12 months, depth-3 buckets under `src/`)

```
git log --since="12 months ago" --name-only --pretty=format: \
  | grep -v '^$' \
  | grep -Ev '(bun\.lock|package-lock\.json|pnpm-lock\.yaml|__snapshots__|\.changeset/|/docs/|^docs/|benchmarks/|\.md$)' \
  | awk -F/ '{ if (NF>=3) print $1"/"$2"/"$3; else if (NF==2) print $1"/"$2; else print $1 }' \
  | sort | uniq -c | sort -rn | head -30
```

| Rank | Path | Touches (12mo) |
|---|---|---|
| 1 | `src/adapter/aws-lambda` | 32 |
| 2 | `src/jsx/dom` | 30 |
| 3 | `src/utils/jwt` | 27 |
| 4 | `src/router/reg-exp-router` | 21 |
| 5 | `src/helper/ssg` | 21 |
| 6 | `src/middleware/etag` | 19 |
| 7 | `src/middleware/cache` | 17 |
| 8 | `src/middleware/cors` | 16 |
| 9 | `src/router/trie-router` | 11 |
| 10 | `src/middleware/secure-headers` | 11 |

Depth-2 view (`src/middleware`, `src/utils`, `src/jsx`, `src/adapter`, `src/helper`, `src/client`, `src/router`) confirms these are genuinely the busiest top-level buckets, but is too coarse to say anything actionable - hence the depth-3 breakdown above. `src/validator` (18 touches) and the core spine files `src/request.ts` (15), `src/context.ts` (14), `src/types.ts` (13), `src/hono-base.ts` (11) round out the next tier; they are single files rather than directories, see "spine files" below.

## Top 10 active non-test files (12 months)

```
git log --since="12 months ago" --name-only --pretty=format: \
  | grep -v '^$' \
  | grep -Ev '(bun\.lock|package-lock\.json|pnpm-lock\.yaml|__snapshots__|\.changeset/|/docs/|^docs/|benchmarks/|\.md$|\.test\.|\.test-d\.|^package\.json$)' \
  | sort | uniq -c | sort -rn | head -15
```

| Rank | File | Touches (12mo) |
|---|---|---|
| 1 | `src/request.ts` | 15 |
| 2 | `src/context.ts` | 14 |
| 3 | `src/adapter/aws-lambda/handler.ts` | 14 |
| 4 | `src/types.ts` | 13 |
| 5 | `src/client/client.ts` | 13 |
| 6 | `src/utils/jwt/jwt.ts` | 11 |
| 7 | `src/hono-base.ts` | 11 |
| 8 | `src/client/types.ts` | 11 |
| 9 | `src/utils/cookie.ts` | 10 |
| 10 | `src/utils/url.ts` | 9 |

Reading actual commit subjects for `src/adapter/aws-lambda/handler.ts` (the most-touched single adapter file) shows a mix of genuine runtime bugfixes (backpressure handling #5351, binary content-type detection #5101, V2-event detection #5033, invalid header handling #4883, non-ASCII header sanitization #4437) and a few repo-wide tooling chores (#4797, #4781) that also happened to touch this file. Treat the bugfix cluster as the real signal.

## Activity by quarter (last 4 quarters, depth-2 buckets, `package.json` excluded)

```
git log --since="<N+3> months ago" --until="<N> months ago" --name-only --pretty=format: | ... | awk -F/ '{print $1"/"$2}' | sort | uniq -c | sort -rn | head -8
```

| Quarter (most recent first) | Leading areas (touch count) |
|---|---|
| Q-1 (last ~3 months) | `src/middleware` 66, `src/jsx` 44, `src/utils` 37, `src/client` 27, `src/router` 26 |
| Q-2 (~3-6 months ago) | `src/middleware` 48, `src/utils` 27, `src/jsx` 25, `src/adapter` 17, `src/helper` 12 |
| Q-3 (~6-9 months ago) | `src/utils` 34, `src/middleware` 33, `src/adapter` 25, `src/jsx` 23, `src/client` 23 |
| Q-4 (~9-12 months ago) | `src/utils` 18, `src/helper` 18, `src/router` 17, `src/middleware` 16, `src/adapter` 15 |

`src/middleware` and `src/utils` are active in every quarter - not a spike, a sustained center of gravity. `src/router` was proportionally more active a year ago (routing engine work) and less so recently; `src/client` activity grew sharply in the most recent quarter.

## Co-change pairs and triples

```
python3 script over `git log --since="12 months ago" --name-only --pretty=format:__COMMIT__%H`,
bucketing paths to depth-2, counting cross-bucket co-occurrence per commit (316 commits had files after noise filtering)
```

Strongest real (non-mass-commit) cross-area pairs:

| Pair | Co-change count | Note |
|---|---|---|
| `src/middleware` <-> `src/utils` | 7 | middleware modules commonly pull in shared utils in the same commit (expected, direct dependency) |
| `src/helper` <-> `src/jsx` | 4 | helper additions (e.g. streaming/ssg) touch jsx rendering together |
| `src/client` <-> `src/helper` | 4 | client (RPC) changes often ship alongside helper updates |
| `runtime-tests/lambda` <-> `src/adapter` | 4 | adapter changes are commonly verified against the runtime-tests harness in the same commit |
| `src/helper` <-> `src/middleware` | 3 | |
| `src/jsx` <-> `src/middleware` | 3 | |
| `src/client` <-> `src/hono-base.ts` | 3 | |

Within-directory pairs (implementation + its own test, e.g. `src/client/client.ts` <-> `src/client/client.test.ts`, `src/request.ts` <-> `src/request.test.ts`, `src/types.ts` <-> `src/types.test.ts`) dominate the raw ranking but are expected, healthy coupling (a file and its test), not cross-cutting risk - excluded from the table above.

No consistent triple (three distinct areas repeatedly in the same commits) stood out beyond the pairs above; most multi-area commits were the mass tooling commits called out earlier.

## The cross-cutting "common denominator" files

Instead of one obviously shared config/translation file, the data shows a small set of **core spine files** that co-occur with the widest spread of other areas across commits: `src/types.ts`, `src/hono-base.ts`, `src/context.ts`, `src/client/types.ts`, `src/request.ts`. Each of these shows up alongside `src/adapter`, `src/client`, `src/helper`, and `src/middleware` changes in different commits - consistent with them being the shared type/base-class contract that most other areas import from, so a change ripples outward rather than the files being generated or config artifacts. This matches "spine" file behavior, not accidental repo-wide noise.

Separately, a cluster of tooling/build files (`tsconfig.json`, `tsconfig.build.json`, `.github/actions/perf-measures/action.yml`, `perf-measures/type-check/scripts/tsconfig.json`) co-occurs across many `runtime-tests/*` directories - but this is release/CI tooling maintenance, not application coupling, and is called out here only so it is not mistaken for a hidden dependency later.

## Verification: are the coupled files still present?

Checked with `test -e <path>` against the pinned commit for every file/directory named above (`src/request.ts`, `src/context.ts`, `src/types.ts`, `src/hono-base.ts`, `src/client/client.ts`, `src/client/types.ts`, `src/adapter/aws-lambda/handler.ts`, `src/utils/cookie.ts`, `src/router/reg-exp-router`, `src/jsx/dom`, `src/helper/websocket/index.ts`). All present - none of the analysis above rests on a deleted or moved path.

## Limitations

- 12-month window only; older architectural history (e.g. why there are three router implementations) is not visible here.
- Co-change analysis is commit-level, not PR-level; a single PR merged as multiple commits could under-count coupling, and squash-merged PRs could over-count it as a single wide commit.
- No distinction is made yet between "who wrote it" and "what changed" - that is deferred to `artifact-3-contributors.md`.
- This artifact does not read any source code; "why" a file is a hotspot is inferred only from commit subjects, not diffs.
