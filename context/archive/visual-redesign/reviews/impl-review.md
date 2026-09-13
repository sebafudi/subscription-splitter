<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Visual redesign across every shipped screen

- **Plan**: `context/archive/visual-redesign/plan.md`
- **Scope**: Phases 1 to 6 of 6 (Progress shows 100 of 101 boxes checked; row 6.14 is open by
  design, awaiting the designer's re-check of the retaken captures)
- **Commits reviewed**: `d0f9a05`, `b8db05f`, `00813fe`, `5ac541f`, `43e90e4`, `9c99bf4`, `fac48ee`,
  and the acceptance round `7485476`, `f642b89`, `e3e5df6`
- **Repository state**: reviewed at `e3e5df6` in a detached worktree created from `origin/main`,
  with `node_modules` linked from the primary checkout for the pinned font package. The reviewer did
  not write the plan, the design spec or any implementation commit.
- **Verdict**: APPROVED (with two required corrections)
- **Findings**: 0 critical, 2 warnings, 5 observations

Date and effort fields the report schema lists are omitted, matching this repository's convention of
recording progress by change ID, migration ID and commit.

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Verification performed

Every gate was re-run in the review worktree rather than accepted from the record.

| Gate | Observed at `e3e5df6` | Recorded |
|---|---|---|
| `npm run typecheck` | clean across all three projects | clean across all three projects |
| `npm test` unit | 15 files / 185 tests, exit 0 | 15 files / 185 tests |
| `npm test` integration | 11 files / 112 tests, exit 0 | 11 files / 112 tests |
| `npm run build` | succeeds, exit 0 | succeeds |
| JavaScript bundle | 273,424 bytes | 273,424 bytes |
| CSS bundle | 16,703 bytes | 16,703 bytes |
| Four woff2 faces | 79,268 bytes total | 79,268 bytes total |
| Non-woff2 font formats in `dist` | none found | none |

The Workers runtime ran in this worktree, so the integration suite is a real result rather than a
skip. The font total is 48.4 percent of the 160 KB budget design-spec 2.2 sets, which is what
`evidence/runs/visual-redesign-bundle.txt:86` claims.

### Stability guards

All ten rows of the Stability guards table at `plan.md:159-168` were checked against the pre-change
baseline `d0f9a05~1` independently of the implementer's own record. Every one holds.

| Guard | Result |
|---|---|
| Wire field names unchanged | `src/client/api.ts` is byte-identical to the baseline; it is the only file in `src/client` containing `fetch(`, `body:` or `JSON.stringify`. No wire name gained a client-side alias. The four snake_case identifiers that changed are DOM element ids, not wire fields. |
| `/api` routes untouched | Identical sorted sets of thirteen `/api` literals at both revisions, and identical method counts (6 DELETE, 3 PATCH, 8 POST, 1 PUT). |
| `formatMoney` the only money formatter | One definition, `src/domain/money.ts:19`, unchanged. Five client call sites. Zero occurrences of `Intl.NumberFormat` in `src/client`. `src/client/components/ui/Money.tsx:15` takes a pre-formatted string and never parses it. |
| `scheduleMonthStatuses` one call site | `src/client/components/RecurringSection.tsx:251`, count unchanged at one. |
| `MemberMonthInputs` unchanged | Type definition at `src/domain/month-status.ts:18` untouched; the assembly block in `SubscriptionDetail.tsx` is byte-identical to the baseline. |
| No new client arithmetic | All six shipped derivations survive verbatim. Every other arithmetic site is presentation: zero comparisons on a wire balance, counts of rendered rows, React remount keys, sticky-offset layout math, and one string slice. Zero `reduce`. No new accounting. |
| Native elements kept | No `role="button"`, `role="listbox"`, `role="option"` or `role="combobox"` anywhere; no div or span carries a click handler. 41 buttons, 4 selects, 20 inputs, 1 fieldset. Label count rose from 24 to 25 through `src/client/components/ui/Field.tsx:34`. |
| No router | No `react-router`, `useNavigate`, `pushState`, `popstate` or assignment to `window.location`. `App.tsx` still holds the same two state hooks as the baseline. |
| Server, domain, migrations and tests untouched | `git diff --stat d0f9a05~1..HEAD -- src/server src/domain migrations tests` is empty. The `tools/reviewer` files in the wider range belong to the interleaved `ai-review-pipeline` change, not to this one. |
| Dependencies | Exactly one package added, `@fontsource/ibm-plex-sans` at `5.3.0` with no range prefix. A programmatic set comparison of `package-lock.json` shows one added key, zero removals and zero version changes. |

### Behaviour and accessibility against the specification

Checked against design-spec sections 3.3, 3.4, 3.7, 3.8, 3.9, 3.10, 7 and 8, reading the source
rather than the record:

- Focus destinations behave as 3.7 and 3.10 describe. `DisclosurePanel.tsx:31-37` moves focus to the
  panel's first control on open; `ConfirmStrip.tsx:23-25` moves it to Keep; each section restores
  focus to the control that opened a panel, and a completed delete moves it to the section heading.
- Every section heading carries `tabIndex={-1}` through `SectionHeader.tsx:49`, so the post-delete
  destination exists.
- The permanent live regions are real. `role="status"` in `StatusLine.tsx:42` and `role="alert"` in
  `FormAlert.tsx:20` and `SectionAlert.tsx:25` are always in the tree; only their contents change,
  which is what makes the announcement reliable.
- Disabled primary buttons stay focusable and carry an early-returning handler with the explanatory
  note referenced by `aria-describedby`, exactly as 3.3 requires. See `PaymentList.tsx:161-167` and
  `RecurringSection.tsx:164-170`.
- Escape is handled on both containers with `stopPropagation`, and no special case is made for a
  native select, matching the reasoning recorded in `DisclosurePanel.tsx:23-26`.
- The reduced-motion block at `src/client/index.css:484-492` zeroes all five motion custom
  properties, and a second block at `index.css:1189-1194` supplies the static `--green-tint`
  alternative the highlight needs. Both are genuine, and all five properties are consumed.
- No hover-only affordance exists. Row actions render unconditionally in `LedgerEntry.tsx:43`.
- The 44px rule at 390 now holds for the payments filter select after `f642b89`, with the
  link-variant exemption applied as 3.3 allows.
- Skeletons are hidden from assistive technology, either directly or through an `aria-hidden`
  ancestor at `SubscriptionDetail.tsx:299`.

### Correctness risks examined

- `messageWithLabel` (`ui/fieldLabels.ts:69-77`) replaces only a leading token equal to the erroring
  field's own wire name or that name's last path segment. It never iterates other fields' names, so
  a message that happens to begin with a word equal to a different field's name is left alone. No
  false-positive path found.
- The status and highlight clear together through one timer in `ui/useSectionStatus.ts:36-43`, and
  the timer is cleared on unmount at line 29.
- The two-step price delete is correct. `PriceHistory.tsx:183` keys the strip on the step, so the
  second step remounts and focus returns to Keep rather than staying on a button that changed label.
- The submit guard is intact in every form (`if (submitting) return` before any work), and each form
  moves focus to the first invalid field or the alert line on refusal.
- The `IntersectionObserver` is cleaned up on unmount at `ui/SectionIndex.tsx:57`, and its callback
  recomputes from live rects rather than trusting the entry list.
- The month and date formatters construct and render in UTC (`src/client/format.ts:15` and `:24`)
  with the subscription's locale, so a month cannot slide in a runtime behind Greenwich.
- The month tile mapping collapses the exclusion union correctly: `RecurringSection.tsx:328-334`
  treats `excepted` as "marked not received" and every other reason as "excluded", and the total is
  `statuses.length` over the union rather than a client-side recount.
- The payments section's heading count is `visible.length` (`PaymentList.tsx:131`), so it agrees
  with the rows the filter is actually rendering.

## Findings

### F1 — The section index marks the previous section after a click

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `src/client/components/ui/SectionIndex.tsx:53`, `src/client/index.css:106`
- **Detail**: Design-spec 4.4 prescribes two offsets that do not agree: `scroll-margin-top` of 116px
  on headings and an observer `rootMargin` of -100px. The implementation follows both exactly, so a
  heading reached by clicking its index item lands 16px below the line the observer watches and the
  item that becomes `aria-current` is the *previous* section's. The accepted captures show the
  result: in `evidence/screenshots/redesign-22-index-current-item-light.png` and in the mobile pair,
  the index underlines "Skipped months" while "Payments received" fills the viewport. For the last
  section in the list the remaining scroll distance can be shorter than 16px, so its item may never
  become current after a click at all. This is a defect in the specification rather than drift from
  it, and the implementer disclosed the consequence plainly at
  `evidence/runs/visual-redesign-phase-gates.md:141-143`. Flagging it here because this review also
  catches problems with the plan, and because a capture accepted as evidence of the feature working
  is in fact a picture of it marking the wrong item.
- **Fix**: Derive the observer's root margin from `--scroll-offset` rather than from
  `--bar-height` plus `--index-height`, so the line the observer watches is the same 116px a click
  lands on, and amend design-spec 4.4 to state the single offset.
  - Strength: One expression in `stickyStack()`; the stylesheet already derives 116px in one place,
    so the two cannot drift again.
  - Tradeoff: Scrolling down marks each section current 16px later than today, which is the
    behaviour a click needs and is imperceptible while scrolling.
  - Confidence: HIGH — both offsets are computed from custom properties read at one site.
  - Blind spot: Not re-measured in a browser; the conclusion is read from the code and corroborated
    by two captures and the implementer's own note.
- **Decision**: RESOLVED (see `## Resolution`)

### F2 — Progress row 3.11's ticked title contradicts the shipped behaviour

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `context/archive/visual-redesign/plan.md:1585`
- **Detail**: The row reads `3.11 A create closes the panel, shows "Subscription created",
  highlights the row and opens Detail` and is ticked. Design-spec 4.3, as amended by the designer in
  `02b213e`, says the screen stays on Home and nothing navigates automatically, and that is what
  ships. The re-scoping is disclosed at `plan.md:1346-1347`, and the plan's own convention at
  `plan.md:1522` forbids rewriting a step title, so the implementer was boxed in. The effect remains
  that a reader of the Progress table alone sees a ticked claim the product does not meet.
- **Fix**: Append a parenthetical to the row pointing at the amendment, for example
  `(judged against design-spec 4.3: the screen stays on Home)`, which records the truth without
  rewriting the step.
- **Decision**: RESOLVED (see `## Resolution`)

### F3 — Phases 1 to 5 record no output for their automated gates

- **Severity**: 📝 OBSERVATION
- **Dimension**: Success Criteria
- **Location**: `context/archive/visual-redesign/plan.md:1528-1530`, `:1552-1554`, `:1572-1574`,
  `:1595-1597`, `:1627-1629`
- **Detail**: Fifteen ticked rows across phases 1 to 5 claim typecheck, the suite and the build
  passed, and no evidence file records any of those runs. Only the phase 6 re-run is captured, at
  `evidence/runs/visual-redesign-guards.txt:172-175` and `visual-redesign-bundle.txt:77-95`. The
  claims are almost certainly true: this review reproduced every one of them at `e3e5df6` and the
  numbers match exactly. The backing for phases 1 to 5 is a commit SHA rather than a recorded run.
- **Fix**: For future changes, append each phase's gate output to the run file as the phase closes,
  as phase 6 did.
- **Decision**: RESOLVED (see `## Resolution`)

### F4 — Roughly nineteen manual rows rest on the implementer's own prose

- **Severity**: 📝 OBSERVATION
- **Dimension**: Success Criteria
- **Location**: `evidence/runs/visual-redesign-phase-gates.md:136`, `:268` and the sections beneath
  them
- **Detail**: Rows including 1.9, 1.11, 1.12, 2.12, 3.9 to 3.12, 4.9, 4.10, 4.13, 4.18, 4.19, 4.21,
  4.23, 5.10 and 5.14 to 5.16 are closed on measurements recorded as prose under the heading
  "Measured during the same session rather than captured", with no image and no tool output. This is
  the softest evidence in the set and a third party cannot re-derive it. It is labelled as
  self-reported rather than dressed as a capture, which is the honest form, and several of the
  measurements it reports were independently confirmed here by reading the stylesheet.
- **Fix**: Where a measurement is load-bearing, record the computed value it came from, as the
  reduced-motion table at `visual-redesign-keyboard.md:67-74` does.
- **Decision**: RESOLVED (see `## Resolution`)

### F5 — Two miscounts in the evidence record

- **Severity**: 📝 OBSERVATION
- **Dimension**: Success Criteria
- **Location**: `evidence/runs/visual-redesign-guards.txt:140`,
  `context/archive/visual-redesign/plan.md:1448`, `evidence/runs/visual-redesign-phase-gates.md:260`
- **Detail**: Two places say "eleven Stability guards rows" where the table at `plan.md:159-168` has
  ten, and guards.txt itself records ten. Separately, phase-gates says the mobile captures are
  780 by 1688 "except the two full-column captures of row 09"; four files deviate, both desktop and
  both mobile row-09 captures. The substance is right in both cases and only the counts are wrong.
- **Fix**: Correct "eleven" to "ten" in both places and "two" to "four" in the capture note.
- **Decision**: RESOLVED (see `## Resolution`)

### F6 — `withoutApiInstruction` depends on the server punctuating its refusal

- **Severity**: 📝 OBSERVATION
- **Dimension**: Safety & Quality
- **Location**: `src/client/components/PriceHistory.tsx:41-46`
- **Detail**: The transform splits the server's refusal on `(?<=\.)\s+` and drops any sentence
  containing `confirm=true`. That is correctly narrow against the message the server sends today,
  which names the months in one sentence and instructs the API caller in another, and capture
  `redesign-20-price-delete-step-two-light.png` shows the intended result. If the server ever
  emitted the refusal as a single sentence, every word would be dropped and the strip would ask
  " Delete anyway?" with no reason attached. The server is out of this change's scope, so this is a
  coupling to note rather than a defect to fix here.
- **Fix**: Fall back to the untransformed message when the filter would leave nothing, so the strip
  degrades to the server's own words rather than to none.
- **Decision**: RESOLVED (see `## Resolution`)

### F7 — Two design answers ratified code that had already shipped

- **Severity**: 📝 OBSERVATION
- **Dimension**: Plan Adherence
- **Location**: `context/archive/visual-redesign/plan.md:1345`, `:1394`
- **Detail**: D7 and D9 were answered by confirming the behaviour the implementer had already built
  rather than by directing it; for D9 the dependent code landed in `5ac541f` thirteen minutes before
  the answer in `0870801`. The protocol at `plan.md:1305` explicitly permits an answer that leaves
  existing behaviour in place, and the plan states both cases plainly, so this is not a breach. The
  structural separation does hold where it can be checked: every answer commit touches only
  `design-spec.md` and no source, and every implementing commit touches source and not the spec.
  Worth recording that git authorship cannot corroborate the separation, because every commit in
  this repository carries the same author; the evidence is commit shape and content. The remaining
  open question, D11, and the designer's acceptance round A1 to A3 followed the intended order:
  answer first in `7485476`, then code in `f642b89`.
- **Fix**: None required. For future design-gated work, raise the checkpoint before building the
  candidate rather than alongside it.
- **Decision**: RESOLVED (see `## Resolution`)

## Notes on what this review did not cover

- **Visual acceptance is the designer's**, performed separately and recorded in
  `context/archive/visual-redesign/reviews/design-acceptance.md`. This review did not judge taste,
  hierarchy or copy, and takes no position on whether the result looks right.
- **Progress row 6.14 is correctly open.** The designer accepted the work with three required
  corrections, all three landed in `f642b89` with the affected captures retaken, and the row stays
  unticked pending the requested re-check. The A3 fix was confirmed here from the retaken capture:
  the nav ground is opaque at 390 and the bleed-through the designer named is gone.
- **Screenshot content was spot-checked, not exhaustively verified.** All sixteen mobile captures
  and a representative set of the rest were opened; every one showed what its filename claims, no
  light and dark pair was identical, and no file was blank or a placeholder. The naming rule is
  consistent across all 62 and maps one to one onto the capture list at `plan.md:1196-1225`.
- **Contrast was recomputed rather than accepted.** All thirteen token pairs were recalculated from
  the hex values in design-spec 2.1 in both themes, twenty-six ratios in all, using the WCAG
  relative-luminance formula. Not one value in `evidence/runs/visual-redesign-contrast.md` is
  misstated, and every pair the specification requires is present. The method is named in that file
  but the script is not committed, so the numbers are reproducible only by rewriting it, which this
  review did.
- **Reduced motion could not be re-verified in a browser here.** The block was read and confirmed
  genuine, and the method recorded at `visual-redesign-keyboard.md:62-65` (relaunching headless
  Chrome with `--force-prefers-reduced-motion` rather than injecting a stylesheet) is the right one,
  but no browser was driven as part of this review.
- **The ada data drift note added in `2a3d15b` is an honest disclosure**, not a hand-wave. It names
  the cause, says the drift was not repaired and gives a checkable reason, distinguishes what was
  verified from what was assumed, and then reasons about whether any specific capture is invalidated
  and names where the one at-risk capture was actually taken. Its central claim was corroborated
  here from `redesign-09-detail-populated-light.png`, whose figures are self-consistent in frame.

## Resolution

Author's response. All seven findings are resolved: F1 and F6 in code, the rest in the record. Each
was re-checked against the code or the file it names before being acted on, and the two behavioural
claims were re-measured in a browser rather than reasoned about.

| Finding | Severity | Outcome | Commit |
|---|---|---|---|
| F1 | warning | Fixed. The index reads the heading's own `scroll-margin-top` and tracks the line one pixel below it; design-spec 4.4 fixes that line at 117px | `da99573` |
| F2 | warning | Fixed. Progress row 3.11 keeps its title and gains the parenthetical naming design-spec 4.3 as the standard it is judged against | `5c02639` |
| F3 | observation | Fixed. `evidence/runs/visual-redesign-gates.txt` records every automated gate verbatim with its exit code, referenced from Progress | `5c02639` |
| F4 | observation | Fixed. `evidence/runs/visual-redesign-manual-rows.md` re-measures nineteen manual rows in a browser and records the computed value behind each | `5c02639` |
| F5 | observation | Fixed. "eleven" corrected to "ten" in both places, "two" to "four" in the capture note | `5c02639` |
| F6 | observation | Fixed. The transform falls back to the server's own words when the filter would leave nothing, with four unit cases | `3d94766` |
| F7 | observation | Recorded. The plan's design-question protocol now carries what this change learned about raising a checkpoint before building the candidate | `5c02639` |

**F1.** The fix is not the one the finding proposes, and the difference matters. The finding asks for
the root margin to be derived from `--scroll-offset`; an unregistered custom property computes to its
unresolved `calc()` text, so parsing it would have produced `NaN`. The observer now reads
`getComputedStyle(heading).scrollMarginTop`, the landing offset itself, which is one step closer to
the truth than either custom property: whatever the stylesheet derives that offset from, the line the
observer watches is the line a click lands on. The single pixel above it is what the designer's
amendment to design-spec 4.4 fixes at 117px, so a heading that has just been scrolled into place
counts as reached rather than missed.

Verified in a real browser at 1280 and at 375, in light and dark, with a keyboard activation and
again under `--force-prefers-reduced-motion`. Every heading a click can reach lands between 116.0px
and 116.4px and its own index item takes `aria-current`; the numbers, the method and the four new
captures are in `evidence/runs/visual-redesign-index-current-item.md`. One consequence is worth
stating plainly: when the document has already scrolled to its end, a last section whose heading sits
below the line is not marked, and the section above it stays current. That is what the rule
prescribes, it is visible at 1280 and not at 375, and it is not a defect the offset can fix.

The accepted captures `redesign-22-index-current-item-light.png` and its mobile pair showed the
superseded behaviour and were left untouched in the first pass. The designer has since decided both
open calls, and the follow-up below carries them.

**F1 follow-up.** The designer amended design-spec 4.4 with an end-of-document rule: when the
viewport bottom is within 1px of the document's scroll height, the last item is current wherever its
heading sits, so every item can become current on a tall viewport. `SectionIndex.tsx` implements it
beside the 117px line, on a passive `scroll` listener because no heading crossing announces the end of
the document, and the decision itself moved into an exported pure function with five unit cases. The
unit suite goes from 189 tests in 16 files to 194 in 17. Re-verified in a browser at 1280 and at 375,
light and dark, and again under `--force-prefers-reduced-motion`: all five index items now take
`aria-current` when clicked, including Standing orders at 1280 with its heading at 280.03px, and the
375 behaviour is unchanged because the line reaches every heading there on its own. Numbers in
`evidence/runs/visual-redesign-index-current-item.md`, captures in
`evidence/screenshots/impl-review-f1-index-last-item-desktop-{light,dark}.png`. The four
`redesign-22-index-current-item` captures were retaken at the widths and themes of the originals, so
the acceptance set now shows the shipped behaviour; the addendum in `reviews/design-acceptance.md`
records that the designer's acceptance stands.

| Finding | Outcome | Commit |
|---|---|---|
| F1 follow-up | Fixed. End-of-document rule in design-spec 4.4 and in `SectionIndex.tsx`, five unit cases, browser-verified at both widths | `b5208f3` |
| F1 follow-up | Recorded. The `redesign-22` captures retaken, two new end-of-document captures | `7e84dd3` |

**F2.** The row keeps its title, as `plan.md` requires, and now reads "... and opens Detail (judged
against design-spec 4.3 as amended in `02b213e`: the screen stays on Home and the new row is itself
the button that opens Detail)". The spec is the standard here, not the title: 4.3 was amended by the
designer after the row was written, and the shipped behaviour follows the amendment. Re-measured in a
browser for this resolution: the panel collapses to `grid-template-rows: 0px` and goes `inert`, the
status line reads "Subscription created", the new row runs `entry-highlight` for 1200ms after a 200ms
delay, focus returns to the heading-row button and the `h1` still reads "Your subscriptions".

