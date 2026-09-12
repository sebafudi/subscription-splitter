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
verification pass and evidence. The one genuinely irreversible step is the migration, because the two
seeded accounts exist only in that remote database and nothing in `migrations/` reverses.

The slice also closes the Builder-track items that only a shipped release can answer: the acceptance
walkthrough (B08), the documentation check (B09), the course `mvp-check` run (B10), the final
screenshots (B12), and the live half of D05. It does not touch the items that require an upload.

## Current state analysis

`main` is at `b91762c`. `payments-and-recurring` is implemented and closed out through its own phase
5; `members-and-price-history` and `runtime-auth-slice` are archived. Repository-wide gates were last
recorded green at `09b763b` (typecheck clean, unit 15 files/185 tests, integration 10 files/103
tests) and the production build succeeded at `8e9a5ee`. Hosted CI has been green on every push to
`main`.

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
be removed, because the product exposes no `DELETE /api/subscriptions/:id`.

The documentation has outrun its own text in three places: `AGENTS.md` still says "Only the scaffold
exists so far", `README.md`'s first-run recipe still names two migrations and describes the
repositories as future work, and the roadmap still carries S-03 as `in-progress`. There is no
`infrastructure.md` in `context/foundation/`.

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

- The four unapplied migrations are purely additive: six `CREATE TABLE` statements, four
  `CREATE INDEX` statements, no `ALTER`, no `DROP`, nothing touching a Better Auth table. The seeded
  accounts survive.
- `wrangler d1 migrations list --remote` is a real dry run: it names the unapplied files without
  applying anything. If it names anything other than `0003` to `0006`, the remote database is not
  where this repository believes it is.
- `wrangler d1 export --remote --output=<path>` is the only rollback this project has, and its output
  contains password hashes and session tokens, so it belongs under `evidence/private/`.
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

- **Phase 1** needs nothing beyond `main`. It can start immediately and in parallel with the
  independent review of `payments-and-recurring` still landing under that change's `reviews/`.
- **Phase 2** needs phase 1 committed, because the release SHA it pins must be the tree whose
  documentation the release describes.
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

**Purpose**: The At a glance table and the item bodies carry S-03 as `in-progress` and S-04 as
`proposed`, which no longer matches `context/changes/payments-and-recurring/change.md` or this change.

**Contract**: S-03's status becomes `done` in both the table and its item body, with the `## Done`
entry the archive procedure writes. S-04's status becomes `planning` in both places while this plan is
being executed, and `in-progress` when its first phase lands. Only `Status` fields and the `## Done`
entry are touched, and the milestone's own status is not advanced here. If another agent has already
moved either item forward, the more advanced status is left alone.

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

Pin the release, prove the remote database is where this repository thinks it is, and take the only
backup that exists before anything is written to it. Nothing in this phase modifies the remote
database or the deployment.

### Required changes:

#### 1. The release candidate

**File**: none (commands and recorded output)

**Purpose**: Establish a tree that is verifiably clean and green, and read the SHA from it. The first
deployment's evidence records that it could not do this, and the release SHA it quoted did not exactly
describe the deployed bundle.

**Contract**: From a clean checkout of `main`: `git status --porcelain` empty, `npm ci`,
`npm run typecheck`, `npm test`, `npm run build`, and `npx wrangler deploy --dry-run` all succeed, and
`git rev-parse HEAD` is captured as the release candidate SHA. The test counts are captured verbatim,
not summarised. Hosted CI is confirmed green for that same SHA.

#### 2. The remote migration dry run

**File**: none (recorded output)

**Purpose**: Confirm the remote schema state before writing to it, and catch the case where the remote
database is not what the evidence says it is.

**Contract**: `npx wrangler d1 migrations list subscription-splitter-db --remote` is run and its
output recorded verbatim. It must name exactly `0003_members.sql`, `0004_prices_and_breaks.sql`,
`0005_payments.sql` and `0006_recurring.sql` as unapplied, and nothing else. If it names `0001` or
`0002`, or fewer than four files, the phase stops and the discrepancy is investigated before anything
is applied.

#### 3. The pre-migration snapshot

**File**: `evidence/private/pre-0003-remote-export.sql` (gitignored, never committed)

**Purpose**: This is the whole rollback plan. Nothing in `migrations/` is reversible, and the two
seeded accounts exist only in the remote database.

