# Subscription Splitter

Records a shared monthly subscription, its participants and their payments, then shows what each participant owes and what the organizer's net cost is. Built for Cloudflare Workers with D1.

Product decisions follow a private earlier prototype (`spotify-family-split`), used as a read-only reference. This repository is a fresh build; no prototype code or data is copied.

Project context lives in `context/` (foundation documents, changes, decisions). Evidence for verification lives in `evidence/`.

## Stack

TypeScript throughout. A Hono API and a React client build into one Cloudflare Worker: the Vite plugin builds the client to static assets that the same Worker serves, with client-side routing falling back to the app shell. Storage is D1 through the `DB` binding. Sign-in is Better Auth on that same binding (decision D-001).

## Setup

Requires Node 22 or newer and npm.

```
npm install
```

The install approves the `workerd` and `esbuild` build scripts recorded in `package.json`; without them the dev server and the integration test runner cannot start.

Copy `.dev.vars.example` to `.dev.vars` and fill in the values for local development. `.dev.vars` is ignored by git. Deployment secrets go through `wrangler secret put`, never into source.

`.dev.vars` needs, at minimum: `BETTER_AUTH_SECRET` (any local string), `APP_ORIGINS` (the origins you will sign in from, comma-separated - `http://localhost:8787` for `wrangler dev`, `http://localhost:5173` for `vite dev`), `COOKIE_SECURE` (leave unset locally unless a browser refuses the session cookie over plain http, then set it to `false`; every deployed environment leaves it unset), `SEED_ENABLED` and `SEED_TOKEN` (needed only to run the seed call below), and the four `SEED_OWNER_*` / `SEED_REVIEWER_*` values the seed call reads.

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

Migrations are sequential SQL files in `migrations/`, named `0001_<slug>.sql` upward.

First-run setup, against a clean local database:

```
npm run db:migrate:local   # applies 0001_auth.sql then 0002_subscriptions.sql
npm run dev:worker          # or npm run dev, in a separate terminal, so the seed call has a server to reach
npm run seed:local
```

`npm run seed:local` reads `.dev.vars` directly and calls the gated seed route, `POST /api/dev/seed`
(decision D-005), once for the owner account and once for the reviewer account, against
`http://localhost:8787` by default (override with `SEED_TARGET_URL` if the server is running
elsewhere, for instance `vite dev`'s `http://localhost:5173`). The call is idempotent: running it
again reports each account as unchanged rather than failing. The same route and the same procedure,
with `SEED_ENABLED` and `SEED_TOKEN` set on the deployed Worker and then removed once seeding is
done, is how the remote database is seeded under slice S-04.

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
