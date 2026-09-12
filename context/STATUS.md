# Status

Resumable state for this repository. Update at every completed block.

## Checkout

- Repository: `subscription-splitter` (this directory).
- Remote: `origin` -> `git@github.com:sebafudi/subscription-splitter.git`, branch `main`.
- Source prototype reference: a private local Next.js prototype, `spotify-family-split`, read-only. Its monthly accounting decisions are preserved; no code, data or backups are copied.

## Current SHA

- `git rev-parse --short HEAD` at time of writing: `636e111`. Advances with every commit; treat the live value as authoritative.

## Active change / phase

- `runtime-auth-slice` (roadmap S-01): status `implementing`. All five plan phases landed; independent implementation review is in progress. One manual Progress row remains open: 5.3, the workflow run on the pull request is green, pending a live PR run.
- `ai-review-pipeline` (roadmap S-05): status `implementing`. Phases 1 to 4 landed and the implementation review's required fixes are resolved. Phase 5 (the live promptfoo model comparison, the real pull request and screenshots) is blocked on the `OPENROUTER_API_KEY` secret.
- `members-and-price-history` (roadmap S-02): status `planned`. Change identity and research recorded; plan not yet written.
- `hono-refactor-opportunities`: status `plan_reviewed`. Analysis of the external `honojs/hono` repository; plan revised after independent review. Implementation of this plan against the external repository is optional and not part of this project's roadmap.
- `hono-request-dispatch-analysis`: status `preparing`. Research and ast-grep verification recorded for the external `honojs/hono` repository; no plan.

## Checks

- `runtime-auth-slice`: typecheck clean, 20 unit tests passing, 23 integration tests passing after the F1-F6 implementation-review fixes (see `evidence/work-log.md`; the original `evidence/runs/runtime-auth-slice-tests.txt` capture of 17/19 predates them), production build succeeds, and a live Chrome walkthrough recorded (`evidence/runs/runtime-auth-slice-smoke.txt`).
- `tools/reviewer`: `npm test` 67 of 67 passing across 10 test files, typecheck clean, `npx promptfoo validate` valid (see `evidence/work-log.md` for the phase-by-phase commit trail).
- Hosted CI (`.github/workflows/ci.yml`, workflow `CI`) is green on `main`: run `34698878084`, https://github.com/sebafudi/subscription-splitter/actions/runs/34698878084 (`evidence/runs/ci-main-first-run.md`).

## Deployment

- Live URL: `https://subscription-splitter.sebastianfudalej.workers.dev`.
- Release version id: `e259b7b3-d932-4b3b-8b84-7446cab7d636`. Release commit SHA: `149aa44d9e80102f8ad425c6f9f684f5ef6d54aa` (the working tree carried unrelated uncommitted `src/domain/` changes from concurrent work at build time; see `evidence/runs/deploy-1.md`).
- Remote D1 `subscription-splitter-db` (`03067638-dc95-4b5c-9a8a-86f2921e0414`), migrations `0001_auth.sql` and `0002_subscriptions.sql` applied with `--remote`.
- Owner and reviewer accounts seeded once via the gated `POST /api/dev/seed` route; credentials live only in the gitignored `evidence/private/reviewer-credentials.md`, not committed.
- Seeding is disabled on the live deployment (`SEED_ENABLED`/`SEED_TOKEN` deleted); confirmed the route now answers 404 with the old token.
- Full verification transcript: `evidence/runs/deploy-1-live-smoke.txt`. Summary: `evidence/runs/deploy-1.md`.

## Blockers

- `OPENROUTER_API_KEY` is not available in this environment. Needed for the AI review pipeline (live model comparison, hosted PR review). Required actions by the account owner:
  - Export it in the local shell, or place it in `tools/reviewer/.env` (the CLI loads this file automatically).
  - Add it as a repository secret: `gh secret set OPENROUTER_API_KEY -R sebafudi/subscription-splitter`.

  Everything else in the pipeline is prepared without it.

## Next executable action

- S-01: resolve the `runtime-auth-slice` implementation review, then open the pull request that closes Progress row 5.3.
- S-02: write the plan for `members-and-price-history`.
- S-03: payments and recurring, once S-02 lands.
- S-04: release, once S-03 lands.

## Approved external scope

- Local Git repository, GitHub repository and pushes, GitHub Actions, Cloudflare Workers and D1 setup and deployment.
- Not approved: any upload or submission to the course, its forms or organizers; publishing secrets or proprietary course material; paid services without an approved budget.

## Architect track

- A01 to A14 complete. Report: `evidence/architect/architect-report.pdf`.