**Contract**: `npx wrangler d1 export subscription-splitter-db --remote --output=<path under
evidence/private/>` produces a non-empty file containing the schema and the contents of the `user`,
`session`, `account` and `subscriptions` tables. `git check-ignore` confirms the path is excluded
before the file is written, and `git status --porcelain` confirms it is untracked afterwards. The file
contains password hashes and session tokens and must never be committed, pasted into a transcript, or
attached to anything.

#### 4. The rollback note

**File**: `evidence/runs/release-1.md` (new, started in this phase)

**Purpose**: Record what recovery actually means before it is needed, so nobody has to invent it under
pressure.

**Contract**: A Rollback section states: the snapshot path and that it is gitignored; that the four
migrations have no down-migration; that recovery from a partially applied migration means recreating
the database from the snapshot with `wrangler d1 execute --remote --file`, which changes the database
id and therefore requires a `wrangler.jsonc` edit and a redeploy; and that recovery from a bad deploy
alone is a redeploy of the previous version, which needs no database work. It names the previous
release version id `e259b7b3-d932-4b3b-8b84-7446cab7d636` as that fallback.

#### 5. Secret and seeding state confirmed

**File**: `evidence/runs/release-1.md`

**Purpose**: Confirm the deployment's configuration before the release, and record that seeding stays
closed, per decision D-010.

**Contract**: `npx wrangler secret list` is run and the returned names recorded, values never. The
expected state is `BETTER_AUTH_SECRET` and `APP_ORIGINS` present, `SEED_ENABLED` and `SEED_TOKEN`
absent, `COOKIE_SECURE` absent. Any deviation is recorded and resolved before the deploy. No secret is
set, rotated or deleted in this phase.

### Success criteria:

#### Automated verification:

- The tree is clean at the moment of capture: `git status --porcelain` produces no output
- Typecheck passes: `npm run typecheck`
- The whole suite passes from a clean install: `npm ci && npm test`
- The production build succeeds: `npm run build`
- The deploy is valid without performing it: `npx wrangler deploy --dry-run`
- The dry run names exactly four unapplied migrations:
  `npx wrangler d1 migrations list subscription-splitter-db --remote`
- The snapshot exists, is non-empty, and is ignored:
  `test -s <path> && git check-ignore -v <path>`
- Hosted CI is green for the release candidate SHA: `gh run list --commit <sha>`

#### Manual verification:

- The snapshot was opened and confirmed to contain rows for both seeded accounts, then closed without
  copying anything out of it
- The rollback note describes a recovery that the person reading it could actually perform
- `wrangler secret list` shows no seeding secret, so the seed route is closed going into the release

**Implementation note**: Stop here for human confirmation before applying anything to the remote
database. This is the last reversible point.

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

#### 3. The live API transcript

**File**: `evidence/runs/release-1-live-smoke.txt` (new)

**Purpose**: Record, in a form someone can check, that the deployed instance enforces what the local
suite enforces. It follows the shape of `evidence/runs/deploy-1-live-smoke.txt`.

**Contract**: A trimmed, redacted transcript against the live URL, each entry showing the request and
its status code and, where it matters, a short body excerpt. The sequence covers, at minimum: the
health endpoint; `/api/me` with no cookie answering 401; a cross-origin sign-in attempt refused; the
sign-up endpoint still refusing with `EMAIL_PASSWORD_SIGN_UP_DISABLED`; sign-in as owner with the
`Set-Cookie` attributes visible and the token redacted; sign-out followed by the same cookie reaching
401; sign-in again; a payment created, re-read by a separate later request with every field intact,
patched, re-read again, deleted, and then answered 404; the subscription summary read before and after
those steps with the balance moving by exactly the amount; a member and a price change moving the same
numbers; the reviewer account answered 404 for the owner's subscription, member, price, payment,
schedule and summary by id, and an empty list for its own; a child record requested through a foreign
parent answered 404; and `POST /api/dev/seed` answered 404 with and without a token. Session tokens,
passwords and the seed token never appear.

#### 4. The release summary

**File**: `evidence/runs/release-1.md`

**Purpose**: The prose companion to the transcript, matching the precedent of
`evidence/runs/deploy-1.md`.

**Contract**: Extended with: the release version id, the release commit SHA and the live URL; the four
migrations applied and the post-apply list output; the local gate results captured in phase 2 with
their exact counts; a summary of the transcript's outcomes; and an explicit statement of what was not
exercised live, in the same spirit as the first deployment's closing note.

### Success criteria:

#### Automated verification:

- Every migration is applied remotely: `npx wrangler d1 migrations list subscription-splitter-db
  --remote` reports nothing unapplied
