<!-- PLAN-REVIEW-REPORT -->
# Plan review: Implementation plan, verification and release

- **Plan**: `context/changes/verification-and-release/plan.md`
- **Mode**: Deep
- **Repository state**: commit `11f24c6`, branch `main`. S-03 `payments-and-recurring` is
  `status: implemented` and closed out through its phase 5 (`82eafdd`, `b91762c`); its implementation
  review landed at `a55720b` while this review ran, verdict "approve with required changes", and its
  fixes are not on `main` yet. The deployment is still release
  `e259b7b3-d932-4b3b-8b84-7446cab7d636` at `149aa44d`
- **Verdict**: REVISE (approve with required changes)
- **Findings**: 3 critical, 2 warnings, 3 observations

Date and effort fields the report schema lists are omitted, matching this repository's convention of
recording progress by change ID, migration ID and commit. This review writes nothing outside this
file. Nothing here was gathered by touching Cloudflare: the two wrangler commands run were `--help`
invocations against the pinned local binary, which reach no account and no database.

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | WARNING |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | FAIL |
| Plan Completeness | WARNING |

## Grounding

Paths: 10/10 existing files the plan edits are on disk (`AGENTS.md`, `README.md`,
`context/foundation/prd.md`, `context/foundation/test-plan.md`, `context/foundation/roadmap.md`,
`context/foundation/tech-stack.md`, `evidence/index.md`, `evidence/work-log.md`, `context/STATUS.md`,
and the `mvp-check` prompt at `archive/toolkit/.ai/prompts/mvp-check.md` in the course workspace).
Four paths the plan creates are correctly absent: `context/foundation/infrastructure.md`,
`evidence/runs/release-1.md`, `evidence/runs/release-1-live-smoke.txt` and
`context/changes/verification-and-release/mvp-check.md`. `evidence/private/` exists, holds
`reviewer-credentials.md`, and is excluded at `.gitignore:14`, so the phase 2 snapshot path is
genuinely ignored before it is written.

Symbols and commands: every npm script the success criteria invoke exists in `package.json:5-18`
(`typecheck`, `test`, `test:unit`, `test:integration`, `build`, `deploy`, `db:migrate:remote`).
`wrangler.jsonc` carries `database_name` `subscription-splitter-db` and `database_id`
`03067638-dc95-4b5c-9a8a-86f2921e0414`, exactly as the plan quotes them, with `migrations_dir`
`migrations`. `wrangler d1 migrations list|apply`, `d1 export` and `secret list` all exist in the
pinned wrangler `4.131.1`, and `d1 export` takes `--remote --output` as the plan writes it. The two
product facts the housekeeping story rests on hold: `src/server/routes/subscriptions.ts` registers
`GET`, `POST`, `GET /:id` and `PATCH /:id` and no `DELETE`, and `patchSubscriptionSchema` in
`src/server/validation/subscriptions.ts:49-53` names only `name`, `currency`, `locale` and
`time_zone`, so `start_month` is a 400. `src/server/routes/dev-seed.ts:17-21` answers 404 on both
gates inside the handler, so the closed route is closed without a redeploy.

Migrations: the additive claim holds, with a counting error recorded as F6. Every statement in
`0003` to `0006` is a `CREATE TABLE` or a `CREATE INDEX`; the only `DELETE` and `UPDATE` tokens
anywhere under `migrations/` are `ON DELETE CASCADE` clauses and the `updatedAt` column in
`0001_auth.sql`, which is already applied. No `ALTER`, no `DROP`, and nothing naming `user`,
`session` or `account` except as a foreign-key target.

Brief to plan: phases, decisions and scope match, and D-010's text matches phase 4's contract clause
for clause. One divergence, recorded as F3: the brief's prerequisite line, "`main` green and S-03
landed", is looser than what phase 2 actually needs.

Progress contract (`.ai/skills/10x-plan/references/progress-format.md`): holds mechanically. Exactly
one `## Progress` heading, at the bottom after `## References`; five `### Phase N` titles identical to
the five `## Phase N` body headers; per-phase row counts equal to the criterion bullets in both splits
(7/3, 8/3, 7/4, 3/7, 5/3); no checkbox anywhere outside the section. One em dash in the file, the
mandated ` — <commit sha>` token, so the repository's no-em-dash rule stands. No calendar dates,
durations or estimates. `docs/reference/contract-surfaces.md` does not exist in this project, so that
check is skipped.

