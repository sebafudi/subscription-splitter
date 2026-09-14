# Release 6: the compact member calendar on the deployed instance

Roadmap S-09, change `compact-member-calendar`, parent goal C06. This release replaces the
subscription detail screen's unbounded per-person history with a twelve-month calendar for one
selected year, an inspectable selected month, a bounded payments disclosure and standing orders
without their month tiles. It is a client-only change: no migration, no server route and no new
dependency ships.

Forty-six live checks were run against the deployed release and all forty-six pass. No defect was
found, and no pre-existing record was changed or removed.

## Release candidate

- **Release SHA**: `64eb0d3b096eef53a6d264ee483e1d9c7e1dc17a`, the tip of `main` at the moment the
  concurrent documentation pass finished and `git status --short` became empty. The two commits that
  pass landed while this task polled are `9002c1d` (`docs(status): s-09 implemented, reviewed and
  accepted; record c03 to c05`) and `64eb0d3` (`docs(plan): record 5.3 and 5.4 shas`).
- **Ancestry gate**, exit 0: `git merge-base --is-ancestor 650a14d 64eb0d3`, the accepted code
  revision.
- **No migration ships.** `git diff 91ce0da..64eb0d3 --stat -- migrations/ wrangler.jsonc src/server/`
  is empty on all three paths, so nothing under `migrations/`, nothing in the Worker configuration
  and nothing in the server has moved since release 5. The remote dry run below agrees.
- **No dependency change.** `git diff 91ce0da..64eb0d3 --stat -- package.json package-lock.json` is
  empty, which is the plan's "no charting or virtualization dependency" holding at the release.
- **What does change**: twenty-four files under `src/client/`. The new `src/client/calendar/` folder
  of twelve files, the removal of `components/MemberList.tsx`, and edits to `PaymentList.tsx`,
  `RecurringSection.tsx`, `PaymentForm.tsx`, `sections.ts`, `format.ts`, `index.css`,
  `SubscriptionDetail.tsx` and two `screens/subscriptionEdits` files.
- **Built from**: a throwaway clone under the scratchpad, not the shared working copy, for the reason
  releases 4 and 5 give: other agents push to `main` concurrently and `vite build` reads the working
  tree. The clone reported `git status --porcelain` empty and `git rev-parse HEAD` equal to the
  release SHA both before the gates and immediately before the deploy.
- **No `.dev.vars` in the clone**, only the tracked `.dev.vars.example`, so the whole suite ran with
  nothing bound anywhere, the state continuous integration runs in.

### Gate results, captured verbatim

```
$ git rev-parse HEAD
64eb0d3b096eef53a6d264ee483e1d9c7e1dc17a

$ git status --porcelain
(empty)

$ npm ci
exit: 0

$ npm run typecheck
> tsc -p tsconfig.worker.json --noEmit && tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.node.json --noEmit
exit: 0

$ npm run test:unit
 Test Files  26 passed (26)
      Tests  359 passed (359)
exit: 0

$ npm run test:integration
 Test Files  13 passed (13)
      Tests  131 passed (131)
exit: 0

$ npm run build
vite v8.3.0 building subscription_splitter environment for production...
dist/subscription_splitter/index.js   882.53 kB │ gzip: 210.20 kB
vite v8.3.0 building client environment for production...
dist/client/assets/index-ByHeNjZo.css  20.10 kB │ gzip:  4.69 kB
dist/client/assets/index-DlWpQE-s.js  307.70 kB │ gzip: 91.22 kB
exit: 0
```

Against release 5's figures: unit rises from 22 files and 262 cases to 26 and 359, and integration
stays exactly where it was at 13 files and 131 cases. That pairing is the release candidate agreeing
with the diff. Every new test is a unit test over the calendar's pure modules, because the change
adds no server behaviour for an integration test to reach; the plan says so directly, and the empty
`src/server/` diff is the same statement from the other side.

Both client asset names move and the Worker bundle's size does not, which is the same shape release 5
recorded for a client-source change.

### Hosted continuous integration

