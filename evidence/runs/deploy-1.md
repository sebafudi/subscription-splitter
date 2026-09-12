# Deploy 1: remote D1 provisioning and first deployment

## Local checks before touching Cloudflare

- `npm ci`: clean install.
- `npm run typecheck`: clean, no errors.
- `npm test`: unit 20/20 passing, integration 23/23 passing (43 total).
- `npm run build`: client and Worker build succeed.

## Database

- Name: `subscription-splitter-db`
- Id: `03067638-dc95-4b5c-9a8a-86f2921e0414`
- Region: EEUR
- `database_id` written into `wrangler.jsonc`, replacing the placeholder.

## Migrations applied remotely

```
npx wrangler d1 migrations apply subscription-splitter-db --remote
```

- `0001_auth.sql` applied
- `0002_subscriptions.sql` applied

## Secrets set (names only, no values recorded here)

- `BETTER_AUTH_SECRET`: random, generated with `openssl rand -base64 48`.
- `APP_ORIGINS`: set to the workers.dev origin after the first deploy revealed it, then the
  Worker was redeployed so the new value took effect.
- `SEED_ENABLED`, `SEED_TOKEN`: set for the one-time seeding step, then deleted (see below).
- `COOKIE_SECURE` was deliberately left unset, matching the documented convention that every
  deployed environment leaves it unset (unset already yields `Secure` on the session cookie).

## Deploy

- Command: `npm run deploy`
- First deploy version id: `bbf544e6-2714-4f12-81d0-c54519813d4b` (before `APP_ORIGINS` was set)
- Release version id (after `APP_ORIGINS`, `SEED_ENABLED`, `SEED_TOKEN` were set): `e259b7b3-d932-4b3b-8b84-7446cab7d636`
- Live URL: `https://subscription-splitter.sebastianfudalej.workers.dev`
- Release commit SHA at deploy time: `149aa44d9e80102f8ad425c6f9f684f5ef6d54aa`

Note on the release SHA: at the time of the build, the working tree had uncommitted changes from
concurrent work in progress on other agents' tasks, in `src/domain/` (`money.ts`, `money.test.ts`,
new `members.ts`, `months.ts` and their tests). These are unrelated to this deployment task and were
not authored or touched here. Because `vite build` reads the working tree rather than a git ref, the
deployed bundle reflects that working tree state, not exactly what `149aa44d` alone would produce.
Recorded here for traceability; no deployment-relevant file was affected.

## Seeding

- Owner account: `owner@example.com`, created.
- Reviewer account: `reviewer@example.com`, created.
- Both created via `POST /api/dev/seed` with curl (decision D-005), each returning
  `{"created": true}`.
- Credentials (synthetic, random 20-character passwords) saved only in
  `evidence/private/reviewer-credentials.md`, confirmed gitignored via `git check-ignore`.

## Live verification

See `evidence/runs/deploy-1-live-smoke.txt` for the trimmed, cookie-scrubbed transcript. Summary:

- `GET /`: 200
- `GET /api/me` without a cookie: 401
- Cross-origin sign-in attempt (`Origin: https://evil.example`): 403 (rejected)
- Sign-up endpoint: 400, body confirms `EMAIL_PASSWORD_SIGN_UP_DISABLED` (genuinely disabled, not
  a validation failure)
- Sign-in as owner: 200, `Set-Cookie` carries `HttpOnly`, `Secure`, `SameSite=Lax`
- `GET /api/me` with the owner's cookie: 200
- `POST /api/subscriptions` as owner: 201, subscription created
- `GET /api/subscriptions` as owner: 200, lists the one subscription
- Sign-in as reviewer: 200
- `GET /api/subscriptions/<owner's subscription id>` as reviewer: 404 (ownership isolation holds)
- `GET /api/subscriptions` as reviewer: 200, empty list
- `GET /api/dev/seed` (wrong method): 404
- `POST /api/dev/seed` with no token: 404

## Seeding disabled

- `npx wrangler secret delete SEED_ENABLED` and `npx wrangler secret delete SEED_TOKEN`: both
  succeeded.
- Deleting a secret takes effect immediately; no redeploy was needed.
- Verified: `POST /api/dev/seed` with the old (now-deleted) token returns 404,
  `{"error": "not found"}`. The seed route is confirmed closed on the live deployment.

## Outcome

Remote D1 is provisioned, migrated, and the Worker is deployed and live with the owner and
reviewer accounts seeded, ownership isolation verified, and the seed route confirmed closed.
Subscription CRUD beyond create/list (patch, delete) was not separately exercised live in this
run; only what decision D-005 and the assigned verification steps called for was checked.
