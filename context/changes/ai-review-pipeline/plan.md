# Implementation plan: AI code review pipeline

## Overview

Build `tools/reviewer/`, an independent npm package that sends a bounded pull request diff to a model
through OpenRouter, forces a five-criterion verdict into a Zod schema, and derives a pass or fail from
a fixed threshold rule. Wrap it in a promptfoo evaluation over three models on four fixed diff
fixtures, then in a GitHub Actions workflow that posts one comment and one label on every pull request
into `main`. Roadmap item S-05, milestone anchor MS-01.

## Current state analysis

The repository has no application code, no `package.json` anywhere, and no `.github/` directory. The
foundation documents are complete: `AGENTS.md` states the money, ownership, migration and month-format
rules; `context/foundation/test-plan.md` carries a six-risk map with a cheapest-layer and an
anti-pattern column per risk; `context/foundation/prd.md` carries the worked example that pins the
rounding rule. Those three documents are the raw material for the criteria, and they exist today.

Decision D-003 fixes the route, the provider strategy and the security constraints. Decision D-001
fixes the auth mechanism the ownership criterion describes. The one missing input is
`OPENROUTER_API_KEY`, recorded as the single blocker in `context/STATUS.md`.

## Desired end state

A pull request into `main` receives, within a minute or two of opening, one comment giving five scores
with rationales and file-level findings, and one label saying whether the change passed the threshold.
The same package, unchanged, runs under promptfoo against three models on four fixtures and produces a
results table with pass or fail per fixture alongside cost and latency. `npm test` inside
`tools/reviewer` passes with no network access and no credential.

Verified by: the workflow run URL on a real pull request, the comment and label visible on that pull
request, the promptfoo results file, and a green `npm test`.

### Key findings

- `ai@7.0.99` still exports `generateObject` and `NoObjectGeneratedError` with a static `isInstance`
  guard; `@openrouter/ai-sdk-provider@3.0.0` peers on `ai@^7` and requires Node `>=22`. See
  `research.md` §Evidence.
- `ai/test` exports `MockLanguageModelV3` and `MockLanguageModelV4`, which is how the unit tests reach
  the whole `reviewDiff()` path with no network.
- `pull_request` withholds all secrets except a read-only `GITHUB_TOKEN` from fork pull requests. The
  fork question is settled by the trigger, not by a guard, and the guard is only there to make the
  skip legible.
- promptfoo's `openrouter:` provider reads the same `OPENROUTER_API_KEY`, and `promptfoo eval` exits
  `100` on any test failure, which makes the eval a usable regression gate.
- `context/foundation/test-plan.md` §7 already decides that this pipeline never gates a product
  change. That is why the workflow job stays green regardless of verdict.

## What we are NOT doing

- Not creating `ci.yml` for application typecheck and tests. That is a separate change.
- Not giving the reviewer tools, file reads, repository crawling or any agentic loop. One call, one
  object. The optional lesson 3 task 4 extension stays unbuilt.
- Not committing anything back to the pull request branch, and not posting a commit status. No
  `contents: write`, no `[skip ci]` recursion guard.
- Not making the verdict a required check or a merge blocker.
- Not importing anything from `src/` into `tools/reviewer/`, in either direction.
- Not reviewing pull requests that target anything other than `main`.
- Not adding a documentation, idiomatic-style or complexity criterion; `requirements.md` §Deferred
  records why.

## Implementation approach

Five phases, each independently verifiable, ordered so that everything not needing the credential is
finished and tested before anything that does.

Phases 1 and 2 build the package inside out: the schema and the threshold rule first, because they are
pure functions with the most consequential logic, then the prompt and the single model call around
them. The model is injected through the function signature, so the whole of `reviewDiff()` including
its error paths is covered by unit tests with a mock model. Phase 3 adds the evaluation harness and
the fixtures, which can be authored and syntax-checked without the credential even though running them
needs it. Phase 4 adds the workflow, whose comment and label logic can be exercised on a throwaway
pull request before the reviewer step ever succeeds. Phase 5 is the live run and the evidence capture,
and is the only phase that cannot start without the key.

