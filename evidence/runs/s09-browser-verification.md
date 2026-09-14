# s09 browser verification

Phase 5 steps 5.1 and 5.2 of change `compact-member-calendar` (S-09). Every claim below is a value read
from a live page, with the property it came from named, or a screenshot path. No credential value
appears in this file or in any capture. Every record touched is synthetic and lives in the local D1.

## Environment

| What | Value |
| --- | --- |
| Commit verified | `29ee6f0` |
| Commit the gates were run on | `29ee6f0` |
| Working tree during the run | clean under `src/`, `tests/`, `migrations/` |
| Server | `npm run dev` (Vite plus Worker on one origin, `http://localhost:5173`) against the local D1 |
| Account | `s09-calendar@example.invalid`, disposable, created through `POST /api/dev/seed` with `SEED_ENABLED=true`, signed in through the real password form |
| Chrome | `Chrome/152.0.7977.84`, headless, throwaway profile, driven over the DevTools protocol |
| Desktop width | Chrome device-metrics emulation at 1280 by 900, scale factor 1 |
| Narrow width | Chrome device-metrics emulation at 390 by 844, scale factor 2, mobile and touch |
| Themes | Chrome `Emulation.setEmulatedMedia` for `prefers-color-scheme`, set to `light` and to `dark` |
| Reduced motion | a second Chrome launched with `--force-prefers-reduced-motion` |

The headless window will not size below a CSS width of about 500 pixels, which is the constraint
`context/checkpoints/cmc-4-integrate.md` records. Device-metrics emulation is not subject to it: at the
390 setting `window.innerWidth` reads back `390`, so the narrow layout below is the real one and not a
500 pixel stand-in. No iframe wrapper was needed.

## A caution about this run's first pass

An earlier pass was run against `a87d728`. While it was in progress two fixes landed in the tree,
`d5952a9` and `1cef767`, and the Vite dev server hot-reloaded them under the session. Two observations
from that pass, a short month in the inspector's record button and an inverted focusable order inside a
person block, were artefacts of straddling those commits: both are correct at `29ee6f0` and are
recorded as such below. **Every claim in this file was re-observed at `29ee6f0` after the tree went
clean and the dev server, the browser profile and both fixtures were rebuilt.** The compactness figures
were taken three times, twice before those fixes and once after, and were identical each time.

## Step 5.1 gates

Run at `29ee6f0` on the integrated tree. Timestamps and durations are elided; nothing else is changed.

| Gate | Exit | What it reported |
| --- | --- | --- |
| `npm run typecheck` | 0 | `tsc -p tsconfig.worker.json --noEmit && tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.node.json --noEmit`, no output |
| `npm run test:unit` | 0 | `Test Files  26 passed (26)`, `Tests  351 passed (351)`, `RUN  v4.1.11` |
| `npm run test:integration` | 0 | `Test Files  13 passed (13)`, `Tests  131 passed (131)` |
| `npm run build` | 0 | `675 modules transformed` for the worker, `69 modules transformed` for the client |

Built client assets, verbatim:

```
dist/client/assets/index-ByHeNjZo.css                                  20.10 kB │ gzip:  4.69 kB
dist/client/assets/index-9rx75q34.js                                  306.64 kB │ gzip: 90.85 kB
```

Built worker entry, verbatim:

```
dist/subscription_splitter/index.js                                             882.53 kB │ gzip: 210.20 kB
```

## The fixtures

Built through the app's own HTTP routes by `evidence/runs/s09-scripts/calendar-ledger.mjs`, which signs
in as the disposable account and posts to `/api/subscriptions`, `/members`, `/prices`, `/break-months`,
`/payments`, `/schedules` and `/schedules/:id/exceptions/:month`. Synthetic names and amounts only. The
two subscriptions and their contents are tabulated in `evidence/runs/s09-compactness.md`.

