# Checkpoint: g01-plan-review (G01)

- **Task id:** `g01-plan-review`
- **Model:** Opus (subagent)
- **Goal:** G01, an independent review of the implementation plan for change `google-sign-in`,
  roadmap S-07.
- **Status:** complete. The review is written, committed by explicit path and pushed. No finding was
  applied; fixes belong to whoever triages them.
- **Independence:** this task did not write the plan, the research, the framing or the design delta.

## Artifacts

- `context/changes/google-sign-in/reviews/plan-review.md` - the report, in the shape of
  `context/changes/visual-redesign/reviews/plan-review.md`, carrying the `<!-- PLAN-REVIEW-REPORT -->`
  marker and `Decision: PENDING` on every finding so the triage mode can resume from it.
- `context/changes/google-sign-in/change.md` - `status` moved `planned` to `plan_reviewed`, which the
  review skill assigns to the reviewer at the point the report is saved.

## Verdict

REVISE. Three critical findings, three warnings, four observations. End-State Alignment and Blind
Spots fail; Plan Completeness warns; Lean Execution and Architectural Fitness pass. The approach and
the architecture are right, so nothing here calls for a rethink.

| Finding | Severity | Required | One line |
| --- | --- | --- | --- |
| F1 | CRITICAL | yes | A state failure cannot recover `errorCallbackURL`, so the expired-link sentence lands on the library's own error page |
| F2 | CRITICAL | yes | The `account_not_linked` integration case names no executable method and sits past a network call the test pool cannot make |
| F3 | CRITICAL | yes | The designer's HTTP-error ruling is unabsorbed; the plan still carries it as an open question with the wrong sentence |
| F4 | WARNING | yes | The deployed origin's presence in `APP_ORIGINS` is a mitigation the repository cannot verify |
| F5 | WARNING | yes | The credential paragraph is stale: the Cloudflare secret is now set, the client id is not |
| F6 | WARNING | yes | "The connection sentence" invites reuse of `CONNECTION_FAILURE`, whose text differs from the delta's |
| F7 | OBSERVATION | no | `error_description` reaches the address bar even though the client never reads it |
| F8 | OBSERVATION | no | `design-spec.md` 4.1 still carries the sentence the delta replaces, with nothing pointing anywhere |
| F9 | OBSERVATION | no | The configuration endpoint's deliberate lack of throttling and its nil exposure are unstated |
| F10 | OBSERVATION | no | For the designer: `state_mismatch` covers tampering and replay as well as expiry |

## Grounding

Paths 13/13 verified, three new paths correctly absent with their parents present. Symbols 6/6.
The mechanical `## Progress` contract passes: one heading at the bottom, four matching phase
subsections, every success-criteria bullet carried by a row, no checkbox outside the section.

## Library claims checked against `better-auth@1.7.4`

Six of the plan's seven load-bearing library claims are correct, which is worth recording because the
one that is wrong is easy to mistake for a review error.

- `account.accountLinking.disableImplicitLinking` exists, and the documentation states it rejects a
  same-email OAuth sign-in even for a verified email or a trusted provider. Confirmed.
- The Google provider's default scopes are exactly `email`, `profile`, `openid`. Confirmed, so the
  phase 3 scope assertion will hold as written.
- `includeGrantedScopes` sends `include_granted_scopes=true` unless explicitly `false`. Confirmed, so
  the plan's reason for setting it is the real one.
- `CLIENT_ID_AND_SECRET_REQUIRED` is thrown inside `createAuthorizationURL` at click time, not at
  `betterAuth()` construction. Confirmed, and it is exactly why the plan's per-request conditional
  registration is the safe shape and empty strings are not.
- `callbackURL` and `errorCallbackURL` are validated against `trustedOrigins` before the flow starts.
  Confirmed, so the plan closes the open-redirect question by construction.
- The callback path is `${basePath}/callback/${providerId}` and the `account` and `verification`
  tables the flow writes are already in `migrations/0001_auth.sql`. Confirmed; no migration.
- **Wrong:** that sending `errorCallbackURL` is sufficient for every redirect-leg failure to land on
  this app. It is recovered from inside the OAuth state, so a state failure has nothing to recover it
  from and falls back to `${baseURL}/error`. This is F1, and the research asserts the same thing, so
  the correction belongs in both documents.

## Items for the designer

One, F10, and it is informational rather than a request. The delta's expired-link sentence also covers
a state parameter that does not match what was stored and a state cookie that was not persisted, which
are tampering or replay rather than staleness. The sentence is the correct instruction in all of those
cases and leaks nothing, so the designer may simply want it recorded in the delta's table.

F3 is not a designer item: it is a ruling the designer has already made, in the delta paragraph that
is still uncommitted in the working tree, which the plan has not yet absorbed.

## Method

Read in full: the review skill and its report schema, `change.md`, `research.md`, `frame.md`,
`design-delta.md` including the uncommitted HTTP-error paragraph, `plan.md`, `plan-brief.md`, D-012,
D-013, the `g01-plan` and `g02-oauth-provision` checkpoints including the uncommitted Cloudflare
secret tail, `AGENTS.md`, `src/server/auth.ts`, `src/server/routes/auth.ts`, `env.d.ts`,
`src/client/App.tsx`, `src/client/api.ts`, `src/client/screens/Login.tsx`,
`tests/integration/accounts.ts`, `.github/workflows/ci.yml`, `wrangler.jsonc` and `package.json`.

Library verification used the Context7 documentation tools for the account-linking options and the
social sign-in body, then read the installed package directly for everything the documentation could
not settle: `oauth2/state.mjs`, `state.mjs`, `api/routes/callback.mjs`, `oauth2/errors.mjs`,
`oauth2/link-account.mjs`, `api/middlewares/origin-check.mjs` and
`@better-auth/core/src/social-providers/google.ts`. The package read is what found F1, F2's mechanism
and F10; the documentation alone would have reproduced the plan's own error.

## Constraints honoured

No file under `src/`, `tests/`, `plan.md`, `design-delta.md`, `context/STATUS.md`, `evidence/index.md`
or the workspace goals file was modified. The four files carrying other tasks' uncommitted work were
read and deliberately left unstaged. No fix was applied to the plan. No secret, no client id, no
calendar date and no duration estimate was written, and no em dash appears in either authored file,
matching the precedent review. No command that changes state was run beyond the commit and its push.
No deploy, no course upload, no nested delegation.

## Next action

Triage the ten findings. F1 through F6 are marked required and should close before phase 1 begins;
F1's fix is one option in `createAuth` and belongs in the same edit as the `account` block. Resuming
with the review skill against the saved report drives the triage from the `Decision: PENDING` fields.