**F3.** The gate file records typecheck, the unit suite, the integration suite and the production
build as they ran in one pass, each with its command and exit code. It is a re-run at the resolution
revision, not a reconstruction of the phase runs, and it says so: the phase runs were not recorded
and cannot be recovered. This repository has no lint script and no end-to-end suite, so those four
are every automated gate there is.

**F4.** Nineteen rows were re-walked in a browser with real key events where the row is about the
keyboard. The softest claims are now numbers: forty-five consecutive Tab stops each computing
`2px solid rgb(31, 111, 74)` at `2px` offset with no stop on `document.body`; two same-origin woff2
requests on Login and zero third-party ones; `document.getAnimations().length` of 0 on load in both
motion modes; the Currency and Locale pair at one shared `top` at 1280 and at one shared `left` at
375; a refused create pointing one field's `aria-describedby` at one sentence carrying the mapped
label; ledger values unchanged and zero skeletons 150ms into a refetch; focus on a `tabIndex` of -1
`h2` after a completed delete; three distinct payment sentences; three tile states with three
distinct phrases; one tile changed by a toggle with the assumed total falling by exactly one month's
amount; and two forced failures each landing in one section's own alert and clearing on Dismiss.

**F5.** Both counts corrected, and both were only counts: the guards table has ten rows and ten were
re-checked, and the four row-09 captures that run the height of the page are both desktop and both
mobile, at 2560 by 3330 and 780 by 4198.

