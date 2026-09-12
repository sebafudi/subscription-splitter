# Status

Resumable state for this repository. Update at every completed block.

## Checkout

- Repository: `subscription-splitter` (this directory).
- Remote: `origin` -> `git@github.com:sebafudi/subscription-splitter.git`, branch `main`.
- Source prototype reference: a private local Next.js prototype, `spotify-family-split`, read-only. Its monthly accounting decisions are preserved; no code, data or backups are copied.

## Current SHA

- `git rev-parse --short HEAD` at time of writing: `8249baf`. Advances with every commit; treat the live value as authoritative. (Previously recorded as `a0683ba`, 10 commits stale; see `git log --oneline a0683ba..8249baf`: `24f315b`/`752f60e` landed payments-and-recurring Phase 2 (the payments table, validation, repository, five routes and their tests); `8e9a5ee`/`6595354` landed Phase 3 (standing orders and their exceptions); `70a7fff` recorded an independent implementation review of members-and-price-history (verdict approve with required changes); `09b763b` applied that review's fixes and `ed72b1f` recorded its Resolution section; `45eb35e` archived members-and-price-history to `context/archive/members-and-price-history/` and flipped roadmap S-02 to `done`; `979d0cf`/`8249baf` landed payments-and-recurring Phase 4, the payments and standing-order UI sections, all 14 Progress rows (3 automated, 11 manual) checked with screenshot evidence in `evidence/screenshots/`.)
- Working tree: clean of other agents' work as of this update; this checkpoint touches only `context/STATUS.md`.

## Active change / phase

- `runtime-auth-slice` (roadmap S-01): **archived** (`context/archive/runtime-auth-slice/`), status `archived`, roadmap flipped to `done`. Implementation review resolved (F1-F8, commits `4861bf3`, `867fda8`); 20 unit / 23 integration tests passing. One manual Progress row is permanently left unchecked with an explanation, not pending action: 5.3 ("the workflow run on the pull request is green") - no pull request was ever opened for this slice; CI ran green on direct pushes to `main` instead (runs `34698878084`, `34698829080`, see `evidence/runs/ci-main-first-run.md` and the note added in `07c58a4`). No pull request has been opened against this repository at any point (`gh pr list --state all` returns none).
- `ai-review-pipeline` (roadmap S-05): status `implementing`, unchanged. Phases 1 to 4 landed and the implementation review's required fixes are resolved (`a0bed75`, `6b3813c`, `196c7d9`). Phase 5 (the live promptfoo model comparison, the real pull request and screenshots) is still blocked on `OPENROUTER_API_KEY`: absent from this shell's environment, `tools/reviewer/.env` does not exist, and `gh secret list -R sebafudi/subscription-splitter` returns none.
- `members-and-price-history` (roadmap S-02): **archived** (`context/archive/members-and-price-history/`), status `archived`, roadmap flipped to `done`. Plan written and independently reviewed (`reviews/plan-review.md`, verdict REVISE/approve-with-required-changes, resolved; revision recorded in `149aa44`). All five phases landed (`69b8fbc`, `a304b6d`/`989cb8a`, `b805445`/`490614e`, `682080d`/`e5f0116`, `41adf58`) and the plan closed out at `a0683ba`. An independent implementation review followed at `70a7fff` (`reviews/impl-review.md`, verdict approve with required changes, F1-F3 required test-only, F4-F8 optional). Resolved at `09b763b` (fixes) and `ed72b1f` (Resolution section): F1-F4 and F6 accepted and fixed; F5 recorded as an accepted limitation; F7 was already fixed incidentally by the payments-and-recurring Phase 3 commit `260b6d8`; F8 (an em dash in prose) is still pending, expected in the S-03 agent's next commit. Archived at `45eb35e`. Gates at `09b763b` in a clean worktree: typecheck clean; unit 15 files/185 tests; integration 10 files/103 tests (repo-wide); evidence recaptured at `evidence/runs/members-and-price-history-tests.txt`.
- `payments-and-recurring` (roadmap S-03): status `implementing`. Plan committed `5128636`. Independent plan review verdict REVISE (`reviews/plan-review.md`), resolved by the plan's author at `a71f211` and `6040933` (D-008, the composed schedule-status helper, reconciled with D-009's shared `memberMonthStatus`), then re-verified and approved by the reviewer at `50c1ee4`. Phase 1 (the pure domain layer: `months.ts` `isCalendarDate`/`monthOf`, `payments.ts` `validatePaymentDate`, `recurring.ts` `isMonthInSchedule`/`findScheduleOverlap`/`scheduleMonthStatuses` composing over `memberMonthStatus` with its parameter narrowed to `MemberMonthInputs`, and removal of `ownerResidualForMonth`) landed at `260b6d8`, evidence at `17b1ee0` - 7 automated + 2 manual rows checked. Phase 2 (the payments table, validation, a repository built around a single ownership predicate payment -> member -> subscription -> user, five routes, and `hasDependents`'s first clause) landed at `24f315b`, evidence at `752f60e` - gates unit 14 files/167 tests, integration 8 files/67 tests. Phase 3 (standing orders and their exceptions: migration `0006_recurring.sql`, schedules, unpaid exceptions, seven routes, overlap detection on the merged row, owner refusal, ordering by member then start month, and the summary's `recurringReceived`) landed at `8e9a5ee`, evidence at `6595354` - gates unit 15 files/179 tests, integration 9 files/95 tests, build ok, migrations `0001`-`0006` verified in order on a fresh D1. Phase 4 (the payments and standing-order UI sections: `PaymentForm`, `PaymentList`, `RecurringSection`, `ScheduleForm`, and their wiring into `SubscriptionDetail`) landed at `979d0cf`, evidence at `8249baf` - all 14 Progress rows checked, 10 screenshots in `evidence/screenshots/` covering a recorded payment moving the balance, an edit and delete round trip, a before-start-month refusal, assumed-received and not-counted recurring months, the member-delete refusal, the reviewer account seeing nothing, and a narrow-phone layout. Phase 5 (per the plan) not yet started.
- `hono-refactor-opportunities`: status `plan_reviewed`, unchanged. Analysis of the external `honojs/hono` repository; plan revised after independent review. Implementation of this plan against the external repository is optional and not part of this project's roadmap.
- `hono-request-dispatch-analysis`: status `preparing`, unchanged. Research and ast-grep verification recorded for the external `honojs/hono` repository; no plan.

