# Release 6: refreshing the certification captures

`docs/SUBMISSION-PACKAGE.md` section 10 lists ten certification captures. `evidence/runs/release-6.md`
names six of them as showing a screen that change `S-09 compact-member-calendar` alters. This pass
retook **seven** and left three alone. The seventh is `release-08-error-before-start-month.png`, and
the reason it was added to the list is recorded below rather than assumed.

- **Release SHA**: `64eb0d3b096eef53a6d264ee483e1d9c7e1dc17a` (`64eb0d3`)
- **Cloudflare version**: `a80d2e12-d77e-4b88-b318-aa992eb60d50`, superseding release 5's
  `751a8bfd-e62a-4c9a-beb2-1953eb6a7656`
- **Hosted CI**: run `34881238556`, workflow `CI`, conclusion success
- **Live URL**: https://subscription-splitter.sebastianfudalej.workers.dev

## The served bundle is release 6's

Read from inside the page that was captured, not from a separate request made elsewhere:

```
document.querySelectorAll('script[src], link[rel=stylesheet]')
  /assets/index-DlWpQE-s.js
  /assets/index-ByHeNjZo.css

performance.getEntriesByType('resource'), filtered to /assets/
  /assets/index-DlWpQE-s.js
  /assets/index-ByHeNjZo.css
  four IBM Plex Sans woff2 files
```

Those are the two content-addressed names release 6's own clean-clone build emitted and the deploy
uploaded, both recorded in `evidence/runs/release-6.md`. Release 5's bundle carries neither name. The
check was run twice in the same page session, once at sign-in and once after the last browser capture,
so every browser capture below is a capture of this release rather than of a cached predecessor.

## Method, unchanged from releases 4 and 5

Nine of the ten captures are browser captures from the live URL at 948 by 1033 with the address bar
visible, in the dark palette the machine's appearance selects, each a capture of a single window by its
window id so nothing else on the machine is in frame. The window was moved to the floating layout
before being sized, as releases 2, 4 and 5 recorded. The tenth,
`release-05-tests-passing.png`, is a Terminal window capture from a throwaway clone checked out at the
release SHA; that window came back at 1336 by 1225, the same figure release 5 measured.

The owner account signed in through the real form. No password, token or session cookie appears in any
capture; the synthetic owner address is visible, which is deliberate and unchanged since release 1.

One method note that is new to this release. Every affected slot except the tests capture is the
subscription detail screen, and its tallest section has become its most compact, so release 5's scroll
offsets no longer frame what they framed. `evidence/runs/release-6.md` says whoever retakes them should
compose each frame rather than replay an offset. Each frame below was composed against measured element
positions in the live DOM, not replayed.

## The subscription in frame

Release 5's captures used the owner's own "Family music plan", which has two participants and a history
that starts in March 2026. That subscription cannot show what this change exists for: a twelve-month
calendar for one selected year, across a year range wide enough for the year control to be usable.

This pass therefore created one synthetic subscription under the owner account, captured against it,
and deleted it. "Shared streaming plan", first month `2024-01`, six participants and a three-year
history, all of it entered through the application's own routes:

| Record | Detail |
|---|---|
| Participants | Blake and Casey R. from `2024-01`, Devon from `2024-06`, Emery from `2025-01`, Frankie from `2024-01` until `2025-08`, Gale from `2026-02` |
| Prices | 80,00 zł from `2024-01`, 100,00 zł from `2025-01`, 120,00 zł from `2026-03` |
| Skipped months | `2025-07` and `2026-05` |
| Standing orders | Casey R., 20,00 zł a month from `2025-01`, still running; Devon, 20,00 zł a month `2026-01` to `2026-06` |
| Payments | ten receipts across 2024, 2025 and 2026, two of them in Blake's `2026-01` so one month cell has to summarise a count rather than list rows |

Every completeness state the calendar draws is reachable in one screen from those records: recorded,
assumed from a standing order, paused, unpriced, not yet arrived, and outside a participant's active
range. The year control has three years to move between, so Previous year and Next year are both live
rather than disabled as they were in the release 6 live smoke.

## The seven refreshed captures