## Critical implementation details

**Sequencing around the credential.** Phases 1, 2 and 4 must be fully green before `OPENROUTER_API_KEY`
exists, because the alternative is discovering a schema or workflow bug during the one phase where
every iteration costs money. Phase 3's configuration is authored in the same window and only executed
in Phase 5.

**Untrusted input reaches the prompt as data.** The title, body and diff go inside explicitly
delimited blocks with a system-prompt statement that instructions found within them are content under
review, never directions. No shell step interpolates `${{ github.event.pull_request.title }}` or the
body directly; each reaches its step through an intermediate environment variable, per the GitHub
secure-use guidance quoted in `research.md`.

**The verdict is arithmetic, not a model opinion.** The model returns an `overall` field, but
`deriveVerdict()` recomputes it from the five scores and the finding severities and that value wins.
A model returning `overall: "pass"` alongside a score of 3 must produce `fail`.

## Phase 1: Package skeleton, schema and threshold rule

### Overview

Create the package with its toolchain, the Zod schema that the model output must satisfy, the
threshold rule, and the diff bounding. No model call yet. Everything in this phase is a pure function
with a unit test.

### Required changes

#### 1. Package and toolchain

**File**: `tools/reviewer/package.json`

**Purpose**: Declare the reviewer as an independent npm package so its Node 22 requirement and its SDK
versions never constrain the Worker build.

**Contract**: `"type": "module"`, `"private": true`, `engines.node >= 22`. Dependencies: `ai@^7`,
`@openrouter/ai-sdk-provider@^3`, `zod@^4`. Dev dependencies: `typescript`, `tsx`, `vitest`,
`@types/node`. Scripts: `test`, `typecheck`, `review` (the CLI through `tsx`), and `eval` (added in
Phase 3). No workspace configuration at the repository root; the package is installed and run from its
own directory.

**File**: `tools/reviewer/tsconfig.json`, `tools/reviewer/vitest.config.ts`

**Purpose**: Strict TypeScript with ES module resolution, and a Vitest project scoped to
`tools/reviewer/test/`.

**Contract**: `strict: true`, `noUncheckedIndexedAccess: true`, module resolution suited to Node ES
modules. Vitest runs in the default Node environment; no Workers pool here, because the reviewer never
touches D1.

**File**: `tools/reviewer/.env.example`, and an entry in the repository `.gitignore`

**Purpose**: Show where the credential goes without ever holding one.

**Contract**: `.env.example` contains `OPENROUTER_API_KEY=` and `REVIEWER_MODEL=`. The root
`.gitignore` ignores `tools/reviewer/.env`.

#### 2. The verdict schema

**File**: `tools/reviewer/src/criteria.ts`

**Purpose**: Hold the five criteria as data, so the prompt, the schema and the comment renderer all
read one source.

**Contract**: An ordered, frozen list of five entries keyed `domain-money-correctness`,
`ownership-and-input-safety`, `persistence-consistency`, `domain-invariants`, `test-adequacy`. Each
entry carries a human title, the question it asks, and the anchor text for score 1 and score 10, taken
verbatim from `requirements.md` §Review criteria.

**File**: `tools/reviewer/src/schema.ts`

**Purpose**: The one contract the model output must satisfy, and the source of the TypeScript types
used everywhere else.

**Contract**: `findingSchema` with `file` (string), `line` (nullable number), `severity`
(`'blocking' | 'major' | 'minor'`) and `message` (string). `criterionResultSchema` with `score`
(integer, 1 to 10), `rationale` (string) and `findings` (array of findings). `reviewSchema` with one
object per criterion key, plus `summary` (string) and `overall` (`'pass' | 'fail'`). Optional fields
use `.nullable()` rather than `.optional()`, per the SDK's structured-output guidance. Exports the
inferred types.

#### 3. The threshold rule

**File**: `tools/reviewer/src/verdict.ts`

**Purpose**: Turn five scores and their findings into the gate decision, in code rather than in the
model.

