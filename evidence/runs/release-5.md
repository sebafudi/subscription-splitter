# Release 5: subscription management and native date inputs on the deployed instance

Roadmap S-08, change `subscription-management-and-date-inputs`, parent goal M06. This release ships
the first change to the product's own behaviour since release 2: the subscription record itself can
now be edited and deleted, and every calendar field in the client is a native browser control rather
than a plain text input. Releases 3 and 4 shipped Google sign-in and one routing fix; this one ships
a feature.

Twenty-two live checks were run against the deployed release and all twenty-two pass. No defect was
found, and no pre-existing record was changed or removed.

## Release candidate

- **Release SHA**: `91ce0daa469df960097398ce756730f97845e647`, the tip of `origin/main` at the time
  of the pull, and the same commit the task named. Nothing newer had landed, so there is no
  docs-only drift to account for.
- **Ancestry gates**, both exit 0:
  - `git merge-base --is-ancestor abf8790 91ce0da`, the implementation review resolution.
  - `git merge-base --is-ancestor 688757a 91ce0da`, the server review fix.
- **No migration ships.** `git diff --stat bad3f28..91ce0da -- migrations/` is empty, so `migrations/`
  is untouched since release 4, and the remote dry run below agrees.
- **Built from**: a throwaway clone under the scratchpad, not the shared working copy, for the reason
  release 4 gives: other agents push to `main` concurrently and `vite build` reads the working tree.
  The clone reported `git status --porcelain` empty and `git rev-parse HEAD` equal to the release SHA
  both before the gates and immediately before the deploy.
- **No `.dev.vars` in the clone**, so the whole suite ran with nothing bound anywhere, the state
  continuous integration runs in.

### Gate results, captured verbatim

```
$ git rev-parse HEAD
91ce0daa469df960097398ce756730f97845e647

$ git status --porcelain
(empty)

$ npm ci
exit: 0

$ npm run typecheck
> tsc -p tsconfig.worker.json --noEmit && tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.node.json --noEmit
exit: 0

$ npm run test:unit
 Test Files  22 passed (22)
      Tests  262 passed (262)
exit: 0

$ npm run test:integration
 Test Files  13 passed (13)
      Tests  131 passed (131)
exit: 0

$ npm run build
vite v8.3.0 building subscription_splitter environment for production...
dist/subscription_splitter/index.js   882.53 kB │ gzip: 210.20 kB
vite v8.3.0 building client environment for production...
✓ 59 modules transformed.
dist/client/assets/index-CtqqFhDM.css  17.54 kB │ gzip:  4.24 kB
dist/client/assets/index-D-QEf8bX.js  284.66 kB │ gzip: 84.84 kB
exit: 0
```

Against release 4's figures: unit rises from 18 files and 214 cases to 22 and 262, integration from
12 files and 119 cases to 13 and 131. Both client asset names change, which is the opposite of what
release 4 recorded and is the right answer here: release 4 changed configuration only, this release
changes client source, so the content-addressed names must move.

### Hosted continuous integration

| Field | Value |
|---|---|
| Workflow | `CI`, on `push` to `main` |
| Commit | `91ce0daa469df960097398ce756730f97845e647` |
| Run id | `34789657237` |
| Conclusion | `success` |

The run was already complete at the candidate SHA when this pass began, so nothing had to be
triggered or waited for. Green, so the deploy was not blocked.

### The passing-tests capture

Not retaken by this task. `evidence/screenshots/release-05-tests-passing.png` still shows release 4's
`bad3f28` with unit at 18 files and 214 cases and integration at 12 and 119, none of which describes
this release. The gate counts are recorded as text above, as release 3 did in the same position. The
capture is one of the ten the separate certification-screenshot task refreshes; it is listed below
among the captures this release affects.

## Remote state before anything was written

### Migration dry run

```
$ npx wrangler d1 migrations list subscription-splitter-db --remote
✅ No migrations to apply!
exit: 0
```

Nothing pending, consistent with the empty migrations diff above. The subscription delete this change
adds removes descendants through the existing foreign keys and needs no new schema.

