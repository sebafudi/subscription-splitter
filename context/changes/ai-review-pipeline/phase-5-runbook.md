# Phase 5 runbook: AI review pipeline

Ordered, copy-pasteable steps for the moment `OPENROUTER_API_KEY` exists. Everything up to this
point (phases 1 to 4) is landed and green with no network access. This runbook assumes the key is
in hand and unblocks GOALS.md items C02, C04, C05, C06, C07, C08 and C09.

Spending note first, since it applies to every step below: `docs/AUTONOMOUS-EXECUTION.md` requires
new model spending to sit inside an existing authorized budget, prepared as bounded options and cost
limits rather than opened silently. The estimate in this document (well under one dollar for the full
matrix, against the two dollar ceiling in `plan.md` row 5.7) is a bound, not an authorization. Confirm
the account owner has approved a budget covering that bound before running the promptfoo command in
step 2.

## What the workflow does today with no secret

`.github/workflows/ai-review.yml` is registered (`gh workflow list` shows it alongside `CI`) but has
never run, because it triggers only on `pull_request` and no pull request has ever been opened on
this repository. Once a pull request does trigger it:

- On a same-repository pull request, the `review` job runs. It installs the reviewer with
  `npm ci --omit=dev --ignore-scripts`, computes the diff against the merge base, then runs
  `npm run review` with `OPENROUTER_API_KEY` from the repository secret. With the secret absent,
  empty, or rejected by OpenRouter, `resolveModel()` throws `MissingCredentialError`, `reviewDiff()`
  maps that to an outcome with `reason: "missing_credential"`, and the CLI exits `3`. The workflow's
  last step checks for exactly that exit code and fails the job with an `::error::` line naming
  `OPENROUTER_API_KEY` explicitly, so a missing key reads as a configuration defect, not a review
  verdict.
- A comment is still upserted and a label is still set before that failing step runs, because the
  CLI writes a fallback comment to `--out` on any outcome including `error` (this is the crash-safety
  fix from the implementation review, F8). So a missing-secret run still leaves an `ai-cr:error`
  comment and label on the pull request, then fails the job on its final step.
- On a fork pull request, the separate `fork-notice` job runs instead and writes an explanatory step
  summary; the `review` job's `if` condition skips it entirely, since `pull_request` withholds every
  secret except a read-only `GITHUB_TOKEN` from forks.

## 1. Place the key

Local, for the promptfoo run:

```bash
cd tools/reviewer
cp env.example .env
```

Edit `.env` and set `OPENROUTER_API_KEY=<key>`. Leave `REVIEWER_MODEL` blank unless step 3 below has
already picked a model to pin. `tools/reviewer/.env` matches the root `.gitignore`'s `.env` pattern
(confirmed with `git check-ignore -v tools/reviewer/.env`), so it is never staged.

Repository secret, for the hosted workflow. Do not pass the key as a bare CLI argument (it would land
in shell history); pipe it in instead:

```bash
gh secret set OPENROUTER_API_KEY -R sebafudi/subscription-splitter
```

This prompts for the value on stdin interactively. Confirm it landed with:

```bash
gh secret list -R sebafudi/subscription-splitter
```

## 2. Run the promptfoo model comparison

```bash
cd tools/reviewer
npm run eval
```

This runs `promptfoo eval -c eval/promptfooconfig.yaml --output eval/results.json` (the `eval`
script in `package.json`) over all seven fixtures in `eval/fixtures/` against the three configured
providers, each a `file://provider.ts` instance wrapping the real `reviewDiff()`:

| Label | Model |
|---|---|
| cheap | `deepseek/deepseek-v3.2` |
| mid | `openai/gpt-5-mini` (fall back to `google/gemini-2.5-flash` if unavailable on the day, per the comment already in `promptfooconfig.yaml`) |
| strong | `anthropic/claude-sonnet-4.6` |

