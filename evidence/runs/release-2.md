# Release 2: the visual redesign on the deployed instance

Roadmap S-06, change `visual-redesign`, goal V06. This file is the prose companion to
`evidence/runs/release-2-live-smoke.txt`, following the shape of `evidence/runs/release-1.md` and the
procedure in `evidence/runs/release-2-plan.md`. It is written as the slice runs, so the sections below
appear in the order the phases produced them.

## Release candidate

- **Release commit SHA:** `c842f64cfaa1f362b0f34cbad35ec8e565805437` (`c842f64`)
- **Gate:** the release SHA is at or after `da7ad52`, the commit that resolved the S-06 implementation
  review. Checked, not assumed: `git merge-base --is-ancestor da7ad52 c842f64` exits 0. The
  independent re-review of that resolution is itself recorded at `c842f64`
  (`context/checkpoints/s06-impl-review-reverify.md`) with the verdict APPROVED.
- **Where it was verified:** a fresh `git clone` of the repository into a scratch directory, checked
  out at `c842f64`, not the shared working copy, for the same reason release 1 gave: other agents push
  to `main` concurrently and `vite build` reads the working tree rather than a git ref.
- **Hosted CI:** green for this SHA, check run `103696850548`, conclusion success, covering typecheck,
  unit, integration and build.
- **Staleness check after the fact:** `main` moved on while this release ran, by six documentation and
  checkpoint commits. `git diff c842f64..origin/main -- src/ migrations/ package.json
  package-lock.json wrangler.jsonc vite.config.ts index.html public/` is empty, so the pinned tree and
  the tip of `main` describe identical product code.

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
 Test Files  17 passed (17)
      Tests  194 passed (194)      <- unit

 Test Files  11 passed (11)
      Tests  112 passed (112)      <- integration
npm test exit: 0

$ npm run build
built, exit 0
dist/client/assets/index-Bx-I_EYB.js    273.66 kB / gzip: 81.50 kB
dist/client/assets/index-CdlKxmN3.css    16.70 kB / gzip:  4.06 kB
four @fontsource/ibm-plex-sans woff2 files, 79.25 kB together

$ npx wrangler deploy --dry-run
Total Upload: 1626.97 KiB / gzip: 348.99 KiB
Your Worker has access to the following bindings:
  env.DB (subscription-splitter-db)      D1 Database
