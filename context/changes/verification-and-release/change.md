---
change_id: verification-and-release
title: Certify the whole flow on the deployed instance and close the release out
status: implementing
archived_at: null
---

## Notes

Roadmap item S-04, the last item in the ledger stream. It adds no product behaviour. It takes the
four slices that landed before it, puts them on the deployed Worker over the remote D1 database, and
proves in a browser against that deployment what has so far only been proven against a local
database and a local build.

The deployed instance is two slices behind: release `149aa44d` predates members, prices, payments and
standing orders, and only migrations `0001` and `0002` are applied remotely. So this slice is a
migration of live data, a redeploy, and a verification pass, in that order, plus the documentation
and evidence that make the result reviewable by someone who was not here.

It also closes the Builder-track items that can only be answered by a shipped release: the
acceptance walkthrough, the final screenshots, the documentation check and the `mvp-check` run.

Date fields (`created`, `updated`) are omitted: this repository records progress by change ID,
migration ID and commit, not by calendar.
