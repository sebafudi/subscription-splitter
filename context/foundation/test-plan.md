# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1-§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: at S-04, change `verification-and-release`, phase 1. This repository records progress
> by slice ID, change ID and commit, not by date.

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost x signal.** The cheapest test that gives a real signal for the risk wins. The money
   calculation is a module with no storage dependency precisely so its boundary cases are unit tests,
   not browser runs. Do not promote a case to the browser because the browser feels safer.
2. **User concerns are first-class evidence.** The organizer's stated fear - quietly absorbing money
   because the sheet was wrong - carries the same weight as a requirements line.
3. **Risks are scenarios, not code locations.** This plan documents what could fail and why we
   believe it is likely. It does not claim to know which line owns the failure; research during each
   rollout phase produces that. Where the two disagree, research is the ground truth.

Hot-spot scope used for likelihood weighting: none available at F-01, when this plan was written. The
repository had no application code and no commit history over source, so likelihood was argued from
the domain and from the requirements, never from churn. Four slices have shipped since and the
likelihoods have not been re-weighted from their churn, deliberately: the risk map is the target and
every risk on it is now defended, so re-ordering it would change nothing about what is tested. §2.1
records where each defence actually lives.

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by risk = impact x likelihood.
Risks are failure scenarios in user terms, not test names. The Source column cites the evidence that
surfaced the risk, never a place where the failure lives.

| # | Risk (failure scenario) | Impact | Likelihood | Source (evidence - not anchor) |
|---|---|---|---|---|
| 1 | A balance is wrong by a few grosze or by a whole month: the share is mis-rounded, the owner's residual is dropped or double-counted, a participant is charged for a month outside their active range, a price change is applied to the wrong months, or a skipped month still creates liability. | High | High | requirements §Success Criteria guardrail "no month loses or invents money"; §Business Logic; US-01, US-03, US-04 |
| 2 | One account reads or changes another account's records, or an unauthenticated request gets data: a read, an update or a delete accepts a foreign identifier, or a child record is reached through a parent that belongs to someone else. | High | High | requirements §Access Control; US-05; guardrail "no account can read or change another account's records"; roadmap S-01 risk line |
| 3 | A record that appeared to save is gone or altered after a reload, a restart or a migration: a payment edit half-applies, a delete removes more than it should, or a migration leaves the remote database behind the code. | High | Medium | requirements §Non-Functional Requirements persistence line; roadmap S-04 risk line |
| 4 | A standing order is counted for a month it should not cover: a month that is skipped, not yet elapsed, outside the participant's active range, or explicitly marked as not received, making collected money look higher than it is. | High | Medium | requirements FR-019, FR-020, FR-026; roadmap S-03 risk line |
| 5 | A charged month with no active participants breaks the calculation instead of falling to the organizer, by dividing by zero or by dropping the month's cost from the totals. | Medium | Medium | requirements §Open Questions item 4; §Business Logic |
| 6 | A session outlives its sign-out or its expiry, so a signed-out browser still reaches records, a cross-origin request is accepted, or repeated sign-in attempts are cheap enough to work through a password list. | High | Medium | requirements FR-002, §Non-Functional Requirements sign-in line; decision D-001, whose spike configured the origin and rate-limit checks without exercising them |

### Risk Response Guidance

