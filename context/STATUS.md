# Status

Resumable state for this repository. Update at every completed block.

## Checkout

- Repository: `subscription-splitter` (this directory).
- Remote: `origin` -> `git@github.com:sebafudi/subscription-splitter.git`, branch `main`.
- Source prototype reference: a private local Next.js prototype, `spotify-family-split`, read-only. Its monthly accounting decisions are preserved; no code, data or backups are copied.

## Current SHA

- `git rev-parse --short HEAD` at time of writing: `989cb8a`. Advances with every commit; treat the live value as authoritative. (Previously recorded as `909dd6a`, 2 commits stale; see `git log --oneline 909dd6a..989cb8a`: `a304b6d` landed members-and-price-history Phase 2 - members, their active ranges and the owner - and `989cb8a` recorded its Progress rows and evidence.)
- Working tree: clean of Phase 2 work as of this update (the migration, schema and route changes described in the previous revision of this line are now committed at `a304b6d`). A concurrent, unrelated agent may have an untracked `context/changes/payments-and-recurring/reviews/` directory in progress; that is not part of this repository's tracked history yet and is left untouched here.

## Active change / phase

- `runtime-auth-slice` (roadmap S-01): **archived** (`context/archive/runtime-auth-slice/`), status `archived`, roadmap flipped to `done`. Implementation review resolved (F1-F8, commits `4861bf3`, `867fda8`); 20 unit / 23 integration tests passing. One manual Progress row is permanently left unchecked with an explanation, not pending action: 5.3 ("the workflow run on the pull request is green") - no pull request was ever opened for this slice; CI ran green on direct pushes to `main` instead (runs `34698878084`, `34698829080`, see `evidence/runs/ci-main-first-run.md` and the note added in `07c58a4`). No pull request has been opened against this repository at any point (`gh pr list --state all` returns none).
- `ai-review-pipeline` (roadmap S-05): status `implementing`, unchanged. Phases 1 to 4 landed and the implementation review's required fixes are resolved (`a0bed75`, `6b3813c`, `196c7d9`). Phase 5 (the live promptfoo model comparison, the real pull request and screenshots) is still blocked on `OPENROUTER_API_KEY`: absent from this shell's environment, `tools/reviewer/.env` does not exist, and `gh secret list -R sebafudi/subscription-splitter` returns none.
- `members-and-price-history` (roadmap S-02): status `implementing`. Plan written and independently reviewed (`reviews/plan-review.md`, verdict REVISE/approve-with-required-changes, resolved per its `## Resolution` section; the revision is recorded in `149aa44`). Phase 1 (the pure `src/domain` calculation module) landed at `69b8fbc`: 5 automated + 2 manual Progress rows checked. Phase 2 (members, their active ranges and the owner) is now complete and committed: feature at `a304b6d`, Progress rows and evidence recorded at `989cb8a` - 7 automated + 2 manual rows checked (see `context/changes/members-and-price-history/plan.md` `## Progress`, Phase 2). Phase 3 (prices, break months and the summary) is next and not started; Phases 4-5 also not started.
- `payments-and-recurring` (roadmap S-03): status `planned`. Change identity, research and a plan exist (`context/changes/payments-and-recurring/plan.md`, committed `5128636`). An independent plan review is in progress right now by a separate concurrent agent (untracked `context/changes/payments-and-recurring/reviews/` directory present in the working tree at time of writing); no verdict is recorded here yet - do not treat the review as resolved until its file is committed and a verdict is readable. No Progress rows checked.
- `hono-refactor-opportunities`: status `plan_reviewed`, unchanged. Analysis of the external `honojs/hono` repository; plan revised after independent review. Implementation of this plan against the external repository is optional and not part of this project's roadmap.
- `hono-request-dispatch-analysis`: status `preparing`, unchanged. Research and ast-grep verification recorded for the external `honojs/hono` repository; no plan.

## Checks

