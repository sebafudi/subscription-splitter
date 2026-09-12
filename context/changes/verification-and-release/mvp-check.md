# MVP project analysis report

Run of `archive/toolkit/.ai/prompts/mvp-check.md` against this repository, at release commit
`8ed342278443e371819c1be58a8042b94c507254`, under change `verification-and-release` (roadmap S-04).

The report follows the prompt's structure and its markers. It is written in English, with the five
criteria named in English, because its audience is this repository's evidence index and a reviewer
reading the repository; the prompt itself is in Polish and names its sections there. Following its
structure rather than its language is a deliberate choice, and the markers are the prompt's own,
`✅` and `❌`, which carry no language either way.

**Project shape, inferred first as the prompt requires.** A web application: a Hono API and a React
client built by Vite into one Cloudflare Worker, over a D1 database reached through the `DB` binding.
Its core items are subscriptions and, beneath each, participants, price entries, skipped months,
payments and standing orders. Criteria are judged against that shape.

**Out of scope, per the prompt, and therefore not scored anywhere below:** visual design, styling,
CSS, interface polish, accessibility, and whether the application is deployed or hosted. That the
project *is* deployed is deliberately not counted in its favour here.

## Checklist

### 1. CRUD operations: ✅

All four verbs exist for more than one core item type and every one acts on persistent D1 data, not
on transient interface state. Taking payments as the primary item, each verb with its own evidence:

- **Create** `POST /api/subscriptions/:id/payments`, `src/server/routes/payments.ts:40`, through
  `create` in `src/server/db/payments.ts`, writing to the `payments` table from
  `migrations/0005_payments.sql`.
- **Read** `GET /api/subscriptions/:id/payments` (list, with a `?memberId=` filter) and
  `GET /api/subscriptions/:id/payments/:paymentId` (one), `src/server/routes/payments.ts:22` and
  `:68`.
- **Update** `PATCH /api/subscriptions/:id/payments/:paymentId`, `src/server/routes/payments.ts:76`,
  through `update` in `src/server/db/payments.ts`.
- **Delete** `DELETE /api/subscriptions/:id/payments/:paymentId`,
  `src/server/routes/payments.ts:109`, through `remove`.

That the writes persist is not assumed: `tests/integration/payments.test.ts:95` reads a posted
payment back on a later, separate request with every field intact, and `:149` edits an amount, reads
the new one back, deletes, and asserts 404 afterwards. The same four verbs exist for participants
(`src/server/routes/members.ts`) and for standing orders (`src/server/routes/recurring.ts`), and the
client drives them from `src/client/components/PaymentForm.tsx` and `PaymentList.tsx`.

One deliberate absence, recorded so it is not mistaken for a gap: there is no delete for a
subscription and none for the owner participant. Both are product decisions, D-006 and D-010, not
missing work, and neither is the item type this criterion is judged on.

### 2. Business logic: ✅

The product's whole reason for existing is a calculation, and it lives in a dependency-free module
that imports nothing from D1: `src/domain/`.

- `computeSummary` in `src/domain/calc.ts:134` derives every number the product shows from two facts
  per month, who was active and what the plan cost.
- `perPersonShare` in `src/domain/calc.ts:15` rounds the month's price across everyone active that
  month, owner included, and the owner absorbs the remainder so the month balances exactly. That
  residual rule is the thing a naive tracker gets wrong.
- `priceForMonth` in `src/domain/prices.ts:10` resolves an effective-dated price history, so a price
  change does not retroactively rewrite earlier months.
- `memberMonthStatus` in `src/domain/month-status.ts:44` decides, with a named reason, whether a month
  counts for a participant: before the start month, not yet elapsed, the owner, outside an active
  range, a skipped month.
- `scheduleMonthStatuses` in `src/domain/recurring.ts` applies that same rule to standing orders, so
  assumed receipts and owed shares cannot disagree about which months exist (decision D-008).

This is well beyond CRUD: joins, departures, rejoins, price changes, skipped months and assumed
receipts all interact, and the module is exercised directly by 15 unit test files.

### 3. Tests addressing a defined risk: ✅

A test plan exists at `context/foundation/test-plan.md` and it defines risks before naming any test:
§2 is a risk map of six failure scenarios in user terms, and §2.1 maps each to the files that defend
it. Two concrete pairings, each checked by opening the test:

- **Risk 1**, "a balance is wrong by a few grosze or by a whole month: the share is mis-rounded, the
  owner's residual is dropped or double-counted, a participant is charged for a month outside their
  active range". Defended by `src/domain/calc.test.ts`, whose cases include "splits an evenly
  divisible price across three active members including the owner", "a member with two ranges and a
  gap owes for the covered months only", and "the share is zero, no member owes, the cost is still
  counted, and nothing throws" for a priced month with nobody active. The expectations are
  hand-computed literals, not values read back from the implementation.
- **Risk 2**, "one account reads or changes another account's records, or a child record is reached
  through a parent that belongs to someone else". Defended by
  `tests/integration/payments.test.ts:257`, "hides one account payments from another on every verb,
  including through a foreign parent", and `:295`, "refuses a payment named through the caller's own
  other subscription", plus `tests/integration/router-isolation.test.ts`, which asks each router on
  its own so a module that loses its session middleware cannot be hidden by a sibling's.

Risk 4, the assumed-receipt rule, is covered at both layers: `src/domain/calc.test.ts:155` tests the
boundaries the rule turns on, and `tests/integration/recurring.test.ts` proves the same rule against
stored exceptions.

### 4. User-linked authentication: ✅

Sign-in exists and every record is owned by the account that created it.

- Better Auth is mounted at `/api/auth/*` (`src/server/routes/auth.ts:13`) and configured in
  `src/server/auth.ts` with email and password enabled and public sign-up disabled, so accounts are
  seeded rather than self-registered (decision D-001).
- `requireSession` in `src/server/middleware/require-session.ts` answers 401 without a valid session,
  and is registered by every router that serves `/api/subscriptions/*`.
- Ownership is enforced in SQL, not merely by checking that a session exists: `get` in
  `src/server/db/members.ts:90` joins member to subscription to `user_id`, and
  `src/server/db/payments.ts:71` does the same one level deeper, so a foreign or mismatched id is
  absent rather than forbidden.

Two seeded accounts exist on the deployed instance, and the second one holds nothing on purpose so
isolation can be shown rather than asserted; `evidence/runs/release-1-live-smoke.txt` records it
answering 404 for every one of the first account's record types.

### 5. Documentation: ✅

The written foundation is the context the application was generated from, and it is present and
current rather than filler.

- `README.md` explains what the project is, its stack, setup from a clean clone, how to run, how to
  test, the migration commands, the seeding procedure and the deployment procedure. Its first-run
  recipe was walked from a fresh `git clone` under S-04 phase 1 and corrected where it did not work.
- `context/foundation/prd.md` is the requirements document: problem statement, persona, success
  criteria with guardrails, five user stories with acceptance criteria, 26 functional requirements,
  non-functional requirements, the business logic in prose, access control, and explicit non-goals.
  It was verified requirement by requirement against the shipped code in S-04 phase 1 and corrected
  where the build had decided something different.
- Alongside it: `context/foundation/roadmap.md`, `test-plan.md`, `tech-stack.md`,
  `infrastructure.md`, `shape-notes.md`, plus ten numbered decision records in `context/decisions/`
  and a verification trail in `evidence/`.

## Project status

**5 of 5 criteria met. 100%.**

## Prioritized improvements

No criterion failed, so the prompt's improvement list is empty. Nothing was marked met without
opening the file cited for it.

Two observations are recorded here rather than as failures, because neither is something this
prompt's criteria ask for, and both are already documented limitations rather than newly discovered
ones:

1. **No component test harness.** The unit runner collects `src/**/*.test.ts` only, and no DOM
   environment or testing library is installed, so React component behaviour has no automated test.
   This is recorded with its cost and its re-evaluation trigger in `context/foundation/test-plan.md`
   §7; it cost a real defect once, a participant select that displayed a name while submitting an
   empty id, caught by a browser walkthrough rather than by a test.
2. **No end-to-end framework.** The browser flow is walked by hand each slice with screenshots kept
   under `evidence/screenshots/`, rather than automated. §3 phase 4 and §4 of the test plan both say
   so plainly.

## Beyond the minimum

The prompt asks that this be mentioned briefly where it applies. Three things put this project past a
minimum bar: the money rule is isolated in a dependency-free module and exercised by hand-computed
unit tests rather than by values read back from the implementation; ownership is enforced in the SQL
of every repository and tested including the wrong-parent case inside a single account, which is the
case that passes when a predicate is dropped; and the written foundation, decisions and evidence
trail are maintained as first-class artifacts, with each slice leaving a plan, an independent review
and its resolution behind.
