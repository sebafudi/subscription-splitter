# Checkpoint: compact-member-calendar, Sonnet leaf files (CellMark, selection)

Identity: Sonnet, step 4.1 leaf worker (marks and selection only).

Status: complete for the two assigned files. Not blocking anything.

## Actions

- Read `plan.md` (planned files table, projection interface, `CellMark`/`selection.ts` contracts,
  focus and accessible-name tables) and `design-spec.md` §3, §5, §13, §14.
- Read `src/client/components/ui/Money.tsx`, `SectionAlert.tsx` and `ConfirmStrip.tsx` for house TSX
  and JSDoc style, `src/client/components/MemberList.tsx` imports, `src/client/components/
  RecurringSection.tsx:63-71` for the existing `REASON_PHRASE` map (untouched by this step, moved by
  step 4.1's Opus-owned `cellText.ts` work, not this one).
- Read `src/domain/month-status.ts` and `src/domain/types.ts` for `MonthExclusion`, `MonthStr`,
  `Member` shapes.
- Wrote `src/client/calendar/CellMark.tsx`: one component keyed by `'recorded' | 'assumed' |
  'excepted' | 'paused' | 'unpriced'`, 12x12 inline SVG, `aria-hidden="true"`, `focusable="false"`,
  every shape `currentColor`, class `mark mark-<name>` for the CSS owner to colour. No inline colours.
- Wrote `src/client/calendar/selection.ts`: `resolveSelection(stored, range, members, defaultYear)`
  pure; `readSelection`/`writeSelection` over an injectable `SelectionStorage` (defaults to
  `window.sessionStorage`, guarded to `undefined` outside a browser), key `calendar:<subscription
  id>`, both guarded so a throwing, absent or malformed storage yields the default/no-op rather than
  an error.
- Wrote `src/client/calendar/selection.test.ts`: `resolveSelection` restore/reject (year out of range,
  member gone)/default cases; `readSelection`/`writeSelection` absent-storage, throwing-storage,
  malformed-JSON and one injected round trip.
- Ran `npm run typecheck` (exit 0, three project references clean) and `npm run test:unit` (23 test
  files, 274 tests, all passed, including the two new files under the existing `src/**/*.test.ts`
  glob with no config change).
- Committed as a single commit; no `index.lock` contention encountered.

## Changed paths

- `src/client/calendar/CellMark.tsx` (new)
- `src/client/calendar/selection.ts` (new)
- `src/client/calendar/selection.test.ts` (new)

## Commit

`218f9b5` — `feat(calendar): cell marks and selection storage`

## Verification results

- `npm run typecheck`: exit 0.
- `npm run test:unit`: 23 files / 274 tests passed, 0 failed.

## Design-spec questions

None. The mark drawings, colours and the `mark mark-<name>` class convention followed the plan and
`design-spec.md` §5 directly without ambiguity.

## Blockers

None.

## Exact next action

None for this worker; the two files are done and committed. The Opus integrator wires `CellMark` into
`MonthStrip`/`YearControl` and the status writer ticks plan Progress row 4.1 once every leaf file for
that step has landed (this file, plus `index.css`, `sections.ts`, `PaymentList.tsx`,
`RecurringSection.tsx`, `YearControl.tsx` from the other workers in this step).