| Risk | What would prove protection | Must challenge | Context research must ground | Likely cheapest layer | Anti-pattern to avoid |
|---|---|---|---|---|---|
| #1 | For any month, the sum of what every participant owes plus what the organizer absorbs equals the plan cost for that month, across price changes, joins, leaves, rejoins and skipped months. | That a share equal for everyone means the month balances; the residual is where the error hides. | The active-range semantics, the effective-dated price lookup, and which month counts as current. | unit, against the calculation module | Copying the expected value out of the implementation rather than from the worked example in US-01. |
| #2 | A request from account B naming any record of account A is answered as absent, for reads, updates and deletes, including a child record reached through a foreign parent; no session returns nothing at all. | That checking a session proves ownership. Authentication is not authorization. | The ownership path from every record type back to its subscription, and the shape of the not-found response. | integration, against a local database with two seeded accounts | Testing only the top-level resource and assuming children inherit the check. |
| #3 | A record written, edited and deleted through the real entry points reads back correctly after the process restarts, and a fresh database brought up by the migrations matches what the code expects. | That a successful response means the write landed. | The migration sequence, the transactional boundary of an edit, and what a delete is allowed to cascade to. | integration, against a local database | Asserting on the response body only, never re-reading the stored record. |
| #4 | Collected money for a month counts a standing order only when that month is elapsed, active for the participant, not skipped and not excepted; the interface shows the assumed part separately. | That a standing order in range means money arrived. | The elapsed-month rule relative to the subscription time zone, and the exception lookup. | unit for the rule, integration for the stored exceptions | Testing a single mid-range month and never the four boundaries that make the rule hard. |
| #5 | A charged month with nobody active still adds its full cost to the plan total and to the organizer's net cost, nobody owes a share, and nothing throws. | That this input is invalid. It is a defined state and must stay one. | The definition of active count and where the division happens. | unit | Asserting only that no error is thrown, without checking the totals moved correctly. |
| #6 | After sign-out the previous session reaches nothing, an expired session reaches nothing, and repeated failed sign-ins stop being useful to an attacker while a mistyped password still lets the organizer in. | That deleting a cookie ends a session. | Where session state lives, how it is invalidated, and what the failed-attempt counter is keyed on. | integration | Only testing sign-in success; the invalidation path is the one that fails silently. |

### 2.1 Where each risk is defended now

Written after the four ledger slices landed, naming the files that carry the protection. A risk with
no file against it is not defended, whatever this plan says about it.

| # | Where the protection lives | Layer |
|---|---|---|
| 1 | `src/domain/calc.test.ts` and `src/domain/money.test.ts` carry the month-balancing table as hand-computed literals, including two remainder rows, and pin the rounding rule against truncation at the helper and again through `computeSummary`. `src/domain/prices.test.ts`, `src/domain/members.test.ts` and `src/domain/month-status.test.ts` cover the effective-dated lookup, the active-range semantics and the one rule that decides a member month. `tests/integration/summary.test.ts` holds the US-01 worked example to the minor unit through the API. | unit, plus one integration case |
| 2 | `tests/integration/subscriptions.test.ts`, `members.test.ts`, `prices.test.ts`, `payments.test.ts` and `recurring.test.ts` each carry the four cross-account cases and the wrong-parent case inside one account, for every verb the resource offers. `tests/integration/router-isolation.test.ts` asks each router on its own, which is what proves a module's own session middleware rather than a sibling's. | integration |
| 3 | The local half: create-then-refetch with every field re-read, atomic range replacement, the earliest-price-delete recompute and the exception drop, across `tests/integration/members.test.ts`, `prices.test.ts`, `payments.test.ts` and `recurring.test.ts`; `tests/integration/member-removal.test.ts` pins the dependents refusal at the repository rather than at the route; and all six migrations apply in order to a clean database on every integration run through `tests/integration/apply-migrations.ts`. The remote half is not defended by a test and cannot be: "a migration leaves the remote database behind the code" is a fact about one live database, so it is answered by the release slice's own migration and live pass under change `verification-and-release`, and re-answered whenever that database is migrated again. The reload half is answered by that slice's cold re-read in a session carrying no cookie from the walkthrough. | integration, plus a live pass for the remote and reload halves |
| 4 | `src/domain/recurring.test.ts` tests each of the six conditions as a pair against one state, so exactly one condition moves between the halves, with the not-yet-elapsed bound asserted twice. `tests/integration/recurring.test.ts` proves the same rule against stored exceptions, and `tests/integration/summary.test.ts` asserts the two expressions of the rule agree as sets of months rather than as totals (decision D-008). | unit for the rule, integration for the stored half |
| 5 | `src/domain/calc.test.ts` covers the zero-active month: the share is nothing, the month's cost still reaches the plan total and the organizer's net cost, and nothing throws (decision D-006). Not exercised live, and recorded as such. | unit |
| 6 | `tests/integration/auth.test.ts` covers sign-out invalidation by replaying the ended session, an expired session, cross-origin refusal, sign-up refusal, and per-address throttling that distinguishes the custom sign-in rule from the library's own, with a different-address case proving the key. `src/server/auth.test.ts` covers the fail-closed behaviour when `APP_ORIGINS` resolves to no usable origin. | integration, plus one unit case |

## 3. Phased Rollout