## Safety of the remote write, checked statement by statement

Verified against the four unapplied files rather than against the plan's summary of them, because
this is the one irreversible step in the slice.

`0003_members.sql` creates `members` and `active_ranges` and three indexes, one of them
`CREATE UNIQUE INDEX "members_one_owner_idx" ON "members"("subscription_id") WHERE "is_owner" = 1`.
`0004_prices_and_breaks.sql` creates `price_history` and `break_months` and no index.
`0005_payments.sql` creates `payments` and one index. `0006_recurring.sql` creates
`recurring_schedules` and `recurring_exceptions` and one index. Seven tables, five index statements.
Every foreign key points at `subscriptions`, `members` or `recurring_schedules`; none points at a
Better Auth table. The partial unique index is the only statement whose result depends on rows that
already exist, and it is created on a table created three lines above it, so there are none. The
plan's conclusion is right: the `user`, `session`, `account` and `subscriptions` rows are untouched
and the two seeded accounts survive. The residual failure mode the plan names, a file that errors
partway leaving wrangler's bookkeeping disagreeing with the schema, is the correct one and it is the
only one.

The dry run is real. `wrangler d1 migrations list <db> --remote` reports unapplied files without
writing, and the plan's stop condition, that it must name exactly the four expected files and nothing
else, is the right test for "the remote database is not where the evidence says it is".

## Challenge to a core assumption

The plan states, in Key findings and again in Migration notes, that
`wrangler d1 export --remote --output=<path>` "is the only rollback this project has", and builds the
whole of phase 2 change 4 on it: recovery means recreating the database from the snapshot, which
"changes the database id and therefore requires a `wrangler.jsonc` edit and a redeploy".

Counter-question: is the export the only rollback, or only the only rollback that lives in this
repository?

It is the second. On the wrangler this project pins, `4.131.1`:

```
$ npx wrangler d1 --help
  wrangler d1 time-travel  Use Time Travel to restore, fork or copy a database at a specific point-in-time

$ npx wrangler d1 time-travel restore --help
POSITIONALS
  database  The name or binding of the DB  [string] [required]
OPTIONS
      --bookmark   Bookmark to use for time travel  [string]
      --timestamp  Accepts a Unix (seconds from epoch) or RFC3339 timestamp ... (within the last 30 days)
This command acts on remote D1 Databases.
For more information about Time Travel, see https://developers.cloudflare.com/d1/reference/time-travel/
```

Time Travel restores the same database in place. It does not mint a new `database_id`, so it needs no
`wrangler.jsonc` edit and no redeploy, and its 30-day window covers a migration applied minutes
earlier by a wide margin. The recovery the plan writes down is therefore the most expensive path
available, presented as the only one, in the document someone will read under pressure with a
half-applied schema in front of them. That is F1.

The same paragraph carries a second, quieter assumption. The export-and-replay path is never
rehearsed and one of its preconditions is never checked: whether `d1 export` includes wrangler's own
`d1_migrations` bookkeeping table. If it does not, a database rebuilt from the snapshot reports all
six migrations unapplied and the next `migrations apply` fails on `0001`'s existing tables. If it
does, the replay has to go into an empty database rather than the one being repaired. Either way
`d1 execute --remote --file` against the *existing* database, which is what phase 2 change 4 names,
replays `CREATE TABLE` statements over tables that are already there. And the two recovery paths
interact in a way the note does not say: if the database is rebuilt under a new id, redeploying the
previous release version `e259b7b3-d932-4b3b-8b84-7446cab7d636` binds that version's own recorded
configuration, which names the old database id, so the stated deploy-only fallback stops being valid
the moment the database-level one is used.

## Findings