--dry-run: exiting now.
dry-run exit: 0
```

**Regression comparison.** The last recorded repository-wide figures, in
`context/checkpoints/s06-impl-review-reverify.md` at the follow-up revision `4a7c6cc`, are typecheck
clean, unit 17 files and 189 or 194 tests depending on revision, integration 11 files and 112 tests,
build ok. The release candidate matches the `4a7c6cc` column exactly: 17 files and 194 tests unit,
11 files and 112 tests integration. Against release 1's figures the unit suite has grown from 15 files
and 185 tests to 17 and 194, which is the redesign's own tests arriving; the integration suite is
unchanged. Nothing regressed and nothing disappeared from the suite. The tree was still clean after
the build, because `dist/` is gitignored.

**Font budget.** The design spec sets 160 KB for the four woff2 faces together. The release build
produces 79.25 KB, comfortably inside it.

### The passing-tests capture

`evidence/screenshots/release-05-tests-passing.png`, 1340 by 1230, the same dimensions as release 1's
capture in that slot. It shows `git rev-parse HEAD`, `git status --porcelain`, the typecheck and the
`npm test` run in one frame, with `c842f64cfaa1f362b0f34cbad35ec8e565805437` and both pass counts
legible.

How it was produced: the commands were typed as one line into a real Terminal window sitting in the
clean checkout at the release SHA, and that window was photographed once they finished, by its window
id, so nothing else on the machine is in frame. The full SHA is the first line of output and is echoed
again at the bottom under `--- release SHA again ---`, so the run is bracketed by the commit it
describes. The `cd` into the scratch checkout is visible above the prompt as it really happened.
Nothing in the image is typeset, composed, cropped or edited.

One environment note, recorded because it cost time and will cost it again. This machine runs the
AeroSpace tiling window manager, which forces every window to its tile and silently refuses
`Browser.setWindowBounds`, Terminal's AppleScript `bounds`, and System Events resizing alike. A window
has to be moved to the floating layout (`aerospace layout floating --window-id <id>`) before it can be
sized at all. That is why this capture and the browser captures below could be produced at the same
dimensions as release 1's.

## Remote state before anything was written

### Migration dry run

`npx wrangler d1 migrations list subscription-splitter-db --remote`, which reports without writing:

```
✅ No migrations to apply!
```

Expected, and confirmed twice: once in the plan's pre-flight and again immediately before the deploy.
`git diff 8ed3422..c842f64 --stat -- migrations/` is empty, so this release ships no schema change.

### Secret state

`npx wrangler secret list` returns exactly two names, values never requested or recorded:

```
APP_ORIGINS        secret_text
BETTER_AUTH_SECRET secret_text
```

`SEED_ENABLED` and `SEED_TOKEN` are absent, so the seed route is closed going into the release, as
decision D-010 requires. `COOKIE_SECURE` is absent, the documented deliberate state for every deployed
environment. This release sets, rotates and deletes no secret.

### Why release 1's snapshot and Time Travel bookmark were not repeated

Release 1 took an off-Cloudflare export and a Time Travel bookmark because it was about to apply four
migrations. This release applies none: the migration dry run is clean, the migration delta against the
live release is empty, and the deploy replaces a Worker script and its static assets only. There is
nothing new to roll back at the database layer, so the plan's phase 3 deliberately skips both steps.
Had the dry run reported anything pending, the procedure was to stop and repeat release 1's
snapshot-and-bookmark before applying it.

## The deploy

Checked immediately before the command, in the clean release checkout rather than the shared working
copy: `git status --porcelain` empty, `git rev-parse HEAD` equal to the pinned release SHA. Then
`npm run deploy`:

- **Release version id:** `84a95549-cd34-4065-a202-cf5f1385e9f9`
- **Release commit SHA:** `c842f64cfaa1f362b0f34cbad35ec8e565805437`
- **Live URL:** `https://subscription-splitter.sebastianfudalej.workers.dev`
- Previous release, now superseded: `8e4fa506-cd63-412c-88f2-0101b6348bdb`, release 1 at `8ed3422`
- Worker startup time 38 ms; 8 new or modified static assets uploaded, 1 already present; the `DB`
  binding resolved to `subscription-splitter-db`

The eight uploaded assets are the redesign itself: the four IBM Plex Sans woff2 faces, the new
JavaScript and CSS bundles, the new `favicon.svg` carrying the split glyph, and `index.html` pointing
at them.

### Proving the redesigned bundle is the one that is live

Not assumed from the deploy's exit code. The release build produced `assets/index-Bx-I_EYB.js` and
`assets/index-CdlKxmN3.css`; both answer 200 on the live origin, the root document references them,
and the page the browser walkthrough drove reports `index-Bx-I_EYB.js` as its only script.

One observation worth recording rather than leaving to be rediscovered. The first two requests to the
bare root immediately after the deploy returned release 1's older asset names from a stale Cloudflare
edge entry; a request with a cache-busting query returned the new names at once, and the bare root
served the new bundle from the third request onward, a few seconds later. The document's
`cache-control` is `public, max-age=0, must-revalidate`, so this is ordinary edge revalidation rather
than a bad deploy, and it is not a defect. It does mean a verification that reads only the bare root in
the first seconds after a deploy can read the previous release and believe it.

### Rollback

No migration rollback is needed, per the section above. For a bad build over an intact schema:
`npx wrangler deployments list` then `npx wrangler rollback --version-id 8e4fa506-cd63-412c-88f2-0101b6348bdb`,
or redeploy `8ed3422` from a clean checkout the way release 1's rollback path 2 describes. The database
is untouched by this release, so either path restores the previous release completely.

## Live API smoke

