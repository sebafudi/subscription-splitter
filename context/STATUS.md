# Status

Resumable state for this repository. Update at every completed block.

## Checkout

- Repository: `subscription-splitter` (this directory).
- Source prototype reference: a private local Next.js prototype, `spotify-family-split`, read-only. Its monthly accounting decisions are preserved; no code, data or backups are copied.
- Baseline: fresh build. No application code yet.

## Current SHA

- See `git rev-parse HEAD`; last recorded: decisions commit `7d5cbce`.

## Active change / phase

- Foundation block: context structure, product foundation, stack selection and auth compatibility investigation.

## Checks

- None run yet.

## Blockers

- `OPENROUTER_API_KEY` is not available in this environment. Needed for the AI review pipeline (reviewer spike, promptfoo model comparison, hosted PR review). Required actions by the account owner: export it in the local shell (or place it in `tools/reviewer/.env`, which the CLI loads automatically) and add it as a repository secret with `gh secret set OPENROUTER_API_KEY -R sebafudi/subscription-splitter`. Everything else in the pipeline is prepared without it.

## Next executable action

- Complete foundation documents and the runtime/auth/D1 compatibility spike, then plan the first vertical slice.

## Approved external scope

- Local Git repository, GitHub repository and pushes, GitHub Actions, Cloudflare Workers and D1 setup and deployment.
- Not approved: any upload or submission to the course, its forms or organizers; publishing secrets or proprietary course material; paid services without an approved budget.
