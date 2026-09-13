---
change_id: ai-review-pipeline
title: AI code review pipeline for pull requests
status: implemented
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

Phase 5 landed across `d4e755f` (the comparison, the decision and the live-call transcript),
`7b3a7b7` and `4db78e8` (the model change and the npm fix, merged through pull request 1) and the
closing evidence commit. One Progress row is deliberately left unchecked with its reason rather than
made green: 5.2 asks the evaluation to exit 0, and `promptfoo eval` exited 100 because neither
candidate passed all seven fixtures. Six Phase 4 manual rows stay unchecked for stated reasons too,
each one a case that would have needed a fork, a deliberately broken secret or a manufactured
hundred-comment thread to demonstrate. No implementation review has been run on Phase 5 yet.
