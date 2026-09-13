<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: AI code review pipeline (Phase 5)

- **Plan**: `context/changes/ai-review-pipeline/plan.md`
- **Scope**: whole change, emphasis on Phase 5 of 5 (`d4e755f`, `7b3a7b7`, `4db78e8`, `6678f55`, `3ece70a`)
- **Reviewer**: independent, no authorship of the implementation
- **Date**: 2026-09-13
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 5 warnings, 4 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | WARNING |

The Champion route is genuinely built and genuinely exercised. A real SDK reviewer calls OpenRouter
through `generateObject` against a Zod verdict schema, four named malformed-output paths are handled
without a throw, two models were compared live on the same seven fixtures with per-cell pass/fail,
cost and latency saved, the model was chosen from those numbers and recorded in `D-011`, and the
hosted workflow ran on a real pull request and posted a visible, specific comment. I verified the
hosted half independently rather than from the write-ups: run `34727750896` concluded successfully
with the fork-notice job skipped, pull request 1 is merged carrying exactly one `<!-- ai-code-review -->`
comment and exactly one `ai-cr:passed` label, all four `ai-cr:*` labels exist, the `REVIEWER_MODEL`
repository variable reads `z-ai/glm-5.3-flash`, and the `OPENROUTER_API_KEY` secret is set. The three
Champion screenshots were opened and show what they claim.

Security is the strongest part of the change. The trigger is `pull_request` and not
`pull_request_target`, so a fork pull request never sees the secret and gets an explanatory job
instead; workflow-level `permissions: {}` with `contents: read` plus `pull-requests: write` on the one
job that needs it; `npm ci --omit=dev --ignore-scripts`; the pull request title and body reach the
process through `env:` and never through a shell string; untrusted text is wrapped in per-call
nonce-delimited blocks whose terminator is stripped from the content first; diff, output tokens and
retries are all bounded. A full secret scan of the tree and of history found no key material, only
the `sk-or-v1-test` placeholder and a negative assertion.

What pulls the verdict down is the record rather than the code. The comparison that chose the model
was run at an output token budget that exists in no commit, the evidence file states that budget
wrongly, and two of the four recorded model failures are the exact failure mode the team fixed
immediately afterwards without re-running the comparison. Around that sit a superseded runbook
presented as current and a token budget that is stale in five more documents.

## Verification performed

| Check | Result |
|---|---|
| `npm test` in `tools/reviewer` | pass, 68 tests in 10 files |
| `npm run typecheck` at the repository root (three tsc projects) | clean |
| `npm run test:unit` at the repository root | pass, 185 tests in 15 files |
| Secret scan of the working tree and of `git log -p --all -S` for `sk-or-`, `sk-ant-`, `ghp_`, `github_pat_` | no key material; only the `sk-or-v1-test` placeholder |
| `gh run list --workflow=ai-review.yml` | `34727750896` success, `34727724451` and `34727635662` failed at install |
| `gh pr view 1 --json state,labels,comments` | MERGED, one `ai-cr:passed`, one marker comment authored by `github-actions` |
| `gh label list`, `gh variable list`, `gh secret list` | four `ai-cr:*` labels; `REVIEWER_MODEL=z-ai/glm-5.3-flash`; `OPENROUTER_API_KEY` present |
| Three Champion screenshots opened | pipeline view, job log with masked credential, and PR comment all match their descriptions |
| Arithmetic in `evidence/champion/eval-results.md` (per-cell costs, totals, mean and median latency) | every figure recomputes correctly |
| `evidence/index.md` rows C02-C09, every cited artifact path | all exist on disk |

Not verified: the integration suite was not run (it needs a Workers/D1 runtime), and no live model
call was made, so nothing here re-measures cost or latency.

## Findings

### F1 - The recorded comparison ran at a token budget that exists in no commit

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM - real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: `evidence/champion/eval-results.md:100-101`, `tools/reviewer/src/review.ts:26`
- **Detail**: `eval-results.md` states "At 8000 both returned a valid object first time.
  `MAX_OUTPUT_TOKENS` is now 8000 and a unit test pins it there with the reason." Neither half was
  true when it was committed and neither is true now. At `d4e755f`, the commit that introduced the
  file, `tools/reviewer/src/review.ts:20` still read `const MAX_OUTPUT_TOKENS = 2000` and no test
  pinned it; `git show d4e755f --stat` confirms that commit does not touch `src/`. The next commit,
  `7b3a7b7`, moved the constant straight from 2000 to 16000, skipping 8000 entirely. The matrix was
  therefore produced by a working-tree value of 8000 that no commit in this repository reproduces, and
  the one document a reader consults to reproduce it names the wrong number.
