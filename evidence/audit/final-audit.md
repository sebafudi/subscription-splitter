# Final independent goal audit (F01)

Independent audit of every goal in the workspace `GOALS.md` sections W, B01-B13, D, A01-A14, C01-C10
and V01-V06, against the artifacts actually on disk, in git history, on GitHub and on the live Worker.

This report **supersedes the earlier audit** committed at `cd25fd9`. That one pins release 1
(`8ed3422` / `8e4fa506`), never names `c842f64`, and predates release 2, the S-06 archive, the
submission package fill and the S-07 plan review. It was stale rather than wrong, and it is replaced
here rather than amended.

## Scope and method

Audited at repository HEAD `57065dc4d690890f66882aea5fd80509bd5c84b0`.

- **Commits.** Every hex token in `GOALS.md` was resolved with `git cat-file -e <sha>^{commit}`.
  104 of 104 cited application commits resolve. The 13 that do not are not commits and are not
  claimed to be: Cloudflare version ids, the D1 database id, GitHub run and job ids, and the upstream
  `honojs/hono` commit, which resolves in the separate analysis clone and `git describe --tags` as
  `v4.13.7-7-gedd138ee`.
- **Files.** Every backticked artifact path in `GOALS.md` was resolved. All resolve except the
  visual-redesign paths noted under V01, V04 and V05.
- **Gates.** Re-run by the auditor, not quoted. A throwaway clone was made from the working copy,
  checked out at the pinned HEAD, and given a fresh `npm ci`. The shared working copy was not used,
  because two implementers are committing S-07 work into it concurrently and its tree carries an
  uncommitted `env.d.ts` edit from that in-flight work.
- **Live.** Read-only unauthenticated requests only. No login, no write, no deploy, no upload.
- **Screenshots.** All ten `release-*.png` were opened as images and judged against the slot each is
  claimed to fill, not merely listed.
- **Report PDF.** Page count taken two independent ways.
- **Champion.** Run, job and pull request state read from the GitHub API.
- **Form coverage.** Sections 8 to 10 of the package compared field by field against
  `archive/sources/submission-form.txt`, `builder.txt`, `architect-champion.txt` and
  `certification.txt`.

No credential value appears below. No calendar date appears below except the organizer's own stated
final deadline, which is an archived course source fact and is material to readiness.

## Release identity

**One identifiable tested release carries every Builder, deployment and screenshot claim.**

| Item | Value |
|---|---|
| Release commit | `c842f64cfaa1f362b0f34cbad35ec8e565805437` (`c842f64`) |
| Cloudflare Worker version | `84a95549-cd34-4065-a202-cf5f1385e9f9` |
| Superseded version | `8e4fa506-cd63-412c-88f2-0101b6348bdb` from `8ed3422` |
| Live URL | `https://subscription-splitter.sebastianfudalej.workers.dev` |
| Release gate | `git merge-base --is-ancestor da7ad52 c842f64` exits 0 |
| Hosted CI at the release SHA | run `34747075507`, workflow `CI`, conclusion success |

Three independent confirmations that the release is the product now audited:

1. **Content-addressed asset match.** The auditor's own `npm run build` at HEAD emits
   `index-Bx-I_EYB.js` and `index-CdlKxmN3.css`. The live root document references exactly those two
   filenames. The deployed bundle and the audited source are the same build.
2. **No code drift.** `git diff --name-only c842f64..HEAD` touches only `context/`, `evidence/` and
   `AGENTS.md`. Nothing under `src/`, `migrations/`, `tests/`, `tools/` or `.github/` has changed
   since the release.
3. **Captures postdate the deploy.** All ten `release-*.png` were last written at `ede931b`, and
   `git merge-base --is-ancestor c842f64 ede931b` exits 0.

Every reference to release 1 that remains in `docs/SUBMISSION-PACKAGE.md` is explicitly labelled
superseded or historical. No stale "final release" reference survives anywhere in the package.

## Gates observed by the auditor

| Gate | Result | Claimed in V03, V04, V06, B12 and the package |
|---|---|---|
| `npm run typecheck` | exit 0 | clean |
| `npm run test:unit` | 17 files, 194 tests, all passed | 17 files / 194 tests |
| `npm run test:integration` | 11 files, 112 tests, all passed | 11 files / 112 tests |
| `npm run build` | exit 0 | exit 0 |

