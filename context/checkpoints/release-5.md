# Checkpoint: release-5

- **Task**: `release-5`, deploying and live-verifying S-08
  `subscription-management-and-date-inputs` (parent goal M06)
- **Model**: Opus
- **Status**: complete, no defects found
- **Release SHA**: `91ce0daa469df960097398ce756730f97845e647` (`91ce0da`)
- **Cloudflare version id**: `751a8bfd-e62a-4c9a-beb2-1953eb6a7656`
- **Superseded version**: `1d0f71c1-6832-4bc1-aace-5feef621e715` (release 4, at `bad3f28`)
- **Hosted CI**: run `34789657237`, conclusion `success`, at the release SHA
- **Live URL**: `https://subscription-splitter.sebastianfudalej.workers.dev`

## Actions

1. Pulled with rebase and pinned `91ce0da` at the tip of `origin/main`. Nothing newer had landed, so
   the candidate is the commit the task named with no docs-only drift to reconcile.
2. Ancestry gates, both exit 0: `git merge-base --is-ancestor abf8790 91ce0da` (the implementation
   review resolution) and `git merge-base --is-ancestor 688757a 91ce0da` (the server review fix).
   `git diff --stat bad3f28..91ce0da -- migrations/` is empty, so no migration ships.
3. Cloned fresh into the scratchpad and checked out the release SHA there, not the shared working
   copy. `git status --porcelain` empty and HEAD equal to the release SHA before the gates and again
   immediately before the deploy. No `.dev.vars` in the clone, so the suite ran secretless.
4. Gates in the clean clone: `npm ci` exit 0; typecheck exit 0 across three projects; unit 22 files
   and 262 cases; integration 13 files and 131 cases; build exit 0 emitting
   `assets/index-CtqqFhDM.css` and `assets/index-D-QEf8bX.js`. Release 4 recorded 18 / 214 and
   12 / 119, and both client asset names move because this release changes client source.
5. Hosted CI checked at the candidate SHA before deploying: run `34789657237`, `success`. Already
   complete, so nothing had to be triggered or waited for.
6. Remote state before the deploy: `No migrations to apply!`, and `wrangler secret list` showing
   `APP_ORIGINS`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, with
   `SEED_ENABLED` and `SEED_TOKEN` still absent. Name-only listing, no value printed. No snapshot or
   Time Travel bookmark, for the reason releases 2 to 4 give: no schema change ships.
7. `npx wrangler deploy` from the clean clone. Worker startup 39 ms, three new static assets
   uploaded, which is the deploy agreeing with the build that client bytes did change.
8. Live API smoke saved as `evidence/runs/release-5-live-smoke.txt`. Twenty-two checks, all passing.
9. Wrote `evidence/runs/release-5.md` in release 4's format, including the list of which
   certification captures this change alters.

## What the smoke established

- **The change's own rules hold live.** `PATCH` of name and time zone answers 200 and the re-read
  shows both. `PATCH start_month` later than the price month answers 400 with
  `start_month cannot be later than 2026-04 because a price is recorded from that month`, naming the
  price rather than the participant, skipped month, payment or standing order that the disposable was
  deliberately built to place later. `PATCH start_month` one month earlier answers 200 and carries the
  owner's opening range from `2026-03` to `2026-02` with it. `PATCH currency` while amounts exist
  answers 400 with the currency lock.
- **Deletion is confined and non-disclosing.** `DELETE` of the disposable answers 204 with an empty
  body, a subsequent `GET` answers 404, a nonexistent id answers 404 and an unauthenticated call
  answers 401.
- **Nothing pre-existing was touched.** The reviewer's list held 0 rows before and 0 after with the
  same ids; the owner's list held the same 2 rows with the same ids, read at the start of the pass
  and again after the delete from a session held open for that comparison. The only record deleted
  live is the one this pass created.
- **The deployed asset is this release's.** The root serves `assets/index-D-QEf8bX.js`, the name the
  clean-clone build emitted, and that file carries ``type:`month` ``, `not-a-month` and
  `Choose a month`: the native month branch, the `supportsMonthInput` sanitisation probe and the
  leading option of the select fallback. Release 4's bundle contains none of them.
- Sign-out answers 200 and replaying the signed-out cookie answers 401. `/api/auth-config` still
  returns exactly `{"google":true}` before and after the edits.

## Changed paths

- `evidence/runs/release-5.md`
- `evidence/runs/release-5-live-smoke.txt`
- This checkpoint

Nothing under `src/`, `tests/`, `migrations/`, `wrangler.jsonc`, `context/STATUS.md`,
`evidence/index.md`, `evidence/work-log.md`, `context/changes/subscription-management-and-date-inputs/`,
`docs/SUBMISSION-PACKAGE.md` or the workspace `GOALS.md` was touched.

## Unresolved

None blocking. Three notes for whoever comes next:

- **The ten certification captures still show release 4.** Five slots show a screen this change
  altered: `release-03-input-record-payment.png` and `release-08-error-before-start-month.png` (the
  payment panel's date field and its removed hint), `release-04-output-balances.png` (the subscription
  header's new "Edit subscription" and "Delete subscription" row), `release-06-members-and-prices.png`
  (the member panel's two active-month fields), and `release-05-tests-passing.png` (a different SHA
  and different counts). The other five are unaffected, with the reasoning per file in
  `evidence/runs/release-5.md`. `docs/SUBMISSION-PACKAGE.md` section 10 also still records every file
  as retaken against release 4; neither this task nor that file edits it.
- **Two sessions from a discarded smoke run stay valid until they expire.** The second run of the
  smoke script sent sign-out with no body, which the auth library answers 415, so its owner and
  reviewer sessions were never closed. Its cookies were held only in that process, so nothing further
  could be done about them here. Recorded in both the transcript and the run file rather than left
  out. That run also created and deleted its own disposable subscription, and its closing count
  matched its starting count.
- **The deployment refuses the default Python user agent** with a Cloudflare 1010 before the request
  reaches the Worker. Any scripted pass against this origin has to send a real browser user agent, or
  every check reads as a 403 that has nothing to do with the application. The per-client sign-in rate
  limiter releases 2 and 4 recorded is still on, so sign-ins must stay spaced apart.

## Next action

Hand the goal-box updates for S-08 and M06 to the designated status writer by naming the paths above,
and hand the five affected capture slots to the certification-screenshot task.

## Parent commit

`91ce0da`, the release SHA, with this pass's evidence committed on top.
