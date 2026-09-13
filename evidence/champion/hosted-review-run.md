# The AI reviewer on a real pull request, 2026-09-13

The first pull request ever opened on this repository, and therefore the first run of
`.github/workflows/ai-review.yml`, which triggers only on `pull_request`.

## Addresses

| What | Where |
|---|---|
| Pull request | `https://github.com/sebafudi/subscription-splitter/pull/1` |
| Workflow run (successful) | `https://github.com/sebafudi/subscription-splitter/actions/runs/34727750896` |
| Reviewer job | `https://github.com/sebafudi/subscription-splitter/actions/runs/34727750896/job/103644824017` |
| Review comment | `https://github.com/sebafudi/subscription-splitter/pull/1#issuecomment-5649655238` |
| Commit reviewed | `17994e7e2ffebff6e95ed4bb3ea53f4e4fd07898` (`17994e7`), the branch head at review time |
| Same commit on `main` after the rebase merge | `4db78e8` |

## What the run did

The `review` job ran for 2m 36s and concluded successfully. It installed the reviewer with
`npm ci --omit=dev --ignore-scripts` (15 packages), computed the diff against the merge base, called
`z-ai/glm-5.3-flash` through `npm run review`, upserted the comment and applied the verdict label.
The reviewer step took 2m 26s of that and printed `pass`. The `fork-notice` job was skipped, as it
should be on a same-repository pull request, and the "Fail the job on a missing credential" step was
skipped too, because the CLI exited 0 rather than 3.

Afterwards the pull request carried exactly one comment bearing the `<!-- ai-code-review -->` marker
and exactly one verdict label, `ai-cr:passed`. Both were confirmed through the API rather than by
eye: `gh pr view 1 --json comments,labels`.

The step log shows `OPENROUTER_API_KEY: ***`, masked by GitHub Actions, and
`REVIEWER_MODEL: z-ai/glm-5.3-flash` in clear, which is the repository variable being read as
intended.

## Were the findings specific to the change

Yes. The review scored the four product criteria 10 and `test-adequacy` 8, and stated plainly that
the diff touches no money, ownership, persistence or domain surface, so those tens are a
no-contact-surface judgement rather than praise. Its seven findings all cite a real file and line in
this diff. Three are worth repeating because they are correct and were not planted:

- The workflow's fallback literal `'z-ai/glm-5.3-flash'` duplicates `DEFAULT_MODEL_ID`, so a future
  model change has to touch both sites or CI and local runs drift.
- `npm: ">=11"` in `engines` is advisory; npm only warns on its own version, so the real enforcement
  is `npm ci` failing, not that field.
- Removing the `cost` assertion does remove automated spend-regression detection from the eval, even
  though removing it was right for the reason recorded.

It also asked, correctly and without being able to see the answer in the diff, whether anything
actually reads `REVIEWER_MODEL`. It does: `resolveModel()` in `tools/reviewer/src/model.ts` reads
`env.REVIEWER_MODEL` and falls back to `DEFAULT_MODEL_ID`. That code predates this pull request,
which is why the diff does not show it.

It reported honestly that no prompt injection content was present, rather than inventing one.

## The two failed runs before it, and the fix

Both earlier runs failed in 11 seconds at the install step, before the reviewer was ever reached.

| Run | Outcome |
|---|---|
| `34727635662` | `npm ci` refused the lockfile |
| `34727724451` | same, on the next push |
| `34727750896` | success |

`npm ci` reported `Missing: gcp-metadata@7.0.1 from lock file` and
`Missing: google-logging-utils@1.2.0 from lock file`. The cause was not a stale lockfile. The runner
had Node 22 with npm 10.9.8 bundled, while `tools/reviewer/package-lock.json` is an npm 11 tree, and
npm 10 places those two `googleapis-common` transitives at different positions and therefore reads
the lockfile as out of sync. Regenerating the lockfile under npm 10 was tried and rejected: it
removed 3,654 lines, which is a far larger change than the problem warrants.

The fix was to make the runner's npm match the lockfile's: the `review` job now sets up Node 24,
whose bundled npm is 11, with a comment in the workflow saying why. `tools/reviewer/package.json`
declares `"npm": ">=11"` alongside its existing `"node": ">=22"`, and the reviewer README states the
requirement. Landed as `17994e7`, which is the commit the successful run reviewed.

This is the "real feedback and fixes recorded" half of GOALS C09: the pipeline's first contact with
hosted CI found a genuine environment defect that no local run could have surfaced, because every
local run used npm 11.

## Screenshots

| File | Shows |
|---|---|
| `ai-review-pipeline-run.png` | The Actions run page: `ai-review.yml on: pull_request`, status Success, the `Run the AI reviewer` job green at 2m 36s and the skipped fork-notice job |
| `ai-review-job-log.png` | The hosted job log: the install, the merge-base diff, the masked credential, the model, the CLI invocation and the `pass` verdict, then the comment upsert and the label step. Captured from a terminal because GitHub requires a signed-in session to view Actions logs, and these captures were taken from a signed-out browser |
| `ai-review-pr-comment.png` | The pull request Conversation tab with the posted review: verdict heading, the five-criterion score table, every finding, and the `ai-cr:passed` label in the sidebar |
