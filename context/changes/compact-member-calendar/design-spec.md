# Design specification: compact member calendars

Designer: Fable 5.1, applying `frontend-design` on top of the accepted system in
`context/archive/visual-redesign/design-spec.md`. Every rule there still holds unless this file says
otherwise. Inputs: `design-inputs.md`, `frame.md`, the preservation matrix in `research.md` §3.
Implementers build exactly this. A gap, contradiction or infeasibility returns to the designer as a
checkpointed question; nobody improvises appearance, copy, interaction or motion.

## 1. Direction and the one bold element

**Calendar, not graph.** A cell must carry seven named exclusion states, two receipt kinds, a count
and a completeness flag, by text or symbol as well as colour, under keyboard and touch. Categorical
state is what a calendar encodes and what a continuous graph blurs. Magnitude stays in the figures.

**Twelve cells per person for one selected year is the default.** Six people by twelve months is one
screen and answers the organizer's question, "who is behind this year". A person's multi-year history
is reached by stepping the shared year control, never by a per-person eight-year grid. Collapsed
height grows with people, not with months or payments.

The calendar strip is the memorable thing on this screen. Everything around it stays the existing
quiet ledger: rules, paper, one sans, no shadows, no new colour. One new visual device is introduced
and used for exactly one meaning, a diagonal hatch for "not on the plan that month". No other
decoration is added.

**Two ledgers, never one number.** A cell shows a recorded mark and an assumed mark side by side and
never a combined figure. Zero is never shown as "settled": completeness is its own mark.

## 2. Screen structure after the change

Top to bottom, unchanged unless noted:

1. App bar, back link, plan `h1`, plan line, Edit and Delete subscription. Unchanged.
2. Headline figure and four-cell ledger line, summary sentence. Unchanged.
3. Section index. **Unchanged, five items, same labels.** It still bounds a shorter page.
4. **Participants** — the calendar. Section opening (rule, `h2` without a count, subtitle, status line,
   "Add participant" primary). Body: year control, legend, one *person block* per participant, the
   existing "Show N settled archived participants" disclosure, and the existing empty state.
5. **Price history.** Unchanged.
6. **Skipped months.** Unchanged.
7. **Payments received** — becomes *bounded*: heading count, the existing per-participant filter
   select, then a disclosure "Show payments" that reveals at most twelve entries plus a "Show 12
   more" link button. Entry shape, edit panel, confirm strip, refusals and the "No payments recorded
   yet." sentence are unchanged. Collapsed by default on every load.
