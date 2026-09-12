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
| 1 | Ownership and session integration | Prove risks #2 and #6 against a local database with two seeded accounts, as part of roadmap S-01 | #2, #6 | integration | not started | - |
| 2 | Money calculation coverage | Prove risks #1 and #5 against the calculation module, as part of roadmap S-02 | #1, #5 | unit | not started | - |
| 3 | Persistence and recurring rules | Prove risks #3 and #4 through real write, edit, delete and re-read paths, as part of roadmap S-03 | #3, #4 | unit + integration | not started | - |
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

- TBD - see §3 Phase 2.

### 6.2 Adding an integration test against the local database

- TBD - see §3 Phase 1.

### 6.3 Adding an ownership test for a new resource

- TBD - see §3 Phase 1. Every new child resource gets one, and it asserts absence for a foreign
  identifier rather than a permission error.

### 6.4 Extending the browser smoke flow

- TBD - see §3 Phase 4. The flow stays single; a new case goes to a cheaper layer instead.

### 6.5 Per-rollout-phase notes

(Optional. After each phase lands, a short note here captures anything surprising the phase taught.)

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