### F1 - The rollback note names the most expensive recovery as the only one, and its steps are unrehearsed

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: Blind Spots
- **Location**: Key findings (plan.md, third bullet); Phase 2, change 3 and change 4; Migration notes
- **Detail**: See the challenge section above for the evidence. Three separate problems sit in one
  paragraph. (a) `wrangler d1 time-travel restore` exists in the pinned wrangler, acts on remote D1,
  accepts a `--bookmark` or a `--timestamp` within 30 days, and restores in place, so the claim that
  the export is "the only rollback this project has" is false and the claim that recovery requires a
  new database id, a `wrangler.jsonc` edit and a redeploy is false for the likely failure mode.
  (b) The export-and-replay path is specified as `d1 execute --remote --file` against the existing
  database, which replays `CREATE TABLE` statements onto tables that already exist; its real form
  needs a new database, and whether the export carries the `d1_migrations` bookkeeping table is
  unverified and decides whether the rebuilt database can be migrated afterwards at all. (c) The two
  recovery paths are written as independent but are not: rebuilding under a new id invalidates the
  "redeploy the previous version id" fallback, because that version carries the old id in its own
  configuration.
- **Fix**: Add `npx wrangler d1 time-travel info subscription-splitter-db` to phase 2 before the
  apply and record the bookmark it returns in `evidence/runs/release-1.md`. Rewrite the Rollback
  section so it reads: primary recovery is
  `npx wrangler d1 time-travel restore subscription-splitter-db --bookmark=<recorded>`, in place, no
  id change, no redeploy; the export stays as the off-Cloudflare backup for the case where the
  account or the database is lost entirely; and the export-replay path is spelled out honestly as
  `d1 create` then `d1 execute --remote --file` then the `wrangler.jsonc` edit then a redeploy, with
  the note that after it the previous release version id is no longer a valid fallback. Keep the
  snapshot step exactly as it is: it costs nothing and it is the only copy that survives the account.
  - Strength: turns a recovery nobody has rehearsed into one command with a recorded argument, and
    the argument is captured before the irreversible step rather than reconstructed after it.
  - Trade-off: one more command and one more recorded line in phase 2.
  - Confidence: HIGH - the command, its flags, its 30-day window and the "acts on remote D1
    Databases" line are quoted from the pinned binary's own help output, not from memory.
  - Blind spot: the retention window and availability are read from wrangler's help text; neither
    this review nor the plan has checked the account's plan against the Time Travel documentation the
    help output links to. That check belongs in phase 2, before the apply.
- **Decision**: PENDING

### F2 - Phase 3's transcript has no parent record to run against, and whatever it creates is permanent on the reviewer-facing instance

