# Implementation plan: verification and release

## Overview

Put the whole ledger on the deployed instance and prove it there. Four slices have landed on `main`
and none of them has ever run against the remote database: the live Worker is release `149aa44d`,
which predates members, prices, payments and standing orders, and the remote D1 holds only migrations
`0001` and `0002`. This slice applies the four missing migrations to that database, redeploys from a
clean tree, walks the whole flow in a browser against the result, and captures the transcript and the
screenshots that make the release reviewable by someone who was not here. This is roadmap item S-04,
source refs US-01 to US-05 and MS-02.

It adds no product behaviour. Everything in it is documentation, a data migration, a deploy, a
verification pass and evidence. The step that needs care is the migration, because the two seeded
accounts exist only in that remote database and nothing in `migrations/` reverses; wrangler's Time
Travel is what turns that from irreversible into recoverable, and recording its bookmark before the
apply is what turns the recovery into one command. The other thing that needs care is quieter: the
product deliberately exposes no delete for a subscription or an owner member, so anything the live
pass creates in those two shapes is permanent on a URL that has already been shared.

The slice also closes the Builder-track items that only a shipped release can answer: the acceptance
walkthrough (B08), the documentation check (B09), the course `mvp-check` run (B10), the final
screenshots (B12), and the live half of D05. It does not touch the items that require an upload.

## Current state analysis

`payments-and-recurring`, `members-and-price-history` and `runtime-auth-slice` are all archived.
Repository-wide gates were last recorded green at `904ebcc`: typecheck clean, unit 15 files and 185
tests, integration 11 files and 112 tests, build ok. Hosted CI has been green on every push to `main`.

The deployment is two slices behind. `context/STATUS.md` Deployment and `evidence/runs/deploy-1.md`
record release version `e259b7b3-d932-4b3b-8b84-7446cab7d636` at commit
`149aa44d9e80102f8ad425c6f9f684f5ef6d54aa`, against remote D1 `subscription-splitter-db`
(`03067638-dc95-4b5c-9a8a-86f2921e0414`) with `0001_auth.sql` and `0002_subscriptions.sql` applied.
`BETTER_AUTH_SECRET` and `APP_ORIGINS` are set on the Worker; `SEED_ENABLED` and `SEED_TOKEN` were
set for one seeding call and deleted afterwards, and the seed route was confirmed answering 404 with
the old token. `COOKIE_SECURE` was deliberately never set. The owner and reviewer accounts were
created through that route and their credentials live only in `evidence/private/`, which is
gitignored.

The live database therefore holds two accounts and one artefact: a subscription named "Deploy smoke
test" created by the first deployment's smoke run, with start month `2026-09`, no members, no prices
and no payments. It cannot be re-dated, because `start_month` is not a patchable field, and it cannot
be removed, because the product exposes no `DELETE /api/subscriptions/:id`. It has no owner member
either, and could not have: `0003_members.sql` was not applied remotely when it was created. Once the
migration lands it becomes the one state the shipped build can no longer produce, and the detail
screen draws it as the degraded no-owner case.

S-03's implementation review landed at `a55720b` with verdict "approve with required changes", three
commits after its plan had been closed out. Its fixes landed at `904ebcc`, its resolution at
`5d1cb80`, and its archive at `0ff74bd`. That sequence is why phase 2 gates on `0ff74bd` rather than
on "S-03 is closed out": S-02 showed the same shape, and a release pinned at any of the in-between
points would put the deployed instance behind `main` again within a commit or two, which is the exact
failure this slice exists to end. The gate is satisfied; phase 2 still checks it, because the release
SHA has to be provably at or after that commit and other agents keep pushing.

The documentation has outrun its own text in two places: `AGENTS.md` still says "Only the scaffold
exists so far", and `README.md`'s first-run recipe still names two migrations and describes the
repositories as future work. There is no `infrastructure.md` in `context/foundation/`. The roadmap has
caught up on its own: the status writer moved S-04 to `planning`, and S-03's archive flipped it to
`done`.

The full grounding, with evidence separated from inference, is in
`context/changes/verification-and-release/research.md`.

## Desired end state

The live URL serves the current build over a remote database carrying all six migrations. An operator
signs in as the owner and finds a plan with several months of history behind it: three participants
with inclusive ranges, a price and a price change, a break month, recorded payments, and a standing
order with one month marked as not received. Every balance on that screen matches a hand calculation.
They record a payment and watch the balance move by exactly its amount; they correct it and delete it
and watch the balance return. They reload between each step and the data is still there. They sign
out and the previous session reaches nothing. They sign in as the second account and find an empty
list, and every direct request for one of the owner's records by id is answered as absent. The seed
route answers 404.

That session leaves two files behind: a redacted transcript of every live check with its status code,
and a set of screenshots named so the submission package can be assembled from them by pattern
without anyone guessing which capture came from the release. The evidence index names them, the
status file names the new release version and SHA, and the documentation describes the product that
was actually shipped.

### Key findings

- The four unapplied migrations are purely additive: seven `CREATE TABLE` statements and five index
  statements, no `ALTER`, no `DROP`, nothing touching a Better Auth table. The seeded accounts
  survive. One of the five is a partial unique index,
  `CREATE UNIQUE INDEX "members_one_owner_idx" ON "members"("subscription_id") WHERE "is_owner" = 1`,
  the only statement whose result could depend on existing rows; it is created on a table created a
  few lines above it, so there are none.
- `wrangler d1 migrations list --remote` is a real dry run: it names the unapplied files without
  applying anything. If it names anything other than `0003` to `0006`, the remote database is not
  where this repository believes it is.
- `wrangler d1 time-travel` is the rollback. Its `restore` subcommand takes `--bookmark` or a
  `--timestamp` "within the last 30 days" and acts on the remote database in place, so recovery costs
  no new database id, no `wrangler.jsonc` edit and no redeploy. `time-travel info` returns the
  bookmark to record before the apply.
- `wrangler d1 export --remote --output=<path>` is a backup, not the undo: it is the only copy of the
  two accounts that survives losing the account or the database itself. Its output contains password
  hashes and session tokens, so it belongs under `evidence/private/`.
- The live "Deploy smoke test" subscription has no `members` row and cannot have had one: it was
  created before `0003` was applied remotely. The shipped build creates the owner member in the same
  `db.batch` as the subscription (`src/server/db/subscriptions.ts`, citing D-006), so this is a state
  the product can no longer produce, and `SubscriptionDetail` renders it as the degraded no-owner
  screen.
- The owner member cannot be deleted: `src/server/routes/members.ts` answers 409 before the dependents
  check. A non-owner participant is hard-deleted by `remove` in `src/server/db/members.ts` once it has
  no dependents. Payments and standing orders refuse the owner member outright. So anything the live
  pass needs to undo must hang off a non-owner participant.
- `src/server/routes/dev-seed.ts` creates accounts and nothing else. It cannot produce demo data, and
  it does not need to be reopened for this slice.
- `src/server/validation/subscriptions.ts` refuses a patch carrying `start_month`, deliberately; and
  `src/server/routes/subscriptions.ts` has no `DELETE`. The stray smoke-test subscription can only be
  renamed.
- `evidence/runs/deploy-1.md` records that the first release was built from a working tree carrying
  uncommitted changes, because `vite build` reads the tree rather than a git ref. The quoted release
  SHA did not exactly describe the deployed bundle. This release must not repeat that.
