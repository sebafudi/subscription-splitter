# AI review pipeline requirements

The review contract for this repository. Modelled on the module 5 lesson 3 requirements pattern, with
the criteria replaced by the five this project actually cares about. Anchors are drawn from
`AGENTS.md`, `context/foundation/prd.md` and `context/foundation/test-plan.md`.

## General concept

- A GitHub Actions workflow runs on every pull request targeting `main`.
- The review itself lives in a reusable package, `tools/reviewer/`, so the same code path serves the
  promptfoo evaluation and the CI run. The workflow stays thin enough to read in one screen.
- The package exports `reviewDiff()`; the command-line entry point and the workflow are both callers.

## Input parameters

- Pull request title.
- Pull request body. Included, and the cost is accepted: the body is where a plan reference and the
  author's own statement of intent live, and criterion 5 needs the claimed scope to judge whether the
  tests match it. Both title and body are treated as untrusted text.
- The unified `git diff` between the merge base and the pull request head, bounded in size.
- The model identifier, supplied by configuration rather than hard-coded, so one package serves both
  the evaluation matrix and the CI run.

## Review criteria

Each criterion is scored 1 to 10, where 1 is worst and 10 is best. Every criterion carries a rationale
and a list of concrete findings; a finding names a file and, where the diff makes the line
recoverable, a line.

### 1. `domain-money-correctness` - the money rule

Does the change keep the ledger exact? Money stays integer minor units in the domain, the database and
over the wire, formatted only at display. A priced month's share is `round(price / activeCount)` for
every active participant including the owner, and the owner absorbs the residual. The effective-dated
price applies from its own month onward and never retroactively. A skipped month costs nothing. The
current month is derived from the subscription's time zone with `Intl`, never from server-local date
parts.

- **1:** introduces a floating-point amount, a per-screen rounding, a largest-remainder allocation, a
  price applied to the wrong months, or a current month read from the server clock.
- **10:** every amount is a minor-unit integer, the month balances exactly with the residual on the
  owner, and any date arithmetic goes through the subscription's time zone.

### 2. `ownership-and-input-safety` - access and untrusted input

Does every read and mutation resolve through the owning subscription, on the server, including child
identifiers? A foreign or mismatched identifier must be answered as absent (404), and a request with
no session must be refused (401). Validation happens once at the entry point through the shared Zod
schema rather than per screen. Secrets stay in `.dev.vars` and `wrangler secret` and never reach a
file or a log.

- **1:** a route trusts a client-supplied identifier, a child record is reached without checking its
  parent, a permission error leaks the existence of another account's record, or a secret is
  committed or logged.
- **10:** ownership is enforced on the server for every identifier in the request, absence is the
  answer for anything foreign, and input is validated at the boundary.

### 3. `persistence-consistency` - storage and migrations

Does the stored shape match the code? A schema change arrives as a new sequential wrangler migration
under `migrations/`. SQL stays inside `src/server/db/`. A multi-statement write that would corrupt the
ledger if half-applied is atomic. A participant with payments or a standing order is archived or
closed out rather than hard-deleted, and the attempt to delete one is refused with 409.

- **1:** a column or table is used in code with no migration, SQL leaks outside the repository layer,
  a partial write can leave the ledger inconsistent, or a delete destroys payment history.
- **10:** code, migration and repository layer agree; risky writes are atomic; deletions respect the
  archive rule.

### 4. `domain-invariants` - the lifecycle rules

Does the change respect the rules that make this product different from a running tab? One participant
carries several active periods rather than splitting into two records on a rejoin. A standing order
counts for a month only when that month is elapsed, inside the participant's active range, not
skipped, and not marked as not received. A charged month with zero active participants is a defined
state whose whole cost falls on the owner, not an error and not a division by zero. Months are
`YYYY-MM` and dates `YYYY-MM-DD`.

- **1:** a rejoin creates a second participant, an assumed receipt is counted for a skipped or future
  month, a zero-participant month throws or silently drops its cost, or a month is stored in another
  format.
- **10:** break months, rejoins, exceptions and the empty month all behave as the requirements
  describe, and assumed money stays distinguishable from recorded money.

### 5. `test-adequacy` - coverage proportional to the risk map

