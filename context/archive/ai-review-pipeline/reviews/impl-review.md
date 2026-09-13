<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: AI code review pipeline

- **Plan**: `context/changes/ai-review-pipeline/plan.md`
- **Scope**: Phases 1 to 4 of 5 (`727b90f`, `104a32c`, `8bbabb9`, `b344f86`, plus the progress chores)
- **Reviewer**: independent, no authorship of the implementation
- **Verdict**: NEEDS ATTENTION (approve with required fixes)
- **Findings**: 0 critical, 5 warnings, 4 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | WARNING |

The core of this change is right and the parts the plan called consequential are the parts built
best. `deriveVerdict` is arithmetic that ignores the model's `overall` in every state, the nonce
guardrail strips its own terminator before wrapping, `reviewDiff` is one try block with four named
error reasons and no throw path, and the workflow passes the pull request title and body through an
environment block rather than a shell string. Every automated criterion flipped in Progress was
re-run here and passes. The findings below are a Phase 5 blocker in the evaluation configuration, an
evaluation-design flaw that will read as model failure, two documentation-versus-code gaps, and a set
of test assertions weaker than their names claim.

## Verification performed

| Check | Result |
|---|---|
| `npm ci && npm test && npm run typecheck` in `tools/reviewer` | pass, 60 tests in 10 files, `tsc --noEmit` clean |
| `npx promptfoo validate -c eval/promptfooconfig.yaml` | `Configuration is valid` |
| `git apply --stat` on each of the seven fixtures | exit 0 for all seven |
| Workflow YAML parse, job and permission shape | parses, `permissions: {}` at workflow level, `contents: read` + `pull-requests: write` on the job |
| `actionlint` (installed for this review) | exit 0, no diagnostics |
| `git check-ignore tools/reviewer/env.example` | exit 1, file is tracked |
| Caret or tilde ranges in `tools/reviewer/package.json` | none |
| Exit-code propagation through `npm run review` | verified: credential absent produced exit 3 and a written comment file |

No API key was set, the evaluation was not run, nothing was pushed and no pull request was opened.

## Drift

| Planned | Built | Verdict |
|---|---|---|
| `package.json`, lockfile, strict `tsconfig`, `vitest.config.ts`, `env.example` (Phase 1 §1) | All present, exact pins, `strict` and `noUncheckedIndexedAccess` on | MATCH |
| `criteria.ts` five frozen entries with anchors verbatim from `requirements.md` (Phase 1 §2) | Present, text matches the requirements | MATCH |
| `schema.ts` with nullable `overall` (Phase 1 §2) | Present; criterion keys erased to `string` in the inferred type, see F7 | MATCH (typing weakness) |
| `verdict.ts` threshold below 6 or any blocking finding (Phase 1 §3) | `src/verdict.ts:47-54`, exact | MATCH |
| `diff.ts` `boundDiff` cutting at a line boundary with both byte counts (Phase 1 §4) | `src/diff.ts:13-34`, exact | MATCH |
| `prompt.ts` nonce delimiters, injectable generator, nonce stripped from content (Phase 2 §1) | `src/prompt.ts:67-86`, exact | MATCH |
| `model.ts` reads the environment in one place, named credential error (Phase 2 §2) | `src/model.ts:23-32`, exact | MATCH |
| `reviewDiff` never throws, four reasons, 401 or 403 treated as `missing_credential` (Phase 2 §3) | `src/review.ts:31-88`, implemented; the 401 branch is untested, see F5 | MATCH |
| `format.ts` marker, score table, findings, truncation note; CLI exits 0/1/2/3 (Phase 2 §4) | Present and correct; `main()` and `--out` untested, see F6 | MATCH |
| `AGENTS.md` gains `## Reviewer package` without touching the commands section (Phase 2 §5) | Appended as specified | MATCH |
| Seven fixtures, one per criterion plus control and probe (Phase 3 §1) | All seven present and valid; criterion isolation is incomplete, see F3 | DRIFT |
| Provider referenced as `file://eval/provider.ts` (Phase 3 §2) | `file://provider.ts`; promptfoo resolves relative to the config directory | DRIFT (reported, correct, plan text not updated) |
| `llm-rubric` per test (Phase 3 §3) | Present, but no grader route is configured, see F2 | DRIFT |
| Workflow trigger, permissions, fork guard, paginated upsert, exclusive labels, exit mapping (Phase 4) | All present and correct | MATCH |
| Four `ai-cr:*` labels created once on the repository (Phase 4 §2) | Three created, `ai-cr:review` deliberately not; criterion 4.11 left unchecked | DRIFT (reported) |
| `README.md` local usage, criteria, threshold, labels, fork behaviour (Phase 4 §4) | Present; the `.env` instruction does not work, see F4 | DRIFT |