Every figure matches. The same figures are legible in `release-05-tests-passing.png`, alongside the
full release SHA echoed twice.

## Live checks

| Probe | Result | Expectation |
|---|---|---|
| `GET /` | 200 | serves the app |
| `GET /api/me` | 401, `{"error":"unauthorized"}` | rejects unauthenticated access |
| `GET /api/health` | 200, `{"ok":true}` | healthy |
| `POST /api/dev/seed` | 404 | seed route closed |

## W set

| Goal | GOALS state | Verdict | Evidence checked | Note |
|---|---|---|---|---|
| W01 | checked | PASS | `42664ba` resolves; `README.md` and `context/STATUS.md` carry the source reference; remote public | |
| W02 | checked | PASS | `AGENTS.md`, `context/` tree, `8de6d37` | |
| W03 | checked | PASS | `context/foundation/shape-notes.md`, `prd.md` | |
| W04 | checked | PASS | `tech-stack.md`, `D-001`, `bootstrap-verification.md`, `c85b946` | |
| W05 | checked | PASS | `roadmap.md`, `test-plan.md` | |
| W06 | checked | PASS | all six change folders under `context/archive/`, each `change.md` reading `status: archived`; each holds `reviews/plan-review.md` with a `## Resolution` | verified by reading the status line of all six, not by trusting the prose |
| W07 | checked | PASS | same six archives, each holding `reviews/impl-review.md` with `## Resolution` | |
| W08 | checked | PASS | thirteen numbered decision records `D-001` to `D-013` present, exactly as claimed; recorded verdicts include REVISE and NEEDS ATTENTION | |
| W09 | unchecked | CORRECTLY OPEN | see two defects below | the audit half is what this report closes |

Two defects in W09's own description of the maintenance half, both blunt:

- **`evidence/index.md` does not carry "a row per goal".** It carries rows for 51 distinct goal ids.
  `W06`, `W08`, `V01`, `V02`, `V03` and `V05` have no row at all. The claim overstates the coverage.
- **W09 says the audit report "does not exist yet".** It has existed since `cd25fd9`. The true
  problem was that it was stale, not that it was absent. That wording should be corrected rather
  than simply flipped when this report lands.

## B set

| Goal | GOALS state | Verdict | Evidence checked | Note |
|---|---|---|---|---|
| B01 | checked | PASS | `evidence/runs/release-1.md`, browser walkthrough captures, `a323474`, `e3ab6e5` | re-proven against release 2 in `release-2.md` |
| B02 | checked | PASS | full CRUD cycle plus cold re-read in `release-1.md`, `2d9de6a` | |
| B03 | checked | PASS WITH NOTE | `context/archive/runtime-auth-slice/`, `tests/integration/auth.test.ts`, `dev-seed.test.ts`, `e58187c`, `29ab4cc` | the parenthetical "(21 integration tests)" is mis-attributed. Those two files hold 15 tests, confirmed by running them alone. 21 was the whole integration suite at that slice. Substance holds; the number does not describe the files it is attached to |
| B04 | checked | PASS | per-route cross-account assertions in five routers plus `router-isolation.test.ts`; live isolation in `release-1-live-smoke.txt` and `release-2-live-smoke.txt`; `release-09` capture opened | |
| B05 | checked | PASS | every named module and its test file present under `src/domain/`; integration coverage present | |
| B06 | checked | PASS | `src/domain/months.ts`, the four validation modules, the removal union in `src/server/db/members.ts`, `tests/integration/member-removal.test.ts`, `migrations/0003_members.sql` | |
| B07 | checked | PASS | `evidence/runs/payments-and-recurring-tests.txt` and the other captured runs; suite now far larger than the figures quoted, and re-run clean by the auditor | |
| B08 | checked | PASS | `evidence/runs/release-2.md` walkthrough; the three refusal states and the narrow width confirmed in the captures | |
| B09 | checked | PASS | README first-run recipe, PRD, test plan, infrastructure and roadmap present and consistent with shipped behaviour | |
| B10 | checked | PASS WITH NOTE | `context/archive/verification-and-release/mvp-check.md` read in full against `archive/toolkit/.ai/prompts/mvp-check.md` | see below |
| B11 | unchecked | CORRECTLY OPEN | `evidence/repo-payload-audit.md`, redaction at `24310bd`, README at `e926fac` | audit half independently re-verified; upload half genuinely pending |
| B12 | checked | PASS | all ten captures opened; dimensions and byte sizes confirmed | see below |
| B13 | unchecked | CORRECTLY OPEN | package sections 8 to 10 and `docs/SUBMISSION-CHECK.md` | see form gaps |
| B14, B15, B16 | unchecked | NOT APPLICABLE YET | acceptance depends on an organizer action | |