Full record in `evidence/runs/release-2-live-smoke.txt`, sixty-four requests against the new release.
Outcomes:

- Root 200 serving the release build's asset names; both new assets 200; `/api/health` 200 `{"ok":true}`
- Five reads with no cookie 401: `/api/me`, the subscription list, a subscription by id, its summary
- Cross-origin sign-in refused 403, `INVALID_ORIGIN`
- Sign-up endpoint 400, `EMAIL_PASSWORD_SIGN_UP_DISABLED`, so it is disabled rather than merely failing
  validation
- Owner sign-in 200, with `HttpOnly; Secure; SameSite=Lax` visible on the cookie and the token redacted
- Sign-out 200, then the identical cookie replayed verbatim reached 401: the session was genuinely
  invalidated, not merely dropped by the client
- The reviewer account: an empty list of its own, and 404 for the owner's subscription, summary,
  members, a member by id, prices, payments, schedules and break months, and for a write, a payment
  write, a delete and a patch
- A child record reached through the wrong parent, inside the owner's own account, 404, for both a
  participant and a standing order
- `POST /api/dev/seed` 404 both with no token and with an arbitrary one

### The demo plan is unchanged by this release

Read before anything was written. Every field equals what `release-1.md` recorded, which is what says
the redesign moved no behaviour: `owedToYouNow` 3999, `creditOutstanding` 2001, `totalCollected` 36000,
`ownerNetCost` 30000, `totalPlanCost` 66000, `collectedThisMonth` 21000, `expectedThisMonth` 6000,
Blake owed 27999 paid 24000 balance -3999, Casey R. owed 9999 paid 12000 balance 2001. The two price
entries, the single break month at S+2, the two payments and the one standing order with its S+5
exception are all present and unchanged.

### The payment cycle, against a hand calculation written first

The arithmetic below was written down before any of the requests were sent. S is the plan's start
month `2026-03`; the current month during the pass is S+6.

Baseline: S+6 priced at 12000 with two active participants, share `round(12000/2)` = 6000.

| Step | Expected | Returned |
|---|---|---|
| Add Dana active in S+6 only | share `round(12000/3)` 4000; Blake owed 25999 balance -1999; Dana owed 4000; `owedToYouNow` 5999; `expectedThisMonth` 8000 | identical |
| Payment 2500 from Dana | Dana paid 2500 balance -1500; `owedToYouNow` 3499; `collectedThisMonth` 23500; `totalCollected` 38500; `ownerNetCost` 27500 | identical |
| Correct it to 3000 | Dana paid 3000 balance -1000; `owedToYouNow` 2999; `collectedThisMonth` 24000; `totalCollected` 39000; `ownerNetCost` 27000 | identical |
| Standing order 1000 covering S+6 | Dana paid 4000 balance 0; `owedToYouNow` 1999; `collectedThisMonth` 25000; `totalCollected` 40000; `ownerNetCost` 26000 | identical |
| That month marked not received | every figure back to the row above | identical |
| Cleanup: payment, schedule, participant | every figure back to the release-1 baseline | identical |

The payment was created 201, re-read in a separate later request with every field intact 200, patched
200, re-read again 200, deleted 204, then 404. The balance moved by exactly 2500 on the create and
exactly 500 more on the correction, and returned when the payment was deleted. Adding a third active
participant for one month is the case a spreadsheet gets wrong: it changes the divisor for that month
only, so Blake's S+6 share falls from 6000 to 4000 while every earlier month is untouched.

### Sign-in rate limiting, found the hard way

A first attempt at this transcript sent its four sign-ins close together. The third answered 400 and a
later one answered 429: the deployment rate limits sign-in per client. Nothing was written during the
refused attempts, and the transcript was re-run with the sign-ins spaced apart, after which all three
answered 200. This is the limiter working as designed, not a defect, and it is recorded here because
the obvious way to script this pass trips it.

## Browser walkthrough, release version `84a95549-cd34-4065-a202-cf5f1385e9f9`

