<!-- PLAN-REVIEW-REPORT -->
# Plan review: Implementation plan, visual redesign

- **Plan**: `context/changes/visual-redesign/plan.md`
- **Mode**: Deep
- **Repository state**: commit `8418a54` on `main`. Nothing of this change is on disk yet; the working
  tree carries only another agent's edits under `tools/reviewer/` and
  `context/changes/ai-review-pipeline/`, which this review does not touch.
- **Verdict**: REVISE (approve with required changes)
- **Findings**: 4 critical, 6 warnings, 1 observation, plus 9 design findings returned to the designer
- **Reviewer**: independent; did not write the plan or the design specification

Date and effort fields the report schema lists are omitted, matching this repository's convention of
recording progress by change ID, migration ID and commit. This review writes nothing outside this
file; `change.md` still reads `status: planned` and wants `plan_reviewed` once the findings are
triaged.

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | WARNING |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | FAIL |
| Plan Completeness | WARNING |

## Grounding

Paths: 16/16 verified. Every file the plan edits exists at the path it names (`package.json`,
`index.html`, `src/client/main.tsx`, `src/client/index.css`, `src/client/App.tsx`,
`src/client/screens/Login.tsx`, `Home.tsx`, `SubscriptionForm.tsx`, `SubscriptionDetail.tsx`,
`src/client/components/MemberList.tsx`, `MemberForm.tsx`, `PriceHistory.tsx`, `BreakMonths.tsx`,
`PaymentList.tsx`, `PaymentForm.tsx`, `RecurringSection.tsx`), `public/favicon.ico` is present so the
new `favicon.svg` can sit beside it, and both prior captures the plan falls back on
(`evidence/screenshots/detail-no-owner-state.png`, `detail-error-state.png`) exist. Every new path is
new.

Symbols and line references: verified against the code rather than from memory. The five summary
cards and the sentence are at `SubscriptionDetail.tsx:166-195`; `monthInputs` is assembled at
`SubscriptionDetail.tsx:152`; the reload-keeps-figures behaviour is at `SubscriptionDetail.tsx:53-55`;
`scheduleMonthStatuses` is called exactly once, at `RecurringSection.tsx:104`; `REASON_PHRASE` is a
`Record<MonthExclusion, string>` at `RecurringSection.tsx:42-50`, total over the seven-member union
with seven distinct strings; the archive toggle is at `MemberList.tsx:88-92` and the unconfirmed
participant delete at `MemberList.tsx:94`; the server-driven price delete confirmation is at
`PriceHistory.tsx:46-66`; `formatMoney` is at `src/domain/money.ts:19` and is imported by five client
files; `summary.currentActiveCount` exists on the wire. `vitest.unit.config.ts:7` includes
`src/**/*.test.ts` as stated; the integration include is at `vitest.integration.config.ts:27`, not
line 31. No `.test.tsx` exists anywhere, so the plan is right that the suite cannot fail on markup.

Stylesheet baseline: confirmed exactly. `src/client/index.css` is 279 lines with zero custom
properties, zero `@media` blocks and two colour literals (both `#b00020`, at lines 64 and 168);
`color-scheme: light dark` is at line 2 and `font-family: system-ui` at line 3.

Font package: verified against the published `5.3.0` tarball rather than from the plan. The version
exists, is current, ships `latin-400.css`, `latin-600.css`, `latin-ext-400.css` and
`latin-ext-600.css`, each declaring `font-display: swap`, and the four upright woff2 files are exactly
22,588 + 24,252 + 15,980 + 16,448 = 79,268 bytes as the plan states. What the plan missed is in F2.

Contrast: every pair design-spec 2.1 lists passes at the threshold it is held to, in both themes, so
phase 6 will not force a token change. Lowest listed pairs are `--ink-faint` at 3.29:1 light on
`--ground` and 3.86:1 dark on `--paper`, both above the 3:1 the specification holds them to. The
unlisted pairs are in F10.

Brief to plan: phases, decisions and scope match, with the capture-count discrepancy recorded in F9.
Nothing under "What we are NOT doing" reappears in a phase except the arithmetic boundary, which is
F3. `docs/reference/contract-surfaces.md` does not exist in this project, so that check is skipped.

Progress section: the mechanical contract in
`10x-plan/references/progress-format.md` holds in full. Exactly one `## Progress` heading, at the
bottom after `## References`; six `### Phase N` headings whose titles are character-identical to the
six `## Phase N` headers; every success-criterion bullet has a numbered row with the
Automated/Manual split preserved (1.1-1.7 / 1.8-1.14, 2.1-2.6 / 2.7-2.12, 3.1-3.5 / 3.6-3.15,
4.1-4.7 / 4.8-4.22, 5.1-5.7 / 5.8-5.17, 6.1-6.7 / 6.8-6.14); no checkbox appears anywhere outside the
Progress section. The only em dash in the change is inside the commit-sha suffix token that
`progress-format.md` mandates, in the convention line at `plan.md:1208`; the other six files in the
change contain none. No
calendar date, duration or estimate appears in any authored file.

## What the plan gets right, recorded so it is not relitigated