8. **Standing orders** — keeps its schedule rows (rate, window, "assumed total so far", "over N of M
   elapsed months", Edit, Delete, confirm strip, form) and **drops the per-month tile list**. The
   month vocabulary moves into the calendar cells and the month inspector. The section subtitle gains
   one sentence: "Each month's assumed receipt shows in the participant's calendar."

Subtitle for Participants (an addition; the section has none today): "One row per person for the selected year.
Select a month to see what was recorded, what is assumed and what was charged."

## 3. Year control and legend

```
┌ Participants ───────────────────────────────────── ✓ Payment recorded   [Add participant] ┐
  One row per person for the selected year. Select a month to see …

  [‹]  [ 2026 ▾ ]  [›]        Showing Jan to Dec 2026. 2027 holds 1 payment.

  ● recorded   ○ assumed from a standing order   ‖ plan paused   ? no price
  ⊘ marked not received   ▨ not on the plan
```

- **Controls**: two `.btn-quiet` buttons with visible text "Previous year" and "Next year" as
  `aria-label`, showing the glyphs `‹` `›` at `.t-entry` weight; between them a native `select`
  listing every year from the plan's start year to the *latest year that holds any record*
  (the greater of the current year and the year of the latest payment date or schedule end).
  Select and buttons are the existing 40px controls, 44px below 640px. A button at the end of the
  range is `aria-disabled`, focusable, and does nothing.
- **Range sentence** right of the controls, `.t-small .soft`: "Showing Jan to Dec 2026." When any
  payment is dated in a year later than the selected one, append "2027 holds 1 payment." (plural
  "payments") as a `.btn-link` that selects that year; when several later years hold payments, one
  such fragment per year in ascending order. This is how a future-dated receipt stays discoverable
  from the default year. Below 640px the sentence wraps under the controls.
- **Legend**: one wrapping line, `.t-small .soft`, each item a mark followed by its phrase, gap
  `--s-4`. The marks are the same SVG marks as in the cells (§5). Not all caps, no heading above it.
- **Default year**: the current month's year in the subscription's time zone. **Retention**: the
  selected year and the open inspector (member id, month) are stored in `sessionStorage` under
  `calendar:<subscription id>`; on load they are restored if the year is inside the range and the
  member still exists, else the default applies. Selection never writes to the ledger.
- Changing year re-renders every strip in place. No slide, no fade. Focus stays on the control used.
  An open inspector stays open for the same person and calendar month in the new year.

## 4. Person block

```
  Alice  archived   not active this month                    owes £54.00
  Owed £1,204.00   Paid £1,150.00   This month £12.50
  Recorded in 2026 £150.00   Assumed in 2026 £120.00   Charged in 2026 £150.00, 2 months without a price
  Edit  Archive  Delete
  ┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐
  │Jan │Feb │Mar │Apr │May │Jun │Jul │Aug │Sep │Oct │Nov │Dec │
  │ ●  │ ●  │ ●○ │ ○  │ ⊘  │ ‖  │    │ ?  │▨   │▨   │    │    │
  └────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┘
  (inspector opens here, full width, when a cell is selected)
  ──────────────────────────────────────────────────── 1px rule
```

- **Header line**: name at `.t-entry`; the existing "archived" and "not active this month" tags in
  the existing small soft treatment; balance right-aligned using the existing word-plus-figure
  treatment (owes red, ahead green, settled faint). This is the existing ledger entry primary line.
- **Lifetime cells**: the existing entry-cells row, Owed / Paid / This month, unchanged semantics.
- **Year cells**: a second entry-cells row, three pairs, each label carrying the year so the reader
  never confuses them with lifetime: "Recorded in 2026" (sum of manual receipts dated in that year,
  recorded treatment), "Assumed in 2026" (sum of counted assumed receipts in that year, assumed
  treatment), "Charged in 2026" (sum of charged shares for the year). When any month of the year is
  `unpriced`, the Charged value is followed by ", N month(s) without a price" in `--red`
  at `.t-small`. When the participant has no active range at all, the year row is replaced by one
  sentence in `--red` `.t-small`: "No membership range recorded, so nothing was charged. Recorded
  payments still show." Recorded and Assumed are never added together anywhere.
- **Actions**: the existing link-button row, Edit, Archive/Unarchive, Delete. Edit replaces the whole
  person block (header, cells, strip) with `MemberForm` in place, exactly as the row is replaced
  today; closing restores the block and focuses Edit. Delete swaps the action row for the existing
  confirm strip with the existing wording; focus lands on Keep.
- **Owner**: no block. The owner is not a participant row today (`computeSummary` excludes them) and
  the summary block above already shows the owner's share. The mockup's owner row is withdrawn.
- **Strip**: a `role="grid"` containing one `role="row"` that holds twelve `role="gridcell"`
  buttons for the year, in calendar order Jan to Dec regardless of locale (labels are the locale's
  short month names). The strip is one ARIA row at every width; the two visual rows below 640px are
  a CSS wrap only. Desktop
  `grid-template-columns: repeat(12, 1fr)`, gap `--s-1`, cell height 44px. Below 640px
  `repeat(6, 1fr)`, two rows, cell height 48px, gap `--s-1`. Cells never shrink below 44px wide.
- **Block separator**: the existing 1px `--rule` hairline, margin `--s-4` above and below.
- **Order**: most-owing-first as today. **Frozen while any inspector, edit panel or confirm strip is
  open** inside the Participants section; balances and cells update in place, and the order is
  reapplied when the last one closes. A block whose balance changed carries the existing 1200ms
  green-tint highlight so the reader sees the change without the jump.
- **Archived and settled** participants stay behind the existing disclosure at the end of the list;
  when revealed they render as full person blocks.

## 5. Cell anatomy and marks

Each cell is a native `button` with `type="button"`, `role="gridcell"`, roving `tabindex`
(§8). Ground `--paper`, 1px `--rule` border, radius 4px, padding `--s-1` on every side, so a cell holding three marks still fits a 56px column. Contents stacked:
month label at `.t-small` colour `--ink`, then a **mark row** 12px tall. Hover: border `--border`,
instant. Selected (its inspector is open): ground `--ink`, label and marks `--on-ink`, border
`--ink`. Focus: the app's one focus ring, never removed. Current month: a 2px `--ink` underline
directly under the label, width of the label, mirroring the section index's current marker; on the
selected cell it is `--on-ink`.

Marks are inline SVG, 12×12 viewBox, `aria-hidden="true"`, stroke or fill `currentColor`, drawn by
one `CellMark` component keyed by name. They sit in a row, gap 3px, centred. **At most three marks
show**, in this order: `recorded`, `assumed`, then one state mark. The `×N` count is not a mark; it
is attached to the disc and shares its slot. When a cell carries all three marks the count is
dropped from the cell and stays in the accessible name and in the inspector's "Recorded (N)"; the
count is drawn whenever the cell holds at most two marks.

| Name | Drawing | Colour | Meaning |
| --- | --- | --- | --- |
| `recorded` | filled circle r=4.5 | `--ink` | at least one manual receipt this month |
| `recorded` count | text `×N` after the disc, `.t-small .tnum` | `--ink` | N recorded receipts, shown only when N ≥ 2 |
| `assumed` | circle r=4.5, stroke 1.5, `stroke-dasharray 2 2` | `--ink-soft` | one counted standing-order receipt |
| `excepted` | circle r=4.5 stroke 1.5 with a 45° line through it | `--red` | standing-order month marked not received |
| `paused` | two vertical bars 2×10 at x=3 and x=7 | `--ink-faint` | `break-month` |
| `unpriced` | text `?` at `.t-small` weight 600 | `--red` | the domain's charge status for the month is `unpriced` |
| `off-plan` | no glyph; cell ground is the hatch | — | `outside-active-range` or empty membership |
| future / before start | no glyph; label `--ink-faint`; border 1px dashed `--rule` | — | `not-yet-elapsed`, `before-start-month` |
| charged, no receipt | no glyph; label `--ink` | — | an elapsed, priced, active month with nothing recorded and nothing assumed |

The hatch: `background: repeating-linear-gradient(135deg, transparent 0 3px, var(--hatch) 3px 4px)`
over `--paper`, where `--hatch` is one new token: `#c5d0c0` (the light `--rule`) in light and `#6f7b73`
(the dark `--border`) in dark, because the dark `--rule` disappears against `--paper`. It is a
pattern, not a colour, and the accessible name carries the phrase. The legend swatch for it is a
14px hatched square with a 2px radius. A hatched
or dashed cell that still holds a recorded receipt shows the `recorded` disc on top of it: recorded
money outside a known range is a fact the reader must see. A future month never shows `assumed`.

Precedence for the state mark is the domain's: the outermost failing condition is the one drawn
(`before-start-month`, `not-yet-elapsed`, `outside-active-range`, `break-month`, `unpriced`,
`excepted`). `owner-member` exists in the domain but no cell belongs to the owner, so it never
reaches a cell. A month excluded by a break or a range gap is never drawn as `excepted`. The cell
calls the domain for the reason and never restates a rule; the same reason feeds the `?` mark, the
inspector's charge sentence and the year cells' "N months without a price" count, so there is one
source of truth and no separate price-coverage flag.
The `unpriced` mark also appears on a month that carries receipts, because the charge is unknown
regardless of what arrived. A month is drawn "charged, no receipt" only when the domain says it was
charged; the cell never implies the month is unpaid or paid, only that nothing was recorded then.

**Accessible name** (`aria-label`), one sentence, in this order, omitting empty parts:
"`March 2026`, `2 payments recorded, £25.00 in total`, `£10.00 assumed from a standing order`,
`charged £12.50`" or the exclusion phrase from `design-inputs.md` §6 in place of the charge
("the plan was paused that month", "that month had no price", "marked as not received", …), and
"nothing recorded" when no receipt exists. Never a combined total of recorded and assumed.
`aria-selected="true"` on the selected cell, `aria-current="date"` on the current month.

## 6. Month inspector

Opens **directly under the person's strip**, full width of the block, with the existing disclosure
*motion* (grid-template-rows 0fr→1fr, 180ms open, 140ms close, the one easing; 0ms under reduced
motion) reproduced by the inspector's own markup. It does **not** reuse the `DisclosurePanel`
component, which moves focus to its first control on open; here focus stays on the cell (§8). The
inspector heading carries an id and `tabIndex={-1}` so it can be a focus target, and each cell
carries a stable id so focus can return to it. Only one inspector is open on the page; opening another closes the first.
Other person blocks do not move (order frozen, §4). The inspector is the person's own detail, so it
never appears in a modal, drawer or side column.

```
  ┌ Alice, March 2026                                                  [Close] ┐
  │ Charged £12.50 for March 2026.                                              │
  │ No price recorded for August 2026; the charge is unknown.   (only when unpriced)
  │                                                                              │
  │ Recorded (2)                                                                 │
  │  £25.00  One-off  "first half"                     3 Mar 2026   Edit Delete  │
  │  £25.00  One-off                                    3 Mar 2026   Edit Delete  │
  │                                                                              │
  │ Assumed                                                                      │
  │  £10.00 a month from a standing order, from Jan 2020, still running          │
  │  Assumed received for March 2026.               Mark not received            │
  │  Edit standing order  Delete standing order                                  │
  │                                                                              │
  │ [Record a payment for March 2026]                                            │
  └──────────────────────────────────────────────────────────────────────────────┘
```

- **Frame**: `--paper` ground, 1px `--rule` border, radius 6px, padding `--s-4`, margin-top `--s-2`.
  Heading `h3` at `.t-entry`: "`Name`, `Month Year`". Close is a `.btn-quiet` at the right; below
  640px it stays on the heading line.
- **Charge sentence** `.t-body`: one of
  "Charged £12.50 for March 2026." /
  "Not charged: the plan was paused that month." (and the other exclusion phrases, each prefixed
  "Not charged: ") /
  "Not charged: that month has not arrived yet." for a future month /
  For `unpriced`: "No price recorded for March 2026, so the charge is unknown." in `--red`.
  A `recorded` receipt in an excluded month keeps the exclusion sentence; the receipt list still
  shows below it.
- **Recorded**: `h4` "Recorded (N)" at `.t-small .soft` weight 600 (not all caps); or the single
  sentence "Nothing recorded for March 2026." when N = 0. Each receipt is the existing ledger entry:
  amount in recorded treatment, kind label and note on the secondary line, the original formatted
  date in the figure column, Edit and Delete link buttons. Two same-day receipts are two entries.
  Edit replaces the entry in place with `PaymentForm`; Cancel restores it and focuses that Edit.
  Delete swaps the entry's actions for the existing confirm strip (question names amount and
  participant); Keep focused.
