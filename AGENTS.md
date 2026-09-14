# Repository Guidelines

Subscription Splitter records one shared monthly subscription, its participants and their payments,
and reports what each owes. TypeScript throughout: a Hono API and a React client in one Cloudflare
Worker over D1. Four ledger slices shipped the product behaviour: sessions over two seeded accounts,
subscriptions, participants with inclusive active ranges, effective-dated prices, break months,
payments, standing orders with per-month exceptions, and the summary that derives every balance from
them. The roadmap ledger `F-01` through `S-08` is archived under `context/archive/`, `S-07`
`google-sign-in` having added Google sign-in beside the password login and `S-08`
`subscription-management-and-date-inputs` having added editing and deleting the subscription itself
and native browser calendar controls in place of the plain-text month and date fields. `S-09`
`compact-member-calendar` is the active change: a compact per-person calendar or graph view of
monthly balances, payments and standing orders in place of the unbounded per-person history list.
It is released as release 6 (`64eb0d3`, Cloudflare version `a80d2e12-d77e-4b88-b318-aa992eb60d50`);
only the foundation/status/evidence synchronization and the archive step remain.

## Hard rules

- Money is integer minor units in the domain, the database and over the wire; format at display only.
- The share for a priced month is `round(price / activeCount)` per active participant, owner
  included; the owner absorbs the residual. Never switch to largest-remainder allocation.
- Every record is reached through its owning subscription. Enforce ownership on the server for every
  read and mutation, child IDs included: foreign or mismatched IDs return 404, no session returns 401.
- Derive the current month from the subscription's time zone with `Intl`, never from server-local
  date parts.
- Months are `YYYY-MM`, dates `YYYY-MM-DD`. Never write calendar dates, timestamps, deadlines or
  duration estimates into authored files; use change IDs, migration IDs and commit SHAs.
- Use synthetic fixtures only. Never commit secrets or private records. Secrets live in `.dev.vars`
  locally and in `wrangler secret` remotely.

## Project structure

- `src/domain/` holds the calculation and imports nothing from D1. `src/server/` holds the Hono app,
  auth and routes; only `src/server/db/` writes SQL. `src/client/` is React built by Vite.
- Pin every dependency to an exact version. The compatibility date in `wrangler.jsonc` is held at the
  newest date the test pool's runtime accepts; raising it breaks the integration suite.
- `migrations/` holds sequential wrangler migrations (`0001_...`) and `tests/` integration against a
  local D1.
- Foundation docs: @context/foundation/prd.md, @context/foundation/roadmap.md,
  @context/foundation/test-plan.md, @context/foundation/infrastructure.md. State: @context/STATUS.md. Decisions:
  `context/decisions/D-NNN-<slug>.md`. Evidence: @evidence/index.md.

## Build, test and dev commands

`npm run dev` serves client and Worker on one origin with a local D1. `npm test` runs unit then
integration. `npm run typecheck` covers all three projects. Rest: @README.md.

## Style and conventions

- Zod schemas are the one validation contract, shared by routes and client forms, applied at the
  entry point rather than per screen.
- Participants with payments or schedules are archived or closed out, never hard-deleted (409).
  Deleting the whole subscription is the one exception and removes them with it, because that rule
  protects a participant inside a ledger the organizer is keeping, not the ledger itself.
- Months and dates are entered through the browser's own calendar control, with a native select of
  named months where a browser has no month picker. The wire format stays `YYYY-MM` and `YYYY-MM-DD`,
  read and written through `.value`; never build a `Date` from a field value.

## Testing

Unit tests cover all of `src/` with no bindings (the calculation in `src/domain/`, validation schemas
under `src/server/validation/`); integration runs inside the Workers runtime against a local D1 with
migrations applied in setup. No coverage thresholds. Risk to test-type mapping:
@context/foundation/test-plan.md.

## Commits and pull requests

Conventional Commits, one lowercase line, no body. CI runs typecheck and tests; deploying is a
separate manual step.

## Reviewer package

`tools/reviewer/` is an independent npm package, invoked from that directory rather than from the
repository root: `npm test`, `npm run typecheck` and `npm run review` (the CLI, through `tsx`) all run
inside `tools/reviewer/`. Root `npm test` and root `npm run typecheck` do not cover it, because the two
Vitest include globs and the three `tsconfig` projects at the root all stop short of `tools/`. See
`tools/reviewer/README.md` for the review criteria, the threshold rule and where the credential goes.
