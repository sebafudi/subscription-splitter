# Opportunity map: an automated review gate for this repository

## Context

- **Project / context:** `subscription-splitter`, a solo after-hours build. A Hono API plus a React
  client in one Cloudflare Worker over D1, with an exact-money domain. Most code in the repository is
  produced by agents working from plan files under `context/changes/`.
- **Data constraint:** synthetic project code only. The material a helper would read is this
  repository's own diffs, its foundation documents and its plan files. There is no company or client
  data anywhere in scope, and `AGENTS.md` already forbids committing secrets or real records. The one
  real external exposure is that a diff leaves the machine for a model provider; see the candidate
  block below.
- **Interview:** carried out as a recorded decision rather than a live exchange. The signals below are
  taken from `context/foundation/prd.md`, `context/foundation/test-plan.md`, `AGENTS.md` and decisions
  D-001 to D-003, which already state where this project believes its silent failures live.

## Map

| Signal | Existing / default answer | Thin complement | First useful version | Data risk | Direction if valuable |
|---|---|---|---|---|---|
| Ownership checks have to be re-proved on every new child resource, and forgetting one is silent | GitHub Copilot code review, CodeRabbit: generic access-control heuristics | A reviewer that knows this project's rule: foreign or mismatched child ID answers 404, no session answers 401 | Score one criterion on a diff and name the file that skipped the check | Synthetic project code | Review gate / CI |
| A rounding or residual change is invisible in a diff but wrong in every month | Copilot review flags obvious arithmetic, not the owner-absorbs-residual rule | Criterion carrying the worked example from US-01 as the expected behaviour | Seeded-bug fixture proving the reviewer catches a mis-rounded share | Synthetic project code | Review gate / CI |
| Agent-authored diffs are reviewed by the same person who wrote the plan | `claude-code-action` with a repository prompt; a human reading the diff | An independent second read with a forced verdict shape, not a conversation | One pull request comment plus a pass or fail label | Synthetic project code | Review gate / CI |
| Test adequacy against the risk map is checked by eye | Nothing. `test-plan.md` is a project document no tool reads | Criterion that reads the risk map's cheapest-layer and anti-pattern columns | Flag a diff that touches risk #1 and arrived without unit tests | Synthetic project code | Review gate / CI |
| A schema change can land without its sequential wrangler migration | Generic reviewers mention migrations inconsistently | Criterion tying `src/server/db/` changes to `migrations/NNNN_*.sql` | Fixture with a column added in code and no migration | Synthetic project code | Review gate / CI |

## Honest read of the default answer

Three products already cover part of this. GitHub Copilot code review and CodeRabbit both produce
competent generic review with no setup, and `claude-code-action` with a repository prompt would cover
the third signal almost entirely. None of them is told that a foreign child identifier must answer
404 rather than 403, that the owner absorbs the rounding residual rather than taking an equal share,
or that this project's test plan names a cheapest layer per risk. That project-specific knowledge is
the whole of the value here; the generic review is not.

The signals also cluster. All five are the same helper seen from five angles, which is the strongest
argument for building one thing rather than five.

## Recommended first candidate

```
Candidate:
tools/reviewer - a project-aware pull request review gate

Reads:
The pull request diff, its title and its body, from the GitHub Actions event. Its criteria and
conventions come from this repository's own AGENTS.md, prd.md and test-plan.md, baked into the
prompt at build time rather than fetched at run time.

Returns:
One structured verdict per pull request: five criteria scored 1-10 with a rationale and concrete
findings, an overall pass or fail from a fixed threshold rule, and a short summary. In CI that
becomes one pull request comment, updated in place on each push, and one label, ai-cr:passed or
ai-cr:failed.

Does not:
Push commits, edit files, approve or merge pull requests, run any code from the pull request, read
anything outside the diff and the prompt, or block a merge. The verdict is advice with a label, not
a required check.

Data risk:
Synthetic project code only. The diff does leave the machine: it is sent to OpenRouter and on to the
chosen model provider. The access limit that comes first is that this repository never contains a
secret or a real record, which AGENTS.md already requires, and that the workflow never exposes any
secret value to the model. Fork pull requests do not receive the credential at all.

Direction if valuable:
Review gate / CI.
```

## Why this candidate

It wins on every criterion the classification uses. It recurs on every pull request rather than
occasionally. It joins two sources that are separate today, the diff and the project's own written
rules, and it connects two roles, the agent that writes the code and the person who owns its
correctness. The manual pain is real and named in the project's own documents: `test-plan.md` calls
the ownership defect the one that fails silently, and the requirements call a wrong balance the one
way this product could mislead its user. It can be proved on synthetic fixtures with no live service.
It complements GitHub rather than replacing it: the verdict lands as a comment and a label on the
platform that already owns the review.

It also has the cheapest honest failure mode. If the reviewer turns out to be noise, the label is
removed and nothing else in the project depended on it.

The four rejected framings are not separate builds. Each is one criterion inside this one.

## Next direction if valuable

Review gate / CI, and no further. The deliberate ceiling is that this helper never becomes a required
check. `test-plan.md` §7 already records the position: the review pipeline's output quality is
evaluated by its own suite and never gates a product change, to be re-evaluated only if its comments
start blocking merges. Going straight to build is the right next move rather than validation or
shaping, because the signal is narrow, the first version is clear, and the project's own risk map has
already done the validation work.
