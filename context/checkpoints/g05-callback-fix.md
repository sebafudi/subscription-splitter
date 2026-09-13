# Checkpoint: g05-callback-fix

- **Task**: `g05-callback-fix`, fixing release 3's defect D1 and re-releasing (goals G05, B12)
- **Model**: Opus
- **Status**: complete. The fix is applied, verified locally, deployed as release 4 and verified live.
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

## Release 4

- **Release SHA**: `bad3f2816611c00cd691b4ef67f1108d618bed60` (`bad3f28`)
- **Cloudflare version id**: `1d0f71c1-6832-4bc1-aace-5feef621e715`
- **Supersedes**: `ad3aaa60-b2b6-458a-92c4-ff57d43f423c` (release 3)
- **Status**: deployed and live-verified. No defect found.

Built and deployed from a throwaway clone at the release SHA with an empty `git status --porcelain`
and no `.dev.vars`, so the gates ran secretless at release 3's figures exactly. `No migrations to
apply!` on the remote D1 and both Google names present in a name-only `wrangler secret list`. The
deploy reported "No updated asset files to upload", which is correct: only routing configuration
changed, so the client bundle is byte-identical and the live root still serves `index-CLEnPkyw.css`
and `index-CQZzLfmQ.js`.

Every release 3 live check was repeated and the one that failed passes now. A real browser navigation
to `/api/auth/callback/google?state=bogus&code=bogus` lands on the application root with an empty
`location.search` and the alert "This sign-in link has expired. Start again from this page.". The
six-row header matrix answers 302 on every row. Deep client links keep their URL and load the shell,
static assets serve, an unmatched `/api` path answers the Worker's JSON 404, and the live Google
button still reaches `accounts.google.com` with the D-012 client id and the deployed redirect URI,
with nothing typed and no account chosen. Two cross-origin probes answered 429 first because the
transcript fires the social endpoint repeatedly from one address; re-run after a pause they gave
release 3's answers, recorded as such.

All ten certification captures were retaken at release 4 with the same slot meanings, dimensions and
method, including the passing-tests capture release 3 skipped. `release-01-login.png` came back
byte-identical to release 3's, which is what a deterministic re-render of an untouched screen
produces, and the record says so. Two captures are new,
`evidence/screenshots/release-4-callback-expired-link.png` and `release-4-google-consent-redirect.png`.
The walkthrough recorded a 45,00 zł payment, checked it against a hand calculation and deleted it
again, so the demo state is the one release 1 left.

## What remains

- The G05 consent roundtrip needs the owner's own Google account and a human at the keyboard. It is no
  longer blocked by the asset layer. What it must show is written out in `evidence/runs/release-4.md`.
- The consent audience stays External in Testing with the owner as its only test user, so no artifact
  may claim that public Google login works.
- `docs/SUBMISSION-PACKAGE.md` section 10 records byte sizes for the capture set; nine of the ten files
  have changed. This task does not edit that document.
- G05 has no Progress rows in any file this task may edit. Its progress is one box in the workspace
  `GOALS.md`, which belongs to the designated status writer, along with `context/STATUS.md` and
  `evidence/index.md`. This task edits none of the three.
- The change is not archived. `change.md` reads `impl_reviewed`.
