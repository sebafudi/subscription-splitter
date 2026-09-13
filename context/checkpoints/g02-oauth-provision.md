# Checkpoint: g02-oauth-provision (G02)

Goal G02: dedicated Google Cloud project and Web OAuth client provisioned, origins and callbacks verified, credentials secured.

## Step 1 - facts verified (done)

- Auth base path is `/api/auth`, mounted in `src/server/routes/auth.ts` as a catch-all handed to the
  Better Auth handler built by `createAuth` in `src/server/auth.ts`. Better Auth 1.7.4 is pinned.
- Better Auth's default social callback path is `<origin>/api/auth/callback/google` (provider callback
  is `${basePath}/callback/${providerName}`); confirmed against the library's OAuth documentation.
  Provider credentials are supplied as `socialProviders.google.clientId` / `clientSecret`.
- Local dev origins, from `APP_ORIGINS` in `.dev.vars` and the README: `http://localhost:5173`
  (`vite dev`, the default `npm run dev`) and `http://localhost:8787` (`wrangler dev`).
- Deployed origin: `https://subscription-splitter.sebastianfudalej.workers.dev`.
- gcloud 584.0.0 at `/opt/homebrew/share/google-cloud-sdk/bin/gcloud`. One credentialed account was
  present but not selected; `gcloud config set account` made it active. `gcloud projects list` then
  succeeds, so the credentials are live. No organization is visible, so the project is created
  standalone with no parent and no billing account.

## Step 2 - project created (done)

- Project id `subscription-splitter-auth`, name "Subscription Splitter Auth", no parent organization,
  no billing account attached. Created with `gcloud projects create`; only the default
  `cloudapis.googleapis.com` was enabled by that call. No paid API was enabled.
- `gcloud config set project subscription-splitter-auth` makes it the active project.
- Checked `gcloud services list --available` for a first-party Google Auth Platform provisioning API.
  None exists: the only OAuth-client surfaces with automation are the IAM workforce OAuth client and
  IAP brands, and neither is the general web OAuth client this feature needs. Consent-screen branding
  and the Web application client are therefore created through the authenticated Cloud Console UI.

## Step 3 - console configuration (blocked)

The Claude-in-Chrome extension is not connected to this session: `tabs_context_mcp` reports the
extension unavailable and `list_connected_browsers` returns an empty list. There is no authenticated
browser to drive, and no API substitute exists, so the consent screen, the Web client and the
credentials could not be created. Nothing was guessed and no placeholder value was written.

The blocking step is a signed-in Cloud Console session for `sebastianfudalej@gmail.com`. Either start
Chrome with the Claude extension connected and this task can finish it, or complete the four screens
below by hand and hand back the two credential values.

### Console screens, in order

1. Branding: <https://console.cloud.google.com/auth/branding?project=subscription-splitter-auth>
   App name "Subscription Splitter". User support email and developer contact email: the signed-in
   account. No logo, no app domain needed while the audience is Testing.
2. Audience: <https://console.cloud.google.com/auth/audience?project=subscription-splitter-auth>
   User type External, publishing status Testing. Add the signed-in account as the only test user.
   Do not publish the app and do not request verification.
3. Data access (scopes):
   <https://console.cloud.google.com/auth/scopes?project=subscription-splitter-auth>
   Add `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` and nothing else. All three
   are non-sensitive and need no verification.
4. Clients: <https://console.cloud.google.com/auth/clients?project=subscription-splitter-auth>
   Create client, type "Web application", name "Subscription Splitter Web".

   Authorized JavaScript origins:
   - `http://localhost:5173`
   - `http://localhost:8787`
   - `https://subscription-splitter.sebastianfudalej.workers.dev`

   Authorized redirect URIs:
   - `http://localhost:5173/api/auth/callback/google`
   - `http://localhost:8787/api/auth/callback/google`
   - `https://subscription-splitter.sebastianfudalej.workers.dev/api/auth/callback/google`

   The redirect URIs are what the flow actually uses. The JavaScript origins are registered for
   completeness; the server-side authorization code flow Better Auth runs does not depend on them.

## Step 5 - credentials (blocked, not started)

Nothing was written to `.dev.vars` and no Cloudflare secret was set, because no credential exists.
`.dev.vars` is already ignored (`git check-ignore` matches `.gitignore:4`), so no `.gitignore` change
is needed. Once the client exists, from the repository root:

```
printf '\nGOOGLE_CLIENT_ID=%s\n' "$CLIENT_ID" >> .dev.vars
printf '\nGOOGLE_CLIENT_SECRET=%s\n' "$CLIENT_SECRET" >> .dev.vars
printf '%s' "$CLIENT_SECRET" | npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
```

Set the values through shell variables or a here-doc so neither is echoed, and delete any downloaded
client JSON afterwards. `GOOGLE_CLIENT_ID` is public but still belongs in the Worker's configuration
rather than in the bundle; the implementation goal decides whether it lands as a `wrangler secret` or
a plain var, and adds both names to `env.d.ts`, which this task deliberately left untouched.

## Step 6 - verification

- Google discovery document reachable: `curl -s https://accounts.google.com/.well-known/openid-configuration`
  returns the expected issuer `https://accounts.google.com`.
- Deployed origin live: `GET https://subscription-splitter.sebastianfudalej.workers.dev/` returns 200,
  and `/api/me` returns 401 unauthenticated, so the auth router is mounted where the callback expects.
- Client id format check and `npx wrangler secret list` showing `GOOGLE_CLIENT_SECRET`: not run, no
  credential exists yet.

## Outcome

Partial. The dedicated project is provisioned and the callback contract is settled and recorded in
`context/decisions/D-012-google-oauth-provisioning.md`. The OAuth client itself needs one authenticated
console session. G02 is not complete.