One state is unreachable through the API: a participant with no active range at all, which
`members.ts` refuses by design. `evidence/runs/s09-scripts/empty-ranges.mjs` creates a participant
normally and then deletes its `active_ranges` rows with `wrangler d1 execute --local`, which is the
only way to render the empty-membership sentence. That write is to the local disposable database only.

## Method

One function evaluated in the page returns the measurement figures; another describes
`document.activeElement` after each key. Key presses are real DevTools protocol key events, with a
capture-phase `keydown` listener recording the resulting `document.activeElement` thirty milliseconds
later, so the whole sequence is pressed for real and read back once. Status strings and the
changed-record tint are sampled every forty milliseconds across a mutation, because both expire on a
timer and a single read after the fact misses them.

## Cell states

Read from the LONG fixture at year 2026. `aria-label` is the accessible name; `svgs` counts the inline
mark glyphs in the cell.

| Cell | Class | Text | Marks | `aria-label` |
| --- | --- | --- | --- | --- |
| Ada, Mar | `calendar-cell` | `Mar×2` | 2 | `March 2026, 2 payments recorded, £50.00 in total, £4.00 assumed from a standing order, charged £2.00` |
| Ada, Apr | `calendar-cell` | `Apr` | 1 | `April 2026, nothing recorded, £4.00 assumed from a standing order, charged £2.40` |
| Ada, May | `calendar-cell` | `May` | 1 | `May 2026, nothing recorded, the plan was paused that month` |
| Ada, Jul | `calendar-cell` | `Jul` | 1 | `July 2026, nothing recorded, marked as not received, charged £2.40` |
| Ada, Sept | `calendar-cell calendar-cell-current` | `Sept` | 1 | `September 2026, nothing recorded, £4.00 assumed from a standing order, charged £2.00` |
| Ada, Nov | `calendar-cell calendar-cell-future` | `Nov` | 0 | `November 2026, nothing recorded, that month has not arrived yet` |
| Cleo, Jun | `calendar-cell calendar-cell-offplan` | `Jun` | 0 | `June 2026, nothing recorded, the participant was not on the plan that month` |
| Bo, Feb | `calendar-cell` | `Feb` | 1 | `February 2026, 1 payment recorded, £12.00 in total, charged £2.00` |
| Dev, Jan | `calendar-cell` | `Jan` | 1 | `January 2026, 1 payment recorded, £120.00 in total, charged £2.00` |
| Bo, Jan 2019 | `calendar-cell` | `Jan?` | 0 | `January 2019, nothing recorded, that month had no price` |

The current month carries `aria-current="date"` and is the only cell in its strip with `tabIndex` 0.
The selected cell carries `aria-selected="true"`. No accessible name ever combines recorded and assumed
into one total: March reads `£50.00 in total` and `£4.00 assumed` as two separate figures.

`×2` is drawn on Ada's March cell, which holds two marks; the count shares the disc's slot as §5 rules.

The strip is a `role="grid"` holding one `role="row"` holding twelve `role="gridcell"` buttons, and
carries the accessible name `Cleo, 2026 month by month`.

## Layout

| Check | 1280 | 390 |
| --- | --- | --- |
| `window.innerWidth` | 1280 | 390 |
| Columns per visual row | 12 | 6 |
| ARIA rows for six participants | 6 | 6 |
| `[role="gridcell"]` count | 72 | 72 |
| Cell width, `getBoundingClientRect().width` | | 56.33 |
| Cell height | | 48 |
| `#year-select` height | | 44 |
| Previous year button height | | 44 |
| `documentElement.scrollWidth - innerWidth` | | 0 |

The strip stays one ARIA row at 390 while wrapping to two visual rows, which is §4's rule. Cells are
56.33 by 48, above the 44 by 44 touch minimum. There is no horizontal overflow.

Captures: `evidence/screenshots/s09/long-1280-light.png`, `long-1280-dark.png`,
`long-390-light.png`, `long-390-dark.png`, `short-1280-light.png`.

## Year control and legend

Read from the LONG fixture.

