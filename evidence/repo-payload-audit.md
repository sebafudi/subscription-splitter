# Repository payload audit (B11)

Independent read-only audit of everything this repository publishes, against goal B11: no secrets, no
private records, no proprietary course material, and reviewer access verifiable from what is
committed. The audit fixed nothing; every finding below is reported, not remediated.

Repository: `github.com/sebafudi/subscription-splitter`, default branch `main`, visibility PUBLIC,
184 commits, 431 tracked files. Two other agents were committing to `main` concurrently, so the
findings describe the tree and history as they stood when each command below ran.

No credential value appears in this report. No calendar date appears in it. The private prototype's
`data/`, backups and chat exports were not opened; the prototype was treated as out of scope and only
the application repository was read.

## Commands run

Secrets:

```
git log -p --all | grep -inE '(sk-or-v1-|sk-ant-|ghp_|gho_|AKIA[0-9A-Z]{16}|-----BEGIN .*PRIVATE KEY)'
git log -p --all | grep -E '^\+' | grep -iE '(api[_-]?key|secret|token|password|Bearer |OPENROUTER|credential)'
git log --all --pretty=format: --name-only --diff-filter=A | grep -iE '(\.env|dev\.vars|\.pem|\.key|credential|secret)'
git check-ignore -v evidence/private .dev.vars tools/reviewer/.env
```

Private data:

```
git grep -hoIE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' -- . ':!package-lock.json'
git grep -nIE '\b[A-Z]{2}[0-9]{2} ?[0-9]{4}( ?[0-9]{4}){3,5}\b'      # IBAN shape
git grep -nIE '\+48[0-9 ]{9,}'                                        # phone shape
git grep -nIi 'spotify-family-split'
```

Course material:

```
md5 over every tracked .md/.ts/.txt/.json/.yml file, joined against the same hash set taken over
  archive/ and offline/, looking for identical content
basename join over both sets, looking for filename collisions
for every archive/*.md and offline/*.md: sample its lines longer than 70 characters and grep -F each
  one against the concatenated tracked text of this repository
```

Hygiene and reviewer access:

```
gh repo view --json visibility,defaultBranchRef,url
git ls-files -z | xargs -0 du -k | sort -rn | head -18
git ls-files | sed -E 's/.*\.//' | sort | uniq -c | sort -rn
git fetch origin main && git rev-list --left-right --count HEAD...origin/main
```

Screenshots were opened and read visually, not only by filename: `release-01-login`, `release-02-home`,
`release-04-output-balances`, `release-05-tests-passing`, `release-06-members-and-prices` and
`redesign-09-detail-populated-light`, chosen as the captures most likely to carry real data (the two
populated money views, the credential form, the participant editor and the terminal capture).

## 1. Secrets

**No key material anywhere in the working tree or in the full history. No blocker.**

Every hit on the high-entropy provider prefixes (`sk-or-v1-`, `sk-ant-`, `ghp_`, `github_pat_`,
`AKIA`, PEM headers) resolves to the same placeholder string, `sk-o...` followed by the literal word
`test`, used in `tools/reviewer/test/model.test.ts` and quoted in prose in earlier evidence files. The
repository has never tracked an `.env`, `.dev.vars`, `.pem`, `.key` or credential file: the
add-filter walk over all of history returns exactly one path, `.dev.vars.example`, which lists
variable names with empty values and nothing else.

Every keyword hit on `secret`, `token`, `password` and `credential` is one of: a `package-lock.json`
dependency name, a React password field, a workflow reference to `${{ secrets.OPENROUTER_API_KEY }}`
(a name, not a value), or a self-labelled test constant. The two test constants are
`integration-test-secret-not-for-production` and `integration-test-seed-token`, both used only inside
the integration harness, and the one test password is the well-known xkcd passphrase.