- **Fix**: Correct the sentence in `eval-results.md` to say the matrix was produced at an
  uncommitted working-tree budget of 8000, that the committed budget is now 16000
  (`src/review.ts:26`, pinned by `test/review.test.ts`), and that the run is therefore not
  reproducible from any tagged commit.
  - Strength: Costs one paragraph and makes the Champion evidence honest about its own
    reproducibility, which is what a grader checks the file for.
  - Tradeoff: The record becomes visibly messier than the current clean story.
  - Confidence: HIGH - established from the commit contents, not inferred.
  - Blind spot: I cannot confirm the working tree was at exactly 8000 during the run; that is only
    the document's own claim.
- **Decision**: PENDING

### F2 - The model choice rests partly on a failure the team then attributed to that budget

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH - architectural stakes; think carefully before deciding
- **Dimension**: Plan Adherence
- **Location**: `context/decisions/D-011-reviewer-model-selection.md:5`, `evidence/champion/eval-results.md:39,56-57,64-65`
- **Detail**: `D-011` gives two reasons for choosing the dearer model. The second is the prompt
  injection probe: the alternative "failed to produce a parsable object at all, so the embedded
  instruction was neither followed nor reported." That cell is recorded as `no_object_generated`, and
  `no_object_generated` is precisely the failure the very next commit attributes to the token budget.
  `src/review.ts:22-25` says "8000 was still too tight ... runs that reasoned harder truncated the
  JSON mid-object", and `evidence/runs/ai-review-live-call.md` records two `no_object_generated`
  attempts on one fixture resolved by raising the budget to 16000. The preferred model's own
  `untested-risk-change` failure is the same reason. So two of the four recorded failures, including
  one of the two pillars of the decision, are plausibly artifacts of a budget the team has since
  rejected, and the comparison was not re-run at 16000. The first pillar survives untouched: the
  alternative's false `fail` on the clean control with `TODO` in every rationale is a schema-valid
  response that no token budget explains. The decision is probably right; the evidence offered for it
  is weaker than stated.
- **Fix A ⭐ Recommended**: Record the confound rather than re-spend. Add a paragraph to `D-011` and
  to `eval-results.md` stating that the matrix ran at 8000, that both `no_object_generated` cells are
  the failure mode later attributed to that budget, and that the selection therefore rests on the
  clean-control behaviour alone, with the injection-probe result set aside as unresolved.
  - Strength: Costs nothing, keeps a choice that is defensible on its surviving pillar, and stops a
    future reader from treating the injection result as settled.
  - Tradeoff: Leaves a real question about the alternative's injection handling permanently open.
  - Confidence: HIGH - the clean-control failure is independent of the budget, so the decision does
    not change.
  - Blind spot: If the alternative also handles injection well at 16000, the cost argument for
    revisiting the default gets stronger and nobody will know.
- **Fix B**: Re-run the two-model comparison at 16000 and replace the matrix. Prior spend for the
  whole phase was 0.1148 dollars against a 2 dollar ceiling, so a second matrix is affordable.
  - Strength: Produces a comparison that matches shipping code and settles the injection cell.
  - Tradeoff: Spends real money and re-opens a decision already recorded and acted on.
  - Confidence: MEDIUM - depends on both identifiers still being available and priced as observed.
  - Blind spot: A re-run could flip the choice to the cheaper model, which means touching
    `DEFAULT_MODEL_ID`, the repository variable and the workflow again.
- **Decision**: PENDING

### F3 - The Phase 5 runbook is wholly superseded and presents itself as current

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `context/changes/ai-review-pipeline/phase-5-runbook.md:16-18,70-127,271`
- **Detail**: The file opens as "Ordered, copy-pasteable steps for the moment `OPENROUTER_API_KEY`
  exists" and carries no supersession note anywhere. Phase 5 has since run, and almost every
  operational fact in it is now wrong: the workflow "has never run" (three runs exist), three
  configured providers (there are two), the candidate set `deepseek/deepseek-v3.2` /
  `openai/gpt-5-mini` / `anthropic/claude-sonnet-4.6` (none is a candidate; the second is the
  grader), a `gemini-2.5-flash` fallback comment that no longer exists in the configuration, a `cost`
  assertion at 0.05 and a latency threshold of 60000 (the first was removed, the second is 300000),
  `deepseek/deepseek-v3.2` as the package default (it is recorded as superseded in `D-011:7`), and a
  claim that the workflow passes only `OPENROUTER_API_KEY` to the CLI step (it passes four
  variables). A reader who follows it would reconfigure the pipeline backwards.