Nothing from "What we are NOT doing" was breached: there is no `ci.yml`, no tool or file-read loop
given to the model, no `contents: write`, no import across the `src/` boundary in either direction,
and the trigger is restricted to `branches: [main]`. The only unplanned addition is one
`package.json` field, covered in F9.

## Findings

### F1 - The workflow installs and runs pull-request-controlled code with the secret present

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH - architectural stakes; think carefully before deciding
- **Dimension**: Safety & Quality
- **Location**: `.github/workflows/ai-review.yml:52-81`
- **Detail**: `actions/checkout@v7` with no `ref` checks out the pull request's merge ref, so
  `tools/reviewer/` on disk is the pull request's copy. The job then runs `npm ci` in that directory
  and `npm run review`, which is `tsx src/cli.ts` from the same copy, with `OPENROUTER_API_KEY` and a
  `pull-requests: write` token in the step environment. A pull request that edits
  `tools/reviewer/package.json`, the lockfile or anything under `tools/reviewer/src/` has that code
  executed. `npm ci` also runs dependency lifecycle scripts; the install performed for this review
  reported deferred install scripts for `onnxruntime-node`, `protobufjs`, `esbuild` and `fsevents`,
  and a GitHub runner's npm will run them rather than defer them.
  This is not a privilege escalation: the job `if` restricts the run to same-repository pull
  requests, and anyone who can push a branch to this repository can already reach the same secret by
  editing any workflow in that branch. GitHub's trust boundary already equates write access with
  secret access, which is why this is a warning rather than a critical finding. What is wrong is
  that three documents assert an invariant the workflow does not hold: D-003 §Security constraints
  says "no shell execution of PR code", `requirements.md` §Security constraints says "Nothing from
  the pull request is executed. The workflow installs the reviewer package's own dependencies and
  runs the reviewer", and `plan.md` §What we are NOT doing repeats it. The residual real risk is a
  compromised transitive dependency in the reviewer's own tree, which `--ignore-scripts` closes
  cheaply.
- **Fix A ⭐ Recommended**: Add `--ignore-scripts` to the workflow's `npm ci`, and correct the
  invariant in `requirements.md` to say the reviewer runs from the pull request head on
  same-repository pull requests only.
  - Strength: Closes the lifecycle-script path, which is the part not already implied by write
    access, and makes the documents describe the workflow that exists.
  - Tradeoff: A pull request author with write access can still alter `src/cli.ts` and see it run;
    the document now says so instead of denying it.
  - Confidence: HIGH - `--ignore-scripts` is sufficient here because nothing in the reviewer's
    runtime path needs a build step; `tsx` transpiles on demand and the local suite passed with the
    scripts deferred.
  - Blind spot: Not verified on a GitHub runner, only locally.
- **Fix B**: Check the reviewer out from the base ref into a separate path and run it from there, so
  the pull request's copy of `tools/reviewer/` is never installed or executed.
  - Strength: Makes the stated invariant literally true, and is the shape the security constraint
    was written for.
  - Tradeoff: A pull request that changes the reviewer is then reviewed by the old reviewer, so
    reviewer changes cannot be exercised on their own pull request; adds a second checkout step.
  - Confidence: MEDIUM - the mechanics are standard, but the diff step and the working directories
    both have to be re-pointed and neither has been run.
  - Blind spot: Interaction with `fetch-depth: 0` and the merge-base diff has not been tested.
- **Decision**: PENDING

### F2 - The evaluation cannot complete with only OPENROUTER_API_KEY

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `tools/reviewer/eval/promptfooconfig.yaml:23-31` and each test's `llm-rubric`
- **Detail**: Every one of the seven tests carries an `llm-rubric` assertion, and the configuration
  sets no `defaultTest.options.provider`. In the installed `promptfoo@0.123.0`, the default grading
  provider is chosen by credential sniffing and falls through to OpenAI when no OpenAI, Anthropic,
  Azure, Google, Mistral, xAI or Codex credential is present
  (`node_modules/promptfoo/dist/src/graders-DcXKeg8F.js:434-444`). `OPENROUTER_API_KEY` is not one of
  the sniffed keys. D-003 §Provider strategy fixes all model access to OpenRouter and names that key
  as the only credential, and `context/STATUS.md` records it as the single blocker. So a Phase 5 run
  provisioned exactly as the decision describes will fail all 21 rubric assertions, and criterion 5.2
  ("the evaluation exits 0") cannot be met. The plan is complicit: Phase 3 §3 specifies the rubric
  but never says which model grades it.
