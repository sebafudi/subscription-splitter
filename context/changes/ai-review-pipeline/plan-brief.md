# AI code review pipeline - plan brief

> Full plan: `context/changes/ai-review-pipeline/plan.md`
> Requirements: `context/changes/ai-review-pipeline/requirements.md`
> Research: `context/changes/ai-review-pipeline/research.md`
> Opportunity map: `context/changes/ai-review-pipeline/opportunity-map.md`

## What and why

Build an independent reviewer package at `tools/reviewer/` that reads a pull request diff, scores it
against the five things this project can get silently wrong, and posts the verdict as a comment and a
label on the pull request. Most code here is written by agents from plan files, and the person who
reviews the diff is the person who wrote the plan; the generic review products on the market do not
know that a foreign child identifier must answer 404 or that the owner absorbs the rounding residual.

## Starting point

No application code, no `package.json`, no `.github/`. What does exist is the written knowledge the
criteria are made of: `AGENTS.md`, `context/foundation/prd.md` with the worked rounding example, and
`context/foundation/test-plan.md` with its six-risk map. Decision D-003 fixed the route and the
provider strategy; `OPENROUTER_API_KEY` is the single missing input.

## Desired end state

A pull request into `main` gets one comment with five scores, rationales and file-level findings, plus
one label saying pass or fail. The same package runs under promptfoo against three models on four
fixed fixtures and produces a pass-or-fail table with cost and latency. `npm test` inside
`tools/reviewer` passes offline with no credential.

## Key decisions taken

| Decision | Choice | Why | Source |
|---|---|---|---|
| Review criteria | Five project-specific ones: money correctness, ownership and input safety, persistence consistency, domain invariants, test adequacy | These are what no generic reviewer knows; style and complexity are already covered | Requirements |
| Structured output | `generateObject` with a Zod schema, validated locally | The OpenRouter provider's own guide uses it, and local validation makes the failure path testable across every model | Research |
| Verdict | Recomputed in code from the scores, not read from the model | A model cannot talk the gate out of a failure, and the rule becomes a pure unit test | Plan |
| Threshold | Fail if any criterion is below 6, or any finding is `blocking`; otherwise pass | Two arithmetic rules, both trivially testable | Plan |
| Failure handling | Provider failure or invalid output is a third outcome, `error`, never a pass | The gate must not report success because the model broke | Requirements |
| Gating | The verdict never blocks a merge; the job exits 0 for every verdict | `test-plan.md` §7 already recorded this position | Requirements |
| Trigger | `pull_request`, never `pull_request_target` | GitHub withholds secrets from fork pull requests on this trigger, which settles fork safety by construction | Research |
| Evaluation models | `deepseek/deepseek-v3.2`, `openai/gpt-5-mini`, `anthropic/claude-sonnet-4.6` | Cheap, mid and strong; all three confirmed present with structured output support | Research |
| Test boundary | Model injected into `reviewDiff()`; unit tests use a mock model | Every path including the error paths is covered offline, with no credential | Plan |

## Scope

**In scope:** the `tools/reviewer` package with its schema, threshold rule, prompt and CLI; four
synthetic diff fixtures; a promptfoo matrix over three models; the `ai-review.yml` workflow with
comment upsert, verdict labels and fork handling; the Champion evidence capture.

**Out of scope:** the application's own CI workflow; tools or an agentic loop for the reviewer;
committing anything back to a branch; making the verdict a required check; reviewing pull requests
into any branch but `main`; any criterion for style, complexity, documentation or architecture.

## Architecture

One package, one function. `reviewDiff()` bounds the diff, builds a system prompt from the criteria
plus this project's rules, makes a single `generateObject` call through OpenRouter, validates the
result against a Zod schema, and derives the verdict locally. A thin CLI wraps it for CI and a
promptfoo custom provider wraps the same function for evaluation, so the matrix and the pipeline
exercise one code path. The workflow computes the diff, runs the CLI, and hands the rendered markdown
to two `actions/github-script` steps for the comment upsert and the label.

## Phases at a glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Skeleton, schema, threshold | The package, the Zod schema, the verdict rule, diff bounding, all unit tested | Getting the schema shape wrong late, after the prompt depends on it |
| 2. Prompt and reviewDiff() | The reusable function with every error path covered by a mock model | A failure path that throws instead of returning `error`, which would break CI loudly |
| 3. Evaluation harness | promptfoo configuration, four fixtures, assertions, results capture | A fixture whose seeded defect is ambiguous, making the matrix unreadable |
| 4. Workflow | The pipeline, comment upsert, labels, fork handling | Interpolating untrusted pull request text into a shell step |
| 5. Live run and evidence | The model comparison, a real pull request run, the screenshots | Blocked entirely on the credential |

**Prerequisites:** Node 22 or later. Phases 1 to 4 need nothing else. Phase 5 needs
`OPENROUTER_API_KEY` both locally and as a repository secret, which only the account owner can
provide.

## Open risks and assumptions

- The credential is the one hard blocker, and it gates Phase 5 alone. Phases 1 to 4 are deliberately
  ordered ahead of it so no iteration on a schema or a workflow bug costs money.
- Model availability and pricing move. The catalog is re-fetched at the start of Phase 5 and the
  observed prices are recorded in the results file rather than cited from the research document.
- How strictly each model honours a nested schema is untested until the credential exists. The schema
  is kept shallow to reduce the exposure, and a model that cannot produce it is an evaluation result
  rather than a defect.
- The reviewer's usefulness is a judgement, not a measurement. If its findings turn out to be generic,
  the honest response is to remove the label rather than to tune indefinitely.

## Success criteria

- A real pull request carries one review comment with five scored criteria and one verdict label, from
  a workflow run whose URL is recorded as evidence.
- The model comparison table settles the cheap-versus-expensive question on numbers, for under two
  dollars of total spend.
- `npm test` inside `tools/reviewer` passes with no network and no credential, covering the threshold
  rule and every failure path.