**B10 substantiated, not merely claimed.** The report infers the project shape first, as the prompt
requires, quotes the prompt's out-of-scope rule and declines to count deployment in the project's
favour, answers all five criteria with file-and-line evidence rather than assertion, names Create,
Read, Update and Delete separately with a route and a repository function each, pairs two named test
plan risks with the specific tests that check them, and closes with the prompt's required output:
checklist, "5 of 5 criteria met. 100%.", an explicitly empty improvement list, and a brief
beyond-the-minimum note. Two honest limitations are recorded as observations rather than hidden.
Notes: it was run at release 1 (`8ed3422`), and it says "ten numbered decision records" where there
are now thirteen. Neither weakens the verdict, because the prompt scores only code and documentation
and explicitly excludes visual design, which is all S-06 changed.

**B12 substantiated by opening every file.** Nine captures are 948 by 1033 with the address bar
visible on the live hostname; `release-05-tests-passing.png` is 1340 by 1230 from a real Terminal.
Each shows what its slot claims: login form with empty password field; post-login home listing two
subscriptions; the record-a-payment form mid-entry; the balances summary with per-participant owed
and ahead figures; the terminal gates with the full release SHA; membership ranges beside a
two-entry price history; standing-order months with one marked not received and the running total
counting two of three elapsed months; the before-start-month refusal with its message visible; the
reviewer account showing zero subscriptions; and the detail screen at a narrow phone width. Data is
synthetic throughout (`owner@example.com`, `reviewer@example.com`, Blake, Casey R., Alex). No
password, token or session cookie is visible in any capture. All ten byte sizes match the manifest in
section 10 exactly.

## D set

| Goal | GOALS state | Verdict | Evidence checked | Note |
|---|---|---|---|---|
| D01 | checked | PASS WITH NOTE | `evidence/runs/runtime-auth-slice-tests.txt`, `runtime-auth-slice-smoke.txt`, `e58187c` | the cited "(19 integration tests)" appears nowhere in the cited file, which records unit 3 files / 17 tests and integration 4 files / 21 tests. The substantive claim, Workers runtime compatibility with the chosen auth on local D1, is fully proven; the number is not |
| D02 | checked | PASS | `evidence/runs/deploy-1.md`, migrations applied `--remote` | |
| D03 | checked | PASS | `deploy-1.md`; secrets held in `wrangler secret`, none in source | independently confirmed by secret sweep |
| D04 | checked | PASS | `deploy-1.md`, version and SHA recorded | |
| D05 | checked | PASS | `release-2.md` and `release-2-live-smoke.txt`, 64 requests including post-sign-out cookie replay 401 and seed route 404 | deployment evidence names the final release, as the box claims |

## A set

| Goal | GOALS state | Verdict | Evidence checked | Note |
|---|---|---|---|---|
| A01 | checked | PASS | `honojs/hono` at `edd138ee`, resolves in the analysis clone; `D-002`; clone kept outside the repository | |
| A02 | checked | PASS | `context/map/artifact-1-territory.md`, `2b8cdf3` | |
| A03 | checked | PASS | `context/map/artifact-2-structure.md` | |
| A04 | checked | PASS | `context/map/artifact-3-contributors.md` | |
| A05 | checked | PASS | `context/map/repo-map.md` | |
| A06 | checked | PASS | `context/changes/hono-request-dispatch-analysis/research.md` | |
| A07 | checked | PASS | `ast-grep-verification.md`, 15 claims with zero-result corroboration | |
| A08 | checked | PASS | `hono-refactor-opportunities/research.md`, `reviews/plan-review.md`, `D-004` carrying its Review objection and Resolution | |
| A09 | checked | PASS | `plan.md` and `plan-brief.md`, two phases, explicit non-goals, `change.md` reading `plan_reviewed` | |
| A10 | checked | PASS | `context/domain/01-domain-distillation.md` | |
| A11 | checked | PASS | `context/domain/02-invariant-aggregate-refactor.md` | |
| A12 | checked | PASS | `context/domain/03-anti-corruption-layer.md`, explicit absent-leak finding | |
| A13 | checked | PASS | `context/architect-report.md` holds exactly the six claimed sections; `evidence/architect/architect-report.pdf` is **2 pages**, confirmed by `mdls` reporting `kMDItemNumberOfPages = 2` and independently by the PDF page tree `/Count 2` with two `/Type /Page` objects | at or under the two-page limit |
| A14 | checked | PASS | `context/architect-report-review.md`, verdict "Accurate with corrections", corrections applied | |
| A15, A16, A17 | unchecked | NOT APPLICABLE YET | organizer action | |