**Contract**: `deriveVerdict(review): 'pass' | 'fail'`. Returns `fail` if any criterion scores below
6, or if any finding anywhere has severity `blocking`; otherwise `pass`. The model's own `overall`
field is ignored. Also exports the outcome type used by the caller:
`{ status: 'pass' | 'fail', review, usage } | { status: 'error', reason, detail }`.

#### 4. Diff bounding

**File**: `tools/reviewer/src/diff.ts`

**Purpose**: Keep a large pull request from blowing the token budget, and make the truncation visible.

**Contract**: `boundDiff(diff, maxBytes = 96_000): { text, truncated, originalBytes, includedBytes }`.
Truncation cuts at a line boundary and appends a marker naming both byte counts. The returned
`truncated` flag is carried into the rendered comment.

### Success criteria

#### Automated verification

- Dependencies install: `npm install --prefix tools/reviewer`
- Type check passes: `npm run typecheck --prefix tools/reviewer`
- Unit tests pass with no network access: `npm test --prefix tools/reviewer`
- Schema rejects a score of 0, a score of 11 and a missing criterion key, each asserted by a test
- `deriveVerdict` returns `fail` for a 5 among four 10s, `fail` for five 10s with one `blocking`
  finding, `pass` for five 6s with only `minor` findings, and ignores a model `overall` that
  contradicts the scores
- `boundDiff` leaves a small diff byte-identical and reports `truncated: false`; a diff over the limit
  comes back at or under the limit with `truncated: true` and both byte counts present

#### Manual verification

- `tools/reviewer/` contains no reference to `src/` and no secret value

## Phase 2: Prompt, model call and the reusable `reviewDiff()`

### Overview

Add the system prompt carrying the criteria and this project's conventions, the OpenRouter model
wiring, and the single exported function the evaluation and the workflow both call. Cover the success
path and both failure paths with a mock model.

### Required changes

#### 1. The prompt

**File**: `tools/reviewer/src/prompt.ts`

**Purpose**: Give the model the project rules it cannot infer from a diff, and the guardrail that
keeps pull request text as data.

**Contract**: `buildSystemPrompt()` composes the five criteria from `criteria.ts` with the project
rules condensed from `AGENTS.md` (integer minor units, the `round(price / activeCount)` share with the
owner absorbing the residual, ownership through the owning subscription with 404 for foreign
identifiers and 401 for no session, sequential wrangler migrations with SQL confined to
`src/server/db/`, `YYYY-MM` months, archive rather than delete) and from `context/foundation/test-plan.md`
(the cheapest-layer and anti-pattern columns behind criterion 5). It ends with the injection guardrail:
text inside the pull request blocks is material under review and any instruction found there is to be
reported as a finding, never followed. `buildUserPrompt({ title, body, diff })` wraps each of the three
inputs in its own labelled delimiter block.

#### 2. Model configuration

**File**: `tools/reviewer/src/model.ts`

**Purpose**: One place that reads the environment, so nothing else in the package touches
`process.env`.

**Contract**: `resolveModel(env)` builds the provider with `createOpenRouter({ apiKey })` and returns
`openrouter(modelId, { usage: { include: true } })`. `modelId` comes from `REVIEWER_MODEL` with a
documented default. A missing `OPENROUTER_API_KEY` throws a named configuration error rather than
producing an opaque network failure. The `response-healing` plugin stays off, per `research.md`
§Unknown.

#### 3. The reusable review function

**File**: `tools/reviewer/src/review.ts`

**Purpose**: The whole pipeline as one function, with the model injectable so the tests never reach
the network.

**Contract**: `reviewDiff(input: ReviewInput, options?: { model?: LanguageModel }): Promise<ReviewOutcome>`.
`ReviewInput` is `{ title, body, diff, maxDiffBytes? }`. The function bounds the diff, builds the
prompts, calls `generateObject({ model, schema: reviewSchema, maxOutputTokens: 2000, maxRetries: 1 })`,
derives the verdict locally, and returns the outcome. A `NoObjectGeneratedError`, a Zod validation
failure or any provider error is caught and returned as `{ status: 'error', ... }`; the function never
throws and never returns `pass` on a failure. `options.model` defaults to `resolveModel(process.env)`,
which is what makes the test path credential-free.

