# Release 2 plan: redeploying the S-06 visual redesign

Roadmap S-06, goal V06. This is the release plan for the accepted `visual-redesign` slice, which has
been reviewed and archived but never deployed. It follows the shape of `evidence/runs/release-1.md`
and reuses release 1's procedure wherever the redesign changes nothing about it. No command below has
been run as part of writing this plan; the deploy, migration and capture steps are all still ahead of
us.

## Pre-flight results

Checked before drafting the procedure, all read-only.

- **Cloudflare access.** `npx wrangler whoami` succeeds: logged in with an OAuth token, one account
  visible. Token scopes present: `user (read)`, `offline_access`, `account (read)`,
  `workers_scripts (write)`, `d1 (write)`. Missing scopes reported (not needed by this project, same
  conclusion as release 1): `workers:write`, `workers_kv:write`, `workers_routes:write`,
  `workers_tail:read`, `pages:write`, `zone:read`, `ssl_certs:write`, `ai:write`, `ai-search:write`,
  `ai-search:run`, `websearch.run`, `agent-memory:write`, `queues:write`, `pipelines:write`,
  `secrets_store:write`, and several newer scopes for products this project does not touch
  (`artifacts:write`, `flagship:write`, `containers:write`, `cloudchamber:write`,
  `connectivity:admin`, `email_routing:write`, `email_sending:write`, `browser:write`,
  `challenge-widgets.write`). No account id or email recorded here.
- **GitHub access.** `gh auth status` succeeds: logged in to github.com as `sebafudi`, active account,
  SSH protocol, token scopes `admin:public_key`, `gist`, `project`, `read:org`, `repo`.
  `gh repo view sebafudi/subscription-splitter --json url,visibility` confirms the repository is
  `PUBLIC` at `https://github.com/sebafudi/subscription-splitter`.
- **Migration delta since the live release.** `git diff 8ed3422..origin/main --stat -- migrations/`
  is empty, and `git log --oneline 8ed3422..origin/main -- migrations/` shows no new migration files,
  only the existing `0001` through `0006` plus the migrations directory's own `README.md`. Nothing new
  needs applying for this release.
- **Remote pending migrations.** `npx wrangler d1 migrations list subscription-splitter-db --remote`
  answers `No migrations to apply!`. The remote database already carries every migration in
  `migrations/`, consistent with the delta check above. Phase 1 below still takes a fresh dry run
  immediately before the deploy, because another agent could add a migration between now and then.
- **Build check.** `npm run build` (client and Worker) succeeded, exit 0. Both builds completed in
  under 120ms with no warnings; asset names produced include `dist/subscription_splitter/index.js`,
  `dist/client/index.html`, `dist/client/assets/index-Bx-I_EYB.js` and
  `dist/client/assets/index-CdlKxmN3.css` (hashes will differ on the actual release build since they
  are content-addressed).
- **Live state.** `curl -sSI https://subscription-splitter.sebastianfudalej.workers.dev/` returns
  `200`, served by Cloudflare, `cf-cache-status: HIT`. `GET /api/health` returns `{"ok":true}`. The
  Worker exposes no version or commit endpoint; `src/server/index.ts` defines only `/api/health`,
  which reports liveness and nothing about the deployed SHA. There is no live SHA to record here for
  comparison; the release SHA has to be tracked the same way release 1 tracked it, from the clean
  checkout the deploy is built from.
- **No blockers found.** Access, migrations, build and the live endpoint are all in the expected
  state for a redeploy to proceed.

## Procedure

Numbered so each step can be checked off in order. `<release-sha>` is a placeholder for the commit
this release actually pins; fill it in once phase 1 below completes and use the same value
everywhere it appears after that.

### Phase 1: Pin the release candidate

1. From the shared working copy, confirm the tip of `main`: `git fetch origin && git log -1
   origin/main`.
2. Clone into a throwaway directory rather than building from the shared working copy, because other
   agents push to `main` concurrently and `vite build` reads the working tree, not a git ref:
   ```
   git clone https://github.com/sebafudi/subscription-splitter.git \
     /private/tmp/claude-502/-Users-sebastian-f-Projects-10xDevs/87e15bd2-6c01-486f-af85-4412e4ec328f/scratchpad/release-2
   cd /private/tmp/claude-502/-Users-sebastian-f-Projects-10xDevs/87e15bd2-6c01-486f-af85-4412e4ec328f/scratchpad/release-2
   ```
3. Confirm the clone is clean and read its HEAD: `git status --porcelain` (must be empty),
   `git rev-parse HEAD` (this is `<release-sha>`).