- `mvp-check` is a prompt (`archive/toolkit/.ai/prompts/mvp-check.md`), not a skill. It is executed
  against the repository and produces a report; four of its five criteria are already answerable from
  `main`, and the fifth is documentation.

## What we are NOT doing

- **No upload, attachment or submission to the course, its forms, its community or its organizers.**
  Preparing the package locally is in scope; sending any part of it is not, and nothing in this plan
  authorizes it. B11, B13 and B14 stay open.
- No badge is claimed. B08, B09, B10, B12 and D05 are goal boxes whose evidence this slice produces;
  awarding is the organizer's, and B16, A17 and C13 are untouched.
- No new product behaviour, no new routes, no schema change. In particular no
  `DELETE /api/subscriptions/:id` is added to tidy the stray subscription; renaming is the housekeeping
  the domain rules allow.
- No change to the seed route, its gate, or decision D-005. `SEED_ENABLED` and `SEED_TOKEN` stay
  unset on the live Worker.
- No rebuild of the remote database from the export as a routine step. Time Travel is the recovery;
  the rebuild path exists in the rollback note only for the case where the database itself is lost.
- No custom domain, no autoscaling or performance tuning, no observability stack, no rate-limit
  retuning, no caching layer. The deployment stays one Worker, one D1, one workers.dev origin.
- No deployment from CI. Deploying stays a deliberate manual step, as `AGENTS.md` records.
- No end-to-end test framework. B08 notes a selected E2E smoke test as extra assurance rather than a
  coverage requirement, and adding Playwright to a release slice would be a new stack decision.
- No production data. Every name, amount and date used in the demo is synthetic.
- No rewrite of the PRD or the test plan. They get a verification pass and the corrections that pass
  finds, not a new draft.
- No work on S-05. `ai-review-pipeline` phase 5 stays blocked on its external credential.

## Implementation approach

Documentation first, then preparation, then the irreversible step, then the browser, then evidence.

The ordering is not cosmetic. Documentation comes first because `mvp-check` grades documentation from
the repository and because the README's setup instructions are what a reviewer follows before they
see anything else; fixing them after the release would mean the release's own evidence describes a
repository that no longer matches. Preparation comes before the migration because the dry run and the
snapshot are what make the migration recoverable, and because the release SHA has to be pinned to a
tree that is verifiably clean. The browser pass comes after the deploy and before any credential is
shared, because the screenshots are the record of what the release looked like at that moment. The
evidence phase comes last because it indexes everything the four before it produced.

Phases 3 and 4 are one continuous live session in practice: the same browser, the same release, the
same accounts. They are separated here because phase 3 is machine-checkable transcript work with
clear status codes, and phase 4 is human judgement about what a screen shows. Splitting them into two
sessions is allowed but then the release version id must be re-confirmed at the start of phase 4, so
that both halves of the evidence provably describe the same build.

### Prerequisites

- **Phase 1** needs nothing beyond `main`.
- **Phase 2** needs phase 1 committed, because the release SHA it pins must be the tree whose
  documentation the release describes. It also needs a hard gate that phase 1 does not: the release
  SHA must be at or after `0ff74bd`, the commit that archived `payments-and-recurring` after its
  implementation review was resolved. "S-03 is implemented and closed out" is not that gate, and was
  not for S-02 either; the fixes (`904ebcc`) and the resolution (`5d1cb80`) both landed after the
  slice had already been closed out.
- **Phase 3** needs phase 2's dry run and snapshot, and needs the Cloudflare account already
  authenticated in the executing shell (`npx wrangler whoami`). It also needs the operator to read
  `evidence/private/reviewer-credentials.md`, which is gitignored and stays uncommitted.
- **Phase 4** needs phase 3's deploy to have succeeded and its version id recorded.
- **Phase 5** needs phases 1 to 4, because the `mvp-check` report cites the documentation phase 1
  fixed and the evidence index rows point at files phases 3 and 4 create.

## Critical implementation details

**Sequencing.** The snapshot must be taken before the migration, and the migration must precede the
deploy. Deploying the new build first would leave the live Worker querying tables that do not exist,
so every screen past the subscription list would return a database error until the migration
completed. The window is short but it is a real outage on a URL that has been shared, and the order
costs nothing.

**Build provenance.** `vite build` reads the working tree. `npm run deploy` runs `npm run build`
first, so the deployed bundle reflects whatever is on disk at that moment, not the commit that is
checked out. `git status --porcelain` must be empty immediately before the deploy, and the SHA
recorded as the release must be read from that same tree. Other agents are pushing to `main`
concurrently, so the check belongs immediately before the command, not at the start of the phase.

**Redaction.** The live transcript records a sign-in response whose `Set-Cookie` header carries a
working session token for a seeded account, and the export from phase 2 contains password hashes and
session rows. Neither may reach a committed file. The transcript follows the precedent set by
`evidence/runs/deploy-1-live-smoke.txt`, which writes
`__Secure-better-auth.session_token=<redacted>` and keeps the rest of the header intact so the
`HttpOnly; Secure; SameSite=Lax` attributes remain visible as evidence.

**Current-month sensitivity.** The assumed-receipt rule counts a standing-order month only once it has
elapsed in the subscription's own time zone. The demo plan's start month therefore has to be several
months behind the current one for the standing order to show counted months at all, and the screens
captured in phase 4 will look different if they are recaptured in a later month. The captures are
dated by release version id rather than by calendar, and the walkthrough's input values are recorded
as offsets from the plan's start month so the same state can be recreated.

## Phase 1: Documentation that describes what shipped

### Overview

Bring the repository's own account of itself up to the four slices that landed, and add the one
foundation document B09 names that does not exist. This is also the phase that decides the
documentation criterion of `mvp-check` in phase 5.

### Required changes:

#### 1. The agent-facing rules file

**File**: `AGENTS.md`

**Purpose**: Its opening paragraph still tells every agent that only the scaffold exists, which is
four slices out of date and is the first thing a new agent reads. Replace the state sentence with
what is actually on `main`, leaving the hard rules untouched.

**Contract**: The "Only the scaffold exists so far" clause is replaced by a sentence naming the
shipped surface: sessions and two seeded accounts, subscriptions, members with inclusive ranges,
effective-dated prices, break months, payments, standing orders with per-month exceptions, and the
summary. The Project structure section's description of `src/server/` stops describing repositories as
future work. No hard rule is added, removed or reworded.

#### 2. Setup, migrations and seeding in the README

**File**: `README.md`

**Purpose**: The first-run recipe names two migrations where there are six, and the Layout section
describes the repositories as future work. A reviewer follows this file before they see the product,
so its instructions have to reproduce the project from a clean clone.

**Contract**: The Database section's first-run block stops enumerating individual migration files and
says the command applies every migration in `migrations/`, currently `0001_auth.sql` through
`0006_recurring.sql`. The Layout section describes `src/server/db/` as holding the repositories that
own all SQL, in the present tense. A short Live instance subsection is added under Deploy naming the
workers.dev URL and stating that the deployed database is separate from the local one and is seeded
once by the procedure already documented below it. The seed route's scope is stated explicitly: it
creates accounts and nothing else, so demo data is created through the product. The existing Deploy
procedure, which is accurate, is left as it is apart from that addition.

#### 3. A foundation infrastructure document

