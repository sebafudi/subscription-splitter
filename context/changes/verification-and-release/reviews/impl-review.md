<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Implementation plan, verification and release

- **Plan**: `context/changes/verification-and-release/plan.md`
- **Scope**: Phases 1 to 5 of 5 (all phases; Progress shows 65 of 65 boxes checked)
- **Commits reviewed**: `9a7fa17`, `f927a1c`, `8ed3422`, `b039732`, `312f4d2`, `a323474`, `d52092d`,
  `0a5f98f`, `5767639`, `e3ab6e5`, `a5ab2b4`, `2d9de6a`, `8c8c5e5`, `2bbfdc7`
- **Repository state**: reviewed against `2bbfdc7`. The release gates were reproduced in a throwaway
  `git clone` checked out at `8ed3422` with a fresh `npm ci`, so nothing in the shared working copy
  reaches these results. The live instance was probed read-only, with no credentials.
- **Verdict**: NEEDS ATTENTION (approve with required changes)
- **Findings**: 0 critical, 4 warnings, 3 observations

Date and effort fields the report schema lists are omitted, matching this repository's convention of
recording progress by change ID, migration ID and commit.

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Verification performed

Nothing below was taken from the slice's own prose. Each row was re-derived or re-run.

### Release integrity

| Check | Result |
|---|---|
| `git merge-base --is-ancestor 0ff74bd 8ed3422` | exit 0; the release is downstream of S-03's archive |
| Throwaway clone at `8ed342278443e371819c1be58a8042b94c507254`, `npm ci` | clean |
| `npm run typecheck` | clean across all three projects |
| `npm run test:unit` | `Test Files 15 passed (15)` / `Tests 185 passed (185)` |
| `npm run test:integration` | `Test Files 11 passed (11)` / `Tests 112 passed (112)` |
| `npm run build` | exit 0, both worker and client |
| `gh run list --commit 8ed342278443e371819c1be58a8042b94c507254` | one row, workflow `CI`, conclusion `success`, run `34716922381` |

The recorded counts match the reproduced counts exactly, and both match the `904ebcc` baseline, so
nothing regressed and no test quietly left the suite. The deployed version id
`8e4fa506-cd63-412c-88f2-0101b6348bdb` and the release SHA are consistent across `context/STATUS.md`,
`evidence/runs/release-1.md`, `evidence/runs/release-1-live-smoke.txt`, `evidence/index.md` and
`evidence/work-log.md`; no file names a different id as current.

### The live numbers, re-derived from the accounting rules

Derived from `src/domain/money.ts`, `calc.ts`, `prices.ts`, `month-status.ts` and `recurring.ts`
against the inputs recorded in the transcript, before reading the recorded outputs.

`shareForMonth` is `Math.round(price / activeCount)` over everyone active including the owner, and
the owner's residual is implicit: non-owners appear in `memberResults` and `ownerShareThisMonth` is
`currentMonthly - expectedThisMonth`. `priceForMonth` short-circuits a break month to zero.
`memberMonthStatus` excludes `month > current`, so the current month counts.

| Month | Price | Active seats | Rounded share |
|---|---|---|---|
| S `2026-03` | 10000 | 3 | 3333 |
| S+1 `2026-04` | 10000 | 3 | 3333 |
| S+2 `2026-05` | 0 (break) | - | 0 |
| S+3 `2026-06` | 10000 | 3 | 3333 |
| S+4 `2026-07` | 12000 | 2 | 6000 |
| S+5 `2026-08` | 12000 | 2 | 6000 |
| S+6 `2026-09` | 12000 | 2 | 6000 |

Blake `3333*3 + 6000*3 = 27999`; Casey `3333*3 = 9999`; plan cost
`10000+10000+0+10000+12000+12000+12000 = 66000`; `owedToYouNow 37998`; `ownerNetCost 66000`. Every
one of these follows from the recorded inputs and matches the recorded response at
`evidence/runs/release-1-live-smoke.txt:126`.