### Secret state

```
$ npx wrangler secret list
  APP_ORIGINS
  BETTER_AUTH_SECRET
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
```

Name-only listing; no value was printed. Identical to release 4. `SEED_ENABLED` and `SEED_TOKEN` are
still absent, so the seed route stays closed. This release sets, rotates and deletes no secret.

### Why no snapshot or Time Travel bookmark was taken

No schema change ships and the dry run above confirms nothing is pending, so there is nothing new to
roll back at the database layer. Same reasoning as releases 2, 3 and 4. What is new in this release
is a destructive product operation rather than a destructive migration, and the live exercise of it
below is deliberately confined to a record this pass created.

## The deploy

```
$ npx wrangler deploy
🌀 Building list of assets...
✨ Read 11 files from the assets directory .../release-5-clone/dist/client
🌀 Starting asset upload...
🌀 Found 3 new or modified static assets to upload. Proceeding with upload...
+ /index.html
+ /assets/index-CtqqFhDM.css
+ /assets/index-D-QEf8bX.js
✨ Success! Uploaded 3 files (6 already uploaded)
Total Upload: 1642.18 KiB / gzip: 353.17 KiB
Worker Startup Time: 39 ms
Your Worker has access to the following bindings:
  env.DB (subscription-splitter-db)   D1 Database
Uploaded subscription-splitter (14.80 sec)
Deployed subscription-splitter triggers (4.69 sec)
  https://subscription-splitter.sebastianfudalej.workers.dev
Current Version ID: 751a8bfd-e62a-4c9a-beb2-1953eb6a7656
```

| Field | Value |
|---|---|
| New version id | `751a8bfd-e62a-4c9a-beb2-1953eb6a7656` |
| Supersedes | `1d0f71c1-6832-4bc1-aace-5feef621e715` (release 4) |
| Release SHA | `91ce0daa469df960097398ce756730f97845e647` |
| Live URL | https://subscription-splitter.sebastianfudalej.workers.dev |

Three new assets were uploaded where release 4 uploaded none. That line is the deploy agreeing with
the build: this release does change emitted client bytes, and the two content-addressed names it
uploaded are the two the clean-clone build produced.

### Rollback

Not exercised and not indicated. If it were needed: `npx wrangler deployments list` then
`npx wrangler rollback --version-id 1d0f71c1-6832-4bc1-aace-5feef621e715`. No migration rollback
applies, because no migration ships. A rollback returns the deployment to release 4's behaviour,
which is the shipped ledger without subscription editing, without subscription deletion and with
plain text month and date fields.

## Live API smoke

Full transcript at `evidence/runs/release-5-live-smoke.txt`. Twenty-two checks, all passing.

| Check | Result |
|---|---|
| `GET /api/auth-config` with no cookie returns exactly `{"google":true}` | PASS |
| Unauthenticated `DELETE /api/subscriptions/<id>` | PASS, 401 |
| Reviewer password sign-in | PASS, 200 |
| Create the disposable subscription "Release 5 disposable" | PASS, 201 |
| Add one participant | PASS, 201 |
| Add one price | PASS, 201 |
| Add one skipped month | PASS, 201 |
| Add one payment | PASS, 201 |
| Add one standing order | PASS, 201 |
| `PATCH` name and time zone, and the re-read shows both | PASS, 200 |
| `PATCH start_month` later than the price month | PASS, 400, price sentence verbatim |
| `PATCH start_month` one month earlier, owner range moved with it | PASS, 200 |
| `PATCH currency` while amounts exist | PASS, 400 currency lock |
| `GET /api/auth-config` still answers after the edits | PASS, 200 |
| `DELETE` the disposable | PASS, 204 with an empty body |
| `GET` the deleted subscription | PASS, 404 |
| `DELETE` a nonexistent id | PASS, 404 |
| Reviewer subscription count returns to the starting count | PASS, 0 to 0, same ids |
| Reviewer sign-out | PASS, 200 |
| Replaying the signed-out cookie | PASS, 401 |
| Owner subscription count and ids unchanged across the pass | PASS, 2 to 2, same ids |
| The deployed client bundle carries the `MonthField` detection strings | PASS |