**File**: `context/foundation/infrastructure.md` (new)

**Purpose**: B09 names infrastructure among the documents that must reflect shipped behaviour, and the
organizer's example list offers `infrastructure.md` as one of the foundation files. The information
exists but is scattered across the README's Deploy section and `tech-stack.md`. Collect it in one
short file that an outside reader can use to understand what runs where.

**Contract**: One page, no calendar dates. It names: the runtime (one Cloudflare Worker serving both
the API and the built client from one origin), the database (remote D1 `subscription-splitter-db` with
its id, and the entirely separate local D1 used by `wrangler dev` and the integration suite), the
migration mechanism and the two commands, the secrets by name only with where each is set and the
deliberate absence of `COOKIE_SECURE`, the seeding procedure by reference to decision D-005, the CI
boundary (hosted CI runs typecheck, tests and build; it never deploys), and the explicit non-goals
carried from this plan: no custom domain, no autoscaling, no observability stack. It cross-references
`README.md`'s Deploy section rather than restating the commands, and it must not contradict it.

#### 4. Requirements verified against what was built

**File**: `context/foundation/prd.md`

**Purpose**: The requirements were written before implementation. Four decisions have been recorded
since (D-006 to D-009) and they are where a divergence between the document and the product would have
entered. This is a verification pass with corrections, not a rewrite.

**Contract**: Each functional requirement FR-001 to FR-026 and each user story US-01 to US-05 is
checked against the shipped route, schema or domain function that implements it. Where the
implementation decided something the document left open or described differently, the document is
corrected to describe the shipped behaviour and the decision that settled it is cited by ID. The
§Open Questions section is reduced to the questions that are still genuinely open; each one that a
decision has since answered is removed with the answer folded into the relevant requirement. Nothing
is added that the product does not do.

#### 5. The test plan's risk map and freshness ledger

**File**: `context/foundation/test-plan.md`

**Purpose**: Risk 3 names "a migration leaves the remote database behind the code" as a top risk, which
is precisely the state this slice is about to resolve, and risk 4's stored half was closed by S-03.
§8 exists to record exactly this kind of movement.

**Contract**: Each of the six risks gains an accurate statement of where its protection now lives,
naming the test files that provide it. Risk 3's remote half is described as answered by this slice's
live pass rather than by a test. A Freshness Ledger entry records the pass and the slices it covers,
identified by change ID and commit rather than by date. The strategy, stack and cookbook sections are
left alone unless the verification finds them wrong.

#### 6. Roadmap statuses

**File**: `context/foundation/roadmap.md`

**Purpose**: S-04's own status has to track this slice's execution. S-03's does not belong to this
change: its flip to `done` and its `## Done` entry are written by its own archive procedure, which is
where S-02's happened (`45eb35e`), and writing them here would mark a change complete that its review
may still send back.

**Contract**: S-04's `Status` moves from `planning` to `in-progress` when this slice's first phase
lands, in both the `## At a glance` row and the `- **Status:**` line of the item body, using the
roadmap's own vocabulary (`proposed`, `ready`, `planning`, `in-progress`, `done`). The status writer
has already moved it to `planning`, so this phase's edit is the step to `in-progress` and nothing
else. S-03 is not touched here at all; its own archive procedure has already flipped it to `done`. The milestone's own status is not advanced. If another agent
has already moved S-04 further, the more advanced status is left alone.

#### 7. Stack document drift check

**File**: `context/foundation/tech-stack.md`

**Purpose**: It was written as a hand-off before the build. A dependency pin or a choice may have moved
since.

**Contract**: Every named package and version is checked against `package.json`, and every named
mechanism against the code that uses it. Corrections only; if nothing has drifted, the file is left
untouched and that is recorded in the phase's evidence rather than forced into an edit.

### Success criteria:

#### Automated verification:

- Typecheck passes: `npm run typecheck`
- The whole suite passes: `npm test`
- `AGENTS.md` no longer claims only the scaffold exists: `rg -n "scaffold exists" AGENTS.md` returns
  nothing
- The README's first-run recipe no longer enumerates only two migrations:
  `rg -n "0002_subscriptions.sql" README.md` returns only the Deploy section's remote example, if any
- `context/foundation/infrastructure.md` exists and names the Worker, the remote database id and the
  secrets by name
- No calendar date was introduced into any authored file in this phase:
  `rg -n "\b20[0-9]{2}-[0-9]{2}-[0-9]{2}\b" AGENTS.md README.md context/foundation/` returns only
  pre-existing month-format examples and schema illustrations
- No secret value appears in any changed file: `git diff --cached` reviewed against the names listed
  in `.dev.vars.example`

#### Manual verification:

- A reader following `README.md` from a clean clone reaches a running local app and a seeded account
  without consulting any other file
- Every FR that was corrected in the PRD names the shipped route or domain function that implements
  it, and no FR describes behaviour the product does not have
- `context/foundation/infrastructure.md` and the README's Deploy section agree on every command and
  every secret name

**Implementation note**: Stop here for human confirmation that the manual checks passed before
starting phase 2.

---

## Phase 2: Release preparation and the rollback that makes it safe

### Overview

Pin the release to a tree that S-03's review has finished with, prove the remote database is where
this repository thinks it is, and record the one argument that makes the migration undoable. Nothing
in this phase modifies the remote database or the deployment.

### Required changes:

#### 1. The release candidate

**File**: none (commands and recorded output)

**Purpose**: Establish a tree that is verifiably clean, green and downstream of S-03's review fixes,
and read the SHA from it. The first deployment's evidence records that it could not do the first of
those, and the release SHA it quoted did not exactly describe the deployed bundle; S-02 and S-03 both
show why the third matters.

**Contract**: The gate comes first and it is now a single concrete condition: the release SHA is at or
after `0ff74bd`, which archived `payments-and-recurring` once its implementation review was resolved
(`904ebcc` applied the findings, `5d1cb80` recorded the resolution). A clean tree alone is not the
gate. Then, from a clean checkout of `main`: `git status --porcelain` empty, `npm ci`,
`npm run typecheck`, `npm test`, `npm run build`, and `npx wrangler deploy --dry-run` all succeed, and
`git rev-parse HEAD` is captured as the release candidate SHA. The test counts are captured verbatim,
not summarised, and compared against the last recorded repository-wide figures so a drop is noticed
rather than shipped: at `904ebcc`, typecheck clean, unit 15 files and 185 tests, integration 11 files
and 112 tests, build ok. Hosted CI is confirmed green for the release SHA itself.

#### 2. The passing-tests capture

**File**: `evidence/screenshots/release-05-tests-passing.png`

**Purpose**: B12 and F01 both want the test evidence to belong to the identified release. This clean
checkout at the pinned SHA is the only place where that is true; a capture taken during phase 4 would
show a `main` other agents have moved on.

**Contract**: A terminal capture taken in the clean checkout showing `git rev-parse HEAD` and the
`npm test` run in the same frame, with the passing counts legible. It is the one release screenshot
that is not a browser capture. The SHA visible in the image must equal the release SHA recorded in
`evidence/runs/release-1.md`.

#### 3. The remote migration dry run

**File**: none (recorded output)

**Purpose**: Confirm the remote schema state before writing to it, and catch the case where the remote
database is not what the evidence says it is.

