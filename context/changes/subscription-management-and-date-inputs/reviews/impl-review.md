<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Edit and delete the subscription itself, and use native browser calendar controls

- **Plan**: `context/changes/subscription-management-and-date-inputs/plan.md`
- **Scope**: Phases 1 to 6 of 6 (Progress shows 54 of 57 boxes checked; 2.8, the `no-owner` half of
  4.17 and 6.1 are open)
- **Commits reviewed**: `4978603` through `89fabe5`, against the pre-change baseline `8c187fc`. The
  designer's rulings amendment `89b537a` and acceptance `689bfe9` landed in parallel during this
  review and are included; the repository was read at `7f2b047`.
- **Repository state**: the reviewer wrote no part of the brief, the research, the delta, the plan,
  the code or the evidence, read the code before the checkpoints, and modified no source file.
- **Verdict**: APPROVED (with two corrections, both to comments rather than to behaviour)
- **Findings**: 0 critical, 2 warnings, 6 observations

Date and effort fields the report schema lists are omitted, matching this repository's convention of
recording progress by change ID and commit.

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | WARNING |

## Verification performed

Every gate was re-run in this checkout rather than accepted from `evidence/runs/s08-gates.txt`. No
file under `src/`, `tests/` or `migrations/` differs between `89fabe5` and the reviewed `7f2b047`,
so the run applies to the head of the change.

| Gate | This review | Recorded in `s08-gates.txt` |
|---|---|---|
| `npm run typecheck` | clean, three projects | clean, three projects |
| `npm run test:unit` | 22 files / 262 cases passed | 22 files / 262 cases |
| `npm run test:integration` | 13 files / 131 cases passed | 13 files / 131 cases |
| `npm run build` | succeeds, 59 modules | succeeds |

The recorded counts are exact. Against the baseline the suite grows by 4 unit files and 1
integration file; no pre-existing test file was deleted.

### Stability guards, read against `8c187fc`

| Guard | Reading |
|---|---|
| Accounting untouched | `git diff --stat 8c187fc..HEAD -- src/domain migrations` is empty |
| Participant delete rules intact | `src/server/db/members.ts` and `src/server/routes/members.ts` have no diff; the owner-cannot-be-deleted 409 and the archive-instead-of-delete 409 are unchanged |
| Price delete confirm flow intact | `monthsLosingTheirPrice` and the `?confirm=true` gate are untouched |
| Standing-order tiles intact | `RecurringSection.tsx` gains only the `ConfirmStrip` prop pass-through defaults |
| No test weakened | the two rewritten cases both assert strictly more than before (see below) |
| Clock reads | the month decision reads only `currentMonth`; the three `new Date().toISOString()` hits are pre-existing `created_at` stamps |
| Wire formats | every calendar value is a plain `YYYY-MM` / `YYYY-MM-DD` string read through `.value`; no `valueAsDate`, no `valueAsNumber`, no `Date` built from a field value |
| Date metadata in authored files | none; the two ISO-shaped strings in the evidence file are synthetic fixture payment dates |
| Em dashes in new prose | none outside `plan.md`'s Progress marker, which is the repository's existing convention (identical line in `context/archive/google-sign-in/plan.md`) |

The two rewritten tests are strengthenings, not weakenings. `tests/integration/members.test.ts`
previously asserted that a `start_month` PATCH was **refused**, which encoded the contract this
change deliberately reverses; the replacement asserts 200, the stored month, and additionally that
the owner's opening range shifted. `src/server/validation/subscriptions.test.ts` flips `start_month`
from rejected to accepted and adds a malformed-month loop that did not exist. The
`tests/integration/accounts.ts` diff is comment-only.

### Deletion, focus point 1

One `db.batch` at `src/server/db/subscriptions.ts:484` with exactly eight statements, listed at
`:494-512` in the order `recurring_exceptions`, `recurring_schedules`, `payments`, `active_ranges`,
`members`, `price_history`, `break_months`, `subscriptions`. Child precedes parent on every edge.
No statement is scoped by subscription id alone: `OWNED_MEMBER_IDS:469-471` and
`OWNED_SUBSCRIPTION_IDS:473` both carry `s.id = ? and s.user_id = ?`, and the exceptions delete
joins the full chain inline at `:499-502`. There is no pre-read, so a foreign or unknown id empties
every subquery, the last statement reports zero changes and the route answers the existing
non-disclosing 404 at `src/server/routes/subscriptions.ts:52`; the bodies for foreign and unknown
are asserted byte-identical at `tests/integration/subscription-deletion.test.ts:149-168`.