- **Fix**: Add a note at the top stating the runbook is the pre-execution procedure, superseded by
  the Phase 5 revision note in `plan.md` and by `evidence/champion/eval-results.md`, and kept only as
  a record of what was planned.
- **Decision**: PENDING

### F4 - The output token budget is stale in five more documents

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `tools/reviewer/README.md:84-85`, `context/changes/ai-review-pipeline/research.md:114,244`, `context/changes/ai-review-pipeline/plan.md:491,825`, `tools/reviewer/eval/promptfooconfig.yaml:9-10,38-40`
- **Detail**: The shipped value is 16000 (`src/review.ts:26`), pinned by a unit test. The reviewer
  README says 8000, `research.md:114` says 8000 and `research.md:244` still says a 2,000 token output
  cap with no supersession note, `plan.md:491` says 2,000 and the Performance considerations section
  at `plan.md:825` says "bounded to 2,000 output tokens with one retry". The evaluation configuration
  contradicts the code inside the same commit that changed it: `7b3a7b7` wrote "which is why
  `src/review.ts` budgets 8000 output tokens rather than 2000" at `promptfooconfig.yaml:9-10` while
  setting the constant to 16000. `promptfooconfig.yaml:38-40` also gives the observed latency range as
  "38s to 282s" where the matrix it describes records a 522.3s cell and `eval-results.md:108` says
  "38s to 522s".
- **Fix**: Sweep the six sites to 16000 and correct the latency range in the evaluation
  configuration to 38s to 522s.
- **Decision**: PENDING

### F5 - Five manual Progress rows are unchecked with no reason, and the change summary omits them

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `context/changes/ai-review-pipeline/plan.md:884-885,900-902`, `context/changes/ai-review-pipeline/change.md:30-35`
- **Detail**: The honesty of the record is, on the rows the change summary names, real and worth
  saying so. Row 5.2 is left unchecked with a full explanation rather than made green by loosening
  the assertion, which is the right call and is stated as such. The six Phase 4 manual rows each
  carry a specific reason, and I accept all six: 4.6, 4.8 and 4.12 would need a second run, a re-run
  and a hundred-comment thread on the repository's only pull request; 4.9 and 4.13 need a fork, and
  the repository has zero forks; 4.14 would mean deliberately breaking a working secret. But
  `change.md` says only row 5.2 and six Phase 4 rows are unchecked. Five more are: 2.10 and 2.11 in
  Phase 2, and 3.6, 3.7 and 3.9 in Phase 3, none of which carries any reason at all, unlike every
  Phase 4 and Phase 5 row. Several are also cheap to close now: 2.10 is satisfied by reading
  `src/prompt.ts:39-64`, and 2.11 is largely covered by the secret scan and by
  `test/format.test.ts:64-72`.
- **Fix**: Either close 2.10, 2.11, 3.6, 3.7 and 3.9 against the evidence that already exists, or
  give each the same one-line reason the Phase 4 rows carry, and correct `change.md` so its count of
  unchecked rows matches the plan.
- **Decision**: PENDING

### F6 - Two spend totals for the same phase

- **Severity**: 🔵 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `context/changes/ai-review-pipeline/plan.md:695`, `evidence/champion/eval-results.md:119`
- **Detail**: The Phase 5 revision note says "total spend at 0.1337 dollars". `eval-results.md:119`,
  Progress row 5.7 at `plan.md:939` and `evidence/index.md:63` all say 0.1148 dollars for the same
  quantity, the whole-phase key spend. Both are far under the 2 dollar ceiling, so nothing is at
  risk, but two numbers for one figure will read as an error to anyone checking. The per-cell costs
  and the 0.026870 matrix total recompute correctly, so only this one figure is in question.
- **Fix**: Reconcile to one figure, or say in the revision note that 0.1337 is a later reading of the
  key that includes spend after the matrix was recorded.
- **Decision**: PENDING

### F7 - An error outcome leaves the job green with no run-level signal