| Check | Observed |
| --- | --- |
| `#year-select` options | `2019,2020,2021,2022,2023,2024,2025,2026,2027`, nine |
| Selected year on load | `2026`, the current month's year |
| Range sentence | `Showing Jan to Dec 2026.` |
| Future-year fragment | a button reading `2027 holds 1 payment.`, which selects 2027 |
| Legend line | `recorded`, `assumed from a standing order`, `plan paused`, `? no price`, `marked not received`, `not on the plan` |
| Next year at the last year | `aria-disabled="true"`, `disabled` property `false`, `tabIndex` 0, and clicking it left `#year-select.value` at `2027` |
| Focus after pressing Next year | stayed on the button pressed |
| Open inspector across a year change | followed from `Bo, June 2026` to `Bo, June 2027` |

## Keyboard

Started from the first block's Edit button, all real key presses, `document.activeElement` recorded
after each.

| Key | Resulting focus |
| --- | --- |
| Tab | Archive |
| Tab | Delete |
| Tab | the strip, on Cleo's September cell, the current month |
| ArrowRight | Cleo, October |
| Home | Cleo, January |
| ArrowLeft | Cleo, December, wrapping |
| ArrowRight | Cleo, January, wrapping |
| End | Cleo, December |
| ArrowDown | Fin, December, the next block's same month |
| ArrowUp | Cleo, December |
| Enter | Cleo, December, and the inspector opened reading `Cleo, December 2026` |
| Escape | Cleo, December, and the inspector closed |

Tab order inside a block is Edit, Archive, Delete, then one stop for the strip, then the next block,
which is §8 exactly. After the traversal, exactly one cell per strip carried `tabIndex` 0, and the two
strips the arrows had visited held it on December while the other four held it on September, so the
active cell is the tab stop and it survives leaving the strip.

## Inspector

Opened on Ada, March 2026, the month with two same-day receipts and a counted assumed receipt.

| Element | Observed |
| --- | --- |
| Heading | `Ada, March 2026` |
| Charge sentence | `Charged £2.00 for March 2026.` |
| Group headings | `Recorded (2)`, `Assumed` |
| Receipts | `£25.00 | 3 Mar 2026 | One-off | Edit | Delete` and `£25.00 | 3 Mar 2026 | One-off, first half | Edit | Delete` |
| Assumed group | `£4.00 a month from a standing order, from Jan 2024, still running`, `Assumed received for March 2026.`, `Mark not received`, `Edit standing order`, `Delete standing order` |
| Record action | `Record a payment for March 2026` |
| Focus on open | stayed on the cell, whose `aria-selected` read `true` |
| Inspectors on the page | 1 |
| Record form on open | a closed disclosure, `data-open="false"`, `aria-expanded="false"`, height 0, inner marked `inert` |

Two same-day receipts render as two entries, as §6 requires.

On an excepted month, Ada August 2022: `Marked as not received for August 2022.` with the toggle
`Mark received`, and the assumed line read `£3.00 a month from a standing order, until Dec 2023`, which
is the earlier of the two adjacent rates. On an unpriced month, Bo January 2019: the charge sentence
read `No price recorded for January 2019, so the charge is unknown.` on an element classed
`t-body calendar-red`.

Capture: `evidence/screenshots/s09/inspector-two-same-day-receipts-light.png`.

## Unpriced, and the red year fragment

At year 2019 on the LONG fixture, whose first price is effective from March 2019:

| Check | Observed |
| --- | --- |
| Jan and Feb cell text | `Jan?`, `Feb?` |
| Their accessible names | `... nothing recorded, that month had no price` |
| Year cells row | `Charged in 2019 £20.00, 2 months without a price` |
| The fragment's class | `calendar-red` |

Capture: `evidence/screenshots/s09/unpriced-2019-light.png`.

## Empty membership

A participant named Gil with no `active_ranges` rows at all.

