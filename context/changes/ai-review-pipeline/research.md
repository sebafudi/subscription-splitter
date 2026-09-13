---
git_commit: 4a19f60
branch: main
repository: subscription-splitter
topic: "Libraries and platform constraints for the CI code review pipeline"
tags: [research, ai-sdk, openrouter, promptfoo, github-actions]
status: complete
---

# Research: libraries and platform constraints for the CI code review pipeline

> Schema deviation: the reference frontmatter carries `date`, `last_updated` and `researcher` fields.
> All three are omitted here for the same reason the foundation documents omit dates - this repository
> records progress by change ID and commit SHA, and names no author beyond Git itself.

## Research question

What do the current versions of the Vercel AI SDK, the OpenRouter provider, promptfoo and GitHub
Actions actually offer for a package that sends a bounded pull request diff to a model, forces a
structured verdict, evaluates several models on fixed fixtures, and posts one comment plus a label on
a pull request? Which OpenRouter models are available with structured output, and what do they cost?

## Summary

Every piece of the intended design is available in a current release, and the version landscape moved
since the course material was written. The SDK is at `ai@7`, whose OpenRouter provider is
`@openrouter/ai-sdk-provider@3`, and `generateObject` is still a first-class export even though the
documentation site now leads with `generateText` plus `Output.object`. promptfoo has a first-party
`openrouter:` provider and reports cost and latency per test, with assertion types covering both a
deterministic JavaScript check and a model-graded rubric. The GitHub side is the constraint that
matters most: `pull_request` is the safe trigger and it deliberately withholds secrets from fork pull
requests, which settles the fork question by construction rather than by a guard.

The biggest correction to the course prompts is the model list. `z-ai/glm-5.1` and
`deepseek/deepseek-v4-flash` from the lesson prompt do not exist in the live catalog; the equivalents
that do are recorded below with their observed prices.

## Evidence

Everything in this section was observed directly in this session by running the command shown or by
reading the named documentation page.

### The AI SDK, `ai@7.0.99`

- `npm view ai version` returns `7.0.99`. `npm view ai@7.0.99 peerDependencies` returns
  `{ zod: '^3.25.76 || ^4.1.8' }`, so Zod 4 is supported. `npm view zod version` returns `4.6.2`.
- The package's own type declarations, fetched from `https://unpkg.com/ai@7.0.99/dist/index.d.ts`,
  export `generateObject`, `generateText`, `Output`, `NoObjectGeneratedError`, `streamObject` and
  `ToolLoopAgent` from the package root. `generateObject` is not deprecated.
- `generateObject`'s options accept `schema`, `schemaName`, `schemaDescription`, `output`
  (`'object' | 'array' | 'enum' | 'no-schema'`), `model`, `repairText`, and the shared call settings
  including `maxOutputTokens`, `maxRetries` and `abortSignal`. `experimental_repairText` is present
  but marked deprecated in favour of `repairText`.
- `NoObjectGeneratedError` is a declared class with a static `isInstance(error)` guard. The SDK
  documentation shows it carrying `cause`, `text`, `response` and `usage`, so a failed generation can
  be reported with the raw text that failed to parse.
- The documentation site's current examples lead with `generateText` plus `Output.object({ schema })`,
  reading the result from `result.output`. `Output.object` takes `schema`, `name` and `description`.
- A documented schema pitfall: for strict structured output, optional fields should be expressed with
  `.nullable()` rather than `.optional()` or `.nullish()`.

### The OpenRouter provider, `@openrouter/ai-sdk-provider@3.0.0`

- `npm view @openrouter/ai-sdk-provider version` returns `3.0.0`. Its peer dependencies are
  `{ ai: '^7.0.0', zod: '^3.25.76 || ^4.1.8' }` and its engines field requires Node `>=22`.
- `createOpenRouter(options)` accepts `apiKey` (falling back to the `OPENROUTER_API_KEY` environment
  variable), `baseURL` (default `https://openrouter.ai/api/v1`), `headers`, `extraBody`,
  `compatibility` (`'strict' | 'compatible'`, default `'compatible'`), a custom `fetch`, and `appName`
  and `appUrl` for attribution.
- The provider's own integration guide shows `generateObject` from `ai` used directly with
  `openrouter('<model-id>')` and a Zod schema. This is the combination the reviewer needs.