| Field | Value |
|---|---|
| Workflow | `CI`, on `push` to `main` |
| Commit | `64eb0d3b096eef53a6d264ee483e1d9c7e1dc17a` |
| Run id | `34881238556` |
| Conclusion | `success` |

`origin/main` stood at `c10d54f` when this pass began, so the whole S-09 series was unpushed. The
release SHA was pushed on its own, ahead of this pass's own evidence commits, so the hosted run is at
exactly the release SHA rather than at a documentation commit sitting on top of it. Green, so the
deploy was not blocked.

### The passing-tests capture

Not retaken by this task. `evidence/screenshots/release-05-tests-passing.png` was refreshed against
release 5 and shows `91ce0da` with unit at 22 files and 262 cases, none of which describes this
release. The gate counts are recorded as text above, as releases 3 and 5 did in the same position.
The capture is one of the ten the separate certification-screenshot task owns; it is listed below
among the slots this release affects.

## Remote state before anything was written

### Migration dry run

```
$ npx wrangler d1 migrations list subscription-splitter-db --remote
✅ No migrations to apply!
```

Nothing pending, consistent with the empty migrations diff above. The calendar is a projection over
records the client already held, so it needs no schema and reads no new column.

### Secret state

```
$ npx wrangler secret list
  APP_ORIGINS
  BETTER_AUTH_SECRET
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
```

Name-only listing; no value was printed. Identical to releases 4 and 5. `SEED_ENABLED` and
`SEED_TOKEN` are still absent, so the seed route stays closed. This release sets, rotates and deletes
no secret.

### The restore point, confirmed before the deploy

```
$ npx wrangler deployments list
Version(s):  (100%) 751a8bfd-e62a-4c9a-beb2-1953eb6a7656
```

Release 5's version is the one serving all traffic and it still exists in `wrangler versions list`,
so the rollback reference the plan names is real rather than assumed. It was confirmed before
anything was uploaded.

### Why no snapshot or Time Travel bookmark was taken

No schema change ships and the dry run above confirms nothing is pending, so there is nothing new to
roll back at the database layer. Same reasoning as releases 2 through 5. The one destructive product
operation this pass exercises live is confined to a record it created itself.

## The deploy

```
$ npx wrangler deploy
🌀 Building list of assets...
✨ Read 11 files from the assets directory .../release-6-clone/dist/client
🌀 Starting asset upload...
🌀 Found 3 new or modified static assets to upload. Proceeding with upload...
+ /index.html
+ /assets/index-ByHeNjZo.css
+ /assets/index-DlWpQE-s.js
✨ Success! Uploaded 3 files (6 already uploaded) (2.64 sec)
Total Upload: 1642.18 KiB / gzip: 353.17 KiB
Worker Startup Time: 49 ms
Your Worker has access to the following bindings:
  env.DB (subscription-splitter-db)   D1 Database
Uploaded subscription-splitter (16.97 sec)
Deployed subscription-splitter triggers (5.08 sec)
  https://subscription-splitter.sebastianfudalej.workers.dev
Current Version ID: a80d2e12-d77e-4b88-b318-aa992eb60d50
```

| Field | Value |
|---|---|
| New version id | `a80d2e12-d77e-4b88-b318-aa992eb60d50` |
| Supersedes | `751a8bfd-e62a-4c9a-beb2-1953eb6a7656` (release 5) |
| Release SHA | `64eb0d3b096eef53a6d264ee483e1d9c7e1dc17a` |
| Live URL | https://subscription-splitter.sebastianfudalej.workers.dev |

Three new assets, and the two content-addressed names are the two the clean-clone build produced. No
D1 command of any kind was run against the deployment.

### Rollback

Not exercised and not indicated. If it were needed: `npx wrangler deployments list` then
`npx wrangler rollback --version-id 751a8bfd-e62a-4c9a-beb2-1953eb6a7656`. No migration rollback
applies, because no migration ships. A rollback returns the deployment to release 5's behaviour,
which is the same ledger with the long per-person history, the unbounded payments list and the
standing-order month tiles back in place. No record would be lost by it, because the calendar writes
nothing the previous screen cannot read.

