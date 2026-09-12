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
delete route exists. The gated seed route is closed and creates accounts only, so it cannot produce
demo data. The documentation still says the scaffold is all that exists.

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
| Demo data on the live instance | Created through the product by the owner, in the browser | The seed route makes accounts only; creating it through the product is the same walkthrough B08 wants and the same screens B12 needs | Plan / D-010 |
| Which account a course reviewer gets | The owner account; the second account stays empty on purpose | An empty second account is the isolation demonstration, not an oversight | Plan / D-010 |
| The stray smoke-test subscription | Renamed, not removed | No `DELETE /api/subscriptions/:id` exists and `start_month` is not patchable | Research |
| Rollback for the remote migration | A `d1 export --remote` snapshot before applying, kept in gitignored `evidence/private/` | Nothing in `migrations/` reverses and the seeded accounts exist only remotely | Research |
| Dry run before applying | `d1 migrations list --remote` must name exactly the four expected files | It catches the case where the remote database is not where the evidence says | Research |
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
wrapped in documentation before it and evidence after it. The only irreversible step is applying four
additive migrations to a remote database whose two accounts exist nowhere else, so it is preceded by a
dry run that names exactly what will be applied and a snapshot that is the entire rollback plan. The
migration precedes the deploy, because a new build over an old schema would fail on every screen past
the subscription list.

## Phases at a glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Documentation that describes what shipped | README, AGENTS, PRD, test plan and roadmap corrected; a new infrastructure document | A documentation pass silently becomes a rewrite and invents behaviour the product does not have |
| 2. Release preparation and rollback | A pinned clean-tree release SHA, green gates, the migration dry run, the snapshot, the rollback note | The snapshot contains password hashes and must never be committed |
| 3. Remote migration, deploy, live transcript | Migrations `0003` to `0006` applied remotely, the release deployed, a redacted live transcript | A migration that fails partway leaves the schema between versions with no down path |
| 4. Acceptance walkthrough and screenshots | The demo plan created through the product, error and isolation states exercised, ten named captures | The build deployed does not match the SHA quoted, as happened on the first deployment |
| 5. mvp-check, evidence index, hand-off | The five-criterion report and its fixes, index and work-log rows, the status hand-off | Claiming a criterion passed without opening the file that proves it |

**Prerequisites:** `main` green and S-03 landed; the Cloudflare account authenticated in the executing
shell; the gitignored reviewer credentials readable by whoever runs the live pass.
**Estimated effort:** five phases, roughly one session each, with phases 3 and 4 best run as one live
session.

## Open risks and assumptions

- The remote database is assumed to be where the evidence says it is. Phase 2's dry run is what turns
  that assumption into a fact, and the phase stops if it does not.
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