## Checks

- Repository-wide `npm run typecheck` (as of `09b763b`): **passes**, clean across all three projects.
- Repository-wide `npm test` (as of `09b763b`, clean worktree): **passes**. Unit: 15 files, 185 tests. Integration: 10 files, 103 tests. Evidence recaptured at `evidence/runs/members-and-price-history-tests.txt`. (At payments-and-recurring Phase 2, `24f315b`: unit 14 files/167 tests, integration 8 files/67 tests. At Phase 3, `8e9a5ee`: unit 15 files/179 tests, integration 9 files/95 tests, build ok, migrations `0001`-`0006` verified in order on a fresh D1. These counts differ from the `09b763b` figures above because they were captured at different points in two independently-advancing slices; treat the latest commit's own evidence file as authoritative for that slice.)
- Repository-wide `npm run build` (as of `8e9a5ee`): **succeeds**, both worker and client.
- Migrations `0001_auth.sql` through `0006_recurring.sql` apply in order to a clean local D1 database (verified at `8e9a5ee`).
- `runtime-auth-slice` (as archived): 20 unit tests, 23 integration tests, typecheck clean and production build succeeds at archive time (see `evidence/work-log.md`; the original `evidence/runs/runtime-auth-slice-tests.txt` capture of 17/19 predates the F1-F6 fixes), and a live Chrome walkthrough recorded (`evidence/runs/runtime-auth-slice-smoke.txt`).
- `tools/reviewer`: `npm test` 67 of 67 passing across 10 test files, typecheck clean, `npx promptfoo validate` valid (see `evidence/work-log.md` for the phase-by-phase commit trail).
- Hosted CI (`.github/workflows/ci.yml`, workflow `CI`) is green on `main` through the latest push: run `34713809553` (payments-and-recurring Phase 4 evidence, `8249baf`), https://github.com/sebafudi/subscription-splitter/actions/runs/34713809553. Every push since the prior checkpoint (`490614e`, `682080d`, `e5f0116`, `a71f211`, `6040933`, `50c1ee4`, `260b6d8`, `17b1ee0`, `1a7f5ad`, `41adf58`, `a0683ba`, `24f315b`, `752f60e`, `8e9a5ee`, `6595354`, `70a7fff`, `09b763b`, `ed72b1f`, `45eb35e`, `979d0cf`, `8249baf`) is green in turn. No `ai-review.yml` run exists yet - it triggers on `pull_request`, and no pull request has ever been opened on this repository.

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

1. **S-02**: done. `members-and-price-history` is archived (`45eb35e`); nothing further here except the still-pending F8 em-dash cleanup, expected to land as an incidental fix in a near-term S-03 commit.
2. **S-03**: Phases 1-4 of `payments-and-recurring` are landed and green (`260b6d8`, `24f315b`, `8e9a5ee`, `979d0cf`/`8249baf`); next is Phase 5 (per the plan), then an independent implementation review, then archive.
3. **S-04**: release/deploy the payments-and-recurring work once S-03 lands, including a live verification pass covering D05 (login/logout, CRUD persistence, balances and ownership isolation matching the final release).
4. Builder-track follow-ups once S-03/S-04 land: **B08** (the browser acceptance walkthrough), **B09** (docs reflecting shipped behavior), **B10** (the course `mvp-check` run), **B12** (final-release screenshots).
5. **S-05**: `ai-review-pipeline` phase 5 remains blocked on `OPENROUTER_API_KEY` (external, account-owner action); nothing further to do locally until it is provisioned.

## Approved external scope

- Local Git repository, GitHub repository and pushes, GitHub Actions, Cloudflare Workers and D1 setup and deployment.
- Not approved: any upload or submission to the course, its forms or organizers; publishing secrets or proprietary course material; paid services without an approved budget.

## Architect track

- A01 to A14 complete. Report: `evidence/architect/architect-report.pdf`.
