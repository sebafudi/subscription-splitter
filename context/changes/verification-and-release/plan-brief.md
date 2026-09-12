# Verification and release - plan brief

> Full plan: `context/changes/verification-and-release/plan.md`
> Research: `context/changes/verification-and-release/research.md`

## What and why

Put the whole ledger on the deployed instance and prove it there. Four slices have landed on `main`
and none has ever run against the remote database. This slice applies the four missing migrations,
redeploys from a clean tree, walks the flow in a browser against the result, and captures the
transcript, screenshots and documentation that make the release reviewable by someone who was not
here. Roadmap item S-04, source refs US-01 to US-05 and MS-02.

## Starting point

The live instance is release `149aa44d`, two slices old: it has no member, price, payment,
standing-order or summary route, and the remote D1 carries only migrations `0001` and `0002`. It holds
two seeded accounts and one artefact, a throwaway subscription created by the first deployment's smoke
run, which cannot be re-dated or deleted because `start_month` is not patchable and no subscription
delete route exists, and which has no owner member because it predates `0003`. The gated seed route is
closed and creates accounts only, so it cannot produce demo data. The documentation still says the
scaffold is all that exists. S-03's implementation review has landed, been resolved and been archived
at `0ff74bd`, which is the gate this slice's release SHA has to be at or after.

## Desired end state

The live URL serves the current build over a fully migrated database. An owner signs in to a plan with
months of history behind it, records and edits and deletes a payment, and watches balances that match
a hand calculation move by exactly the amount. A second account signs in to an empty list and is
refused every record by id. The seed route answers 404. That session leaves a redacted transcript and
a named screenshot set behind, and the repository's own documentation describes the product that was
actually shipped.

## Key decisions made

| Decision | Choice | Why | Source |
|---|---|---|---|
| Demo data on the live instance | A fresh demo subscription created through the product, its ledger rows created by the API transcript and its money recorded in the browser | The seed route makes accounts only, and the pre-existing subscription has no owner member so no share can be computed against it | Plan / D-010 |
| Which account a course reviewer gets | The owner account; the second account stays empty on purpose | An empty second account is the isolation demonstration, not an oversight | Plan / D-010 |
| The stray smoke-test subscription | Repaired with an owner member, relabelled, never removed | No `DELETE /api/subscriptions/:id` exists and `start_month` is not patchable, so the choice is anomaly or ordinary empty plan | Plan / D-010 |
| What the live pass may create | Only one subscription and one owner member, both on purpose; everything created to demonstrate a verb hangs off a deletable participant | Subscriptions and owner members have no delete route, so they are permanent on a shared URL | Plan / D-010 |
| Rollback for the remote migration | `d1 time-travel restore` to a bookmark recorded before the apply | It restores the same database in place, so no new database id, no config edit and no redeploy | Research |
| The `d1 export` snapshot | Kept, but as an off-Cloudflare backup rather than the undo | It is the only copy of the two accounts that survives losing the account or the database | Research |
| Dry run before applying | `d1 migrations list --remote` must name exactly the four expected files | It catches the case where the remote database is not where the evidence says | Research |
| When the release SHA may be pinned | Only at or after the commit resolving S-03's implementation review, with the slice archived | S-02 showed that "closed out" precedes the review fixes by two commits | Plan |
| Where infrastructure is documented | A new short `context/foundation/infrastructure.md` | B09 names it and the information exists but is scattered between the README and the stack document | Plan |
| Ordering | Documentation, preparation, migration, deploy, browser, evidence | `mvp-check` grades documentation from the repository, and the snapshot has to precede the only irreversible step | Plan |

## Scope

**In scope:** documentation aligned to shipped behaviour; a release candidate pinned from a clean,
green tree; the remote migration dry run, snapshot and apply; the deploy; a redacted live API
transcript; a browser acceptance walkthrough that creates the demo plan; ten named release
screenshots; the course `mvp-check` run and its fixes; the evidence index, work log and status
hand-off.

