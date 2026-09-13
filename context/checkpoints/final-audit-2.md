# Checkpoint: final-audit-2

Task: delta re-audit of the certification package after release 4 (F01), so the package's
single-release claim holds at `bad3f28` rather than at `c842f64`.

## What this task did

Appended `## Delta audit at release 4` to `evidence/audit/final-audit.md`. The earlier report was not
rewritten, amended or reordered. It still stands as written, pinned at HEAD `57065dc` and release 2.
This section covers only the delta since `866ae3a`.

Audited at repository HEAD `995e2a8`, working tree clean, `main` level with `origin/main`.

## Verification performed rather than read

- `bad3f28` resolved in full. The code-only delta `c842f64..bad3f28` over `src`, `tests`,
  `migrations`, `wrangler.jsonc`, `env.d.ts` and `.github` is exactly 14 files, all S-07, with
  `run_worker_first` as the only `wrangler.jsonc` change and `migrations/` untouched. Everything else
  in the full diff is records and the `visual-redesign` archive move.
- No code commit after the release: `git log --oneline bad3f28..HEAD -- src tests wrangler.jsonc
  migrations` is empty and the three later commits are all `docs(...)`.
- Hosted CI read live: one run at the release SHA, `34751198550`, workflow `CI`, conclusion success.
- Live read-only probes: root 200, `/api/me` 401, `/api/auth-config` byte-exact `{"google":true}`,
  `/api/health` 200.
- Gates re-run by the auditor in a throwaway clone at `bad3f28` with a fresh `npm ci`, no `.dev.vars`
  and no `GOOGLE_*` value in the environment: typecheck exit 0, unit 18 files / 214 tests,
  integration 12 files / 119 tests, build exit 0. The build emitted `index-CLEnPkyw.css` and
  `index-CQZzLfmQ.js`, the two filenames the live root references.
- All ten `release-*.png` opened as images and judged against their slots, not listed. Synthetic data
  throughout, no credential visible, Google button present on the login capture, and the
  passing-tests capture showing the same counts the auditor obtained.
- Section 10 manifest sizes compared against `ls -l` file by file; the PDF and the three Champion
  captures measured too.
- Both package documents swept for release, version, run and commit identifiers, and the 13 Builder
  and 7 joint form fields counted against the archived sources.
- Secret sweep: `GOCSPX` across every revision and at HEAD, `.dev.vars` tracking state, and
  `git check-ignore` on the built copy under `dist/`.
- Date-free sweep over the 26 markdown files changed since `866ae3a`, each hit judged by category.

## Outcome

Nothing failed. Four items PASS outright, two carry a note, neither of which is a defect.

- `release-01-login.png` was last committed at `0ae77a9` rather than at the release record, because
  the retake came out byte-identical to release 3's. Corroborated: `0ae77a9` is an ancestor of
  `bad3f28`, release 4 is configuration only, and the client asset names are unchanged.
- The `GOCSPX` sweep is not literally empty. Its only match in every revision is a prose line in
  `context/checkpoints/g02-finish.md` asserting that no such prefix is present. No secret value
  exists in the tree or the history.

One follow-up for the status writer: the `docs/SUBMISSION-CHECK.md` row reading "F01 final audit,
Done, and pinned to release 2" is made stale by this section and should name the delta audit. It is a
wording refresh and no goal box depends on it.

Readiness: the package is ready for the owner's upload confirmation at release 4, pending the six
owner-only form values, the LICENSE decision and the C10 dynamic-field re-check before filling.

## Rules observed

Read-only apart from `evidence/audit/final-audit.md` and this checkpoint. No login, no deploy, no
course upload, no nested delegation, no secret printed, no box checked, no em dash and no new
calendar date. `GOALS.md`, `docs/SUBMISSION-PACKAGE.md` and `docs/SUBMISSION-CHECK.md` were read and
left untouched. Staged by explicit path, with `git pull --rebase origin main` before the push.