The three deltas re-derive too. With the throwaway participant active in `2026-09` only, that month
splits three ways at 4000, which is why Blake reads 25999 and `owedToYouNow` 39998 in that window.
The 2500 payment moves `owedToYouNow` 39998 to 37498; the patch to 3000 moves it to 36998, exactly
500 more; the 1000 standing order covering only `2026-09` counts that month and moves it to 35998,
and the exception on the same month returns it to 36998, exactly the same 1000. Phase 4's figures
follow the same way: Blake owed 27999 against 18000 manual plus two counted schedule months of 3000
is a balance of -3999; Casey owed 9999 against 12000 is +2001; `totalCollected` 36000;
`ownerNetCost` 30000; `collectedThisMonth` 21000 as the 18000 payment dated in `2026-09` plus that
month's 3000 schedule row. The cold re-read table reproduces all of them.

### Screenshots

All ten were opened. Nine show the address bar reading
`subscription-splitter.sebastianfudalej.workers.dev`; the tenth is the terminal frame and has none,
as the plan says. No password, token or session cookie is visible anywhere; the two seeded addresses
are, which is deliberate and matches the first deployment's precedent. Nothing outside the browser
window is in frame, apart from a blank automation tab. `release-04` shows 39,99 / 60,00 / 60,00 /
210,00 of 60,00 / 2 active, net 300,00 against a plan total of 660,00, Blake owing 39,99 on 279,99
against 240,00 and Casey R. ahead by 20,01 on 99,99 against 120,00, which is the hand calculation
above to the grosz. `release-07` shows two counted months and `2026-08` drawn as not counted, total
60,00 over 2 of 3. `release-08` shows the refusal under the date field with both stored payments
intact above it. `release-10` stacks to one column with no horizontal overflow. `release-05` is
addressed as F1.

### mvp-check criteria 3 and 5, re-derived independently

Criterion 3 holds. `context/foundation/test-plan.md` §2 defines six risks before naming any test and
§2.1 maps each to files. The report's quotation of risk 1 and risk 2 is verbatim from §2. Every
citation resolves at the exact line given: `src/domain/calc.test.ts:48`, `:70`, `:92` and `:155`, and
`tests/integration/payments.test.ts:95`, `:149`, `:257`, `:295`, each carrying the test name the
report quotes. `tests/integration/router-isolation.test.ts` exists.

Criterion 5 holds, and was tested rather than read. From the throwaway clone at the release SHA, the
README's own recipe was followed end to end: `.dev.vars` from `.dev.vars.example`,
`npm run db:migrate:local` applied all six migrations from one call, `npm run build`,
`npm run dev:worker`, `npm run seed:local`. Both accounts were created, `GET /api/health` answered
200, a sign-in as the seeded owner answered 200, `/api/me` answered 200 with the cookie and 401
without it, and the root served the shell. The README's idempotency claim holds: a second
`seed:local` reported `"created":false` for both. The build-before-`dev:worker` step the README adds
is real, and `wrangler.jsonc:10-14` is why.

The report uses the prompt's own markers `✅` and `❌`, one per criterion, its `X/5 * 100`
percentage, and its checklist / project status / prioritized improvements structure, and it honours
the prompt's exclusions: visual design, styling, polish, accessibility and deployment are not
scored. Writing it in English is a deviation from the Polish prompt's section names, decided in the
plan and stated in the report's own opening.

### Safety, secrets and the state left behind

`git grep` over tracked files finds no value for any name in `.dev.vars.example`. `evidence/private/`
is excluded at `.gitignore:14` and `git ls-files` returns nothing under it; every mention of that
path in a tracked file is a path reference, never a value. The transcript contains no unredacted
`session_token=`.

Read-only probes against the live URL, with no credentials: `/` 200, `/api/health` 200, `/api/me`
401, `/api/subscriptions` 401, `POST /api/dev/seed` 404. The deployment behaves as the transcript
records.