The stability analysis is accurate where it matters most. `scheduleMonthStatuses` stays the single
decider of a tile state and the plan holds it to one call site; `MemberMonthInputs` keeps its two
fields; every payload key the plan enumerates matches `src/client/api.ts` and the frame's list;
`formatMoney` stays the only producer of a money string, and the new month formatter is
`Intl.DateTimeFormat` over a `YYYY-MM` string, which touches no amount. The decision to gate each
phase on a browser check rather than a test run follows directly from the verified fact that no test
reads the client. Refusing a router, a component library and a client test layer keeps the change
lean. The phase order is sound: the one thing that must exist before everything else is the token
layer, and the one screen small enough to prove the shared layer on is Login.

## Findings

### F1 - The focus contract loses focus to the document body on three paths, and the plan's own rule forbids fixing it

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: Blind Spots
- **Location**: Critical implementation details ("Focus moves in four places and nowhere else",
  plan.md:165-169); Phase 2 change 8 (ConfirmStrip, plan.md:442-453); design-spec 3.10, 7
- **Detail**: The confirmation strip "replaces an entry's action row in place", so the `[Delete]`
  button that opened it is unmounted while the strip is open. The plan specifies focus moving to Keep
  on open and nothing at all on close. Pressing Keep, or completing the delete, unmounts the focused
  button and drops focus to `<body>`, which loses the keyboard user's position in a column that is
  roughly 4200px tall at 390. The same gap exists when a disclosure panel closes on success: the plan
  specifies focus return for Cancel and Escape only. Design-spec 7 is stricter than the plan here, not
  looser: it requires Escape to close "the open disclosure panel or confirmation strip in the focused
  section, returning focus to the control that opened it", which for a strip is a fifth focus movement
  the plan explicitly rules out ("adding a fifth movement would be a design change"). So the plan both
  contradicts the specification it implements and forbids the implementer from closing the gap.
  A second, smaller item sits in the same contract: "Escape does not close the panel while a native
  select is open" (plan.md:406) has no implementable mechanism, because the browser exposes no way to
  observe an open native select popup. In practice the popup swallows the key and no code is needed,
  but an implementer told to satisfy the sentence will try to build detection.
- **Fix A ⭐ Recommended**: Extend the focus rule to "focus returns to the control that opened a panel
  or a strip whenever either closes, by any route, and to the section heading when that control no
  longer exists", and say that the strip's Keep and the successful-delete path are covered by it. Note
  beside the Escape sentence that the native select case needs no code because the popup consumes the
  key, so the requirement is satisfied by not handling keydown on a bubbled event from an open select.
  - Strength: Restores the specification's own requirement rather than adding an invention, and gives
    the one case the specification does not cover (the row is gone after a delete) a defined target.
  - Trade-off: The "four places and nowhere else" sentence, which is a useful guard against focus
    sprawl, has to be rewritten rather than kept verbatim.
  - Confidence: HIGH - design-spec 7 already mandates the strip case, so this is alignment, not a new
    design decision.
  - Blind spot: Where focus should land after the last entry in a list is deleted is still the
    designer's call; see design finding 9.
- **Fix B**: Raise the strip and success-close focus targets as design questions D7 and D8 under the
  plan's own protocol and leave the four movements as they are until the designer answers.
  - Strength: Follows the plan's stated protocol exactly and puts an interaction decision with the
    person who owns interaction.
  - Trade-off: Blocks a part of phases 3 to 5 behind a designer round for something design-spec 7 has
    arguably already answered.
  - Confidence: MED - defensible, but slower for a case the specification covers.
  - Blind spot: None significant.
- **Decision**: PENDING

### F2 - The font import ships eight files, not four, so phase 1's byte gate cannot pass as written

- **Severity**: ❌ CRITICAL
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: Current state analysis, key findings (plan.md:55-59); Phase 1 change 2
  (plan.md:205-215); Phase 1 automated criterion 5 (plan.md:285-286) and Progress row 1.5;
  Performance considerations (plan.md:1174-1179); design-spec 2.2
- **Detail**: Verified from the published `@fontsource/ibm-plex-sans@5.3.0` tarball. Each of the four
  CSS entry points the plan imports declares a two-format `src`, for example
  `src: url(./files/ibm-plex-sans-latin-400-normal.woff2) format('woff2'),
  url(./files/ibm-plex-sans-latin-400-normal.woff) format('woff');`. Vite resolves and emits every
  `url()` it finds in imported CSS, so the build ships four woff2 files and four woff files. The four
  woff fallbacks are 22,104 + 23,876 + 14,360 + 14,772 = 75,112 bytes, taking the shipped font payload
  to 154,380 bytes rather than the 79,268 the plan records against the 160 KB budget. Two things
  follow. Phase 1's automated row, "The built output contains four woff2 files and no other font file",
  fails on a correct implementation, which is the worst kind of gate: it fails for a reason the
  implementer did not cause. And the budget headroom the plan reports as "under half" is actually
  about 4 percent, which changes whether the budget is worth enforcing.