## C set

| Goal | GOALS state | Verdict | Evidence checked | Note |
|---|---|---|---|---|
| C01 | checked | PASS | `context/archive/ai-review-pipeline/opportunity-map.md` | |
| C02 | checked | PASS | `tools/reviewer/`, `evidence/runs/ai-review-live-call.md`; secret present by name only | no key material in tree or history |
| C03 | checked | PASS | `requirements.md`, five criteria | the five criteria are visible in the PR comment capture as a scored table |
| C04 | checked | PASS | `deriveVerdict` recomputes from criterion scores; malformed-output paths handled | validated against real model output |
| C05 | checked | PASS | `evidence/champion/eval-results.md` matches every quoted figure: 7 of 7 and 7 of 7 at 0.018328 and 126.5s mean against 5 of 7 and 6 of 7 at 0.005791 and 186.7s; superseded 8000-budget matrix retained | |
| C06 | checked | PASS | both workflows registered and active on GitHub; `pull_request` trigger, scoped permissions, pinned actions | |
| C07 | checked | PASS | run `34727750896` conclusion **success**; run `34730251520` conclusion **success**; PRs 1 and 2 both carry `ai-cr:passed`; PR 1 carries exactly one `ai-code-review` comment | verified through the GitHub API, not from the record |
| C08 | checked | PASS | all three captures opened | see below |
| C09 | checked | PASS | `hosted-review-run.md` records three real defects found by running; Phase 5 review NEEDS ATTENTION resolved and re-verified APPROVED | organizer source confirms review plus tests suffice and auto-deploy is not required |
| C10 | unchecked | CORRECTLY OPEN | dynamic fields resolved once when the form was read live; not re-checked since | |
| C11, C12, C13 | unchecked | NOT APPLICABLE YET | organizer action | |

**C08 substantiated by opening every file, and it matches the organizer's three required items
exactly.** `archive/sources/architect-champion.txt` asks for the pipeline view with at least one
visible job, logs during the code review operation, and the agent's review comment on a pull request.
`ai-review-pipeline-run.png` shows the Actions run page with the green "Run the AI reviewer" job and
Status Success. `ai-review-job-log.png` shows the job log with the reviewer running, the model named,
the verdict `pass`, and `OPENROUTER_API_KEY` rendered as `***`. `ai-review-pr-comment.png` shows the
posted comment with the five-criterion score table, findings grouped by criterion, the model name and
the `ai-cr:passed` label. One note: the log capture is a terminal rendering of `gh run view --log`
rather than the Actions web log view. It shows the same content and satisfies the requirement.

## V set

| Goal | GOALS state | Verdict | Evidence checked | Note |
|---|---|---|---|---|
| V01 | checked | PASS WITH NOTE | `design-spec.md` present and complete | cited at `context/changes/visual-redesign/design-spec.md`, which no longer exists. The file is at `context/archive/visual-redesign/design-spec.md` after the archive move at `7b05886` |
| V02 | checked | PASS | `reviews/plan-review.md` REVISE then SOUND; `change.md` reads `plan_reviewed` | same archive path shift |
| V03 | checked | PASS | six phase commits resolve; guard, contrast and keyboard run files present | gate figures re-run and matched |
| V04 | checked | PASS WITH NOTE | `reviews/impl-review.md` with `## Resolution` and `## Re-verification`, all six dimensions PASS | cited pre-archive path |
| V05 | checked | PASS WITH NOTE | `reviews/design-acceptance.md` with the addendum | cited pre-archive path |
| V06 | checked | PASS WITH NOTE | release identity confirmed three ways above; archive at `7b05886`; roadmap flipped at `8a639f3` | **`103696850548` is a job id, not a run id.** It is the "Typecheck, unit, integration and build" job of run `34747075507`, which is green at the release SHA. The claim is true in substance and mislabelled in form. The same mislabel appears in `docs/SUBMISSION-PACKAGE.md` sections 2 and 5. C08 labels its own job id correctly |