The walkthrough leaves exactly two subscriptions. "Family music plan" holds Alex (owner), Blake and
Casey R., two price entries, one break month, two payments and one standing order with one excepted
month. "First deployment artefact (not the demo plan)" holds one owner member and nothing else. The
transcript proves the demonstration residue is gone: after cleanup the members list is the three
demo participants, and payments and schedules are both `[]` at the close of phase 3.

### Progress honesty

Twelve checked rows were sampled across all five phases and each has its evidence: 1.3 (`rg "scaffold
exists" AGENTS.md` returns nothing), 1.4 (the README names six migrations), 1.5
(`context/foundation/infrastructure.md` names the Worker, the database id `03067638-dc95-4b5c-9a8a-
86f2921e0414` and every secret by name), 2.6, 2.8, 2.13, 2.15, 2.19 (all re-run or re-checked above),
3.5, 3.6 and 3.13 (transcript lines 414-422, 151-227 and 237-240), 4.1, 4.5 and 5.10. No row was
found checked without evidence. The gaps at 2.12 and 4.10 are not omissions: both rows were removed
during the plan review's resolution and the removal is recorded there. Per-phase row counts equal the
criterion bullets in both splits, 7/3, 13/5, 9/6, 3/8, 7/4.

## Findings

### F1 - The passing-tests capture is a rendered frame, not a terminal capture

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `evidence/screenshots/release-05-tests-passing.png`;
  `context/changes/verification-and-release/plan.md:387-398`
- **Detail**: The plan's contract asks for "a terminal capture taken in the clean checkout showing
  `git rev-parse HEAD` and the `npm test` run in the same frame". What exists is an image of typeset
  text: the run's stdout was captured, rendered into an HTML terminal frame and photographed with
  headless Chrome, with the scratch checkout's absolute path edited to `~/release-8ed3422`.
  `evidence/runs/release-1.md:65-70` discloses this plainly and the underlying run is genuine - this
  review reproduced `15 passed (15)` / `185 passed (185)` and `11 passed (11)` / `112 passed (112)`
  at the same SHA in a fresh clone, matching the image. So nothing false is claimed. But the artifact
  is a reconstruction of a flow rather than a record of it, the disclosure lives in a file the
  Builder form's reviewer never receives, and B12 asks for a screenshot of passing tests. Judged
  against B12 as it stands: it does not meet the bar, and it should be retaken. The cost of retaking
  is near zero, because the commands reproduce the same numbers on demand.
- **Fix**: Re-run `git rev-parse HEAD`, `git status --porcelain`, `npm run typecheck` and `npm test`
  in a real terminal in a clean checkout at `8ed3422` and screenshot that window, replacing the file
  at the same path. Rewrite `evidence/runs/release-1.md:65-70` to describe a genuine capture rather
  than a rendering, and drop the `—` from the window title while retaking, since the repository's
  convention is a hyphen.
  - Strength: Removes the only artifact in the package whose provenance a reviewer could reasonably
    question, and the numbers are already proven reproducible at that SHA.
  - Tradeoff: One command sequence and one screenshot; the path in frame will be long rather than
    tidy.
  - Confidence: HIGH - this review ran the identical commands at the identical SHA and got the
    identical counts.
  - Blind spot: None significant.
- **Decision**: PENDING

### F2 - The release summary states the Casey range correction backwards

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `evidence/runs/release-1.md:355-356`
- **Detail**: The summary says "correcting Casey's leave month from S+3 to S+4 moved Blake from
  25999 to a different figure". Its own transcript shows the opposite direction: Blake reads 27999
  at the baseline before the correction (`release-1-live-smoke.txt:262`), 25999 after it (`:275`),
  and 27999 again when it is put back (`:288`). 25999 is the result, not the starting point. The
  arithmetic confirms the transcript: with Casey active through `2026-07`, that month splits three
  ways at 4000 instead of two ways at 6000, so Blake falls by exactly 2000 and Casey rises by 4000 to
  13999. This is the one place in the evidence where the prose contradicts the record it summarises,
  in a file whose job is to be the readable version of that record.