The fixture at `:34-68` creates every child kind including a standing-order exception, `:118-121`
asserts each count is above zero before, `:127` asserts all eight are zero after, and `:138-146`
asserts a sibling subscription and a foreign user's subscription survive. The atomicity case at
`:185-205` appends a ninth statement colliding with the **sibling's** `break_months` primary key, a
row no statement in the batch removes, so the rejection is genuine and the post-state assertion
would fail if the eight deletes had landed. It can really fail. See observation O1 for its one
missing precondition.

The phase 1 review's Resolution did land: `git show 688757a` adds the sixth `exists` clause and the
owner-range re-read and replaces the assembled response with a read-back, and all three are present
at head. The prior review was not re-derived beyond confirming this.

### Edit rules, focus point 2

Six guards, none missing and none duplicated, at `src/server/db/subscriptions.ts:315-354`: the owner
opening-range case at `:322`, then participant (`:332-333`), price (`:334`), skipped month (`:335`),
payment (`:336-337`) and standing order (`:338-339`). `FIRST_MONTH_KINDS:115-121` lists the five
kinds in the delta's order, and `firstMonthRefusal:155-158` uses a strict comparison so the
first-listed kind wins a tie, with the owner candidate pushed last at `:148-153`. The currency lock
(`:308-310`, sentence at `:75`, field `'currency'` at `:453`), the ten-year floor derived from
`currentMonth` in `floorMonth:70-73` and applied on create (`:185-188`) and edit (`:278-288`), the
owner sentence at `:151` and the no-because lost-race sentence at `:404` are all verbatim against
the delta and section 9. The owner range is shifted in the same `statements` array passed to
`db.batch` at `:379`, excluded from the minimum check at `MINIMUMS_SQL:100` and at `:333`, and
revalidated through `validateActiveRanges`, the identical function `src/server/routes/members.ts`
uses. The `meta.changes === 0` re-read at `:381-406` re-derives against the re-read row. The empty
body is refused at `src/server/validation/subscriptions.ts:57`.

Client side: `subscriptionEdits.ts:47-59` returns `null` when nothing differs, so a no-op submit
issues no request and closes with no status line (`SubscriptionSettings.tsx:80-84`,
`SubscriptionDetail.tsx:272`); the Currency disabled derivation is `currencyLocked` at
`subscriptionEdits.ts:87-93`, read only in the `ready` state; `onUpdated` replaces the held object
with the PATCH response (`App.tsx:64`) and reloads the detail (`SubscriptionDetail.tsx:270`), and
the Home row reflects the edit with no navigation, confirmed in the evidence by a navigation-entry
count that stays at one.

### Calendar controls, focus point 3

Detection at `src/client/components/ui/monthControl.ts:21-28` runs both probes, takes an injectable
element factory and guards the default factory against an absent document at `:22`; the result is
cached once per page load at `MonthField.tsx:7-12`. `monthControlBranch` at `:31-33` is pure and
both branches are asserted at `monthControl.test.ts:58-66`. The option range at `:51-62` honours
`min`/`max`, falls back to January of the tenth year back and December of next year, and stretches
in both directions to include the held value at `:56-59`. `grep -rn "valueAsDate\|valueAsNumber\|new
Date(" src/client src/domain` returns only the sanctioned domain clock read, an epoch constant in
`isCalendarDate`, two pinned-clock test lines and the two display-formatter sites in `format.ts`.
All eight call sites are migrated; `min` matches the Bounds paragraph exactly, including the paired
bounds that appear only for a complete month (`pairedMonthMin`, `monthControl.ts:102-104`) and the
ten-year floor on both create and edit; there is no `max` and no `step` anywhere. The CSS at
`index.css:290-300`, `:345-350` and `:484-487` matches the amended 3.4 Box paragraph, and the
measured heights make the `min-height` exception unnecessary. The `Field.tsx` doc comment is the one
place this dimension does not hold; see F2.

### Header behaviour, focus point 4

Per-state enablement is derived in one place, `subscriptionEdits.ts:71-80`: `ready` enables both,
`no-owner` enables delete only, and the default covers `loading` and `error` with both disabled.
All seven focus destinations are wired as the delta states, ending at the Home `h1` carrying
`tabIndex={-1}` (`SectionHeader.tsx:44,49`) after a deletion and at the alert paragraph
(`SectionAlert.tsx:35`) after a failure. Both buttons sit inside a single
`{!panelOpen && !confirming && …}` guard at `SubscriptionDetail.tsx:204-235` while `.detail-actions`
stays mounted around the always-present status line at `:236`, which is exactly phase 4/5 ruling 2.
`ConfirmStrip` gains the optional second sentence and `aria-busy` without changing its labels in
flight, and the four pre-existing call sites pass neither new prop, so they are behaviourally
identical. The 404 path sets `gone` at `:182-185` and renders "All subscriptions" beside "Dismiss"
at `:239-250`. Every copy string in the delta's section 9 table matches verbatim.

