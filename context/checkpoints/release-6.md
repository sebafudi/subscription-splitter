# Checkpoint: release-6

- **Task**: `release-6`, Phase 6 steps 6.1 and 6.2 for S-09 `compact-member-calendar` (goal C06)
- **Model**: Opus
- **Status**: in progress

## Step 1: release commit pinned

The status writer's documentation pass landed while this task polled. `git status --short` became
empty at `64eb0d3b096eef53a6d264ee483e1d9c7e1dc17a`, after `9002c1d`
(`docs(status): s-09 implemented, reviewed and accepted; record c03 to c05`) and `64eb0d3`
(`docs(plan): record 5.3 and 5.4 shas`). That commit is the release candidate.

- `git merge-base --is-ancestor 650a14d 64eb0d3` exits 0: the accepted code revision is in the
  ancestry.
- Branch `main`; `origin/main` was at `c10d54f`, so the push carries the whole S-09 series.

## Step 2: nothing ships but client source

```
$ git diff 91ce0da..HEAD --stat -- migrations/ wrangler.jsonc src/server/
(empty)

$ git diff 91ce0da..HEAD --stat -- package.json package-lock.json
(empty)
```

No migration, no Worker configuration change, no server change and no dependency change since
release 5. The diff under `src/` is 24 client files: the new `src/client/calendar/` folder, the
removal of `MemberList.tsx`, and edits to `PaymentList.tsx`, `RecurringSection.tsx`, `PaymentForm.tsx`,
`sections.ts`, `format.ts`, `index.css` and `SubscriptionDetail.tsx`.

## Next action

Push `main` to `origin` and watch the hosted CI run for `64eb0d3`.