`.gitignore` covers env material correctly and with the right precedence: `.dev.vars`, `.dev.vars.*`
with a negation for `.dev.vars.example`, `.env`, `.env.*` and `.env.production`. `git check-ignore`
confirms `.dev.vars` (present on disk, untracked), `tools/reviewer/.env` and `evidence/private/`
(present on disk, untracked) are all matched.

`wrangler.jsonc` carries one binding value, the D1 `database_id`. That is an account-scoped resource
identifier, not a credential: reaching the database still requires the Cloudflare API token, which is
not in the repository. It is required in the file for `wrangler deploy` and `d1 migrations apply
--remote` to work, so it is correct that it is committed. Severity: note only.

The two workflow files handle secrets properly. `ai-review.yml` sets `permissions: {}` at the top,
grants the review job only `contents: read` and `pull-requests: write`, passes the OpenRouter key
through the environment rather than the command line, and has a dedicated job that explains why a
fork pull request gets no review, which is the correct reason a secret is withheld rather than a
misconfiguration. `ci.yml` grants only `contents: read` and needs no secret at all.

## 2. Private data from the prototype

**No prototype content in the repository. No blocker.**

`spotify-family-split` is named in seven tracked files, in every case as a prose statement that it is
a private read-only reference whose domain semantics were reused and whose code, data and backups
were not. No path under the prototype's `data/`, `backup` or export directories is referenced
anywhere in the tree.

Every email address in tracked, non-lockfile content is in a reserved example domain: 20 uses of
`owner@example.com`, 3 of `reviewer@example.com`, and roughly forty single-use addresses named after
the test they belong to (`seed-wrong-token@`, `summary-price-change@`, `throttle-target@` and
similar), all on `example.com` or `example.test`. That naming pattern is itself the evidence that the
fixtures are synthetic: each address describes a scenario rather than a person, and the set contains
no address that would resolve to a real mailbox.

Grep for IBAN-shaped and Polish phone-shaped strings returns nothing across the whole tree. The
personal names that appear in the product data are `Alex`, `Blake`, `Casey R.`, `Bo`, `Ada`,
`Organizer`, `Owner`, `Me` and `Reviewer`, which are placeholder given names with no surname
attached; the two plan names are `Family music plan` and `Family plan`. The amounts are round
figures in the 40 to 660 range with one deliberate 39,99 and 20,01 to exercise rounding, which is a
constructed arithmetic example rather than a real bill.

The screenshots agree. The populated money views show the placeholder names above against those
amounts. The login capture shows both credential fields empty. Nothing in any opened capture shows a
real person, a real bank reference or a real subscription.

Two real-world identifiers do appear, and they are the subject of the one fix-before-submit item
below.

### Finding P-1: personal email address and Cloudflare account id in committed evidence

Severity: **fix-before-submit**.

`evidence/runs/release-1.md:79-81` contains the full output of `npx wrangler whoami`, which includes
the repository owner's personal email address twice and the Cloudflare Account ID
`b0c7...` once, in a public repository. The surrounding prose explains why the output was recorded in
full rather than as its warning alone, so this is a deliberate choice rather than an accident, and the
account id is not a credential: it is an identifier, and account access is gated by the API token,
which is absent. The exposure is a privacy one, not a security one. The token scope list printed
beneath it is a legitimate and useful part of the record and does not need to change.

The point of the evidence is the token's scope, which survives redaction intact. Replacing the email
and the account id with a redaction marker, and noting that the values were removed, keeps the
evidence's purpose and removes the personal data. Reported, not fixed.

### Finding P-2: machine hostname and local paths in tracked content

Severity: **note**.

`evidence/screenshots/release-05-tests-passing.png` shows a shell prompt carrying a personal username
and a corporate machine hostname, plus the absolute scratch path of the run. `evidence/runs/release-1.md`
states that the long scratch path is visible as it really is, so this too is deliberate, and the
capture's value is that it is an unedited photograph of a real terminal. Twenty tracked files
additionally contain `/Users/<user>/` absolute paths, concentrated in `context/map/`,
`context/changes/hono-*` and `context/domain/`, where they point at the external Hono clone that was
analysed. None of these discloses anything exploitable. They are ordinary local-path noise that a
reader may notice.