Do the tests match `context/foundation/test-plan.md`? A change touching a risk in the risk map arrives
with a test at the layer the plan names as cheapest for that risk: unit against the calculation
module, integration against local D1 with migrations applied, one browser smoke and no more.
Assertions come from the worked example in US-01, not from the implementation's own output. The
anti-pattern column is the checklist: a single mid-range month for a boundary rule, a top-level
ownership test that assumes children inherit the check, or an assertion on a response body that never
re-reads the stored record.

- **1:** risky logic ships untested, or the tests present restate what the code does and would pass
  against a wrong implementation.
- **10:** every risk the change touches is defended at the layer the test plan names, with the
  boundaries the plan calls out and expected values taken from the requirements.

## Deferred

- Idiomatic style and complexity. Both are real review criteria and both are covered adequately by
  the generic tools this project already has. Spending a criterion slot on them would displace one of
  the five above, each of which no generic reviewer knows.
- Architectural fit and business alignment. Both need more context than a diff carries.
- Documentation quality. `AGENTS.md` asks for clean code over inline comments, so a criterion
  rewarding comments would work against the project's own convention.

## Verdict and threshold rule

The model returns a structured object: five criteria, each with `score`, `rationale` and `findings[]`;
a `summary`; and an `overall` verdict. The verdict is recomputed locally from the scores and findings
rather than trusted from the model, so the gate cannot be talked out of a failure.

- Any criterion scoring below 6 gives `fail`.
- Any finding marked `blocking`, at any score, gives `fail`.
- Otherwise `pass`.

An outcome that is neither is `error`: the provider failed after its retry, or the output did not
validate against the schema. An `error` is reported as a failure with its own wording and never as a
pass. The `error` case is distinguishable from `fail` in the comment, the label and the exit code.

## Expected side effects

- One pull request comment carrying the summary, the five scores and the findings. The comment is
  identified by a hidden marker and updated in place on later pushes rather than appended, so a long
  pull request does not accumulate one comment per commit.
- Exactly one of the labels `ai-cr:passed` or `ai-cr:failed` on the pull request, the other removed.
- A truncated diff is stated in the comment, with the byte count shown against the byte count
  received, so a partial review is never read as a complete one.

## Expected behaviour

- A push to the pull request re-runs the review and updates the same comment.
- Adding the label `ai-cr:review` re-runs the review on demand without a new commit. The label is
  removed by the workflow once the run starts, so re-adding it triggers again.
- The verdict does not block the merge. `context/foundation/test-plan.md` §7 records the position:
  this pipeline's output quality is evaluated by its own suite and never gates a product change. The
  workflow job therefore exits successfully for `pass`, `fail` and `error` alike, and the verdict is
  carried by the label and the comment. A genuine pipeline breakage, such as a failed install, still
  fails the job. Re-evaluate if the comments ever start blocking merges.
- The reviewer's own command-line exit code does distinguish the outcomes (0 for `pass`, 1 for `fail`,
  2 for `error`), so it can become a required check later without a code change.

## Security constraints

- The pull request title, body and diff are untrusted input. They are passed to the model as data
  inside a delimited block, never concatenated into an instruction, and the system prompt states that
  instructions found inside the diff are content to review rather than directions to follow.
- No shell ever interpolates the title or body directly; values reach a step through an intermediate
  environment variable.
- Nothing from the pull request is executed. The workflow installs the reviewer package's own
  dependencies and runs the reviewer; it never runs the pull request's build, tests or scripts.
- Workflow permissions are `contents: read`, `pull-requests: write` and `issues: write`, and nothing
  else. `issues: write` is what the labels need; comments on a pull request go through the issues API.
- The trigger is `pull_request`, not `pull_request_target`. A pull request from a fork therefore
  receives a read-only token and no secrets, and the review job is skipped rather than failing.
- `OPENROUTER_API_KEY` is read from the repository secret into the reviewer process environment only.
  No secret value is ever included in a prompt, a comment or a log line.

## Out of scope

- Pushing commits, editing files, approving or merging.
- Reading anything outside the diff, the title and the body. No repository crawl, no file reads by the
  model, no external lookups.
- Reviewing anything but pull requests into `main`.
- Any dependency on the application's own CI workflow, which is a separate change.