## Live API and browser smoke

Full transcript at `evidence/runs/release-6-live-smoke.txt`. Forty-six checks, all passing.

| Check | Result |
|---|---|
| `GET /api/auth-config` with no cookie returns exactly `{"google":true}` | PASS |
| Unauthenticated summary read | PASS, 401 |
| Unauthenticated payments read | PASS, 401 |
| Owner password sign-in, and the baseline list held open | PASS, 200 |
| Reviewer password sign-in | PASS, 200 |
| Create the disposable subscription "Release 6 disposable" | PASS, 201 |
| Add two participants, joining in different months | PASS, 201 twice |
| Add one price, from a month later than the plan start | PASS, 201 |
| Add one skipped month | PASS, 201 |
| Add one standing order | PASS, 201 |
| Add two payments dated in the same month | PASS, 201 twice |
| The six reads the calendar projects from, each answering 200 | PASS, six times |
| Record a third synthetic receipt | PASS, 201 |
| Edit that receipt across a month boundary | PASS, 200, new month returned |
| Delete that receipt | PASS, 204 with an empty body |
| The deleted receipt reads 404 and the two seeded receipts survive | PASS |
| Mark a standing-order month not received | PASS, 204, exception present on re-read |
| Unmark it again | PASS, 204, exception gone |
| The root serves both assets this release built | PASS |
| The served bundle carries seven calendar strings | PASS, seven times |
| Delete the disposable | PASS, 204 with an empty body |
| `GET` the deleted subscription, and `DELETE` a nonexistent id | PASS, 404 both |
| Reviewer subscription count returns to the starting count | PASS, 0 to 0, same ids |
| Owner subscription count and ids unchanged across the pass | PASS, 2 to 2, same ids |
| Both sign-outs, and both signed-out cookies replayed | PASS, 200 then 401, twice |

### The disposable, and why it is shaped the way it is

Under the reviewer account, starting in `2026-01` with the price only from `2026-02`: participant A
active from the start, participant B from `2026-03`, `2026-03` skipped for everyone, a standing order
for A of 1500 from `2026-05`, and two manual receipts for A of 2000 and 1000 both dated in `2026-04`.

Every completeness state the calendar has to draw is therefore reachable in one screen: A's January
is unpriced, March is paused, April holds two receipts, May through September are assumed from the
standing order, October through December have not arrived, and B's January and February are outside
the participant's active range. Two receipts in one month is the case a month cell has to summarise
rather than list, and the case the inspector has to itemise.

### What the deployed calendar actually rendered

Chrome 152 on the live URL, signed in as the reviewer, light theme emulated, read off the live DOM:

```
1280 CSS px   gridcells 24   .calendar-blocks scrollHeight  394 closed, 876 open   no horizontal overflow
 390 CSS px   gridcells 24   .calendar-blocks scrollHeight  649 closed, 1195 open   no horizontal overflow
opened cell id                calendar-cell-<memberId>-2026-04
focus after Close             returns to that same cell
```

Twenty-four gridcells is two participants times twelve months. It does not move between the two
frames, and it does not move when the inspector opens, which is the compactness property the change
exists for: the section grows with the number of people, not with the depth of history. The owner has
no person block of their own, which is design finding F2's ruling holding in the shipped build.

The accessible names the live DOM carries are the ones `cellText.ts` builds, in the subscription's own
locale: `kwiecień 2026, 2 payments recorded, 30,00 zł in total, charged 20,00 zł` on the two-receipt
cell, `styczeń 2026, nothing recorded, that month had no price` on the unpriced one, and
`marzec 2026, nothing recorded, the plan was paused that month` on the skipped one. The open inspector
is headed `Calendar participant A, kwiecień 2026`, carries `Charged 20,00 zł for kwiecień 2026.` and
a `Recorded (2)` group listing both receipts separately with their own Edit and Delete.

