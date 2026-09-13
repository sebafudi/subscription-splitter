# D-014: The Worker runs first for `/api/*`

- **Decision:** `wrangler.jsonc` sets `"run_worker_first": ["/api/*"]` under `assets`, alongside the
  existing `"not_found_handling": "single-page-application"`. Every request whose path begins with
  `/api/` reaches the Worker before Cloudflare's static-asset layer is consulted, whatever headers it
  carries. Every other path keeps the behaviour it has today: a real asset is served as an asset, and
  anything else falls back to `index.html` so the client router can take it. No negative `!` pattern
  is used, because no path under `/api/` is a static asset.
- **Problem it fixes:** release 3 found live that a top-level browser navigation to
  `/api/auth/callback/google` never reached the Worker. Recorded in full in
  `evidence/runs/release-3.md` under "Defects found", defect D1, with a single-variable matrix
  isolating `Sec-Fetch-Mode: navigate` as the only deciding header. The consequence was that a real
  Google sign-in could not complete: Google returns the browser to
  `/api/auth/callback/google?code=...&state=...` as a document navigation, that navigation was
  answered with `index.html`, the authorization code was never exchanged and no session was created.
  The same interception is why the expired-link alert could not be produced in a browser on the
  deployed origin.
- **Rationale:** Cloudflare's documented routing sends navigation requests, the ones carrying
  `Sec-Fetch-Mode: navigate`, to `not_found_handling` instead of to the Worker, for any compatibility
  date at or after `2025-04-01`. This repository's date is `2026-08-22`, so the behaviour is active
  and cannot be avoided by configuration of `not_found_handling` alone. `run_worker_first` is the
  documented override, and an array of path patterns is the narrow form of it. The full research,
  including the documentation quoted verbatim and the local reproduction, is in
  `context/changes/google-sign-in/research.md` under "Callback navigation and the asset layer".
  Scoping the override to `/api/*` keeps the change to the one surface that needs it. The API is the
  only server surface this application exposes, it is mounted entirely under `/api` in
  `src/server/index.ts`, and its own `notFound` already answers an unmatched `/api/` path with a JSON
  404 rather than falling through to the client shell, so worker-first routing over that prefix
  changes no response the application previously produced through fetch or XHR.
- **Rejected alternative:** `"run_worker_first": true`, which sends every request to the Worker
  first. It would fix the callback, but it routes every static asset and every client-route
  navigation through the Worker as well, turning cached asset serving into billable Worker
  invocations and making the Worker responsible for a fallback the asset layer already performs
  correctly. Rejected as a wider blast radius than the defect warrants.
  `["/*", "!/assets/*"]`, the documentation's other single-page-application example, was rejected for
  the same reason in a milder form: it still sends `index.html` and every non-asset path through the
  Worker, and it depends on the built asset prefix staying `/assets/`.
  Moving the OAuth callback off the `/api` prefix was rejected outright: the callback path is fixed
  by the Better Auth base path and is registered as a redirect URI in the Google OAuth client
  (decision D-012), so changing it means re-provisioning the client and re-registering three origins
  to work around a configuration setting that exists for exactly this case.
  Handling the navigation in the client, by having `index.html` read the callback query and re-issue
  it as a fetch, was rejected as an application-layer workaround for a routing defect: it would leak
  the authorization code into the client bundle's control flow and would still have to handle the
  asset layer answering the second request.
- **Affected tests:** none. The Workers test pool reads `wrangler.jsonc` but has no
  `assets.directory`, which the Vite plugin fills in only at build time, so the pool runs no asset
  layer and cannot reproduce the defect or the fix. A probe confirmed it: under `SELF.fetch` a
  navigation to a client route is answered by the Worker's own 404 rather than by `index.html`. The
  setting is verified instead by `wrangler dev` against the built configuration in
  `dist/subscription_splitter/wrangler.json`, which is the configuration `wrangler deploy` uploads,
  and by the live checks in `evidence/runs/release-4-live-smoke.txt`.