| Check | Observed |
| --- | --- |
| Header line | `Gil`, `not active this month`, `settled` |
| Lifetime cells | `Owed £0.00`, `Paid £0.00`, `This month £0.00` |
| Year cells row present | `false`; `.calendar-year-cells` is absent |
| Sentence in its place | `No membership range recorded, so nothing was charged. Recorded payments still show.` on a `calendar-red` element |
| Cells | all twelve carry `calendar-cell-offplan` at year 2019 |

This is §4's rule that the year row is replaced by the sentence, and §9's rule that the state never
reads as settled money. Capture: `evidence/screenshots/s09/empty-membership-1280-light.png`.

## Mutations, status and focus restoration

All on the LONG fixture with an inspector open.

| Action | Status string | Tint | Resulting focus |
| --- | --- | --- | --- |
| Record a payment from the inspector | `Payment recorded` | 1 block and 1 cell, then both cleared, then the status cleared | the new entry's Edit button, `inspector-payment-edit-<id>` |
| Delete a receipt, confirm step | | | `Keep`, with the question `Delete the £500.00 payment from Cleo?` |
| Delete a receipt, completed | `Payment deleted` | none | the inspector heading, `inspector-heading-<member>-2026-03`; the inspector stayed open |
| Delete a participant, confirm step | | | `Keep`, with the question `Delete Ada? Their payments stay recorded.` |
| Delete a participant, refused | | | that block's Delete button, `participant-delete-<id>` |
| Close the inspector | | | its own cell |
| Escape from the cell | | | stayed on the cell, inspector closed |
| Escape inside the open record form | | | the button that opened it, `inspector-record-<member>-<month>`; the inspector stayed open and only the form closed |

The record form opened with the participant preset to the block's own member, read back as `Cleo` from
the select, and the date preset to `2026-03-01`, the first day of the month.

The refused participant delete left the server's own sentence in the Participants section alert,
verbatim: `this member has records attached and is archived rather than deleted`.

### A receipt edited into another year

Ada's March 2026 receipt was re-dated to `2027-09-09` through the inspector's own edit form.

| Check | Observed |
| --- | --- |
| Inspector | stayed on `Ada, March 2026` |
| Recorded heading | fell from `Recorded (3)` to `Recorded (2)` |
| March cell accessible name | `March 2026, 2 payments recorded, £26.50 in total, £4.00 assumed from a standing order, charged £2.00` |
| Range sentence | updated from `2027 holds 1 payment.` to `Showing Jan to Dec 2026. 2027 holds 2 payments.`, with the plural |
| Focus after saving | `document.body` |

The last row is a defect: §8 requires the inspector heading when the edited entry has left the month.
The heading exists and is focusable, `inspector-heading-<member>-2026-03` with `tabIndex` -1, and it is
where focus lands after a receipt **delete**. The contrast case was checked in the same session: editing
a receipt without moving it out of the month returned focus to that entry's Edit button,
`inspector-payment-edit-<id>`, as the rule says. Only the leaves-the-month branch drops focus to the
document body.

No tint appears after a receipt delete. That follows from the resolution rule the plan states: the
section resolves one `highlightedId` against the reloaded records, and a deleted receipt names no
record, so neither a member nor a month can be resolved. It is recorded here as an observation rather
than a defect, for the designer to rule on.

## Order freeze and reorder

| Step | Order, most-owing first |
| --- | --- |
| Before, inspector open on Cleo | Cleo owes £172.40, Fin owes £168.00, Bo owes £68.60, Esi owes £9.20, Dev ahead £108.40, Ada ahead £168.40 |
| After recording £500.00 for Cleo, inspector still open | Cleo **ahead £327.60**, Fin owes £168.00, Bo owes £68.60, Esi owes £9.20, Dev ahead £108.40, Ada ahead £168.40 |
| After closing the inspector | Fin owes £168.00, Bo owes £68.60, Esi owes £9.20, Dev ahead £108.40, Ada ahead £168.40, Cleo ahead £327.60 |

The middle row is the freeze proving itself: Cleo sits first while ahead by £327.60, out of the
most-owing order, and moves to last the moment the inspector closes. Focus returned to Cleo's cell.