### The two refusals, read carefully

These are the checks worth quoting rather than counting, because they are the rules the change exists
to enforce and the sentences a person reads.

```
PATCH /api/subscriptions/<id>  {"start_month": "2026-05"}
400 {"error":"start_month cannot be later than 2026-04 because a price is recorded from that month",
     "field":"start_month"}

PATCH /api/subscriptions/<id>  {"currency": "EUR"}
400 {"error":"currency cannot change while prices, payments or standing orders are recorded",
     "field":"currency"}
```

The disposable was built so the price is the binding record and nothing else is: its participant
joined in `2026-06`, its price runs from `2026-04`, its skipped month is `2026-05`, its payment is
dated in `2026-06` and its standing order starts in `2026-07`. `2026-04` is therefore the earliest
month any dependent record occupies, and the refusal names the price rather than one of the other
four, which is what says the ordering rule in `src/server/db/subscriptions.ts` is the one running
live.

### The first month moving earlier, and the owner's range with it

```
owner activeRanges before   [{"joinedMonth": "2026-03", "leftMonth": null}]
PATCH start_month 2026-02   200
GET  startMonth             2026-02
owner activeRanges after    [{"joinedMonth": "2026-02", "leftMonth": null}]
```

The owner's opening range sat on the old first month and moved with it in the same write, which is
the behaviour the change specifies and the half a settings edit could most easily get wrong by
leaving the owner inactive in the month the plan now begins.

### Deletion, and the proof that nothing else went with it

The one destructive operation in this change was exercised on one record, created by this pass for
that purpose, under the reviewer account:

- The reviewer's subscription list held **0** rows before the disposable was created and **0** rows
  after it was deleted, with an identical set of ids.
- The owner's list was read at the start of the pass and again after the delete: **2** rows both
  times, "First deployment artefact (not the demo plan)" and "Family music plan", with an identical
  set of ids. The owner's session was held open across the whole pass for exactly this comparison.
- `DELETE` on a nonexistent id answers 404 and `DELETE` with no session answers 401, so the endpoint
  neither discloses nor acts outside a session.

No pre-existing subscription, participant, price, payment, standing order or account was modified or
removed at any point.

### The deployed bundle is this release's

```
GET /                               200   assets/index-CtqqFhDM.css, assets/index-D-QEf8bX.js
GET /assets/index-D-QEf8bX.js       200   284665 bytes
  occurrences of 'type:`month`'     1
  occurrences of 'not-a-month'      1
  occurrences of 'Choose a month'   1
```

The asset name is the one this release's own clean-clone build emitted, and the three strings are
`MonthField` and its detection: the native `type="month"` branch, the sanitisation probe
`supportsMonthInput` sends through a throwaway input, and the leading option of the select fallback a
browser with no month picker gets instead. Release 4's bundle contains none of them. That is what
says the asset now being served is this change's, rather than a cached predecessor.

### One honest note on method

The transcript is the third run of the same script. The first was refused by Cloudflare's bot rule on
the default Python user agent and created nothing. The second failed two checks because the script
sent the sign-out call with no body and therefore no `Content-Type`, which the auth library answers
415, and the cookie replay after it consequently still answered 200; the fault was in the script, not
the deployment, and the corrected call passes both. The second run also created and deleted its own
disposable subscription by the same steps, and its closing count matched its starting count. Its two
sessions were never signed out and stay valid until they expire, because closing them would need
cookies held only in that process. All of this is written into the transcript as well.

## What this release changes for the certification package

`docs/SUBMISSION-PACKAGE.md` section 10 lists ten captures, every one of them recorded as retaken
against release 4 at `bad3f28` / `1d0f71c1-6832-4bc1-aace-5feef621e715`. That document is not edited
by this task. Refreshing the captures is a separate task; what this file owes it is a list of which
slots show a screen this change altered, read off the change's own client diff against `bad3f28` and
off what each existing capture actually has in frame.

**Five of the ten show an altered screen:**

