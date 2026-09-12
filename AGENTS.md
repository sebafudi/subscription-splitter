# Repository Guidelines

Subscription Splitter records one shared monthly subscription, its participants and their payments,
and reports what each participant owes. TypeScript throughout: a Hono API and a React client in one
Cloudflare Worker over D1. No application code exists yet; the first runtime slice creates it.

## Hard rules

- Money is integer minor units in the domain, the database and over the wire. Format only at display.
- The share for a priced month is `round(price / activeCount)` per active participant, owner
  included; the owner absorbs the residual. Never switch to largest-remainder allocation.
- Every record is reached through its owning subscription. Enforce ownership on the server for every
  read and mutation, including child IDs: foreign or mismatched IDs return 404, no session returns 401.
- Derive the current month from the subscription's time zone with `Intl`, never from server-local
  date parts.
- Months are `YYYY-MM`, dates `YYYY-MM-DD`. Do not write calendar dates, timestamps, deadlines or
  duration estimates into authored files; use change IDs, migration IDs and commit SHAs instead.
- Use synthetic fixtures only. Never commit secrets, private records or proprietary course material.
  Secrets live in `.dev.vars` locally and in `wrangler secret` remotely.

## Project structure

- `src/domain/` holds the calculation and imports nothing from D1. `src/server/` holds the Hono app,
  auth and routes; only `src/server/db/` writes SQL. `src/client/` is React built by Vite.
- `migrations/` uses sequential wrangler migrations (`0001_...`). `tests/` is integration against
  local D1, `e2e/` is one browser smoke, `tools/reviewer/` is the separate review package.
- Foundation docs: @context/foundation/prd.md, @context/foundation/tech-stack.md,
  @context/foundation/roadmap.md, @context/foundation/test-plan.md. Resumable state:
  @context/STATUS.md. Decision records: `context/decisions/D-NNN-<slug>.md`. Evidence:
  @evidence/index.md.
- Archive a completed change to `context/archive/<change-id>/`.

## Build, test and dev commands

The scaffold does not exist yet. The slice that adds `package.json` records its scripts here in the
same change.

## Style and conventions

- Zod schemas are the one validation contract, shared by routes and client forms. Validate at the
  entry point, not per screen.
- Participants with payments or schedules are archived or closed out, never hard-deleted (409).

## Testing

Vitest for domain units, `@cloudflare/vitest-pool-workers` for integration against local D1 with
migrations applied in setup, one Playwright smoke for login to balance. No coverage thresholds. Risk
to test-type mapping: @context/foundation/test-plan.md.

## Commits and pull requests

Conventional Commits, one lowercase line, no body (`docs: record analysis repository ...`). CI runs
typecheck, unit and integration; deploying is a separate manual step.
