---
change_id: google-sign-in
title: Add Google sign-in alongside the existing password login
status: plan_reviewed
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
each is mapped to its commit in that file's `## Resolution` section. `status` stays `plan_reviewed`,
which is where the schema leaves a change whose plan review is closed and whose phase 1 has not begun.
