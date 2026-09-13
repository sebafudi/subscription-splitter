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

How it was produced: the four commands were typed into a real Terminal window sitting in the clean
checkout at the release SHA, and that window was photographed once they finished. The typed command
line is the first thing in frame, the full SHA is the first line of output, and the SHA is echoed
again at the bottom under `--- release SHA again ---` so the run is bracketed by the commit it
describes. Nothing in the image is typeset, composed or edited; the capture is of that one window
only, by its window id, so nothing else on the machine is in frame. The long scratch path is visible
as it really is.

## Cloudflare account and token scope

`npx wrangler whoami`, recorded in full rather than as its warning alone, because the deploy depends
on it:

```
You are logged in with an OAuth Token, associated with the email <owner-email redacted>.
Account Name: <owner-email redacted>'s Account
Account ID:   <account-id redacted>
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
- A rename moved no money; correcting Casey's leave month from S+3 to S+4 moved Blake from 27999 down
  to 25999 and Casey from 9999 up to 13999, because S+4 then splits three ways at 4000 instead of two
  ways at 6000, and putting the leave month back restored the baseline exactly
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
  first was left unprovoked to keep the live pass free of deletes aimed at permanent rows: the
  dependents refusal was provoked live without incident, so the reason is not that a 409 was
  doubted, it is that the only way to ask for this one is to send a delete at a row that can never
  be recreated if the refusal ever failed to hold. `tests/integration` covers both refusals.
- Deleting a price entry with `confirm=true`, and deleting a break month. The guard was exercised;
  the destructive half deliberately was not.
- A payment dated before the plan's first month, and a future-dated payment. Both are covered by unit
  tests over `validatePaymentDate`.
- The sign-in rate limit. Exercising it means deliberately failing sign-ins against the live account,
  which would be indistinguishable in the logs from an attack on it.

## Walkthrough, release version `8e4fa506-cd63-412c-88f2-0101b6348bdb`

Every capture below came from this release, in one browser session against the live URL, signed in as
the owner except where the second account is named. Months continue to be written as offsets from the
demo plan's start month S. This section continues the input list above rather than starting a second
one.

### What was recorded in the browser

| Step | Input | Observed | Capture |
|---|---|---|---|
| Sign in | owner account | The sign-in screen, then the subscription list | `release-01-login.png`, `release-02-home.png` |
| Payment 1 | Blake, dated S+6, 150,00 zł, "September transfer" | Blake moved from owing 279,99 zł to owing 129,99 zł, exactly 150,00 zł | `release-03-input-record-payment.png` |
| Payment 2 | Casey R., dated S+5, 120,00 zł, "August transfer, settling early" | Casey moved from owing 99,99 zł to being ahead by 20,01 zł, which is 120,00 less 99,99 | |
| Edit payment 1 | 150,00 zł corrected to 180,00 zł | Blake moved to owing 99,99 zł, following the correction by exactly 30,00 zł | |
| Standing order | Blake, 30,00 zł a month from S+4, still running | Three elapsed months counted, 90,00 zł assumed received, Blake down to owing 9,99 zł | `release-07-recurring-assumed-received.png` |
| One month not received | S+5 of that standing order | The month redrawn as "not counted, marked as not received", the total back to 60,00 zł over 2 of 3 elapsed months, Blake at owing 39,99 zł | `release-07-recurring-assumed-received.png` |

Everything in that table is kept. It is the demo state a reviewer opens.

### The final state, against a hand calculation

Computed before the screen was read, from the rules rather than from the response:

- Blake owes the same 279,99 zł as before, because payments change what is paid and never what is
  owed. Against that sits 180,00 zł recorded by hand plus the standing order's two counted months at
  30,00 zł each, 60,00 zł, giving 240,00 zł paid and a balance of 39,99 zł owing.
- Casey R. owes 99,99 zł against 120,00 zł paid, so is ahead by 20,01 zł.
- Collected this month is the 180,00 zł payment dated in S+6 plus the standing order's S+6 month,
  30,00 zł, giving 210,00 zł, against 60,00 zł expected. Collected exceeding expected is correct
  here: one participant paid more than one month's share.
- The plan has still cost 660,00 zł, and 360,00 zł of it has been collected, so the organizer's net
  cost is 300,00 zł.

The live screen showed exactly those figures, and a fresh read of the API after a reload returned
`owedToYouNow` 3999, `creditOutstanding` 2001, `totalCollected` 36000 and `ownerNetCost` 30000 in
minor units, with Blake at owed 27999, paid 24000, balance -3999 and Casey R. at owed 9999, paid
12000, balance 2001.

### Refusal states

All three were provoked live. Each message names the field or the reason, and each left the stored
data unchanged, confirmed by reloading and re-reading the records from the server afterwards.

| Refusal | What was attempted | The message |
|---|---|---|
| Payment before the plan started | Blake, dated two months before S, 20,00 zł | "date must not precede the subscription start month", rendered in red directly under the date field |
| Deleting a participant who has records | Delete on Blake, who has a payment and a standing order | "this member has records attached and is archived rather than deleted" |
| Overlapping standing order | A second standing order for Blake opening at S+5, inside the one already running from S+4 | "two standing orders for one participant may not cover the same month, and two that touch are an overlap rather than a continuation" |

After all three, the plan still held two payments, one standing order and three participants, and
every balance was unchanged. Only the first has a named capture in the set below; the other two are
recorded here with their exact messages, because the screenshot list the plan fixes has one error
slot.

### The second account, in the same session

Signed out of the owner account and signed in as the reviewer account in the same browser. Its
subscription list reads "No subscriptions yet." Asked directly for the owner's records by id from
that session, the deployment answered 404 for the subscription, its summary, its members, its
payments, its schedules and its prices, while the reviewer's own list answered 200 with nothing in
it. That is the isolation demonstration D-010 describes: the second account is empty on purpose.

### The screenshot set

Ten files, `evidence/screenshots/release-*.png`. Nine are browser captures from the live URL with the
address bar visible; `release-05-tests-passing.png` is the terminal capture phase 2 took in the clean
checkout, and is the one that has no address bar to show.

| File | What it shows |
|---|---|
| `release-01-login.png` | The sign-in screen, fields empty |
| `release-02-home.png` | The post-login list: the demo plan and the relabelled first-deployment artefact |
| `release-03-input-record-payment.png` | The payment form filled in, before submitting |
| `release-04-output-balances.png` | The five headline cards, the net-cost line, and both participants, one owing and one ahead |
| `release-05-tests-passing.png` | The release SHA and `npm test` passing, from the clean checkout |
| `release-06-members-and-prices.png` | Casey R.'s inclusive active range, S to S+3, above the price history with its change |
| `release-07-recurring-assumed-received.png` | The standing order's months, two assumed received and one marked not received, with the total over 2 of 3 elapsed months |
| `release-08-error-before-start-month.png` | The refused payment, its message under the date field, both stored payments untouched above it |
| `release-09-reviewer-sees-nothing.png` | The second account signed in, with an empty subscription list |
| `release-10-narrow-phone.png` | The detail screen at 390 CSS pixels, the cards stacked to one column, no horizontal overflow |

Two notes on how the captures were taken, so nobody has to guess. Each is a capture of the test
browser's own window rather than of the screen, so the address bar is genuine and nothing outside the
browser is in frame. `release-10-narrow-phone.png` uses device emulation at 390 CSS pixels because
the operating system clamps the window to a wider minimum, which is the same limitation the S-02
walkthrough recorded; that is why the page occupies the left portion of a wider window in that one
capture.

No capture shows a password, a token or a session cookie. The two account addresses are visible,
which is deliberate and unchanged from the first deployment's evidence; the passwords behind them
stay in `evidence/private/reviewer-credentials.md`.

### What the walkthrough did not do

- It created nothing in a shape the product cannot delete. No subscription and no owner member was
  created in this phase; the two that exist were created on purpose in phase 3 and are recorded above.
- The archive flag was not exercised. The refusal that matters, deleting a participant with records,
  was, and archiving is covered by the integration suite.
- The confirmed half of a price delete was not exercised here either, for the same reason as in
  phase 3: the guard is the point, and the demo plan keeps its price history.

## The cold re-read

Every persistence proof before this one was a re-read inside a session that was already open, which
is the strongest thing a single stateless Worker request can show on its own. This one is taken after
the browser was closed, in a session that carries nothing from the walkthrough.

The session is cold, and that was proven rather than asserted: with no cookie at all, `GET /api/me`
answered **401** first. Then a fresh sign-in as the owner, into a new empty cookie jar, answered
**200**, and the demo plan's summary and payment list were re-read.

| Field | Recorded in phase 4 | Cold re-read |
|---|---|---|
| `owedToYouNow` | 3999 | 3999 |
| `creditOutstanding` | 2001 | 2001 |
| `totalCollected` | 36000 | 36000 |
| `ownerNetCost` | 30000 | 30000 |
| `totalPlanCost` | 66000 | 66000 |
| `collectedThisMonth` | 21000 | 21000 |
| `expectedThisMonth` | 6000 | 6000 |
| Blake, owed / paid / balance | 27999 / 24000 / -3999 | 27999 / 24000 / -3999 |
| Casey R., owed / paid / balance | 9999 / 12000 / 2001 | 9999 / 12000 / 2001 |

The payment list returned the same two rows, 12000 minor dated S+5 with the note "August transfer,
settling early" and 18000 minor dated S+6 with the note "September transfer", both `kind` `manual`.

Nothing drifted. This is what closes the reload clause of test-plan risk 3 against the deployment
rather than against a local database: a record written through the product is still there, unchanged,
read by a session that did not exist when it was written.

## Submission package inventory

An inventory of what exists on disk, not a submission. **Nothing has been uploaded, attached, sent or
submitted to the course, its forms, its community or its organizers, and nothing here authorizes
that.** Uploading requires the user's explicit confirmation of that specific action. The Builder form
fields and their required status are recorded separately in
`/Users/sebastian.f/Projects/10xDevs/docs/SUBMISSION-PACKAGE.md`.

| Item the Builder form asks for | What would satisfy it |
|---|---|
| Repository | The public GitHub repository for this project |
| Public URL of the deployed application (optional) | `https://subscription-splitter.sebastianfudalej.workers.dev` |
| Screenshot: login screen (optional) | `evidence/screenshots/release-01-login.png` |
| Screenshot: home page / post-login screen | `evidence/screenshots/release-02-home.png` |
| Screenshot: main feature 1, data entry | `evidence/screenshots/release-03-input-record-payment.png` |
| Screenshot: main feature 2, data display | `evidence/screenshots/release-04-output-balances.png` |
| Screenshot: passing tests | `evidence/screenshots/release-05-tests-passing.png` |
| Custom attachments (optional) | The remaining five captures, `release-06` through `release-10` |

Alongside them, for a reviewer who opens the instance: the owner account holds the demo plan, and the
second account is deliberately empty because an empty second account is the ownership-isolation
demonstration rather than an oversight. Which account is which, and why the second one holds nothing,
belongs in the submission comment, and so does the second subscription on the owner account. The
wording to copy into that comment:

> The owner account holds two plans. "Family music plan" is the demo: three participants, a price
> change, a skipped month, recorded payments and a standing order with one month marked as not
> received. "First deployment artefact (not the demo plan)" is exactly what it says: the row the very
> first deployment's smoke test created, before the members migration had been applied to the remote
> database. It is kept rather than removed because the product deliberately exposes no delete for a
> subscription, and it was given an owner member so it reads as an ordinary empty plan rather than a
> broken one. The second account is empty on purpose: that is the ownership-isolation demonstration,
> not an unfinished feature. Credentials reach a reviewer only through the authorized private
channel named in decision D-010 and are never written into a committed file, a screenshot or a form
field that is not a credential field; they live only in the gitignored
`evidence/private/reviewer-credentials.md`.

The goal-box updates this slice's evidence supports are handed to the designated status writer by
naming the paths above. This slice does not edit `GOALS.md`.