## Bounded payments section

| Check | Observed |
| --- | --- |
| Heading | `Payments received (19)` |
| Disclosure on load | `aria-expanded="false"`, section `scrollHeight` 114 |
| Entries in the DOM while closed | 12, not 19 |
| After opening | toggle reads `Hide payments`, 12 entries listed |
| The more control | reads `Show 7 more` |
| After pressing it | 19 entries listed, and the closing line `That is every payment.` |
| On reload | closed again, `scrollHeight` 114 |

The label adapts to the remainder rather than reading `Show 12 more` as §7 writes it. See Defects.

## Standing orders without tiles

`document.querySelectorAll('.tile, .month-tile').length` reads 0 on both fixtures. The section renders
two schedule rows, each with its rate, window phrase, assumed-so-far figure and Edit and Delete, and no
per-month tile list.

## Failed write and failed refresh

Chrome network emulation set to `Offline` mid-session, then Unskip pressed on a skipped month.

| Check | Observed |
| --- | --- |
| Section alert | `Could not save. Check your connection and try again.` |
| Heading | `Skipped months (2)`, unchanged |
| The months | `May 2021` and `May 2026`, both still listed |
| Person blocks | 7, unchanged |
| Rendered cells | 84, unchanged |
| Console | one message, `Failed to load resource: net::ERR_INTERNET_DISCONNECTED` |

Nothing was optimistically drawn and every previous record stayed on screen, which is §9's rule. The
words are the app's own, because an unreachable server sends none. The case where the alert carries
**the server's own words** is the refused participant delete above, which renders the server's sentence
verbatim.

Capture: `evidence/screenshots/s09/failed-write-offline-alert.png`.

## sessionStorage retention

| Check | Observed |
| --- | --- |
| Key | `calendar:<subscription id>` |
| Value with an inspector open | `{"year":2022,"memberId":"3efb542d-...","month":"2022-08"}` |
| Value with none open | `{"year":2026,"memberId":"","month":""}` |
| After a full page reload and reopening the subscription | `#year-select.value` read `2022` and the inspector read `Ada, August 2022` |

## Reduced motion

Verified in a second Chrome launched with `--force-prefers-reduced-motion`, not by forcing CSS.

| Check | Observed |
| --- | --- |
| `matchMedia('(prefers-reduced-motion: reduce)').matches` | `true` |
| `--motion-disclosure-open` | `0ms` |
| `--motion-disclosure-close` | `0ms` |
| `--motion-highlight` | `0ms` |
| `--motion-status-in` | `0ms` |
| `--motion-status-out` | `0ms` |
| Inspector wrapper `transitionDuration` when open | `0s` |
| Inspector opening | opened, heading `Ada, March 2026`, focus stayed on the cell |
| Changed-cell tint after recording | `animationName` `none`, `animationDuration` `0s`, `backgroundColor` `rgb(28, 58, 43)` |
| Changed-block tint | `animationName` `none` |

The tint still appears, as a static ground rather than an animation, which is §9's rule that it carries
information and survives reduced motion.

## Console

Across the verified pass at `29ee6f0` the console carried no error or warning except the one
`ERR_INTERNET_DISCONNECTED` the offline test caused deliberately.

## Defects found

Reported here, not fixed; this step does not write source.

1. **The plan's whole-page compactness clause fails at 6.70 per cent against its five per cent bound.**
   Reproduction: build both fixtures, read `document.querySelector('main.page').scrollHeight` at year
   2026 on each; SHORT reads 2731 and LONG 2914. The difference decomposes exactly into the Skipped
   months section, 80 pixels for a second skipped month, and the Standing orders section, 103 pixels
   for a second standing order. Every calendar-owned figure is identical. The clause's stated cause,
   the option count and the range sentence, is not what these fixtures differ by. Owner's call: reword
   the clause or rebuild the fixtures with equal counts of both record kinds.

