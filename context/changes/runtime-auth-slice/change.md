---
change_id: runtime-auth-slice
title: Sign in, own one subscription, and be refused everyone else's
status: implementing
archived_at: null
---

## Notes

First vertical slice, roadmap item S-01. An organizer signs in to a seeded account, sees and creates
their own subscription, and is refused every record belonging to another account. Brings up the
first browser screen, the first migrations and the ownership rule that every later slice depends on.

Date fields (`created`, `updated`) are omitted: this repository records progress by change ID,
migration ID and commit, not by calendar.