**Out of scope:** any upload or submission to the course, its forms or its organizers; any badge
claim; new routes, schema or product behaviour; a subscription delete route; changes to the seed route
or its gate; custom domain, autoscaling, observability; deployment from CI; an end-to-end test
framework; work on S-05.

## Architecture / approach

Nothing is built. The slice is a data migration followed by a deploy followed by a verification pass,
wrapped in documentation before it and evidence after it. The risky step is applying four additive
migrations, seven `CREATE TABLE` and five index statements, to a remote database whose two accounts
exist nowhere else, so it is preceded by a dry run that names exactly what will be applied and by a
recorded Time Travel bookmark that makes the undo a single in-place command. The migration precedes
the deploy, because a new build over an old schema would fail on every screen past the subscription
list. The live pass is planned like a migration too, because the product deliberately has no delete
for a subscription or an owner member.

## Phases at a glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Documentation that describes what shipped | README, AGENTS, PRD, test plan and roadmap corrected; a new infrastructure document | A documentation pass silently becomes a rewrite and invents behaviour the product does not have |
| 2. Release preparation and rollback | A release SHA pinned downstream of S-03's review fixes, green gates, the migration dry run, the Time Travel bookmark, the snapshot, the rollback note, the tests capture | The snapshot contains password hashes and must never be committed |
| 3. Remote migration, deploy, live transcript | Migrations `0003` to `0006` applied remotely, the release deployed, the demo plan created, the stray subscription repaired and relabelled, a redacted live transcript | A migration that fails partway leaves the schema between versions, and anything created as a subscription or owner member is permanent |
| 4. Acceptance walkthrough and screenshots | The demo plan's money recorded in the browser, error and isolation states exercised, ten named captures | The build deployed does not match the SHA quoted, as happened on the first deployment |
| 5. mvp-check, evidence index, hand-off | The five-criterion report and its fixes, index and work-log rows, the status hand-off | Claiming a criterion passed without opening the file that proves it |

**Prerequisites:** S-03's implementation review resolved and `payments-and-recurring` archived, with
the release SHA read at or after that commit; `main` green; the Cloudflare account authenticated in
the executing shell; the gitignored reviewer credentials readable by whoever runs the live pass.
**Estimated effort:** five phases, roughly one session each, with phases 3 and 4 best run as one live
session.

## Open risks and assumptions

- The remote database is assumed to be where the evidence says it is. Phase 2's dry run is what turns
  that assumption into a fact, and the phase stops if it does not.
- Time Travel's thirty-day window is read from the pinned wrangler's help text. Phase 2 confirms it
  against this account before the apply, and stops if it is unavailable.
- Whether an owner member can be added to the stray subscription, whose start month is the month of
  the first deployment, is the repair's first live check. If refused, the row keeps its label and
  stays owner-less.
- The two seeded accounts are assumed to still sign in after the redeploy. The migrations do not touch
  Better Auth's tables, so the expectation is strong; recovery is to reopen the seed route with a fresh
  token and re-seed, which is idempotent.
- Other agents are pushing to `main` concurrently, so the release SHA has to be re-confirmed
  immediately before the deploy rather than at the start of the phase.
- The demo's standing-order months depend on which month is current in the subscription's time zone, so
  the captured screens will look different if recaptured later. They are attributed by release version
  id, and the walkthrough's inputs are recorded as offsets from the plan's start month.
- Handing a reviewer the owner account lets them change the demo data. Accepted: the screenshots are
  the record of the release, and a reviewer exercising CRUD is the product working.
- Credentials reach a reviewer only through the authorized private channel, never a committed file, a
  screenshot or a transcript.

## Success criteria (summary)

- The live URL serves a build whose SHA was read from a verifiably clean tree, over a database
  carrying all six migrations, with the seed route answering 404.
- One browser session against that release shows login and logout, payment CRUD surviving reloads,
  balances matching a hand calculation, and a second account reaching none of it.
- The repository's documentation, evidence index and status file describe that release accurately
  enough that someone who saw none of this work can follow them to it.
