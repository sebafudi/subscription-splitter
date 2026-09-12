---
starter_id: hono
starter_name: Hono
project_name: subscription-splitter
language_family: js
package_manager: npm
cwd_strategy: subdir-then-move
bootstrapper_confidence: verified
phase_3_status: ok
audit_command: npm audit --json
---

# Bootstrap verification

Written by the bootstrapper procedure. Placed here rather than at the path the skill names
(`context/changes/bootstrap-verification/verification.md`) because `context/changes/` is owned by
another workstream in this repository and is excluded from this commit. The `bootstrapped_at`
timestamp the schema requires is omitted: this repository records progress by slice ID and commit,
not by calendar.

## Hand-off

From `context/foundation/tech-stack.md`:

```yaml
starter_id: hono
package_manager: npm
project_name: subscription-splitter
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-workers
  ci_provider: github-actions
  ci_default_flow: manual-promotion
  bootstrapper_confidence: verified
  path_taken: custom
  quality_override: false
  self_check_answers:
    typed: true
    from_official_starter: true
    conventions: true
    docs_current: true
    can_judge_agent: true
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
```

Why this stack, verbatim from the hand-off body: Subscription Splitter is a small web product with
one organizer per account, so the stack is chosen for a single deployable unit and for an exact-money
domain that has to be testable on its own. We took the custom path rather than the recommended web
default: the product is an API plus a thin client, and serving both from one Hono Worker keeps
deployment to a single artifact with no second origin, no cross-origin configuration and no separate
hosting account. Hono clears all four agent-friendly gates, its bootstrapper support is verified, and
its first deployment default is Cloudflare Workers, which is also what gives us D1 through a binding
for storage and a local D1 for integration tests. The React client is built by Vite into static
assets the same Worker serves. Money handling drove the rest: the calculation lives in a
dependency-free TypeScript module so it can be exercised directly, Zod carries one validation
contract at every entry point, and repositories own all SQL. Sign-in is settled by decision D-001:
Better Auth on the same Worker and the same D1 binding, public sign-up disabled, proven by a
compatibility spike. CI on GitHub Actions runs typecheck and tests, while deploying stays a
deliberate step rather than an automatic consequence of merging.

## Pre-scaffold verification

| Signal | Value | Severity | Notes |
|---|---|---|---|
| npm package | `create-hono` v0.19.5, most recent publish well inside the fresh window | fresh | resolved from the card's `cmd_template` |
| GitHub repo | `honojs/hono`, last push on the day of this run | fresh | from the card's `docs_url` |

Absolute dates are deliberately not recorded here; the severity classification is what the check is
for, and this repository does not carry calendar dates in authored files.

## Scaffold log

**Resolved invocation**: `npx create-hono@0.19.5 <temp-dir> --template cloudflare-workers+vite --pm npm --install`
**Strategy**: subdir-then-move
**Exit code**: 0
**Files moved**: 9 (`package.json`, `wrangler.jsonc`, `vite.config.ts`, `tsconfig.json`, `src/index.tsx`, `src/renderer.tsx`, `src/style.css`, `public/.assetsignore`, `public/favicon.ico`)
**Conflicts (.scaffold siblings)**: `README.md.scaffold`, reviewed and removed after its setup commands were folded into `README.md`
**.gitignore handling**: append-merged, 17 new patterns under a `# from hono` separator
**.bootstrap-scaffold cleanup**: scaffolded in the session scratchpad rather than in the repository, so nothing was left behind

Three deviations from the procedure, each deliberate:

- **Template**: the registry card's `cmd_template` names `--template nodejs`. That contradicts the
  hand-off's `deployment_target: cloudflare-workers`, so the run used the CLI's
  `cloudflare-workers+vite` template instead. The starter and its package manager are unchanged.
- **Strategy**: the bootstrapper configuration maps `hono` to `native-cwd`. The working directory
  already held committed project documentation, and the merge reference names `subdir-then-move` as
  the safer choice when in doubt, so the scaffold ran in a temporary directory and the conflict
  matrix was applied by hand. The outcome is the same shape with no risk to existing files.
- **Demo source replaced**: the template ships a server-rendered demo (`src/index.tsx`,
  `src/renderer.tsx`, `src/style.css`, and a `vite-ssr-components` dependency). The target shape is a
  React client under `src/client/` served by a Hono Worker at `src/server/index.ts`, so the demo
  files and that dependency were replaced. `pnpm-workspace.yaml` and the template's lockfile were
  dropped, since this is an npm project with its own pinned dependency set.

## Post-scaffold audit

**Tool**: `npm audit --json`
**Summary**: 0 CRITICAL, 4 HIGH, 0 MODERATE, 0 LOW
**Direct vs transitive**: 1 direct of 4 high, and the direct entry is flagged only as the package
that pulls the other three.

#### HIGH findings

- `@cloudflare/vitest-pool-workers` 0.22.0, direct development dependency. Flagged as the path to
  the three findings below. The offered fix is a downgrade to 0.8.30, which is a major version
  backwards and incompatible with the Vitest 4 line this project needs. Not applied.
- `miniflare` 5.20260815.0-alpha, transitive under the test pool. The test pool pins its own older
  copy; the Vite plugin resolves a newer one (5.20260911.0-alpha) that is not flagged.
- `wrangler` 4.124.0, transitive under the test pool. The project's own `wrangler` is 4.131.1, which
  is outside the affected range.
