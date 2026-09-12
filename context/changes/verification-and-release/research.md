---
git_commit: b91762c
branch: main
repository: subscription-splitter
topic: "What the release slice has to settle before it is planned: how far behind the deployed instance is, what a remote migration over live accounts actually risks, how the live instance gets demo data now that the seed route cannot produce any, and what the Builder-track release items need that a deploy alone does not give them"
tags: [research, release, deployment, d1, migrations, seeding, evidence]
status: complete
---

# Research: verification-and-release

Date and researcher fields the schema lists are omitted; this repository records provenance by commit
and change ID. Findings are separated into **Evidence** (read from this repository, from its recorded
runs, or from official documentation), **Inference** (a conclusion drawn from evidence, stated as
such) and **Unknown** (must be settled by a command or a live check during implementation).

Nothing in this research was gathered by touching Cloudflare. The live state below is read from the
evidence files this repository already holds, and every claim about it is marked as inference until a
live check confirms it.

## Research Question

What does the release slice need before it is planned: how far the deployed instance has drifted from
`main` and what closing that gap costs, whether migrations `0003` to `0006` can be applied to a
database that already holds real accounts without losing them, whether the gated seed route and the
two seeded accounts still work after four schema changes, what a live pass has to exercise for D05 to
be answerable, what the documentation actually says that shipped behaviour has outgrown, what the
acceptance walkthrough and the final screenshots need that the existing screenshot set does not
already provide, and how the course `mvp-check` is run at all.

## Summary

The deployed instance is a two-slice-old build over a two-migration-old database. Release
`149aa44d9e80102f8ad425c6f9f684f5ef6d54aa` predates `members-and-price-history` and
`payments-and-recurring` entirely: the live Worker has no member, price, break-month, payment,
standing-order or summary route, and the remote database has only `0001_auth.sql` and
`0002_subscriptions.sql` applied. Every live verification recorded so far - sign-in, subscription
create and list, cross-account 404, the seed route closed - was recorded against that build, which is
why D05 reads "partial" and why S-04 cannot be closed by pointing at it.

Closing the gap is three commands and one genuine risk. The four unapplied migrations are purely
additive - seven `CREATE TABLE` statements and five index statements, every foreign key pointing at a
table that already exists or at one created in the same file, and not one `ALTER`, `DROP` or `UPDATE`
anywhere - so the `user`, `session` and `account` rows Better Auth wrote survive untouched and the two
seeded accounts keep working. That is the reassuring half. The other half is that this is still a
write against a live database whose only copy of those accounts is remote, and wrangler offers both a
real dry run and a real undo for it: `d1 migrations list --remote` names exactly the files that would
be applied, and `d1 time-travel restore` puts the same database back to a recorded bookmark in place,
without minting a new database id. D1 has no migration-down mechanism and none of the four migrations
was written with one, so Time Travel is the recovery path; a `d1 export --remote` snapshot is taken as
well, but as an off-Cloudflare backup for the case where the account or the database is lost
entirely, not as the planned undo.

The part that no command solves is demo data. The seed route creates accounts and nothing else: it
calls Better Auth's `signUpEmail` and returns, so it cannot produce a subscription, a member, a price
or a payment. The live database therefore holds two accounts and one artefact - the throwaway
"Deploy smoke test" subscription created during the first deployment's smoke run - and nothing a
reviewer or a screenshot could use. Worse, `start_month` is deliberately not patchable and there is no
`DELETE /api/subscriptions/:id` route at all, so that artefact can be renamed but neither
re-dated nor removed, and after the migration it is a subscription with no owner member, a state the
shipped build can no longer produce. The release has to create its demo plan through the running
product, as the organizer would, which is the same walkthrough B08 asks for and the same screens B12
needs. That convergence is what makes one live pass able to answer D05, B08 and B12 at once, and it is
recorded as decision D-010.

Everything the live pass creates is permanent unless the product itself can delete it. Payments,
prices, break months, schedules, exceptions and non-owner participants all have delete routes;
subscriptions and owner members do not. So the live pass has to be planned the way a migration is:
what it creates on purpose it keeps, and what it creates only to demonstrate a verb it removes with
that verb before the phase closes.