- **Severity**: ❌ CRITICAL
- **Impact**: 🔬 HIGH - architectural stake; broad blast radius, think it through carefully
- **Dimension**: Blind Spots
- **Location**: Phase 3, change 3 (the live API transcript); Phase 4, change 1 and change 2
- **Detail**: The transcript contract requires "a payment created, re-read ..., patched, re-read
  again, deleted", "the subscription summary read before and after those steps", and "a member and a
  price change moving the same numbers". A payment needs a member, a member needs a subscription, and
  the plan never says which subscription any of this happens on. Phase 4, which creates the demo
  plan, runs afterwards.

  At the start of phase 3 the live owner account holds exactly one subscription, "Deploy smoke test",
  and after the migration that subscription has no `members` row at all: it was created by release
  `149aa44d` at a time when `0003_members.sql` had not been applied remotely, so the table did not
  exist. The current build creates the owner member in the same atomic batch as the subscription
  (`src/server/db/subscriptions.ts:53-75`, with the comment "a subscription that exists without an
  owner member has no ..." citing D-006), so this is a state the shipped product can no longer
  produce. `src/client/screens/SubscriptionDetail.tsx:143` resolves `const owner = members.find(...)`
  to `undefined` on it, which is the degraded state the local capture
  `evidence/screenshots/detail-no-owner-state.png` records. The plan and the research both note "no
  members" and neither follows the consequence through.

  So phase 3 must either repair that subscription or create a new one, and the second is
  irreversible: `src/server/routes/subscriptions.ts` has no `DELETE`, which the plan itself
  establishes. A transcript-created subscription then sits on the owner's home screen forever, inside
  `release-02-home.png`, and the plan's housekeeping story covers exactly one stray row.
- **Fix A ⭐ Recommended**: Name the parent explicitly in phase 3 change 3: the transcript runs
  against the existing "Deploy smoke test" subscription, whose missing owner member is created first
  with `POST /api/subscriptions/:id/members` carrying `is_owner: true` (schema-valid per
  `src/server/validation/members.ts:34-40`, and 409 only when an owner already exists,
  `src/server/routes/members.ts:62-68`). Every row the transcript creates is removed before the phase
  closes: the payment by its own delete step, then the price
  (`DELETE /api/subscriptions/:id/prices/:priceId`), then the schedule, then the member, whose delete
  succeeds once its dependents are gone. Move phase 4's rename into the same step so the subscription
  is left in one state rather than three, and record in the release summary that it is the first
  deployment's artifact, is owner-less because it predates `0003`, and cannot be removed.
  - Strength: the reviewer-facing list ends with exactly two rows, one of them the demo plan, which
    is what phase 4's screenshots assume; and repairing the owner-less subscription removes a screen
    that would otherwise show a reviewer a state the product treats as an anomaly.
  - Trade-off: phase 3 gains a cleanup sequence, and the transcript has to show the deletes as well
    as the creates. That is arguably better evidence, not worse.
  - Confidence: HIGH - every route the fix uses is on disk and its verbs were read for this review.
  - Blind spot: whether adding an owner member to a subscription whose `start_month` is the current
    month produces an active range the validation accepts. `validateActiveRanges` is run against
    `subscription.startMonth`, so an opening range at that month should pass, but it is the fix's
    first live check.
- **Fix B**: Create the demo plan first, at the start of phase 3, and run the whole transcript
  against it.
  - Strength: one subscription carries both halves of the evidence, so the transcript and the
    screenshots provably describe the same rows.
  - Trade-off: the browser walkthrough stops being the first thing that touches the release, so B08's
    "walkthrough on the release" is partly an API session, and the demo plan's balances then include
    whatever the transcript left behind.
  - Confidence: MED - it works, but it weakens the separation the plan gives as the reason for
    splitting phases 3 and 4 at all.
  - Blind spot: whether the organizer reading B08 would accept a walkthrough whose data was already
    there.
- **Decision**: PENDING

### F3 - The release can be pinned to a tree that S-03's implementation review has not finished with, and phase 1 writes another change's archive entry

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: End-State Alignment
- **Location**: Phase 1, change 6 (roadmap statuses); Implementation approach, Prerequisites; plan
  brief, Prerequisites
- **Detail**: This stopped being hypothetical while the review ran. S-03's implementation review
  landed at `a55720b` with verdict "approve with required changes" and three warnings, and the fixes
  for them are in the shared checkout uncommitted, not on `main`
  (`src/server/db/members.ts`, `src/server/db/recurring.ts`, `src/server/routes/members.ts`,
  `src/server/routes/recurring.ts`, two integration files and a new
  `tests/integration/member-removal.test.ts`). The same sequence happened to S-02: its implementation
  review landed at `70a7fff` with the same verdict and its fixes at `09b763b` and `ed72b1f`, all
  after that plan had been closed out exactly as S-03's already is. So "S-03 landed" in the brief's
  prerequisite line and "implemented and closed out through its own phase 5" in Current state
  analysis are both true, and neither is the gate that matters.

  Phase 2 pins a release SHA and phase 3 re-reads it only to confirm the tree is clean, so nothing in
  the plan prevents the release being built before S-03's review fixes exist. If that happens, the
  deployed instance is once again behind `main` within a commit or two, D05's "deployment evidence
  matches final release" describes a superseded build, and F01's "one identifiable tested release" is
  false. That is the precise failure this slice exists to end.

  Separately, phase 1 change 6 instructs this slice to set S-03's roadmap status to `done` "with the
  `## Done` entry the archive procedure writes". That entry belongs to the archive procedure of
  another change, which has not run: S-02's flip to `done` happened inside its archive commit
  `45eb35e`, not in a neighbouring slice. Writing it here marks a change complete that a review may
  still send back. The S-04 half of the same contract is already moot: `context/foundation/roadmap.md`
  carries S-04 as `planning` at line 62 and line 185, moved there by the status writer, which the
  plan's own "the more advanced status is left alone" clause already covers.
- **Fix**: Remove S-03 from phase 1 change 6 and leave both its status flip and its `## Done` entry
  to the archive procedure that owns them. Replace the brief's "S-03 landed" with a hard phase 2
  prerequisite: the three required findings of `reviews/impl-review.md` are resolved and
  `payments-and-recurring` is archived, and the release SHA is read at or after the commit that
  resolves them. Record in phase 2 change 1 that the SHA must be re-confirmed against that commit,
  not merely against a clean tree.
- **Decision**: PENDING

### F4 - The passing-tests capture is not tied to the release, and the screenshot contract contradicts itself

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: Phase 4, change 5; success criteria 4.1 to 4.6
- **Detail**: The contract opens "Captured from the live URL with the address bar visible, named:"
  and then lists `release-05-tests-passing.png` as "the terminal showing `npm test` passing with its
  counts", which has neither a URL nor an address bar. More than a wording slip: B12 and F01 both
  want the test capture to belong to the identified release, and nothing in the contract or in any
  criterion requires it to be taken at the release SHA. Phase 4 runs after the deploy, on a `main`
  other agents are pushing to, so a capture taken then can show a different tree's counts than the
  ones phase 2 recorded as the release's. Phase 2 already runs `npm ci && npm test` in a verifiably
  clean checkout at the pinned SHA; that run is the one worth photographing.
- **Fix**: Take `release-05-tests-passing.png` during phase 2, in the clean checkout, with
  `git rev-parse HEAD` visible in the same frame. Say in phase 4's contract that it is the one
  capture not taken from the browser, and add a criterion asserting that the SHA in the image equals
  the release SHA recorded in `evidence/runs/release-1.md`.
- **Decision**: PENDING

### F5 - The mvp-check completeness criterion counts the wrong thing, and the report's language is unstated

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: Phase 5, success criteria (automated), Progress row 5.3
- **Detail**: The criterion is `rg -c "^\s*[0-9]\." context/changes/verification-and-release/mvp-check.md`
  finds five. `rg -c` prints the number of matching lines in the file, and the prompt's own required
  output is a checklist, a percentage, and "Priorytetowe ulepszenia" - prioritized improvements, which
  the prompt asks for per failed criterion and which are themselves a numbered list. Any report that
  follows the prompt matches well past five lines, so the criterion fails on a correct report; a
  report that happened to hit five would pass regardless of what it said. Secondly,
  `archive/toolkit/.ai/prompts/mvp-check.md` is written in Polish and specifies Polish section names
  ("Lista kontrolna", "Status projektu", "Priorytetowe ulepszenia"), while every authored document in
  this repository is in English. The plan says "the format it specifies" and leaves the language to
  the implementer.
- **Fix**: Replace the criterion with one that checks the five criteria by name rather than by
  counting digits, for example a `rg` with one `-e` per criterion name asserting each appears exactly
  once, plus a check that the report carries a pass or fail marker for each and a percentage line.
  State in phase 5 change 1 that the report is written in English with the prompt's five criteria
  named in English, since the audience is the evidence index and a reviewer reading this repository.
- **Decision**: PENDING

### F6 - The plan miscounts what the four migrations contain, in three documents

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: Overview; Key findings, first bullet; Migration notes; plan brief, Architecture;
  `research.md` Detailed Findings, second section
- **Detail**: "six `CREATE TABLE` statements, four `CREATE INDEX` statements" appears in the plan
  twice and in the brief once. The files carry seven `CREATE TABLE` statements (`members`,
  `active_ranges`, `price_history`, `break_months`, `payments`, `recurring_schedules`,
  `recurring_exceptions`) and five index statements: four `CREATE INDEX` plus
  `CREATE UNIQUE INDEX "members_one_owner_idx" ON "members"("subscription_id") WHERE "is_owner" = 1`
  at `migrations/0003_members.sql:15`. The research undercounts the same way, listing "two indexes"
  for `0003`. The additive conclusion is unaffected and this review re-verified it independently, but
  the omitted statement is the one partial unique index in the set, that is, the only statement in
  the four files whose outcome could in principle depend on rows already present. It cannot here,
  because its table is created three lines above it, and that is worth saying out loud rather than
  leaving as an accident of the count.
- **Fix**: Correct the counts to seven tables and five index statements in the plan, the brief and
  the research, and add the half-sentence that the partial unique index is created on a table created
  in the same file, so no existing row can violate it.
- **Decision**: PENDING

### F7 - Phase 2's secret check cannot confirm what the phase says it confirms, and the real check is free

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Blind Spots
- **Location**: Phase 2, change 5; Progress row 2.11
- **Detail**: `wrangler secret list` returns names, never values, which the contract says and then
  leans on anyway: the expected state is a set of names, so the check proves `APP_ORIGINS` is set,
  not that it still resolves to the live origin. `src/server/auth.ts:19-25` throws outright when
  `APP_ORIGINS` resolves to no origins, and the research's own open question 4 calls the failure mode
  total, "every sign-in rejected". The plan does settle it, in phase 3's transcript, through the
  cross-origin refusal and the owner sign-in - but that is after the migration, which is the one step
  the plan otherwise takes great care to put last. The currently deployed build serves the same
  origin, so a single sign-in against it during phase 2 confirms the secret before anything is
  written.
- **Fix**: Add to phase 2 change 5 a sign-in against the current live build as the owner, recorded as
  a status code only, and state that it confirms `APP_ORIGINS` still resolves to the live origin.
  Reword the contract so the secret list is described as confirming the seeding secrets are absent,
  which is the thing it can actually prove.
- **Decision**: PENDING

### F8 - Two small gaps between what the live pass produces and what the goal rows need

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: End-State Alignment
- **Location**: Phase 5, change 3 (the evidence index); Phase 3, change 3; Testing strategy, risk
  mapping
- **Detail**: (a) B02 asks for CRUD where "refresh/restart preserves results" and test-plan risk 3
  names "a record that appeared to save is gone or altered after a reload, a restart or a migration".
  Every persistence proof in the plan is a re-read inside one continuous session, which is the
  strongest thing a stateless Worker request can show on its own. The cheapest evidence for the other
  half already sits in the plan's own ordering and is not used: phase 5 runs after the browser is
  closed, so one fresh sign-in there, re-reading the demo plan's summary and confirming the same
  balances, proves the rows outlived the session that wrote them and closes risk 3's reload clause
  against the deployment rather than against a local database. (b) Phase 5 change 3 adds index rows
  for S-04, D05, B08, B09, B10 and B12 only. The live pass is also the first evidence for B01, B02
  and B04 taken against the deployed build rather than a local one, and all three rows currently read
  "Partial". F01 asks for the missing goals to be listed explicitly, so either those rows cite the
  release evidence or the index says why the live pass does not move them.
- **Fix**: Add one step to phase 5 that signs in fresh, re-reads the demo plan's summary and records
  the balances, with a criterion asserting they match phase 4's; and extend phase 5 change 3 to name
  B01, B02 and B04 as either updated with the release artifacts or deliberately unchanged, with the
  reason.
- **Decision**: PENDING

## What is right, and worth not disturbing

The ordering argument is the strongest thing in this plan and it should survive triage untouched.
Documentation first because `mvp-check` grades the repository and the README is what a reviewer
follows before they see anything; snapshot before migration because it is the only step that cannot
be undone; migration before deploy because a new build over an old schema returns a database error on
every screen past the subscription list, on a URL that has already been shared. Each of those is
argued from a consequence rather than asserted, and the plan says plainly that the window is short
and the order costs nothing.

The build-provenance rule is the plan learning from its own evidence. `evidence/runs/deploy-1.md`
records that the first release was built from a working tree carrying unrelated uncommitted changes,
because `vite build` reads the tree rather than a git ref, so the quoted SHA did not describe the
bundle. Phase 2 pins the SHA from a verifiably clean tree and phase 3 re-checks `git status
--porcelain` immediately before the command rather than at the start of the phase, with the reason
given: other agents are pushing to `main`. That is the right shape, and F3 asks only that the same
rule reach one commit further back.

Redaction is treated as a rule with a precedent rather than a good intention. The transcript follows
`evidence/runs/deploy-1-live-smoke.txt`, which writes
`__Secure-better-auth.session_token=<redacted>` and keeps `HttpOnly; Secure; SameSite=Lax` visible so
the attributes stay evidence, and the automated criterion `rg -n "session_token=[^<]"` matches that
convention exactly. The export is routed to `evidence/private/`, which is genuinely ignored at
`.gitignore:14`, and `git check-ignore` is required before the file is written rather than after.
Credentials are stated as reaching a reviewer only through the authorized private channel, in the
plan, in the brief and in D-010, which is three places agreeing rather than one place hoping.

The `mvp-check` phase is honest about what the artifact is. It says in as many words that it is a
prompt at `archive/toolkit/.ai/prompts/mvp-check.md` and not a skill, that running it means executing
the prompt against this repository rather than invoking a command, and that every pass must cite a
path found by reading rather than taken from the plan's own list of expected evidence. The list it
gives is correct: payments carry all four verbs at `src/server/routes/payments.ts`, the
share-and-residual calculation is the business rule, test-plan risks 1 and 2 map to the calculation's
unit tests and the cross-account integration cases, and Better Auth with per-route ownership answers
the fourth.

The scope boundary around the course is drawn once, early, in bold, and then held. Nothing is
uploaded, B11, B13 and B14 stay open, no badge is claimed, and phase 5 change 6 states the package as
an inventory with an explicit line that nothing has been sent and that sending requires the user's
confirmation of that specific action. `GOALS.md` is correctly left to the designated status writer
and the goal-box updates are handed over by naming evidence paths, which is the right division given
that file lives outside this repository.

Lean Execution passes without a finding. Nothing is built, no phase could be removed without losing
evidence a goal row needs, and the one thing a release slice would normally be tempted to add, a
`DELETE /api/subscriptions/:id` to tidy the stray row, is refused by name with the domain reason.

## Resolution

Every finding was re-checked against the repository before being acted on, and every citation held.
`npx wrangler d1 time-travel --help`, `restore --help` and `info --help` were run against the pinned
`4.131.1` binary and confirm the two subcommands, `--bookmark`, `--timestamp` "within the last 30
days", and the "This command acts on remote D1 Databases" line; no command was run against an account.
The migration statements were recounted directly: seven `CREATE TABLE` and five index statements,
including the partial `CREATE UNIQUE INDEX "members_one_owner_idx"` the original count omitted. The
owner-less consequence was traced through `src/server/db/subscriptions.ts`, whose `create` inserts the
subscription, its owner member and the owner's opening range in one `db.batch`. One fact the review
did not have was found while resolving F2 and changes its Fix A: `src/server/routes/members.ts`
answers 409 to a delete of the owner member, before the dependents check, so the member Fix A proposed
creating on the stray subscription could never have been cleaned up. Resolved in `plan.md`,
`plan-brief.md`, `research.md` and
`context/decisions/D-010-live-demo-data-and-reviewer-access.md`.

| Finding | Decision | What changed |
|---|---|---|
| F1 | Accepted, all three parts | Time Travel is now the rollback. Phase 2 gains change 4, `d1 time-travel info` immediately before the phase closes, with the returned bookmark and the exact restore command recorded in the release summary, plus a manual criterion confirming the retention window against this account rather than reading it from help text, and a stop condition if Time Travel is unavailable. The rollback note (phase 2 change 6) now carries three ordered paths: restore in place to the bookmark, redeploy the previous version id for a bad build over an intact schema, and rebuilding from the export as a last resort for a lost database only, with the `d1_migrations` uncertainty stated. The step that replayed the export into the existing database is gone, and the note states the interaction the review found: once the database is rebuilt under a new id, the previous release version id stops being a valid fallback. The export survives unchanged as phase 2 change 5, retitled "The off-Cloudflare snapshot" so its job is not mistaken for the undo. The same rewrite lands in Key findings, Migration notes, the brief's decision table and architecture paragraph, and `research.md`. |
| F2 | Accepted, and resolved past both fixes | Fix A is not buildable as written: the owner member it creates on the stray subscription can never be deleted. Fix B's weakness, that the transcript's residue lands in the demo plan, is avoidable. The plan now does what neither option did. Phase 3 gains change 3, which creates the demo subscription, its two participants, its price and price change and its break month through the API, and adds a third non-owner participant for the CRUD cycle alone, removed in dependency order before the phase closes. Phase 3 change 4 repairs the stray subscription with an owner member and relabels it, with the refusal path recorded rather than worked around. Every transcript entry now names the subscription and member it acts on. Phase 4 no longer creates the plan; it records the money in the browser. Permanence is stated three times where it can be acted on: in the Overview, in phase 3 change 3, and in Migration notes, together with the rule that anything created to demonstrate a verb hangs off a deletable participant. D-010 was rewritten around this and now carries the owner-less fact, the two-half split, the permanence rule and the rejected "reuse the smoke-test subscription" option with its reason. |
| F3 | Accepted, both halves | Phase 1 change 6 no longer touches S-03: its status flip and `## Done` entry are left to its own archive procedure, and the contract now names the roadmap's own vocabulary and says S-04's edit here is the single step from `planning` to `in-progress`, since the status writer has already made the first move. Phase 2 change 1 gains the gate as its first clause: `reviews/impl-review.md` carries a `## Resolution` resolving its three required findings and `payments-and-recurring` is archived, and the release SHA is read at or after that commit. Two automated criteria pin it, one of them `git merge-base --is-ancestor`. Current state analysis records why, naming S-02's identical sequence, and the brief's prerequisite line was replaced. |
| F4 | Accepted | `release-05-tests-passing.png` moves to phase 2 as change 2, taken in the clean checkout with `git rev-parse HEAD` and the `npm test` run in one frame. Phase 4's screenshot contract now reads "nine captures taken in the browser from the live URL with the address bar visible, plus `release-05-tests-passing.png`", naming it as the one capture that is not a browser capture. A criterion in each phase asserts the SHA in the image equals the release SHA. |
| F5 | Accepted | The line-counting criterion is replaced by two: one `rg` matching each of the five criteria by name exactly once, and one asserting a pass or fail marker per criterion plus a percentage line. Phase 5 change 1 now says the report is written in English with the criteria named in English, following the prompt's structure rather than its language, and says why. |
| F6 | Accepted | Corrected to seven tables and five index statements in the plan's Key findings and Migration notes, in the brief, and in `research.md`, which now lists the three statements in `0003` individually. All four documents add the half-sentence the review asked for: the partial unique index is the only statement whose outcome could depend on existing rows, and it is created on a table created a few lines above it, so there are none. |
| F7 | Accepted | Phase 2 change 5 became change 7 and was reworded to claim only what `wrangler secret list` can prove, that the seeding secrets are absent and the other two exist. The origin check is now separate and before the migration: one owner sign-in against the current live build, recorded as a status code, with `src/server/auth.ts`'s throw-on-empty named as the reason it cannot wait for phase 3. An automated criterion covers it. |
| F8 | Accepted, both halves | Phase 5 gains change 3, a cold re-read in a fresh session with no cookie carried over, re-reading the demo plan's summary and payment list and asserting they equal what phase 4 recorded, with an automated criterion and a new manual testing step. The risk-mapping row for risk 3 now separates the migration half, closed by phases 2 and 3, from the reload half, closed here. Phase 5 change 4 now handles B01, B02 and B04 explicitly: each either gains a row citing the release artifacts or is stated as deliberately unchanged with the reason, because F01 asks for the missing goals to be listed explicitly. |

**Progress rows**: existing step titles are unchanged and no index was reused or renumbered. One row
was removed and eleven added. Removed: 4.10, whose stray-subscription work moved to phase 3, leaving a
gap. Added: 2.12 to 2.18 in phase 2, 3.12 to 3.15 in phase 3, 4.11 and 4.12 in phase 4, and 5.9 to
5.11 in phase 5. Row counts match the criterion bullets in both splits for every phase: 7/3, 13/5,
9/6, 3/8, 7/4.

Nothing in the review was rejected or deferred. F2 was resolved by a third option rather than either
of the two offered, for the reason recorded above; the review's ranking of Fix A over Fix B was sound
on the evidence it had, and the owner-member delete refusal is the fact that changes it.