- Per-model options include `usage: { include: true }`, which surfaces the real charged cost at
  `result.providerMetadata.openrouter.usage.cost` alongside the SDK's own token counts.
- The provider ships a `response-healing` plugin, enabled per model as `plugins: [{ id:
  'response-healing' }]`, that repairs malformed JSON. It works only for non-streaming requests.

### The OpenRouter model catalog

Fetched with `curl -s https://openrouter.ai/api/v1/models` in this session; 445 models returned. Prices
are US dollars per million tokens, converted from the per-token values in the response.

| Model ID | Input | Output | Context | Max output | `structured_outputs` |
|---|---|---|---|---|---|
| `deepseek/deepseek-v3.2` | 0.269 | 0.40 | 163,840 | 65,536 | yes |
| `openai/gpt-5-mini` | 0.25 | 2.00 | 400,000 | 128,000 | yes |
| `google/gemini-2.5-flash` | 0.30 | 2.50 | 1,048,576 | 65,535 | yes |
| `anthropic/claude-sonnet-4.6` | 3.00 | 15.00 | 1,000,000 | 128,000 | yes |
| `z-ai/glm-4.6` | 0.43 | 1.75 | 204,800 | 16,384 | yes |
| `mistralai/mistral-small-3.2-24b-instruct` | 0.075 | 0.20 | 256,000 | 16,384 | yes |

All six list both `response_format` and `structured_outputs` in `supported_parameters`, and all six
list `tools`. The two model identifiers named in the course prompt, `z-ai/glm-5.1` and
`deepseek/deepseek-v4-flash`, are absent from the catalog.

### Catalog re-verification for the Phase 5 candidates, 2026-09-13

`context/STATUS.md` §OpenRouter configuration update names a preferred model and an alternative. Both
were re-fetched from `https://openrouter.ai/api/v1/models` on the day of the live run (445 models
returned) and both exist as exact identifiers, so no substitution was needed.

| Model ID | Input | Output | Context | Max output | `structured_outputs` |
|---|---|---|---|---|---|
| `z-ai/glm-5.3-flash` | 0.15 | 0.50 | 1,310,720 | 131,072 | yes |
| `deepseek/deepseek-v4-flash-0731` | 0.04 | 0.08 | 1,310,720 | 943,718 | yes |

The alternative is the cheaper of the two, not the dearer: it is roughly 3.8 times cheaper on input
and 6.3 times cheaper on output. The earlier note above, that the course-named identifiers were
absent, described the catalog as it stood when this document was first written; the `z-ai` and
`deepseek` families have both moved since.

Both candidates are reasoning models, and OpenRouter bills their reasoning tokens against the same
`maxOutputTokens` budget the object must fit in. Probed on `eval/fixtures/money-rounding-bug.diff`,
each consumed the whole 2,000 token allowance on reasoning alone, returned `finishReason: "length"`
with zero text tokens, and surfaced as a `no_object_generated` outcome. 8,000 was tried next and both
returned a valid object, but it was still too tight in practice: one review was observed spending
5,167 reasoning tokens before 1,347 tokens of object, and runs that reasoned harder truncated the
JSON mid-object. The shipped budget is **16,000** (`tools/reviewer/src/review.ts`, pinned by
`test/review.test.ts`). This supersedes the inference below that a verdict fits comfortably under
2,000 output tokens: that holds for a non-reasoning model only.

### promptfoo, `0.123.0`

- `npm view promptfoo version` returns `0.123.0`.
- The OpenRouter provider is first-party. Provider identifiers take the form
  `openrouter:<model-id>`, for example `openrouter:anthropic/claude-opus-4.7`. Per-provider `config`
  accepts `temperature`, `max_tokens`, `apiBaseUrl` and `apiKeyEnvar`.
- The API key comes from the `OPENROUTER_API_KEY` environment variable, the same variable the reviewer
  package uses, or from `apiKey` in the configuration.
- `defaultTest.assert` applies assertions to every test. `cost` takes a `threshold` in dollars and
  `latency` takes a `threshold` in milliseconds, so the spend cap can be an assertion rather than a
  manual read.