### Finding P-3: a committed file names the on-disk location of an OpenRouter key

Severity: **note**.

`context/archive/ai-review-pipeline/model-selection-update.md:5` records that the OpenRouter key lives
in the workspace root `.env` at an absolute local path, and explicitly instructs that its contents not
be printed, committed or copied into evidence. The value is not present and the path is outside this
repository and not reachable by anyone reading it. The instruction it carries is the correct one. It
is recorded here only because the sentence advertises where a key is kept.

## 3. Proprietary course material

**No course material is reproduced. No blocker.**

Content hashing found zero byte-identical files between the 227 tracked text files and the 285 text
files under `archive/` and `offline/`. Filename comparison found exactly one collision, `mvp-check.md`.
It is not a copy: `archive/toolkit/.ai/prompts/mvp-check.md` is the Polish prompt with YAML
frontmatter, and `context/archive/verification-and-release/mvp-check.md` is this project's own report
produced by running that prompt, written in English, opening by naming the prompt it answers and the
release commit it was run at. It shares the prompt's section structure and its two status markers and
none of its text. Producing the report is the intended use of the prompt.

The line-level sweep, which greps every line longer than 70 characters from every course markdown file
against this repository's concatenated tracked text, returned nine matches. All nine are scaffolding
that the course's own `10x-init` skill writes into a project's `context/` directory: the short
descriptive READMEs at `context/archive/README.md`, `context/changes/README.md` and
`context/foundation/README.md`, one table header, one schema sentence, and the one-line progress
convention quoted at the top of each plan's Progress section. These are generated project files, not
lesson text, and two of them carry a `Project adaptation:` paragraph written for this project on top
of the generated wording. Nothing under `archive/toolkit/.ai/**` is reproduced: no prompt file, no
`SKILL.md`, and no `references/*.md` exists anywhere in the tree, including the
`references/progress-format.md` that several plans cite by path without carrying.

Adapted process documents under `context/` are original prose throughout. The decision records, the
foundation documents, the change folders and the Hono analysis are all this project's own writing.

## 4. Reviewer access

**Verifiable from the repository, and no credential is in it. No blocker.**

The README carries a complete setup path for a reviewer who wants to run the project: prerequisites
(Node 22 or newer and npm), install, the `.dev.vars` copy step with every variable named and
explained, the four run commands, the four test commands, the two migration commands, and an explicit
first-run sequence against a clean local database that orders migrate, build, `dev:worker` and
`seed:local` correctly and explains why the build has to come before `dev:worker` on a fresh clone.
It states that six migrations exist, `0001_auth.sql` through `0006_recurring.sql`, and that a clean
database gets all of them from one call.

The live URL is given in the Deploy section: `https://subscription-splitter.sebastianfudalej.workers.dev`.
The README states that the remote database is separate from the local one and shares no data with it.

No reviewer credential is in the repository, and the design is what keeps it out rather than a habit
of omission. Decision D-005 records that the accounts are created through a gated, idempotent seed
route whose credentials are supplied in the request body at seed time, so that no credential appears
in source, in a fixture or in a committed file, with local values in the git-ignored `.dev.vars` and
`.dev.vars.example` listing names only. That holds in the code: `scripts/seed-local.mjs` reads every
credential out of `.dev.vars` at runtime and has no default. Both seed gates are described as removed
from the live Worker after seeding, so the route answers 404 there.

Decision D-010 records how a reviewer gets in. A reviewer who needs to see data is given the owner
account's credentials, delivered only through the authorized private channel and never written into a
committed file, a screenshot or a form field that is not the form's own credential field. The
`reviewer@example.com` account is deliberately empty and is named in the submission comment as the
second account proving ownership isolation. The screenshot
`evidence/screenshots/release-09-reviewer-sees-nothing.png` is the captured proof of that isolation,
and the login capture confirms the credential fields were empty when photographed.