- The deploy returns a new version id and the live URL responds:
  `curl -s -o /dev/null -w '%{http_code}' https://subscription-splitter.sebastianfudalej.workers.dev/`
  is 200
- The API is the new build: `GET /api/subscriptions/<id>/summary` with a valid session returns 200
  rather than the 404 the old build would have produced
- Unauthenticated access is refused: `/api/me` without a cookie returns 401
- The seed route is closed: `POST /api/dev/seed` returns 404 with no token and with an arbitrary token
- A payment survives a separate later request: create, then read back in a new request with every
  field intact, then delete, then 404
- The transcript contains no credential: `rg -n "session_token=[^<]" evidence/runs/release-1-live-smoke.txt`
  returns nothing, and no password or seed token string appears

#### Manual verification:

- The balance shown by the live summary matches a hand calculation performed before the request was
  made, not after
- The transcript was read end to end for redaction before it was staged
- Sign-out genuinely invalidated the session: the same cookie, replayed, reached nothing
- What was not exercised live is stated in the summary rather than left to inference

**Implementation note**: Stop here for human confirmation that the live checks passed before starting
the walkthrough.

---

## Phase 4: Acceptance walkthrough and the final-release screenshots

### Overview

Walk the product in a browser against the release, as the organizer would, creating the demo plan
along the way per decision D-010, and capture the screenshots the submission package needs. This
phase answers B08 and B12 and D05's human half.

### Required changes:

#### 1. The demo plan, created through the product

**File**: none (the live database, through the running product)

**Purpose**: The live instance has no data a reviewer or a screenshot could use, and the seed route
cannot produce any. Creating it through the browser is both the fix and the acceptance walkthrough.

**Contract**: Signed in as the owner against the live URL: create one subscription whose start month
is several months behind the current month in its own time zone, so elapsed months exist; add the
owner and two participants with inclusive active ranges, one of which ends before the current month so
a departure is visible; record a price and then a later effective-dated price change; mark one break
month; record two payments, then edit one and delete the other; record one standing order and mark one
of its months as not received. Every name, amount and month is synthetic. The exact values used are
written into the release transcript as offsets from the plan's start month, so the state can be
recreated.

#### 2. The stray subscription

**File**: none (the live database)

**Purpose**: The first deployment left a subscription named "Deploy smoke test" on the owner account.
It cannot be deleted and cannot be re-dated.

**Contract**: It is renamed through the product to something honest that reads sensibly in a list next
to the demo plan. Its presence and the reason it cannot be removed are noted in the release summary,
so a reviewer seeing two rows is not left guessing.

#### 3. Error and refusal states

**File**: none (the browser)

**Purpose**: B08 asks for error states to be usable, not merely present.

**Contract**: Exercised live and captured: a payment dated before the plan's first month refused with
a message naming the date; deleting a participant who has payments or a standing order refused with a
message naming the reason; an overlapping standing order refused. Each refusal leaves the data
unchanged, confirmed by a reload.

#### 4. The second-account isolation pass

**File**: none (the browser)

**Purpose**: US-05 and the milestone's own done-when condition.

**Contract**: Signed in as the second account in the same browser session sequence: the subscription
list is empty, and the owner's subscription reached by its URL is refused. Captured as a screenshot
showing the empty state.

#### 5. The screenshot set

**File**: `evidence/screenshots/release-*.png`

**Purpose**: B12 requires four captures and offers a fifth. The existing fourteen screenshots are from
local per-slice walkthroughs and none is of the deployed instance, so the release set needs a naming
scheme that separates it from them and maps onto the form's own vocabulary.

**Contract**: Captured from the live URL with the address bar visible, named:

- `release-01-login.png` - the sign-in screen (the form's optional login screenshot)
- `release-02-home.png` - the post-login home screen listing the subscriptions
- `release-03-input-record-payment.png` - the main input feature: the payment form filled in
- `release-04-output-balances.png` - the main output feature: the detail screen's balances and summary
- `release-05-tests-passing.png` - the terminal showing `npm test` passing with its counts
- `release-06-members-and-prices.png` - membership ranges and the price history with the change
- `release-07-recurring-assumed-received.png` - standing-order months labelled assumed received, with
  the excepted month not counted
- `release-08-error-before-start-month.png` - the refused payment with its message
- `release-09-reviewer-sees-nothing.png` - the second account's empty list
- `release-10-narrow-phone.png` - the detail screen at a narrow phone width

No screenshot shows a password, a session cookie, a token or any non-synthetic value. The first five
are the ones the submission form asks for; the rest are supporting evidence.

#### 6. The walkthrough record

**File**: `evidence/runs/release-1.md`

**Purpose**: Tie the screenshots to the release they came from and make the demo state reproducible.

**Contract**: A Walkthrough section listing each step, its input values as offsets from the plan's
start month, what was observed, and which screenshot records it. It names the release version id at
the top so every capture is attributable to one build.

### Success criteria:

#### Automated verification:

- All ten screenshots exist with the specified names: `ls evidence/screenshots/release-*.png` returns
  ten files
- Each is a non-empty PNG: `file evidence/screenshots/release-*.png` reports PNG image data for all
- The release summary names every screenshot file:
  each filename appears in `evidence/runs/release-1.md`

#### Manual verification:

- The four form-required captures are unambiguous: home, input, output and passing tests are each
  identifiable without reading the filename
- The balances on the output screenshot match a hand calculation of the demo plan
- No screenshot shows a credential, a token, or a real person's name or amount
- Each refusal state left the data unchanged, confirmed by reloading after it
- The second account's empty list was captured in the same session as the owner's populated one, so
  the pair is evidence of isolation rather than of two different databases
- The layout is usable at a narrow phone width
- The stray smoke-test subscription was renamed, and the reason it cannot be removed is recorded in
  the release summary

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

**Contract**: The prompt is followed as written and its report produced in the format it specifies: a
checklist with an explicit pass or fail for each of its five criteria, a percentage, and prioritized
improvements for anything that fails. Every pass cites a file path or a function name actually found
in this repository. The prompt's own exclusions are respected: visual design, styling, polish,
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

#### 3. The evidence index

**File**: `evidence/index.md`

**Purpose**: It is the map from goal IDs to artifacts, and it is how the final package is audited.

**Contract**: Rows added for S-04 and for the goals this slice produced evidence for: D05, B08, B09,
B10 and B12. Each row names the artifacts by path (the transcript, the summary, the screenshot set,
the `mvp-check` report), the commit, and the release version id where the evidence is a live one. No
row claims a badge or an award.

#### 4. The work log

**File**: `evidence/work-log.md`

**Purpose**: The running narrative of the project, kept alongside the index.

**Contract**: An entry for this slice: what was migrated, what was deployed, what was verified live,
and what was found and fixed by the `mvp-check` run. Identified by change ID, commit and release
version id, with no calendar dates.

#### 5. The status hand-off

**File**: `context/STATUS.md`

**Purpose**: Another model has to be able to resume without asking the user anything.

**Contract**: The Deployment section is rewritten to describe the new release: version id, release
commit SHA, live URL, migrations `0001` to `0006` applied remotely, seeding still disabled and the
seed route confirmed closed, credentials still only in `evidence/private/`. The Active change section
records `verification-and-release` and its phase state. The Checks section records the gate counts
captured in phase 2. The Next executable action lists what remains: the submission package assembly
and the account-owner items, explicitly not performed here. Existing entries for other slices are not
rewritten.

#### 6. Goal boxes and the package inventory

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
- The report exists and covers all five criteria:
  `rg -c "^\s*[0-9]\." context/changes/verification-and-release/mvp-check.md` finds five
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
  and the empty list after the apply are its only checks, and they are in phase 2 and phase 3.
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
6. Sign in as the second account, confirm an empty list and a refusal for the owner's subscription by
   id.
7. Confirm `POST /api/dev/seed` answers 404.

### Risk mapping

| Test-plan risk | Where this slice touches it |
|---|---|
| 1 (a balance is wrong) | The hand calculation in phase 4, performed before the screen is read |
| 2 (one account reads another's records) | The second-account pass in phases 3 and 4, against the live instance |
| 3 (a record is gone after a reload, or a migration leaves the remote database behind the code) | The whole slice; the remote half of this risk is what phases 2 and 3 close |
| 4 (a standing order is counted for a month it should not cover) | The demo plan's excepted month and departed participant, captured in phase 4 |
| 5 (a month with no active participants) | Not exercised live; already covered by unit tests, recorded as such |
| 6 (a session outlives its sign-out) | The sign-out replay in phase 3 |

## Performance considerations

None. The deployment stays one Worker and one D1, the demo plan has three participants and a handful
of months, and no load is expected beyond a reviewer opening it. Performance tuning is an explicit
non-goal.

## Migration notes

The four migrations are additive: six `CREATE TABLE` and four `CREATE INDEX` statements, no `ALTER`,
no `DROP`, nothing touching a Better Auth table. Existing `user`, `session`, `account` and
`subscriptions` rows are unaffected, which is why the two seeded accounts survive.

There is no down-migration and this slice does not write one. The recovery path is the snapshot taken
in phase 2: recreating the database from it changes the database id, which means a `wrangler.jsonc`
edit and a redeploy. A bad deploy alone, with the schema intact, is recovered by redeploying the
previous version id, which needs no database work.

The apply is not idempotent in the sense of being safe to interrupt: a file that errors partway leaves
the schema between two versions and wrangler's bookkeeping disagreeing with reality. If that happens
the correct response is to stop, record the exact state, and use the snapshot - not to retry.

## References

- Research: `context/changes/verification-and-release/research.md`
- Decision: `context/decisions/D-010-live-demo-data-and-reviewer-access.md`
- Decision: `context/decisions/D-005-account-seeding.md`
- First deployment: `evidence/runs/deploy-1.md`, `evidence/runs/deploy-1-live-smoke.txt`
- Roadmap item: `context/foundation/roadmap.md` S-04
- Risks: `context/foundation/test-plan.md` §2
- Prior slice shape: `context/changes/payments-and-recurring/plan.md`
- Course minimum: `archive/toolkit/.ai/prompts/mvp-check.md`, `docs/MINIMUM-COMPLETION.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Documentation that describes what shipped

#### Automated

- [ ] 1.1 Typecheck passes
- [ ] 1.2 The whole suite passes
- [ ] 1.3 AGENTS.md no longer claims only the scaffold exists
- [ ] 1.4 The README first-run recipe no longer enumerates only two migrations
- [ ] 1.5 context/foundation/infrastructure.md exists and names the Worker, the database id and the secrets by name
- [ ] 1.6 No calendar date was introduced into any authored file
- [ ] 1.7 No secret value appears in any changed file

#### Manual

- [ ] 1.8 A reader following the README from a clean clone reaches a running app and a seeded account
- [ ] 1.9 Every corrected FR names the shipped route or domain function that implements it
- [ ] 1.10 The infrastructure document and the README Deploy section agree on every command and secret name

### Phase 2: Release preparation and the rollback that makes it safe

#### Automated

- [ ] 2.1 The tree is clean at the moment of capture
- [ ] 2.2 Typecheck passes
- [ ] 2.3 The whole suite passes from a clean install
- [ ] 2.4 The production build succeeds
- [ ] 2.5 The deploy is valid as a dry run
- [ ] 2.6 The migration dry run names exactly the four unapplied files
- [ ] 2.7 The snapshot exists, is non-empty and is gitignored
- [ ] 2.8 Hosted CI is green for the release candidate SHA

#### Manual

- [ ] 2.9 The snapshot was confirmed to contain both seeded accounts
- [ ] 2.10 The rollback note describes a recovery that could actually be performed
- [ ] 2.11 The secret list shows no seeding secret

### Phase 3: Remote migration, deploy, and the live verification transcript

#### Automated

- [ ] 3.1 Every migration is applied remotely and nothing is left unapplied
- [ ] 3.2 The deploy returns a new version id and the live URL responds 200
- [ ] 3.3 The live API is the new build, proven by a successful summary request
- [ ] 3.4 Unauthenticated access is refused
- [ ] 3.5 The seed route answers 404 with and without a token
- [ ] 3.6 A payment survives create, re-read, patch, re-read, delete and a final 404
- [ ] 3.7 The transcript contains no credential

#### Manual

- [ ] 3.8 The live balance matches a hand calculation made before the request
- [ ] 3.9 The transcript was read end to end for redaction before staging
- [ ] 3.10 Sign-out invalidated the session, proven by replaying the cookie
- [ ] 3.11 What was not exercised live is stated rather than left to inference

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
- [ ] 4.10 The stray smoke-test subscription was renamed and the reason it cannot be removed recorded

### Phase 5: The mvp-check run, the evidence index, and the hand-off

#### Automated

- [ ] 5.1 Typecheck passes
- [ ] 5.2 The whole suite passes
- [ ] 5.3 The mvp-check report exists and covers all five criteria
- [ ] 5.4 The evidence index names the transcript, the summary, the screenshot prefix and the report
- [ ] 5.5 No credential reached a committed file

#### Manual

- [ ] 5.6 Every pass in the mvp-check report was confirmed by opening the file it cites
- [ ] 5.7 A reader can follow STATUS to the release, the evidence and the next action without asking
- [ ] 5.8 The package inventory lists only what exists on disk and states that nothing was uploaded