- **Fix**: Replace the clause with the figures from the transcript: the correction moved Blake from
  27999 to 25999 and Casey from 9999 to 13999, and putting it back restored the baseline exactly.
- **Decision**: PENDING

### F3 - STATUS.md tells a resuming reader the slice is still `implementing`

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `context/STATUS.md:22` and the Next-executable-action list, item 3
- **Detail**: Both say S-04's status is `implementing` and both cite `change.md` as the source.
  `context/changes/verification-and-release/change.md:4` reads `status: implemented`. The same
  STATUS bullet later says "The change moves to `implemented` at the end of this phase", so the file
  contradicts itself as well as the file it cites. The status sync at `2bbfdc7` changed two lines and
  did not reach these. Progress row 5.7 is checked for "a reader can follow STATUS to the release,
  the evidence and the next action without asking", and the first thing such a reader is told about
  this slice is wrong.
- **Fix**: Change both occurrences to `implemented`, leaving the rest of the bullet as it is.
- **Decision**: PENDING

### F4 - The B02 evidence row carries an unfilled placeholder where its commit belongs

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `evidence/index.md:59`
- **Detail**: The row reads "version `8e4fa506-cd63-412c-88f2-0101b6348bdb`, commit for this phase".
  Every other row this slice added names a SHA, and phase 5's contract for the index requires each
  row to name "the artifacts by path, the commit, and the release version id". The index is the map
  the final audit walks, so a row that names no commit cannot be traced the way the others can.
- **Fix**: Replace "commit for this phase" with `2d9de6a`, the phase 5 commit that added the row.
- **Decision**: PENDING

### F5 - The plan's prose on the assumed-receipt rule reads as if the current month does not count

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `context/changes/verification-and-release/plan.md:205-206`
- **Detail**: The Current-month sensitivity note says the rule "counts a standing-order month only
  once it has elapsed in the subscription's own time zone". The implementation excludes only
  `month > current` (`src/domain/month-status.ts:54`), so the current month itself counts, which is
  what both live halves actually show: the transcript's schedule covering `2026-09` alone counted
  that month for its full 1000, and the walkthrough counted three months with the current month among
  them. The prose is a plan-local imprecision only; no shipped document repeats it, and
  `context/foundation/test-plan.md` risk 4 states the rule correctly.
- **Fix**: Reword to say the rule counts a month once it has begun, excluding only months after the
  current one.
- **Decision**: PENDING

### F6 - What was deliberately not exercised live is correctly scoped and correctly recorded

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: `evidence/runs/release-1.md:389-406` and `:501-508`
- **Detail**: Four omissions were checked against the goals rather than accepted on the slice's word.
  None is required. D05 names live login/logout, CRUD persistence, balances and ownership isolation,
  and all four are live-verified. B08 asks that error states be usable, and three refusals were
  provoked live against the deployment, each confirmed to have stored nothing. The archive flag and
  the confirmed price delete are covered by the integration suite and neither is named by B01 to
  B08. The sign-in rate limit's reason, that deliberate failed sign-ins against the live account
  would be indistinguishable from an attack in the logs, is sound, and risk 6 is defended at the
  integration layer. The one weak reason is the owner-member delete refusal, described as "reasoned
  about rather than provoked": a 409 is the expected answer and the analogous dependents refusal was
  provoked live without incident, so the stated reason proves less than the others. Nothing turns on
  it, since `tests/integration` covers it and the summary does not claim otherwise.
- **Fix**: Leave the omissions as they are; if the sentence is touched, say the refusal was left
  unprovoked to keep the live pass free of deletes aimed at permanent rows, which is the real reason.
- **Decision**: PENDING

