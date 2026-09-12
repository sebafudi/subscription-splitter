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

Deployment is a deliberate step and is not wired to merges. Local development uses its own local D1
database (see Database above); the remote database used by the deployed Worker is entirely separate
and is provisioned once, the first time this repository is deployed.

**One-time remote setup**, before the first deploy:

```
npx wrangler d1 create subscription-splitter-db
```

Put the returned `database_id` into `wrangler.jsonc`, replacing the placeholder. Then apply the
migrations to that remote database:

```
npx wrangler d1 migrations apply subscription-splitter-db --remote
```

Set the deployment secrets (never committed; `wrangler secret put` reads the value from stdin):

```
openssl rand -base64 48 | npx wrangler secret put BETTER_AUTH_SECRET
echo -n "https://<your-worker>.<subdomain>.workers.dev" | npx wrangler secret put APP_ORIGINS
```

The workers.dev subdomain is only known after the first deploy (`npx wrangler whoami`, or the URL
printed by `wrangler deploy`), so `APP_ORIGINS` is normally set right after that first deploy, then
the Worker is redeployed once more to pick it up. `COOKIE_SECURE` is left unset in every deployed
environment, same as local: unset already means the session cookie carries `Secure` (see
`.dev.vars.example`).

**Deploy:**

```
npm run deploy
```

Builds, then deploys with wrangler.

**One-time seeding**, once after the first deploy that has `APP_ORIGINS` set correctly, following
decision D-005:

```
echo -n "true" | npx wrangler secret put SEED_ENABLED
openssl rand -hex 24 | npx wrangler secret put SEED_TOKEN
```

Then call `POST /api/dev/seed` once for the owner account and once for the reviewer account, against
the live URL, with the `x-seed-token` header set to the value just generated. `scripts/seed-local.mjs`
can do this against a remote target by pointing `SEED_TARGET_URL` at the live URL, provided its
`.dev.vars` file holds the real remote `SEED_TOKEN` and the credentials to seed; otherwise call the
route directly with curl. The call is idempotent.

**Disable seeding** immediately afterward, so the route stops existing again:

```
npx wrangler secret delete SEED_ENABLED
npx wrangler secret delete SEED_TOKEN
```

Deleting a secret takes effect immediately; no redeploy is needed. Confirm the route now answers 404
even with the old token before considering the deployment done.

## Layout

- `src/domain/` money calculation, no D1 import
- `src/server/` Hono app, routes, and later the repositories that own all SQL
- `src/client/` React client built by Vite
- `migrations/` wrangler SQL migrations
- `tests/integration/` tests against a local D1
- `context/` product foundation, decisions, in-flight changes
- `evidence/` verification trail

`AGENTS.md` holds the rules that apply to changes in this repository.
