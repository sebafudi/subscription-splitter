# Status

Resumable state for this repository. Update at every completed block.

## Checkout

- Repository: `subscription-splitter` (this directory).
- Remote: `origin` -> `git@github.com:sebafudi/subscription-splitter.git`, branch `main`.
- Source prototype reference: a private local Next.js prototype, `spotify-family-split`, read-only. Its monthly accounting decisions are preserved; no code, data or backups are copied.

## Current SHA

- `git rev-parse --short HEAD` at time of writing: `a0683ba`. Advances with every commit; treat the live value as authoritative. (Previously recorded as `989cb8a`, 11 commits stale; see `git log --oneline 989cb8a..a0683ba`: `b805445`/`490614e` landed members-and-price-history Phase 3 (prices, break months, the summary route); `682080d`/`e5f0116` landed Phase 4 (the detail screen); `a71f211`/`6040933`/`50c1ee4` resolved and re-verified the payments-and-recurring plan review; `260b6d8`/`17b1ee0` landed payments-and-recurring Phase 1 (the domain ledger rules); `1a7f5ad` is a docs-only note on the payments plan's scope; `41adf58` landed members-and-price-history Phase 5 (the verification trail) and `a0683ba` closed out its plan, flipping `change.md` to `status: implemented` - the slice is not yet archived, that step is deliberately left for after an independent implementation review.)
- Working tree: clean as of this update; two other agents are actively committing in this checkout (one under `context/changes/members-and-price-history/`, `evidence/runs/` and `evidence/index.md`; one under `src/`, `migrations/`, `tests/` and `context/changes/payments-and-recurring/`, which currently has an untracked `src/server/validation/payments.{ts,test.ts}` pair mid-edit). Payments-and-recurring Phase 2 (payments table, validation, repository, routes) is in progress right now; do not treat it as landed until `git log` shows its commit.

## Active change / phase

- `runtime-auth-slice` (roadmap S-01): **archived** (`context/archive/runtime-auth-slice/`), status `archived`, roadmap flipped to `done`. Implementation review resolved (F1-F8, commits `4861bf3`, `867fda8`); 20 unit / 23 integration tests passing. One manual Progress row is permanently left unchecked with an explanation, not pending action: 5.3 ("the workflow run on the pull request is green") - no pull request was ever opened for this slice; CI ran green on direct pushes to `main` instead (runs `34698878084`, `34698829080`, see `evidence/runs/ci-main-first-run.md` and the note added in `07c58a4`). No pull request has been opened against this repository at any point (`gh pr list --state all` returns none).
- `ai-review-pipeline` (roadmap S-05): status `implementing`, unchanged. Phases 1 to 4 landed and the implementation review's required fixes are resolved (`a0bed75`, `6b3813c`, `196c7d9`). Phase 5 (the live promptfoo model comparison, the real pull request and screenshots) is still blocked on `OPENROUTER_API_KEY`: absent from this shell's environment, `tools/reviewer/.env` does not exist, and `gh secret list -R sebafudi/subscription-splitter` returns none.
- `members-and-price-history` (roadmap S-02): status `implemented` (all 5 phases planned, plan-reviewed and now implemented; waiting on an independent implementation review, then archiving - `archived_at` is still `null` by design). Plan written and independently reviewed (`reviews/plan-review.md`, verdict REVISE/approve-with-required-changes, resolved per its `## Resolution` section; the revision is recorded in `149aa44`). Phase 1 landed at `69b8fbc` (5 automated + 2 manual rows). Phase 2 landed at `a304b6d`, evidence at `989cb8a` (7 automated + 2 manual rows). Phase 3 (prices, break months, the summary route, and the shared month-classification helper `src/domain/month-status.ts`, decision D-009) landed at `b805445`, evidence at `490614e`. Phase 4 (the detail screen) landed at `682080d`, evidence at `e5f0116` - 11 manual rows walked in a real Chrome against two synthetic accounts, screenshots in `evidence/screenshots/`. Phase 5 (the verification trail: `evidence/runs/members-and-price-history-tests.txt`, the evidence index row, and `test-plan.md` corrections) landed at `41adf58`; the plan closed out at `a0683ba`. All five phases green.
- `payments-and-recurring` (roadmap S-03): status `implementing`. Plan committed `5128636`. Independent plan review verdict REVISE (`reviews/plan-review.md`), resolved by the plan's author at `a71f211` and `6040933` (D-008, the composed schedule-status helper, reconciled with D-009's shared `memberMonthStatus`), then re-verified and approved by the reviewer at `50c1ee4`. Phase 1 (the pure domain layer: `months.ts` `isCalendarDate`/`monthOf`, `payments.ts` `validatePaymentDate`, `recurring.ts` `isMonthInSchedule`/`findScheduleOverlap`/`scheduleMonthStatuses` composing over `memberMonthStatus` with its parameter narrowed to `MemberMonthInputs`, and removal of `ownerResidualForMonth`) landed at `260b6d8`, evidence at `17b1ee0` - 7 automated + 2 manual rows checked. Phase 2 (the payments table, validation, repository, five routes and their tests) is in progress now by a separate concurrent agent; not claimed done here since no phase-2 commit shows in `git log` yet. Phases 3-4 not started.
- `hono-refactor-opportunities`: status `plan_reviewed`, unchanged. Analysis of the external `honojs/hono` repository; plan revised after independent review. Implementation of this plan against the external repository is optional and not part of this project's roadmap.
- `hono-request-dispatch-analysis`: status `preparing`, unchanged. Research and ast-grep verification recorded for the external `honojs/hono` repository; no plan.