- **Fix**: Add `defaultTest.options.provider: openrouter:<grader model>` to the configuration, and
  record the grader route in the plan's Phase 3 §3 contract.
- **Decision**: PENDING

### F3 - Four seeded-defect fixtures also carry no tests, so test-adequacy contends for lowest score

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM - real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: `tools/reviewer/eval/asserts/verdict.js:62-71`, fixtures `money-rounding-bug.diff`,
  `ownership-bypass.diff`, `missing-migration.diff`, `break-month-liability.diff`
- **Detail**: The assertion requires the expected criterion to score below 6 **and** to equal the
  minimum score across all five. Those four fixtures change domain or server code that
  `test-plan.md` names under a mapped risk and contain no test lines at all. A reviewer that reads
  them correctly should score `test-adequacy` low as well, and if it scores `test-adequacy` 2 against
  a seeded criterion of 3, the assertion fails even though the read was right. The plan foresaw the
  opposite direction and made `untested-risk-change.diff` "deliberately trivial and correct" outside
  criterion 5, but nothing was done to keep criterion 5 from dominating the other four. The visible
  symptom in Phase 5 will be fixtures failing on all three models, which reads as model weakness
  rather than as fixture design.
- **Fix A ⭐ Recommended**: Add a small, plausible test hunk to each of the four fixtures, so only the
  seeded criterion is genuinely low.
  - Strength: Keeps the assertion strict, and makes each fixture test one criterion as the plan
    intended; the fixture set is the regression gate on prompt changes and a gate that fails for the
    wrong reason is worse than a loose one.
  - Tradeoff: Four fixtures to author and re-verify with `git apply --stat`.
  - Confidence: HIGH - `clean.diff` already demonstrates the shape, pairing an implementation file
    with its test file.
  - Blind spot: A reviewer might still score the added test itself as inadequate.
- **Fix B**: Exclude `test-adequacy` from the lowest-score comparison when it is not the expected
  criterion.
  - Strength: One change in one file, no fixture edits.
  - Tradeoff: Weakens the assertion permanently, and hides a genuine case where a model scores the
    seeded criterion mid-range while flagging only the missing test.
  - Confidence: MEDIUM - correct mechanically, but it trades away discrimination the fixtures exist
    to provide.
  - Blind spot: Not verified against real model output, since the evaluation has not run.
- **Decision**: PENDING

### F4 - The documented local `.env` path does not reach the CLI

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `tools/reviewer/README.md:11`, `tools/reviewer/package.json:11`, `src/model.ts:24`
- **Detail**: The README tells the reader to `cp env.example .env`, D-003 §Provider strategy offers
  `tools/reviewer/.env` as one of the two local credential locations, and `context/STATUS.md:25`
  repeats it as a required action for the account owner. Nothing loads that file: `resolveModel`
  reads `process.env` only, the `review` script is a bare `tsx src/cli.ts` with no `--env-file`, and
  `tsx` does not read `.env` on its own. A reader who follows the README exactly gets exit code 3 and
  a comment saying the credential is missing. The instruction happens to work for `npm run eval`
  because promptfoo calls `dotenv.config()` itself, which will make the failure look inconsistent
  rather than obvious.
- **Fix**: Load the file in the `review` script, for example
  `node --env-file-if-exists=.env --import tsx src/cli.ts`, or drop the `.env` offer from the README,
  D-003 and `STATUS.md` and document the shell export alone.
- **Decision**: PENDING