### Evidence quality, focus point 5

`evidence/runs/s08-browser-verification.md` supports each manual Progress row it ticked, and does so
by naming the property each value was read from rather than by assertion: rendered `type`, `min`,
`max` and `step` per field in a table; the paired bound measured across set, changed and cleared;
captured request bodies per field; `getBoundingClientRect` heights at both widths; computed focus
outlines in both themes; `getAnimations().length` and `transition-duration` for reduced motion;
`scrollWidth - clientWidth` for overflow. The 33 captures cover all seven items of the delta's
section 11. Two claims are properly qualified rather than overstated: the Safari height is declared
a pixel measurement off a 1:1 capture, and the edit-panel first-month request body is recorded as
inferred from the refusal rather than captured. The Unverified table is honest and specific, naming
Firefox, Edge and the two mobile browsers, the four Safari limitations and the `no-owner` state,
each with what would settle it. Rows 2.8 and the `no-owner` half of 4.17 are correctly left open
with the reasons stated in the plan's own note.

On the `COOKIE_SECURE` report: this is **not** a documentation gap. `README.md:25` already directs
the reader to set it to `false` locally when a browser refuses the cookie over plain http, and
`.dev.vars.example:15-18` names Safari as that browser explicitly. The evidence file says so itself
and records that the file was restored byte-identical. The only thing undocumented is that the
failure is *silent*: the form returns to the login screen with no error. That is a one-clause
addition at most and is filed as observation O5, not a finding.

### Foundation documents, focus point 6

FR-027, FR-028 and FR-029 each describe behaviour that exists: the five settings and their bounds,
the eight-table atomic delete with its explicit carve-out against FR-012 and FR-013, and the shared
month control with the wire format unchanged. FR-005 and FR-011 gain accurate `> Shipped:` notes,
and two non-functional lines gain what an editable time zone and locale move. The test-plan
additions name tests that exist. The roadmap entry reads `in-progress`, which is correct while the
change is unarchived. `AGENTS.md` carries its S-08 paragraph at lines 9-11 and the two convention
sentences at lines 51-52. The phase 5 agent's report that it had been lost was a stale-tree
artefact and nothing else of the kind survives at head. Nothing is duplicated and nothing is false.

## Findings

### F1 — A comment falsified by this change survives in `src/client/format.ts`

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `src/client/format.ts:3`
- **Detail**: The module header states "every value the client sends stays `YYYY-MM` or
  `YYYY-MM-DD`, and every input and hint keeps the ISO form". The first half is still true and is
  the point of the change. The second half is exactly what this change removed: the amended 3.4
  deletes the ISO hints and replaces the plain inputs with native controls. Phase 1 ran a falsified
  comment sweep and row 1.6 scoped it to `src/server/`, so the client was never swept, and
  `format.ts` is not in the change's diff at all. `AGENTS.md` requires a modified comment to
  describe how the code works now; the same standard applied here would have caught it.
- **Fix**: Drop the clause, leaving "every value the client sends stays `YYYY-MM` or `YYYY-MM-DD`".
- **Decision**: PENDING

### F2 — The rewritten `Field` hint comment overstates the rule

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `src/client/components/ui/Field.tsx:14-15`
- **Detail**: This change deliberately replaced "the ISO form of a month or date belongs here" with
  "it carries meaning a label cannot, never the format of a value, which the calendar controls
  themselves show". The trailing clause is about calendar controls, but the absolute "never the
  format of a value" is contradicted by three live call sites that pass `hint="Amount, like 100.00"`
  (`PaymentForm.tsx:173`, `PriceHistory.tsx:335`, `ScheduleForm.tsx:156`), which is precisely a
  format hint. The comment now forbids a pattern the component is used for on the same screen. This
  is the focus point asking whether the doc comment is truthful; it is not, though the code is
  correct.
- **Fix**: Narrow the sentence to "never the format of a calendar value, which the calendar controls
  themselves show", which leaves the money hints legitimate.
- **Decision**: PENDING

### O1 — The atomicity test has no non-empty precondition

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `tests/integration/subscription-deletion.test.ts:185-205`
- **Detail**: The test is not vacuous: the injected ninth statement collides with a row the batch
  never removes, so the rejection is real, and a broken rollback would leave the eight deletes
  applied and fail `toEqual(before)`. But unlike the main deletion case at `:118-121`, this one
  never asserts that `before` holds anything. If the fixture ever stopped creating rows, `before`
  and the post-state would both be all-zero and the test would pass while proving nothing.