Each row is a discrete rollout phase that will open its own change folder via `/10x-new`. Status
moves left-to-right through the values below; the orchestrator updates Status as artifacts appear on
disk. Phases are sequenced to the roadmap slice that produces the code under test, so the highest
risk is defended at the first moment it can be.

| # | Phase name | Goal (one line) | Risks covered | Test types | Status | Change folder |
|---|---|---|---|---|---|---|
| 1 | Ownership and session integration | Prove risks #2 and #6 against a local database with two seeded accounts, as part of roadmap S-01 | #2, #6 | integration | complete | `context/archive/runtime-auth-slice/` |
| 2 | Money calculation coverage | Prove risks #1 and #5 against the calculation module, as part of roadmap S-02 | #1, #5 | unit | complete | `context/archive/members-and-price-history/` |
| 3 | Persistence and recurring rules | Prove risks #3 and #4 through real write, edit, delete and re-read paths, as part of roadmap S-03 | #3, #4 | unit + integration | complete | `context/archive/payments-and-recurring/` |
| 4 | Smoke flow and gates | One browser walkthrough of sign-in to balance against the deployed instance, and the gates wired in CI, as part of roadmap S-04 | cross-cutting | manual browser walkthrough + gates | in progress | `context/changes/verification-and-release/` |

The gates half of phase 4 landed early, with S-01: `.github/workflows/ci.yml` has run typecheck, the
unit suite, the integration suite and the build on every push and pull request since. The walkthrough
half is deliberately manual. No end-to-end framework is installed and none is planned for this
milestone: S-02 and S-03 were each walked by hand in a real browser against the local dev server, with
screenshots kept under `evidence/screenshots/`, and S-04 repeats that against the deployed instance.
§4 records the consequence, and §7 records what that costs.

## 4. Stack

The classic test base for this project. The runners came in with the slices that needed them and are
pinned to exact versions in `package.json`, as every dependency in this repository is.

| Layer | Tool | Version | Notes |
|---|---|---|---|
| unit | Vitest | `4.1.11` | Runs the calculation module and the validation schemas directly; no runtime bindings needed. Collects `src/**/*.test.ts`, so a test outside `src/` or named `.tsx` is not collected. 15 files. |
| integration | Vitest with `@cloudflare/vitest-pool-workers` | `0.22.0`, over `wrangler` `4.131.1` | Runs inside the Workers runtime against a local D1, with every file in `migrations/` applied by `tests/integration/apply-migrations.ts`. Collects `tests/integration/**/*.test.ts`. 11 files. |
| e2e | none installed | n/a | Playwright was planned here and was not brought in; the smoke flow is walked by hand instead. See §3 Phase 4 and §7. |
| component | none installed | n/a | No DOM environment and no testing library, so React component behaviour has no harness. Recorded as a gap rather than a principled exclusion; see §7. |
| API mocking | none | n/a | The product calls no external service, so there is no network edge to mock. |
| accessibility | none | n/a | Deliberately out of scope; see §7. |

The reviewer package in `tools/reviewer/` carries its own suite, its own `tsconfig` and its own
runner, and the root `npm test` and `npm run typecheck` do not reach it. It is run from that directory.

**Stack grounding tools (current session):**
- Docs: none consulted - the stack is fixed in `context/foundation/tech-stack.md` and no version was
  pinned at this point; checked: at F-01.
- Search: none - not used.
- Runtime/browser: none - the application does not exist yet; checked: at F-01.
- Provider/platform: none consulted - deployment and its remote database are set up in roadmap S-04;
  checked: at F-01.

## 5. Quality Gates

The full set of gates that must pass before a change reaches production. "Required for §3 Phase N"
means the gate is enforced once that rollout phase lands; before that, the gate is planned.

| Gate | Where | Required? | Catches |
|---|---|---|---|
| typecheck | local + CI | required, enforced | type drift across the calculation, the routes and the client. `npm run typecheck` covers all three tsconfig projects |
| unit | local + CI | required, enforced | money rule regressions |
| integration on a local database | local + CI | required, enforced | ownership, session and persistence regressions |
| production build | local + CI | required, enforced | a change that typechecks and tests but does not bundle |
| browser walkthrough | local, by hand, per slice | required, not automatable here | the whole flow failing to hold together. It is not a CI gate, because no end-to-end framework is installed; the evidence is the screenshot set kept per slice under `evidence/screenshots/` |
| migrations applied to the deployed database | before release | required at §3 Phase 4 | code ahead of the remote schema. Checked with `wrangler d1 migrations list --remote`, which reports without writing, before the apply |