| File | Dimensions | Bytes | What it shows |
|---|---|---|---|
| `release-03-input-record-payment.png` | 948 by 1033 | 134,345 | The payment panel open under the Payments received heading, fields filled before submitting, with the native date control reading `09/09/2026`. The bounded disclosure is visible beneath the panel as the `Show payments` control, closed, where release 5 had the whole list rendered |
| `release-04-output-balances.png` | 948 by 1033 | 152,390 | The detail header with its action row, the leading figure, the four ledger cards and the net-cost sentence, then the Participants section as a calendar: the year control on 2026 with both neighbours live, the six-state legend, and Devon's twelve-cell strip under a figure row that now carries Recorded, Assumed and Charged for the selected year |
| `release-05-tests-passing.png` | 1336 by 1225 | 373,723 | A real Terminal window in the clean clone at `64eb0d3`: the full SHA, an empty `git status --porcelain`, a clean typecheck across three projects, unit 26 files / 359 tests, integration 13 files / 131 tests, and the SHA echoed again at the end |
| `release-06-members-and-prices.png` | 948 by 1033 | 118,590 | Casey R.'s complete person block, figures, action row and twelve-cell strip, with Gale's edit panel open directly beneath it. The panel opens from the calendar's own action row now rather than from a list row, and both month fields are native month controls. Price history with its three entries sits below |
| `release-07-recurring-assumed-received.png` | 948 by 1033 | 134,536 | Standing orders with both schedule rows, their running totals and their end conditions, and no per-month tile list at all. The section subtitle now ends "Each month's assumed receipt shows in the participant's calendar." Payments received sits above it, closed behind `Show payments` |
| `release-08-error-before-start-month.png` | 948 by 1033 | 132,045 | The refused payment: a native date control reading `15/12/2023` taking `aria-invalid`, the sentence "Date received must not precede the subscription start month" beneath it, and the payments count unchanged at ten |
| `release-10-narrow-phone.png` | 948 by 1033 | 114,760 | The detail screen at 390 CSS pixels: Blake's strip wrapped to two rows of six, no horizontal overflow, and the `styczeń 2026` inspector open beneath it with both receipts itemised, each with its own Edit and Delete, an Assumed group reading "No standing order for this month." and the month's own Record a payment action |

## The three left as they were

`release-01-login.png`, `release-02-home.png` and `release-09-reviewer-sees-nothing.png`. Each shows a
screen `evidence/runs/release-6.md` reads off the change's own client diff as unaltered: the sign-in
screen, the subscription list and the reviewer's empty Home. No client file this change touches renders
any of the three. They stand as taken against release 4 and the manifest says so per row.

## Why `release-08` was retaken when release 6's record called it unaffected

`evidence/runs/release-6.md` lists six affected slots and rules `release-08-error-before-start-month.png`
unaffected, on the ground that the refusal sentence, the red field rule and the payment panel's own
fields are unchanged and only the sections behind it moved. The panel is indeed unchanged. The frame is
not: release 5's file shows the two stored payments listed beneath the panel, and
`src/client/components/PaymentList.tsx` now renders that list inside a disclosure that is closed on
every load, behind a `Show payments` control. Half of what the old file had in frame no longer exists
on the screen it claims to show, so the file was retaken. This is a correction to that record's slot
list, not a defect in the release.

## Nothing pre-existing was changed

The captures were composed by opening forms and cancelling them. One payment was submitted deliberately
and refused, which stores nothing, and that refusal is the capture in slot 12. The only write this pass
made live was the synthetic subscription it created for the purpose, and the only delete was that same
subscription.

- `DELETE` on the synthetic subscription answered 204 with an empty body, and a `GET` on it afterwards
  answered 404.
- The **owner's** list held **2** rows before and **2** rows after, with an identical set of ids and
  identical names: "First deployment artefact (not the demo plan)" and "Family music plan".
- The **reviewer's** list held **0** rows before and **0** rows after, with an identical, empty set of
  ids. The reviewer account was read only; nothing was written under it.
- The browser session was signed out in the browser, and the scripted owner session was signed out
  afterwards; the signed-out cookie answers 401 on replay.

No pre-existing subscription, participant, price, payment, standing order or account was modified or
removed at any point. The demo plan's own figures were read only as a count, an id set and a name set,
not field by field; release 4 holds the last field-by-field baseline.

## Manifest

`docs/SUBMISSION-PACKAGE.md` section 10 and the matching rows in `docs/SUBMISSION-CHECK.md` were updated
from this pass: the release identity, the Cloudflare version, the CI run id, the two gate counts, the
per-row byte sizes and the totals. The ten files now weigh **1,340,978 bytes**, 780,543 in the five
required slots and 560,435 in the five optional ones. Both documents live in the course workspace and
are not under version control. Nothing was uploaded, attached or submitted, and the owner-decision
placeholders and the upload-confirmation line were left exactly as they were.

The statement that the `GOALS.md` F01 final audit was last run at release 4 stands in both documents and
was extended rather than replaced: the audit has not been re-run against release 5 or against release 6.
