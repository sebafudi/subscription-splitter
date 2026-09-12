---
starter_id: hono
package_manager: npm
project_name: subscription-splitter
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-workers
  ci_provider: github-actions
  ci_default_flow: manual-promotion
  bootstrapper_confidence: verified
  path_taken: custom
  quality_override: false
  self_check_answers:
    typed: true
    from_official_starter: true
    conventions: true
    docs_current: true
    can_judge_agent: true
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
---

## Why this stack

Subscription Splitter is a small web product with one organizer per account, so the stack is chosen
for a single deployable unit and for an exact-money domain that has to be testable on its own. We
took the custom path rather than the recommended web default: the product is an API plus a thin
client, and serving both from one Hono Worker keeps deployment to a single artifact with no second
origin, no cross-origin configuration and no separate hosting account. Hono clears all four
agent-friendly gates, its bootstrapper support is verified, and its first deployment default is
Cloudflare Workers, which is also what gives us D1 through a binding for storage and a local D1 for
integration tests. The React client is built by Vite into static assets the same Worker serves.
Money handling drove the rest: the calculation lives in a dependency-free TypeScript module so it can
be exercised directly, Zod carries one validation contract at every entry point, and repositories own
all SQL. Sign-in is settled by decision D-001: Better Auth on the same Worker and the same D1
binding, public sign-up disabled, proven by a compatibility spike. CI on GitHub Actions runs
typecheck and tests, while deploying stays a deliberate step rather than an automatic consequence of
merging.