- **Assumed**: `h4` "Assumed"; when a standing order covers the month: rate in assumed treatment
  with "a month from a standing order", then the window phrase ("from Jan 2020, still running" /
  "until Dec 2023"), then one status sentence: "Assumed received for March 2026." with the
  `.btn-link` "Mark not received"; or for `excepted`: "Marked as not received for March 2026." in
  `--red` with "Mark received". Sentence and toggle sit on one line with gap `--s-4`; below 640px
  the toggle drops onto its own line under the sentence. When the month is excluded by a wider condition, the sentence is the
  exclusion phrase and no toggle is offered (as today's tiles). Then "Edit standing order" and
  "Delete standing order" link buttons, which open the *same* `ScheduleForm` / confirm strip used in
  the Standing orders section, rendered inside the inspector, addressing the schedule by its id. When
  no schedule covers the month: "No standing order for this month." Two schedules covering one month
  cannot exist (overlap is refused server-side); if the data disagrees, list each as its own group.
- **Record a payment for `Month Year`**: `.btn-primary`. Opens `PaymentForm` inside the inspector
  below the groups, participant preset to this person, date preset to the first day of the month,
  or today when the month is the current one. Save closes the form, refreshes the ledger, shows the
  existing status sentence in the Participants heading, tints the changed cell and the block, and
  focuses the new entry's Edit button. Cancel focuses this button.
- **Owner-excluded, off-plan, future**: the inspector still opens, states the reason, lists any
  recorded receipts, and offers "Record a payment" (recording outside a range is allowed today).
- **Errors**: server refusals render in the existing section-alert component *inside the inspector*
  above the groups, verbatim; the Participants section alert is used for participant-level
  refusals only.
- After a mutation, the projection recomputes from the reloaded records. The inspector stays on the
  same person and month unless that person was deleted (then it closes, focus to the section heading)
  or the edited receipt moved to another month or year (the inspector stays where it is; the moved
  receipt's new cell receives the highlight tint, and if it is in another year the range sentence
  updates). Stale entries never remain: the inspector renders only from the current records.

## 7. Bounded payments section

- Heading "Payments received (N)" where N is the filtered count as today.
- Filter select unchanged, still server-side.
- Below it a `.btn-link` disclosure "Show payments" / "Hide payments" (`aria-expanded`). Closed on
  every load. Open: the first twelve entries newest first, the existing entry shape and actions, then
  a `.btn-link` "Show 12 more" until exhausted, then the sentence "That is every payment." in
  `.t-small .soft`. Client-side slicing over the already loaded list; no new request.
- Reduced motion and animation: the disclosure uses the existing panel motion.

## 8. Keyboard, focus and touch

- Tab order inside a person block: Edit, Archive, Delete, then **one** tab stop for the strip (roving
  `tabindex`: the selected cell if this person's inspector is open, else the current month if it is in
  the visible year, else January), then the inspector's controls when open, then the next block.
- Inside the strip: Left/Right move by month and wrap December to January and back; Up/Down move to the same month
  in the previous/next person block that has a strip; Home/End go to Jan/Dec. Enter or Space opens
  the inspector for the focused cell (and closes any other). Focus stays on the cell on open.
- Inspector: Escape anywhere inside closes it and returns focus to its cell. Close does the same.
  Escape inside an open `PaymentForm`/`ScheduleForm`/confirm strip closes only that inner panel
  (existing behaviour), focus to the control that opened it.
- Focus restoration rules, replacing matrix rows 17-20 and 36:
  - Delete participant completed: block gone → Participants heading.
  - Delete participant refused: that block's Delete button.
  - Close participant edit: that block's Edit button. Close add: Add participant button.
  - Delete receipt completed (inspector): the inspector heading; the inspector stays open.
  - Delete receipt refused: that entry's Delete button.
  - Close receipt edit: that entry's Edit button; if the entry left this month, the inspector
    heading.
  - Schedule edit/delete from the inspector: as for receipts, targeting the Assumed group's buttons;
    after a schedule delete the group reads "No standing order for this month." and focus goes to the
    inspector heading.
  - Year change: focus stays on the control pressed.
  - Inspector close: its cell; if the cell no longer exists (person deleted or filtered), the
    Participants heading.
- Touch: cells are at least 44×44 below 640px (six per row, 48px tall). Nothing depends on hover.
  The count `×N` and all marks are static; no tooltips.

## 9. States

- **Loading**: the existing static skeleton rows gain a calendar equivalent: per expected participant,
  one 17px bar (name), one 13px bar (cells) and a twelve-column row of 44px `--paper` blocks with a
  1px `--rule` border. No shimmer, not announced.
- **Empty**: "No participants yet." plus the primary Add participant, unchanged. The year control
  and legend are hidden when there are no participants.
- **Unavailable data**: `unpriced` cells and the red "N months without a price" fragment; empty
  membership ranges as the hatched strip plus the red sentence in §4. Neither ever reads "settled".
- **Failed save/refresh**: the inspector or section alert carries the server's words; the previous
  records stay on screen; nothing is optimistically drawn.
- **Success**: the shipped status strings, verbatim and unpunctuated, in the Participants heading:
  "Payment recorded" (record), "Changes saved" (payment or schedule edit), "Payment deleted",
  "Standing order deleted", "Marked not received", "Marked received", and the existing participant
  strings; 4000ms lifetime, plus the changed cell's and block's tint. No new status string.
- **Destructive confirmation**: the existing confirm strip, in place, focus on Keep.
- **Signed out**: unchanged; a 401 anywhere hands off to `onSignedOut`.
- **Reduced motion**: every duration resolves to 0ms through the existing tokens. The inspector
  opens and closes instantly. The changed-row tint still appears, because it carries information,
  and is removed by the existing timer without a fade.

## 10. Copy

Sentence case, plain verbs, no middle dots, no em dashes, no all-caps. Actions keep their name through
the flow: "Record a payment for March 2026" → status "Payment recorded". Empty and failure text says
what happened and what to do next. New strings introduced by this change are listed in §3, §4, §6,
§7 and §9; implementers add none.

## 11. Design-completeness checklist

| Question | Decision |
| --- | --- |
| Calendar or graph | Calendar (§1) |
| Twelve cells per person or per-person year grid | Twelve cells per person, shared year control (§1, §3) |
| Where full history lives | Payments section stays, collapsed, twelve at a time (§7); standing-order month tiles removed, months live in cells and inspector (§2) |
| Where the inspector sits | Under the person's strip, in place, one at a time (§6) |
| Most-owing-first | Kept; frozen while any inspector/panel is open; reapplied on close with tint (§4) |
| Section index | Unchanged (§2) |
| Seven states plus two receipt kinds in one cell | Marks table (§5); recorded and assumed side by side, never summed |
| Focus restoration | §8 list |
| Future-dated receipt discoverability | Year range extends to the latest record; range sentence links to it (§3) |
| First selected year and retention | Current year; `sessionStorage` per subscription (§3) |
| Owner row | None; the summary already carries the owner's share (§4) |
| Empty membership ranges | Hatched strip, red sentence, receipts still drawn (§4, §5) |
| Missing price | `?` mark, red fragment in year cells, red charge sentence (§4, §5, §6) |
| Loading, empty, error, success, confirm, reduced motion | §9 |
| Mobile | Six cells per row, 48px, controls 44px, sentence wraps (§3, §4, §8) |
| Motion | Only the inspector disclosure and the existing tint; year change instant (§3, §6) |
| New tokens | One, `--hatch`, light `#c5d0c0` / dark `#6f7b73` (§5) |
| Payment form date preset | First of the month, or today for the current month (§6) |
| Prices and skipped months sections | Unchanged (§2) |

## 12. Mockup

`mockup/compact-calendar.html` renders one Participants section with the tokens above: year
control, legend, two person blocks (open inspector, empty membership with the changed tint) and
every mark. Designer captures reviewed against this text: `mockup/desktop-light.png`,
`mockup/desktop-dark.png` (760px window), `mockup/phone-light.png`, `mockup/phone-dark.png` (390px
frame). It is the visual reference; where the mockup and this text disagree, this text wins and the
disagreement is a checkpointed question for the designer.

## 13. Designer rulings after plan finalization

Answers to the eight questions in `context/checkpoints/cmc-2.2-plan.md`, folded into the sections
above. The plan follows these, not its earlier assumptions where they differ.

1. Participants heading carries **no count**; the code's reason (the active count includes the
   organizer) still holds.