### F7 - A reviewer opening the live instance is not told why the second plan is there

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `evidence/runs/release-1.md:539-567`, the package inventory
- **Detail**: The owner account holds two subscriptions. "First deployment artefact (not the demo
  plan)" says what it is not; it does not say what it is, and the explanation - that it predates
  `0003_members.sql`, was repaired rather than removed, and cannot be deleted because the product
  exposes no delete for a subscription - lives only in this file and in D-010, neither of which a
  course reviewer receives. The inventory already says the submission comment should name which
  account is which; the empty second plan deserves the same one line, so it reads as a deliberate
  artefact rather than as a half-finished feature.
- **Fix**: Add a line to the reviewer-instruction bullet of the package inventory: the second
  subscription is the first deployment's artefact, kept because the product intentionally exposes no
  delete for a subscription.
- **Decision**: PENDING

## Resolution

All four required findings are resolved and all three observations were taken rather than noted. Each
was re-checked against the repository before being acted on, and every citation in the review held.

| Finding | Decision | What changed |
|---|---|---|
| F1 | Accepted, retaken | `evidence/screenshots/release-05-tests-passing.png` is now a photograph of a real Terminal window, not a rendered frame. The four commands were typed into one window sitting in the clean checkout at `8ed3422`, and the window was captured by its window id once they finished, so nothing else on the machine is in frame. The typed command line is the first thing visible, the full SHA is the first line of output, and the SHA is echoed again at the bottom under `--- release SHA again ---`, so the run is bracketed by the commit it describes. Counts in frame: typecheck clean, unit 15 files and 185 tests, integration 11 files and 112 tests, identical to the figures this review reproduced independently. The disclosure paragraph in `evidence/runs/release-1.md` was rewritten to describe a capture rather than a rendering, and the rendered frame with its em-dash title is gone entirely, so that half of the fix is moot rather than applied. |
| F2 | Accepted | The sentence read the correction backwards. It now says what the transcript shows: correcting Casey's leave month from S+3 to S+4 moved Blake from 27999 down to 25999 and Casey from 9999 up to 13999, because S+4 then splits three ways at 4000 instead of two ways at 6000, and putting the leave month back restored the baseline exactly. |
| F3 | Accepted | Both occurrences in `context/STATUS.md` now read `impl_reviewed`, matching `change.md`. The self-contradicting sentence the review also caught, "the change moves to `implemented` at the end of this phase", is replaced by the actual sequence: implemented at `2d9de6a`/`8c8c5e5`, reviewed at `668e708`, findings resolved here. |
| F4 | Accepted | The B02 row in `evidence/index.md` names `2d9de6a`, the phase 5 commit that added it, in place of "commit for this phase". |
| F5 | Accepted | The plan's Current-month sensitivity note now says the rule counts a month once it has begun, excluding only months after the current one, and names `memberMonthStatus`'s `month > current` as the reason. |
| F6 | Accepted, reworded | The omission reason was the weakest of the four and the review said so correctly. It now states the real reason: the refusal was left unprovoked to keep the live pass free of deletes aimed at permanent rows, and since the dependents refusal was provoked live without incident, the reason is not that a 409 was doubted but that the only way to ask for this one is to send a delete at a row that could never be recreated if the refusal failed to hold. The omissions themselves are unchanged, as the review advised. |
| F7 | Accepted | The package inventory's reviewer-instruction bullet now carries the exact wording to copy into the submission comment, explaining what the second subscription is, why it is kept, and why the second account is empty. |

Nothing in the review was rejected or deferred.

**One thing worth recording about F1, because it is the kind of side effect that is easy to leave
behind.** Driving Terminal by AppleScript, the first attempt resized the wrong window: `do script`
created a new window but `window 1` still resolved to a pre-existing one, which was then given the
large bounds meant for the new one. The commands ran correctly in the new window throughout, so no
evidence was affected, and the pre-existing window held an idle shell with nothing in progress. The
second attempt addressed the target window by its own id instead. The window this work created was
closed afterwards and the pre-existing one was left at ordinary bounds, but its original geometry was
not recorded before it was changed and therefore could not be restored exactly.
