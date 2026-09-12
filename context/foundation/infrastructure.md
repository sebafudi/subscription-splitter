# Infrastructure

What runs where, and what is deliberately absent. This document is the map; `README.md`'s Deploy
section is the procedure, and the commands live there rather than being repeated here. Where the two
disagree, the README is the one that gets followed, so fix both.

This repository records progress by change ID, migration ID and commit rather than by date. The
current release version id and the migrations applied to the remote database are recorded in
`context/STATUS.md` under Deployment, not here, because they move with every release.

## Runtime

One Cloudflare Worker, named `subscription-splitter` in `wrangler.jsonc`, serves everything from one
origin. Its entry point is `src/server/index.ts`, a Hono application that mounts the API under
`/api`. The React client is built by Vite into static assets that the same Worker serves, with
`not_found_handling: "single-page-application"` so client-side routes fall back to the app shell.
There is no second origin, no separate static host and no cross-origin configuration to maintain.

Because the API and the client share an origin, the session cookie is a first-party cookie and
`APP_ORIGINS` needs to name only that one origin.

The Worker's `compatibility_date` is held at the newest date the runtime bundled with
`@cloudflare/vitest-pool-workers` accepts, so the integration suite and `wrangler dev` run the same
Worker semantics. Raising it past that point breaks the integration suite. `nodejs_compat` is on
because Better Auth needs `AsyncLocalStorage` for request context (decision D-001).

## Databases

Two D1 databases, which share no data.

- **Remote.** `subscription-splitter-db`, id `03067638-dc95-4b5c-9a8a-86f2921e0414`, bound to the
  deployed Worker as `DB` in `wrangler.jsonc`. It was created once with `wrangler d1 create` and is
  the only database the live instance ever reads or writes. It holds the seeded accounts.
- **Local.** A separate local D1, also bound as `DB`, created on demand under `.wrangler/` by
  `wrangler dev` and by `npm run dev`. The integration suite gets its own local database again
  through `@cloudflare/vitest-pool-workers`, which applies every file in `migrations/` in its setup
  file (`tests/integration/apply-migrations.ts`) so each run starts from a known schema.

A record created locally never appears remotely, and the reverse. Nothing copies between them, and
no process syncs them.

## Migrations

Sequential SQL files in `migrations/`, named `0001_<slug>.sql` upward, applied by wrangler in
filename order. Wrangler tracks what a given database has already seen, so applying is idempotent
and only unapplied files run.

- `npm run db:migrate:local` applies them to the local database.
- `npm run db:migrate:remote` applies them to the remote one.

Both wrap `wrangler d1 migrations apply subscription-splitter-db`, and the remote form is the one
step in this project that changes live data. `wrangler d1 migrations list <db> --remote` reports what
is unapplied without writing anything, which is how a remote apply is checked before it is run.

Every migration so far is additive: `CREATE TABLE` and `CREATE INDEX` only, with no `ALTER` and no
`DROP`, so applying them to a populated database preserves its rows.

## Secrets and configuration

Names only. No value belongs in this repository, in a commit, in a screenshot or in a log.

| Name | Where it is set | What it is for |
|---|---|---|
| `BETTER_AUTH_SECRET` | `.dev.vars` locally, `wrangler secret put` on the Worker | Signs sessions. Any string locally; a generated random value in deployment |
| `APP_ORIGINS` | `.dev.vars` locally, `wrangler secret put` on the Worker | Comma-separated trusted origins. Required: `src/server/auth.ts` refuses to construct the auth instance if it is missing, empty or resolves to no usable origin, in every environment |
| `COOKIE_SECURE` | left unset everywhere that is deployed | Unset already means the session cookie carries `Secure`. It exists only so local development over plain http can set it to `false` when a browser refuses the cookie. Setting it in deployment could only weaken the cookie, which is why it is deliberately absent there |
| `SEED_ENABLED`, `SEED_TOKEN` | `.dev.vars` locally; set on the Worker only for the duration of a seeding call, then deleted | The two gates on the seed route. Both absent on the live Worker |
| `SEED_OWNER_EMAIL`, `SEED_OWNER_PASSWORD`, `SEED_REVIEWER_EMAIL`, `SEED_REVIEWER_PASSWORD` | `.dev.vars` locally; supplied in the request body when seeding a deployment | The two accounts the seed route creates |

`.dev.vars.example` is the committed list of these names and carries the notes on `COOKIE_SECURE` and
`APP_ORIGINS`. `.dev.vars` itself is gitignored. Deleting a Worker secret takes effect immediately
and needs no redeploy, which is what closes the seed route again after seeding.

## Seeding and reviewer access

Accounts are seeded, never self-registered: Better Auth runs with public sign-up disabled, and the
only way an account comes into existence is the gated `POST /api/dev/seed` route settled by decision
D-005. The route is inert unless both `SEED_ENABLED` and `SEED_TOKEN` are set, and it answers 404
rather than 403 when either gate is closed, so a closed route is indistinguishable from a route that
was never deployed.

The route creates accounts and nothing else. It cannot write a subscription, a participant, a price
or a payment, so data on the live instance is created through the product's own routes and screens,
as decision D-010 records.

Two accounts exist on the deployed instance: an owner account, which holds the data, and a reviewer
account, which deliberately holds nothing so that account isolation can be shown against a real
second account. Their credentials live only in `evidence/private/reviewer-credentials.md`, which is
gitignored at `.gitignore:14`. They are never written into a committed file, a screenshot or a form
field that is not a credential field, and they reach a reviewer only through the authorized private
channel named in decision D-010.

## Continuous integration, and its boundary

`.github/workflows/ci.yml` runs on every push to `main` and on every pull request against it. It
installs with `npm ci`, then runs typecheck, the unit suite, the integration suite and the production
build. It has `permissions: contents: read` and holds no deployment credential.

**CI never deploys.** Deploying is `npm run deploy`, run deliberately by a person, and nothing in a
merge triggers it. This is the reason the deployed build can be behind `main`, and the reason the
release SHA has to be read from the tree that was actually built: `vite build` reads the working
tree rather than a git ref, so a dirty tree produces a bundle no commit describes.

`.github/workflows/ai-review.yml` is the second workflow. It comments on pull requests through the
reviewer package in `tools/reviewer/` and is not a product gate; it is never a required check, and it
is skipped for pull requests from forks, which are withheld its credential.

## Non-goals

Deliberately absent, and not oversights:

- **No custom domain.** The workers.dev origin is the live URL.
- **No autoscaling or performance tuning.** The Worker's defaults are the configuration.
- **No observability stack.** No metrics backend, no log drain, no tracing, no alerting. A failure in
  the flow is what shows a failure.
- **No caching layer, no rate-limit retuning beyond the database-backed sign-in limit** that decision
  D-001 configured.
- **No second environment.** One Worker, one remote database, one origin. There is no staging tier,
  so the local database is the only place a change is exercised before it is live.
- **No deployment from CI**, as above.
- **No multi-region availability or failover**, carried from the requirements' non-goals.