## 6. Cookbook Patterns

How to add new tests in this project. Each sub-section is filled in once the relevant rollout phase
ships; before that, the sub-section reads "TBD - see §3 Phase N."

### 6.1 Adding a unit test for the calculation

- The file goes beside the module it exercises, `src/domain/<module>.test.ts`, and the unit runner
  picks it up from `src/**/*.test.ts`. Nothing under `src/domain/` imports D1, Hono or the server, so
  the test needs no bindings and no setup file.
- Build the input as a `SubscriptionState` value through a small local `state()` helper that fills
  the whole shape and takes a `Partial` override, so each case names only the one thing it is about.
  Members, prices and break months are plain synthetic literals; never read a fixture out of a
  database or a prototype.
- Assert in integer minor units. `10000` is 100.00, and the expected number is computed by hand
  before the assertion is written, never read out of the implementation or copied from a failing
  run's actual value. A test that agrees with the code by construction proves nothing.
- Pass the current month explicitly wherever the rule takes one. The not-yet-elapsed boundary is its
  own failure mode, so a case that means "this month" says so rather than leaning on a month list
  that happens to stop in the right place.
- Write the case so it fails first, and read the failure. A money test that passes on the first run
  is usually asserting something other than what it names.

### 6.2 Adding an integration test against the local database

- The file goes in `tests/integration/` and ends in `.test.ts`, which is what the integration runner
  collects. It runs inside the Workers runtime, so it reaches the real bindings: `env.DB` is a local
  D1 with every file in `migrations/` already applied by the setup file, and the test-only values for
  `BETTER_AUTH_SECRET`, `APP_ORIGINS` and the two seed gates come from `vitest.integration.config.ts`.
- Exercise the route, not the repository, unless the point of the test is something a route cannot
  reach. `tests/integration/member-removal.test.ts` is the exception that shows the rule: it goes
  under the route deliberately, because the property it pins is that no second caller can cascade
  past a refusal.
- Take a client-address prefix of your own from `tests/integration/accounts.ts`. The sign-in limiter
  is database-backed and keyed per address, and the test database is shared across the run and never
  reset, so reusing another file's prefix surfaces as a sign-in that looks flaky.
- Re-read what you wrote. A 2xx response is not evidence that the row landed; fetch it back and
  assert the fields, which is the anti-pattern risk 3 names.
- Assert money in integer minor units, computed by hand before the assertion is written, exactly as
  §6.1 requires of a unit test.
- Add the ownership cases from §6.3 for any new resource. They are not optional, and they are the
  reason this layer exists at all.

### 6.3 Adding an ownership test for a new resource

Every new child resource gets this test, and it asserts absence rather than a permission error: a
foreign identifier is 404, never 403. The slice that added members, prices and break months wrote it
three times; copy that shape.

- Seed two accounts in one file and sign both in, taking a client-address prefix of your own from
  `tests/integration/accounts.ts`. The sign-in limiter is database-backed per address and the test
  database is shared and never reset, so a file that reuses another file's prefix fails as what looks
  like a flaky sign-in.
- Four cross-account cases: account B naming A's parent, and A's child, gets 404 from every verb the
  resource offers, reads and writes alike, not only from the one the route was written for.
- One wrong-parent case inside a single account: that account creates two subscriptions and names the
  first one's child through the second one's id, expecting 404 from every verb. This is the case that
  matters most. A repository that keeps `s.user_id = ?` and drops `s.id = ?` passes all four
  cross-account cases and fails only this one.
- One 401 case per route, asserted per route rather than once. Note that routers mounted at `'/'`
  share their middleware patterns, so a 401 can come from another module's registration; register the
  session middleware in the new module regardless, and say in a comment what the assertion does and
  does not prove.
- Assert the owner's own records are still there afterwards, so a test that passes by having deleted
  everything cannot pass quietly.

### 6.4 Extending the browser smoke flow

- TBD - see §3 Phase 4. The flow stays single; a new case goes to a cheaper layer instead.

### 6.5 Per-rollout-phase notes

(Optional. After each phase lands, a short note here captures anything surprising the phase taught.)