- **Fix**: Assert `before` is non-empty before the rejection, reusing the same above-zero loop the
  main case already uses.
- **Decision**: PENDING

### O2 — Plan row 6.1 is left unticked though it is satisfied

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `context/changes/subscription-management-and-date-inputs/plan.md`, phase 6 Automated
- **Detail**: 6.1 ("typecheck, the whole suite and the production build all still pass") is the only
  unticked automated row in the plan. The phase 6 checkpoint explains the omission honestly: the
  working tree carried another agent's uncommitted client work, so only typecheck was run, and the
  row was handed to phase 5's gate run. Phase 5's run at `31398ab` does record all three gates, and
  this review re-ran all three at head with the same results. The row is substantively closed but
  reads as pending, which is the one thing standing between the plan and 57 of 57.
- **Fix**: Tick 6.1 against the phase 5 gate commit `e40acbf`, the commit that owns the run.
- **Decision**: PENDING

### O3 — `autoComplete="off"` is on the input branch but not the select branch

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `src/client/components/ui/MonthField.tsx:72`
- **Detail**: The amended 3.4 ends its attribute list with "`autoComplete="off"` stays". The native
  branch keeps it (`:55`) and the fallback `<select>` does not. The practical effect is nil, because
  a select of enumerated options has nothing to autofill, and the browser evidence read `autoComplete`
  as `off` on all eight fields in Chrome, where every field takes the input branch. It is a literal
  gap against the delta rather than a defect.
- **Fix**: Add `autoComplete="off"` to the `<select>` so both branches carry the same attribute set.
- **Decision**: PENDING

### O4 — `change.md` status is stale at `plan_reviewed`

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: `context/changes/subscription-management-and-date-inputs/change.md`
- **Detail**: Every phase has landed, the designer has accepted and this review is complete, but the
  front matter still reads `plan_reviewed`. The reviewer was instructed not to change it, and the
  archive step owns the transition, so this is recorded for whoever runs that step rather than
  fixed here.
- **Fix**: Let the archive step move it; no action in this review.
- **Decision**: PENDING

### O5 — The silent Safari sign-in failure is undocumented, though its remedy is not

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `README.md:25`
- **Detail**: The phase 5 agent lost time to `COOKIE_SECURE=true` blocking Safari sign-in over local
  http with no error shown. The remedy is already documented in two places, and `.dev.vars.example`
  even names Safari, so this is not the gap it looked like from inside the run. What neither place
  says is that the symptom is silent: the form returns to the login screen rather than reporting
  anything, which is what makes the cause hard to guess. Adding that clause is cheap and would have
  saved the run; leaving it is defensible, since the setting is already named.
- **Fix**: Extend the parenthetical at `README.md:25` to say the browser shows no error and the
  sign-in form simply returns to the login screen.
- **Decision**: PENDING

### O6 — The empty-body refusal serialises an empty field name

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `src/server/validation/subscriptions.ts:57`
- **Detail**: The empty-body guard is an object-level `refine`, so its issue path is empty and the
  error serialises `field` as `""` rather than omitting it. The client never reaches this state,
  because it does not submit when nothing differs, and the route still answers 400 with the right
  sentence. Cosmetic only.
- **Fix**: Omit `field` from the response when the issue path is empty.
- **Decision**: PENDING

## Design discrepancies for the designer

None behavioural. The designer's own acceptance (`reviews/design-acceptance.md`, `689bfe9`) covers
appearance and accepted it without corrections; this review found nothing that contradicts it. Two
items are passed along for awareness only, both already visible in the evidence:

- The Safari control height is a pixel reading off a 1:1 capture with roughly one pixel of
  antialiasing uncertainty, not a computed value. The 40px and 44px claims that carry the section 11
  check are Chrome measurements, which are computed. If the designer wants Safari on the same
  footing, the evidence file names the setting that would allow it.
- Safari at 390 width and Safari in light appearance were not captured, so the fallback select is
  accepted at 1280 in dark only. The delta's section 8 rule for the mobile column is verified in
  Chrome emulation and by a DOM check, not in Safari.

## Reviewer's blind spots

- Firefox, Edge and both mobile browsers were not exercised by anyone, here or in phase 5; the
  fallback is reasoned from published support data and is marked unverified throughout.
- The `no-owner` header state is unreachable through the product's own routes, so its enablement
  rule is verified by reading `subscriptionEdits.ts:71-80` and by the deliberate default-case
  structure, not by observation.
