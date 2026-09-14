# Checkpoint: cmc-3 projection and cell text

Identity: Opus subagent, phase 3 (steps 3.1 and 3.2) of `compact-member-calendar`.

## Status

Complete. Both steps land green and are ticked in `## Progress`.

## Actions

1. Read `plan.md` in full, `design-spec.md` sections 3 to 6 and 9 to 14, `design-inputs.md` section 6,
   `research.md` sections 4 and 6, all of `src/domain/`, `src/client/api.ts`, `src/client/format.ts`,
   the head of `RecurringSection.tsx`, `vitest.unit.config.ts` and the three `tsconfig` projects.
2. Wrote `projection.ts`: `buildSubscriptionState`, `projectPersonYear`, `projectYear`,
   `calendarYearRange`, `futureYearPayments`, plus the `monthsOfYear` helper the strip will reuse.
3. Wrote `cellText.ts`: `exclusionPhrase`, `cellAccessibleName`, `chargeSentence`.
4. Wrote both test files, including the six-person eight-year synthetic ledger as a local helper in
   `projection.test.ts`, which is where the plan places it.
5. Ran typecheck and the unit suite, then committed and ticked the two Progress rows.

## Changed paths

- `src/client/calendar/projection.ts` (new)
- `src/client/calendar/projection.test.ts` (new)
- `src/client/calendar/cellText.ts` (new)
- `src/client/calendar/cellText.test.ts` (new)
- `context/changes/compact-member-calendar/plan.md` (Progress rows 3.1 and 3.2 only)

No other file was touched. `CellMark.tsx`, `selection.ts` and `selection.test.ts` belong to the
concurrent Sonnet worker and were neither read into nor edited.

## Commits

- `bbed196` feat(calendar): read-only monthly projection and cell text
- follow-up `docs(plan): record phase 3 shas` records that sha against rows 3.1 and 3.2

## Verification

| Command | Result |
| --- | --- |
| `npm run typecheck` | exit 0, all three projects |
| `npm run test:unit` | exit 0, 25 files, 337 tests passed |
| unit suite excluding `src/client/calendar/**` | 22 files, 262 tests passed (the baseline) |
| the two new files alone | 63 tests passed |

The integration suite was not run: no server code changed.

Plan criteria checked directly:

- The projection imports no React and touches no storage, read back from the file.
- `MonthCell` carries no price-coverage flag; completeness is `chargeStatus.reason === 'unpriced'`
  and nothing else.
- The phrase map in `cellText.ts` is byte-identical to `RecurringSection.tsx:63-71`, confirmed by a
  diff of the two nine-line blocks.

## Notes on two plan criteria

1. The Phase 3 criterion `git grep -n "priced:" src/client/calendar/` does not return nothing: it
   matches the exhaustive phrase map's own key, `unpriced: 'that month had no price'`. That key is
   required by the other clause, which says the map moves out of `RecurringSection.tsx` **unchanged**,
   and quoting the key to dodge the grep would break that. The criterion's substance holds and was
   checked instead as: no `priced` field exists on `MonthCell` or `PersonYear`, and the only
   occurrences of the string in `projection.ts` are `unpricedMonths` and the `'unpriced'` reason.
2. `cellAccessibleName(cell, member, locale, currency)` keeps the member parameter the plan names, so
   Phase 4 calls it exactly as planned, but the sentence names no person: the cell already sits
   inside that person's block, and `design-spec.md` §5 does not put a name in it. The parameter is
   therefore written `_member`, which is what `noUnusedParameters` requires.

## Questions for the designer

1. `design-spec.md` §5 and §6 spell months long ("March 2026"), while the app's one month formatter
   is short ("Mar 2026") and `design-inputs.md` §3 states the short form as the house rendering. The
   code uses the existing `formatMonth`, so a cell reads "Mar 2026, ...". If the long form is wanted
   in the accessible name and the inspector heading, that is a second formatter and a designer
   decision, not an implementer one.
2. §5 lists "marked as not received" among the phrases that can replace the charge, but the domain
   never returns `excepted` as a charge reason: it belongs to the standing order. The accessible name
   therefore speaks it from the assumed part, and only there, so a month whose charge stands but
   whose standing order was marked not received reads "…, marked as not received, charged £15.00".
   Every other exclusion is spoken once, in the charge part, and never repeated.

## Unresolved issues

None blocking.

## Exact next action

Phase 4. Nothing further is owed by this step.
