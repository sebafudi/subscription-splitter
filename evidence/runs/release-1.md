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