- `sharp` 0.35.2, transitive under the test pool's miniflare. Advisory: vulnerabilities in libheif
  (GHSA-g89c-p67h-r497, GHSA-2jg2-4ch7-h545). The copy under the Vite plugin is 0.35.4 and is not
  affected.

All four are development-only and reachable only through the test runner, never through the deployed
Worker. Recorded and left in place; revisit when the test pool publishes a release compatible with
Vitest 4 that carries a newer miniflare.

## Hints recorded but not acted on

| Hint | Value |
|---|---|
| bootstrapper_confidence | verified |
| quality_override | false |
| path_taken | custom |
| self_check_answers | typed, from_official_starter, conventions, docs_current, can_judge_agent all true |
| team_size | solo |
| deployment_target | cloudflare-workers |
| ci_provider | github-actions |
| ci_default_flow | manual-promotion |
| has_auth | true |
| has_payments | false |
| has_realtime | false |
| has_ai | false |
| has_background_jobs | false |

`has_auth: true` is recorded but not scaffolded: Better Auth is installed at its pinned version and
nothing is wired up yet. Sign-in lands with the runtime-auth slice (S-01). No continuous integration
workflow was created; that belongs to a later change.

## Post-scaffold verification runs

Every command below was run in the repository root. Output is trimmed, not paraphrased.

`npm install`

```
added 121 packages, and audited 122 packages
```

npm 11 holds install scripts until they are approved, which left the `workerd` and `esbuild` binaries
unbuilt and would have broken both the test pool and the dev server. `npm approve-scripts workerd
esbuild` records the approval in `package.json` under `allowScripts`. `fsevents` is left unapproved:
it only affects file watching on one operating system.

`npm run typecheck`

```
tsc -p tsconfig.worker.json --noEmit && tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.node.json --noEmit
(exit 0, no diagnostics)
```

`npm test`

```
> test:unit
 RUN  v4.1.11
 Test Files  1 passed (1)
      Tests  3 passed (3)

> test:integration
 RUN  v4.1.11
 Test Files  1 passed (1)
      Tests  2 passed (2)
```

The integration suite runs under `@cloudflare/vitest-pool-workers` against a local D1 with the
migrations directory read at config time and applied in setup, so the wiring is proven even though
the directory currently holds no migration.

`npm run build`

```
vite v8.3.0 building subscription_splitter environment for production...
dist/subscription_splitter/wrangler.json         1.52 kB
dist/subscription_splitter/index.js             52.86 kB
vite v8.3.0 building client environment for production...
dist/client/index.html                   0.47 kB
dist/client/assets/index-CqLI847l.css    0.27 kB
dist/client/assets/index-CwPap9Gg.js   219.89 kB
```

`npx wrangler deploy --dry-run`

```
Using redirected Wrangler configuration.
 - Configuration being used: "dist/subscription_splitter/wrangler.json"
Read 6 files from the assets directory .../dist/client
Total Upload: 51.63 KiB / gzip: 14.02 KiB
Binding                                Resource
env.DB (subscription-splitter-db)      D1 Database
--dry-run: exiting now.
```

Nothing was deployed and no Cloudflare resource was created.

`npx vite dev --port 15173`, then curl, then stopped:

```
$ curl -s -w '\nHTTP_STATUS:%{http_code}\n' http://localhost:15173/api/health
{"ok":true}
HTTP_STATUS:200

$ curl -s http://localhost:15173/ | head -3
<!doctype html>
<html lang="en">
  <head>
```

`npx wrangler dev --port 18788` against the built output, then curl, then stopped:

```
Your Worker has access to the following bindings:
Binding                                Resource         Mode
env.DB (subscription-splitter-db)      D1 Database      local

$ curl -s -w '\nHTTP_STATUS:%{http_code}\n' http://localhost:18788/api/health
{"ok":true}
HTTP_STATUS:200

$ curl -s http://localhost:18788/ | head -8
<!doctype html>
...
    <script type="module" crossorigin src="/assets/index-CwPap9Gg.js"></script>
```

### Failures found and fixed

Two real failures, both fixed rather than worked around:

- `migrations_dir` was written as a top-level key in `wrangler.jsonc`. Wrangler warned about an
  unexpected field and the test pool then started a Worker with no migrations directory. It belongs
  inside the `d1_databases` entry, and was moved there.
- The integration runner refused to start: `This Worker requires compatibility date "2026-09-12", but
  the newest date supported by this server binary is "2026-08-22"`. The runtime bundled with the test
  pool is older than the one wrangler ships. The compatibility date is now held at the newest date
  both accept, so the suite and the dev server run the same Worker semantics.

### Deliberately not done

- No `.github/workflows/`. Continuous integration belongs to a later change.
- No Cloudflare resource was created and nothing was deployed. The D1 `database_id` in
  `wrangler.jsonc` is a placeholder, replaced when the remote database is created.
- No `zod` dependency yet. It arrives with the first slice that validates input.
- The 591 KB file that `wrangler types` generates is not committed. `env.d.ts` declares the bindings
  by hand instead, and the generated file is ignored.

## Next steps

Plan the runtime-auth slice (S-01), which is `ready` in `context/foundation/roadmap.md`. It brings the
first migration, seeded accounts, sign-in and the ownership checks the test plan's first rollout
phase covers.