- Repository-wide `npm run typecheck` (as of `989cb8a`): **passes**, clean. (The prior failure recorded in an earlier revision of this line was mid-edit breakage in the then-uncommitted Phase 2 working tree; it was resolved before Phase 2 landed at `a304b6d`.)
- Repository-wide `npm test` (as of `989cb8a`): **passes**. Unit: 8 files, 82 tests. Integration: 5 files, 35 tests.
- Repository-wide `npm run build` (as of `989cb8a`): **succeeds**.
- All three migrations (`0001_auth.sql`, `0002_subscriptions.sql`, `0003_members.sql`) apply in order to a clean local D1 database.
- `runtime-auth-slice` (as archived): 20 unit tests, 23 integration tests, typecheck clean and production build succeeds at archive time (see `evidence/work-log.md`; the original `evidence/runs/runtime-auth-slice-tests.txt` capture of 17/19 predates the F1-F6 fixes), and a live Chrome walkthrough recorded (`evidence/runs/runtime-auth-slice-smoke.txt`).
- `tools/reviewer`: `npm test` 67 of 67 passing across 10 test files, typecheck clean, `npx promptfoo validate` valid (see `evidence/work-log.md` for the phase-by-phase commit trail).
- Hosted CI (`.github/workflows/ci.yml`, workflow `CI`) is green on `main` through the latest push: run `34710594154` (members-and-price-history Phase 2), https://github.com/sebafudi/subscription-splitter/actions/runs/34710594154 (earlier evidence in `evidence/runs/ci-main-first-run.md`). No `ai-review.yml` run exists yet - it triggers on `pull_request`, and no pull request has ever been opened on this repository.

## Deployment

- Live URL: `https://subscription-splitter.sebastianfudalej.workers.dev`.
- Release version id: `e259b7b3-d932-4b3b-8b84-7446cab7d636`. Release commit SHA: `149aa44d9e80102f8ad425c6f9f684f5ef6d54aa` (the working tree carried unrelated uncommitted `src/domain/` changes from concurrent work at build time; see `evidence/runs/deploy-1.md`).
- Remote D1 `subscription-splitter-db` (`03067638-dc95-4b5c-9a8a-86f2921e0414`), migrations `0001_auth.sql` and `0002_subscriptions.sql` applied with `--remote`.
- Owner and reviewer accounts seeded once via the gated `POST /api/dev/seed` route; credentials live only in the gitignored `evidence/private/reviewer-credentials.md`, not committed.
- Seeding is disabled on the live deployment (`SEED_ENABLED`/`SEED_TOKEN` deleted); confirmed the route now answers 404 with the old token.
- Full verification transcript: `evidence/runs/deploy-1-live-smoke.txt`. Summary: `evidence/runs/deploy-1.md`.

## Blockers

- `OPENROUTER_API_KEY` is not available in this environment. Needed for the AI review pipeline (live model comparison, hosted PR review). Confirmed still absent (2026-09-12): not in this shell's environment, no `tools/reviewer/.env`, and `gh secret list -R sebafudi/subscription-splitter` returns none. Required actions by the account owner:
  - Export it in the local shell, or place it in `tools/reviewer/.env` (the CLI loads this file automatically).
  - Add it as a repository secret: `gh secret set OPENROUTER_API_KEY -R sebafudi/subscription-splitter`.

  Everything else in the pipeline is prepared without it.
- No pull request has ever been opened on this repository (`gh pr list -R sebafudi/subscription-splitter --state all` returns none). This is why `runtime-auth-slice` Progress row 5.3 is closed-out-by-explanation rather than checked, and why `ai-review.yml` (which only triggers on `pull_request`) has never run.

## Next executable action

1. **S-02**: start `members-and-price-history` Phase 3 (prices, break months and the summary) - the next unstarted phase per the plan's `## Progress` section, now that Phase 1 and Phase 2 are both committed and green.
2. **S-03**: resolve the independent plan review for `payments-and-recurring` currently in progress (a concurrent agent is writing `context/changes/payments-and-recurring/reviews/`); this can proceed in parallel with (1) since it is a documentation-only review step on a different change.
3. **S-03**: once its plan review lands and any required changes are resolved, begin implementation - after (2).
4. **S-04**: release/verification slice, once S-03 lands.
5. **S-05**: `ai-review-pipeline` phase 5 remains blocked on `OPENROUTER_API_KEY` (external, account-owner action); nothing further to do locally until it is provisioned.

## Approved external scope

- Local Git repository, GitHub repository and pushes, GitHub Actions, Cloudflare Workers and D1 setup and deployment.
- Not approved: any upload or submission to the course, its forms or organizers; publishing secrets or proprietary course material; paid services without an approved budget.

## Architect track

- A01 to A14 complete. Report: `evidence/architect/architect-report.pdf`.