#### 4. Comment rendering and the command-line entry

**File**: `tools/reviewer/src/format.ts`

**Purpose**: Turn an outcome into the markdown the workflow posts, deterministically enough to unit
test.

**Contract**: `renderComment(outcome): string`, beginning with the hidden marker
`<!-- ai-code-review -->` that the upsert step matches on. Renders a verdict line, a five-row score
table, findings grouped by criterion with `file:line` where present, the summary, the model
identifier, and the truncation note when the diff was bounded. The `error` outcome renders its own
short body saying no verdict was produced and why.

**File**: `tools/reviewer/src/cli.ts`, `tools/reviewer/src/index.ts`

**Purpose**: A callable entry point for CI, and a clean public surface for the evaluation harness.

**Contract**: The CLI reads the diff from a file path argument or from stdin, the title and body from
environment variables, writes the rendered comment to a file named by `--out`, prints the verdict to
stdout, and exits 0 for `pass`, 1 for `fail`, 2 for `error`. `index.ts` re-exports `reviewDiff`, the
schema, the types and `renderComment`.

#### 5. Record the commands

**File**: `AGENTS.md`

**Purpose**: `AGENTS.md` requires the slice that adds a `package.json` to record its scripts in the
same change.

**Contract**: Replace the placeholder line under "Build, test and dev commands" with the
`tools/reviewer` scripts, noting that they run from that directory and that the application scaffold
still does not exist.

### Success criteria

#### Automated verification

- Type check passes: `npm run typecheck --prefix tools/reviewer`
- Unit tests pass with no network access and no `OPENROUTER_API_KEY` set:
  `npm test --prefix tools/reviewer`
- A mock model returning a well-formed object yields `status: 'pass'` or `'fail'` matching the
  threshold rule, asserted for both directions
- A mock model returning unparseable text yields `status: 'error'`, and the test asserts that
  `reviewDiff` did not throw
- A mock model returning valid JSON that violates the schema, such as a score of 12 or a missing
  criterion, yields `status: 'error'`
- A mock model that rejects with a provider error yields `status: 'error'`
- `resolveModel` throws a named configuration error when `OPENROUTER_API_KEY` is absent, asserted by a
  test
- `renderComment` output starts with `<!-- ai-code-review -->` for every outcome kind, asserted by a
  test
- The CLI exits 0, 1 and 2 for `pass`, `fail` and `error`, asserted by a test driving the entry point
  with a mock model

#### Manual verification

- The system prompt names all five criteria, the project rules and the injection guardrail, read once
  end to end
- No prompt, comment or log line can contain a credential

## Phase 3: Evaluation harness, fixtures and model comparison

### Overview

Author the promptfoo configuration, the four synthetic diff fixtures, the assertions and the results
capture. Everything here is written and syntax-checked in this phase; the run that costs money happens
in Phase 5.

### Required changes

#### 1. Fixtures

**File**: `tools/reviewer/eval/fixtures/clean.diff`, `money-rounding-bug.diff`,
`ownership-bypass.diff`, `missing-migration.diff`

**Purpose**: Four synthetic diffs, each written against this codebase's conventions, that a good
reviewer must sort correctly. They double as the regression gate on prompt changes.

**Contract**: Each is a valid unified diff against plausible paths from the project structure in
`AGENTS.md`. `clean.diff` is a correct, well-tested change that must pass. `money-rounding-bug.diff`
distributes the residual across participants instead of onto the owner, so the month still sums but
the owner is wrong; the seeded defect belongs to criterion 1. `ownership-bypass.diff` loads a child
record by its own identifier without resolving through the owning subscription; criterion 2.
`missing-migration.diff` reads a new column in a repository method with no corresponding
`migrations/NNNN_*.sql`; criterion 3. All four are synthetic and contain no real record.

