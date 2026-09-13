# Checkpoint: m06-archive

- **Task:** `10x-archive` for change `subscription-management-and-date-inputs` (roadmap S-08, parent
  goal M06)
- **Model:** Opus
- **Status:** complete; the change is archived, roadmap S-08 is `done`, the ledger in `AGENTS.md` and
  `README.md` is current, and the four commits are pushed

## Pre-archive check

Every precondition verified in the record before anything moved.

| Gate | Result |
|---|---|
| `change.md` status | `implemented` |
| `reviews/plan-review.md` | REVISE resolved; final verdict SOUND, approved for implementation |
| `reviews/phase1-server-review.md` | APPROVED, with a `## Resolution` table closing every finding |
| `reviews/impl-review.md` | APPROVED with two comment-only corrections, with a `## Resolution` table; O6 accepted as is |
| `reviews/design-acceptance.md` | Accepted without required corrections, over 33 captures |
| `plan.md` Progress | 57 of 59 ticked; only 2.8 and the `no-owner` half of 4.17 open, both with reasons recorded in the plan and in `evidence/runs/s08-browser-verification.md` |
| Release | `91ce0da` on Cloudflare version `751a8bfd-e62a-4c9a-beb2-1953eb6a7656`, recorded in `evidence/runs/release-5.md` |
| Captures | five certification captures retaken at `cfa5e12`, recorded in `evidence/runs/release-5-captures.md` |

## What was done

**Archive.** `git mv context/changes/subscription-management-and-date-inputs
context/archive/subscription-management-and-date-inputs`. All ten files moved as renames: six
documents at the root and four under `reviews/`.

`change.md` takes `status: archived` and a `## Closing note` naming release 5 and its Cloudflare
version, the two Progress rows that stay open by design and why, the unverified browsers (Firefox,
Edge, Chrome Android, Firefox Android) and the four unverified Safari readings. Date fields stay
omitted, per the project's date-free convention.

**Links.** The 16 self-references to `context/changes/subscription-management-and-date-inputs` inside
the moved folder now point at the archive path, across `frame.md` (2), `plan-brief.md` (5),
`plan.md` (5), `reviews/impl-review.md` (3) and `reviews/plan-review.md` (1).

**Roadmap.** S-08 is `done` in the item body, whose Change ID line gains the archive path in the
style S-04, S-06 and S-07 use. There is no `## At a glance` row for S-07 or S-08, so no table cell
changed, matching how S-07 was closed at `5ade84a`. The `## Done` section takes one entry naming the
release, the Cloudflare version and the retaken captures, with a lesson generalised from impl-review
finding F1: a comment describing a rule that holds across files other than its own goes stale in
silence, because the change that falsifies it need never open the file the comment sits in.

**Ledger.** `AGENTS.md` now reads `F-01` through `S-08` archived, with S-08's contribution named and
"No roadmap item is open" restored in place of the active-change sentence phase 6 added. The
calendar-control convention paragraph under Style is untouched, because it describes current
behaviour. `README.md` gains one clause on the Stack paragraph for subscription edit and delete and
the native calendar controls, in the shape `7ad3950` used for Google sign-in.

**Gate.** `npm run typecheck` passes across all three projects. Nothing under `src/`, `tests/` or
`migrations/` was touched.

## Deliberately left alone

`context/STATUS.md`, `GOALS.md`, `evidence/index.md` and `evidence/work-log.md` were out of scope and
had concurrent edits from other agents in the working tree; every commit here staged explicit paths
only. Historical records that cite `context/changes/subscription-management-and-date-inputs/` keep the
path that was current when they were written, matching how the six earlier archives were closed. No
other archived change was edited, and nothing was uploaded to the course.

## Commits

| SHA | Subject |
|---|---|
| `9f4dc9c` | chore(archive): close subscription-management-and-date-inputs |
| `52b06b7` | docs(roadmap): mark s-08 done |
| `d300e10` | docs: record the ledger through s-08 archived |
