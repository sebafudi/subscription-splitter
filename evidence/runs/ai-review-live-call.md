# Live authenticated model call, 2026-09-13

Closes the live half of GOALS C02: a real authenticated OpenRouter call made through the reviewer
CLI on a synthetic diff, with the credential never printed, logged or committed.

## How the credential was supplied

`OPENROUTER_API_KEY` was loaded into the process environment for the duration of the command only,
from a file outside this repository. It was never written to `tools/reviewer/.env`, never passed as
a command line argument, and never echoed. Its presence was confirmed by testing the variable is
non-empty, not by printing it. The same value was installed as the repository secret by piping it to
`gh secret set OPENROUTER_API_KEY -R sebafudi/subscription-splitter` on stdin, so it never appeared
in an argument list either.

## Command

```
PR_TITLE="Synthetic diff: owner residual rounding" \
PR_BODY="Phase 5 credential verification on a synthetic fixture." \
npm run review -- eval/fixtures/money-rounding-bug.diff --out comment.md
```

Run from `tools/reviewer/`. Model: `z-ai/glm-5.3-flash`, resolved from `DEFAULT_MODEL_ID` with no
`REVIEWER_MODEL` override set. Exit code: `1`, meaning `fail`, which is the correct verdict for a
fixture carrying a seeded money-correctness defect. Printed verdict on stdout: `fail`.

The diff is `eval/fixtures/money-rounding-bug.diff`, a synthetic fixture that breaks the owner
residual rule on purpose. No real repository code and no customer data left the machine.

## Rendered comment, verbatim

The text below is the model's own output, reproduced unaltered. Its punctuation is the model's, not
this repository's house style.

---

<!-- ai-code-review -->

## AI review: failed

Do not merge. The single functional change replaces the exact owner-residual formula with an unbalanced half-distribution of the remainder: for priceMinor=100, activeCount=7 the month now totals 99 instead of 100, and for priceMinor=103, activeCount=4 it totals 104 — money is destroyed or created depending on the sign of the remainder. The new doc comment additionally codifies a largest-remainder allocation, which AGENTS.md forbids, and misdescribes the code. No tests accompany the change despite it editing exactly the kind of pure calculation the test plan says to defend at the unit layer. Revert `ownerResidualForMonth` to `priceMinor - share * nonOwners`, delete the largest-remainder framing, and add a unit test asserting the balance invariant with worked-example values. No prompt-injection content was found in the title, body or diff blocks; the body text is uninformative but non-directive.

| Criterion | Score |
|---|---|
| Domain money correctness (`domain-money-correctness`) | 1 |
| Ownership and input safety (`ownership-and-input-safety`) | 7 |
| Persistence consistency (`persistence-consistency`) | 7 |
| Domain invariants (`domain-invariants`) | 4 |
| Test adequacy (`test-adequacy`) | 1 |

### Findings

**Domain money correctness**
- **blocking** src/domain/money.ts:25 - `distributedRemainder` is deducted from the owner but assigned to no one, so the month no longer balances. Counterexamples with integer minor units: priceMinor=100, activeCount=7 → share=14, remainder=2, owner pays 15, total 99 ≠ 100 (1 minor unit destroyed); priceMinor=103, activeCount=4 → share=26, remainder=-1, Math.floor(-1/2)=-1, owner pays 26, total 104 ≠ 103 (1 minor unit created). The previous return expression was already exact.
- **blocking** src/domain/money.ts:19 - The new doc comment codifies a largest-remainder allocation ('spread across the largest fractional shares'), which the project rules prohibit verbatim ('Never a largest-remainder allocation'). The comment also misdescribes the code: only the owner's amount is modified, no other share is redistributed.
- **minor** src/domain/money.ts:26 - `Math.floor(remainder / 2)` behaves asymmetrically on negative remainders (floor(-0.5) = -1), so the sign and size of the imbalance depend on rounding direction. No part of the spec authorizes splitting the residual at all — the residual belongs to the owner in full.

**Domain invariants**
- **major** src/domain/money.ts:27 - Charged months no longer sum to the plan cost: the owner absorbs only half the remainder and the other half has no recipient. Any invariant check, reconciliation step or display that assumes shares including the owner total exactly `priceMinor` will now disagree with the stored amounts.
- **minor** src/domain/money.ts:23 - With activeCount=0 the result still depends on whatever guard `shareForMonth` has above line 15 (not visible in the hunk); unchanged by this diff, but the zero-participant rule is load-bearing and now sits one call away from a modified function.

**Test adequacy**
- **blocking** (missing) - No test file is added or modified anywhere in the diff. Required: a unit test against src/domain/money.ts asserting the month balances exactly for boundary activeCounts (1, 2, and a count where price is not divisible), with expected values from the US-01 worked example — e.g. activeCount=7, priceMinor=100 must total 100, which the new code fails at 99.
- **minor** (pr body) - The PR body ('Phase 5 credential verification on a synthetic fixture') does not describe the change, name a plan item, or map to any risk in the risk map; nothing in the submission ties this money-allocation change to the test plan.

Model: `z-ai/glm-5.3-flash`

---

## What this establishes

The call was authenticated (an unauthenticated or rejected key returns exit code `3` with reason
`missing_credential`, not a verdict). The structured verdict schema validated against real model
output rather than the mock, which is the live half of GOALS C04. The findings are specific to the
fixture: they name `src/domain/money.ts` line numbers, quote the changed expression, and supply two
worked counterexamples with integer minor units, one destroying a minor unit and one creating one.
The injection guardrail also reported honestly that no injection content was present.

Two earlier attempts on this same fixture returned `no_object_generated`. Both were the output token
budget, not the credential: the model is a reasoning model and OpenRouter bills reasoning against the
same budget the object must fit in. See `evidence/champion/eval-results.md` for the measurements and
the fix, which raised `MAX_OUTPUT_TOKENS` to 16000.