**F6.** The transform moved out of `PriceHistory.tsx` into `src/client/components/ui/apiMessages.ts`
so it can be tested without a DOM, which is what the unit runner collects. It keeps the narrow
sentence filter and adds the fallback the finding asks for: when the filter would leave nothing, the
organizer reads the server's own words, instruction included, rather than a bare " Delete anyway?".
Four cases pin it: the two-sentence refusal loses only the instruction, a refusal without one is
untouched, a single unpunctuated sentence survives whole, and a message whose every sentence carries
the instruction survives whole. The unit suite moves from 185 tests in 15 files to 189 in 16.

**F7.** No code changed, which is what the finding asks. The plan's design-question protocol now
carries a short paragraph naming D7 and D9 as answers that ratified built code, the commit order that
shows it, what still held (every answer commit touches only the spec, every implementing commit only
source), and the practice to carry forward.

**Nothing was rejected or deferred.** The verdict's two required corrections are in, and all five
observations are resolved rather than noted. Re-review is a separate pass and not this author's.

## Re-verification

Independent re-review of the `## Resolution` above, including the F1 follow-up. The re-reviewer did
not write the plan, the specification, any implementation commit or any resolution commit. Every
claim below was checked by running a command or by driving a browser, not by reading the record.

Automated gates were re-run twice: once in a detached worktree created from `origin/main` at
`1d5d80a`, the resolution revision, with `node_modules` linked from the primary checkout, and again
in the same worktree at `4a7c6cc`, which carries the F1 follow-up. Both passes were clean.

