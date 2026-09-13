# Checkpoint: g05-callback-fix

- **Task**: `g05-callback-fix`, fixing release 3's defect D1 and re-releasing (goals G05, B12)
- **Model**: Opus
- **Status**: the fix is applied, verified locally and committed. Release 4 is next.
- **Parent commit**: `a9d1062`, the tip of `origin/main` after release 3

## The fix

`wrangler.jsonc` gains `"run_worker_first": ["/api/*"]` under `assets`, keeping
`not_found_handling: single-page-application` for every other path. Decision
`context/decisions/D-014-run-worker-first-for-api.md`. Research under "Callback navigation and the
asset layer" in `context/changes/google-sign-in/research.md`, quoting Cloudflare's own statement that
a `Sec-Fetch-Mode: navigate` request triggers `not_found_handling` instead of the Worker for any
compatibility date at or after `2025-04-01`, and that `run_worker_first` is the documented override.
This repository's compatibility date is `2026-08-22`.

## How it was verified locally

Against `dist/subscription_splitter/wrangler.json`, the configuration the Vite plugin writes and
`wrangler deploy` uploads, which is the only local run carrying the deployed asset layer. `npm run
dev` and the integration pool both lack it.

- Before the edit the defect reproduced exactly: the navigation answered 200 with `index.html` and
  appeared in no wrangler request log, while the same url as a `cors` fetch answered 302 to
  `/?error=state_mismatch`.
- After the edit the navigation answers 302 to `/?error=state_mismatch`. Client routes, a deep client
  route, the root and all three static asset types still serve as before. `/api/me` is 401 as a fetch
  and as a navigation. An unmatched `/api` path still answers the Worker's JSON 404.
- Gates unchanged from release 3: typecheck clean across three projects, 18 unit files and 214 cases,
  12 integration files and 119 cases, build exit 0 emitting the same two client asset names.

No integration test is added. The pool reads `wrangler.jsonc`, which has no `assets.directory`, so it
runs no asset layer. A throwaway probe confirmed it, and it has been removed: under `SELF.fetch` a
navigation to a client route is answered by the Worker's own 404 rather than by `index.html`, and the
callback answers 302 with the setting present or absent. A test there would assert nothing.

## What remains

Release 4: pin the tip of `origin/main`, clone throwaway, gates, deploy, and repeat every release 3
live check with the navigation one now expected to pass. Then the ten certification captures against
release 4 and `evidence/runs/release-4.md`.
