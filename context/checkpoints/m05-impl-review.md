# Checkpoint: m05-impl-review

- **Task:** independent implementation review of change `subscription-management-and-date-inputs`
  (roadmap S-08), covering all six phases
- **Model:** Opus
- **Status:** complete; verdict APPROVED with two comment corrections outstanding

## Independence

The reviewer wrote no part of the brief, the research, the design delta, the plan, the code or the
evidence, and authored none of the implementation commits. The code was read before the checkpoints.
No source file was modified; the only files written are the review report and this checkpoint.

## Actions

1. Read `AGENTS.md`, then the whole of
   `archive/toolkit/.ai/skills/10x-impl-review/SKILL.md` and both precedents
   (`context/archive/google-sign-in/reviews/impl-review.md`,
   `context/archive/visual-redesign/reviews/impl-review.md`) for structure and register.
2. Read `design-delta.md` in full as the authoritative contract, including its four rulings sections
   and the amendment carrying the phase 4 and 5 rulings, which landed during this review as
   `89b537a`.
3. Re-ran every gate in this checkout rather than accepting `evidence/runs/s08-gates.txt`.
4. Verified the server rules (deletion batch, ownership chain, 404 shape, the six first-month
   guards, currency lock, ten-year floor, owner range shift, the `meta.changes === 0` re-read) and
   the client rules (detection, branch purity, option range, the eight call sites, bounds, CSS,
   header enablement, focus destinations, copy) against the files, with line numbers, through two
   parallel Opus subagents whose claims were then spot-checked directly.
5. Confirmed the phase 1 review's Resolution landed in `688757a` by reading the commit, rather than
   re-deriving the phase 1 findings.
6. Audited the evidence file against the manual Progress rows it ticked, counted the captures,
   checked the open rows and the Unverified table, and judged the `COOKIE_SECURE` report.
7. Audited the phase 6 foundation edits for truth and duplication, and checked `AGENTS.md` at head
   for the S-08 paragraph the phase 5 agent believed was missing.
8. Swept the change range for em dashes, date metadata, weakened tests and clock reads outside
   `currentMonth`.

## Gate results, re-run at head

| Gate | Result |
|------|--------|
| `npm run typecheck` | pass, all three projects |
| `npm run test:unit` | 22 files, 262 cases, all passed |
| `npm run test:integration` | 13 files, 131 cases, all passed |
| `npm run build` | succeeds, 59 modules |

No file under `src/`, `tests/` or `migrations/` differs between `89fabe5` and the reviewed tree, so
the run applies to the head of the change. The counts match the recorded evidence exactly.

## Verdict

APPROVED. Plan Adherence, Scope Discipline, Safety and Quality, and Architecture all PASS. Pattern
Consistency is WARNING on two comments. Success Criteria is WARNING on one unticked automated row.

| Finding | Severity | Where |
|---|---|---|
| F1 falsified module comment | warning | `src/client/format.ts:3` |
| F2 overstated hint comment | warning | `src/client/components/ui/Field.tsx:14-15` |
| O1 atomicity test precondition | observation | `tests/integration/subscription-deletion.test.ts:185-205` |
| O2 plan row 6.1 unticked | observation | `plan.md` phase 6 |
| O3 `autoComplete` on the select branch | observation | `src/client/components/ui/MonthField.tsx:72` |
| O4 `change.md` status stale | observation | `change.md` |
| O5 silent Safari sign-in symptom | observation | `README.md:25` |
| O6 empty field name in one refusal | observation | `src/server/validation/subscriptions.ts:57` |

No critical finding. Nothing behavioural is wrong against the delta.

## Changed paths

- `context/changes/subscription-management-and-date-inputs/reviews/impl-review.md` (new)
- `context/checkpoints/m05-impl-review.md` (new)

No source file, no test, no migration, and neither `context/STATUS.md`, `GOALS.md`,
`evidence/index.md` nor `evidence/work-log.md` was touched. `change.md` status was left alone; the
archive step owns it.

## Designer questions

None. The designer's acceptance landed in parallel (`689bfe9`) and this review found nothing that
contradicts it. Two awareness items about the limits of the Safari evidence are listed in the
report's design section.

## Next

Triage F1 and F2, which are one-line comment edits, and decide O1 to O6. Then the archive step,
which moves `change.md` to its final status and the roadmap entry to `done`.
