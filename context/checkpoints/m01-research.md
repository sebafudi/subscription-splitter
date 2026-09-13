# Checkpoint: m01-research

- **Task**: M01 first half, roadmap S-08, change `subscription-management-and-date-inputs`. State
  reconciliation, `10x-new`, `10x-research`. No design, no plan, no implementation.
- **Model**: Opus.
- **Status**: complete.

## Completed actions

1. **State reconciled.** HEAD was `8c187fc`. The last release is release 4,
   `evidence/runs/release-4.md`, release SHA `bad3f28`, Cloudflare version
   `1d0f71c1-6832-4bc1-aace-5feef621e715`. Verified that no commit after `bad3f28` touches `src`,
   `tests`, `wrangler.jsonc` or `migrations`: the twelve commits since are all documentation.
   `context/changes/` held only the two Architect analysis directories and a README, with no
   `subscription-management-and-date-inputs` directory.
2. **The uncommitted S-08 additions were committed.** The working tree carried a four-line append to
   `context/STATUS.md`, a nine-line S-08 entry in `context/foundation/roadmap.md` and the untracked
   `context/foundation/subscription-management-brief.md`. All three were S-08 openings only, with no
   other edit mixed in. Committed by explicit path as `218faad`, rebased onto `origin/main` (already
   up to date) and pushed.
3. **`10x-new` run.** `context/changes/subscription-management-and-date-inputs/change.md` written to
   the skill's schema, adapted to this repository's date-free convention as
   `context/archive/google-sign-in/change.md` and `context/archive/visual-redesign/change.md` do:
   the three date fields are omitted and a closing sentence says why. Status moved `new` to
   `preparing` when the research was written, per the skill's own transition table.
4. **`10x-research` run.** `context/changes/subscription-management-and-date-inputs/research.md`
   written to the skill's schema with the same date-free adaptation. Two parallel subagents did the
   deep reading, one on schema, routes, mutability and deletion, one on the client calendar
   inventory and presentation layer; the browser-support facts and the gate runs were done directly.
   Every claim carries a `path:line` reference or an external source.

## Changed paths

- `context/STATUS.md`, `context/foundation/roadmap.md`,
  `context/foundation/subscription-management-brief.md` (committed as found, not authored here)
- `context/changes/subscription-management-and-date-inputs/change.md`
- `context/changes/subscription-management-and-date-inputs/research.md`
- `context/checkpoints/m01-research.md`

Not touched, as instructed: `context/STATUS.md` beyond the commit above, `GOALS.md`,
`evidence/index.md`, `evidence/work-log.md`.

## Commits

- `218faad` `docs: add s-08 subscription management brief and roadmap entry`
- the change and research commit follows this checkpoint

## Verification

Run at `218faad`, from the repository root.

| Gate | Command | Result |
| --- | --- | --- |
| Types | `npm run typecheck` | pass, three projects, no output |
| Unit | `npm run test:unit` | pass, 18 files, 214 tests |
| Integration | `npm run test:integration` | pass, 12 files, 119 tests |

Counts match the ones `context/STATUS.md` records for the S-07 close, so nothing has drifted.
`tools/reviewer/` was not run; it is an independent package and neither root gate covers it.

## Unresolved issues

- Twelve open design questions are listed at the end of `research.md`. They are the designer's, not
  this task's. The load-bearing ones are which settings the edit form exposes, what a `currency`
  change does when amounts exist, what the month fallback is for the browsers that render none, and
  what design-spec section 3.4 becomes given that it currently instructs the opposite of this change.
- Firefox and Microsoft Edge are not installed on this machine and there is no Playwright or
  Puppeteer dependency, so the plan has to state which browsers it verifies and which it reports
  from published support data.
- The only in-repository evidence that D1 cascades fire is an archived review describing a probe
  whose file no longer exists. The research recommends an explicit ordered `db.batch()` plus an
  orphan-count test, which is correct either way, but the choice is the planner's.

## Next action

Hand `research.md` to the designer for the design delta. Nothing else in this change should start
before that: the applicable `10x-frame` and then the Fable design delta come before `10x-plan`.
