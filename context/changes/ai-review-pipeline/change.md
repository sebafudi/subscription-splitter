---
change_id: ai-review-pipeline
title: AI code review pipeline for pull requests
status: implementing
---

## Notes

Roadmap item S-05, milestone anchor MS-01. Route fixed by decision D-003: an independent reviewer
package at `tools/reviewer/`, five project-specific review criteria with a structured verdict schema,
a promptfoo comparison of two or three OpenRouter models on fixed diff fixtures, and a GitHub Actions
workflow that posts the review as a pull request comment and applies a verdict label.

Course anchors: module 5 lesson 2 (team agent on an SDK) and lesson 3 (review criteria, forced
verdict shape, model evaluation, CI wiring). The Champion evidence categories are the pipeline view
with at least one job, the job logs, and the model's review comment on a real pull request.

Blocked on one credential: `OPENROUTER_API_KEY` is not present in this environment. Everything up to
the live run is designed so the key is needed only at run time; the unit tests never reach the
network.

Artifacts in this folder: `opportunity-map.md` (build-versus-buy decision), `requirements.md` (review
contract), `research.md` (library and platform evidence), `plan.md` and `plan-brief.md`.

The implementation review (`reviews/impl-review.md`, phases 1 to 4) is resolved: all five required
fixes and all four observations were applied, mapped in that file's `## Resolution` section. Phase 5
remains pending on `OPENROUTER_API_KEY`.