### Finding R-1: the README does not point at the reviewer access decision

Severity: **note**.

The README's Deploy section points a reader at D-010 for what the deployed instance holds and which
account a reviewer is given, which is correct. It does not say anywhere near the top that reviewer
credentials are delivered out of band and are deliberately absent from the repository. A reviewer who
reads only the README and looks for a login will find the live URL and no account. One sentence near
the live URL would close that gap. Everything needed is already written down in D-010; only its
signposting is thin.

## 5. Repository hygiene for reviewers

Default branch `main`, visibility PUBLIC, and the working branch is level with `origin/main` at audit
time. Both CI workflows are scoped to `main`.

`package.json` backs the instructions the README gives. `npm test` exists and chains `test:unit` then
`test:integration`; `typecheck`, `build`, `dev`, `dev:worker`, `preview`, `db:migrate:local`,
`db:migrate:remote` and `seed:local` all exist and match the README's usage of them. `package-lock.json`
is committed, so `npm ci` resolves, and `ci.yml` runs exactly `npm ci`, `npm run typecheck`,
`npm run test:unit`, `npm run test:integration` and `npm run build` on every push and pull request to
`main`. The README tells a reviewer to run `npm install` rather than `npm ci`, which is the right
advice for this project because the install has to approve the `workerd` and `esbuild` build scripts
and the README explains that step and the `fsevents` warning that accompanies it.

### Finding H-1: no LICENSE file

Severity: **note**.

The repository is public and tracks no LICENSE or COPYING file, and `package.json` sets
`"private": true` with no `license` field. A public repository with no license is all rights reserved
by default, so a reviewer may clone and read it but has no granted right to reuse it. That may be
exactly what is intended for a course submission. It is recorded so the choice is deliberate rather
than accidental.

### Finding H-2: file sizes and binary content

Severity: **note**, no action needed.

147 PNG files and one PDF are tracked. The largest tracked file is
`evidence/champion/ai-review-pr-comment.png` at 884 KB; the next fourteen run from 676 KB down to
288 KB, and every one of them is a screenshot or a design reference image that the evidence trail
cites. The only non-image file in the top fifteen is `tools/reviewer/package-lock.json` at 544 KB,
which is a lockfile and belongs there. The whole `.git` directory is 41 MB, which is unremarkable for
a repository carrying 147 screenshots, and it clones without any special handling. No stray archive,
no build output, no database file and no media file unconnected to the evidence trail is tracked.
`dist/`, `node_modules/`, `.wrangler/`, `coverage/`, `evidence/private/` and `analysis/` are all
ignored and all absent from the tracked set.

### Screenshot content

All 86 files under `evidence/screenshots/` are product or terminal captures: 10 named `release-*`,
49 named `redesign-*` in light and dark pairs, and the rest feature captures from the payments,
recurring and detail slices. The six opened visually show synthetic data only, per section 2. The
remaining captures are the same application screens under the same seeded plan, in the other theme or
at the other viewport, which is what the light and dark and mobile suffixes in their names denote.
Nothing in the set shows a real person, a real payment or a real bank reference. The one capture
carrying a real-world identifier is `release-05-tests-passing.png`, covered as finding P-2.

## Verdict

**Publishable after: redacting the personal email address and the Cloudflare account id in
`evidence/runs/release-1.md` (finding P-1).**

There is no blocker. No secret, no key material and no credential exists in the working tree or in any
of the 184 commits, the ignore rules cover every env file correctly and always have, no content from
the private prototype is present, and no course material is reproduced. Reviewer access is documented,
the live URL is published, and reviewer credentials are correctly absent by design rather than by
oversight.

P-1 is the one item worth changing before the repository is handed to a reviewer, and it costs one
edit that leaves the evidence's meaning intact. The notes below it, P-2 and P-3 on local identifiers,
R-1 on README signposting, and H-1 on the missing license, are each a judgment call the author may
reasonably decline; none of them affects whether the repository is safe to publish.
