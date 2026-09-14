# Checkpoint: cmc-1.1-reconcile

- Task id: `cmc-1.1-reconcile` (plan steps 1.1 and 1.3 of `context/changes/compact-member-calendar/plan.md`)
- Model: Sonnet
- Status: complete

## Task 1.1: reconcile state (read-only)

Verified directly against the repository rather than trusted from any handoff:

- `git rev-parse HEAD`: `c10d54fd3251c151fe98201326859a9d480da543`, branch `main`.
- `git status --short`: only `?? context/changes/compact-member-calendar/` (untracked, expected new work owned by another task; not modified or deleted).
- `git log --oneline -3`: `c10d54f docs(status): record the s-08 close`, `3cf7688 docs(checkpoint): record the s-08 archive`, `d300e10 docs: record the ledger through s-08 archived`.
- `context/STATUS.md`'s "Current SHA" prose names `d300e10`/`3cf7688` "at time of writing"; this is expected staleness inherent to the file describing state before its own commit lands (the file says to treat actual HEAD as authoritative). Read `c10d54f`'s diff directly: it is `status-sync-11`'s own eighth-pass STATUS/evidence/work-log update, a doc-only commit that matches what `status-sync-11.md`'s eighth pass describes. No undocumented drift found.
- Deployed release identity: cross-checked `context/STATUS.md`'s Deployment section (release 5, Cloudflare version `751a8bfd-e62a-4c9a-beb2-1953eb6a7656`, release SHA `91ce0da`, CI run `34789657237`) against `evidence/runs/release-5.md` directly — release SHA, ancestry gates, fresh-clone gate figures (typecheck exit 0, unit 22 files/262 tests, integration 13 files/131 tests, build exit 0, asset names `index-CtqqFhDM.css`/`index-D-QEf8bX.js`) all match. No deploy or Cloudflare call made.
- Baseline gates: `git diff --name-only 91ce0da HEAD -- src tests package.json package-lock.json wrangler.jsonc migrations` returns empty, so no commit after the release-5 SHA touches any gated path. Per instruction, the release-5 gate results (typecheck exit 0, unit 22/262, integration 13/131, build exit 0) remain valid and were **not** rerun.
- Confirmed only one folder under `context/changes/`: `compact-member-calendar` (new, untracked). No other active change exists.
- Checked every checkpoint whose tail mentions a "Next action": all point either to the closed S-08/submission-package side (unrelated to this change) or are already resolved (e.g. `state-reconciliation-1.md`, `status-sync-*.md`, `release-*.md`, `s06-*.md`). No unfinished checkpoint refers to pending work on this repository's own change stream.
- Next free roadmap ID: read `context/foundation/roadmap.md`'s "At a glance" table — highest existing slice is `S-08`, so `S-09` is free. Used `S-09` for this registration.

## Task 1.3: register the change (writes)

Changed paths (all within the allowed write list):

- `context/foundation/roadmap.md` — added a row `S-09 | compact-member-calendar | ... | S-08 | FR-015 to FR-026, US-02 | in-progress` to the "At a glance" table, and a new `## S-09: Compact member calendars` section after the `## S-08` section, matching the existing S-06/S-07/S-08 section style. Anchors (`FR-015` to `FR-026`, `US-02`) were looked up in `context/foundation/prd.md` (payments, standing orders, balance-reading requirements) rather than assumed. Status word `in-progress` matches the vocabulary `context/STATUS.md` records was used for S-08 during its own planning ("S-08 `planning` to `in-progress`").
- `AGENTS.md` — replaced the "No roadmap item is open" sentence with an S-09 active-work pointer, following the wording pattern from `d300e10`'s S-08 edit (`git log -p -1 d300e10 -- AGENTS.md README.md`).
- `README.md` — left unchanged. It carries stack prose, not an active-work pointer in AGENTS.md's style (no "No roadmap item is open" or equivalent line), so the "only if it mirrors" condition does not apply.
- `context/STATUS.md` — updated the "Active change / phase" bullet, added an item 13 to "Next executable action" (kept item 12 as history), and appended a new `## S-09 compact-member-calendar` section at the end of the file.
- `../GOALS.md` (parent course workspace, not a Git repository, saved directly) — appended a new `## Compact member calendars` section with pending goals C01-C06, unchecked, plus a note that writing them does not implement the change and that no course upload is authorized.
- `context/checkpoints/cmc-1.1-reconcile.md` — this file.

Not touched: `change.md`, `plan.md`, `research.md`, `frame.md`, `orchestrator-prompt.md`, any source or test file.

## Commit

Committed the registration edits (roadmap, AGENTS.md, STATUS.md) as one commit in `subscription-splitter`. `GOALS.md` lives in the parent course workspace, which is not a Git repository, and was saved directly with no commit. The untracked `context/changes/compact-member-calendar/` folder was left uncommitted, per instruction, since another task owns it.

## Verification commands and results

- `git rev-parse HEAD` before: `c10d54fd3251c151fe98201326859a9d480da543`.
- `git status --short` before: `?? context/changes/compact-member-calendar/` only.
- `git diff --name-only 91ce0da HEAD -- src tests package.json package-lock.json wrangler.jsonc migrations`: empty.
- No test suite, typecheck or build was run (not needed; nothing gated changed).
- No `wrangler` or Cloudflare command was run.

## Unresolved issues

None found blocking this task's own scope. Unrelated and already known: the workspace `GOALS.md` F01 final audit still stands at release 4 and needs a re-audit against release 5; this is submission-package work, not part of `compact-member-calendar`.

## Exact next action

Whoever owns plan step 1.2 (research and framing) writes `context/changes/compact-member-calendar/research.md` and `frame.md` with the full detail/action preservation matrix, then hands off to Fable 5.1 for Phase 2 (design specification). The next status-sync task reads this checkpoint before touching `context/STATUS.md`, `AGENTS.md`, `README.md`, `context/foundation/roadmap.md` or `../GOALS.md` again.