#### 2. Custom provider and assertions

**File**: `tools/reviewer/eval/provider.ts`

**Purpose**: Put the real `reviewDiff()` under evaluation rather than a bare prompt, so the evaluation
and CI exercise one code path.

**Contract**: A promptfoo JavaScript provider, referenced from the configuration as
`file://eval/provider.ts`, that takes the model identifier from its own `config`, calls `reviewDiff()`
and returns the serialised outcome as `output` with token counts and cost in the response metadata.

**File**: `tools/reviewer/eval/asserts/verdict.js`

**Purpose**: A deterministic pass or fail check per fixture, independent of any grader model.

**Contract**: A `javascript` assertion receiving `(output, context)`, returning `{ pass, score,
reason }`. It parses the outcome, compares `status` against the fixture's expected verdict from
`context.vars`, and for the seeded-bug fixtures also requires the expected criterion to be the one
scoring lowest.

#### 3. The evaluation configuration

**File**: `tools/reviewer/eval/promptfooconfig.yaml`

**Purpose**: Three models over four fixtures with assertions, cost and latency in one table.

**Contract**: Providers are three instances of `file://eval/provider.ts`, each with a distinct
`config.model` and a distinct label: `deepseek/deepseek-v3.2` as the cheap option,
`openai/gpt-5-mini` as the mid option, `anthropic/claude-sonnet-4.6` as the strong option.
`google/gemini-2.5-flash` is recorded in a comment as the substitute if `openai/gpt-5-mini` is
unavailable on the day. `defaultTest.assert` carries a `cost` threshold and a `latency` threshold so
the spend cap is an assertion. Each test supplies the fixture path and the expected verdict as vars,
asserts with `file://eval/asserts/verdict.js`, and adds one `llm-rubric` asserting that the rationale
names the actual defect rather than a generic concern. Caching stays on and the matrix is run only
when the prompt or the schema changes.

**File**: `tools/reviewer/package.json`

**Contract**: Add an `eval` script running `promptfoo eval -c eval/promptfooconfig.yaml --output
eval/results.json`, and add `promptfoo` as a dev dependency pinned to a known version.

#### 4. Results capture

**File**: `evidence/champion/eval-results.md`

**Purpose**: The Champion evidence for the model comparison, in a form a reader can check.

**Contract**: One table of model against fixture with pass or fail, plus observed cost and latency per
cell and a total, and a short paragraph choosing the CI default model with its reason. Written when
Phase 5 runs; the file does not exist before then. Prices observed on the day are recorded here rather
than cited from `research.md`.

### Success criteria

#### Automated verification

- The configuration parses and lists the expected providers and tests without calling a model:
  `npx promptfoo validate -c tools/reviewer/eval/promptfooconfig.yaml`
- Every fixture is a valid unified diff: `git apply --check --stat` succeeds or reports only missing
  context, for each of the four files
- Type check still passes with the provider included:
  `npm run typecheck --prefix tools/reviewer`
- Unit tests still pass: `npm test --prefix tools/reviewer`
- The assertion module is exercised by a unit test against recorded outcome fixtures, with no model
  call

#### Manual verification

- Each fixture's seeded defect is genuinely present and genuinely singular, read once by hand
- `clean.diff` contains nothing a reasonable reviewer would flag as blocking

## Phase 4: GitHub Actions workflow, comment and label

### Overview

Wire the package into CI: run on pull requests into `main`, produce the comment, upsert it, set the
label, and handle forks and the on-demand re-run label. Everything except the model call itself is
observable on a throwaway pull request before the credential exists.

### Required changes

#### 1. The workflow

**File**: `.github/workflows/ai-review.yml`

**Purpose**: The pipeline, kept thin enough to read in one screen.