The documentation gap is smaller than it looks but sits in load-bearing places. `AGENTS.md` still
opens with "Only the scaffold exists so far". `README.md`'s first-run recipe still says the local
migration step applies `0001` and `0002`, and still describes `src/server/` as holding "later the
repositories". The roadmap carried S-03 as `in-progress` and S-04 as `proposed` when this was written
and has since caught up on its own. There is no
`infrastructure.md` anywhere in `context/foundation/`, which B09 names and which the organizer post
offers as an example rather than a mandate - the infrastructure story currently exists, correct but
scattered, across `README.md`'s Deploy section and `context/foundation/tech-stack.md`.

`mvp-check` is not a skill and cannot be invoked as one. It is a prompt file in the archived course
toolkit, `archive/toolkit/.ai/prompts/mvp-check.md`, that grades a repository against five criteria
from its files alone and explicitly refuses to score deployment, styling or polish. Four of its five
criteria are already satisfied by work on `main`; the fifth, documentation, is the one this slice's
first phase is aimed at anyway.

## Detailed Findings

### How far the deployed instance has drifted

**Evidence.** `context/STATUS.md` Deployment records the live URL
`https://subscription-splitter.sebastianfudalej.workers.dev`, release version id
`e259b7b3-d932-4b3b-8b84-7446cab7d636`, release commit
`149aa44d9e80102f8ad425c6f9f684f5ef6d54aa`, remote D1 `subscription-splitter-db`
(`03067638-dc95-4b5c-9a8a-86f2921e0414`), and migrations `0001_auth.sql` and `0002_subscriptions.sql`
applied with `--remote`. `evidence/runs/deploy-1.md` records the same set and lists the secrets that
were set: `BETTER_AUTH_SECRET`, `APP_ORIGINS`, and `SEED_ENABLED`/`SEED_TOKEN` which were deleted
again afterwards. `COOKIE_SECURE` was deliberately never set.

**Evidence.** `main` is at `b91762c`, eleven slices' worth of commits past the release. The routes on
`main` that the live build cannot have are members, prices, break months, payments, recurring and
summary - `src/server/index.ts:14-22` mounts nine route modules, of which the live build has three
(`auth`, `subscriptions`, `dev-seed`) plus `/api/health`.

**Inference.** The live instance can currently do exactly what the first smoke transcript shows it
doing and no more: sign in, create and list subscriptions, refuse a foreign subscription id. Anything
a reviewer tried beyond that would 404 at the API. This is the whole reason D05 is marked partial in
`GOALS.md:59`.

**Evidence.** `evidence/runs/deploy-1.md` carries a warning that matters for this slice: the release
build was produced from a working tree that carried uncommitted `src/domain/` changes from concurrent
work, because `vite build` reads the working tree rather than a git ref. The recorded release SHA
therefore does not exactly describe the deployed bundle.

**Inference.** A release whose SHA has to be quotable on a certification form cannot repeat that. The
build has to happen from a tree that `git status --porcelain` reports as empty, and the SHA has to be
captured from that same tree.

### Whether migrations 0003 to 0006 are safe against live accounts

**Evidence.** The four unapplied files contain only additive statements:

- `0003_members.sql`: `CREATE TABLE "members"`, `CREATE TABLE "active_ranges"`, and three index
  statements - `members_subscription_id_idx`, `active_ranges_member_id_idx`, and the partial
  `CREATE UNIQUE INDEX "members_one_owner_idx" ON "members"("subscription_id") WHERE "is_owner" = 1`.
- `0004_prices_and_breaks.sql`: `CREATE TABLE "price_history"`, `CREATE TABLE "break_months"`, no
  index.
- `0005_payments.sql`: `CREATE TABLE "payments"`, one index.
- `0006_recurring.sql`: `CREATE TABLE "recurring_schedules"`, `CREATE TABLE "recurring_exceptions"`,
  one index.

Seven tables and five index statements in total. Every foreign key references `subscriptions`,
`members` or `recurring_schedules`. No statement in any of the four touches a table Better Auth owns,
and none is an `ALTER`, a `DROP`, an `UPDATE` or a `DELETE`. The partial unique index is the only
statement in the set whose result could in principle depend on rows that already exist, and it cannot
here: it is created on a table created a few lines above it in the same file, so there are no rows for
it to reject.