**Phase 3, persistence and recurring rules.** Six conditions decide whether a month of a standing
order counted, and the cheapest way to test them is as pairs against one state: the same
arrangement, the same participant, the same months, with exactly one condition moved between the two
halves of the pair. A test that moves more than one at a time proves nothing about either, which is
the anti-pattern risk #4 names. Two further things this phase taught. Assert the agreement between
two expressions of the rule as the set of months each one counts, not as a total, because a
condition quietly dropped and another quietly added net out in a total and fail loudly in a set. And
a per-route 401 case asserted through the composed application does not prove the route's own
session middleware: routers mounted at the same base share the pattern, so a module that loses its
own registration stays green. Proving that needs the router asked on its own, which is what
`tests/integration/router-isolation.test.ts` does.

## 7. What We Deliberately Don't Test

- **A coverage percentage** - the risk map is the target, not a number. Re-evaluate if the suite
  stops being read before changes are made.
- **More than one browser flow** - the browser test exists to prove the parts connect. Every case it
  would add is cheaper one layer down. Re-evaluate if a defect ever escapes that only the browser
  could have caught.
- **Participant-facing behaviour** - participants are records, not users, so there is no flow to
  test. Re-evaluate if invitations ever enter scope.
- **Locale and currency rendering beyond one assertion** - formatting is a display concern over
  values already asserted in minor units. Re-evaluate if a second currency enters scope.
- **The review pipeline's model output quality** - it is evaluated by its own suite and never gates a
  product change. Re-evaluate if its comments start blocking merges.
- **Browser matrix and accessibility audits** - named as non-goals in the requirements. Re-evaluate
  if the product gains users beyond the organizer.
- **React component behaviour** - there is no component-test harness and this is a gap rather than a
  principled exclusion, so it is recorded here rather than left to be rediscovered. The unit runner
  collects `src/**/*.test.ts` only, so a `.tsx` test would not run, and no DOM environment
  (`jsdom`, `happy-dom`) or testing library is installed. The cost showed up once already: both
  payment and schedule forms seeded their participant select from state before the participants had
  loaded, so the select displayed a name while submitting an empty id, and only the S-03 phase 4
  browser walkthrough caught it. The fix is in both files with a comment, and nothing tests it. This
  is a different gap from the browser flow above, which is about the parts connecting; this one is
  about a component's own state. Re-evaluate when a slice next adds client behaviour whose failure is
  invisible from the server, and decide deliberately whether to bring a harness rather than
  rediscovering the absence.

## 8. Freshness Ledger

- Strategy (§1-§5) last reviewed: at F-01, then again at S-04 under change `verification-and-release`,
  phase 1.
- Stack versions last verified: at S-04, against `package.json` on the tree whose repository-wide
  gates were recorded green at `904ebcc` (typecheck clean, unit 15 files and 185 tests, integration
  11 files and 112 tests, build ok).
- AI-native tool references last verified: none referenced.

**Verification pass at S-04, change `verification-and-release`, phase 1.** The whole plan was read
against the code that had shipped by then, covering S-01 `runtime-auth-slice`, S-02
`members-and-price-history` and S-03 `payments-and-recurring`, all three archived under
`context/archive/`. What it found and changed:

- §2 gained §2.1, naming the file that carries each of the six risks. Every risk is now defended by
  something on disk. Risk 3 is the only one whose protection is not entirely a test: its remote half
  is a fact about one live database, so it is answered by this slice's own migration and live pass.
- §1's likelihood note was corrected. It was written when there was no application code and said so
  in the present tense.
- §3 Phase 4 moved to in progress and is named for what it actually is. Its gates half landed with
  S-01; its walkthrough half is manual.
- §4 replaced "nothing is installed yet" with the pinned versions, recorded that no end-to-end
  framework was ever brought in, and added the absent component harness as its own row.
- §5 separated the gates CI actually enforces from the two that are enforced by a person, and added
  the production build, which CI has always run and this table never listed.
- §6.2 was written. It had read "TBD" since F-01 while its rollout phase was complete.
- §7 and §6.1, §6.3 and §6.5 were read and found accurate; they are unchanged.

Refresh (`/10x-test-plan --refresh`) when:

- a new top risk surfaces from the roadmap or the archive,
- the stack changes (new runner, new runtime, a real external dependency appears),
- §7 no longer matches what we believe,
- the sign-in mechanism changes from the one decision D-001 settles, which would change what the
  session tests have to prove.
