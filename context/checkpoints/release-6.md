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

## Step 3: push and hosted continuous integration

`64eb0d3` was pushed to `origin/main` on its own, before this checkpoint was committed, so the hosted
run is at exactly the release SHA rather than at a docs commit on top of it.

| Field | Value |
|---|---|
| Workflow | `CI`, on `push` to `main` |
| Commit | `64eb0d3b096eef53a6d264ee483e1d9c7e1dc17a` |
| Run id | `34881238556` |
| Conclusion | `success` |

Green, so the deploy was not blocked.

## Step 4: gates in a throwaway clone, remote state, deploy

Built from a throwaway clone under the scratchpad, not the shared working copy. `git rev-parse HEAD`
equalled the release SHA and `git status --porcelain` was empty both before the gates and immediately
before the deploy. The clone holds `.dev.vars.example` only and no `.dev.vars`, so the suite ran
secretless.

```
$ npm ci                 exit: 0
$ npm run typecheck      exit: 0
$ npm run test:unit      Test Files 26 passed (26)   Tests 359 passed (359)   exit: 0
$ npm run test:integration  Test Files 13 passed (13)   Tests 131 passed (131)   exit: 0
$ npm run build          exit: 0
  dist/client/assets/index-ByHeNjZo.css  20.10 kB
  dist/client/assets/index-DlWpQE-s.js  307.70 kB
```

Remote state before anything was written: `No migrations to apply!`; `wrangler secret list` names
`APP_ORIGINS`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and nothing else, no
value printed; `wrangler deployments list` showed 100% on `751a8bfd-e62a-4c9a-beb2-1953eb6a7656`,
which is the restore point and still exists.

| Field | Value |
|---|---|
| New version id | `a80d2e12-d77e-4b88-b318-aa992eb60d50` |
| Rollback reference | `751a8bfd-e62a-4c9a-beb2-1953eb6a7656` (release 5, `91ce0da`) |
| Release SHA | `64eb0d3b096eef53a6d264ee483e1d9c7e1dc17a` |
| Assets uploaded | `/index.html`, `/assets/index-ByHeNjZo.css`, `/assets/index-DlWpQE-s.js` |

## Next action

Live verification on the deployed URL, then the three captures.