**Inference.** Applying them remotely cannot lose the `user`, `session` or `account` rows, so the
owner and reviewer accounts survive and their passwords keep working. The failure mode that remains is
partial application: a file that errors halfway leaves the database between two schema versions, and
wrangler's migration bookkeeping then disagrees with the actual schema.

**Evidence.** The same four migrations have been applied in order to a clean local D1 and verified,
twice: at `8e9a5ee` (`0001` to `0006`) and again as Progress rows 2.4 and 3.4 of the
`payments-and-recurring` plan. That proves the files are well-formed; it does not prove they apply
cleanly on top of a database that already has rows in `0001` and `0002`'s tables.

**Evidence (official documentation).** `wrangler d1 migrations list [DATABASE] --remote` lists the
unapplied migration files for a remote database without applying anything. `wrangler d1 migrations
apply [DATABASE] --remote` applies them and prompts for confirmation in an interactive shell.
`wrangler d1 export [NAME] --remote --output=<path>` writes the schema and contents of the remote
database to a `.sql` file, with `--no-data` and `--no-schema` available to take only one half.

**Evidence (the pinned binary's own help output, wrangler `4.131.1`).** `wrangler d1 time-travel` has
two subcommands. `time-travel info <database>` retrieves information about the database at a point in
time, optionally `--timestamp`, and returns a bookmark. `time-travel restore <database>` takes
`--bookmark` or `--timestamp`, the latter documented as "Accepts a Unix (seconds from epoch) or RFC3339
timestamp ... to retrieve a bookmark for (within the last 30 days)". Both print "This command acts on
remote D1 Databases" and link to Cloudflare's Time Travel reference. Neither was run against an
account for this research; only `--help` was invoked.

**Inference.** `migrations list --remote` is the dry run this slice needs: if it names exactly
`0003_members.sql`, `0004_prices_and_breaks.sql`, `0005_payments.sql` and `0006_recurring.sql` and
nothing else, the remote state matches what the evidence says it is. If it names `0001` or `0002` as
well, the remote database is not where this repository believes it is and the slice stops there.

**Inference.** Time Travel is the recovery path, not the export. A bookmark recorded with
`time-travel info` immediately before the apply, restored with `time-travel restore --bookmark=<value>`
if the apply fails partway, puts the same database back in place: no new database id, so no
`wrangler.jsonc` edit and no redeploy, and a migration applied minutes earlier sits far inside the
thirty-day window the restore help documents. That is one command with an argument captured before the
irreversible step rather than reconstructed after it.

**Inference.** The `d1 export --remote` snapshot is still worth taking, for a different failure than
the one the migration can cause: it is the only copy of the two accounts that survives the loss of the
account or the database itself, and the passwords behind them exist nowhere in source. It is a backup,
not the undo. Rebuilding from it is a last-resort path and an awkward one - it needs a freshly created
database, then `d1 execute --remote --file`, then a `wrangler.jsonc` edit, then a redeploy - and
whether the export carries wrangler's own `d1_migrations` bookkeeping table is unverified here, which
decides whether a rebuilt database can be migrated afterwards at all. Replaying it into the existing
database is not a recovery at all: every statement in it is a `CREATE TABLE` against a table that is
already there.

**Inference.** The two recovery paths are not independent. Rebuilding under a new database id
invalidates the otherwise-obvious "redeploy the previous version id" fallback, because release
`e259b7b3-d932-4b3b-8b84-7446cab7d636` carries the old database id in its own recorded configuration.
The deploy-only fallback is valid for a bad build over an intact schema, and only then.

**Evidence.** The export must not be committed: it contains password hashes and session tokens, so it
belongs under `evidence/private/`, which `.gitignore:14` already excludes, or outside the repository
entirely.

**Unknown.** Whether Time Travel's thirty-day retention applies in full to this account's plan. The
window is read from the pinned binary's help text, and the help links to documentation that neither
this research nor the plan has checked against the account. Settled by reading that reference and
running `time-travel info` in phase 2, before the apply.

### Whether the seed route and the reviewer accounts still work

**Evidence.** `src/server/routes/dev-seed.ts` registers `POST /api/dev/seed` unconditionally and
evaluates both gates inside the handler, answering 404 when `SEED_ENABLED` is off or the
`x-seed-token` header is wrong, so the response is an oracle for neither (decision D-005). When the
gates pass it builds an auth instance with `disableSignUp: false` and calls `signUpEmail`, returning
`{email, created}`. An already-existing account returns `created: false` rather than failing.

**Evidence.** `evidence/runs/deploy-1.md` records `SEED_ENABLED` and `SEED_TOKEN` deleted after
seeding, and `evidence/runs/deploy-1-live-smoke.txt` records `POST /api/dev/seed` with the old token
answering 404 afterwards. Secrets deleted with `wrangler secret delete` take effect without a
redeploy.

**Inference.** The route is closed on the live instance and stays closed unless the two secrets are
set again. Because it only creates accounts, and because the accounts it created are unaffected by
the four additive migrations, it does not need to be reopened at all for this slice: there is nothing
it could add that the release needs.

**Unknown.** Whether `owner@example.com` and `reviewer@example.com` can still sign in on the redeployed
build. Better Auth's own tables are untouched, so the expectation is yes, but the passwords live only
in `evidence/private/reviewer-credentials.md`, which is gitignored and deliberately not read here.
Settled by the first sign-in of the live pass; if it fails, reopening the seed route with a fresh
token and re-seeding is the documented recovery, and the route's idempotency makes that safe.

### What the live instance holds now, and why demo data is a problem

**Evidence.** `evidence/runs/deploy-1-live-smoke.txt` records `POST /api/subscriptions` as owner
returning 201 for a subscription named "Deploy smoke test" with `startMonth` `2026-09`, and the
following list call returning that one row. The reviewer account's list returned `[]`.

**Inference.** The owner account's home screen on the live instance currently shows exactly one
subscription, named "Deploy smoke test", with no members, no prices and no payments, and the reviewer
account's home screen shows none. Neither is a screen worth screenshotting for a certification form.

**Evidence.** That subscription has no `members` row at all, and cannot have one: it was created by
release `149aa44d` at a time when `0003_members.sql` had not been applied remotely, so the table did
not exist. The shipped build can no longer produce that state - `src/server/db/subscriptions.ts`
inserts the subscription, its owner member and the owner's opening range in one `db.batch`, with the
comment citing D-006 that "a subscription that exists without an owner member has no defined
per-person share".

**Inference.** After the migration, that row becomes a subscription the current product treats as an
anomaly. `src/client/screens/SubscriptionDetail.tsx` resolves `members.find((member) => member.isOwner)`
to `undefined` on it, which is the degraded no-owner state the local capture
`evidence/screenshots/detail-no-owner-state.png` already records. It is a handled state rather than a
crash, but it is not a state a reviewer should be shown without explanation.

**Evidence.** The repair is one call: `POST /api/subscriptions/:id/members` accepts `is_owner: true`
(`src/server/validation/members.ts`, whose comment says the field is schema-valid and is refused by
the partial unique index, making a second owner a 409 rather than a 400), and
`src/server/routes/members.ts` maps that violation to 409 with `DUPLICATE_OWNER`.

**Evidence.** The repair is also permanent. `src/server/routes/members.ts` answers 409 to a delete of
the owner member - "the owner member cannot be deleted; every subscription keeps exactly one" - before
it ever reaches the dependents check. A non-owner participant, by contrast, is hard-deleted by
`remove` in `src/server/db/members.ts` once `hasDependents` returns false, so a participant created for
a transcript can be cleaned up and an owner cannot.

**Evidence.** Neither a payment nor a standing order may name the owner member: `src/server/routes/payments.ts`
and `src/server/routes/recurring.ts` each carry an owner refusal constant. So a payment CRUD cycle
needs a non-owner participant, which is exactly the kind that can be removed afterwards.

**Evidence.** `src/server/validation/subscriptions.ts` documents and enforces that `start_month` is
not among the patchable fields: a patch carrying it is a 400, because every stored range, price entry
and break month is validated against it on the way in. `src/server/routes/subscriptions.ts` registers
`GET`, `POST`, `GET /:id` and `PATCH /:id` - there is no `DELETE` route for a subscription at all.

**Inference.** The smoke-test subscription can be renamed but not re-dated and not removed through any
route the product exposes. A demo plan needs elapsed months behind it for standing orders, price
changes and break months to show anything, so it needs an earlier start month, so it has to be a new
subscription. The stray row stays on the list unless it is renamed into something honest.

**Evidence.** The seed route cannot help: `signUpEmail` and nothing else.

**Inference.** Demo data has to be created through the running product by the owner account. That is
not a workaround - it is the acceptance walkthrough B08 asks for, performed against the release, and
the screens it passes through are the ones B12 needs. Recorded as decision D-010, together with the
two alternatives rejected: extending the seed route to write domain rows, which widens a
security-sensitive gated surface on a live deployment for a one-time need, and writing rows with
`d1 execute --remote`, which bypasses the validation and ownership rules the product exists to
demonstrate and would put rows in the database that no route could have produced.

### What a live pass has to exercise for D05

**Evidence.** `GOALS.md:59` states D05 as "Live login/logout, CRUD persistence, balances and ownership
isolation verified. Deployment evidence matches final release," and records the partial credit as
login, subscription CRUD and isolation on release `149aa44d`.

**Evidence.** The surface that has to be reachable live is twenty-nine routes across nine modules
(`src/server/index.ts`), of which the four-verb payment set (`POST`, `GET`, `PATCH`, `DELETE` under
`/api/subscriptions/:id/payments`) is the one B02 names as the persistent full CRUD.

**Inference.** A pass that answers D05 has to cover, against the live URL: sign-in and sign-out with
the session actually invalidated; create, read, update and delete of a payment with a reload between
each step so persistence is proven by re-reading rather than by the response body; a balance that
matches the hand-computed example in US-01 before and after those edits; a member and a price change
moving the same numbers; and the reviewer account failing to reach any of it by id. The existing local
evidence covers all of that against a local database (`evidence/screenshots/`, fourteen files), which
is what makes the live pass a repetition rather than a discovery - but it is the repetition that D05
asks for, because the phrase is "deployment evidence matches final release".

**Evidence.** `evidence/runs/deploy-1-live-smoke.txt` is the format precedent: a trimmed,
cookie-scrubbed transcript of status codes and bodies with the session token redacted, paired with a
prose summary in `evidence/runs/deploy-1.md`. The redaction is not cosmetic - the raw transcript would
carry a live session cookie for a seeded account.

### What the documentation actually needs

**Evidence.** `AGENTS.md` opens: "Only the scaffold exists so far." Four slices later that is simply
false, and `AGENTS.md` is the file another agent reads first.

**Evidence.** `README.md`'s first-run recipe says `npm run db:migrate:local` "applies 0001_auth.sql
then 0002_subscriptions.sql"; there are six migrations. Its Layout section describes `src/server/` as
holding "the Hono app, routes, and later the repositories that own all SQL"; `src/server/db/` has held
six repositories since S-02. Its Test section describes unit tests as covering the calculation and the
validation schemas, which is still accurate.

**Evidence.** `README.md`'s Deploy section is otherwise accurate and unusually complete: one-time
remote D1 creation, the `APP_ORIGINS`-after-first-deploy ordering, secret handling through
`wrangler secret put`, the seeding procedure, and the instruction to delete `SEED_ENABLED` and
`SEED_TOKEN` afterwards and confirm the 404. It already names S-04 as the slice where remote seeding
happens.

**Evidence.** At the commit this research was written against, `context/foundation/roadmap.md`'s At a
glance table carried S-03 as `in-progress` and S-04 as `proposed`, and
`context/changes/payments-and-recurring/change.md` had `status: implemented` with its Progress section
fully checked through phase 5. Both have since moved: S-03 was archived at `0ff74bd` to
`context/archive/payments-and-recurring/` with `status: archived` and its roadmap item flipped to
`done`, and the status writer moved S-04 to `planning`.

**Evidence.** `context/foundation/` holds `prd.md`, `roadmap.md`, `test-plan.md`, `tech-stack.md`,
`shape-notes.md` and `bootstrap-verification.md`. There is no `infrastructure.md`.

**Evidence.** `docs/MINIMUM-COMPLETION.md` records that the official `mvp-check` minimum is a useful
README plus a PRD or equivalent and a test plan naming the tested risk, and that `infrastructure.md`
and `roadmap.md` are organizer examples rather than an exclusive mandatory schema. B09 nevertheless
names infrastructure among the documents that must reflect shipped behaviour.

**Inference.** A short `context/foundation/infrastructure.md` is the cheapest way to answer B09
honestly: it collects what already exists and is scattered - the Worker, the remote D1 and its id, the
secrets by name, the migration procedure, the local/remote separation, and the deliberate fact that CI
does not deploy - into the file the organizer's example list expects. It duplicates rather than
replaces the README's Deploy section, so the two have to agree, and a release slice is the moment when
both are being touched anyway.

**Evidence.** `context/foundation/prd.md` carries its behaviour in sections §Business Logic, §Access
Control, §Functional Requirements (FR-001 to FR-026) and five user stories, all written before
implementation. `context/foundation/test-plan.md` carries six risks with a response-guidance table,
and §8 is a Freshness Ledger.

**Inference.** The PRD and test plan need a verification pass rather than a rewrite: the question is
whether any FR or risk response describes something the implementation decided differently, and the
four decisions recorded since (D-006 to D-009) are where such a divergence would have entered. The
test plan's Freshness Ledger is the one section that certainly needs an entry, because it exists to
record exactly this.

### What B08, B12 and B10 need

**Evidence.** B08 asks for a browser acceptance walkthrough on synthetic data with post-login, input,
output and error states usable, and notes a selected E2E smoke test as extra assurance rather than a
coverage requirement.

**Evidence.** B12 asks for post-login/home, main input feature, main output feature and passing tests,
plus an optional login screenshot. `docs/MINIMUM-COMPLETION.md` confirms the live form requires the
first four and labels the login one optional but useful.

**Evidence.** `evidence/screenshots/` holds fourteen files from the S-02 and S-03 local walkthroughs,
named by what they show (`detail-worked-example.png`, `payments-balance-after-payment.png`). None of
them is of the deployed instance, and none is a home screen or a passing-test run.

**Inference.** The final set needs its own naming scheme that distinguishes it from the local
per-slice captures, both so the submission package can be assembled by pattern and so nobody has to
guess which capture came from the release. A `release-` prefix with the form's own vocabulary
(`release-01-login`, `release-02-home`, and so on) does both.

**Evidence.** `mvp-check` is `archive/toolkit/.ai/prompts/mvp-check.md`, a prompt rather than a skill:
it is not in `archive/toolkit/.ai/skills/`, which holds thirty entries, none of them `mvp-check`. It
grades five criteria - CRUD on persistent data with all four verbs for at least one core item type,
one real business rule beyond CRUD, at least one test suite tied to a risk named in a test plan,
user-linked authentication, and documentation starting from `context/` - and explicitly excludes
visual design, polish, accessibility and whether the app is deployed at all. It requires each pass to
cite file paths or function names actually found.

**Inference.** Running it means executing the prompt against this repository and writing the report it
asks for, not invoking a command. Four criteria are already answerable from `main`: payments carry all
four verbs (`src/server/routes/payments.ts`), the share-and-residual calculation is the business rule
(`src/domain/calc.ts`), `context/foundation/test-plan.md` risk 1 maps to `src/domain/calc.test.ts` and
risk 2 to the cross-account cases in `tests/integration/`, and Better Auth with per-route ownership
enforcement answers the fourth. Documentation is the fifth, and it is what phase 1 is for - which is
why the run belongs after the documentation phase rather than before it.

## Code References

- `src/server/index.ts:14-22` - the nine route modules mounted; the live build has three of them.
- `src/server/routes/dev-seed.ts:16-42` - the gated seed handler; creates an account and nothing else.
- `src/server/validation/subscriptions.ts:41-52` - `start_month` deliberately not patchable, with the
  reason.
- `src/server/routes/subscriptions.ts` - `GET`, `POST`, `GET /:id`, `PATCH /:id`; no `DELETE`.
- `src/server/db/subscriptions.ts` - `create` inserts the subscription, its owner member and the
  owner's opening range in one `db.batch`, citing D-006.
- `src/server/routes/members.ts` - the owner member's delete answers 409 before the dependents check;
  a duplicate owner answers 409 from the partial unique index.
- `src/server/db/members.ts` - `remove` hard-deletes a non-owner participant once `hasDependents` is
  false.
- `src/client/screens/SubscriptionDetail.tsx` - `members.find((member) => member.isOwner)`, which is
  `undefined` on an owner-less subscription.
- `src/server/routes/payments.ts` - the four-verb CRUD set B02 and `mvp-check` criterion 1 rest on,
  and the owner refusal that keeps money off the owner member.
- `migrations/0003_members.sql`, `0004_prices_and_breaks.sql`, `0005_payments.sql`,
  `0006_recurring.sql` - additive only.
- `scripts/seed-local.mjs:36-58` - the seeding client; honours `SEED_TARGET_URL`, reads `.dev.vars`.
- `package.json:13-14` - `db:migrate:local` and `db:migrate:remote`.
- `.gitignore:14` - `evidence/private/` excluded, where the pre-migration export and the credentials
  belong.
- `AGENTS.md:5` - "Only the scaffold exists so far".
- `README.md` - Database first-run recipe naming two migrations; Layout describing repositories as
  future.

## Architecture Insights

- **The release is a data migration, not a deployment.** The deploy itself is one command that has
  already been run once successfully. The risky part is the four migrations against a database whose
  accounts exist nowhere else, and Time Travel is what makes it recoverable rather than irreversible.
- **The product's own refusal to expose a subscription delete is felt for the first time here.** It is
  the right rule for the domain - history is archived, never hard-deleted, per `AGENTS.md` - and it
  means release housekeeping has to be done by renaming rather than removing. The same rule protects
  the owner member, so anything the live pass needs to undo has to hang off a non-owner participant.
- **One live pass answers four goals.** D05, B08 and B12 all want the same browser session against the
  same release; splitting them into separate passes would produce three sets of evidence that could
  disagree about which build they saw.
- **Evidence discipline is what makes the release quotable.** Every recorded run in this repository
  pairs a machine transcript with a prose summary and a commit; the release's own evidence has to
  match that shape or the evidence index stops being uniform.

## Historical Context (from prior changes)

- `evidence/runs/deploy-1.md` and `deploy-1-live-smoke.txt` - the first deployment, and the format
  every live transcript here follows. Its closing note already scopes what it did not check:
  "Subscription CRUD beyond create/list (patch, delete) was not separately exercised live."
- `context/decisions/D-005-account-seeding.md` - why accounts are created through a gated route rather
  than by self-registration, and why the gate answers 404 rather than 403.
- `context/archive/runtime-auth-slice/` - the slice that established live verification by Chrome
  walkthrough, and whose Progress row 5.3 is closed by explanation rather than checked because no pull
  request was ever opened.
- `context/archive/payments-and-recurring/plan.md` - the five-phase shape, the Progress contract, and
  a phase 5 that is evidence-only, which this slice's last phase mirrors.
- `context/foundation/test-plan.md` risk 3 - "a migration leaves the remote database behind the code"
  is named there as a top risk, and this slice is the one that either closes it or realises it.

## Open Questions

None blocking. Six items are settled by a command during implementation rather than by more reading:

1. Whether `migrations list --remote` names exactly the four expected files. If it names more or
   fewer, the remote database is not where the evidence says and the plan's phase 2 stops.
2. Whether the two seeded accounts still sign in after the redeploy. Expected yes; recovery is
   documented and idempotent.
3. Whether the stray "Deploy smoke test" subscription is still on the live owner account. Expected
   yes; if it is absent the rename and repair steps are skipped and nothing else changes.
4. Whether `APP_ORIGINS` is still correct for the release. It was set to the workers.dev origin and
   the origin has not changed, so the expectation is yes, but its failure mode - every sign-in
   rejected, because `src/server/auth.ts` throws when the variable resolves to no origins - is total,
   which is why the plan settles it with a sign-in against the current build in phase 2 rather than
   waiting for the post-migration transcript.
5. Whether an owner member added to the stray subscription is accepted, given that its start month is
   the month of the first deployment. `validateActiveRanges` runs the opening range against
   `subscription.startMonth`, so a range opening at that month should pass, but it is the repair's
   first live check. If it is refused, the row keeps its label and stays owner-less.
6. Whether Time Travel's thirty-day window applies in full to this account's plan, and whether
   `d1 export` carries the `d1_migrations` bookkeeping table. The first is checked in phase 2 before
   the apply; the second only matters on the last-resort rebuild path, which the plan no longer treats
   as the recovery.
