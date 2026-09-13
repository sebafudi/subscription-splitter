---
change_id: ai-review-pipeline
title: AI code review pipeline for pull requests
status: impl_reviewed
updated: 2026-09-13
---

## Notes

Roadmap item S-05, milestone anchor MS-01. Route fixed by decision D-003: an independent reviewer
package at `tools/reviewer/`, five project-specific review criteria with a structured verdict schema,
a promptfoo comparison of two or three OpenRouter models on fixed diff fixtures, and a GitHub Actions
workflow that posts the review as a pull request comment and applies a verdict label.

Course anchors: module 5 lesson 2 (team agent on an SDK) and lesson 3 (review criteria, forced
verdict shape, model evaluation, CI wiring). The Champion evidence categories are the pipeline view
with at least one job, the job logs, and the model's review comment on a real pull request.

The credential arrived and Phase 5 ran on 2026-09-13. `OPENROUTER_API_KEY` is provisioned locally
and as a repository secret, the two-model comparison ran live, `z-ai/glm-5.3-flash` was selected on
the numbers, and the pipeline reviewed a real pull request in hosted CI. Nothing here is blocked any
more.

Artifacts in this folder: `opportunity-map.md` (build-versus-buy decision), `requirements.md` (review
contract), `research.md` (library and platform evidence), `plan.md` and `plan-brief.md`.

The implementation review (`reviews/impl-review.md`, phases 1 to 4) is resolved: all five required
fixes and all four observations were applied, mapped in that file's `## Resolution` section.

Phase 5 landed across `d4e755f` (the first comparison, the decision and the live-call transcript),
`7b3a7b7` and `4db78e8` (the model change and the npm fix, merged through pull request 1), `6678f55`
and `3ece70a` (the evidence and the procedure citation).

An independent implementation review followed (`reviews/impl-review-phase5.md`, verdict NEEDS
ATTENTION, 0 critical, 5 warnings, 4 observations) and every finding is resolved, mapped in that
file's `## Resolution` section. The substantial one was F2: the comparison that chose the model had
run at an uncommitted output budget of 8000, and two of its four model failures were the exact mode
later attributed to that budget. It was re-run once at the shipped 16000 budget. The model choice did
not change but its reasoning did, and the new matrix is the authoritative one.

**Progress rows, exactly.** 53 of the 59 rows are checked. The six that are not are all Phase 4
manual rows, each carrying its own one-line reason: 4.6, 4.8 and 4.12 would need a second run, a
re-run and a hundred-comment thread on the repository's only pull request; 4.9 and 4.13 need a fork
and the repository has none; 4.14 would mean deliberately breaking a working secret. Row 5.2 was
unchecked before the re-run and is now checked, because every fixture assertion passes for the chosen
model, which is what that criterion's own gloss requires. Rows 2.10, 2.11, 3.6, 3.7 and 3.9 were
unchecked and reasonless until the review caught it; all five are now closed against evidence that
already existed.