**Contract**: Trigger `pull_request` with `branches: [main]` and
`types: [opened, synchronize, reopened, labeled]`; not `pull_request_target`. Workflow-level
`permissions: {}`; the single job declares `contents: read`, `pull-requests: write`, `issues: write`
and nothing else. Job-level `if` requires
`github.event.pull_request.head.repo.full_name == github.repository`, and for a `labeled` event also
requires the label to be `ai-cr:review`, so an unrelated label does not trigger a run. A concurrency
group keyed on the pull request number with `cancel-in-progress: true`. Steps: `actions/checkout@v7`
with `fetch-depth: 0`; `actions/setup-node@v7` on Node 22; `npm ci` in `tools/reviewer`; compute the
diff with `git diff origin/$BASE...HEAD` into a file; run the reviewer CLI with `OPENROUTER_API_KEY`
from secrets and the title and body passed as environment variables, never interpolated into a shell
string; upsert the comment; set the label; always exit 0 for the verdict itself.

#### 2. Comment upsert and labelling

**File**: `.github/workflows/ai-review.yml`, `actions/github-script@v9` steps

**Purpose**: One comment per pull request rather than one per push, and exactly one verdict label.

**Contract**: The upsert step lists issue comments, finds the first whose body contains
`<!-- ai-code-review -->`, and calls `updateComment` if found or `createComment` if not. The body is
read from the file the CLI wrote, through `fs`, never through a template expression. The label step
adds `ai-cr:passed` or `ai-cr:failed` and removes the other, tolerating a 404 when the other label was
not present. On a `labeled` run it also removes `ai-cr:review` so re-adding it triggers again. Label
definitions, including colours, are created once as a documented one-off `gh label create`.

#### 3. Fork and failure behaviour

**File**: `.github/workflows/ai-review.yml`

**Purpose**: Make the skip legible and keep a review outcome from breaking the build.

**Contract**: The fork guard is in the job `if`, so a fork pull request shows the job as skipped rather
than failed; `research.md` records why no secret could reach it anyway. The reviewer step captures the
CLI's exit code with `continue-on-error` or an explicit capture, so `fail` and `error` still reach the
comment and label steps, and the job's own conclusion stays successful. An install or checkout failure
still fails the job normally.

#### 4. Document the pipeline

**File**: `tools/reviewer/README.md`

**Purpose**: One page telling the next reader how to run it locally, what the criteria are, what the
threshold is and where the key goes.

**Contract**: Local usage, the environment variables, the criteria list with a pointer to
`requirements.md`, the threshold rule, the labels, the fork behaviour, and the statement that the
verdict does not block a merge.

### Success criteria

#### Automated verification

- The workflow file is valid YAML and is accepted by GitHub: it appears under
  `gh workflow list` after being pushed
- `gh workflow view ai-review.yml` shows the `pull_request` trigger and no `pull_request_target`
- A run triggered on a throwaway pull request reaches the reviewer step, visible in
  `gh run list --workflow=ai-review.yml`
- A grep of the workflow file finds no `${{ github.event.pull_request.title }}` or `.body` inside a
  `run:` block
- The declared permissions block contains exactly `contents: read`, `pull-requests: write` and
  `issues: write`

#### Manual verification

- A second push to the same pull request updates the existing comment rather than adding a second one
- Exactly one of `ai-cr:passed` and `ai-cr:failed` is present after a run
- Adding `ai-cr:review` re-runs the review and the label is removed by the run
- A pull request from a fork shows the job as skipped, with no error

## Phase 5: Live run, model comparison and evidence capture

### Overview

The only phase that needs `OPENROUTER_API_KEY`. Run the evaluation matrix, choose the CI model on the
numbers, run the pipeline on a real pull request, and capture the Champion evidence.

### Required changes

#### 1. Provision the credential

**Purpose**: Two places need it, and neither is a file in the repository.

**Contract**: The account owner exports `OPENROUTER_API_KEY` locally, or writes it to
`tools/reviewer/.env`, and sets the repository secret with
`gh secret set OPENROUTER_API_KEY -R sebafudi/subscription-splitter`. This is the manual, blocked step
recorded in `context/STATUS.md`.

#### 2. Run the evaluation and choose the model

**File**: `evidence/champion/eval-results.md`

