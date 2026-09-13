# Checkpoint: g05-close

- **Task**: `g05-close` (S-07, goal G05: consent roundtrip recorded, change archived)
- **Model**: Opus
- **Status**: complete; roundtrip recorded, `google-sign-in` archived, roadmap S-07 `done`, pushed

## The roundtrip, and how it is recorded

The owner reports that Google sign-in works on live release 4,
`bad3f2816611c00cd691b4ef67f1108d618bed60` at Cloudflare version
`1d0f71c1-6832-4bc1-aace-5feef621e715`: consent completed from the live button, a return to the
application root signed in to a new account with an empty Home, a sign-out, and a second sign-in
returning to the same account. Nothing here watched the consent screen, so that is written as the
owner's report and the database queries are the check on it, not a substitute for it.

## D1 corroboration, counts only

Read-only, against the remote database, with table and column names read from
`migrations/0001_auth.sql` first rather than recalled. No address, name or identifier was selected,
printed or recorded.

| Query | Result |
|---|---|
| `account` rows with `providerId = 'google'` | 1 |
| `account` rows with `providerId = 'credential'` | 2 |
| `account` rows, total | 3 |
| `user` rows | 3 |
| users carrying more than one `providerId` | 0 |
| `session` rows joined to a google `account` | 1 |
| `session` rows, total | 18 |
| subscriptions owned by users with no google account row | 2 |
| subscriptions owned by the google account's user | 1 |
| distinct subscription owners | 2 |
| that google subscription created at or after its account row | 1 |

**Corroborated.** The google `account` row holds a `scope` value and no `password`, the shape the
library writes after a token exchange, and nothing local can put it on the remote database. Users
went from the two D-005 seeded accounts to three with both `credential` rows intact and no user
carrying two providers, so the identity created its own account rather than being linked onto the
seeded owner: D-013 holds in production and not only in the options test. The demo owner's
subscription count is 2 across the same two distinct owners, unchanged from the release 4 record.
The google account's single subscription postdates its own account row, which is consistent with the
empty Home reported without proving it.

One trap worth carrying forward: `account.createdAt` is declared `INTEGER` in the migration but the
library writes text into it, and SQLite orders every integer before every text value, so a
millisecond comparison against that column returns a confident wrong answer that reads like a
finding. Both sides are parsed with `strftime('%s', ...)`. The first two attempts at the ordering
query were wrong in opposite directions before the column types were checked.

## Progress rows: none to tick, and why

`plan.md` had zero `- [ ]` rows before this task. The plan deliberately kept the live roundtrip out
of Progress, under "The live gate, outside this Progress", on the ground that nothing in the plan
could make it pass. So no row was ticked and none was invented. That section now carries a
**Closed.** paragraph instead, naming release 4, the two checks that passed before consent
(`No migrations to apply!` on the remote D1, and the social call answering 200 with an
`accounts.google.com` url rather than 403 `INVALID_CALLBACK_URL`), and the owner's roundtrip.

## What was done

- **Evidence.** `evidence/runs/release-4.md` gains a "Consent roundtrip" section: the owner's report,
  the eleven queries with their results, what each number supports and what it does not, the
  timestamp-typing note, and what is still not claimed.
- **Archive.** `git mv context/changes/google-sign-in context/archive/google-sign-in`, all nine files
  preserved as renames. `change.md` takes `status: archived` and a `## Closing note` naming release 4,
  the D-014 callback fix, the roundtrip and the External-in-Testing audience. Seventeen
  self-references inside the moved folder now point at the archive path, across `frame.md`,
  `plan.md`, `plan-brief.md` and the three files under `reviews/`.
- **Roadmap.** S-07 is `done` in the item body, whose Change ID line gains the archive path in the
  style S-04 and S-06 use, and `## Done` takes one entry with the release, the version and a lesson.
  S-07 has no `## At a glance` row to flip, and none was added.
- **AGENTS.md.** Now says the ledger `F-01` through `S-07` is archived and no roadmap item is open.
  A first draft said "there is no active change", which is false: `context/changes/` still holds
  `hono-refactor-opportunities` and `hono-request-dispatch-analysis`, both external-project work.
- **README.md.** One sentence in the Stack paragraph: Google sign-in is available on the deployed app
  alongside the password form, and a first Google login creates its own separate account with an
  empty subscription space rather than joining an existing password account (D-013).
- **Work log.** One entry appended.

## The lesson recorded on the roadmap

A platform's static-asset layer can answer a request before the application code runs, so a route
every `fetch` reaches can still be unreachable as a top-level browser navigation. When something
passes the whole suite locally and fails only on the deployment, the asset layer intercepting
navigations is the natural first candidate rather than the last, because `Sec-Fetch-Mode: navigate`
is the single header separating the two request shapes and the Workers test pool runs no asset layer
at all, so no test there can fail on it.

## Commits

- `1afc1f8` docs(release-4): record the Google consent roundtrip and its D1 corroboration
- `64562b6` chore(archive): close google-sign-in
- `5ade84a` docs(roadmap): mark s-07 done
- `7ad3950` docs: record google sign-in as shipped and the ledger through s-07 archived
- `af84ef0` docs(work-log): record the s-07 close and the consent roundtrip
- this checkpoint

Pushed to `origin/main`.

## Deliberately left as written

The archived `context/archive/visual-redesign/change.md` still points the login amendment at
`context/changes/google-sign-in/design-delta.md`, the path that was current when it was written.
Archived folders are read-only by convention and every earlier archive was closed the same way, so
historical records keep their paths. The same applies to `context/STATUS.md`, `evidence/index.md`,
the earlier checkpoints and `evidence/runs/`, all of which were out of this task's scope in any case.

## Changed paths

- `evidence/runs/release-4.md`
- `context/changes/google-sign-in/` → `context/archive/google-sign-in/` (9 files)
- `context/foundation/roadmap.md`, `AGENTS.md`, `README.md`, `evidence/work-log.md`
- `context/checkpoints/g05-close.md`

Nothing under `src/`, `tests/`, `migrations/`, `context/STATUS.md`, `evidence/index.md`, the
workspace `GOALS.md` or `docs/` was touched. No deploy, no secret written, no course upload.

## Next action

None for S-07. The remaining open items belong to the owner: the decisions and the explicit upload
confirmation for the submission package, and the final status pass.
