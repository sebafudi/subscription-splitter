# Checkpoint: g01-research (G01)

- **Task id:** `g01-research`
- **Model:** Opus (subagent)
- **Goal:** G01, research plus identity and linking decisions and framing for change `google-sign-in`,
  roadmap S-07.
- **Status:** complete. Every artifact assigned is written, committed by explicit path and pushed.

## Artifacts

- `context/foundation/google-sign-in-brief.md` and the S-07 entry in `context/foundation/roadmap.md`,
  the user's authored request, committed first and unmodified.
- `context/changes/google-sign-in/change.md` - identity file, `status: preparing`.
- `context/changes/google-sign-in/research.md` - evidence, inference and unknowns separated.
- `context/changes/google-sign-in/frame.md` - dimension map, hypothesis table, reframed problem,
  the product decisions already fixed by the brief, and nine design decisions for Fable 5.1.
- `context/decisions/D-013-google-account-linking.md` - proposed, awaiting the orchestrator.

## Commits

| SHA | Message |
| --- | --- |
| `63bdcaf` | docs(roadmap): add s-07 google sign-in and its brief |
| `9e2649d` | docs(google-sign-in): add change identity and research |
| `bab0f42` | docs(google-sign-in): add frame brief and design questions |
| `9ae624c` | docs(decisions): propose d-013 google account linking rule |

All pushed to `origin/main`.

## Verification

Findings were read from the repository and from the installed `better-auth@1.7.4` and
`@better-auth/core` packages, with file and line references recorded in `research.md`, and
cross-checked against the library's current documentation through the Context7 tools for the Google
provider options, the account-linking options and the OAuth error redirect behaviour. No command was
run that changes state; no test was run, because nothing in `src/` or `tests/` was touched.

## Deviations from the assignment

- `change.md` carries `status: preparing`, not `researching` or `researched`. The assignment said to
  follow the schema, and `archive/toolkit/.ai/skills/10x-new/references/change-md.md` allows only
  `new`, `preparing`, `planned`, `plan_reviewed`, `implementing`, `implemented`, `impl_reviewed`,
  `archived`, `blocked`, with `new` moving to `preparing` on the first of research or frame. The
  schema was followed.
- Date frontmatter from the toolkit's research template is omitted, per the project's date-free
  convention and the precedent in `context/changes/visual-redesign/research.md`.
- The toolkit procedures dispatch parallel subagents. No nested delegation was permitted here, so the
  same file-based procedure was carried out directly.

## Open questions for the designer

Listed in full under "Design decisions for Fable" in `frame.md`. In short: whether design-spec
section 4.1 is amended in place given its "no link to anything else" line; button placement, order
and whether a divider separates the two methods; appearance reconciling Google's sign-in branding
with the redesign tokens and button hierarchy; loading state before the redirect and after the return
leg, and whether section 4.2's session loading screen is reused; error copy and placement for denied
consent, invalid state, failed exchange and `account_not_linked`, where the last must be truthful
without confirming an account exists; whether a Google-created account's empty state says anything
different; mobile layout in the 360px block; whether the absence of the button is marked at all when
no credential is configured; and which Google states join the certification screenshot list.

## Open questions for the orchestrator and the plan

1. Accept, amend or reject D-013 before planning. Everything else in the change is small; this is the
   decision that carries the risk.
2. Confirm that all six migrations are applied to the remote D1 database before the live pass. No new
   migration is needed for this change.
3. Decide whether the provider-configured integration cases run in the existing Vitest project with
   an overridden binding or in a second project. The constraint is that default `npm test` and the
   CI job, which hold no Google values, must pass.
4. G02 provisioning still owns the consent screen's publishing status and test-user eligibility.

## Next action

Fable 5.1 answers the nine design questions in `frame.md` and produces the login-screen design delta,
amending `context/changes/visual-redesign/design-spec.md` section 4.1 or superseding it under this
change. In parallel the orchestrator rules on D-013. Planning (`10x-plan`) follows both.

## Constraints honoured

No file under `src/`, `tests/`, `context/STATUS.md`, `evidence/index.md`, the workspace `GOALS.md`,
or any `visual-redesign` or `release-2` path was modified. No secret, no client id, no calendar date
and no duration estimate was written. No deploy, no course upload, no nested delegation.