2. **No owner block.** Withdrawn from §4 and the mockup. Nothing is invented for a row that does not
   exist.
3. **Shipped status strings verbatim**, no trailing stop, no new strings (§9 lists the mapping).
4. `role="grid"` gets one `role="row"` wrapper (§4).
5. One ARIA row of twelve at every width; Left/Right wrap December to January (§4, §8).
6. One "`<year>` holds N payment(s)." fragment per later year, ascending (§3).
7. The Participants subtitle is an addition (§2).
8. "Recorded in `<year>`" is a receipt-date sum and includes a receipt dated later in that year.

## 14. Designer rulings on the plan review

Answers to the five design findings in `reviews/plan-review.md`, folded into §5 and §6.

1. §6 names the motion, not the component. The inspector is new markup that animates the same way,
   never moves focus on open, and exposes a focusable heading.
2. `×N` shares the disc's slot and is dropped when all three marks are present (§5).
3. The domain's `unpriced` charge reason is the single source of truth for the mark, the sentence
   and the year count; the projection carries no separate price-coverage flag (§5).
4. The year control and legend stay inside the Participants section. Compactness is measured on
   person blocks and rendered cells; one `option` per year in range is expected and bounded by
   years, not by payments. The plan's measurement wording is a plan fix.
5. `owner-member` is removed from the cell precedence list with a clause saying why (§5).