- **Fix A ⭐ Recommended**: Declare the four `@font-face` blocks by hand in `src/client/index.css`,
  pointing at `@fontsource/ibm-plex-sans/files/ibm-plex-sans-<subset>-<weight>-normal.woff2`, which
  the package's `exports` map publishes explicitly, and drop the four CSS imports from `main.tsx`.
  Keep the criterion as it stands.
  - Strength: Ships exactly the four files design-spec 2.2 names, keeps the recorded total at 79,268
    bytes against the budget, and keeps the gate meaningful. `font-display: swap`, the family name
    and the `unicode-range` are four lines each and are already in the package's CSS to copy.
  - Trade-off: The `@font-face` declarations are hand-maintained rather than taken from the package,
    so a future version bump needs a glance at the package's CSS.
  - Confidence: HIGH - the subpath `./files/*.woff2` is an explicit export in the package's own
    `exports` map, so the import resolves without a deep-path workaround.
  - Blind spot: Whether the implementer copies the `unicode-range` declarations matters, because
    without them the latin-ext faces load for every page rather than only when `zł` appears.
- **Fix B**: Keep the four CSS imports, change criterion 1.5 and Progress row 1.5 to "four woff2 and
  four woff files", and record 154,380 bytes against the 160 KB budget.
  - Strength: One-line edit, no hand-written `@font-face`, and the build stays entirely
    package-driven.
  - Trade-off: Ships 75 KB no browser in scope needs, and leaves 3.5 percent of headroom under a
    budget the designer set, which makes the budget line nearly meaningless.
  - Confidence: HIGH - the byte counts are measured, not estimated.
  - Blind spot: None significant.
- **Decision**: PENDING

### F3 - The "no client-side arithmetic" boundary is false of code the change must preserve, and phase 6 requires recording it as re-checked

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: End-State Alignment
- **Location**: What we are NOT doing (plan.md:100-102); Stability guards row "No client-side
  arithmetic" (plan.md:144); Phase 5 change 3 (plan.md:881-884); Phase 6 automated criterion 5
  (plan.md:1078-1079) and Progress row 6.5
- **Detail**: The plan states the boundary twice in absolute terms: "No card, badge, tile or heading
  computes a share, a balance, a counted month or an active count" and "no component sums, divides or
  rounds an amount; the only numeric operation on a money value is a comparison against zero for
  colour". Five pieces of shipped client code contradict that, and the design requires four of them to
  keep rendering. `RecurringSection.tsx:111-112` computes
  `const countedMonths = statuses.filter((s) => s.counts)` then
  `const assumedTotal = countedMonths.length * schedule.amount`, and that product is the money figure
  design-spec 5.5 requires on every standing order's secondary line, which phase 5 change 3 restates
  as "a secondary line reading the assumed total". `countedMonths.length` and `statuses.length` are
  the "N of M elapsed months" the same line carries, which are counted months by any reading. Three
  more sit in the forms: `PriceHistory.tsx:16`, `PaymentForm.tsx:24` and `ScheduleForm.tsx:21` each
  run `Math.round(Number.parseFloat(value) * 100)`, and `PaymentForm.tsx:28` and `ScheduleForm.tsx:25`
  run `(minor / 100).toFixed(2)` to fill an edit field. `MemberList.tsx:29-30` filters on
  `row.balance === 0`, which is a second comparison against zero that is not "for colour". None of
  this is new work and none of it should change, but the plan gives the implementer an absolute rule
  that the correct implementation breaks, in a phase whose only gate is a human reading the rule.
  Phase 6 then requires every guard row to be re-checked and the result written to
  `evidence/runs/visual-redesign-guards.txt`, so an honest implementer records a failure against code
  that is correct.
- **Fix**: Restate the boundary as what it actually protects, and name the exceptions with their line
  references. Suggested wording for the scope line and the guard row: no component derives a share, a
  balance, an owed amount or an active count; the major-to-minor conversions at `PriceHistory.tsx:16`,
  `PaymentForm.tsx:24` and `ScheduleForm.tsx:21`, the inverse at `PaymentForm.tsx:28` and
  `ScheduleForm.tsx:25`, and the assumed total and elapsed-month counts at `RecurringSection.tsx:111-112`
  are shipped behaviour that design-spec 5.5 requires on screen and are preserved verbatim; the sign
  comparisons on `balance` that design-spec 3.12 and 5.1 require are presentation.
  - Strength: Keeps the guard falsifiable, which is the only reason to have it, and tells the
    implementer which arithmetic is a bug and which is the product.
  - Trade-off: The guard row stops being one sentence.
  - Confidence: HIGH - every line reference is verified against the code.
  - Blind spot: Whether the designer is content for the assumed total to remain a client-side product
    rather than a summary field is a separate question, but it is outside this change either way,
    because adding it to the wire would change `src/server/`.
- **Decision**: PENDING

### F4 - The Participants heading count comes from a figure that includes the owner, who is never a row in that list

- **Severity**: ❌ CRITICAL
- **Impact**: 🔬 HIGH - architectural stake; think it through carefully
- **Dimension**: End-State Alignment
- **Location**: Current state analysis, key findings (plan.md:65-68); Phase 4 change 1
  (plan.md:651-652) and change 3 (plan.md:695-696); Phase 4 automated criterion 4 (plan.md:769-771)
  and Progress row 4.4; design-spec 5.1 and 4.4
