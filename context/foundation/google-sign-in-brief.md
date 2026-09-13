# Google sign-in — change brief

Roadmap S-07; change ID `google-sign-in`; status ready for research. User authorizes Google sign-in and creation of a dedicated Google Cloud project and the necessary OAuth configuration, alongside the existing GitHub/Cloudflare authorization. No paid services or unrelated Google API access are implied. No course uploads are authorized.

## Scope and ownership

Add “Continue with Google” through the existing Better Auth integration, retaining password login for seeded demo/reviewer accounts. Fable 5.1 owns the button placement, appearance and all interaction/error/loading decisions using frontend-design, consistent with the accepted redesign and Google's sign-in branding. Opus/Sonnet implement; do not spawn other models. Missing allowed models are a delegation blocker, not permission to bypass the model constraint.

Default product behavior: a first Google login creates a separate account with its own empty subscription space. Never map Google identities to the shared owner@example.com demo account or inherit demo data. Research and explicitly decide verified-email account linking with the installed Better Auth version; avoid implicit linking of unverified or unrelated identities. Existing login/logout and resource ownership must remain intact.

## Course flow

Read applicable instructions and use `10x-new` → `10x-research` → `10x-frame` where needed → complete Fable design delta → `10x-plan` → independent `10x-plan-review` → resolve findings → phased `10x-implement` → independent `10x-impl-review` → Fable visual acceptance → live verification → `10x-archive`. Update foundation PRD, infrastructure, test plan and roadmap. Keep active artifacts and canonical Progress under this change, with date-free checkpoints and evidence. The brief itself is not a completed research or plan artifact.

## Provisioning and integration

- gcloud is installed at `/opt/homebrew/share/google-cloud-sdk/bin/gcloud`. Verify active account and project-creation permissions using read-only commands first. Do not print tokens. Request interactive authentication only if necessary.
- Create a dedicated, appropriately named Google Cloud project using authorized tools. Configure Google Auth Platform branding, audience and minimal identity scopes (openid, email, profile); register a Web application OAuth client with exact local and deployed callback URLs derived from the app's actual auth base path. Inspect current official documentation rather than guessing commands.
- The general Google Auth Platform web OAuth client is not the IAM/workforce OAuth client. Do not use `gcloud iam oauth-clients create` or IAP as a substitute. Use supported CLI/API where available and authenticated Cloud Console UI for steps without a supported automation interface. CLI installation does not guarantee project permissions, console login or OAuth provisioning capability.
- Validate audience/testing restrictions, test-user eligibility and any consent/publishing requirements before declaring public login ready. Do not invent support contacts or claim Google verification that has not occurred.
- Store client secret only in ignored local configuration and Cloudflare secrets. Configure the client ID and required bindings/environment typings; never include the secret in frontend bundles, screenshots, logs, commits or status files. Keep any downloaded credentials in an ignored private location.
- Use the installed Better Auth Google provider and the actual registered callback path. Handle denied consent, failed callback, invalid state, missing configuration and duplicate-account/linking cases without breaking password login. Do not request Gmail, Drive or broad cloud-platform scopes for sign-in.

## Verification and release

Automated tests must cover provider configuration and relevant failure paths, account/session behavior and cross-user isolation; test OAuth boundaries without pretending mocked results prove real Google authentication. Complete an actual Google consent/sign-in roundtrip on the deployed app with an authorized account, then logout and sign in again. If consent requires the user, prepare everything else and ask only for that action. Verify new-account empty state, persisted identity and isolation from demo/reviewer resources. Preserve regression results, Fable's design acceptance, live evidence and a release SHA. Refresh affected certification screenshots after deployment. No upload to 10x without explicit confirmation.

## Official references

- Google Auth Platform setup: https://support.google.com/cloud/answer/15544987
- Web OAuth client management: https://support.google.com/cloud/answer/15549257
- Better Auth Google provider: https://www.better-auth.com/docs/authentication/google
- Better Auth accounts/linking: https://better-auth.com/docs/concepts/users-accounts

## Google OAuth — resume with saved credentials

Google Console provisioning is complete. Do not recreate the project/client or ask the user to supply credentials again. The app's Git-ignored `.dev.vars` contains `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; read them only into the process that needs them, never logs or generated documentation. Latest provisioning evidence: `context/checkpoints/g02-oauth-provision.md` in the app repository.

The user assigns the remaining work to the Claude execution team. Resume S-07 from actual saved state: securely configure the existing Cloudflare Worker's Google secrets using the execution environment's authorized Cloudflare authentication; verify names only; reconcile G02; then finish the researched/reviewed implementation, regression checks, Fable design acceptance, deployment and real Google OAuth roundtrip. Preserve password login and cross-account isolation. The Google app remains External/Testing with the owner as test user; do not silently publish it or expand scopes.

Provisioning session could not authenticate Wrangler, so do not assume remote secrets already exist. Inspect existing secret names and current implementation before acting to avoid duplicate work. Fable retains design authority; Opus/Sonnet perform implementation as specified by the existing contract. Checkpoint progress and update GOALS.md through the designated status writer. No upload to 10x without explicit confirmation.
