---
change_id: google-sign-in
title: Add Google sign-in alongside the existing password login
status: impl_reviewed
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