- **Detail**: `summary.currentActiveCount` is `activeMembersInMonth(state, current).length`
  (`src/domain/calc.ts:108`), and `activeMembersInMonth` filters `state.members` with no owner
  exclusion (`src/domain/members.ts:14-16`), so the figure counts the organizer. `summary.members`,
  which is the array `MemberList` renders, is built from `nonOwnerMembers`
  (`src/domain/calc.ts:88-103`), so the organizer is never a row. Moving that figure into the heading
  therefore produces a count that cannot agree with the list under it: a plan with the organizer and
  one active participant reads "Participants (2 active)" above one row. The current screen is correct
  because the figure is labelled "Active participants" in a summary card next to "Per person this
  month", where counting the organizer is exactly right, since the share is split with the owner
  included. The heading relabels the same number as a property of a list it is not a property of. The
  designer's own mockup hides the problem by coincidence: it reads "Participants (2 active)" over two
  rows, one of which is tagged "not active this month", so the two are equal for the wrong reason.
- **Fix A ⭐ Recommended**: Raise it as a design question against design-spec 5.1 under the plan's
  protocol, stating the arithmetic, and leave the heading without a count until the designer answers.
  Give the designer the two options the data supports: keep `currentActiveCount` and relabel the
  heading so it reads as a plan-level figure rather than a list count, or use the list length, which
  is a row count and needs no accounting figure.
  - Strength: This is a hierarchy and copy decision, which design-spec 1 reserves to the designer, and
    it is exactly the kind of thing the plan's checkpoint protocol exists for.
  - Trade-off: Phase 4 lands with one heading incomplete and a second designer round is needed before
    phase 6.
  - Confidence: HIGH - the owner inclusion is verified in two domain functions.
  - Blind spot: The "Active participants" card is removed either way, so if the designer keeps
    `currentActiveCount` out of the heading the figure leaves the product entirely; that may not be
    what design-spec 4.4 intended.
- **Fix B**: Use `summary.members.length` filtered by `activeThisMonth`, which is a per-row flag the
  API already returns, so the heading counts exactly the rows the section shows as active.
  - Strength: The heading and the list agree by construction, and `activeThisMonth` is a server-computed
    field, not a client derivation.
  - Trade-off: It is a client-side count over an API array, which the plan's own boundary discourages,
    and it silently changes what the words "N active" mean without the designer deciding.
  - Confidence: MED - mechanically correct, but it settles a copy question the designer owns.
  - Blind spot: Archived participants that are settled are hidden by default, so the visible row count
    can still differ from the heading.
- **Decision**: PENDING

### F5 - The app bar needs the email and a sign-out action that the detail screen does not receive, and the plan names neither the props nor `App.tsx`

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: Phase 1 change 5 (plan.md:251-264) and change 6 (plan.md:266-275)
- **Detail**: `AppBar` takes the email, an optional `onHome` and an `onSignOut`. On Home all three are
  available: `Home` receives `user` and owns `handleSignOut` at `Home.tsx:34-37`. On the detail screen
  none of them is. `SubscriptionDetail`'s props are `subscription`, `onBack` and `onSignedOut`
  (`SubscriptionDetail.tsx:26-30`); it never receives the user and never imports `signOut`. The email
  is held only by `App.tsx:8`, and `App.tsx` is not in phase 1's file list; it first appears in phase
  2 for the session-loading screen. The change 6 contract also states that the detail screen "loses
  its own sign-out affordance to the bar", which is not true: `SubscriptionDetail.tsx` has no
  sign-out control today, so phase 1 adds one rather than relocating one, and adding it means new
  props, a new `signOut` import and a new call path that the plan does not describe.
- **Fix**: Add `App.tsx` to phase 1 change 6 and state the threading: `App` passes `user.email` and a
  sign-out handler to both `Home` and `SubscriptionDetail`, or lifts `handleSignOut` out of `Home`
  into `App` so one handler serves both; correct the sentence to say the detail screen gains a
  sign-out control it did not have.
- **Decision**: PENDING

### F6 - The sticky stack's scroll offset ignores the app bar, and the plan's own manual row contradicts the formula it gives

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: End-State Alignment
- **Location**: Phase 4 change 2 (plan.md:677-686); Phase 4 manual row 3 (plan.md:785-787) and
  Progress row 4.10; design-spec 4.4
- **Detail**: The plan specifies "every heading carries a `scroll-margin-top` equal to the index
  height plus `--s-4`", which is 44 + 16 = 60px. Two elements are stuck above the heading, not one:
  the app bar at `top: 0` occupying 56px and the index at `top: 56px` occupying 44px, for 100px of
  permanently obscured viewport. A 60px offset leaves the heading 40px under the app bar. The plan's
  own manual row then requires that "clicking an item scrolls that heading clear of both rather than
  under them", so the criterion and the contract disagree and only one of them can be satisfied. The
  formula is copied verbatim from design-spec 4.4, so the specification carries the same error; see
  design finding 6. The same 100px affects the current-item tracking: an `IntersectionObserver` with
  no `rootMargin` fires when a heading crosses the true viewport top, which is 100px behind the
  visible top, so `aria-current` moves a full screen-third late. The plan leaves the observer's
  configuration as a mechanical choice, which it is, but the manual criterion that judges it is
  "the item for the section at the top of the viewport", and the default configuration fails it.