## 15. Designer rulings during Phase 3

1. Month names: the inspector heading, the inspector sentences and every cell's accessible name use
   the long month form ("March 2026"), because a screen reader reads "Mar" as a word. This needs one
   additional formatter beside the existing short one, in the same formatting module, in the plan's
   locale. Cell labels, the legend, the range sentence, schedule windows and every existing string
   keep the short form.
2. "Marked as not received" belongs to the assumed part of the accessible name and to the Assumed
   group of the inspector, never to the charge sentence; the domain never returns that reason for a
   charge.

## 16. Designer rulings during Phase 4

1. Recorded group at zero: the `h4` reads "Recorded" with no count, and the sentence "Nothing
   recorded for March 2026." sits beneath it, so the group structure never shifts. "Recorded (0)" is
   not shown.
2. Assumed group for a month excluded by a wider condition: one sentence in sentence case,
   "Not assumed: the plan was paused that month." (the exclusion phrase after "Not assumed: "),
   mirroring the charge sentence's "Not charged: " form. No toggle is offered.

## 17. Designer rulings on the implementation review

1. Year buttons: the visible content is the glyph (`‹` / `›`) only; "Previous year" / "Next year"
   are the `aria-label`. §3's phrase "visible text" is withdrawn.
2. Bounded payments: the link reads "Show N more" where N is the smaller of 12 and the number of
   entries not yet shown, so the label never promises more than it reveals. §7's fixed "Show 12
   more" is amended to this rule; the shipped "Show N more" stands.
