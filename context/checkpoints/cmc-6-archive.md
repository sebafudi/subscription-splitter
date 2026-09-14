# Checkpoint: cmc-6-archive

- **Task:** `10x-archive` for change `compact-member-calendar` (roadmap S-09, parent goal C06)
- **Model:** Sonnet
- **Status:** complete; the change is archived, roadmap S-09 is `done`, the ledger in `AGENTS.md` and
  `README.md` is current, and every commit is pushed

## Pre-archive check

Every precondition verified in the record before anything moved.

| Gate | Result |
|---|---|
| Working tree | clean; HEAD `bea4f20` includes the certification-capture refresh |
| `change.md` status | `impl_reviewed` |
| `reviews/plan-review.md` | REVISE resolved; final verdict SOUND |
| `reviews/impl-review.md` | APPROVED, extended twice to the release candidate `650a14d` |
| `reviews/design-acceptance.md` | Accepted at `650a14d` (Pass 3); Pass 4 inspects the live release |
| `plan.md` Progress | every row through 6.3 ticked; only 6.4 open |
| Release | `64eb0d3` on Cloudflare version `a80d2e12-d77e-4b88-b318-aa992eb60d50`, rollback
  `751a8bfd-e62a-4c9a-beb2-1953eb6a7656`, CI run `34881238556`, gates unit 26/359 integration 13/131,
  live smoke 46/0 |
| Captures | seven of ten certification captures retaken at `bea4f20`, checkpoint
  `context/checkpoints/release-6-captures.md`, manifest 1,340,978 bytes (780,543 required / 560,435
  optional) |

## What was done

**Archive.** `git mv context/changes/compact-member-calendar context/archive/compact-member-calendar`
(`f0f8e9e`). All fifteen files moved as renames: ten documents and mockups at the root/`mockup/`, plus
three under `reviews/`.

`change.md` takes `status: archived` and a `## Closing note` naming release 6 and its Cloudflare
version, the rollback reference, the CI run, the gates, the live smoke result, the retaken-capture
manifest, and the honest limits: Chrome-only browser verification throughout, Safari/Firefox/mobile/
real-touch unverified, the empty-`activeRanges` branch unreachable through the product's own routes,
and the `GOALS.md` F01 audit still standing at release 4 against release 5 and release 6. No date
field is added, per this project's date-free archive convention.

**Links.** The self-references to `context/changes/compact-member-calendar` inside the moved folder
now point at the archive path, across `frame.md` (3), `research.md` (2), `reviews/impl-review.md` (1)
and `reviews/plan-review.md` (1). `orchestrator-prompt.md` keeps its own text, per the standing
exception recorded in the S-08 precedent (`context/checkpoints/m06-archive.md`).

**Progress.** Row 6.4 ticked with the archive commit's own sha, in the two-commit pattern this
project's own history uses (`f643b91`, `ec21ded`, and others): the content commit first (`f0f8e9e`),
then a tiny follow-up commit recording that sha against the row (`b58c939`).

**Roadmap.** S-09 is `done` in the At a glance table and the item body, whose Change ID line and
Source ref now point at the archive path; the `## Done` section takes one entry naming the release,
the Cloudflare version and the retaken captures, with a lesson generalised from the Phase 5 V1
finding: a whole-page percentage bound measures the wrong thing when only part of the page is meant
to stay flat, because the first compactness pass compared total `scrollHeight` and missed that a
legitimately taller standing-orders section explained the gap, not the calendar; the fix was
requiring exact identity on the bounded section and only a stated, attributable bound on the page
around it (`3b57982`).

**Ledger.** `AGENTS.md` now reads `F-01` through `S-09` archived, with S-09's contribution named and
"No roadmap item is open" restored. `README.md`'s Stack paragraph drops the "only its archive step
remains" clause, since it has (`73a5ea0`).

**Stale paths.** Every reference to `context/changes/compact-member-calendar/` outside the moved
folder and outside historical checkpoints (`cmc-*.md`, `status-sync-12.md` through `-14.md`, which
keep the path that was current when they were written, matching the S-08 precedent) is rewritten to
the archive path: `context/foundation/test-plan.md`, `evidence/index.md`, `evidence/work-log.md` and
`context/STATUS.md` (`73a5ea0`).

**Status and evidence.** `context/STATUS.md`'s active-change line now reads no active change, its
S-09 trail records Phase 6.4 and the archive shas, and its Deployment section and Next-executable-
action item 13 are closed out. `evidence/index.md`'s C06 row and `evidence/work-log.md` gain a closing
entry each, both complete rather than partial.

**Gate.** `git status --porcelain` is empty after each commit; nothing under `src/`, `tests/` or
`migrations/` was touched by this task.

## Deliberately left alone

The workspace `GOALS.md` update (ticking C06, the "All six C goals are complete" sentence, and the
B12/B13 wording naming release 6 as the final release for the package) is outside Git and is recorded
separately, not in this checkpoint's commit list. The final handoff is
`context/archive/compact-member-calendar/handoff.md`.

## Commits

| SHA | Subject |
|---|---|
| `f0f8e9e` | chore(archive): close compact-member-calendar |
| `b58c939` | docs(plan): tick 6.4 with the archive sha |
| `3b57982` | docs(roadmap): mark s-09 done |
| `73a5ea0` | docs: record the ledger through s-09 archived |