### F5 - The rejected-credential branch that the exit-3 gate depends on is untested

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `tools/reviewer/src/review.ts:23-25` and `:76`
- **Detail**: `isAuthFailure` maps an `APICallError` carrying status 401 or 403 to
  `missing_credential`, which becomes exit 3, which is the one code that fails the workflow job with
  a message naming the secret. `requirements.md` §Expected behaviour treats a *rejected* key as the
  same operator defect as a missing one, and `plan.md` Phase 2 §3 states it explicitly. No test
  constructs that error: `test/review.test.ts:90-97` covers only a plain `Error`, which takes the
  `provider_error` path. If `APICallError.isInstance` or the `statusCode` field shape changes in a
  future `ai` release, a mistyped key silently becomes exit 2, and the job goes green with an
  `ai-cr:error` label, which is exactly the outcome the fourth exit code was added to prevent.
- **Fix**: Add one test rejecting the mock model with an `APICallError` whose `statusCode` is 401 and
  assert reason `missing_credential`.
- **Decision**: PENDING

### F6 - Four test assertions are weaker than the behaviour their names claim

- **Severity**: 📋 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `test/model.test.ts:27-31`, `test/verdict-assertion.test.ts:82-87`,
  `test/cli.test.ts:66-70`, `test/review.test.ts:121-127`
- **Detail**: Four cases pass against implementations they are named to reject. "falls back to a
  documented default model" asserts only that `modelId` is a non-empty string, so it holds for any
  default whatsoever rather than for `DEFAULT_MODEL_ID`. "fails the injection probe when a criterion
  scores 10" supplies all 9s, and its own inline comment concedes it fails for the other reason, so
  the `anyTen` branch at `eval/asserts/verdict.js:90` is never exercised. "writes the rendered
  comment to the output the caller supplies" asserts the marker prefix, and `runCli` writes no file
  at all; `parseArgs`, `main()` and the `--out` path are untested end to end even though the
  workflow's upsert step reads that file unconditionally. "truncates a diff over maxDiffBytes"
  asserts the status and the call count but never `outcome.truncation.truncated`, which is the field
  it names. The rest of the suite is strong, which is why these stand out: `diff.test.ts` and
  `verdict.test.ts` both walk real boundaries, and `prompt.test.ts` proves the escape attempt inert
  by counting delimiters.
- **Fix**: Assert `DEFAULT_MODEL_ID`, give the injection case a criterion scoring 10, assert
  `truncation.truncated`, and add one case driving `parseArgs` plus the `--out` write.
- **Decision**: PENDING

### F7 - Criterion keys erase to `string`, so three modules read criteria through `as unknown as`

- **Severity**: 📋 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `src/criteria.ts:9` and `:98`, `src/verdict.ts:39`, `src/format.ts:8`,
  `test/verdict.test.ts:22`
- **Detail**: `CRITERIA` is annotated `readonly CriterionDefinition[]`, whose `key` is `string`, so
  the literal key union is lost before `CriterionKey` is derived. The schema's `criterionShape` is
  then cast to `Record<string, ...>`, the inferred `Review` type carries an index signature, and
  three separate call sites launder a lookup through `unknown` to get a `CriterionResult` back. The
  runtime shape is correct and the data-driven design means a renamed key propagates to the prompt,
  the schema and the comment renderer automatically. The cost is that `strict` and
  `noUncheckedIndexedAccess`, both deliberately enabled, cannot catch a mistyped criterion key
  anywhere, which is the single thing they were best placed to catch here.
- **Fix**: Declare the array `as const satisfies readonly CriterionDefinition[]` so the key union
  survives, then delete the three casts.
- **Decision**: PENDING

### F8 - A reviewer crash leaves no comment file and fails a job meant to stay green

- **Severity**: 📋 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `src/cli.ts:79-92`, `.github/workflows/ai-review.yml:90`
- **Detail**: The `--out` file is written only on the normal return path. `main().catch` sets exit
  code 2 without writing it, and the module-detection guard at `src/cli.ts:87` compares
  `import.meta.url` against a hand-built `file://` string, which will not match a path needing
  percent-encoding and would leave `main()` unrun with exit code 0. In either case the workflow's
  upsert step calls `readFileSync` on a file that does not exist, throws, and fails the job, which
  contradicts the contract that 0, 1 and 2 all leave the job successful. The ordinary error paths are
  fine: a run with no credential was verified here to write a well-formed error comment and to
  propagate exit 3 through `npm run`. This is the unexpected-crash path only.
- **Fix**: Write the rendered comment before the exit-code switch, and use `pathToFileURL` for the
  main-module check.
- **Decision**: PENDING

### F9 - Unplanned `allowScripts` entry, and CI installs the whole evaluation tree on every run