| Gate | At `1d5d80a` | At `4a7c6cc` | Recorded |
|---|---|---|---|
| `npm run typecheck` | exit 0 | exit 0 | exit 0 |
| `npm run test:unit` | 16 files / 189 tests, exit 0 | 17 files / 194 tests, exit 0 | same at both revisions |
| `npm run test:integration` | 11 files / 112 tests, exit 0 | 11 files / 112 tests, exit 0 | same at both revisions |
| `npm run build` | exit 0 | exit 0 | exit 0 |

The gate record in `evidence/runs/visual-redesign-gates.txt` matches both passes exactly, including
the file and test counts in its own commentary.

| Finding | Verified | Evidence run | Residual risk |
|---|---|---|---|
| F1 | yes | Read `da99573` and `b5208f3`, the amended design-spec 4.4 and `SectionIndex.tsx`. Drove headless Chrome over the DevTools protocol against `npm run dev` on the local D1, signed in as the seeded owner. At 1280 by 900 all five index items take `aria-current` when clicked, at heading tops 116.25, 115.81, 115.69, 116.47 and 280.03px, the last under the end-of-document rule with the gap at 0; scrolling to the bottom without clicking marks the same last item. A real Tab lands on the index with a `2px` ring at `2px` offset and a real Enter makes that item current at 116.25px with focus staying on the item. At 375 by 812 all five are current at tops 115.72 to 116.44px with zero horizontal overflow and the end rule never firing. Repeated in a second Chrome launched with `--force-prefers-reduced-motion`: identical five rows, `document.getAnimations().length` of 0 throughout, `scroll-behavior` computing `auto`. Opened the two new `impl-review-f1-index-last-item-desktop` captures and the retaken `redesign-22` pair; all four show what they claim, at the originals' dimensions | The `scroll` listener is unthrottled, so every scroll event reads `getBoundingClientRect()` for each heading. Cheap at five headings but no longer free per frame, which the component's older comment claimed. `currentItemLine()` reads only the first heading's `scroll-margin-top`, once per effect, so a later change to that offset or a heading with a different one would not be picked up |
| F2 | yes | `git show 5c02639 -- plan.md`. Row 3.11 keeps its title verbatim and gains the parenthetical naming design-spec 4.3 as amended in `02b213e`. `02b213e` touches only `design-spec.md` and the amendment says the screen stays on Home | None |
| F3 | yes | Ran all four gates myself at both revisions, above. `package.json` confirms there is no lint script and no end-to-end suite, so the four named gates are every automated gate. The file is explicit that it is a re-run rather than a reconstruction of the phase runs | The phase 1 to 5 runs themselves remain unrecoverable, which the file states |
| F4 | yes | Read `evidence/runs/visual-redesign-manual-rows.md` in full. Every one of the eighteen rows it covers carries a computed value with the property it came from, not restated intent: rect tops and lefts, resource entries, animation counts, computed outline and offset, `aria-describedby` targets, tile counts and phrases. Row 4.10 is delegated by name to the index record, which covers it. Spot-checked two of its tokens against the stylesheet: `--green` is `#1f6f4a`, which is `rgb(31, 111, 74)`, and `--scroll-offset` derives 56 plus 44 plus 16, which is the 116px reported | Self-driven by the implementer in the same session, so the numbers are reproducible in method but not captured as tool output |
| F5 | yes | Counted both myself. The Stability guards table in `plan.md` has exactly ten rows; a grep across `context/` and `evidence/` finds no remaining "eleven Stability guards" and two corrected "ten". Measured every `redesign-*` capture: 62 files, of which exactly four deviate from 2560 by 1800 and 780 by 1688, and all four are row 09, at 2560 by 3330 and 780 by 4198 | None |
| F6 | yes | Read `src/client/components/ui/apiMessages.ts`, its four unit cases and the call site at `PriceHistory.tsx:177`. Ran the transform against eleven inputs beyond the committed cases. The fallback holds: an instruction-only unpunctuated refusal comes back whole rather than empty, so the strip can no longer read a bare " Delete anyway?". Trailing and leading whitespace, a newline separator, a reversed sentence order, an instruction sandwiched between two organizer sentences and a decimal amount inside a sentence all behave, the last because the split needs whitespace after the full stop | A whitespace-only or empty message still yields an empty string, so the strip would read " Delete anyway?" in that case. The server does not send one, and no code path produces it |
| F7 | yes | Checked the plan's new paragraph against `git log`. D9's answer `0870801` does land after its code `5ac541f`, and D7's answer `02b213e` lands after the phase 3 commit `00813fe` that shipped the behaviour. `02b213e` and `0870801` touch only `design-spec.md`; `7485476` touches the spec and the acceptance record but no source; no phase commit touches `design-spec.md` | The paragraph says "every implementing commit touching only source", which is looser than the truth: the phase commits also touch `plan.md`, evidence and reference captures. The claim that holds is the one the finding made, that no implementing commit touches the spec. One later exception exists: the F1 resolution commit `da99573` amends `design-spec.md` and changes source together |