2. **The payments disclosure's more control reads `Show 7 more` where `design-spec.md` §7 writes
   `Show 12 more`.** Reproduction: open the LONG fixture, open Show payments, read the control's text
   with 19 payments and 12 shown. The implementation names the remainder; the spec names the page size.
   The implementation's copy is arguably the more accurate of the two, so this is a designer ruling
   rather than a bug, but the two do not currently agree.

3. **No tint follows a receipt delete**, where §9 pairs every success with the changed cell's and
   block's tint. Reproduction: open an inspector on a month holding a receipt, delete it, sample
   `.entry-highlight` and `.calendar-cell-highlight` across the next second; both stay 0 while the
   status reads `Payment deleted`. This follows from the one-`highlightedId` resolution the plan
   specifies and may be intended; it needs a ruling rather than a fix.

4. **Focus is lost to `document.body` when a receipt is edited out of the inspected month**, where §8
   requires the inspector heading. Reproduction: open an inspector on a month holding a receipt, press
   that entry's Edit, change the date to another year, press Save changes, then read
   `document.activeElement`; it is `BODY`. Editing the same receipt without moving it out of the month
   returns focus to its Edit button correctly, and a receipt delete focuses the inspector heading
   correctly, so only this one branch is wrong. A keyboard user loses their place in the page. This is
   the one finding of the four that is a plain implementation bug rather than a question for the
   designer or the plan.

Findings 1 to 3 want a ruling. Finding 4 wants a fix in `MonthInspector.tsx`, which this step does not
write. Every other §3 to §9 behaviour this step exercised matched the specification.

## Not verified

- **Safari, Firefox and any mobile browser.** Only Chrome 152 was driven. The house constraint that
  Safari needs `COOKIE_SECURE=false` over plain http, recorded in `evidence/runs/s08-browser-verification.md`,
  was not exercised in this step.
- **Real touch input.** The 390 pass uses Chrome's touch emulation, which reports `hasTouch` but does
  not dispatch physical touches. Cell sizes were measured; a real finger was not used.
- **The pre-change build comparison.** See the Not measured section of `evidence/runs/s09-compactness.md`.
- **A refresh that fails on its own**, separately from the write that triggered it. The offline test
  fails the write and the refresh together, so the two are not distinguished here.
- **A server-side 500 or a partial refresh failure.** The failed-write case was produced by taking the
  network offline. A server that answers with an error was exercised only through the refused
  participant delete, which is a designed 409 rather than a fault.
- **The archived-and-settled disclosure holding full person blocks.** No fixture participant was both
  archived and settled during the verified pass.
- **The price-delete 409 naming the months it would unprice.** An attempt in the earlier pass did not
  reach the refusal and was not retried at `29ee6f0`.
- **Visual acceptance.** The captures above are evidence; judging them against `design-spec.md` and the
  mockup is step 5.4 and belongs to the designer.

## Screenshots

| Path | What it shows |
| --- | --- |
| `evidence/screenshots/s09/long-1280-light.png` | the LONG fixture, desktop, light |
| `evidence/screenshots/s09/long-1280-dark.png` | the LONG fixture, desktop, dark |
| `evidence/screenshots/s09/long-390-light.png` | the LONG fixture at 390, light, six columns |
| `evidence/screenshots/s09/long-390-dark.png` | the LONG fixture at 390, dark |
| `evidence/screenshots/s09/short-1280-light.png` | the SHORT fixture, desktop, light, for the compactness comparison |
| `evidence/screenshots/s09/inspector-two-same-day-receipts-light.png` | the inspector on Ada March 2026, two same-day receipts and a counted assumed receipt |
| `evidence/screenshots/s09/unpriced-2019-light.png` | the `?` mark and the red months-without-a-price fragment |
| `evidence/screenshots/s09/empty-membership-1280-light.png` | the empty-membership sentence and hatched strip |
| `evidence/screenshots/s09/failed-write-offline-alert.png` | the failed write, with every previous record still on screen |