Every test also carries an `llm-rubric` assertion graded by `openrouter:openai/gpt-5-mini` (set
explicitly in `defaultTest.options.provider`, since promptfoo's default grader-credential sniffing
does not check `OPENROUTER_API_KEY`), so the run makes roughly 7 fixtures times 3 providers plus 7
grading calls, on the order of 28 model calls total.

Token volume and cost ceiling, from `research.md`'s recorded estimate (re-verify the catalog prices
have not moved, since they are re-fetchable and not guaranteed stable): roughly 5,000 input and 1,200
output tokens per call puts the three-model matrix at about 0.007 dollars on `deepseek-v3.2`, 0.015 on
`gpt-5-mini`, and 0.13 on `claude-sonnet-4.6`, so under 0.20 dollars before grading. Grading calls add
a similar small amount on the cheap `gpt-5-mini` grader. A safe ceiling to authorize for one full run
is **1 dollar**, comfortably under the 2 dollar ceiling in `plan.md` row 5.7, with room for one rerun
if something needs correcting.

To cap spend further if wanted, in order of preference:

1. Run it once. Do not loop or retry blindly; read the failure before rerunning.
2. Pass `--max-concurrency 1` to slow the run and make it easy to interrupt:
   `npx promptfoo eval -c eval/promptfooconfig.yaml --output eval/results.json --max-concurrency 1`.
3. If only a partial signal is needed, comment out the `strong` provider block in
   `promptfooconfig.yaml` for a first pass (it is the most expensive of the three), then restore it.

The `cost` (threshold 0.05 per test) and `latency` (threshold 60000 ms) assertions in
`promptfooconfig.yaml` are tripwires only, per `research.md`'s recorded caveat that promptfoo's own
cost accounting may not reflect the real OpenRouter charge for a custom provider. The authoritative
figure is `result.providerMetadata.openrouter.usage.cost`, which `eval/provider.ts` already echoes
into each response's `metadata.cost`. Read it from `eval/results.json` (or from the OpenRouter
activity page as a cross-check) rather than trusting the assertion to have caught an overrun.

## 3. Pick the model and record the decision

From `eval/results.json`, for each of the three providers: how many of the seven fixtures passed the
`javascript` verdict assertion (the deterministic pass/fail/injection check), how many passed the
`llm-rubric` assertion, total cost, and mean latency. Prefer the cheapest model that passes every
fixture's deterministic assertion; only move up in price if a cheaper model misses a deterministic
check (wrong verdict, wrong criterion, or fails to flag the injection probe) that a pricier one
catches. `deepseek/deepseek-v3.2` is already the package's `DEFAULT_MODEL_ID` in `src/model.ts`, so it
needs no `REVIEWER_MODEL` override if it is the one selected.

Write the matrix and the selection with its reasoning to `evidence/champion/eval-results.md` (the
path `README.md` already documents). Do not commit the raw `eval/results.json` itself; it is a working
file, not evidence, and duplicates what the curated markdown records. Record the same decision, in one
short paragraph with rejected alternatives, in a new `context/decisions/` entry (following the shape
of the existing `D-003-ai-review-route-and-model-access.md`) and as a one-line note under
`plan.md`'s Phase 5 section. If the selected model differs from `deepseek/deepseek-v3.2`, add
`REVIEWER_MODEL=<model-id>` to `tools/reviewer/.env` and set it as a second repository secret or plain
repository variable (`gh variable set REVIEWER_MODEL -R sebafudi/subscription-splitter`, since it is
not sensitive) so the hosted workflow picks it up too; the workflow currently passes only
`OPENROUTER_API_KEY` as an env var to the CLI step, so this line needs adding to
`.github/workflows/ai-review.yml`'s `env:` block if a non-default model is chosen.

This closes Progress rows 5.1, 5.2 and 5.7, and is the model-selection half of GOALS C05.

## 4. Open a real pull request

