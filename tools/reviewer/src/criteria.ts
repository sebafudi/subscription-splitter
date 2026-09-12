export interface CriterionDefinition {
  readonly key: string;
  readonly title: string;
  readonly question: string;
  readonly lowAnchor: string;
  readonly highAnchor: string;
}

export const CRITERIA: readonly CriterionDefinition[] = Object.freeze([
  {
    key: "domain-money-correctness",
    title: "Domain money correctness",
    question:
      "Does the change keep the ledger exact? Money stays integer minor units in the domain, the " +
      "database and over the wire, formatted only at display. A priced month's share is " +
      "round(price / activeCount) for every active participant including the owner, and the owner " +
      "absorbs the residual. The effective-dated price applies from its own month onward and never " +
      "retroactively. A skipped month costs nothing. The current month is derived from the " +
      "subscription's time zone with Intl, never from server-local date parts.",
    lowAnchor:
      "introduces a floating-point amount, a per-screen rounding, a largest-remainder allocation, a " +
      "price applied to the wrong months, or a current month read from the server clock.",
    highAnchor:
      "every amount is a minor-unit integer, the month balances exactly with the residual on the " +
      "owner, and any date arithmetic goes through the subscription's time zone.",
  },
  {
    key: "ownership-and-input-safety",
    title: "Ownership and input safety",
    question:
      "Does every read and mutation resolve through the owning subscription, on the server, " +
      "including child identifiers? A foreign or mismatched identifier must be answered as absent " +
      "(404), and a request with no session must be refused (401). Validation happens once at the " +
      "entry point through the shared Zod schema rather than per screen. Secrets stay in .dev.vars " +
      "and wrangler secret and never reach a file or a log.",
    lowAnchor:
      "a route trusts a client-supplied identifier, a child record is reached without checking its " +
      "parent, a permission error leaks the existence of another account's record, or a secret is " +
      "committed or logged.",
    highAnchor:
      "ownership is enforced on the server for every identifier in the request, absence is the " +
      "answer for anything foreign, and input is validated at the boundary.",
  },
  {
    key: "persistence-consistency",
    title: "Persistence consistency",
    question:
      "Does the stored shape match the code? A schema change arrives as a new sequential wrangler " +
      "migration under migrations/. SQL stays inside src/server/db/. A multi-statement write that " +
      "would corrupt the ledger if half-applied is atomic. A participant with payments or a standing " +
      "order is archived or closed out rather than hard-deleted, and the attempt to delete one is " +
      "refused with 409.",
    lowAnchor:
      "a column or table is used in code with no migration, SQL leaks outside the repository layer, " +
      "a partial write can leave the ledger inconsistent, or a delete destroys payment history.",
    highAnchor:
      "code, migration and repository layer agree; risky writes are atomic; deletions respect the " +
      "archive rule.",
  },
  {
    key: "domain-invariants",
    title: "Domain invariants",
    question:
      "Does the change respect the rules that make this product different from a running tab? One " +
      "participant carries several active periods rather than splitting into two records on a " +
      "rejoin. A standing order counts for a month only when that month is elapsed, inside the " +
      "participant's active range, not skipped, and not marked as not received. A charged month with " +
      "zero active participants is a defined state whose whole cost falls on the owner, not an error " +
      "and not a division by zero. Months are YYYY-MM and dates YYYY-MM-DD.",
    lowAnchor:
      "a rejoin creates a second participant, an assumed receipt is counted for a skipped or future " +
      "month, a zero-participant month throws or silently drops its cost, or a month is stored in " +
      "another format.",
    highAnchor:
      "break months, rejoins, exceptions and the empty month all behave as the requirements " +
      "describe, and assumed money stays distinguishable from recorded money.",
  },
  {
    key: "test-adequacy",
    title: "Test adequacy",
    question:
      "Do the tests match context/foundation/test-plan.md? A change touching a risk in the risk map " +
      "arrives with a test at the layer the plan names as cheapest for that risk: unit against the " +
      "calculation module, integration against local D1 with migrations applied, one browser smoke " +
      "and no more. Assertions come from the worked example in US-01, not from the implementation's " +
      "own output. The anti-pattern column is the checklist: a single mid-range month for a boundary " +
      "rule, a top-level ownership test that assumes children inherit the check, or an assertion on a " +
      "response body that never re-reads the stored record.",
    lowAnchor:
      "risky logic ships untested, or the tests present restate what the code does and would pass " +
      "against a wrong implementation.",
    highAnchor:
      "every risk the change touches is defended at the layer the test plan names, with the " +
      "boundaries the plan calls out and expected values taken from the requirements.",
  },
]);

export type CriterionKey = (typeof CRITERIA)[number]["key"];
