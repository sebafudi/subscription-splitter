# Release 5: refreshing the certification captures

`docs/SUBMISSION-PACKAGE.md` section 10 lists ten certification captures. `evidence/runs/release-5.md`
names five of them as showing a screen that change `S-08 subscription-management-and-date-inputs`
alters. This pass retook those five against release 5 and left the other five alone, because the
screens they show are unchanged.

- **Release SHA**: `91ce0daa469df960097398ce756730f97845e647` (`91ce0da`)
- **Cloudflare version**: `751a8bfd-e62a-4c9a-beb2-1953eb6a7656`, superseding release 4's
  `1d0f71c1-6832-4bc1-aace-5feef621e715`
- **Live URL**: https://subscription-splitter.sebastianfudalej.workers.dev

## The served bundle is release 5's

Read from inside the page that was captured, rather than from a separate request made elsewhere:

```
GET /  (cache: no-store)          200
assets referenced by index.html   /assets/index-D-QEf8bX.js, /assets/index-CtqqFhDM.css
```

Those are the two content-addressed names release 5's own clean-clone build emitted and the deploy
uploaded, both recorded in `evidence/runs/release-5.md`. Release 4's bundle carries neither. The four
browser captures below were taken from the page this check ran in, so they are captures of this
release rather than of a cached predecessor.

## Method, unchanged from release 4

Nine of the ten captures are browser captures from the live URL at 948 by 1033 with the address bar
visible, in the dark palette the machine's appearance selects, each a capture of a single window by
its window id so nothing else on the machine is in frame. The tenth,
`release-05-tests-passing.png`, is a Terminal window capture from a throwaway clone checked out at the
release SHA. Each window was moved to the floating layout before being sized, as releases 2 and 4
recorded. Scroll positions were composed to sit where the release 4 files sit, so each manifest
description still holds.

The owner account signed in through the real form. No password, token or session cookie appears in any
capture; the two synthetic account addresses are visible, which is deliberate and unchanged since
release 1.

## The five refreshed captures

| File | Dimensions | Bytes | What it shows |
|---|---|---|---|
| `release-03-input-record-payment.png` | 948 by 1033 | 115,950 | The payment panel open under its heading, fields filled before submitting. "Date received" is now a native browser date control showing `08/09/2026` with its calendar affordance, and the old "Date as YYYY-MM-DD" hint is gone |
| `release-04-output-balances.png` | 948 by 1033 | 128,935 | The detail header with the new action row, "Edit subscription" and "Delete subscription", beneath the subtitle line, above the leading figure in red, the four ledger cards, the net-cost sentence and both participants |
| `release-05-tests-passing.png` | 1336 by 1225 | 121,886 | A real Terminal window in the clean clone at `91ce0da`: the full SHA, an empty `git status --porcelain`, a clean typecheck across three projects, unit 22 files / 262 tests, integration 13 files / 131 tests, and the SHA echoed again at the end |
| `release-06-members-and-prices.png` | 948 by 1033 | 103,614 | Casey R.'s open edit panel with both active-month fields now native month controls, reading "March 2026" and "June 2026" where release 4 showed `2026-03` and `2026-06` as plain text under a format hint, above the price history with its change |
| `release-08-error-before-start-month.png` | 948 by 1033 | 113,583 | The refused payment: a native date control reading `15/01/2026` taking `aria-invalid`, the sentence "Date received must not precede the subscription start month" beneath it, and both stored payments untouched below |

## The five left as they were

`release-01-login.png`, `release-02-home.png`, `release-07-recurring-assumed-received.png`,
`release-09-reviewer-sees-nothing.png` and `release-10-narrow-phone.png`. Each shows a screen
`evidence/runs/release-5.md` reads off the change's own client diff as unaltered, so retaking them
would produce a different file that says the same thing. They stand as taken against release 4 and the
manifest now says so per row rather than claiming a single retake date for the set.

`release-05-tests-passing.png` came back at 1336 by 1225 where release 4's file was 1340 by 1230. The
window is the same 188 by 84 Terminal window; the four and five pixels are the capture's own border
allowance, not a different framing. The manifest records the measured figure.

## Nothing live was changed

The captures were composed by opening forms and cancelling them. One payment was submitted
deliberately and refused, which stores nothing, and that refusal is the capture in slot 12. Nothing was
saved, nothing was deleted, and the owner's subscription list held the same two records with the same
names before and after: "First deployment artefact (not the demo plan)" and "Family music plan". The
demo plan's figures on screen are the release 1 baseline, unchanged: owed 39,99 zł, 60,00 zł per person,
210,00 zł collected, two active participants, Blake owing and Casey R. ahead.

## Manifest

`docs/SUBMISSION-PACKAGE.md` section 10 and the matching rows in `docs/SUBMISSION-CHECK.md` were
updated from this pass: the release identity, the CI run id, the two gate counts, the per-row byte
sizes and the totals. The ten files now weigh 990,732 bytes, 486,856 in the five required slots and
503,876 in the five optional ones. Nothing was uploaded, attached or submitted, and the owner-decision
placeholders and the upload-confirmation line were left exactly as they were.