Every capture below came from this release at release SHA `c842f64`, in a throwaway Chrome driven over
the DevTools protocol against the live URL, signed in as the owner except where the second account is
named. The browser reported `assets/index-Bx-I_EYB.js` as the page's only script throughout, so each
capture is of the redesigned build and not a cached predecessor.

### The redesign is what is live

Read from the live page rather than from the source.

- **Tokens.** The machine's dark theme is active, and every token matches the design spec's dark
  column exactly: `--ground` `#0f1512`, `--paper` `#161e19`, `--ink` `#e8ede6`, `--green` `#5dbb86`,
  `--red` `#f28b82`, `--rule` `#2b352e`, `--border` `#6f7b73`. `body` paints `rgb(15, 21, 18)`, so the
  page carries its own ground rather than borrowing one. The font stack resolves to
  `"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- **App bar.** Present on Home and Detail, absent on Login, exactly as spec 3.2 requires. Height 56px,
  `position: sticky`. At 1280 and at 948 the signed-in address is visible; at 375 and 390 it is
  `sr-only` and the wordmark and "Sign out" remain.
- **Section index.** `nav aria-label="Sections"`, sticky at `top: 56px`, height 44px, its inner list
  `overflow-x: auto`. The end-of-document rule that finding F1 turned on is live: with the viewport
  bottom at the document's scroll height, "Standing orders" carries `aria-current="true"` although its
  heading sits 541px below the line, and the other four carry none.
- **States.** The disclosure pattern matches spec 3.7 on all five sections: opening a panel removes
  the primary action from the heading row and returns it on Cancel or on success. On a successful
  payment the panel closed, the status line read "Payment recorded" and focus returned to the
  reappearing "Record a payment" button. A destructive delete opened a confirm strip reading
  "Delete the 45,00 zł payment from Blake?" with focus on Keep, the safe half.
- **Responsive.** At 375 by 812 and at 390 the layout is one column with no horizontal overflow
  (`scrollWidth - clientWidth` is 0 at both), the ledger line stacks one group per row with the label
  left and the figure right, and the page gutter is 16px. At 948 the ledger sits in a single row and
  the panel field pairs sit two to a row.
- **Reduced motion.** Repeated in a second Chrome launched with `--force-prefers-reduced-motion`:
  `matchMedia('(prefers-reduced-motion: reduce)').matches` is true, all five motion tokens
  (`--motion-disclosure-open`, `--motion-disclosure-close`, `--motion-highlight`, `--motion-status-in`,
  `--motion-status-out`) read `0s`, `scroll-behavior` is `auto`, and `document.getAnimations().length`
  is 0 on load and stays 0 through a disclosure open.

### What was recorded in the browser

| Step | Input | Observed | Capture |
|---|---|---|---|
| Sign in | owner account, through the real form | The redesigned sign-in screen, then the subscription list | `release-01-login.png`, `release-02-home.png` |
| Record a payment | Blake, dated S+6 (`2026-09-08`), 45,00 zł, "Release 2 walkthrough, S+6" | Form filled before submitting; after submitting, Blake moved from owing 39,99 zł to being ahead by 5,01 zł | `release-03-input-record-payment.png` |
| Read the balances | none | Five headline cards, the net-cost line, Blake owing and Casey R. ahead | `release-04-output-balances.png` |
| Members and prices | Casey R.'s edit panel opened, then cancelled | Inclusive active range 2026-03 to 2026-06, S to S+3, above the two price entries | `release-06-members-and-prices.png` |
| Standing orders | none | Three month tiles: S+4 and S+6 assumed received, S+5 marked as not received, 60,00 zł over 2 of 3 elapsed months | `release-07-recurring-assumed-received.png` |
| Reviewer account | signed out, signed in as the reviewer | "Your subscriptions (0)" and the empty state | `release-09-reviewer-sees-nothing.png` |
| Phone width | device emulation at 390 CSS pixels | One column, both participants, no horizontal overflow | `release-10-narrow-phone.png` |

The 45,00 zł payment was deleted again through the product's own confirm strip once its arithmetic had
been checked, so the demo state a reviewer opens is exactly the one release 1 left.

### The payment, against a hand calculation

Computed before the screen was read. Blake owed 279,99 zł against 240,00 zł paid, so 45,00 zł recorded
takes him to 285,00 zł paid and a balance of 5,01 zł ahead. Nobody then owes anything, so
`owedToYouNow` falls to 0,00 zł while credit outstanding rises to 25,02 zł, Blake's 5,01 plus Casey
R.'s 20,01. Collected this month rises from 210,00 zł to 255,00 zł and the organizer's net cost falls
from 300,00 zł to 255,00 zł.

The live screen showed exactly those figures, and the API returned `owedToYouNow` 0,
`creditOutstanding` 2502, `collectedThisMonth` 25500, `totalCollected` 40500 and `ownerNetCost` 25500
in minor units, with Blake at owed 27999, paid 28500, balance 501. After the delete every field
returned to the release-1 baseline.

### Refusal states

All three were provoked live on the redesigned interface. Each message names the field or the reason,
and each left the stored data unchanged, confirmed by re-reading the records from the server
afterwards: two payments, one standing order, three participants, none archived, and the baseline
summary in every field.

| Refusal | What was attempted | The message | Where it rendered |
|---|---|---|---|
| Payment before the plan started | Blake, dated `2026-01-15`, two months before S, 20,00 zł | "Date received must not precede the subscription start month" | Under the date field, which took `aria-invalid="true"`, the red-tint ground and focus; the focus ring stayed green, per spec 2.4 |
| Deleting a participant who has records | Delete confirmed on Blake, who has a payment and a standing order | "this member has records attached and is archived rather than deleted" | The Participants section alert, with a Dismiss beside it, and in no other section |
| Overlapping standing order | A second standing order for Blake opening at S+5, inside the one running from S+4 | "two standing orders for one participant may not cover the same month, and two that touch are an overlap rather than a continuation" | The Standing orders section alert, and in no other section |

All three messages are word for word the ones release 1 recorded. Only the first has a named capture in
the set below; the other two are recorded here with their exact messages, because the screenshot list
the submission package fixes has one error slot.

### The screenshot set

Ten files, `evidence/screenshots/release-*.png`, each overwriting release 1's file in the same slot and
at the same dimensions. Nine are browser captures from the live URL at 948 by 1033 with the address bar
visible; `release-05-tests-passing.png` is the Terminal capture at 1340 by 1230 taken in the clean
checkout, and is the one that has no address bar to show. Each is a capture of a single window by its
window id, so nothing else on the machine is in frame.

| File | What it shows | Release SHA / version |
|---|---|---|
| `release-01-login.png` | The redesigned sign-in screen: split glyph wordmark, "Sign in to your ledger.", empty fields, no app bar | `c842f64` / `84a95549` |
| `release-02-home.png` | The post-login list: the app bar with the wordmark, address and Sign out, "Your subscriptions (2)", the demo plan and the relabelled first-deployment artefact | `c842f64` / `84a95549` |
| `release-03-input-record-payment.png` | The payment panel open under its heading, fields filled, two-column pairs, before submitting | `c842f64` / `84a95549` |
| `release-04-output-balances.png` | The leading figure in red, the four ledger cards, the net-cost sentence, the section index with Participants current, Blake owing and Casey R. ahead | `c842f64` / `84a95549` |
| `release-05-tests-passing.png` | The release SHA and `npm test` passing, from the clean checkout at `c842f64` | `c842f64` |
| `release-06-members-and-prices.png` | Casey R.'s inclusive active range, 2026-03 to 2026-06, above the price history with its change | `c842f64` / `84a95549` |
| `release-07-recurring-assumed-received.png` | The standing order's three months, two assumed received and one marked not received, with the total over 2 of 3 elapsed months, and Standing orders current in the index | `c842f64` / `84a95549` |
| `release-08-error-before-start-month.png` | The refused payment, its message under the date field, both stored payments untouched below | `c842f64` / `84a95549` |
| `release-09-reviewer-sees-nothing.png` | The second account signed in, "Your subscriptions (0)" and the empty state | `c842f64` / `84a95549` |
| `release-10-narrow-phone.png` | The detail screen at 390 CSS pixels, one column, no horizontal overflow | `c842f64` / `84a95549` |

Two notes on how the captures were taken, so nobody has to guess. Each is a capture of the test
browser's own window rather than of the screen, so the address bar is genuine and nothing outside the
browser is in frame. `release-10-narrow-phone.png` uses device emulation at 390 CSS pixels because the
window manager clamps the window to a wider minimum, which is the same limitation release 1 and the
S-02 walkthrough recorded; that is why the page occupies the left portion of a wider window in that one
capture.

The title bar of the browser captures shows the window inactive in some frames and active in others,
because another application on the machine contends for focus and the capture is taken by window id
regardless. It changes the tint of three buttons in the title bar and nothing in the page.

No capture shows a password, a token or a session cookie. The two account addresses are visible, which
is deliberate and unchanged from release 1; the passwords behind them stay in
`evidence/private/reviewer-credentials.md`.

## Defects found

None. Every spec property checked above matched, every refusal message matched release 1's wording,
every balance matched a hand calculation made before the request, and the demo plan's figures were
identical before and after the pass.

Two behaviours were investigated as possible defects and cleared:

- **The primary action disappearing from a section heading while its panel is open.** Reproduced on all
  five sections and then found to be prescribed: design spec 3.7 says the button "is removed from the
  heading row and the form appears directly under the heading", and it reappears on Cancel or on
  success. Correct as built.
- **The bare root serving the previous release's asset names for a few seconds after the deploy.**
  Cloudflare edge revalidation under `max-age=0, must-revalidate`, recorded under the deploy above.
  Not a defect, but a trap for any check that reads only the bare root immediately after a deploy.

## What was not exercised live in this phase

Stated rather than left to inference, in the same spirit as release 1's closing note.

- The archive flag on a participant, and the unarchive that follows it. The refusal that matters,
  deleting a participant who has records, was provoked; archiving is covered by the integration suite.
- The refusal to delete an owner member, and the refusal of a second owner on one subscription. Both
  are covered by `tests/integration` and were left unprovoked live for release 1's reason: the only way
  to ask for them is to send a delete at a row that can never be recreated.
- Deleting a price entry with `confirm=true`, and deleting a break month. The guard was exercised in
  release 1; the destructive half deliberately was not, and the demo plan keeps its price history.
- A future-dated payment. Covered by unit tests over `validatePaymentDate`; only the before-start-month
  half was provoked live, because it is the one with a named capture slot.
- The sign-in rate limit was met accidentally rather than probed deliberately, and was not pushed
  further once its behaviour was clear.
- Light theme. The machine driving the walkthrough is in dark mode, so every capture is the dark
  palette, as release 1's were. The light tokens are covered by the change's own captures under
  `context/changes/visual-redesign/`.
- A screen reader. Roles, names, `aria-current`, `aria-invalid`, `aria-describedby` and the live
  regions were read from the accessibility tree, which is not the same as hearing them announced.

## Hand-off

- `docs/SUBMISSION-PACKAGE.md` section 2 still names release 1's version id
  `8e4fa506-cd63-412c-88f2-0101b6348bdb` and flags the S-06 redeploy as outstanding. It should now name
  `84a95549-cd34-4065-a202-cf5f1385e9f9` at `c842f64`, and the ten screenshot slots it lists are
  satisfied by the refreshed captures above. That edit is left to whoever owns that document; this
  slice does not write outside `evidence/` and its own checkpoint.
- The goal-box updates this evidence supports (V06, D05, B12, B08) are handed to the designated status
  writer by naming the paths above. This slice does not edit `context/STATUS.md`, `evidence/index.md`
  or the workspace `GOALS.md`.
- Nothing has been uploaded, attached, sent or submitted to the course, and nothing here authorizes
  that.