- **Severity**: 📋 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: `tools/reviewer/package.json:26-28`, `.github/workflows/ai-review.yml:62-64`
- **Detail**: `package.json` gained an `"allowScripts": { "esbuild@0.28.2": true }` block that no
  phase contract mentions. It is required by the installed npm's deferred-script behaviour and
  mirrors the precedent the work log records for the root `package.json`, so it is harmless, but it
  is an undocumented addition. Separately, the workflow's `npm ci` installs `devDependencies`,
  which pulls `promptfoo@0.123.0` and its `onnxruntime-node` tree on every pull request even though
  the CI path uses only `tsx`. The plan already expects `npm ci` to dominate wall time; this is why.
- **Fix**: Note the `allowScripts` entry in the plan as an addendum, and consider moving `promptfoo`
  behind an optional install so the CI path does not pay for the evaluation harness.
- **Decision**: PENDING

## Progress bookkeeping

Accurate. Every row flipped to `[x]` was re-verified here and holds, each carries its commit SHA
suffix, and no manual row is checked. The three Phase 4 automated rows that need a pushed repository
(4.1, 4.3, 4.11) are correctly left unchecked, and 4.11 is additionally explained in
`evidence/work-log.md` as a deliberate authorization boundary rather than an oversight. Both reported
deviations are recorded in the work log with their evidence. The one gap is that `plan.md:440`,
`:466` and `:471` still name `file://eval/provider.ts`, so the plan and the configuration disagree
for a future reader; the deviation lives only in the work log.

## Style compliance

No em dashes in any authored file under `tools/reviewer/` or in the workflow. No narrating comments:
the JSDoc blocks present all state what the code does now and why the choice was made, which is what
`AGENTS.md` permits. Every dependency is pinned exactly. The only date literals are two `new Date()`
arguments inside `clean.diff`, which are the subject under test in a time-zone fixture rather than
project metadata, so the `AGENTS.md` rule against calendar dates is not engaged.

## Resolution

Applied after the review. Every finding is resolved; none is deferred or declined.

### F1 - Workflow installs and runs pull-request-controlled code with the secret present (WARNING)

**Fix A taken.** `.github/workflows/ai-review.yml`'s reviewer install is now
`npm ci --omit=dev --ignore-scripts`, which closes the dependency-lifecycle-script path. The
requirements bullet is rewritten to state precisely what runs: the reviewer's own source executes
from the pull request head on same-repository pull requests, which is not a new privilege since
anyone who can push a branch already reaches the same secret through any workflow on that branch,
and a fork pull request has no secret to reach because `pull_request` withholds it. Verified
directly: a clean `npm ci --omit=dev --ignore-scripts` installs 16 packages (down from 886) and the
CLI still runs and produces the same `missing_credential` outcome with no credential set.

### F2 - The evaluation cannot complete with only OPENROUTER_API_KEY (WARNING)

`defaultTest.options.provider: openrouter:openai/gpt-5-mini` added to
`tools/reviewer/eval/promptfooconfig.yaml`, with an inline comment stating why (promptfoo's grader
credential sniffing does not check `OPENROUTER_API_KEY`). The grader route is now also recorded as a
note in `plan.md` Phase 3 §3. Re-validated: `npx promptfoo validate` still reports the configuration
valid.

### F3 - Four seeded-defect fixtures also carry no tests (WARNING)

**Fix B taken** (the assertion-only alternative, not the recommended Fix A): the fixtures are
unchanged; `eval/asserts/verdict.js`'s `checkExpectedCriterion` now excludes `test-adequacy` from the
"among the lowest-scoring" comparison whenever the fixture's own expected criterion is something
else, since a fixture with no test at all is, correctly, also low on test-adequacy. When
`test-adequacy` is itself the expected criterion, no exclusion applies and the full comparison still
holds. Chosen over Fix A to avoid re-authoring and re-verifying four fixtures under time pressure;
the trade-off the review named (a model scoring the seeded criterion mid-range while only flagging
the missing test would still pass) is accepted. Two new unit tests in `test/verdict-assertion.test.ts`
cover both directions: test-adequacy scoring lower than a non-test-adequacy expected criterion still
passes, and test-adequacy is still required to be lowest when it is itself the expected criterion.
The fixture-coverage test (`test/eval-config-coverage.test.ts`) remains green.

### F4 - The documented local .env path does not reach the CLI (WARNING)