Closing the inspector returned focus to the cell that opened it rather than to `document.body`, which
is the V4 defect the plan records as fixed, checked here against the deployed build rather than a
local one.

### Captures

From this release and this deployment, in `evidence/screenshots/s09-live/`:

| File | What it shows |
|---|---|
| `s09-live-01-detail-desktop-light.png` | 1280 CSS px, light, the compact default: year control, legend, two person blocks, twelve cells each |
| `s09-live-02-inspector-open-desktop-light.png` | 1280 CSS px, light, the `2026-04` inspector open under participant A's own strip with both receipts itemised |
| `s09-live-03-detail-390-light.png` | 390 CSS px, light, the compact default with each strip wrapped to two rows of six and no horizontal overflow |
| `s09-live-04-inspector-open-390-light.png` | 390 CSS px, light, the same inspector open in the narrow frame |

### The deployed bundle is this release's

```
GET /                               200   assets/index-ByHeNjZo.css, assets/index-DlWpQE-s.js
GET /assets/index-DlWpQE-s.js       200   307704 bytes
  occurrences of 'calendar-cell-'             9
  occurrences of ' more'                      1
  occurrences of 'That is every payment.'     1
  occurrences of 'calendar-blocks'            3
  occurrences of 'year-select'                2
  occurrences of 'marked as not received'     1
  occurrences of 'that month had no price'    1
```

Both asset names are the ones this release's own clean-clone build emitted. The seven strings are the
calendar's own: the per-cell id prefix `MonthStrip` mints, the bounded payments disclosure's two
sentences, the container the compactness measurement names, the year control's select id and two
exclusion phrases from `cellText.ts`. Release 5's bundle is still served at its old content-addressed
name and was fetched to check: it contains none of them, at a count of zero for each. That is what
says the asset now being served is this change's rather than a cached predecessor.

### Deletion, and the proof that nothing else went with it

The destructive operations in this pass were exercised on records this pass created, under the
reviewer account:

- The reviewer's subscription list held **0** rows before the disposable was created and **0** rows
  after it was deleted, with an identical set of ids.
- The owner's list was read at the start of the pass and again after the delete: **2** rows both
  times, "First deployment artefact (not the demo plan)" and "Family music plan", with an identical
  set of ids and identical names. The owner's session was held open across the whole pass for exactly
  this comparison, and no call touched an owner record beyond those two list reads.
- Inside the disposable, one synthetic receipt was recorded, edited across a month boundary and
  deleted, and one standing-order exception was marked and unmarked. Both returned the subscription
  to the state the checks before them recorded.
- `DELETE` on a nonexistent id answers 404, so the endpoint neither discloses nor acts outside a
  session.

No pre-existing subscription, participant, price, payment, standing order or account was modified or
removed at any point. Both scripted sessions were signed out at the end and both cookies answer 401
on replay; the browser session was signed out in the browser.

### One honest note on method

Section 8 of the transcript was run twice. Its first run probed the served bundle for two literals the
source does not contain: `Show 12 more`, which the component builds around an interpolated count so no
such literal exists, and `Not received`, where the shipped phrase is `marked as not received`. Both
read as zero. The fault was in the probe, not the deployment, and that section writes nothing, so the
correction cost only a re-read. The strings in the table above are the ones the source actually holds.
Section 6 consequently ran its record, edit and delete cycle twice, both times ending with the
receipt deleted and the two seeded receipts intact, and the closing counts are read after all of it.

## What this release changes for the certification package

`docs/SUBMISSION-PACKAGE.md` section 10 lists ten captures, every one of them recorded as retaken
against release 5. That document is not edited by this task. Refreshing the captures is a separate
task; what this file owes it is a list of which slots show a screen this change altered, read off the
change's own client diff and off what each existing capture has in frame.

**Six of the ten show an altered screen:**