**Contract**: `npx wrangler d1 migrations list subscription-splitter-db --remote` is run and its
output recorded verbatim. It must name exactly `0003_members.sql`, `0004_prices_and_breaks.sql`,
`0005_payments.sql` and `0006_recurring.sql` as unapplied, and nothing else. If it names `0001` or
`0002`, or fewer than four files, the phase stops and the discrepancy is investigated before anything
is applied.

#### 4. The Time Travel bookmark

**File**: `evidence/runs/release-1.md` (new, started in this phase)

**Purpose**: This is the recovery. Capturing the bookmark before the irreversible step turns a restore
into one command with a known argument, rather than something reconstructed afterwards from a
timestamp nobody wrote down.

**Contract**: `npx wrangler d1 time-travel info subscription-splitter-db` is run immediately before
the phase closes and the bookmark it returns is recorded verbatim in the release summary, alongside
the exact restore command that would use it. The Time Travel reference the command's help links to is
read once and the retention window confirmed against this account's plan, because the thirty-day
figure in the help text is the product's default rather than a guarantee about this account. If Time
Travel turns out not to be available here, the phase stops and the rollback story is re-decided before
anything is applied.

#### 5. The off-Cloudflare snapshot

**File**: `evidence/private/pre-0003-remote-export.sql` (gitignored, never committed)

**Purpose**: Not the undo. It is the only copy of the two accounts that survives losing the Cloudflare
account or the database itself, and the passwords behind them exist nowhere in source.

**Contract**: `npx wrangler d1 export subscription-splitter-db --remote --output=<path under
evidence/private/>` produces a non-empty file containing the schema and the contents of the `user`,
`session`, `account` and `subscriptions` tables. `git check-ignore` confirms the path is excluded
before the file is written, and `git status --porcelain` confirms it is untracked afterwards. The file
contains password hashes and session tokens and must never be committed, pasted into a transcript, or
attached to anything.

#### 6. The rollback note

**File**: `evidence/runs/release-1.md`

**Purpose**: Record what recovery actually means before it is needed, so nobody has to invent it under
pressure with a half-applied schema in front of them.

**Contract**: A Rollback section with three paths, in the order someone should reach for them.
Primary: a partially applied or unwanted migration is undone with
`npx wrangler d1 time-travel restore subscription-splitter-db --bookmark=<the recorded bookmark>`,
which acts on the remote database in place, keeps the database id, and therefore needs no
`wrangler.jsonc` edit and no redeploy. Second: a bad build over an intact schema is undone by
redeploying the previous version id `e259b7b3-d932-4b3b-8b84-7446cab7d636`, which needs no database
work. Last resort, for a lost database only: rebuild from the snapshot, which means `d1 create`, then
`d1 execute --remote --file`, then a `wrangler.jsonc` edit, then a redeploy - and the note states
plainly that whether the export carries wrangler's own `d1_migrations` bookkeeping table is
unverified, so a rebuilt database may report every migration unapplied. It also states the interaction
the three paths have: once the database is rebuilt under a new id, the previous release version id
stops being a valid fallback, because that version carries the old id in its own configuration. No
step anywhere in this note replays the export into the existing database; every statement in it is a
`CREATE TABLE` against a table that is already there.

#### 7. Secret state and a live origin check

**File**: `evidence/runs/release-1.md`

**Purpose**: Confirm before the migration the one configuration value whose failure mode is total, and
record that seeding stays closed per decision D-010.

**Contract**: `npx wrangler secret list` is run and the returned names recorded, values never. It is
described as what it can actually prove: that `SEED_ENABLED` and `SEED_TOKEN` are absent, so the seed
route is closed, and that `BETTER_AUTH_SECRET` and `APP_ORIGINS` exist. It cannot prove `APP_ORIGINS`
still resolves to the live origin, and `src/server/auth.ts` throws outright when it resolves to no
origins, so that is settled separately: one sign-in as the owner against the current live build,
recorded as a status code only, before anything is migrated. No secret is set, rotated or deleted in
this phase.

### Success criteria:

#### Automated verification:

- The release SHA is at or after the S-03 archive commit:
  `git merge-base --is-ancestor 0ff74bd <release sha>`
- The suite counts are at or above the last recorded repository-wide figures: unit 15 files/185 tests,
  integration 11 files/112 tests
- The tree is clean at the moment of capture: `git status --porcelain` produces no output
- Typecheck passes: `npm run typecheck`
- The whole suite passes from a clean install: `npm ci && npm test`
- The production build succeeds: `npm run build`
- The deploy is valid without performing it: `npx wrangler deploy --dry-run`
- The dry run names exactly four unapplied migrations:
  `npx wrangler d1 migrations list subscription-splitter-db --remote`
- A Time Travel bookmark is recorded: `npx wrangler d1 time-travel info subscription-splitter-db`
  returns one and it appears in `evidence/runs/release-1.md`
- The snapshot exists, is non-empty, and is ignored:
  `test -s <path> && git check-ignore -v <path>`
- The passing-tests capture exists: `test -s evidence/screenshots/release-05-tests-passing.png`
- Hosted CI is green for the release candidate SHA: `gh run list --commit <sha>`
- Sign-in against the current live build succeeds, confirming `APP_ORIGINS` resolves

#### Manual verification:

- The snapshot was opened and confirmed to contain rows for both seeded accounts, then closed without
  copying anything out of it
- The rollback note describes a recovery that the person reading it could actually perform, and its
  primary path is the restore command with the recorded bookmark already in it
- `wrangler secret list` shows no seeding secret, so the seed route is closed going into the release
- Time Travel's retention was confirmed against this account rather than read from help text
- The SHA visible in the passing-tests capture equals the release SHA

**Implementation note**: Stop here for human confirmation before applying anything to the remote
database. This is the last point before the first write.

---

## Phase 3: Remote migration, deploy, and the live verification transcript

### Overview

Apply the four migrations to the remote database, deploy the release candidate, and verify the live
instance at the API level with a recorded transcript. This phase answers D05's machine-checkable half.

### Required changes:

#### 1. The remote migration

**File**: none (commands, output recorded into the release transcript)

**Purpose**: Bring the remote schema up to `0006` so the new build has tables to query.

**Contract**: `npm run db:migrate:remote` applies the four files in order. Its output is recorded
verbatim. `npx wrangler d1 migrations list subscription-splitter-db --remote` is run again
immediately afterwards and must report nothing unapplied. If the apply fails partway, stop: do not
retry and do not deploy; record the exact failure and the reported state, and follow the rollback
note.

#### 2. The deploy

**File**: none (commands, output recorded)

**Purpose**: Replace the two-slice-old build with the release candidate.

**Contract**: `git status --porcelain` is confirmed empty immediately before the command, and
`git rev-parse HEAD` re-read and confirmed equal to the SHA pinned in phase 2. Then `npm run deploy`.
The new version id printed by wrangler is captured, along with the SHA and the URL. If the tree is not
clean or the SHA has moved because another agent pushed, the phase returns to phase 2's release
candidate step rather than deploying a tree nobody verified.

#### 3. The demo plan and the transcript's own participant

**File**: none (the live database, through the deployed API)

**Purpose**: The transcript needs a parent record, and there is none it can safely use. The only
subscription on the live owner account is the first deployment's artefact, which after the migration
has no owner member, so no share can be computed against it and no balance it reported would mean
anything. Creating the demo plan here, rather than in phase 4, also makes the transcript and the
screenshots provably describe the same rows.

