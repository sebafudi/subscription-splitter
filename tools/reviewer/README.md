# AI code review pipeline

An independent npm package that reviews a pull request diff against five project-specific criteria
and posts the result as a pull request comment and a label. It never blocks a merge.

## Local usage

```bash
cd tools/reviewer
npm ci
cp env.example .env   # fill in OPENROUTER_API_KEY, optionally REVIEWER_MODEL
npm test               # offline, no credential needed
npm run typecheck
PR_TITLE="..." PR_BODY="..." npm run review -- path/to.diff --out comment.md
```

`npm run review` reads the diff from a file path argument (or from stdin when no path is given),
the title and body from the `PR_TITLE` and `PR_BODY` environment variables, writes the rendered
comment markdown to the file named by `--out`, prints the verdict, and exits:

| Exit code | Meaning |
|---|---|
| 0 | `pass` |
| 1 | `fail` |
| 2 | `error` the reviewer could not have avoided (`no_object_generated`, `schema_invalid`, `provider_error`) |
| 3 | `error` whose reason is `missing_credential` - a configuration defect, not a review outcome |

## Review criteria

Five project-specific criteria, each scored 1 (worst) to 10 (best) with a rationale and file-level
findings. Full anchor text lives in `../../context/changes/ai-review-pipeline/requirements.md`
§Review criteria and in `src/criteria.ts`.

1. `domain-money-correctness` - integer minor units, the owner absorbing the rounding residual,
   effective-dated prices, skipped months, the current month from the subscription's time zone.
2. `ownership-and-input-safety` - every read and mutation resolved through the owning subscription,
   including child identifiers; 404 for foreign, 401 for no session; Zod at the entry point.
3. `persistence-consistency` - schema changes arrive as a sequential wrangler migration, SQL stays
   inside `src/server/db/`, risky writes are atomic, deletions respect the archive rule.
4. `domain-invariants` - rejoins, break months, the standing-order elapsed/in-range/not-skipped/not-
   excepted rule, and the zero-participant charged month as a defined state.
5. `test-adequacy` - coverage at the layer `context/foundation/test-plan.md` names per risk, with
   expected values from the worked example rather than the implementation's own output.

## Threshold rule

The verdict is recomputed in code from the five scores, never trusted from the model:

- Any criterion scoring below 6 gives `fail`.
- Any finding marked `blocking`, at any score, gives `fail`.
- Otherwise `pass`.

A provider failure or invalid output is a third outcome, `error`, and is never reported as a pass.

## Labels

Three verdict labels, mutually exclusive: `ai-cr:passed`, `ai-cr:failed`, `ai-cr:error`. A fourth
label, `ai-cr:review`, re-runs the review on demand when added to a pull request; the workflow
removes it before the reviewer step runs, so re-adding it during a run triggers a fresh one.

## Fork behaviour

The workflow triggers on `pull_request`, never `pull_request_target`. GitHub withholds every secret
except a read-only `GITHUB_TOKEN` from fork pull requests on that trigger, so a fork run is skipped
rather than failed, and a separate notice job records why in the run's step summary.

## The verdict never blocks a merge

Per `context/foundation/test-plan.md` §7, this pipeline's output quality is evaluated by its own
promptfoo suite and never gates a product change. The workflow job exits successfully for `pass`,
`fail` and `error` alike; only a missing or mistyped `OPENROUTER_API_KEY` on a same-repository pull
request fails the job, because that is an operator defect rather than a review result.

## Evaluation

`npm run eval` runs the seven fixtures in `eval/fixtures/` against three OpenRouter models through
`eval/promptfooconfig.yaml`, using the same `reviewDiff()` the CI workflow calls. Results, cost and
latency are captured in `../../evidence/champion/eval-results.md`. Needs `OPENROUTER_API_KEY`.