- A `javascript` assertion receives `(output, context)`. Returning an object of the shape
  `{ pass, score, reason }` gives a graded result rather than a boolean, and a `metric` key on the
  assertion names the column it aggregates into. File-based scripts are referenced as
  `file://path/to/assert.js` and receive `[output, context]`.
- `llm-rubric` takes free-form grading instructions as its `value` and is the model-graded assertion.
- A custom provider can be a JavaScript file, referenced as `file://path/to/custom_provider.js`. This
  is how the reviewer package itself, rather than a raw prompt, becomes the thing under evaluation.
- `promptfoo eval --output results.json` writes results out; HTML, CSV, YAML, JSONL and JUnit XML are
  also supported. Outputs include latency in milliseconds, input and output token counts, estimated
  cost and error details per test case.
- `promptfoo eval` exits `100` when at least one test case fails, or when the pass rate falls below
  `PROMPTFOO_PASS_RATE_THRESHOLD`, and `1` on any other error. The failure exit code can be overridden
  with `PROMPTFOO_FAILED_TEST_EXIT_CODE`.

### GitHub Actions

- `pull_request` runs in the context of the pull request's head branch. `pull_request_target` runs in
  the context of the base branch and therefore carries the base branch's privileges.
- From the events reference: "With the exception of `GITHUB_TOKEN`, secrets are not passed to the
  runner when a workflow is triggered from a forked repository. The `GITHUB_TOKEN` has read-only
  permissions in pull requests from forked repositories."
- From the same page: "Running untrusted code on the `pull_request_target` trigger may lead to
  security vulnerabilities. These vulnerabilities include cache poisoning and granting unintended
  access to write privileges or secrets."
- From the secure-use reference: "Workflows that use these triggers must not explicitly check out
  untrusted code, including from pull request forks or from repositories that are not under your
  control."
- On script injection, the same reference: "For inline scripts, the preferred approach to handling
  untrusted input is to set the value of the expression to an intermediate environment variable." The
  worked attack is a pull request title of the form `a"; ls $GITHUB_WORKSPACE"`.
- On permissions: "It's good security practice to set the default permission for the `GITHUB_TOKEN` to
  read access only for repository contents. The permissions can then be increased, as required, for
  individual jobs."
- `actions/github-script` is at `v9.0.0` (from `gh api repos/actions/github-script/releases/latest`),
  running `@actions/github` v9. The script body receives `github` (an Octokit REST client with
  pagination), `context`, `core`, `getOctokit`, and the `glob`, `io` and `exec` packages.
- The comment upsert pattern is `github.rest.issues.listComments` to find a prior comment matching a
  marker, then `github.rest.issues.updateComment` if found or `createComment` if not.
  `listComments` returns one page, thirty comments by default, so the marker search has to go through
  `github.paginate` with `per_page: 100` or it silently misses a marker on a long pull request.
- GitHub's "Permissions required for GitHub Apps" reference lists
  `POST /repos/{owner}/{repo}/issues/{issue_number}/labels`,
  `DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}`,
  `POST /repos/{owner}/{repo}/issues/{issue_number}/comments` and
  `PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}` under the Issues repository permission at
  write level. The same endpoints also appear under the Pull requests permission section, which is why
  a job acting only on pull requests is expected to work with `pull-requests: write` alone. The page
  does not state the inheritance explicitly, so this is the one permission claim to confirm by
  observing the first run rather than by reading.
- Current release tags for the other actions in play: `actions/checkout` `v7.0.1`, `actions/setup-node`
  `v7.0.0`.

### The course's own reference workflow

`10x-impl-review-ci/references/workflow-template.yml` is a working example of the same shape and
contributes three patterns worth copying, none of which is a reason to use its action:

- A concurrency group keyed on the pull request number with `cancel-in-progress: true`, so a rapid
  series of pushes leaves one run.
- `if: github.event.pull_request.head.repo.full_name == github.repository` as an explicit fork guard,
  belt and braces alongside the trigger choice.
- `permissions: {}` at the workflow level with each job raising only what it needs.

It also demonstrates what this change should not do: it commits a report file back to the branch,
which needs `contents: write` and a `[skip ci]` recursion guard, and it posts a blocking commit
status. A comment and a label need neither.

## Inference

Reasoned from the evidence above, not directly observed.

