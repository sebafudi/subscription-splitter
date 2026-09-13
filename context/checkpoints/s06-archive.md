# Checkpoint: s06-archive

- **Task**: `s06-archive` (S-06, goals V06 archive part, W07, B09)
- **Model**: Opus
- **Status**: complete; `visual-redesign` archived, roadmap S-06 `done`, work log appended, pushed

## Pre-archive check

Every item verified in the record before anything moved.

| Gate | Result |
|---|---|
| `change.md` status | `impl_reviewed` |
| `plan.md` Progress | zero `- [ ]` rows remaining across all 101 |
| `reviews/impl-review.md` `## Re-verification` | APPROVED, all six dimensions PASS |
| Observation R1 | closed at `6b30d5b` and `a5b5f18`, four captures retaken |
| `reviews/design-acceptance.md` | accepted without conditions, plus the F1 addendum saying acceptance stands |
| Release | `c842f64`, Cloudflare version `84a95549-cd34-4065-a202-cf5f1385e9f9` |

## What was done

**Archive.** `git mv context/changes/visual-redesign context/archive/visual-redesign`. All 66 files
moved as renames: six documents at the root, 57 files under `reference/` (the eleven pre-redesign
captures, the mockup HTML and its three PNGs, and the phase captures) and three under `reviews/`.
`design-spec.md` is byte-identical, so the archived specification is what the designer accepted; the
S-07 login amendment stays in `context/changes/google-sign-in/design-delta.md`.

`change.md` takes `status: archived` and a `## Closing note` naming the release SHA, the Cloudflare
version, the R1 closure and the location of the login amendment. Date fields stay omitted, per the
project's date-free convention.

**Links.** 21 self-references to `context/changes/visual-redesign` inside the moved folder now point
at the archive path, across `frame.md` (2), `plan-brief.md` (4), `plan.md` (7), `research.md` (1),
`reviews/impl-review.md` (6) and `reviews/plan-review.md` (1).

**Roadmap.** S-06 is `done` in the At a glance row and in the item body, whose Change ID line gains
`(context/archive/visual-redesign/)` in the style S-04 already uses. The `## Done` section takes one
entry with the release named and a lesson generalised from finding F1: a scroll-spy that names its
own threshold drifts from the anchor it is meant to follow, because the section index tracked its
current item at 100px while a click scrolled the heading to 116px; reading the heading's own
`scroll-margin-top` and watching the line one pixel below it is the only offset that cannot disagree
with where a click lands.

## Foundation alignment: no edits needed

Checked rather than assumed. `README.md` covers stack, setup, run, test, database, deploy and layout;
it never describes a screen, references no screenshot and pins no release SHA, and its live URL is
still correct. `context/foundation/prd.md` is behaviour only, its two screen mentions being FR-003's
redirect and the Access Control restatement of it. `context/foundation/test-plan.md` references
change folders only in its §3 phase table, which names four archived slices and never named this one.
Nothing in the three documents describes the pre-redesign interface or a path that moved, so nothing
was edited and the third commit in the plan was not made.

## Deliberately left as written

Historical records that cite `context/changes/visual-redesign/` keep the path that was current when
they were written, matching how the four earlier archives were closed (stale references to
`context/changes/verification-and-release/` and the rest still stand in the work log, the evidence
index and the earlier archived folders). That covers `context/STATUS.md`, `evidence/index.md`,
`evidence/work-log.md`, `evidence/runs/`, the `s06-*` and `g01-*` checkpoints,
`context/foundation/visual-redesign-brief.md` and the in-flight `context/changes/google-sign-in/`
documents, several of which are out of this task's scope in any case.

One staleness is flagged and not fixed, being outside this pass: `AGENTS.md` still opens with "What
remains is the release itself, tracked as roadmap S-04", which two shipped releases have overtaken.

## Commits

- `7b05886` chore(archive): close visual-redesign
- `8a639f3` docs(roadmap): mark s-06 done
- `2882b57` docs(work-log): record the s-06 archive
- this checkpoint

## Changed paths

- `context/changes/visual-redesign/` → `context/archive/visual-redesign/` (66 files)
- `context/foundation/roadmap.md`
- `evidence/work-log.md`
- `context/checkpoints/s06-archive.md`

Nothing under `src/`, `tests/`, `context/STATUS.md`, `evidence/index.md`, the workspace `GOALS.md`,
`docs/SUBMISSION-*.md` or `context/changes/google-sign-in/` was touched. Concurrent commits from
other agents in this shared working tree were left alone and staging was by explicit path throughout.

## Next action

None for S-06. The remaining open item in the roadmap is S-07 `google-sign-in`.
