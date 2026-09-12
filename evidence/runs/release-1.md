# Release 1: the whole ledger on the deployed instance

Roadmap S-04, change `verification-and-release`. This file is the prose companion to
`evidence/runs/release-1-live-smoke.txt`, following the shape of `evidence/runs/deploy-1.md`. It is
written as the slice runs, so the sections below appear in the order the phases produced them.

## Release candidate

- **Release commit SHA:** `8ed342278443e371819c1be58a8042b94c507254` (`8ed3422`)
- **Gate:** the release SHA is at or after `0ff74bd`, the commit that archived
  `payments-and-recurring` once its implementation review was resolved (`904ebcc` applied the
  findings, `5d1cb80` recorded the resolution). Checked, not assumed:
  `git merge-base --is-ancestor 0ff74bd 8ed3422` exits 0.
- **Where it was verified:** a fresh `git clone` of the repository into a scratch directory, checked
  out at `8ed3422`, not the shared working copy. Other agents push to `main` concurrently, and
  `vite build` reads the working tree rather than a git ref; the first deployment's evidence records
  a release SHA that did not exactly describe the bundle for precisely that reason. Building from a
  throwaway clone is what makes the SHA and the bundle the same thing here.
- **Hosted CI:** green for this SHA, run `34716922381`, conclusion success.

### Gate results, captured verbatim

```
$ git status --porcelain
(empty: clean tree)

$ npm ci
clean install, exit 0

$ npm run typecheck
> tsc -p tsconfig.worker.json --noEmit && tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.node.json --noEmit
typecheck exit: 0

$ npm test
 Test Files  15 passed (15)
      Tests  185 passed (185)      <- unit

 Test Files  11 passed (11)
      Tests  112 passed (112)      <- integration
npm test exit: 0

$ npm run build
built, exit 0

$ npx wrangler deploy --dry-run
Total Upload: 1626.97 KiB / gzip: 348.99 KiB
Your Worker has access to the following bindings:
  env.DB (subscription-splitter-db)      D1 Database
--dry-run: exiting now.
dry-run exit: 0
```

**Regression comparison.** The last recorded repository-wide figures, at `904ebcc`, are typecheck
clean, unit 15 files and 185 tests, integration 11 files and 112 tests, build ok. The release
candidate matches all four exactly, so nothing regressed and nothing silently disappeared from the
suite. The tree was still clean after the build, because `dist/` is gitignored.

### The passing-tests capture

`evidence/screenshots/release-05-tests-passing.png`. It shows `git rev-parse HEAD`,
`git status --porcelain`, the typecheck and the `npm test` run in one frame, with
`8ed342278443e371819c1be58a8042b94c507254` and both pass counts legible. The SHA visible in the image
is the release SHA recorded above.

How it was produced, stated so nobody has to guess: the commands were run for real in the clean
checkout and their combined stdout captured; that captured text was then rendered into a terminal
frame and photographed with headless Chrome, which is the same tool this repository already uses to
render `evidence/architect/architect-report.pdf`. The content is genuine command output, not a
reconstruction. The only edit is that the scratch checkout's long absolute path is shortened to
`~/release-8ed3422` so the counts stay legible at readable type.

## Cloudflare account and token scope

`npx wrangler whoami`, recorded in full rather than as its warning alone, because the deploy depends
on it:

```
You are logged in with an OAuth Token, associated with the email sebastianfudalej@gmail.com.
Account Name: Sebastianfudalej@gmail.com's Account
Account ID:   b0c75f1b95e2170ef88369a765d57703
Token Permissions:
- user (read)
- offline_access
- account (read)
- workers_scripts (write)
- d1 (write)
```

Wrangler also prints a warning that the token is missing `workers:write`, `workers_kv:write`,
`workers_routes:write`, `workers_tail:read`, `pages:write`, `zone:read`, `ssl_certs:write`,
`ai:write`, `ai-search:write`, `ai-search:run`, `websearch.run`, `agent-memory:write`,
`queues:write`, `pipelines:write` and `secrets_store:write`.

The warning is not a blocker for this release, and the reason is worth writing down. `wrangler deploy`
uploads a Worker script, which is what `workers_scripts (write)` grants, and every remote database
operation this slice performs is covered by `d1 (write)`. Every scope on the missing list belongs to a
product this project does not use: KV, Pages, zones and certificates, Workers routes and tail, the AI
and search products, queues, pipelines, and the account-level secrets store. This release also sets,
rotates and deletes no secret at all, so `secrets_store:write` is not reached even incidentally. The
deploy itself is the only real proof, and its result is recorded in the phase 3 section below.

## Remote state before anything was written

### Migration dry run

`npx wrangler d1 migrations list subscription-splitter-db --remote`, which reports without writing:

```
Migrations to be applied:
┌────────────────────────────┐
│ Name                       │
├────────────────────────────┤
│ 0003_members.sql           │
├────────────────────────────┤
│ 0004_prices_and_breaks.sql │
├────────────────────────────┤
│ 0005_payments.sql          │
├────────────────────────────┤
│ 0006_recurring.sql         │
└────────────────────────────┘
```

Exactly the four expected files and nothing else. `0001_auth.sql` and `0002_subscriptions.sql` are
not listed, which is the confirmation that the remote database is the one this repository believes it
is and that it is two slices behind the code.

### Secret state

`npx wrangler secret list` returns exactly two names, values never requested or recorded:

```
APP_ORIGINS        secret_text
BETTER_AUTH_SECRET secret_text
```

This proves what it can prove and no more: `SEED_ENABLED` and `SEED_TOKEN` are absent, so the seed
route is closed going into the release, as decision D-010 requires; and `BETTER_AUTH_SECRET` and
`APP_ORIGINS` exist. `COOKIE_SECURE` is absent, which is the documented deliberate state for every
deployed environment.

### The live origin check

What the secret list cannot prove is that `APP_ORIGINS` still resolves to the live origin, and
`createAuth` in `src/server/auth.ts` throws outright when it resolves to no usable origin, so a wrong
value takes the whole deployment down rather than degrading. Settled separately, against the build
that was live before this release, before anything was migrated:

- `POST /api/auth/sign-in/email` as the owner, `Origin` set to the live URL: **200**
- `GET /` : **200**
- `GET /api/health` : **200**, body `{"ok":true}`

Status codes only. No token, cookie or password is recorded here or anywhere else in this file.

## The off-Cloudflare snapshot

`npx wrangler d1 export subscription-splitter-db --remote --output=evidence/private/pre-0003-remote-export.sql`

- `git check-ignore -v` was run on the path **before** the file was written and returned
  `.gitignore:14:evidence/private/`, so the path was already excluded when the bytes landed.
- Afterwards, `git status --porcelain evidence/private/` is empty: the file is untracked and ignored.
- Non-empty: 6132 bytes, 83 lines.
- Contents confirmed by opening it once and reading structure only, copying nothing out: seven tables
  (`d1_migrations`, `user`, `session`, `account`, `verification`, `rateLimit`, `subscriptions`), with
  two `user` rows, two `account` rows, five `session` rows and one `subscriptions` row. Both seeded
  account addresses appear exactly once each. That one `subscriptions` row is the first deployment's
  smoke-test artefact.

This file is not the undo. It is the only copy of the two accounts that survives losing the Cloudflare
account or the database itself, and the passwords behind those accounts exist nowhere in source. It
contains password hashes and session tokens and must never be committed, pasted into a transcript, or
attached to anything.

**One uncertainty in the plan is now resolved rather than carried.** The plan and the rollback note
below were written expecting it to be unknown whether the export carries wrangler's own
`d1_migrations` bookkeeping table. It does: `d1_migrations` is present in the export with two rows,
`0001_auth.sql` and `0002_subscriptions.sql`. A database rebuilt from this snapshot would therefore
report `0003` to `0006` as unapplied and `0001` and `0002` as applied, which is correct and means the
rebuild path does not need the bookkeeping repaired by hand.

## The Time Travel bookmark

Taken immediately before the migration, after everything else in this phase.

```
$ npx wrangler d1 time-travel info subscription-splitter-db
⚠️ The current bookmark is '00000004-00000004-000050e4-4b44a348d9f0423114786adc4ab9294f'
```

**Pre-migration bookmark:** `00000004-00000004-000050e4-4b44a348d9f0423114786adc4ab9294f`

### Retention, confirmed against this account rather than read from help text

The thirty-day figure in wrangler's help is the product's default, not a guarantee about this
account, so it was probed directly against this database with read-only
`d1 time-travel info --timestamp` calls:

| Timestamp offset | Result |
|---|---|
| 3 days back | bookmark returned |
| 10 days back | bookmark returned |
| 25 days back | bookmark returned |
| 29 days back | bookmark returned |
| 35 days back | refused: "Please provide a timestamp within the last 30 days" |

The window is thirty days for this database, which covers a migration applied minutes earlier by a
wide margin. Time Travel is available here, so the phase does not stop and the rollback story below
stands as written.

## Rollback

Three paths, in the order to reach for them.

**1. Primary, for a partially applied or unwanted migration.** Restore the database in place to the
bookmark recorded above:

```
npx wrangler d1 time-travel restore subscription-splitter-db --bookmark=00000004-00000004-000050e4-4b44a348d9f0423114786adc4ab9294f
```

This acts on the remote database in place and keeps the database id, so it needs no `wrangler.jsonc`
edit and no redeploy. It is one command with its argument already filled in, which is the whole point
of taking the bookmark before the write rather than reconstructing a timestamp afterwards.