- **Fix**: Set the heading offset to the combined sticky height, 56 + 44 + `--s-4` = 116px, express it
  as a custom property so the two stacked offsets stay one decision as the Critical implementation
  details section already requires, and add one sentence to the change 2 contract saying the observer
  must discount the same 100px through `rootMargin` so the current item changes at the visible top
  rather than the viewport top.
- **Decision**: PENDING

### F7 - The wire-name gate cannot fail, and the analysis behind it undercounts the offending forms by half

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: Current state analysis (plan.md:32-35); Phase 2 automated criterion 4
  (plan.md:497) and Progress row 2.4; Stability guards row "Wire field names unchanged"
  (plan.md:139); Phase 5 change 3 (plan.md:897-900) and Progress row 5.14
- **Detail**: Four separate problems, all small, all in the same class.
  (a) The criterion is `grep -rn '${field}' src/client/` "returns nothing, so no wire name can reach a
  rendered string". Run against the current tree it already returns nothing, because every one of the
  four call sites renders `${error.field}`, not `${field}`. The gate passes before any work is done
  and can never fail.
  (b) The plan says two forms show raw wire names. Four do:
  `SubscriptionForm.tsx:82`, `MemberForm.tsx:108`, `BreakMonths.tsx:73` and `PriceHistory.tsx:130` all
  render `` `${error.field}: ${error.message}` ``. `PriceHistory` is not touched until phase 4 and
  `BreakMonths` not until phase 5, so even a corrected grep cannot pass at the end of phase 2. The
  criterion is mis-phased as well as mis-written.
  (c) The stability guard greps `src/client/api.ts` for a key list that includes `owner_share`, which
  exists nowhere in the repository, and omits `currency`, `locale`, `name`, `date`, `amount`, `note`
  and `kind`, which `frame.md` lists as wire names that must stay stable. The guard also states no
  expected match count, so "shows the same keys the schemas name" is a reading rather than a check.
  (d) The seven exclusion phrases do not carry a leading "not counted, ". That prefix lives in the
  template at `RecurringSection.tsx:142`; the `REASON_PHRASE` values at lines 42-50 are already bare
  ("the plan was paused that month"). The instruction to remove it "from each" phrase, and criterion
  5.14 checking that it was removed, both act on something that is not in the map.
- **Fix**: Change the criterion to `grep -rn 'error\.field ?' src/client/` (or to the literal
  `${error.field}`), move it from phase 2 to phase 5 where the last of the four forms is converted, and
  in phase 2 check only the files phase 2 touches. Correct "two forms" to four and name all four.
  Replace `owner_share` with the frame's actual list and state the expected number of matches. Reword
  the exclusion-phrase instruction to say the prefix is dropped from the rendered string at
  `RecurringSection.tsx:142` and the seven map values stay verbatim.
- **Decision**: PENDING

### F8 - The submitting state leaves the submit button live, so every create can be double-submitted

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: Blind Spots
- **Location**: Phase 2 change 10 (plan.md:482-484); design-spec 3.3
- **Detail**: Today every form guards itself with `disabled={submitting}` on the submit button
  (`Login.tsx:58`, `MemberForm.tsx:113`, `SubscriptionForm.tsx:87`, `PaymentForm.tsx:156`,
  `ScheduleForm.tsx:158`). The new submitting state is "the label is unchanged, the form and the
  button carry `aria-busy="true"`, every field is disabled and there is no spinner", which
  deliberately replaces the label swap. "Every field is disabled" does not cover the button, and
  design-spec 3.3 draws the same line, describing the button only as carrying `aria-busy`. Read
  literally the plan removes a guard that exists today, and a second Enter or a second click during an
  in-flight request sends the request again. On Login that is a duplicate sign-in; on "Record this
  payment" it is a duplicate payment row, which is a real accounting effect produced by a change whose
  premise is that no accounting behaviour moves. The specification's own rule that disabled buttons
  stay focusable with `aria-disabled` and a handler that returns early is exactly the mechanism this
  case needs, and the plan does not connect the two.
- **Fix**: State in the phase 2 contract that while a form is busy its primary button carries
  `aria-disabled="true"` and its submit handler returns early, which keeps the button focusable per
  design-spec 3.3 while preserving the double-submit guard the forms have today, and that the visible
  label is what stays unchanged, not the button's interactivity.
- **Decision**: PENDING

### F9 - The acceptance capture set is inconsistent with itself in four ways

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: Phase 4 change 1 (plan.md:664-667); Phase 6 change 4 (plan.md:1017-1056), change 5
  (plan.md:1064-1065), manual row 1 (plan.md:1086-1087) and Progress row 6.8; plan-brief "Phases at a
  glance"