The chosen change is a small, real, low-risk addition: a new test that turns the still-manual
Progress row 1.7 (`tools/reviewer references nothing under src/ and holds no secret`) into an
automated check. It is genuinely true today (verified with a grep for any `src/` import out of
`tools/reviewer/src`, `tools/reviewer/eval` or `tools/reviewer/test`, which returns nothing), so the
new test passes on its own merits rather than being staged to fail. It gives the reviewer a real,
non-trivial diff to read (a new file under `tools/reviewer/test/`, exercising a project boundary rule
that `research.md`'s Inference section states explicitly) without touching product code, the root
`ci.yml` job, or anything another agent owns.

Create `tools/reviewer/test/boundary.test.ts`:

```ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const reviewerRoot = fileURLToPath(new URL("..", import.meta.url));

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    if (entry === "node_modules") continue;
    const path = `${dir}/${entry}`;
    const stats = statSync(path);
    if (stats.isDirectory()) {
      files.push(...collectSourceFiles(path));
    } else if (/\.(ts|js)$/.test(entry)) {
      files.push(path);
    }
  }
  return files;
}

describe("reviewer package isolation", () => {
  it("imports nothing from the application's own src/ tree", () => {
    const files = collectSourceFiles(reviewerRoot);
    const offenders = files.filter((path) => {
      const content = readFileSync(path, "utf8");
      return /from\s+["'](\.\.\/)+src\//.test(content) || /require\(["'](\.\.\/)+src\//.test(content);
    });
    expect(offenders).toEqual([]);
  });
});
```

Branch, commit and PR:

```bash
git checkout -b test/reviewer-src-isolation
git add tools/reviewer/test/boundary.test.ts
git commit -m "test(ai-review-pipeline): assert reviewer never imports app src/"
git push -u origin test/reviewer-src-isolation
gh pr create -R sebafudi/subscription-splitter \
  --title "test(ai-review-pipeline): assert reviewer never imports app src/" \
  --body "Turns plan.md Progress row 1.7 into an automated check. tools/reviewer already imports nothing from the application's own src/ tree; this adds a test that fails if that ever changes." \
  --base main
```

Because this pushes a branch to the same repository (not a fork) and opens a pull request against
`main`, `ai-review.yml`'s `pull_request` trigger fires with `opened`, the `review` job's fork guard
passes, and the reviewer runs against the real diff with `OPENROUTER_API_KEY` and a
`pull-requests: write` token in scope, exactly as `requirements.md`'s security constraints describe.

Confirm it ran:

```bash
gh run list --workflow=ai-review.yml -R sebafudi/subscription-splitter -L 5
gh run view <run-id> -R sebafudi/subscription-splitter --log
```

Then open the run in the browser (`gh run view <run-id> -R sebafudi/subscription-splitter --web`)
and the pull request (`gh pr view <pr-number> -R sebafudi/subscription-splitter --web`) to capture the
three required screenshots into `evidence/champion/`:

1. The Actions run page with the `review` job visible and green (or, if the credential step failed,
   visible with its actual status - see the failure section below).
2. The expanded "Run the reviewer" step log, showing the CLI actually performing the review (the
   printed verdict and any model output), not just an empty exit.
3. The pull request's Conversation tab showing the upserted comment (marked `<!-- ai-code-review -->`)
   with its criterion table and verdict, and the applied `ai-cr:*` label.

Record alongside the screenshots: the run URL (from `gh run view --json url` or the browser address
bar), the pull request URL, and the commit SHA that was reviewed (`git rev-parse HEAD` on the branch
before any merge).

This closes Progress rows 4.3, 4.6 through 4.9, 4.12 through 4.14, and 5.3 through 5.6, 5.8, plus the
hosted-run half of GOALS C05 through C08.

## 5. If it fails

**Missing or rejected secret.** The job fails on its last step with `::error::OPENROUTER_API_KEY is
missing, empty or rejected`, but the comment and label were already upserted (`ai-cr:error`) before
that step runs. Fix: re-check `gh secret list -R sebafudi/subscription-splitter`, re-set the secret,
then re-trigger without a new commit by adding the `ai-cr:review` label to the same pull request
(`gh pr edit <pr-number> -R sebafudi/subscription-splitter --add-label ai-cr:review`); the workflow
removes the label itself once the rerun starts.

**Permissions failure (403 on the label or comment step).** `requirements.md` flags this as the one
permission claim not yet confirmed by a real run: whether `pull-requests: write` alone is sufficient
for the label endpoints, or whether `issues: write` is also needed. If the run 403s on
`addLabels`/`removeLabel`/`createComment`, that is the answer. Report it to the account owner rather
than widening permissions unilaterally, since `issues: write` is broader than this job needs per the
same document's own reasoning; if authorized, add `issues: write` to the `review` job's `permissions`
block in `.github/workflows/ai-review.yml` and rerun via the same label trick above.

**Malformed model output.** `reviewDiff()` already maps a schema-invalid or unparsable response to
`status: "error"` with `reason: "no_object_generated"` or `"schema_invalid"`, CLI exit `2`, which the
workflow does not treat as a job failure (only exit `3` does). An `ai-cr:error` label and a comment
explaining the outcome still land. This is an expected, non-blocking outcome, not something to patch
around; if it happens consistently on the model chosen in step 3, treat it as evidence for revisiting
that choice, not as a workflow bug.

## 6. Evidence and Progress updates

`evidence/index.md`: add or extend rows for C02, C04, C05, C06, C07, C08 and C09, each pointing at
`evidence/champion/eval-results.md`, the pull request URL, the run URL, the commit SHA, and the three
screenshot paths, following the existing row style (goal id, artifact paths, commit/run id, one
descriptive note with no em dashes).

`evidence/work-log.md`: append one entry in the same flowing style as the existing `ai-review-pipeline`
entries, stating what phase 5 did (the model comparison and its result, the model selected and why,
the pull request opened, the workflow run and its outcome, the screenshots captured) and the commit
SHAs involved.

`plan.md`: flip the automated Progress rows this phase closes (5.1, 5.2, 5.3, 5.4, 5.7) and the manual
rows now demonstrated live (4.3, 4.6-4.9, 4.12-4.14, 5.5, 5.6, 5.8, 5.9), each with its commit or run
reference, matching the convention already used for phases 1 to 4.

`context/STATUS.md`: remove the `OPENROUTER_API_KEY` blocker bullet, update the `ai-review-pipeline`
status line from `implementing` to reflect phase 5 landing (or `implemented` if this is the last
phase), and note the pull request and run in the same paragraph style as the other archived slices.

GOALS ids this phase closes, matching `GOALS.md`'s own wording:

- **C02**: actual model communication verified on a synthetic diff, credentials kept secure, spending
  authorized (satisfied by step 2 running under an approved budget).
- **C04**: structured verdict schema validated against real model output, not just the mock.
- **C05**: the promptfoo matrix actually run across three models with a saved pass/fail, cost and
  latency record, and a model selected from it.
- **C06**: the workflow actually exercised end to end on a real pull request with bounded permissions.
- **C07**: the hosted workflow ran on an authorized real pull request with meaningful model output.
- **C08**: the three required screenshots, run URL, pull request URL and commit SHA saved.
- **C09**: the workflow reviewed and shown reproducible, with any real feedback or fixes recorded (if
  step 5's failure paths triggered, that is exactly the "feedback/fixes recorded" this item asks for).

## 7. Whether to merge the pull request afterwards

Merge it. The change is real and small (turning a manual boundary check into an automated one), costs
nothing to keep, does not touch the root `ci.yml` job or any file another agent owns, and leaving an
otherwise-good pull request open indefinitely serves no purpose once its evidence is captured. Confirm
first that the root CI workflow (unaffected by this change, since it does not touch `tools/reviewer/`)
is still green on the branch, then merge normally. If the AI reviewer itself returned `fail` or
`error` on this diff for a reason worth fixing, apply that fix before merging rather than overriding
it, since `test-plan.md` §7 keeps this pipeline advisory but a genuine finding on a real pull request
is exactly the signal phase 5 exists to produce.