- This review re-ran the gates and read the code, but did not itself drive a browser; the browser
  claims are accepted on the strength of the evidence file's method, which names the property behind
  each value.

## Resolution

Author's response. Both warnings and five of the six observations are resolved; O6 is accepted as
is, with the reason below. Every finding was re-checked against the file it names before being acted
on, and the two required corrections are comment-only, as the verdict said they would be.

| Finding | Severity | Outcome | Commit |
|---|---|---|---|
| F1 | warning | Fixed. The falsified clause is gone from `src/client/format.ts:3`; the module header now claims only the wire format, which is still true | `abf8790` |
| F2 | warning | Fixed. `Field.tsx`'s hint comment reads "never the format of a calendar value", which leaves the three money hints legitimate | `abf8790` |
| O1 | observation | Fixed. The atomicity case asserts every count is above zero before the rejection, reusing the main case's loop | `abf8790` |
| O2 | observation | Fixed. Plan row 6.1 ticked against `e40acbf`, the commit that owns the phase 5 gate run | `abf8790` |
| O3 | observation | Fixed. `autoComplete="off"` now sits on the fallback `select` as well as the month input | `abf8790` |
| O4 | observation | Fixed. `change.md` moved from `plan_reviewed` to `implemented`, which is the implement step's own transition, not the archive step's | `abf8790` |
| O5 | observation | Fixed. The `README.md` remedy now says the refusal is silent and the form returns to the login screen with no error | `abf8790` |
| O6 | observation | Accepted as is. There is no one-line fix inside the refusal; see below | none |

**F1.** The clause "and every input and hint keeps the ISO form" described exactly what this change
removed, so it went. What survives is the half the change exists to protect: every value the client
sends stays `YYYY-MM` or `YYYY-MM-DD`. The finding is right that the phase 1 sweep was scoped to
`src/server/` and that `format.ts` was never in the diff, which is why nothing caught it earlier.

**F2.** Narrowed to the finding's own wording. The three call sites it names, `PaymentForm.tsx:173`,
`PriceHistory.tsx:335` and `ScheduleForm.tsx:156`, pass a money format hint and are unchanged and
unaffected; the comment no longer forbids what the component is used for one field away.

**O1.** The loop is the main case's, verbatim in shape, with its own message naming the failed batch.
The test still proves what it proved before; it now also fails loudly if the fixture stops creating
rows, rather than passing on two empty states.

**O2.** Ticked against `e40acbf` rather than against this resolution, because that commit owns the
run the row cites: `evidence/runs/s08-gates.txt` records typecheck, 22 unit files with 262 cases, 13
integration files with 131 cases, and the build, on a tree with no `src/`, `tests/` or `migrations/`
difference from the code being judged. This review re-ran all three independently with the same
counts, and they were re-run again for this resolution, unchanged. The plan is now 57 of 57.

**O3.** A literal gap against the amended 3.4 rather than a defect, as the finding says, and closed
literally: both branches now carry the same attribute set.

**O4.** Moved here rather than left for the archive step. The reviewer was instructed not to touch
it, but `status: implemented` is the implement step's transition and `archived_at` is the archive
step's; leaving the front matter at `plan_reviewed` after every phase landed would misreport the
change. No date field exists in this front matter, so nothing dated was written.

**O5.** One clause, where the finding put it. The remedy was already documented twice; the symptom
was not, and the silence is what made the cause hard to guess.

**O6, accepted as is.** The fix the finding describes does not exist inside the refusal. The empty
`field` is produced where the route serialises `parsed.error.issues[0]?.path.join('.')`, not by the
`.refine` itself, and an object-level refusal has no field to name: giving the refine a `path` would
invent a field name that no request sent. Fixing it in the route would mean either changing one
handler and leaving the other five route files inconsistent, or a sweep across all of them, which is
a larger change than a cosmetic issue on a branch the client cannot reach warrants. The behaviour is
already correct at both ends: the route answers 400 with the right sentence, and the client's
`refuse` treats the empty string as no field and shows the whole-form error. Recorded for whoever
next touches that serialisation across the route files.

**Nothing was deferred.** The verdict's two required corrections are in, five observations are fixed
and the sixth is accepted with its reason stated. Re-review is a separate pass and not this author's.

### Gates at this resolution

| Gate | Result |
|---|---|
| `npm run typecheck` | clean, all three projects |
| `npm run test:unit` | 22 files / 262 tests passed |
| `npm run test:integration` | 13 files / 131 tests passed |
| `npm run build` | succeeded |

Identical to the counts this review recorded and to `evidence/runs/s08-gates.txt`. No test was added
or removed: O1 strengthens an existing case rather than adding one.