## Checked boxes the auditor could not confirm

Being blunt, as asked. **No checked box failed.** Four checked boxes carry a specific figure or path
the auditor could not confirm as written, none of which changes the box's substance:

1. **D01's "19 integration tests"** matches nothing in the file it cites. That file records 4 files
   and 21 tests.
2. **B03's "21 integration tests"** is attached to two files that hold 15 between them. 21 was the
   whole suite at that point.
3. **V01, V04 and V05** cite `context/changes/visual-redesign/...` paths that the archive move
   retired. Every artifact exists under `context/archive/visual-redesign/`.
4. **V06's "hosted CI run `103696850548`"** names a job, not a run.

Nothing else in any checked box was contradicted by an artifact.

## Date-free rule

`context/**` and `evidence/**` markdown was grepped for calendar dates and each hit was judged.
Allowed and correctly present: the Workers compatibility date in `bootstrap-verification.md`,
promptfoo eval ids of the form `eval-dfe-...` throughout the Champion evidence, invalid-date test
fixtures in `work-log.md`, and application data entered during the walkthrough in `release-2.md`.

Five authored dates remain, one more than the single known exception:

| File | Kind |
|---|---|
| `context/STATUS.md` | the known pre-existing hit, in the `ai-review-pipeline` entry |
| `evidence/champion/hosted-review-run.md` | authored date in the title line |
| `evidence/champion/eval-results.md` | authored date in the title line |
| `evidence/champion/eval-results-8000-superseded.md` | authored dates in two heading lines |
| `evidence/runs/ai-review-live-call.md` | authored date in the title line |

All four new ones are in S-05 Champion evidence and are pre-existing. They are cosmetic, they
invalidate nothing, and they ship in a public repository. Next action: the S-05 evidence owner
removes them from the four title lines.

## Repository payload and reviewer access

The payload audit at `evidence/repo-payload-audit.md` was independently re-verified, not taken on
trust:

- `git grep` for the owner address across the working tree returns nothing, and `git log --all -S`
  across the full history returns nothing. The redaction at `24310bd` holds; `release-1.md` now reads
  `<account-id redacted>`.
- A sweep for OpenRouter keys, Google client secrets, Better Auth secrets and PEM blocks finds no key
  material. The only `sk-or-v1-` matches are literal test fixtures in `tools/reviewer/test/`.
- `D-012` records the public Google client id and no secret; a targeted grep for secret patterns in
  that file returns zero.
- `.gitignore` covers `.dev.vars`, `.env`, `evidence/private/` and the promptfoo working output.
- `README.md` states that reviewer credentials are delivered out of band and are not in the
  repository, and points at `D-010`, which exists and explains why the second account is empty by
  design. This matches the organizer's own instruction in `archive/sources/builder.txt` that the test
  account's access is passed in the form's comment field.
- **H-1 stands: there is no `LICENSE` file.** Confirmed by `ls`. It is an owner decision, not a
  blocker, and nothing in the certification rules requires one.

## Form field coverage

Section 8.1 reproduces the Builder form's 13 fields in the source's exact order with the required
markers correct. Section 9.1 reproduces the joint form's 7 fields, and its note that only four of six
render at phone width matches the organizer thread. Section 9.4 lists what the package cannot fill and
why. The Champion project option named in field 5 matches the source's wording exactly, and the three
pipeline attachments match the three items the source requires.

Required fields the package does not fill, or fills with a placeholder:

| Form | Field | State |
|---|---|---|
| Builder | 1, `Email` | placeholder `[OWNER: course account email]`. Required. Owner only |
| Builder | 4, promotion consent | placeholder `[OWNER: Tak or Nie]`. Required, no default. Owner only |
| Builder | 13, `Twój komentarz` | required and drafted in full, but carries two placeholders: `[KANAŁ]` for the reviewer credential channel and the closing impressions paragraph |
| Joint | 1, `Email` | placeholder. Required. Must match the Builder form |
| Joint | 3, badge selection | placeholder. Required. Evidence supports `Obie odznaki`; the one-round rule makes it irreversible |
| Joint | 7, `Twój komentarz` | drafted, one owner placeholder for the impressions paragraph |