**Contract**: Through the API, as the owner, in this order: create the demo subscription with a start
month several months behind the current month in its own time zone, which also creates its owner
member and that member's opening range in one batch; add two non-owner participants, one of whose
active range ends before the current month so a departure is visible; add a price and a later
effective-dated price change; mark one break month. Every value is synthetic and every one is recorded
in the release summary as an offset from the plan's start month.

Separately, and only for the CRUD cycle below, add a third non-owner participant named so its purpose
is obvious. The payment and schedule rows the transcript creates hang off it, and it is
removed before the phase closes, in dependency order: the payment by the cycle's own delete, then the
schedule, then the participant itself, whose delete succeeds once `hasDependents` is false. Nothing
the transcript creates to demonstrate a verb is left behind.

A price entry is deliberately not part of that set. `price_history` is keyed on the subscription and
carries no member id, so a price entry cannot hang off a participant and deleting the participant
would not take one with it; a price entry created for the cycle would survive on the demo plan and
move the balances phase 4 captures. The price verbs the transcript exercises are therefore the demo
plan's own price and price change from the paragraph above, which are meant to stay.

What cannot be removed is stated here rather than discovered later: the demo subscription and its
owner member are permanent, because the product exposes no `DELETE /api/subscriptions/:id` and answers
409 to a delete of the owner member. They are created on purpose and kept on purpose.

#### 4. The stray subscription repaired and relabelled

**File**: none (the live database, through the deployed API)

**Purpose**: After the migration the first deployment's subscription is an owner-less row the shipped
product can no longer produce, and a reviewer clicking it lands on the degraded no-owner screen. It
cannot be deleted, so the choice is to leave it as an anomaly or to make it an ordinary empty plan.

**Contract**: `POST /api/subscriptions/:id/members` with `is_owner: true` and an active range opening
at the subscription's own start month, which repairs it to the shape every other subscription has. The
owner member so created is permanent; that is accepted, because the row it sits on is permanent
anyway. If the range is refused, the repair is abandoned and recorded as refused rather than retried
with a different shape. Either way the subscription is renamed through `PATCH /api/subscriptions/:id`
to a label that tells a reviewer what it is and that it is not the demo plan, and the release summary
records that it is the first deployment's artefact, why it predates `0003`, and why it cannot be
removed.

#### 5. The live API transcript

**File**: `evidence/runs/release-1-live-smoke.txt` (new)

**Purpose**: Record, in a form someone can check, that the deployed instance enforces what the local
suite enforces. It follows the shape of `evidence/runs/deploy-1-live-smoke.txt`.

**Contract**: A trimmed, redacted transcript against the live URL, each entry showing the request and
its status code and, where it matters, a short body excerpt. Every record-level entry names the
subscription and member it acts on, so no step is ambiguous about its parent. The sequence covers, at
minimum: the health endpoint; `/api/me` with no cookie answering 401; a cross-origin sign-in attempt
refused; the sign-up endpoint still refusing with `EMAIL_PASSWORD_SIGN_UP_DISABLED`; sign-in as owner
with the `Set-Cookie` attributes visible and the token redacted; sign-out followed by the same cookie
reaching 401; sign-in again; the demo plan and its participants created as change 3 specifies; against
the transcript's own participant, a payment created, re-read by a separate later request with every
field intact, patched, re-read again, deleted, and then answered 404; the demo plan's summary read
before and after those steps with the balance moving by exactly the amount; a member edit and a price
change moving the same numbers; the transcript's participant and its remaining rows deleted, each
delete shown; the repair and rename of the stray subscription; the reviewer account answered 404 for
the demo plan's subscription, member, price, payment, schedule and summary by id, and an empty list
for its own; a child record requested through a foreign parent answered 404; and `POST /api/dev/seed`
answered 404 with and without a token. Session tokens, passwords and the seed token never appear.

#### 6. The release summary

**File**: `evidence/runs/release-1.md`

**Purpose**: The prose companion to the transcript, matching the precedent of
`evidence/runs/deploy-1.md`.

**Contract**: Extended with: the release version id, the release commit SHA and the live URL; the four
migrations applied and the post-apply list output; the local gate results captured in phase 2 with
their exact counts; the demo plan's input values as offsets from its start month; a summary of the
transcript's outcomes; a statement of what the live pass created that cannot be removed, and why; and
an explicit statement of what was not exercised live, in the same spirit as the first deployment's
closing note.

### Success criteria:

#### Automated verification:

- Every migration is applied remotely: `npx wrangler d1 migrations list subscription-splitter-db
  --remote` reports nothing unapplied
- The deploy returns a new version id and the live URL responds:
  `curl -s -o /dev/null -w '%{http_code}' https://subscription-splitter.sebastianfudalej.workers.dev/`
  is 200
- The API is the new build: `GET /api/subscriptions/<demo id>/summary` with a valid session returns
  200 rather than the 404 the old build would have produced
- The demo plan has an owner member and the stray subscription's repair either succeeded or is
  recorded as refused: `GET /api/subscriptions/<id>/members` on each
- Unauthenticated access is refused: `/api/me` without a cookie returns 401
- The seed route is closed: `POST /api/dev/seed` returns 404 with no token and with an arbitrary token
- A payment survives a separate later request: create, then read back in a new request with every
  field intact, then delete, then 404
- The transcript's own participant is gone: `GET /api/subscriptions/<demo id>/members` no longer lists
  it, and the owner's list holds exactly the demo participants
- The transcript contains no credential: `rg -n "session_token=[^<]" evidence/runs/release-1-live-smoke.txt`
  returns nothing, and no password or seed token string appears

#### Manual verification:

- The balance shown by the live summary matches a hand calculation performed before the request was
  made, not after
- The transcript was read end to end for redaction before it was staged
- Sign-out genuinely invalidated the session: the same cookie, replayed, reached nothing
- What was not exercised live is stated in the summary rather than left to inference
- The owner's subscription list ends the phase with exactly two rows, the demo plan and the relabelled
  artefact, and nothing the transcript created to demonstrate a verb survives
- What the live pass created that cannot be removed is recorded in the summary, with the reason

**Implementation note**: Stop here for human confirmation that the live checks passed before starting
the walkthrough.

---

## Phase 4: Acceptance walkthrough and the final-release screenshots

### Overview

Walk the product in a browser against the release, as the organizer would, finishing the demo plan
phase 3 started and capturing the screenshots the submission package needs. This phase answers B08 and
B12 and D05's human half.

### Required changes:

#### 1. The demo plan finished in the browser

**File**: none (the live database, through the running product)

**Purpose**: Phase 3 created the plan, its participants, its prices and its break month through the
API so the transcript had a parent it could reason about. The money that a reviewer actually looks at
is recorded here, in the browser, which is what B08 asks to see walked.

**Contract**: Signed in as the owner against the live URL, on the demo plan: record two payments from
different participants and watch each balance move; edit one and watch it follow; record one standing
order and mark one of its months as not received. Every value is synthetic and every one is added to
the release summary's list of inputs, as an offset from the plan's start month. Everything recorded
here is kept: it is the demo state a reviewer will open.

Permanence is stated once more here because this is the phase most likely to improvise: payments,
prices, break months, schedules, exceptions and non-owner participants can all be removed through the
product; subscriptions and owner members cannot. Nothing is created in those two shapes during this
phase.