**2. For a bad build over an intact schema.** Redeploy the previous version id
`e259b7b3-d932-4b3b-8b84-7446cab7d636`. This needs no database work at all. Reach for it when the
migration is fine and the Worker is not.

**3. Last resort, and only for a database that is actually lost.** Rebuild from
`evidence/private/pre-0003-remote-export.sql`: `wrangler d1 create` a new database,
`wrangler d1 execute --remote --file` the export into it, edit the `database_id` in `wrangler.jsonc`,
and redeploy. The export carries `d1_migrations` with `0001` and `0002` recorded, verified above, so
the rebuilt database reports the right four migrations as unapplied.

**The interaction between them, stated because it is easy to miss under pressure.** Once the database
has been rebuilt under a new id, path 2 stops being available: the previous release version
`e259b7b3-d932-4b3b-8b84-7446cab7d636` carries the *old* database id in its own configuration, so
redeploying it would point the Worker at a database that no longer exists.

**No step in this note replays the export into the existing database.** Every statement in that file
is a `CREATE TABLE` or an `INSERT` against objects that are already there; running it against the live
database would fail, and would not undo anything if it did not.

## The remote migration

`npm run db:migrate:remote`, against `subscription-splitter-db`
(`03067638-dc95-4b5c-9a8a-86f2921e0414`), with the bookmark above already recorded. All four files
applied in order, wrangler executing each one and re-reporting the table as it went:

```
0003_members.sql           ✅
0004_prices_and_breaks.sql ✅
0005_payments.sql          ✅
0006_recurring.sql         ✅
```

Immediately afterwards, `npx wrangler d1 migrations list subscription-splitter-db --remote`:

```
✅ No migrations to apply!
```

Nothing was left unapplied and no file errored partway, so the rollback note was not needed. The
remote database now carries `0001` through `0006`, which is every migration in `migrations/`.

## The deploy

Checked immediately before the command, in the clean release checkout rather than in the shared
working copy:

- `git status --porcelain` empty
- `git rev-parse HEAD` equal to the pinned release SHA `8ed342278443e371819c1be58a8042b94c507254`

`main` had moved on by three commits while phase 2 ran, all of them this slice's own documentation and
evidence plus one status sync. `git diff 8ed3422..HEAD -- src/ migrations/ package.json
package-lock.json wrangler.jsonc vite.config.ts index.html public/` is empty, so the pinned tree and
the tip of `main` describe identical product code and the release SHA is not stale in any way that
matters. Then `npm run deploy`:

- **Release version id:** `8e4fa506-cd63-412c-88f2-0101b6348bdb`
- **Release commit SHA:** `8ed342278443e371819c1be58a8042b94c507254`
- **Live URL:** `https://subscription-splitter.sebastianfudalej.workers.dev`
- Previous release, now superseded: `e259b7b3-d932-4b3b-8b84-7446cab7d636` at `149aa44d`
- Worker startup time 33 ms; three new or modified static assets uploaded; the `DB` binding resolved
  to `subscription-splitter-db`

The token scope question raised above is answered by this: `workers_scripts (write)` was sufficient
and the missing `workers:write` did not block the upload.

## The demo plan, and the values that recreate it

Created through the deployed API by the owner account, as decision D-010 requires, and not by any
seeding path or direct SQL. Months are written as offsets from the plan's own start month S, so the
same state can be rebuilt in any later month.

| What | Value |
|---|---|
| Name | Family music plan |
| Start month | S (`2026-03`); the current month at the time of the pass was S+6 |
| Currency, locale, time zone | PLN, pl-PL, Europe/Warsaw |
| Owner participant | Alex, created with the subscription, active from S |
| Participant | Blake, active from S, no leave month |
| Participant | Casey, active S to S+3, so a departure is visible |
| Price | 10000 minor from S |
| Price change | 12000 minor from S+4 |
| Break month | S+2 |

### The hand calculation, made before the summary was requested

| Month | Price | Active seats | Rounded share |
|---|---|---|---|
| S | 10000 | 3 | 3333 |
| S+1 | 10000 | 3 | 3333 |
| S+2 | 0 (break) | - | 0 |
| S+3 | 10000 | 3 | 3333 |
| S+4 | 12000 | 2 | 6000 |
| S+5 | 12000 | 2 | 6000 |
| S+6 | 12000 | 2 | 6000 |

Blake owes `3333*3 + 6000*3 = 27999`; Casey owes `3333*3 = 9999`; the plan has cost
`10000+10000+0+10000+12000+12000+12000 = 66000`.

The live summary returned, to the minor unit: `currentMonthly` 12000, `currentActiveCount` 2,
`currentPerPersonShare` 6000, `expectedThisMonth` 6000, `ownerShareThisMonth` 6000, `totalPlanCost`
66000, `owedToYouNow` 37998, `totalCollected` 0, `ownerNetCost` 66000, Blake owed 27999 balance
-27999, Casey owed 9999 balance -9999. Every one matches the calculation above, which was written
down first.