| Slot | File | What this change alters in it |
|---|---|---|
| 9, main feature #1 | `release-03-input-record-payment.png` | The subscription detail screen behind the open payment panel. The Participants section is now a calendar, and the Payments received section is closed behind a disclosure |
| 10, main feature #2 | `release-04-output-balances.png` | The Participants section in frame. Each person now carries a twelve-cell strip, a year control sits above them and the per-person lifetime figures are joined by selected-year figures |
| 11, passing tests | `release-05-tests-passing.png` | The whole capture. It shows `91ce0da` at unit 22 files / 262 cases; this release is `64eb0d3` at 26 and 359, with integration unchanged at 13 and 131 |
| 12, custom | `release-06-members-and-prices.png` | The member edit panel opens from the calendar's own action row now, under a person block rather than a list row |
| 12, custom | `release-07-recurring-assumed-received.png` | Standing orders. The per-month tile list is removed outright; the schedule rows, totals and forms stay, and the assumed months now show in each participant's calendar instead |
| 12, custom | `release-10-narrow-phone.png` | The detail screen at 390 CSS pixels, composed against Participants and Price history. Participants is a different section now, so the scroll offset this capture used no longer frames what it framed |

**Four show a screen this change leaves alone:**

| Slot | File | Why it is unaffected |
|---|---|---|
| 7, login | `release-01-login.png` | The sign-in screen. This change touches no authentication screen |
| 8, home | `release-02-home.png` | The subscription list. No client file this change touches renders Home |
| 12, custom | `release-08-error-before-start-month.png` | The refused payment. The refusal sentence, the red field rule and the payment panel's own fields are unchanged; only the sections behind it moved |
| 12, custom | `release-09-reviewer-sees-nothing.png` | The reviewer's empty Home |

One judgement worth stating rather than burying. Every affected slot except the tests capture is the
subscription detail screen, and its tallest section has become its most compact, so a retake is
composed against a page whose scroll offsets have all moved. Whoever retakes them should compose each
frame rather than replay an offset; this file does not make that call, and it does not edit
`docs/SUBMISSION-PACKAGE.md`.

## Defects found

None. Forty-six of forty-six live checks pass and nothing that worked at release 5 works less well
now.

## What was not exercised in this pass

- **The year control across more than one year.** The disposable lives entirely inside 2026, so
  Previous year and Next year were both correctly disabled and no year change was exercised live. The
  year range and the selection's `sessionStorage` round trip are covered by
  `src/client/calendar/selection.test.ts` and by the Phase 5 browser verification against the two
  fixtures, not here.
- **The keyboard contract.** Arrow, Home and End across a strip, and the roving tabindex, were
  verified in Phase 5 (`evidence/runs/s09-browser-verification.md`). This pass exercised pointer
  interaction and read the focus target after Close.
- **Dark theme.** Both live frames were captured with light emulated. The dark palette is one token
  set in the same stylesheet and was covered by the Phase 5 captures.
- **The archived-participant disclosure and the empty state.** No participant was archived and no
  person-free subscription was created live.
- **Google consent.** Nothing was signed in through Google. This change touches no authentication
  path.
- **The demo plan's summary figures.** Read only as a subscription count, id set and name set, not
  field by field, because this pass deliberately did not go past the owner's list. Release 4 holds the
  last field-by-field baseline.

## Hand-off

Produced by this pass:

- `evidence/runs/release-6.md` (this file)
- `evidence/runs/release-6-live-smoke.txt`
- `evidence/screenshots/s09-live/` (four captures)
- `context/checkpoints/release-6.md`

Left for their owners:

- **Step 6.3**, the foundation documents, goals and evidence index, to the sole status writer. This
  file does not edit `context/foundation/`, `context/STATUS.md`, `evidence/index.md`,
  `evidence/work-log.md`, `AGENTS.md`, `README.md` or the workspace `GOALS.md`.
- **Step 6.4**, the archive and the final handoff.
- The certification captures. Six slots show an altered screen and are listed above. That task also
  owns the byte sizes and the "retaken against release 5" wording in `docs/SUBMISSION-PACKAGE.md`
  section 10, which this file does not edit.
- Nothing has been uploaded to the course, and nothing here authorises it.