### One new observation

**R1, three of the four `impl-review-f1-index-current-*` captures do not match their table rows.**
Severity observation, dimension Success Criteria, location
`evidence/runs/visual-redesign-index-current-item.md`, the Captures table. Measured and opened all
four. `impl-review-f1-index-current-mobile-dark.png` is 2484 by 1227 and shows the Home subscription
list at desktop width with no section index on screen, where its row claims 375 dark with Standing
orders current. `impl-review-f1-index-current-desktop-dark.png` is also 2484 by 1227 rather than the
set's 2560 by 1800, and renders the dark theme.
`impl-review-f1-index-current-desktop-light.png` is the right size and shows Payments received
correctly marked, but renders the dark theme despite its name, so the pair is not a light and dark
pair. `impl-review-f1-index-current-mobile-light.png` is genuinely 375 light at 750 by 1624, though
its index strip is scrolled so the current item is off screen and the mark it claims is not visible.
The behaviour these captures were meant to show is independently confirmed above by a browser run and
by the two follow-up captures, which are correct, so this is an evidence-record defect and not a code
defect. It is the same class as F5. **Required action**: retake those four at the set's widths and
themes, or correct the four rows to say what each file actually holds, before the change is archived.
No code change is required.

**R1 closed at `6b30d5b`.** All four files retaken at the set's dimensions and themes, verified with
`sips` and by reading each one: desktop pair at 2560 by 1800 showing Payments received current, mobile
pair at 750 by 1624 showing Standing orders current, light and dark genuinely distinct in both pairs.
Detail in `evidence/runs/visual-redesign-index-current-item.md`.

### Updated verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

**Overall: APPROVED.** All seven findings are verified resolved, both required corrections included,
and the F1 follow-up is verified in a real browser at both widths, in both motion modes and by
keyboard. One new observation, R1, carries a documentation-only required action before archive.
