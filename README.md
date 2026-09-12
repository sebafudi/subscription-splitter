# Subscription Splitter

Records a shared monthly subscription, its participants and their payments, then shows what each participant owes and what the organizer's net cost is. Built for Cloudflare Workers with D1.

Product decisions follow a private earlier prototype (`spotify-family-split`), used as a read-only reference. This repository is a fresh build; no prototype code or data is copied.

Project context lives in `context/` (foundation documents, changes, decisions). Evidence for verification lives in `evidence/`.

## Stack

TypeScript throughout. A Hono API and a React client build into one Cloudflare Worker: the Vite plugin builds the client to static assets that the same Worker serves, with client-side routing falling back to the app shell. Storage is D1 through the `DB` binding. Sign-in is Better Auth on that same binding (decision D-001), not yet wired up.

## Setup

Requires Node 22 or newer and npm.

```
npm install
```

The install approves the `workerd` and `esbuild` build scripts recorded in `package.json`; without them the dev server and the integration test runner cannot start.

Copy `.dev.vars.example` to `.dev.vars` and fill in the values for local development. `.dev.vars` is ignored by git. Deployment secrets go through `wrangler secret put`, never into source.

## Run

```
npm run dev          # Vite dev server: client and Worker together, local D1
npm run dev:worker   # the built Worker alone, via wrangler
npm run build        # client and Worker into dist/
npm run preview      # build, then serve the result
```

`npm run dev` serves the client and the API from one origin. The API lives under `/api`; `GET /api/health` returns `{"ok": true}`.

## Test

```
npm test             # unit then integration
npm run test:unit    # the money calculation, no bindings needed
npm run test:integration  # the Worker against a local D1, migrations applied in setup
npm run typecheck
```

Unit tests cover all of `src/` with no storage dependency: the money calculation in `src/domain/` and the validation schemas under `src/server/validation/`. Integration tests run inside the Workers runtime through `@cloudflare/vitest-pool-workers`. What each test type is responsible for is set out in `context/foundation/test-plan.md`.

## Database

```
npm run db:migrate:local
npm run db:migrate:remote
```

Migrations are sequential SQL files in `migrations/`, named `0001_<slug>.sql` upward. The first one lands with the runtime-auth slice. `npm run seed:local` is a placeholder until the same slice adds account seeding.

## Deploy

```
npm run deploy
```

Builds, then deploys with wrangler. Before the first deploy, create the remote database and replace the placeholder `database_id` in `wrangler.jsonc`. Deployment is a deliberate step and is not wired to merges.

## Layout

- `src/domain/` money calculation, no D1 import
- `src/server/` Hono app, routes, and later the repositories that own all SQL
- `src/client/` React client built by Vite
- `migrations/` wrangler SQL migrations
- `tests/integration/` tests against a local D1
- `context/` product foundation, decisions, in-flight changes
- `evidence/` verification trail

`AGENTS.md` holds the rules that apply to changes in this repository.