No required field is missing from the package. Every unfilled value is genuinely owner-only: an
enrolled address, a consent, an irreversible badge choice, a credential, or personal testimony. The
package is right to refuse to invent them.

Not a form field but decided at the same moment: the LICENSE choice.

**Timing.** `archive/sources/submission-form.txt` and `architect-champion.txt` both give the final
round's deadline as 14 September 2026, 23:59, with one attempt only and all badges in the same round.
The owner has very little margin. This is the single most consequential fact in this report.

## Goals genuinely missing or blocked

| Goal | Reason | Next action |
|---|---|---|
| W09 | audit half closed by this report; two wording defects found in the maintenance half | status writer corrects the "row per goal" claim and the "does not exist yet" claim, then may check the box |
| B11 | upload not performed; submitted repository URL and reviewer access not verified against the live form; LICENSE undecided | owner decides LICENSE, authorizes upload, then verifies URL and reviewer access post-submission |
| B13 | six placeholder values across two forms | owner supplies email, consent, badge selection, credential channel and two impressions paragraphs |
| B14, B15, B16 | submission and organizer confirmation | owner submits within the round |
| A15, A16, A17 | joint form submission and organizer confirmation | owner submits in the same round as Builder |
| C10 | dynamic fields resolved once at the live read, not re-checked since | re-open both forms at desktop width immediately before filling and confirm the field set is unchanged |
| C11, C12, C13 | joint submission and organizer confirmation | as A15 |
| F02 | no confirmation exists to store | after submission, store both confirmations and the exact attachments and URLs submitted |
| F03 | depends on F02 | final STATUS pass after both submissions |
| G01 | plan review returned REVISE; F1 to F6 open | S-07 implementers resolve and re-verify |
| G03, G04, G05 | S-07 implementation in flight | not part of the certification package; the package must not claim Google sign-in works |

**S-07 in-flight work is excluded from this audit by instruction and noted here only.** Two
implementers are committing under `src/`, `tests/` and `context/changes/google-sign-in/`, and the
shared tree carries an uncommitted `env.d.ts` edit. Nothing S-07 has produced is part of the release
or the package. One carried caveat from the package holds: if Google sign-in ships before submission
it adds a button to the login screen and `release-01-login.png` needs one more retake.

## What was deliberately not done

Nothing under `evidence/private/` was opened. No database was written. Nothing was deployed. No
authenticated request was made against the live instance. Nothing was uploaded or submitted. No
course form was touched. `GOALS.md` was not edited, and no box was checked by this task.

## Readiness

Package ready for the owner's upload confirmation: **yes**, pending items: the six owner-only form
values (course email on both forms, Builder promotion consent, joint form badge selection, the
reviewer credential channel plus the credential values themselves, and the closing impressions
paragraph on each comment); the LICENSE decision; a re-check of both forms' dynamic fields at desktop
width immediately before filling (C10); and, as a cosmetic follow-up that does not block upload, the
four authored dates in the Champion evidence title lines and the four mislabelled figures and paths
named above.

---

# Delta audit at release 4

Independent re-audit of what changed since the report above, which was written at repository HEAD
`57065dc` and pins release 2 (`c842f64` / `84a95549`). Nothing above is rewritten. This section
covers only the delta: the release identity at `bad3f28`, the gates at that commit, the retaken
capture set, package coherence at release 4, a security spot check on the S-07 diff, and the
date-free rule over files added since `866ae3a`.

Audited at repository HEAD `995e2a81a14bd7175b841d9b74f3b3566a557c65` (`995e2a8`), working tree
clean, branch `main` level with `origin/main`. Read-only apart from this section and the auditor's
checkpoint. No login, no deploy, no upload, no secret value printed, no box checked.

## Verdicts