- **Detail**: (a) `plan-brief.md` says phase 6 captures "eighteen captures for the designer"; the plan
  names twenty. (b) `redesign-12-section-states.png` is one file for "one section in each of its eight
  states", and design-spec 11.4 does list eight. Eight states cannot coexist in one render: a section
  cannot be simultaneously empty and populated, or have both its add panel and its edit panel open. It
  is either eight files or a hand-assembled composite, and the plan says neither. (c) The contract says
  "Light and dark are separate files where the state is theme sensitive", which produces more than
  twenty files, yet the table gives twenty names with no light or dark suffix and criterion 6.8 counts
  "all twenty captures". (d) Phase 4 says the 409 no-owner state "cannot be produced locally through
  the product, so its appearance is checked against `evidence/screenshots/detail-no-owner-state.png`
  and the code path rather than a fresh capture", while phase 6 requires `redesign-11-detail-no-owner.png`
  taken "by driving the state directly in the client during a dev session". Both cannot hold.
- **Fix**: Split `redesign-12` into the eight states design-spec 11.4 lists, add an explicit `-light`
  and `-dark` suffix rule with the resulting file count, make the brief's number agree with the plan's,
  and settle the no-owner state on one method: either the forced dev-session capture with its note, or
  the prior capture, in both phases.
- **Decision**: PENDING

### F10 - The contrast record measures text pairs only, so the boundary of every input and quiet button goes unmeasured and fails 3:1

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM - a real trade-off; stop and think it through
- **Dimension**: Blind Spots
- **Location**: Phase 6 change 2 (plan.md:993-1004), manual row 4 (plan.md:1092-1093) and Progress row
  6.11; design-spec 2.1, 3.3, 3.4
- **Detail**: The contract is "Every pair design-spec 2.1 lists, in both themes". That list is entirely
  foreground text over a ground, so WCAG 1.4.11 non-text contrast is never measured, and the token the
  design leans on hardest for structure is the one that fails it. `--rule` is the 1px border of every
  `input`, `select` and `textarea` (design-spec 3.4) and of the quiet button (3.3), which are user
  interface components whose visual boundary must reach 3:1 against the adjacent colour. Measured:
  `--rule` on `--paper` is 1.51:1 light and 1.34:1 dark; `--rule` on `--ground` is 1.41:1 light and
  1.45:1 dark. A field box is therefore close to invisible for a low-vision user, on a screen whose
  whole interaction model is filling in fields. The plan's phase 6 would record contrast as passing.
  A second unlisted pair is the disabled primary button, `--on-ink` on `--ink-faint`, at 3.52:1 light
  and 4.19:1 dark. WCAG exempts inactive controls from 1.4.3, so this is compliant, but design-spec 3.3
  deliberately keeps those buttons focusable and in the tab order with an `aria-describedby`
  explanation, so treating them as inactive is a stretch worth the designer knowing about.
  For completeness: every pair design-spec 2.1 does list passes in both themes, lowest being
  `--ink-faint` at 3.29:1 light on `--ground`, above the 3:1 it is held to. No listed token needs to
  move.
- **Fix**: Extend the phase 6 contract to record the non-text pairs against 3:1 as well as the text
  pairs, naming at minimum `--rule` against `--paper` and against `--ground`, `--green` against
  `--paper` for the counted tile's left rule, and `--red` against `--paper` for the not-received tile's,
  and raise the `--rule` result to the designer as a token question rather than fixing it in
  implementation, because 2.1's repair rule ("darken the light value or lighten the dark value of the
  foreground token") was written for text and changing `--rule` changes every hairline on the page.
- **Decision**: PENDING

### F11 - The entry highlight has no owning component and no stated link to the status line it must clear with

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW - quick decision; the fix is obvious and narrow
- **Dimension**: Plan Completeness
- **Location**: Phase 2 change 2 (StatusLine, plan.md:358-362) and change 4 (LedgerEntry,
  plan.md:379-391); Phase 3 change 2 (plan.md:563-565); Phase 6 manual row 5 (plan.md:1094-1096) and
  Progress row 6.12; design-spec 2.5