4. Confirm the candidate is downstream of the S-06 implementation review resolution the same way
   release 1 gated on the S-03 resolution: the resolution landed at `da7ad52`
   (`docs(visual-redesign): resolve the implementation review findings`), recorded in
   `context/checkpoints/s06-impl-review-resolution.md`, with `1d5d80a` recording the resolution SHA
   immediately afterward. Run `git merge-base --is-ancestor da7ad52 <release-sha>`, exit 0 required.
   If a later re-review (`context/checkpoints/s06-rereview.md` or similar, check what exists by the
   time this runs) supersedes this one, gate on that commit instead.
5. Run the gates in the clean clone, recording each command and its exit code verbatim, the same
   shape as release 1's "Gate results, captured verbatim" section:
   ```
   npm ci
   npm run typecheck
   npm test
   npm run build
   npx wrangler deploy --dry-run
   ```
6. Compare the `npm test` counts against the last recorded repository-wide figures (read the current
   figures from the latest `evidence/runs/*.md` or `context/STATUS.md` before comparing) so a
   regression is noticed rather than shipped.
7. Confirm hosted CI is green for `<release-sha>`: `gh run list --commit <release-sha>` or
   `gh api repos/sebafudi/subscription-splitter/commits/<release-sha>/check-runs`.

### Phase 2: The passing-tests capture

8. In a real Terminal window (not a screenshot of this session), inside the clean clone at
   `<release-sha>`, type and run in the same frame: `git rev-parse HEAD`, `git status --porcelain`,
   `npm run typecheck`, `npm test`. Let every command finish before the photograph is taken.
9. Photograph that one window by its window id only, so nothing else on the machine is in frame. The
   full SHA must be legible as the first line of output and echoed again at the bottom of the frame,
   matching release 1's `release-05-tests-passing.png` convention.
10. Save the capture as `evidence/screenshots/release-2-05-tests-passing.png` (the release-2 naming
    scheme below keeps this set distinct from release 1's `release-*` files).

### Phase 3: Remote state before writing anything

11. Re-run the remote migration dry run immediately before touching the database, since time has
    passed since the pre-flight check above: `npx wrangler d1 migrations list subscription-splitter-db
    --remote`. Expected: `No migrations to apply!`, since no new migration file exists in this
    release. If it reports anything to apply, stop and investigate before continuing; do not apply an
    unexpected migration blind.
12. `npx wrangler secret list` to confirm `APP_ORIGINS` and `BETTER_AUTH_SECRET` are still the only
    two secrets present, and that `SEED_ENABLED`/`SEED_TOKEN` are absent (the seed route must stay
    closed).
13. Since no schema change ships in this release, the off-Cloudflare export and the Time Travel
    bookmark from release 1's phase 2 are not repeated: there is nothing new to roll back at the
    database layer. If a step here reveals an unexpected pending migration (step 11), stop, and only
    then repeat release 1's snapshot-and-bookmark procedure before applying it.
14. Record the current release version id before deploying, so the previous build stays a named
    rollback target: `npx wrangler deployments list` (or read it from
    `evidence/runs/release-1.md`, which records `8e4fa506-cd63-412c-88f2-0101b6348bdb`).

### Phase 4: Deploy

15. Back in the clean clone: `git status --porcelain` empty, `git rev-parse HEAD` still equal to
    `<release-sha>` (another agent may have pushed while phases 1 to 3 ran; if the SHA moved, decide
    whether to re-pin or proceed with the originally gated SHA, and record the decision).
16. `npm run deploy`. Capture verbatim: the new Cloudflare version id, the release SHA, the live URL,
    and the previous version id it supersedes (from step 14).
17. Rollback path if the deploy misbehaves and the previous build was fine: `npx wrangler deployments
    list` then `npx wrangler rollback --version-id <previous-version-id>`, or redeploy the previous
    commit from a clean checkout the same way release 1's rollback path 2 describes. No migration
    rollback is needed per phase 3.

### Phase 5: Live smoke, mirroring release 1's transcript

18. Repeat the API-level transcript from `evidence/runs/release-1-live-smoke.txt` against the new
    deployment: root `200`, `/api/health` `200`, `/api/me` with no cookie `401`, cross-origin sign-in
    refused, sign-up disabled, owner sign-in `200` with `HttpOnly; Secure; SameSite=Lax` on the
    cookie, sign-out then replay of the same cookie `401`. Redact every cookie value the same way
    release 1's transcript does (`__Secure-better-auth.session_token=<redacted>`).
19. Re-read the demo plan's summary and the two existing subscriptions (the demo plan and the
    relabelled first-deployment artefact) and confirm the figures match what release 1 recorded, since
    this release changes only the visual layer and no data migration runs. Any drift here means the
    redesign touched behavior it was not supposed to and should be investigated before continuing.