- **Use `generateObject`, not `generateText` plus `Output.object`.** Both are current. The OpenRouter
  provider's own guide demonstrates `generateObject`, the failure surface is a single documented error
  class, and a verdict is a one-shot structured result with no streaming and no tool loop. Choosing
  the narrower function makes the failure path easier to test.
- **The reviewer's own Zod schema is the gate, not the provider's JSON mode.** Provider-side
  `structured_outputs` support varies in strictness across the six candidate models. Validating the
  parsed object locally means the same test suite covers every model and the malformed-output path is
  exercisable with no network.
- **Recompute the verdict locally from the scores.** The model is asked for an overall verdict, but
  the threshold rule is arithmetic over five integers. Deriving it in code means a model that returns
  low scores with a cheerful verdict still fails, and the threshold logic becomes a pure unit test.
- **`maxOutputTokens` is the practical spend control, not the model choice.** With five criteria and
  bounded findings, a verdict fits comfortably under 2,000 output tokens. That bound applied uniformly
  is what keeps a 15 dollar per million token model affordable on a fixture set.
- **Estimated evaluation cost is small.** Four fixtures across three models, with roughly 5,000 input
  and 1,200 output tokens per call, comes to about 0.007 dollars on `deepseek/deepseek-v3.2`, 0.015 on
  `openai/gpt-5-mini` and 0.13 on `anthropic/claude-sonnet-4.6`: under 0.20 dollars per full matrix
  before grader calls. The two dollar ceiling allows several reruns.
- **Fork pull requests need no special handling beyond a guard.** Because `pull_request` withholds
  secrets from forks and downgrades the token to read-only, a fork run would fail at the first model
  call and could not post a comment anyway. Skipping the job on a fork turns a confusing failure into
  an honest skip.
- **The reviewer package should not import from `src/`.** `tools/reviewer/` has its own
  `package.json` and its own dependency set. Keeping the boundary hard means the reviewer's Node 22
  requirement and its SDK versions never constrain the Worker build.

## Unknown

Open items, each with the default to take if it is still unresolved when the work starts.

- **Whether `anthropic/claude-sonnet-4.6` and `openai/gpt-5-mini` remain available and priced as
  observed.** The catalog moves. Default: re-run the catalog fetch as the first step of the evaluation
  phase and record the prices observed on the day in the results file rather than citing this
  document.
- **How strictly each candidate model honours a nested schema with an array of findings.** Not
  testable without the credential. Default: keep the schema shallow, mark optional fields
  `.nullable()` per the SDK guidance, and treat a model that cannot produce it as an evaluation result
  rather than a bug.
- **Whether promptfoo's `cost` assertion reports the OpenRouter charge or its own estimate.** Resolved
  by design rather than by investigation: the spend ceiling no longer rests on the assertion. The
  custom provider sets `tokenUsage` and `cost` from `result.providerMetadata.openrouter.usage.cost`,
  that figure is the authoritative one recorded in `evidence/champion/eval-results.md` and
  cross-checked against the OpenRouter activity page, and the assertion is kept only as a tripwire.
  The ceiling itself is enforced by bounded input, a bounded output cap, one retry and a fixed
  fixture count. The cap named here as 2,000 is superseded: the shipped value is 16,000, because both
  Phase 5 candidates are reasoning models whose thinking is billed against the same budget. See the
  Phase 5 candidate re-verification section above.
- **Whether `@openrouter/ai-sdk-provider`'s `response-healing` plugin is worth enabling.** It would
  mask exactly the malformed-output path the unit tests exist to cover. Default: leave it off, and
  reconsider only if a model that is otherwise good fails purely on JSON formatting.
- **Whether a `labeled` re-run needs its own concurrency treatment.** Default: one concurrency group
  per pull request with `cancel-in-progress: true`, accepting that a label added mid-run cancels the
  in-flight run and starts a fresh one.

## Open questions for the implementer

None that block. Every item above has a stated default.

## References

- `context/decisions/D-003-ai-review-route-and-model-access.md` - route, provider strategy and
  security constraints.
- `context/foundation/test-plan.md` §2 risk map and §7 - the source of criterion 5 and of the decision
  that this pipeline never gates a product change.
- `AGENTS.md` - the money, ownership, month-format and archive rules the criteria encode.
- `10x-impl-review-ci/references/workflow-template.yml` - the course's own reference workflow.