- **Detail**: Design-spec 2.5 gives the entry highlight a reduced-motion alternative that is not a
  duration change: "row shows `--green-tint` statically and clears together with the status line".
  That couples a row's background to another component's four-second timer, so it is shared state, not
  a CSS property. Phase 2 builds `StatusLine` and `LedgerEntry` as separate components and neither
  contract mentions the highlight; phase 3 first asks for it in passing ("the new row takes the entry
  highlight"); phase 6 then tests the coupling. No phase builds it, and the one phase that would
  discover the gap is the acceptance pass.
- **Fix**: Give the highlight an owner in phase 2, either as a prop on `LedgerEntry` driven by the
  same section state that drives `StatusLine`, or as a small shared hook, and say in that contract that
  under reduced motion the highlight persists for the status line's lifetime rather than running its
  own 1200ms.
- **Decision**: PENDING

## Design findings

Returned to the designer rather than to the implementer. Each names the design-spec section it
concerns. None is an implementation choice and none should be settled by the plan.

1. **5.1, the Participants heading count.** "Participants (N active)" is specified against
   `summary.currentActiveCount`, which counts the organizer (`src/domain/members.ts:14-16`), while the
   list under it is built from `summary.members`, which excludes the organizer
   (`src/domain/calc.ts:88`). The heading can never agree with the rows. The mockup reads
   "(2 active)" over two rows only because one of them is tagged "not active this month". See F4 for
   the two options the data supports.
2. **4.4 against 9, the summary sentence.** Section 4.4's own layout sketch and the mockup at
   `reference/mockup-detail.html:111` both read "Sep 2026 costs 110,00 zł", which is the month
   formatter applied to `summary.currentMonth`. Section 4.4's prose and the section 9 copy table both
   say the sentence is unchanged and load-bearing, and the shipped code renders the raw
   `summary.currentMonth`, so an implementer following the prose ships "2026-09 costs 110,00 zł". One
   of the two has to move.
3. **5.4, the payment entry's secondary line.** The sketch shows "One-off" with the annotation
   "(note, if any)", and the mockup shows "One-off" and "One-off, August transfer", so the line
   appears to be the kind followed by the note. The plan reads it as the note alone, which removes the
   manual and annual distinction from the list entirely; `kind` is a wire field and "Yearly lump sum"
   is how a lump-sum payment is currently identified on screen (`PaymentList.tsx:23-26`).
4. **5.3 against 3.6, the Unskip control.** Section 5.3 specifies `[Unskip]` as quiet; section 3.6
   specifies every row action as link-variant at `--t-small`, and 9 lists "Unskip" as unchanged copy.
   The plan chose link. Confirm which.
5. **2.1, 3.3 and 3.4, non-text contrast.** `--rule` is the visible boundary of every input, select,
   textarea and quiet button and measures 1.51:1 on `--paper` and 1.41:1 on `--ground` in light,
   1.34:1 and 1.45:1 in dark, against the 3:1 of WCAG 1.4.11. Section 2.1's required-pair list has no
   non-text pairs, so nothing in the process catches it. Its repair rule cannot be applied here
   either, because `--rule` is not a text foreground. Separately, the disabled primary button pairs
   `--on-ink` on `--ink-faint` at 3.52:1 light, and 3.3 deliberately keeps those buttons focusable.
6. **4.4, the section index scroll offset.** `scroll-margin-top` is specified as "the index height
   plus `--s-4`", which is 60px, but 3.2 fixes the app bar at `top: 0` with 56px of height above the
   index, so a heading scrolled to that offset sits 40px under the bar. The offset needs the combined
   100px.
7. **3.10, the standing-order confirmation question.** "Delete Bob's standing order?" drops the
   consequence the shipped copy carries: deleting the arrangement also removes the assumed receipts
   counted against it and the months marked as not received (`RecurringSection.tsx:166-169`). The
   participant and price questions in 3.10 both keep their consequence clause; this one does not, and
   it is the flow with the most invisible consequence.
8. **5.4, the payments heading count under the filter.** "Payments received (N)" is unspecified for
   the filtered view. The filter is a server round trip returning one participant's rows
   (`PaymentList.tsx:51-68`), so N can be the total or the filtered total. Which one is a design call.
9. **3.10 and 7, focus after a confirmation closes.** Section 7 requires Escape to return focus to
   the control that opened a strip, but that control is unmounted while the strip is open, and neither
   3.10 nor 7 says where focus goes on Keep, or after a successful delete removes the whole row. See
   F1.

## Notes for the implementer, not findings

- The section index at `top: 56px` plus the app bar at `top: 0` consume 100px of a 390-wide phone
  viewport permanently, roughly 15 percent of a typical one. That is the design's stated intent and
  not a defect, but it is worth confirming during the phase 4 mobile check rather than at phase 6.
- Both `PaymentForm.tsx:32` and `ScheduleForm.tsx:29` already hold
  `members.filter((member) => !member.isOwner)`, which is the condition the no-participant refusal in
  design-spec 3.11 needs. The refusal is "no non-owner participants", not "no members".
- `tsconfig.app.json` sets `noUnusedLocals` and `noUnusedParameters`, so a shared component built in
  phase 2 with a prop that phases 3 to 5 have not adopted yet will fail `npm run typecheck` at the end
  of phase 2, not at the end of phase 5.

## Resolution

Written by the plan's author after the review. The nine design findings went to the designer and are
resolved in `design-spec.md` section 12 ("Plan review design findings 1 to 9"), committed at
`d80aa25`. The eleven engineering findings are resolved in `plan.md` and `plan-brief.md` as below.
Line references are to the plan as it stands after this resolution.

| Finding | Decision | Resolved in |
| --- | --- | --- |
| F1 focus lost to the document body | Fix A. The "four places and nowhere else" rule is replaced by a seven-row destination table covering panel open, Cancel, Escape, success close, failed submit, strip open, Keep and successful delete, with the section `h2` at `tabindex="-1"` as the target when the opening control is gone. Design-spec 3.7, 3.10 and 7 now carry the same destinations, so this is alignment rather than invention. The native-select special case is removed with a note that the popup consumes Escape itself and no detection is to be built | Critical implementation details, "Focus never reaches the document body" and "The Escape-and-native-select case needs no code"; phase 2 DisclosurePanel and ConfirmStrip contracts; criteria 2.9, 3.9, 4.14 and new 4.23 |
| F2 the font import ships eight files | Fix A. Four hand-written `@font-face` blocks in `index.css` pointing at the package's published `./files/*.woff2` export, no CSS imported into `main.tsx`, `unicode-range` copied from the package's aggregate `index.css` because the per-subset files omit it. Ships four files at 79,268 bytes; the gate now also asserts no `.woff`, `.ttf`, `.eot` or `.otf` exists | Key findings; phase 1 change 2, renamed "The four font faces"; criteria 1.5 and new 1.15; phase 6 criterion 6.6; Performance considerations |
| F3 the arithmetic boundary is false of shipped code | Fixed as recommended. The boundary is restated as "no new client-side derivation" and the six shipped exceptions are named with line references: `RecurringSection.tsx:111-112`, `PriceHistory.tsx:16`, `PaymentForm.tsx:24` and `:28`, `ScheduleForm.tsx:21` and `:25`. Zero comparisons and rendered-row counts are named as presentation. Design-spec's opening constraint paragraph now says the same, so the plan and the specification agree | What we are NOT doing; Stability guards row "No new client-side derivation" |
| F4 the Participants count includes the organizer | Raised to the designer as recommended and answered: design-spec 4.4 returns "Active participants" as the fourth cell of the ledger line with the API value unchanged, and design-spec 5.1 gives the Participants heading no count. Heading counts elsewhere equal the rows rendered. The arithmetic is recorded in the plan's key findings so the reasoning survives | Key findings; phase 4 changes 1 and 3; criteria 4.4, 4.8 |
| F5 the app bar's props and `App.tsx` | Fixed as recommended. `handleSignOut` lifts from `Home` into `App`, which passes `user.email` and that one handler to both screens; `SubscriptionDetail` gains the two props. `App.tsx` is added to phase 1's file list and the sentence now says the detail screen gains a sign-out control rather than relocating one | Phase 1 change 6, renamed "Adopting the app bar, and threading what it needs" |
| F6 the scroll offset ignores the app bar | Fixed as recommended and carried by the specification: `scroll-margin-top` is 116px and the observer takes a top `rootMargin` of -100px, both expressed as custom properties derived from the same two heights | Critical implementation details, "The sticky stack obscures 100px"; phase 4 change 2; criterion 4.10 |
| F7 the wire-name gate cannot fail | All four parts fixed. (a) The grep becomes `error\.field` and the repository-wide gate moves to phase 5, where the last leaking form is converted; phase 2 checks only the files it touches. (b) "two forms" corrected to four, all named: `SubscriptionForm.tsx:82`, `MemberForm.tsx:108`, `PriceHistory.tsx:130`, `BreakMonths.tsx:73`. (c) `owner_share` dropped, the frame's full list restored, and the guard now requires per-name match counts captured from `main` and unchanged at every phase end. (d) The prefix is in the template at `RecurringSection.tsx:142`, not in the map, so the map is not edited at all and the seven values must stay byte-identical | Current state analysis; Stability guards rows 1 and 9; criteria 2.4, 5.18, 5.19, 1.16, 5.14; phase 5 change 3 |
| F8 the submit button stays live | Fixed as recommended, and design-spec 3.3 now says the same. While a form is busy its primary button carries `aria-disabled="true"` and the handler returns early, which keeps the button focusable and preserves the guard the five forms have today. What stays unchanged is the visible label, not the interactivity | Phase 2 change 10; criterion 2.9 |
| F9 the capture set is inconsistent | Fixed on all four counts. The eight section states of design-spec 11.4 become eight numbered rows rather than one composite; a naming rule `redesign-NN-<slug>-<theme>.png` with a `-mobile-` variant is stated explicitly; the total is fixed at sixty-two files and that number is the criterion; the no-owner state is settled on the forced dev-session capture in both themes, with the prior capture named as a content reference only, and phase 4 now says the same thing phase 6 does | Phase 6 change 4; phase 4 change 1; criteria 6.8; plan-brief "Phases at a glance" |
| F10 the contrast record measures text only | Fixed as recommended and the designer resolved the underlying token question: design-spec 2.1 adds `--border` for control and tile boundaries with its own non-text checks, and leaves `--rule` decorative and exempt on the condition it is never a control's sole boundary. The plan's contrast record becomes two tables, the non-text one holding `--border` on both grounds, the tile left rules and the focus outline to 3:1, and records the disabled primary without a threshold. A new criterion checks that no control is bordered in `--rule` | Phase 1 change 3; phase 6 change 2; criteria 6.11 and new 6.15; every contract that previously said `--rule` on a control now says `--border` |
| F11 the entry highlight has no owner | Fixed as recommended. One small shared hook per section owns the status sentence and the id of the just-created or just-edited row, starts the 4 second timer and clears both together; `LedgerEntry` takes a `highlighted` prop from it. Under reduced motion the row holds `--green-tint` for the status line's lifetime instead of running its own 1200ms | Phase 2 change 2 |

Three items from "Notes for the implementer, not findings" were folded in as well: the 100px the
sticky stack consumes at 390 is now checked in phase 4 rather than only at phase 6; the
no-participant refusal is stated as "no participant other than the organizer", which is the condition
`PaymentForm.tsx:32` already computes; and `noUnusedLocals` is recorded as the reason phase 2 ships
only what Login, session loading and phase 3 consume.

Progress rows: 87 before this review, 100 after.

`change.md` is left at `status: planned`. The toolkit assigns the move to `plan_reviewed` to the
review skill, not to the plan's author, so it belongs to the re-verification pass rather than to this
resolution.
