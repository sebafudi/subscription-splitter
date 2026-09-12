# Agent instructions

- Project context: `context/foundation/` (PRD, tech stack, roadmap, test plan), `context/changes/<change-id>/` (active work), `context/archive/` (completed), `context/decisions/` (decision records), `context/STATUS.md` (resumable state).
- Do not write calendar dates, timestamps, deadlines or duration estimates into authored files. Use change IDs, migration IDs and commit SHAs for traceability. Course templates are adapted by omitting date frontmatter and archiving to `context/archive/<change-id>/`.
- Money is integer minor units. Months are `YYYY-MM`, dates `YYYY-MM-DD`.
- Every resource is owned through its subscription; enforce ownership on the server for every read and mutation, including child IDs.
- Use synthetic fixtures only. Never commit secrets, private records or proprietary course material.