| Slot | File | What this change alters in it |
|---|---|---|
| 9, main feature #1 | `release-03-input-record-payment.png` | The open payment panel. "Date received" is a plain text input carrying the hint "Date as YYYY-MM-DD"; it is now a native date control and the hint is gone |
| 10, main feature #2 | `release-04-output-balances.png` | The subscription header is in frame. The subtitle line "PLN, Europe/Warsaw, from mar 2026" now has an action row beneath it carrying "Edit subscription" and "Delete subscription", which also pushes everything below it down |
| 11, passing tests | `release-05-tests-passing.png` | The whole capture. It shows `bad3f28` and release 4's counts; this release is `91ce0da` at unit 22 files / 262 cases and integration 13 files / 131 cases |
| 12, custom | `release-06-members-and-prices.png` | Casey R.'s open edit panel. The two active-month fields are plain text inputs showing `2026-03` and `2026-06` under the hint "Month as YYYY-MM, like 2026-01"; both are now native month controls, or the named-month select where a browser has no picker |
| 12, custom | `release-08-error-before-start-month.png` | The refused payment. The same "Date received" field and the same removed hint as slot 9; the refusal sentence and the red field rule themselves are unchanged |

**Five show a screen this change leaves alone:**

| Slot | File | Why it is unaffected |
|---|---|---|
| 7, login | `release-01-login.png` | The sign-in screen. This change touches no authentication screen |
| 8, home | `release-02-home.png` | The subscription list. The list rows are unchanged; the only client change on Home is the confirmation a deletion leaves behind, which is not on screen in this capture |
| 12, custom | `release-07-recurring-assumed-received.png` | Standing orders with no form open. The month tiles, the totals line and the payment rows are unchanged; the schedule form does have new month controls, but it is not open in this frame |
| 12, custom | `release-09-reviewer-sees-nothing.png` | The reviewer's empty Home |
| 12, custom | `release-10-narrow-phone.png` | The detail screen at 390 CSS pixels, scrolled past the header to Participants and Price history, both unchanged. The new header action row is above the frame; it would shift the scroll offset, so a retake should be composed rather than replayed blind |

One judgement worth stating rather than burying. Slots 9, 10 and 12's four files are all the
subscription detail screen, so a retake of any of them is composed against a screen that now carries
two more verbs in its header. Whoever retakes them decides whether to keep the existing scroll
positions or to let the new affordances show; this file does not make that call, and it does not edit
`docs/SUBMISSION-PACKAGE.md`.

## Defects found

None. Twenty-two of twenty-two live checks pass and nothing that worked at release 4 works less well
now.

## What was not exercised in this pass

- **Any browser.** This release was verified at the API and by fetching the deployed bundle. The
  native month and date controls are, by their nature, browser behaviour, and this pass proves only
  that the code implementing them is the code being served. The change's own acceptance captures
  cover the controls themselves.
- **The month select fallback** on a browser with no month picker. Covered by
  `src/client/components/ui/monthControl.test.ts` against an injected element factory, not live.
- **Google consent.** Nothing was signed in through Google. Release 4 records the owner's own
  consent roundtrip against that release and this change touches no authentication path.
- **The demo plan's summary figures.** Read only as a subscription count and id set, not field by
  field, because this pass deliberately did not sign in as the owner beyond the two list reads that
  bracket the delete. Release 4 holds the last field-by-field baseline.

## Hand-off

Produced by this pass:

- `evidence/runs/release-5.md` (this file)
- `evidence/runs/release-5-live-smoke.txt`
- `context/checkpoints/release-5.md`

Left for their owners:

- The ten certification captures. Five slots show an altered screen and are listed above. That task
  also owns the byte sizes and the "retaken against release 4" wording in
  `docs/SUBMISSION-PACKAGE.md` section 10, which this file does not edit.
- The goal-box updates for S-08 and M06 go to the designated status writer. This file does not edit
  `GOALS.md`, `context/STATUS.md`, `evidence/index.md` or the work log.
- The change is not archived. `change.md` reads `implemented`.