**Purpose**: Settle the cheap-versus-expensive question with a table rather than an impression.

**Contract**: Re-fetch the catalog first and record the prices observed on the day. Run
`npm run eval --prefix tools/reviewer` once. Fill the table, state the total spend, and name the model
the workflow will default to with the reason. If the cheapest model passes all four fixtures, it is
the default and the expensive one is recorded as the fallback.

#### 3. Set the CI model and run on a real pull request

**File**: `.github/workflows/ai-review.yml`

**Contract**: Set `REVIEWER_MODEL` in the workflow environment to the chosen identifier. Open a real
pull request into `main` carrying a small change and let the pipeline run.

#### 4. Capture the evidence

**File**: `evidence/champion/`, `evidence/index.md`, `evidence/work-log.md`

**Purpose**: The three Champion screenshot categories plus the repository's own evidence trail.

**Contract**: Three screenshots under `evidence/champion/`: the pipeline view showing at least one
job, the job log, and the model's review comment on the pull request. Add rows to `evidence/index.md`
for goals C01 to C07 naming the artifacts and the run URL, and one appended entry to
`evidence/work-log.md`. Record the commit in `context/decisions/D-003-...` where it says "recorded when
`tools/reviewer` lands", and update `context/STATUS.md` to clear the blocker.

### Success criteria

#### Automated verification

- The evaluation completes and writes results: `npm run eval --prefix tools/reviewer` produces
  `tools/reviewer/eval/results.json`
- The evaluation exits 0, meaning every fixture assertion passed for at least the chosen model;
  `promptfoo eval` exits 100 if any test fails
- The workflow run on the real pull request completes: `gh run list --workflow=ai-review.yml` shows a
  successful conclusion and `gh run view <id> --log` contains the reviewer output
- The pull request carries exactly one `ai-code-review` comment and one verdict label:
  `gh pr view <n> --json comments,labels`

#### Manual verification

- The three screenshots exist under `evidence/champion/` and show the pipeline view, the job log and
  the comment
- Total spend for the evaluation is under the two dollar ceiling, read from the OpenRouter activity
  page
- The comment's findings are specific to the change rather than generic advice
- `context/STATUS.md` no longer lists the credential as a blocker

## Testing strategy

### Unit tests

All in `tools/reviewer/test/`, all offline, no credential.

- Schema: valid object accepted; score 0, score 11, non-integer score, missing criterion key, unknown
  severity each rejected.
- Threshold: every boundary of the rule, including 5 versus 6, a `blocking` finding among high scores,
  and a contradictory model `overall`.
- Diff bounding: under limit, exactly at limit, over limit, and a diff whose truncation point falls
  mid-line.
- `reviewDiff`: success, unparseable text, schema-violating JSON, provider rejection, and the
  guarantee that it never throws.
- Configuration: missing `OPENROUTER_API_KEY` produces a named error.
- Rendering: marker present for every outcome kind, truncation note present when truncated, no
  credential in output.
- CLI: exit codes 0, 1 and 2.
- Assertion module: the promptfoo assertion graded against recorded outcome fixtures.

### Integration tests

None. The reviewer has no database, no routes and no runtime bindings. The promptfoo suite is the
integration layer and it is a separate, credentialed run.

### Manual testing steps

1. Open a throwaway pull request into `main` and confirm the workflow triggers and reaches the
   reviewer step.
2. Push a second commit and confirm the comment is updated in place.
3. Add `ai-cr:review` and confirm a re-run happens and the label is removed.
4. Open a pull request from a fork of the repository and confirm the job is skipped.
5. After Phase 5, read the comment on a real change and judge whether the findings are specific.

## Performance considerations

One model call per pull request per run, bounded to 2,000 output tokens with one retry. The diff is
bounded at 96 KB. Expected wall time is well under two minutes, dominated by `npm ci` and the model
call. The concurrency group means a burst of pushes costs one run, not one per push.

## References