## Checks

- Repository-wide `npm run typecheck` (as of `17b1ee0`): **passes**, clean across all three projects.
- Repository-wide `npm test` (as of `17b1ee0`): **passes**. Unit: 13 files, 153 tests. Integration: 7 files, 52 tests. (At members-and-price-history Phase 4, `e5f0116`, the same suite read 11 unit files / 111 tests and 7 integration files / 52 tests; payments-and-recurring Phase 1 added 2 unit files / 42 tests on top of that.)
- Repository-wide `npm run build` (as of `17b1ee0`): **succeeds**, both worker and client.
- All four migrations (`0001_auth.sql`, `0002_subscriptions.sql`, `0003_members.sql`, `0004_prices_and_breaks.sql`) apply in order to a clean local D1 database.
- `runtime-auth-slice` (as archived): 20 unit tests, 23 integration tests, typecheck clean and production build succeeds at archive time (see `evidence/work-log.md`; the original `evidence/runs/runtime-auth-slice-tests.txt` capture of 17/19 predates the F1-F6 fixes), and a live Chrome walkthrough recorded (`evidence/runs/runtime-auth-slice-smoke.txt`).
- `tools/reviewer`: `npm test` 67 of 67 passing across 10 test files, typecheck clean, `npx promptfoo validate` valid (see `evidence/work-log.md` for the phase-by-phase commit trail).
- Hosted CI (`.github/workflows/ci.yml`, workflow `CI`) is green on `main` through the latest push: run `34712386313` (members-and-price-history close-out, `a0683ba`), https://github.com/sebafudi/subscription-splitter/actions/runs/34712386313. Every push since the prior checkpoint (`490614e`, `682080d`, `e5f0116`, `a71f211`, `6040933`, `50c1ee4`, `260b6d8`, `17b1ee0`, `1a7f5ad`, `41adf58`, `a0683ba`) is green in turn. No `ai-review.yml` run exists yet - it triggers on `pull_request`, and no pull request has ever been opened on this repository.

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

1. **S-02**: all 5 phases of `members-and-price-history` are implemented and green; next is an independent implementation review of the whole slice, then archive.
2. **S-03**: finish `payments-and-recurring` Phase 2 (payments table, validation, repository, five routes and tests, in progress now), then Phase 3 (standing orders and their exceptions), then Phase 4 (the payments and standing-order UI sections), then an independent implementation review, then archive.
3. **S-04**: release/deploy the payments-and-recurring work once S-03 lands.
4. **S-05**: `ai-review-pipeline` phase 5 remains blocked on `OPENROUTER_API_KEY` (external, account-owner action); nothing further to do locally until it is provisioned.

## Approved external scope

- Local Git repository, GitHub repository and pushes, GitHub Actions, Cloudflare Workers and D1 setup and deployment.
- Not approved: any upload or submission to the course, its forms or organizers; publishing secrets or proprietary course material; paid services without an approved budget.

## Architect track

- A01 to A14 complete. Report: `evidence/architect/architect-report.pdf`.