20. Save the transcript as `evidence/runs/release-2-live-smoke.txt`, following release 1's redaction
    convention.

### Phase 6: Second-account isolation check

21. Sign in as the reviewer account in the same browser session sequence. Confirm its own
    subscription list is empty, and that requesting the owner's demo plan (and its summary, members,
    prices, payments, schedules) by id from the reviewer session answers `404` for every one, exactly
    as release 1's isolation pass recorded. This is a read-only check against existing data; no new
    row is created for it.

### Phase 7: Browser walkthrough and the ten captures

22. Load the `browser-testing-web-flows` skill against the live URL at the new release version, since
    this phase is chiefly about the redesigned interface rendering correctly, not about re-proving
    balance arithmetic already covered in release 1.
23. Retake the ten form-mapped captures below against the new build, replacing the file with the same
    name `evidence/screenshots/release-*.png` used in release 1 (or add a `release-2-` prefixed set if
    the original ten need to be preserved for comparison; decide before starting and stay consistent).
    Recreate the same states release 1 walked through: the demo plan and its balances are already
    live and unchanged, so no new data needs to be entered for most captures, only the redesigned
    screens need to be open when the shutter goes off. Where a capture originally required an action
    (recording a payment, marking a standing-order month not received), either reuse an already-open
    state that shows the same information (preferred, since the demo plan already carries the release
    1 payments and standing order) or repeat the action with a new synthetic value, recorded as an
    offset from the plan's start month, the same discipline release 1 used.

    | Form slot | File name to produce | Page / state it must show |
    |---|---|---|
    | Login screen (optional) | `release-01-login.png` | The sign-in screen, fields empty, redesigned |
    | Home / post-login | `release-02-home.png` | The post-login list: the demo plan and the relabelled first-deployment artefact, redesigned |
    | Main feature #1, data entry | `release-03-input-record-payment.png` | The payment form filled in, before submitting, redesigned |
    | Main feature #2, data display | `release-04-output-balances.png` | The five headline cards, the net-cost line, both participants, one owing and one ahead, redesigned |
    | Passing tests | `release-05-tests-passing.png` | The release SHA and `npm test` passing, from the clean checkout at `<release-sha>` (see phase 2) |
    | Custom attachment | `release-06-members-and-prices.png` | Casey R.'s inclusive active range, S to S+3, above the price history with its change, redesigned |
    | Custom attachment | `release-07-recurring-assumed-received.png` | The standing order's months, assumed received and not received, with the total over elapsed months, redesigned |
    | Custom attachment | `release-08-error-before-start-month.png` | A payment refused for predating the plan's start month, message visible under the date field, redesigned |
    | Custom attachment | `release-09-reviewer-sees-nothing.png` | The reviewer account signed in, empty subscription list, redesigned |
    | Custom attachment | `release-10-narrow-phone.png` | The detail screen at 390 CSS pixels (device emulation), one column, no horizontal overflow, redesigned |

    Each capture is of the test browser's own window, address bar visible except for
    `release-05-tests-passing.png`, which is the one Terminal capture with no address bar, matching
    release 1's convention. No capture may show a password, a token or a session cookie; the two
    account addresses may appear, matching release 1.

### Phase 8: Record and hand off

24. Write `evidence/runs/release-2.md`, following this file's own structure and release 1's shape:
    release candidate and its gate, the passing-tests capture description, the Cloudflare deploy
    record, the remote state checks, the live smoke transcript reference, the second-account
    isolation result, the browser walkthrough table with the ten filenames, and a closing section
    stating what was not exercised, in the same spirit as release 1's closing note.
25. Update `docs/SUBMISSION-PACKAGE.md` section 2 to point at the new release version id and confirm
    the screenshot set now reflects the redesigned interface, since that document currently flags the
    S-06 redeploy as the one thing standing between the Builder package and being submittable.
26. Hand the goal-box update to the designated status writer by naming the paths this phase produced,
    the same way release 1 closed out. This plan does not edit `GOALS.md` itself.

## What this plan deliberately does not do

- It does not touch `.env`, `.dev.vars`, or print any secret value. Every secret-adjacent check above
  is a name-only listing.
- It does not apply any migration as part of writing this plan; step 11's dry run is read-only, and no
  migration is expected to be pending, per the delta check above.
- It does not deploy, and no command in the pre-flight results section above changed any remote
  resource. `npm run build` writes only to the local `dist/` directory, which is gitignored.
- It does not decide whether to overwrite `evidence/screenshots/release-*.png` in place or version
  them under a new prefix; that choice is left to whoever executes phase 7, flagged explicitly in
  step 23 so it is not made silently.