Two properties worth naming because they are the ones a spreadsheet gets wrong. The break month at
S+2 charges nobody while the months on either side are untouched. And the departure at S+3 does not
merely stop Casey's liability: it changes the divisor, so S+4 onward splits two ways at 6000 rather
than three ways, which is why Blake's later months cost him more than his earlier ones.

## What the transcript exercised

Full record in `evidence/runs/release-1-live-smoke.txt`. Outcomes:

- Root 200, `/api/health` 200, `/api/me` with no cookie 401
- Cross-origin sign-in refused 403, `INVALID_ORIGIN`
- Sign-up endpoint 400, `EMAIL_PASSWORD_SIGN_UP_DISABLED`, so it is disabled rather than merely
  failing validation
- Owner sign-in 200, with `HttpOnly; Secure; SameSite=Lax` visible on the cookie and the token
  redacted
- Sign-out 200, then the identical cookie replayed verbatim reached 401: the session was genuinely
  invalidated, not merely dropped by the client
- The demo plan built as tabulated above, the owner participant arriving with the subscription in one
  batch rather than by a second call
- Payment create 201, re-read in a separate later request with every field intact 200, patch 200,
  re-read again 200, delete 204, then 404. The balance moved by exactly 2500 on the create and exactly
  500 more on the correction, and returned when the payment was deleted
- A standing order counted the current month, adding exactly its 1000; marking that month not received
  withdrew exactly the same 1000, which is the assumed-receipt rule visible in one pair of requests
- Cleanup in dependency order: payment, schedule, then the participant, whose delete succeeded once it
  had no dependents. The summary after cleanup is identical to the hand-calculated baseline in every
  field, which is the proof that the demonstration left nothing behind
- A rename moved no money; correcting Casey's leave month from S+3 to S+4 moved Blake from 25999 to a
  different figure and Casey correspondingly, and putting it back restored the baseline exactly
- Deleting the opening price entry was refused 409, naming the three months that would be left
  unpriced. It was deliberately not repeated with `confirm=true`: the guard is the point, and the demo
  plan keeps its price history
- The reviewer account: an empty list of its own, and 404 for the owner's subscription, summary,
  members, a member by id, prices, schedules and break months, and for a write, a delete and a patch
- A child record reached through the wrong parent, inside the owner's own account, 404. This is the
  case that a repository passes by keeping the user predicate and dropping the subscription predicate
- `POST /api/dev/seed` 404 both with no token and with an arbitrary one

## The state the live pass leaves behind

The owner account ends with exactly two subscriptions and nothing else:

1. **Family music plan**, the demo plan, with Alex (owner), Blake and Casey R., two price entries, one
   break month, no payments and no standing orders.
2. **First deployment artefact (not the demo plan)**, which was "Deploy smoke test".

### What cannot be removed, and why

- **The demo subscription and its owner member are permanent.** The product exposes no
  `DELETE /api/subscriptions/:id`, and a delete of an owner member is answered 409 before the
  dependents check is even reached. Both were created on purpose and are kept on purpose.
- **The first deployment's artefact is permanent for the same reason**, which is why it was repaired
  rather than removed. It was created by the first deployment's smoke run before `0003_members.sql`
  had been applied remotely, so it carried no `members` row at all, a state the shipped build can no
  longer produce and which the detail screen draws as the degraded no-owner case. It was given an
  owner member opening at its own start month, which turns it into an ordinary empty plan, and
  renamed so a reviewer can tell it apart from the demo plan. Its `start_month` cannot be moved,
  because that field is deliberately not patchable, so it can never show elapsed history; that is why
  it is not the demo plan. The owner member created on it is itself permanent, which is accepted
  because the row it sits on is permanent anyway.

## What was not exercised live in this phase

Stated rather than left to inference, in the same spirit as the first deployment's closing note:

- Everything at the browser level. Phase 3 is API only; the screens, the forms and the rendered
  balances are phase 4's walkthrough.
- The archive flag on a participant, and the refusal to delete a participant who still has payments
  or a standing order. Both are covered by the integration suite against a local database, and
  neither was reproduced against the deployment.
- The refusal to delete an owner member, and the refusal of a second owner on one subscription. The
  first was reasoned about rather than provoked, because provoking it means attempting a delete that
  must not succeed on a live demo plan.
- Deleting a price entry with `confirm=true`, and deleting a break month. The guard was exercised;
  the destructive half deliberately was not.
- A payment dated before the plan's first month, and a future-dated payment. Both are covered by unit
  tests over `validatePaymentDate`.
- The sign-in rate limit. Exercising it means deliberately failing sign-ins against the live account,
  which would be indistinguishable in the logs from an attack on it.
