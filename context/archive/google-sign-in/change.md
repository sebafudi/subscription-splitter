---
change_id: google-sign-in
title: Add Google sign-in alongside the existing password login
status: archived
---

## Notes

Roadmap S-07. Add "Continue with Google" through the Better Auth integration already shipped on
Hono, Workers and D1, while password login for the seeded demo and reviewer accounts keeps working
exactly as it does today.

The authored request is `context/foundation/google-sign-in-brief.md`. It fixes the product rule that
matters most: a first Google login creates a separate account with its own empty subscription space,
and a Google identity is never mapped onto the seeded `owner@example.com` account or given its data.

Fable 5.1 is the sole designer for the login screen delta, consistent with the accepted redesign in
`context/archive/visual-redesign/design-spec.md` section 4.1 and with Google's own sign-in branding.
Research and framing collect the ground truth and the open design questions; they decide no
appearance. Opus and Sonnet implement.

Hard constraint: the shipped accounting, ownership and persistence behaviour is untouched. This
change adds an authentication provider, one public configuration read, a login-screen affordance and
its tests. It changes no domain rule, no ownership check and no stored subscription value.

The plan review (`reviews/plan-review.md`) is resolved. All six required findings and all four
observations were applied across `plan.md`, `plan-brief.md`, `research.md` and `design-delta.md`, and
each is mapped to its commit in that file's `## Resolution` section.

All four phases have landed and every Progress row in `plan.md` is ticked with the commit that
satisfies it, so `status` is now `implemented`. Phase 1 at `43f41f2`, phase 2 at `cf3e3de` and
`e6b3dab`, the designer's amendment to design-spec 3.3 at `a1f9977` and its application at `7a3a3ce`,
the phase 3 gate runs at `461b950`, and the phase 4 acceptance pass and its sixteen captures at
`9ce597a`. `design-delta.md` now carries a "## 3.3 Buttons (amended)" section: every button variant
reserves a 1px border in every state, transparent where 3.3 shows none, so a state change never moves
a neighbour.

One thing this change deliberately does not claim. The live Google consent roundtrip on the deployed
origin is goal G05, not a row here: it needs `GOOGLE_CLIENT_ID` on the deployed Worker followed by a
deploy, and the consent audience stays External in Testing, so no artifact in this change says that
public Google login works. Everything local is verified, including the state a deployment without
credentials is in, which is what continuous integration runs.

The implementation review in `reviews/impl-review.md` is APPROVED and resolved: both required
findings, F1 on the phase 2 Progress commits and F2 on the wording of the secret guard, are applied,
and all six observations are decided in that file's `## Resolution` section. The designer acceptance
in `reviews/design-acceptance.md` accepts the delta without corrections. `status` is now
`impl_reviewed`.

## Closing note

Archived. Google sign-in is live. Release 4, `bad3f2816611c00cd691b4ef67f1108d618bed60`, deployed as
Cloudflare version `1d0f71c1-6832-4bc1-aace-5feef621e715` and recorded in
`evidence/runs/release-4.md`, carries the one thing the change itself could not: the callback fix
decided in `context/decisions/D-014-run-worker-first-for-api.md`. Release 3 shipped the change and
found that a top-level browser navigation to `/api/auth/callback/google` was answered by Cloudflare's
asset layer before the Worker ran, so the Google return leg could not complete on the deployed
origin. D-014 sets `"run_worker_first": ["/api/*"]` in `wrangler.jsonc`, and its five automated and
five manual Progress rows sit under the "Post-review fix" block in `plan.md`.

Goal G05 is closed on release 4. The owner completed a real Google consent roundtrip there and
reports consent, a new account with an empty Home, a sign-out, and a second sign-in returning to that
same account. It is recorded as the owner's report, with count-only corroboration from the remote
database, under "Consent roundtrip" in `evidence/runs/release-4.md`: one `account` row carrying
`providerId = 'google'`, three users against the two D-005 seeded, no user carrying more than one
provider, and the demo owner's two subscriptions unchanged. The consent audience stays External in
Testing with the owner as its only test user, so nothing here claims that public Google login works.

Roadmap S-07 is `done`. Date fields (`created`, `updated`, `archived_at`) are omitted: this
repository records progress by change ID, migration ID and commit, not by calendar.
