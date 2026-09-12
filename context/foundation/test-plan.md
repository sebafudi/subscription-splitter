# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1-§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: at F-01. This repository records progress by slice ID, not by date.

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

Hot-spot scope used for likelihood weighting: none available. The repository has no application code
and no commit history over source, so likelihood is argued from the domain and from the requirements,
never from churn.

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
| 4 | Smoke flow and gates | One browser walkthrough of sign-in to balance, and the gates wired in CI, as part of roadmap S-04 | cross-cutting | e2e + gates | not started | - |

## 4. Stack

The classic test base for this project. Nothing is installed yet, so no version is pinned; Phase 1 of
the rollout brings the runner in with the first slice that needs it.

| Layer | Tool | Version | Notes |
|---|---|---|---|
| unit | Vitest | not yet pinned - see §3 Phase 2 | Runs the calculation module directly; no runtime bindings needed. |
| integration | Vitest with the Workers pool | not yet pinned - see §3 Phase 1 | Runs against a local D1 with migrations applied in setup. |
| e2e | Playwright | not yet pinned - see §3 Phase 4 | One smoke flow only; see §7. |
| API mocking | none | n/a | The product calls no external service, so there is no network edge to mock. |
| accessibility | none | n/a | Deliberately out of scope; see §7. |

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
| typecheck | local + CI | required | type drift across the calculation, the routes and the client |
| unit | local + CI | required after §3 Phase 2 | money rule regressions |
| integration on a local database | local + CI | required after §3 Phase 1 | ownership, session and persistence regressions |
| browser smoke flow | CI on pull request | required after §3 Phase 4 | the whole flow failing to hold together |
| migrations applied to the deployed database | before release | required after §3 Phase 4 | code ahead of the remote schema |

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

- TBD - see §3 Phase 1.

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

- Strategy (§1-§5) last reviewed: at F-01.
- Stack versions last verified: not yet - no versions pinned before §3 Phase 1.
- AI-native tool references last verified: none referenced.

Refresh (`/10x-test-plan --refresh`) when:

- a new top risk surfaces from the roadmap or the archive,
- the stack changes (new runner, new runtime, a real external dependency appears),
- §7 no longer matches what we believe,
- the sign-in mechanism changes from the one decision D-001 settles, which would change what the
  session tests have to prove.