| Item | Verdict | Evidence |
|---|---|---|
| 1. Release identity | PASS | `git rev-parse bad3f28` resolves to `bad3f2816611c00cd691b4ef67f1108d618bed60`. The code delta `c842f64..bad3f28` restricted to `src`, `tests`, `migrations`, `wrangler.jsonc`, `env.d.ts` and `.github` is exactly 14 files, all S-07: the Google sign-in server, client, styling and test files, and `wrangler.jsonc` gaining `"run_worker_first": ["/api/*"]` under `D-014`. Nothing under `migrations/` or `.github/` changed. The rest of the full diff is records: the `visual-redesign` archive move, the release 2 to 4 evidence, checkpoints, decisions and this report. `git log --oneline bad3f28..HEAD -- src tests wrangler.jsonc migrations` is empty; the only three commits after the release are `206dde4`, `7b1bef6` and `995e2a8`, all `docs(...)`. CI: `gh run list --commit bad3f28...` returns exactly one run, `34751198550`, workflow `CI`, completed, conclusion success, head SHA equal to the release SHA in full |
| 1b. Live instance | PASS | Root 200, referencing `assets/index-CLEnPkyw.css` and `assets/index-CQZzLfmQ.js`. `GET /api/me` 401 `{"error":"unauthorized"}`. `GET /api/auth-config` 200, body byte-exact `{"google":true}`. `GET /api/health` 200 `{"ok":true}` |
| 1c. Asset match from the auditor's own build | PASS | A throwaway clone at `bad3f28` with a fresh `npm ci`, `git status --porcelain` empty, emitted `index-CLEnPkyw.css` and `index-CQZzLfmQ.js`. Those are the two filenames the live root document references. The deployed bundle and the audited source are the same build |
| 2. Gates at `bad3f28` | PASS | In that clone, with no `.dev.vars` present and no `GOOGLE_*` value in the environment: `npm run typecheck` exit 0; `npm run test:unit` 18 files / 214 tests, all passed; `npm run test:integration` 12 files / 119 tests, all passed; `npm run build` exit 0. Every figure matches `evidence/runs/release-4.md` and the package |
| 3. Captures | PASS WITH NOTE | Nine of the ten `release-*.png` were last committed at `7b1bef6`, the release record itself. `release-01-login.png` was last committed at `0ae77a9`, which is earlier. See the note below; it is not a defect. All ten were opened as images. Each shows what its slot claims, the data is synthetic throughout (`owner@example.com`, `reviewer@example.com`, Blake, Casey R., Alex), and no password, token, session cookie or client secret is visible in any of them. `release-01-login.png` shows "Continue with Google" beside `Sign in` with both fields empty |
| 3b. Passing-tests capture against the gates | PASS | `release-05-tests-passing.png` shows `bad3f2816611c00cd691b4ef67f1108d618bed60` printed at the top, an empty `git status --porcelain`, the typecheck command, `Test Files 18 passed (18)` / `Tests 214 passed (214)`, `Test Files 12 passed (12)` / `Tests 119 passed (119)`, and the release SHA echoed again under `--- release SHA again ---`. Identical to the counts the auditor obtained independently |
| 4. Package coherence | PASS WITH NOTE | Every current-release mention in both documents names release 4, `bad3f28` in short or full form, Cloudflare version `1d0f71c1-6832-4bc1-aace-5feef621e715` and hosted CI run `34751198550`. Releases 1, 2 and 3 and their versions appear only in passages explicitly labelled history or superseded. The earlier V06 mislabel is now corrected in the package itself, which states that `103696850548` is a job id inside run `34747075507`. See the one stale row below |
| 4b. Attachment sizes | PASS | All ten capture sizes in the section 10 manifest equal `ls -l` exactly, and their sum is the stated 1,000,524 bytes, with 494,080 across the five required rows. `architect-report.pdf` is 118,028 bytes as claimed. The three Champion captures total 1,052,467 bytes as claimed |
| 4c. Form field coverage | PASS | Section 8.1 carries all 13 Builder fields and section 9.1 all 7 joint fields, in the sources' order. Six values are unfilled and every one is clearly marked an owner placeholder: course email on both forms, Builder promotion consent, joint badge selection, the reviewer credential channel, and the closing impressions paragraph on each comment. No required field is missing |
| 4d. Reviewer access | PASS | The section 8 reviewer instructions say the account credentials are delivered separately through a channel the owner names and are deliberately absent from the repository. `README.md` says the same and points at `context/decisions/D-010-live-demo-data-and-reviewer-access.md`, which exists. Both name the gated seed route under `D-005` as how the account was made, and both state it is disabled on the live deployment, which the release 4 smoke re-confirms with a 404 |
| 4e. S-07 caveat | PASS | Truthful. `docs/SUBMISSION-PACKAGE.md` mentions Google exactly twice, in slot 7 and the section 10 manifest, and both say only that the button is present in the login capture. Neither claims Google sign-in works. `docs/SUBMISSION-CHECK.md` states plainly that the live consent roundtrip is not a certification requirement, that neither form asks for a third-party sign-in flow, and that it remains owner work under `GOALS.md` G05 because the consent audience is External in Testing with the owner as its only test user |
| 5. Security spot check on the S-07 diff | PASS WITH NOTE | `git grep -nE 'GOCSPX' $(git rev-list --all)` and `git grep -nE 'GOCSPX' HEAD` are not literally empty, but the only match in every revision is one prose line in `context/checkpoints/g02-finish.md` asserting the opposite: that the brief carries no `GOCSPX` prefix and no literal secret assignment. No secret value exists anywhere in the tree or the history. `.dev.vars` is untracked, confirmed with `git ls-files`; it exists on disk at mode 600 and is covered by `.gitignore` lines 4 to 6, with `.dev.vars.example` explicitly re-included and holding names with empty values only. `git check-ignore -v dist/subscription_splitter/.dev.vars` returns `.gitignore:2:dist/`, so the built copy the implementation review observed is ignored |
| 6. Date-free rule since `866ae3a` | PASS | 26 markdown files under `context/` and `evidence/` changed. Every calendar-date hit falls in an already-allowed category, judged rather than counted: the Cloudflare navigation-request behaviour dates `2025-04-01` and this repository's compatibility date `2026-08-22` in the S-07 research, `D-014` and the `g05-callback-fix` checkpoint; promptfoo eval ids in the Champion evidence and `evidence/index.md`; walkthrough application data in `evidence/runs/release-4.md`; and invalid-date test fixtures plus application data in `evidence/work-log.md`. One authored date remains, in `context/STATUS.md`, and it is the single pre-existing hit the report above already records |

