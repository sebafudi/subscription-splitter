# Design acceptance: compact member calendars

Designer: Fable 5.1. Compared against `design-spec.md` (§§1-17) using the real captures the Phase 5
verifier took from the local build with the synthetic six-person, eight-year ledger:
`evidence/screenshots/s09/long-1280-light.png`, `long-1280-dark.png`, `long-390-light.png`,
`long-390-dark.png`, `inspector-two-same-day-receipts-light.png`, `unpriced-2019-light.png`,
`empty-membership-1280-light.png`, plus the verifier's keyboard, focus and mutation observations in
`evidence/runs/s09-browser-verification.md`. Screenshots verify appearance; keyboard and mutation
behaviour are taken from the verifier's observed output, not from pictures.

## Pass 1: corrections required

Verdict: **not yet accepted**. Four corrections, recorded as rulings in `design-spec.md` §18.

| # | Observed | Spec | Correction |
| --- | --- | --- | --- |
| A1 | From 2019 the range sentence lists eight later years with fragments run together | §3 intent: future-dated receipts stay discoverable | Fragments only for years after the current year, space-separated (§18.1) |
| A2 | A participant with no membership range and nothing paid reads "settled" | `change.md`: missing membership data must not read as settled | "no membership range" in red replaces the balance word at zero (§18.2) |
| A3 | Lifetime owed and balance have no completeness signal when early months are unpriced | `change.md`: missing prices must not read as settled | Lifetime red sentence (§18.3) |
| A4 | Ada, March: marks read "● ◌ ×2" | §5: `×N` after the disc | Reorder (§18.4) |

## What matches the specification

- Strip: twelve cells desktop, six by two at 390px, 44px and 48px heights, `--paper` ground, 1px
  `--rule` border, current month underlined, future months dashed and faint, hatch for months off
  the plan, inverted selected cell, green focus ring on a focused cell.
- Marks: disc, dashed ring, struck ring, pause bars, red `?`; legible in light and dark; legend
  matches the cells; the hatched legend swatch reads.
- Person block: name, tags, word-plus-figure balance, lifetime cells, year cells with the red
  "N months without a price" fragment, action row, then the strip; the empty-membership red
  sentence and hatched strip for Gil.
- Inspector: opens under the strip in the paper panel; heading "Ada, March 2026"; charge sentence;
  "Recorded (2)" with two same-day entries carrying amount, kind, note and date, Edit and Delete;
  "Assumed" with the dotted rate, window, status sentence and toggle, schedule actions; "Record a
  payment for March 2026". Unpriced month: red charge sentence, "Recorded" heading with "Nothing
  recorded", "No standing order for this month."
- Year control: quiet buttons, native select, range sentence; legend below.
- Payments received collapsed with count and filter; Standing orders without tiles, rows intact
  with the new subtitle sentence.
- Dark theme: every token resolves; hatch visible; red and green legible.
- 390px: stacked head, wrapped cells rows, six-column strip, horizontal section index.

## Not judged from captures

Keyboard traversal, focus restoration, order freeze, `sessionStorage` retention, reduced motion and
the failed-refresh alert are taken from the verifier's observed results in
`evidence/runs/s09-browser-verification.md`; Safari, Firefox and mobile browsers are unverified
there and remain so here.

## Pass 2: corrections verified

Captures retaken at `05ff614` (`evidence/runs/s09-browser-verification.md`, "Re-run at 05ff614").

| # | Capture | Result |
| --- | --- | --- |
| A1 | `range-sentence-2019.png` | "Showing Jan to Dec 2019. 2027 holds 1 payment." and nothing else. Matches §18.1 |
| A2 | `empty-membership-1280-light.png` | Gil's balance slot reads "no membership range" in red at entry weight; the red sentence and hatched strip stay. Matches §18.2 |
| A3 | `marks-order-ada-march.png`, `empty-membership-1280-light.png` | "2 months have no price, so owed and the balance are incomplete." under the lifetime cells of every participant the fixture leaves unpriced. Matches §18.3; the repetition across all six is a property of the synthetic ledger, not of the design |
| A4 | `marks-order-ada-march.png` | Ada, March reads disc, "×2", dashed ring. Matches §18.4 |

Also confirmed against the same captures: the inverted selected cell with `--on-ink` marks, the
struck ring for July, the pause bars for May, the current-month underline under "Sept", dashed
future cells, the legend, the year cells row with recorded and assumed never combined.

Behaviour verified by the Phase 5 verifier at `05ff614`, taken from its recorded output: V3 a delete
tints the emptied cell and block; V4 a receipt edited out of the inspected month returns focus to
the inspector heading; "Show 12 more" then "Show 9 more" then "That is every payment." on a
33-receipt fixture; compactness identity (72 cells, 1228px person blocks, 1449px Participants) for
one year versus eight years of history, and the pre-change build's 7158px page against 3028px now.

Appearance and interaction are **accepted**. Final acceptance is held on one behavioural defect the
verifier found outside the captures, V5: a failed reload after a successful write emptied the whole
screen where §9 requires the previous records to stay. Its fix and browser evidence are recorded in
Pass 3 below.

## Pass 3

Pending: V5 fix evidence.