- **Severity**: 🔵 OBSERVATION
- **Impact**: 🔎 MEDIUM - real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `.github/workflows/ai-review.yml:148-152`, `tools/reviewer/src/cli.ts:38-42`
- **Detail**: Only exit code 3 fails the job. Exit 2, which covers `provider_error`,
  `no_object_generated` and `schema_invalid`, posts an `ai-cr:error` comment and label and lets the
  job conclude successfully. This is documented as intentional in `requirements.md`, and for an
  advisory gate that deliberately never becomes a required check it is a defensible choice. It is
  worth revisiting now because Phase 5 measured how often `no_object_generated` actually happens:
  two of fourteen cells in the recorded matrix, plus two earlier attempts on the live call. A
  silently green run is the outcome a reader is least likely to notice.
- **Fix**: Add a step that writes a `::warning::` to the run summary on exit 2, keeping the job green
  but making the error visible on the Actions page rather than only on the pull request.
- **Decision**: PENDING

### F8 - No job timeout on a step with a measured tail of nearly nine minutes

- **Severity**: 🔵 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `.github/workflows/ai-review.yml:30-38`, `tools/reviewer/src/review.ts:50-57`
- **Detail**: Cost is bounded well in every dimension the plan named: one call per run, 96 KB of
  diff, 16000 output tokens, one retry, and a concurrency group that cancels superseded runs. What is
  not bounded is wall time. Neither job sets `timeout-minutes`, so the GitHub default of 360 minutes
  applies, and `generateObject` is called with no `abortSignal`. The recorded matrix has a 522.3s
  cell and a 180s mean, so a hung provider call is not hypothetical, and it would burn runner minutes
  rather than tokens.
- **Fix**: Set `timeout-minutes: 15` on the `review` job.
- **Decision**: PENDING

### F9 - Actions are pinned to floating majors in one workflow and exact patches in the other

- **Severity**: 🔵 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `.github/workflows/ai-review.yml:42,53,61,89,121`, `.github/workflows/ci.yml:18,21`
- **Detail**: `ci.yml` pins `actions/checkout@v7.0.1` and `actions/setup-node@v7.0.0` to exact patch
  tags. `ai-review.yml` uses the floating majors `actions/github-script@v9`, `actions/checkout@v7` and
  `actions/setup-node@v7`. All are first-party `actions/*`, so the supply-chain exposure is low, but
  `AGENTS.md` states "Pin every dependency to an exact version" and the sibling workflow follows it.
  The reviewer package itself is exemplary here: every dependency is an exact version with no caret or
  tilde, and the lockfile is committed.
- **Fix**: Pin the five `uses:` in `ai-review.yml` to exact patch tags to match `ci.yml`.
- **Decision**: PENDING

## Notes on what was checked and found sound

- **Untrusted input handling.** `buildUserPrompt` strips any literal occurrence of the per-call nonce
  from the content before wrapping it (`src/prompt.ts:67-74`), so untrusted text cannot terminate its
  own block, and the system prompt instructs the model to report an embedded instruction as a
  blocking finding rather than follow it. A dedicated fixture probes this and the live run reported
  honestly that no injection content was present.
- **Verdict integrity.** `deriveVerdict` recomputes the verdict from the five criterion scores and
  finding severities and never reads the model's own `overall` field, whether present, contradictory
  or null (`src/verdict.ts:45-52`).
- **The removed `cost` assertion.** The saved cost matrix remains trustworthy without it. Costs are
  read from `result.providerMetadata.openrouter.usage.cost` in `src/review.ts:61-63` and echoed
  through `eval/provider.ts:50-61`, a path independent of the promptfoo assertion, and the totals
  recompute. What was genuinely lost is automated spend-regression detection, which the pipeline's
  own review of pull request 1 flagged unprompted and which is recorded in
  `evidence/champion/hosted-review-run.md:45-46`.
- **The Node 24 change.** The cause is diagnosed rather than guessed: an npm 11 lockfile against the
  npm 10 that Node 22 bundles, with the alternative of regenerating the lockfile considered and
  rejected for removing 3,654 lines. The reason is carried in a comment at
  `.github/workflows/ai-review.yml:57-59`.
- **The 16000 change is tested.** `test/review.test.ts` asserts both that the constant is forwarded to
  the model call and that it is at least 16000, so a silent regression to 2000 fails.
- **Fork safety.** The repository is public with zero forks. A fork pull request triggers the
  workflow, the `review` job is gated off by a head-repository comparison, and `pull_request`
  withholds every secret, so the failure mode is a skipped review and an explanatory summary rather
  than an exposure. The `fork-notice` job runs with `permissions: {}` and only writes to the step
  summary.