## Notes behind the two PASS WITH NOTE verdicts on the delta itself

**The login capture's commit is earlier than the release record, and that is explained rather than
overlooked.** `release-01-login.png` was last written at `0ae77a9`, "retake the login capture against
release 3". `git merge-base --is-ancestor 0ae77a9 bad3f28` exits 0, so it is an ancestor of the
release. `evidence/runs/release-4.md` states in the open that the file was retaken this pass and came
out byte-identical to release 3's, so git recorded no change. That claim is corroborated rather than
taken on trust: release 4 is configuration only, the auditor's own build at `bad3f28` emits the same
two client asset filenames the live root serves and that release 3 served, and the login screen is one
of the screens the release does not touch. The capture depicts release 4 correctly and shows the
Google button. No action.

**One package row is made stale by this section.** `docs/SUBMISSION-CHECK.md` carries the row
"`GOALS.md` F01 final audit | Done, and pinned to release 2", ending "It predates releases 3 and 4, so
a delta audit for release 4 is the next step". That was accurate when written and is accurate up to
the moment this section lands. The status writer should update that row to name this delta audit. It
is a wording refresh, not a defect, and no goal box depends on it.

**Two cosmetic observations, neither blocking.** `release-05-tests-passing.png` is a real Terminal
window, so it shows a shell login banner carrying a calendar date and the scratchpad path of the
release clone. Neither is a credential and the date-free rule covers authored markdown rather than
what a terminal prints. Separately, three of the four Champion title-line dates the report above
flagged have since been removed: `hosted-review-run.md`, `ai-review-live-call.md` and
`release-3.md` now carry none, and `eval-results.md` retains only its promptfoo eval id.

## What was deliberately not done

No login. No deploy. No write to the database. No authenticated request against the live instance.
Nothing uploaded or submitted and no course form touched. `GOALS.md`, `docs/SUBMISSION-PACKAGE.md`
and `docs/SUBMISSION-CHECK.md` were read and not edited. No box was checked. Nothing under
`evidence/private/` was opened. No nested delegation.

## Readiness

Package ready for the owner's upload confirmation at release 4: **yes**, pending items: the six
owner-only form values (course email on both forms, Builder promotion consent, joint form badge
selection, the reviewer credential channel plus the credential values themselves, and the closing
impressions paragraph on each comment); the LICENSE decision; the C10 re-check of both forms' dynamic
fields at desktop width immediately before filling; and, as follow-ups that do not block upload, the
stale F01 row in `docs/SUBMISSION-CHECK.md`, the one authored date in `context/STATUS.md`, and the
four mislabelled figures and paths the report above names, of which the package has already fixed the
V06 one.