- Research: `context/changes/ai-review-pipeline/research.md`
- Requirements: `context/changes/ai-review-pipeline/requirements.md`
- Opportunity map: `context/changes/ai-review-pipeline/opportunity-map.md`
- Decision: `context/decisions/D-003-ai-review-route-and-model-access.md`
- Risk map and gating position: `context/foundation/test-plan.md` §2, §7
- Reference workflow shape: `10x-impl-review-ci/references/workflow-template.yml`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` - <commit sha>` when a step lands. Do not rename
> step titles. The reference format uses an em dash as the suffix separator; this repository forbids
> em dashes in authored files, so the separator here is a hyphen.

### Phase 1: Package skeleton, schema and threshold rule

#### Automated

- [ ] 1.1 Dependencies install in tools/reviewer
- [ ] 1.2 Type check passes in tools/reviewer
- [ ] 1.3 Unit tests pass with no network access
- [ ] 1.4 Schema rejects out-of-range scores and missing criterion keys
- [ ] 1.5 deriveVerdict covers every branch of the threshold rule
- [ ] 1.6 boundDiff reports truncation with both byte counts

#### Manual

- [ ] 1.7 tools/reviewer references nothing under src/ and holds no secret

### Phase 2: Prompt, model call and the reusable reviewDiff()

#### Automated

- [ ] 2.1 Type check passes in tools/reviewer
- [ ] 2.2 Unit tests pass with no OPENROUTER_API_KEY set
- [ ] 2.3 Mock model success path yields pass and fail matching the threshold rule
- [ ] 2.4 Unparseable model output yields status error without throwing
- [ ] 2.5 Schema-violating model output yields status error
- [ ] 2.6 Provider rejection yields status error
- [ ] 2.7 resolveModel throws a named error when the credential is absent
- [ ] 2.8 renderComment emits the hidden marker for every outcome kind
- [ ] 2.9 CLI exits 0, 1 and 2 for pass, fail and error

#### Manual

- [ ] 2.10 System prompt carries all five criteria, the project rules and the injection guardrail
- [ ] 2.11 No prompt, comment or log line can carry a credential

### Phase 3: Evaluation harness, fixtures and model comparison

#### Automated

- [ ] 3.1 promptfoo configuration validates without calling a model
- [ ] 3.2 All four fixtures are valid unified diffs
- [ ] 3.3 Type check passes with the evaluation provider included
- [ ] 3.4 Unit tests still pass
- [ ] 3.5 The promptfoo assertion module is unit tested against recorded outcomes

#### Manual

- [ ] 3.6 Each fixture's seeded defect is present and singular
- [ ] 3.7 clean.diff contains nothing a reasonable reviewer would call blocking

### Phase 4: GitHub Actions workflow, comment and label

#### Automated

- [ ] 4.1 Workflow appears in gh workflow list
- [ ] 4.2 Trigger is pull_request and not pull_request_target
- [ ] 4.3 A run on a throwaway pull request reaches the reviewer step
- [ ] 4.4 No run block interpolates the pull request title or body
- [ ] 4.5 Permissions are exactly contents read, pull-requests write, issues write

#### Manual

- [ ] 4.6 A second push updates the existing comment in place
- [ ] 4.7 Exactly one verdict label is present after a run
- [ ] 4.8 The ai-cr:review label re-runs the review and is removed by the run
- [ ] 4.9 A fork pull request shows the job as skipped

### Phase 5: Live run, model comparison and evidence capture

#### Automated

- [ ] 5.1 The evaluation writes eval/results.json
- [ ] 5.2 The evaluation exits 0 for the chosen model
- [ ] 5.3 The workflow run on a real pull request concludes successfully
- [ ] 5.4 The pull request carries one review comment and one verdict label

#### Manual

- [ ] 5.5 OPENROUTER_API_KEY provisioned locally and as a repository secret
- [ ] 5.6 Three Champion screenshots captured under evidence/champion/
- [ ] 5.7 Evaluation spend is under the two dollar ceiling
- [ ] 5.8 The comment's findings are specific to the change
- [ ] 5.9 STATUS.md no longer lists the credential as a blocker