#### 2. Error and refusal states

**File**: none (the browser)

**Purpose**: B08 asks for error states to be usable, not merely present.

**Contract**: Exercised live and captured: a payment dated before the plan's first month refused with
a message naming the date; deleting a participant who has payments or a standing order refused with a
message naming the reason; an overlapping standing order refused. Each refusal leaves the data
unchanged, confirmed by a reload.

#### 3. The second-account isolation pass

**File**: none (the browser)

**Purpose**: US-05 and the milestone's own done-when condition.

**Contract**: Signed in as the second account in the same browser session sequence: the subscription
list is empty, and the demo plan reached by its URL is refused. Captured as a screenshot showing the
empty state.

#### 4. The screenshot set

**File**: `evidence/screenshots/release-*.png`

**Purpose**: B12 requires four captures and offers a fifth. The existing fourteen screenshots are from
local per-slice walkthroughs and none is of the deployed instance, so the release set needs a naming
scheme that separates it from them and maps onto the form's own vocabulary.

**Contract**: Nine captures taken in the browser from the live URL with the address bar visible, plus
`release-05-tests-passing.png`, which phase 2 already captured in the clean checkout and which is the
one release screenshot that is not a browser capture and has no address bar to show. The set:

- `release-01-login.png` - the sign-in screen (the form's optional login screenshot)
- `release-02-home.png` - the post-login home screen listing the subscriptions
- `release-03-input-record-payment.png` - the main input feature: the payment form filled in
- `release-04-output-balances.png` - the main output feature: the detail screen's balances and summary
- `release-05-tests-passing.png` - from phase 2: the terminal showing the release SHA and `npm test`
  passing with its counts
- `release-06-members-and-prices.png` - membership ranges and the price history with the change
- `release-07-recurring-assumed-received.png` - standing-order months labelled assumed received, with
  the excepted month not counted
- `release-08-error-before-start-month.png` - the refused payment with its message
- `release-09-reviewer-sees-nothing.png` - the second account's empty list
- `release-10-narrow-phone.png` - the detail screen at a narrow phone width

No screenshot shows a password, a session cookie, a token or any non-synthetic value. The first five
are the ones the submission form asks for; the rest are supporting evidence.

#### 5. The walkthrough record

**File**: `evidence/runs/release-1.md`

**Purpose**: Tie the screenshots to the release they came from and make the demo state reproducible.

**Contract**: A Walkthrough section listing each step, its input values as offsets from the plan's
start month, what was observed, and which screenshot records it. It names the release version id at
the top so every capture is attributable to one build, and it continues the input list phase 3 began
rather than starting a second one.

### Success criteria:

#### Automated verification:

- All ten screenshots exist with the specified names: `ls evidence/screenshots/release-*.png` returns
  ten files
- Each is a non-empty PNG: `file evidence/screenshots/release-*.png` reports PNG image data for all
- The release summary names every screenshot file:
  each filename appears in `evidence/runs/release-1.md`

#### Manual verification:

- The four form-required captures are identifiable without reading the filename
- The SHA visible in `release-05-tests-passing.png` equals the release SHA recorded in
  `evidence/runs/release-1.md`, and the nine browser captures each show the live URL in the address
  bar
- The balances on the output screenshot match a hand calculation
- No screenshot shows a credential, a token or a non-synthetic value
- Each refusal state left the data unchanged, confirmed by a reload
- The owner's populated list and the second account's empty list came from one session
- The layout is usable at a narrow phone width
- Nothing was created in a shape the product cannot delete, beyond what phase 3 created on purpose

**Implementation note**: Stop here for human confirmation that the walkthrough and captures are
acceptable before the evidence phase.

---

## Phase 5: The mvp-check run, the evidence index, and the hand-off

### Overview

Run the course's own minimum check against the repository, fix what it finds, and leave the evidence
and status files in a state another model can resume from.

### Required changes:

#### 1. The mvp-check run

**File**: `context/changes/verification-and-release/mvp-check.md` (new)

**Purpose**: B10 asks for the course `mvp-check` run against the actual project with unresolved
findings fixed. It is a prompt, `archive/toolkit/.ai/prompts/mvp-check.md`, executed against this
repository rather than a command that can be invoked.

**Contract**: The prompt is followed as written and its report produced in the structure it specifies:
a checklist with an explicit pass or fail marker for each of its five criteria, a percentage line, and
prioritized improvements for anything that fails. The marker is the literal word `PASS` or `FAIL`,
pinned here so the criterion below can grep for a token that is decided rather than guessed; the
prompt's own format uses tick and cross marks, and the same reasoning that writes the report in
English writes its markers as words. The report is written in English, with the five
criteria named in English, because its audience is the evidence index and a reviewer reading this
repository; the prompt itself is in Polish and names its sections there, and following its structure
rather than its language is the deliberate choice. Every pass cites a file path or a function name
actually found in this repository. The prompt's own exclusions are respected: visual design, styling, polish,
accessibility and whether the app is deployed are not scored. The expected evidence is payments'
four-verb CRUD for criterion 1, the share-and-residual calculation in `src/domain/` for criterion 2,
test-plan risk 1 mapped to the calculation's unit tests and risk 2 to the cross-account integration
cases for criterion 3, Better Auth with per-route ownership enforcement for criterion 4, and the
foundation documents plus the README for criterion 5 - but each is confirmed by reading, not assumed
from this list.

#### 2. Findings fixed

**File**: as the report identifies

**Purpose**: An unresolved finding is the thing B10 asks to be fixed.

**Contract**: Every criterion the report fails is either fixed and the report re-run, or recorded in
the report as an accepted limitation with the reason. Nothing is marked passed that the report did not
independently find evidence for. Fixes stay inside this slice's scope: a documentation gap is fixed,
and a missing product capability would be recorded as a limitation rather than built here.

#### 3. The cold re-read

**File**: `evidence/runs/release-1.md`

**Purpose**: Every persistence proof the slice has so far is a re-read inside one continuous session,
which is the strongest thing a single stateless Worker request can show on its own. B02 asks that
"refresh/restart preserves results" and test-plan risk 3 names a record "gone or altered after a
reload, a restart or a migration". This phase runs after the browser is closed, so the cheapest
evidence for the other half is already sitting in the plan's own ordering.

**Contract**: A fresh sign-in as the owner, in a new session with no cookie carried over from phase 4,
re-reading the demo plan's summary and its payment list. The balances and the payment rows must equal
what phase 4 recorded. The result is appended to the release summary as a short cold-read section, and
it is what closes risk 3's reload clause against the deployment rather than against a local database.

#### 4. The evidence index

**File**: `evidence/index.md`

**Purpose**: It is the map from goal IDs to artifacts, and it is how the final package is audited.

**Contract**: Rows added for S-04 and for the goals this slice produced evidence for: D05, B08, B09,
B10 and B12. Each row names the artifacts by path (the transcript, the summary, the screenshot set,
the `mvp-check` report), the commit, and the release version id where the evidence is a live one.

B01, B02 and B04 are handled explicitly rather than left alone. All three currently read "Partial",
and the live pass is the first evidence any of them has against the deployed build rather than a local
one: B01's complete flow, B02's payment CRUD surviving a reload, B04's ownership isolation by id.
Each either gains a row citing the release artifacts or is stated in the index as deliberately
unchanged with the reason, because F01 asks for the missing goals to be listed explicitly. No row
claims a badge or an award.

#### 5. The work log

**File**: `evidence/work-log.md`

**Purpose**: The running narrative of the project, kept alongside the index.

**Contract**: An entry for this slice: what was migrated, what was deployed, what was verified live,
and what was found and fixed by the `mvp-check` run. Identified by change ID, commit and release
version id, with no calendar dates.

#### 6. The status hand-off

**File**: `context/STATUS.md`

**Purpose**: Another model has to be able to resume without asking the user anything.

**Contract**: The Deployment section is rewritten to describe the new release: version id, release
commit SHA, live URL, migrations `0001` to `0006` applied remotely, seeding still disabled and the
seed route confirmed closed, credentials still only in `evidence/private/`. The Active change section
records `verification-and-release` and its phase state. The Checks section records the gate counts
captured in phase 2. The Next executable action lists what remains: the submission package assembly
and the account-owner items, explicitly not performed here. Existing entries for other slices are not
rewritten.

#### 7. Goal boxes and the package inventory

**File**: `context/changes/verification-and-release/plan.md` (this file's Progress section) and a note
in `evidence/runs/release-1.md`

**Purpose**: `GOALS.md` lives outside this repository and is synchronised by the designated status
writer, not by this slice.

**Contract**: The release summary ends with an inventory of what the Builder submission package would
consist of - repository URL, the five form screenshots by filename, the live URL, the reviewer
instruction naming which account is which - stated as an inventory, not as a submission, and with an
explicit line that nothing has been uploaded and that uploading requires the user's confirmation of
that specific action. The goal-box updates for B08, B09, B10, B12 and D05 are handed to the status
writer by naming the evidence paths; this slice does not edit `GOALS.md`.

### Success criteria:

#### Automated verification:

- Typecheck passes: `npm run typecheck`
- The whole suite passes: `npm test`
- The report names each of the five criteria, checked one pattern at a time rather than by a single
  line count over alternatives: five separate `rg --count-matches "<one criterion name>"
  context/changes/verification-and-release/mvp-check.md` runs, each returning at least one. A single
  `rg -c` over five `-e` alternatives cannot express this, because it counts matching lines rather
  than matches per pattern, and a word like "Documentation" recurs in the improvements section by
  design
- The report carries a pass or fail marker against each of the five criteria and a percentage line.
  The marker token is whatever phase 5 change 1 pins, and the check greps for that token rather than
  assuming one: the prompt's own format uses tick and cross marks, so a check written against `PASS`
  or `FAIL` would pass or fail for the wrong reason. A line matching `[0-9]+%` exists
- The cold re-read returns the same balances: the summary read in a fresh session equals the figures
  phase 4 recorded
- The evidence index names the release artifacts: the transcript, the summary, the screenshot prefix
  and the report each appear in `evidence/index.md`
- No credential reached a committed file: `git diff` over the phase's staged paths reviewed against
  the names in `.dev.vars.example`, and `rg -n "reviewer-credentials" --glob '!evidence/private/**'`
  returns only references to the path, never a value

#### Manual verification:

- Every pass in the `mvp-check` report was confirmed by opening the file it cites
- A reader who has seen none of this work can follow `context/STATUS.md` to the release, the evidence
  and the next action without asking a question
- The package inventory lists only what exists on disk, and states plainly that nothing has been
  uploaded
- The index says, for B01, B02 and B04, either what release artifact moved them or why the live pass
  deliberately did not

---

## Testing strategy

This slice adds no code, so it adds no unit or integration tests. Its verification is the existing
suite re-run as a gate, plus two things the suite cannot do.

### Existing suites as gates:

- `npm run typecheck`, `npm test` and `npm run build` run at phase 1, phase 2 and phase 5. Phase 2's
  run is the one whose counts are quoted as the release's, and it runs from a clean `npm ci`.
- Hosted CI is confirmed green for the release SHA rather than assumed.

### What the suite cannot cover:

- **The remote schema.** No test in this repository touches the remote database. The dry run before
  and the empty list after the apply are its only checks, and they are in phase 2 and phase 3, with a
  recorded Time Travel bookmark standing behind both.
- **The deployed build.** The integration suite runs in the Workers test pool against a local D1, not
  against the deployment. The live transcript in phase 3 is the substitute, and it deliberately
  repeats a subset of the suite's assertions - ownership 404s, persistence by re-read, unauthenticated
  401s - against the live URL, because "deployment evidence matches final release" is what D05 asks
  for.

### Manual testing steps:

1. Follow `README.md` from a clean clone and reach a running local app with a seeded account.
2. Against the live URL, sign in as the owner, create the demo plan, and hand-calculate one month's
   shares before reading them off the screen.
3. Record a payment, reload, confirm the balance moved by exactly its amount; edit it, reload; delete
   it, reload, confirm the balance returned.
4. Attempt a payment dated before the plan's first month and confirm the refusal names the date and
   stored nothing.
5. Sign out, replay the previous session, confirm it reaches nothing.
6. Sign in as the second account, confirm an empty list and a refusal for the demo plan by id.
7. Confirm `POST /api/dev/seed` answers 404.
8. Later, in a fresh session with nothing carried over, sign in again and confirm the demo plan's
   balances and payment list are what the walkthrough left behind.

### Risk mapping

| Test-plan risk | Where this slice touches it |
|---|---|
| 1 (a balance is wrong) | The hand calculation in phase 4, performed before the screen is read |
| 2 (one account reads another's records) | The second-account pass in phases 3 and 4, against the live instance |
| 3 (a record is gone after a reload, or a migration leaves the remote database behind the code) | The whole slice; the migration half is what phases 2 and 3 close, and the reload half is phase 5's cold re-read in a fresh session |
| 4 (a standing order is counted for a month it should not cover) | The demo plan's excepted month and departed participant, captured in phase 4 |
| 5 (a month with no active participants) | Not exercised live; already covered by unit tests, recorded as such |
| 6 (a session outlives its sign-out) | The sign-out replay in phase 3 |

## Performance considerations

None. The deployment stays one Worker and one D1, the demo plan has three participants and a handful
of months, and no load is expected beyond a reviewer opening it. Performance tuning is an explicit
non-goal.

## Migration notes

The four migrations are additive: seven `CREATE TABLE` statements and five index statements, no
`ALTER`, no `DROP`, nothing touching a Better Auth table. Existing `user`, `session`, `account` and
`subscriptions` rows are unaffected, which is why the two seeded accounts survive. The one statement
whose outcome could in principle depend on existing rows is the partial unique index on the owner
column, and it is created on a table created a few lines above it in the same file, so no existing row
can violate it.

There is no down-migration and this slice does not write one. The recovery is Time Travel:
`npx wrangler d1 time-travel restore subscription-splitter-db --bookmark=<the bookmark recorded in
phase 2>` acts on the remote database in place, keeps the database id, and therefore needs no
`wrangler.jsonc` edit and no redeploy. A bad deploy alone, with the schema intact, is recovered by
redeploying the previous version id, which needs no database work at all.

The snapshot taken in phase 2 is a backup for a different failure: losing the Cloudflare account or
the database itself, in which case the two accounts exist nowhere else. Rebuilding from it is a last
resort and an awkward one, because it means a new database, a `wrangler.jsonc` edit and a redeploy,
and because whether the export carries wrangler's own `d1_migrations` bookkeeping table is unverified.
Replaying it into the existing database is not a recovery at all: every statement in it is a
`CREATE TABLE` against a table that is already there. The three paths are not independent either -
once the database is rebuilt under a new id, the previous release version id stops being a valid
fallback, because that version carries the old id in its own configuration.

The apply is not idempotent in the sense of being safe to interrupt: a file that errors partway leaves
the schema between two versions and wrangler's bookkeeping disagreeing with reality. If that happens
the correct response is to stop, record the exact state, and restore to the bookmark - not to retry.

Nothing else in this slice is a migration, but two things behave like one. A subscription and an owner
member, once created on the live instance, cannot be removed by any route the product exposes. The
live pass therefore creates exactly one of each, on purpose, and everything it creates only to
demonstrate a verb hangs off a non-owner participant that it deletes before the phase closes.

## References

- Research: `context/changes/verification-and-release/research.md`
- Decision: `context/decisions/D-010-live-demo-data-and-reviewer-access.md`
- Decision: `context/decisions/D-005-account-seeding.md`
- First deployment: `evidence/runs/deploy-1.md`, `evidence/runs/deploy-1-live-smoke.txt`
- Roadmap item: `context/foundation/roadmap.md` S-04
- Risks: `context/foundation/test-plan.md` §2
- Prior slice shape: `context/archive/payments-and-recurring/plan.md`
- Gate for phase 2: `context/archive/payments-and-recurring/reviews/impl-review.md`
- This plan's review: `context/changes/verification-and-release/reviews/plan-review.md`
- Course minimum: `archive/toolkit/.ai/prompts/mvp-check.md`, `docs/MINIMUM-COMPLETION.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Documentation that describes what shipped

#### Automated

- [x] 1.1 Typecheck passes — 9a7fa17
- [x] 1.2 The whole suite passes — 9a7fa17
- [x] 1.3 AGENTS.md no longer claims only the scaffold exists — 9a7fa17
- [x] 1.4 The README first-run recipe no longer enumerates only two migrations — 9a7fa17
- [x] 1.5 context/foundation/infrastructure.md exists and names the Worker, the database id and the secrets by name — 9a7fa17
- [x] 1.6 No calendar date was introduced into any authored file — 9a7fa17
- [x] 1.7 No secret value appears in any changed file — 9a7fa17

#### Manual

- [x] 1.8 A reader following the README from a clean clone reaches a running app and a seeded account — 9a7fa17
- [x] 1.9 Every corrected FR names the shipped route or domain function that implements it — 9a7fa17
- [x] 1.10 The infrastructure document and the README Deploy section agree on every command and secret name — 9a7fa17

### Phase 2: Release preparation and the rollback that makes it safe

#### Automated

- [x] 2.1 The tree is clean at the moment of capture — b039732
- [x] 2.2 Typecheck passes — b039732
- [x] 2.3 The whole suite passes from a clean install — b039732
- [x] 2.4 The production build succeeds — b039732
- [x] 2.5 The deploy is valid as a dry run — b039732
- [x] 2.6 The migration dry run names exactly the four unapplied files — b039732
- [x] 2.7 The snapshot exists, is non-empty and is gitignored — b039732
- [x] 2.8 Hosted CI is green for the release candidate SHA — b039732
- [x] 2.13 The release SHA is at or after the commit that resolved those findings — b039732
- [x] 2.19 The suite counts are at or above the last recorded repository-wide figures — b039732
- [x] 2.14 A Time Travel bookmark is recorded — b039732
- [x] 2.15 The passing-tests capture exists — b039732
- [x] 2.16 Sign-in against the current live build confirms APP_ORIGINS resolves — b039732

#### Manual

- [x] 2.9 The snapshot was confirmed to contain both seeded accounts — b039732
- [x] 2.10 The rollback note describes a recovery that could actually be performed — b039732
- [x] 2.11 The secret list shows no seeding secret — b039732
- [x] 2.17 Time Travel's retention was confirmed against this account rather than read from help text — b039732
- [x] 2.18 The SHA visible in the passing-tests capture equals the release SHA — b039732

### Phase 3: Remote migration, deploy, and the live verification transcript

#### Automated

- [x] 3.1 Every migration is applied remotely and nothing is left unapplied — a323474
- [x] 3.2 The deploy returns a new version id and the live URL responds 200 — a323474
- [x] 3.3 The live API is the new build, proven by a successful summary request — a323474
- [x] 3.4 Unauthenticated access is refused — a323474
- [x] 3.5 The seed route answers 404 with and without a token — a323474
- [x] 3.6 A payment survives create, re-read, patch, re-read, delete and a final 404
- [x] 3.7 The transcript contains no credential — a323474
- [x] 3.12 The demo plan has an owner member and the stray subscription's repair succeeded or is recorded as refused — a323474
- [x] 3.13 The transcript's own participant is gone and the owner's members are the demo participants — a323474

#### Manual

- [x] 3.8 The live balance matches a hand calculation made before the request — a323474
- [x] 3.9 The transcript was read end to end for redaction before staging — a323474
- [x] 3.10 Sign-out invalidated the session, proven by replaying the cookie — a323474
- [x] 3.11 What was not exercised live is stated rather than left to inference — a323474
- [x] 3.14 The owner's subscription list ends the phase with exactly two rows and no demonstration residue — a323474
- [x] 3.15 What the live pass created that cannot be removed is recorded with the reason — a323474

### Phase 4: Acceptance walkthrough and the final-release screenshots

#### Automated

- [ ] 4.1 All ten release screenshots exist with the specified names
- [ ] 4.2 Each is a non-empty PNG
- [ ] 4.3 The release summary names every screenshot file

#### Manual

- [ ] 4.4 The four form-required captures are identifiable without reading the filename
- [ ] 4.5 The balances on the output screenshot match a hand calculation
- [ ] 4.6 No screenshot shows a credential, a token or a non-synthetic value
- [ ] 4.7 Each refusal state left the data unchanged, confirmed by a reload
- [ ] 4.8 The owner's populated list and the second account's empty list came from one session
- [ ] 4.9 The layout is usable at a narrow phone width
- [ ] 4.11 The tests capture shows the release SHA and the nine browser captures show the live URL
- [ ] 4.12 Nothing was created in a shape the product cannot delete beyond what phase 3 created on purpose

### Phase 5: The mvp-check run, the evidence index, and the hand-off

#### Automated

- [ ] 5.1 Typecheck passes
- [ ] 5.2 The whole suite passes
- [ ] 5.3 The mvp-check report names each of the five criteria exactly once
- [ ] 5.4 The evidence index names the transcript, the summary, the screenshot prefix and the report
- [ ] 5.5 No credential reached a committed file
- [ ] 5.9 The report carries a pass or fail marker for each criterion and a percentage line
- [ ] 5.10 The cold re-read in a fresh session returns the balances phase 4 recorded

#### Manual

- [ ] 5.6 Every pass in the mvp-check report was confirmed by opening the file it cites
- [ ] 5.7 A reader can follow STATUS to the release, the evidence and the next action without asking
- [ ] 5.8 The package inventory lists only what exists on disk and states that nothing was uploaded
- [ ] 5.11 The index says, for B01, B02 and B04, what moved them or why the live pass deliberately did not