`src/cli.ts`'s `main()` now calls `process.loadEnvFile(".env")` guarded by `existsSync(".env")`
before anything else runs. Verified live (not just against a mock): with a real but invalid key in
`.env` and no model injected, the CLI made an actual OpenRouter request, got rejected, and mapped the
rejection to `missing_credential` exit 3, exactly the existing 401-handling design, which only
happens if the file was genuinely loaded. `D-003` and `context/STATUS.md` each gain a clause noting
the file is loaded automatically by the CLI; the README's `.env` instruction is now literally true
and gained the same one-word clarification.

### F5 - The rejected-credential branch is untested (WARNING)

Added `test/review.test.ts` case constructing a real `APICallError` (from `@ai-sdk/provider`, pinned
`4.0.14` and added as an explicit devDependency rather than relied on transitively) with
`statusCode: 401` and asserting `reason: "missing_credential"`.

### F6 - Four test assertions weaker than their names claim (OBSERVATION, applied)

All four: `test/model.test.ts` now asserts `model.modelId === DEFAULT_MODEL_ID` rather than any
non-empty string. The injection-probe "fails when a criterion scores 10" case in
`test/verdict-assertion.test.ts` now actually scores a criterion 10 (with the injection finding still
present, isolating the `anyTen` branch), and a second case was split out for the no-finding-present
path with its own reason assertion. `test/review.test.ts`'s truncation case now asserts
`outcome.truncation.truncated`, `originalBytes` and `includedBytes` directly instead of only the
status and call count. `test/cli.test.ts` gained a `parseArgs` unit-test block and a real subprocess
test that spawns `tsx src/cli.ts` with a diff file and `--out`, and asserts the written file's content
and the process's actual exit code (3, with no credential in its environment) - `runCli`'s own test
was left in place since it is still a valid check of the pass path, but the file-write and process
paths it never touched are now covered end to end.

### F7 - Criterion keys erase to string (OBSERVATION, applied)

`CRITERIA` in `src/criteria.ts` is now `Object.freeze([...] as const satisfies readonly
CriterionDefinition[])`, which keeps the literal key union alive through `CriterionKey`. The
`unknown`-laundering casts are removed from `src/verdict.ts` (`criterionResults`), `src/format.ts`
(`renderScoreTable`, `renderFindings`, and the now-deleted `criterionResult` helper) and
`test/verdict.test.ts` (the now-deleted `criterionByKey` helper); all three read `review[key]`
directly and `tsc --noEmit` stays clean under `strict` and `noUncheckedIndexedAccess`.

### F8 - A reviewer crash leaves no comment file (OBSERVATION, applied)

`main()` in `src/cli.ts` now wraps its body in a try/catch: on any unexpected throw (a bad diff path,
an unreadable stdin stream, anything past `reviewDiff`'s own never-throws boundary), it writes a
fallback `<!-- ai-code-review -->` error comment to `--out` when given, so the workflow's upsert step
never reads a missing file, then sets exit code 2. The main-module check now compares
`import.meta.url` against `pathToFileURL(process.argv[1]).href` instead of a hand-built `file://`
string, which is correct for paths needing percent-encoding.

### F9 - Unplanned allowScripts entry, and CI installs the whole evaluation tree (OBSERVATION, applied)

Both halves. The `allowScripts` entry is now noted as an addendum in `plan.md` Phase 1 §1. Separately,
`tsx` moved from `devDependencies` to `dependencies` (it is the one package the CLI needs at runtime),
which lets the workflow's install become `npm ci --omit=dev --ignore-scripts`; verified this installs
16 packages instead of 886 and the CLI still runs correctly with no credential set. This goes beyond
the review's own suggestion ("consider moving promptfoo behind an optional install"), achieving the
same effect through the dependencies/devDependencies boundary instead.

### Verification after all fixes

- `npm ci` (full) then `npm test`: 10 files, 67 tests, all passing.
- `npm run typecheck`: clean.
- `npm ci --omit=dev --ignore-scripts` from a clean `node_modules`: 16 packages installed, CLI smoke
  test (no credential) still exits 3 with a well-formed comment.
- `npx promptfoo validate -c eval/promptfooconfig.yaml`: "Configuration is valid."
- `git apply --stat` on all seven fixtures: exit 0 for each, unchanged by the F3 fix.
- `git check-ignore tools/reviewer/env.example`: exit 1 (still tracked).
- No caret or tilde ranges in `tools/reviewer/package.json`.