3. The record action reads "Record a payment for March 2026" in the long month form, like the
   inspector heading and sentences (§15). §6's ASCII sketch and copy are read in the long form.
4. The year `select` is labelled "Year" through a visually hidden label; it has no visible label
   because the selected year is its own visible text.
5. The strip (`role="grid"`) accessible name is "`<Name>`, `<year>` month by month", for example
   "Alice, 2026 month by month", so a screen-reader user hears which year the twelve cells belong to.

## 18. Designer rulings from the first visual acceptance pass

Findings from the real captures in `evidence/screenshots/s09/`, each a required correction.

1. **Future-year fragments cover only years after the current year.** §3's "a year later than the
   selected one" is amended: the range sentence appends one "`<year>` holds N payment(s)." fragment
   per year that is *after the current month's year* in the plan's time zone and holds a payment,
   ascending, each separated from the previous sentence by a single space. Past years are reached
   with the year control and need no fragment. From 2019 in the fixture the sentence therefore
   reads "Showing Jan to Dec 2019. 2027 holds 1 payment."
2. **A participant with no active range never reads "settled".** When the participant has no
   membership range at all and the balance is zero, the balance slot shows "no membership range"
   in `--red` at `.t-entry` weight 600 in place of the balance word. With a non-zero balance the
   usual word-plus-figure stands (a credit is a real credit). The red sentence under the lifetime
   cells stays.
3. **Lifetime completeness sentence.** When any elapsed month the participant was charged for
   (plan start to current month, after break and membership exclusions) is `unpriced`, one
   `.t-small` `--red` sentence follows the lifetime cells: "N month(s) have no price, so owed and
   the balance are incomplete." The selected-year fragment in the year cells stays as well. The
   count comes from the domain's charge reason, not from a zero amount.
4. **`×N` sits directly after the recorded disc**, before the assumed ring: "● ×2 ◌", as §5 states.
